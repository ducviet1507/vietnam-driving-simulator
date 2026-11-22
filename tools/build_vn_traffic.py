"""Build nationwide traffic tiles for an existing ViVu3D road graph.

python tools/build_vn_traffic.py vietnam.osm.pbf dist/vn-roads dist/vn-traffic
Requires osmium. Use a Geofabrik PBF at the road graph's replication timestamp.
"""
import argparse
import collections
import gzip
import hashlib
import itertools
import json
import re
from pathlib import Path

import osmium

from build_vn_roads import BAI_MON_JOIN, MAIN, compact, driving_runs, permitted, simplify


def number(text, maximum, unit=""):
    match = re.fullmatch(r"(\d+(?:\.\d+)?)\s*" + unit, (text or "").strip())
    if match:
        value = float(match[1])
        if 0 < value <= maximum:
            return int(value) if value.is_integer() else value


def road_details(tags, reverse):
    data = {}
    for key, limit, unit in (("lanes", 16, ""), ("width", 80, "(?:m)?")):
        value = number(tags.get(key), limit, unit)
        if value and (key != "lanes" or isinstance(value, int)):
            data[key] = value
    directions = ("backward", "forward") if reverse else ("forward", "backward")
    speeds = [number(tags.get("maxspeed:" + d, tags.get("maxspeed")), 160, "(?:km/h)?") for d in directions]
    if any(speeds):
        data["speed"] = speeds[0] if speeds[0] == speeds[1] else speeds
    forward, backward = [number(tags.get("lanes:" + d), 16) for d in directions]
    if all(isinstance(v, int) for v in (forward, backward)) and forward + backward <= 16:
        data.setdefault("lanes", forward + backward)
    if "lanes" in data:
        if forward is None and backward is not None:
            forward = data["lanes"] - backward
        if isinstance(forward, int) and 0 < forward < data["lanes"]:
            data["forward"] = forward
    surface = tags.get("surface")
    if surface:
        data["surface"] = surface
    for key in ("bridge", "tunnel"):
        if tags.get(key, "no") != "no":
            data[key] = 1
    return data


def road_controls(source):
    controls = {}
    ways = collections.defaultdict(list)
    linked = set()
    stats = collections.Counter()
    selected = osmium.filter.KeyFilter("highway", "type")
    for obj in osmium.FileProcessor(source, osmium.osm.NODE | osmium.osm.RELATION).with_filter(selected):
        tags = obj.tags
        if obj.is_node():
            kind = tags.get("highway")
            signal = kind == "traffic_signals" or (kind == "crossing" and tags.get("crossing") == "traffic_signals")
            crossing = kind == "crossing" or (signal and "crossing" in tags and tags["crossing"] != "no")
            if not (signal or crossing):
                continue
            markings = tags.get("crossing:markings")
            marked = crossing and (markings in {"yes", "zebra", "ladder", "lines", "ladder:paired", "zebra:paired"}
                                   if markings else tags.get("crossing") in {"marked", "zebra"})
            direction = {"forward": 1, "backward": -1}.get(tags.get("traffic_signals:direction"), 0)
            controls[obj.id] = (int(crossing) + 2 * int(marked) + 4 * int(signal), direction)
        elif tags.get("type") == "restriction":
            members = obj.members
            via = [m.ref for m in members if m.role == "via" and m.type == "n"]
            if len(via) != 1 or any(m.role == "via" and m.type != "n" for m in members):
                stats["viaWayOrComplex"] += 1
                continue
            origins = [m.ref for m in members if m.role == "from" and m.type == "w"]
            targets = [m.ref for m in members if m.role == "to" and m.type == "w"]
            masks = collections.Counter()
            exceptions = {s.strip() for s in tags.get("except", "").split(";")}
            for mode, mask in (("motorcar", 1), ("motorcycle", 2)):
                if exceptions.intersection((mode, "motor_vehicle", "vehicle")):
                    continue
                value = tags.get("restriction:" + mode, tags.get("restriction:motor_vehicle", tags.get("restriction", "")))
                if value.startswith(("no_", "only_")):
                    masks[value] |= mask
            for value, mask in masks.items():
                for origin, target in itertools.product(origins, targets):
                    ways[origin].append((obj.id, via[0], target, value, mask))
                    linked.update((origin, target))
    return controls, ways, linked, stats


def endpoint(node, x, y):
    # Long roads can have synthetic node IDs. Their quantized position is stable.
    return node if node > 0 else -(x * 10_000_000 + y)


def fingerprint(kind, start, end, line):
    return (kind, endpoint(start, *line[0]), endpoint(end, *line[-1]), tuple(line))


def existing_tiles(index):
    return sorted((set(index["tiles"]) - set(index.get("splits", {}))) | set(index.get("subtiles", [])))


