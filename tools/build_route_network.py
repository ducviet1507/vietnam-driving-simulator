"""Build the turn-aware portal overlay from ViVu3D's vendored road and traffic tiles.

Run with Python 3 and Node 18+ from any directory:
    python tools/build_route_network.py

No geometry is copied. For each tile the overlay stores the shortest legal cost
between incoming and outgoing directed boundary edges. The worker reconstructs
the selected paths using the original OSM tiles and the same routing code.
"""
from array import array
import argparse
import concurrent.futures
import gzip
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = """
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const dist=process.argv[1],network=require(path.join(dist,'route-network-core.js'));
const index=JSON.parse(fs.readFileSync(path.join(dist,'vn-roads/index.json')));
const accessOnly=new Set(index.sightAccess?.only),accessTiles=new Set(index.sightAccess?.tiles);
const traffic=new Set(JSON.parse(fs.readFileSync(path.join(dist,'vn-traffic/index.json'))).tiles);
function load(folder,key){return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dist,folder,key+'.gz'))));}
for(const key of process.argv.slice(2)){
  const rows=accessOnly.has(key)?[]:load('vn-roads',key);
  if(accessTiles.has(key))rows.push(...load('vn-access',key));
  const graph=new network.Tile(index,key,rows,traffic.has(key)?load('vn-traffic',key):{});
  process.stdout.write(JSON.stringify([key,graph.overlay()])+'\\n');
}
"""


def batch(dist, keys):
    run = subprocess.run(["node", "-e", BUILD, str(dist), *keys],
                         capture_output=True, check=True)
    return dict(json.loads(line) for line in run.stdout.splitlines())


def build(dist, workers):
    roads = json.loads((dist / "vn-roads/index.json").read_bytes())
    traffic = json.loads((dist / "vn-traffic/index.json").read_bytes())
    if roads["sourceSha256"] != traffic["graphSourceSha256"] or roads["osmTimestamp"] != traffic["osmTimestamp"]:
        raise ValueError("Road and traffic snapshots must match.")
    tiles = sorted((set(roads["tiles"]) - set(roads["splits"])) | set(roads["subtiles"]) | set(roads.get("sightAccess", {}).get("only", [])))
    groups = [tiles[i:i+12] for i in range(0, len(tiles), 12)]
    data = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        tasks = [pool.submit(batch, dist, group) for group in groups]
        for task in concurrent.futures.as_completed(tasks):
            data.update(task.result())
            if len(data) % 120 < 12:
                print(f"{len(data)} / {len(tiles)} tiles", flush=True)
    # The index is small enough to load as one object. Dense distance matrices
    # use typed integers and are fetched by latitude band as the search reaches
    # them. A local trip need not download the rest of the country.
    folder = dist / "route-network"
    folder.mkdir(exist_ok=True)
    parts, bands = {}, {}
    for key in tiles:
        part = data[key]
        if not part["from"] and not part["to"]:
            continue
        band = str(int(key.split("_")[1]) // 4)
        values = bands.setdefault(band, array("i"))
        parts[key] = [part["from"], [gate[0] for gate in part["to"]], len(values)]
        values.extend(part["costs"])
    size = 0
    for band, values in bands.items():
        if values.itemsize != 4:
            raise RuntimeError("A 32-bit int array is required")
        if sys.byteorder != "little":
            values.byteswap()
        encoded = gzip.compress(values.tobytes(), compresslevel=7, mtime=0)
        (folder / f"costs-{band}.gz").write_bytes(encoded)
        size += len(encoded)
    metadata = {"version": 1, "source": roads["sourceSha256"], "timestamp": roads["osmTimestamp"],
                "attribution": "© OpenStreetMap contributors, ODbL 1.0; see vn-roads/CREDITS.txt",
                "tiles": parts}
    if "sightAccess" in roads:
        metadata["sightAccess"] = roads["sightAccess"]["revision"]
    raw = json.dumps(metadata, ensure_ascii=False, separators=(",", ":")).encode()
    payload = gzip.compress(raw, compresslevel=7, mtime=0)
    (folder / "portals.gz").write_bytes(payload)
    count = sum(len(v["from"]) for v in data.values())
    print(f"{count:,} directed crossings, {len(bands)} matrix shards, {size+len(payload):,} bytes", flush=True)



if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist", type=Path, default=ROOT / "dist")
    parser.add_argument("--workers", type=int, default=min(5, os.cpu_count() or 1))
    args = parser.parse_args()
    build(args.dist.resolve(), args.workers)
