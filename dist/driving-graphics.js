'use strict';

// Rendering budgets are independent of the simulation clock and CSS layout.
function createDrivingGraphics(renderer, camera, sun) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const profiles = [
    {id:'low', dpr:.9, pixels:900000, shadow:512, shadowMs:180, mirrorMs:170, waterWidth:0, waterMs:0, districtRadius:420, scenery:270, cars:2, treeDetail:25, treeCanopy:85},
    {id:'medium', dpr:1.25, pixels:1800000, shadow:1024, shadowMs:100, mirrorMs:120, waterWidth:256, waterMs:260, districtRadius:540, scenery:440, cars:3, treeDetail:55, treeCanopy:150},
    {id:'high', dpr:1.65, pixels:3600000, shadow:2048, shadowMs:60, mirrorMs:90, waterWidth:480, waterMs:130, districtRadius:650, scenery:620, cars:5, treeDetail:90, treeCanopy:240}
  ];
  if (touch) Object.assign(profiles[0], {pixels:520000, districtRadius:360, scenery:220, treeDetail:18, treeCanopy:65});
  const cores = navigator.hardwareConcurrency, memory = navigator.deviceMemory;
  // Mobile core counts include efficiency cores and do not predict GPU throughput.
  const initial = touch || cores <= 4 || memory <= 4 ? 0 : cores >= 8 && memory >= 8 ? 2 : 1;
  const autoCeiling = touch ? 1 : profiles.length - 1;
  let level = initial, preference, previous = null, duration = 0, frames = 0, slow = 0, fast = 0, recoverAfter;
  let width = 0, height = 0, ratio = 0;
  let verySlow = 0, reduced = false;
  const shadows = renderer.shadowMap.enabled;
  const canvas = renderer.domElement;

  function resetSamples() {
    previous = null;
    duration = frames = slow = fast = verySlow = 0;
  }
  function choose() {
    const selected = document.body.dataset.graphics || 'auto';
    if (preference === selected) return;
    preference = selected;
    const fixed = profiles.findIndex(profile => profile.id === selected);
    level = fixed < 0 ? initial : fixed;
    reduced = false;
    recoverAfter = touch ? 30 : 12;
    resetSamples();
  }
  function lowerQuality() {
    if (level > 0) level--;
    else reduced = true;
    recoverAfter = 45;
    resetSamples();
  }
  function sample(now, playing) {
    if (!playing || document.hidden || (preference !== 'auto' && preference !== 'low')) {
      if (previous !== null) resetSamples();
      return;
    }
    const delta = previous === null ? 0 : now - previous;
    previous = now;
    if (delta <= 0) return;
    // Several very late frames warrant a quick reduction even on a CPU-rich device.
    verySlow = delta > 55 ? verySlow + 1 : 0;
    if (verySlow >= 5 && !reduced) {
      lowerQuality();
      return;
    }
    // Bound the influence of a single tile load or shader compilation.
    duration += Math.min(delta, 100);
    frames++;
    if (duration < 1000) return;
    const average = duration / frames;
    slow = average > (level === 0 ? 34 : 23) ? slow + 1 : 0;
    fast = average < 18.5 ? fast + 1 : 0;
    duration = frames = 0;
    if (slow >= 2 && !reduced) {
      lowerQuality();
    } else if (fast >= recoverAfter && (reduced || preference === 'auto' && level < autoCeiling)) {
      if (reduced) reduced = false;
      else level++;
      resetSamples();
    }
  }
  function resize() {
    const profile = profiles[level], w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const scale = Math.min(window.devicePixelRatio || 1, profile.dpr, Math.sqrt(profile.pixels / (w * h))) * (reduced ? .64 : 1);
    const shadowMap = shadows && level > 0;
    if (renderer.shadowMap.enabled !== shadowMap) {
      renderer.shadowMap.enabled = shadowMap;
      renderer.shadowMap.needsUpdate = true;
    }
    if (w !== width || h !== height || scale !== ratio) {
      renderer.setDrawingBufferSize(w, h, scale);
      if (w !== width || h !== height) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      width = w; height = h; ratio = scale;
    }
    if (sun && sun.shadow.mapSize.x !== profile.shadow) {
      sun.shadow.mapSize.setScalar(profile.shadow);
      sun.shadow.map?.setSize(profile.shadow, profile.shadow);
      renderer.shadowMap.needsUpdate = true;
    }
  }
  function frame(now, playing) {
    choose();
    sample(now, playing);
    resize();
  }
  choose();
  document.addEventListener('visibilitychange', resetSamples);
  return {frame, resize, get profile() { return profiles[level]; }};
}
