"""Inventory named pass roads and compare all shipped mountain stages to their OSM source.

python tools/audit_pass_roads.py --output passes.json  (numpy, Pillow and Node)
Cases with "đèo" in a different part of their name include tunnels, bridges,
approaches and routes merely named after a pass. The packed graph has no
mountain_pass/saddle tags. An unnamed mountain road cannot be identified by text.
"""
import argparse
from collections import Counter, defaultdict
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import re
import subprocess

import numpy as np

from audit_urban_roads import road_samples, terrain_metadata
from terrain_sources import METRES_EAST, METRES_NORTH, Terrain, bilinear, read_gzip, read_json
from build_mountain_stages import longest_chain, distances
from build_pass_plates import stage_grid


DIST = Path(__file__).resolve().parents[1] / 'dist'
PASS_WORD = re.compile(r'\bđèo\b', re.IGNORECASE)


def classify(row):
    name = row[3].split(' · ')[0]
    if name.casefold().startswith('đèo '):
        return 'prefix', name
    if PASS_WORD.search(name):
        return 'other', name
    # Same separately identified QL.4C overlook as the bundled stage builder.
    if row[3].endswith(' · QL.4C') and row[4] == 'trunk' and not row[5]:
        if all(10539000 <= x <= 10541700 and 2323000 <= y <= 2325100
               for x, y in (row[-1][:2], row[-1][-2:])):
            return 'QL4C', 'Đèo Mã Pí Lèng'
    return None, None


def formations():
    folder = DIST / 'pass-road-grades'
    if not (folder / 'index.json').is_file():
        return {}, None
    index = read_json(folder / 'index.json')
    table, digest = {}, hashlib.sha256()
    paths = sorted(['index.json', *(k + '.json.gz' for k in index['tiles'])])
    for name in paths:
        file = folder / name
        digest.update(name.encode() + b'\0' + hashlib.sha256(file.read_bytes()).digest())
        if name == 'index.json':
            continue
        for key, samples in read_gzip(file).items():
            key = int(key)
            if len(samples) < 2 or not all(isinstance(h, int) for h in samples):
                raise ValueError(f'Invalid formation on edge {key}')
            if key in table and table[key] != samples:
                raise ValueError(f'Inconsistent formation on edge {key}')
            table[key] = samples
    return table, dict(files=len(paths), edges=len(table), sha256=digest.hexdigest())


def scan(profiles):
    roads = read_json(DIST / 'vn-roads/index.json')
    traffic = set(read_json(DIST / 'vn-traffic/index.json')['tiles'])
    seen, groups, counts, names = set(), defaultdict(dict), Counter(), defaultdict(Counter)
    metres, surface_rows, profile_edges, node_heights = Counter(), [], set(), {}
    profile_grades, profile_metres = [], 0.
    for folder in ('vn-roads', 'vn-access'):
        for path in sorted((DIST / folder).glob('*.gz')):
            selected = []
            for row in read_gzip(path):
                category, name = classify(row)
                if (not category and row[0] not in profiles) or row[0] in seen:
                    continue
                seen.add(row[0])
                selected.append((row, 'access' if folder == 'vn-access' and category else category, name))
            if not selected:
                continue
            metadata = read_gzip(DIST / 'vn-traffic' / path.name) if path.stem in traffic else {}
            for row, category, name in selected:
                opts = metadata.get(str(row[0]), {})
                kind = 'bridge' if opts.get('bridge') else 'tunnel' if opts.get('tunnel') else 'surface'
                coords = list(zip(row[-1][::2], row[-1][1::2]))
                length = distances(coords)[-1]
                if row[0] in profiles:
                    profile_edges.add(row[0])
                    counts['profile_' + kind] += 1
                    h = profiles[row[0]]
                    if length <= 0:
                        raise ValueError(f'Zero-length formation edge {row[0]}')
                    profile_grades.append(np.abs(np.diff(h)) * (.1 * 100 * (len(h)-1) / length))
                    profile_metres += length
                    for node, elevation in ((row[1], h[0]), (row[2], h[-1])):
                        if node in node_heights and node_heights[node] != elevation:
                            raise ValueError(f'Profile endpoints disagree at OSM node {node}')
                        node_heights[node] = elevation
                if not category:
                    continue
                counts[category + '_' + kind] += 1
                names[category][name] += 1
                metres[category] += length
                if kind == 'surface' and category in ('prefix', 'QL4C'):
                    surface_rows.append((name, row))
                if category in ('prefix', 'QL4C') and not row[5] and row[4] not in ('service', 'track'):
                    groups[name][row[0]] = coords
    if set(profiles) != profile_edges:
        raise ValueError(f'{len(set(profiles) - profile_edges)} profile edges are missing from the road graph')
    slopes = np.concatenate(profile_grades) if profile_grades else None
    return groups, surface_rows, dict(graph_sha256=roads['sourceSha256'],
                        unique_labelled_edges=sum(sum(g.values()) for g in names.values()),
                        profile_endpoint_nodes=len(node_heights), counts=counts,
                        profile_metres=round(profile_metres, 2),
                        profile_intervals=int(slopes.size) if slopes is not None else 0,
                        profile_peak_percent=round(float(slopes.max()), 3) if slopes is not None else None,
                        profile_p95_percent=round(float(np.percentile(slopes, 95)), 3) if slopes is not None else None,
                        metres=metres, names=names)


