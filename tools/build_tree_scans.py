"""Bake Poly Haven trees into depth-resolved foliage and solid, simplified trunks.

Run with numpy, scipy, Pillow, numba and fast-simplification installed. A cache
directory is optional. The original multi-million-triangle meshes are build inputs.
"""
import argparse
import base64
import json
import math
import subprocess
import tempfile
from pathlib import Path

import fast_simplification
import numpy as np
from numba import njit
from PIL import Image
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

DIST = Path(__file__).resolve().parents[1] / "dist"
TILE, GRID, LAYERS = 320, 8, 5
# Each source specifies its solid trunk material, followed by diffuse/mask
# pairs in glTF primitive order. All non-trunk wood is baked with the foliage.
SOURCES = [
    ("island_tree_01", 0, [("Diffuse", None), ("leaves_diff", "leaves_alpha"), ("branches_diff", None)]),
    ("jacaranda_tree", 1, [("branches_diff", None), ("trunk_diff", None), ("leaves_diff", "leaves_alpha")]),
    ("tree_small_02", 2, [("branch_diff", None), ("leaves_diff", "leaves_alpha"), ("Diffuse", None)]),
    ("pine_sapling_medium", 0, [("bark_diff", None), ("twig_diff", "twig_alpha"), ("bark_diff", None)]),
]
AXES = [(2, 0, 1), (0, 2, 1), (1, 0, 2)]  # depth, horizontal, vertical


def download(url, path):
    if not path.exists():
        subprocess.run(["curl", "-fsSL", "--retry", "2", url, "-o", str(path)], check=True)
    return path


def b64(array, dtype):
    return base64.b64encode(np.ascontiguousarray(array, dtype=dtype)).decode("ascii")


def maps(cache, name):
    path = download("https://api.polyhaven.com/files/" + name, cache / (name + ".json"))
    return json.loads(path.read_text())


def texture(cache, name, files, key, alpha=False):
    fmt = "png" if alpha else "jpg"
    path = download(files[key]["1k"][fmt]["url"], cache / f"{name}-{key}.{fmt}")
    return Image.open(path).convert("L" if alpha else "RGB")


def trunk_lods(pos, tri):
    # Scan exports may put hundreds of disconnected small boughs in the bark
    # primitive. Reduce the rooted component independently, so the simplifier
    # cannot spend the trunk's budget on twigs and collapse its base.
    unique, remap = np.unique(pos.round(5), axis=0, return_inverse=True)
    faces = remap[tri]
    rows, cols = faces.ravel(), np.roll(faces, 1, axis=1).ravel()
    graph = coo_matrix((np.ones(len(rows), np.uint8), (rows, cols)), shape=(len(unique),)*2)
    count, groups = connected_components(graph, directed=False)
    bottom = np.full(count, np.inf)
    top = np.full(count, -np.inf)
    np.minimum.at(bottom, groups, unique[:,1])
    np.maximum.at(top, groups, unique[:,1])
    rooted = np.argmax(np.where(bottom < unique[:,1].min()+.03, top-bottom, -1))
    main = groups[faces[:,0]] == rooted
    vertices, indices = np.unique(faces[main], return_inverse=True)
    lods=[]
    for target in (640, 110):
        solid, reduced = fast_simplification.simplify(unique[vertices].astype(np.float64),
            indices.reshape(-1,3).astype(np.int32), target_count=min(target,int(main.sum())), agg=6)
        lods.append([b64(np.rint(solid*16000), "<i2"), b64(reduced, "<u2")])
    return lods, tri[~main]


