import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const three=createRequire(import.meta.url)('../../dist/three.min.js');
const scene=new three.Scene(),T={...three,TextureLoader:class{load(){return new three.Texture();}}};
class ElevationImage {
  naturalWidth=2;
  naturalHeight=2;
  set src(url){this.onload();}
  removeAttribute(){}
}
const context=vm.createContext({window:{},Image:ElevationImage,performance,
  createPassSurface:()=>({select(){}}),document:{createElement:()=>({getContext:()=>({
    drawImage(){},getImageData:()=>({data:new Uint8Array(16)})})})}});
for(const file of ['shore-terrain','vietnam-relief'])
  vm.runInContext(readFileSync(new URL('../../dist/'+file+'.js',import.meta.url),'utf8'),context);
const graph={geo:(x,z)=>[107+x/106000,16-z/111000]};
const survey={elevation:(x,z)=>300+.40*x-.17*z,elevationWeight:()=>1};
const relief=context.createVietnamRelief(T,scene,true,{},null,2048);
await relief.ready;
const terrain=relief.prepare(graph,survey);
relief.activate(terrain,0,0);relief.update(0,0);
const close=(a,b)=>assert.ok(Math.abs(a-b)<.0001,`${a} differs from ${b}`);
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
const lakeside=relief.prepare({...graph,point:()=>({x:0,z:0})},
  {elevation:(x,z)=>19+.10*x,elevationWeight:()=>1});
const lakeStreet=lakeside.altitude(0,0);
assert.ok(lakeStreet>=8.4&&lakeStreet<=11.5);
assert.ok(Math.abs(lakeside.grade(0,0,Math.PI/2))<.02);
close(lakeside.altitude(1000,0),119);
vm.runInContext(readFileSync(new URL('../../dist/drivetrain.js',import.meta.url),'utf8'),context);
const body={reverseDelay:0},downhill={grade:-.16,top:35,power:8,reverse:true};
let speed=1.2;
for(let i=0;i<135;i++)speed=context.window.DriveBody.forwardSpeed(body,downhill,1/90,speed);
assert.ok(speed<-.4,'The car should reverse uphill after braking to a stop.');
console.log('PASS full-scale survey relief, driving grade and streamed horizon');
