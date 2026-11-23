(() => {
  'use strict';

  // Cục CSGT, Công văn 2262/CSGT-P5, mục II và Phụ lục I, III.
  // https://xaydungchinhsach.chinhphu.vn/huong-dan-su-dung-bo-600-cau-hoi-dung-de-sat-hach-lai-xe-co-gioi-duong-bo-119250513110514585.htm
  // These are the original question numbers in the 600-question bank.
  const motorcycleIds = new Set([
    1,2,3,4,5,6,7,8,9,10,11,12,13,19,20,21,22,24,26,27,
    28,29,30,31,32,33,34,35,36,37,38,39,40,41,43,44,45,46,47,48,
    49,51,52,53,54,56,57,59,63,64,65,66,67,68,69,70,71,72,73,74,
    75,76,77,80,81,87,88,90,91,92,93,94,96,97,98,99,100,102,103,107,
    109,110,111,119,123,124,125,126,137,138,140,141,142,145,146,151,155,163,167,178,
    182,185,187,189,191,192,193,194,195,200,
    206,215,219,232,233,240,241,242,254,255,257,258,259,260,261,
    303,304,305,306,307,313,314,315,317,318,322,323,324,325,326,329,330,335,345,346,
    347,348,349,350,351,354,360,362,364,366,367,368,369,370,371,372,373,374,375,376,
    377,380,381,382,386,387,389,390,391,393,394,395,397,398,400,401,411,412,413,415,
    419,422,427,430,431,432,433,434,435,437,438,439,440,441,442,445,450,451,452,454,
    455,457,458,459,460,461,474,475,476,478,
    486,487,490,492,495,499,500,503,504,505,507,508,509,517,520,525,527,528,
    529,538,539,540,543,548,553,556,559,560,562,565,567,568,583,592,600
  ]);
  const motorcycleCritical = new Set([
    19,20,21,22,24,26,27,28,30,47,48,52,53,63,64,65,68,70,71,72
  ]);
  const allIds = new Set(Array.from({length:600}, (_,i) => i+1));
  const allCritical = new Set([
    19,20,21,22,23,24,25,26,27,28,30,32,34,35,47,48,52,53,55,58,
    63,64,65,66,67,68,70,71,72,73,74,85,86,87,88,89,90,91,92,93,
    97,98,102,117,163,165,167,197,198,206,215,226,234,245,246,252,253,254,255,260
  ]);

  // Thông tư 12/2025/TT-BCA, Phụ lục II và IV, áp dụng đến hết 28/02/2027
  // theo Điều 41 Thông tư 108/2026/TT-BCA. Quotas exclude the one critical question.
  // https://bocongan.gov.vn/KND/vb/vbqp/Lists/VBQP/Attachments/2822/Thong%20tu%2012.2025.TT.BCA.pdf
  const classes = {
    A:{code:'A', count:25, minutes:19, pass:23, ids:motorcycleIds, critical:motorcycleCritical, quotas:[8,1,1,0,8,6]},
    B:{code:'B', count:30, minutes:20, pass:27, ids:allIds, critical:allCritical, quotas:[8,1,1,1,9,9]},
    C:{code:'C', count:40, minutes:24, pass:36, ids:allIds, critical:allCritical, quotas:[10,1,2,1,14,11]}
  };
  const roadTopics = {
    A:new Set([35,48,68,76,110,167,242,257,259,260,261,306,349,539]),
    C:new Set([176,213,277,302,310,311,337,341,342,462,463,502,521,522,523,524,535])
  };
  function get(code) {
    return Object.hasOwn(classes, code) ? classes[code] : classes.B;
  }
  function questions(code, bank = window.driveBank) {
    const {ids} = get(code);
    return bank.filter(question => ids.has(question.id));
  }
  function shuffled(values) {
    const items = Array.from(values);
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
  function roadDeck(code, bank = window.driveBank) {
    const pool = shuffled(questions(code, bank));
    const topics = roadTopics[get(code).code];
    if (!topics) return pool;

    const featured = pool.filter(q => topics.has(q.id));
    const other = pool.filter(q => !topics.has(q.id));
    const order = [];
    while (featured.length) {
      order.push(featured.pop());
      if (other.length) order.push(other.pop());
      if (other.length) order.push(other.pop());
    }
    return order.concat(other).reverse();
  }
  function drawExam(code) {
    const {ids, critical, quotas} = get(code);
    const ordinary = Array.from(ids).filter(id => !critical.has(id));
    const picked = window.driveChapters.flatMap(([first,last],index) => {
      const chapter = ordinary.filter(id => id >= first && id <= last);
      return shuffled(chapter).slice(0, quotas[index]);
    });
    picked.push(shuffled(critical)[0]);
    return shuffled(picked);
  }
  function studyKey(code) {
    const license = get(code).code;
    return license === 'B' ? 'taylai.csgt2025.study.v1' : 'taylai.csgt2025.study.' + license.toLowerCase() + '.v1';
  }
  function rememberAnswers(code, entries) {
    const key = studyKey(code);
    const ids = get(code).ids;
    try {
      let state;
      try { state = JSON.parse(localStorage.getItem(key)); } catch {}
      if (!state || typeof state !== 'object' || Array.isArray(state)) state = {run:null};
      if (!state.results || typeof state.results !== 'object' || Array.isArray(state.results)) state.results = {};
      for (const [id, choice] of entries) {
        if (ids.has(id) && Number.isInteger(choice) && choice >= 0) state.results[id] = choice;
      }
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }
  function studyClass() {
    const requested=new URLSearchParams(location.search).get('hang');
    if(Object.hasOwn(classes,requested))return requested;
    try {return get(localStorage.getItem('taylai.study.license')).code;} catch {return 'B';}
  }
  function setStudyClass(code) {
    try {localStorage.setItem('taylai.study.license',get(code).code);} catch {}
    const url=new URL(location.href);
    if(url.searchParams.has('hang')){
      url.searchParams.set('hang',get(code).code);
      history.replaceState(null,'',url);
    }
  }
  window.driveLicenses = {get, questions, drawExam, roadDeck, studyKey, rememberAnswers, studyClass, setStudyClass};
})();
