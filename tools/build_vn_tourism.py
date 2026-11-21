"""Build the offline visitor atlas from the Geofabrik Vietnam PBF and bundled road tiles.

Install osmium and shapely, then run: python tools/build_vn_tourism.py vietnam.osm.pbf
Coordinates, names and references © OpenStreetMap contributors, ODbL 1.0.
"""
import argparse
from collections import defaultdict
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import unicodedata

import osmium
from shapely import STRtree, from_wkb
from shapely.geometry import LineString, Point, box
from shapely.ops import polygonize


TAGS = {
    "tourism": {"museum": "Bảo tàng", "attraction": "Tham quan", "viewpoint": "Điểm ngắm cảnh",
                "gallery": "Phòng trưng bày", "theme_park": "Công viên", "zoo": "Vườn thú",
                "aquarium": "Thủy cung"},
    "historic": {"monument": "Di tích", "memorial": "Di tích", "castle": "Thành cổ",
                 "archaeological_site": "Khảo cổ", "fort": "Thành cổ", "temple": "Đền chùa",
                 "ruins": "Di tích", "building": "Kiến trúc", "tomb": "Lăng mộ", "tower": "Di tích"},
    "natural": {"beach": "Bãi biển", "cave_entrance": "Hang động", "peak": "Đỉnh núi", "bay": "Vịnh"},
    "water": {"lake": "Hồ"},
    "leisure": {"nature_reserve": "Khu bảo tồn", "park": "Công viên", "garden": "Vườn cảnh"},
    "waterway": {"waterfall": "Thác nước"},
    "boundary": {"national_park": "Vườn quốc gia"},
    "amenity": {"place_of_worship": "Công trình tín ngưỡng"},
    "man_made": {"lighthouse": "Hải đăng"}
}
GROUPS = {
    "Bắc Bộ": "Cao Bằng|Điện Biên|Hà Nội|Hải Phòng|Lai Châu|Lạng Sơn|Lào Cai|Sơn La|Tuyên Quang|Thái Nguyên|Bắc Ninh|Phú Thọ|Hưng Yên|Quảng Ninh|Ninh Bình",
    "Trung Bộ": "Thanh Hóa|Nghệ An|Hà Tĩnh|Quảng Trị|Huế|Đà Nẵng|Quảng Ngãi|Gia Lai|Đắk Lắk|Khánh Hòa|Lâm Đồng",
    "Nam Bộ": "Đồng Nai|Tây Ninh|Hồ Chí Minh|Đồng Tháp|Vĩnh Long|Cần Thơ|An Giang|Cà Mau"
}
REGIONS = {p: r for r, names in GROUPS.items() for p in names.split("|")}
HIGHLIGHTS = set("vinh ha long|ho ba be|ho tuyen lam|ho xuan huong|ho nui coc|ho thac ba|ho lak|ho tay|ho hoan kiem|vinh lan ha|vinh vinh hy|vinh nha trang|phong nha|trang an|bich dong|tam coc|thac ban gioc|thac dray nur|thac pongour|mui ca mau|nha tu con dao|lang co duong lam|den hung|cau rong|chua cau|dinh doc lap|pho co dong van|thanh nha ho|kinh thanh hue|ngo mon|thanh dia my son|thap ba ponagar|chua thien mu".split("|"))
# Broad, user-defined OSM attraction/viewpoint tags also contain shops and directions.
# Require a recognizable feature name or independent heritage/Wikidata reference.
FEATURE = re.compile(r"\b(chua|dinh|thanh|doi|tham|dam|dao|dia dao|ho|cho|cot|dai|hoang cung|dien|lang|phu|tuong|nh[aà]|ph[oó]|vien|ke|khe|gieng|khu du lich|khu di tich|goc ngam|ghenh|nui|cong|hang|dong|mieu|bai|hon|thap|thac|vien|suoi|deo|cau|rung|bao tang|di tich|buon|ban|hai dang|vung|thung lung|vung tau|mui|vach da|quang truong|da chong|thanh dia|den|chung vien|vuon)\b")
SPAM = re.compile(r"(http|www\.|\.com\b|karaoke|casino|rent land|vip game|small hole|fork road|no fee|motorbike rental|close[d]?\?|sales office|noi that|cong ty|tnhh|shop\b|homestay|bag rack repair|aucune attraction|take right|business|phong kham|massage| nha dat |bat dong san|duong vao|loi vao|back entrance)")
# Historic labels still found on some partially updated OSM boundary relations.
MERGED = {"Quảng Bình": "Quảng Trị", "Yên Bái": "Lào Cai", "Hòa Bình": "Phú Thọ"}


