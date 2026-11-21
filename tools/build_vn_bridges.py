"""Attach mapped bridge details to the exact edge IDs of an existing ViVu3D graph.

python tools/build_vn_bridges.py vietnam-261118.osm.pbf dist/vn-roads dist/vn-traffic dist/vn-bridges
Requires osmium and shapely >= 2. The source snapshot must match the traffic tiles.
"""
import argparse
import collections
import gzip
import hashlib
import itertools
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path

import osmium
from shapely import STRtree, LineString, Polygon, from_wkb

from build_vn_roads import compact, permitted, short_runs, simplify, tiles_touched
from build_vn_traffic import fingerprint


def mapped_details(tags):
    result = {}
    layer = tags.get("layer", "")
    if re.fullmatch(r"[+-]?\d+", layer) and int(layer) != 1:
        result["layer"] = int(layer)
    structure = tags.get("bridge:structure") or tags.get("bridge:movable")
    if not structure and tags.get("bridge") in {"viaduct", "covered", "low_water_crossing", "movable", "boardwalk"}:
        structure = tags["bridge"]
    if structure:
        result["structure"] = structure
    name = tags.get("bridge:name:vi") or tags.get("bridge:name")
    if name and name != (tags.get("name:vi") or tags.get("name")):
        result["name"] = name
    return result


WALKWAYS = {"footway", "pedestrian", "path", "steps", "cycleway"}


def metric_width(tags):
    value = tags.get("width", "").strip()
    if re.fullmatch(r"\d+(?:\.\d+)?\s*m?", value):
        width = float(value.removesuffix("m").strip())
        if 0 < width <= 30:
            return width
    return 0


@dataclass
class Walkway:
    way: int
    nodes: list
    line: LineString
    layer: int
    width: float
    kind: str = "deck"

    def serialize(self):
        coords = [(round(lon * 1e5), round(lat * 1e5)) for lon, lat in self.line.coords]
        points = simplify(coords, 0.6)
        return [self.way, self.kind, self.layer, self.width, [v for p in points for v in p]], tiles_touched(points)


def read_walkway(way, layer, kind="deck"):
    coords = [(n.lon, n.lat) for n in way.nodes if n.location.valid()]
    if len(coords) < 2 or len(coords) != len(way.nodes) or len(set(coords)) < 2:
        return None
    return Walkway(way.id, [n.ref for n in way.nodes], LineString(coords), layer, metric_width(way.tags), kind)


def pedestrian_crossings(source, decks, classes):
    """Cross full-precision OSM centerlines. A shared vertex at the crossing
    indicates a pedestrian connection at grade and disqualifies that pair.
    """
    tree = STRtree([deck.line for deck in decks])
    confirmed = set()
    batch = []

    def match():
        lines = from_wkb(batch)
        lower, upper = tree.query(lines, predicate="crosses")
        for a, b in zip(lower, upper):
            if b in confirmed:
                continue
            deck, road = decks[b].line, lines[a]
            common = set(deck.coords).intersection(road.coords)
            crossing = deck.intersection(road)
            points = [crossing] if crossing.geom_type == "Point" else getattr(crossing, "geoms", [])
            if any(p.geom_type == "Point" and p.coords[0] not in common for p in points):
                confirmed.add(int(b))
        batch.clear()

    factory = osmium.geom.WKBFactory()
    road_classes = osmium.filter.TagFilter(*[("highway", k) for k in sorted(classes)])
    for way in osmium.FileProcessor(source).with_locations().with_filter(road_classes):
        if not way.is_way() or not permitted(way) or way.tags.get("bridge", "no") != "no" or way.tags.get("tunnel", "no") != "no":
            continue
        if way.tags.get("layer", "0") not in {"0", ""}:
            continue
        try:
            batch.append(bytes.fromhex(factory.create_linestring(way)))
        except (osmium.InvalidLocationError, RuntimeError):
            continue
        if len(batch) >= 4096:
            match()
    if batch:
        match()

    # A deck is often split at the landing. Continue along other mapped
    # footbridge ways through their shared endpoints at the same level.
    ends = collections.defaultdict(list)
    for i, deck in enumerate(decks):
        for n in (deck.nodes[0], deck.nodes[-1]):
            ends[(n, deck.layer)].append(i)
    pending = list(confirmed)
    while pending:
        deck = decks[pending.pop()]
        for n in (deck.nodes[0], deck.nodes[-1]):
            for i in ends[(n, deck.layer)]:
                if i not in confirmed:
                    confirmed.add(i)
                    pending.append(i)
    return [decks[i] for i in sorted(confirmed)]


