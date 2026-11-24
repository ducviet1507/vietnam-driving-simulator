import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {gunzipSync} from 'node:zlib';

const dist=new URL('../../dist/',import.meta.url);
const T=createRequire(import.meta.url)('../../dist/three.min.js');
const context={URLSearchParams,location:{search:'?weather=after-rain'},matchMedia:()=>({matches:false}),
  document:{querySelectorAll:()=>[]},localStorage:{getItem:()=>null}};
for(const name of ['mapped-farmland','driving-weather']){
  runInNewContext(readFileSync(new URL(name+'.js',dist),'utf8'),context);
}
const index=JSON.parse(readFileSync(new URL('vn-farmland/index.json',dist)));
const ids=new Map(),counts={};
for(const key of index.tiles){
  const rows=JSON.parse(gunzipSync(readFileSync(new URL('vn-farmland/'+key+'.gz',dist))));
  for(const feature of context.decodeFarmTile(key,rows,index.grid,index.scale)){
    const name=feature.kind+feature.id;
    const bounds=[feature.west,feature.south,feature.right,feature.top];
    if(ids.has(name))assert.deepEqual(ids.get(name),bounds,'tile seam '+name);
    else{ids.set(name,bounds);counts[feature.kind]=(counts[feature.kind]||0)+1;}
  }
}
assert.deepEqual(counts,index.counts);
assert.ok(ids.has('canalw225755936')&&ids.has('bridgew1576300681'),'Cờ Đỏ irrigation crossing');
assert.ok(index.inferredTerraceWays.every(id=>ids.has('terracew'+id)));

function finish(generator){
  let step;
  do{step=generator.next();}while(!step.done);
  return step.value;
}
const ring=(x0,z0,x1,z1)=>[[x0,z0],[x0,z1],[x1,z1],[x1,z0]].map(([x,z])=>({x,z}));
const material=new T.MeshStandardMaterial(),group=new T.Group();
const terrace=finish(context.buildRiceTerraces(T,{group,material,cx:0,cz:0,reach:80,
  ground:(x,z)=>x*.16+z*.04,blocked:()=>false,
  features:[{kind:'terrace',parts:[ring(0,0,32,32),ring(12,12,22,22)]}]}));
assert.ok(terrace(6,5)>0);
assert.equal(terrace(16,16),null,'parcel hole');
assert.equal(terrace(-1,5),null,'beyond parcel boundary');
assert.ok(terrace(27,5)>terrace(6,5)+2,'terraces rise across the slope');
assert.ok(group.children[0].geometry.attributes.position.array.every(Number.isFinite));

const bridgeInputs={group,features:[{kind:'bridge',id:'w1',parts:[[{x:-6,z:0},{x:0,z:1},{x:6,z:0}]]}],
  existingBridge:()=>false,material:{concrete:material},ground:()=>1,cx:0,cz:0,reach:80};
const deck=finish(context.buildFarmEdges(T,bridgeInputs));
assert.ok(deck(0,1)>1);
assert.equal(deck(0,3),null);
assert.equal(finish(context.buildFarmEdges(T,{...bridgeInputs,existingBridge:()=>true})),null);

const scene=new T.Scene(),camera=new T.PerspectiveCamera();scene.fog=new T.FogExp2();
const weather=context.createDrivingWeather(T,scene,new T.DirectionalLight(),material);
weather.render(camera,16);
weather.render(camera,90016);
const {asphalt,pools,eaves,soil}=weather.moisture;
assert.equal(weather.rainfall,0);
assert.ok(eaves.value<asphalt.value&&asphalt.value<pools.value&&pools.value<soil.value);
assert.ok(eaves.value>0&&soil.value<.93,'residual moisture evaporates');
console.log('PASS nationwide field counts and seams, terrace holes, bridge contact, after-rain drying');
