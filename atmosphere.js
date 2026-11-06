/* Quiet, local-only atmosphere. Audio starts only after a user gesture. */
(() => {
  'use strict';
  const KEY='five-day-countdown-journey-story-v1';
  const lines=['Prepare before the road gets hard.','No one is coming. Keep moving.','You have less time than you think.','The easy part is over.','Now we find out who you are.','Stand your ground.'];
  const thought=document.getElementById('journeyThought');
  const note=document.getElementById('journeyAudioNote');
  let prefs={}, state=null, stage=0, record=null, lastSave=0, phraseTimer=0, phraseClearTimer=0;
  let audio=null, tone=null, carrier=null, modulator=null, modDepth=null, gain=null, audioAllowed=false;
  let running=false, gainLevel=0;
  function save() { if(record) {record.lastSeen=Date.now();try {localStorage.setItem(KEY,JSON.stringify(record));}catch {}lastSave=Date.now();} }
  function clearWords() {clearTimeout(phraseTimer);clearTimeout(phraseClearTimer);thought.classList.remove('is-visible');thought.textContent='';}
  function say(text) {
    if(!prefs.enabled||!prefs.words||document.hidden) return;
    clearWords();thought.textContent=text;thought.classList.add('is-visible');
    phraseTimer=setTimeout(()=>{thought.classList.remove('is-visible');phraseClearTimer=setTimeout(()=>thought.textContent='',800);},9500);
  }
  function restore(next,currentStage) {
    let stored;try {stored=JSON.parse(localStorage.getItem(KEY));}catch {}
    const same=stored?.endTime===next.endTime;
    record={endTime:next.endTime,highestStage:same&&Number.isInteger(stored.highestStage)?stored.highestStage:-1,lastSeen:Date.now()};
    if(next.remaining>0) {
      if(same&&Date.now()-Number(stored.lastSeen)>=4*3600000) say('The journey continued without you.');
      else if(currentStage>record.highestStage) say(lines[currentStage]);
    }
    record.highestStage=Math.max(record.highestStage,currentStage);save();
  }
  function audioStatus(text) {if(note.textContent!==text)note.textContent=text;}
  function stopSound() {
    running=false;gainLevel=0;
    if(audio&&audio.state==='running') audio.suspend().catch(()=>{});
  }
  function startSound() {
    const allowed=prefs.enabled&&prefs.audio&&prefs.volume>0&&state?.remaining>0;
    if(!allowed) {stopSound();audioStatus(!prefs.audio?'เสียงปิดอยู่':state?.remaining<=0?'เงียบเมื่อจบการเดินทาง':'เสียงพักอยู่');return;}
    if(!audioAllowed) {audioStatus('กดที่หน้าโปรแกรมเพื่อเปิดเสียงที่บันทึกไว้');return;}
    try {
      if(!audio) {
        audio=new (window.AudioContext||window.webkitAudioContext)();
        gain=audio.createGain();gain.gain.value=0;
        // A quiet 40 Hz fundamental plus a softly amplitude-modulated carrier remains
        // audible on more speakers without clicks or downloaded audio files.
        tone=audio.createOscillator();tone.type='sine';tone.frequency.value=40;
        const toneGain=audio.createGain();toneGain.gain.value=.72;
        carrier=audio.createOscillator();carrier.type='sine';carrier.frequency.value=180;
        const carrierGain=audio.createGain();carrierGain.gain.value=.28;
        modulator=audio.createOscillator();modulator.type='sine';modulator.frequency.value=40;
        modDepth=audio.createGain();modDepth.gain.value=.16;
        modulator.connect(modDepth);modDepth.connect(carrierGain.gain);
        tone.connect(toneGain);toneGain.connect(gain);carrier.connect(carrierGain);carrierGain.connect(gain);gain.connect(audio.destination);
        tone.start();carrier.start();modulator.start();
      }
      if(!running) {running=true;audio.resume().catch(()=>{running=false;audioStatus('กดอีกครั้งเพื่อเริ่มเสียง');});}
      const nextLevel=prefs.volume/100*.09;
      if(gainLevel!==nextLevel) {gain.gain.setTargetAtTime(nextLevel,audio.currentTime,.4);gainLevel=nextLevel;}
      audioStatus('กำลังเล่นโทน 40 Hz · เล่นต่อในเบื้องหลัง');
    } catch {audioStatus('เครื่องนี้ไม่พร้อมเล่นเสียงบรรยากาศ');}
  }
  window.journeyAtmosphere={
    preferences(next) {prefs=next;if(!prefs.words||!prefs.enabled)clearWords();startSound();},
    sync(next,currentStage) {
      const changedEnd=state?.endTime!==next.endTime;state=next;stage=currentStage;
      if(changedEnd)restore(next,currentStage);
      else if(record&&currentStage>record.highestStage) {record.highestStage=currentStage;if(next.remaining>0)say(lines[currentStage]);save();}
      if(Date.now()-lastSave>30000)save();
      if(next.remaining<=0)clearWords();
      startSound();
    },
    reset() {clearWords();record=null;state=null;stopSound();try{localStorage.removeItem(KEY);}catch{}},
    finish() {clearWords();stopSound();},
    outcome() {clearWords();stopSound();}
  };
  function gesture(){audioAllowed=true;startSound();}
  document.addEventListener('pointerdown',gesture);document.addEventListener('keydown',gesture);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){save();clearWords();}else{if(record&&state?.remaining>0&&Date.now()-record.lastSeen>=4*3600000)say('The journey continued without you.');save();startSound();}});
  window.addEventListener('pagehide',()=>{save();clearWords();stopSound();audio?.close().catch(()=>{});});
})();