def independent_decks(decks, edges):
    # Sidewalks sharing a vehicular viaduct may also cross surface streets.
    # Identify the same longitudinal alignment across several samples so a
    # genuine short pedestrian overpass crossing at an angle still survives.
    road_lines = [LineString(key[-1]) for key in edges]
    tree = STRtree(road_lines)

    def tangent(line, distance):
        a = line.interpolate(max(0, distance - 2))
        b = line.interpolate(min(line.length, distance + 2))
        dx, dy = b.x - a.x, b.y - a.y
        length = math.hypot(dx, dy) or 1
        return dx / length, dy / length

    for deck in decks:
        line = LineString([(lon * 1e5, lat * 1e5) for lon, lat in deck.line.coords])
        parallel = 0
        for fraction in (.1, .3, .5, .7, .9):
            pos = line.length * fraction
            point = line.interpolate(pos)
            x, y = tangent(line, pos)
            for i in tree.query(point, predicate="dwithin", distance=18):
                road = road_lines[i]
                u, v = tangent(road, road.project(point))
                if abs(x * u + y * v) > .92:
                    parallel += 1
                    break
        if parallel < 4:
            yield deck


def footbridge_tiles(source, decks, classes, edges):
    selected = pedestrian_crossings(source, decks, classes)
    selected = list(independent_decks(selected, edges))
    levels = {node: w.layer for w in selected for node in w.nodes}
    selected_ids = {w.way for w in selected}
    walk_filter = osmium.filter.TagFilter(*[("highway", k) for k in sorted(WALKWAYS)])
    for way in osmium.FileProcessor(source).with_locations().with_filter(walk_filter):
        if not way.is_way() or len(way.nodes) < 2 or way.id in selected_ids:
            continue
        tags = way.tags
        if tags.get("highway") == "steps":
            kind = "steps"
        elif tags.get("ramp") == "yes" or tags.get("incline", "") not in {"", "0", "0%"}:
            kind = "ramp"
        else:
            continue
        start, end = levels.get(way.nodes[0].ref), levels.get(way.nodes[-1].ref)
        if bool(start) == bool(end):
            continue
        access = read_walkway(way, start or end, kind)
        if not access or access.line.length > .0015:
            continue
        if start:
            access.line = access.line.reverse()
        selected.append(access)

    tiles = collections.defaultdict(list)
    for way in sorted(selected, key=lambda w: w.way):
        row, cells = way.serialize()
        for x, y in cells:
            tiles[f"{x}_{y}"].append(row)
    print("Pedestrian crossing segments:", dict(collections.Counter(w.kind for w in selected)), flush=True)
    return dict(sorted(tiles.items()))


