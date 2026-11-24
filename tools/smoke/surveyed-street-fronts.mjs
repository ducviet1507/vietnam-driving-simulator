import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {gunzipSync} from 'node:zlib';

const require=createRequire(import.meta.url),T=require('../../dist/three.min.js');
const dist=new URL('../../dist/',import.meta.url);
const read=(file)=>readFileSync(new URL(file,dist));
const tile=file=>JSON.parse(gunzipSync(read(file)));
let buildings=[];
const context={createVietnamOsmBuildings:()=>({rows:()=>[]}),createSightFinishes:()=>({apply(){}}),
  ClipperLib:require('../../dist/clipper.min.js')};
context.window=context;
for(const script of ['tourism-catalog','sight-details','visitor-atlas','sights-hoi-an','central-streetscapes','surface-materials',
    'visitor-roofs','vietnam-relief','landmark-materials','vietnam-landmarks','world-scene','surveyed-street-fronts','tour-district']){
  runInNewContext(read(script+'.js').toString(),context);
}
const scene=new T.Scene(),district=context.createTourDistrict(T,scene,new T.MeshStandardMaterial(),
  {rows:()=>[],heightAt:()=>0},{rows:()=>buildings},{value:0});
// Real heritage boundaries and visitor grounds; the isolated district test
// does not need the neighbouring museums' textures or interior meshes.
for(const site of context.VietnamSights)site.build=(T,k)=>k.box(0xaaaaaa,0,1,0,1,2,1);
context.createLandmarkMaterial=()=>new T.MeshStandardMaterial();
const landmarks=context.VietnamLandmarks.create(T,scene);
const footprints=JSON.parse(read('vn-osm-buildings/index.json')).tiles;
const mapped=new Set(context.VietnamSights.flatMap(site=>site.modeledBuildings));
const roadRows=new Map();
for(const name of readdirSync(new URL('vn-roads/',dist)).filter(f=>f.startsWith('433_63')&&f.endsWith('.gz'))){
  const traffic=existsSync(new URL('vn-traffic/'+name,dist))?tile('vn-traffic/'+name):{};
  for(const row of tile('vn-roads/'+name))roadRows.set(row[0],{row,traffic:traffic[row[0]]});
}
function build(lon,lat){
  const mx=111320*Math.cos(lat*Math.PI/180),my=110900;
  const graph={mx,my,point:(a,b)=>({x:(a-lon)*mx,z:(lat-b)*my}),geo:(x,z)=>[lon+x/mx,lat-z/my]};
  buildings=[];
  for(const [name,x0,y0,x1,y1] of footprints){
    if(x0/1e5>lon+.003||x1/1e5<lon-.003||y0/1e5>lat+.003||y1/1e5<lat-.003)continue;
    for(const row of tile('vn-osm-buildings/'+name+'.gz')){
      const [px,pz]=row[4][0];
      if(Math.abs(px/1e5-lon)<.003&&Math.abs(pz/1e5-lat)<.003)buildings.push(row);
    }
  }
  const roads=[];
  for(const {row:[id,,,name,kind,oneway,coords],traffic} of roadRows.values()){
    const points=[];
    for(let k=0;k<coords.length;k+=2)points.push(graph.point(coords[k]/1e5,coords[k+1]/1e5));
    if(points.some(p=>Math.abs(p.x)<400&&Math.abs(p.z)<400))roads.push({id,name,kind,oneway,points,traffic});
  }
  landmarks.setOrigin(graph,0,0);
  district.build(graph,0,0,landmarks,()=>0,roads,()=>false,210);
  for(const mesh of district.group.children){
    assert.ok(mesh.geometry.attributes.position.data.array.every(Number.isFinite),'finite wall, roof and gallery buffers');
  }
  const fronts=district.streetFronts.filter(f=>f.surveyKind);
  for(const f of fronts){
    assert.ok(f.canopy>=.35&&f.canopy<=1.12&&f.half>=1.6);
    assert.ok(!mapped.has(f.buildingId),'dedicated landmarks retain their own facades');
    assert.ok(Math.abs(Math.hypot(f.nx,f.nz)-1)<1e-5);
  }
  return fronts;
}
const hotel=build(108.326889,15.877082).find(f=>f.buildingId==='w626704907');
assert.ok(hotel&&hotel.surveyKind==='hotel'&&hotel.nz<-.98,'hotel faces the pedestrian block of Trần Phú');
assert.ok(hotel.half>4,'both sides of the split entrance edge form a single gallery');
const town=build(108.32929,15.87710).filter(f=>f.surveyKind==='trading');
assert.ok(town.length>=2,'several mapped shop houses on the driveable street');
const lane=build(108.311714,15.870650);
for(const [id,kind] of [['w632392120','stone'],['w632392119','ochre']]){
  assert.ok(lane.some(f=>f.surveyKind===kind&&f.buildingId===id&&f.nx>.55),'village elevation toward the photographed lane');
}
const fields=build(108.322097,15.867500).filter(f=>f.surveyKind==='porch');
assert.ok(fields.length,'porches on the mapped homes by the fields');
assert.equal(context.SurveyedStreetFronts.profile('w1',105.837,21.027),null);
console.log('Packed Hội An frontage checks passed.',{town:town.length,lane:lane.length,fields:fields.length});
