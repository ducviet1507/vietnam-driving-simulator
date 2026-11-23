"""Bake urban bare-earth terrain for every half-degree tile of Vietnam's road atlas.

Requires numpy, Pillow, rasterio and scipy. The 8-arcsecond GEDTM30 overview
provides the urban plains. Near hills, the 2-arcsecond overview distinguishes
level built-up ground from the adjacent slope before resampling to the output
lattice. Neighbouring ESA WorldCover tiles provide the built-up observations.
"""
import argparse
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from functools import lru_cache
import gzip
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from time import sleep

import numpy as np
from PIL import Image
import rasterio
from rasterio.windows import Window
from scipy import ndimage
from urban_terrain_transitions import balance_tiles, prepare


ROOT = Path(__file__).resolve().parents[1] / "dist"
SOURCE = ("https://opentopography.s3.sdsc.edu/raster/GEDTM30/GEDTM30_be/"
          "gedtm_rf_m_30m_s_20060101_20151231_go_epsg.4326.3855_v1.2.tif")
ENV = dict(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_TIMEOUT="180",
           GDAL_HTTP_MULTIRANGE="SERIAL", GDAL_HTTP_MAX_RETRY="3",
           CPL_VSIL_CURL_CHUNK_SIZE="262144")
GRID = 2
CELLS = 225
SCALE = CELLS * GRID
# Cover density uses five neighbouring cells and distance feathering another six.
HALO = 14
CORE = np.s_[HALO:-HALO, HALO:-HALO]


def tile_key(tile):
    return f"{tile[0]}_{tile[1]}"


