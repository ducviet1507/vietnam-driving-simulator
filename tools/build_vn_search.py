"""Build the Xuyên Việt offline gazetteer from Geofabrik's Vietnam OSM extracts.

Install osmium and shapely, and have Node.js available, then run
  python tools/build_vn_search.py vietnam-261118.osm.pbf vietnam-250101.osm.pbf
The earlier snapshot supplies historical administrative names only.
"""
import argparse
from collections import Counter, defaultdict
from dataclasses import dataclass
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import unicodedata

import osmium
import shapely
from shapely.geometry import LineString, Polygon
from shapely.ops import polygonize

from build_vn_roads import MAIN, permitted

ROOT = Path(__file__).resolve().parents[1]
ROAD_TYPES = MAIN | {k + "_link" for k in MAIN} | {"residential", "living_street", "unclassified", "service"}
AMENITIES = {
    "marketplace": ("market", "Chợ"), "school": ("school", "Trường học"),
    "college": ("school", "Cao đẳng"), "university": ("school", "Đại học"),
    "kindergarten": ("school", "Trường mầm non"), "fuel": ("fuel", "Trạm xăng"),
    "cafe": ("cafe", "Quán cà phê"), "hospital": ("hospital", "Bệnh viện"),
    "clinic": ("hospital", "Phòng khám"), "pharmacy": ("pharmacy", "Nhà thuốc"),
    "restaurant": ("restaurant", "Nhà hàng"), "fast_food": ("restaurant", "Quán ăn"),
    "food_court": ("restaurant", "Khu ẩm thực"), "bank": ("bank", "Ngân hàng"),
    "atm": ("bank", "ATM"), "bus_station": ("station", "Bến xe"),
    "charging_station": ("station", "Trạm sạc"), "parking": ("other", "Bãi đỗ xe"),
    "ferry_terminal": ("station", "Bến phà"), "place_of_worship": ("attraction", "Cơ sở tín ngưỡng"),
}
ALSO_NAMED = {"townhall", "post_office", "library", "police", "theatre", "cinema",
              "community_centre", "courthouse", "embassy", "bar", "pub"}
LODGING = {"hotel", "motel", "hostel", "guest_house", "resort", "apartment", "camp_site"}
SIGHTS = {"attraction", "museum", "gallery", "viewpoint", "theme_park", "zoo", "aquarium"}
PLACES = {"city": "city", "town": "town", "village": "village", "hamlet": "village",
          "suburb": "locality", "quarter": "locality", "neighbourhood": "locality",
          "locality": "locality", "island": "locality"}
NAME_KEYS = ("name", "short_name", "alt_name", "old_name", "name:en", "official_name", "loc_name", "brand", "ref")
ADDRESS_KEYS = ("addr:suburb", "addr:district", "addr:city", "addr:province", "addr:state")
SHOP_LABELS = {"supermarket": "Siêu thị", "convenience": "Cửa hàng tiện lợi",
               "bakery": "Tiệm bánh", "books": "Nhà sách", "mall": "Trung tâm thương mại",
               "clothes": "Cửa hàng quần áo", "mobile_phone": "Cửa hàng điện thoại"}


def clean(value):
    return " ".join((value or "").split())[:180]


def folded(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.casefold().replace("đ", "d"))
                   if not unicodedata.combining(c))


def aliases(values, exclude=()):
    known = {folded(v) for v in exclude}
    result = []
    for value in values:
        for item in re.split(r"[;|]", value or ""):
            item = clean(item)
            key = folded(item)
            if item and key not in known:
                result.append(item)
                known.add(key)
    return " | ".join(result)


def point_in(shape):
    polygon = max(shape.geoms, key=lambda g: g.area) if shape.geom_type == "MultiPolygon" else shape
    p = polygon.representative_point()
    return p.x, p.y


def province_name(name):
    return re.sub(r"^(Tỉnh|Thành phố)\s+", "", name, flags=re.I)


