"""Extract mapped visitor grounds around Vietnam atlas destinations from the road snapshot.

python tools/build_sight_grounds.py vietnam-261118.osm.pbf
Requires osmium and shapely. Coordinates are WGS84 in millionths of a degree.
"""
import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import json
import math
from pathlib import Path
import subprocess

import osmium
from shapely import STRtree, from_wkb, union_all
from shapely.affinity import scale
from shapely.geometry import Point, LineString, box

from build_tour_buildings import metres


ROOT = Path(__file__).resolve().parents[1]
GRID, SCALE = 32, 1000000
KEYS = ("highway","barrier","amenity","leisure","man_made","natural","tourism","historic","landuse","place")
PERIMETERS = {"wall", "hedge", "city_wall", "retaining_wall", "fence", "railing"}
GATES = {"gate", "entrance", "lift_gate", "swing_gate", "sliding_gate", "kissing_gate", "stile"}
RESTRICTED = {"private", "no", "military", "forestry", "agricultural"}

# These OSM ways cross a specific perimeter geometrically without sharing a node.
# Museum driveway w602887554, mosque forecourt w165491090, and the four flights
# of steps at Phú Diên (w1145070774, 777, 781, 783).
MAPPED_GAPS = {
    197995330: [(106.6611446, 10.8049553, 5.5)],
    165491086: [(106.7046496, 10.7761398, 4)],
    1145070775: [(107.7462677, 16.4957386, 2.8), (107.7460134, 16.4958224, 2.8),
                 (107.7460917, 16.4956365, 2.8), (107.7461638, 16.4959048, 2.8)],
}
MAPPED_DRIVES = {602887554, 165491090}

# Short, illustrative pedestrian entrances on the public frontage. Use the same
# line for the ground finish and the opening in that site's wall.
FRONT_WALKS = {
    888629812: (3.2, [(105.8275619, 21.0079302), (105.8276098, 21.0080280)]),  # Chùa Bộc
    683697174: (2.2, [(106.7058911, 10.7655729), (106.7059570, 10.7656002)]),  # Miếu Khánh An
    1153199097: (3.4, [(106.6910790, 10.7795113), (106.6909649, 10.7796168)]),  # Tổng Giám mục
}


def visitor_way_width(tags):
    road = tags.get("highway")
    if tags.get("area") == "yes" or any(tags.get(k) not in {None, "no"} for k in ("bridge", "tunnel", "indoor")):
        return 0
    if road in {"steps", "path", "footway", "pedestrian", "cycleway"}:
        access = tags.get("foot", tags.get("access"))
        fallback = 1.5 if road == "path" else 2.4
    elif road in {"service", "residential", "living_street", "unclassified", "tertiary", "secondary", "primary"}:
        access = next((tags[k] for k in ("motorcar", "motor_vehicle", "vehicle", "access") if k in tags), None)
        fallback = 4 if road == "service" else 5.5
    else:
        return 0
    return 0 if access in RESTRICTED else min(14, metres(tags.get("width")) or fallback)


def visitor_access(source):
    # Match node IDs. Roads on the other side of a wall or on an overpass do
    # not imply an entrance. A tagged gate width takes priority over road width.
    wall_nodes, denied, gates, crossings = set(), set(), {}, {}
    wall_edges, lane_ends, entrance_lanes = set(), set(), set()
    objects = osmium.FileProcessor(source, osmium.osm.NODE | osmium.osm.WAY)
    for obj in objects.with_filter(osmium.filter.KeyFilter("barrier", "entrance")):
        barrier = obj.tags.get("barrier")
        if obj.is_way():
            if barrier in PERIMETERS:
                refs = [n.ref for n in obj.nodes]
                wall_nodes.update(refs)
                wall_edges.update(tuple(sorted(pair)) for pair in zip(refs, refs[1:]))
            continue
        if (obj.tags.get("locked") == "yes" or obj.tags.get("access") in RESTRICTED
                or barrier and barrier not in GATES or obj.tags.get("entrance") in {"no", "emergency", "exit"}):
            denied.add(obj.id)
        elif barrier in GATES or obj.tags.get("entrance"):
            width = metres(obj.tags.get("width")) or metres(obj.tags.get("maxwidth:physical"))
            gates[obj.id] = width or (1.1 if barrier in {"kissing_gate", "stile"} else 0)
    candidates = wall_nodes | gates.keys()
    for way in osmium.FileProcessor(source, osmium.osm.WAY).with_filter(osmium.filter.KeyFilter("highway")):
        refs = [n.ref for n in way.nodes]
        shared = candidates.intersection(refs) - denied
        if not shared:
            continue
        width = visitor_way_width(way.tags)
        if not width:
            continue
        # A path following the wall shares an edge, not just a crossing node.
        along = set()
        for a, b in zip(refs, refs[1:]):
            if a in shared and b in shared and tuple(sorted((a,b))) in wall_edges:
                along.update((a,b))
        shared.difference_update(ref for ref in along if ref not in gates)
        for ref in shared:
            crossings[ref] = max(width, crossings.get(ref, 0))
        if shared and way.tags["highway"] == "service":
            entrance_lanes.add(way.id)
            lane_ends.update((refs[0], refs[-1]))
    openings = {ref: min(14, gates.get(ref) or crossings.get(ref) or 2.4)
                for ref in wall_nodes.intersection(gates.keys() | crossings.keys())}
    return openings, gates.keys(), entrance_lanes, lane_ends


