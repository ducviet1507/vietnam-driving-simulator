"""Bake simulated visitor roads into the driving and routing graph without renumbering OSM edges.

python tools/build_sight_access.py vietnam.osm.pbf
Requires Node, pyosmium, Shapely 2 and Pillow. Run build_route_network.py afterwards.
Coordinates below use the same 1e-5 degree integer grid as the road tiles.
"""
from collections import defaultdict
from functools import lru_cache
from heapq import heappop, heappush
from itertools import accumulate
from pathlib import Path
import argparse
import gzip
import hashlib
import json
import math
import subprocess
import zlib

import osmium
from PIL import Image
from shapely import STRtree, box
from shapely.geometry import LineString, Point, Polygon
from build_vn_roads import tiles_touched

DIST = Path(__file__).resolve().parents[1] / "dist"
U = 100000
CELL = 25000
BRIDGE = "cau-vang-ba-na"
# Beside the Marseille entrance, east of the pedestrian deck and clear of the station.
BRIDGE_GATE = (10799675, 1599460)
DIRECTIONS = [(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1),(0,-1),(1,-1)]
compact = lambda v: json.dumps(v, ensure_ascii=False, separators=(",", ":"))


def sights():
    extract = r"""const fs=require('fs');global.window=global;
    const tags=Array.from(fs.readFileSync('index.html','utf8').matchAll(/src="([^"]+\.js)"/g),m=>m[1]);
    for(const file of tags.slice(tags.indexOf('tourism-catalog.js'),tags.indexOf('vietnam-landmarks.js')+1))
      require('./'+file);
    const sites=new Map(VietnamTourism.entries.map(s=>[s.id,s]));
    for(const s of VietnamLandmarks.entries)sites.set(s.catalogId||s.id,s);
    console.log(JSON.stringify([...sites].filter(([,s])=>!s.mappedEntrance).map(([id,s])=>[id,s.id,s.name,s.lon,s.lat,...s.start,s.width||0,s.depth||0])));"""
    return json.loads(subprocess.check_output(["node","-e",extract],cwd=DIST))


def read_gz(path):
    with gzip.open(path, "rt", encoding="utf8") as f:
        return json.load(f)


def tile_key(x, y, splits):
    a,b=x//CELL,y//CELL
    key=f"{a}_{b}"
    n=splits.get(key)
    return f"{key}_{(x%CELL)*n//CELL}_{(y%CELL)*n//CELL}" if n else key


def covered_tiles(points,splits):
    for x,y in tiles_touched(points):
        key=f"{x}_{y}"
        n=splits.get(key)
        if not n:
            yield key
            continue
        local=[((px-x*CELL)*n,(py-y*CELL)*n) for px,py in points]
        for i,j in tiles_touched(local):
            if 0<=i<n and 0<=j<n:yield f"{key}_{i}_{j}"


@lru_cache(maxsize=12)
def road_tree(key):
    path=DIST/"vn-roads"/(key+".gz")
    rows=[r for r in read_gz(path) if r[4] not in {"trunk","motorway"} and not r[4].endswith("_link")] if path.exists() else []
    return STRtree([LineString(zip(r[6][::2],r[6][1::2])) for r in rows]),rows


def road_anchors(old, target, splits):
    # An approach on a cell boundary may be rounded into the neighbouring tile.
    choices={}
    for key in sorted({tile_key(old[0]+dx,old[1]+dy,splits) for dx in (-2,0,2) for dy in (-2,0,2)}):
        tree,rows=road_tree(key)
        if not rows: continue
        i=tree.nearest(Point(old))
        row=rows[i]
        gap=tree.geometries[i].distance(Point(old))
        for node,p in [(row[1],row[6][:2]),(row[2],row[6][-2:])]:
            cost=(round(gap),math.dist(p,old)+math.dist(p,target),node)
            endpoint=(node,tuple(p))
            choices[endpoint]=min(cost,choices.get(endpoint,cost))
    return sorted(choices,key=choices.get)


def coastline(source):
    result=[]
    ways=osmium.FileProcessor(source,osmium.osm.NODE|osmium.osm.WAY).with_locations().with_filter(osmium.filter.TagFilter(("natural","coastline")))
    for w in ways:
        if w.is_way():
            line=[(round(n.lon*U),round(n.lat*U)) for n in w.nodes if n.location.valid()]
            if len(line)>=2: result.append(LineString(line).simplify(1))
    return STRtree(result)


