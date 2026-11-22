"""Bake nearby watercourses and entrance approaches for natural atlas stops.

Run from any directory with the same Geofabrik Vietnam PBF as the atlas.
Requires pyosmium, Shapely and Pillow. Coordinates in the packed profiles are
metres east and south of the atlas pin. Flow lines follow OSM way direction.
"""
import argparse
from collections import Counter, defaultdict
from functools import lru_cache
import json
import math
from pathlib import Path
import re
import subprocess

import osmium
from PIL import Image
from shapely import STRtree
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import substring


ROOT = Path(__file__).resolve().parents[1]
NATURAL_KINDS = {"Thác nước", "Hang động"}
TRAILS = {"path", "footway", "steps", "pedestrian", "bridleway"}
WATER = {"river", "stream"}
COMPASS = "N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW".split()

# Some mapped entrances belong to a tunnel, a temple or a shop; a local rock
# section would also misrepresent a huge multi-mouth cavern, a regional chain
# of cascades, or falls now covered by a reservoir.
UNSUITABLE = {
    "osm-node-1016630575", "osm-node-1016630618", "osm-node-1016631618",  # Vịnh Mốc tunnels
    "osm-node-10220706847", "osm-node-1758586686", "osm-node-1758586757",
    "osm-node-2089305122", "osm-node-4508895511",  # temples / hospital
    "osm-node-11808257401", "osm-node-11948843475",  # Gougah / Yaly impoundments
    "osm-node-11805703977",  # Bạch Mã cliff, ~300 m over several reaches
    "osm-node-11863475355",  # Five distinct cascades over ~3 km, one pin
    "osm-node-11841319570", "osm-node-11841319577",  # Pygmy
    "osm-node-6358064546", "osm-node-4316781594",  # Hang Én entrances
    "osm-node-13240237802", "osm-node-13980047479", "osm-node-14364400268", "osm-way-1050501089",
}
DAK_NONG = "https://bdt.daknong.gov.vn/documents/10184/58882285/1_6%20SU%20KIEN%20LICH%20SUsigned_20190517085940.pdf/73382a9e-6d9d-49cb-97b2-f4f466cd3898"
# Height, width, morphology, source. Width of flowing water changes with the
# season; the Dray Sáp profile represents the documented dry-season state.
DOCUMENTED = {
    "osm-node-6215416985": (None, None, "limestone-steps", "https://csdl.vietnamtourism.gov.vn/dest/?item=1015"),
    "osm-node-3093994368": (57, 30, "plunge", "https://lamdong.gov.vn/sites/book/diemhen2000/bai7.htm"),
    "osm-node-3266893772": (54, 20, "overhang", "https://nhandan.vn/ve-dep-ky-vi-thac-hang-en-post659631.html"),
    "osm-node-2440165325": (40, None, "plunge", "https://sapa-tourism.com/golden-stream-and-love-waterfall-an-easy-trip-in-the-middle-of-the-forest/"),
    "osm-node-4787075848": (45, None, "plunge", "https://betav2.baogialai.com.vn/thuong-ngoan-ve-dep-thac-phu-cuong-post583264.html"),
    "osm-node-5801773753": (40, 20, "plunge", "https://lamdong.gov.vn/sites/dulich/trai-nghiem-du-lich-huyen-tp/Shared%20Documents/Huy%E1%BB%87n%20Di%20linh.pdf"),
    "osm-node-7602091586": (30, None, "overhang", "https://dulich.daknong.gov.vn/vi/place/details/thac-lieng-nung-13"),
    "osm-node-8620572905": (8, 75, "dry-season", DAK_NONG),
    "osm-node-8620572874": (8, 70, "dry-season", DAK_NONG),
    "osm-node-4502225092": (20, None, "cascade", "https://www.vietnamairlines.com/ph/vi/plan-book/travel/travel-guide/check-in-da-lat"),
    "osm-node-4518601444": (2.5, 1.6, "karst", "https://storage-vnportal.vnpt.vn/hgg-edu/5089/vanban/1024_qd-phe-duyet-gddp-4.pdf"),
    "osm-node-7182961142": (None, None, "basalt", "https://dulich.daknong.gov.vn/vi/place/details/hang-dong-nui-lua-chu-bluk-1"),
    "osm-node-3499295493": (None, None, "fissure", "https://bqlkkt.quangbinh.gov.vn/web/quangbinh/chi-tiet-tin/-/view-article/1/13848241114537/2421362016916379"),
}


