"""Build drivable longitudinal road profiles for Vietnamese mountain passes.

Requires numpy, scipy, Pillow and rasterio. All positions and junctions come
from the shipped OSM graph. GEDTM30 v1.2 provides 2-arcsecond observations
along the roadway. Level streets in well-observed built-up areas use the
shipped urban terrain. Bridge and tunnel interiors have no ground observations.
The Node geometry solvers supply the rise/depression reserved in the total
longitudinal grade. The arrays are absolute decimetres equally spaced on each
original edge in its OSM direction.
"""

import argparse
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from functools import lru_cache
import gzip
import json
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
import unicodedata

import numpy as np
from scipy import ndimage
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import dijkstra

import build_city_terrain as dem
from terrain_sources import Terrain

ROOT = dem.ROOT
MAJOR = {"motorway", "trunk", "primary", "secondary", "tertiary"}
UNPAVED = {
    "unpaved",
    "compacted",
    "fine_gravel",
    "gravel",
    "sand",
    "ground",
    "earth",
    "mud",
    "dirt",
    "grass",
    "woodchips",
    "pebblestone",
    "rock",
}
STEP = 20


def json_file(path):
    return json.loads(path.read_bytes())


def compressed(path):
    return json.loads(gzip.decompress(path.read_bytes()))


@lru_cache(maxsize=8192)
def named_pass(name):
    words = unicodedata.normalize("NFC", name.casefold()).split(" · ")[0].strip()
    return words.startswith(
        ("đèo ", "đường đèo ", "mã pí lèng", "mã pì lèng", "mã pí lèn")
    )


def graph_tiles(roads):
    access = roads["sightAccess"]
    keys = (
        (set(roads["tiles"]) - set(roads["splits"]))
        | set(roads["subtiles"])
        | set(access["tiles"])
    )
    return sorted(keys, key=lambda k: tuple(map(int, k.split("_"))))


def road_groups(roads, keys):
    access = roads["sightAccess"]
    extra, only = set(access["tiles"]), set(access["only"])
    seen = set()
    for key in keys:
        group = []
        for folder, use in (("vn-roads", key not in only), ("vn-access", key in extra)):
            if use:
                for row in compressed(ROOT / folder / (key + ".gz")):
                    if row[0] not in seen:
                        seen.add(row[0])
                        group.append(row)
        if group:
            yield key, group


