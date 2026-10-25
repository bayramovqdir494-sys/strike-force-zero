// Procedural WebAudio: weapons, explosions, UI, adaptive music.
let ctx=null,master,sfx,mus,NB,rev,amb,ambN=[],ambTheme=null,muted=false,adMuted=false,musOn=false,musT=0,musLvl=0,step=0,timer=null;
let tOff=0; const now=()=>ctx?ctx.currentTime+tOff:0;
const VOL={m:1,s:1,u:1}; function g(){ if(master) master.gain.value=(muted||adMuted)?0:0.8*VOL.m; if(sfx)sfx.gain.value=.9*VOL.s; if(mus)mus.gain.value=.35*VOL.u; if(amb)amb.gain.value=.5*VOL.s; }
function nz(t,d,f,v,type='lowpass',q=1,dest){ if(!ctx)return; const s=ctx.createBufferSource(); s.buffer=NB; const fl=ctx.createBiquadFilter(); fl.type=type; fl.frequency.value=f; fl.Q.value=q; const gg=ctx.createGain(); gg.gain.setValueAtTime(v,t); gg.gain.exponentialRampToValueAtTime(.001,t+d); s.connect(fl).connect(gg).connect(dest||sfx); s.start(t,Math.random()*1.5); s.stop(t+d+.02); }
function tn(t,d,f0,f1,v,type='sine',dest){ if(!ctx)return; const o=ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+d); const gg=ctx.createGain(); gg.gain.setValueAtTime(.0001,t); gg.gain.exponentialRampToValueAtTime(v,t+.005); gg.gain.exponentialRampToValueAtTime(.0001,t+d); o.connect(gg).connect(dest||sfx); o.start(t); o.stop(t+d+.03); }
const GUN={pistol:[1800,.25,.12,140],smg:[2150,.16,.09,150],rifle:[1500,.32,.14,110],shotgun:[900,.5,.3,70],sniper:[1100,.6,.45,60],lmg:[1300,.35,.15,95],launcher:[500,.45,.5,50],goldrifle:[1700,.34,.15,120],deagle:[1250,.38,.22,85],ak:[1300,.36,.17,95],pump:[820,.55,.34,62],m60:[1150,.38,.17,85],m82:[780,.75,.6,42],m32:[620,.3,.38,72],supp:[2600,.09,.05,170],enemy:[1400,.12,.12,110],boss:[900,.3,.16,70]};
const GV={pistol:.62,smg:.55,rifle:.8,shotgun:1,sniper:1,lmg:.78,launcher:.9,goldrifle:.82,deagle:.85,ak:.85,pump:1,m60:.82,m82:1,m32:.7,supp:.28,enemy:.5,boss:.75};
function rshot(t,d,f,v,dest){ nz(t,d,f,v,'lowpass',1,dest); }
function mkRev(){ const L=ctx.sampleRate*1.6, b=ctx.createBuffer(2,L,ctx.sampleRate); for(let c=0;c<2;c++){ const d=b.getChannelData(c); for(let i=0;i<L;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/L,3.2); } const cv=ctx.createConvolver(); cv.buffer=b; return cv; }
function loopN(f,type,q,v,lfoF,lfoA){ const o=ctx.createBufferSource(); o.buffer=NB; o.loop=true; const fl=ctx.createBiquadFilter(); fl.type=type; fl.frequency.value=f; fl.Q.value=q; const gg=ctx.createGain(); gg.gain.value=v; o.connect(fl).connect(gg).connect(amb); o.start(); const n=[o];
  if(lfoF){ const l=ctx.createOscillator(); l.frequency.value=lfoF; const lg=ctx.createGain(); lg.gain.value=lfoA; l.connect(lg).connect(gg.gain); l.start(); n.push(l); const l2=ctx.createOscillator(); l2.frequency.value=lfoF*.37; const lg2=ctx.createGain(); lg2.gain.value=f*.35; l2.connect(lg2).connect(fl.frequency); l2.start(); n.push(l2); } ambN.push(...n); }
