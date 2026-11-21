import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const dist = new URL('../../dist/', import.meta.url);
const context = {};
runInNewContext(readFileSync(new URL('pedestrian-models.js', dist), 'utf8'), context);
const groups = [
  ['hust-tee', 'hust-jacket'], ['manchester-united'], ['skt-t1'],
  ['fox-cosplayer', 'witch-cosplayer'], ['doraemon', 'nobita', 'goku', 'vegeta']
];
const counts = new Map();
for (let i = 0; i < 10000; i++) {
  const name = context.choosePedestrianModel((i + .5) / 10000, 'road-worker');
  counts.set(name, (counts.get(name) || 0) + 1);
}
for (const group of groups) {
  for (const name of group) {
    assert.equal(counts.get(name), 1000 / group.length, name);
    const glb = readFileSync(new URL('traffic/' + name + '.glb', dist));
    const model = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
    for (const buffer of model.buffers.filter(buffer => buffer.uri)) {
      const rig = readFileSync(new URL('traffic/' + buffer.uri, dist));
      assert.equal(rig.length, buffer.byteLength, name + ' shared rig size');
      assert.equal(createHash('sha256').update(rig).digest('hex'), model.asset.extras.sharedRigSha256,
        name + ' shared rig changed; regenerate the costume');
    }
    for (const view of model.bufferViews) {
      assert.ok((view.byteOffset || 0) + view.byteLength <= model.buffers[view.buffer].byteLength, name);
    }
    assert.deepEqual(model.animations.map(clip => clip.name).sort(), ['idle', 'look_around', 'walk', 'wave']);
  }
}
assert.equal(counts.get('road-worker'), 5000);

// Filtering by the street's spawn roll must not favour particular costumes.
const spawned = Array(6).fill(0);
for (let edge = 0; edge < 5000; edge++) {
  const seed = (Math.imul(edge, 2246822519) ^ 3266489917) >>> 0;
  for (let k = 0; k < 16; k++) {
    if ((Math.imul(seed ^ k, 2654435761) >>> 0) / 4294967296 > .36) continue;
    const model = context.pathPedestrianModel(seed, k);
    const group = groups.findIndex(styles => styles.includes(model));
    if (group === -1) assert.ok(['casual-walker', 'hiker'].includes(model));
    spawned[group === -1 ? 5 : group]++;
  }
}
const total = spawned.reduce((a, b) => a + b);
spawned.forEach((n, i) => assert.ok(Math.abs(n/total - (i === 5 ? .5 : .1)) < .012));
console.log('PASS pedestrian wardrobe, animation clips and street spawn distribution', spawned);
