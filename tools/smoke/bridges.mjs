import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';

const world={window:{},worldRoadHalfWidth:edge=>edge.testWidth??4};
for(const file of ['bridge-profiles','world-roads']){
  runInNewContext(readFileSync(new URL('../../dist/'+file+'.js',import.meta.url),'utf8'),world);
}
const proto=runInNewContext('VietnamRoads.prototype',world);
// Crossing a rear tile boundary must keep both the edges and their solved
// deck heights alive. A failed speculative tile must never block the road.
{
  const ctx={performance,RoadTileCodec:{roadRows:()=>()=>{}},buildBridgeProfiles:()=>({}),buildTunnelProfiles:()=>({})};
  runInNewContext(readFileSync(new URL('../../dist/world-roads.js',import.meta.url),'utf8'),ctx);
  const Roads=runInNewContext('VietnamRoads',ctx),r=new Roads({tiles:[]},0,0);
  let required=['a','b'],buffered=['a','b','c'];
  r.tileKeys=(_lon,_lat,radius)=>radius===.034?buffered:required;
  r.tile=async key=>{if(key==='offline')throw Error('offline');return {rows:[]};};
  await r.load(0,0);
  const bridges=r.bridges;
  required=['b','c'];await r.load(0,0);
  assert.equal(r.bridges,bridges);
  required=['d'];buffered=['d','offline'];await r.load(0,0);
  assert.deepEqual([...r.loadedKeys],['d']);
  await r.load(0,0,true);
  assert.equal(r.wide,true);
  required=[];await r.load(0,0);
  assert.equal(r.loadedKeys.size,0);
}
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

// At a shallow crossing, a car in either lane can be closer to the other
// road's centreline. It stays on its own surface in both directions.
graph.tunnels={info:()=>null};
graph.bridges=world.buildBridgeProfiles(graph,{2:{terrainLift:.8}});
assert.equal(graph.nearest(0,3,[span,below],.8).edge.id,below.id);
assert.equal(graph.nearest(3,0,[span,below],0).edge.id,span.id);
assert.equal(graph.drivingRoad(0,3,[span,below],span,.8).edge.id,span.id);
assert.equal(graph.drivingRoad(3,0,[span,below],below,0).edge.id,below.id);
assert.equal(graph.drivingRoad(0,4.4,[span,below],span,.8).edge.id,span.id);
assert.equal(graph.drivingRoad(0,5,[span,below],span,.8).edge.id,below.id);
assert.equal(graph.drivingRoad(31,0,[span,outgoing],span,.8).edge.id,outgoing.id);
const narrow=edge(10,15,16,-50,22,50,22);narrow.testWidth=1;
const wide=edge(11,17,18,-50,20,50,20);
assert.equal(graph.drivingRoad(0,23.5,[narrow,wide],wide,0).edge.id,wide.id);
// Multiple short approach edges ending at a real surface junction stay
// continuous even when that junction is too close to reach nominal clearance.
const short=edge(6,4,9,190,0,205,0,true),next=edge(7,9,10,205,0,214,0);
edge(8,10,11,214,0,230,0);edge(9,10,12,214,0,214,30);
graph.bridges=world.buildBridgeProfiles(graph);
assert.equal(graph.bridges.lift(next,next.length),0);
assert.equal(graph.bridges.lift(short,short.length),graph.bridges.lift(next,0));
assert.ok(graph.bridges.lift(short,short.length)<=next.length*.095+.0001);

// The two northbound decks at Nga Ba Hue split at a shallow angle. Their
// running lanes still overlap well beyond the common node's painted apron.
const T=createRequire(import.meta.url)('../../dist/three.min.js');
const meshWorld={};meshWorld.window=meshWorld;
for(const file of ['world-scene','world-road-traffic','guardrail-clearance','bridge-mesh']){
  runInNewContext(readFileSync(new URL('../../dist/'+file+'.js',import.meta.url),'utf8'),meshWorld);
}
const tile=dir=>JSON.parse(gunzipSync(readFileSync(new URL('../../dist/'+dir+'/432_64_2_0.gz',import.meta.url))));
const junction=Object.assign(Object.create(proto),{lon:108.17947,lat:16.06207,my:110900,
  mx:111320*Math.cos(16.06207*Math.PI/180),visitorEdges:new Set(),nodes:new Map()});
