import { ic, il } from './icons.js';
// Meta systems: settings, achievements, daily reward, weapon skins, first-mission tutorial.
import * as THREE from 'three';
const $=id=>document.getElementById(id);
let C=null; // {save,persist,A,SDK,toast,adOK,TOUCH,getP,G,applyQ,setQ,getQ}
export const SKINS=[
  {id:'std',name:'FACTORY',price:0},
  {id:'desert',name:'DESERT DIGI',price:800,cols:['#b89a6a','#8c7048','#d4bc8c','#5e4a30'],digi:1},
  {id:'wood',name:'WOODLAND',price:900,cols:['#4c5a34','#2e3622','#6c6a44','#1c1e16']},
  {id:'arctic',name:'ARCTIC',price:1100,cols:['#e4eaf0','#a8b4c0','#6a7684','#f8fbff'],digi:1},
  {id:'tiger',name:'TIGER',price:1500,cols:['#d07a20','#1a1410'],stripe:1},
  {id:'carbon',name:'CARBON',price:2200,carbon:1},
  {id:'crimson',name:'CRIMSON OPS',ad:1,cols:['#7a1018','#1a0a0c','#b0202a'],digi:1},
  {id:'gold',name:'24K GOLD',price:6000,gold:1},
];
export const ACH=[
  {id:'blood',name:'FIRST BLOOD',d:'Eliminate an enemy',st:'kills',n:1,r:100},
  {id:'vet',name:'VETERAN',d:'Eliminate 50 enemies',st:'kills',n:50,r:500},
  {id:'mach',name:'WAR MACHINE',d:'Eliminate 250 enemies',st:'kills',n:250,r:1500},
  {id:'mark',name:'MARKSMAN',d:'Land 25 headshot kills',st:'heads',n:25,r:500},
  {id:'blade',name:'SILENT BLADE',d:'Perform 10 takedowns',st:'tds',n:10,r:600},
  {id:'demo',name:'DEMOLITIONS',d:'15 explosive kills',st:'boom',n:15,r:500},
  {id:'ramp',name:'RAMPAGE',d:'Reach a 5 kill streak',st:'streak',n:5,r:600,max:1},
  {id:'giant',name:'GIANT SLAYER',d:'Defeat a boss',st:'boss',n:1,r:1000},
  {id:'oper',name:'OPERATOR',d:'Complete 3 missions',st:'missions',n:3,r:400},
  {id:'perf',name:'PERFECTIONIST',d:'Earn 3 stars on a mission',st:'star3',n:1,r:500},
  {id:'ghost',name:'UNTOUCHABLE',d:'Finish a mission above 90% HP',st:'clean',n:1,r:700},
  {id:'loyal',name:'LOYAL SOLDIER',d:'Claim 7 daily rewards',st:'daily',n:7,r:1000},
  {id:'drip',name:'FASHION OPS',d:'Own 3 weapon skins',st:'skins',n:3,r:300,max:1},
];
const DAILY=[150,200,300,400,500,700,1200];
export function initMeta(ctx){ C=ctx; const s=C.save;
  s.set=Object.assign({sens:1,vm:1,vs:1,vu:1,inv:false,shake:1},s.set||{}); s.st=s.st||{}; s.ach=s.ach||{}; s.skins=s.skins||{own:['std'],eq:{}}; s.daily=s.daily||{last:'',n:0};
  applyVol(); buildDom(); }