def build(source, roads, traffic, output):
    traffic_index = json.loads((traffic / "index.json").read_bytes())
    road_index = json.loads((roads / "index.json").read_bytes())
    with source.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if traffic_index["graphSourceSha256"] != road_index["sourceSha256"]:
        raise ValueError("Traffic metadata and graph are from different sources")
    if digest not in {traffic_index["sourceSha256"], road_index["sourceSha256"]}:
        raise ValueError("Use the source snapshot for this road graph")

    # Retain only known bridge rows. The same road on both sides of a tile
    # boundary has the same edge ID and fingerprint.
    edges, junctions, names = {}, set(), {}
    for key in traffic_index["tiles"]:
        with gzip.open(traffic / (key + ".gz")) as stream:
            ids = {int(k) for k, value in json.load(stream).items() if value.get("bridge")}
        if not ids:
            continue
        with gzip.open(roads / (key + ".gz")) as stream:
            for edge, start, end, name, kind, _, coords in json.load(stream):
                if edge in ids:
                    line = list(zip(coords[::2], coords[1::2]))
                    edges[fingerprint(kind, start, end, line)] = edge
                    junctions.update((start, end))
                    names[edge] = name.split(" · ")[0]

    enriched, decks, outlines = {}, [], []
    classes = set(road_index["classes"])
    processor = osmium.FileProcessor(source).with_locations().with_filter(osmium.filter.KeyFilter("bridge", "man_made"))
    for way in processor:
        if not way.is_way():
            continue
        tags = way.tags
        if tags.get("man_made") == "bridge" and way.is_closed() and len(way.nodes) >= 4:
            attrs = {}
            for key, value in (("name", tags.get("name:vi") or tags.get("name")), ("structure", tags.get("bridge:structure"))):
                if value:
                    attrs[key] = value
            if attrs and all(n.location.valid() for n in way.nodes):
                polygon = Polygon([(n.lon * 1e5, n.lat * 1e5) for n in way.nodes])
                if polygon.is_valid and polygon.area > 0:
                    outlines.append((polygon, attrs))
        if tags.get("bridge", "no") in {"no", "construction"}:
            continue
        if tags.get("highway") in WALKWAYS - {"steps"} and tags.get("area") != "yes" and tags.get("footway") != "crossing":
            layer = tags.get("layer", "1")
            if re.fullmatch(r"\+?\d+", layer) and int(layer) > 0:
                deck = read_walkway(way, int(layer))
                if deck:
                    decks.append(deck)
        kind = way.tags.get("highway")
        if kind not in classes or not permitted(way):
            continue
        attributes = mapped_details(way.tags)
        if not attributes:
            continue
        refs = [(n.ref, round(n.lon * 100000), round(n.lat * 100000)) for n in way.nodes if n.location.valid()]
        if len(refs) != len(way.nodes):
            continue
        if way.tags.get("oneway:motorcar", way.tags.get("oneway")) in {"-1", "reverse"}:
            refs.reverse()
        for run, _ in short_runs(refs, junctions, itertools.count(-1, -1)):
            line = simplify([(x, y) for _, x, y in run], 1 if kind == "service" else 3)
            edge = edges.get(fingerprint(kind, run[0][0], run[-1][0], line))
            if edge is not None:
                enriched[edge] = attributes.copy()

    # Structural tags and names are often on the bridge outline, distinct
    # from the road across it. Require most of the drivable edge to lie on
    # the same footprint, so a road merely crossing it cannot inherit it.
    footprints = STRtree([p for p, _ in outlines])
    for (_, _, _, coords), edge in edges.items():
        line = LineString(coords)
        matches = [(line.intersection(outlines[i][0]).length, int(i)) for i in footprints.query(line)]
        overlap, i = max(matches, default=(0, -1))
        if overlap <= line.length * .6:
            continue
        for key, value in outlines[i][1].items():
            if key != "name" or value != names[edge]:
                enriched.setdefault(edge, {}).setdefault(key, value)

    output.mkdir(exist_ok=True, parents=True)
    source_ref = {"graphSourceSha256": road_index["sourceSha256"]}
    (output / "details.json").write_bytes(compact({**source_ref, "edges": dict(sorted(enriched.items()))}))
    fields = collections.Counter(k for attributes in enriched.values() for k in attributes)
    print(f"{len(enriched):,} bridge edges with additional mapped details: {dict(fields)}", flush=True)
    tiles = footbridge_tiles(source, decks, classes, edges)
    (output / "footbridges.json").write_bytes(compact({**source_ref, "tiles": tiles}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for arg in ("source", "roads", "traffic", "output"):
        parser.add_argument(arg, type=Path)
    args = parser.parse_args()
    build(args.source, args.roads, args.traffic, args.output)
