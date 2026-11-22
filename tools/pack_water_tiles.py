"""Losslessly repack the mapped river and lake tiles after a water build (pip install zopfli)."""
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
        raise ValueError(f'Water geometry changed in {path.name}')
    replace_bytes(path, packed)
    return saving


if __name__ == '__main__':
    folder = Path(__file__).resolve().parents[1] / 'dist' / 'vn-water'
    manifest = folder / 'index.json'
    index = json.loads(manifest.read_bytes())
    paths = [folder / (key + '.gz') for key in index['tiles']]
    with ThreadPoolExecutor(max_workers=4) as pool:
        savings = list(pool.map(repack, paths))
    size = sum(path.stat().st_size for path in paths)
    if index['bytes'] != size:
        index['bytes'] = size
        replace_bytes(manifest, json.dumps(index, ensure_ascii=False, separators=(',', ':')).encode())
    print(f'{sum(n > 0 for n in savings)} of {len(paths)} water tiles reduced by {sum(savings):,} bytes')
