import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const read = name => readFileSync(new URL('../../dist/' + name,import.meta.url),'utf8');
const html = read('index.html');
const scripts = markup => [...markup.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match=>match[1]);
const all = scripts(html), context = createContext({});
context.window = context;
const run = file => runInContext(read(file),context,{filename:file});
for(const file of all.slice(all.indexOf('sight-details.js'),all.indexOf('vietnam-landmarks.js')+1)) run(file);
run('mountain-stages.js');
for(const file of scripts(html.match(/<template id="secretAssets">([\s\S]*?)<\/template>/)[1])) run(file);
const {sightSecretStories:stories, VietnamLandmarks, VietnamTourism} = context;
const visits = runInContext('heritageVisits',context);
const motifs = new Set('turtle lantern lotus sail wing echo beacon leaf ink star shell arch gear drop dragon ridge'.split(' '));
const covered = new Set();
for(const {id,name} of VietnamTourism.entries) {
  assert.equal(name,name.normalize('NFC'),id);
  assert.doesNotMatch(name,/(?:^|\s)[\u0300-\u0303\u0306\u0309\u031b\u0323]/u,id);
}
for(const place of [...VietnamTourism.entries,...VietnamLandmarks.entries,...context.mountainStages]) {
  const card = stories[place.id] || context.sightSecretTheme({...place, kind:place.kind || 'Đường đèo'}, 31415);
  assert.ok(card.length === 4 && motifs.has(card[0]) && card.every(s=>typeof s==='string' && s.trim()),place.id);
  covered.add(place.id);
}
for(const id of ['tam-chuc',...VietnamLandmarks.entries.map(s=>s.id),...visits.map(v=>v[0])]) {
  assert.ok(stories[id], 'Missing site-specific story for ' + id);
  covered.add(id);
}
for(const id of Object.keys(stories)) assert.ok(covered.has(id), 'Unknown tourism stop ' + id);
console.log('PASS stamp coverage for',VietnamTourism.entries.length,'Atlas entries,',
  VietnamLandmarks.entries.length,'3D landmarks,',visits.length,'heritage collections and',context.mountainStages.length,'passes');
