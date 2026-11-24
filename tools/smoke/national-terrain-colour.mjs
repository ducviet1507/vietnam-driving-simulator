import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';

const dist=new URL('../../dist/',import.meta.url),T=createRequire(import.meta.url)('../../dist/three.min.js');
const read=name=>JSON.parse(readFileSync(new URL(name,dist),'utf8'));
const manifest=read('vn-satellite/index.json'),roads=read('vn-roads/index.json');
for(const parent of [...roads.tiles,...roads.sightAccess.addedParents]){
  const degree=parent.split('_').map(n=>Math.floor(n/4)).join('_');
  assert.ok(manifest.tiles.includes(degree),'road tile '+parent);
}
for(const key of manifest.tiles){
  const image=readFileSync(new URL('vn-satellite/'+key+'.webp',dist));
  assert.equal(image.toString('ascii',8,12),'WEBP');
}
const images=new Map(),draws=[];
const ctx={clearRect(){draws.length=0;},drawImage(img,x,y){draws.push([img.key,x,y]);}};
class Tile{
  set src(url){this.key=url.split('/').pop().split('.')[0];images.set(this.key,this);}
}
const scope={fetch:async()=>({ok:true,json:async()=>manifest}),Image:Tile,performance,
  document:{createElement:()=>({getContext:()=>ctx})}};
runInNewContext(readFileSync(new URL('national-terrain-colour.js',dist),'utf8'),scope);
const layer=scope.createNationalTerrainColour(T),shader={uniforms:{},fragmentShader:'#include <color_fragment>'};
layer.shade(shader,'position.xz','1.');
const {nationalVisible,nationalOrigin,nationalEast,nationalNorth}=shader.uniforms;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
layer.setFrame('plain',106,21,104000,110900);layer.follow(0,0);await tick();
assert.deepEqual([...images.keys()].sort(),['105_20','105_21','106_20','106_21']);
const old=[...images.values()];
// A jump between driving modes while four images are decoding must never
// place the northern plain over the rotated mountain course.
layer.setFrame('pass',108,16,107000,110900,Math.PI/2);layer.follow(0,0);await tick();
for(const img of images.values())if(!old.includes(img))img.onload();
await tick();
assert.equal(nationalVisible.value,1);
const mosaic=[...draws].sort();
assert.deepEqual(mosaic,[['107_15',-558,192],['107_16',-558,-558],['108_15',192,192],['108_16',192,-558]].sort());
for(const img of old)img.onload();await tick();assert.deepEqual([...draws].sort(),mosaic);
const north=nationalOrigin.value.y+nationalNorth.value.x*1109;
const east=nationalOrigin.value.x+nationalEast.value.y*1070;
assert.ok(Math.abs(north-(.5-7.5/384))<1e-9);
assert.ok(Math.abs(east-(.5-7.5/384))<1e-9);
layer.setFrame('offshore',117,12,108000,110900);layer.follow(0,0);await tick();
assert.equal(nationalVisible.value,0);assert.equal(draws.length,0);
console.log('Verified the national road footprint, four-tile seams, rotated stage, stale loads and missing coverage.');
