import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const ctx={worldRoadHalfWidth:()=>4};
ctx.window=ctx;
for(const file of ['bridge-profiles','tunnel-profiles','tunnel-mesh','world-roads'])
  runInNewContext(readFileSync(new URL('../../dist/'+file+'.js',import.meta.url),'utf8'),ctx);
const manifest=JSON.parse(readFileSync(new URL('../../dist/vn-traffic/tunnels.json',import.meta.url)));
const roadIndex=JSON.parse(readFileSync(new URL('../../dist/vn-roads/index.json',import.meta.url)));
assert.equal(manifest.graphSourceSha256,roadIndex.sourceSha256);
// Hải Vân crosses streaming boundaries. An interior routing vertex is tied to
// two remote mouths and must never become the top of the mountain or a portal.
const anchors=manifest.inside[-2823];
assert.equal(anchors.length,6);
assert.ok(anchors[2]>1000&&anchors[5]>1000);
assert.ok(manifest.passages.includes(3877725)); // Bách khoa building passage
const graph=Object.assign(Object.create(runInNewContext('VietnamRoads.prototype',ctx)),{
  edges:new Map(),nodes:new Map(),point:(x,z)=>({x,z}),tunnelData:null
});
function road(id,start,end,x,z,xx,zz,bore=false){
  const length=Math.hypot(xx-x,zz-z),edge={id,start,end,kind:'primary',traffic:{tunnel:bore},
    points:[{x,z},{x:xx,z:zz}],dist:[0,length],length};
  graph.edges.set(id,edge);
  for(const node of [start,end]){
    if(!graph.nodes.has(node))graph.nodes.set(node,[]);
    graph.nodes.get(node).push(edge);
  }
  return edge;
}
const approach=road(1,1,2,-300,0,-90,0),inbound=road(2,2,3,-90,0,0,0,true);
const outbound=road(3,3,4,0,0,90,0,true),exit=road(4,4,5,90,0,300,0);
const above=road(5,6,7,0,-60,0,60),passage=road(6,8,9,0,100,30,100,true);
graph.bridges=ctx.buildBridgeProfiles(graph);
graph.tunnels=ctx.buildTunnelProfiles(graph,{inside:{3:[-9000000,0,90,9000000,0,90]},passages:[6]});
const lift=(e,s)=>graph.roadLevel(e,s);
assert.equal(lift(approach,0),0);
assert.equal(lift(approach,approach.length),lift(inbound,0));
assert.equal(lift(outbound,outbound.length),lift(exit,0));
assert.equal(lift(passage,10),0);
assert.equal(graph.tunnels.portal(3),false);
assert.equal(graph.tunnels.portal(2),true);
const terrain=(x,z)=>Math.max(0,80-Math.abs(x)-Math.abs(z));
const zone=ctx.createTunnelDistrict(graph,[...graph.edges.values()],terrain);
assert.ok(zone.height(inbound,inbound.length)<-5);
assert.equal(zone.height(inbound,inbound.length),zone.height(outbound,0));
assert.equal(zone.at(0,0,above),null);
assert.equal(graph.nearest(0,0,graph.edges.values(),0).edge.id,above.id);
assert.ok([inbound,outbound].includes(graph.nearest(0,0,graph.edges.values(),-6.8).edge));
const west=road(7,10,11,0,500,250,500),river=road(8,11,12,250,500,1350,500,true);
road(9,12,13,1350,500,1580,500);
river.name='Hầm Sông Sài Gòn';
graph.tunnels=ctx.buildTunnelProfiles(graph,{inside:{},passages:[]});
assert.equal(lift(river,550),-24);
assert.ok(Math.abs(lift(river,80)-lift(river,0)+80*.04)<1e-8);
assert.equal(lift(river,0),lift(west,250));
assert.ok(Math.abs(lift(west,250)-lift(west,150)+100*.04)<1e-8);
console.log('Tunnel portals, mountain profiles, ramp seams, surface-road separation and building passages passed.');
