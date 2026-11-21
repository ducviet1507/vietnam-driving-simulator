import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';

const T=createRequire(import.meta.url)('../../dist/three.min.js');
const world={worldRoadHalfWidth:edge=>edge.traffic.lanes*1.6};
world.window=world;
for(const file of ['world-road-traffic','tunnel-mesh'])
  runInNewContext(readFileSync(new URL('../../dist/'+file+'.js',import.meta.url),'utf8'),world);
const graph={nodes:new Map(),tunnels:{info:edge=>edge.profile}};
const material={asphalt:new T.MeshLambertMaterial(),roadConcrete:new T.MeshLambertMaterial()};
function edge(id,start,end,ax,bx,z,{name='Hầm chui',lanes=2,bore=true,kind='trunk',oneway=false,raw={}}={}){
  const length=Math.abs(bx-ax);
  const e={id,start,end,name,kind,oneway,length,points:[{x:ax,z},{x:bx,z}],dist:[0,length],
    traffic:{lanes,tunnel:bore,...raw},profile:{bore,ranges:[[0,length]]}};
  for(const node of [start,end]){
    if(!graph.nodes.has(node))graph.nodes.set(node,[]);
    graph.nodes.get(node).push(e);
  }
  return e;
}
function render(edges,options={}){
  const group=new T.Group(),hits=[];
  const portals=world.buildTunnelMeshes(T,{graph,edges,cx:0,cz:0,radius:230,group,material,
    height:()=>-5,ground:()=>0,registerObstacle:o=>hits.push(o),...options});
  for(const m of group.children){
    for(const attr of Object.values(m.geometry.attributes))assert.ok(attr.array.every(Number.isFinite));
  }
  assert.ok(hits.every(o=>Number.isFinite(o.baseY+o.height+o.x+o.z)));
  return {group,hits,portals:Array.from(portals).sort()};
}
const approach=edge(1,1,2,-100,-50,0,{bore:false}),inbound=edge(2,2,3,-50,0,0);
const outbound=edge(3,3,4,0,60,0),exit=edge(4,4,5,60,125,0,{bore:false});
approach.profile.ranges=[[20,50]];exit.profile.ranges=[[0,30]];
const result=render([approach,inbound,outbound,exit]);
assert.deepEqual(result.portals,[2,4]);
assert.deepEqual(render([outbound]).portals,[4],'streaming an adjacent tunnel edge out of view creates no portal');
assert.equal(result.group.children.length,3,'dedicated batches for lining, pavement and lights');
const floor=result.group.children.find(o=>o.name==='Tunnel carriageways');
floor.geometry.computeBoundingBox();
assert.equal(floor.geometry.boundingBox.min.x,-80,'only the mapped depressed part of the first approach is rebuilt');
assert.equal(floor.geometry.boundingBox.max.x,90,'the ramp terminates at the undisturbed street');
assert.ok(result.hits.some(h=>h.id.startsWith('trench:1:')&&h.baseY===-5));

const motor=edge(5,11,12,-90,90,38,{name:'Hầm Sông Sài Gòn',oneway:true,raw:{surface:'concrete'}});
const bike=edge(6,13,14,-90,90,42.8,{name:'Hầm Sông Sài Gòn',oneway:true,lanes:1});
const reverse=edge(7,15,16,90,-90,28,{name:'Hầm Sông Sài Gòn',oneway:true});
graph.tunnels.portal=()=>false;
const twin=render([motor,bike,reverse]);
assert.ok(twin.group.children.some(o=>o.material===material.roadConcrete));
assert.ok(!twin.hits.some(h=>h.z>38&&h.z<42.8),'motor and motorcycle ways share a chamber');
assert.ok(twin.hits.some(h=>h.z>28&&h.z<38),'opposing tubes retain their dividing wall');
assert.ok(twin.hits.some(h=>h.z>43),'shared chamber has an outer wall');
assert.equal(world.tunnelSection(motor,graph).box,true);
assert.equal(world.tunnelSection({...inbound,name:'Hầm Hải Vân'},graph).crown,7.5);

const passage=edge(8,21,22,-20,20,-30);
passage.profile.passage=true;passage.profile.clearance=3.6;
graph.tunnels.portal=node=>node===21||node===22;
assert.deepEqual(render([passage]).portals,[],'building passages use an open-ended flat soffit without tunnel headwalls');
assert.equal(world.tunnelSection(passage,graph).wall,3.6);
console.log('Tunnel portals, open approach intervals, shared bores, mapped surfaces and physical clearance passed.');