def normalize(name):
    return "".join(c for c in unicodedata.normalize("NFKD", name.lower().replace("đ", "d"))
                   if not unicodedata.combining(c)).strip()


def display_name(name):
    # A tone mark after whitespace has no letter to attach to.
    name = re.sub(r"(?<!\S)[\u0300-\u0303\u0306\u0309\u031b\u0323]+", "", name)
    return unicodedata.normalize("NFC", name.strip())


def province_name(tags):
    name = tags.get("name:vi") or tags.get("name") or ""
    if not tags.get("ISO3166-2", "").startswith("VN-") or name.endswith(" cũ"):
        return None
    province = re.sub(r"^(Tỉnh|Thành phố) ", "", name)
    return MERGED.get(province, province)


def complete_clipped_provinces(source, provinces):
    """The country extract can clip outlying islands of a multipolygon while retaining its mainland ring."""
    missing = REGIONS.keys() - {name for name, _ in provinces}
    if not missing:
        return
    ways = defaultdict(set)
    for rel in osmium.FileProcessor(source, osmium.osm.RELATION).with_filter(osmium.filter.TagFilter(("admin_level","4"))):
        name = province_name(rel.tags)
        if name in missing:
            for member in rel.members:
                if member.type == 'w' and member.role == 'outer':
                    ways[member.ref].add(name)
    lines = defaultdict(list)
    for way in osmium.FileProcessor(source).with_locations().with_filter(
            osmium.filter.EntityFilter(osmium.osm.WAY)).with_filter(osmium.filter.IdFilter(ways.keys())):
        vertices = [(n.lon,n.lat) for n in way.nodes if n.location.valid()]
        if len(vertices)>=2:
            for name in ways[way.id]:
                lines[name].append(LineString(vertices))
    for name, segments in lines.items():
        provinces.extend((name,p.simplify(.00005)) for p in polygonize(segments))


