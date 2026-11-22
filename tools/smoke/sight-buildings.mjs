import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';

const T=createRequire(import.meta.url)('../../dist/three.min.js');
const context={createSightFinishes:()=>({}),createVietnamOsmBuildings:()=>({rows:()=>[]})};
context.window=context;
for(const file of ['tourism-catalog','sight-details','visitor-atlas','vietnam-landmarks','surface-materials','tour-district']){
  runInNewContext(readFileSync(new URL('../../dist/'+file+'.js',import.meta.url),'utf8'),context);
}
const scene=new T.Scene(),landmarks=context.VietnamLandmarks.create(T,scene);
let surveyed=[],inferred=[];
const district=context.createTourDistrict(T,scene,new T.MeshStandardMaterial(),
  {rows:()=>inferred,heightAt:()=>0},{rows:()=>surveyed},{value:0});
function project(site){
  const mx=111320*Math.cos(site.lat*Math.PI/180),my=110900;
  return {mx,my,point:(lon,lat)=>({x:(lon-site.lon)*mx,z:(site.lat-lat)*my}),
    geo:(x,z)=>[site.lon+x/mx,site.lat-z/my]};
}
function plot(x,z,half=3){
  const ring=[[-half,-half],[half,-half],[half,half],[-half,half]].map(([u,v])=>new T.Vector2(x+u,z+v));
  return {rings:[ring],box:{minX:x-half,maxX:x+half,minZ:z-half,maxZ:z+half}};
}
const falls=context.VietnamTourism.byId.get('osm-node-4759574761'); // Thác Bản Giốc
const graph=project(falls);
landmarks.setOrigin(graph,0,0);
const nearPlot=plot(77,0);
assert.ok(district.overlapsSight(landmarks,nearPlot.rings,nearPlot.box),'edge of house enters waterfall grounds');
const farPlot=plot(160,0);
assert.equal(district.overlapsSight(landmarks,farPlot.rings,farPlot.box),false);

function row(id,use,x,z){
  let lastLon=0,lastLat=0;
  const packed=plot(x,z).rings[0].flatMap(p=>{
    const [lon,lat]=graph.geo(p.x,p.y).map(v=>Math.round(v*1e5));
    const delta=[lon-lastLon,lat-lastLat];lastLon=lon;lastLat=lat;
    return delta;
  });
  return [id,use,0,0,[packed],''];
}
inferred=[row('g1','yes',77,0),row('g2','yes',160,0),row('g3','yes',200,0)];
surveyed=[row('w1','yes',30,0),row('w2','house',50,0),row('w3','roof',125,0)];
// The water edge reaches one corner of g3. The centre is on dry ground.
district.build(graph,0,0,landmarks,()=>0,[],(x,z)=>x>201&&z>1);
for(const [x,id] of [[30,'w1'],[50,'w2'],[77,undefined],[160,'g2'],[200,undefined]]){
  assert.equal(district.contact(x,0,.5)?.id,id);
}
const canopy=district.footprint({map:'https://www.openstreetmap.org/way/3'},125,0);
assert.equal(district.contact(125,0,1),undefined,'visitors can pass under the shelter');
const corner=canopy.rings[0][0];
assert.equal(district.contact(corner.x,corner.y,.25)?.id,'w3','the canopy post remains solid');
const walls=scene.getObjectByName('OSM building footprints').children[0].geometry.attributes;
function hasWindowBays(x){
  for(let i=0;i<walls.position.count;i++){
    if(Math.abs(walls.position.getX(i)-x)<5&&walls.bays.getX(i)>0)return true;
  }
  return false;
}
assert.equal(hasWindowBays(30),false,'unclassified mapped structure keeps a plain facade');
assert.ok(hasWindowBays(50),'explicitly mapped home keeps its residential facade');

// Crossing a streaming boundary reuses the district buffers. Hidden buildings
// must disappear, and returning to the same road must reproduce its geometry.
const meshes=scene.getObjectByName('OSM building footprints');
function snapshot(){
  return meshes.children.map(({geometry})=>Object.fromEntries(Object.entries(geometry.attributes).map(([name,a])=>{
    const values=[];
    for(let i=0;i<a.count;i++){
      values.push(a.getX(i));
      if(a.itemSize>=2)values.push(a.getY(i));
      if(a.itemSize>=3)values.push(a.getZ(i));
    }
    return [name,values];
  })));
}
const original=snapshot();
district.build(graph,2000,0,landmarks,()=>0);
assert.equal(meshes.children.length,0);
district.build(graph,0,0,landmarks,()=>0,[],(x,z)=>x>201&&z>1);
assert.deepEqual(snapshot(),original);

const fort=context.VietnamTourism.byId.get('osm-way-921987266'); // Thành cổ Sơn Tây
landmarks.setOrigin(project(fort),0,0);
const courtyard=plot(85,0);
assert.ok(district.overlapsSight(landmarks,courtyard.rings,courtyard.box),'mapped extent protects the fort grounds');
console.log('PASS sight grounds, mapped buildings and waterside footprints');