@njit
def project(points, uv, normals, triangles, tex, axis, right, up, layers, depths):
    size = layers.shape[1]
    for face in triangles:
        i, j, k = face
        a, b, c = points[i], points[j], points[k]
        d = (a[axis] + b[axis] + c[axis]) / 3
        layer = min(LAYERS - 1, max(0, int(d * LAYERS)))
        ax, ay = a[right] * size, a[up] * size
        bx, by = b[right] * size, b[up] * size
        cx, cy = c[right] * size, c[up] * size
        det = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
        if abs(det) < .00001:
            continue
        # High frequency self-shading belongs to the individual leaves.
        # The game lights the larger crown with its own moving sun and sky.
        normal = (normals[i] + normals[j] + normals[k]) / 3
        height = (a[1] + b[1] + c[1]) / 3
        radial = math.hypot(a[0] - .5, a[2] - .5)
        shade = (.64 + .25 * height + .23 * radial
                 + .17 * abs(normal[1]) + .12 * normal[0] + .06 * normal[2])
        for y in range(max(0, int(min(ay, by, cy))), min(size, int(max(ay, by, cy)) + 1)):
            for x in range(max(0, int(min(ax, bx, cx))), min(size, int(max(ax, bx, cx)) + 1)):
                u = ((x + .5 - ax) * (cy - ay) - (y + .5 - ay) * (cx - ax)) / det
                v = ((bx - ax) * (y + .5 - ay) - (by - ay) * (x + .5 - ax)) / det
                w = 1 - u - v
                if min(u, v, w) < 0:
                    continue
                z = w * a[axis] + u * b[axis] + v * c[axis]
                if z < depths[layer, y, x]:
                    continue
                tx = int(((w*uv[i,0] + u*uv[j,0] + v*uv[k,0]) % 1) * tex.shape[1])
                ty = int(((w*uv[i,1] + u*uv[j,1] + v*uv[k,1]) % 1) * tex.shape[0])
                rgba = tex[ty, tx]
                if rgba[3] < 105:
                    continue
                depths[layer, y, x] = z
                for channel in range(3):
                    layers[layer, y, x, channel] = min(255, rgba[channel] * shade)
                layers[layer, y, x, 3] = 255


