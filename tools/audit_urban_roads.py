"""Screen the complete shipped OSM road graph for terrain-induced urban grades.

Run with Python, numpy and Pillow: python tools/audit_urban_roads.py --output audit.json
Use --tile X_Y for a quick check of a quarter-degree parent and all its children.
--baseline-only screens the old DSM before generating the urban-terrain assets.

All non-bridge/tunnel polylines are measured at intervals up to 32 m. An
interval is flagged if both endpoints are ESA WorldCover built-up, it spans at
least 16 m, its old grade is >=8% and its new grade is <=3%. Named examples
are the nearest qualifying interval within 2.5 km of each OSM place anchor.
The baseline models the national relief atlas and the two streamed sight DEMs.
It approximates the 32 m neighbour filter on the native DSM raster. Route-specific
mesh origins, mountain-pass surfaces, landmark formations and the earlier two-city
patch are outside this source comparison. Grades are modelled, not survey data.
"""
import argparse
from collections import Counter
from functools import lru_cache
import gzip
import json
from pathlib import Path

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
    def __init__(self, dist, baseline_only):
        self.dist = dist
        self.dsm = cell_index(dist, 'sight-landscapes', '.surface.webp')
        self.extra = cell_index(dist, 'sight-elevation', '.png')
        self.env = read_json(dist / 'vn-environment/index.json')
        self.cover_tiles = set(self.env['tiles'])
        self.urban = {} if baseline_only else read_json(dist / 'urban-terrain/index.json')
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
        pixel = rgb(self.dist / 'urban-terrain' / (key + '.png'))
        weight = pixel[:, :, 2].astype(np.float32) / 255
        height = (pixel[:, :, 0].astype(np.float32) * 256 + pixel[:, :, 1] - 32768) * .1
        return height * weight, weight

    def sample(self, lon, lat, include_influence=False):
        old = self.atlas(lon, lat)
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


