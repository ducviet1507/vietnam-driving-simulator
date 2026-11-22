"""Losslessly repack mapped water or building tiles after a build (pip install zopfli)."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import gzip
import json
from pathlib import Path
from tempfile import NamedTemporaryFile

from zopfli.gzip import compress


def replace_bytes(path, data):
    with NamedTemporaryFile(dir=path.parent, prefix=path.name + '.', delete=False) as temporary:
        staging = Path(temporary.name)
    try:
        staging.write_bytes(data)
        staging.replace(path)
    finally:
        staging.unlink(missing_ok=True)


def repack(path):
    encoded = path.read_bytes()
    if len(encoded) < 1024:
        return 0
    source = gzip.decompress(encoded)
    packed = compress(source, numiterations=5)
    saving = len(encoded) - len(packed)
    if saving < 256:
        return 0
    if gzip.decompress(packed) != source:
        raise ValueError(f'Geometry changed in {path.name}')
    replace_bytes(path, packed)
    return saving


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--layer', choices=('water', 'buildings'), default='water')
    layer = parser.parse_args().layer
    folder = Path(__file__).resolve().parents[1] / 'dist' / ('vn-water' if layer == 'water' else 'vn-osm-buildings')
    manifest = folder / 'index.json'
    index = json.loads(manifest.read_bytes())
    keys = index['tiles'] if layer == 'water' else (row[0] for row in index['tiles'])
    paths = [folder / (key + '.gz') for key in keys]
    with ThreadPoolExecutor(max_workers=4) as pool:
        savings = list(pool.map(repack, paths))
    size = sum(path.stat().st_size for path in paths)
    if index['bytes'] != size:
        index['bytes'] = size
        replace_bytes(manifest, json.dumps(index, ensure_ascii=False, separators=(',', ':')).encode())
    print(f'{sum(n > 0 for n in savings)} of {len(paths)} {layer} tiles reduced by {sum(savings):,} bytes')
