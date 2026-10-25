// Missions, themes, procedural base layout, static batching, collision + raycast helpers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export const THEMES={
  desert:{sky:[0x5d8fc4,0xf2c88a],fog:0xe0b886,fogD:[40,150],sun:0xffd9a0,sunI:3.2,hemi:[0xbfd8ff,0x8a6a40,1.0],ground:0xd8b47c,exp:1.05,tree:'palm',grade:[1.08,1.12,[0.02,0.04,0.07],[1.05,0.98,0.88]],sunPos:[40,55,-30]},
  oasis:{sky:[0x3f7fc0,0xffd6a0],fog:0xd8c090,fogD:[40,160],sun:0xffe0b0,sunI:3.0,hemi:[0xc0e0ff,0x6a7a40,1.0],ground:0xc9a870,exp:1.05,tree:'palm',grade:[1.06,1.15,[0.0,0.05,0.07],[1.05,1.0,0.9]],sunPos:[-30,50,-40]},
  snow:{sky:[0x6b86a8,0xd8e2ee],fog:0xc8d4e2,fogD:[25,120],sun:0xffe8d0,sunI:2.4,hemi:[0xd0e0ff,0x9aa4b0,1.3],ground:0xe8eef4,exp:0.95,tree:'pine',grade:[1.1,1.0,[0.03,0.05,0.09],[1.0,1.0,1.04]],sunPos:[30,25,-50]},
  mountain:{sky:[0x40608a,0xe8a070],fog:0xb88a70,fogD:[35,140],sun:0xffb070,sunI:3.0,hemi:[0xa0b8e0,0x5a4a3a,1.0],ground:0x8a7a62,exp:1.0,tree:'pine',grade:[1.12,1.15,[0.03,0.04,0.08],[1.08,0.96,0.84]],sunPos:[-50,22,-20]},
  night:{rim:[0xa8b8e8,1.1],sky:[0x04070e,0x18202e],fog:0x101620,fogD:[18,95],sun:0xb4c4e4,sunI:1.3,hemi:[0x707c94,0x2a2a2e,1.05],ground:0x70747a,exp:1.45,tree:null,lamps:true,grade:[1.12,0.92,[0.01,0.02,0.04],[1.04,1.0,1.0]],sunPos:[20,40,30]},
  jungle:{sky:[0x5a8a70,0xe0e0b0],fog:0x8aa078,fogD:[20,110],sun:0xfff0c0,sunI:2.6,hemi:[0xc0e0b0,0x2a3a1a,1.0],ground:0x66704a,exp:1.0,tree:'palm',dense:true,grade:[1.08,1.02,[0.01,0.03,0.03],[1.02,1.0,0.93]],sunPos:[20,60,-20]},
  canyon:{sky:[0x4a7ab0,0xf0b080],fog:0xd09068,fogD:[40,160],sun:0xffc890,sunI:3.3,hemi:[0xb0c8f0,0x8a4a2a,1.0],ground:0xc07a4a,exp:1.05,tree:null,rocks:true,grade:[1.1,1.2,[0.02,0.04,0.08],[1.1,0.95,0.82]],sunPos:[50,40,10]},
  refinery:{rim:[0x9080ff,.6],sky:[0x2e2a44,0xe8925a],fog:0x8a6452,fogD:[30,130],sun:0xffa468,sunI:2.8,hemi:[0xa49a9c,0x4a3428,0.95],ground:0x6a625a,exp:1.05,tree:null,lamps:true,grade:[1.1,1.04,[0.03,0.02,0.06],[1.06,0.98,0.9]],sunPos:[-60,22,-30]},
  fortress:{rim:[0xff7040,.8],sky:[0x241c26,0xc8743c],fog:0x5a3424,fogD:[28,125],sun:0xffa060,sunI:2.6,hemi:[0x9a8a90,0x4a2c1c,1.05],ground:0x52423a,exp:1.25,tree:null,rocks:true,lamps:true,grade:[1.1,1.0,[0.03,0.015,0.04],[1.06,0.98,0.9]],sunPos:[40,26,-40]},
};
export const MISSIONS=[
  {name:'DESERT OUTPOST',loc:'Sahra Ridge · 06:40',theme:'desert',obj:'kill',seed:11,enemies:9,elite:0,size:70,brief:'Clear the outpost. Eliminate all hostiles.'},
  {name:'OASIS DEPOT',loc:'Wadi Basin · 09:15',theme:'oasis',obj:'destroy',targets:'fueltank',n:3,seed:23,enemies:11,elite:1,size:80,brief:'Plant charges on 3 fuel tanks.'},
  {name:'FROZEN RIDGE',loc:'North Pass · 07:05',theme:'snow',obj:'intel',seed:37,enemies:12,elite:2,size:80,brief:'Recover the intel laptop, then reach extraction.'},
  {name:'MOUNTAIN FORT',loc:'Kord Heights · 18:20',theme:'mountain',obj:'boss',boss:'COMMANDER KORD',bossHp:900,seed:41,enemies:10,elite:3,size:80,brief:'Take down Commander Kord.'},
  {name:'HARBOR NIGHT',loc:'Black Docks · 02:10',theme:'night',obj:'kill',seed:53,enemies:14,elite:3,size:90,containers:true,brief:'Silent entry. Eliminate every hostile on the docks.'},
  {name:'JUNGLE RADAR',loc:'Green Delta · 11:30',theme:'jungle',obj:'destroy',targets:'radar',n:2,seed:67,enemies:14,elite:4,size:90,brief:'Destroy 2 radar stations.'},
  {name:'IRON CANYON',loc:'Red Canyon · 15:45',theme:'canyon',obj:'tank',seed:79,enemies:14,elite:4,size:90,brief:'Destroy the armored tank. Use explosives.'},
  {name:'REFINERY SIEGE',loc:'Gulf Refinery · 19:05',theme:'refinery',obj:'waves',waves:3,seed:83,enemies:8,elite:3,size:85,brief:'Hold the refinery against 3 waves, then extract.'},
  {name:'JACKAL FORTRESS',loc:'Ashen Crater · 21:00',theme:'fortress',obj:'boss',boss:'IRON JACKAL',bossHp:2200,final:true,seed:97,enemies:14,elite:6,size:90,brief:'Final strike. Kill the warlord Iron Jackal.'},
];

