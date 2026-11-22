"""Encode the original 10 m landmark water masks as pixel-exact WebP pages."""
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path

from PIL import Image


def pack_water_mask(source):
    target = source.with_suffix('.webp')
    with Image.open(source) as image:
        original = image.convert('RGBA')
    encoded = BytesIO()
    original.save(encoded, format='WEBP', lossless=True, exact=True, method=6)
    encoded.seek(0)
    with Image.open(encoded) as check:
        if check.size != original.size or check.convert('RGBA').tobytes() != original.tobytes():
            raise ValueError(f'Water pixels changed in {source.name}')
    tmp = target.with_suffix('.webp.tmp')
    try:
        tmp.write_bytes(encoded.getvalue())
        tmp.replace(target)
    finally:
        tmp.unlink(missing_ok=True)
    return source.stat().st_size, target.stat().st_size


if __name__ == '__main__':
    folder = Path(__file__).resolve().parents[1] / 'dist' / 'sight-landscapes'
    pages = sorted(folder.glob('*-water.png'))
    if not pages:
        raise SystemExit('No landmark water pages found')
    with ThreadPoolExecutor(max_workers=4) as pool:
        original, packed = map(sum, zip(*pool.map(pack_water_mask, pages)))
    print(f'{len(pages)} pixel-exact water masks: {original:,} to {packed:,} bytes')
