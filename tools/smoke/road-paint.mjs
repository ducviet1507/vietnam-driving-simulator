import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';

const T=createRequire(import.meta.url)('../../dist/three.min.js');
const world={};world.window=world;
for(const name of ['world-scene','world-road-traffic','bridge-mesh']){
  runInNewContext(readFileSync(new URL('../../dist/'+name+'.js',import.meta.url),'utf8'),world);
}
const edge={id:1,start:101,end:102,points:[{x:0,z:0},{x:0,z:-41}],length:41,dist:[0,41],
  kind:'primary',oneway:false,traffic:{lanes:3,forward:2,width:9,surface:'concrete:plates'},
  controls:[{s:20,node:1,flags:7,direction:1}]};
const half=world.worldRoadHalfWidth(edge),layout=world.roadLaneLayout(edge,half);
assert.equal(layout.divider,1);
assert.equal(world.roadLaneOffset({edge,dir:-1}),3);
assert.equal(world.roadLaneOffset({edge,dir:1}),0);
assert.equal(world.roadLaneOffset({edge,dir:1},true),3);
const paint=(road,from,to,options)=>{
  const marks=[];
  world.roadPaint(road,world.roadLaneLayout(road,half),half,from,to,(...args)=>marks.push(args),options);
  return marks;
};
const full=paint(edge,0,41,{controls:false});
const divider=full.filter(m=>m[4]==='yellow');
assert.ok(divider.length>0&&divider.every(m=>Math.abs((m[2]+m[3])/2+1.5)<1e-9));
const atBend=paint(edge,10.9,20.7,{controls:false}).filter(m=>m[4]==='yellow');
assert.deepEqual(atBend.map(m=>m.slice(0,2)),[[10.9,13.8],[20,20.7]]);
const controls=paint(edge,0,41,{lines:false});
assert.ok(controls.some(m=>m[0]===18.35&&m[1]===21.65));
assert.ok(controls.some(m=>Math.abs(m[0]-17.33)<.001&&m[2]>-1.5&&m[3]>4));
assert.ok(!controls.some(m=>m[0]>21.65));
const unmarked={...edge,traffic:{lanes:3},controls:[{s:20,flags:1}]};
assert.equal(world.roadLaneLayout(unmarked,half).divider,null);
assert.equal(world.roadLaneOffset({edge:unmarked,dir:1}),world.roadLaneOffset({edge:unmarked,dir:-1}));
assert.equal(paint(unmarked,0,41,{lines:false}).length,0);
const signal=world.roadControlAhead({sample:()=>({yaw:0})},{edge,s:10,dir:1},0,true);
assert.equal(signal.stopLineOffset,2.5);
assert.equal(world.roadSignalPhase(Math.PI/4,0),world.roadSignalPhase(5*Math.PI/4,0));
assert.notEqual(world.roadSignalPhase(Math.PI/4,0),world.roadSignalPhase(3*Math.PI/4,0));

const material={};
for(const finish of ['asphalt','earth','pavers','roadConcrete','roadSlabs','roadWood','roadMetal'])
  material[finish]=new T.MeshStandardMaterial();
for(const [tag,finish] of [['concrete','roadConcrete'],['concrete:plates','roadSlabs'],['wood','roadWood'],['metal','roadMetal'],
    ['soil','earth'],['paving_stones','pavers'],['asphalt','asphalt']]){
  const road={...edge,traffic:{...edge.traffic,surface:tag}};
  assert.equal(world.roadSurfaceClass(road),finish);
  if(finish==='earth'||finish==='roadWood'||finish==='roadMetal')assert.equal(paint(road,0,41,{controls:false}).length,0);
  const group=new T.Group(),graph={nodes:new Map([[101,[road]],[102,[road]]]),nearby:()=>[road]};
  world.buildBridgeMeshes(T,{edges:[road],graph,cx:0,cz:0,radius:100,group,material,height:()=>9,ground:()=>0,
    bridgeInfo:()=>({ranges:[[0,41]],bridge:true}),registerObstacle(){}});
  const deck=group.getObjectByName('Mapped bridge decks');
  assert.equal(deck.material,material[finish]);
  assert.ok(Array.from(deck.geometry.attributes.uv.array).every(Number.isFinite));
  assert.equal(Boolean(deck.geometry.attributes.carriageway),finish==='asphalt');
  const fascia=group.getObjectByName('Bridge fascia and markings').geometry.attributes.position;
  // Count vertices of the elevated crosswalk, away from edge stripes and lane lines.
  let zebra=0;
  for(let i=0;i<fascia.count;i++){
    if(Math.abs(fascia.getY(i)-9.028)<.001&&Math.abs(fascia.getZ(i)+18.35)<.001&&Math.abs(fascia.getX(i))<4)zebra++;
  }
  assert.ok(zebra>=6,'mapped crosswalk paint missing on '+finish);
}
console.log('PASS mapped road surfaces, directional lanes, signal stop bars and raised crossings');