function hum(f,v){ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=f; const fl=ctx.createBiquadFilter(); fl.frequency.value=f*3; const gg=ctx.createGain(); gg.gain.value=v; o.connect(fl).connect(gg).connect(amb); o.start(); ambN.push(o); }
function ambEvent(){ if(!ctx||!ambTheme||ctx.state!=='running')return; const t=now(), th=ambTheme, r=Math.random();
  if(th==='jungle'){ if(r<.5){ const f=2200+Math.random()*1800; for(let i=0;i<2+Math.random()*4;i++) tn(t+i*.11,.08,f,f*1.25,.035,'sine',amb); } else if(r<.7) tn(t,.4,500,380,.03,'triangle',amb); }
  else if(th==='night'){ if(r<.25) nz(t,1.8,320,.12,'lowpass',1,amb); if(r>.9){ tn(t,.5,1300,900,.02,'sine',amb); } }
  else if(th==='refinery'||th==='fortress'){ if(r<.5) for(let i=0;i<3;i++) nz(t+Math.random()*.4,.03,2500+Math.random()*2000,.06,'bandpass',2,amb); if(r>.93) nz(t,2.2,180,.18,'lowpass',1,amb); }
  else if(th==='snow'||th==='mountain'){ if(r<.2) tn(t,2.5,420+Math.random()*120,300,.012,'sine',amb); }
  else if(r<.12){ nz(t,1.5,900,.05,'bandpass',.6,amb); }
  if(r>.97&&th!=='jungle'){ // distant gunfire / thunder flavour
    const n=3+Math.random()*6|0; for(let i=0;i<n;i++) nz(t+i*.12+Math.random()*.04,.25,700,.05,'lowpass',1,amb); } }
