import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';

// Render the production graph in Chromium's real Web Audio mixer. The clock
// adapter lets us feed deterministic simulation frames ahead of offline render.
const source = await readFile(new URL('../../dist/audio.js', import.meta.url), 'utf8');
const browser = await chromium.launch({headless:true});
try {
  async function render(kind, options = {}) {
    const page = await browser.newPage();
    try {
      return await page.evaluate(async ({source, kind, options}) => {
        const rate = 24000, duration = 1.2;
        let clock = 0, audio, samples = 0, motors = 0, seed = 5381;
        Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
        window.AudioContext = function () {
          audio = new OfflineAudioContext(2, rate * duration, rate);
          return new Proxy(audio, {get(ctx, key) {
            if (key === 'state') return 'running';
            if (key === 'currentTime') return clock;
            if (key === 'createPanner') return () => { ++motors; return ctx.createPanner(); };
            const value = ctx[key];
            return typeof value === 'function' ? value.bind(ctx) : value;
          }});
        };
        (0, eval)(source);
        window.dispatchEvent(new Event('pointerdown'));
        for (let frame = 0; frame < duration * 60; frame++) {
          clock = frame / 60;
          const actor = {id:1, forward:6, right:0, speed:12, rpm:4200, closing:0, ...options.bike};
          if (options.overtaking) {
            actor.right = -2.5;
            actor.forward = 27 * (clock - .55);
            actor.closing = -27 * actor.forward / Math.hypot(actor.right, actor.forward);
          }
          const motorcycles = kind === 'bike' ? () => {
            ++samples;
            return options.crowd ? Array.from({length:8}, (_, i) => ({...actor,id:i,right:i + 1})) : [actor];
          } : undefined;
          driveAudio.update({mode:'driving', electric:true, speed:kind === 'tire' ? 60 : 0,
            roadSound:options.road, motorcycles});
          if (kind === 'bridge') {
            if (frame === 12) driveAudio.bridgeAxle(10, false, true);
            if (frame === 27) driveAudio.bridgeAxle(10, true, true);
          }
          if (options.mute && frame === 12) driveAudio.toggle();
        }
        const pcm = await audio.startRendering(), [left,right] = [pcm.getChannelData(0),pcm.getChannelData(1)];
        function rms(data, begin, end) {
          let square = 0;
          const start = Math.round(begin * rate), stop = Math.round(end * rate);
          for (let i = start; i < stop; i++) square += data[i] ** 2;
          return Math.sqrt(square / (stop - start));
        }
        // Autocorrelation around one firing period at the specified 4200 rpm.
        let period = 1, best = -Infinity;
        for (let lag = Math.floor(rate / 45); lag < rate / 26; lag++) {
          let cross = 0, a2 = 0, b2 = 0;
          for (let i = rate / 2; i < rate; i += 3) {
            const a = left[i], b = left[i + lag];
            cross += a * b; a2 += a * a; b2 += b * b;
          }
          const score = cross / Math.sqrt(a2 * b2);
          if (score > best) { period = lag; best = score; }
        }
        return {left:rms(left,.55,1.05),right:rms(right,.55,1.05),hz:rate / period,motors,samples,
          before:rms(left,.05,.18),front:rms(left,.2,.30),between:rms(left,.37,.44),rear:rms(left,.45,.55),
          beside:rms(left,.55,.7),passed:rms(left,1.0,1.15)};
      }, {source,kind,options});
    } finally { await page.close(); }
  }

  const left = await render('bike', {bike:{right:-5,forward:1}});
  const right = await render('bike', {bike:{right:5,forward:1}});
  assert.ok(left.left > 1.1 * left.right && right.right > 1.1 * right.left, 'bike side follows the listener');
  const ahead = await render('bike', {bike:{closing:25}});
  const away = await render('bike', {bike:{closing:-25}});
  assert.ok(ahead.hz > away.hz * 1.1 && ahead.hz < 40 && away.hz > 30, 'audible Doppler shift');
  const rev = await render('bike', {bike:{rpm:5000}});
  assert.ok(Math.abs(rev.hz - 5000 / 120) < 1, 'single cylinder follows engine RPM');
  const passing = await render('bike', {overtaking:true});
  assert.ok(passing.beside > 2 * passing.before && passing.beside > 1.5 * passing.passed,
    'smooth overtake grows alongside then recedes in front');
  const rear = await render('bike', {bike:{forward:-6}});
  assert.ok(Math.abs(rear.left - ahead.left) > ahead.left * .02, 'front and rear have distinct transfers');
  const cab = await render('bike', {road:{cabin:true,windowOpen:0}});
  const open = await render('bike', {road:{cabin:true,windowOpen:1}});
  assert.ok(cab.left < open.left * .6, 'closed cabin attenuates passing traffic');
  const distant = await render('bike', {bike:{forward:54}});
  assert.ok(distant.left < open.left * .15, 'distance falloff');
  const muted = await render('bike', {mute:true});
  assert.ok(muted.left < 1e-5, 'mute silences the mixer');
  const crowd = await render('bike', {crowd:true});
  assert.ok(crowd.motors === 2 && crowd.samples <= 19, 'voice and sampling budget');
  const bridge = await render('bridge');
  assert.ok(bridge.front > .008 && bridge.rear > .005 && bridge.rear < bridge.front);
  assert.ok(bridge.before < 1e-7 && bridge.between < 1e-6, 'independent axle transients');
  const dry = await render('tire', {road:{surface:'asphalt',wet:0}});
  const wet = await render('tire', {road:{surface:'asphalt',wet:1}});
  const pavers = await render('tire', {road:{surface:'pavers',wet:0}});
  assert.ok(wet.left > dry.left * 1.03 && pavers.left > dry.left * 1.05, 'wet and paved tire textures');
  console.log('PASS motorcycle stereo, front/rear, Doppler, distance, cabin, mute, voice limit, deck joints and tire texture');
  console.log({approachHz:ahead.hz,recedeHz:away.hz,closedRms:cab.left,openRms:open.left,
    frontAxleRms:bridge.front,rearAxleRms:bridge.rear,trafficSamples:crowd.samples});
} finally {
  await browser.close();
}
