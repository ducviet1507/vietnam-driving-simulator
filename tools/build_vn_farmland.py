"""Extract agricultural parcels and open field infrastructure from a Vietnam OSM PBF.

Install osmium and shapely, then run python tools/build_vn_farmland.py vietnam.osm.pbf.
The shipped WorldCover raster selects rural stretches of otherwise ambiguous ways.
"""
from collections import Counter, defaultdict
from functools import cache
from pathlib import Path
import argparse
import gzip
import hashlib
import json
import math

import osmium
from shapely import from_wkb


DIST = Path(__file__).resolve().parents[1] / 'dist'
SCALE, GRID = 100_000, 4
PARCELS = [('landuse', value) for value in ('farmland', 'paddy', 'orchard', 'vineyard')]
CHANNELS = [('waterway', value) for value in ('ditch', 'drain', 'canal')]
ROUTES = [('highway', 'track'), ('bridge', 'yes'), ('service', 'driveway')]
# Field boundaries and crop are mapped. The local terrace treatment is supported
# by valley photographs and sloping terrain; individual steps are unmeasured.
LAO_CHAI_RICE = {1453073042, 1453073052, 1453073054}


def compact(data):
    return json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()


def cropland_lookup():
    folder = DIST / 'vn-environment'
    manifest = json.loads((folder / 'index.json').read_bytes())
    grid, size = manifest['grid'], manifest['coverSize']
    tiles = set(manifest['tiles'])

    @cache
    def raster(key):
        if key in tiles:
            return gzip.decompress((folder / (key + '.gz')).read_bytes())[manifest['populationSize']**2:]

    def near(line):
        # Sample both banks. A mapped service lane or canal often lies one
        # WorldCover cell away from the crop it serves.
        for fraction in (.5, .15, .85):
            p = line.interpolate(fraction, normalized=True)
            for dx, dy in ((0,0), (-.00043,0), (.00043,0), (0,-.00043), (0,.00043)):
                u, v = (p.x+dx)*grid, (p.y+dy)*grid
                x, y = math.floor(u), math.floor(v)
                pixels = raster(f'{x}_{y}')
                if pixels and pixels[(size-1-int((v-y)*size))*size+int((u-x)*size)] == 40:
                    return True
        return False
    return near


def quantize(coords, closed):
    vertices = []
    for lon, lat in coords:
        p = round(lon*SCALE), round(lat*SCALE)
        if not vertices or vertices[-1] != p:
            vertices.append(p)
    if closed and vertices and vertices[-1] == vertices[0]:
        vertices.pop()
    return vertices if len(vertices) >= (3 if closed else 2) else []