def cut_openings(wall, way, openings, gates):
    gaps = list(MAPPED_GAPS.get(way.id, ()))
    if way.id in FRONT_WALKS:
        width, coords = FRONT_WALKS[way.id]
        entry = wall.intersection(LineString(coords))
        if entry.geom_type == "Point" and not entry.is_empty:
            gaps.append((entry.x, entry.y, width))
    posts = []
    def gap_disc(x, y, width):
        return scale(Point(x,y).buffer(1), width / (2 * 111320 * math.cos(math.radians(y))),
                     width / (2 * 110900), origin=(x,y))
    for n in way.nodes:
        if n.ref in openings and n.location.valid():
            gaps.append((n.lon, n.lat, openings[n.ref]))
            if n.ref in gates:
                # Centre each jamb outside the clear width. At a bend or the
                # end of a wall, keep only the actual wall/disc intersection.
                jambs = wall.intersection(gap_disc(n.lon, n.lat, openings[n.ref]+.54).boundary)
                posts.extend(p for p in getattr(jambs,"geoms",[jambs]) if p.geom_type=="Point" and not p.is_empty)
    cuts = [gap_disc(x,y,width) for x,y,width in gaps]
    return (wall.difference(union_all(cuts)) if cuts else wall), posts


def fence_style(tags):
    style=tags.get("fence_type") or tags.get("wall") or tags.get("material")
    if style in {"railing","metal","bars","metal_bars","iron"}:
        return "bars"
    if style in {"chain_link","mesh","wire","barbed_wire"}:
        return "mesh"
    if style in {"split_rail","wood","wooden","picket"}:
        return "timber"
    if style in {"wall","brick","dry_stone","stone","concrete","concrete_block"}:
        return style
    if style in {"metal_sheet","corrugated_metal"}:
        return "sheet"
    return ""


def way_finish(tags):
    surface=tags.get("surface")
    if surface in {"dirt","earth","ground","gravel","fine_gravel","compacted","sand"}:
        return "gravel"
    if surface in {"asphalt","concrete","concrete:plates","wood","brick","sett","cobblestone","stone"}:
        return surface
    return ""