const ids=[347384,3658763,3658850],traffic=tile('vn-traffic');
const roads=tile('vn-roads').filter(r=>ids.includes(r[0])).map(row=>{
  const e=junction.decodeEdge(row);e.traffic=traffic[e.id];
  for(const node of [e.start,e.end]){
    if(!junction.nodes.has(node))junction.nodes.set(node,[]);
    junction.nodes.get(node).push(e);
  }
  return e;
});
assert.equal(roads.length,3);
junction.nearby=()=>roads;
const ramp=roads.find(e=>e.id===347384),main=roads.find(e=>e.id===3658763);
function renderRails(cx,cz,otherY){
  const surfaces=roads.flatMap(source=>source.points.slice(1).map((b,i)=>{
    const a=source.points[i],len=source.dist[i+1]-source.dist[i];
    return {ax:a.x-cx,az:a.z-cz,bx:b.x-cx,bz:b.z-cz,fx:(b.x-a.x)/len,fz:(b.z-a.z)/len,
      len,w:meshWorld.worldRoadHalfWidth(source),source,station:source.dist[i]};
  }));
  const group=new T.Group(),hits=[];
  const steps=meshWorld.buildBridgeMeshSteps(T,{edges:[ramp],graph:junction,cx,cz,radius:240,group,
    material:{asphalt:new T.MeshLambertMaterial()},ground:()=>0,height:()=>7,
    bridgeInfo:()=>({ranges:[[0,ramp.length]],bridge:true}),railRoads:()=>surfaces,
    roadHeight:s=>s.source===main?otherY:7,registerObstacle:o=>hits.push(o)});
  let slices=0;
  for(const _ of steps)slices++;
  assert.ok(slices>1,'yield during construction of the mapped bridge');
  group.updateMatrixWorld(true);
  return {group,hits:hits.filter(o=>o.id.startsWith('bridge:'))};
}
function checkFork(cx,cz){
  const joined=renderRails(cx,cz,7),stacked=renderRails(cx,cz,0);
  const retained=new Set(joined.hits.map(o=>o.id));
  const opened=stacked.hits.filter(o=>!retained.has(o.id));
  assert.ok(opened.length>0,'open the overlapping slip road at driving height');
  assert.ok(joined.hits.some(o=>o.id.startsWith('bridge:'+ramp.id+':1:'))&&
    joined.hits.some(o=>o.id.startsWith('bridge:'+ramp.id+':-1:')),'resume both parapets beyond the junction');
  for(const o of joined.hits)for(const t of [-1,0,1]){
    const x=o.x+cx+t*o.w*o.fx,z=o.z+cz+t*o.w*o.fz;
    const clearance=Math.sqrt(junction.nearest(x,z,[main]).error)-meshWorld.worldRoadHalfWidth(main);
    assert.ok(clearance>=o.d-.001,'keep the full rail outside the joining carriageway');
  }
  const railAt=(group,x,z)=>new T.Raycaster(new T.Vector3(x,9,z),new T.Vector3(0,-1,0),0,1.8)
    .intersectObject(group.getObjectByName('Bridge piers, rails and superstructures')).length>0;
  for(const o of opened){
    assert.ok(railAt(stacked.group,o.x,o.z),'retain the visible parapet above a lower road');
    assert.ok(!railAt(joined.group,o.x,o.z),'remove the visible parapet with its collider');
  }
  return opened.map(o=>o.id);
}
assert.deepEqual(checkFork(0,0),checkFork(83,-41),'opening is stable across district origins');

