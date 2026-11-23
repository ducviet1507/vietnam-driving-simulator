// node --max-old-space-size=8192 tools/audit_road_profiles.mjs [report.json] [--offsets=profiles.json.gz]
// Run the shipped bridge and tunnel solvers on the joined offline graph.
// One common projection preserves crossings and graph connectivity. Heights are
// the simulator's offsets above/below its base surface, not surveyed deck grades.
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {gunzipSync, gzipSync} from 'node:zlib';

const dist = new URL('../dist/', import.meta.url);
const args = process.argv.slice(2);
const offsetsFile = args.find(a => a.startsWith('--offsets='))?.slice('--offsets='.length);
const reportFile = args.find(a => !a.startsWith('--'));
function asset(path) {
  const bytes = readFileSync(new URL(path, dist));
  return JSON.parse(path.endsWith('.gz') ? gunzipSync(bytes) : bytes);
}
const world = {VietnamRoadWidths: new Map()};
world.window = world;
for (const name of ['bridge-signatures', 'bridge-profiles', 'tunnel-profiles', 'world-roads']) {
  runInNewContext(readFileSync(new URL(name + '.js', dist), 'utf8'), world);
}
const graph = Object.assign(Object.create(runInNewContext('VietnamRoads.prototype', world)), {
  edges: new Map(), nodes: new Map(), visitorEdges: new Set(), lon: 106, lat: 16,
  mx: 111320 * Math.cos(16 * Math.PI / 180), my: 110900
});
const roads = asset('vn-roads/index.json');
const traffic = asset('vn-traffic/index.json');
const bridges = asset('vn-bridges/details.json');
const tunnels = asset('vn-traffic/tunnels.json');
for (const index of [traffic, bridges, tunnels]) assert.equal(index.graphSourceSha256, roads.sourceSha256);
const extra = new Set(roads.sightAccess.tiles), only = new Set(roads.sightAccess.only);
const keys = [...new Set([...roads.tiles.filter(k => !roads.splits[k]), ...roads.subtiles, ...only])];
const enriched = new Set(traffic.tiles);
const counts = {bridgeDecks: 0, tunnelBores: 0, buildingPassages: 0, bridgeApproaches: 0,
  tunnelApproaches: 0, partialApproaches: 0, endpointsChecked: 0, offsetChecks: 0};

