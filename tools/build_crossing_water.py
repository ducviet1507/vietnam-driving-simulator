"""Add open, mapped waterways near otherwise dry road bridges to a vn-water build.

python tools/build_crossing_water.py vietnam-261118.osm.pbf
Requires osmium and shapely >= 2. Run after build_vn_water.py and build_vn_traffic.py.
"""
import argparse
from collections import Counter, defaultdict, deque
from dataclasses import dataclass
import gzip
import hashlib
import json
from pathlib import Path
import re

import osmium
from shapely import LineString, Polygon, STRtree, box
from shapely.ops import substring

from build_vn_roads import compact, tiles_touched

ROOT = Path(__file__).resolve().parents[1] / "dist"
KINDS = {"stream", "river", "canal", "drain"}
SCALE = 100000
TILE = SCALE // 4
# In the source's 1e-5 degree grid a reach of 600 units spans about 620–665 m.
REACH = 600


def read_tile(path):
    with gzip.open(path) as stream:
        return json.load(stream)


def bridge_index(roads, traffic):
    geometries = {}
    for key in json.loads((traffic / "index.json").read_bytes())["tiles"]:
        ids = {int(id) for id, attrs in read_tile(traffic / (key + ".gz")).items() if attrs.get("bridge")}
        if ids:
            for id, _, _, _, _, _, coords in read_tile(roads / (key + ".gz")):
                if id in ids and id not in geometries:
                    geometries[id] = LineString(zip(coords[::2], coords[1::2]))
    return list(geometries), STRtree(list(geometries.values()))


def existing_water(water, index):
    surfaces = []
    for key in index["tiles"]:
        for row in read_tile(water / (key + ".gz")):
            if len(row) != 3:
                continue  # Drop regenerated supplements when rebuilding.
            kind, name, coords = row
            points = list(zip(coords[::2], coords[1::2]))
            if kind == "lake":
                surfaces.append(Polygon(points))
            else:
                # The original renderer uses an estimated 8 or 23 m width.
                surfaces.append(LineString(points).buffer(4 if "suối" in name.lower() else 11))
    return STRtree(surfaces)


def metres(tags):
    for key in ("width", "est_width"):
        text = tags.get(key, "").strip().lower()
        match = re.fullmatch(r"(\d+(?:[.,]\d+)?)\s*(?:m|metres?|meters?)?", text)
        if match:
            value = float(match[1].replace(",", "."))
            if 0 < value <= 2000:
                return round(value, 1)
    return 0


@dataclass
class Channel:
    kind: str
    name: str
    width: float
    ends: tuple
    line: LineString


def channels_at_crossings(source, bridges, wet):
    bridge_ids, index = bridges
    channels, endpoints, ranges = {}, defaultdict(list), defaultdict(list)
    reached, seeds = {}, deque()
    crossings = set()

    def mark(node, remaining):
        if remaining > reached.get(node, 0):
            reached[node] = remaining
            seeds.append(node)

    select = osmium.filter.TagFilter(*[("waterway", k) for k in sorted(KINDS)])
    for way in osmium.FileProcessor(source).with_locations().with_filter(select):
        if not way.is_way() or len(way.nodes) < 2:
            continue
        tags = way.tags
        kind = tags["waterway"]
        name = tags.get("name:vi") or tags.get("name", "")
        if (kind == "river" and name or tags.get("area") == "yes" or tags.get("location") == "underground"
                or "pipeline" in tags or "highway" in tags and tags.get("ford", "no") == "no"
                or any(tags.get(k, "no") != "no" for k in ("tunnel", "covered", "intermittent", "seasonal", "bridge"))):
            continue
        coords = [(n.lon * SCALE, n.lat * SCALE) for n in way.nodes if n.location.valid()]
        if len(coords) != len(way.nodes):
            continue
        line = LineString(coords)
        if line.length < 1:
            continue
        ends = (way.nodes[0].ref, way.nodes[-1].ref)
        channels[way.id] = Channel(kind, name, metres(tags), ends, line)
        for node in set(ends):
            endpoints[node].append(way.id)
        for i in index.query(line, predicate="intersects"):
            crossing = line.intersection(index.geometries[i])
            points = [crossing] if crossing.geom_type == "Point" else getattr(crossing, "geoms", ())
            for point in points:
                if point.geom_type != "Point" or len(wet.query(point, predicate="intersects")):
                    continue
                crossings.add(bridge_ids[i])
                s = line.project(point)
                ranges[way.id].append((max(0, s-REACH), min(line.length, s+REACH)))
                mark(ends[0], REACH-s)
                mark(ends[1], REACH-(line.length-s))

    # Continue over OSM way boundaries so a split channel does not disappear
    # at the bridge abutment. Only real, shared waterway nodes permit a turn.
    while seeds:
        node = seeds.popleft()
        budget = reached[node]
        for id in endpoints[node]:
            c = channels[id]
            length = c.line.length
            reach = min(length, budget)
            for i, end in enumerate(c.ends):
                if end == node:
                    ranges[id].append((0, reach) if i == 0 else (length-reach, length))
                    mark(c.ends[1-i], budget-length)
    return channels, ranges, crossings