def read_stages():
    # Use the actual grade filter used for the road exam and arcade courses.
    script = """
const fs=require('node:fs'),vm=require('node:vm'),w={}; w.window=w;
for(const path of ['mountain-stages.js','scenic-passes.js'])
    vm.runInNewContext(fs.readFileSync(path, 'utf8'),w);
console.log(JSON.stringify(w.mountainStages.map(s=>({...s,course:w.smoothRoadProfile(s)}))));
"""
    return json.loads(subprocess.check_output(['node', '-e', script], cwd=DIST))


def source_stations(stage, edges):
    chain = longest_chain(edges)
    s = np.asarray(distances(chain))
    count = len(stage['angles'])
    station = (s[-1] - count * stage['step']) * .5 + np.arange(count + 1) * stage['step']
    coords = np.asarray(chain, dtype=float) / 1e5
    points = np.column_stack([np.interp(station, s, axis) for axis in coords.T])
    seg = np.minimum(len(s)-2, np.searchsorted(s, station, side='right')-1)
    lookup = {}
    for edge, line in sorted(edges.items()):
        lengths = np.asarray(distances(line))
        for i, (a, b) in enumerate(zip(line, line[1:])):
            if lengths[-1] == 0:
                continue
            lo, hi = lengths[i] / lengths[-1], lengths[i+1] / lengths[-1]
            lookup.setdefault((a, b), (edge, lo, hi))
            lookup.setdefault((b, a), (edge, hi, lo))
    references = []
    for i, at in zip(seg, station):
        edge, lo, hi = lookup[chain[i], chain[i+1]]
        f = (at-s[i])/(s[i+1]-s[i]) if s[i+1]>s[i] else 0
        references.append((edge, lo+(hi-lo)*f))
    return points, coords, references


@lru_cache(maxsize=12)
def raster(name):
    return np.asarray(stage_grid(name))


def stage_height(stage, metric):
    theta = np.deg2rad(stage['bearing'])
    east, north = metric.T
    xx = east * np.cos(theta) - north * np.sin(theta)
    zz = -east * np.sin(theta) - north * np.cos(theta)
    def grid_coord(m):
        d = np.abs(m)
        cell = np.where(d <= 3600, d / 50, np.where(d <= 6200, 72 + (d-3600) / 200, 85 + (np.minimum(d, 15200)-6200) / 450))
        return 105 + np.sign(m) * cell
    regional = bilinear(raster(stage['id']), grid_coord(xx), grid_coord(zz))
    t = np.clip((np.maximum(abs(xx), abs(zz)) - 11200) / 4000, 0, 1)
    return regional, 1 - t*t*(3-2*t)


def stage_report(stage, edges, terrain, profiles):
    points, chain, refs = source_stations(stage, edges)
    start = np.array(stage['start'])
    scale = np.array([METRES_EAST * np.cos(np.deg2rad(start[1])), METRES_NORTH])
    metric = (points - start) * scale
    angle = np.deg2rad(np.array(stage['angles']) + stage['bearing'])
    vectors = np.column_stack([np.sin(angle), np.cos(angle)]) * stage['step']
    predicted = np.vstack([np.zeros(2), np.cumsum(vectors, axis=0)])
    delta = np.linalg.norm(predicted - metric, axis=1)
    encoded = None
    if stage.get('trace'):
        trace = np.asarray(stage['trace']) / 1e6 * scale
        encoded = float(np.linalg.norm(trace - metric, axis=1).max())
    # Errors at equal station are complemented by lateral distance to any point
    # on the original OSM polyline, especially around hairpins and switchbacks.
    xy = (chain - start) * scale
    along = np.diff(xy, axis=0)
    squared = np.einsum('ij,ij->i', along, along)
    gap = []
    for p in predicted:
        v = p - xy[:-1]
        f = np.clip(np.einsum('ij,ij->i', v, along) / np.maximum(squared, 1e-12), 0, 1)
        gap.append(float(np.min(np.linalg.norm(v - along * f[:, None], axis=1))))
    # A stage is always inside its 11.2 km full-weight core. Compare the actual
    # stage's Terrarium regional raster plus streamed sight DSM with the course.
    regional, _ = stage_height(stage, metric)
    _, surface, _ = terrain.sample(*points.T, regional=regional)
    ground = np.abs(np.diff(surface)) * 100 / stage['step']
    course = np.abs(np.diff(stage['course'])) * 100 / stage['step']
    formed = []
    for i, (edge, fraction) in enumerate(refs):
        heights = profiles.get(edge)
        formed.append(np.interp(fraction, np.linspace(0, 1, len(heights)), heights)*.1 if heights else surface[i])
    grade = abs(np.diff(formed)) * 100 / stage['step']
    return dict(stations=len(points), profiled_stations=sum(e in profiles for e, _ in refs),
                length_m=(len(points)-1)*stage['step'],
                angles_station_error_max_m=round(float(delta.max()), 3),
                angles_lateral_error_max_m=round(max(gap), 3),
                trace_station_error_max_m=None if encoded is None else round(encoded, 3),
                terrain_source_peak_percent=round(float(ground.max()), 3),
                terrain_source_p95_percent=round(float(np.percentile(ground, 95)), 3),
                formation_peak_percent=round(float(grade.max()), 3) if profiles else None,
                formation_p95_percent=round(float(np.percentile(grade, 95)), 3) if profiles else None,
                arcade_course_peak_percent=round(float(course.max()), 3))