def metres(raw):
    match = re.fullmatch(r"(\d+(?:[.,]\d+)?)\s*(m|ft|feet|')?", (raw or "").strip(), re.I)
    if match:
        value = float(match[1].replace(",", "."))
        return value * .3048 if match[2] in {"ft", "feet", "'"} else value


def bearing(raw):
    value = (raw or "").strip().upper()
    if value in COMPASS:
        return COMPASS.index(value) * 22.5
    if re.fullmatch(r"\d+(?:\.\d+)?°?", value):
        angle = float(value.rstrip("°"))
        if 0 <= angle <= 360:
            return angle % 360


def read_sites():
    runner = r"""const fs=require('fs');global.window=global;
    const files=Array.from(fs.readFileSync('dist/index.html','utf8').matchAll(/src="([^"]+\.js)"/g),m=>m[1]);
    for(const file of files.slice(files.indexOf('tourism-catalog.js'),files.indexOf('vietnam-landmarks.js'))){
      if(!file.startsWith('sight-hydrography'))require('./dist/'+file);
    }
    console.log(JSON.stringify({sites:VietnamTourism.entries,bespoke:(global.VietnamSights||[]).filter(s=>!s.surveyed).map(s=>[s.catalogId,s.lon,s.lat,s.kind])}));"""
    data = json.loads(subprocess.check_output(["node","-e",runner],cwd=ROOT))
    # Two POIs can describe the same attraction (e.g. a falls pin and a viewpoint).
    # Keep the existing surveyed-coordinate, hand-built scene wherever they overlap.
    return [s for s in data["sites"] if s["kind"] in NATURAL_KINDS and s["id"] not in UNSUITABLE and not any(
        s["id"] == ref or s["kind"] == kind and abs(s["lon"]-x) < .00045 and abs(s["lat"]-y) < .00045
        for ref,x,y,kind in data["bespoke"] if x is not None and y is not None)]


def get_context(source, sites):
    ids = {s["id"] for s in sites}
    pins = STRtree([Point(s["lon"],s["lat"]) for s in sites])
    tags, context = {}, defaultdict(list)
    keys = osmium.filter.KeyFilter("waterway","natural","water","highway","cave:passage")
    for obj in osmium.FileProcessor(source).with_locations().with_filter(keys):
        is_way = obj.is_way()
        key = f"osm-{'way' if is_way else 'node' if obj.is_node() else 'relation'}-{obj.id}"
        if key in ids:
            tags[key] = dict(obj.tags)
        if not is_way:
            continue
        water = obj.tags.get("waterway")
        trail = obj.tags.get("highway")
        surface = obj.tags.get("natural") == "water" or water == "riverbank"
        if water not in WATER and trail not in TRAILS and not surface:
            continue
        coords = [(n.lon,n.lat) for n in obj.nodes if n.location.valid()]
        if len(coords) < 2:
            continue
        if surface:
            if len(coords) < 4 or coords[0] != coords[-1]:
                continue
            shape = Polygon(coords)
        else:
            shape = LineString(coords)
        for index in pins.query(shape,predicate="dwithin",distance=.00042):
            context[sites[index]["id"]].append((obj.id,
                "polygon" if surface else water if water in WATER else "trail",coords,
                metres(obj.tags.get("width")),obj.tags.get("tunnel") not in {None,"no"}))
    return tags, context


