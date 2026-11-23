import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const saved=new Map();
const window={};
const context={window,localStorage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)}};
for(const file of ['bank','license-classes']){
  runInNewContext(await readFile(new URL('../../dist/'+file+'.js',import.meta.url),'utf8'),context);
}
const api=window.driveLicenses;
for(const [code,size,count,pass,minutes] of [['A',250,25,23,19],['B',600,30,27,20],['C',600,40,36,24]]){
  const license=api.get(code);
  assert.deepEqual([license.ids.size,license.count,license.pass,license.minutes],[size,count,pass,minutes]);
  const deck=api.roadDeck(code);
  assert.equal(new Set(deck.map(q=>q.id)).size,size);
  assert.ok(deck.every(q=>license.ids.has(q.id)));
  for(let round=0;round<100;round++){
    const ids=api.drawExam(code),ordinary=ids.filter(id=>!license.critical.has(id));
    assert.equal(ids.length,count);assert.equal(new Set(ids).size,count);
    assert.equal(ordinary.length,count-1);
    assert.ok(ids.every(id=>license.ids.has(id)));
    for(const [index,[first,last]] of window.driveChapters.entries()){
      assert.equal(ordinary.filter(id=>id>=first&&id<=last).length,license.quotas[index]);
    }
  }
}
const legacy='taylai.csgt2025.study.v1';
saved.set(legacy,JSON.stringify({results:{19:2},run:{ids:[19],index:0}}));
api.rememberAnswers('A',[[19,0]]);
api.rememberAnswers('C',[[19,1]]);
assert.equal(JSON.parse(saved.get(legacy)).results[19],2);
assert.equal(JSON.parse(saved.get(api.studyKey('A'))).results[19],0);
assert.equal(JSON.parse(saved.get(api.studyKey('C'))).results[19],1);
api.rememberAnswers('B',[[19,1]]);
assert.deepEqual(JSON.parse(saved.get(legacy)).run,{ids:[19],index:0});
console.log('PASS A/B/C exam composition, road decks and independent study progress');
