/* Procedural pixel sprites: no downloads, external fonts or sprite dependencies. */
(() => {
  'use strict';
  const KEY = 'five-day-countdown-pixel-journey-v1';
  const OUTCOME_KEY='five-day-countdown-journey-outcome-v1';
  const defaults = { enabled:true, character:'knight', scene:'castle', motion:'normal', intensity:'soft', seconds:true, particles:true, urgency:true, reduced:false, weather:true, words:true, audio:false, volume:15 };
  const fields = { enabled:'journeyEnabled', character:'journeyCharacter', scene:'journeyScene', motion:'journeyMotion', intensity:'journeyIntensity', seconds:'journeySeconds', particles:'journeyParticles', urgency:'journeyUrgency', reduced:'journeyReduced', weather:'journeyWeather', words:'journeyWords', audio:'journeyAudio', volume:'journeyVolume' };
  function sanitize(raw) {
    const next = { ...defaults };
    for (const key of ['enabled','seconds','particles','urgency','reduced','weather','words','audio']) if (typeof raw?.[key] === 'boolean') next[key] = raw[key];
    if(typeof raw?.volume==='number'&&Number.isFinite(raw.volume)) next.volume=Math.max(0,Math.min(100,raw.volume));
    const options = { character:['knight','samurai','wanderer','raccoon'], scene:['castle','mountains','wasteland'], motion:['low','normal','lively'], intensity:['soft','normal','strong'] };
    for (const [key, values] of Object.entries(options)) if (values.includes(raw?.[key])) next[key] = raw[key];
    return next;
  }
  let prefs = { ...defaults };
  try { prefs = sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { /* Invalid preferences fall back to a usable scene. */ }
  const el = document.getElementById('pixelJourney');
  const canvas = document.getElementById('journeyCanvas');
  const ctx = canvas.getContext('2d', { alpha:false });
  const endingCanvas=document.getElementById('endingCanvas');
  const endingCtx=endingCanvas.getContext('2d',{alpha:false});
  const stageLabel = document.getElementById('journeyStage');
  const actionLabel = document.getElementById('journeyAction');
  const secondsEl = document.getElementById('seconds');
  const secondsUnit = secondsEl.closest('.unit');
  secondsUnit.classList.add('journey-seconds-unit');
  const systemReduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width:660px), (max-height:570px)');
  const W = 600, H = 94, GROUND = 74, BEGIN = 36, END = 546;
  let state = null, previousSecond = null, currentStage = 0;
  let raf = 0, lastFrame = 0, sceneTime = 0, lastPaint = 0;
  let stepAt = -10000, stepParity = 0, lastMilestone = -10000, boostUntil = 0;
  let action = 'walk', nextActionAt = 0, actionUntil = 0, actionOrdinal = 0;
  let completionAt = null, finishTimer = null, finishPending = null, finishDone = false;
  let outcome=null, outcomeAt=0;
  let particles = [], particlesAnimations = [], numberAnimation = null, landingTimers = [];
  let rgb = [77,230,193], lastTheme = -10000;
  const reduced = () => prefs.reduced || systemReduced.matches;
  const visible = () => prefs.enabled && (!compact.matches || !endingCanvas.hidden) && !document.hidden;
  const animated = () => visible() && !reduced();
  const clamp = (n, min=0, max=1) => Math.max(min, Math.min(max,n));
  const mix = (a,b,n) => a.map((v,i) => Math.round(v*(1-n)+b[i]*n));
  const color = c => `rgb(${c.join(',')})`;
  const rect = (x,y,w,h,c) => { ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h))); };
  const pixelLine = (x1,y1,x2,y2,c) => {
    const steps = Math.max(Math.abs(x2-x1),Math.abs(y2-y1));
    for (let i=0;i<=steps;i++) rect(x1+(x2-x1)*i/(steps||1),y1+(y2-y1)*i/(steps||1),1,1,c);
  };
  const captions = ['เตรียมตัวออกเดินทาง','ผ่านป่าและสะพาน','ฝึกฝนระหว่างทาง','สนามรบอยู่ข้างหน้า','เตรียมพร้อมเข้าสู่สนามรบ','หน้าประตู — เตรียมใจให้พร้อม','ถึงเวลาของคุณแล้ว'];
  const actions = { walk:'ทุกวินาที คืออีกหนึ่งก้าว', map:'ตรวจแผนที่ · รู้ว่ากำลังมุ่งไปไหน', pack:'จัดสัมภาระ · เตรียมให้พร้อม', drink:'พักดื่มน้ำ · แล้วเดินต่อ', rest:'พักข้างกองไฟ · เติมแรงให้ตัวเอง', sharpen:'ลับดาบ · เตรียมรับโอกาส', train:'ฝึกดาบ · ทำวันนี้ให้ดีขึ้น', rain:'ฝ่าฝน · เดินหน้าต่อไป', bird:'เพื่อนร่วมทางตัวเล็ก', cat:'มีเพื่อนเดินทางมาด้วย', merchant:'พบพ่อค้าระหว่างทาง', ready:'ตรวจอุปกรณ์ · พร้อมเมื่อถึงเวลา', run:'ใกล้แล้ว · เตรียมตัวให้พร้อม', wait:'สูดลมหายใจ · เชื่อในสิ่งที่เตรียมมา', flag:'อีกหนึ่งนาทีผ่านไป · เดินต่อ', boost:'แรงใจมาแล้ว · ชูดาบแล้วไปต่อ', gate:'ประตูเปิดแล้ว · ถึงเวลาลงมือ', breathe:'หยุดตั้งหลัก · แล้วเดินต่อ', glasses:'มองทางข้างหน้าให้ชัด', collar:'เตรียมตัว · ยังมีทางให้เดิน', victory:'แสงแรกเป็นของคุณ', kneel:'พักหายใจ · เรื่องราวยังไม่จบ', rise:'ลุกขึ้นอีกครั้ง · เส้นทางยังอยู่' };
  function stage(percent) { return percent<=0 ? 6 : percent<=1 ? 5 : percent<=10 ? 4 : percent<=25 ? 3 : percent<=50 ? 2 : percent<=75 ? 1 : 0; }
  function position() { return BEGIN + (END-BEGIN)*clamp(1-(state?.percentage ?? 100)/100); }
  function refreshTheme(now) {
    if(now-lastTheme<1000) return;
    lastTheme=now;
    const raw=getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').split(',').map(Number);
    if(raw.length===3 && raw.every(Number.isFinite)) rgb=raw;
  }
  function palette() {
    const urgent=prefs.urgency && currentStage>=4;
    const accent=urgent?mix(rgb,[246,144,103],.6):rgb;
    const dark=prefs.weather?Math.min(currentStage,5)*.075:0;
    const dawn=outcome==='win'?(reduced()?1:clamp((performance.now()-outcomeAt)/1800)):0;
    return { accent:color(mix(accent,[239,196,129],dawn*.6)), sky:color(mix(mix([8,17,28],[5,9,18],dark),[77,62,68],dawn)), ridge:color(mix(mix([17,30,43],accent,.09),[99,83,87],dawn)), hill:color(mix(mix([23,40,48],accent,.12),[76,81,83],dawn)), tree:color(mix([24,47,53],accent,.18)), grass:color(mix([39,65,64],accent,.18)), ground:color(mix([18,28,36],accent,.06)), pale:'#d8e5e7', gold:'#dfb876', muted:color(mix([58,76,87],accent,.17)) };
  }
  // Deterministic ornaments keep the landscape calm and stable between frames.
  const seed = n => { const v=Math.sin(n*127.1+311.7)*43758.5453; return v-Math.floor(v); };
  function mountain(x,y,w,h,c) {
    for(let i=0;i<h;i+=3) { const width=Math.max(4,w*(i+3)/h); rect(x+(w-width)/2,y+i,width,3,c); }
  }
  function pine(x,y,size,p) {
    rect(x-1,y-size,2,size,p.muted);
    for(let i=0;i<3;i++) mountain(x-size/2-i*2,y-size+i*4,size+i*4,size*.65,p.tree);
  }
  function flag(x,y,p,t,small=false) {
    rect(x,y,1,small?13:23,p.muted);
    const wave=Math.sin(t*2+x)>0?1:0;
    rect(x+1,y+1,small?6:10,4,p.accent); rect(x+(small?5:8),y+2+wave,3,3,p.accent);
  }
  function fire(x,y,p,t) {
    pixelLine(x-5,y,x+4,y-2,'#8f7058');pixelLine(x-4,y-2,x+5,y,'#8f7058');
    const flicker=Math.floor(t*4)%2;
    rect(x-3,y-6,6,5,'#b1744d');rect(x-2,y-8-flicker,4,6,p.gold);rect(x,y-7-flicker,1,5,'#ffe2ac');
    if(!reduced()) rect(x+Math.sin(t)*3,y-11-(t*4%5),1,1,p.gold);
  }
  function camp(p,t) {
    mountain(10,51,30,22,p.muted);mountain(15,55,21,18,p.tree);mountain(21,61,8,12,p.ground);
    pixelLine(8,73,26,49,p.gold);pixelLine(26,49,43,73,p.gold);fire(49,73,p,t);
  }
  function gate(p,t,now) {
    const gx=END+9;
    const elapsed=completionAt===null?0:(now-completionAt)/1000;
    const opening=completionAt===null?0:reduced()?1:clamp((elapsed-.25)/1.1);
    const stone=prefs.scene==='wasteland'?color(mix([81,65,58],rgb,.1)):p.muted;
    if(prefs.scene==='mountains') {
      rect(gx-13,29,5,45,stone);rect(gx+21,29,5,45,stone);rect(gx-18,27,49,4,p.tree);rect(gx-13,34,39,3,stone);
      rect(gx-20,24,53,3,p.muted);
    } else {
      rect(gx-14,33,14,41,stone);rect(gx+17,33,14,41,stone);rect(gx,46,18,5,stone);
      for(let i=0;i<3;i++) { rect(gx-14+i*5,30,3,5,stone);rect(gx+17+i*5,30,3,5,stone); }
      rect(gx-9,43,3,6,p.gold);rect(gx+22,43,3,6,p.gold);
      for(let y=54;y<74;y+=8) { rect(gx-13,y,12,1,p.tree);rect(gx+18,y+3,12,1,p.tree); }
    }
    rect(gx,51,17,23,p.ground);
    if(opening>0) { ctx.globalAlpha=opening*.75;rect(gx+1,52,15,22,p.gold);ctx.globalAlpha=1; }
    for(let i=0;i<5;i++) rect(gx+i*4,51,1,Math.max(1,23*(1-opening)),p.tree);
    if(opening<1) rect(gx,62-opening*10,17,2,stone);
    flag(gx+24,9,p,t);
  }
  // Each head is a hand-drawn, 1-pixel sprite; body and tools switch by action.
  const heads={
    knight:['    rrr    ','   rrrrr   ','  dsssssd  ','  dshhhhd  ','  dsssssd  ','   sbbbs   ','   sssssd  ','    sssd   '],
    samurai:['  g   g    ','  grrrg    ',' rrrrrrr   ',' rrbbbbb   ','  hhhhhd   ','  hbhbbd   ','   hhhdd   ','    ddd    '],
    wanderer:['    ddd    ','   ccccc   ','  ccccccc  ',' ccchhhhc  ',' cchbhbbc  ','  cchhhcc  ','   ccccc   ','    ccc    '],
    raccoon:[' dd bbb dd ',' dsbbbbbds ',' dsssssssd ','  sbrrbrb  ','  sbrrbrb  ','  sswwwww  ','   wwbww   ','    wbb    ']
  };
  function sprite(rows,x,y,colors) { rows.forEach((row,j)=>[...row].forEach((c,i)=>{if(colors[c])rect(x+i,y+j,1,1,colors[c]);})); }
  function warrior(x,now,t,p,pose) {
    const footPhase=reduced()?0:clamp((now-stepAt)/600);
    const stepping=footPhase<1 && ['walk','run','bird','cat','merchant'].includes(pose);
    const stride=stepping?Math.sin(footPhase*Math.PI)*(pose==='run'?3:2):0;
    const bob=stepping?-Math.round(Math.sin(footPhase*Math.PI)*1):0;
    const breath=pose==='breathe'&&!reduced()?Math.round((Math.sin(t*2)+1)*1.5):0;
    const crouch=pose==='kneel'?7:pose==='rise'&&!reduced()?Math.round(7*(1-clamp((now-outcomeAt-1700)/1200))):['rest','pack','sharpen'].includes(pose)?4:breath;
    const baseX=Math.round(x)-5, baseY=GROUND-23+bob+crouch;
    const raccoon=prefs.character==='raccoon';
    const cloth=raccoon?'#9b453e':prefs.character==='samurai'?'#bd7a6c':prefs.character==='wanderer'?p.tree:p.accent;
    const colors={r:raccoon?'#bd5055':cloth,s:raccoon?'#9b9a8d':'#8ea6b6',h:raccoon?'#b1afa0':'#ddb899',b:raccoon?'#262529':'#273742',d:'#233746',g:p.gold,c:cloth,w:'#d0c6ac'};
    const legY=GROUND-7;
    // Shadow, cape, torso, boots, then head.
    rect(x-9,GROUND+1,19,2,'#0b1821');
    const capeWave=reduced()?0:Math.round(Math.sin(t*3)*1);
    if(raccoon) {
      const tailWave=reduced()?0:Math.round(Math.sin(t*2));
      pixelLine(baseX+2,baseY+17,baseX-8,baseY+19+tailWave,'#817b70');
      rect(baseX-11,baseY+15+tailWave,8,5,'#817b70');rect(baseX-11,baseY+14+tailWave,3,4,'#aca391');
      rect(baseX-7,baseY+15+tailWave,2,5,'#303035');rect(baseX-3,baseY+17,2,4,'#303035');
      rect(baseX,baseY+8,4,10,cloth);rect(baseX+7,baseY+8,4,10,cloth);
    } else {rect(baseX-2,baseY+9,4,9,cloth);rect(baseX-4+capeWave,baseY+12,3,7,cloth);}
    rect(baseX+2,baseY+8,7,9,prefs.character==='knight'?'#647e91':cloth);
    rect(baseX+2,baseY+10,7,2,p.muted);rect(baseX+2,baseY+15,7,2,p.gold);
    if(raccoon) {
      rect(baseX+4,baseY+8,3,9,'#c5ae8e');rect(baseX+4,baseY+11,2,2,'#814a49');rect(baseX+6,baseY+14,1,2,'#814a49');
      pixelLine(baseX+2,baseY+8,baseX+4,baseY+12,'#d78467');pixelLine(baseX+8,baseY+8,baseX+7,baseY+12,'#d78467');
      rect(baseX+2,baseY+17,8,1,'#24272c');
    }
    const sign=stepParity?1:-1;
    rect(baseX+2-stride*sign,legY+Math.min(crouch,3),3,6,raccoon?'#333740':'#3c5364');rect(baseX+7+stride*sign,legY+Math.min(crouch,3),3,6,raccoon?'#4c4a4b':'#78919e');
    rect(baseX+1-stride*sign,GROUND-2,5,2,raccoon?'#a8a294':'#b4c3c9');rect(baseX+6+stride*sign,GROUND-2,5,2,raccoon?'#a8a294':'#b4c3c9');
    sprite(heads[prefs.character],baseX,baseY,colors);
    const handX=baseX+10, handY=baseY+12;
    rect(baseX+9,baseY+9,3,5,raccoon?cloth:'#839bab');
    if(pose==='glasses') {rect(handX,baseY+6,2,6,cloth);rect(handX-2,baseY+4,4,2,colors.h);}
    else if(pose==='collar') {pixelLine(handX,handY,baseX+6,baseY+9,colors.h);rect(baseX,baseY+7,3,3,'#d78467');}
    else if(pose==='breathe'||pose==='kneel'||pose==='rise') {pixelLine(handX,handY,handX-2,handY+4,colors.h);}
    else if(pose==='victory') {flag(handX+6,GROUND-31,p,t);rect(handX,handY,7,2,colors.h);}
    else if(pose==='map') { rect(handX-1,handY-1,10,7,p.gold);rect(handX+1,handY,1,5,'#746c53');rect(handX+4,handY+1,3,1,'#746c53'); }
    else if(pose==='drink') { rect(handX,baseY+4,3,5,p.pale);rect(handX-1,baseY+8,3,3,colors.h); }
    else if(pose==='rain') { pixelLine(baseX+6,baseY-5,baseX+6,baseY+13,p.gold);mountain(baseX-8,baseY-12,29,8,cloth); }
    else if(pose==='pack') { rect(handX,GROUND-8,8,8,p.gold);rect(handX+3,GROUND-10,3,2,p.muted); }
    else if(pose==='flag') { flag(handX+5,GROUND-27,p,t,true);rect(handX,handY,6,2,colors.h); }
    else if(pose==='boost' || pose==='gate' || pose==='train') {
      const swing=pose==='train'&&!reduced()?Math.sin(t*5)*6:0;
      pixelLine(handX,handY,handX+6,handY-4,p.pale);pixelLine(handX+6,handY-4,handX+8+swing,handY-20,p.pale);rect(handX+3,handY-6,7,2,p.gold);
    } else if(pose==='sharpen') { rect(handX-1,handY+3,18,2,p.pale);rect(handX+4,handY+1,4,2,p.muted);if(Math.floor(t*5)%2===0)rect(handX+12,handY,1,1,p.gold); }
    else { rect(handX+1,handY,2,10,p.pale);rect(handX-1,handY,6,2,p.gold); }
    if(pose==='rest') fire(x+22,GROUND,p,t);
    if(pose==='cat') { const cx=x-24;rect(cx,GROUND-5,8,4,p.gold);rect(cx+6,GROUND-8,4,4,p.gold);rect(cx+6,GROUND-10,1,2,p.gold);rect(cx+9,GROUND-10,1,2,p.gold);pixelLine(cx-4,GROUND-7,cx,GROUND-4,p.gold);rect(cx+1,GROUND-1,2,2,p.muted);rect(cx+6,GROUND-1,2,2,p.muted); }
    if(pose==='merchant') { rect(x+26,GROUND-16,6,6,p.gold);rect(x+24,GROUND-10,10,9,p.tree);rect(x+21,GROUND-11,3,8,p.gold);rect(x+25,GROUND-1,3,2,p.muted);rect(x+30,GROUND-1,3,2,p.muted); }
    if(pose==='bird') { const bx=x-15+Math.sin(t)*12, by=GROUND-34;pixelLine(bx-3,by-2,bx,by,p.gold);pixelLine(bx,by,bx+3,by-2,p.gold); }
    if(pose==='boost') for(let i=0;i<7;i++) rect(x+Math.cos(t*2+i)*17,baseY+8+Math.sin(t*2+i)*18,1,2,p.gold);
  }
  function chooseAction(now) {
    if(outcome==='win')return 'victory';
    if(outcome==='lose')return !reduced()&&now-outcomeAt<1700?'kneel':'rise';
    if(completionAt!==null) return 'gate';
    if(now<boostUntil) return 'boost';
    if(state && state.totalSeconds<=10 && prefs.urgency) return 'train';
    if(currentStage===5) return 'wait';
    if(now-lastMilestone<1700) return 'flag';
    if(now<actionUntil) return action;
    if(currentStage>=4 && prefs.urgency) return 'run';
    if(now>=nextActionAt && animated()) {
      const pool=currentStage===0?['pack','map','bird','drink']:currentStage===1?['map','drink','cat','merchant','rain']:currentStage===2?['train','sharpen','rest','breathe']:['map','ready','breathe'];
      if(prefs.character==='raccoon')pool.push('glasses','collar','breathe');
      action=pool[Math.floor(seed(actionOrdinal++ + Math.floor(Date.now()/60000))*pool.length)];actionUntil=now+4000;
      nextActionAt=now+(prefs.motion==='lively'?12000:prefs.motion==='low'?30000:20000);
      return action;
    }
    return state?.seconds<=15&&state?.seconds>0?'ready':'walk';
  }
  function paint(now) {
    refreshTheme(now);
    const p=palette(), t=reduced()||(completionAt!==null&&!outcome)?0:sceneTime, x=position();
    rect(0,0,W,H,p.sky);
    const travel=(1-(state?.percentage??100)/100)*23;
    const parallax=reduced()?0:(t*.65+travel);
    // Moon, distant peaks and passing clouds use separate slow scrolling layers.
    if(outcome==='win') {rect(455,27,18,18,p.gold);rect(451,31,26,10,p.gold);ctx.globalAlpha=.13;rect(0,40,W,12,p.gold);ctx.globalAlpha=1;}
    else {rect(461,13,8,8,p.muted);rect(459,15,12,4,p.muted);rect(461,13,5,6,p.sky);}
    for(let i=0;i<18;i++) { const sx=seed(i)*W,sy=seed(i+80)*32+4;ctx.globalAlpha=outcome==='win'?.07:.3+seed(i+90)*.3;rect(sx,sy,1,1,p.pale); }ctx.globalAlpha=1;
    for(let i=0;i<8;i++) { const mx=i*104-(parallax*.3%104)-80;mountain(mx,26+seed(i+20)*14,150,53,p.ridge); }
    for(let i=0;i<6;i++) { const mx=i*135-(parallax*.7%135)-40;mountain(mx,47,157,27,p.hill); }
    for(let i=0;i<4;i++) { const cx=(i*183+W-(parallax%W))%W;ctx.globalAlpha=.14;rect(cx,15+i%2*8,27,2,p.pale);rect(cx+8,12+i%2*8,12,3,p.pale);ctx.globalAlpha=1; }
    for(let i=0;i<10;i++) {
      const tx=70+i*46;
      if(prefs.scene==='wasteland') { pixelLine(tx,72,tx-2,57,p.tree);pixelLine(tx-2,64,tx+5,59,p.tree);rect(tx+10,70,7,4,p.tree); }
      else if(prefs.scene==='mountains') mountain(tx,57,31,18,p.tree);
      else if(tx<435) pine(tx,74,15+seed(i+60)*12,p);
    }
    rect(0,74,W,20,p.ground);rect(0,75,W,1,p.grass);
    for(let i=0;i<80;i++) rect(seed(i+200)*W,79+seed(i+250)*13,i%3+1,1,i%4===0?p.grass:p.hill);
    // Short bridge and trail markers anchor the journey in physical space.
    rect(163,74,52,7,p.ridge);rect(162,73,54,2,p.muted);
    for(let i=0;i<9;i++) rect(165+i*6,73,1,3,p.gold);
    for(let i=1;i<4;i++) { const mx=BEGIN+(END-BEGIN)*i/4;rect(mx,69,2,6,p.muted);rect(mx-2,68,6,2,p.grass); }
    camp(p,t);gate(p,t,now);
    const pose=chooseAction(now);
    warrior(x,now,t,p,pose);
    const storm=prefs.weather&&!outcome&&completionAt===null;
    el.dataset.weather=outcome==='win'?'dawn':outcome==='lose'?'clearing':!storm?'clear':currentStage>=2?'rain':currentStage>=1?'wind':'clear';
    if(storm&&currentStage>=1) {
      ctx.globalAlpha=.1;
      for(let i=0;i<5;i++) {const wx=(seed(i+400)*W-t*9+W*100)%W;rect(wx,42+i*7,25+i*11,2,p.pale);}
      ctx.globalAlpha=1;
    }
    if(storm&&(currentStage>=2||pose==='rain')) {
      ctx.globalAlpha=.15+Math.min(currentStage,5)*.025;
      for(let i=0;i<12+currentStage*6;i++){const rx=(seed(i+320)*W-t*(12+currentStage*2)%W+W)%W,ry=(seed(i+340)*75+t*45)%74;pixelLine(rx,ry,rx-2,ry+4,p.pale);}ctx.globalAlpha=1;
      ctx.globalAlpha=.07;rect(0,60,W,14,p.pale);ctx.globalAlpha=1;
    }
    const landingAge=now-stepAt;
    if(!reduced() && landingAge>=0 && landingAge<500) {ctx.globalAlpha=(1-landingAge/500)*.6;for(let i=0;i<4;i++)rect(x-8+i*5,GROUND+3-(landingAge/150),2,1,p.gold);ctx.globalAlpha=1;}
    if(now-lastMilestone<1700) flag(x-15,GROUND-13,p,t,true);
    if(actionLabel.textContent!==actions[pose]) actionLabel.textContent=actions[pose];
    el.dataset.action=pose;
    el.dataset.position=x.toFixed(2);
    el.dataset.gate=completionAt===null?'closed':now-completionAt>=1350?'open':'opening';
    el.dataset.character=prefs.character;
    el.dataset.outcome=outcome||'';
    if(outcome&&!endingCanvas.hidden) {endingCtx.imageSmoothingEnabled=false;endingCtx.drawImage(canvas,300,0,300,H,0,0,600,188);}
    lastPaint=now;
  }
  function frame(now) {
    raf=0;
    if(!animated()) return;
    const interval=prefs.motion==='low'?1000/15:1000/30;
    if(now-lastFrame>=interval) {
      const minutePace=state?.seconds<=30&&state?.seconds>15?1.2:1;
      const urgencyPace=prefs.urgency&&currentStage>=3?1.3:1;
      sceneTime+=Math.min(.1,(now-lastFrame)/1000)*(prefs.motion==='low'?.55:prefs.motion==='lively'?1.35:1)*minutePace*urgencyPace;
      lastFrame=now;paint(now);
    }
    raf=requestAnimationFrame(frame);
  }
  function startLoop() { if(animated()&&!raf) { lastFrame=performance.now();raf=requestAnimationFrame(frame); } }
  function clearEffects() {
    particlesAnimations.forEach(a=>a.cancel());particlesAnimations=[];
    particles.forEach(p=>p.remove());particles=[];
    landingTimers.forEach(clearTimeout);landingTimers=[];
    numberAnimation?.cancel();numberAnimation=null;
    secondsEl.classList.remove('journey-tick');
    secondsUnit.classList.remove('journey-beat','journey-final','journey-count-in');
  }
  function onLanding() { stepAt=performance.now();stepParity=1-stepParity; }
  function emitSparks() {
    const source=secondsEl.getBoundingClientRect(), target=canvas.getBoundingClientRect();
    const sx=source.left+source.width*.52, sy=source.bottom-4;
    const dx=target.left+position()/W*target.width, dy=target.top+GROUND/H*target.height;
    const count=prefs.intensity==='strong'?5:prefs.intensity==='normal'?3:2;
    for(let i=0;i<count;i++) {
      const dot=document.createElement('i');dot.className='journey-particle';dot.style.left=`${sx+i*5}px`;dot.style.top=`${sy}px`;document.body.appendChild(dot);particles.push(dot);
      const animation=dot.animate([{transform:'translate(0,0)',opacity:0},{transform:`translate(${(dx-sx)*.18}px,${(dy-sy)*.12}px)`,opacity:.65,offset:.2},{transform:`translate(${dx-sx-i*5}px,${dy-sy}px)`,opacity:0}],{duration:570+i*30,easing:'ease-in'});
      particlesAnimations.push(animation);
      animation.onfinish=()=>{dot.remove();particles=particles.filter(p=>p!==dot);particlesAnimations=particlesAnimations.filter(a=>a!==animation);};
    }
    const timer=setTimeout(()=>{landingTimers=landingTimers.filter(id=>id!==timer);if(animated())onLanding();},570);
    landingTimers.push(timer);
  }
  function tick(previous) {
    if(!prefs.enabled||reduced()||document.hidden) return;
    if(prefs.seconds) {
      const intensity=prefs.intensity==='strong'?1.8:prefs.intensity==='normal'?1.3:1;
      const final=prefs.urgency&&state.remaining<=10000&&state.remaining>0;
      numberAnimation?.cancel();
      numberAnimation=secondsEl.animate([{transform:final?`scale(${1+.025*intensity})`:`translateY(${-3*intensity}px) scaleY(.97)`,opacity:.88},{transform:'none',opacity:1}],{duration:280,easing:'steps(5,end)'});
      secondsUnit.classList.toggle('journey-count-in',state.seconds<=5&&state.seconds>0);
      secondsUnit.classList.toggle('journey-final',final);
      if(prefs.urgency&&state.remaining<=60000&&state.remaining>0) {secondsUnit.classList.remove('journey-beat');void secondsUnit.offsetWidth;secondsUnit.classList.add('journey-beat');}
    }
    if(!visible()) return;
    if(state.totalSeconds>0 && previous-state.totalSeconds<=2) {
      if(prefs.particles)emitSparks(); else onLanding();
      if(state.seconds===0) lastMilestone=performance.now();
    }
  }
  function updatePreferences(save=false) {
    el.hidden=!prefs.enabled;
    document.body.classList.toggle('journey-reduced',reduced());
    document.getElementById('journeyVolumeValue').textContent=`${prefs.volume}%`;
    window.journeyAtmosphere?.preferences(prefs);
    if(outcome)endingCanvas.hidden=!prefs.enabled;
    clearEffects();
    if(!animated()&&raf) {cancelAnimationFrame(raf);raf=0;}
    if(visible())paint(performance.now());
    startLoop();
    if(save) { try {localStorage.setItem(KEY,JSON.stringify(prefs));}catch {document.getElementById('settingsNote').textContent='พื้นที่บันทึกเต็ม กรุณาสำรองข้อมูลและลดขนาดภาพพื้นหลัง';} }
    if(finishPending&&!animated())deliverFinish();
  }
  for(const [key,id] of Object.entries(fields)) {
    const input=document.getElementById(id);if(typeof defaults[key]==='boolean')input.checked=prefs[key];else input.value=prefs[key];
    input.addEventListener(key==='volume'?'input':'change',()=>{prefs[key]=typeof defaults[key]==='boolean'?input.checked:key==='volume'?Number(input.value):input.value;prefs=sanitize(prefs);updatePreferences(true);});
  }
  function deliverFinish() { if(!finishPending)return;const callback=finishPending;finishPending=null;finishDone=true;clearTimeout(finishTimer);finishTimer=null;document.body.classList.remove('journey-moment');callback(); }
  function reset() {
    clearTimeout(finishTimer);finishTimer=null;finishPending=null;finishDone=false;completionAt=null;
    previousSecond=null;lastMilestone=-10000;boostUntil=0;actionUntil=0;nextActionAt=performance.now()+5000;clearEffects();
    outcome=null;outcomeAt=0;endingCanvas.hidden=true;document.body.classList.remove('journey-moment');
    try{localStorage.removeItem(OUTCOME_KEY);}catch{}
    window.journeyAtmosphere?.reset();
  }
  window.pixelJourney={
    sync(next) {
      const oldEnd=state?.endTime;
      if(oldEnd!==undefined&&oldEnd!==next.endTime)reset();
      state=next;currentStage=stage(next.percentage);
      // Some embedded Chromium versions report the new media value before its change event.
      if(document.body.classList.contains('journey-reduced')!==reduced())updatePreferences();
      if(oldEnd===undefined) {
        let saved;try{saved=JSON.parse(localStorage.getItem(OUTCOME_KEY));}catch{}
        if(next.remaining===0&&saved?.endTime===next.endTime&&['win','lose'].includes(saved.value)&&localStorage.getItem('five-day-countdown-finish-answered')===String(next.endTime)) {
          outcome=saved.value;outcomeAt=performance.now()-5000;completionAt=performance.now()-5000;finishDone=true;
        }
      }
      window.journeyAtmosphere?.sync(next,currentStage);
      stageLabel.textContent=captions[currentStage];el.dataset.stage=String(currentStage);
      const changed=previousSecond!==next.totalSeconds;
      if(changed&&previousSecond!==null)tick(previousSecond);
      previousSecond=next.totalSeconds;
      if(visible()&&(changed||(!animated()&&performance.now()-lastPaint>1000)))paint(performance.now());
      startLoop();
    },
    finish(callback) {
      if(finishDone||finishPending)return;
      completionAt=performance.now();finishPending=callback;clearEffects();
      window.journeyAtmosphere?.finish();
      if(animated())document.body.classList.add('journey-moment');
      if(animated())finishTimer=setTimeout(deliverFinish,1650);else {if(visible())paint(performance.now());deliverFinish();}
    },
    outcome(won) {
      outcome=won?'win':'lose';outcomeAt=performance.now();finishDone=true;
      endingCanvas.hidden=!prefs.enabled;clearEffects();window.journeyAtmosphere?.outcome();
      try{localStorage.setItem(OUTCOME_KEY,JSON.stringify({endTime:state.endTime,value:outcome}));}catch{}
      paint(performance.now());startLoop();
    },
    motivate() { if(prefs.enabled) {boostUntil=performance.now()+4200;if(visible())paint(performance.now());} },
    reset
  };
  systemReduced.addEventListener('change',()=>updatePreferences());compact.addEventListener('change',()=>updatePreferences());
  document.addEventListener('visibilitychange',()=>{clearEffects();updatePreferences();});
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);clearEffects();clearTimeout(finishTimer);});
  nextActionAt=performance.now()+5000;
  updatePreferences();
})();