class Heights:
    def __init__(self, root):
        self.root = root
        self.slots = {}
        for tag, tiles in json.loads((root/"index.json").read_text()).items():
            for slot,(i,j) in enumerate(tiles):
                x = int(tag[4:])*32+i
                y = int(tag[1:3])*32+j
                self.slots[x,y] = (f"{tag}-{slot//32}.png",slot%32)

    @lru_cache(16)
    def page(self, name):
        with Image.open(self.root/name) as image:
            return image.convert("RGB")

    def sample(self, lon, lat):
        x,y = math.floor(lon*32),math.floor(lat*32)
        if (x,y) not in self.slots:
            return None
        name,slot = self.slots[x,y]
        i = slot%8*96+min(95,int((lon*32-x)*96))
        j = slot//8*96+min(95,int((1-(lat*32-y))*96))
        r,g,b = self.page(name).getpixel((i,j))
        return r*256+g-128 if b else None


def profile(site,tags,surroundings,heights):
    x,y = site["lon"],site["lat"]
    mx,my = math.cos(math.radians(y))*111320,110900
    origin = Point(0,0)
    cave = tags.get("natural") == "cave_entrance"
    if not cave and tags.get("waterway") != "waterfall":
        return
    if cave and (tags.get("entrance") in {"exit","service"} or tags.get("cave:entrance") in {"pit","shaft","vertical"}):
        return
    if min(site["approachMeters"],9999) < (11 if cave else 18):
        return
    wanted = "trail" if cave else "water"
    lines, polys = [], []
    for way_id,kind,coords,width,tunnel in surroundings:
        points = [((u-x)*mx,(y-v)*my) for u,v in coords]
        if kind == "polygon":
            shape = Polygon(points)
            if shape.is_valid:
                polys.append((way_id,shape))
            continue
        if (kind == "trail") != (wanted == "trail"):
            continue
        line = LineString(points)
        closest = line.project(origin)
        distance = line.distance(origin)
        if cave:
            # An aboveground trail must actually terminate at this entrance.
            # A path that merely passes a hillside does not survey its aspect.
            first = Point(points[0]).distance(origin)
            last = Point(points[-1]).distance(origin)
            distance = min(first,last)
            if distance > 12 or line.length < 3:
                continue
            reverse = last < first
            closest = line.length if reverse else 0
        else:
            if distance > 16 or line.length < 4 or tunnel:
                continue
            reverse = False
        sign = -1 if reverse else 1
        def along(d):
            p = line.interpolate(max(0,min(line.length,closest+sign*d)))
            return p.x,p.y
        near,far = along(0),along(14)
        direction = (far[0]-near[0],far[1]-near[1])
        if not cave and math.hypot(*direction)<3:
            upstream = along(-14)
            direction = (near[0]-upstream[0],near[1]-upstream[1])
        length = math.hypot(*direction)
        if length < 2:
            continue
        # A mapped underground passage extends INTO the rock, opposite the
        # player's view of its mouth from outside.
        factor = -1 if cave and tunnel else 1
        dx,dz = direction[0]/length*factor,direction[1]/length*factor
        start = max(0, closest-55)
        end = min(line.length, closest+55)
        before = list(substring(line,start,closest).coords)
        after = list(substring(line,closest,end).coords)
        points = before + after[1:]
        if reverse:
            points.reverse()
        lines.append((distance,way_id,kind,width,dx,dz,points,tunnel,near))
    line = min(lines,key=lambda l:(l[0],l[1]),default=None)
    explicit = bearing(tags.get("direction")) if cave else None
    if not line and explicit is None:
        return
    if explicit is None:
        _,source,kind,way_width,dx,dz,points,tunnel,nearest = line
    else:
        dx,dz = math.sin(math.radians(explicit)),-math.cos(math.radians(explicit))
        source,kind,way_width,tunnel = 0,"direction",None,False
        points = []
    yaw = round(math.atan2(dx,dz),3)
    width = metres(tags.get("cave:entrance:width") or tags.get("width"))
    width_from = "tag" if width else ""
    if not width and way_width:
        width,width_from = way_width,"trail" if cave else "waterway"
    if not cave:
        cross = LineString([[-dz*180,dx*180],[dz*180,-dx*180]])
        for _,poly in polys:
            if poly.distance(origin)>1.4:
                continue
            segment=poly.intersection(cross)
            parts=[g for g in getattr(segment,"geoms",[segment]) if g.geom_type=="LineString" and g.distance(origin)<1.4]
            if parts and not width:
                width=max(p.length for p in parts)
                width_from="bank"
                break
    h = metres(tags.get("cave:entrance:height") or tags.get("height"))
    # DSM covers ~35 metres per sample. Use only an averaged reach gradient
    # for scenery scale when the mapper supplied no measured drop, never as a
    # claimed waterfall measurement.
    def elevation(d):
        return heights.sample(x+d*dx/mx,y-d*dz/my)
    upstream = [v for v in (elevation(-n) for n in [24,48,72]) if v is not None]
    downstream = [v for v in (elevation(n) for n in [24,48,72]) if v is not None]
    slope = max(0,(sum(upstream)/len(upstream)-sum(downstream)/len(downstream))/96) if upstream and downstream else 0
    estimated_h = (max(1.5,min(7,1.8+slope*5)) if cave else max(1.4,min(18,2+slope*16)))
    documented_h,documented_w,form,source_url=DOCUMENTED.get(site["id"],(None,None,None,None))
    if form == "fissure":
        estimated_h=2
    if documented_w and width_from != "tag":
        width,width_from=documented_w,"published"
    fall_height = round(h or documented_h or estimated_h,1)
    size = width or (1.35 if form=="fissure" else 1.5+min(2.7,slope*3.1) if cave else (10.5 if kind=="river" else 3.4)+min(4,slope*5))
    if not (.35<=size<=120 and .4<=fall_height<=110):
        return
    # The mesh lies inside this conservative disk. Keep it off drivable
    # roads; the original road and water simulation retain their own physics.
    extent = (max(7,size*1.86+fall_height*.42) if cave else
              max(size*.86+fall_height*.22+3,fall_height*.68+5,size*.71+13))
    if extent+5 > site["approachMeters"]:
        return
    record=dict(yaw=yaw,width=round(size,1),height=fall_height,way=source,
                evidence="direction" if explicit is not None else "passage" if cave and tunnel else kind,
                heightSource="tag" if h else "published" if documented_h else "estimate",
                widthSource=width_from or "estimate",grade=round(min(1.6,slope),2))
    if points and (not cave or tunnel):
        record["trace"]=[[round(u,1),round(v,1)] for u,v in points]
        record["traceOrigin"]=[round(v,1) for v in nearest]
    if not cave and any(poly.covers(Point(dx*offset,dz*offset)) for _,poly in polys for offset in (2,5,10)):
        record["mappedPool"]=True
    if tags.get("intermittent")=="yes" or tags.get("seasonal")=="yes":
        record["intermittent"]=True
    if source_url:
        record.update(form=form,reference=source_url)
    return record


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pbf",type=Path)
    args=parser.parse_args()
    sites = read_sites()
    tags,context=get_context(args.pbf,sites)
    heights=Heights(ROOT/"dist/sight-landscapes")
    found={}
    counts=Counter()
    for site in sites:
        record=profile(site,tags.get(site["id"],{}),context[site["id"]],heights)
        if record:
            found[site["id"]]=record
            counts[site["kind"]]+=1
    rows=",\n".join("  "+json.dumps(key)+":"+json.dumps(value,separators=(",",":")) for key,value in sorted(found.items()))
    output=ROOT/"dist/sight-hydrography-data.js"
    output.write_text("'use strict';\n// OpenStreetMap contributors, ODbL 1.0. Rebuild with tools/build_sight_hydrography.py.\nwindow.VietnamHydrography={\n"+rows+"\n};\n",encoding="utf8")
    print(json.dumps(counts,ensure_ascii=True),flush=True)


if __name__=="__main__":
    main()
