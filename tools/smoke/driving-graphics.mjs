import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';

const source = readFileSync(new URL('../../dist/driving-graphics.js', import.meta.url), 'utf8');
function graphicsFor(touch, deviceMemory, devicePixelRatio = 3) {
  const dataset = {};
  const create = runInNewContext(source + '\ncreateDrivingGraphics', {
    navigator:{hardwareConcurrency:8, deviceMemory},
    matchMedia:() => ({matches:touch}), window:{devicePixelRatio},
    document:{body:{dataset}, addEventListener() {}}
  });
  const renderer = {
    domElement:{clientWidth:844, clientHeight:390}, shadowMap:{enabled:true},
    setDrawingBufferSize(w, h, scale) { this.scale = scale; }
  };
  const graphics = create(renderer, {updateProjectionMatrix() {}});
  let now = 0;
  const frames = (count, interval) => {
    for (let i = 0; i < count; i++) graphics.frame(now += interval, true);
  };
  return {graphics, renderer, dataset, frames};
}

for (const memory of [8, undefined]) {
  const {graphics, renderer, dataset, frames} = graphicsFor(true, memory);
  frames(1, 16);
  assert.equal(graphics.profile.id, 'low');
  assert.equal(renderer.shadowMap.enabled, false);
  const initialScale = renderer.scale;
  assert.equal(initialScale, .9);
  frames(140, 16);
  assert.equal(renderer.scale, 1.25);
  frames(260, 16);
  assert.equal(renderer.scale, 1.5);
  assert.equal(graphics.profile.scenery, 220);
  assert.equal(renderer.shadowMap.enabled, false);
  frames(5, 65);
  assert.equal(renderer.scale, 1.25);
  frames(140, 16);
  assert.equal(renderer.scale, 1.25);
  frames(6, 65);
  assert.equal(renderer.scale, initialScale);
  frames(10, 65);
  assert.ok(renderer.scale < initialScale);
  frames(12000, 16);
  assert.equal(graphics.profile.id, 'medium');
  dataset.graphics = 'high';
  frames(100, 65);
  assert.equal(graphics.profile.id, 'high');
  assert.equal(renderer.shadowMap.enabled, true);
  dataset.graphics = 'auto';
  frames(1, 16);
  assert.equal(graphics.profile.id, 'low');
  assert.equal(renderer.scale, initialScale);
}
const tablet = graphicsFor(true, 8);
Object.assign(tablet.renderer.domElement, {clientWidth:1366, clientHeight:1024});
tablet.frames(450, 16);
assert.ok(Math.abs(1366 * 1024 * tablet.renderer.scale ** 2 - 1200000) < 1);
const standard = graphicsFor(true, 4, 1);
standard.frames(450, 16);
assert.equal(standard.renderer.scale, 1);
standard.dataset.graphics = 'low';
standard.frames(450, 16);
assert.equal(standard.renderer.scale, .9);
assert.equal(graphicsFor(false, 8).graphics.profile.id, 'high');
{
  const T=createRequire(import.meta.url)('../../dist/three.min.js');
  const script=readFileSync(new URL('../../dist/street-vehicle-light.js',import.meta.url),'utf8');
  const create=runInNewContext(script+'\ncreateStreetVehicleLight');
  const faces=[],renderer={coordinateSystem:T.WebGLCoordinateSystem,shadowMap:{},xr:{},
    getRenderTarget:()=>null,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,
    setRenderTarget(target,face){if(target)faces.push(face);},render(){}};
  const light=create(T,renderer,new T.Scene()),position=new T.Vector3();
  for(let i=0;i<8;i++){
    position.z=i*200/3.6*.1;
    light.reflect(position,[],i*100,true);
  }
  assert.deepEqual(faces,[0,1,2,3,4,5,0,1],'200 km/h must complete and publish a paint reflection');
  position.z+=500;light.reflect(position,[],800,true);
  assert.equal(faces.at(-1),0,'a district origin jump must restart the cube');
}
console.log('PASS automatic touch graphics, recovery and manual quality');