@dataclass
class Boundary:
    name: str
    level: int
    shape: object


def boundaries(source):
    selected = osmium.filter.TagFilter(*[("admin_level", str(i)) for i in (4, 6, 8)])
    stream = osmium.FileProcessor(source).with_areas(selected).with_filter(selected)
    factory = osmium.geom.WKBFactory()
    result, provincial, built = [], {}, set()
    for obj in stream:
        tags = obj.tags
        if tags.get("boundary") != "administrative":
            continue
        level = int(tags["admin_level"])
        name = clean(tags.get("name:vi") or tags.get("name"))
        if not name or name.endswith(" cũ"):
            continue
        if level == 4:
            if not tags.get("ISO3166-2", "").startswith("VN-"):
                continue
            name = province_name(name)
            if obj.is_relation():
                provincial[obj.id] = (name, [m.ref for m in obj.members if m.type == "w" and m.role == "outer"])
        if not obj.is_area() or obj.from_way():
            continue
        try:
            shape = shapely.from_wkb(factory.create_multipolygon(obj))
        except (RuntimeError, ValueError):
            continue
        if not shape.is_empty:
            result.append(Boundary(name, level, shape))
            if level == 4:
                built.add(obj.orig_id())
    # Offshore relation members can be outside the country extract. Recover closed
    # mainland parts of those provinces from the same relation's available ways.
    missing = provincial.keys() - built
    if missing:
        owners = defaultdict(list)
        for ref in missing:
            for way in provincial[ref][1]:
                owners[way].append(ref)
        lines = defaultdict(list)
        for way in osmium.FileProcessor(source).with_locations().with_filter(
                osmium.filter.EntityFilter(osmium.osm.WAY)).with_filter(osmium.filter.IdFilter(owners)):
            coords = [(n.lon, n.lat) for n in way.nodes if n.location.valid()]
            if len(coords) >= 2:
                for ref in owners[way.id]:
                    lines[ref].append(LineString(coords))
        for ref, parts in lines.items():
            polygons = list(polygonize(parts))
            if polygons:
                result.append(Boundary(provincial[ref][0], 4, shapely.union_all(polygons)))
    print(source.name, "boundaries", dict(Counter(b.level for b in result)), flush=True)
    return result


def category(tags, name):
    place = tags.get("place")
    if place in PLACES and name:
        return PLACES[place], name
    amenity = tags.get("amenity")
    if amenity in AMENITIES:
        kind, generic = AMENITIES[amenity]
        if name or amenity in {"marketplace", "school", "hospital", "cafe", "fuel", "bus_station", "ferry_terminal", "pharmacy"}:
            return kind, name or generic
    if not name:
        return None
    if tags.get("shop") not in (None, "no", "vacant"):
        return "shop", name
    if tags.get("tourism") in LODGING:
        return "hotel", name
    if tags.get("tourism") in SIGHTS or tags.get("leisure") in {"park", "stadium", "sports_centre"}:
        return "attraction", name
    if tags.get("natural") in {"beach", "peak", "cave_entrance", "bay"} or tags.get("water") == "lake":
        return "attraction", name
    if tags.get("historic") or tags.get("waterway") == "waterfall":
        return "attraction", name
    if tags.get("railway") in {"station", "halt"} or tags.get("aeroway") in {"aerodrome", "terminal"}:
        return "station", name
    if amenity in ALSO_NAMED or tags.get("office") in {"government", "diplomatic"}:
        return "other", name
    return None


def anchor(obj, factory):
    if obj.is_node():
        if obj.location.valid():
            return obj.location.lon, obj.location.lat
    elif obj.is_way():
        coords = [(n.lon, n.lat) for n in obj.nodes if n.location.valid()]
        if len(coords) >= 2:
            if len(coords) >= 4 and coords[0] == coords[-1]:
                return point_in(Polygon(coords))
            p = LineString(coords).interpolate(.5, normalized=True)
            return p.x, p.y
    elif obj.is_area():
        try:
            return point_in(shapely.from_wkb(factory.create_multipolygon(obj)))
        except (RuntimeError, ValueError):
            pass
    return None


