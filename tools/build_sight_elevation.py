"""Fill gaps in the sightseeing DSM with local Copernicus GLO-30 samples.

Run from any working directory with the dependencies of build_sight_landscapes.py.
The existing 96-pixel land-cover pages remain authoritative where valid. Each
supplementary 80-pixel cell spans 1/32 degree, roughly 40-43 m between samples.
"""
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
import json
import math
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image
from build_sight_landscapes import GRID, ROOT, read_cells


BASE = ROOT / 'dist' / 'sight-landscapes'
OUT = ROOT / 'dist' / 'sight-elevation'
SIZE = 80
REACH = 2250  # includes interpolation neighbours beyond the 2 km driving view


def attractions():
    extract = r"""const fs=require('fs');global.window=global;
    const scripts=[...fs.readFileSync('dist/index.html','utf8').matchAll(/src="([^"]+\.js)"/g)].map(m=>m[1]);
    for(const name of scripts.slice(scripts.indexOf('tourism-catalog.js'),scripts.indexOf('vietnam-landmarks.js')+1))
      require('./dist/'+name);
    console.log(JSON.stringify(VietnamLandmarks.entries.flatMap(s=>[[s.lon,s.lat],s.start]).filter(Boolean)));"""
    return json.loads(subprocess.check_output(['node', '-e', extract], cwd=ROOT))


def required_cells(stops):
    cells = defaultdict(list)
    for lon, lat in sorted(set(map(tuple, stops))):
        mx = 111320*math.cos(math.radians(lat))
        dx, dy = REACH/mx, REACH/110900
        for j in range(math.floor((lat-dy)*GRID), math.floor((lat+dy)*GRID)+1):
            for i in range(math.floor((lon-dx)*GRID), math.floor((lon+dx)*GRID)+1):
                cells[i,j].append((lon,lat,mx))
    # A catalogued cell can lack valid surface heights, in particular when
    # Sentinel imagery has no valid reflectance over an island or offshore.
    index = json.loads((BASE/'index.json').read_text())
    for tag, slots in index.items():
        for start in range(0,len(slots),32):
            page = None
            for k,(x,y) in enumerate(slots[start:start+32]):
                key = int(tag[4:])*GRID+x, int(tag[1:3])*GRID+y
                if key not in cells:
                    continue
                if page is None:
                    with Image.open(BASE / f'{tag}-{start//32}.surface.webp') as im:
                        page = np.asarray(im)
                valid = page[k//8*96:(k//8+1)*96, k%8*96:(k%8+1)*96,2]
                if np.all(valid):
                    del cells[key]
    return cells


def build(degree, areas, workers):
    lon,lat = degree
    tag = f'N{lat:02}E{lon:03}'
    name = f'Copernicus_DSM_COG_10_N{lat:02}_00_E{lon:03}_00_DEM'
    with TemporaryDirectory(prefix='vivu-sight-dem-') as tmp:
        samples = read_cells(f'https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif',
                             Path(tmp)/'tile.tif', areas, 0, workers, True, GRID, SIZE, point_grid=True)
        if not samples:
            # Ocean-only one-degree tiles are absent from both Copernicus products.
            name = name.replace('_10_', '_30_')
            samples = read_cells(f'https://copernicus-dem-90m.s3.amazonaws.com/{name}/{name}.tif',
                                 Path(tmp)/'tile90.tif', areas, 0, workers, True, GRID, SIZE, point_grid=True)
    coords = np.arange(SIZE)+.5
    cells=[]
    for (x,y),sites in sorted(areas.items()):
        meridians=(x+coords/SIZE)/GRID
        parallels=(y+1-coords/SIZE)/GRID
        mask=np.zeros((SIZE,SIZE),bool)
        for cx,cy,mx in sites:
            mask |= ((meridians-cx)*mx)**2+(((parallels-cy)*110900)**2)[:,None]<REACH**2
        if not mask.any():
            continue
        # Integer metres, biased by 129. Zero is reserved for unsampled pixels.
        value=samples[x,y][0] if samples else np.zeros_like(mask,dtype=float)
        if not np.isfinite(value[mask]).all() or value[mask].min() < -120 or value[mask].max()>4000:
            raise ValueError(f'Invalid elevation in {tag}, {x}, {y}')
        biased=np.where(mask,np.rint(value)+129,0).astype('uint16')
        cells.append((x,y,biased))
    for start in range(0,len(cells),32):
        slots=cells[start:start+32]
        out=np.zeros((math.ceil(len(slots)/8)*SIZE,min(8,len(slots))*SIZE,3),dtype='uint8')
        for i,(_,_,heights) in enumerate(slots):
            section=out[i//8*SIZE:(i//8+1)*SIZE,i%8*SIZE:(i%8+1)*SIZE]
            section[:,:,0]=heights>>8
            section[:,:,1]=heights&255
        # PNG filters neighbouring scanline deltas losslessly, including the
        # upper byte when crossing 127 m, before deflate compression.
        Image.fromarray(out).save(OUT/f'{tag}-{start//32}.png',optimize=True)
    print(tag,len(cells),flush=True)
    return tag, [[x%GRID,y%GRID] for x,y,_ in cells]


def main():
    groups=defaultdict(dict)
    for cell,sites in required_cells(attractions()).items():
        groups[cell[0]//GRID,cell[1]//GRID][cell]=sites
    OUT.mkdir(exist_ok=True)
    with ThreadPoolExecutor(12) as workers, ThreadPoolExecutor(5) as batches:
        jobs=[batches.submit(build,degree,areas,workers) for degree,areas in sorted(groups.items())]
        index={tag: slots for tag,slots in (job.result() for job in jobs) if slots}
    (OUT/'index.json').write_text(json.dumps(index,separators=(',',':'))+'\n',encoding='ascii')
    print(sum(map(len,index.values())),'supplementary cells in',len(index),'degree blocks')


if __name__=='__main__':
    main()
