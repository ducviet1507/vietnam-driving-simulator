import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const client = fileURLToPath(new URL('../../dist/client/', import.meta.url));
const types = {'.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.webp':'image/webp', '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2'};
async function serveRelease() {
  const {default:worker} = await import('../../dist/server/index.js');
  const env = {ASSETS:{async fetch(request) {
    const file = path.resolve(client, '.' + new URL(request.url).pathname);
    if (!file.startsWith(path.resolve(client) + path.sep)) return new Response(null,{status:404});
    try {
      return new Response(await readFile(file),{headers:{'Content-Type':types[path.extname(file)] || 'application/octet-stream'}});
    } catch { return new Response(null,{status:404}); }
  }}};
  const server = createServer(async (req,res) => {
    try {
      const response = await worker.fetch(new Request(new URL(req.url, 'http://localhost'), {headers:req.headers}),env);
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { res.writeHead(500);res.end(String(error)); }
  });
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  return server;
}

const server = process.env.SMOKE_URL ? null : await serveRelease();
const base = process.env.SMOKE_URL || 'http://127.0.0.1:' + server.address().port;
async function check(disabled, run) {
  const browser = await chromium.launch({args:disabled?['--disable-webgl']:['--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:640,height:480}});
    await page.addInitScript(()=>localStorage.setItem('taylai.cockpit.v1',JSON.stringify({graphics:'low'})));
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on('pageerror', e=>errors.push(e.message));
    await page.route('**/*', route=>{
      const url=new URL(route.request().url());
      if (url.pathname==='/api/leaderboard/start') return route.fulfill({status:201,json:{runId:'00000000-0000-4000-8000-000000000000'}});
      if (url.origin!==new URL(base).origin && ['http:','https:'].includes(url.protocol)) return route.abort();
      return route.continue();
    });
    try { await run(page); }
    catch (error) {
      console.error(page.url(),errors,await page.locator('#loadStatus').allTextContents());
      throw error;
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

async function checkTouchPedals(page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  const point = async (selector,id) => {
    const box = await page.locator('#touch ' + selector).boundingBox();
    assert.ok(box, selector);
    return {id,x:box.x+box.width/2,y:box.y+box.height/2};
  };
  const steer = await point('[data-key=a]',1);
  const gas = await point('[data-key=w]',2);
  const nitro = await point('[data-key~=shift]',2);
  const touch = (type,...touchPoints) => client.send('Input.dispatchTouchEvent',{type,touchPoints});
  const expectInputs = (...keys) => page.waitForFunction(
    expected=>['a','w','shift'].every(key=>held(key)===expected.includes(key)),keys,{timeout:10000});
  // Slide straight up and back with one thumb while the other thumb steers.
  const aboveGas = {...nitro,x:gas.x};
  await touch('touchStart',steer,gas);
  await expectInputs('a','w');
  await touch('touchMove',steer,aboveGas);
  await expectInputs('a','w','shift');
  await touch('touchMove',steer,gas);
  await expectInputs('a','w');
  await touch('touchEnd');
  await expectInputs();
  await touch('touchStart',nitro);
  await expectInputs('w','shift');
  await page.waitForFunction(()=>document.getElementById('nitro').value<99 && Number(document.getElementById('speed').textContent)>0);
  await touch('touchCancel');
  await expectInputs();
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await client.detach();
}

async function checkDistrictStreaming(page) {
  const result = await page.evaluate(async () => {
    await structureRequest?.ready;
    const current = districtView;
    const args = view => [view.edges, view.x, view.z, view.waterways, view.graph];
    gfx.setRoads(...args(current));
    pendingDistrict = null;
    const cursor = {...player};
    roads.advance(cursor, 160, exits => exits[0]);
    const p = roads.sample(cursor);
    const next = [roads.nearby(p.x, p.z, 560), p.x, p.z, water?.nearby(p.x, p.z) || [], roads];
    const sample = () => [0, 8, 40].map(offset => {
      const x = p.x + offset, z = p.z - offset;
      return [gfx.ground(x, z), gfx.grade(x, z, p.yaw), gfx.waterAt(x, z)?.level, gfx.contact(x, z)?.id];
    });
    const before = sample(), oldDistance = gfx.districtDistance(p.x, p.z);
    gfx.queueRoads(...next);
    const partial = gfx.advanceRoads(0);
    gfx.cancelRoads();
    const canceled = sample(), canceledDistance = gfx.districtDistance(p.x, p.z);
    gfx.queueRoads(...next);
    let frames = 0;
    while (!gfx.advanceRoads(5)) {
      await new Promise(requestAnimationFrame);
      frames++;
    }
    const streamed = sample(), distance = gfx.districtDistance(p.x, p.z);
    gfx.setRoads(...next);
    const immediate = sample();
    gfx.setRoads(...args(current));
    return {partial, before, canceled, oldDistance, canceledDistance, streamed, immediate, frames, distance};
  });
  assert.equal(result.partial, false);
  assert.ok(result.oldDistance > 0);
  assert.equal(result.canceledDistance, result.oldDistance);
  assert.deepEqual(result.before, result.canceled);
  assert.ok(result.frames > 0);
  assert.equal(result.distance, 0);
  assert.deepEqual(result.streamed, result.immediate);
}

try {
  await check(false, async page=>{
    const go = p=>page.goto(new URL(p,base).href,{waitUntil:'domcontentloaded'});
    await go('/?intro=turtle');
    await page.getByRole('button',{name:'Cầm lái',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>Boolean(VietnamTourism.complete || window.driveBank)),false);
    await page.getByRole('button',{name:'Cầm lái',exact:true}).click();
    await page.locator('body[data-phase="drive"]').waitFor();
    await page.setViewportSize({width:390,height:844});
    await page.locator('#tourView').click();
    const [photo]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Chụp ảnh cảnh'}).click()]);
    assert.match(photo.suggestedFilename(),/^ViVu3D-.+\.png$/);
    const png=await readFile(await photo.path());
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.ok(png.length>10000,'Expected scenery in the downloaded PNG');
    await page.locator('#secretOpen').click();
    for(let i=0;i<20 && !await page.locator('#secretCapture').isEnabled();i++){
      const hint=await page.locator('#secretDirection').innerText();
      if(hint.includes('Đổi ánh sáng'))await page.locator('#secretDusk').click();
      else if(hint.includes('lấy nét')){
        await page.locator('#secretFocus').focus();await page.keyboard.press('Home');
      }else await page.locator(hint.includes('trái')?'#secretLeft':'#secretRight').click();
    }
    await page.locator('#secretCapture').click();
    const title=await page.locator('#secretTitle').innerText();
    await page.locator('#secretResult [data-stamp-book]').click();
    assert.equal(await page.locator('#stampList strong').innerText(),title);
    await page.keyboard.press('Escape');
    await page.locator('#secretDone').click();
    assert.equal(await page.locator('#secretOpen').innerText(),'Xem lại dấu ẩn');
    await page.locator('#backToCar').click();
    console.log('PASS landmark discovery, journal and return to driving');
    await checkDistrictStreaming(page);
    console.log('PASS streamed district swap, cancellation, road height and contacts');
    await checkTouchPedals(page);
    await page.setViewportSize({width:640,height:480});
    console.log('PASS Xuyên Việt touch throttle, steering and nitro');
    await page.locator('#pause').click();
    await page.locator('#rest[open] #resume').click();
    assert.equal(await page.locator('#rest').isVisible(),false);
    await page.locator('#pause').click();
    assert.equal(await page.locator('#rest').isVisible(),true);
    console.log('PASS Xuyên Việt starts, pauses and resumes');
    await page.locator('#relocate').click();
    await page.waitForFunction(()=>VietnamTourism.complete&&destinations.length>11000);
    await page.locator('#findPlace').fill('Chợ Vinh');
    await page.locator('#places button').filter({hasText:'Chợ Vinh'}).first().waitFor();
    const hasModel = await page.evaluate(async()=>{
      const stop=VietnamLandmarks.entries.find(s=>s.id==='cho-vinh');
      await VietnamTourism.loadRegion(stop.lon,stop.lat);
      return typeof stop.build==='function';
    });
    assert.ok(hasModel);
    console.log('PASS nationwide Atlas search and regional model loading');

    await go('/cup');
    await page.locator('#launch').click();
    await page.locator('body[data-phase="drive"]').waitFor();
    await page.setViewportSize({width:844,height:390});
    await page.evaluate(()=>{document.body.dataset.steering='right';});
    await checkTouchPedals(page);
    await page.setViewportSize({width:640,height:480});
    console.log('PASS Cúp Bánh Mì mirrored touch throttle, steering and nitro');
    console.log('PASS Cúp Bánh Mì reaches the track');

    await go('/theory-exam');
    await page.locator('#begin').click();
    await page.locator('#choices button').first().click();
    assert.match(await page.locator('#progress').innerText(),/^1\/30/);
    await page.locator('#submit').click();
    await page.locator('#send').click();
    assert.match(await page.locator('#result').innerText(),/\d+\/30/);
    const images = await page.evaluate(()=>window.driveBank.filter(q=>q.image).map(q=>q.imageAlt));
    assert.equal(images.length,318);
    assert.ok(images.every(description=>typeof description==='string'&&description.length>15));
    console.log('PASS theory exam answers, grades and includes 318 image descriptions');
  });
  await check(true, async page=>{
    for (const route of ['/cup','/yard','/road-exam','/streets','/?intro=turtle']) {
      await page.goto(new URL(route,base).href,{waitUntil:'domcontentloaded'});
      if (route.startsWith('/?')) await page.getByRole('button',{name:'Cầm lái',exact:true}).click();
      const theory = page.locator('#graphicsUnavailable[open]').getByRole('link',{name:'Ôn lý thuyết'});
      await theory.waitFor();
      await theory.click();
      await page.waitForURL('**/theory-exam');
      if(await page.locator('#begin').isVisible())await page.locator('#begin').click();
      await page.locator('#choices button').first().waitFor();
    }
    console.log('PASS all five 3D modes reach an interactive exam without WebGL');
  });
} finally {
  if(server)await new Promise(resolve=>server.close(resolve));
}
