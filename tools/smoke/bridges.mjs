import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const world={window:{},worldRoadHalfWidth:()=>4};
for(const file of ['bridge-profiles','world-roads']){
  runInNewContext(readFileSync(new URL('../../dist/'+file+'.js',import.meta.url),'utf8'),world);
}
const proto=runInNewContext('VietnamRoads.prototype',world);
const graph=Object.assign(Object.create(proto),{edges:new Map(),nodes:new Map(),footbridgeTiles:{},lon:0,lat:0,mx:100000,my:100000});
function edge(id,start,end,x,z,xx,zz,bridge=false){
  const length=Math.hypot(xx-x,zz-z);
  const e={id,start,end,kind:'primary',points:[{x,z},{x:xx,z:zz}],dist:[0,length],length,traffic:{bridge}};
  graph.edges.set(id,e);
  for(const n of [start,end]){
    if(!graph.nodes.has(n))graph.nodes.set(n,[]);
    graph.nodes.get(n).push(e);
  }
  return e;
}
const incoming=edge(1,1,2,-190,0,-30,0),span=edge(2,2,3,-30,0,30,0,true);
const outgoing=edge(3,3,4,30,0,190,0),below=edge(4,5,6,0,-100,0,100);
const high=edge(5,7,8,-80,-80,80,80,true);
graph.bridges=world.buildBridgeProfiles(graph,{5:{layer:2}});
const {lift}=graph.bridges;
const upper=lift(span,30),top=lift(high,high.length/2);
assert.ok(upper>=6&&top-upper>=6);
for(const [level,expected] of [[0,below],[upper,span],[top,high]]){
  assert.equal(graph.nearest(0,0,graph.edges.values(),level).edge.id,expected.id);
}
assert.equal(lift(incoming,incoming.length),lift(span,0));
assert.equal(lift(span,span.length),lift(outgoing,0));
assert.equal(lift(incoming,0),0);
const district=world.createBridgeDistrict(graph,[...graph.edges.values()],0,0,()=>0);
assert.equal(district.at(0,0,span),upper);
assert.equal(district.at(0,0,below),null);
assert.equal(district.at(0,15,span),null);
const ground=world.bridgeGroundEdges(graph,[incoming,span,outgoing,below,high]);
assert.deepEqual(Array.from(ground,e=>e.id),[1,3,4]);
assert.ok(Math.abs(ground[0].points.at(-1).x-incoming.points[0].x-graph.bridges.profiles.get(1).ranges[0][0])<1e-7);
// Multiple short approach edges ending at a real surface junction stay
// continuous even when that junction is too close to reach nominal clearance.
const short=edge(6,4,9,190,0,205,0,true),next=edge(7,9,10,205,0,214,0);
edge(8,10,11,214,0,230,0);edge(9,10,12,214,0,214,30);
graph.bridges=world.buildBridgeProfiles(graph);
assert.equal(graph.bridges.lift(next,next.length),0);
assert.equal(graph.bridges.lift(short,short.length),graph.bridges.lift(next,0));
assert.ok(graph.bridges.lift(short,short.length)<=next.length*.095+.0001);
console.log('Bridge decks, approaches, stacked crossings and road tracking passed.');
