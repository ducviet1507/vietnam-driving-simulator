"""Screen every bundled building ring against the shipped terrain source rasters.

Run with Python, numpy and Pillow. Use --baseline-only without the national urban
terrain assets. Output counts are rows in each layer, including overlapping
editions of OSM. Relief across a footprint measures the required foundation
depth on sloping ground. It is not itself a rendering error.
"""
import argparse
from collections import Counter
import gzip
import json
from pathlib import Path

import numpy as np

from terrain_sources import Terrain, read_gzip, read_json


def tiles(dist):
    for layer in ('vn-osm-buildings', 'tour-buildings', 'sight-building-parts'):
        index = read_json(dist / layer / 'index.json')
        yield layer, [t if isinstance(t, str) else t[0] for t in index['tiles']]
    yield 'vn-structures/footprints', read_json(dist / 'vn-structures/offline.json')['footprints']


def perimeters(rows):
    """Decode the runtime's delta coordinates and sample each cyclic edge, holes included."""
    rings = [ring for row in rows for ring in row[4]]
    sizes = np.array([len(ring) for ring in rings], dtype=int)
    if np.any(sizes % 2) or np.any(sizes < 6) or any(not row[4] for row in rows):
        raise ValueError('Invalid packed footprint')
    lengths = sizes // 2
    points = np.fromiter((v for ring in rings for v in ring), dtype=np.int64).reshape(-1, 2)
    points = np.cumsum(points, axis=0)
    starts = np.r_[0, np.cumsum(lengths)[:-1]]
    total_before = np.vstack(([0, 0], points[starts[1:] - 1]))
    points = (points - np.repeat(total_before, lengths, axis=0)) * .00001
    if not np.all(np.isfinite(points)) or np.any(points[:, 0] < 100) or np.any(points[:, 0] > 119) or np.any(points[:, 1] < 6) or np.any(points[:, 1] > 25):
        raise ValueError('Invalid decoded coordinates')
    next_point = np.roll(points, -1, axis=0)
    next_point[starts + lengths - 1] = points[starts]
    delta = next_point - points
    metres = np.hypot(delta[:, 0] * 111320 * np.cos(np.deg2rad(points[:, 1])), delta[:, 1] * 110900)
    steps = np.maximum(1, np.ceil(metres / 16).astype(int))
    source = np.repeat(np.arange(len(points)), steps)
    along = (np.arange(len(source)) - np.repeat(np.cumsum(steps) - steps, steps)) / steps[source]
    probes = points[source] + delta[source] * along[:, None]
    ring_counts = np.array([len(row[4]) for row in rows], dtype=int)
    first_rings = np.r_[0, np.cumsum(ring_counts)[:-1]]
    first_probe = (np.cumsum(steps) - steps)[starts[first_rings]]
    return probes, first_probe, len(rings), len(points)


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument('--baseline-only', action='store_true')
    args.add_argument('--output', type=Path)
    options = args.parse_args()
    dist = Path(__file__).resolve().parents[1] / 'dist'
    terrain = Terrain(dist, options.baseline_only)
    report = {}
    for layer, keys in tiles(dist):
        root = dist / layer
        assert {p.stem for p in root.glob('*.gz')} == set(keys), layer
        counts = Counter(tiles=len(keys))
        highest = []
        for key in keys:
            rows = read_gzip(root / (key + '.gz'))
            if not rows:
                counts['empty_tiles'] += 1
                continue
            probes, starts, rings, vertices = perimeters(rows)
            _, height, _ = terrain.sample(probes[:, 0], probes[:, 1])
            assert np.all(np.isfinite(height)), (layer, key)
            relief = np.maximum.reduceat(height, starts) - np.minimum.reduceat(height, starts)
            counts.update(rows=len(rows), rings=rings, vertices=vertices, perimeter_samples=len(probes))
            for threshold in (1, 3, 5):
                counts[f'relief_over_{threshold}m'] += int((relief > threshold).sum())
            for row in rows:
                detail = row[6] if len(row) > 6 else {}
                counts['raised_parts'] += bool(detail.get('min_height') or detail.get('building:min_level'))
                counts['canopies'] += row[1] == 'roof' or detail.get('building') == 'roof'
            i = int(relief.argmax())
            highest.append((round(float(relief[i]), 2), rows[i][0], key, probes[starts[i]].round(5).tolist()))
        report[layer] = dict(counts, largest_per_tile=sorted(highest, reverse=True)[:8])
        print(layer, counts, flush=True)
    keys = read_json(dist / 'vn-structures/offline.json')['heights']
    height_dir = dist / 'vn-structures/heights'
    assert {p.stem for p in height_dir.glob('*.gz')} == set(keys)
    for key in keys:
        assert len(gzip.decompress((height_dir / (key + '.gz')).read_bytes())) == 512 * 512
    report['building_height_rasters'] = len(keys)
    if options.output:
        options.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')


if __name__ == '__main__':
    main()
