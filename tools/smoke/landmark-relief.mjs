import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const three=createRequire(import.meta.url)('../../dist/three.min.js');
const scene=new three.Scene(),T={...three,TextureLoader:class{load(){return new three.Texture();}}};
const files=new Map(),loads=new Map(),index={grid:2,cells:2,tiles:['211_41','211_42','213_21','214_32']};
function urbanPixels(decimetres,weight){
  const data=new Uint8Array(3*3*4),code=decimetres+32768;
  for(let i=0;i<data.length;i+=4)data.set([code>>8,code&255,weight,255],i);
  return data;
}
for(const key of index.tiles)files.set(key,urbanPixels(55,255));
class ElevationImage {
  naturalWidth=2;
  naturalHeight=2;
  set src(url){
    if(url.startsWith('urban-terrain/')){
      const key=url.split('/').pop().slice(0,-4);
      loads.set(key,(loads.get(key)||0)+1);
      this.naturalWidth=this.naturalHeight=3;this.data=files.get(key);
      if(!this.data){this.onerror();return;}
    }else this.data=new Uint8Array(16);
    this.onload();
  }
  removeAttribute(){}
}
const context=vm.createContext({window:{},Image:ElevationImage,performance,
  fetch:async url=>{assert.equal(url,'urban-terrain/index.json');return {ok:true,json:async()=>index};},
  createNationalTerrainColour:()=>({setFrame(){},follow(){},shade(){}}),
  createPassSurface:()=>({select(){}}),document:{createElement:()=>({getContext:()=>({
    drawImage(image){this.image=image;},getImageData(){return {data:this.image.data};}})})}});
for(const file of ['shore-terrain','urban-terrain','vietnam-relief','cave-openings','world-land-cover'])
  vm.runInContext(readFileSync(new URL('../../dist/'+file+'.js',import.meta.url),'utf8'),context);
// The temple moat and Ao Bà Om have distinct water levels. Simulate the
// canvas colour rounding that used to make their pool IDs collide at a bank.
for(let id=0;id<255;id++){
  const channels=context.shorePoolColour(id).match(/\d+/g).map(Number);
  for(const alpha of [32,45,63,120,197,255]){
    const readback=channels.map(c=>Math.round(Math.round(c*alpha/255)*255/alpha));
    assert.equal(context.shorePoolIndex(...readback),id);
  }
}
const graph={geo:(x,z)=>[107+x/106000,16-z/111000]};
let samples=0;
const environment={revision:0,sample(g,x,z){
  samples++;
  return {cover:[10,20,40,60][(Math.abs(x+3*z)>>4)%4]};
}};
const cover=context.createWorldLandCover(T,environment);
function paint(layer,x,z){
  const preparation=layer.prepare(graph,x,z);
  let step=preparation.next();
  while(!step.done)step=preparation.next();
  step.value();
  const shader={uniforms:{},fragmentShader:''};layer.shade(shader);
  return shader.uniforms.coverMap.value.image.data;
}
paint(cover,0,0);samples=0;
const shifted=paint(cover,128,-160);
assert.ok(samples>0&&samples<128*128/4,'Only sample newly exposed ground on a rebase');
assert.deepEqual(shifted,paint(context.createWorldLandCover(T,environment),128,-160));
environment.revision++;samples=0;paint(cover,128,-160);
assert.equal(samples,128*128,'A new raster tile must refresh the whole texture');
const survey={elevation:(x,z)=>300+.40*x-.17*z,elevationWeight:()=>1};
const relief=context.createVietnamRelief(T,scene,true,{},null,2048);
await relief.ready;
const terrain=relief.prepare(graph,survey);
relief.activate(terrain,0,0);relief.update(0,0);
const close=(a,b)=>assert.ok(Math.abs(a-b)<.0001,`${a} differs from ${b}`);
// A cave visit uses the passage floor instead of lifting the camera onto
// the mountain overhead. The opening must follow a rebased scene origin.
const openings=context.createCaveOpenings(T);
const portal={x:250,z:180,base:37,data:{yaw:Math.PI/2,caveOpening:{approach:4,sections:[[0,0,2,6,0],[10,1,4,8,-1]]}}};
openings.update(portal,200,100);
close(openings.floorAt(45,80),36.5);
assert.equal(openings.floorAt(45,89),null);
assert.equal(openings.floorAt(56,80),null);
openings.update(portal,245,150);
close(openings.floorAt(0,30),36.5);
openings.update(null,245,150);
assert.equal(openings.floorAt(0,30),null);
for(const [x,z] of [[0,0],[-65,53],[19,25],[15,14],[1024,-128],[-1024,32]]){
  close(terrain.altitude(x,z),survey.elevation(x,z));
  close(terrain.grade(x,z,Math.PI/2),.40);
}
// The skyline shares the drivable mesh's height at its edge and after rebasing.
const horizon=scene.getObjectByName('Vietnam terrain horizon');
function checkEdge(targetX,z){
  const points=horizon.geometry.attributes.position;
  for(let i=0;i<points.count;i++)if(points.getX(i)===targetX&&points.getZ(i)===z){
    close(points.getY(i),terrain.ground(targetX+horizon.position.x,z+horizon.position.z)-.17);
    return;
  }
  assert.fail('Missing shared boundary vertex');
}
checkEdge(1024,32);
for(let i=0;i<300&&horizon.position.x!==512;i++)relief.update(512,0);
assert.equal(horizon.position.x,512);checkEdge(-1024,64);
const noSurvey=relief.prepare(graph,{elevation:()=>null});
close(noSurvey.ground(17,-13),0);
const hanoi={geo:(x,z)=>[105.8521+x/104000,21.02865-z/110900],
  point:(lon,lat)=>({x:(lon-105.8521)*104000,z:(21.02865-lat)*110900})};