def build(source, roads, output):
    index = json.loads((roads / "index.json").read_bytes())
    with source.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != index["sourceSha256"]:
        with osmium.io.Reader(source) as reader:
            timestamp = reader.header().get("osmosis_replication_timestamp")
        if not timestamp or timestamp != index["osmTimestamp"]:
            raise ValueError(f"Traffic snapshot {timestamp} does not match graph {index['osmTimestamp']}")
    keys = existing_tiles(index)
    def rows(key):
        with gzip.open(roads / (key + ".gz"), "rb") as f:
            return json.load(f)

    print("Reading road graph endpoints", flush=True)
    junctions = set()
    for key in keys:
        for row in rows(key):
            junctions.update(row[1:3])
    # driving_runs splits the QL29 fork after preserving its old 1.8 km segments.
    junctions.discard(BAI_MON_JOIN)
    controls, restrictions, linked, skipped = road_controls(source)
    print("Matching OSM ways and controls", flush=True)
    classes = MAIN | {k + "_link" for k in MAIN} | {"unclassified", "residential", "living_street", "service"}
    selected = osmium.filter.TagFilter(*[("highway", k) for k in classes])
    source_rows = {}
    processor = osmium.FileProcessor(source).with_locations().with_filter(selected)
    for way in processor:
        if not way.is_way() or not permitted(way):
            continue
        tags = way.tags
        reverse = tags.get("oneway:motorcar", tags.get("oneway")) in ("-1", "reverse")
        data = road_details(tags, reverse)
        if way.id in linked:
            data["way"] = way.id
        if not data and not any(n.ref in controls for n in way.nodes):
            continue
        refs = [(n.ref, round(n.lon * 100000), round(n.lat * 100000)) for n in way.nodes if n.location.valid()]
        if len(refs) != len(way.nodes):
            continue
        if reverse:
            refs.reverse()
        kind = tags["highway"]
        for run, _, _ in driving_runs(way.id, refs, junctions, itertools.count(-1, -1)):
            details = data.copy()
            line = [(x, y) for _, x, y in run]
            found = [(i, ref, controls[ref]) for i, (ref, _, _) in enumerate(run) if ref in controls]
            if found:
                # Position the road control on the simplified polyline at runtime.
                details["controls"] = [[ref, *line[i], flags, -direction if reverse else direction]
                                       for i, ref, (flags, direction) in found]
            turns = [r for r in restrictions.get(way.id, ()) if r[1] in (run[0][0], run[-1][0])]
            if turns:
                details["turns"] = turns
            if details:
                simple = simplify(line, 1 if kind == "service" else 3)
                source_rows[fingerprint(kind, run[0][0], run[-1][0], simple)] = details
    del junctions
    print("Writing traffic tiles", flush=True)
    output.mkdir(parents=True, exist_ok=True)
    done, control_sets, relation_ids = set(), collections.defaultdict(set), set()
    coverage = collections.Counter()
    tile_keys, total_bytes = [], 0
    for key in keys:
        tile = {}
        for edge, start, end, _, kind, _, coords in rows(key):
            line = list(zip(coords[::2], coords[1::2]))
            details = source_rows.get(fingerprint(kind, start, end, line))
            if not details:
                continue
            tile[edge] = details
            if edge in done:
                continue
            done.add(edge)
            coverage.update(k for k in details if k not in ("way", "controls", "turns"))
            for ref, _, _, flags, _ in details.get("controls", ()):
                for bit, name in ((1, "crossings"), (2, "markedCrossings"), (4, "signals")):
                    if flags & bit:
                        control_sets[name].add(ref)
            relation_ids.update(r[0] for r in details.get("turns", ()))
        if tile:
            payload = gzip.compress(compact(tile), compresslevel=7, mtime=0)
            (output / (key + ".gz")).write_bytes(payload)
            tile_keys.append(key)
            total_bytes += len(payload)
    manifest = dict(tiles=tile_keys, sourceSha256=digest, graphSourceSha256=index["sourceSha256"], osmTimestamp=index["osmTimestamp"],
                    graphEdges=index["edges"], enrichedEdges=len(done), edgesByAttribute=dict(coverage),
                    controlNodes={k: len(v) for k, v in control_sets.items()}, viaNodeRelations=len(relation_ids),
                    skippedRelations=dict(skipped), bytes=total_bytes)
    (output / "index.json").write_bytes(compact(manifest))
    print(json.dumps({k: v for k, v in manifest.items() if k != "tiles"}), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for arg in ("source", "roads", "output"):
        parser.add_argument(arg, type=Path)
    args = parser.parse_args()
    build(args.source, args.roads, args.output)
