// Military-style SVG icon set (24x24, stroke/filled), used for HUD, shop and buttons.
const P={
 play:'<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
 gear:'<path fill="currentColor" d="M10.3 2h3.4l.5 2.6 1.6.7 2.2-1.5 2.4 2.4-1.5 2.2.7 1.6 2.6.5v3.4l-2.6.5-.7 1.6 1.5 2.2-2.4 2.4-2.2-1.5-1.6.7-.5 2.6h-3.4l-.5-2.6-1.6-.7-2.2 1.5-2.4-2.4 1.5-2.2-.7-1.6L2 13.7v-3.4l2.6-.5.7-1.6-1.5-2.2 2.4-2.4 2.2 1.5 1.6-.7zM12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/>',
 trophy:'<path fill="currentColor" d="M6 3h12v2h3v3a4 4 0 01-4 4h-.4A5 5 0 0113 15.4V18h3v3H8v-3h3v-2.6A5 5 0 017.4 12H7a4 4 0 01-4-4V5h3zm-1 4v1a2 2 0 002 2V7zm14 0h-2v3a2 2 0 002-2z"/>',
 rifle:'<path fill="currentColor" d="M1 10h3l1-1h11V8h2v1h5v2h-3l-1 1h-4l-1 1H11l-2 5H5.5l1.6-4.5L5 13H1z"/>',
 sound:'<path fill="currentColor" d="M3 9h4l5-4v14l-5-4H3z"/><path d="M15 8.5a5 5 0 010 7M17.5 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
 mute:'<path fill="currentColor" d="M3 9h4l5-4v14l-5-4H3z"/><path d="M15 9l6 6M21 9l-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
 pause:'<path fill="currentColor" d="M6 4h4v16H6zM14 4h4v16h-4z"/>',
 knife:'<path fill="currentColor" d="M21.5 2.5L9 15l-2-2zM7.5 15.5l1 1-2.5 2.5 1 1L4.5 22.5 1.5 19.5 4 17l1 1z"/><path fill="currentColor" d="M21.5 2.5c.5 4-3 9-8.5 12.5l-1.5-1.5z"/>',
 grenade:'<path fill="currentColor" d="M10 3h4v3h-4z"/><path fill="currentColor" d="M14 4h4l1 2h-5z" opacity=".8"/><path fill="currentColor" d="M12 7a7 7 0 110 14 7 7 0 010-14z"/><path d="M8 12h8M8 16h8M12 8v12" stroke="#000" stroke-opacity=".35" stroke-width="1.2"/>',
 reload:'<path d="M19 12a7 7 0 11-2.05-4.95" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path fill="currentColor" d="M20.5 3v7h-7z"/>',
 swap:'<path fill="currentColor" d="M3 7h12V4l5 4.5L15 13v-3H3zM21 17H9v3l-5-4.5L9 11v3h12z"/>',
 lock:'<path fill="currentColor" d="M5 10h14v11H5z"/><path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/>',
 check:'<path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>',
 star:'<path fill="currentColor" d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.2 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/>',
 ad:'<rect x="2" y="5" width="20" height="14" rx="2" fill="currentColor"/><path d="M10 9v6l5-3z" fill="#000" fill-opacity=".55"/>',
 coin:'<circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M14.5 8.5h-3.5a2 2 0 000 4h2a2 2 0 010 4H9.5M12 6.5v11" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1.8"/>',
 warn:'<path fill="currentColor" d="M12 2l11 19H1z"/><path d="M12 9v5M12 16.5v2" stroke="#000" stroke-opacity=".7" stroke-width="2.4"/>',
 shield:'<path fill="currentColor" d="M12 2l9 3v6c0 5.5-3.8 9.7-9 11-5.2-1.3-9-5.5-9-11V5z"/>',
 roll:'<path d="M12 4a8 8 0 107.4 5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path fill="currentColor" d="M21 3l-.5 7.5L14 7z"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/>',
 sprint:'<circle cx="15" cy="4" r="2.2" fill="currentColor"/><path d="M5 11l4-3.5 4 1 2 4 4 1M12 8.5l-2 6 3 3v4M10 14.5l-4 3H3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
 crouch:'<circle cx="11" cy="6" r="2.2" fill="currentColor"/><path d="M8 11l3-2 3 3 3 1M11 9l-1 6h5l1 5M10 15l-3 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
 aim:'<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 1.5v6M12 16.5v6M1.5 12h6M16.5 12h6" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
 fire:'<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".6"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
 hand:'<path fill="currentColor" d="M8 11V4.5a1.5 1.5 0 013 0V10h.5V3a1.5 1.5 0 013 0v7h.5V4.5a1.5 1.5 0 013 0V14c0 4.4-2.6 8-7 8-3 0-4.6-1.4-6-4l-2.5-4.6a1.5 1.5 0 012.5-1.6z"/>',
 back:'<path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>',
 next:'<path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>',
 skull:'<path fill="currentColor" d="M12 2a9 9 0 00-9 9c0 3 1.5 5 3 6v3h3v-2h2v2h2v-2h2v2h3v-3c1.5-1 3-3 3-6a9 9 0 00-9-9zM8.5 10a2 2 0 110 4 2 2 0 010-4zm7 0a2 2 0 110 4 2 2 0 010-4z"/>',
 map:'<path fill="currentColor" d="M2 5l6-2 8 3 6-2v15l-6 2-8-3-6 2zm7 0v12l6 2.2V7.2z"/>',
 restart:'<path d="M5 12a7 7 0 102.05-4.95" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path fill="currentColor" d="M3.5 3v7h7z"/>',
 gift:'<path fill="currentColor" d="M3 8h18v4H3zM4.5 13h15v8h-15z"/><path d="M12 8v13M12 8C10 4 6 4 7 7.5 8 8 12 8 12 8zm0 0c2-4 6-4 5-.5-1 .5-5 .5-5 .5z" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="1.6"/>',
};
export const ic=(n,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n]||''}</svg>`;
// label helper: icon + text
export const il=(n,t)=>ic(n)+(t?`<span>${t}</span>`:'');
const STATIC={play:['play','PLAY'],armory:['rifle','ARMORY'],qual:['gear','SETTINGS'],achBtn:['trophy','ACHIEVEMENTS'],adCoinsT:['ad','WATCH AD: +$400'],adCoinsS:['ad','AD: +$400'],
 mapBack:['back','BACK'],bBack:['back','BACK'],bShop:['rifle','ARMORY'],shopBack:['back','BACK'],deploy:['next','DEPLOY'],ddouble:['ad','DOUBLE (AD)'],dmenu:['map','MENU'],dshop:['rifle','ARMORY'],dnext:['next','NEXT MISSION'],
 revive:['ad','REVIVE (AD)'],retry:['restart','RETRY'],deadMenu:['map','MENU'],resume:['play','RESUME'],prestart:['restart','RESTART'],psettings:['gear','SETTINGS'],pmenu:['back','QUIT TO MENU'],
 pauseBtn:['pause',''],mute:['sound',''],tFire:['fire','FIRE'],tAim:['aim','AIM'],tReload:['reload',''],tRoll:['roll','ROLL'],tCrouch:['crouch','CROUCH'],tSprint:['sprint','SPRINT'],tCover:['shield','COVER'],tKnife:['knife',''],tNade:['grenade',''],tSwap:['swap',''],tUse:['hand','USE'],skip:['next','SKIP']};
export function applyIcons(){ for(const id in STATIC){ const e=document.getElementById(id); if(e){ e.innerHTML=il(...STATIC[id]); e.classList.add('icb'); } }
 const bt=document.querySelector('#bossintro .bt'); if(bt) bt.innerHTML=ic('warn')+' HIGH VALUE TARGET'; }
