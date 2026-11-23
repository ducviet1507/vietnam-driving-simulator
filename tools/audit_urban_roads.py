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
import hashlib
import json
from pathlib import Path

import numpy as np

from terrain_sources import METRES_EAST, METRES_NORTH, Terrain, read_gzip, read_json


def terrain_metadata(dist, urban_dir=None):
    folder = urban_dir or dist / 'urban-terrain'
    manifest = read_json(folder / 'index.json')
    names = sorted(['index.json', *(key + '.png' for key in manifest['tiles'])])
    digest = hashlib.sha256()
    for name in names:
        digest.update(name.encode('utf-8') + b'\0')
        digest.update(hashlib.sha256((folder / name).read_bytes()).digest())
    return dict(sha256=digest.hexdigest(), files=len(names), tiles=len(manifest['tiles']),
                digest_method='Sorted relative file name in UTF-8, NUL, binary SHA-256 of file contents; repeat for index.json and every listed PNG.')


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
    urban_dir = getattr(args, 'urban_dir', None)
    terrain_source = None if args.baseline_only else terrain_metadata(dist, urban_dir)
    terrain = Terrain(dist, args.baseline_only, urban_dir)
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
    if terrain_source is not None and terrain_source != terrain_metadata(dist, urban_dir):
        raise ValueError('Urban terrain changed during the audit')
    counts['duplicate_rows'] = counts['rows'] - len(seen)
    counts['zero_length_edges'] = len(seen) - counts['bridge_tunnel_edges'] - counts['modelled_edges']
    return dict(graph_sha256=roads['sourceSha256'], urban_terrain=terrain_source, scope=args.tile or 'all',
                baseline_only=args.baseline_only, counts=dict(counts),
                **{group: dict(sorted(rows.items())) for group, rows in examples.items()})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=Path(__file__).resolve().parents[1] / 'dist')
    parser.add_argument('--tile', action='append', help='limit to a quarter-degree parent e.g. 432_64')
    parser.add_argument('--baseline-only', action='store_true')
    parser.add_argument('--urban-dir', type=Path, help='compare a staged urban-terrain directory')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    report = audit(args)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report['counts'], indent=2))
