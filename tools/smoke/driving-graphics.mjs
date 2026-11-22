import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source = readFileSync(new URL('../../dist/driving-graphics.js', import.meta.url), 'utf8');
function graphicsFor(touch, deviceMemory) {
  const dataset = {};
  const create = runInNewContext(source + '\ncreateDrivingGraphics', {
    navigator:{hardwareConcurrency:8, deviceMemory},
    matchMedia:() => ({matches:touch}), window:{devicePixelRatio:3},
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
}
assert.equal(graphicsFor(false, 8).graphics.profile.id, 'high');
console.log('PASS automatic touch graphics, recovery and manual quality');