// --- material atlas-by-color: meshes whose materials differ only by base colour share one vertex-coloured material ---
const VC=new Map();
export function vcKey(m){ if(!m.isMeshStandardMaterial||m.transparent||(m.emissiveIntensity>0&&m.emissive&&m.emissive.getHex()!==0)) return {key:m.uuid,mat:m,vc:false};
  const k=[m.map&&m.map.uuid,m.normalMap&&m.normalMap.uuid,m.roughnessMap&&m.roughnessMap.uuid,m.metalnessMap&&m.metalnessMap.uuid,(m.roughness<0.55?0:m.roughness<0.8?1:2),(m.metalness>0.3?1:0),m.side].join('|');
  if(!VC.has(k)){ const n=m.clone(); n.roughness=[0.45,0.7,0.92][m.roughness<0.55?0:m.roughness<0.8?1:2]; n.color.set(0xffffff); n.vertexColors=true; n.name='vc_'+m.name; VC.set(k,n); } return {key:k,mat:VC.get(k),vc:true}; }
export function addVC(g,m){ const n=g.attributes.position.count, c=new Float32Array(n*3), col=m.color; for(let i=0;i<n;i++){ c[i*3]=col.r; c[i*3+1]=col.g; c[i*3+2]=col.b; } g.setAttribute('color',new THREE.BufferAttribute(c,3)); return g; }
export function rng(seed){ let s=seed>>>0; return ()=>{ s=(s+0x6D2B79F5)>>>0; let t=s; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }

// collapse a prop's sub-meshes into one mesh per shared material (dynamic props: barrels, pickups, targets)
const CMP=new Map();
export function compact(src){ if(CMP.has(src))return CMP.get(src); src.updateMatrixWorld(true); const inv=src.matrixWorld.clone().invert(), by=new Map();
  src.traverse(o=>{ if(!o.isMesh||o.isSkinnedMesh)return; const g=o.geometry.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld)); for(const k of Object.keys(g.attributes)) if(!['position','normal','uv'].includes(k)) g.deleteAttribute(k); if(!g.attributes.uv) g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2)); const vk=vcKey(o.material); if(vk.vc)addVC(g,o.material); if(!by.has(vk.key))by.set(vk.key,{m:vk.mat,g:[]}); by.get(vk.key).g.push(g.index?g.toNonIndexed():g); });
  const out=new THREE.Group(); out.name=src.name; for(const {m,g} of by.values()){ const mg=mergeGeometries(g,false); if(!mg)continue; mg.computeBoundingSphere(); const me=new THREE.Mesh(mg,m); me.castShadow=me.receiveShadow=true; out.add(me); } CMP.set(src,out); return out; }