def named_pass_surface(rows, stages, terrain, profiles):
    # Model the closest active regional pass grid just as free driving streams it.
    # Include both landmark grids, which can win the same nearest-centre lookup.
    text = (DIST / 'landmark-terrain.js').read_text(encoding='utf8')
    grids = stages + json.loads(text[text.index('=') + 1:text.rindex(';')])
    by_tile, results = defaultdict(list), defaultdict(list)
    for name, row in rows:
        by_tile[(row[-1][0] // 25000, row[-1][1] // 25000)].append((name, row))
    for key in sorted(by_tile):
        tagged = by_tile[key]
        xy, ix, owner, ds = road_samples([r for _, r in tagged])
        closest = np.full(len(xy), -1, dtype=int)
        best = np.full(len(xy), 12000.)
        for i, stage in enumerate(grids):
            delta = xy - stage['start']
            distance = np.hypot(delta[:, 0] * METRES_EAST * np.cos(np.deg2rad(stage['start'][1])), delta[:, 1] * METRES_NORTH)
            take = distance < best
            closest[take], best[take] = i, distance[take]
        regional = terrain.atlas(*xy.T)
        for i in np.unique(closest[closest >= 0]):
            stage = grids[i]
            take = closest == i
            scale = np.array([METRES_EAST * np.cos(np.deg2rad(stage['start'][1])), METRES_NORTH])
            heights, weight = stage_height(stage, (xy[take] - stage['start']) * scale)
            regional[take] += (heights - regional[take]) * weight
        _, ground, _ = terrain.sample(*xy.T, regional=regional)
        grade = abs(ground[ix + 1] - ground[ix]) * 100 / ds
        for owner_id, (name, row) in enumerate(tagged):
            take = owner == owner_id
            if take.any():
                length = float(ds[take].sum())
                samples = profiles.get(row[0])
                # The shipped runtime interpolates these nodes at equal stations.
                formed = (np.abs(np.diff(samples))*.1*100*(len(samples)-1)/length) if samples else None
                results[name].append(dict(edge=row[0], metres=round(length, 2),
                    intervals=int(take.sum()), terrain_source_peak_percent=round(float(grade[take].max()), 3),
                    terrain_source_p95_percent=round(float(np.percentile(grade[take], 95)), 3),
                    formation_peak_percent=round(float(formed.max()), 3) if formed is not None else None))
    return dict(sorted(results.items()))


def audit():
    profiles, metadata = formations()
    urban = terrain_metadata(DIST)
    groups, surface_rows, report = scan(profiles)
    report['pass_formations'] = metadata
    report['urban_terrain'] = urban
    terrain = Terrain(DIST, False)
    stages = read_stages()
    report['measurements'] = {
        'station': '20 m along the OSM centreline selected by the stage builder.',
        'terrain_source': 'The stage regional raster and the streamed sight DEMs, with the shipped urban overlay. Samples use the named stage in its own frame. No per-road formation, bridge lift, tunnel depth or route-origin triangle interpolation is included.',
        'arcade_course': 'The actual smoothRoadProfile function evaluated on the bundled relative longitudinal profile. This is a game course, not a surveyed road grade.'
    }
    report['stages'] = {s['id']: stage_report(s, groups[s['name']], terrain, profiles) for s in stages}
    report['named_surface_edges'] = named_pass_surface(surface_rows, stages, terrain, profiles)
    if metadata != formations()[1]:
        raise ValueError('Pass profiles changed during audit')
    if urban != terrain_metadata(DIST):
        raise ValueError('Urban terrain changed during audit')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.write_text(json.dumps(audit(), ensure_ascii=False, indent=2), encoding='utf-8')