export const setv=()=>C.save.set;
function applyVol(){ const t=C.save.set; C.A.vol('m',t.vm); C.A.vol('s',t.vs); C.A.vol('u',t.vu); }
// ---------- achievements ----------
export function ev(stat,n=1){ if(!C)return; const st=C.save.st; const a=ACH.find(x=>x.st===stat&&x.max); if(a) st[stat]=Math.max(st[stat]||0,n); else st[stat]=(st[stat]||0)+n; checkAch(); }
function checkAch(){ const s=C.save; let ch=false; for(const a of ACH){ if(s.ach[a.id])continue; if((s.st[a.st]||0)>=a.n){ s.ach[a.id]=Date.now(); s.money+=a.r; ch=true; achToast(a); } } if(ch)C.persist(); }
const q=[]; let qBusy=false;
function achToast(a){ q.push(a); if(!qBusy)nextT(); }
function nextT(){ const a=q.shift(); if(!a){qBusy=false;return;} qBusy=true; const e=$('achT'); e.innerHTML=`<i>${ic('trophy')}</i><div><small>ACHIEVEMENT UNLOCKED</small><b>${a.name}</b><span>${a.d} · +$${a.r}</span></div>`; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); C.A.buy&&C.A.buy(); setTimeout(()=>{ e.classList.remove('on'); setTimeout(nextT,450); },3200); }
// ---------- skins ----------
const TEX={};
function skinTex(sk){ if(TEX[sk.id])return TEX[sk.id]; const S=256, cv=document.createElement('canvas'); cv.width=cv.height=S; const g=cv.getContext('2d'); let R=sk.id.length*977;
  const rnd=()=>{ R=(R*16807)%2147483647; return R/2147483647; };
  if(sk.carbon){ g.fillStyle='#16181b'; g.fillRect(0,0,S,S); for(let y=0;y<S;y+=8)for(let x=0;x<S;x+=8){ const o=((x+y)/8)%2; const gr=g.createLinearGradient(x,y,x+8,y+8); gr.addColorStop(0,o?'#2a2e33':'#101214'); gr.addColorStop(1,o?'#14161a':'#262a2e'); g.fillStyle=gr; g.fillRect(x,y,8,8); } }
  else if(sk.stripe){ g.fillStyle=sk.cols[0]; g.fillRect(0,0,S,S); g.fillStyle=sk.cols[1]; for(let i=0;i<14;i++){ const x=rnd()*S, w=6+rnd()*12; g.beginPath(); g.moveTo(x,0); g.bezierCurveTo(x+30*rnd()-15,S*.3,x+40*rnd()-20,S*.6,x+w*.3,S); g.lineTo(x+w,S); g.bezierCurveTo(x+w+20*rnd(),S*.6,x+w-10,S*.3,x+w*.7,0); g.fill(); } }
  else { g.fillStyle=sk.cols[0]; g.fillRect(0,0,S,S); for(let k=1;k<sk.cols.length;k++){ g.fillStyle=sk.cols[k]; for(let i=0;i<(sk.digi?60:16);i++){ const x=rnd()*S, y=rnd()*S; if(sk.digi){ const c=8; for(let j=0;j<6;j++){ g.fillRect(Math.floor((x+rnd()*30)/c)*c,Math.floor((y+rnd()*20)/c)*c,c*(1+(rnd()*2|0)),c); } } else { g.beginPath(); g.ellipse(x,y,14+rnd()*30,8+rnd()*16,rnd()*3,0,7); g.fill(); g.beginPath(); g.ellipse(x+20*rnd()-10,y+16*rnd()-8,10+rnd()*20,6+rnd()*12,rnd()*3,0,7); g.fill(); } } } }
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; return TEX[sk.id]=t; }
const MC=new Map(), GC=new Map();
function boxUV(geo){ if(GC.has(geo.uuid))return GC.get(geo.uuid); const g=geo.clone(), p=g.attributes.position, n=g.attributes.normal, uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){ const ax=n?Math.abs(n.getX(i)):0, ay=n?Math.abs(n.getY(i)):0; const x=p.getX(i),y=p.getY(i),z=p.getZ(i); let u,v; if(ax>ay&&ax>(n?Math.abs(n.getZ(i)):0)){u=z;v=y;} else if(ay>ax){u=z;v=x;} else {u=x;v=y;} uv[i*2]=u*3.2; uv[i*2+1]=v*3.2; }
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); GC.set(geo.uuid,g); return g; }
export function skinOf(w){ return C?(C.save.skins.eq[w]||'std'):'std'; }
export function applySkin(obj,w,id){ id=id||skinOf(w); if(id==='std')return obj; const sk=SKINS.find(s=>s.id===id); if(!sk)return obj;
  obj.traverse(m=>{ if(!m.isMesh||!m.material||m.material.transparent)return; const mt=m.material; const c=mt.color; if(!c)return; const lum=c.r*.3+c.g*.59+c.b*.11; if(lum>.45||(mt.emissive&&mt.emissive.getHex()>0x101010&&mt.emissiveIntensity>0.5))return;
    const k=mt.uuid+id; if(!MC.has(k)){ const n=mt.clone(); if(sk.gold){ n.color.set(0xd8a838); n.metalness=1; n.roughness=.28; n.map=null; } else { n.map=skinTex(sk); n.color.set(0xffffff); n.vertexColors=false; n.metalness=sk.carbon?.4:.15; n.roughness=sk.carbon?.35:.7; } n.needsUpdate=true; MC.set(k,n); }
    m.material=MC.get(k); if(!sk.gold) m.geometry=boxUV(m.geometry); }); return obj; }