for (const key of keys) {
  const tags = enriched.has(key) ? asset('vn-traffic/' + key + '.gz') : {};
  const rows = only.has(key) ? [] : asset('vn-roads/' + key + '.gz');
  if (extra.has(key)) rows.push(...asset('vn-access/' + key + '.gz'));
  for (const row of rows) {
    const [id, start, end, , , , xy] = row;
    if (graph.edges.has(id)) continue;
    const meta = tags[id];
    const metreX = 111320 * Math.cos(xy[1] / 1e5 * Math.PI / 180) / 1e5;
    const metreY = graph.my / 1e5;
    let length = 0;
    let edge;
    if (meta?.bridge || meta?.tunnel) {
      assert.ok(Number.isSafeInteger(start) && Number.isSafeInteger(end), 'Invalid nodes on ' + id);
      assert.ok(xy.length >= 4 && xy.length % 2 === 0 && xy.every(Number.isSafeInteger), 'Invalid geometry on ' + id);
      edge = graph.decodeEdge(row);
      assert.ok(edge && Number.isFinite(edge.length) && edge.length >= .5, 'Invalid length on ' + id);
      edge.traffic = meta;
      if (meta.bridge) counts.bridgeDecks++;
      else counts.tunnelBores++;
    } else {
      // The grade solvers only require connectivity and length on adjacent ground roads.
      edge = {id, start, end, length};
    }
    // Keep one map projection for intersections; measure each polyline locally
    // as the player does when loading a district centred on that road.
    const lengths = edge.points ? [0] : null;
    for (let i=2; i<xy.length; i+=2) {
      const step = Math.hypot((xy[i]-xy[i-2])*metreX, (xy[i+1]-xy[i-1])*metreY);
      if (step<.1) continue;
      length += step;
      if (lengths) lengths.push(length);
    }
    edge.length = length;
    if (lengths) { assert.equal(lengths.length, edge.points.length); edge.dist = lengths; }
    graph.edges.set(id, edge);
    for (const node of [start, end]) {
      if (!graph.nodes.has(node)) graph.nodes.set(node, []);
      graph.nodes.get(node).push(edge);
    }
  }
}
assert.equal(counts.bridgeDecks, traffic.edgesByAttribute.bridge);
assert.equal(counts.tunnelBores, traffic.edgesByAttribute.tunnel);
for (const id of Object.keys(bridges.edges)) assert.ok(graph.edges.get(+id)?.traffic?.bridge, 'Bridge metadata ' + id);
for (const id of tunnels.passages) assert.ok(graph.edges.get(id)?.traffic?.tunnel, 'Passage metadata ' + id);
const portalCoordinates = new Set();
for (const edge of graph.edges.values()) {
  if (!edge.traffic?.tunnel) continue;
  for (const [node, point] of [[edge.start, edge.points[0]], [edge.end, edge.points.at(-1)]]) {
    if (Object.hasOwn(tunnels.inside, node)) continue;
    const [lon, lat] = graph.geo(point.x, point.z);
    portalCoordinates.add(Math.round(lon * 1e5) + ',' + Math.round(lat * 1e5));
  }
}
for (const [node, anchors] of Object.entries(tunnels.inside)) {
  assert.ok(graph.nodes.get(+node)?.some(e => e.traffic?.tunnel), 'Interior tunnel node ' + node);
  assert.ok([3, 6].includes(anchors.length) && anchors.every(Number.isFinite), 'Tunnel anchor ' + node);
  for (let i = 0; i < anchors.length; i += 3) {
    assert.ok(portalCoordinates.has(anchors[i] + ',' + anchors[i + 1]), 'Unmapped tunnel portal ' + node);
    assert.ok(anchors[i + 2] >= 0, 'Tunnel portal distance ' + node);
  }
}
graph.bridges = world.buildBridgeProfiles(graph, bridges.edges);
graph.tunnels = world.buildTunnelProfiles(graph, tunnels);
const checkedNodes = new Set();
const report = {tiles: keys.length, uniqueEdges: graph.edges.size, graphNodes: graph.nodes.size,
  tunnelInteriorNodes: Object.keys(tunnels.inside).length, counts};