export class World{
  constructor(scene,lib){ this.scene=scene; this.lib=lib; this.root=null; }
  build(mi){ const M=MISSIONS[mi], T=THEMES[M.theme], R=rng(M.seed), lib=this.lib; this.M=M; this.T=T; if(this.decals)this.decals.clearStatic();
    if(this.root){ this.scene.remove(this.root); this.root.traverse(o=>{ if(o.isMesh&&o.userData.merged)o.geometry.dispose(); }); }
    const root=this.root=new THREE.Group(); this.scene.add(root);
    const statics=new THREE.Group(); const H=M.size/2; this.H=H;
    this.towers=[]; this.obs=[]; this.nets=[]; this.covers=[]; this.dyn=[]; this.targets=[]; this.lamps=[]; this.pickups=[]; this.patrol=[]; this.enemySpots=[];
    const occ=[]; const free=(x,z,r)=>{ if(Math.abs(x)>H-3||Math.abs(z)>H-3)return false; if(Math.hypot(x,z+H-6)<9)return false; for(const o of occ) if(Math.abs(x-o[0])<r+o[2]&&Math.abs(z-o[1])<r+o[2])return false; return true; };
    const put=(name,x,z,rot=0,opt={})=>{ const src=opt.dynamic&&!['tank','radar'].includes(name)?compact(lib.props[name]):lib.props[name]; const o=src.clone(); o.position.set(x,opt.y||0,z); o.rotation.y=rot; if(opt.s)o.scale.setScalar(opt.s); (opt.dynamic?root:statics).add(o);
      o.updateMatrixWorld(true); const bb=new THREE.Box3().setFromObject(o); if(opt.nocol) return o;
      const ob={minX:bb.min.x,maxX:bb.max.x,minZ:bb.min.z,maxZ:bb.max.z,h:opt.h||bb.max.y,name,obj:o,vault:!!opt.vault,hp:opt.hp||0,explosive:!!opt.explosive};
      this.obs.push(ob); occ.push([x,z,Math.max(bb.max.x-bb.min.x,bb.max.z-bb.min.z)/2+.6]); if(ob.h>0.8&&ob.h<8&&!opt.nocover) this.addCovers(ob); return ob; };
    this.put=put;
    // perimeter wall with gaps
    const wl=4; for(let s=0;s<4;s++) for(let i=-H;i<H;i+=wl){ const c=i+wl/2; if(Math.abs(c)<6&&(s===0||s===2))continue; const [x,z,r]=[[c,-H,0],[H,c,Math.PI/2],[c,H,0],[-H,c,Math.PI/2]][s]; put('wall',x,z,r,{nocover:true}); }
    // central compound
    const nb=2+Math.floor(R()*2); for(let i=0;i<nb;i++){ for(let k=0;k<30;k++){ const x=(R()-.5)*(M.size-24), z=(R()-.2)*(M.size-24)*0.8; if(free(x,z,7)){ put('bunker',x,z,Math.floor(R()*4)*Math.PI/2); this.enemySpots.push([x,z]); break; } } }
    for(let i=0;i<2;i++) for(let k=0;k<30;k++){ const x=(R()-.5)*(M.size-14), z=(R()-.1)*(M.size-14)*0.85; if(free(x,z,3.5)){ put('tower',x,z,0,{nocover:true,h:9}); this.towers=(this.towers||[]); this.towers.push([x,z]); break; } }
    const nc=M.containers?14:5; const cn=['container_r','container_b','container_g'];
    for(let i=0;i<nc;i++) for(let k=0;k<30;k++){ const x=(R()-.5)*(M.size-12), z=(R()-.35)*(M.size-12); const rot=R()<.5?0:Math.PI/2; if(free(x,z,4.2)){ put(cn[Math.floor(R()*3)],x,z,rot); if(R()<.3&&M.containers) put(cn[Math.floor(R()*3)],x,z,rot,{y:2.6,nocover:true,nocol:true}); break; } }
    for(let i=0;i<10;i++) for(let k=0;k<30;k++){ const x=(R()-.5)*(M.size-10), z=(R()-.45)*(M.size-10); if(free(x,z,2.2)){ put('lowwall',x,z,R()<.5?0:Math.PI/2,{vault:true}); break; } }
    for(let i=0;i<10;i++) for(let k=0;k<30;k++){ const x=(R()-.5)*(M.size-10), z=(R()-.4)*(M.size-10); if(free(x,z,1.8)){ put('sandbags',x,z,R()*3,{vault:true}); break; } }
    for(let i=0;i<16;i++) for(let k=0;k<30;k++){ const x=(R()-.5)*(M.size-8), z=(R()-.45)*(M.size-8); if(free(x,z,1.2)){ const big=R()<.6; put(big?'crate':'crate_s',x,z,R()*.4,{vault:!big}); if(big&&R()<.4) put('crate_s',x+(R()-.5)*.3,z+(R()-.5)*.3,R(),{y:1,nocol:true}); break; } }
    for(let i=0;i<8;i++) for(let k=0;k<30;k++){ const x=(R()-.5)*(M.size-8), z=(R()-.4)*(M.size-8); if(free(x,z,.7)){ this.barrel(x,z); break; } }
    for(let i=0;i<3;i++) for(let k=0;k<30;k++){ const x=(R()-.5)*(M.size-12), z=(R()-.2)*(M.size-12); if(free(x,z,3)){ put(R()<.5?'jeep':'tent',x,z,R()*6); break; } }
    if(T.tree){ const n=T.dense?40:16; for(let i=0;i<n;i++) for(let k=0;k<20;k++){ const x=(R()-.5)*(M.size-6), z=(R()-.5)*(M.size-6); if(free(x,z,1)){ const o=put(T.tree,x,z,R()*6,{s:.8+R()*.5,nocover:true}); const cx=(o.minX+o.maxX)/2,cz=(o.minZ+o.maxZ)/2; o.minX=cx-.3;o.maxX=cx+.3;o.minZ=cz-.3;o.maxZ=cz+.3; break; } } }
    if(T.rocks) for(let i=0;i<10;i++) for(let k=0;k<20;k++){ const x=(R()-.5)*(M.size-6), z=(R()-.5)*(M.size-6); if(free(x,z,1.8)){ put('rock',x,z,R()*6,{s:.8+R()*.8}); break; } }
    if(T.lamps) for(let i=0;i<8;i++) for(let k=0;k<20;k++){ const x=(R()-.5)*(M.size-8), z=(R()-.5)*(M.size-8); if(free(x,z,.6)){ const lr=R()*6; put('lamppost',x,z,lr,{nocover:true}); const bx=x+Math.sin(lr), bz=z+Math.cos(lr); this.lampGlow(root,bx,bz); if(this.lamps.length<(this.maxLamps??4)){ const l=new THREE.PointLight(0xffc070,22,24,1.5); l.position.set(bx,4.5,bz); root.add(l); this.lamps.push(l);} break; } }
    // --- per-mission set pieces so each level reads as a distinct place ---
    this.fires=[]; const th=M.theme, place=(r,fn)=>{ for(let k=0;k<200;k++){ const x=(R()-.5)*(M.size-10), z=(R()-.4)*(M.size-10); if(free(x,z,k<100?r:r*.7)){ fn(x,z); occ.push([x,z,r]); return [x,z]; } } return null; };
    const water=(x,z,w,d,col)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshStandardMaterial({color:col,roughness:.08,metalness:.4,transparent:true,opacity:.88})); m.rotation.x=-Math.PI/2; m.position.set(x,.03,z); m.receiveShadow=true; root.add(m); return m; };
    if(th==='desert'){ place(3.6,(x,z)=>{ const w=put('tank',x,z,R()*6,{}); w.obj.traverse(m=>{ if(m.isMesh){ m.material=m.material.clone(); m.material.color.multiplyScalar(.12); if(m.material.emissive)m.material.emissive.set(0); } }); this.decals&&this.decals.stat(new THREE.Vector3(x,0,z),new THREE.Vector3(0,1,0),8,8,this.DC.scorch,R()*6,0xffffff,.9); this.fires.push([x,2.3,z,.8]); }); for(let i=0;i<6;i++) place(1.5,(x,z)=>put('rock',x,z,R()*6,{s:.6+R()*.6})); }
    if(th==='oasis'){ place(8,(x,z)=>{ water(x,z,11,8,0x2a6f7c); for(let i=0;i<6;i++){ const a=i/6*6.28; put('palm',x+Math.cos(a)*6.5,z+Math.sin(a)*5,R()*6,{s:.8+R()*.4,nocover:true,nocol:true}); } for(let i=0;i<4;i++) put('rock',x+Math.cos(i*1.7)*5.5,z+Math.sin(i*1.7)*4,R()*6,{s:.5,nocol:true}); }); }
    if(th==='snow'){ place(6,(x,z)=>{ const o=put('heli',x,z,R()*6,{h:2.2}); o.obj.rotation.z=.35; o.obj.rotation.x=.12; o.obj.position.y=-.4; this.fires.push([x,1.2,z,.7]); }); for(let i=0;i<10;i++) place(1.2,(x,z)=>put('pine',x,z,R()*6,{s:.7+R()*.6,nocover:true})); }
    if(th==='mountain'){ for(let i=0;i<5;i++) place(3,(x,z)=>{ put('rock',x,z,R()*6,{s:1.6+R()*1.2}); put('rock',x+1.8,z+.8,R()*6,{s:.7+R()*.5,nocol:true}); }); }
    if(th==='night'){ water(0,H+22,M.size*3,40,0x0a1622); for(let i=0;i<3;i++) place(4.5,(x,z)=>{ const rot=R()<.5?0:Math.PI/2; for(let k=0;k<3;k++) put(['container_r','container_b','container_g'][k],x,z,rot,{y:k*2.6,nocover:k>0}); }); }
    if(th==='jungle'){ place(6,(x,z)=>{ for(let i=0;i<3;i++) put('tent',x+(i-1)*4.2,z,0,{}); this.fires.push([x,0.15,z+3.5,.45]); }); for(let i=0;i<14;i++) place(1,(x,z)=>put('palm',x,z,R()*6,{s:.7+R()*.5,nocover:true})); }
    if(th==='canyon'){ for(let i=0;i<22;i++){ const a=i/22*Math.PI*2, d=H+6+R()*4; const o=lib.props.rock.clone(); o.position.set(Math.cos(a)*d,-1,Math.sin(a)*d); o.rotation.y=R()*6; o.scale.set(4+R()*3,6+R()*6,4+R()*3); statics.add(o); } }
    if(th==='refinery'){ for(let i=0;i<4;i++) place(3.5,(x,z)=>{ const o=put('fueltank',x,z,R()*6,{}); if(i<2) this.fires.push([x,o.h+.3,z,.6]); }); for(let i=0;i<6;i++) place(.8,(x,z)=>put('barrel',x,z,0,{})); }
    if(th==='fortress'){ for(let i=0;i<6;i++) place(1.2,(x,z)=>{ put('barrel',x,z,0,{h:1}); this.fires.push([x,1.0,z,.4]); }); place(3.5,(x,z)=>put('tower',x,z,0,{nocover:true,h:9})); }

    for(let i=0;i<36;i++){ const a=i/36*Math.PI*2, d=H+8+R()*25; const nm=T.tree&&R()<.6?T.tree:'rock'; const o=lib.props[nm].clone(); o.position.set(Math.cos(a)*d,0,Math.sin(a)*d); o.rotation.y=R()*6; o.scale.setScalar(nm==='rock'?2+R()*4:1+R()*.6); if(!(this.lowQ&&i%3===1))statics.add(o); }
    // objectives
    const spot=(r)=>{ for(let k=0;k<240;k++){ const x=(R()-.5)*(M.size-14), z=(k<120?R()*.8:R()*1.6-.6)*(M.size/2-8), rr=k<160?r:r*.7; if(free(x,z,rr)){ occ.push([x,z,r]); return [x,z]; } } return [(R()-.5)*20,10+R()*10]; };
    if(M.obj==='destroy') for(let i=0;i<M.n;i++){ const [x,z]=spot(3); const o=put(M.targets,x,z,R()*6,{dynamic:true}); o.target=true; o.planted=0; this.targets.push(o); this.enemySpots.push([x,z]); }
    if(M.obj==='intel'){ const [x,z]=spot(1.5); const o=put('intel',x,z,0,{dynamic:true,nocover:true}); o.target=true; o.planted=0; this.targets.push(o); this.enemySpots.push([x,z]); }
    if(M.obj==='tank'){ const [x,z]=spot(5); const o=put('tank',x,z,Math.PI+(R()-.5),{dynamic:true}); o.tank=true; o.hp=1400; o.maxHp=1400; this.targets.push(o); this.enemySpots.push([x,z]); }
    this.extract=new THREE.Vector3(0,0,H-6);
    // pickups
    for(let i=0;i<7;i++){ const [x,z]=spot(.6); const t=['medkit','armorpk','ammobox','medkit','ammobox','armorpk','ammobox'][i]; const o=compact(lib.props[t]).clone(); o.position.set(x,0,z); root.add(o); this.pickups.push({o,type:t,alive:true}); }
    // generic clutter per theme: hedgehogs at gates, tyre piles, jerrycans, loaded pallets
    const clut={desert:[['hedgehog',6],['tires',3],['jerry',4],['pallet',3]],oasis:[['jerry',4],['pallet',4],['tires',2]],snow:[['hedgehog',4],['pallet',3],['jerry',2]],mountain:[['hedgehog',5],['tires',3],['pallet',2]],night:[['pallet',7],['jerry',3],['tires',3]],
      jungle:[['jerry',4],['pallet',3]],canyon:[['hedgehog',8],['tires',4],['jerry',2]],refinery:[['jerry',6],['tires',4],['pallet',4]],fortress:[['hedgehog',10],['tires',3],['jerry',3]]}[th]||[];
    for(const [nm,n] of clut) if(lib.props[nm]) for(let i=0;i<n;i++){ if(nm==='hedgehog'&&i<4){ const gx=(i%2?1:-1)*(5+R()*3), gz=(i<2?-1:1)*(H-4-R()*3); if(free(gx,gz,1)) { put(nm,gx,gz,R()*6,{nocover:true}); continue; } } place(nm==='pallet'?1.3:1,(x,z)=>put(nm,x,z,R()*6,{nocover:nm!=='pallet',vault:nm!=='hedgehog'})); }
    // set dressing: burnt cars, generators, sat dishes, camo nets sheltering supplies
    const dress={desert:[['carwreck',2],['camonet',1],['generator',1]],oasis:[['camonet',2],['generator',1],['carwreck',1]],snow:[['generator',2],['dish',1],['carwreck',1]],mountain:[['camonet',1],['dish',1],['generator',1]],night:[['generator',2],['carwreck',2],['dish',1]],
      jungle:[['camonet',3],['generator',1]],canyon:[['carwreck',3],['camonet',1],['generator',1]],refinery:[['generator',3],['dish',1],['carwreck',1]],fortress:[['dish',2],['generator',2],['camonet',2],['carwreck',1]]}[th]||[];
    for(const [nm,n] of dress) if(lib.props[nm]) for(let i=0;i<n;i++){
      if(nm==='camonet') ((fn)=>{ for(let k=0;k<120;k++){ const x=(R()-.5)*(M.size-14), z=(R()-.4)*(M.size-14); if(Math.hypot(x,z+H-6)>16&&free(x,z,3.6)){ fn(x,z); occ.push([x,z,3.6]); return; } } })((x,z)=>{ const r=Math.floor(R()*4)*Math.PI/2; put('camonet',x,z,r,{nocol:true}); (this.nets=this.nets||[]).push([x,z]); const u=R(); if(u<.5&&lib.props.jeep) put('jeep',x+(R()-.5),z+(R()-.5),r+Math.PI/2+(R()-.5)*.3); else { put('crate',x-.8,z+.4,R()); put('crate_s',x+.6,z-.5,R(),{vault:true}); put('pallet',x+.9,z+.9,R()*6,{vault:true}); } });
      else place(nm==='carwreck'?2.4:1.3,(x,z)=>put(nm,x,z,R()*6,{vault:nm==='generator',hp:0})); }
    // patrol nodes
    for(let i=0;i<24;i++){ const [x,z]=spot(.8); this.patrol.push(new THREE.Vector3(x,0,z)); occ.pop&&0; }
    this.merge(statics,root);
    // ground
    const gt=lib.tex.ground, gn=lib.tex.groundN; const gm=new THREE.MeshStandardMaterial({map:gt,normalMap:gn,color:T.ground,roughness:.95,normalScale:new THREE.Vector2(.8,.8)});
    gm.onBeforeCompile=sh=>{ sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
float sfH(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float sfN(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(sfH(i),sfH(i+vec2(1,0)),f.x),mix(sfH(i+vec2(0,1)),sfH(i+vec2(1,1)),f.x),f.y); }`)
      .replace('#include <map_fragment>',`
vec2 u2=mat2(0.8,-0.6,0.6,0.8)*vMapUv*0.37+vec2(0.31,0.73);
float bl=smoothstep(0.3,0.7,sfN(vMapUv*0.09));
vec4 sampledDiffuseColor=mix(texture2D(map,vMapUv),texture2D(map,u2),bl);
float macro=0.82+0.3*sfN(vMapUv*0.025)+0.08*sfN(vMapUv*0.21);
sampledDiffuseColor.rgb*=macro;
diffuseColor*=sampledDiffuseColor;`); };
    const g=new THREE.Mesh(new THREE.PlaneGeometry(400,400),gm); g.rotation.x=-Math.PI/2; g.receiveShadow=true; root.add(g);
    this.dress(M,T,R,H);
    // extraction marker
    const em=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,6,32,1,true),new THREE.MeshBasicMaterial({color:0x40ffa0,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})); em.position.copy(this.extract).setY(3); em.visible=false; root.add(em); this.extractMesh=em;
    return this;
  }
  dress(M,T,R,H){ const D=this.decals, C=this.DC; if(!D)return; const up=new THREE.Vector3(0,1,0), P=new THREE.Vector3(), th=M.theme;
    const wet=th==='night'||th==='jungle'||th==='refinery', sandy=th==='desert'||th==='oasis'||th==='canyon', snow=th==='snow';
    const tint=new THREE.Color(T.ground).multiplyScalar(.55).getHex();
    // tyre tracks from the south gate inward, winding
    for(let t=0;t<2;t++){ let x=(t-.5)*2.4, z=-H-2, a=0; for(let i=0;i<Math.floor(H*1.5/2.4);i++){ a+=(R()-.5)*.25; x+=Math.sin(a)*2.3; z+=Math.cos(a)*2.3; if(Math.abs(x)>H-3)a=-a; D.stat(P.set(x,0,z),up,1.1,2.6,C.tracks,-a,snow?0x8a96a8:tint,.55); } }
    // ground patches: cracks, oil, sand drifts, puddles, grime
    const N=Math.round(M.size*.9); for(let i=0;i<N;i++){ const x=(R()-.5)*(M.size-4), z=(R()-.5)*(M.size-4); const r=R(); let cell,s,col=0xffffff,al=.8;
      if(r<.28){cell=C.crack; s=1.5+R()*2.5; al=.6;} else if(r<.42){cell=C.oil; s=1+R()*1.6; al=.75;} else if(r<.62){ if(wet){cell=C.puddle; s=2+R()*3; al=.85;} else if(snow){cell=C.sand; s=3+R()*4; col=0xeef4ff; al=.7;} else {cell=C.sand; s=3+R()*4; col=new THREE.Color(T.ground).getHex(); al=.7;} }
      else if(r<.85){cell=C.grime; s=2.5+R()*3; col=tint; al=.55;} else {cell=C.hole; s=.6+R()*.5; col=0x777777; al=.5;}
      D.stat(P.set(x,0,z),up,s,s,cell,R()*6.28,col,al); }
    // obstacle-based: grime skirts on walls, graffiti on inner perimeter faces, stencils on bunkers/containers, oil under vehicles
    let gi=0; for(const o of this.obs){ const cx=(o.minX+o.maxX)/2, cz=(o.minZ+o.maxZ)/2, sx=o.maxX-o.minX, sz=o.maxZ-o.minZ;
      const faces=[[o.maxX,cz,1,0,sz],[o.minX,cz,-1,0,sz],[cx,o.maxZ,0,1,sx],[cx,o.minZ,0,-1,sx]];
      if(o.name==='wall'){ for(const [fx,fz,nx,nz,w] of faces){ if(nx*cx+nz*cz>0)continue; const n=new THREE.Vector3(nx,0,nz); if(R()<.55) D.stat(P.set(fx,.55,fz),n,w*.9,1.1,C.grime,Math.PI,tint,.6);
          if(R()<.16){ const g=[C.zero,C.jackal,C.jackal,C.noentry,C.danger][gi++%5]; D.stat(P.set(fx,1.25+R()*.3,fz),n,2.2,1.1,g,0,0xffffff,.9); } } }
      else if(o.name==='bunker'||o.name.startsWith('container')){ for(const [fx,fz,nx,nz,w] of faces){ const n=new THREE.Vector3(nx,0,nz); const r=R();
          if(r<.35) D.stat(P.set(fx,o.h*.45,fz),n,1.6,1.6,[C.danger,C.b07,C.noentry,C.exit,C.target][Math.floor(R()*5)],0,0xffffff,.85); else if(r<.55) D.stat(P.set(fx,1.2,fz),n,2.6,1.3,R()<.5?C.jackal:C.zero,0,0xffffff,.8);
          if(R()<.7) D.stat(P.set(fx,.5,fz),n,w*.85,1,C.grime,Math.PI,tint,.55); }
        D.stat(P.set(cx,0,cz),up,sx+1.5,sz+1.5,C.grime,0,tint,.6); }
      else if(o.name==='jeep'||o.name==='tank'){ D.stat(P.set(cx,0,cz),up,3,3,C.oil,R()*6,0xffffff,.85); D.stat(P.set(cx,0,cz),up,sx+3,sz+3,C.grime,0,tint,.6); }
      else if(o.name==='fueltank'||o.name==='barrel'){ D.stat(P.set(cx,0,cz),up,sx+1.4,sz+1.4,C.oil,R()*6,0xffffff,.8); }
      else if(o.name==='lowwall'||o.name==='sandbags'||o.name==='tower'||o.name==='tent'){ D.stat(P.set(cx,0,cz),up,sx+1.6,sz+1.6,C.grime,R()*6,tint,.5); } }
    // extraction pad stencil
    D.stat(P.set(0,0,H-6),up,4.6,4.6,C.target,0,0xffe070,.7); }
  lampGlow(root,x,z){ // fake light pool + bulb halo: reads at night even when real lights are capped on mobile
    if(!World.GM){ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'), gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.35,'rgba(255,255,255,.45)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
      World.GM={pool:new THREE.MeshBasicMaterial({map:t,color:0xffb860,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}),halo:new THREE.SpriteMaterial({map:t,color:0xffd090,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}),geo:new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2)}; }
    const p=new THREE.Mesh(World.GM.geo,World.GM.pool); p.scale.set(9,1,9); p.position.set(x,.03,z); p.renderOrder=2; root.add(p);
    const h=new THREE.Sprite(World.GM.halo); h.scale.setScalar(1.6); h.position.set(x,4.75,z); root.add(h); }
  barrel(x,z){ const o=this.put('barrel',x,z,0,{dynamic:true,hp:30,explosive:true,vault:false}); o.explosive=true; return o; }
  addCovers(ob){ const cx=(ob.minX+ob.maxX)/2, cz=(ob.minZ+ob.maxZ)/2, hx=(ob.maxX-ob.minX)/2+.7, hz=(ob.maxZ-ob.minZ)/2+.7;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){ const n=Math.abs(dx)?Math.max(1,Math.round(hz)):Math.max(1,Math.round(hx)); for(let i=0;i<Math.min(n,3);i++){ const t=(i+.5)/Math.min(n,3)*2-1; this.covers.push({x:cx+dx*hx+(dz?t*(hx-.7):0),z:cz+dz*hz+(dx?t*(hz-.7):0),nx:dx,nz:dz,ob,low:ob.h<1.4,taken:null}); } } }
  merge(group,root){ group.updateMatrixWorld(true); const by=new Map(), C=30, V=new THREE.Vector3();
    // spatial chunks per material -> frustum culling still works; far scenery skips shadow casting
    group.traverse(o=>{ if(!o.isMesh)return; let top=o; while(top.parent&&top.parent!==group)top=top.parent; top.getWorldPosition(V); const far=Math.max(Math.abs(V.x),Math.abs(V.z))>this.H+4; if(!o.geometry.boundingBox)o.geometry.computeBoundingBox(); const bbh=(o.geometry.boundingBox.max.y-o.geometry.boundingBox.min.y)*o.matrixWorld.elements[5]; const small=this.lowQ&&bbh<0.6&&V.y<1; const cell=(small?'s':'')+(far?'far'+Math.floor(Math.atan2(V.z,V.x)*2):Math.floor(V.x/C)+','+Math.floor(V.z/C));
      const g=o.geometry.clone().applyMatrix4(o.matrixWorld); for(const k of Object.keys(g.attributes)) if(!['position','normal','uv'].includes(k)) g.deleteAttribute(k); if(!g.attributes.uv) g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2)); const vk=vcKey(o.material); if(vk.vc)addVC(g,o.material); const key=vk.key+'|'+cell; if(!by.has(key))by.set(key,{m:vk.mat,g:[],far,small}); by.get(key).g.push(g.index?g.toNonIndexed():g); });
    for(const {m,g,far,small} of by.values()){ const mg=mergeGeometries(g,false); if(!mg)continue; mg.computeBoundingSphere(); const mesh=new THREE.Mesh(mg,m); mesh.castShadow=!far&&!small; mesh.receiveShadow=!far; mesh.userData.merged=true; root.add(mesh); } }
  // --- collision ---
  collide(p,r,h=1.5){ for(const o of this.obs){ if(o.dead||o.h<0.35)continue; if(p.y>o.h-0.05)continue; const nx=Math.max(o.minX,Math.min(p.x,o.maxX)), nz=Math.max(o.minZ,Math.min(p.z,o.maxZ)); const dx=p.x-nx, dz=p.z-nz, d2=dx*dx+dz*dz;
      if(d2<r*r){ if(d2>1e-6){ const d=Math.sqrt(d2); p.x+=dx/d*(r-d); p.z+=dz/d*(r-d); } else { const l=[p.x-o.minX,o.maxX-p.x,p.z-o.minZ,o.maxZ-p.z]; const m=Math.min(...l); if(m===l[0])p.x=o.minX-r; else if(m===l[1])p.x=o.maxX+r; else if(m===l[2])p.z=o.minZ-r; else p.z=o.maxZ+r; } } }
    const L=this.H+30; p.x=Math.max(-L,Math.min(L,p.x)); p.z=Math.max(-L,Math.min(L,p.z)); }
  // ray vs obstacles (3D slabs) -> {t,ob,n}
  ray(o,d,maxT){ let best=maxT,bo=null,bn=null; const inv=[1/d.x,1/d.y,1/d.z];
    for(const b of this.obs){ if(b.dead)continue; let t0=0,t1=best,n=null;
      const ax=[[b.minX,b.maxX,o.x,inv[0],0],[0,b.h,o.y,inv[1],1],[b.minZ,b.maxZ,o.z,inv[2],2]]; let ok=true;
      for(const [mn,mx,oo,iv,ax_] of ax){ let ta=(mn-oo)*iv, tb=(mx-oo)*iv, s=-1; if(ta>tb){const q=ta;ta=tb;tb=q;s=1;} if(ta>t0){t0=ta;n=[ax_,s];} if(tb<t1)t1=tb; if(t0>t1){ok=false;break;} }
      if(ok&&t0<best&&t0>0){ best=t0; bo=b; bn=n; } }
    if(d.y<0){ const tg=-o.y/d.y; if(tg<best){ return {t:tg,ob:null,n:new THREE.Vector3(0,1,0),ground:true}; } }
    if(!bo)return null; const nv=new THREE.Vector3(); nv.setComponent(bn[0],bn[1]*-(-1)); nv.setComponent(bn[0],(bn[1]===-1?-1:1)*(d.getComponent(bn[0])>0?-1:1)*(bn[1]===-1?1:1)); nv.set(0,0,0); nv.setComponent(bn[0],d.getComponent(bn[0])>0?-1:1); return {t:best,ob:bo,n:nv}; }
  los(a,b){ const d=new THREE.Vector3().subVectors(b,a); const L=d.length(); d.divideScalar(L); const h=this.ray(a,d,L); return !h||h.ground&&h.t>L-0.1; }
  findLow(p,dir){ // obstacle you can vault in front of p
    for(const o of this.obs){ if(o.dead||!o.vault)continue; const q={x:p.x+dir.x*.8,z:p.z+dir.z*.8}; if(q.x>o.minX-.2&&q.x<o.maxX+.2&&q.z>o.minZ-.2&&q.z<o.maxZ+.2) return o; } return null; }
}
