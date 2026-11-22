import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {gunzipSync} from 'node:zlib';

const asset=name=>new URL('../../dist/'+name,import.meta.url);
const source=name=>readFileSync(asset(name),'utf8');
const context=createContext({});
context.window=context;
for(const file of ['memorial-grounds-data.js','sight-grounds.js','ba-dinh-landscape.js'])
  runInContext(source(file),context,{filename:file});
const graph=(lon,lat)=>({mx:104000,my:110900,
  point(x,y){return {x:(x-lon)*this.mx,z:(lat-y)*this.my};},
  geo(x,z){return [lon+x/this.mx,lat-z/this.my];}});
const grounds=context.MemorialGroundRings;
for(const ref of ['w848688745','w344918979']){
  const [, ,rings]=grounds.find(r=>r[0]===ref);
  const [lon,lat]=rings[0].slice(0,2).map(v=>v/1e7),g=graph(lon,lat);
  const inside=context.memorialGroundsNear(g,0,0);
  assert.ok(Array.from({length:61},(_,i)=>i*10-300).some(x=>
    Array.from({length:61},(_,i)=>i*10-300).some(z=>inside(x,z))),ref);
  assert.ok(!inside(-4000,4000),ref);
}
// A cemetery with an excluded courtyard must preserve buildings in the hole.
const ring=(origin,size)=>[origin,origin,size,0,0,size,-size,0];
context.MemorialGroundRings=[['test',1,[ring(0,10000),ring(2500,5000)]]];
runInContext('memorialOutlines=undefined',context);
const g=graph(0,0),at=context.memorialGroundsNear(g,150,100);
for(const [lon,lat,result] of [[.0001,.0001,true],[.0005,.0005,false],[.002,.002,false]]){
  const {x,z}=g.point(lon,lat);assert.equal(at(x,z),result);
}

const map=graph(105.834692,21.036762),tile=JSON.parse(gunzipSync(readFileSync(asset('sight-grounds/423_84.gz'))));
for(const [cx,cz] of [[0,0],[320,-150]]){
  const layers=Object.values(tile).flat().map(([kind,size,raw,finish])=>({
    kind,size,finish,rings:raw.map(path=>{
      let lon=0,lat=0;const ring=[];
      for(let i=0;i<path.length;i+=2){
        lon+=path[i];lat+=path[i+1];const p=map.point(lon/1e6,lat/1e6);
        ring.push([p.x-cx,p.z-cz]);
      }
      return ring;
    })
  }));
  const before=layers.map(layer=>layer.rings.length);
  context.BaDinhLandscape.prepareGround(layers,map,cx,cz);
  const altered=layers.filter((layer,i)=>layer.rings.length!==before[i]);
  assert.equal(altered.length,1);
  assert.equal(altered[0].kind,'court');
  assert.ok(layers.some(layer=>layer.coverageByte===128&&altered[0].rings.includes(layer.rings[0])));
  assert.equal(layers.filter(layer=>layer.kind==='walk'&&layer.size===1.4&&layer.coverageByte===255).length,39);
  context.BaDinhLandscape.prepareGround(layers,map,cx,cz);
  assert.equal(altered[0].rings.length,2);
}
const list=source('index.html');
const scripts=[...list.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
for(const file of scripts.slice(scripts.indexOf('sight-details.js'),scripts.indexOf('vietnam-landmarks.js')+1))
  runInContext(source(file),context,{filename:file});
const sites=context.VietnamLandmarks.entries;
const memorial=sites.find(s=>s.id==='lang-chu-tich-ho-chi-minh');
assert.ok(memorial.modeledBuildings.includes('w1213801282'),'the planter must replace its unclassified building mesh');
assert.equal(memorial.views.length,3);
const thoSon=sites.find(s=>s.id==='khu-mo-vo-nguyen-giap');
const [bellX,bellZ]=thoSon.views[3].offset;
assert.ok(thoSon.modeledBuildings.includes('w885335615'));
// A generated roadside stall or tree on this apron obscures the real tower.
for(const [x,z] of [[bellX-9,bellZ+11],[-90,80],[-62,47],[-81,0]])assert.ok(thoSon.reserve(x,z,1));
assert.ok(!thoSon.reserve(54,83,1));
assert.equal(thoSon.views[1].photoCatalogId,'vung-chua-bai-xe-khu-mo');
for(const id of ['thanh-co-quang-tri','cong-tien-thanh-co-quang-tri','nga-ba-dong-loc'])
  assert.ok(sites.find(s=>s.id===id)?.build,id);
console.log('PASS mapped memorial lawns, ceremonial building replacements and separate monuments');