def feature(tags, area=False, point=False):
    if tags.get("access") in {"private","no","military"} or tags.get("indoor")=="yes" or tags.get("tunnel")=="yes":
        return
    if point:
        if tags.get("natural")=="tree":
            species=" ".join(tags.get(k,"").lower() for k in ("genus","species","taxon"))
            if any(name in species for name in ("cocos","areca","roystonea","phoenix","coconut")):
                return "palm"
            return "pine" if tags.get("leaf_type")=="needleleaved" or "pinus" in species else "tree"
        if tags.get("amenity") in {"bench","picnic_table"}:
            return tags["amenity"]
        if tags.get("information") in {"board","map"}:
            return "board"
        if tags.get("memorial") in {"stele","obelisk","stone"}:
            return tags["memorial"]
        if tags.get("man_made") == "flagpole":
            return "flagpole"
        return
    road = tags.get("highway")
    if area:
        if tags.get("building") or tags.get("boundary"):
            return
        if tags.get("area")=="yes" and road in {"pedestrian","footway"} or tags.get("place")=="square":
            return "court"
        if tags.get("natural") in {"beach","sand","bare_rock"}:
            return "rock" if tags["natural"]=="bare_rock" else "sand"
        if tags.get("landuse") in {"orchard","vineyard","farmland","plantation"}:
            if tags.get("crop")=="tea" or tags.get("trees")=="tea_plants":
                return "tea"
            if tags.get("landuse")=="orchard":
                return "orchard"
        if tags.get("landuse") in {"grass","flowerbed"} or tags.get("leisure")=="garden":
            return "lawn"
        return
    if tags.get("area")=="yes":
        return
    if tags.get("natural")=="tree_row":
        return "avenue"
    if tags.get("barrier") in GATES and not road and tags.get("locked")!="yes":
        return "gate_line"
    if tags.get("barrier") in PERIMETERS:
        return tags["barrier"]
    if tags.get("man_made")=="pier":
        return "pier"
    if road == "service" and visitor_way_width(tags):
        return "drive"
    if road in {"steps","path","footway","pedestrian"}:
        if tags.get("footway") in {"sidewalk","crossing"} or tags.get("bridge") not in {None,"no"}:
            return
        if road=="steps":
            return "steps"
        return "trail" if tags.get("surface") in {"dirt","earth","ground","unpaved","gravel"} or road=="path" and not tags.get("surface") else "walk"


def pack(coords):
    result = []
    for lon,lat in coords:
        p = round(lon*SCALE),round(lat*SCALE)
        if not result or p!=result[-1]:
            result.append(p)
    dx = dy = 0
    out = []
    for x,y in result:
        out.extend((x-dx,y-dy))
        dx,dy = x,y
    return out


