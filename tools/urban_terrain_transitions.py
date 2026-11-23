"""Match the broad height datum gradually where urban ground meets the terrain atlas."""
from functools import lru_cache
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

from terrain_sources import Terrain


CELLS = 225
HALO = 45
METRES = 225.  # Conservative spacing of the 8-arcsecond lattice in Vietnam.


class UrbanTransitions:
    def __init__(self, dist, source, cache=None):
        self.source = Path(source)
        self.dist = dist
        self.cache = cache
        self._terrain = None

    @property
    def terrain(self):
        if self._terrain is None:
            self._terrain = Terrain(self.dist, True)
        return self._terrain

    @lru_cache(maxsize=16)
    def read(self, x, y):
        path = self.source / f'{x}_{y}.png'
        if not path.is_file():
            return None
        with Image.open(path) as image:
            pixels = np.asarray(image)
        weight = pixels[:, :, 2].astype(np.float64) / 255
        height = (pixels[:, :, 0].astype(np.float64)*256 + pixels[:, :, 1] - 32768)*.1
        cache = self.cache / f'{x}_{y}.npy' if self.cache else None
        if cache and cache.is_file():
            residual = np.load(cache)
        else:
            j, i = np.where(weight > 0)
            lon = (x*CELLS + i) / (2*CELLS)
            lat = ((y+1)*CELLS - j) / (2*CELLS)
            old = self.terrain.sample(lon, lat)[0]
            residual = np.zeros_like(height)
            residual[j, i] = old - height[j, i]
            if cache:
                np.save(cache, residual)
        return height, weight, residual

    def arrays(self, x, y):
        side = CELLS+1+2*HALO
        height, weight, residual = np.zeros((3, side, side))
        for nx in range(x-1, x+2):
            for ny in range(y-1, y+2):
                arrays = self.read(nx, ny)
                if arrays is None:
                    continue
                left, top = HALO+(nx-x)*CELLS, HALO+(y-ny)*CELLS
                a,b = max(0,left),max(0,top)
                c,d = min(side,left+CELLS+1),min(side,top+CELLS+1)
                for dest, data in zip((height,weight,residual), arrays):
                    dest[b:d,a:c] = data[b-top:d-top,a-left:c-left]
        return height, weight, residual

    @staticmethod
    def balance(height, weight, residual):
        # Absolute datum correction needs distance when the surfaces disagree.
        # A coherent broad offset can be added back to a DTM without adding roofs
        # or tree crowns. Variable slopes near cliffs cannot supply that offset.
        effective = UrbanTransitions.limit_confidence(weight, residual)
        def smooth(v):
            return ndimage.gaussian_filter(v, 1.5, radius=5)
        support = np.maximum(smooth(weight), 1e-10)
        bias = smooth(weight*residual) / support
        spread = np.sqrt(np.maximum(0., smooth(weight*residual**2)/support-bias**2))
        t = np.clip((spread-2.)/6., 0., 1.)
        retained = (weight-effective)*(1.-t*t*(3.-2.*t))
        output_weight = effective + retained
        target = height + retained*bias / np.maximum(output_weight, 1e-10)
        # The fine bare-earth observations often describe one level valley floor
        # even when WorldCover alternates between streets, gardens and open lots.
        # Fill confidence only where nearby observations agree at this elevation.
        candidates = weight > .035
        gap, nearest = ndimage.distance_transform_edt(~candidates, return_indices=True)
        estimate = np.where(candidates, height, height[tuple(nearest)])
        agree = np.zeros_like(height)
        for dx in range(-2,3):
            for dy in range(-2,3):
                offset = (dy,dx)
                neighbours = np.roll(candidates,offset,axis=(0,1))
                rise = abs(np.roll(estimate,offset,axis=(0,1))-estimate)
                agree += neighbours & (rise <= 2. + 1.4*np.hypot(dx,dy))
        flat = np.clip((agree-5.)/12., 0., 1.)
        flat *= flat*(3.-2.*flat)
        flat *= np.clip(1.6-gap, 0., 1.)
        flat = ndimage.gaussian_filter(flat, .85, radius=3)
        flat *= np.clip(2.7-gap, 0., 1.)
        promoted = np.maximum(output_weight, flat)
        target = np.divide(target*output_weight + (promoted-output_weight)*estimate,
                           np.maximum(promoted,1e-10), out=target.copy(), where=promoted>0)
        output_weight = promoted
        return target, output_weight

    @staticmethod
    def limit_confidence(weight, residual, rate=.014, max_mismatch=95.):
        # Bound the artificial gradient introduced by a changing blend weight.
        # The maximum local datum discrepancy also covers the next raster cell.
        magnitude = ndimage.maximum_filter(np.abs(residual), size=5)
        magnitude = np.minimum(magnitude, max_mismatch)
        current = weight.copy()
        neighbours = []
        for dx,dy in [(1,0),(0,1),(1,1),(1,-1)]:
            bound = np.maximum(magnitude, np.roll(magnitude,(dy,dx),axis=(0,1)))
            cost = METRES*rate*np.hypot(dx,dy)/np.maximum(1.,bound)
            neighbours.extend([(dy,dx,cost),(-dy,-dx,np.roll(cost,(-dy,-dx),axis=(0,1)))])
        steps = int(np.ceil(max_mismatch/(METRES*rate)))+1
        for _ in range(steps):
            previous = current
            current = previous.copy()
            for dy,dx,cost in neighbours:
                np.minimum(current,np.roll(previous,(dy,dx),axis=(0,1))+cost,out=current)
            if np.array_equal(previous,current):
                break
        return current

    def write(self, x, y, output):
        height, weight, residual = self.arrays(x, y)
        result, weight = self.balance(height, weight, residual)
        area = np.s_[HALO:-HALO, HALO:-HALO]
        dm = np.rint(result[area]*10).astype(np.int32) + 32768
        if dm.min()<0 or dm.max()>65535:
            raise ValueError(f'Urban height out of decimetre range at {x}_{y}')
        out = np.stack((dm >> 8, dm & 255, np.rint(weight[area]*255)), axis=2).astype(np.uint8)
        Image.fromarray(out).save(Path(output) / f'{x}_{y}.png')


def init_worker(dist, source, cache):
    global worker_fields
    worker_fields = UrbanTransitions(dist, source, cache)


def prepare_tile(key):
    worker_fields.read(*key)


def prepare(dist, source, cache, keys, workers):
    cache.mkdir(exist_ok=True)
    missing = [k for k in keys if not (cache / f'{k[0]}_{k[1]}.npy').exists()]
    if not missing:
        return
    with ProcessPoolExecutor(max_workers=workers, initializer=init_worker,
                             initargs=(dist, source, cache)) as pool:
        list(pool.map(prepare_tile, missing))


def balance_tiles(dist, source, output, cache, keys, workers):
    fields = UrbanTransitions(dist, source, cache)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(lambda k: fields.write(*k, output), keys))
