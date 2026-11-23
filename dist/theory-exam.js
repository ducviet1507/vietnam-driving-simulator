(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const exam = params.get('mode') === 'exam';
  const bank = new Map(window.driveBank.map(question => [question.id, question]));
  let license, sessionName, state, storageWritable=true;
  function valid(s) {
    return s && Array.isArray(s.ids) && s.ids.length === license.count && new Set(s.ids).size === license.count &&
      s.ids.every(id => license.ids.has(id)&&bank.has(id)) && s.ids.filter(id => license.critical.has(id)).length === 1 &&
      Array.isArray(s.answers) && s.answers.length === license.count && s.answers.every((a,i) => a === null || (Number.isInteger(a) && a >= 0 && a < bank.get(s.ids[i]).choices.length)) &&
      Array.isArray(s.flags) && s.flags.length === license.count && Number.isInteger(s.index) && s.index >= 0 && s.index < license.count &&
      Number.isFinite(s.deadline) && ['running','done'].includes(s.status);
  }
  function readPaper() {
    if(!storageWritable)return null;
    try {const s=JSON.parse(localStorage.getItem(sessionName));if(valid(s))return s;}catch{}
    return null;
  }
  function samePaper(a,b) {
    if(!a||!b)return a===b;
    return a.deadline===b.deadline&&a.ids.every((id,i)=>id===b.ids[i]);
  }
  function synchronize() {
    const latest=readPaper();
    if(!latest)return;
    if(samePaper(latest,state)&&latest.status===state.status)latest.index=state.index;
    if(JSON.stringify(latest)===JSON.stringify(state))return;
    if($('confirm').open&&(!samePaper(latest,state)||latest.status==='done'))$('confirm').close();
    state=latest;display();tick();
  }
  // Apply just this action to the newest copy. Each tab keeps the question it is viewing.
  function editPaper(change) {
    const key=sessionName,paper=state,status=state?.status,index=state?.index;
    function apply() {
      if(key!==sessionName)return;
      const latest=readPaper()||state;
      if(!samePaper(paper,latest)||latest?.status!==status){synchronize();return;}
      state=latest;
      if(state)state.index=index;
      if(status==='running'&&Date.now()>=state.deadline)complete(true);
      else change();
      try {localStorage.setItem(key,JSON.stringify(state));storageWritable=true;}catch{storageWritable=false;}
      display();tick();
    }
    if(navigator.locks)return navigator.locks.request(key,apply).catch(error=>{
      if(error.name!=='SecurityError')throw error;
      apply();
    });
    apply();
  }
  function start() {
    const ids=driveLicenses.drawExam(license.code);
    return editPaper(()=>{
      state = {ids,answers:Array(ids.length).fill(null),flags:Array(ids.length).fill(false),index:0,status:'running',deadline:Date.now()+license.minutes*60000};
    });
  }
  function grade() {
    let score = 0, criticalOK = true;
    state.ids.forEach((id,i) => {
      const ok = state.answers[i] === bank.get(id).correct;
      if (ok) score++;
      if (license.critical.has(id) && !ok) criticalOK = false;
    });
    return {score,criticalOK,passed:score >= license.pass && criticalOK};
  }
  function complete(expired) {
    state.status='done'; state.expired=expired; state.index=0;
    if ($('confirm').open) $('confirm').close();
    const result=grade();
    driveLicenses.rememberAnswers(license.code,state.ids.map((id,i)=>[id,state.answers[i]]));
    if (exam && parent !== window && location.origin !== 'null') {
      parent.postMessage({type:'drive-exam-result',part:'theory',passed:result.passed,score:result.score,maxScore:license.count}, location.origin);
    }
  }
  function tick() {
    if (!state || state.status !== 'running') return;
    const seconds = Math.ceil((state.deadline-Date.now())/1000);
    if(seconds<=0) { editPaper(()=>complete(true)); return; }
    $('clock').textContent = Math.floor(seconds/60) + ':' + String(seconds%60).padStart(2,'0');
    $('clock').classList.toggle('urgent',seconds<=60);
  }
  async function go(index) {
    await editPaper(()=>{state.index=index;});
    $('prompt').scrollIntoView({block:'nearest'});
  }
  function display() {
    const done = state.status === 'done', q = bank.get(state.ids[state.index]), choice = state.answers[state.index];
    const reveal = done || (!exam && choice !== null);
    $('welcome').hidden = true; $('workspace').hidden = false;
    $('heading').textContent=(done?'Kết quả lý thuyết hạng ':'Lý thuyết hạng ')+license.code;
    $('clock').hidden=done;
    $('result').hidden=!done;
    if(done) {
      const {score,criticalOK,passed}=grade();
      const title=document.createElement('strong'); title.textContent=(passed?'Đạt':'Chưa đạt')+' · '+score+'/'+license.count;
      const detail=document.createElement('p');detail.textContent=(state.expired?'Hết giờ. ':'')+(criticalOK?'Đúng câu điểm liệt.':'Câu điểm liệt chưa được trả lời đúng.')+(score<license.pass?' Cần đúng ít nhất '+license.pass+' câu.':'');
      $('result').replaceChildren(title,detail);
    }
    $('counter').textContent='CÂU '+String(state.index+1).padStart(2,'0')+' / '+license.count+(done?' · NGÂN HÀNG #'+q.id+(license.critical.has(q.id)?' · ĐIỂM LIỆT':''):'');
    $('prompt').textContent=q.prompt; const image=$('diagram'); image.hidden=!q.image;
    image.alt=q.imageAlt||'';
    if(q.image)image.src=q.image;else image.removeAttribute('src');
    $('choices').replaceChildren(...q.choices.map((text,i)=>{
      const button=document.createElement('button'),letter=document.createElement('b'),body=document.createElement('span');
      letter.textContent=String.fromCharCode(65+i);body.textContent=text;button.append(letter,body);
      button.disabled=done;button.setAttribute('aria-pressed', String(i===choice));
      if(reveal && (i===q.correct || i===choice))markQuizAnswer(button,i===q.correct);
      else if(i===choice)button.className='selected';
      button.onclick=async()=>{
        await editPaper(()=>{state.answers[state.index]=i;});
        $('choices').children[i]?.focus({preventScroll:true});
      };
      return button;
    }));
    $('answerNote').textContent=reveal?(choice===null?'Đã bỏ trống. ':choice===q.correct?'Bạn đã chọn đúng. ':'Bạn đã chọn sai. ')+'Đáp án '+String.fromCharCode(65+q.correct)+'.':'';
    $('grid').replaceChildren(...state.ids.map((id,i)=>{
      const button=document.createElement('button');button.textContent=String(i+1);
      const answered=state.answers[i]!==null,correct=state.answers[i]===bank.get(id).correct;
      button.className=[i===state.index?'here':'',done?(correct?'picked':'bad'):answered?'picked':'',state.flags[i]?'tag':''].join(' ');
      button.setAttribute('aria-label','Câu '+(i+1)+(done?(correct?', đúng':', cần ôn'):answered?', đã chọn':', chưa chọn')+(state.flags[i]?', đã đánh dấu':''));
      if(i===state.index)button.setAttribute('aria-current','step');button.onclick=()=>go(i);return button;
    }));
    const count=state.answers.filter(a=>a!==null).length;
    $('progress').textContent=count+'/'+license.count+' câu đã trả lời';
    $('prev').disabled=state.index===0;$('next').disabled=state.index===license.count-1;
    $('mark').hidden=done;$('mark').setAttribute('aria-pressed',String(state.flags[state.index]));
    $('mark').textContent=state.flags[state.index]?'Bỏ đánh dấu':'Đánh dấu';
    $('submit').hidden=done;$('newPaper').hidden=!done||(exam&&window!==parent);
    $('legend').textContent=done?'Xanh là câu đúng · đỏ là câu cần ôn':'Ô sáng đã trả lời · góc vàng đã đánh dấu';
  }
  function selectLicense(code) {
    license=driveLicenses.get(code);
    sessionName='taylai.theory.'+license.code.toLowerCase()+'.2026.'+(exam?'exam':'practice')+'.'+(params.get('run')||'standalone');
    storageWritable=true;state=readPaper();
    $('examLicense').value=license.code;
    $('classPicker').hidden=exam;
    $('modeLabel').textContent=exam?'Thi liên hoàn · Hạng B':'Luyện đề hạng '+license.code;
    $('licenseLabel').textContent='HẠNG '+license.code;
    $('paperCount').textContent=license.count;$('paperMinutes').textContent=license.minutes;
    $('paperPass').textContent=license.pass+'/'+license.count;$('poolCount').textContent=license.ids.size;
    $('studyLink').href='library.html?hang='+license.code;
    $('workspace').hidden=true;$('welcome').hidden=false;
    if(state){display();tick();}
  }
  $('examLicense').onchange=e=>{driveLicenses.setStudyClass(e.target.value);selectLicense(e.target.value);};
  $('begin').onclick=$('newPaper').onclick=start;
  $('prev').onclick=()=>go(state.index-1);$('next').onclick=()=>go(state.index+1);
  $('mark').onclick=()=>editPaper(()=>{state.flags[state.index]=!state.flags[state.index];});
  $('submit').onclick=()=>{
    tick();if(state.status==='done')return;
    const blanks=state.answers.filter(a=>a===null).length;
    $('confirmText').textContent=blanks?'Còn '+blanks+' câu chưa trả lời. Bạn muốn nộp bài ngay?':'Bạn đã chọn đáp án cho cả '+license.count+' câu.';
    $('confirm').showModal();
  };
  $('cancel').onclick=()=>$('confirm').close();$('send').onclick=()=>editPaper(()=>complete(false));
  selectLicense(exam?'B':driveLicenses.studyClass());
  setInterval(tick,350);
  window.addEventListener('storage',e=>{if(e.key===sessionName)synchronize();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)synchronize();tick();});
})();