def road_tiles(roads):
    parents = set(roads["tiles"]) | set(roads.get("sightAccess", {}).get("addedParents", ()))
    return sorted({tuple(int(i) // 2 for i in k.split("_")) for k in parents})


def source_grid(factor):
    overview = 0 if factor == 4 else 2
    with rasterio.Env(**ENV), rasterio.open("/vsicurl/" + SOURCE, overview_level=overview) as ds:
        affine = ds.transform
        step = 1 / (SCALE * factor)
        if not np.allclose([affine.a, affine.e], [step, -step], rtol=1.e-5):
            raise ValueError(f"Unexpected GEDTM30 overview for scale {SCALE * factor}")
        rows, cols = ds.block_shapes[0]
        return affine.c, affine.f, affine.a, affine.e, rows, cols


def lattice(tile, factor):
    x, y = tile
    # Absolute integer indices keep every shared coordinate bit-identical.
    axis = np.arange(-HALO * factor, (CELLS + HALO) * factor + 1)
    return x * CELLS * factor + axis, (y + 1) * CELLS * factor - axis


def source_axes(tile, grid, factor):
    west, north, dx, dy, _, _ = grid
    gx, gy = lattice(tile, factor)
    scale = SCALE * factor
    return (gx / scale - west) / dx - .5, (gy / scale - north) / dy - .5


def block_range(axis, size):
    return range(int(np.floor(axis[0])) // size, (int(np.floor(axis[-1])) + 1) // size + 1)


def block_path(work, i, j, factor):
    prefix = "fine" if factor == 4 else "gedtm"
    return work / f"{prefix}-{i}-{j}.npy"


def fetch_block(args):
    (i, j), grid, work, factor = args
    path = block_path(work, i, j, factor)
    if path.is_file():
        return
    rows, cols = grid[-2:]
    window = Window(j * cols, i * rows, cols, rows)
    for attempt in range(3):
        try:
            level = 0 if factor == 4 else 2
            with rasterio.Env(**ENV), rasterio.open("/vsicurl/" + SOURCE, overview_level=level) as ds:
                raster = ds.read(1, window=window)
                raster[raster == ds.nodata] = np.nan
            partial = path.with_suffix(".part.npy")
            np.save(partial, raster)
            partial.replace(path)
            print(f"Read GEDTM30 block {i}, {j}", flush=True)
            return
        except rasterio.errors.RasterioError:
            if attempt == 2:
                raise
            sleep(2 ** attempt)


@lru_cache(maxsize=32)
def source_block(path):
    return np.load(path, mmap_mode="r")


def sample_ground(tile, grid, work, factor=1):
    xs, ys = source_axes(tile, grid, factor)
    rows, cols = grid[-2:]
    top, left = int(np.floor(ys[0])), int(np.floor(xs[0]))
    bottom, right = int(np.floor(ys[-1])) + 2, int(np.floor(xs[-1])) + 2
    src = np.empty((bottom - top, right - left), dtype="float32")
    for i in block_range(ys, rows):
        for j in block_range(xs, cols):
            raster = source_block(block_path(work, i, j, factor))
            r, c = i * rows, j * cols
            a, b = max(top, r), max(left, c)
            d, e = min(bottom, r + rows), min(right, c + cols)
            src[a-top:d-top, b-left:e-left] = raster[a-r:d-r, b-c:e-c]

    if factor == 4:
        # Preserve individual source observations when measuring fine-scale relief.
        ix = np.floor(xs + .5).astype(int) - left
        iy = np.floor(ys + .5).astype(int) - top
        return src[np.ix_(iy, ix)].astype("float64")
    # Bilinear interpolation at each node, renormalised across coastal nodata.
    ix, iy = np.floor(xs).astype(int), np.floor(ys).astype(int)
    fx, fy = xs - ix, (ys - iy)[:, None]
    total = np.zeros((len(ys), len(xs)))
    valid_weight = np.zeros_like(total)
    for row, wy in enumerate((1 - fy, fy)):
        for col, wx in enumerate((1 - fx, fx)):
            values = src[(iy - top + row)[:, None], ix - left + col]
            valid = np.isfinite(values)
            contribution = wy * wx * valid
            total += np.where(valid, values, 0) * contribution
            valid_weight += contribution
    return np.divide(total, valid_weight, out=np.full_like(total, np.nan), where=valid_weight > 0)


@lru_cache(maxsize=24)
def read_cover(tile, n, offset):
    key = tile_key(tile)
    data = gzip.decompress((ROOT / "vn-environment" / (key + ".gz")).read_bytes())
    return np.frombuffer(data, dtype="uint8", offset=offset).reshape(n, n)


def prepare_cover(tile, environment):
    n = environment["coverSize"]
    cover = read_cover(tile, n, environment["populationSize"] ** 2)
    # Mean built fraction on the common 8 arcsecond cell grid.
    built = Image.fromarray((cover == 50).astype("float32"))
    density = np.asarray(built.resize((CELLS, CELLS), Image.Resampling.BOX))
    return density, bool(np.any(cover))


def fine_cover(tile, covers, environment):
    gx, gy = lattice(tile, 4)
    side = CELLS * 4
    n = environment["coverSize"]
    classes = np.zeros((len(gy), len(gx)), dtype="uint8")
    for x in np.unique(gx // side):
        cols = np.flatnonzero(gx // side == x)
        for y in np.unique(gy // side):
            if (x, y) not in covers:
                continue
            rows = np.flatnonzero(gy // side == y)
            cover = read_cover((x, y), n, environment["populationSize"] ** 2)
            samples = np.ix_(n - 1 - (gy[rows] % side) * n // side, (gx[cols] % side) * n // side)
            classes[np.ix_(rows, cols)] = cover[samples]
    return classes


def cover_weight(tile, covers):
    x, y = tile
    side = CELLS + 2 * HALO + 2
    buf = np.zeros((side, side), dtype="float32")
    # Cell centres straddle a vertex. Include the extra cell to its north/west.
    origin = HALO + 1
    for ny in range(y - 1, y + 2):
        for nx in range(x - 1, x + 2):
            cover = covers.get((nx, ny))
            if cover is None:
                continue
            row, col = origin + (y - ny) * CELLS, origin + (nx - x) * CELLS
            a, b = max(0, row), max(0, col)
            d, e = min(side, row + CELLS), min(side, col + CELLS)
            buf[a:d, b:e] = cover[a-row:d-row, b-col:e-col]
    density = (buf[1:, 1:] + buf[:-1, 1:] + buf[1:, :-1] + buf[:-1, :-1]) * .25
    context = ndimage.gaussian_filter(density, 1.2, radius=5)
    # Link streets, public squares and parks into the same urban ground surface.
    urban = (context >= .13) | ((density >= .20) & (context >= .06))
    if not np.any(urban):
        return np.zeros_like(density)
    distance = ndimage.distance_transform_edt(~urban)
    return 1 - smoothstep(distance, 1.5, 6)


def smoothstep(values, low, high):
    t = np.clip((values - low) / (high - low), 0, 1)
    return t * t * (3 - 2 * t)


def urban_surface(ground):
    valid = np.isfinite(ground)
    # A binomial filter removes isolated returns without overshooting the data.
    kernel = np.array([1, 4, 6, 4, 1], dtype="float64") / 16
    def blur(values):
        return ndimage.convolve1d(ndimage.convolve1d(values, kernel, axis=1), kernel, axis=0)
    weights = blur(valid.astype("float64"))
    smoothed = np.divide(blur(np.where(valid, ground, 0)), weights,
                         out=np.zeros_like(ground), where=weights > 0)
    high = ndimage.maximum_filter(np.where(valid, ground, -np.inf), size=5)
    low = ndimage.minimum_filter(np.where(valid, ground, np.inf), size=5)
    # The coarse DTM can include the hillside in a street at its foot. Defer
    # to fine observations where relief across the ~1 km window reaches 68 m.
    # Allow a one-cell margin for streets beside the hill, then feather it.
    level = 1 - smoothstep(high - low, 16, 68)
    level = ndimage.gaussian_filter(ndimage.minimum_filter(level, size=3), 1, radius=3)
    return smoothed, weights > 0, level


def foothill_surface(ground, classes):
    # Measure relief over ~120 m first. Include a small contribution from
    # adjoining open land, so streets and courtyards can share a ground level.
    valid = np.isfinite(ground)
    high = ndimage.maximum_filter(np.where(valid, ground, -np.inf), size=3)
    low = ndimage.minimum_filter(np.where(valid, ground, np.inf), size=3)
    level = 1 - smoothstep(high - low, 4.8, 12)
    land = (classes != 0) & (classes != 80)
    support = (.03 * land + .97 * (classes == 50)) * level * valid
    g = np.where(valid, ground, 0)

    def average(values):
        # The fine samples cover ~60 m each. Accumulate on both sides of
        # the street before sampling the common 8-arcsecond output vertices.
        return ndimage.gaussian_filter(values, 3.2, truncate=3)[::4, ::4]

    density = average(support)
    denom = np.maximum(density, 1e-10)
    height = average(g * support) / denom
    spread = np.sqrt(np.maximum(0, average(g * g * support) / denom - height * height))
    # Sparse observations or disagreement between neighbouring terraces favour
    # the original game surface instead of extrapolating a street up a slope.
    confidence = smoothstep(density, .027, .18) * (1 - smoothstep(spread, 6.5, 13))
    return height, confidence


def bake_tile(tile, covers, environment, grids, work, output):
    urban = cover_weight(tile, covers)
    if not np.any(np.rint(urban[CORE] * 255)):
        return "noUrban", 0
    terrain, available, level = urban_surface(sample_ground(tile, grids[1], work))
    if np.any((level < 1) & (urban > 0)) or np.any(~available & (urban > 0)):
        fine, confidence = foothill_surface(sample_ground(tile, grids[4], work, 4),
                                            fine_cover(tile, covers, environment))
        coarse = np.where(available, level, 0)
        fine_weight = (1 - coarse) * confidence
        level = coarse + fine_weight
        terrain = (coarse * terrain + fine_weight * fine) / np.maximum(level, 1e-10)
        available |= confidence > 0
    missing = np.count_nonzero((np.rint(urban[CORE] * 255) > 0) & ~available[CORE])
    influence = np.rint(urban * level * 255).astype("uint8")
    influence[~available] = 0
    if not np.any(influence[CORE]):
        return ("noElevation" if missing else "localRelief"), int(missing)
    # Store ground through the edge of each active cell. The browser interpolates
    # the four vertex corrections, each weighted by that vertex's influence.
    support = ndimage.maximum_filter(influence, size=3) > 0
    dm = np.rint(np.where(support, terrain, 0)[CORE] * 10).astype("int32") + 32768
    if dm.min() < 0 or dm.max() > 65535:
        raise ValueError(f"Height outside decimetre encoding in {tile}")
    rgb = np.stack((dm >> 8, dm & 255, influence[CORE]), axis=2).astype("uint8")
    Image.fromarray(rgb).save(output / (tile_key(tile) + ".png"))
    return "tiles", int(missing)


def verify_edges(output, keys, road):
    edges = {}
    for tile in sorted(keys):
        with Image.open(output / (tile_key(tile) + ".png")) as image:
            pixels = np.asarray(image)
            if pixels.shape != (CELLS + 1, CELLS + 1, 3) or not pixels[:, :, 2].any():
                raise ValueError(f"Invalid RGB tile {tile}")
            edges[tile] = [pixels[:, 0].copy(), pixels[:, -1].copy(),
                           pixels[0].copy(), pixels[-1].copy()]
    for x, y in keys:
        for side, neighbour in enumerate(((x-1, y), (x+1, y), (x, y+1), (x, y-1))):
            edge = edges[x, y][side]
            if neighbour in edges:
                if not np.array_equal(edge, edges[neighbour][side ^ 1]):
                    raise ValueError(f"Seam mismatch at {(x, y)} / {neighbour}")
            elif neighbour in road and edge[:, 2].any():
                raise ValueError(f"Missing active neighbour {neighbour} of {(x, y)}")


def build(work, output, workers):
    roads = json.loads((ROOT / "vn-roads/index.json").read_text(encoding="utf8"))
    tiles = road_tiles(roads)
    environment = json.loads((ROOT / "vn-environment/index.json").read_text(encoding="utf8"))
    cover_tiles = [tuple(map(int, k.split("_"))) for k in environment["tiles"]]
    if environment["grid"] != GRID or not set(tiles) <= set(cover_tiles):
        raise ValueError("Road atlas has no matching WorldCover file")
    covers, no_cover = {}, []
    for tile in cover_tiles:
        covers[tile], valid = prepare_cover(tile, environment)
        if not valid:
            no_cover.append(tile_key(tile))
    grids = {factor: source_grid(factor) for factor in (1, 4)}
    jobs = []
    for factor, grid in grids.items():
        blocks = set()
        for tile in tiles:
            xs, ys = source_axes(tile, grid, factor)
            blocks.update((i, j) for i in block_range(ys, grid[-2]) for j in block_range(xs, grid[-1]))
        jobs.extend((b, grid, work, factor) for b in sorted(blocks)
                    if not block_path(work, *b, factor).is_file())
    if jobs:
        with ProcessPoolExecutor(max_workers=workers) as pool:
            list(pool.map(fetch_block, jobs))
    groups = {k: [] for k in ("tiles", "noUrban", "localRelief", "noElevation")}
    partial = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = pool.map(lambda tile: bake_tile(tile, covers, environment, grids, work, output), tiles)
        for tile, (group, missing) in zip(tiles, results):
            key = tile_key(tile)
            groups[group].append(key)
            if missing:
                partial[key] = missing
    present = {tuple(map(int, k.split("_"))) for k in groups["tiles"]}
    # Use the original half-degree tiles as read-only inputs until every neighbour
    # has been sampled. Only the staged output is replaced, after seam checks.
    with TemporaryDirectory(prefix="urban-transitions-", dir=output.parent) as temp:
        cache = Path(temp) / "reference"
        balanced = Path(temp) / "balanced"
        balanced.mkdir()
        ordered = sorted(present)
        prepare(ROOT, output, cache, ordered, workers)
        balance_tiles(ROOT, output, balanced, cache, ordered, workers)
        verify_edges(balanced, present, set(tiles))
        for path in balanced.glob("*.png"):
            path.replace(output / path.name)
    verify_edges(output, present, set(tiles))
    if {p.stem for p in output.glob("*.png")} != set(groups["tiles"]):
        raise ValueError(f"Unexpected PNGs in {output}")
    manifest = dict(grid=GRID, cells=CELLS, **groups, noLandCover=no_cover, missingElevationNodes=partial,
                    transitionModel="datum-gradient-v1")
    (output / "index.json").write_text(json.dumps(manifest, separators=(",", ":")) + "\n", encoding="ascii")
    print(f"Verified {len(tiles)} half-degree tiles and all shared edges: "
          f"{len(present)} with urban terrain, {len(groups['noUrban'])} without urban footprint, "
          f"{len(groups['localRelief'])} using local relief, {len(groups['noElevation'])} "
          f"missing urban elevation, {len(no_cover)} without WorldCover. "
          f"{sum(partial.values())} urban nodes lack elevation.", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, help="Reuse downloaded GEDTM30 v1.2 blocks on retry")
    parser.add_argument("--output", type=Path, default=ROOT / "urban-terrain")
    parser.add_argument("--workers", type=int, default=6)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix="vivu-urban-ground-") as temp:
        work = args.cache or Path(temp)
        work.mkdir(parents=True, exist_ok=True)
        with TemporaryDirectory(prefix=".urban-ground-", dir=args.output.parent) as stage:
            staged = Path(stage)
            try:
                build(work, staged, args.workers)
            finally:
                source_block.cache_clear()
            manifest = args.output / "index.json"
            previous = set(json.loads(manifest.read_text())["tiles"]) if manifest.exists() else set()
            next_tiles = {p.stem for p in staged.glob("*.png")}
            for key in sorted(next_tiles):
                (staged / (key + ".png")).replace(args.output / (key + ".png"))
            (staged / "index.json").replace(manifest)
            obsolete = previous - next_tiles
            for path in args.output.glob("*.png"):
                if path.stem in obsolete:
                    path.unlink()


if __name__ == "__main__":
    main()
