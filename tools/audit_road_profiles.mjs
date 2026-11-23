// node --max-old-space-size=8192 tools/audit_road_profiles.mjs [report.json]
// Run the shipped bridge and tunnel solvers on the joined offline graph.
// One common projection preserves crossings and graph connectivity. Heights are
// the simulator's offsets above/below its base surface, not surveyed deck grades.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {gunzipSync} from 'node:zlib';

const dist = new URL('../dist/', import.meta.url);
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
      let length = 0;
      for (let i = 2; i < xy.length; i += 2) {
        length += Math.hypot((xy[i] - xy[i-2]) / 1e5 * graph.mx, (xy[i+1] - xy[i-1]) / 1e5 * graph.my);
      }
      edge = {id, start, end, length};
    }
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
    let lastS = 0, lastH = solver.lift(edge, 0);
    for (const s of [...offsets].sort((a, b) => a - b)) {
      const height = solver.lift(edge, s);
      assert.ok(Number.isFinite(height) && (kind === 'bridge' ? height >= 0 : height <= 0), 'Profile offset ' + id);
      assert.ok(Math.abs(height - lastH) <= grade * (s - lastS) + 1e-5, 'Profile grade ' + id);
      lastH = height; lastS = s; counts.offsetChecks++;
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
console.log(JSON.stringify(report, null, 2));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n');
