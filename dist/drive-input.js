'use strict';
function updateDriveViewButton(button, inside) {
  button.dataset.nextView = inside ? 'chase' : 'cockpit';
  button.textContent = inside ? 'Sau xe' : 'Trong xe';
  button.title = inside ? 'Chuyển sang góc nhìn sau xe' : 'Chuyển sang góc nhìn trong xe';
  button.setAttribute('aria-label', button.title);
}

// Keyboard and individual contacts own their input independently on hybrid devices.
function createDriveInput({timedSteering=false}={}) {
  const keyboard = new Set(), contacts = new Map(), active = new Set();
  const edges=[];
  const has=key=>keyboard.has(key)||active.has(key);
  let applied=0, latest=0;
  function recordSteering(time) {
    if (!timedSteering) return;
    const direction=Number(has('d')||has('arrowright'))-Number(has('a')||has('arrowleft'));
    if (direction===latest) return;
    latest=direction;
    edges.push({time:Math.max(time??performance.now(),edges.at(-1)?.time??0),direction});
  }
  // Integrate only the part of each physics step for which a button was down.
  // A complete tap between two rendered frames still reaches the wheels.
  function steering(end,dt,profile=4) {
    if (profile<=2) {
      edges.length=0;applied=latest;
      return latest;
    }
    if (end===undefined||dt<=0) return latest;
    const start=end-dt*1000;
    let cursor=start,area=0;
    while (edges.length&&edges[0].time<=end) {
      const edge=edges.shift(),time=Math.max(start,edge.time);
      area+=(time-cursor)*applied;
      cursor=time;applied=edge.direction;
    }
    const timed=cursor===start?applied:(area+(end-cursor)*applied)/(dt*1000);
    return profile>=3?timed:latest+(timed-latest)*(profile-2);
  }
  function setContact(id, button, time) {
    const previous = contacts.get(id);
    if (previous === button) return;
    if (button) contacts.set(id, button);
    else contacts.delete(id);
    const pressed = new Set(contacts.values());
    if (previous && !pressed.has(previous)) previous.classList.remove('active');
    if (button) button.classList.add('active');
    active.clear();
    for (const control of pressed) {
      for (const key of control.dataset.key.split(' ')) active.add(key);
    }
    recordSteering(time);
  }
  function clear() {
    keyboard.clear();
    for (const id of contacts.keys()) setContact(id);
    edges.length=0;applied=latest=0;
  }
  for (const button of document.querySelectorAll('[data-key]')) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      setContact(event.pointerId, button,event.timeStamp);
    });
    if (button.hasAttribute('data-slide-pedal')) {
      button.addEventListener('pointermove', event => {
        if (!contacts.has(event.pointerId)) return;
        // Capture keeps the release reliable. Hit-test the thumb as it crosses pedals.
        const pedal = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slide-pedal]');
        if (pedal) setContact(event.pointerId, pedal,event.timeStamp);
      });
    }
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, event => setContact(event.pointerId,null,event.timeStamp));
    }
    button.addEventListener('contextmenu', event => event.preventDefault());
  }
  window.addEventListener('blur', clear);
  window.addEventListener('pagehide', clear);
  matchMedia('(orientation: landscape)').addEventListener('change', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  return {has,steering,clear,
    add(key,time){keyboard.add(key);recordSteering(time);},
    delete(key,time){keyboard.delete(key);recordSteering(time);}
  };
}