def geometry(rows):
    counts = np.fromiter((len(row[6]) // 2 for row in rows), int)
    pos = (
        np.fromiter((v for row in rows for v in row[6]), dtype=np.int32).reshape(-1, 2)
        * 1e-5
    )
    owner = np.repeat(np.arange(len(rows)), counts - 1)
    ends = np.cumsum(counts) - 1
    valid = np.ones(len(pos) - 1, bool)
    valid[ends[:-1]] = False
    idx = np.flatnonzero(valid)
    start = pos[idx]
    delta = pos[idx + 1] - start
    cosine = np.cos(np.deg2rad(pos[ends - counts + 1, 1]))
    length = np.hypot(delta[:, 0] * 111320 * cosine[owner], delta[:, 1] * 110900)
    keep = length > 0
    start, delta, owner, length = start[keep], delta[keep], owner[keep], length[keep]
    totals = np.bincount(owner, weights=length, minlength=len(rows))
    return start, delta, owner, length, totals


def stations(geo, step):
    start, delta, owner, lens, totals = geo
    if step == STEP:
        n = np.maximum(
            np.ceil(totals / 25).astype(int), np.floor(totals / STEP + 0.5).astype(int)
        )
    else:
        n = np.ceil(totals / step).astype(int)
    active = np.flatnonzero(n)
    if not len(active):
        return np.empty((0, 2)), np.array([], int), n
    n[active] = np.maximum(n[active], 1)
    # Separate polylines in the cumulative distance index.
    end = np.cumsum(lens) + owner
    begin = end - lens
    first = np.r_[0, np.flatnonzero(owner[1:] != owner[:-1]) + 1]
    count = n[active] + 1
    take = np.repeat(active, count)
    ordinal = np.arange(len(take)) - np.repeat(np.cumsum(count) - count, count)
    distance = np.repeat(begin[first], count) + ordinal * np.repeat(
        totals[active] / n[active], count
    )
    ix = np.minimum(
        np.searchsorted(end, distance),
        np.repeat(np.r_[first[1:] - 1, len(end) - 1], count),
    )
    frac = np.clip((distance - begin[ix]) / lens[ix], 0, 1)
    return start[ix] + delta[ix] * frac[:, None], take, n


def prepare_rasters(roads, work, workers):
    tiles = dem.road_tiles(roads)
    grids = {f: dem.source_grid(f) for f in (1, 4)}
    jobs = []
    for factor, grid in grids.items():
        blocks = set()
        for t in tiles:
            xs, ys = dem.source_axes(t, grid, factor)
            blocks.update(
                (i, j)
                for i in dem.block_range(ys, grid[-2])
                for j in dem.block_range(xs, grid[-1])
            )
        jobs.extend(
            (b, grid, work, factor)
            for b in blocks
            if not dem.block_path(work, *b, factor).exists()
        )
    if jobs:
        with ProcessPoolExecutor(max_workers=workers) as pool:
            list(pool.map(dem.fetch_block, jobs))
    # A 1.5 km window includes low coastal passes as well as high inland ranges.
    lowx = min(x for x, y in tiles) * dem.CELLS
    topy = (max(y for x, y in tiles) + 1) * dem.CELLS
    right = (max(x for x, y in tiles) + 1) * dem.CELLS
    bottom = min(y for x, y in tiles) * dem.CELLS
    mountain = np.zeros((topy - bottom + 1, right - lowx + 1), bool)
    for t in tiles:
        g = dem.sample_ground(t, grids[1], work)
        valid = np.isfinite(g)
        high = ndimage.maximum_filter(np.where(valid, g, -np.inf), size=7)
        low = ndimage.minimum_filter(np.where(valid, g, np.inf), size=7)
        relief = high - low
        mask = (relief >= 75) | ((g >= 250) & (relief >= 28))
        x, y = t[0] * dem.CELLS - lowx, topy - (t[1] + 1) * dem.CELLS
        mountain[y : y + dem.CELLS + 1, x : x + dem.CELLS + 1] |= mask[dem.CORE]
    return grids[4], mountain, lowx, topy


def raw_heights(pos, grid, work):
    west, north, dx, dy, rows, cols = grid
    px, py = (pos[:, 0] - west) / dx - 0.5, (pos[:, 1] - north) / dy - 0.5
    ix, iy = np.floor(px).astype(int), np.floor(py).astype(int)
    fx, fy = px - ix, py - iy
    total, norm = np.zeros(len(px)), np.zeros(len(px))
    for j, wy in enumerate((1 - fy, fy)):
        for i, wx in enumerate((1 - fx, fx)):
            rr, cc = iy + j, ix + i
            group = (rr // rows) * 1000 + cc // cols
            for key in np.unique(group):
                r, c = divmod(int(key), 1000)
                raster = dem.source_block(dem.block_path(work, r, c, 4))
                ids = np.flatnonzero(group == key)
                vals = raster[rr[ids] % rows, cc[ids] % cols]
                good = np.isfinite(vals)
                ids = ids[good]
                w = wx[ids] * wy[ids]
                total[ids] += vals[good] * w
                norm[ids] += w
    return np.divide(total, norm, out=np.full(len(norm), np.nan), where=norm > 0)


def classify(roads, keys, mountain, left, top):
    bridges = {int(x) for x in json_file(ROOT / "vn-bridges/details.json")["edges"]}
    tunnels = set(json_file(ROOT / "vn-traffic/tunnels.json")["passages"])
    traffic = set(json_file(ROOT / "vn-traffic/index.json")["tiles"])
    chunks = []
    for key, rows in road_groups(roads, keys):
        tags = compressed(ROOT / "vn-traffic" / (key + ".gz")) if key in traffic else {}
        flags = np.zeros((len(rows), 4), np.int8)
        for i, (eid, _, __, name, kind, oneway, coords) in enumerate(rows):
            t = tags.get(str(eid), {})
            structure = (
                eid in bridges
                or eid in tunnels
                or bool(t.get("bridge") or t.get("tunnel"))
            )
            major = (
                kind.removesuffix("_link") in MAJOR
                and t.get("surface", "") not in UNPAVED
            )
            # The overlook on QL.4C is not labelled with the Ma Pi Leng pass name in OSM.
            overlook = (
                "QL.4C" in name
                and kind == "trunk"
                and 10539000 <= coords[0] <= 10541700
                and 2323000 <= coords[1] <= 2325100
            )
            flags[i] = (
                named_pass(name) or overlook,
                major,
                structure,
                grade_percent(kind, name),
            )
        geo = geometry(rows)
        selected = flags[:, 0].astype(bool)
        candidates = np.flatnonzero(flags[:, 1])
        if len(candidates):
            pos, owner, _ = stations(geometry([rows[i] for i in candidates]), 100)
            xx = np.clip(
                np.rint(pos[:, 0] * dem.SCALE).astype(int) - left,
                0,
                mountain.shape[1] - 1,
            )
            yy = np.clip(
                top - np.rint(pos[:, 1] * dem.SCALE).astype(int),
                0,
                mountain.shape[0] - 1,
            )
            selected[candidates[owner[mountain[yy, xx]]]] = True
        ids = np.asarray([row[:3] for row in rows], dtype=np.int64)
        chunks.append(
            np.column_stack(
                (
                    ids,
                    np.rint(geo[-1] * 1e6),
                    selected,
                    flags,
                    np.array([r[6][:2] + r[6][-2:] for r in rows], dtype=np.int32),
                )
            ).astype(np.int64)
        )
    return np.concatenate(chunks)


def grade_percent(kind, name):
    if kind.startswith("motorway"):
        return 10
    if kind.removesuffix("_link") in ("trunk", "primary") or "QL." in name:
        return 12
    return 15 if kind.removesuffix("_link") in MAJOR else 18


def interval_counts(length):
    return np.maximum(
        1, np.maximum(np.ceil(length / 25), np.floor(length / STEP + 0.5))
    ).astype(int)


def structure_budget(length, count, grade, profile):
    # The bridge/tunnel solver adds a signed piecewise-linear lift to the
    # formation. Reserve its full derivative on each sample interval which
    # contains any part of a ramp, even when the endpoints have equal lift.
    # Include the next station and a small margin for a streaming scene's
    # local projection or a kink very close to an interval boundary.
    remaining = np.full(count, min(grade, 0.12))
    knots = profile["knots"]
    nominal = profile["grade"]
    margin = 1 / count + 0.005
    for (start, h0), (end, h1) in zip(knots, knots[1:]):
        if abs(h1 - h0) < 1e-7:
            continue
        left = max(0, int(np.floor((start - margin) * count)))
        right = min(count, int(np.ceil((end + margin) * count)))
        remaining[left:right] = max(0.0, min(grade, 0.12) - nominal)
    return np.floor(length / count * 0.9975 * remaining * 10 + 1e-8)


def read_datums(terrain, coords, workers):
    if not len(coords):
        return np.empty(0)
    keys = (np.floor(coords[:, 0] * 4) * 1000 + np.floor(coords[:, 1] * 4)).astype(int)
    order = np.argsort(keys)
    groups = np.split(order, np.flatnonzero(np.diff(keys[order])) + 1)
    values = np.empty(len(order))

    def read(group):
        part = coords[group]
        _, heights, _ = terrain.sample(part[:, 0], part[:, 1])
        values[group] = heights

    with ThreadPoolExecutor(max_workers=min(4, workers)) as pool:
        list(pool.map(read, groups))
    return values


def approach_scope(edges, lifts, workers):
    nodes, indices = np.unique(edges[:, 1:3], return_inverse=True)
    ij = indices.reshape(-1, 2)
    a, b = ij.T
    lengths = edges[:, 3] / 1e6
    core = edges[:, 4] > 0
    # Follow actual road connections. Grade-separated crossings never connect.
    graph = sparse_graph(a, b, lengths, len(nodes))
    distance = dijkstra(graph, indices=np.unique(ij[core]), min_only=True, limit=420)
    margin = np.where(edges[:, 6], 400, 160)
    selected = core | (np.minimum(distance[a], distance[b]) <= margin)
    structures = edges[:, 7] > 0
    degree = np.bincount(ij[lengths >= 0.5].ravel(), minlength=len(nodes))
    coords = np.empty((len(nodes), 2), dtype=np.int32)
    coords[a] = edges[:, 9:11]
    coords[b] = edges[:, 11:13]
    heights = np.full(len(nodes), np.nan)
    terrain = Terrain(ROOT, False)
    n = interval_counts(lengths)
    allowance = np.floor((lengths / n) * 0.9975 * edges[:, 8] * 0.1 + 1e-8) * n
    lifted = np.flatnonzero(np.isin(edges[:, 0], np.fromiter(lifts, int)))
    for i in lifted:
        allowance[i] = np.sum(
            structure_budget(lengths[i], n[i], edges[i, 8] / 100, lifts[edges[i, 0]])
        )
    while True:
        # Include entire structural chains, then their portals and abutments.
        while True:
            active = np.unique(ij[selected & structures])
            extend = structures & (np.isin(a, active) | np.isin(b, active))
            if not (extend & ~selected).any():
                break
            selected |= extend
        portals = np.unique(ij[selected & structures])
        selected |= np.isin(a, portals) | np.isin(b, portals)
        selected &= lengths >= 0.5
        included = np.bincount(ij[selected].ravel(), minlength=len(nodes))
        surface = (
            np.bincount(ij[selected & ~structures].ravel(), minlength=len(nodes)) > 0
        )
        boundary = (included > 0) & (included < degree) & (surface | (included == 1))
        missing = np.flatnonzero(boundary & ~np.isfinite(heights))
        heights[missing] = read_datums(terrain, coords[missing] * 1e-5, workers)
        if not boundary.any():
            break
        # Collapse each profiled edge to the sum of its per-station slope
        # budgets. This preserves every shortest path between OSM junctions.
        # If boundary terrain datums cannot all fit, extend only the affected
        # approaches to the next part of the network, then test again.
        connected = sparse_graph(
            a[selected], b[selected], allowance[selected], len(nodes)
        )
        hi = envelope(connected, heights * 10, boundary)[boundary]
        lo = envelope(connected, heights * 10, boundary, True)[boundary]
        nodes_at_edge = np.flatnonzero(boundary)
        bad = nodes_at_edge[np.abs((lo + hi) * 0.5 - heights[boundary] * 10) > 1.0]
        if not len(bad):
            break
        farther = dijkstra(graph, indices=bad, min_only=True, limit=550)
        additional = (
            (np.minimum(farther[a], farther[b]) <= 500) & (lengths >= 0.5) & ~selected
        )
        if not additional.any():
            break
        print(
            f"Extending {np.count_nonzero(additional):,} road approaches near {len(bad):,} conflicting boundary nodes",
            flush=True,
        )
        selected |= additional
    boundary_nodes = nodes[boundary]
    return (
        set(edges[selected, 0].tolist()),
        set(edges[selected & structures, 0].tolist()),
        dict(zip(boundary_nodes.tolist(), heights[boundary].tolist())),
    )


def sparse_graph(a, b, cost, size):
    # Parallel OSM arcs can share both ends. Keep the tightest length budget.
    code = np.minimum(a, b).astype(np.int64) * size + np.maximum(a, b)
    order = np.argsort(code, kind="stable")
    distinct, starts = np.unique(code[order], return_index=True)
    weight = np.minimum.reduceat(cost[order], starts)
    aa, bb = distinct // size, distinct % size
    return csr_matrix(
        (np.r_[weight, weight], (np.r_[aa, bb], np.r_[bb, aa])), shape=(size, size)
    )


def envelope(graph, values, observed, maximum=False):
    # An extra source supplies the initial height at each observed station.
    nodes = np.flatnonzero(observed)
    sign = -1 if maximum else 1
    z = sign * values[nodes]
    minimum = np.min(z) - 1
    base = graph.tocoo(copy=False)
    size = graph.shape[0]
    augmented = csr_matrix(
        (
            np.r_[base.data, z - minimum],
            (np.r_[base.row, np.full(len(nodes), size)], np.r_[base.col, nodes]),
        ),
        shape=(size + 1, size + 1),
    )
    dist = dijkstra(augmented, indices=size, directed=True)[:size]
    return sign * (dist + minimum)


def fit_profile(graph, obs, sample, boundary, urban=None):
    lower = envelope(graph, obs, sample, True)
    upper = envelope(graph, obs, sample)
    result = (lower + upper) * 0.5
    if not np.isfinite(result).all():
        raise ValueError("Unobserved road component")
    # Set the validated urban surface first, then match the exits to the rest
    # of the road network. Each projection preserves every longitudinal cap.
    for anchors in (urban, boundary):
        if anchors is None or not np.any(anchors):
            continue
        lo = envelope(graph, obs, anchors, True)
        hi = envelope(graph, obs, anchors)
        connected = np.isfinite(lo)
        # Conflicting boundary datums share the smallest feasible adjustment.
        mid = (lo[connected] + hi[connected]) * 0.5
        result[connected] = np.clip(
            result[connected],
            np.minimum(lo[connected], mid),
            np.maximum(hi[connected], mid),
        )
    return np.floor(result + 0.5).astype(np.int32)


def collect(roads, keys, selected):
    rows = []
    for _, group in road_groups(roads, keys):
        rows.extend(row for row in group if row[0] in selected)
    return rows


def urban_observations(terrain, coords, ground, surface):
    """Use the common bare-earth street surface on level, well-observed urban ground."""
    selected = np.flatnonzero(surface)
    position = coords[selected]
    tile = np.floor(position * 2).astype(int)
    keys = tile[:, 0] * 1000 + tile[:, 1]
    order = np.argsort(keys)
    priority = np.zeros(len(coords), bool)
    for group in np.split(order, np.flatnonzero(np.diff(keys[order])) + 1):
        if not len(group):
            continue
        x, y = divmod(int(keys[group[0]]), 1000)
        data = terrain.bare(f"{x}_{y}")
        if data is None:
            continue
        ids = selected[group]
        lon, lat = coords[ids].T
        n = terrain.urban["cells"]
        cx = np.clip((lon * 2 - x) * n, 0, n)
        cy = np.clip((y + 1 - lat * 2) * n, 0, n)
        ix = np.minimum(cx.astype(int), n - 1)
        iy = np.minimum(cy.astype(int), n - 1)
        fx, fy = cx - ix, cy - iy

        def value_gradient(array):
            a, b = array[iy, ix], array[iy, ix + 1]
            c, d = array[iy + 1, ix], array[iy + 1, ix + 1]
            north = a + (b - a) * fx
            south = c + (d - c) * fx
            return (
                north + (south - north) * fy,
                (b - a) * (1 - fy) + (d - c) * fy,
                south - north,
            )

        # The game interpolates height*weight, so normalise both the sampled
        # height and its derivative before assessing the underlying urban grade.
        wh, dhx, dhy = value_gradient(data[0])
        weight, dwx, dwy = value_gradient(data[1])
        denominator = np.maximum(weight, 0.001)
        h = wh / denominator
        sx = (
            (dhx - h * dwx) / denominator * (2 * n) / (111320 * np.cos(np.deg2rad(lat)))
        )
        sy = (dhy - h * dwy) / denominator * (2 * n) / 110900
        slope = np.hypot(sx, sy)
        trust = dem.smoothstep(weight, 0.55, 0.95) * (
            1 - dem.smoothstep(slope, 0.035, 0.075)
        )
        ground[ids] += trust * (h - ground[ids])
        priority[ids] = (weight >= 0.985) & (slope <= 0.025)
    return priority


def verify_finished(rows, heights, offsets, ds, lifts):
    peaks = defaultdict(float)
    for i, row in enumerate(rows):
        profile = lifts.get(row[0])
        if not profile:
            continue
        base = heights[offsets[i] : offsets[i + 1]] * 0.1
        n = len(base) - 1
        length = ds[offsets[i] - i] * n
        station = np.linspace(0.0, 1.0, n + 1)
        knots = np.asarray(profile["knots"])
        if (
            abs(knots[0, 0]) > 1e-12
            or abs(1 - knots[-1, 0]) > 1e-12
            or np.any(np.diff(knots[:, 0]) <= 0)
        ):
            raise ValueError(f"Invalid structure offsets on {row[0]}")
        # Test all extrema analytically: between any two successive breakpoints
        # both the formation and the runtime lift are exactly linear.
        breaks = np.union1d(station, knots[:, 0])
        total = np.interp(breaks, station, base) + np.interp(breaks, *knots.T)
        metres = length * np.diff(breaks)
        valid = metres > 1.0e-6
        peak = float(np.max(np.abs(np.diff(total)[valid]) / metres[valid] * 100))
        if peak > min(12, grade_percent(row[4], row[3])) + 0.001:
            raise ValueError(f"Combined structure grade {peak:.4f}% on edge {row[0]}")
        peaks[profile["kind"]] = max(peaks[profile["kind"]], peak)
    print(
        "Verified finished surface grades at all formation and structure breakpoints: "
        + ", ".join(f"{kind} {v:.2f}%" for kind, v in sorted(peaks.items())),
        flush=True,
    )


def quantize_urban_ground(raw, urban, boundary, a, b, ds, cap):
    # Rounding each absolute height independently can put a 10 cm step across
    # a very short intersection on otherwise level ground. Choose integer
    # targets together along connected, high-confidence urban sections.
    use = urban[a] & urban[b]
    if not np.any(use):
        return
    nodes, stations = np.unique(np.stack((a[use], b[use])), return_inverse=True)
    u, v = stations.reshape(2, -1)
    z = raw[nodes] * 10
    rise = np.maximum(
        np.floor(ds[use] * 0.008 * 10), np.floor(np.abs(z[u] - z[v]) + 0.5)
    )
    graph = sparse_graph(u, v, np.minimum(rise, cap[use]), len(nodes))
    targets = fit_profile(
        graph, z, np.ones(len(nodes), bool), np.zeros(len(nodes), bool)
    )
    interior = ~boundary[nodes]
    raw[nodes[interior]] = targets[interior] * 0.1


def profile_network(rows, structures, boundary, grid, work, lifts):
    n_edges = len(rows)
    endpoints, inv = np.unique(
        np.array([r[1:3] for r in rows], np.int64), return_inverse=True
    )
    ends = inv.reshape(-1, 2)
    n_end = len(endpoints)
    offsets = [0]
    positions, station_ids, src, dst, budgets, spacing, masks = (
        [],
        [],
        [],
        [],
        [],
        [],
        [],
    )
    interior = n_end
    for lo in range(0, n_edges, 3072):
        part = rows[lo : lo + 3072]
        geo = geometry(part)
        pos, owner, n = stations(geo, STEP)
        if np.any(n == 0):
            raise ValueError("Zero-length profile")
        counts = n + 1
        start = np.cumsum(counts) - counts
        final = start + n
        ids = np.empty(len(pos), np.int32)
        ids[start] = ends[lo : lo + len(part), 0]
        ids[final] = ends[lo : lo + len(part), 1]
        internal = np.ones(len(pos), bool)
        internal[start] = internal[final] = False
        k = int(internal.sum())
        ids[internal] = np.arange(interior, interior + k)
        interior += k
        slope = np.array([grade_percent(r[4], r[3]) * 0.01 for r in part])
        ds = geo[-1] / n
        arc = np.ones(len(pos), bool)
        arc[final] = False
        ix = np.flatnonzero(arc)
        positions.append(pos)
        station_ids.append(ids)
        spacing.append(np.repeat(ds, n))
        # A floor in integer decimetres keeps even very short edges inside budget.
        cost = np.repeat(np.floor(ds * 0.9975 * slope * 10 + 1e-8), n)
        arcstart = np.cumsum(n) - n
        for j, row in enumerate(part):
            if row[0] in lifts:
                start_arc = arcstart[j]
                cost[start_arc : start_arc + n[j]] = structure_budget(
                    geo[-1][j], n[j], slope[j], lifts[row[0]]
                )
        budgets.append(cost)
        src.append(ids[ix])
        dst.append(ids[ix + 1])
        masks.append(
            np.repeat(np.array([r[0] not in structures for r in part]), counts)
        )
        offsets.extend((offsets[-1] + np.cumsum(counts)).tolist())
    xy = np.concatenate(positions)
    ids = np.concatenate(station_ids)
    coordinates = np.empty((interior, 2))
    coordinates[ids] = xy
    a, b = np.concatenate(src), np.concatenate(dst)
    cap = np.concatenate(budgets)
    ds = np.concatenate(spacing)
    surface = np.zeros(interior, bool)
    surface[ids[np.concatenate(masks)]] = True
    # Abutments/portals on the outside of a profile can be end anchors.
    degree = np.bincount(np.r_[a, b], minlength=interior)
    surface |= degree == 1
    raw = np.empty(interior)
    for lo in range(0, interior, 64000):
        raw[lo : lo + 64000] = raw_heights(coordinates[lo : lo + 64000], grid, work)
    terrain = Terrain(ROOT, False)
    missing = ~np.isfinite(raw)
    if missing.any():
        raw[missing] = terrain.atlas(coordinates[missing, 0], coordinates[missing, 1])
    urban = urban_observations(terrain, coordinates, raw, surface)
    boundary_mask = np.zeros(interior, bool)
    boundary_mask[:n_end] = np.isin(endpoints, np.fromiter(boundary, np.int64))
    boundary_mask &= surface
    # Sample the actual shipped DSM/urban model at exits to roads which keep
    # their ordinary terrain sampler. Limit the tie-in at inconsistent junctions.
    boundary_ids = np.flatnonzero(boundary_mask)
    raw[boundary_ids] = [boundary[endpoints[i]] for i in boundary_ids]
    quantize_urban_ground(raw, urban, boundary_mask, a, b, ds, cap)
    graph = sparse_graph(a, b, cap, interior)
    # A short distance-weighted low-pass suppresses DEM noise along the road.
    # Ignore bridge and tunnel interiors, which are not earth observations.
    v = raw.copy()
    w = 1 / np.maximum(ds, 1)
    for _ in range(4):
        wa = w * surface[b]
        wb = w * surface[a]
        den = np.bincount(a, weights=wa, minlength=interior) + np.bincount(
            b, weights=wb, minlength=interior
        )
        acc = np.bincount(a, weights=wa * v[b], minlength=interior) + np.bincount(
            b, weights=wb * v[a], minlength=interior
        )
        take = (den > 0) & surface & ~boundary_mask & ~urban
        v[take] += 0.5 * (acc[take] / den[take] - v[take])
    values = fit_profile(graph, v * 10, surface, boundary_mask, urban)
    offsets = np.asarray(offsets)
    # Structure-only degree-two chains have a single longitudinal gradient
    # between their portals or abutments. No mid-span DEM samples enter the fit.
    struct_arcs = ~surface[a] | ~surface[b]
    if struct_arcs.any():
        from scipy.sparse.linalg import spsolve

        aa, bb = a[struct_arcs], b[struct_arcs]
        internal = np.flatnonzero(~surface & (degree == 2))
        if len(internal):
            from scipy.sparse import diags

            weights = 1 / np.maximum(cap[struct_arcs], 1e-4)
            lap = csr_matrix(
                (np.r_[weights, weights], (np.r_[aa, bb], np.r_[bb, aa])),
                shape=graph.shape,
            )
            mat = diags(np.asarray(lap.sum(axis=1)).ravel()) - lap
            rhs = -(
                mat[internal]
                @ np.where(np.isin(np.arange(interior), internal), 0, values)
            )
            curve = spsolve(mat[internal][:, internal].tocsc(), rhs)
            values[internal] = np.floor(curve + 0.5).astype(np.int32)
    delta = np.abs(values[a] - values[b])
    if np.any(delta > cap):
        # Zero-budget sub-metre splits can touch a structure. Project precisely
        # on the same integer graph after filling these rare boundary stations.
        values = fit_profile(
            graph, values, np.ones(interior, bool), np.zeros(interior, bool)
        )
        delta = np.abs(values[a] - values[b])
    if np.any(delta > cap):
        raise ValueError("Road profile exceeds its slope cap")
    verify_finished(rows, values[ids], offsets, ds, lifts)
    residual = (
        np.abs(values[boundary_ids] * 0.1 - raw[boundary_ids])
        if len(boundary_ids)
        else np.zeros(1)
    )
    print(
        f"{n_edges:,} roads, {ds.sum() / 1000:,.1f} km, {len(ids):,} stations. "
        f"Max grade {100 * (delta * 0.1 / ds).max():.2f}%. "
        f"{len(boundary_ids):,} boundary nodes, datum residual p95 {np.percentile(residual, 95):.2f} m, "
        f"max {residual.max():.2f} m. Missing DEM stations: {missing.sum():,}.",
        flush=True,
    )
    return values[ids], offsets


def save(rows, values, offsets, out, roads):
    tiles = defaultdict(dict)
    for i, row in enumerate(rows):
        coords = row[6]
        x, y = coords[::2], coords[1::2]
        # The bounding rectangle includes every crossed quarter-degree tile and
        # a ~30 m buffer. OSM edges are already split at <=1.8 km intervals.
        profile = values[offsets[i] : offsets[i + 1]].tolist()
        for tx in range((min(x) - 30) // 25000, (max(x) + 30) // 25000 + 1):
            for ty in range((min(y) - 30) // 25000, (max(y) + 30) // 25000 + 1):
                tiles[f"{tx}_{ty}"][row[0]] = profile
    out.mkdir(parents=True, exist_ok=True)
    manifest = out / "index.json"
    previous = json_file(manifest)["tiles"] if manifest.exists() else []
    with TemporaryDirectory(prefix=".pass-roads-", dir=out.parent) as tmp:
        stage = Path(tmp)
        for k, data in sorted(tiles.items()):
            payload = json.dumps(data, separators=(",", ":")).encode()
            (stage / (k + ".json.gz")).write_bytes(gzip.compress(payload, 6, mtime=0))
        (stage / "index.json").write_text(
            json.dumps(
                dict(grid=4, tiles=sorted(tiles), sourceSha256=roads["sourceSha256"]),
                separators=(",", ":"),
            )
            + "\n",
            encoding="ascii",
        )
        for p in stage.glob("*.json.gz"):
            p.replace(out / p.name)
        (stage / "index.json").replace(manifest)
    stale = set(previous) - set(tiles)
    for p in out.glob("*.json.gz"):
        if p.name.removesuffix(".json.gz") in stale:
            p.unlink()


def build(work, out, workers, lifts):
    roads = json_file(ROOT / "vn-roads/index.json")
    grid, mask, x, y = prepare_rasters(roads, work, workers)
    keys = graph_tiles(roads)
    edges = classify(roads, keys, mask, x, y)
    print(
        f"Checked {len(edges):,} unique OSM edges; {edges[:, 4].sum():,} mountain or named pass edges, "
        f"{edges[:, 5].sum():,} explicit pass edges.",
        flush=True,
    )
    selected, structures, boundary = approach_scope(edges, lifts, workers)
    del edges
    rows = collect(roads, keys, selected)
    print(
        f"Profiling {len(rows):,} edges including {len(structures):,} bridge/tunnel edges.",
        flush=True,
    )
    values, offsets = profile_network(rows, structures, boundary, grid, work, lifts)
    save(rows, values, offsets, out, roads)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cache", type=Path, help="Reuse the GEDTM30 blocks from build_city_terrain.py"
    )
    parser.add_argument("--output", type=Path, default=ROOT / "pass-road-grades")
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument(
        "--offsets",
        type=Path,
        help="Optional signed solver export from audit_road_profiles.mjs",
    )
    args = parser.parse_args()
    with TemporaryDirectory(prefix="vivu-pass-grades-") as tmp:
        work = args.cache or Path(tmp)
        work.mkdir(parents=True, exist_ok=True)
        try:
            source = args.offsets or Path(tmp) / "solver-offsets.json.gz"
            if args.offsets is None:
                subprocess.run(
                    [
                        "node",
                        "--max-old-space-size=8192",
                        str(Path(__file__).with_name("audit_road_profiles.mjs")),
                        "--offsets=" + str(source.resolve()),
                    ],
                    check=True,
                )
            lifts = {int(key): value for key, value in compressed(source).items()}
            build(work, args.output, args.workers, lifts)
        finally:
            dem.source_block.cache_clear()