@lru_cache(maxsize=16)
def buildings(key):
    shapes=[]
    for row in read_gz(DIST/"vn-osm-buildings"/(key+".gz")):
        rings=[list(zip(accumulate(r[::2]),accumulate(r[1::2]))) for r in row[4]]
        if len(rings[0])>=3: shapes.append(Polygon(rings[0],[r for r in rings[1:] if len(r)>=3]))
    return STRtree(shapes)


@lru_cache(maxsize=12)
def water(key):
    file=DIST/"vn-water"/(key+".gz")
    shapes=[]
    for kind,_,pts in read_gz(file) if file.exists() else []:
        xy=list(zip(pts[::2],pts[1::2]))
        shapes.append(Polygon(xy) if kind=="lake" else LineString(xy))
    return STRtree(shapes)


def obstacles(bounds, coast, building_index):
    envelope=box(*bounds)
    def nearby(tree): return tree.geometries.take(tree.query(envelope))
    shapes=list(nearby(coast))
    files,tree=building_index
    for i in tree.query(envelope): shapes.extend(nearby(buildings(files[i][0])))
    x0,y0,x1,y1=bounds
    for x in range(x0//CELL,x1//CELL+1):
        for y in range(y0//CELL,y1//CELL+1): shapes.extend(nearby(water(f"{x}_{y}")))
    return STRtree(shapes)


def trace(anchor, target, radius, terrain, coast, building_index, bridge):
    # Work in a bounded corridor. Test the full lane width against mapped water,
    # coastlines and footprints, including on diagonals and after simplifying.
    gap=math.dist(anchor,target)
    margin=int(min(1400,max(130,gap*.33)))
    bounds=(min(anchor[0],target[0])-margin,min(anchor[1],target[1])-margin,
            max(anchor[0],target[0])+margin,max(anchor[1],target[1])+margin)
    barriers=obstacles(bounds,coast,building_index)
    @lru_cache(None)
    def clear(a,b):
        return not len(barriers.query(LineString([a,b]),predicate="dwithin",distance=4))
    if len(barriers.query(Point(anchor),predicate="dwithin",distance=4)): return
    # A building's catalog coordinate is often its centre. Park outside the
    # perimeter; never drive through the mapped building to reach its pin.
    gates=[]
    facing=math.atan2(anchor[1]-target[1],anchor[0]-target[0])
    for r in ([0] if bridge else [radius,radius+12,radius+30,radius+55]):
        for i in range(1 if bridge else 16):
            angle=facing+i*math.tau/16
            p=(round(target[0]+r*math.cos(angle)),round(target[1]+r*math.sin(angle)))
            if not len(barriers.query(Point(p),predicate="dwithin",distance=5)): gates.append(p)
        if gates: break
    if not gates:return
    gates.sort(key=lambda p:math.dist(anchor,p))
    if gap<400:
        for p in gates:
            if clear(anchor,p):return [anchor,p]
    mesh=max(10,min(76,round(gap/23)))
    def loc(cell):return (anchor[0]+mesh*cell[0],anchor[1]+mesh*cell[1])
    @lru_cache(None)
    def altitude(p):
        x,y=p
        u=((x/U+180)/360*256-200)/7*terrain.width-.5
        v=((1-math.asinh(math.tan(math.radians(y/U)))/math.pi)*128-110)/13*terrain.height-.5
        i=max(0,min(terrain.width-2,math.floor(u)));j=max(0,min(terrain.height-2,math.floor(v)))
        a,b=max(0,min(1,u-i)),max(0,min(1,v-j))
        def h(dx,dy):return 1505*(terrain.getpixel((i+dx,j+dy))/255)**1.6
        return (h(0,0)*(1-a)+h(1,0)*a)*(1-b)+(h(0,1)*(1-a)+h(1,1)*a)*b
    queue=[(0,0,(0,0))];costs={(0,0):0};parents={}
    while queue:
        estimate,cost,cell=heappop(queue)
        if cost!=costs[cell]:continue
        if estimate>max(400,gap*2.4) or len(parents)>16000:break
        p=loc(cell)
        if math.dist(p,target)<radius+mesh*2+85:
            gate=next((g for g in gates if math.dist(p,g)<mesh*2+20 and clear(p,g)),None)
            if gate:
                path=[gate,p]
                while cell in parents:
                    cell=parents[cell];path.append(loc(cell))
                path.reverse()
                # Round grid corners where the swept path is clear.
                smooth=[path[0]]
                for a,b,c in zip(path,path[1:],path[2:]):
                    before=tuple(round((u+3*v)/4) for u,v in zip(a,b))
                    after=tuple(round((u+3*v)/4) for u,v in zip(c,b))
                    smooth.extend([before,after] if clear(before,after) else [b])
                smooth.append(path[-1])
                return smooth
        for dx,dy in DIRECTIONS:
            nxt=(cell[0]+dx,cell[1]+dy);q=loc(nxt)
            if not(bounds[0]<=q[0]<=bounds[2] and bounds[1]<=q[1]<=bounds[3]):continue
            length=math.dist(p,q)
            slope=abs(altitude(q)-altitude(p))/length
            new=cost+length*(1+40*max(0,slope-.07)**2)
            if new>=costs.get(nxt,math.inf) or not clear(p,q):continue
            costs[nxt]=new;parents[nxt]=cell
            heappush(queue,(new+max(0,math.dist(q,target)-radius),new,nxt))


def build(source):
    manifest=DIST/"vn-roads/index.json"
    index=json.loads(manifest.read_bytes())
    coast=coastline(source)
    files=json.loads((DIST/"vn-osm-buildings/index.json").read_bytes())["tiles"]
    building_index=(files,STRtree([box(*f[1:]) for f in files]))
    terrain=Image.open(DIST/"streetscape/surfaces/vietnam-elevation.png").convert("L")
    rows=[];stops={};ids=set()
    sites=sorted(sights(),key=lambda s:(int(s[5]*4),int(s[6]*4),s[0]))
    for n,(key,model,name,lon,lat,sx,sy,width,depth) in enumerate(sites):
        if n%1500==0:print(f"{n}/{len(sites)} destinations, {len(rows)} connected",flush=True)
        target=(round(lon*U),round(lat*U));old=(round(sx*U),round(sy*U))
        radius=max(15,round(math.hypot(width,depth)*.46)+7)
        if math.dist(old,target)<=max(75,radius+20):continue
        bridge=model==BRIDGE
        if bridge:target=BRIDGE_GATE;radius=0
        for node,anchor in road_anchors(old,target,index["splits"]):
            path=trace(anchor,target,radius,terrain,coast,building_index,bridge)
            if path:break
        else:continue
        # Densify to keep tyre and asphalt heights together on sloping terrain.
        points=[path[0]]
        for a,b in zip(path,path[1:]):
            steps=max(1,math.ceil(math.dist(a,b)/23))
            for n in range(1,steps+1):
                p=tuple(round(u+(v-u)*n/steps) for u,v in zip(a,b))
                if p!=points[-1]:points.append(p)
        if len(points)<2 or math.dist(points[-1],old)<15:continue
        edge=10000000+(zlib.crc32(key.encode())&0x3fffffff)
        if edge in ids:raise ValueError("Duplicate visitor edge ID")
        ids.add(edge)
        row=len(rows)
        stops[key]=row
        rows.append([edge,node,-edge-10000000,"Đường lên "+name if bridge else "Lối vào "+name,"service",0,[v for p in points for v in p]])
    write_access(index,rows,stops)


def write_access(index,rows,stops):
    parents=set(index["tiles"]);subtiles=set(index["subtiles"])
    base=(parents-set(index["splits"]))|subtiles
    if "osm-way-683416736" not in stops:raise ValueError("No connected entrance for Cầu Vàng")
    tiles=defaultdict(list)
    for row in rows:
        points=list(zip(row[6][::2],row[6][1::2]))
        for k in covered_tiles(points,index["splits"]):tiles[k].append(row)
    folder=DIST/"vn-access"
    folder.mkdir(exist_ok=True)
    for k,group in tiles.items():
        (folder/(k+".gz")).write_bytes(gzip.compress(compact(group).encode(),compresslevel=9,mtime=0))
    for old in set(index.get("sightAccess",{}).get("tiles",[]))-tiles.keys():
        (folder/(old+".gz")).unlink(missing_ok=True)
    added_parents=sorted({k for k in tiles if k.count("_")==1}-parents)
    added_subtiles=sorted({k for k in tiles if k.count("_")==3}-subtiles)
    arrivals={}
    for key,i in stops.items():
        edge,*_,coords=rows[i]
        px,py,x,y=coords[-4:]
        arrivals[key]=[edge,x,y,px-x,py-y]
    index["sightAccess"]=dict(stops=arrivals,tiles=sorted(tiles),only=sorted(set(tiles)-base),
        addedParents=added_parents,addedSubtiles=added_subtiles,revision=hashlib.sha256(compact(rows).encode()).hexdigest())
    (DIST/"vn-roads/index.json").write_text(compact(index),encoding="utf8")
    print(f"{len(rows)} visitor roads in {len(tiles)} tiles",flush=True)


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pbf",type=Path)
    build(parser.parse_args().pbf)
