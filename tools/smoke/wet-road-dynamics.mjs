import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const context={window:{}};
runInNewContext(readFileSync(new URL('../../dist/drivetrain.js',import.meta.url),'utf8'),context);
const body=context.window.DriveBody;
function stoppingDistance(surface,wetness,hz){
  const car={x:0,z:0,yaw:0};body.reset(car);car.speed=20;car.vz=-20;
  const input={surface,wetness,top:40,power:5,steer:0,brake:true};
  for(let i=0;i<hz*10&&car.speed>.001;i++)body.step(car,input,1/hz);
  return -car.z;
}
for(const hz of [30,60,120]){
  const dry=stoppingDistance('asphalt',0,hz),wet=stoppingDistance('asphalt',1,hz);
  assert.ok(wet>dry*1.22);
  assert.ok(stoppingDistance('roadMetal',1,hz)>wet*1.3);
  const c={x:0,z:4,yaw:0,spec:{wheelbase:2.6}};body.reset(c);
  const line={x:0,z:0,fx:0,fz:-1,width:3.3},hits=[];
  function advance(seconds,v,lines=[line]){
    for(let i=0;i<Math.round(seconds*hz);i++){
      c.z-=v/hz;c.speed=v;body.axleJoints(c,1/hz,lines,(speed,back)=>hits.push([back,c.z]));
    }
  }
  advance(1,4);advance(.45,0);
  assert.deepEqual(hits.map(h=>h[0]),[false]);
  advance(.9,4);
  assert.deepEqual(hits.map(h=>h[0]),[false,true]);
  assert.ok(Math.abs(Math.abs(hits[1][1]-hits[0][1])-2.6)<4/hz+.001);
  advance(2,-4);
  assert.deepEqual(hits.map(h=>h[0]),[false,true,true,false]);
  c.x=5;advance(2,6);assert.equal(hits.length,4);
  body.reset(c);c.x=0;c.z=5;advance(.1,0);c.z=-5;advance(.1,0);assert.equal(hits.length,4);
}
console.log('PASS wet braking and separate forward, stopped, reversed and off-deck axle sweeps at 30, 60 and 120 Hz.');