def channel_rows(way_id, channel, points):
    if way_id != 1054211136 or channel.width:
        return [[channel.kind, channel.name, points, channel.width]]
    # The canal way has no width tag. At the east gate, open water occupies
    # roughly 25 m of the 39 m bridge. Aerial cross-sections beside the
    # northern point and southern marker give local widths of about 28 and 26 m.
    positions = list(zip(points[::2], points[1::2]))
    rows = []
    for first, last in zip(positions, positions[1:]):
        lon = (first[0] + last[0]) / 2
        lat = (first[1] + last[1]) / 2
        width = channel.width
        if lon > 10662400 and 1746690 <= lat <= 1746930:
            width = 25
        elif lon > 10662300 and 1746930 < lat < 1747080:
            width = 28
        elif 10662270 < lon < 10662380 and 1746590 < lat < 1746632:
            width = 26
        if not rows or rows[-1][3] != width:
            rows.append([channel.kind, channel.name, list(first), width])
        rows[-1][2].extend(last)
    return rows


def tile_rows(channels, ranges):
    tiles = defaultdict(list)
    for id, intervals in sorted(ranges.items()):
        channel = channels[id]
        merged = []
        for a, b in sorted(intervals):
            if merged and a <= merged[-1][1]+.01:
                merged[-1][1] = max(merged[-1][1], b)
            else:
                merged.append([a,b])
        for a, b in merged:
            if b-a < 1:
                continue
            part = substring(channel.line, a, b).simplify(2, preserve_topology=False)
            coords = [(round(x), round(y)) for x,y in part.coords]
            for x,y in sorted(tiles_touched(coords)):
                clip = part.intersection(box(x*TILE,y*TILE,(x+1)*TILE,(y+1)*TILE))
                lines = [clip] if clip.geom_type == "LineString" else getattr(clip, "geoms", ())
                for line in lines:
                    if line.geom_type != "LineString" or line.length < 1:
                        continue
                    points = []
                    for lon, lat in line.coords:
                        point = [round(lon), round(lat)]
                        if point != points[-2:]:
                            points.extend(point)
                    if len(points) >= 4:
                        tiles[f"{x}_{y}"].extend(channel_rows(id, channel, points))
    return tiles


def build(source, roads, traffic, water):
    index = json.loads((water / "index.json").read_bytes())
    graph = json.loads((roads / "index.json").read_bytes())
    signals = json.loads((traffic / "index.json").read_bytes())
    with source.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if (digest not in {graph["sourceSha256"],signals["sourceSha256"]}
            or signals["graphSourceSha256"] != graph["sourceSha256"] or index["osmTimestamp"] != graph["osmTimestamp"]):
        raise ValueError("Water, traffic, roads and OSM extract must use the same snapshot")
    channels, ranges, crossings = channels_at_crossings(source, bridge_index(roads, traffic), existing_water(water,index))
    print(f"{len(crossings):,} previously dry bridge edges, {len(ranges):,} intersecting or connected ways", flush=True)
    additions = tile_rows(channels,ranges)
    keys, parts, total_bytes = [], Counter(), 0
    for key in sorted(set(index["tiles"]) | set(additions)):
        path = water / (key + ".gz")
        old = read_tile(path) if path.exists() else []
        rows = [row for row in old if len(row)==3] + additions[key]
        if not rows:
            if path.exists():
                path.unlink()
            continue
        if old != rows:
            temp = path.with_suffix(".part")
            temp.write_bytes(gzip.compress(compact(rows),compresslevel=8,mtime=0))
            temp.replace(path)
        keys.append(key)
        parts.update(row[0] for row in rows)
        total_bytes += path.stat().st_size
    index.update(tiles=keys, parts=dict(parts), bytes=total_bytes,
                 crossings={"bridgeEdges":len(crossings), "waterwayWays":len(ranges), "sourceSha256":digest})
    (water/"index.json").write_bytes(compact(index))
    print(f"{len(keys)} tiles, {total_bytes:,} compressed bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source",type=Path)
    for kind,default in (("roads","vn-roads"),("traffic","vn-traffic"),("water","vn-water")):
        parser.add_argument("--"+kind,type=Path,default=ROOT/default)
    args = parser.parse_args()
    build(args.source, args.roads, args.traffic, args.water)
