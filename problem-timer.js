(() => {
  'use strict';
  const KEY='five-day-countdown-problem-timer-v1';
  const clampMinutes=value=>Math.max(1,Math.min(600,Math.round(Number(value)||30)));
  const defaults={durationMs:30*60000,remainingMs:30*60000,endTime:0,running:false,completed:false};
  let timer={...defaults};
  try {
    const saved=JSON.parse(localStorage.getItem(KEY)||'null');
    if(saved&&Number.isFinite(saved.durationMs)&&Number.isFinite(saved.remainingMs)&&Number.isFinite(saved.endTime)) timer={...defaults,...saved};
  } catch {}
  if(timer.running&&timer.endTime<=Date.now())timer={...timer,running:false,remainingMs:0,completed:true};

  function mount() {
    if(document.getElementById('problemTimerToggle'))return;
    document.getElementById('openRaccoonArt')?.remove();
    const toggle=document.createElement('button');
    toggle.id='problemTimerToggle';toggle.type='button';toggle.className='problem-timer-toggle';toggle.setAttribute('aria-label','เปิดตัวจับเวลาทำโจทย์');
    const settings=document.querySelector('.settings-wrap'),row=settings?.parentElement;
    if(row)row.insertBefore(toggle,row.firstChild);else document.querySelector('.topbar')?.appendChild(toggle);
    const modal=document.createElement('div');modal.id='problemTimerModal';modal.className='problem-timer-backdrop';modal.hidden=true;
    modal.innerHTML=`<section class="problem-timer-card" role="dialog" aria-modal="true" aria-labelledby="problemTimerTitle">
      <div class="problem-timer-head"><div><p class="problem-timer-kicker">FOCUS ROUND</p><h2 id="problemTimerTitle">จับเวลาทำโจทย์</h2></div><button class="problem-timer-close" id="problemTimerClose" type="button" aria-label="ปิด">×</button></div>
      <div class="problem-timer-display" id="problemTimerDisplay">30:00</div><p class="problem-timer-status" id="problemTimerStatus">พร้อมเริ่มทำโจทย์</p>
      <div class="problem-timer-presets" aria-label="เลือกเวลา"><button class="problem-timer-preset" data-minutes="15">15 นาที</button><button class="problem-timer-preset" data-minutes="30">30 นาที</button><button class="problem-timer-preset" data-minutes="45">45 นาที</button><button class="problem-timer-preset" data-minutes="60">60 นาที</button></div>
      <label class="problem-timer-field">กำหนดเวลาเอง (นาที)<input id="problemTimerMinutes" type="number" inputmode="numeric" autocomplete="off" min="1" max="600" step="1" value="30" aria-label="จำนวนนาที"></label>
      <div class="problem-timer-actions"><button class="problem-timer-action primary" id="problemTimerPrimary" type="button">เริ่ม</button><button class="problem-timer-action" id="problemTimerAdd" type="button">+5 นาที</button><button class="problem-timer-action" id="problemTimerReset" type="button">ตั้งใหม่</button></div>
    </section>`;
    document.body.appendChild(modal);
    const display=document.getElementById('problemTimerDisplay'),status=document.getElementById('problemTimerStatus'),minutes=document.getElementById('problemTimerMinutes'),primary=document.getElementById('problemTimerPrimary'),card=modal.firstElementChild;
    const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(timer));}catch{}};
    const remaining=()=>timer.running?Math.max(0,timer.endTime-Date.now()):Math.max(0,timer.remainingMs);
    const format=ms=>{const total=Math.ceil(Math.max(0,ms)/1000),hours=Math.floor(total/3600),mins=Math.floor(total/60)%60,seconds=total%60;return hours?`${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`:`${String(mins).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;};
    function render() {
      const left=remaining();
      if(timer.running&&left<=0){timer.running=false;timer.remainingMs=0;timer.completed=true;save();modal.hidden=false;primary.focus();}
      display.textContent=format(left);
      if(document.activeElement!==minutes)minutes.value=String(Math.max(1,Math.round(timer.durationMs/60000)));
      card.classList.toggle('is-done',timer.completed);toggle.classList.toggle('is-running',timer.running);toggle.classList.toggle('is-done',timer.completed);
      primary.textContent=timer.running?'พัก':timer.completed?'เริ่มรอบใหม่':left<timer.durationMs?'ทำต่อ':'เริ่ม';
      status.textContent=timer.completed?'หมดเวลาทำโจทย์แล้ว':timer.running?'กำลังจับเวลา · Countdown หลักยังทำงานตามเดิม':left<timer.durationMs?'พักเวลาไว้แล้ว':'พร้อมเริ่มทำโจทย์';
      toggle.textContent=timer.completed?'ทำโจทย์ · หมดเวลา':timer.running||left<timer.durationMs?`ทำโจทย์ ${format(left)}`:'จับเวลาทำโจทย์';
      document.querySelectorAll('.problem-timer-preset').forEach(button=>button.classList.toggle('is-selected',Number(button.dataset.minutes)===Math.round(timer.durationMs/60000)));
    }
    function setDuration(value){const ms=clampMinutes(value)*60000;timer={durationMs:ms,remainingMs:ms,endTime:0,running:false,completed:false};save();render();}
    toggle.addEventListener('click',()=>{modal.hidden=false;render();primary.focus();});
    document.getElementById('problemTimerClose').addEventListener('click',()=>{modal.hidden=true;toggle.focus();});
    modal.addEventListener('click',event=>{if(event.target===modal){modal.hidden=true;toggle.focus();}});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden){event.stopImmediatePropagation();modal.hidden=true;toggle.focus();}},true);
    document.querySelectorAll('.problem-timer-preset').forEach(button=>button.addEventListener('click',()=>setDuration(button.dataset.minutes)));
    minutes.addEventListener('focus',()=>minutes.select());
    minutes.addEventListener('change',()=>setDuration(minutes.value));
    minutes.addEventListener('keydown',event=>{
      if(event.key!=='Enter')return;
      event.preventDefault();setDuration(minutes.value);minutes.blur();primary.focus();
    });
    primary.addEventListener('click',()=>{
      if(timer.running){timer.remainingMs=remaining();timer.running=false;timer.endTime=0;}
      else {if(timer.completed||timer.remainingMs<=0)timer.remainingMs=timer.durationMs;timer.completed=false;timer.running=true;timer.endTime=Date.now()+timer.remainingMs;}
      save();render();
    });
    document.getElementById('problemTimerAdd').addEventListener('click',()=>{timer.completed=false;timer.durationMs+=300000;if(timer.running)timer.endTime+=300000;else timer.remainingMs+=300000;save();render();});
    document.getElementById('problemTimerReset').addEventListener('click',()=>setDuration(minutes.value));
    setInterval(render,250);render();
    if(timer.completed)modal.hidden=false;
  }
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/extension-sw.js').catch(()=>{});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();