def deltas(points, x, y):
    out = []
    ox, oy = x*(SCALE//GRID), y*(SCALE//GRID)
    for px, py in points:
        out.extend((px-ox, py-oy))
        ox, oy = px, py
    return out


def polygon_kind(tags):
    if tags.get('landuse') in ('orchard', 'vineyard'):
        return 'orchard'
    if tags.get('landuse') == 'paddy':
        return 'rice'
    if tags.get('landuse') != 'farmland':
        return None
    if tags.get('terraced') == 'yes' or tags.get('farmland') == 'terraced':
        return 'terrace'
    crop = tags.get('crop') or tags.get('farmland') or tags.get('produce', '')
    return 'rice' if crop in ('rice', 'paddy', 'rice_paddy') else 'field'


def linear_kind(tags):
    if tags.get('tunnel', 'no') != 'no' or tags.get('covered') == 'yes' or tags.get('location') == 'underground':
        return None
    waterway = tags.get('waterway')
    if waterway in ('ditch', 'drain', 'canal'):
        if tags.get('intermittent') == 'yes' or tags.get('seasonal', 'no') != 'no':
            return None
        return 'canal' if waterway == 'canal' else 'ditch'
    highway = tags.get('highway')
    if highway not in ('track', 'service', 'path', 'footway') or tags.get('area') == 'yes':
        return None
    if tags.get('bridge', 'no') not in ('no', 'construction'):
        return 'bridge'
    if highway == 'track' or (highway == 'service' and tags.get('service') == 'driveway'
                              and tags.get('surface') in ('dirt','earth','unpaved','ground','gravel','compacted')):
        return 'track'


def build(source, dest):
    tiles, counts = defaultdict(list), Counter()
    crop_near = cropland_lookup()
    processor = osmium.FileProcessor(source).with_areas(osmium.filter.TagFilter(*PARCELS))
    processor.with_filter(osmium.filter.TagFilter(*(PARCELS+CHANNELS+ROUTES)))
    factory = osmium.geom.WKBFactory()

    def emit(kind, ident, geometry, rings, closed):
        parts = [quantize(r, closed) for r in rings]
        if not parts[0]:
            return
        parts = [p for p in parts if p]
        west, south, east, north = (math.floor(v*GRID) for v in geometry.bounds)
        for x in range(west, east+1):
            for y in range(south, north+1):
                tiles[x,y].append([kind, ident, [deltas(p,x,y) for p in parts]])
        counts[kind] += 1

    for obj in processor:
        if obj.is_area():
            kind = polygon_kind(obj.tags)
            if not kind:
                continue
            try:
                area = from_wkb(factory.create_multipolygon(obj))
            except RuntimeError:
                continue
            ident = ('w' if obj.from_way() else 'r') + str(obj.orig_id())
            if kind == 'rice' and obj.from_way() and obj.orig_id() in LAO_CHAI_RICE:
                kind = 'terrace'
            for i, face in enumerate(area.geoms):
                # Preserve islands and boundaries. OSM farmland can encompass
                # an entire holding, so the boundary alone is authoritative.
                face = face.simplify(.000023)
                rings = [face.exterior.coords] + [ring.coords for ring in face.interiors]
                emit(kind, ident if i == 0 else f'{ident}.{i}', face, rings, True)
        elif obj.is_way():
            kind = linear_kind(obj.tags)
            if not kind:
                continue
            try:
                line = from_wkb(factory.create_linestring(obj))
            except RuntimeError:
                continue
            if obj.tags.get('usage') != 'irrigation' and not crop_near(line):
                continue
            line = line.simplify(.000023)
            emit(kind, 'w'+str(obj.id), line, [line.coords], False)

    with osmium.io.Reader(str(source)) as reader:
        snapshot = reader.header().get('osmosis_replication_timestamp')
    dest.mkdir(parents=True, exist_ok=True)
    manifest = dest / 'index.json'
    previous = set(json.loads(manifest.read_bytes())['tiles']) if manifest.exists() else set()
    total = 0
    for (x,y), rows in sorted(tiles.items()):
        packed = gzip.compress(compact(rows), compresslevel=9, mtime=0)
        pending = dest / f'{x}_{y}.gz.part'
        pending.write_bytes(packed)
        pending.replace(dest / f'{x}_{y}.gz')
        total += len(packed)
    with source.open('rb') as data:
        checksum = hashlib.file_digest(data,'sha256').hexdigest()
    index = dict(grid=GRID, scale=SCALE, tiles=[f'{x}_{y}' for x,y in sorted(tiles)],
                 counts=dict(sorted(counts.items())), bytes=total, snapshot=snapshot, sha256=checksum,
                 source='https://download.geofabrik.de/asia/vietnam.html', worldCoverYear=2021,
                 inferredTerraceWays=sorted(LAO_CHAI_RICE))
    pending = dest/'index.json.part'
    pending.write_bytes(compact(index)+b'\n')
    pending.replace(manifest)
    for key in previous - set(index['tiles']):
        if len(key.split('_')) == 2 and all(s.isdecimal() for s in key.split('_')):
            (dest/(key+'.gz')).unlink(missing_ok=True)
    print(snapshot, len(tiles), counts, total, flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('--output',type=Path,default=DIST/'vn-farmland')
    args = parser.parse_args()
    build(args.source,args.output)