def extract(source):
    # Multipolygon relations can represent a mall, station, school or hospital.
    # Closed ways already have their own anchors and must not be indexed twice.
    named = osmium.filter.KeyFilter("name", "name:vi", "ref", "addr:housenumber", "amenity")
    area = osmium.filter.KeyFilter("shop", "tourism", "amenity", "place", "historic", "addr:housenumber", "leisure", "natural", "water", "railway", "aeroway")
    factory, records = osmium.geom.WKBFactory(), []
    for obj in osmium.FileProcessor(source).with_areas(area).with_filter(named):
        if obj.is_relation() or obj.is_area() and obj.from_way():
            continue
        tags = obj.tags
        if tags.get("boundary") == "administrative" or tags.get("boundary") == "historic":
            continue
        name = clean(tags.get("name:vi") or tags.get("name"))
        ref = clean(tags.get("ref"))
        house, street = clean(tags.get("addr:housenumber")), clean(tags.get("addr:street"))
        address = house + " " + street if house and street and re.search(r"\d", house) else ""
        if tags.get("highway") in ROAD_TYPES and obj.is_way() and (name or ref) and permitted(obj):
            entry = ("road", name or ref)
        else:
            entry = category(tags, name)
        if not entry and not address:
            continue
        xy = anchor(obj, factory)
        if not xy:
            continue
        x, y = (round(v*100000) for v in xy)
        if entry:
            kind, label = entry
            category_label = AMENITIES.get(tags.get("amenity"), ("", ""))[1] or SHOP_LABELS.get(tags.get("shop"))
            alt = aliases([tags.get(k) for k in NAME_KEYS + ADDRESS_KEYS] + [address, category_label], [label])
            records.append((label, kind, x, y, alt))
        if address:
            alt = aliases([tags.get(k) for k in ADDRESS_KEYS], [address])
            records.append((address, "address", x, y, alt))
    print("Located features before aggregation:", len(records), flush=True)
    return records


def assign(points, tree, areas):
    names = [""] * len(points)
    for area in sorted(areas, key=lambda b: -b.shape.area):
        for i in tree.query(area.shape, predicate="covers"):
            names[i] = area.name
    return names


