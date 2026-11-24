"""Build the spatial scenery layer from the shipped national gazetteer and a Geofabrik PBF.

python tools/build_roadside_survey.py vietnam.osm.pbf  (requires osmium)
"""
from collections import Counter, defaultdict
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import re

import osmium


DIST = Path(__file__).resolve().parents[1] / "dist"
VENUES = {"bank", "cafe", "fuel", "hospital", "hotel", "market", "pharmacy",
          "restaurant", "school", "shop"}
GENERIC = {"atm", "bệnh viện", "cà phê", "chợ", "nhà thuốc", "phòng khám",
           "quán cà phê", "trường học", "trạm xăng"}


def vegetation(tags):
    species = " ".join(tags.get(k, "") for k in ("species", "genus", "taxon", "species:vi")).lower()
    if any(term in species for term in ("arecaceae", "cocos", "phoenix", "roystonea", "coconut", "dừa", "cau vua")):
        return "palm"
    if "pinus" in species or "thông" in species or tags.get("leaf_type") == "needleleaved":
        return "pine"
    return "tree"


def height(tags):
    value = re.fullmatch(r"(\d+(?:\.\d+)?)\s*m?", tags.get("height", "").strip())
    return round(float(value[1]), 1) if value and 1 <= float(value[1]) <= 55 else 0


def pavement_widths(tags):
    # Centimetres. -1 is unknown, -2 is a mapped walk without a measured width.
    both = tags.get("sidewalk:both") or tags.get("sidewalk", "")
    widths = []
    for side in ("left", "right"):
        value = tags.get("sidewalk:" + side, both)
        width = tags.get("sidewalk:" + side + ":width") or tags.get("sidewalk:both:width") or tags.get("sidewalk:width", "")
        if value in {"no", "none"} or value in {"left", "right"} and value != side:
            widths.append(0)
        elif value in {"yes", "both", side} or width and not value:
            measure = re.fullmatch(r"(\d+(?:\.\d+)?)\s*m?", width.strip())
            widths.append(round(float(measure[1])*100) if measure and .4 <= float(measure[1]) <= 12 else -2)
        else:
            widths.append(-1)
    return tuple(widths)


def road_pavements(source, output):
    # Join via OSM endpoint IDs, including the drawing direction. Matching on
    # street names or proximity would swap sides on divided carriageways.
    nodes, ways = defaultdict(dict), {}
    keys = ("sidewalk", "sidewalk:left", "sidewalk:right", "sidewalk:both",
            "sidewalk:width", "sidewalk:right:width", "sidewalk:left:width", "sidewalk:both:width")
    stream = osmium.FileProcessor(source).with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY))
    for way in stream.with_filter(osmium.filter.KeyFilter(*keys)):
        widths = pavement_widths(way.tags)
        if widths == (-1, -1) or not way.tags.get("highway"):
            continue
        coords = [(round(n.lon*100000), round(n.lat*100000)) for n in way.nodes if n.location.valid()]
        if len(coords) != len(way.nodes):
            continue
        ways[way.id] = widths, coords
        for ordinal, node in enumerate(way.nodes):
            nodes[node.ref][way.id] = ordinal
    edges = {}
    for tile in (DIST/"vn-roads").glob("*.gz"):
        for edge, a, b, _, _, _, line in json.loads(gzip.decompress(tile.read_bytes())):
            if a == b or a not in nodes or b not in nodes or edge in edges:
                continue
            matches = set()
            game = list(zip(line[::2], line[1::2]))
            for w in nodes[a].keys() & nodes[b].keys():
                widths, coords = ways[w]
                start, end = nodes[a][w], nodes[b][w]
                path = coords[min(start,end):max(start,end)+1]
                # A shortcut or an opposite arc on a loop can share endpoint
                # IDs. Reject it if either centreline leaves the other's corridor.
                if same_path(game, path):
                    matches.add(widths if start < end else widths[::-1])
            if len(matches) == 1:
                edges[edge] = matches.pop()
    rows = [[edge, *widths] for edge, widths in sorted(edges.items())]
    (output/"pavements.gz").write_bytes(gzip.compress(json.dumps(rows, separators=(",", ":")).encode(), mtime=0))
    return len(edges)


