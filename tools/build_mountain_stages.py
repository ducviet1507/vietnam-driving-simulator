"""Bake short mountain stages from the bundled OSM road centre lines and terrain raster."""
import base64
import gzip
import json
import math
import unicodedata
from bisect import bisect_right
from collections import defaultdict
from functools import lru_cache
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "dist"
STEP = 20


@lru_cache(maxsize=12)
def cover_tile(x, y):
    source = ROOT/'vn-environment'/f'{x}_{y}.gz'
    return gzip.decompress(source.read_bytes()) if source.exists() else None


def forest_mask(stage, manifest):
    """64 x 64 cells of 120 m in the same rotated frame as the stage DEM."""
    lon, lat = stage['start']
    grid, size = manifest['grid'], manifest['coverSize']
    offset = manifest['populationSize']**2
    rad = math.radians(stage['bearing'])
    cs, sn = math.cos(rad), math.sin(rad)
    mx = 111320*math.cos(math.radians(lat))
    packed = bytearray(1024)
    for j in range(64):
        for i in range(64):
            x, z = (i-31.5)*120, (j-31.5)*120
            u, v = (lon+(cs*x-sn*z)/mx)*grid, (lat-(sn*x+cs*z)/110900)*grid
            ix, iy = math.floor(u), math.floor(v)
            raw = cover_tile(ix, iy)
            code = raw[offset+(size-1-int((v-iy)*size))*size+int((u-ix)*size)] if raw else 0
            cover = 2 if code in (10,95) else 1 if code==20 else 0 if code else 3
            cell = j*64+i
            packed[cell//4] |= cover << (2*(cell%4))
    return base64.b64encode(packed).decode('ascii')


def longest_chain(edges):
    links = defaultdict(list)
    for key, points in edges.items():
        for end in (points[0], points[-1]):
            links[end].append(key)
    remaining = set(edges)
    best, longest = [], 0
    while remaining:
        key = min(remaining)
        remaining.remove(key)
        chain = list(edges[key])
        for _ in range(2):
            chain.reverse()
            while len(links[chain[-1]]) == 2:
                options = [i for i in links[chain[-1]] if i in remaining]
                if not options:
                    break
                key = options[0]
                remaining.remove(key)
                part = edges[key]
                chain.extend((part if part[0] == chain[-1] else part[::-1])[1:])
        length = distances(chain)[-1]
        if length > longest:
            best, longest = chain, length
    return best


def distances(points):
    mx = 1.1132 * math.cos(math.radians(points[0][1] / 1e5))
    result = [0]
    for (x, y), (u, v) in zip(points, points[1:]):
        result.append(result[-1] + math.hypot((x-u)*mx, (y-v)*1.109))
    return result


def elevation(dem, lon, lat):
    x = (((lon+180)/360*256-200)/7)*dem.width-.5
    y = (((1-math.asinh(math.tan(math.radians(lat)))/math.pi)*128-110)/13)*dem.height-.5
    ix, iy = math.floor(x), math.floor(y)
    return sum(3500*(dem.getpixel((ix+i, iy+j))/255)**1.6 * (1-abs(x-ix-i))*(1-abs(y-iy-j))
               for i in (0, 1) for j in (0, 1))


def stage(name, edges, dem):
    points = longest_chain(edges)
    dist = distances(points)
    finish = min(3200, int(dist[-1]//STEP)*STEP)
    if finish < 1300:
        return
    offset = (dist[-1]-finish)/2
    samples = []
    for d in range(0, finish+1, STEP):
        station = d+offset
        i = min(len(points)-2, bisect_right(dist, station)-1)
        f = (station-dist[i])/(dist[i+1]-dist[i])
        samples.append([(a+(b-a)*f)/1e5 for a,b in zip(points[i],points[i+1])])
    angles, heights = [], []
    mx = math.cos(math.radians(samples[0][1]))
    for a,b in zip(samples,samples[1:]):
        angle = math.degrees(math.atan2((b[0]-a[0])*mx,b[1]-a[1]))
        if angles:
            angle = angles[-1]+(angle-angles[-1]+180)%360-180
        angles.append(angle)
    base = elevation(dem,*samples[0])
    for lon,lat in samples:
        h = (elevation(dem,lon,lat)-base)*.62
        if heights:
            h = max(heights[-1]-STEP*.15,min(heights[-1]+STEP*.15,h))
        heights.append(round(h,1))
    slug = unicodedata.normalize('NFKD',name.lower().replace('đ','d')).encode('ascii','ignore').decode()
    slug = '-'.join(slug.replace("'",'').split())
    result = dict(id=slug,name=name,start=[round(v,7) for v in samples[0]],bearing=round(angles[0],1),
                  step=STEP,angles=[round(v-angles[0],1) for v in angles],heights=heights)
    if slug in ('deo-hai-van','deo-ma-pi-leng','deo-khau-pha','deo-o-quy-ho','deo-pha-din','deo-ngoan-muc'):
        # Free driving follows OSM in its original map frame. Store the sampled
        # offsets so rounding and chord shortening never accumulate around bends.
        lon,lat = samples[0]
        result['trace'] = [[round((x-lon)*1e6),round((y-lat)*1e6)] for x,y in samples]
    return result


def main():
    groups = defaultdict(dict)
    for tile in sorted((ROOT/'vn-roads').glob('*.gz')):
        for key, _, _, label, kind, oneway, coords in json.load(gzip.open(tile)):
            name = label.split(' · ')[0]
            if name.startswith('Đèo ') and not oneway and kind not in ('service','track'):
                groups[name][key] = list(zip(coords[::2],coords[1::2]))
            # OSM labels the two-way pass above Tu Sản as QL.4C rather than
            # naming the pass. Select the connected stretch around its overlook.
            elif label.endswith(' · QL.4C') and kind == 'trunk' and not oneway:
                ends = (coords[:2], coords[-2:])
                if all(10539000 <= x <= 10541700 and 2323000 <= y <= 2325100 for x, y in ends):
                    groups['Đèo Mã Pí Lèng'][key] = list(zip(coords[::2],coords[1::2]))
    dem = Image.open(ROOT/'streetscape/surfaces/vietnam-elevation.png').convert('L')
    stages = [s for name in sorted(groups) if (s:=stage(name, groups[name], dem))]
    seen = set()
    for s in stages:
        if s["id"] in seen:
            s["id"] += "-" + str(min(groups[s["name"]]))
        seen.add(s["id"])
    manifest = json.loads((ROOT/'vn-environment/index.json').read_bytes())
    for s in stages:
        s['forestMask'] = forest_mask(s, manifest)
    rows = [json.dumps(s,ensure_ascii=False,separators=(',',':')) for s in stages]
    (ROOT/'mountain-stages.js').write_text("// Centre lines: OpenStreetMap contributors, ODbL. Elevations: bundled Vietnam DEM.\nwindow.mountainStages=[\n"+",\n".join(rows)+"\n];\n",encoding='utf8')
    print(len(stages), 'stages')


if __name__ == '__main__':
    main()
