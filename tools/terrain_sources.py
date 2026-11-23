"""Sample the shipped terrain sources in their native geographic frames."""
from functools import lru_cache
import gzip
import json

import numpy as np
from PIL import Image

METRES_EAST = 111320
METRES_NORTH = 110900  # Same geographic transform as VietnamRoads.


def read_json(path):
    return json.loads(path.read_bytes())


def read_gzip(path):
    return json.loads(gzip.decompress(path.read_bytes()))


def bilinear(a, x, y):
    x = np.clip(x, 0, a.shape[1] - 1)
    y = np.clip(y, 0, a.shape[0] - 1)
    i, j = x.astype(np.int32), y.astype(np.int32)
    fx, fy = x - i, y - j
    ii, jj = np.minimum(i + 1, a.shape[1] - 1), np.minimum(j + 1, a.shape[0] - 1)
    return ((1 - fx) * a[j, i] + fx * a[j, ii]) * (1 - fy) + ((1 - fx) * a[jj, i] + fx * a[jj, ii]) * fy


def cell_index(dist, folder, extension):
    index = {}
    for tag, cells in read_json(dist / folder / 'index.json').items():
        x, y = int(tag[4:]) * 32, int(tag[1:3]) * 32
        for n, (i, j) in enumerate(cells):
            index[x + i, y + j] = (dist / folder / f'{tag}-{n // 32}{extension}', n % 32)
    return index


@lru_cache(maxsize=16)
def rgb(path):
    with Image.open(path) as img:
        return np.asarray(img.convert('RGB'))


def dem_slot(entry, size):
    path, slot = entry
    top, left = slot // 8 * size, slot % 8 * size
    tile = rgb(path)[top:top + size, left:left + size]
    code = tile[:, :, 0].astype(np.float32) * 256 + tile[:, :, 1]
    if size == 96:
        return np.where(tile[:, :, 2] != 0, code - 128, np.nan)
    coords = (np.arange(96) + .5) * 80 / 96 - .5
    valid = bilinear((code > 0).astype(np.float32), coords[None, :], coords[:, None])
    height = bilinear(np.where(code > 0, code - 129, 0), coords[None, :], coords[:, None])
    return np.where(valid > .49, height / np.maximum(.49, valid), np.nan)


