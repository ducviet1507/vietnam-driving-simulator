"""Bake offline satellite colour, vegetation and surface elevation around atlas stops.

Run from the repository root with Python, Node, rasterio, numpy, requests,
tifffile and Pillow. Source credits are in dist/streetscape/CREDITS.txt.
Only the intersecting compressed blocks of the public GeoTIFFs are needed.
"""
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import json
import math
from pathlib import Path
from tempfile import TemporaryDirectory
import threading
import time

import numpy as np
from PIL import Image
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import Window
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import tifffile
from pack_sight_surfaces import pack_pages, stops
from pack_sight_water import pack_water_mask


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist' / 'sight-landscapes'
GRID, SIZE = 32, 96
LOCAL = threading.local()


def byte_range(url, first, last, optional=False):
    if not hasattr(LOCAL, 'http'):
        LOCAL.http = requests.Session()
        retries = Retry(total=5, backoff_factor=.6, status_forcelist=[429, 500, 502, 503, 504])
        LOCAL.http.mount('https://', HTTPAdapter(max_retries=retries))
    for attempt in range(5):
        try:
            r = LOCAL.http.get(url, headers={'Range': f'bytes={first}-{last}'}, timeout=(15, 90))
            break
        except requests.RequestException:
            if attempt == 4:
                raise
            time.sleep(2**attempt)
    if optional and r.status_code == 404:
        return None
    r.raise_for_status()
    total = int(r.headers.get('Content-Range','/0').split('/')[-1])
    if r.status_code != 206 or len(r.content) != min(total, last + 1) - first:
        raise ValueError(f'Incomplete source range {url} {first}..{last}')
    return r.content