def extract(source):
    pairs = [(key, value) for key, values in TAGS.items() for value in values]
    filters = osmium.filter.TagFilter(*pairs, ("admin_level", "4"))
    processor = osmium.FileProcessor(source).with_locations().with_areas(filters).with_filter(filters)
    factory = osmium.geom.WKBFactory()
    provinces, points = [], []
    for obj in processor:
        tags = obj.tags
        name = display_name(tags.get("name:vi") or tags.get("name") or "")
        if not name or len(name) > 110:
            continue
        if obj.is_area() and not obj.from_way() and tags.get("admin_level") == "4":
            province = province_name(tags)
            if province in REGIONS:
                polygon = from_wkb(factory.create_multipolygon(obj))
                provinces.append((province, polygon.simplify(.00005)))
            continue
        if obj.is_relation() or (obj.is_area() and obj.from_way()):
            continue
        kind = next((values[tags[k]] for k, values in TAGS.items()
                     if tags.get(k) in values), None)
        if not kind:
            continue
        linked = bool(tags.get("wikidata") or tags.get("wikipedia") or tags.get("heritage"))
        folded = normalize(name)
        highlight = folded in HIGHLIGHTS
        if SPAM.search(folded) or len(folded)<3:
            continue
        # The extract includes shops and directions accidentally tagged as
        # cave entrances or museums. Keep native-language cave/place names.
        if not linked and kind=="Hang động" and (not re.search(
                r"\b(hang|dong|tham|cave|caves|grotto|grotte|nguom|entrance|exit|underground|lung khuy)\b",folded)
                or re.search(r"\b(cap dien|thanh ly|thoi trang|dong ho hoa|xe dien|solar|1 cave ngay)\b",folded)):
            continue
        if not linked and (folded in {"xuat phat","diem den","dia diem","xe 2","nha 38","nice waterfall","small river"}
                           or folded.startswith(("you have a road ","truong mam non ")) and kind in {"Công viên","Thác nước"}):
            continue
        name = re.sub(r"\s*[.,;]?\s*(?:ĐT|SĐT|Tel)\s*[:.]\s*[\d. +()-]{8,}$","",name,flags=re.I).strip()
        if not linked and (re.search(r"^(photocopy|nga re|ap |phuong |xa |duong doa[nm] |cx so |chau battery)", folded)
                           or re.match(r"^(ho (xu ly|nuoc thai)|be lang|tram bom)\b", folded)):
            continue
        if kind in {"Tham quan","Điểm ngắm cảnh"} and not (linked or highlight or FEATURE.search(folded)):
            continue
        if re.fullmatch(r"(view\s?point|museum|pagoda|beach|attraction|memorial|tuong dai|di tich|nghia trang liet si|chua|den|nha tho|bai bien|war memorial|tourist attraction|waterfall|hang dong)( \d+)?", folded):
            continue
        if tags.get("access") in {"no", "private", "military"}:
            continue
        if not linked and folded.startswith("chua ") and kind in {"Tham quan", "Bảo tàng", "Di tích"}:
            kind = "Công trình tín ngưỡng"
        if obj.is_node():
            x, y = obj.location.lon, obj.location.lat
            ref = f"node/{obj.id}"
        elif obj.is_way():
            vertices = [(n.lon, n.lat) for n in obj.nodes if n.location.valid()]
            if len(vertices) < 2:
                continue
            x = (min(a for a,b in vertices)+max(a for a,b in vertices))/2
            y = (min(b for a,b in vertices)+max(b for a,b in vertices))/2
            ref = f"way/{obj.id}"
        else:
            point = from_wkb(factory.create_multipolygon(obj)).representative_point()
            x, y, ref = point.x, point.y, f"relation/{obj.orig_id()}"
        rating = 8*highlight + 4*linked + (2 if kind in {"Bảo tàng","Thành cổ","Thác nước","Vườn quốc gia","Khảo cổ","Hang động","Hải đăng"} else 0)
        rating -= int(kind in {"Công trình tín ngưỡng","Điểm ngắm cảnh"})
        if tags.get("tourism") and tags.get("historic"):
            rating += 2
        points.append([rating, ref, name, kind, round(x,6), round(y,6), tags.get("wikidata","")])
    complete_clipped_provinces(source, provinces)
    return provinces, points


def road_bounds(key, splits):
    i,j,*sub = map(int,key.split("_"))
    n = splits[f"{i}_{j}"] if sub else 1
    a,b = sub or (0,0)
    return box((i+a/n)/4, (j+b/n)/4, (i+(a+1)/n)/4, (j+(b+1)/n)/4)


def road_approaches(pins, roads, index):
    # Query occupied tiles by distance, including sites far from a road and
    # sites near a tile edge. Batch the second pass to read each gzip once.
    keys = [k for k in index["tiles"] if k not in index["splits"]] + index["subtiles"]
    bounds = STRtree([road_bounds(k,index["splits"]) for k in keys])
    groups = defaultdict(list)
    first = []
    for i,(_,_,_,_,_,x,y,_) in enumerate(pins):
        tile = int(bounds.nearest(Point(x,y)))
        groups[tile].append(i)
        first.append(tile)
    nearest = {}

    def visit(batches):
        for tile, ids in batches.items():
            with gzip.open(roads/(keys[tile]+".gz"), "rt", encoding="utf8") as src:
                rows = json.load(src)
            scale = math.cos(math.radians(bounds.geometries[tile].centroid.y))
            lines = [LineString([(x*scale/1e5,y/1e5) for x,y in zip(r[6][::2],r[6][1::2])])
                     for r in rows if r[4] not in {"motorway","trunk"} and not r[4].endswith("_link")]
            if not lines:
                continue
            tree = STRtree(lines)
            for i in ids:
                x,y = pins[i][5:7]
                local = Point(x*scale,y)
                line = lines[tree.nearest(local)]
                p = line.interpolate(line.project(local))
                sx,sy = p.x/scale,p.y
                d = 111100*math.hypot((sx-x)*math.cos(math.radians(y)),sy-y)
                if i not in nearest or d < nearest[i][0]:
                    nearest[i] = d,round(sx,6),round(sy,6)
    visit(groups)
    adjacent = defaultdict(list)
    for i,(_,_,_,_,_,x,y,_) in enumerate(pins):
        radius = nearest.get(i,(100000,))[0]/111100 + .00005
        dx = radius/math.cos(math.radians(y))
        for tile in bounds.query(box(x-dx,y-radius,x+dx,y+radius)):
            if tile!=first[i]:
                adjacent[tile].append(i)
    visit(adjacent)
    return nearest


