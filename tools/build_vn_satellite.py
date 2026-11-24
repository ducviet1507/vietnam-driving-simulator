"""Bake geographic ground colour for the Vietnamese road atlas.

Run python tools/build_vn_satellite.py with numpy, Pillow (WebP), rasterio,
tifffile and requests. Only the 1500-pixel overview is read from each public
ESA COG. No network connection to the imagery provider is needed in the game.
"""
from argparse import ArgumentParser
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image

from build_sight_landscapes import ROOT, read_cells


OUTPUT = ROOT / 'dist/vn-satellite'
SIZE = 750                 # 1/750 degree per texel, north-up WGS84
OVERVIEW = 3              # 12,000 / 8 = 1,500
ROAD_TILES_PER_DEGREE = 4


def bake(degree, staging, workers):
    lon, lat = degree
    tag = f'N{lat:02}E{lon:03}'
    url = (f'https://esa-worldcover-s2.s3.eu-central-1.amazonaws.com/rgbnir/2021/N{lat:02}/'
           f'ESA_WorldCover_10m_2021_v200_{tag}_S2RGBNIR.tif')
    with TemporaryDirectory(prefix='vn-satellite-cog-') as tmp:
        cells = read_cells(url, Path(tmp) / 'overview.tif', [degree], OVERVIEW,
                           workers, optional=True, divisions=1, size=2 * SIZE)
    bands = cells.get(degree)
    if bands is None or not bands.any():
        print(f'{tag}: no observation', flush=True)
        return None
    # Average 2x2 observed samples in linear reflectance. The published 750px
    # overview selects one sample, losing narrow islands and small clearings.
    counts = bands.any(axis=0).reshape(SIZE, 2, SIZE, 2).sum(axis=(1, 3), dtype=np.uint8)
    sums = bands[:3].reshape(3, SIZE, 2, SIZE, 2).sum(axis=(2, 4), dtype=np.float32)
    # Match the fixed exposure used for the native-resolution landmark imagery.
    linear = np.moveaxis(sums / np.maximum(1, counts), 0, -1) / 3700
    srgb = (255 * np.clip(1.055 * linear ** (1 / 2.4) - .055, 0, 1)).astype(np.uint8)
    alpha = (counts > 0).astype(np.uint8) * 255
    image = Image.fromarray(np.dstack((srgb, alpha)))
    key = f'{lon}_{lat}'
    target = staging / f'{key}.webp'
    image.save(target, quality=85, method=5)
    with Image.open(target) as check:
        if check.size != (SIZE, SIZE) or not np.array_equal(check.convert('RGBA').getchannel('A'), alpha):
            raise ValueError(f'WebP changed bounds or observation mask in {tag}')
    return key


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    roads = json.loads((ROOT / 'dist/vn-roads/index.json').read_text(encoding='utf8'))
    road_tiles = set(roads['tiles']).union(roads.get('sightAccess', {}).get('addedParents', []))
    degrees = sorted({tuple(int(part) // ROAD_TILES_PER_DEGREE for part in key.split('_'))
                      for key in road_tiles})
    args.output.mkdir(parents=True, exist_ok=True)
    # Stage on the same filesystem and publish the index last. A failed source
    # download leaves the previous complete offline asset set available.
    with TemporaryDirectory(prefix='.bake-', dir=args.output) as tmp:
        staging = Path(tmp)
        with ThreadPoolExecutor(12) as workers, ThreadPoolExecutor(6) as jobs:
            futures = [jobs.submit(bake, degree, staging, workers) for degree in degrees]
            keys = [key for future in futures if (key := future.result()) is not None]
        manifest = {'grid': 1, 'size': SIZE, 'tiles': keys, 'year': 2021}
        (staging / 'index.json').write_text(json.dumps(manifest, separators=(',', ':')) + '\n', encoding='utf8')
        for key in keys:
            name = f'{key}.webp'
            (staging / name).replace(args.output / name)
        (staging / 'index.json').replace(args.output / 'index.json')
    print(f'{len(keys)} geographic images for {len(degrees)} degrees covering {len(road_tiles)} road tiles.')


if __name__ == '__main__':
    main()
