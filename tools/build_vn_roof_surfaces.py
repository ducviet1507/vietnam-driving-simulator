"""Pack Poly Haven roof scans. Run from any directory with Python and Pillow.

The original 1K PNGs are verified against fixed checksums before conversion.
Pass --source DIRECTORY to read those files offline (ASSET_LAYER.png).
"""
from argparse import ArgumentParser
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image


OUTPUT = Path(__file__).resolve().parents[1] / 'dist/streetscape/surfaces'
CELL, GUTTER = 1024, 32
CORE = CELL - 2 * GUTTER
SOURCES = {
    'corrugated_iron_02': {
        'Diffuse': ('diff', '77ae71a1192bd5f45cf6880f43af6a7405a70fc9ef85f1ca12b6847f5fc2a3ed'),
        'nor_gl': ('nor_gl', '1a26c763d78297fe738d9ba350c03c252a6f6fb4a3c497d97f057028e61a8a11'),
        'Rough': ('rough', 'e9a557fe282b875d73a287bdcd4bae420fab54a269d8bb633974f14454d7392b'),
    },
    'clay_roof_tiles_02': {
        'Diffuse': ('diff', 'cb3d276d93a904e1163ed1613f58023b586c420e9770f908b45cfee7022110e4'),
        'nor_gl': ('nor_gl', 'c7b859bf83efb4d431536337e737435e324d95a3c8cdf06f04e384c21e941809'),
        'Rough': ('rough', 'f1aa2cd527bf0afd67a60461fc7aa6a02ae637d3d9a72e10eed6feb8843a67e9'),
    },
}


def load(asset, layer, source):
    suffix, checksum = SOURCES[asset][layer]
    if source:
        data = (source / f'{asset}_{layer}.png').read_bytes()
    else:
        url = f'https://dl.polyhaven.org/file/ph-assets/Textures/png/1k/{asset}/{asset}_{suffix}_1k.png'
        with urlopen(Request(url, headers={'User-Agent': 'ViVu3D-roof-materials/1.0'}), timeout=90) as response:
            data = response.read()
    if sha256(data).hexdigest() != checksum:
        raise ValueError(f'Unexpected source bytes for {asset}/{layer}')
    return Image.open(BytesIO(data))


def cell(image):
    core = image.resize((CORE, CORE), Image.Resampling.LANCZOS)
    # Repeat the opposite edges, including all four corners. Bilinear and
    # anisotropic sampling can cross a UV repeat without touching the next scan.
    padded = Image.new('RGB', (CELL, CELL))
    for y in (GUTTER-CORE, GUTTER, GUTTER+CORE):
        for x in (GUTTER-CORE, GUTTER, GUTTER+CORE):
            padded.paste(core, (x, y))
    return padded


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path)
    args = parser.parse_args()
    color = Image.new('RGB', (2*CELL, CELL))
    surface = Image.new('RGB', color.size)
    for index, asset in enumerate(SOURCES):
        diffuse = load(asset, 'Diffuse', args.source).convert('RGB')
        normal = load(asset, 'nor_gl', args.source).convert('RGB')
        rough = load(asset, 'Rough', args.source)
        if rough.mode != 'I;16':
            raise ValueError(f'Expected 16-bit roughness for {asset}')
        rough = rough.convert('I').point(lambda value: value / 257).convert('L')
        normal_x, normal_y, _ = normal.split()
        color.paste(cell(diffuse), (index*CELL, 0))
        surface.paste(cell(Image.merge('RGB', (normal_x, normal_y, rough))), (index*CELL, 0))
    color.save(OUTPUT / 'vn-roof-color.webp', quality=86, method=6)
    surface.save(OUTPUT / 'vn-roof-surface.webp', quality=95, method=6)


if __name__ == '__main__':
    main()
