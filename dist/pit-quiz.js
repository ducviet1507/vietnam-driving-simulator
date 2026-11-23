'use strict';
window.createPitQuiz=function(dialog,onWrong,onReady){
  const $=selector=>dialog.querySelector(selector);
  const resume=$('#repair'),another=$('#anotherQuestion'),prompt=$('#prompt');
  let deck=[],last,round=0;
  function draw(){
    if(!deck.length){
      deck=[...window.driveBank];
      for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
      if(deck.at(-1).id===last)deck.reverse();
    }
    const q=deck.pop();last=q.id;return q;
  }
  resume.onclick=()=>{round++;dialog.close();onReady();};
  if(another)another.onclick=()=>show('practice',true);
  async function show(kind,allowMore=false){
    const practice=kind==='practice',currentRound=++round;
    dialog.oncancel=e=>{
      e.preventDefault();
      if(allowMore&&!resume.hidden)resume.click();
    };
    $('#remark').textContent=practice?'Ôn một câu với Chú Tư':kind==='water'?'Chú Tư kéo xe lên bờ rồi!':kind==='car'?'Cản sau đâu phải nút bấm còi!':kind==='curve'?'Cua trái, cản trước đi thẳng.':kind==='downhill'?'Đổ đèo, đừng đổ phụ tùng!':'Lề đường vừa xin chữ ký.';
    const choices=$('#choices'),img=$('#pitImage');
    choices.replaceChildren();img.hidden=true;resume.hidden=!practice;
    if(another)another.hidden=true;
    $('#reply').textContent='';prompt.textContent='Đang tải câu hỏi…';
    if(!dialog.open)dialog.showModal();
    if(!window.driveBank){
      try{await import('./bank.js');}
      catch{
        if(currentRound!==round)return;
        prompt.textContent='Chưa tải được câu hỏi. Hãy kiểm tra kết nối rồi thử lại.';
        const retry=document.createElement('button');retry.textContent='Thử tải lại';
        retry.onclick=()=>show(kind,allowMore);choices.append(retry);retry.focus();return;
      }
    }
    if(currentRound!==round)return;
    const q=draw();
    prompt.textContent=q.prompt;img.hidden=!q.image;
    img.alt=q.imageAlt||'';
    if(q.image)img.src=q.image;else img.removeAttribute('src');
    $('#reply').textContent=practice?'':'Chú Tư đang mở nắp ca-pô. Trả lời câu này để chú ráp xe.';
    q.choices.forEach((text,i)=>{
      const b=document.createElement('button');b.textContent=String.fromCharCode(65+i)+'. '+text;b.onclick=()=>{
        markQuizAnswer(choices.children[q.correct],true);
        if(i!==q.correct){
          markQuizAnswer(b,false);b.disabled=true;
          $('#reply').textContent=onWrong()+' Đáp án đúng là '+String.fromCharCode(65+q.correct)+'.';
          choices.children[q.correct].focus();return;
        }
        for(const item of choices.children)item.disabled=true;
        $('#reply').textContent=practice?'Chú Tư gật đầu. Đúng rồi!':'Chuẩn bài! Cản trước đã về với chính chủ.';
        resume.hidden=false;
        if(another)another.hidden=!allowMore;
        resume.focus();
      };choices.append(b);
    });
    if(allowMore)prompt.focus();
  }
  return show;
};