def build(source, roads):
    provinces, points = extract(source)
    print("Mapped province polygons:", sorted({name for name, _ in provinces}), flush=True)
    index = json.loads((roads/"index.json").read_text(encoding="utf8"))
    towns = json.loads((roads/"overview.json").read_text(encoding="utf8"))["places"]
    boundaries = STRtree([polygon for _, polygon in provinces])
    pins = []
    for rating, ref, name, kind, x, y, wd in points:
        candidates = boundaries.query(Point(x,y), predicate="intersects")
        if len(candidates):
            province = provinces[min(candidates, key=lambda i: provinces[i][1].area)][0]
            pins.append((province,rating,ref,name,kind,x,y,wd))
    accessible = defaultdict(list)
    for i,(metres,sx,sy) in road_approaches(pins,roads,index).items():
        province,rating,ref,name,kind,x,y,wd = pins[i]
        accessible[province].append((rating,ref,name,kind,x,y,wd,sx,sy,round(metres)))
    rows,aliases = [],{}
    for province, pois in sorted(accessible.items()):
        names, entities = defaultdict(list),defaultdict(list)
        for rating,ref,name,kind,x,y,wd,sx,sy,dist in sorted(pois,key=lambda p:(-p[0],p[9],p[1])):
            norm = normalize(name)
            possible=names[norm]+(entities[wd] if wd else [])
            same=next((key for px,py,key in possible if abs(px-x)<.002 and abs(py-y)<.002),None)
            if same:
                aliases["osm-"+ref.replace("/","-")]="osm-"+same.replace("/","-")
                continue
            town = min(towns,key=lambda t:((t[1]-x)*math.cos(math.radians(y)))**2+(t[2]-y)**2)[0]
            rows.append([ref,name,province,town,kind,x,y,sx,sy,dist,REGIONS[province]])
            names[norm].append((x,y,ref))
            if wd:
                entities[wd].append((x,y,ref))
    return rows,index,aliases


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pbf", type=Path)
    parser.add_argument("--roads",type=Path,default=Path("dist/vn-roads"))
    parser.add_argument("--output",type=Path,default=Path("dist/tourism-catalog.js"))
    args = parser.parse_args()
    rows,index,aliases = build(args.pbf,args.roads)
    print(f"Selected {len(rows)} destinations in {len(set(r[2] for r in rows))} provinces",flush=True)
    compact = lambda v: json.dumps(v,ensure_ascii=False,separators=(",",":"))
    with args.pbf.open("rb") as f:
        digest = hashlib.file_digest(f, "sha256").hexdigest()
    content = """'use strict';
// Coordinates and names © OpenStreetMap contributors. Derived database under ODbL 1.0.
// Source https://download.geofabrik.de/asia/vietnam.html
// License https://opendatacommons.org/licenses/odbl/1-0/
window.VietnamTourism = {
"""
    metadata = {"attribution":"© OpenStreetMap contributors","license":"ODbL 1.0",
                "source":"https://download.geofabrik.de/asia/vietnam.html",
                "sourceSha256":digest,"roadSnapshot":index.get("osmTimestamp")}
    content += "  metadata: "+compact(metadata)+",\n  aliases: "+compact(aliases)+",\n  entries: [\n"
    content += ",\n".join("    "+compact(row) for row in rows)
    content += """
  ].map(([ref,name,province,locality,kind,lon,lat,startLon,startLat,approachMeters,region])=>({
    id:'osm-'+ref.replace('/','-'),name,province,city:province,locality,region,kind,lon,lat,
    start:[startLon,startLat],approachMeters,map:'https://www.openstreetmap.org/'+ref
  }))
};
"""
    args.output.write_text(content,encoding="utf8")
