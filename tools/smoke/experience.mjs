import assert from 'node:assert/strict';

export async function checkExperience(page,base) {
  const go=path=>page.goto(new URL(path,base).href,{waitUntil:'domcontentloaded'});
  await go('/?landmark=turtle');
  await page.locator('#openingAtlas').click();
  await page.waitForFunction(()=>destinations.length>11000&&!!atlasData);
  await page.locator('#tourFilter').selectOption('Cần Thơ');
  assert.match(await page.locator('#picked').innerText(),/Cần Thơ/);
  assert.equal(await page.locator('#places [aria-selected=true]').count(),1);
  await page.locator('#findPlace').fill('Chợ nổi Cái Răng');
  await page.locator('#places button').filter({hasText:'Chợ nổi Cái Răng'}).first().click();
  await page.locator('#travel').click();
  assert.equal(new URL(page.url()).searchParams.get('landmark'),'cho-noi-cai-rang');
  await page.locator('#launch:enabled').click();
  await page.locator('body[data-phase=drive]').waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('taylai.world.trip')).destination),'cho-noi-cai-rang');
  assert.equal(new URL(page.url()).searchParams.has('landmark'),false);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#launch:enabled').waitFor();
  assert.match(await page.locator('#journeyTitle').innerText(),/Cái Răng/);
  assert.match(await page.locator('#journeyCaption').innerText(),/hành trình đã lưu/);
  console.log('PASS Atlas province selection and resuming a relocated trip');

  let taxiFailed=false;
  await page.route('**/streetscape/city-taxi.glb',route=>{taxiFailed=true;return route.abort();});
  await go('/cup?route=river');
  await page.waitForFunction(()=>typeof roadTraffic!=='undefined'&&roadTraffic.some(n=>n.model));
  assert.ok(taxiFailed);
  assert.equal(await page.evaluate(()=>roadTraffic.every(n=>n.model?.parent===scene)),true);
  await page.unroute('**/streetscape/city-taxi.glb');
  console.log('PASS only visible civilian cars participate in the Cup race');

  await go('/road-exam?route=river');
  await page.waitForFunction(()=>typeof state!=='undefined'&&state?.mode==='ready');
  await page.locator('#start').click();
  const grading=await page.evaluate(()=>{
    function advance(d,speed){
      const p=at(d,3.7);
      Object.assign(state,{d,x:p.x,z:p.z,h:p.h,v:speed/3.6});
      update(1/60);
    }
    for(const name of ['belt','hand','leftSignal','upGear','upGear','upGear','upGear','upGear'])action(name);
    advance(230,39);
    const command={...state.command};
    action('downGear');
    advance(265,command.speed-1);
    const fulfilled=state.command.complete;
    advance(331,34);
    return {gear:command.gear,up:command.up,fulfilled,score:state.score};
  });
  assert.deepEqual(grading,{gear:4,up:false,fulfilled:true,score:100});
  await page.evaluate(()=>{reset();start();state.time=31;update(1/60);});
  await page.locator('#result[open]').waitFor();
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#start').disabled&&!document.querySelector('#route').disabled);
  await page.locator('#start').click();
  assert.equal(await page.evaluate(()=>state.mode),'drive');
  console.log('PASS attainable shift at top gear, scoring and restarting after Esc');

  await go('/theory-exam?hang=A');
  await page.locator('#begin').click();
  await page.locator('#choices button').first().waitFor();
  const other=await page.context().newPage();
  try{
    await other.goto(page.url(),{waitUntil:'domcontentloaded'});
    await other.locator('#next').click();
    await other.locator('#grid button[aria-current=step]').filter({hasText:/^2$/}).waitFor();
    await Promise.all([page,other].map(tab=>tab.locator('#choices button').first().click()));
    await page.locator('#mark').click();
    await other.locator('#grid button').first().and(other.getByRole('button',{name:/đã đánh dấu/})).waitFor();
    await other.reload({waitUntil:'domcontentloaded'});
    assert.match(await other.locator('#progress').innerText(),/^2\/25/);
    assert.match(await other.locator('#grid button').first().getAttribute('aria-label'),/đã đánh dấu/);
    await other.locator('#submit').click();
    await other.locator('#send').click();
    await page.locator('#result').waitFor();
    assert.equal(await page.locator('#choices button:enabled').count(),0);
  }finally{await other.close();}
  console.log('PASS two exam tabs retain both answers, flags and final submission');
}
