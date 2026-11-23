"""Bake street-scale terrain for the Hanoi and HCMC urban plains from GEDTM30.

Requires numpy and rasterio. Only the two windows of the remote COG are read.
"""
import json
import math
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import from_bounds

SOURCE = ("https://opentopography.s3.sdsc.edu/raster/GEDTM30/GEDTM30_be/"
          "gedtm_rf_m_30m_s_20060101_20151231_go_epsg.4326.3855_v1.2.tif")
OUTPUT = Path(__file__).resolve().parents[1] / "dist" / "city-terrain.js"
SCALE = 450  # Eight arc seconds between ground samples.
CITIES = [(105.72, 20.92, 105.97, 21.12), (106.55, 10.64, 106.87, 10.91)]


def sample_grid(dataset, bounds):
    west, south, east, north = bounds
    left, right = math.floor(west*SCALE), math.ceil(east*SCALE)
    top, bottom = math.ceil(north*SCALE), math.floor(south*SCALE)
    width, height = right-left+1, top-bottom+1
    # Average around each lattice point. Include a halo so the same filter
    # applies at the perimeter, where the game blends back to regional relief.
    window = from_bounds((left-1.5)/SCALE, (bottom-1.5)/SCALE,
                         (right+1.5)/SCALE, (top+1.5)/SCALE, dataset.transform)
    samples = dataset.read(1, window=window, out_shape=(height+2, width+2),
                           resampling=Resampling.average, masked=True).filled(np.nan)
    total = np.zeros((height, width))
    weight = np.zeros_like(total)
    for j, v in enumerate((1, 2, 1)):
        for i, u in enumerate((1, 2, 1)):
            tile = samples[j:j+height, i:i+width]
            valid = np.isfinite(tile)
            total[valid] += tile[valid]*u*v
            weight[valid] += u*v
    if not weight.all():
        raise ValueError(f"Incomplete urban terrain at {bounds}")
    metres = total/weight
    if metres.min() < -20 or metres.max() > 150:
        raise ValueError(f"Unexpected urban terrain range at {bounds}")
    return dict(west=left/SCALE, north=top/SCALE, scale=SCALE,
                rows=np.rint(metres*10).astype(int).tolist())


if __name__ == "__main__":
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_TIMEOUT="180",
                      GDAL_HTTP_MULTIRANGE="SERIAL", GDAL_HTTP_MAX_RETRY="3"):
        with rasterio.open("/vsicurl/"+SOURCE) as data:
            grids = [sample_grid(data, city) for city in CITIES]
    payload = json.dumps(grids, separators=(",", ":")).replace("],[", "],\n[")
    OUTPUT.write_text("'use strict';\n// GEDTM30 v1.2 in decimetres. See streetscape/CREDITS.txt.\n"
                      "const cityTerrainGrids="+payload+";\n", encoding="ascii")
