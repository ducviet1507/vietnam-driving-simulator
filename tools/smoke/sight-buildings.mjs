import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';

const T=createRequire(import.meta.url)('../../dist/three.min.js');
let pieces=[];
const context={createSightFinishes:()=>({}),createVietnamOsmBuildings:()=>({rows:()=>pieces})};
context.window=context;
for(const file of ['tourism-catalog','sight-details','visitor-atlas','vietnam-landmarks','surface-materials','vietnam-relief','tour-district']){
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
const museum=district.footprint({map:'https://www.openstreetmap.org/way/1'},32,1);
// The Atlas point can sit a few metres off centre. The overview stays on the
// mapped building and its detail looks at an exterior wall in either winding.
const viewsFor=(building,approachX,approachZ)=>
  district.footprintViews(building,32,1,approachX,approachZ,()=>0);
const [overview,facade]=viewsFor(museum,30,25);
assert.ok(Math.abs(32+overview.offset[0]-30)<1&&Math.abs(1+overview.offset[1])<1);
assert.equal(facade.name,'Mặt công trình phía nam');
assert.ok(facade.offset[1]>overview.offset[1]&&overview.viewRadius>facade.viewRadius);
const reversed={...museum,rings:[museum.rings[0].slice().reverse()]};
const reverseViews=viewsFor(reversed,30,25);
assert.ok(Math.abs(reverseViews[1].viewAngle-facade.viewAngle)<1e-6);
const obstructed=district.footprintViews(museum,32,1,30,25,(x,z)=>z>4?40:0);
assert.ok(Math.cos(obstructed[1].viewAngle)<.1,'a ridge below the southern camera sends the detail to a clear side');
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

// An upper storey and its downhill wing have the same OSM height datum.
// The foot of an unbroken wall must reach a trough between its corners.
const parent=row('w90','yes',64,0),base=row('w91','yes',63,0),upper=row('w92','yes',66,0);
base[2]=4;base[6]={parent:'w90'};
upper[2]=10;upper[6]={parent:'w90',min_height:4};
surveyed=[parent];inferred=[];pieces=[base,upper];
const trough=x=>Math.abs(x-64);
district.build(graph,0,0,null,trough);
const lower=district.footprint({map:'https://www.openstreetmap.org/way/91'},63,0);
const storey=district.footprint({map:'https://www.openstreetmap.org/way/92'},66,0);
assert.equal(lower.baseY,storey.baseY);
assert.equal(lower.baseY+lower.h,storey.baseY+storey.bottom);
const wallPoints=meshes.children[0].geometry.attributes.position;
assert.ok(Array.from({length:wallPoints.count},(_,i)=>i).some(i=>
  Math.abs(wallPoints.getX(i)-64)<1e-4&&wallPoints.getY(i)<-.17),'Wall reaches the triangulated terrain crease');

const fort=context.VietnamTourism.byId.get('osm-way-921987266'); // Thành cổ Sơn Tây
landmarks.setOrigin(project(fort),0,0);
const courtyard=plot(85,0);
assert.ok(district.overlapsSight(landmarks,courtyard.rings,courtyard.box),'mapped extent protects the fort grounds');
console.log('PASS sight grounds, mapped buildings and waterside footprints');

runInNewContext(readFileSync(new URL('../../dist/landscape-views.js',import.meta.url),'utf8'),context);
for(const [pin,kind] of [[-16,'Hồ'],[25,'Bãi biển']]){
  const [bank]=context.landscapeTourViews(kind,0,pin,0,()=>0,(x,z)=>z<0);
  const target=pin+bank.offset[1],eye=target+Math.cos(bank.viewAngle)*bank.viewRadius*Math.cos(bank.viewElevation);
  assert.ok(target<0&&eye>0,'the camera is on dry land looking out over mapped water');
}
const slope=context.landscapeTourViews('Đỉnh núi',0,0,0,(x,z)=>100-.4*x,()=>null);
assert.match(slope[0].name,/phía đông$/);
assert.ok(Math.abs(slope[0].offset[0]+Math.sin(slope[0].viewAngle)*slope[0].viewRadius*Math.cos(slope[0].viewElevation))<.01);
assert.equal(context.landscapeTourViews('Đỉnh núi',0,0,0,()=>100,()=>null),null);
assert.equal(context.landscapeTourViews('Hồ',0,0,0,()=>0,()=>null),null);
const reservoir=context.landscapeTourViews('Hồ',0,20,0,()=>4,(x,z)=>z<0?{level:16}:null);
assert.ok(reservoir[0].focusAltitude>16,'look above the water surface even when the terrain sample is the lake bed');

// A ground-level masonry slab crosses a 32 m terrain crease between its
// corners. Exercise rotation, unequal scales, a rebase and the upper deck.
const masonry={id:'foundation-test-site',name:'Test slab',lon:104,lat:14,width:130,depth:40,
  yaw:.31,scale:[1.2,.60,.81],solids:[[0,0,53,20]],build(T,kit){
    kit.box(0xababab,0,0,0,106,.6,39,-.14);
    kit.box(0xbababa,0,4,0,8,.3,8);
    kit.stamp(kit.round,0x808080,25,1.5,-.5,.3,3,.3);
  }};
context.VietnamSights=[masonry];
context.createSightFinishes=()=>({apply(){}});
runInNewContext(readFileSync(new URL('../../dist/landmark-materials.js',import.meta.url),'utf8'),context);
context.createLandmarkMaterial=()=>new T.MeshStandardMaterial();
runInNewContext(readFileSync(new URL('../../dist/vietnam-landmarks.js',import.meta.url),'utf8'),context);
const groundScene=new T.Scene(),groundModels=context.VietnamLandmarks.create(T,groundScene),map=project(masonry);
const crease=x=>.44*(Math.abs(x-32)-32);
for(const shift of [0,19,0]){
  groundModels.setOrigin(map,shift,0,crease);
  const mesh=groundScene.getObjectByName(masonry.id),p=mesh.children.at(-1).geometry.attributes.position;
  mesh.updateMatrixWorld(true);
  const corners=new Map();
  for(let i=0;i<24;i++){
    const q=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
    if(p.getY(i)>0)continue;
    corners.set(q.x+','+q.z,q);
  }
  assert.equal(corners.size,4);
  const ring=[...corners.values()].sort((a,b)=>Math.atan2(a.z,a.x+shift)-Math.atan2(b.z,b.x+shift));
  for(let j=0;j<4;j++)for(let n=0;n<=128;n++){
    const sample=ring[j].clone().lerp(ring[(j+1)%4],n/128);
    assert.ok(sample.y<=crease(sample.x+shift)-.17,'Landmark slab crosses above visible ground');
  }
  for(let i=24;i<48;i++)assert.ok(p.getY(i)>3.8,'Raised deck remains elevated');
  let postBase=0;
  for(let i=48;i<p.count;i++){
    if(p.getY(i)>2.9)continue;
    const q=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
    assert.ok(q.y<=crease(q.x+shift)-.17,'Exposed stilt ends in the ground');postBase++;
  }
  assert.ok(postBase>10);
}