def build(source, output):
    openings, gates, entrance_lanes, lane_ends = visitor_access(source)
    entrance_lanes.update(MAPPED_DRIVES)
    script = r"""const fs=require('fs');global.window=global;
const tags=Array.from(fs.readFileSync('index.html','utf8').matchAll(/src="([^"]+\.js)"/g),m=>m[1]);
for(const file of tags.slice(tags.indexOf('tourism-catalog.js'),tags.indexOf('vietnam-landmarks.js')+1))require('./'+file);
console.log(JSON.stringify([...VietnamTourism.entries,...VietnamLandmarks.entries].flatMap(s=>[[s.lon,s.lat],s.start])));"""
    sites = set(map(tuple,json.loads(subprocess.check_output(["node","-e",script],cwd=ROOT/"dist"))))
    boxes = [box(x-.0048,y-.00455,x+.0048,y+.00455) for x,y in sites]
    nearby = STRtree(boxes)
    tiles = defaultdict(list)
    counts = Counter()
    emitted_posts = set()
    def add_post(p, kind, height):
        xy = pack(p.coords)
        if tuple(xy) in emitted_posts or not len(nearby.query(p,predicate="intersects")):
            return
        emitted_posts.add(tuple(xy))
        tiles[math.floor(p.x*GRID),math.floor(p.y*GRID)].append([kind,height,[xy]])
        counts[kind]+=1
    filters = osmium.filter.KeyFilter(*KEYS)
    stream = osmium.FileProcessor(source).with_locations().with_areas(filters).with_filter(filters)
    factory = osmium.geom.WKBFactory()
    for obj in stream:
        node,area = obj.is_node(),obj.is_area()
        kind = feature(obj.tags,area,node)
        if not kind or obj.is_relation():
            continue
        if kind == "drive" and obj.id not in entrance_lanes and not any(n.ref in lane_ends for n in obj.nodes):
            continue
        if node:
            shape = Point(obj.location.lon,obj.location.lat)
        elif area:
            try:
                shape = from_wkb(factory.create_multipolygon(obj))
            except (ValueError,RuntimeError):
                continue
        else:
            if obj.is_closed() and (kind=="pier" or obj.tags.get("area")=="yes"):
                continue
            coords = [(n.lon,n.lat) for n in obj.nodes if n.location.valid()]
            if len(coords)<2:
                continue
            shape = LineString(coords)
        if shape.is_empty or not shape.is_valid:
            continue
        # Only read cells touched by the mapped feature and close to a visitor stop.
        w,s,e,n = shape.bounds
        if not len(nearby.query(shape,predicate="intersects")):
            continue
        finish = ""
        if kind=="gate_line":
            # Only a linear gate spanning a gap defines two jamb positions.
            length = math.hypot((coords[0][0]-coords[-1][0])*111320*math.cos(math.radians(s)),
                                (coords[0][1]-coords[-1][1])*110900)
            if 1.1<=length<=16:
                for point in (coords[0],coords[-1]):
                    add_post(Point(point),"gate_post",metres(obj.tags.get("height")))
            continue
        if kind in PERIMETERS:
            finish = fence_style(obj.tags)
            shape, posts = cut_openings(shape, obj, openings, gates)
            post_kind = "gate_post" if kind in {"fence","railing","hedge"} else "gate_pier"
            for p in posts:
                add_post(p,post_kind,metres(obj.tags.get("height")))
            if shape.is_empty:
                continue
        elif kind in {"court","walk","trail","drive","steps"}:
            finish = way_finish(obj.tags)
        dimension = "height" if kind in PERIMETERS or kind in {"flagpole","stele","stone","obelisk","tree","pine","palm","avenue"} else "width"
        size = metres(obj.tags.get(dimension))
        detail = metres(obj.tags.get("width")) if kind in PERIMETERS else 0
        count_tag = obj.tags.get("step_count","")
        if kind=="steps" and count_tag.isdigit() and int(count_tag)>0:
            run=sum(math.hypot((x-a)*111320*math.cos(math.radians(y)),(y-b)*110900)
                    for (a,b),(x,y) in zip(coords,coords[1:]))
            detail = round(run/int(count_tag),2)
        for i in range(math.floor(w*GRID),math.floor(e*GRID)+1):
            for j in range(math.floor(s*GRID),math.floor(n*GRID)+1):
                tile = box(i/GRID,j/GRID,(i+1)/GRID,(j+1)/GRID)
                if not len(nearby.query(tile)):
                    continue
                part = shape if tile.covers(shape) else shape.intersection(tile)
                for g in getattr(part,"geoms",[part]):
                    if g.is_empty or g.geom_type!=("Point" if node else "Polygon" if area else "LineString"):
                        continue
                    if not node and not len(nearby.query(g,predicate="intersects")):
                        continue
                    if area:
                        g = g.simplify(.000003)
                        rings = [pack(g.exterior.coords[:-1])]+[pack(r.coords[:-1]) for r in g.interiors]
                        if len(rings[0])<6:
                            continue
                        rings = [r for r in rings if len(r)>=6]
                    else:
                        rings = [pack(g.coords)]
                        if not node and len(rings[0])<4:
                            continue
                    extra=[finish,detail,obj.id] if kind=="steps" else [finish,detail] if detail else [finish] if finish else []
                    tiles[i,j].append([kind,size,rings,*extra])
                    counts[kind]+=1
    # One request can serve several adjacent sight cells.
    for width, coords in FRONT_WALKS.values():
        cells = {(math.floor(x * GRID), math.floor(y * GRID)) for x, y in coords}
        if len(cells) != 1:
            raise ValueError("Frontage path must fit within one grounds cell")
        tiles[cells.pop()].append(["walk", width, [pack(coords)]])
        counts["walk"] += 1
    bundles = defaultdict(dict)
    for (i,j),rows in sorted(tiles.items()):
        bundles[f"{i//8}_{j//8}"][f"{i}_{j}"] = rows
    output.mkdir(exist_ok=True)
    for key,rows in bundles.items():
        data = json.dumps(rows,separators=(",",":")).encode()
        (output/(key+".gz")).write_bytes(gzip.compress(data,compresslevel=8,mtime=0))
    with source.open("rb") as raw:
        digest = hashlib.file_digest(raw, "sha256").hexdigest()
    manifest = {"bundles":sorted(bundles),"grid":GRID,"scale":SCALE,"counts":dict(sorted(counts.items())),
                "sourceSha256":digest,"osmTimestamp":osmium.io.Reader(str(source)).header().get("osmosis_replication_timestamp"),
                "attribution":"© OpenStreetMap contributors","license":"ODbL 1.0",
                "source":"https://download.geofabrik.de/asia/vietnam.html"}
    (output/"index.json").write_text(json.dumps(manifest,ensure_ascii=False,separators=(",",":")),encoding="utf8")
    print(counts, flush=True)


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pbf",type=Path)
    parser.add_argument("--output",type=Path,default=ROOT/"dist/sight-grounds")
    args=parser.parse_args()
    build(args.pbf,args.output)