def road_samples(rows):
    """Split each entire polyline into equal intervals of at most 32 m along its actual path."""
    counts = np.fromiter((len(row[-1]) // 2 for row in rows), int)
    points = np.fromiter((v for row in rows for v in row[-1]), np.int32).reshape(-1, 2) * .00001
    ends = np.cumsum(counts) - 1
    keep = np.ones(points.shape[0], bool)
    keep[ends] = False
    ix = np.flatnonzero(keep)
    start, delta = points[ix], points[ix + 1] - points[ix]
    edge = np.repeat(np.arange(len(rows)), counts - 1)
    lengths = np.hypot(delta[:, 0] * (METRES_EAST * np.cos(np.deg2rad(start[:, 1]))), delta[:, 1] * METRES_NORTH)
    keep = lengths > 0
    start, delta, edge, lengths = start[keep], delta[keep], edge[keep], lengths[keep]
    totals = np.bincount(edge, weights=lengths, minlength=len(rows))
    n = np.ceil(totals / 32).astype(int)
    ids = np.flatnonzero(n)
    if not ids.size:
        return None
    # Insert a 1 m gap between unrelated polylines so the shared search cannot
    # jump across different roads with coincident cumulative distances.
    along = np.cumsum(lengths)
    seg_from, seg_to = along - lengths + edge, along + edge
    first_seg = np.r_[0, np.flatnonzero(edge[1:] != edge[:-1]) + 1]
    samples = n[ids] + 1
    owner = np.repeat(ids, samples)
    index = np.arange(owner.size) - np.repeat(np.cumsum(samples) - samples, samples)
    ds = totals[ids] / n[ids]
    dist = np.repeat(seg_from[first_seg], samples) + index * np.repeat(ds, samples)
    # Floating-point roundoff at a final vertex must not select the following road.
    seg = np.minimum(np.searchsorted(seg_to, dist), np.repeat(np.r_[first_seg[1:] - 1, edge.size - 1], samples))
    xy = start[seg] + delta[seg] * np.clip((dist - seg_from[seg]) / lengths[seg], 0, 1)[:, None]
    intervals = np.flatnonzero(index < n[owner])
    return xy, intervals, owner[intervals], np.repeat(ds, n[ids])


def check_rows(rows, terrain, places, counts, examples, baseline_only):
    result = road_samples(rows)
    if result is None:
        return
    xy, ix, owner, ds = result
    old, new, built, influence = terrain.sample(xy[:, 0], xy[:, 1], include_influence=True)
    old_grade = 100 * np.abs(old[ix + 1] - old[ix]) / ds
    new_grade = 100 * np.abs(new[ix + 1] - new[ix]) / ds
    urban = built[ix] & built[ix + 1]
    steep = urban & (old_grade >= 8) & (ds >= 16)
    flagged = steep if baseline_only else steep & (new_grade <= 3)
    counts['intervals'] += ds.size
    counts['modelled_m'] += float(ds.sum())
    counts['modelled_edges'] += np.unique(owner).size
    counts['urban_intervals'] += int(urban.sum())
    counts['urban_edges'] += np.unique(owner[urban]).size
    counts['urban_intervals_at_least_16m'] += int((urban & (ds >= 16)).sum())
    counts['old_steep_intervals'] += int(steep.sum())
    counts['old_steep_urban_edges'] += np.unique(owner[steep]).size
    selections = [('examples', flagged)]
    if not baseline_only:
        new_steep = urban & (new_grade >= 8) & (ds >= 16)
        counts['new_steep_urban_edges'] += np.unique(owner[new_steep]).size
        counts['new_steep_intervals'] += int(new_steep.sum())
        counts['newly_steep_intervals'] += int((new_steep & ~steep).sum())
        counts['previously_steep_still_steep_intervals'] += int((new_steep & steep).sum())
        full = (influence[ix] >= .9999) & (influence[ix + 1] >= .9999)
        absent = (influence[ix] == 0) & (influence[ix + 1] == 0)
        for label, mask in [('bare_earth', full), ('blended', ~full & ~absent), ('original', absent)]:
            counts[f'new_steep_{label}_intervals'] += int((new_steep & mask).sum())
        altitude = (new[ix] + new[ix + 1]) * .5
        lowland_increase = new_steep & ~steep & (altitude < 50)
        counts['newly_steep_below_50m_intervals'] += int(lowland_increase.sum())
        selections.append(('new_lowland_steep_examples', lowland_increase))
        for label, mask in [('below_50m', altitude < 50), ('50_to_300m', (altitude >= 50) & (altitude < 300)), ('above_300m', altitude >= 300)]:
            counts[f'new_steep_{label}_intervals'] += int((new_steep & mask).sum())
        counts['all_land_old_steep_intervals'] += int(((old_grade >= 8) & (ds >= 16)).sum())
        counts['all_land_new_steep_intervals'] += int(((new_grade >= 8) & (ds >= 16)).sum())
    counts['flagged_edges'] += np.unique(owner[flagged]).size
    counts['flagged_intervals'] += int(flagged.sum())
    counts['flagged_m'] += float(ds[flagged].sum())
    named = np.fromiter((bool(row[3]) for row in rows), bool)
    for category, selected in selections:
        matches = np.flatnonzero(selected & named[owner])
        if not matches.size:
            continue
        mid = (xy[ix[matches]] + xy[ix[matches] + 1]) * .5
        low, high = mid.min(axis=0) - .026, mid.max(axis=0) + .026
        for name, lon, lat in places:
            if not (low[0] <= lon <= high[0] and low[1] <= lat <= high[1]):
                continue
            radius = np.hypot((mid[:, 0] - lon) * METRES_EAST * np.cos(np.deg2rad(lat)), (mid[:, 1] - lat) * METRES_NORTH)
            best = int(np.argmin(radius))
            key = f'{name} ({lon},{lat})'
            distance = float(radius[best])
            if distance > 2500 or distance >= examples[category].get(key, {}).get('distance_m', np.inf):
                continue
            k = matches[best]
            row = rows[owner[k]]
            examples[category][key] = dict(street=row[3], edge=row[0], distance_m=round(distance, 2),
                                 lon=round(float(mid[best, 0]), 6), lat=round(float(mid[best, 1]), 6),
                                 length_m=round(float(ds[k]), 2),
                                 elevation_m=round(float((new[ix[k]] + new[ix[k]+1]) * .5), 2),
                                 bare_earth_weight=round(float((influence[ix[k]] + influence[ix[k]+1]) * .5), 4),
                                 old_percent=round(float(old_grade[k]), 2),
                                 new_percent=None if baseline_only else round(float(new_grade[k]), 2))


def audit(args):
    dist = args.dist
    terrain = Terrain(dist, args.baseline_only)
    roads = read_json(dist / 'vn-roads/index.json')
    access = roads['sightAccess']
    tiles = set(roads['tiles']).difference(roads['splits']) | set(roads['subtiles']) | set(access['only'])
    access_tiles, only = set(access['tiles']), set(access['only'])
    traffic_index = read_json(dist / 'vn-traffic/index.json')
    bridge_index = read_json(dist / 'vn-bridges/details.json')
    tunnel_index = read_json(dist / 'vn-traffic/tunnels.json')
    if any(index['graphSourceSha256'] != roads['sourceSha256'] for index in (traffic_index, bridge_index, tunnel_index)):
        raise ValueError('Bridge, tunnel or traffic metadata belongs to another road graph')
    traffic = set(traffic_index['tiles'])
    bridge_tags = bridge_index['edges']
    tunnels = set(tunnel_index['passages'])
    places = read_json(dist / 'vn-roads/overview.json')['places']
    seen, counts = set(), Counter()
    examples = {'examples': {}, 'new_lowland_steep_examples': {}}
    for key in sorted(tiles, key=lambda s: tuple(map(int, s.split('_')))):
        if args.tile and '_'.join(key.split('_')[:2]) not in args.tile:
            continue
        counts['tiles'] += 1
        meta = read_gzip(dist / 'vn-traffic' / (key + '.gz')) if key in traffic else {}
        group = []
        for folder, present in [('vn-roads', key not in only), ('vn-access', key in access_tiles)]:
            if not present:
                continue
            for row in read_gzip(dist / folder / (key + '.gz')):
                counts['rows'] += 1
                eid = row[0]
                if eid in seen:
                    continue
                seen.add(eid)
                counts[folder] += 1
                tag = meta.get(str(eid), {})
                if tag.get('bridge') or tag.get('tunnel') or str(eid) in bridge_tags or eid in tunnels:
                    counts['bridge_tunnel_edges'] += 1
                else:
                    group.append(row)
        if group:
            check_rows(group, terrain, places, counts, examples, args.baseline_only)
        if counts['tiles'] % 100 == 0:
            print(f"{counts['tiles']} tiles, {len(seen):,} unique edges", flush=True)
    if not args.tile and counts['vn-roads'] != roads['edges']:
        raise ValueError(f"Graph manifest has {roads['edges']} edges, scanned {counts['vn-roads']}")
    counts['duplicate_rows'] = counts['rows'] - len(seen)
    counts['zero_length_edges'] = len(seen) - counts['bridge_tunnel_edges'] - counts['modelled_edges']
    return dict(graph_sha256=roads['sourceSha256'], scope=args.tile or 'all',
                baseline_only=args.baseline_only, counts=dict(counts),
                **{group: dict(sorted(rows.items())) for group, rows in examples.items()})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=Path(__file__).resolve().parents[1] / 'dist')
    parser.add_argument('--tile', action='append', help='limit to a quarter-degree parent e.g. 432_64')
    parser.add_argument('--baseline-only', action='store_true')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    report = audit(args)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report['counts'], indent=2))
