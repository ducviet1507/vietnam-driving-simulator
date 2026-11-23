'use strict';

// Apply the same player preferences before either arcade mode starts rendering.
(() => {
  const storageKey = 'taylai.cockpit.v1';
  const groups = [
    {key:'graphics', title:'Chất lượng đồ họa', options:[['auto','Tự động'], ['low','Thấp'], ['medium','Vừa'], ['high','Cao']], initial:'auto'},
    {key:'mapSize', title:'Cỡ bản đồ nhỏ', options:[['small','Gọn'], ['standard','Chuẩn'], ['large','Rộng']], initial:'standard'},
    {key:'mapSide', title:'Vị trí bản đồ', device:'keyboard', options:[['left','Bên trái'], ['right','Bên phải']], initial:'left'},
    {key:'steering', title:'Tay đánh lái', device:'touch', options:[['left','Tay trái'], ['right','Tay phải']], initial:'left'},
    {key:'buttonSize', title:'Cỡ nút cảm ứng', device:'touch', options:[['standard','Chuẩn'], ['large','Lớn']], initial:'standard'}
  ];
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch {}
  const settings = {};
  let slider,readout;
  function applySteering(value) {
    const n=typeof value==='number'||typeof value==='string'?Number(value):NaN;
    const profile=Number.isFinite(n)&&n>=1&&n<=3?Math.round(n*100)/100:1;
    settings.steeringProfile=window.driveSteeringProfile=profile;
    if (!slider) return;
    slider.value=profile;
    const lower=Math.floor(profile),share=Math.round((profile-lower)*100);
    const description=share?`${100-share}% bản ${lower} · ${share}% bản ${lower+1}`:
      ['Bản 1 · Gốc','Bản 2 · Chỉnh nhẹ ở tốc độ cao','Bản 3 · Nhạy khi nhấp nhẹ'][lower-1];
    slider.setAttribute('aria-valuetext',description);
    readout.value=description;
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch {}
  }
  applySteering(saved?.steeringProfile);
  for (const group of groups) {
    const selected = group.options.some(([value]) => value === saved?.[group.key]) ? saved[group.key] : group.initial;
    settings[group.key] = document.body.dataset[group.key] = selected;
  }
  // The exam hall can change this preference while a lesson is open in its iframe.
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    let next;
    try { next = JSON.parse(event.newValue); } catch { return; }
    applySteering(next?.steeringProfile);
    for (const group of groups) {
      const value = group.options.some(([id]) => id === next?.[group.key]) ? next[group.key] : group.initial;
      settings[group.key] = document.body.dataset[group.key] = value;
      const radio = document.querySelector('#cockpitSettings input[name="' + group.key + '"][value="' + value + '"]');
      if (radio) radio.checked = true;
    }
  });
  const buttons = document.querySelectorAll('[data-cockpit-settings]');
  if (!buttons.length) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'cockpitSettings';
  dialog.setAttribute('aria-labelledby', 'cockpitTitle');
  dialog.innerHTML = '<form method="dialog"><h2 id="cockpitTitle">Cài đặt</h2><button class="settingsDone" value="close">Xong</button></form>';
  const form = dialog.firstElementChild;
  for (const group of groups) {
    const field = document.createElement('fieldset');
    if (group.device) field.dataset.device = group.device;
    const legend = document.createElement('legend');
    legend.textContent = group.title;
    field.append(legend);
    for (const [value, text] of group.options) {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = group.key;
      radio.value = value;
      radio.checked = value === settings[group.key];
      label.append(radio, text);
      field.append(label);
    }
    form.insertBefore(field, form.lastElementChild);
  }
  if (document.body.classList.contains('arcade') || document.getElementById('hall')) {
    const field=document.createElement('fieldset');
    field.className='steeringProfile';
    field.innerHTML='<legend id="steeringProfileTitle">Cảm giác lái</legend>'+
      '<output for="steeringProfile"></output>'+
      '<input id="steeringProfile" name="steeringProfile" type="range" min="1" max="3" step="0.01" aria-labelledby="steeringProfileTitle">'+
      '<div class="steeringStops"><button type="button" value="1">Bản 1</button><button type="button" value="2">Bản 2</button><button type="button" value="3">Bản 3</button></div>';
    slider=field.querySelector('input');
    readout=field.querySelector('output');
    if (!document.body.classList.contains('arcade')) field.querySelector('legend').textContent='Cảm giác lái · Xuyên Việt và Cúp';
    applySteering(settings.steeringProfile);
    slider.addEventListener('input',()=>applySteering(slider.valueAsNumber));
    slider.addEventListener('change',()=>{applySteering(slider.valueAsNumber);save();});
    field.querySelector('.steeringStops').addEventListener('click',({target})=>{
      if (target.type==='button') {applySteering(target.value);save();}
    });
    form.insertBefore(field,form.querySelector('fieldset'));
  }
  form.addEventListener('change', ({target}) => {
    if (target.type !== 'radio') return;
    settings[target.name] = document.body.dataset[target.name] = target.value;
    save();
  });
  document.body.append(dialog);
  for (const button of buttons) {
    button.addEventListener('click', () => dialog.showModal());
  }
})();