class Terrain:
    def __init__(self, dist, baseline_only, urban_dir=None):
        self.dist = dist
        self.dsm = cell_index(dist, 'sight-landscapes', '.surface.webp')
        self.extra = cell_index(dist, 'sight-elevation', '.png')
        self.env = read_json(dist / 'vn-environment/index.json')
        self.cover_tiles = set(self.env['tiles'])
        self.urban_dir = urban_dir or dist / 'urban-terrain'
        self.urban = {} if baseline_only else read_json(self.urban_dir / 'index.json')
        if self.env['grid'] != 2 or self.urban.get('grid', 2) != 2:
            raise ValueError('This audit expects half-degree environment and terrain tiles')
        self.urban_tiles = set(self.urban.get('tiles', []))
        with Image.open(dist / 'streetscape/surfaces/vietnam-elevation.png') as img:
            levels = np.asarray(img.convert('L'))
        self.regional = (3500 * (np.arange(256) / 255) ** 1.6).astype(np.float32)[levels]

    def atlas(self, lon, lat):
        x = ((lon + 180) / 360 * 256 - 200) * self.regional.shape[1] / 7 - .5
        y = ((1 - np.arcsinh(np.tan(np.deg2rad(lat))) / np.pi) * 128 - 110) * self.regional.shape[0] / 13 - .5
        return bilinear(self.regional, x, y)

    @lru_cache(maxsize=10)
    def dsm_tile(self, x, y):
        # Ten pixels of real neighbouring data preserve filters across tile edges.
        pad, n = 10, 768
        data = np.full((n + 2 * pad, n + 2 * pad), np.nan, dtype=np.float32)
        for j in range(-1, 9):
            for i in range(-1, 9):
                key = (8 * x + i, 8 * y + 7 - j)
                if key not in self.dsm and key not in self.extra:
                    continue
                if key in self.dsm:
                    values = dem_slot(self.dsm[key], 96)
                    if key in self.extra and not np.isfinite(values).all():
                        values = np.where(np.isfinite(values), values, dem_slot(self.extra[key], 80))
                else:
                    values = dem_slot(self.extra[key], 80)
                dx, dy = i * 96 + pad, j * 96 + pad
                x0, x1 = max(0, dx), min(data.shape[1], dx + 96)
                y0, y1 = max(0, dy), min(data.shape[0], dy + 96)
                data[y0:y1, x0:x1] = values[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
        valid = np.isfinite(data)
        if not valid.any():
            return None
        cx = np.cos(np.deg2rad((y + .5) / 4)) * METRES_EAST / 3072
        cy = METRES_NORTH / 3072
        dist = np.where(valid, 240, 0).astype(np.float32)
        if not valid.all():
            for _ in range(int(np.ceil(240 / min(cx, cy)))):
                prev = dist
                dist = prev.copy()
                for di, dj, cost in [(1, 0, cx), (0, 1, cy), (1, 1, np.hypot(cx, cy)), (1, -1, np.hypot(cx, cy))]:
                    for sign in [-1, 1]:
                        np.minimum(dist, np.roll(prev, (sign * dj, sign * di), axis=(0, 1)) + cost, out=dist)
        near = []
        for shift, axis, spacing in [(1, 0, cy), (-1, 0, cy), (1, 1, cx), (-1, 1, cx)]:
            side = np.roll(data, shift, axis=axis)
            near.append(np.where(np.isfinite(side), data + (side - data) * min(32 / spacing, 1), data))
        clean = .75 * np.minimum(data, np.maximum.reduce(near) + 2) + .0625 * np.add.reduce(near)
        weight = dist / 240
        weight *= weight * (3 - 2 * weight)
        return clean, weight

    @lru_cache(maxsize=8)
    def cover(self, key):
        if key not in self.cover_tiles:
            return None
        raw = gzip.decompress((self.dist / 'vn-environment' / (key + '.gz')).read_bytes())
        n = self.env['coverSize']
        return np.frombuffer(raw, np.uint8, offset=self.env['populationSize'] ** 2).reshape(n, n)

    @lru_cache(maxsize=8)
    def bare(self, key):
        if key not in self.urban_tiles:
            return None
        pixel = rgb(self.urban_dir / (key + '.png'))
        weight = pixel[:, :, 2].astype(np.float32) / 255
        height = (pixel[:, :, 0].astype(np.float32) * 256 + pixel[:, :, 1] - 32768) * .1
        return height * weight, weight

    def sample(self, lon, lat, include_influence=False, regional=None):
        old = self.atlas(lon, lat) if regional is None else np.asarray(regional, dtype=float).copy()
        corrected, built = old.copy(), np.zeros(lon.size, dtype=bool)
        influence = np.zeros(lon.size, dtype=np.float32)
        ix = np.floor(lon * 4).astype(np.int32)
        iy = np.floor(lat * 4).astype(np.int32)
        group = ix * 1000 + iy
        for k in np.unique(group):
            take = group == k
            x, y = divmod(int(k), 1000)
            u, v = lon[take], lat[take]
            detail = self.dsm_tile(x, y)
            if detail:
                px, py = (u * 4 - x) * 768 + 9.5, (y + 1 - v * 4) * 768 + 9.5
                clean = bilinear(detail[0], px, py)
                weight = bilinear(detail[1], px, py)
                old[take] += np.where(np.isfinite(clean), weight * (clean - old[take]), 0)
            half = f'{x // 2}_{y // 2}'
            fx, fy = u * 2 - x // 2, v * 2 - y // 2
            cover = self.cover(half)
            if cover is not None:
                n = self.env['coverSize']
                built[take] = cover[n - 1 - (fy * n).astype(int), (fx * n).astype(int)] == 50
            terrain = self.bare(half)
            corrected[take] = old[take]
            if terrain:
                n = self.urban['cells']
                px, py = fx * n, (1 - fy) * n
                influence[take] = bilinear(terrain[1], px, py)
                corrected[take] = old[take] * (1 - influence[take]) + bilinear(terrain[0], px, py)
        if include_influence:
            return old, corrected, built, influence
        return old, corrected, built