// Suppress generic piers along the full routed Nhật Lệ 1 deck. The older
// 260 m model covered only the middle of the crossing.
const nhatLeContext={window:{}};
runInNewContext(readFileSync(new URL('../../dist/sights-cau-nhat-le.js',import.meta.url),'utf8'),nhatLeContext);
const nhatLe=nhatLeContext.window.VietnamSights[0];
world.window.VietnamLandmarks={entries:[nhatLe]};
const dongHoi=Object.assign(Object.create(proto),{lon:nhatLe.lon,lat:nhatLe.lat,my:110900,
  mx:111320*Math.cos(nhatLe.lat*Math.PI/180),visitorEdges:new Set(),footbridgeTiles:{}});
const sourceRows=JSON.parse(gunzipSync(readFileSync(new URL('../../dist/vn-roads/426_69_1_3.gz',import.meta.url))));
const crossing=dongHoi.decodeEdge(sourceRows.find(row=>row[0]===3498353));
const quay=dongHoi.decodeEdge(sourceRows.find(row=>row[0]===37323));
dongHoi.bridges={profiles:new Map([[crossing.id,{bridge:true}]])};
const quayside=world.createBridgeDistrict(dongHoi,[crossing,quay],0,0,()=>0);
for(const station of [0,crossing.length/2,crossing.length])assert.ok(quayside.authoredAt(crossing,station));
const parked=dongHoi.point(...nhatLe.start);
assert.ok(dongHoi.nearest(parked.x,parked.z,[quay]).error<4);
assert.ok(dongHoi.nearest(parked.x,parked.z,[crossing]).error>40**2);
// The small stone crossing and the neighbouring gate have different centres.
// The stone bridge covers its roadway. The visit starts beyond its east end.
for(const name of ['central-arch','sights-thanh-dong-hoi']){
  runInNewContext(readFileSync(new URL('../../dist/'+name+'.js',import.meta.url),'utf8'),nhatLeContext);
}
const eastBridge=nhatLeContext.window.VietnamSights.find(s=>s.id==='cau-da-cua-dong-dong-hoi');
world.window.VietnamLandmarks.entries.push(eastBridge);
const eastRoad=dongHoi.decodeEdge(sourceRows.find(r=>r[0]===313440));
dongHoi.bridges.profiles.set(eastRoad.id,{bridge:true});
const eastDistrict=world.createBridgeDistrict(dongHoi,[eastRoad],0,0,()=>0);
for(const fraction of [.01,.5,.99])assert.ok(eastDistrict.authoredAt(eastRoad,eastRoad.length*fraction));
const outside=dongHoi.point(...eastBridge.start);
assert.ok(dongHoi.nearest(outside.x,outside.z,[eastRoad]).error>2**2);
// Both carriageways of Nam Thanh meet the pavement beside the historic tablet.
// The adjacent arterial bridge still uses the standard deck profile.
const details=JSON.parse(readFileSync(new URL('../../dist/vn-bridges/details.json',import.meta.url),'utf8'));
const nearbyIds=[3487877,3487878,34637];
dongHoi.edges=new Map();dongHoi.nodes=new Map();
for(const id of nearbyIds){
  const road=dongHoi.decodeEdge(sourceRows.find(row=>row[0]===id));
  road.traffic={bridge:true};dongHoi.edges.set(id,road);
  for(const node of [road.start,road.end]){
    if(!dongHoi.nodes.has(node))dongHoi.nodes.set(node,[]);
    dongHoi.nodes.get(node).push(road);
  }
}
const decks=world.buildBridgeProfiles(dongHoi,details.edges);
for(const id of nearbyIds)assert.equal(decks.profiles.get(id).top,id===34637?6.8:.8);
console.log('Bridge decks, approaches, stacked crossings, Nga Ba Hue slip-road clearance and road tracking passed.');