def read_cells(url, path, cells, level, workers, optional=False, divisions=GRID, size=SIZE, point_grid=False):
    header = byte_range(url, 0, 131071, optional)
    if header is None:
        return {}
    with tifffile.TiffFile(BytesIO(header)) as tif:
        page = tif.pages[level]
        width, height = page.imagewidth, page.imagelength
        tw, th = page.tilewidth, page.tilelength
        offsets, lengths = page.dataoffsets, page.databytecounts
    windows, blocks, centres = {}, set(), {}
    for x, y in cells:
        left, top = (x % divisions) * width / divisions, (divisions - 1 - y % divisions) * height / divisions
        w, h = width / divisions, height / divisions
        if point_grid:
            # The north-west Copernicus sample is centred on the integer degree.
            # Read its native pixels, including the four interpolation neighbours,
            # to avoid GDAL automatically substituting a downsampled COG overview.
            fraction = (np.arange(size) + .5) / size
            u = np.clip(left + fraction*w, 0, width-1)
            v = np.clip(top + fraction*h, 0, height-1)
            left, top = math.floor(u[0]), math.floor(v[0])
            w, h = math.ceil(u[-1])+1-left, math.ceil(v[-1])+1-top
            centres[x,y] = u-left, v-top
        windows[x, y] = Window(left, top, w, h)
        for j in range(int(top) // th, math.ceil((top+h)/th)):
            for i in range(int(left) // tw, math.ceil((left+w)/tw)):
                blocks.add(j*math.ceil(width/tw)+i)
    # Nearby compressed strips frequently belong to the same HTTP range.
    # Coalesce them to reduce round trips when baking the national catalogue.
    ranges = []
    for i in sorted(blocks,key=offsets.__getitem__):
        first,last = offsets[i],offsets[i]+lengths[i]-1
        if ranges and first-ranges[-1][1]<16384 and last-ranges[-1][0]<2**20:
            ranges[-1][1]=last
        else:
            ranges.append([first,last])
    def load(span):
        first,last=span
        return first,byte_range(url,first,last)
    with path.open('wb') as f:
        f.write(header)
        for pos, data in workers.map(load, ranges):
            f.seek(pos)
            f.write(data)
    options = {'overview_level': level-1} if level else {}
    with rasterio.open(path, **options) as src:
        if point_grid:
            sampled = {}
            for key,win in windows.items():
                data = src.read(window=win)
                u,v = centres[key]
                i,j = u.astype(int),v.astype(int)
                ix,jy = np.minimum(i+1,data.shape[2]-1),np.minimum(j+1,data.shape[1]-1)
                fx,fy = u-i,(v-j)[:,None]
                north = data[:,j[:,None],i]*(1-fx) + data[:,j[:,None],ix]*fx
                south = data[:,jy[:,None],i]*(1-fx) + data[:,jy[:,None],ix]*fx
                sampled[key] = north*(1-fy) + south*fy
            return sampled
        return {key: src.read(window=win, out_shape=(src.count, size, size),
                              resampling=Resampling.nearest) for key, win in windows.items()}


def build(degree, cells, workers):
    lon, lat = degree
    tag = f'N{lat:02}E{lon:03}'
    rgb_url = (f'https://esa-worldcover-s2.s3.eu-central-1.amazonaws.com/rgbnir/2021/N{lat:02}/'
               f'ESA_WorldCover_10m_2021_v200_{tag}_S2RGBNIR.tif')
    dem = f'Copernicus_DSM_COG_10_N{lat:02}_00_E{lon:03}_00_DEM'
    dem_url = f'https://copernicus-dem-30m.s3.amazonaws.com/{dem}/{dem}.tif'
    with TemporaryDirectory() as tmp:
        rgb = read_cells(rgb_url, Path(tmp)/'rgb.tif', cells, 2, workers, True)
        dem_data = read_cells(dem_url, Path(tmp)/'dem.tif', cells, 0, workers, True)
    cells = sorted(cells)
    for start in range(0, len(cells), 32):
        page = cells[start:start+32]
        size = (min(len(page), 8)*SIZE, math.ceil(len(page)/8)*SIZE)
        colour, surface = Image.new('RGBA', size), Image.new('RGB', size)
        for i, key in enumerate(page):
            data = rgb.get(key)
            if data is None:
                data = np.zeros((4, SIZE, SIZE), dtype='float32')
            red, green, blue, ir = data.astype('float32')
            valid = np.any(data, axis=0)
            # Reflectance in units of 1/10000. A fixed exposure preserves seams.
            linear = np.stack((red, green, blue), axis=-1) / 3700
            srgb = np.clip(1.055*np.maximum(0, linear)**(1/2.4)-.055, 0, 1)
            place = (i%8*SIZE, i//8*SIZE)
            colour.paste(Image.fromarray(np.dstack((np.uint8(srgb*255),valid.astype('uint8')*255))), place)
            elevation = dem_data.get(key)
            heights = np.zeros((SIZE, SIZE)) if elevation is None else elevation[0]
            packed = np.clip(np.round(heights)+128, 0, 65535).astype('uint16')
            ndvi = (ir-red)/np.maximum(1, ir+red)
            cover = np.clip(2+(ndvi+1)*124, 2, 253).astype('uint8')
            cover[(green>ir*1.14) & (ir<1100)] = 1
            cover[~valid] = 0
            pixels = np.stack((packed >> 8, packed & 255, cover), axis=-1).astype('uint8')
            surface.paste(Image.fromarray(pixels), place)
        stem = OUT/f'{tag}-{start//32}'
        colour.save(stem.with_suffix('.webp'), quality=85, method=5)
        surface.save(stem.with_suffix('.png'), optimize=True)
    print(tag, len(cells), flush=True)
    return tag, [[x%GRID, y%GRID] for x,y in cells]


def build_water(index):
    # Keep the original 10 m water classification. This resolves small islands
    # and sandy spits that are narrower than one satellite-colour texel.
    groups = defaultdict(dict)
    for tag, slots in index.items():
        lon, lat = int(tag[4:]), int(tag[1:3])
        groups[lon//3*3,lat//3*3][tag] = [(lon*GRID+x,lat*GRID+y) for x,y in slots]
    size = SIZE*4
    def pack(group):
        (lon,lat), pages = group
        tag = f'N{lat:02}E{lon:03}'
        url = ('https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/'
               f'ESA_WorldCover_10m_2021_v200_{tag}_Map.tif')
        with TemporaryDirectory() as tmp:
            cells = [key for slots in pages.values() for key in slots]
            values = read_cells(url, Path(tmp)/'water.tif', cells, 0, workers, True, 3*GRID, size)
        for name, slots in pages.items():
            for start in range(0,len(slots),32):
                page = slots[start:start+32]
                mask = Image.new('P',(min(8,len(page))*size, math.ceil(len(page)/8)*size))
                mask.putpalette([0,0,0,0,0,0])
                for i, key in enumerate(page):
                    if key in values:
                        tile = Image.fromarray((values[key][0] == 80).astype('uint8'))
                        mask.paste(tile, (i%8*size,i//8*size))
                source = OUT/f'{name}-{start//32}-water.png'
                mask.save(source,transparency=0,bits=1,optimize=True)
                pack_water_mask(source)
    with ThreadPoolExecutor(12) as workers, ThreadPoolExecutor(4) as batches:
        list(batches.map(pack,groups.items()))


def main():
    coords = stops()
    degrees = defaultdict(set)
    for lon, lat in coords:
        for x in range(math.floor((lon-.007)*GRID), math.floor((lon+.007)*GRID)+1):
            for y in range(math.floor((lat-.007)*GRID), math.floor((lat+.007)*GRID)+1):
                degrees[x//GRID,y//GRID].add((x,y))
    OUT.mkdir(exist_ok=True)
    with ThreadPoolExecutor(16) as workers, ThreadPoolExecutor(6) as groups:
        jobs = [groups.submit(build, degree, cells, workers) for degree,cells in sorted(degrees.items())]
        index = dict(job.result() for job in jobs)
    (OUT/'index.json').write_text(json.dumps(index,separators=(',',':'))+'\n', encoding='utf8')
    pack_pages(OUT, index, coords)
    build_water(index)


if __name__ == '__main__':
    main()
