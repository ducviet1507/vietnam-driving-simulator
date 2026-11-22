"""Export mapped public cemetery and memorial grounds for the visitor scenery."""
import json
import re
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = "https://api.openstreetmap.org/api/0.6/"
NAME = re.compile(r"nghĩa trang|nghĩa trủng|nghĩa địa|cemetery|liệt s[ĩỹ]|tưởng niệm|khu chứng tích|thành cổ quảng trị", re.I)


def fetch(kind, ids):
    ids = sorted(set(ids))
    result = {}
    for i in range(0, len(ids), 180):
        group = ",".join(map(str, ids[i:i + 180]))
        url = f"{API}{kind}s.json?{kind}s={group}"
        request = urllib.request.Request(url, headers={"User-Agent": "ViVu3D/1.0 (https://vivu3d.com/)"})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=45) as response:
                    rows = json.load(response)["elements"]
                break
            except OSError:
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
        result.update((r["id"], r) for r in rows if r["type"] == kind)
    return result


def is_grounds(obj):
    tags = obj.get("tags", {})
    if tags.get("access") in {"private", "no", "military"} or tags.get("building") or tags.get("military"):
        return False
    return (tags.get("landuse") in {"cemetery", "religious"} or tags.get("amenity") == "grave_yard"
            or tags.get("leisure") in {"park", "garden"} or tags.get("historic") in {"battlefield", "fort"})


def assemble(parts):
    """Join OSM multipolygon member ways, keeping separate islands and holes."""
    parts = [list(nodes) for nodes in parts]
    rings = []
    while parts:
        ring = parts.pop()
        while ring[0] != ring[-1]:
            for i, p in enumerate(parts):
                if p[0] == ring[-1] or p[-1] == ring[-1]:
                    parts.pop(i)
                    ring.extend(p[1:] if p[0] == ring[-1] else p[-2::-1])
                    break
            else:
                raise ValueError("Unclosed memorial multipolygon")
        rings.append(ring[:-1])
    return rings


def build():
    catalog = subprocess.check_output(["node", "-e", "global.window=global;require('./dist/tourism-catalog.js');"
                                      "process.stdout.write(JSON.stringify(VietnamTourism.entries.map(s=>[s.id,s.name])))"],
                                     cwd=ROOT)
    sites = [s.split("-") for s, name in json.loads(catalog) if NAME.search(name) and s.startswith("osm-")]
    keys = {k: [int(n) for _, t, n in sites if t == k] for k in ("way", "relation")}
    relations = [r for r in fetch("relation", keys["relation"]).values() if is_grounds(r)]
    members = [m["ref"] for r in relations for m in r["members"] if m["type"] == "way" and m["role"] in ("outer", "inner")]
    ways = fetch("way", keys["way"] + members)
    shapes = []
    for i in keys["way"]:
        w = ways.get(i)
        if w and is_grounds(w) and len(w["nodes"]) >= 4 and w["nodes"][0] == w["nodes"][-1]:
            shapes.append(("w"+str(i), w["version"], [w["nodes"][:-1]]))
    for r in relations:
        rings = []
        for role in ("outer", "inner"):
            rings.extend(assemble([ways[m["ref"]]["nodes"] for m in r["members"] if m["type"] == "way" and m["role"] == role]))
        if rings:
            shapes.append(("r"+str(r["id"]), r["version"], rings))
    nodes = fetch("node", [i for _, _, rings in shapes for ring in rings for i in ring])
    packed = []
    for ref, version, rings in sorted(shapes):
        coords = []
        for ring in rings:
            points = [[round(nodes[i]["lon"]*1e7), round(nodes[i]["lat"]*1e7)] for i in ring]
            lon, lat = points[0]
            delta = [lon, lat]
            for x, y in points[1:]:
                delta.extend((x-lon, y-lat))
                lon, lat = x, y
            coords.append(delta)
        packed.append([ref, version, coords])
    target = ROOT / "dist/memorial-grounds-data.js"
    target.write_text("// © OpenStreetMap contributors, ODbL 1.0. Versioned public visitor-area outlines.\n"
                      + "window.MemorialGroundRings="+json.dumps(packed, separators=(",", ":"))+";\n", encoding="utf8")
    print(f"{len(packed)} grounds, {len(nodes)} mapped vertices")


if __name__ == "__main__":
    build()