def assemble(raw, current, historical):
    settlements = [i for i, r in enumerate(raw) if r[1] in {"town", "village", "locality"}]
    for old, regions in ((False, current), (True, historical)):
        for area in regions:
            # Current communes and current/former provinces & districts are also
            # searchable destinations even when OSM provides only their polygon.
            if old and area.level == 8:
                continue
            x, y = point_in(area.shape)
            name = area.name
            if old and area.level == 4 and any(b.level == 4 and b.name == name for b in current):
                continue
            label = name+" (cũ)" if old else name
            raw.append((label, "locality", round(x*100000), round(y*100000), name if old else ""))
    points = shapely.points([(r[2]/100000, r[3]/100000) for r in raw])
    tree = shapely.STRtree(points)
    province, commune, current_ward = (assign(points, tree, [b for b in current if b.level == n]) for n in (4,6,8))
    old_province, district, old_ward = (assign(points, tree, [b for b in historical if b.level == n]) for n in (4,6,8))
    # Tiny differences between the old and new border lines can leave a point
    # covered only by the earlier polygon. Resolve its province to the current name.
    outlines = [b for b in current if b.level == 4]
    current_tree = shapely.STRtree([b.shape for b in outlines])
    successors = {}
    for b in historical:
        if b.level == 4:
            interior = shapely.Point(*point_in(b.shape))
            found = current_tree.query(interior, predicate="intersects")
            if len(found) == 1:
                successors[b.name] = outlines[found[0]].name
    # Older commune polygons are incomplete. An actually mapped settlement on
    # the same side of the current commune boundary is a useful nearby alias.
    nearby = {}
    if settlements:
        named_places = shapely.STRtree(points[settlements])
        indices = named_places.query_nearest(points, max_distance=.012, all_matches=False)
        for i, j in zip(*indices):
            source = settlements[j]
            if not old_ward[i] and commune[i] and commune[i] == commune[source] and province[i] == province[source]:
                nearby[i] = raw[source][0]
    streets, other, duplicates = defaultdict(list), [], {}
    for i, (name, kind, x, y, alt) in enumerate(raw):
        region = province[i] or successors.get(old_province[i])
        if not region:
            continue
        local = current_ward[i] or commune[i] or old_ward[i] or district[i]
        neighbour = nearby.get(i)
        if neighbour and neighbour != name and kind not in {"city", "town", "locality", "village"}:
            alt = aliases([alt, "gần "+neighbour])
        alt = aliases([alt, old_ward[i], district[i], old_province[i]], [name, local, region])
        row = [name, kind, x, y, local, region, alt]
        key = folded(name), kind, region, local
        if kind == "road":
            streets[key].append(row)
            continue
        # Collapse near-identical node/area labels, while preserving distinct
        # addresses and branches of the same business along a street.
        cell_x, cell_y = x//20, y//20
        existing = next((record for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                         for record in duplicates.get((key, cell_x+dx, cell_y+dy), ())
                         if (record[2]-x)**2+(record[3]-y)**2 < 17**2), None)
        if existing:
            existing[6] = aliases([existing[6], alt])
        else:
            duplicates.setdefault((key, cell_x, cell_y), []).append(row)
            other.append(row)
    for candidates in streets.values():
        # The chosen anchor is on an actual drivable way, close to the middle of
        # the street in this commune. Repeated OSM splits yield a single result.
        x = sum(row[2] for row in candidates)/len(candidates)
        y = sum(row[3] for row in candidates)/len(candidates)
        row = min(candidates, key=lambda r: (r[2]-x)**2+(r[3]-y)**2)
        row[6] = aliases([r[6] for r in candidates], [row[0],row[4],row[5]])
        other.append(row)
    return sorted(other, key=lambda r: (r[5], r[4], r[3]//500, r[2]//500, r[1], r[0], r[2], r[3]))


def source_info(path):
    with path.open("rb") as f:
        digest = hashlib.file_digest(f, "sha256").hexdigest()
    return {"source": "https://download.geofabrik.de/asia/vietnam/"+path.name, "sha256": digest}


def build(source, historical_source, output):
    current = boundaries(source)
    historical = boundaries(historical_source)
    rows = assemble(extract(source), current, historical)
    output.mkdir(exist_ok=True, parents=True)
    compact = lambda value: json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()
    size = max(1, math.ceil(len(rows)/24))
    shards = []
    for i in range(0, len(rows), size):
        name = f"places-{i//size:02}.gz"
        (output/name).write_bytes(gzip.compress(compact(rows[i:i+size]), compresslevel=8, mtime=0))
        shards.append(name)
    info = {"shards": shards, "scale": 100000, "count": len(rows), "counts": dict(sorted(Counter(r[1] for r in rows).items())),
            "schema": ["name", "kind", "lonE5", "latE5", "locality", "province", "aliases"],
            "sources": [source_info(source), source_info(historical_source)],
            "attribution": "© OpenStreetMap contributors", "license": "ODbL 1.0"}
    (output/"index.json").write_bytes(compact(info))
    subprocess.run(["node", ROOT/"tools/index-atlas-addresses.mjs", output], check=True)
    print(info["counts"], flush=True)
    print(len(rows), "search results in", sum((output/n).stat().st_size for n in shards), "bytes", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("historical_source", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT/"dist/vn-search")
    options = parser.parse_args()
    build(options.source, options.historical_source, options.output)