// A mountain formation supplies the base of a deck or ramp. Check its total
// gradient separately from the rise/depression generated by the profile solver.
const passHeights = new Map();
if (existsSync(new URL('pass-road-grades/index.json', dist))) {
  const index = asset('pass-road-grades/index.json');
  assert.equal(index.sourceSha256, roads.sourceSha256);
  for (const key of index.tiles) {
    for (const [id, values] of Object.entries(asset('pass-road-grades/' + key + '.json.gz'))) {
      const n = Number(id);
      if (graph.bridges.profiles.has(n) || graph.tunnels.profiles.has(n)) passHeights.set(n, values);
    }
  }
}
const combined = {};
const exported = {};
for (const [kind, solver] of [['bridge', graph.bridges], ['tunnel', graph.tunnels]]) {
  for (const [id, profile] of solver.profiles) {
    const edge = graph.edges.get(id);
    const span = kind === 'bridge' ? profile.bridge : profile.bore;
    if (kind === 'tunnel' && profile.passage) counts.buildingPassages++;
    if (!span) counts[kind + 'Approaches']++;
    assert.ok(span === Boolean(kind === 'bridge' ? edge.traffic?.bridge : edge.traffic?.tunnel), 'Profile classification ' + id);
    assert.ok(profile.ranges.length, 'Missing range on ' + id);
    let coverage = 0, previous = 0;
    const offsets = new Set([0, edge.length / 2, edge.length]);
    for (const [a, b] of profile.ranges) {
      assert.ok(Number.isFinite(a) && Number.isFinite(b) && a >= previous && b >= a && b <= edge.length, 'Invalid range ' + id);
      coverage += b - a;
      previous = b;
      offsets.add(a); offsets.add(b); offsets.add((a + b) / 2);
    }
    if (span) assert.ok(Math.abs(coverage - edge.length) < 1e-6, 'Incomplete deck/bore ' + id);
    else if (coverage < edge.length - 1e-6) counts.partialApproaches++;
    const grade = profile.grade ?? (kind === 'bridge' ? .095 : .075);
    const pass = passHeights.get(id);
    if (pass || offsetsFile) {
      const curve = new Set([0, edge.length]);
      for (const [lo, hi] of profile.ranges) { curve.add(lo); curve.add(hi); }
      // Every kink of the max/min solver envelope is a line intersection.
      const lines = [[0, 0], [profile.start, -grade], [profile.end - edge.length*grade, grade]];
      if (span) lines.push([profile.top, 0], [profile.start, grade], [profile.end + edge.length*grade, -grade]);
      for (const [a, b] of lines) for (const [c, d] of lines) {
        const s = (a-c)/(d-b);
        if (s > 0 && s < edge.length) curve.add(s);
      }
      for (const s of curve) offsets.add(s);
      if (offsetsFile) {
        const knots = [];
        for (const s of [...curve].sort((a,b) => a-b)) {
          const p=[s/edge.length, solver.lift(edge,s)];
          const last=knots.at(-1);
          if (last && Math.abs(p[0]-last[0]) < 1e-12) { knots[knots.length-1]=p; continue; }
          if (knots.length>=2) {
            const first=knots.at(-2);
            const h=first[1]+(p[1]-first[1])*(last[0]-first[0])/(p[0]-first[0]);
            if (Math.abs(h-last[1])<1e-8) knots.pop();
          }
          knots.push(p);
        }
        exported[id] = {kind:kind + (span ? 'Span' : 'Approach'), grade, knots};
      }
    }
    if (pass) {
      const step = edge.length / (pass.length - 1);
      for (let i = 0; i < pass.length; i++) offsets.add(Math.min(edge.length, i*step));
    }
    let lastS = 0, lastH = solver.lift(edge, 0);
    let lastTotal = pass ? pass[0] * .1 + lastH : 0, peak = 0;
    for (const s of [...offsets].sort((a, b) => a - b)) {
      const height = solver.lift(edge, s);
      assert.ok(Number.isFinite(height) && (kind === 'bridge' ? height >= 0 : height <= 0), 'Profile offset ' + id);
      assert.ok(Math.abs(height - lastH) <= grade * (s - lastS) + 1e-5, 'Profile grade ' + id);
      if (pass) {
        const pos = s / edge.length * (pass.length-1), k = Math.min(pass.length-2, Math.floor(pos));
        const total = height + .1*(pass[k] + (pass[k+1]-pass[k])*(pos-k));
        if (s-lastS > 1e-6) peak = Math.max(peak, Math.abs(total-lastTotal)/(s-lastS)*100);
        lastTotal = total;
      }
      lastH = height; lastS = s; counts.offsetChecks++;
    }
    if (pass) {
      const key = kind + (span ? 'Span' : 'Approach');
      const stats = combined[key] ??= {edges: 0, above12Percent: 0, peakPercent: 0, peakEdge: null};
      stats.edges++;
      if (peak > 12.001) stats.above12Percent++;
      if (peak > stats.peakPercent) { stats.peakPercent = peak; stats.peakEdge = id; }
    }
    for (const node of [edge.start, edge.end]) {
      if (checkedNodes.has(node)) continue;
      checkedNodes.add(node);
      const values = graph.nodes.get(node).map(adj => graph.roadLevel(adj, adj.start === node ? 0 : adj.length));
      assert.ok(Math.max(...values) - Math.min(...values) < 1e-5, 'Discontinuous endpoint ' + node);
      counts.endpointsChecked += values.length;
    }
  }
}
assert.equal([...graph.bridges.profiles.values()].filter(p => p.bridge).length, counts.bridgeDecks);
assert.equal([...graph.tunnels.profiles.values()].filter(p => p.bore).length, counts.tunnelBores);
assert.equal(counts.buildingPassages, tunnels.passages.length);
report.nodesWithProfiles = checkedNodes.size;
if (passHeights.size) report.combinedMountainGrades = combined;
console.log(JSON.stringify(report, null, 2));
if (reportFile) writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
if (offsetsFile) writeFileSync(offsetsFile, gzipSync(JSON.stringify(exported)));