const lakeside=relief.prepare(hanoi,
  {elevation:(x,z)=>19+.10*x,elevationWeight:()=>1});
const lakeStreet=lakeside.altitude(0,0);
assert.ok(lakeStreet>=8.4&&lakeStreet<=11.5);
assert.ok(Math.abs(lakeside.grade(0,0,Math.PI/2))<.02);
// The surrounding urban DTM covers Bách Khoa and Bến Thành even before the
// surface survey loads. Roof returns must never become short road gradients.
for(const [lon,lat] of [[105.84156,21.00510],[106.698484,10.771409]]){
  const mx=111320*Math.cos(lat*Math.PI/180);
  const g={geo:(x,z)=>[lon+x/mx,lat-z/110900],point:(u,v)=>({x:(u-lon)*mx,z:(lat-v)*110900})};
  assert.equal(await relief.loadLocal(g,0,0),true);
  assert.equal(await relief.loadLocal(g,0,0),false);
  const empty=relief.prepare(g,{elevation:()=>null});
  const roofs=relief.prepare(g,{elevation:(x,z)=>25+20*Math.cos(x/51)*Math.sin(z/82),elevationWeight:()=>1});
  for(let z=-500;z<=500;z+=41)for(let x=-500;x<=500;x+=37){
    close(empty.altitude(x,z),roofs.altitude(x,z));
    assert.ok(Math.hypot(roofs.grade(x,z,0),roofs.grade(x,z,Math.PI/2))<.015);
  }
}
// Failed tiles retry, and a partially urban node only contributes its weighted
// elevation correction. Returning to a rural district clears the previous view.
const projector={point:(lon,lat)=>({x:lon*100000,z:-lat*100000}),geo:(x,z)=>[x/100000,-z/100000]};
const urban=context.createUrbanTerrain(),mixed=urbanPixels(-20,0);
mixed.set([128,100,255,255],4*4); // 10 m at the centre, -2 m elsewhere with zero influence
files.delete('214_32');
assert.equal(await urban.load(projector,10725000,-1625000),false);
files.set('214_32',mixed);
assert.equal(await urban.load(projector,10725000,-1625000),true);
const sample=urban.current(projector);
close(sample(10725000,-1625000,80),10);
close(sample(10712500,-1625000,80),45);
close(sample(10700000,-1625000,80),80);
assert.equal(await urban.load(projector,10800000,-1800000),true);
assert.equal(urban.current(projector),null);
close(sample(10725000,-1625000,80),10); // The active scene retains its snapshot during streaming.
// Outside the urban plain the original sloping survey is still authoritative.
close(lakeside.altitude(16000,0),1619);
const plaza=hanoi.point(105.83560,21.03695);
const square=relief.prepare(hanoi,{elevation:(x,z)=>16+.04*(x-plaza.x),elevationWeight:()=>1});
for(const [x,z] of [[0,0],[45,70],[-65,-85]]){
  const altitude=square.altitude(plaza.x+x,plaza.z+z);
  assert.ok(altitude>=7.80&&altitude<=8.151);
}
const pondGraph={geo:(x,z)=>[106.30403+x/109650,9.91766-z/110900],
  point:(lon,lat)=>({x:(lon-106.30403)*109650,z:(9.91766-lat)*110900})};
// A surface raster sees the tall crowns lining Ao Bà Om. Open-water pixels
// set the pond datum while the relief outside its grove retains the survey.
const pond=relief.prepare(pondGraph,{elevation:(x,z)=>Math.abs(x)<45&&Math.abs(z)<28?5:26,elevationWeight:()=>1});
for(const [x,z] of [[0,0],[-80,22],[72,-30],[32,48]])close(pond.altitude(x,z),5);
assert.ok(pond.altitude(-140,0)>5&&pond.altitude(-140,0)<8);
close(pond.altitude(-285,0),26);
// Crown and roof returns used to bury the ground floor of Kompông Chrây's
// exhibit building. Keep the shared court level with its open-ground samples.
const hangGraph={geo:(x,z)=>[106.3450733+x/109650,9.8871507-z/110900],
  point:(lon,lat)=>({x:(lon-106.3450733)*109650,z:(9.8871507-lat)*110900})};
const highPoints=[[0,0],[-60,5],[-6,-56]];
const hang=relief.prepare(hangGraph,{elevation:(x,z)=>x>180||highPoints.some(([u,v])=>Math.hypot(x-u,z-v)<12)?19:4,elevationWeight:()=>1});
for(const [x,z] of highPoints)assert.ok(Math.abs(hang.altitude(x,z)-4)<.22,'The prayer hall, gallery and north court share the local grade');
close(hang.altitude(288,0),19);
const hangGate=hangGraph.point(106.3440102,9.8880786),gateRoad=hangGraph.point(106.3439333,9.8880359);
const vault=relief.prepare(hangGraph,{elevation:(x,z)=>Math.hypot(x-gateRoad.x,z-gateRoad.z)<6?3:12,elevationWeight:()=>1});
for(const [dx,dz] of [[0,0],[6,-4],[-6,4],[8,0],[-8,0]])close(vault.altitude(hangGate.x+dx,hangGate.z+dz),3);
close(vault.altitude(0,0),12);
vm.runInContext(readFileSync(new URL('../../dist/drivetrain.js',import.meta.url),'utf8'),context);
const body={reverseDelay:0},downhill={grade:-.16,top:35,power:8,reverse:true};
let speed=1.2;
for(let i=0;i<135;i++)speed=context.window.DriveBody.forwardSpeed(body,downhill,1/90,speed);
assert.ok(speed<-.4,'The car should reverse uphill after braking to a stop.');
console.log('PASS full-scale survey relief, driving grade and streamed horizon');
