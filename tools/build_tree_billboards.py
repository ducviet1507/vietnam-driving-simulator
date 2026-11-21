"""Bake distant tree silhouettes from the existing canopy atlas and scanned trunks."""
import base64
import json
import struct
from pathlib import Path

from PIL import Image, ImageDraw


def bake_billboards(atlas, scans, destination):
    tile = 128
    inset = 2
    size = tile - 2 * inset
    source_tile = atlas.width // 8
    output = Image.new("RGBA", (4 * tile, 4 * tile))
    for slot, scan in enumerate(scans):
        vertices, faces = scan["wood"][1]
        points = list(struct.iter_unpack("<hhh", base64.b64decode(vertices)))
        triangles = list(struct.iter_unpack("<HHH", base64.b64decode(faces)))
        for view, (depth, right, up) in enumerate(((2, 0, 1), (0, 2, 1), (1, 0, 2))):
            canopy = Image.new("RGBA", (size, size))
            # Composite bark and leaves in their five original depth slices.
            for layer in range(5):
                bark = ImageDraw.Draw(canopy)
                for tri in triangles:
                    coords = [points[i] for i in tri]
                    z = sum(p[depth] for p in coords) / 48000
                    if max(0, min(4, int(z * 5))) == layer:
                        bark.polygon([(p[right] * size / 16000, (1 - p[up] / 16000) * size)
                                      for p in coords], fill=(105, 91, 71, 255))
                cell = slot * 15 + view * 5 + layer
                x, y = cell % 8 * source_tile, cell // 8 * source_tile
                leaves = atlas.crop((x + 2, y + 2, x + source_tile - 2, y + source_tile - 2))
                canopy.alpha_composite(leaves.resize((size, size), Image.Resampling.LANCZOS))
            output.paste(canopy, (slot * tile + inset, view * tile + inset))
    output.save(destination, quality=80, alpha_quality=85, method=6)


if __name__ == "__main__":
    dist = Path(__file__).resolve().parents[1] / "dist"
    scans = json.loads((dist / "tree-scan-data.js").read_text().split("window.treeScanData=")[1].strip().rstrip(";"))
    with Image.open(dist / "streetscape/tree-canopies.webp") as atlas:
        bake_billboards(atlas, scans, dist / "streetscape/tree-billboards.webp")