export function skinPanel(w,onChange){ const box=$('skinBox'); box.innerHTML=''; const s=C.save; const cur=skinOf(w);
  let nm=$('skinName'); if(!nm){ nm=document.createElement('div'); nm.id='skinName'; box.parentNode.appendChild(nm); } nm.textContent='SKIN · '+SKINS.find(x=>x.id===cur).name;
  for(const sk of SKINS){ const own=s.skins.own.includes(sk.id); const b=document.createElement('button'); b.className='sk'+(cur===sk.id?' on':'')+(own?' own':'');
    const sw=sk.gold?'linear-gradient(135deg,#fff2b0,#d8a838 45%,#7a5a10)':sk.carbon?'repeating-linear-gradient(45deg,#111 0 4px,#2a2e33 4px 8px)':sk.cols?`linear-gradient(135deg,${sk.cols.join(',')})`:'linear-gradient(135deg,#3a3e44,#1a1c20)';
    b.title=sk.name; b.innerHTML=`<i style="background:${sw}"></i><small>${own?(cur===sk.id?'EQUIPPED':'EQUIP'):sk.ad?ic('ad')+' AD':'$'+sk.price}</small>`;
    if(!own&&!sk.ad&&s.money<sk.price)b.classList.add('poor');
    b.onmouseenter=()=>{ nm.textContent='SKIN · '+sk.name+(own?'':sk.ad?' (WATCH AD)':' ($'+sk.price+')'); }; b.onmouseleave=()=>{ nm.textContent='SKIN · '+SKINS.find(x=>x.id===cur).name; };
    b.onclick=async()=>{ if(own){ s.skins.eq[w]=sk.id; C.persist(); C.A.ui(); onChange(); return; }
      if(sk.ad){ const r=await C.SDK.rewarded(); if(!C.adOK(r)){ C.toast('AD NOT AVAILABLE','#f88'); return; } }
      else { if(s.money<sk.price){ C.toast('NOT ENOUGH FUNDS','#f88'); return; } s.money-=sk.price; }
      s.skins.own.push(sk.id); s.skins.eq[w]=sk.id; C.persist(); C.A.buy(); C.toast(sk.name+' SKIN UNLOCKED','#7ff0b0'); ev('skins',s.skins.own.length-1); onChange(); };
    box.appendChild(b); } }
