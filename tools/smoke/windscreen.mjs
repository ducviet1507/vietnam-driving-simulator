import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';

const T = createRequire(import.meta.url)('../../dist/three.min.js');
const context = {URLSearchParams, location:{search:'?weather=rain'}, matchMedia:()=>({matches:false}),
  document:{querySelectorAll:()=>[]}, localStorage:{getItem:()=>null}};
for (const file of ['windscreen','driving-weather']) {
  runInNewContext(readFileSync(new URL('../../dist/'+file+'.js',import.meta.url),'utf8'),context);
}

for (const truck of [false,true]) {
  const scene = new T.Scene(), cabin = new T.Group(), camera = new T.PerspectiveCamera();
  scene.fog = new T.FogExp2();
  const weather = context.createDrivingWeather(T,scene,new T.DirectionalLight(),new T.MeshStandardMaterial());
  const frame = (now,sheltered) => weather.render(camera,now,0,null,sheltered,cabin,truck,12);
  frame(16,true);
  assert.equal(cabin.children.length,0,'sheltered departure');
  let previous=.035, activeFrames=0;
  for (let now=32; now<=5000; now+=16) {
    frame(now,false);
    const [wiper,,drops] = cabin.children[0].children, angle=wiper.rotation.z;
    const beads=drops.geometry.attributes.bead.array;
    if (angle>previous+.001) {
      activeFrames++;
      for (let n=0; n<drops.geometry.instanceCount; n++) {
        const dx=beads[n*4]-wiper.position.x, dy=beads[n*4+1]-wiper.position.y;
        const bearing=Math.atan2(dy,dx), radius=Math.hypot(dx,dy);
        const width=truck?2.17:1.81;
        if (radius>width*.125 && radius<width*(truck?.395:.46))
          assert.ok(bearing<previous || bearing>angle,'no bead survives passage of the blade');
      }
    }
    previous=angle;
  }
  const pane=cabin.children[0];
  assert.ok(activeFrames>30 && pane.children[2].geometry.instanceCount>0);
  for (let now=5016; now<21000; now+=16) frame(now,true);
  assert.equal(pane.children[2].geometry.instanceCount,0,'residual water drains inside the tunnel');
  assert.equal(pane.visible,false);
  assert.equal(pane.children[0].rotation.z,.035,'wipers return to park');
  for (let now=21000; now<22500; now+=16) frame(now,false);
  assert.ok(pane.visible && pane.children[2].geometry.instanceCount>0,'rain resumes on exit');
}
console.log('PASS sedan and truck windscreen sweep, tunnel clearance and return to rain');
