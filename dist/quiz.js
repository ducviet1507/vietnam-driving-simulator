(() => {
  'use strict';
  const dialog = document.getElementById('quiz');
  const source = window.driveBankSource;
  const chapters = window.driveChapters;
  let license, state;
  function selectLicense(code) {
    license=driveLicenses.get(code);
    state=null;
    try { state=JSON.parse(localStorage.getItem(driveLicenses.studyKey(license.code))); } catch {}
    if (!state || !state.results || typeof state.results!=='object') state={results:{},run:null};
  }
  const save = () => {
    try {
      const key=driveLicenses.studyKey(license.code);
      const latest=JSON.parse(localStorage.getItem(key));
      state.results={...state.results,...latest?.results};
      localStorage.setItem(key,JSON.stringify(state));
    } catch {}
  };
  const bank = () => driveLicenses.questions(license.code);
  const lookup = id => bank().find(q => q.id === Number(id));
  const letter = index => String.fromCharCode(65 + index);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const attempted = id => Object.hasOwn(state.results, id);
  const retry = () => bank().filter(q => attempted(q.id) && state.results[q.id] !== q.correct);
  let road = null;
  let chapterIndex = 0;
  const chapterBank = index => bank().filter(q => q.id>=chapters[index][0] && q.id<=chapters[index][1]);

  function mount(compact) {
    const parent = document.fullscreenElement || (compact ? document.getElementById('console') : document.body);
    if (dialog.parentNode !== parent) parent.append(dialog);
    dialog.classList.toggle('q-road', compact);
    dialog.setAttribute('aria-labelledby','quiz-title');
    if (!dialog.open) { if (compact) dialog.show(); else dialog.showModal(); }
    if (compact && !document.fullscreenElement && matchMedia('(max-width:820px)').matches) dialog.scrollIntoView({block:'nearest'});
    dialog.scrollTop = 0;
  }

  function chrome(section, content) {
    dialog.innerHTML = '<div class="q-top"><strong>' + escape(section) + '</strong>' +
      (road ? '' : '<button type="button" class="q-close" aria-label="Đóng thư viện" data-action="close">×</button>') + '</div>' + content;
  }
  function library() {
    const all = bank(), done = all.filter(q => attempted(q.id)).length, missed = retry();
    const run = state.run;
    const options=['A','B','C'].map(code=>'<option value="'+code+'"'+(code===license.code?' selected':'')+'>Hạng '+code+'</option>').join('');
    chrome('Thư viện lý thuyết', '<label class="q-license">Hạng ôn tập <select id="studyLicense">'+options+'</select></label><h2 id="quiz-title">Bộ ' + all.length + ' câu sát hạch</h2>' +
      '<div class="q-metrics"><span>Đã làm <b>' + done + ' / ' + all.length + '</b></span><span>Đã trả lời đúng <b>' + (done - missed.length) + '</b></span></div>' +
      '<progress aria-label="Số câu đã làm" value="' + done + '" max="' + all.length + '"></progress>' +
      (run && run.ids?.length && run.index < run.ids.length && lookup(run.ids[run.index]) ? '<button class="q-primary" data-action="resume">Tiếp tục lượt đang ôn · câu ' + run.ids[run.index] + '</button>' : '') +
      '<h3>Chọn chương</h3><div class="q-chapters">' + chapters.map(([first,last,title],index) =>
        chapterBank(index).length?'<button class="q-chapter" data-chapter="' + index + '"><strong>' + title + '</strong><small>' + chapterBank(index).length + ' câu</small></button>':'').join('') + '</div>' +
      '<div class="q-tools"><button class="q-secondary" data-action="critical">Ôn câu điểm liệt</button><button class="q-secondary" data-action="missed" ' + (missed.length ? '' : 'disabled') + '>Ôn câu sai (' + missed.length + ')</button>' +
      '<form class="q-jump"><label for="q-number">Số câu trong bộ gốc</label><input id="q-number" type="number" min="1" max="600" required inputmode="numeric" placeholder="1–600"><button class="q-secondary">Mở</button></form></div>' +
      '<a class="q-source" href="' + source + '" target="_blank" rel="noopener">Xem tài liệu gốc · Cục CSGT 2025 ↗</a>');
    dialog.scrollTop = 0;
  }

  function chapter() {
    const title = chapters[chapterIndex][2], pool=chapterBank(chapterIndex);
    if(!pool.length)return library();
    let chunks = '';
    for (let offset=0; offset<pool.length; offset+=10) {
      const group=pool.slice(offset,offset+10), count=group.filter(q=>attempted(q.id)).length;
      chunks += '<button class="q-chapter" data-chunk="' + offset + '"><strong>Câu ' + group[0].id + '–' + group.at(-1).id + '</strong><small>Đã làm ' + count + '/' + group.length + '</small></button>';
    }
    chrome('Hạng '+license.code+' · Chương ' + (chapterIndex + 1), '<h2 id="quiz-title">' + title + '</h2><div class="q-chapters">' + chunks + '</div>' +
      '<button class="q-secondary q-back" data-action="library">Về thư viện</button>');
    dialog.scrollTop = 0;
  }

  function begin(ids) {
    if (!ids.length) return library();
    state.run = {ids,index:0,answers:[]}; save(); question();
  }

  function question() {
    const run = state.run;
    const q = road ? road.question : lookup(run.ids[run.index]);
    const chosen = road ? road.answer : run.answers[run.index];
    const answered = Number.isInteger(chosen);
    const matched = chosen === q.correct;
    const text = road ? 'Quyết định trên đường' : 'Ôn lý thuyết · ' + (run.index + 1) + '/' + run.ids.length;
    let html = '<div class="q-label">Hạng '+license.code+' · Câu ' + q.id + (license.critical.has(q.id) ? ' · Điểm liệt' : '') + ' · ' + chapters.find(([a,b]) => q.id >= a && q.id <= b)[2] + '</div>' +
      '<h2 id="quiz-title">' + escape(q.prompt) + '</h2>';
    if (q.image) html += '<img class="q-image" src="' + escape(q.image) + '" alt="' + escape(q.imageAlt) + '">';
    html += '<div class="q-options">' + q.choices.map((choice,i) =>
      '<button type="button" class="q-option" data-choice="' + i + '" ' + (answered ? 'disabled' : '') + '><b>' + letter(i) + '</b><span>' + escape(choice) + '</span></button>').join('') + '</div>';
    if (answered) html += '<div class="q-feedback" role="status"><strong>' + (matched ? 'Chính xác' : 'Đáp án đúng là ' + letter(q.correct)) + '</strong>' +
      (road && road.coaching ? '<p>' + escape(road.coaching) + '</p>' : '') + '</div>' +
      '<button class="q-primary" data-action="next">' + (road ? 'Tiếp tục lái' : run.index + 1 === run.ids.length ? 'Xem kết quả' : 'Câu tiếp theo') + '</button>';
    if (!road) html += '<button class="q-secondary q-back" data-action="library">Về thư viện</button>';
    chrome(text,html);
    if (answered) {
      const buttons = dialog.querySelectorAll('[data-choice]');
      markQuizAnswer(buttons[q.correct],true);
      if (!matched) markQuizAnswer(buttons[chosen],false);
      dialog.querySelector('[data-action="next"]').focus({preventScroll:false});
    }
    else {dialog.scrollTop=0;dialog.querySelector('.q-option')?.focus({preventScroll:true});}
  }

  function summary() {
    const {ids,answers} = state.run;
    const missed = ids.filter((id,index) => answers[index] !== lookup(id).correct);
    chrome('Kết quả lượt ôn','<h2 id="quiz-title">Đúng ' + (ids.length - missed.length) + ' / ' + ids.length + ' câu</h2>' +
      (missed.length ? '<button class="q-primary" data-action="round-retry">Làm lại ' + missed.length + ' câu sai</button>' : '') +
      '<button class="q-secondary q-back" data-action="library">Chọn bài tiếp theo</button>');
    dialog.scrollTop=0;
  }

  dialog.addEventListener('cancel', e => { if (road) e.preventDefault(); });
  dialog.addEventListener('change',e=>{
    if(e.target.id!=='studyLicense')return;
    selectLicense(e.target.value);
    driveLicenses.setStudyClass(license.code);
    library();dialog.querySelector('#studyLicense').focus();
  });
  dialog.addEventListener('input',e=>{if(e.target.id==='q-number')e.target.setCustomValidity('');});
  dialog.addEventListener('submit', e => {
    e.preventDefault();
    const q = lookup(dialog.querySelector('#q-number').value);
    if (q) begin([q.id]);
    else {const input=dialog.querySelector('#q-number');input.setCustomValidity('Câu này nằm ngoài bộ câu hỏi hạng '+license.code+'.');input.reportValidity();}
  });
  dialog.addEventListener('click',e => {
    const button = e.target.closest('button');
    if (!button || button.disabled) return;
    const {action,choice,chapter: selected,chunk} = button.dataset;
    if (choice !== undefined) {
      const q = road ? road.question : lookup(state.run.ids[state.run.index]);
      const picked = Number(choice);
      if (road) { road.answer = picked; window.driveAudio?.cue(picked === q.correct); } else state.run.answers[state.run.index] = picked;
      state.results[q.id] = picked;
      driveLicenses.rememberAnswers(license.code,[[q.id,picked]]);
      if(!road)save();
      return question();
    }
    if (action === 'next') {
      if (road) {
        const result = road.answer === road.question.correct;
        const resume = road.resume;
        road = null; dialog.close(); resume(result); return;
      }
      state.run.index++; save();
      return state.run.index < state.run.ids.length ? question() : summary();
    }
    if (road) return;
    if (action === 'close') return dialog.close();
    if (action === 'library') return library();
    if (action === 'resume') return question();
    if (action === 'round-retry') return begin(state.run.ids.filter((id,i) => state.run.answers[i] !== lookup(id).correct));
    if (action === 'missed') return begin(retry().map(q=>q.id));
    if (action === 'critical') return begin([...license.critical]);
    if (selected !== undefined) {chapterIndex=Number(selected);return chapter();}
    if (chunk !== undefined) {
      const offset=Number(chunk);
      begin(chapterBank(chapterIndex).slice(offset,offset+10).map(q=>q.id));
    }
  });
  document.addEventListener('fullscreenchange', () => {
    if (road && dialog.open) mount(true);
  });
  document.addEventListener('keydown', event => {
    if (!road || !dialog.open || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = '1234'.indexOf(event.key);
    if (index < 0) return;
    const choice = dialog.querySelector('[data-choice="' + index + '"]:enabled');
    if (choice) { event.preventDefault(); choice.click(); }
  });
  window.openRouteReview = ids => {
    if(road || !ids.length)return;
    selectLicense('B');
    begin(ids.slice());mount(false);
  };
  window.openQuiz = chapterNumber => {
    if (road) return;
    selectLicense(driveLicenses.studyClass());
    if (Number.isInteger(chapterNumber) && chapterNumber >= 1 && chapterNumber <= chapters.length) {
      chapterIndex = chapterNumber - 1;
      chapter();
    } else {
      library();
    }
    mount(false);
  };
  window.openRoadQuestion = (id, coachingText, onContinue) => {
    selectLicense('B');
    const q = lookup(id);
    if (!q) throw new Error('Không tìm thấy câu ' + id);
    road = {question:q,coaching:coachingText,resume:onContinue};
    question(); mount(true);
  };
})();