function music(){ // 16-step loop, intensity musLvl 0..2
  const t0=now()+0.05, bpm=118, s16=60/bpm/4;
  for(let i=0;i<4;i++){ const t=t0+i*s16, st=(step+i)%16, bar=Math.floor((step+i)/16)%4;
    if(musLvl>0){ if(st%4===0) { tn(t,.25,120,40,.5,'sine',mus); }
      if(st%2===1) nz(t,.04,8000,.06,'highpass',1,mus);
      if(st===4||st===12) nz(t,.18,1800,.18,'bandpass',.7,mus); }
    const root=[55,55,49,58.27][bar]; const pat=[0,0,12,0,7,0,12,10,0,0,12,0,7,12,3,10];
    if(musLvl>0||st%2===0) tn(t,s16*.9,root*Math.pow(2,pat[st]/12)*(musLvl>0?2:1),root*Math.pow(2,pat[st]/12)*(musLvl>0?2:1),musLvl>0?.09:.04,'sawtooth',mus);
    if(st===0){ for(const k of [0,3,7]) tn(t,s16*15,root*4*Math.pow(2,k/12),root*4*Math.pow(2,k/12),.025,'triangle',mus); }
    if(musLvl>1 && st%4===2) tn(t,.12,880,440,.04,'square',mus);
  }
  step+=4;
}
export const A={
  init(off){ if(off){ ctx=off; } else { if(ctx){ if(ctx.state==='suspended')ctx.resume(); return; } try{ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;} }
    master=ctx.createGain(); const lim=ctx.createDynamicsCompressor(); lim.threshold.value=-3; lim.knee.value=0; lim.ratio.value=20; lim.attack.value=.001; lim.release.value=.12; master.connect(lim).connect(ctx.destination); const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-16; comp.knee.value=10; comp.ratio.value=4; comp.attack.value=.004; comp.release.value=.25; comp.connect(master);
    sfx=ctx.createGain(); sfx.gain.value=.9; sfx.connect(comp); rev=mkRev(); const rg=ctx.createGain(); rg.gain.value=.32; rev.connect(rg).connect(comp); amb=ctx.createGain(); amb.gain.value=.5; amb.connect(comp); setInterval(ambEvent,700); mus=ctx.createGain(); mus.gain.value=.35; mus.connect(comp); g();
    NB=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate); const d=NB.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    timer=setInterval(()=>{ if(musOn&&ctx.state==='running') music(); },60/118*1000); },
  ambience(th){ if(!ctx)return; for(const n of ambN){ try{n.stop();}catch(e){} } ambN=[]; ambTheme=th; if(!th)return;
    const W={desert:[[420,'bandpass',.6,.14,.13,.08]],oasis:[[380,'bandpass',.6,.1,.11,.06],[5200,'highpass',1,.012,7,.008]],canyon:[[300,'bandpass',.9,.16,.09,.1]],snow:[[700,'bandpass',1.4,.13,.17,.09],[260,'lowpass',1,.08,.07,.04]],mountain:[[500,'bandpass',1.1,.13,.12,.08]],
      night:[[3500,'highpass',.7,.07,.6,.015],[180,'lowpass',1,.22,.09,.15]],jungle:[[2600,'highpass',.7,.05,.5,.01],[6200,'bandpass',8,.025,18,.02]],refinery:[[140,'lowpass',1,.15,.05,.05]],fortress:[[220,'lowpass',1,.16,.07,.07],[1800,'bandpass',1,.03,.3,.02]]}[th]||[];
    for(const w of W) loopN(...w); if(th==='refinery'){ hum(50,.03); hum(100.5,.015); } if(th==='fortress') hum(46,.025); },
  _at(t){ tOff=t; }, get _ctx(){ return ctx; }, get _master(){ return master; },
  vol(k,v){ VOL[k]=v; g(); },
  toggle(){ muted=!muted; g(); return muted; }, adMute(v){ adMuted=v; g(); }, isMuted:()=>muted,
  music(on,lvl=1){ musOn=on; musLvl=lvl; },
  shot(type,dist=0){ if(!ctx)return; const t=now(), p=GUN[type]||GUN.rifle, v=Math.max(.05,1-dist/60)*(GV[type]||.8), far=Math.min(1,dist/45), j=.92+Math.random()*.16;
    // transient crack, body, sub thump, mechanical click, reverb tail; distance muffles highs and adds a late echo
    nz(t,.012,7000*j,.45*v*(1-far*.8),'highpass',.7); nz(t,p[1],p[0]*j*(1-far*.6),.6*v,'lowpass'); tn(t,p[2],p[3]*j,32,.7*v,'sine');
    if(dist<5){ tn(t+.015,.025,3200,2200,.06,'square'); }
    const s=ctx.createGain(); s.gain.value=.5+far*.6; s.connect(rev); nz(t,p[1]*.8,p[0]*.7,.35*v,'lowpass',1,s);
    if(far>.3) nz(t+.18+far*.25,p[1]*1.4,600,.12*v,'lowpass',1);
    if(type==='sniper'||type==='shotgun'||type==='launcher') { nz(t+.05,.9,300,.18*v); tn(t,.25,70,30,.4*v,'sine'); } },  dry(){ const t=now(); tn(t,.03,2000,1500,.15,'square'); },
  reload(st){ const t=now(); if(st===0){ nz(t,.06,3000,.3,'bandpass',3); tn(t,.05,600,300,.15,'square'); } else { nz(t,.05,4000,.35,'bandpass',4); tn(t+.05,.06,900,1300,.15,'square'); } },
  casing(){ const t=now(); tn(t,.06,4200+Math.random()*1500,3800,.04,'triangle'); },
  hit(head){ const t=now(); tn(t,.06,head?1600:1100,head?2400:900,.18,'square'); if(head) tn(t+.05,.12,2400,2400,.12,'sine'); },
  ric(){ const t=now(); tn(t,.18,3000+Math.random()*2000,900,.05,'sine'); },
  hurt(){ const t=now(); nz(t,.2,500,.4); tn(t,.15,180,90,.3,'sawtooth'); },
  boom(dist=0){ const t=now(), v=Math.max(.1,1-dist/80); nz(t,1.4,700,1.0*v); const s=ctx&&ctx.createGain(); if(s){ s.gain.value=.9; s.connect(rev); nz(t,2.2,500,.6*v,'lowpass',1,s); } for(let i=0;i<5;i++) nz(t+.25+Math.random()*.9,.05,3000+Math.random()*3000,.06*v,'bandpass',2); tn(t,.8,90,25,1.0*v,'sine'); nz(t,.3,3000,.4*v,'bandpass',.5); },
  roar(){ if(!ctx)return; const t=now(); tn(t,1.3,95,48,.55,'sawtooth'); tn(t+.02,1.2,142,70,.3,'sawtooth'); nz(t,1.4,420,.45,'lowpass',2); const s=ctx.createGain(); s.gain.value=.8; s.connect(rev); nz(t,1.6,300,.4,'lowpass',1,s); tn(t,.9,60,28,.8,'sine'); },
  pin(){ const t=now(); tn(t,.05,2600,2600,.15,'square'); tn(t+.07,.05,1800,1800,.1,'square'); },
  tick(){ tn(now(),.03,1500,1500,.08,'square'); },
  knife(){ const t=now(); nz(t,.15,5000,.35,'bandpass',2); tn(t+.08,.12,200,60,.4,'sine'); },
  whoosh(){ nz(now(),.35,900,.25,'bandpass',.8); },
  step(r){ if(!ctx)return; const t=now(), v=r?1.5:1;
    if(ambTheme==='snow'){ nz(t,.11,1800,.07*v,'bandpass',1.5); nz(t+.02,.08,600,.05*v); }
    else if(ambTheme==='night'||ambTheme==='jungle'){ nz(t,.09,1400,.06*v,'bandpass',1); nz(t+.03,.12,3800,.03*v,'highpass'); }
    else if(ambTheme==='desert'||ambTheme==='oasis'||ambTheme==='canyon'){ nz(t,.1,900,.06*v,'bandpass',.8); nz(t,.05,300,.06*v); }
    else { nz(t,.05,2200,.05*v,'bandpass',2); nz(t,.07,500,.07*v); } },
  ui(){ const t=now(); tn(t,.07,900,1400,.1,'triangle'); },
  buy(){ const t=now(); [0,4,7,12].forEach((k,i)=>tn(t+i*.06,.15,660*Math.pow(2,k/12),660*Math.pow(2,k/12),.12,'triangle')); },
  streak(n){ const t=now(); for(let i=0;i<Math.min(n,5);i++) tn(t+i*.05,.2,440*Math.pow(2,i*4/12),440*Math.pow(2,i*4/12),.12,'sawtooth'); },
  slowmo(){ const t=now(); tn(t,1.2,300,60,.35,'sine'); nz(t,1.2,400,.2,'lowpass'); },
  win(){ const t=now(); [0,4,7,12,16,19,24].forEach((k,i)=>tn(t+i*.11,.5,330*Math.pow(2,k/12),330*Math.pow(2,k/12),.14,'triangle')); },
  lose(){ const t=now(); [0,-3,-7,-12].forEach((k,i)=>tn(t+i*.2,.6,330*Math.pow(2,k/12),320*Math.pow(2,k/12),.14,'sawtooth')); },
  heli(on){ if(!ctx)return; if(on&&!this._h){ const o=ctx.createBufferSource(); o.buffer=NB; o.loop=true; const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=260; const gg=ctx.createGain(); gg.gain.value=.0; const l=ctx.createOscillator(); l.frequency.value=14; const lg=ctx.createGain(); lg.gain.value=.25; l.connect(lg).connect(gg.gain); o.connect(f).connect(gg).connect(sfx); o.start(); l.start(); this._h=[o,l,gg]; gg.gain.setTargetAtTime(.25,now(),.3);} if(!on&&this._h){ const [o,l,gg]=this._h; gg.gain.setTargetAtTime(0,now(),.4); setTimeout(()=>{try{o.stop();l.stop();}catch(e){}},1500); this._h=null; } },
};