// ---------- daily ----------
const today=()=>{ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
export function dailyCheck(force){ const s=C.save; if(!force&&s.daily.last===today())return false; if(s.daily.last===today())return false;
  const y=new Date(Date.now()-864e5); const yk=y.getFullYear()+'-'+(y.getMonth()+1)+'-'+y.getDate(); const day=(s.daily.last===yk?s.daily.n:0)%7; const amt=DAILY[day];
  const p=$('daily'); const L=p.querySelector('.days'); L.innerHTML=''; DAILY.forEach((v,i)=>{ const d=document.createElement('div'); d.className='dd'+(i<day?' got':'')+(i===day?' now':''); d.innerHTML=`<small>DAY ${i+1}</small><i>${ic(i===6?'gift':'coin')}</i><b>$${v}</b>`; L.appendChild(d); });
  const fin=(mult)=>{ s.money+=amt*mult; s.daily.last=today(); s.daily.n=day+1; C.persist(); ev('daily'); C.A.buy(); C.toast('+$'+amt*mult+' DAILY REWARD','#7ff0b0'); p.classList.add('hide'); C.onMoney&&C.onMoney(); };
  p.querySelector('.claim').onclick=()=>{ C.A.init(); fin(1); }; p.querySelector('.claim2').onclick=async()=>{ C.A.init(); const r=await C.SDK.rewarded(); if(C.adOK(r)) fin(2); else C.toast('AD NOT AVAILABLE','#f88'); };
  p.querySelector('.claim2').innerHTML=il('ad','x2 ($'+amt*2+')'); p.classList.remove('hide'); return true; }
// ---------- settings ----------
export function settings(back){ const s=C.save.set; const p=$('settings'); const Q=C.getQ();
  const sl=(k,lab,min,max,step,fmt)=>`<label class="sr"><span>${lab}</span><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${s[k]}"><b>${fmt(s[k])}</b></label>`;
  const pct=v=>Math.round(v*100)+'%';
  p.querySelector('.sbody').innerHTML=`<h3>CONTROLS</h3>${sl('sens','LOOK SENSITIVITY',.3,2.5,.05,v=>(+v).toFixed(2)+'x')}<label class="sr"><span>INVERT LOOK Y</span><button class="tg" data-t="inv">${s.inv?'ON':'OFF'}</button><b></b></label>${sl('shake','CAMERA SHAKE',0,1.5,.05,pct)}
   <h3>AUDIO</h3>${sl('vm','MASTER VOLUME',0,1,.05,pct)}${sl('vs','EFFECTS',0,1,.05,pct)}${sl('vu','MUSIC',0,1,.05,pct)}
   <h3>GRAPHICS</h3><label class="sr"><span>QUALITY</span><span class="qs">${['LOW','MEDIUM','HIGH'].map((n,i)=>`<button class="tg${i===Q?' on':''}" data-q="${i}">${n}</button>`).join('')}</span><b></b></label>`;
  p.querySelectorAll('input[type=range]').forEach(r=>r.oninput=()=>{ const k=r.dataset.k; s[k]=+r.value; r.nextElementSibling.textContent=k==='sens'?(+r.value).toFixed(2)+'x':pct(+r.value); applyVol(); C.persist(); });
  p.querySelector('[data-t=inv]').onclick=e=>{ s.inv=!s.inv; e.target.textContent=s.inv?'ON':'OFF'; C.persist(); C.A.ui(); };
  p.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{ C.setQ(+b.dataset.q); p.querySelectorAll('[data-q]').forEach(x=>x.classList.toggle('on',x===b)); C.A.ui(); });
  p.querySelector('.sback').onclick=()=>{ C.A.ui(); back(); };
  C.show('settings'); }
export function achPanel(back){ const s=C.save; const L=$('achList'); L.innerHTML=''; let got=0;
  for(const a of ACH){ const v=Math.min(a.n,s.st[a.st]||0), done=!!s.ach[a.id]; if(done)got++; const d=document.createElement('div'); d.className='ach'+(done?' done':''); d.innerHTML=`<i>${ic(done?'trophy':'lock')}</i><div><b>${a.name}</b><span>${a.d}</span><em><u style="width:${v/a.n*100}%"></u></em></div><small>${done?ic('check'):v+'/'+a.n}<br>$${a.r}</small>`; L.appendChild(d); }
  $('achCount').textContent=got+' / '+ACH.length; $('achBack').onclick=()=>{ C.A.ui(); back(); }; C.show('achp'); }