def tree(cache, name, trunk, surfaces, atlas, slot):
    files = maps(cache, name)
    mesh = files["gltf"]["1k"]["gltf"]
    doc = json.loads(download(mesh["url"], cache / (name + ".gltf")).read_text())
    buf = np.memmap(download(mesh["include"][name + ".bin"]["url"], cache / (name + ".bin")), mode="r")

    def read(index):
        acc = doc["accessors"][index]
        view = doc["bufferViews"][acc["bufferView"]]
        dtype = np.dtype({5126: "<f4", 5125: "<u4", 5123: "<u2", 5121: "u1"}[acc["componentType"]])
        dim = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[acc["type"]]
        return np.ndarray((acc["count"], dim), dtype=dtype, buffer=buf,
                          offset=view.get("byteOffset", 0) + acc.get("byteOffset", 0),
                          strides=(view.get("byteStride", dim*dtype.itemsize), dtype.itemsize))

    primitives = doc["meshes"][0]["primitives"]
    bounds = [doc["accessors"][p["attributes"]["POSITION"]] for p in primitives]
    low = np.min([a["min"] for a in bounds], axis=0)
    high = np.max([a["max"] for a in bounds], axis=0)
    low[1] = bounds[trunk]["min"][1]
    span = high-low
    # One common horizontal scale preserves the lean and proportions of each tree.
    width = max(span[0], span[2])
    origin = ((low[0]+high[0]-width)/2, low[1], (low[2]+high[2]-width)/2)
    scale = np.array([width, span[1], width])
    size = (TILE-4)*2
    rgba = np.zeros((3, LAYERS, size, size, 4), np.uint8)
    depth = np.full((3, LAYERS, size, size), -1, dtype=np.float32)
    data = {"layers": []}
    for p in primitives:
        mat = p["material"]
        pos = np.ascontiguousarray((read(p["attributes"]["POSITION"])-origin)/scale, np.float32)
        tri = np.ascontiguousarray(read(p["indices"]).reshape(-1,3), dtype=np.int32)
        if mat == trunk:
            root = np.median(pos[pos[:,1] < .025], axis=0)
            data["root"] = [round(float(root[0]),5),round(float(root[2]),5)]
            data["wood"], tri = trunk_lods(pos, tri)
            if not len(tri):
                continue
        color, mask = surfaces[mat]
        img = texture(cache, name, files, color).convert("RGBA")
        if mask:
            img.putalpha(texture(cache, name, files, mask, True))
        tex = np.array(img)
        uv = np.ascontiguousarray(read(p["attributes"]["TEXCOORD_0"]))
        normals = np.ascontiguousarray(read(p["attributes"]["NORMAL"]))
        for v, (axis, right, up) in enumerate(AXES):
            project(pos, uv, normals, tri, tex, axis, right, up, rgba[v], depth[v])
    for view in range(3):
        for z in range(LAYERS):
            src, dep = rgba[view,z], depth[view,z]
            mask = dep >= 0
            # The shared grid follows the scanned branch depths instead of leaving
            # the foliage on flat planes. Empty cells produce no triangles at runtime.
            points, cells = [], []
            for j in range(GRID+1):
                for i in range(GRID+1):
                    x,y = int(i*size/GRID), int(j*size/GRID)
                    r = size//(GRID*2)
                    subset = dep[max(0,y-r):y+r+1, max(0,x-r):x+r+1]
                    value = subset[subset>=0]
                    points.append(round(255*(np.mean(value) if len(value) else (z+.5)/LAYERS)))
            for j in range(GRID):
                for i in range(GRID):
                    cells.append(np.any(mask[j*size//GRID:(j+1)*size//GRID,i*size//GRID:(i+1)*size//GRID]))
            data["layers"].append([b64(points, "u1"), b64(np.packbits(cells,bitorder="little"), "u1")])
            tile = Image.fromarray(src[::-1]).resize((TILE-4,TILE-4),Image.Resampling.LANCZOS)
            # Extend the real RGB a few texels under the cutout so mipmaps keep a
            # green outline instead of sampling black around small twigs.
            arr = np.array(tile)
            void = arr[:,:,3]<24
            if not void.all():
                nn = ndimage.distance_transform_edt(void,return_distances=False,return_indices=True)
                arr[void,:3] = arr[nn[0][void],nn[1][void],:3]
            cell = slot*15+view*LAYERS+z
            atlas.paste(Image.fromarray(arr),((cell%8)*TILE+2,(cell//8)*TILE+2))
    return data


def bake(cache):
    atlas = Image.new("RGBA",(8*TILE,8*TILE))
    data=[]
    for slot,(name,trunk,surfaces) in enumerate(SOURCES):
        data.append(tree(cache,name,trunk,surfaces,atlas,slot))
        print("Baked",name,flush=True)
    # The last four tiles hold repeatable bark and the color of palm leaflets.
    for offset,(n,k) in enumerate([("pine_bark","Diffuse"),("island_tree_01","branches_diff"),("palm_bark","Diffuse"),("island_tree_01","leaves_diff")]):
        im=texture(cache,n,maps(cache,n),k)
        if offset==3:
            im=im.crop((int(im.width*.245),int(im.height*.17),int(im.width*.265),int(im.height*.31)))
            im=im.point(lambda value: min(255, round(value*1.24)))
        im=im.resize((TILE,TILE),Image.Resampling.LANCZOS)
        atlas.paste(im,((60+offset)%8*TILE,7*TILE))
    atlas.save(DIST/"streetscape/tree-canopies.webp",quality=81,alpha_quality=86,method=6,exact=True)
    (DIST/"tree-scan-data.js").write_text("// Generated by tools/build_tree_scans.py from CC0 Poly Haven meshes.\n"
        +"window.treeScanData="+json.dumps(data,separators=(",",":"))+";\n",encoding="utf8")


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache",type=Path)
    args=parser.parse_args()
    if args.cache:
        args.cache.mkdir(exist_ok=True,parents=True)
        bake(args.cache)
    else:
        with tempfile.TemporaryDirectory(prefix="vivu-tree-scans-") as directory:
            bake(Path(directory))
