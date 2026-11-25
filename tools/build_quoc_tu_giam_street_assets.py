"""Extract the architectural panels and crossing pictogram from the archived survey."""
from io import BytesIO
from pathlib import Path
from subprocess import check_output

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'dist' / 'streetscape'
SURVEY_REVISION = '9daf3670fca7a8365cda7ad18e14330d316ec4dd'


def survey_atlas(name):
    source = f'{SURVEY_REVISION}:dist/streetscape/quoc-tu-giam-{name}.webp'
    return Image.open(BytesIO(check_output(['git', 'show', source], cwd=ROOT))).convert('RGB')


def main():
    signs = survey_atlas('signs')
    assert signs.size == (1024, 160)
    signs.crop((770, 0, 1024, 160)).save(OUTPUT / 'quoc-tu-giam-crossing.webp', lossless=True, method=6)

    survey = survey_atlas('balconies')
    assert survey.size == (1280, 384)
    # Two architectural views include the top of an advertisement. Keep only
    # their windows and railing. Extend the last safe row for texture filtering.
    for index, rows in [(1, 320), (3, 268)]:
        left = index * 256
        last_row = survey.crop((left, rows - 1, left + 256, rows))
        survey.paste(last_row.resize((256, 384 - rows), Image.Resampling.NEAREST), (left, rows))
    survey.save(OUTPUT / 'quoc-tu-giam-windows.webp', quality=89, method=6)


if __name__ == '__main__':
    main()
