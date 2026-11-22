"""Export OSM street lamps and bollards within 550 m of an atlas stop or arrival.

Run with the same Geofabrik Vietnam .osm.pbf as sight-grounds. Requires
Python 3.11+, osmium, shapely, numpy, Pillow and Node. Coordinates retain
the source node precision (1e-7 degrees). Dimensions come from explicit tags.
"""
import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import json
import math
from pathlib import Path
import re

import osmium
from shapely import STRtree, from_wkb
from shapely.geometry import Point

from pack_sight_surfaces import stops


ROOT = Path(__file__).resolve().parents[1]
GRID, SCALE, RADIUS = 32, 10_000_000, 550
ATTRIBUTES = ("direction", "lamp_mount", "lamp_type", "support", "bollard", "material", "colour")


def metres(raw, default_unit="m"):
    """OSM defaults to metres for height and millimetres for diameter."""
    match = re.fullmatch(r"(\d+(?:[.,]\d+)?)\s*(m|cm|mm|ft|')?", (raw or "").strip().lower())
    if not match:
        return None
    factor = {"m": 1, "cm": .01, "mm": .001, "ft": .3048, "'": .3048}[match[2] or default_unit]
    value = round(float(match[1].replace(",", ".")) * factor, 4)
    return value if value > 0 else None


def restricted(tags):
    return (tags.get("access") in {"private", "military"}
            or tags.get("indoor") not in {None, "no"}
            or tags.get("location") in {"indoor", "underground"})


def blocked_nodes(source, positions):
    """Exclude fixtures on private/indoor ways or inside marked private/indoor areas."""
    ids = list(positions)
    points = STRtree([Point(x/SCALE, y/SCALE) for x, y in positions.values()])
    denied = set()
    keys = osmium.filter.KeyFilter("access", "indoor", "location")
    stream = osmium.FileProcessor(source).with_locations().with_areas(keys).with_filter(keys)
    factory = osmium.geom.WKBFactory()
    for obj in stream:
        if not restricted(obj.tags):
            continue
        if obj.is_way():
            denied.update(n.ref for n in obj.nodes if n.ref in positions)
        elif obj.is_area():
            try:
                shape = from_wkb(factory.create_multipolygon(obj))
            except (RuntimeError, ValueError):
                continue
            if shape.is_valid:
                denied.update(ids[i] for i in points.query(shape, predicate="contains"))
    return denied


def collect(source):
    # A 1/32 degree cell is wider than the search radius throughout Vietnam.
    cells = defaultdict(list)
    for lon, lat in set(map(tuple, stops())):
        cells[math.floor(lon*GRID), math.floor(lat*GRID)].append((lon, lat))
    selection = osmium.filter.TagFilter(("highway", "street_lamp"), ("barrier", "bollard"))
    rows = {}
    for node in osmium.FileProcessor(source, osmium.osm.NODE).with_filter(selection):
        if not node.location.valid() or restricted(node.tags):
            continue
        lon, lat = node.location.lon, node.location.lat
        i, j = math.floor(lon*GRID), math.floor(lat*GRID)
        mx = math.cos(math.radians(lat)) * 111320
        if not any(((x-lon)*mx)**2 + ((y-lat)*110900)**2 <= RADIUS**2
                   for a in range(i-1, i+2) for b in range(j-1, j+2)
                   for x, y in cells.get((a, b), ())):
            continue
        kind = "lamp" if node.tags.get("highway") == "street_lamp" else "bollard"
        row = [kind, node.id, node.location.x, node.location.y]
        attributes = {k: node.tags[k] for k in ATTRIBUTES if k in node.tags}
        row.extend((metres(node.tags.get("height")), metres(node.tags.get("diameter"), "mm"), attributes or None))
        while row[-1] is None:
            row.pop()
        rows[node.id] = row
    denied = blocked_nodes(source, {id_: (row[2], row[3]) for id_, row in rows.items()})
    return [row for id_, row in sorted(rows.items()) if id_ not in denied]


def build(source, output):
    with source.open("rb") as f:
        digest = hashlib.file_digest(f, "sha256").hexdigest()
    grounds = json.loads((ROOT/"dist/sight-grounds/index.json").read_text(encoding="utf8"))
    if digest != grounds["sourceSha256"]:
        raise ValueError("Use the same OSM snapshot as the visitor grounds.")
    bundles = defaultdict(lambda: defaultdict(list))
    counts = Counter()
    for row in collect(source):
        i, j = row[2]*GRID//SCALE, row[3]*GRID//SCALE
        bundles[f"{i//8}_{j//8}"][f"{i}_{j}"].append(row)
        counts[row[0]] += 1
    output.mkdir(parents=True, exist_ok=True)
    for name, tiles in sorted(bundles.items()):
        data = json.dumps(tiles, ensure_ascii=False, separators=(",", ":")).encode()
        (output/(name+".gz")).write_bytes(gzip.compress(data, compresslevel=9, mtime=0))
    timestamp = grounds["osmTimestamp"]
    date = timestamp[2:10].replace("-", "")
    manifest = {
        "grid": GRID, "scale": SCALE, "radiusMeters": RADIUS, "bundles": sorted(bundles),
        "counts": dict(sorted(counts.items())), "sourceSha256": digest, "osmTimestamp": timestamp,
        "source": f"https://download.geofabrik.de/asia/vietnam/vietnam-{date}.osm.pbf",
        "attribution": "© OpenStreetMap contributors", "license": "ODbL 1.0",
    }
    (output/"index.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    print(f"{dict(counts)}, {len(bundles)} regional bundles")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT/"dist/sight-furniture")
    args = parser.parse_args()
    build(args.source, args.output)
