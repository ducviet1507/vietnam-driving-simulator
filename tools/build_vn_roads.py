"""Build the ODbL game graph: pip install osmium; python tools/build_vn_roads.py vietnam.osm.pbf dist/vn-roads.

Input: the Vietnam Geofabrik .osm.pbf regional extract. The optional --residential
switch includes residential ways in addition to all classified and unclassified roads.
Output: gzip JSON arrays of [edge, from, to, label, highway, oneWay, coordinates].
Coordinates are interleaved integer longitude and latitude divided by 100,000.
Tiles are quarter-degree cells. Edge and node IDs are safe JS integers.
"""
import argparse
import collections
import gzip
import hashlib
import itertools
import json
import math
from pathlib import Path
from typing import NamedTuple

import osmium

UNITS = 100_000
TILE = UNITS // 4
MAIN = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary'}
DENIED = {'no', 'private', 'agricultural', 'forestry'}
PLACE_TYPES = {'city', 'town'}
# Mapped lanes used for free driving at the HUST landmark. Several have
# restricted real-world access.
HUST_LANES = {
    36730545, 179997645, 183423974, 596802413, 596802451, 596802481, 596802483,
    787639813, 824886232, 856290137, 856290139, 856290140, 856290141, 856290142,
    856290143, 856290146, 905363915, 1106598502, 1106598503, 1106598504, 1106598505,
    1196399741, 1196399742, 1196399743, 1196399756, 1196399797, 1196399798, 1196399799,
    1196399800, 1196399801, 1196399802, 1196399803, 1197061361, 1206532587, 1206532588,
    1207074263, 1207074264, 1207215785, 1217463137, 1217463138, 1217463139,
}

class VisitorLane(NamedTuple):
    road: int
    junction: int
    parking: int
    road_extension: int
    access_edge: int
    name: str


# Preserve the IDs of existing road and traffic edges. At Vịnh Mốc the
# surveyed centreline ends at the coach yard. The yard polygon is not a road.
VISITOR_LANES = {
    770106904: VisitorLane(605830153, 5138500073, 7189274555, 50000001, 50000002, 'Đường vào Bãi Môn'),
    87308497: VisitorLane(904141450, 1015102537, 1015102865, 50000003, 50000004, 'Đường vào sân đón khách Vịnh Mốc'),
}
VISITOR_FORKS = {lane.road: lane for lane in VISITOR_LANES.values()}


def permitted(way):
    tags = way.tags
    if tags.get('highway') == 'service' and way.id not in VISITOR_LANES:
        return way.id in HUST_LANES and len(way.nodes) >= 2
    access = next((tags.get(k) for k in ('motorcar', 'motor_vehicle', 'vehicle', 'access') if k in tags), '')
    return access not in DENIED and tags.get('area') != 'yes' and len(way.nodes) >= 2


def road_label(tags):
    name = tags.get('name:vi') or tags.get('name', '')
    ref = tags.get('ref', '')
    return name + ' · ' + ref if name and ref and ref not in name else name or ref


def simplify(points, tolerance_m):
    """Ramer-Douglas-Peucker in local metres. Endpoints always survive."""
    if len(points) <= 2:
        return points
    sx = math.cos(math.radians(points[0][1] / UNITS)) * 1.1132
    sy = 1.1113
    metric = [(x * sx, y * sy) for x, y in points]
    kept = {0, len(points)-1}
    spans = [(0, len(points)-1)]
    while spans:
        lo, hi = spans.pop()
        ax, ay = metric[lo]
        bx, by = metric[hi]
        dx, dy = bx-ax, by-ay
        length2 = dx*dx + dy*dy
        best, split = tolerance_m**2, None
        for i in range(lo+1, hi):
            px, py = metric[i]
            t = min(1, max(0, ((px-ax)*dx+(py-ay)*dy)/length2)) if length2 else 0
            err = (px-ax-t*dx)**2 + (py-ay-t*dy)**2
            if err > best:
                best, split = err, i
        if split is not None:
            kept.add(split)
            spans.extend(((lo,split),(split,hi)))
    return [points[i] for i in sorted(kept)]


def driving_shape(way_id, kind, points):
    # A few metres of simplification would put the Văn Miếu bus stop in the road.
    return points if way_id == 37933540 else simplify(points, 1 if kind == 'service' else 3)