def same_path(first, second):
    if min(len(first), len(second)) < 2:
        return False

    def follows(positions, line):
        for x, y in positions:
            for (ax, ay), (bx, by) in zip(line, line[1:]):
                dx, dy = bx-ax, by-ay
                t = min(1, max(0, ((x-ax)*dx+(y-ay)*dy)/max(1, dx*dx+dy*dy)))
                if (x-ax-t*dx)**2+(y-ay-t*dy)**2 < 36:
                    break
            else:
                return False
        return True
    return follows(first, second) and follows(second, first)


def physical_points(source):
    nodes = osmium.FileProcessor(source, osmium.osm.NODE)
    for node in nodes.with_filter(osmium.filter.TagFilter(("natural", "tree"), ("highway", "bus_stop"),
                                                            ("public_transport", "platform"))):
        t = node.tags
        if not node.location.valid():
            continue
        if t.get("natural") == "tree":
            kind, detail = vegetation(t), height(t)
        elif t.get("highway") == "bus_stop" or t.get("bus") == "yes":
            kind = "bus"
            detail = [t.get("name:vi") or t.get("name", ""), t.get("local_ref") or t.get("ref", ""), t.get("shelter") == "yes"]
        else:
            continue
        yield kind, node.location.lon, node.location.lat, node.id, detail

    keys = ("building:colour", "building:material", "roof:colour", "roof:material")
    ways = osmium.FileProcessor(source).with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY))
    for way in ways.with_filter(osmium.filter.KeyFilter("natural", *keys)):
        t = way.tags
        row = t.get("natural") == "tree_row"
        finishes = {k: t[k] for k in keys if k in t} if "building" in t or "building:part" in t else {}
        if not row and not finishes:
            continue
        coords = [(n.lon, n.lat) for n in way.nodes if n.location.valid()]
        if not coords:
            continue
        if finishes:
            x, y = coords[0]
            yield "finish", x, y, "w" + str(way.id), finishes
        if row:
            # Stations run continuously across the polyline, including short bends.
            station, next_tree = 0, 4
            for (x, y), (bx, by) in zip(coords, coords[1:]):
                length = 111320 * math.hypot((bx-x)*math.cos(math.radians(y)), by-y)
                while next_tree < station + length:
                    f = (next_tree-station)/length
                    yield "row", x+(bx-x)*f, y+(by-y)*f, f"{way.id}/{next_tree}", [vegetation(t), height(t)]
                    next_tree += 8
                station += length


def build(source, output):
    chunks = defaultdict(lambda: defaultdict(list))
    counts, regions = Counter(), Counter()

    def add(kind, x, y, ref, detail):
        lon, lat = round(x*1e6), round(y*1e6)
        i, j = lon*32//1000000, lat*32//1000000
        chunks[f"{i//8}_{j//8}"][f"{i}_{j}"].append([kind, lon, lat, ref, detail])
        counts[kind] += 1

    atlas = DIST / "vn-search"
    index = json.loads((atlas / "index.json").read_bytes())
    for shard in index["shards"]:
        for name, kind, x, y, _, region, _ in json.loads(gzip.decompress((atlas / shard).read_bytes())):
            if kind in VENUES and name.strip() and name.casefold() not in GENERIC:
                add(kind, x/index["scale"], y/index["scale"], 0, name)
                regions[region] += 1
    for feature in physical_points(source):
        add(*feature)

    output.mkdir(parents=True, exist_ok=True)
    compact = lambda value: json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode()
    for key, cells in sorted(chunks.items()):
        for rows in cells.values():
            rows.sort(key=lambda r: (r[2], r[1], r[0], str(r[3])))
        (output / (key+".gz")).write_bytes(gzip.compress(compact(cells), mtime=0))
    with osmium.io.Reader(str(source)) as reader:
        timestamp = reader.header().get("osmosis_replication_timestamp")
    with source.open("rb") as handle:
        checksum = hashlib.file_digest(handle, "sha256").hexdigest()
    manifest = {"bundles": sorted(chunks), "counts": dict(sorted(counts.items())), "pavementEdges": road_pavements(source, output),
                "venuesByProvince": dict(sorted(regions.items())), "venueSource": "../vn-search/index.json",
                "snapshot": timestamp, "source": "https://download.geofabrik.de/asia/vietnam/vietnam-"+timestamp[2:10].replace("-", "")+".osm.pbf",
                "sha256": checksum, "scale": 1000000, "attribution": "© OpenStreetMap contributors", "license": "ODbL 1.0"}
    (output/"index.json").write_bytes(compact(manifest))
    print(len(chunks), "bundles", dict(counts), len(regions), "provinces")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=DIST / "vn-roadside")
    args = parser.parse_args()
    build(args.source, args.output)
