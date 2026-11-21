"""Build tunnel mouth distances from the shipped road/traffic graph and its matching PBF.

python tools/build_vn_tunnels.py vietnam.osm.pbf dist/vn-roads dist/vn-traffic
"""
import argparse
import gzip
import hashlib
import heapq
import itertools
import json
import math
from collections import defaultdict
from pathlib import Path

import osmium

from build_vn_roads import compact, permitted, short_runs, simplify
from build_vn_traffic import fingerprint, number


def build(source, roads, traffic):
    index = json.loads((traffic / "index.json").read_bytes())
    road_index = json.loads((roads / "index.json").read_bytes())
    with source.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest not in {index["sourceSha256"], road_index["sourceSha256"]} or road_index["sourceSha256"] != index["graphSourceSha256"]:
        raise ValueError("Tunnel source must match the shipped road and traffic snapshots")
    network = defaultdict(list)
    coords, fingerprints, seen, surface_nodes = {}, {}, set(), set()
    for tile in index["tiles"]:
        with gzip.open(traffic / (tile + ".gz")) as stream:
            ids = {int(k) for k, v in json.load(stream).items() if v.get("tunnel") and not v.get("bridge")}
        if not ids:
            continue
        with gzip.open(roads / (tile + ".gz")) as stream:
            rows = json.load(stream)
        for edge, a, b, _, kind, _, points in rows:
            if edge not in ids:
                surface_nodes.update((a, b))
                continue
            if edge in seen:
                continue
            seen.add(edge)
            line = list(zip(points[::2], points[1::2]))
            fingerprints[fingerprint(kind, a, b, line)] = edge
            coords[a], coords[b] = line[0], line[-1]
            sx = 1.1132 * math.cos(math.radians(points[1] / 100000))
            length = sum(math.hypot((xx-x)*sx, (yy-y)*1.109) for (x, y), (xx, yy) in zip(line, line[1:]))
            network[a].append((b, length))
            network[b].append((a, length))
    # Record the two nearest distinct surface entrances for each internal node.
    # The same vertex must retain its elevation when a neighbouring tile unloads.
    mouths = {n for n, links in network.items() if n in surface_nodes or len(links) == 1}
    nearest = defaultdict(dict)
    heap = [(0, n, n) for n in mouths]
    heapq.heapify(heap)
    while heap:
        distance, mouth, node = heapq.heappop(heap)
        if mouth in nearest[node] or len(nearest[node]) == 2:
            continue
        nearest[node][mouth] = distance
        for other, length in network[node]:
            if mouth not in nearest[other] and len(nearest[other]) < 2:
                heapq.heappush(heap, (distance + length, mouth, other))
    inside = {}
    for node in sorted(network.keys() - mouths):
        anchors = nearest[node] or {node: 0}
        inside[node] = [v for n, d in anchors.items() for v in (*coords[n], round(d, 1))]

    passages, clearance = [], {}
    processor = osmium.FileProcessor(source).with_locations().with_filter(osmium.filter.KeyFilter("tunnel"))
    for w in processor:
        if not w.is_way() or w.tags.get("highway") not in road_index["classes"] or not permitted(w):
            continue
        passage = w.tags.get("tunnel") == "building_passage"
        physical = number(w.tags.get("maxheight:physical"), 15, "(?:m)?")
        if not passage and not physical:
            continue
        refs = [(n.ref, round(n.lon*100000), round(n.lat*100000)) for n in w.nodes if n.location.valid()]
        if len(refs) != len(w.nodes):
            continue
        if w.tags.get("oneway:motorcar", w.tags.get("oneway")) in {"-1", "reverse"}:
            refs.reverse()
        kind = w.tags.get("highway")
        for run, _ in short_runs(refs, network, itertools.count(-1, -1)):
            line = simplify([(x, y) for _, x, y in run], 1 if kind == "service" else 3)
            edge = fingerprints.get(fingerprint(kind, run[0][0], run[-1][0], line))
            if edge is not None:
                if passage:
                    passages.append(edge)
                if physical:
                    clearance[edge] = physical
    data = dict(graphSourceSha256=index["graphSourceSha256"], inside=inside, passages=sorted(set(passages)),
                clearance=dict(sorted(clearance.items())))
    (traffic / "tunnels.json").write_bytes(compact(data))
    print(f"{len(seen)} tunnel edges, {len(inside)} internal nodes, {len(data['passages'])} building passages, {len(clearance)} measured clearances")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for arg in ("source", "roads", "traffic"):
        parser.add_argument(arg, type=Path)
    args = parser.parse_args()
    build(args.source, args.roads, args.traffic)