def tiles_touched(line, grid=TILE):
    """Cross grid lines exactly and include the tiles containing both endpoints."""
    keys = {(x//grid, y//grid) for x, y in line}
    for (x,y),(xx,yy) in zip(line, line[1:]):
        cuts = [0, 1]
        for a,b in ((x,xx),(y,yy)):
            if a == b:
                continue
            lower, upper = sorted((a,b))
            cuts.extend((c-a)/(b-a) for c in range((lower//grid+1)*grid, upper, grid))
        cuts.sort()
        for start,end in zip(cuts,cuts[1:]):
            t = (start+end)/2
            keys.add((math.floor((x+(xx-x)*t)/grid),math.floor((y+(yy-y)*t)/grid)))
    return keys


def compact(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def subdivide(output):
    manifest=output/'index.json'
    index=json.loads(manifest.read_bytes())
    if 'subtiles' in index:
        return
    splits, subtiles = {}, []
    total_bytes=0
    for base in index['tiles']:
        path=output/(base+'.gz')
        size=path.stat().st_size
        raw=gzip.decompress(path.read_bytes())
        # Row separator lies between the final coordinate array and next edge.
        if size<=650_000 and raw.count(b']],[')+1<=18_000:
            total_bytes+=size
            continue
        rows=json.loads(raw)
        bx,by=map(int,base.split('_'))
        stride=4
        children=collections.defaultdict(list)
        for edge in rows:
            coords=edge[-1]
            line=list(zip(coords[::2],coords[1::2]))
            data=compact(edge)
            for x,y in tiles_touched(line,TILE//stride):
                if x//stride==bx and y//stride==by:
                    children[(x%stride,y%stride)].append(data)
        for (x,y),group in sorted(children.items()):
            name=f'{base}_{x}_{y}'
            data=gzip.compress(b'['+b','.join(group)+b']',compresslevel=7,mtime=0)
            (output/(name+'.gz')).write_bytes(data)
            total_bytes+=len(data)
            subtiles.append(name)
        splits[base]=stride
    index.update(splits=splits,subtiles=subtiles,bytes=total_bytes)
    staged=manifest.with_suffix('.new')
    staged.write_bytes(compact(index))
    staged.replace(manifest)
    for key in splits:
        (output/(key+'.gz')).unlink()
    print(f'Split {len(splits)} dense cells into {len(subtiles)} smaller tiles; {total_bytes:,} bytes.',flush=True)


def short_runs(refs, junctions, virtual_ids):
    """Add a routing vertex on long uninterrupted roads, preserving OSM junction IDs."""
    sx = math.cos(math.radians(refs[0][2]/UNITS))*1.1132
    run = [refs[0]]
    travelled = 0
    for i,(ref,x,y) in enumerate(refs[1:],1):
        _,px,py = run[-1]
        step = math.hypot((x-px)*sx,(y-py)*1.1113)
        while travelled + step > 1800:
            t = (1800-travelled)/step
            vx,vy = round(px+(x-px)*t),round(py+(y-py)*t)
            # Rounding onto an actual node should keep that node's connectivity.
            if (vx,vy) == (x,y):
                break
            if (vx,vy) != (px,py):
                run.append((next(virtual_ids),vx,vy))
                travelled += math.hypot((vx-px)*sx,(vy-py)*1.1113)
            yield run, travelled
            run = [run[-1]]
            travelled = 0
            _,px,py = run[-1]
            step = math.hypot((x-px)*sx,(y-py)*1.1113)
        travelled += step
        run.append((ref,x,y))
        if ref in junctions or i == len(refs)-1:
            yield run, travelled
            travelled = 0
            run = [run[-1]]


def driving_runs(way_id, refs, junctions, virtual_ids):
    """Yield the original road segmentation and any surveyed visitor fork."""
    lane = VISITOR_LANES.get(way_id)
    if lane:
        node_ids = [ref for ref, _, _ in refs]
        join, parking = node_ids.index(lane.junction), node_ids.index(lane.parking)
        drive = refs[min(join,parking):max(join,parking)+1]
        for run, metres in short_runs(drive, (), virtual_ids):
            yield run, metres, lane.access_edge
        return
    lane = VISITOR_FORKS.get(way_id)
    for run, metres in short_runs(refs, junctions, virtual_ids):
        fork = next((i for i, pt in enumerate(run[1:-1], 1) if pt[0] == lane.junction), None) if lane else None
        if fork is None:
            yield run, metres, None
        else:
            # 'metres' is counted once for the original stretch of highway.
            yield run[:fork+1], metres, None
            yield run[fork:], 0, lane.road_extension


def build(source, output, residential):
    classes = MAIN | {k+'_link' for k in MAIN} | {'unclassified', 'living_street', 'service'}
    if residential:
        classes.add('residential')
    selected = osmium.filter.TagFilter(*[('highway', k) for k in sorted(classes)])
    # Split OSM ways only at shared OSM nodes. Crossing lines at a bridge
    # remain separate unless their source ways actually share a node ID.
    nodes, junctions = set(), set()
    for w in osmium.FileProcessor(source, osmium.osm.WAY).with_filter(selected):
        if permitted(w) and w.id not in VISITOR_LANES:
            for n in w.nodes:
                if n.ref in nodes:
                    junctions.add(n.ref)
                nodes.add(n.ref)
    del nodes
    print(f'{len(junctions):,} shared junctions', flush=True)
    tiles = collections.defaultdict(list)
    overview, cities = [], []
    roads = collections.Counter()
    edge_id = 0
    total_km = 0
    way_count = 0
    bounds = [180,90,-180,-90]
    counts = collections.Counter()
    virtual_ids = itertools.count(-1,-1)
    processor = osmium.FileProcessor(source, osmium.osm.NODE | osmium.osm.WAY).with_locations()
    # The location index is populated before this filter is applied.
    processor.with_filter(osmium.filter.KeyFilter('place','highway'))
    for obj in processor:
        if obj.is_node():
            if obj.tags.get('place') in PLACE_TYPES and obj.location.valid():
                label = obj.tags.get('name:vi') or obj.tags.get('name')
                if label:
                    cities.append([label,round(obj.location.lon,5), round(obj.location.lat,5)])
            continue
        if not obj.is_way():
            continue
        w = obj
        kind = w.tags.get('highway')
        if kind not in classes or not permitted(w):
            continue
        refs = [(n.ref,round(n.lon*UNITS),round(n.lat*UNITS)) for n in w.nodes if n.location.valid()]
        if len(refs) != len(w.nodes):
            continue
        name = road_label(w.tags)
        if kind == 'service' and not name:
            name = VISITOR_LANES[w.id].name if w.id in VISITOR_LANES else 'Đường nội bộ Bách khoa'
        direction = w.tags.get('oneway:motorcar',w.tags.get('oneway',''))
        one_way = int(direction in ('yes','true','1','-1','reverse') or (direction == '' and (w.tags.get('junction')=='roundabout' or kind=='motorway')))
        if direction in ('-1','reverse'):
            refs.reverse()
        # At the Bạc Liêu bird sanctuary the public road ends at the gate.
        # Inside, this mapped residential way is the reserve's patrol lane.
        # https://baoxaydung.vn/ca-mau-dau-tu-gan-20-ty-dong-nang-cap-duong-vao-vuon-chim-bac-lieu-192260317183220202.htm
        patrol_lane = w.id == 1035601774
        if not patrol_lane:
            way_count += 1
        if kind in {'trunk','motorway','primary'}:
            line = simplify([(x,y) for _,x,y in refs],300)
            if max(abs(line[-1][0]-line[0][0]),abs(line[-1][1]-line[0][1])) >= 700:
                overview.append([v for pt in line for v in pt])
        for run, travelled, extra_id in driving_runs(w.id,refs,junctions,virtual_ids):
            line = driving_shape(w.id, kind, [(a,b) for _,a,b in run])
            if len(set(line)) >= 2:
                coords = [v for pt in line for v in pt]
                if extra_id is None:
                    edge_id += 1
                if patrol_lane:
                    # Keep downstream IDs stable for the existing traffic and route tiles.
                    continue
                row = compact([extra_id or edge_id,run[0][0],run[-1][0],name,kind,one_way,coords])
                for tile in tiles_touched(line):
                    tiles[tile].append(row)
                roads[kind] += 1
                total_km += travelled/1000
                counts['oneWay'] += one_way
                for a,b in line:
                    bounds[0]=min(bounds[0],a/UNITS);bounds[1]=min(bounds[1],b/UNITS)
                    bounds[2]=max(bounds[2],a/UNITS);bounds[3]=max(bounds[3],b/UNITS)
    output.mkdir(exist_ok=True,parents=True)
    files=[]
    total_bytes=0
    for (x,y),rows in sorted(tiles.items()):
        filename=f'{x}_{y}'
        data=gzip.compress(b'['+b','.join(rows)+b']',compresslevel=7,mtime=0)
        (output/(filename+'.gz')).write_bytes(data)
        total_bytes+=len(data)
        files.append(filename)
    with osmium.io.Reader(source) as reader:
        timestamp=reader.header().get('osmosis_replication_timestamp')
    with source.open('rb') as f:
        digest=hashlib.file_digest(f,'sha256').hexdigest()
    edges = sum(roads.values())
    index=dict(tiles=files,edges=edges,ways=way_count,oneWayEdges=counts['oneWay'],roadKm=round(total_km),
               classes=dict(sorted(roads.items())),bytes=total_bytes,bounds=bounds,osmTimestamp=timestamp,
               sourceSha256=digest,attribution='© OpenStreetMap contributors',license='ODbL 1.0')
    (output/'overview.json').write_bytes(compact({'lines':overview,'places':sorted(cities)}))
    (output/'index.json').write_bytes(compact(index))
    print(f'{way_count:,} ways, {edges:,} edges, {total_km:,.0f} km, {len(files)} tiles, {total_bytes:,} compressed bytes',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('output',type=Path,nargs='?')
    parser.add_argument('--residential',action='store_true')
    parser.add_argument('--split-only',action='store_true',help='Subdivide an already-built output directory.')
    args=parser.parse_args()
    if args.split_only:
        subdivide(args.source)
    else:
        if not args.output:
            parser.error('output directory required')
        build(args.source,args.output,args.residential)
        subdivide(args.output)