function buildDom(){ const sc=$('screen'); const add=h=>{ const t=document.createElement('template'); t.innerHTML=h.trim(); return t.content.firstChild; };
  sc.appendChild(add(`<div id="settings" class="panel hide"><h2>SETTINGS</h2><div class="sbody"></div><button class="mid sback">${ic('back')}<span>BACK</span></button></div>`));
  sc.appendChild(add(`<div id="achp" class="panel hide"><h2>ACHIEVEMENTS <span id="achCount" class="dim"></span></h2><div id="achList"></div><button id="achBack" class="mid">${ic('back')}<span>BACK</span></button></div>`));
  document.body.appendChild(add(`<div id="daily" class="hide"><div class="dbox"><h2>DAILY SUPPLY DROP</h2><p class="dim">Come back every day for bigger rewards.</p><div class="days"></div><div class="row"><button class="mid claim">${ic('gift')}<span>CLAIM</span></button><button class="mid adb claim2"></button></div></div></div>`));
  document.body.appendChild(add(`<div id="achT"></div>`)); document.body.appendChild(add(`<div id="tut" class="hide"><div class="tk"></div><div class="tt"></div><div class="tp"><i></i></div></div>`)); }
// ---------- tutorial (first mission) ----------
let T=null;
export function tutStart(P){ if(C.save.tut){ T=null; return; } const tch=C.TOUCH;
  const steps=[
    {k:tch?'◐ STICK':'W A S D',t:'Move around',ok:s=>s.mv>5},
    {k:tch?'DRAG RIGHT SIDE':'MOUSE',t:'Look around',ok:s=>s.look>1.6},
    {k:tch?'AIM + FIRE':'RMB + LMB',t:'Aim down sights and fire',ok:s=>s.adsShots>=2},
    {k:tch?'SPRINT / ROLL':'SHIFT / SPACE',t:'Sprint, then dodge-roll',ok:s=>s.roll>0,skip:14},
    {k:tch?'COVER':'Q',t:'Near a wall or crate, take cover',ok:s=>s.cover>0,skip:16},
    {k:tch?ic('knife'):'F',t:'Sneak behind an enemy for a silent takedown',ok:s=>s.td>0,skip:22},
  ];
  T={i:0,t:0,steps,s:{mv:0,look:0,adsShots:0,roll:0,cover:0,td:0},lp:P.pos.clone(),ly:P.camYaw,lshots:0,done:0}; showStep(); }
function showStep(){ const e=$('tut'); const st=T.steps[T.i]; e.querySelector('.tk').innerHTML=st.k; e.querySelector('.tt').textContent=st.t; e.querySelector('.tp i').style.width='0%'; e.classList.remove('hide','ok'); e.classList.remove('in'); void e.offsetWidth; e.classList.add('in'); }
export function tutEv(k){ if(T&&T.s[k]!==undefined) T.s[k]++; }
export function tutUpd(dt,P,G){ if(!T||!P)return; const e=$('tut'); if(T.done){ T.done-=dt; if(T.done<=0){ e.classList.add('hide'); T=null; } return; }
  const s=T.s; s.mv+=Math.hypot(P.pos.x-T.lp.x,P.pos.z-T.lp.z); T.lp.copy(P.pos); s.look+=Math.abs(P.camYaw-T.ly)+0; T.ly=P.camYaw; if(G.shots>T.lshots){ if(P.aimK>.5) s.adsShots+=G.shots-T.lshots; T.lshots=G.shots; } if(P.roll>=0)s.roll=1; if(P.cover)s.cover=1;
  const st=T.steps[T.i]; T.t+=dt; const pr=st.ok(s)?1:st.skip?Math.min(1,T.t/st.skip):0; e.querySelector('.tp i').style.width=(st.ok(s)?100:pr*100)+'%';
  if(st.ok(s)||(st.skip&&T.t>st.skip)){ e.classList.add('ok'); C.A.ui(); T.i++; T.t=0; if(T.i>=T.steps.length){ C.save.tut=true; C.persist(); e.querySelector('.tk').innerHTML=ic('check'); e.querySelector('.tt').textContent='Training complete. Complete the objective!'; T.done=3; } else setTimeout(()=>{ if(T&&!T.done)showStep(); },700); } }
export function tutStop(){ T=null; const e=$('tut'); if(e)e.classList.add('hide'); }
