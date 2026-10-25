// Strike Force Zero — third-person tactical shooter. three.js + Blender assets.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as SkelU from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as SDK from './sdk.js';
import { A } from './audio.js';
import * as META from './meta.js';
import { ic, il, applyIcons } from './icons.js';
import { FX } from './fx.js';
import { Decals, DC } from './decals.js';
import { World, MISSIONS, THEMES, vcKey, addVC } from './world.js';
const $=id=>document.getElementById(id); const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)); const lerp=(a,b,t)=>a+(b-a)*t; const damp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*dt));
const angDiff=(a,b)=>{ let d=b-a; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; return d; };
const TOUCH=('ontouchstart' in window)||/touch/.test(location.search)||navigator.maxTouchPoints>0&&matchMedia('(pointer:coarse)').matches;
SDK.loadingStart();
// ---------------- renderer + post ----------------
const canvas=$('c'); const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(); const camera=new THREE.PerspectiveCamera(65,1,0.1,600);
const sun=new THREE.DirectionalLight(0xffffff,3); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); const sc=sun.shadow.camera; sc.left=sc.bottom=-30; sc.right=sc.top=30; sc.near=1; sc.far=160; sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.03; scene.add(sun,sun.target);
const hemi=new THREE.HemisphereLight(0xffffff,0x444444,1); scene.add(hemi); const rim=new THREE.DirectionalLight(0x8090ff,0); scene.add(rim,rim.target); const bossKey=new THREE.PointLight(0xffd0b0,0,14,1.4); if(!TOUCH)scene.add(bossKey); // per-pixel point light is costly on phones
const sky=new THREE.Mesh(new THREE.SphereGeometry(400,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new THREE.Color()},bot:{value:new THREE.Color()},sunDir:{value:new THREE.Vector3()},sunC:{value:new THREE.Color()}},
  vertexShader:`varying vec3 vP; void main(){ vP=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position=p.xyww; }`,
  fragmentShader:`uniform vec3 top,bot,sunDir,sunC; varying vec3 vP; float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);} 
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  void main(){ float y=vP.y; vec3 c=mix(bot,top,pow(clamp(y,0.0,1.0),0.55)); float s=max(dot(vP,normalize(sunDir)),0.0); c+=sunC*(pow(s,600.0)*6.0+pow(s,12.0)*0.35);
    vec2 uv=vP.xz/(y+0.15)*2.0; float cl=n(uv)*0.6+n(uv*2.3)*0.3+n(uv*5.1)*0.1; cl=smoothstep(0.55,0.85,cl)*smoothstep(0.0,0.25,y); c=mix(c,mix(bot*1.1,vec3(1.0),0.5)+sunC*0.15*s,cl*0.55);
    if(y<0.0) c=bot*0.9; gl_FragColor=vec4(c,1.0); }`})); scene.add(sky);
const composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4})); composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),0.55,0.5,0.92); composer.addPass(bloom);
const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},uSh:{value:0},uTx:{value:new THREE.Vector2(1e-3,1e-3)},uGr:{value:TOUCH?0.015:0.03},uT:{value:0},uC:{value:1.1},uS:{value:1.1},uLift:{value:new THREE.Vector3()},uGain:{value:new THREE.Vector3(1,1,1)},uDmg:{value:0},uSlow:{value:0},uFlash:{value:0},uScope:{value:0},uHz:{value:[0,1,2,3].map(()=>new THREE.Vector4())},uAsp:{value:1.7},tDirt:{value:null},uDirt:{value:0}},
  vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform sampler2D tDiffuse,tDirt; uniform vec2 uTx; uniform float uSh,uGr,uDirt,uT,uC,uS,uDmg,uSlow,uFlash,uScope,uAsp; uniform vec4 uHz[4]; uniform vec3 uLift,uGain; varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){ vec2 d=vUv-0.5; float r=length(d); vec2 o=d*(0.012*uDmg+0.01*uSlow)*r*2.0; vec2 uv=vUv;
    for(int i=0;i<4;i++){ vec4 hz=uHz[i]; if(hz.w>0.0){ vec2 q=(vUv-hz.xy)*vec2(uAsp,1.0); float f=hz.w*smoothstep(hz.z,0.0,length(q))*smoothstep(-hz.z*1.2,0.0,q.y+hz.z*0.3); uv+=vec2(sin(vUv.y*90.0+uT*9.0+vUv.x*20.0),cos(vUv.x*70.0-uT*7.0))*f*0.0025; } }
    vec3 c=vec3(texture2D(tDiffuse,uv+o).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-o).b);
    if(uSh>0.0){ vec3 nb=texture2D(tDiffuse,uv+vec2(uTx.x,0.0)).rgb+texture2D(tDiffuse,uv-vec2(uTx.x,0.0)).rgb+texture2D(tDiffuse,uv+vec2(0.0,uTx.y)).rgb+texture2D(tDiffuse,uv-vec2(0.0,uTx.y)).rgb; c=max(c+(c*4.0-nb)*uSh,c*0.5); }
    float l=dot(c,vec3(0.299,0.587,0.114)); c=mix(vec3(l),c,uS*(1.0-0.75*uSlow)); c=(c-0.5)*uC+0.5;
    vec3 sh=vec3(0.0,0.06,0.1), hi=vec3(0.1,0.04,-0.04); c+=mix(sh,hi,smoothstep(0.1,0.8,l))*0.35; c=c*uGain+uLift*(1.0-c);
    c=mix(c,c*vec3(0.75,0.9,1.25),uSlow*0.6);
    c*=mix(1.0,smoothstep(0.85,0.25,r),0.55+0.25*uSlow); c=mix(c,vec3(0.6,0.0,0.0),uDmg*smoothstep(0.25,0.75,r)*0.7);
    { vec3 dt=texture2D(tDirt,vUv).rgb; float lb=dot(texture2D(tDiffuse,vUv,4.0).rgb,vec3(0.33)); c+=dt*(uDirt*0.3+smoothstep(0.8,1.4,lb)*0.16)*vec3(1.0,0.92,0.8); }
    c+=(h(vUv*vec2(1021.0,983.0)+fract(uT))-0.5)*uGr; c+=uFlash;
    if(uScope>0.5){ vec2 q=d*vec2(${1.0},1.0); }
    gl_FragColor=vec4(max(c,0.0),1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    } `}); grade.uniforms.tDirt.value=(()=>{ const S=512,cv=document.createElement('canvas'); cv.width=cv.height=S; const g=cv.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,S,S); g.globalCompositeOperation='lighter';
  for(let i=0;i<70;i++){ const x=Math.random()*S,y=Math.random()*S,r=4+Math.random()*Math.random()*60,a=.04+Math.random()*.12; const gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,`rgba(255,255,255,${a})`); gr.addColorStop(.6,`rgba(255,255,255,${a*.5})`); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.beginPath(); g.arc(x,y,r,0,7); g.fill(); }
  g.lineCap='round'; for(let i=0;i<14;i++){ g.strokeStyle=`rgba(255,255,255,${.015+Math.random()*.03})`; g.lineWidth=1+Math.random()*3; g.beginPath(); let x=Math.random()*S,y=Math.random()*S; g.moveTo(x,y); for(let k=0;k<4;k++){ x+=(Math.random()-.5)*80; y+=(Math.random()-.5)*80; g.lineTo(x,y); } g.stroke(); }
  const t=new THREE.CanvasTexture(cv); t.generateMipmaps=true; t.minFilter=THREE.LinearMipmapLinearFilter; return t; })();
composer.addPass(grade);
let Q=TOUCH?1:2; // quality 0..2
let shF=0, DYN=1, dynAcc=0, dynN=0; const PR=()=>{ const d=devicePixelRatio||1, base=Math.min(d,TOUCH?(Q>1?1.75:1.5):[1,1.25,1.5][Q]); return Math.min(d,Math.max(1,base*DYN)); }; // dynamic resolution scale (drops on slow phones)
function applyQuality(){ const boot=!applyQuality.done; applyQuality.done=true; if(fx){ fx.q=Q; fx.deb.castShadow=Q>1&&!TOUCH; } world.maxLamps=TOUCH?[0,0,2][Q]:[0,2,4][Q]; world.lowQ=Q<2;
  // shadow type/enable/size are fixed at boot: toggling them at runtime recompiles every shader (multi-second freeze on phones)
  if(boot){ renderer.shadowMap.enabled=true; renderer.shadowMap.type=(Q>1&&!TOUCH)?THREE.PCFSoftShadowMap:THREE.PCFShadowMap; const ms=(Q>1&&!TOUCH)?2048:1024; sun.shadow.mapSize.set(ms,ms); if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;} scene.traverse(o=>{ if(o.material&&!Array.isArray(o.material))o.material.needsUpdate=true; }); }
  renderer.shadowMap.autoUpdate=Q>1&&!TOUCH; renderer.shadowMap.needsUpdate=true; shEvery=Q>1?(TOUCH?2:1):Q>0?2:5; { const r=Q>1?30:22; sc.left=sc.bottom=-r; sc.right=sc.top=r; sc.updateProjectionMatrix(); }
  DYN=1; renderer.setPixelRatio(PR()); bloom.enabled=Q>0; { const sm=Q>1?4:0; for(const rt of [composer.renderTarget1,composer.renderTarget2]) if(rt.samples!==sm){ rt.samples=sm; rt.dispose(); } } { const an=Math.min(renderer.capabilities.getMaxAnisotropy(),Q>1?8:4); for(const k in lib.tex){ const t=lib.tex[k]; if(t&&t.isTexture&&t.anisotropy!==an){ t.anisotropy=an; t.needsUpdate=true; } } } resize(); }
let shEvery=2;
function resize(){ const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); composer.setSize(w,h); bloom.resolution.set(w/(TOUCH?3:2),h/(TOUCH?3:2)); { const pr=renderer.getPixelRatio(); grade.uniforms.uTx.value.set(1/(w*pr),1/(h*pr)); grade.uniforms.uSh.value=TOUCH?(Q>1?0.12:0.2):(Q>1?0.06:0.1); } camera.aspect=w/h; camera.updateProjectionMatrix(); const px=h/800*renderer.getPixelRatio(); if(fx){fx.add.mat.uniforms.uPx.value=px; fx.smoke.mat.uniforms.uPx.value=px;} }
addEventListener('resize',resize);
let fx=null, decals=null;
// ---------------- assets ----------------
const lib={props:{},chars:{},weapons:{},weaponsM:{},att:{},tex:{}};
const AI_CHARS=['rifle','heavy','officer','sniper','arctic','insurg','militant'];
const OPS=[{id:'std',name:'STANDARD',price:0,m:'soldier',c:'#4a5a3a'},{id:'arctic',name:'ARCTIC GHOST',price:2400,m:'ai_arctic',c:'#dfe6ee'},{id:'ghillie',name:'GHILLIE',ad:true,m:'ai_sniper',c:'#5a6a30'},{id:'jugg',name:'JUGGERNAUT',price:6000,m:'ai_heavy',c:'#2a2c30'}];
async function loadAll(){
  const gl=new GLTFLoader(), tl=new THREE.TextureLoader(); const dl=new DRACOLoader(); dl.setDecoderPath('vendor/draco/'); dl.setDecoderConfig({type:'wasm'}); gl.setDRACOLoader(dl); let done=0; const total=7; const prog=()=>{ done++; $('loadbar').style.width=(done/total*100)+'%'; };
  const glb=n=>new Promise((res,rej)=>gl.load('assets/models/'+n+'.glb',g=>{prog();res(g.scene);},undefined,rej));
  const tex=(n,srgb=true)=>new Promise(res=>tl.load('assets/tex/'+n+'.jpg',t=>{ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=4; if(srgb)t.colorSpace=THREE.SRGBColorSpace; res(t); }));
  const [chs,wep,pro,g1,g2,cc,_dt,wep2]=await Promise.all([glb('chars'),glb('weapons'),glb('props'),tex('ground'),tex('ground_n',false),tex('concrete'),new Promise(res=>tl.load('assets/tex/decals.png',t=>{ t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; prog(); res(t); })),glb('weapons2').catch(e=>{ console.warn('weapons2',e); return null; })]); prog(); 
  g1.repeat.set(60,60); g2.repeat.set(60,60); cc.repeat.set(20,20); lib.tex={ground:g1,groundN:g2,concrete:cc,decals:_dt};
  for(const k of ['soldier','enemy','enemy2','enemy3','elite','boss']){ const r=chs.getObjectByName(k); if(!r)continue; r.parent&&r.parent.remove(r); r.position.set(0,0,0); prepChar(r,k); lib.chars[k]=r; }
  // extra AI-generated soldiers (lazy: fetched after the menu is up, awaited on deploy)
  lib.aiLoad=Promise.all(AI_CHARS.map(n=>new Promise(res=>gl.load('assets/models/ai_'+n+'.glb',g=>{ try{ const r=g.scene.getObjectByName(n)||g.scene.children[0]; r.parent&&r.parent.remove(r); r.position.set(0,0,0); r.userData.ai=1; prepChar(r,n); lib.chars['ai_'+n]=r; palmCal(r); }catch(e){ console.warn('ai char',n,e); } res(); },undefined,()=>res()))));
  const wearDone=new Set(); const wear=m=>{ if(!m||wearDone.has(m)||!m.isMeshStandardMaterial)return; wearDone.add(m); if(m.metalness>0.5){ m.envMapIntensity=1.6; } else m.envMapIntensity=0.9;
    if(m.emissiveIntensity>1||m.transparent)return; m.onBeforeCompile=sh=>{ sh.fragmentShader=sh.fragmentShader.replace('#include <lights_fragment_begin>','float sfW=smoothstep(.45,1.0,clamp(length(fwidth(nonPerturbedNormal))*3.5,0.,1.)); diffuseColor.rgb=mix(diffuseColor.rgb,max(diffuseColor.rgb*1.9,vec3(.32,.31,.30)),sfW*.55); material.diffuseColor=diffuseColor.rgb*(1.0-metalnessFactor); material.roughness=max(.06,roughnessFactor*(1.-sfW*.5));\n#include <lights_fragment_begin>'); }; m.customProgramCacheKey=()=>'wear'; };
  for(const c of [...wep.children,...(wep2?wep2.children:[])]){ c.traverse(o=>{ if(o.isMesh){ o.castShadow=true; (Array.isArray(o.material)?o.material:[o.material]).forEach(wear); } }); if(/^att_/.test(c.name)){ lib.att[c.name.slice(4)]=mergeWeapon(c); continue; } lib.weapons[c.name]=c; lib.weaponsM[c.name]=mergeWeapon(c); }
  for(const c of pro.children){ c.traverse(o=>{ if(o.isMesh){o.castShadow=o.receiveShadow=true; if(o.material.emissiveIntensity>0)o.material.emissiveIntensity*=1.0;} }); lib.props[c.name]=c; }
}
const LODMAT=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.05}), AVG=new Map();
function avgTex(t){ const W=new THREE.Color(1,1,1); if(!t||!t.image)return W; if(AVG.has(t.uuid))return AVG.get(t.uuid); let c=W; try{ const cv=document.createElement('canvas'); cv.width=cv.height=8; const g=cv.getContext('2d'); g.drawImage(t.image,0,0,8,8); const d=g.getImageData(0,0,8,8).data; let r=0,gg=0,b=0; for(let i=0;i<d.length;i+=4){ r+=d[i]; gg+=d[i+1]; b+=d[i+2]; } c=new THREE.Color().setRGB(r/64/255,gg/64/255,b/64/255,THREE.SRGBColorSpace); }catch(e){} AVG.set(t.uuid,c); return c; }
function clusterLOD(g,div){ // fast vertex-clustering decimation for distant weapon LODs
  g.computeBoundingBox(); const bb=g.boundingBox, sz=bb.getSize(new THREE.Vector3()), c=Math.max(sz.x,sz.y,sz.z)/div||1e-3; const P=g.attributes.position.array, U=g.attributes.uv.array, n=P.length/3; const map=new Map(), rep=new Int32Array(n), cnt=[]; const pos=[], uv=[], nor=[];
  for(let i=0;i<n;i++){ const k=((P[i*3]-bb.min.x)/c|0)+','+((P[i*3+1]-bb.min.y)/c|0)+','+((P[i*3+2]-bb.min.z)/c|0); let j=map.get(k); if(j===undefined){ j=cnt.length; map.set(k,j); cnt.push(0); pos.push(0,0,0); uv.push(U[i*2],U[i*2+1]); } cnt[j]++; pos[j*3]+=P[i*3]; pos[j*3+1]+=P[i*3+1]; pos[j*3+2]+=P[i*3+2]; rep[i]=j; }
  for(let j=0;j<cnt.length;j++){ pos[j*3]/=cnt[j]; pos[j*3+1]/=cnt[j]; pos[j*3+2]/=cnt[j]; }
  const idx=[], seen=new Set(); for(let i=0;i<n;i+=3){ const a=rep[i],b=rep[i+1],d=rep[i+2]; if(a===b||b===d||a===d)continue; const k=a<b?(b<d?a+'_'+b+'_'+d:a+'_'+d+'_'+b):b+'_'+a+'_'+d; if(seen.has(k)&&false)continue; idx.push(a,b,d); }
  const o=new THREE.BufferGeometry(); o.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); o.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); if(g.attributes.color){ const C=g.attributes.color.array, cc=new Float32Array(cnt.length*3); for(let i=0;i<n;i++){ const j=rep[i]; cc[j*3]=C[i*3]; cc[j*3+1]=C[i*3+1]; cc[j*3+2]=C[i*3+2]; } o.setAttribute('color',new THREE.BufferAttribute(cc,3)); }
  o.setIndex(idx); o.computeVertexNormals(); return o; }
const GRIPL={ak:0.26,pump:0.31,m60:0.3,m82:0.3,m32:0.3};
function addAtts(w,n,ae,rig){ const M=MOUNT[n]||{}; const put=(id,pos)=>{ const a=lib.att[id]; if(!a)return null; const c=a.clone(); c.position.set(pos[0],pos[1],pos[2]); w.add(c); return c; };
  if(ae.optic&&M.optic) put(ae.optic,M.optic);
  if(ae.mag&&M.mag) put('mag',M.mag);
  if(ae.under&&M.under){ put('grip',M.under); rig.attGrip=M.under; }
  if(ae.muzzle&&M.muzzle!==undefined){ const mz=w.getObjectByName(n+'_muzzle'); if(mz){ put('supp',[mz.position.x,mz.position.y,mz.position.z]); mz.position.z+=0.17; } } }
function mergeWeapon(src){ // batch a weapon into few meshes (full + LOD without tiny parts); keeps the muzzle node
  const root=src.clone(); root.position.set(0,0,0); root.rotation.set(0,0,0); root.scale.set(1,1,1); root.updateMatrixWorld(true); const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(), M4=new THREE.Matrix4();
  const out=new THREE.Group(); out.name=src.name; out.position.copy(src.position); out.quaternion.copy(src.quaternion); out.scale.copy(src.scale); const by=[new Map(),new Map()];
  root.traverse(o=>{ if(o.isMesh){ M4.multiplyMatrices(inv,o.matrixWorld); const g=o.geometry.clone().applyMatrix4(M4); for(const k of Object.keys(g.attributes)) if(!['position','normal','uv'].includes(k))g.deleteAttribute(k); if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
      const vk=vcKey(o.material); if(vk.vc)addVC(g,o.material); const gg=g.index?g.toNonIndexed():g; g.computeBoundingBox(); const b=g.boundingBox.getSize(new THREE.Vector3());
      for(const L of [0,1]){ if(L&&b.x+b.y+b.z<0.07)continue; if(!by[L].has(vk.key))by[L].set(vk.key,{m:vk.mat,g:[]}); by[L].get(vk.key).g.push(gg); } }
    else if(/_muzzle$/.test(o.name)){ const m=new THREE.Object3D(); m.name=o.name; M4.multiplyMatrices(inv,o.matrixWorld); M4.decompose(m.position,m.quaternion,m.scale); out.add(m); } });
  for(const L of [0,1]){ const grp=new THREE.Group(); grp.userData.wlod=L; grp.visible=!L; for(const {m,g} of by[L].values()){ let mg=mergeGeometries(g); if(!mg)continue; if(L&&mg.attributes.position.count>600)mg=clusterLOD(mg,window.SF_WLODV||40); const ms=new THREE.Mesh(mg,m); ms.castShadow=!L; grp.add(ms); } out.add(grp); }
  return out; }
// smooth skin weights: blend vertices across shoulder/elbow/hip/knee pivots (joint <-> parent) for soft deformation
const SMZ={shoulderL:['elbowL',.075,.13],shoulderR:['elbowR',.075,.13],elbowL:['handL',.06,.085],elbowR:['handR',.06,.085],legL:[null,.07,.13],legR:[null,.07,.13],kneeL:[null,.06,.095],kneeR:[null,.06,.095]};
const SMZ_AI={shoulderL:['elbowL',.09,.2],shoulderR:['elbowR',.09,.2],elbowL:['handL',.07,.14],elbowR:['handR',.07,.14],legL:[null,.08,.24],legR:[null,.08,.24],kneeL:[null,.07,.17],kneeR:[null,.07,.17],spine:[null,.07,.45],neck:[null,.035,.25],head:[null,.035,.25]}; let CUR_SMZ=SMZ; // AI-scanned soldier: one continuous mesh, wider blend zones
function smoothW(g,j,ji,joints,inv,si,sw){ const SM=CUR_SMZ, AIM=SM===SMZ_AI; if(window.SF_RIGID)return; const P=g.attributes.position, V=new THREE.Vector3(), M=new THREE.Matrix4(), piv=o=>new THREE.Vector3().setFromMatrixPosition(M.multiplyMatrices(inv,o.matrixWorld));
  const zones=[]; // zones where this joint is the child (j==Z) or the parent (j==Z.parent)
  for(const Z of joints){ const z=SM[Z.name]; if(!z)continue; const pj=joints.indexOf(Z.parent); if(pj<0)continue; let role=Z===j?1:(Z.parent===j?0:-1); if(role<0)continue;
    const p0=piv(Z); let ax; if(z[0]){ const c=joints.find(o=>o.name===z[0]); ax=c?piv(c).sub(p0).normalize():new THREE.Vector3(0,-1,0); } else ax=new THREE.Vector3(0,-1,0);
    zones.push({p0,ax,r:z[1],lat:z[2],ci:joints.indexOf(Z),pi:pj,role}); }
  if(!zones.length)return; const s=(window.SF_LODSTAT&&0)||1;
  for(let i=0;i<P.count;i++){ V.fromBufferAttribute(P,i); let zs=zones; if(AIM){ let b=null,bl=1e9; for(const z of zones){ const d=V.clone().sub(z.p0); const t=d.dot(z.ax); if(Math.abs(t)>z.r)continue; const l=d.addScaledVector(z.ax,-t).length()/z.lat; if(l<bl){bl=l;b=z;} } zs=b?[b]:[]; } for(const z of zs){ const d=V.clone().sub(z.p0); const t=d.dot(z.ax); if(Math.abs(t)>z.r)continue; const lat=d.addScaledVector(z.ax,-t).length(); if(lat>z.lat)continue;
      let w=Math.min(1,Math.max(0,.5+t/(2*z.r))); w=w*w*(3-2*w); const fall=1-Math.max(0,(lat-z.lat*.7)/(z.lat*.3)); // fade at lateral edge
      const own=z.role?1:0; w=own+(w-own)*fall; if(w<.01||w>.99)continue; si[i*4]=z.ci; sw[i*4]=w; si[i*4+1]=z.pi; sw[i*4+1]=1-w; break; } } }
function palmOf(r){ r.updateMatrixWorld(true); const sm=r.children.find(c=>c.isSkinnedMesh&&!c.userData.lod); if(!sm)return null; const bones=sm.skeleton.bones, o={}; const P=sm.geometry.attributes.position, SI=sm.geometry.attributes.skinIndex, SW=sm.geometry.attributes.skinWeight;
  for(const sd of ['L','R']){ const hi=bones.findIndex(b=>b.name==='hand'+sd); const c=new THREE.Vector3(), v=new THREE.Vector3(); let n=0; for(let i=0;i<P.count;i++) if(SI.getX(i)===hi&&SW.getX(i)>.9){ c.add(v.fromBufferAttribute(P,i)); n++; } if(!n)return null; c.divideScalar(n); const H=bones[hi]; c.sub(H.getWorldPosition(v)).applyQuaternion(H.getWorldQuaternion(new THREE.Quaternion()).invert()); o[sd]=c; } return o; }
function palmCal(r){ if(!lib._palm0)lib._palm0=palmOf(lib.chars.soldier); const a=palmOf(r), b=lib._palm0; if(!a||!b)return; r.userData.palmD={L:a.L.sub(b.L).toArray(),R:a.R.sub(b.R).toArray()}; }
function prepChar(root,tag){ // rigid-skin every joint's meshes into ONE SkinnedMesh per material (few draw calls, full detail)
  CUR_SMZ=root.userData&&root.userData.ai?SMZ_AI:SMZ; root.updateMatrixWorld(true); const inv=new THREE.Matrix4().copy(root.matrixWorld).invert();
  const joints=[]; root.traverse(o=>{ if(o!==root&&!o.isMesh){ if(tag&&o.name.endsWith('_'+tag))o.name=o.name.slice(0,-tag.length-1); joints.push(o);} });
  const by=new Map(), byL=new Map(), M4=new THREE.Matrix4();
  joints.forEach((j,ji)=>{ for(const c of [...j.children]) if(c.isMesh){ M4.multiplyMatrices(inv,c.matrixWorld); const g=c.geometry.clone().applyMatrix4(M4); for(const k of Object.keys(g.attributes)) if(!['position','normal','uv'].includes(k))g.deleteAttribute(k); if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2)); const isL=/^LOD_/.test(c.name); const vk=isL?{key:'L',mat:LODMAT,vc:true}:vcKey(c.material); if(isL){ const cm=c.material, col=cm.color.clone().multiply(avgTex(cm.map)); if(cm.emissive&&cm.emissiveIntensity>0)col.add(cm.emissive.clone().multiplyScalar(cm.emissiveIntensity*.5)); addVC(g,{color:col}); } else if(vk.vc)addVC(g,c.material); const n=g.attributes.position.count; const si=new Uint16Array(n*4), sw=new Float32Array(n*4); for(let i=0;i<n;i++){ si[i*4]=ji; sw[i*4]=1; } smoothW(g,j,ji,joints,inv,si,sw); g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4)); g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4)); const key=vk.key, mp=isL?byL:by; if(!mp.has(key))mp.set(key,{m:vk.mat,g:[]}); mp.get(key).g.push(g.index?g.toNonIndexed():g); j.remove(c); } });
  const skel=new THREE.Skeleton(joints, joints.map(j=>new THREE.Matrix4().multiplyMatrices(inv,j.matrixWorld).invert()));
  let t0=0,t1=0; for(const [mp,lod] of [[by,0],[byL,1]]) for(const {m,g} of mp.values()){ const mg=mergeGeometries(g); if(lod)t1+=mg.attributes.position.count/3; else t0+=mg.attributes.position.count/3; const mesh=new THREE.SkinnedMesh(mg,m); mesh.userData.lod=lod; mesh.visible=!lod; mesh.castShadow=!lod; mesh.frustumCulled=true; mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,1,0),1.9); root.add(mesh); mesh.bind(skel,new THREE.Matrix4()); } (window.SF_LODSTAT=window.SF_LODSTAT||{})[tag]=[t0,t1];
}

// two-bone arm IK (AI-scanned soldiers): hands grip the weapon (right = pistol grip, left = foregrip) on top of the procedural pose
const _v1=new THREE.Vector3(),_v2=new THREE.Vector3(),_v3=new THREE.Vector3(),_v4=new THREE.Vector3(),_q1=new THREE.Quaternion(),_q2=new THREE.Quaternion(),_q3=new THREE.Quaternion();
function _rotWorld(o,qd,w){ // apply world-space delta rotation qd to joint o (weight w)
  if(w<1)qd=_q3.identity().slerp(qd,w); o.parent.getWorldQuaternion(_q1); const wq=_q2.copy(_q1).multiply(o.quaternion); wq.premultiply(qd); o.quaternion.copy(_q1.invert().multiply(wq)); o.updateMatrixWorld(true); }
function armIK(S,E,H,T,w,pole,ext=0.08){ if(w<=0.001)return; S.updateMatrixWorld(true);
  const s=S.getWorldPosition(new THREE.Vector3()), e=E.getWorldPosition(new THREE.Vector3()), h=H.getWorldPosition(new THREE.Vector3());
  h.add(_v1.copy(h).sub(e).normalize().multiplyScalar(ext)); const a=s.distanceTo(e), b=e.distanceTo(h); const t=_v4.copy(T); let d=t.distanceTo(s); const dm=a+b-0.002; if(d>dm){ t.sub(s).setLength(dm).add(s); d=dm; } d=Math.max(d,Math.abs(a-b)+0.01);
  // elbow bend: desired interior angle via law of cosines
  const cur=_v1.copy(s).sub(e).angleTo(_v2.copy(h).sub(e)); const want=Math.acos(clamp((a*a+b*b-d*d)/(2*a*b),-1,1));
  let ax=_v3.copy(s).sub(e).cross(_v2.copy(h).sub(e)); if(ax.lengthSq()<1e-8) ax.copy(pole); ax.normalize();
  _rotWorld(E,new THREE.Quaternion().setFromAxisAngle(ax,want-cur),w);
  H.getWorldPosition(h); h.add(_v3.copy(h).sub(E.getWorldPosition(_v2)).normalize().multiplyScalar(ext)); const q=new THREE.Quaternion().setFromUnitVectors(_v1.copy(h).sub(s).normalize(),_v2.copy(t).sub(s).normalize()); _rotWorld(S,q,w); }
// ---------------- rig (Blender joints, procedural animation) ----------------
const JN=['hips','spine','neck','head','shoulderL','shoulderR','elbowL','elbowR','handL','handR','legL','legR','kneeL','kneeR'];
class Rig{
  constructor(kind,scale=1,mdl){ this.root=new THREE.Group(); this.pivot=new THREE.Group(); this.pivot.position.y=0.9; this.root.add(this.pivot);
    { let src=null; const mm=Array.isArray(mdl)?mdl[Math.random()*mdl.length|0]:mdl; if(mm&&lib.chars[mm])src=mm; if(!src){ const vv=kind==='enemy'?['enemy','enemy2','enemy3'].filter(n=>lib.chars[n]):null; src=vv?vv[Math.random()*vv.length|0]:kind; } this.src=src; this.model=SkelU.clone(lib.chars[src]); } this.model.position.y=-0.9; this.pivot.add(this.model); this.root.scale.setScalar(scale);
    this.J={}; for(const n of JN) this.J[n]=this.model.getObjectByName(n); this.hip0=this.J.hips.position.y;
    this.anchor=new THREE.Group(); this.anchor.position.set(-0.17,0.27,0.3); this.J.spine.add(this.anchor);
    this.knife=lib.weapons.knife.clone(); this.knife.visible=false; this.knife.rotation.x=Math.PI/2; this.J.handR.add(this.knife); this.knife.position.copy(this.J.handR.children[0]?new THREE.Vector3(-0.28,0.92,0):new THREE.Vector3());
    this.nade=lib.weapons.grenade.clone(); this.nade.visible=false; this.J.handR.add(this.nade);
    // hand-local offset: joint meshes are in model space around joint pivot; put props at hand pivot position
    const hp=this.J.handR.position; this.knife.position.set(0,-0.03,0.05); this.nade.position.set(0,-0.05,0);
    this.c={}; this.gun=null; this.muzzle=null; }
  setWeapon(n){ if(this.gun)this.anchor.remove(this.gun); const w=(lib.weaponsM[n]||lib.weapons[n]||lib.weaponsM.rifle).clone(); if(this.isP)META.applySkin(w,n); this.anchor.add(w); this._lo=undefined; this.gun=w; this.muzzle=w.getObjectByName(n+'_muzzle')||w; this.wname=n; const ae=this.isP?attEq(n):{}; this.attGrip=null; if(this.isP) addAtts(w,n,ae,this); { const bb=new THREE.Box3().setFromObject((lib.weaponsM[n]||lib.weapons[n])); const L=bb.max.z; const ps=PISTOLS.has(n); this.gripR=new THREE.Vector3(0,ps?-0.06:-0.09,ps?-0.02:-0.05); this.gripL=ps?new THREE.Vector3(0.035,-0.07,0.0):new THREE.Vector3(0,n==='launcher'?-0.1:-0.095,GRIPL[n]||Math.min(0.34,Math.max(0.16,L*0.48))); if(this.attGrip!=null)this.gripL.set(0,this.attGrip[1]-0.115,this.attGrip[2]); } if(PISTOLS.has(n))this.anchor.position.set(-0.12,0.27,0.42); else this.anchor.position.set(-0.17,0.27,0.3); }
  lod(d){ const sh=d<(Q>1?34:22), lo=d>(Q>1?18:12); if(sh!==this._sh||lo!==this._lo){ this._sh=sh; this._lo=lo; this.root.traverse(o=>{ if(o.userData.wlod!==undefined) o.visible=o.userData.wlod===1?lo:!lo; if(o.isSkinnedMesh){ const L=o.userData.lod===1; o.visible=L?lo:!lo; o.castShadow=sh&&!L; } else if(o.isMesh) o.castShadow=sh&&!(o.parent&&o.parent.userData.wlod===1); }); } }
  rot(j,x,y,z,k,dt){ const o=this.J[j]; o.rotation.x=damp(o.rotation.x,x,k,dt); o.rotation.y=damp(o.rotation.y,y||0,k,dt); o.rotation.z=damp(o.rotation.z,z||0,k,dt); }
  pose(s,dt){ if(this._fk){ ['shoulderR','elbowR','shoulderL','elbowL'].forEach((n,i)=>this.J[n].rotation.copy(this._fk[i])); this._fk=null; } const k=s.snap?60:14, ph=s.phase||0, mv=s.move||0, cr=s.crouch||0; let lx=Math.sin(ph)*0.65*mv, rx=-lx, kl=Math.max(0,Math.sin(ph+1.6))*1.0*mv+0.1, kr=Math.max(0,Math.sin(ph+1.6+Math.PI))*1.0*mv+0.1;
    let hipY=-Math.abs(Math.sin(ph))*0.05*mv, spX=0.08*mv*(s.sprint?2.5:1)-(s.pitch||0)*0.7, spY=0, pvX=0, pvZ=0, pvY=0.9;
    let shR=-1.35, elR=-0.35, shL=-1.4, elL=-0.55, shLz=-0.55, shRz=0.15, gunX=0, gunZ=0, headX=(s.pitch||0)*-0.3;
    if(s.sprint&&!s.aim){ shR=-0.7; elR=-1.0; gunX=0.9; gunZ=0.4; shL=-0.6+Math.sin(ph)*0.5; elL=-0.9; shLz=-0.2; spX=0.3; }
    if(cr>0){ lx=lerp(lx,-1.1+lx*0.4,cr); rx=lerp(rx,-1.1+rx*0.4,cr); kl=lerp(kl,1.6,cr); kr=lerp(kr,1.6,cr); hipY-=0.3*cr; spX+=0.15*cr; }
    if(s.reload>0){ const t=s.reload, sm=x=>x*x*(3-2*x), ph4=(a,b)=>sm(clamp((t-a)/(b-a),0,1)); // 0..1 progress: tilt -> mag out -> pouch -> insert -> charge
      const tilt=Math.sin(Math.min(1,t*1.15)*Math.PI); gunZ=0.55*tilt; gunX=0.3*tilt-0.12*ph4(0.8,0.9)+0.12*ph4(0.9,1);
      const toP=ph4(0.12,0.32)-ph4(0.42,0.62); shL=lerp(-1.25,-0.25,toP); elL=lerp(-1.1,-0.35,toP); shLz=lerp(-0.45,0.05,toP);
      if(t>0.78){ const c=ph4(0.78,0.9)-ph4(0.9,1); shL=lerp(shL,-1.6,c); elL=lerp(elL,-1.5,c); } spY=0.12*tilt; headX+=0.25*tilt; }
    if(s.cooking||s.throwT>0){ const t=s.throwT>0?s.throwT:0; shR=s.cooking?-3.5:lerp(-3.5,-1.0,Math.min(1,t*1.6)); elR=s.cooking?-0.9:-0.2; gunX=1.0; gunZ=0.6; spY=s.cooking?0.4:-0.3; }
    if(s.knifeT>0){ const t=s.knifeT; shR=t<0.35?lerp(-1,-2.7,t/0.35):lerp(-2.7,-0.9,Math.min(1,(t-0.35)*4)); elR=-0.4; gunX=1.0; gunZ=0.8; spY=t<0.35?0.3:-0.4; spX+=0.2; }
    if(s.cover){ spY+=0.0; }
    if(s.slide>0){ pvX=-0.55; pvY=0.55; lx=-1.45; kl=0.15; rx=-0.8; kr=1.3; shL=-0.4; shLz=0.5; elL=-0.2; spX=0.2; }
    if(s.roll>=0&&s.roll!==undefined&&s.roll<1){ const t=s.roll; pvX=t*Math.PI*2; pvY=0.9-Math.sin(t*Math.PI)*0.45; lx=rx=-1.7; kl=kr=2.2; spX=0.6; shR=-1.0; shL=-1.0; gunX=0.8; }
    if(s.vault>=0&&s.vault!==undefined&&s.vault<1){ const t=s.vault; pvZ=Math.sin(t*Math.PI)*0.7; lx=-1.5; kl=1.8; rx=-0.9; kr=1.6; shL=-0.3; shLz=0.9; elL=0; }
    if(s.takedown>=0&&s.takedown!==undefined){ }
    if(s.dead>0){ // ragdoll-like: knees buckle, body topples with a bounce, limbs go slack
      const ty=s.deadType||0, dir=s.deadDir||1, sd=s.deadSide||1, tb=Math.min(1,s.dead*1.9), buck=Math.min(1,s.dead*5);
      const bounce=x=>x<0.72?(x/0.72)*(x/0.72):1-Math.sin((x-0.72)/0.28*Math.PI)*0.09*(1-x);
      const fall=bounce(tb), slack=Math.min(1,s.dead*3);
      if(ty===1){ pvX=1.42*fall; pvY=lerp(0.9,0.22,fall); kl=lerp(1.4,0.2,fall)*buck; kr=lerp(1.6,0.3,fall)*buck; lx=-0.9*buck*(1-fall)-0.1; rx=-0.7*buck*(1-fall); shR=lerp(-1.2,-2.9,slack); shL=lerp(-1.2,-3.0,slack); shLz=-0.5; shRz=0.5; elL=-0.6; elR=-0.4; headX=-0.5*fall; spX=0.3*(1-fall); }
      else if(ty===2){ pvZ=1.45*sd*fall; pvY=lerp(0.9,0.3,fall); pvX=-0.25*dir*fall; kl=0.9*buck; kr=0.3*buck; lx=-0.6*buck; rx=-0.2; shR=-0.6-1.6*slack; shRz=0.9*sd; shL=-0.4-1.2*slack; shLz=-0.9*sd; elL=-0.9; elR=-0.2; headX=0.3; spY=0.5*sd*fall; }
      else { pvX=-1.45*dir*fall; pvY=lerp(0.9,0.25,fall); lx=-0.3-0.6*buck*(1-fall); rx=-0.6; kl=0.4+0.9*buck*(1-fall); kr=0.8; shR=-2.6*slack; shL=-2.4*slack; shLz=0.6+0.3*sd; shRz=-0.3*sd; elL=elR=-0.3; headX=0.4*fall; spX=-0.2; } }
    // idle life: breathing, occasional look-around / weapon check; walking weapon sway; firing recoil
    this.tt=(this.tt||0)+dt; let headY=0; const busy=s.reload>0||s.cooking||s.knifeT>0||s.roll>=0&&s.roll<1||s.slide>0||s.dead>0||s.vault>=0&&s.vault<1;
    if(!busy){ const br=Math.sin(this.tt*1.9+(this.seed||0)); spX+=br*0.018; shL+=br*0.025; shR+=br*0.02; hipY+=br*0.004;
      if(mv<0.05&&!s.aim){ this.idleT=(this.idleT||0)+dt; const c=this.idleT%9; if(c>5.5&&c<7.5){ const w=Math.sin((c-5.5)/2*Math.PI); headY=Math.sin((c-5.5)*2.4)*0.7*w; spY+=headY*0.25; } else if(c>7.6&&c<8.9){ const w=Math.sin((c-7.6)/1.3*Math.PI); gunZ+=0.5*w; gunX+=0.25*w; headX+=0.25*w; } } else this.idleT=0;
      if(mv>0.05&&!s.sprint){ gunZ+=Math.sin(ph)*0.05*mv; gunX+=Math.abs(Math.cos(ph))*0.04*mv; }
      if(s.recoil>0){ const r=Math.min(1,s.recoil); shR-=r*0.22; shL-=r*0.18; elR+=r*0.15; spX-=r*0.12; headX-=r*0.06; gunX-=r*0.18; } }
    if(s.hit>0){ const h=s.hit*s.hit, hs=s.hitSide||0; spX-=h*0.55; headX-=h*0.5; spY+=h*0.45*hs; pvZ+=h*0.12*hs; shL+=h*0.35; shLz-=h*0.25; if(!s.dead)hipY-=h*0.06; }
    const K=s.dead>0?10:k;
    this.rot('legL',lx,0,0,K,dt); this.rot('legR',rx,0,0,K,dt); this.rot('kneeL',kl,0,0,K,dt); this.rot('kneeR',kr,0,0,K,dt);
    this.rot('spine',spX,spY,0,K,dt); this.rot('head',headX,headY,0,K,dt);
    this.rot('shoulderR',shR,0,shRz,K,dt); this.rot('elbowR',elR,0,0,K,dt); this.rot('shoulderL',shL,0,shLz,K,dt); this.rot('elbowL',elL,0,0,K,dt);
    this.J.hips.position.y=damp(this.J.hips.position.y,this.hip0+hipY,K,dt);
    const rollAct=s.roll>=0&&s.roll<1; this.pivot.rotation.x=rollAct?pvX:damp(this.pivot.rotation.x,pvX,K,dt); this.pivot.rotation.z=damp(this.pivot.rotation.z,pvZ,K,dt); this.pivot.position.y=damp(this.pivot.position.y,pvY,K,dt);
    this.anchor.rotation.x=damp(this.anchor.rotation.x,gunX,K,dt); this.anchor.rotation.z=damp(this.anchor.rotation.z,gunZ,K,dt);
    this.knife.visible=s.knifeT>0||!!s.takedownKnife; this.nade.visible=!!s.cooking; if(this.gun)this.gun.visible=!this.knife.visible||PISTOLS.has(s.wname);  this.ik(s,dt); }
  ik(s,dt){ if(!this.model.userData.ai||!this.gun||window.SF_NOIK)return; const JJ=['shoulderR','elbowR','shoulderL','elbowL']; this._fk=JJ.map(n=>this.J[n].rotation.clone()); const busyR=s.cooking||s.throwT>0||s.knifeT>0||s.dead>0||!!s.takedownKnife||(s.takedown>=0&&s.takedown!==undefined), busyL=busyR||s.reload>0||(s.vault>=0&&s.vault<1)||s.slide>0||(s.sprint&&!s.aim);
    this.ikR=damp(this.ikR??1,busyR?0:1,12,dt); this.ikL=damp(this.ikL??1,busyL?0:1,10,dt); if(this.ikR<0.01&&this.ikL<0.01)return;
    this.root.updateMatrixWorld(true); const J=this.J, P=(g,sd)=>{ const v=this.anchor.localToWorld(g.clone()); const f=this.anchor.localToWorld(new THREE.Vector3(0,0,1)).sub(this.anchor.getWorldPosition(new THREE.Vector3())); return v; };
    const down=this.anchor.localToWorld(new THREE.Vector3(0,-1,0)).sub(this.anchor.getWorldPosition(new THREE.Vector3())).normalize();
    // wrist targets: palm sits ~7cm past the wrist, so pull the wrist back up along the gun's down axis
    const tR=P(this.gripR), tL=P(this.gripL);
    const pd=this.model.userData.palmD; if(!pd){ armIK(J.shoulderR,J.elbowR,J.handR,tR,this.ikR,down); armIK(J.shoulderL,J.elbowL,J.handL,tL,this.ikL,down); return; }
    // per-model palm calibration: steer the wrist so this model's palm centre lands where the reference soldier's palm does
    for(const [sd,t,w] of [['R',tR,this.ikR],['L',tL,this.ikL]]){ const H=J['hand'+sd], d=pd[sd]; const t2=t.clone();
      for(let it=0;it<2;it++){ H.getWorldQuaternion(_q1); const c=_v4.set(d[0],d[1],d[2]).applyQuaternion(_q1).multiplyScalar(this.root.scale.x); armIK(J['shoulder'+sd],J['elbow'+sd],H,t2.copy(t).sub(c).addScaledVector(down,this.model.userData.gripDn||0.035),it?1:w,down); } } }
}
// ---------------- data ----------------
export const WEAPONS={
  pistol:{name:'M9 PISTOL',dmg:30,rpm:320,mag:12,rel:1.1,spread:.014,range:70,auto:false,price:0,kick:.012},
  smg:{name:'VX-9 SMG',dmg:19,rpm:850,mag:30,rel:1.6,spread:.024,range:55,auto:true,price:900,quiet:true,kick:.006},
  rifle:{name:'AR-7 RIFLE',dmg:31,rpm:620,mag:30,rel:2.0,spread:.018,range:120,auto:true,price:2000,kick:.012},
  shotgun:{name:'BREACHER 12',dmg:15,pellets:9,rpm:80,mag:6,rel:2.4,spread:.085,range:30,auto:false,price:2800,kick:.05},
  sniper:{name:'HAWK SNIPER',dmg:170,rpm:45,mag:5,rel:2.6,spread:.0015,range:250,auto:false,price:4200,scope:true,kick:.06},
  lmg:{name:'TITAN LMG',dmg:27,rpm:760,mag:100,rel:3.8,spread:.04,range:110,auto:true,price:6500,kick:.01},
  launcher:{name:'RPG-X',dmg:260,rpm:50,mag:1,rel:2.4,spread:.004,range:200,auto:false,price:8500,rocket:true,kick:.08},
  deagle:{name:'DESERT .50',dmg:62,rpm:220,mag:7,rel:1.4,spread:.016,range:80,auto:false,price:1800,kick:.03},
  ak:{name:'KV-47 ASSAULT',dmg:36,rpm:600,mag:30,rel:2.2,spread:.021,range:120,auto:true,price:3400,kick:.015},
  pump:{name:'PUMP 870',dmg:19,pellets:10,rpm:70,mag:7,rel:2.8,spread:.07,range:32,auto:false,price:3800,kick:.055},
  m60:{name:'BULLDOG M60',dmg:34,rpm:580,mag:100,rel:4.2,spread:.036,range:120,auto:true,price:7800,kick:.013},
  m82:{name:'VANGUARD .50',dmg:280,rpm:38,mag:5,rel:3.0,spread:.001,range:300,auto:false,price:9800,scope:true,kick:.08},
  m32:{name:'M32 MGL',dmg:200,rpm:110,mag:6,rel:3.6,spread:.006,range:120,auto:false,price:11500,rocket:true,gl:true,kick:.05},
  goldrifle:{name:'GOLDEN EAGLE',dmg:50,rpm:720,mag:40,rel:1.5,spread:.011,range:150,auto:true,price:16000,kick:.009},
};
const WORDER=['pistol','smg','deagle','rifle','shotgun','ak','pump','sniper','lmg','m60','launcher','m82','m32','goldrifle'];
const PISTOLS=new Set(['pistol','deagle']);
// attachments: slot -> options; per-weapon mount points (gun space: x,y,z; +z = forward)
const ATTS={optic:[{id:'rdot',name:'RED DOT',price:600,d:'-20% aim spread'},{id:'scope',name:'4X SCOPE',price:1200,d:'Zoom scope'}],
  muzzle:[{id:'supp',name:'SUPPRESSOR',price:900,d:'Quiet shots, -8% dmg'}],
  mag:[{id:'xmag',name:'EXT. MAG',price:800,d:'+50% mag, slower reload'}],
  under:[{id:'vgrip',name:'VERT. GRIP',price:700,d:'-30% recoil, -15% spread'}]};
const SLOTNAME={optic:'OPTIC',muzzle:'MUZZLE',mag:'MAGAZINE',under:'UNDERBARREL'};
const MOUNT={pistol:{optic:[0,.073,.045],muzzle:1,mag:[0,-.096,-.065]}, deagle:{optic:[0,.101,.06],muzzle:1,mag:[0,-.09,-.065]},
  smg:{muzzle:0,mag:[0,-.18,.032]}, rifle:{muzzle:0,mag:[0,-.2,.037]}, shotgun:{optic:[0,.095,0]}, ak:{optic:[0,.098,.035],muzzle:1,mag:[0,-.17,.147],under:[0,.028,.28]},
  pump:{optic:[0,.089,.035]}, sniper:{muzzle:1,mag:[0,-.045,.06],under:[0,0,.18]}, lmg:{mag:[0,-.12,.1],under:[0,.03,.36]}, m60:{optic:[0,.116,.03],muzzle:1,mag:[-.07,-.075,.06],under:[0,.018,.32]},
  launcher:{}, m82:{muzzle:1,mag:[0,-.058,.06],under:[0,.01,.16]}, m32:{optic:[0,.139,.14]}, goldrifle:{muzzle:1,mag:[0,-.185,.152],under:[0,.028,.27]}};
const attEq=w=>((save.att||{})[w]||{});
const attOwn=(w,id)=>((save.attOwn||{})[w]||[]).includes(id);
const DEF={money:300,unlocked:1,stars:{},owned:['pistol','smg'],up:{},primary:'smg',nades:0,armor:0,seenIntro:false,q:-1,best:{}};
let save=Object.assign({},DEF,JSON.parse(JSON.stringify(SDK.loadData('sfz_save')||{})));
function persist(){ SDK.saveData('sfz_save',save); }
const upLvl=(w,k)=>((save.up[w]||{})[k]||0);
function wstat(w){ const b=WEAPONS[w]; const s={...b,dmg:b.dmg*(1+0.15*upLvl(w,'dmg')),mag:Math.round(b.mag*(1+0.25*upLvl(w,'mag'))),rel:b.rel*(1-0.13*upLvl(w,'rel'))}; const a=attEq(w);
  if(a.optic==='rdot'){ s.spread*=0.8; s.optic='rdot'; } if(a.optic==='scope'){ s.scope=true; s.spread*=0.7; } if(a.muzzle==='supp'){ s.quiet=true; s.supp=true; s.dmg*=0.92; } if(a.mag==='xmag'){ s.mag=Math.round(s.mag*1.5); s.rel*=1.12; } if(a.under==='vgrip'){ s.kick*=0.7; s.spread*=0.85; } return s; }
// ---------------- game state ----------------
const G={state:'boot',mi:0,time:0,ts:1,slowT:0,shake:0,kills:0,heads:0,shots:0,hits:0,streak:0,streakT:0,earned:0,wave:0,bossRef:null,objDone:false};
const world=new World(scene,null);
const input={mx:0,my:0,fire:false,aim:false,sprint:false,crouchP:false,rollP:false,reloadP:false,knifeP:false,coverP:false,nade:false,swapP:false,useHeld:false,lookX:0,lookY:0};
const keys={};
let P=null; const enemies=[]; const nades=[]; const rockets=[];
const V1=new THREE.Vector3(),V2=new THREE.Vector3(),V3=new THREE.Vector3();
class Player{
  constructor(){ const op=OPS.find(o=>o.id===save.op)||OPS[0]; this.rig=new Rig('soldier',1,op.m); this.rig.isP=true; scene.add(this.rig.root); this.pos=new THREE.Vector3(0,0,-world.H+6); this.vel=new THREE.Vector3(); this.yaw=0; this.camYaw=0; this.camPitch=0.05;
    this.maxHp=100; this.hp=100; this.maxArmor=50+save.armor*25; this.armor=this.maxArmor; this.nades=3+save.nades; this.alive=true;
    this.slots=[G.trialNow||save.primary,'pistol']; this.cur=0; this.ammo={}; for(const w of new Set(this.slots)){ const s=wstat(w); this.ammo[w]={mag:s.mag,res:w==='pistol'?9999:s.mag*4}; }
    this.fireCd=0; this.reload=0; this.roll=-1; this.slide=0; this.vault=-1; this.knifeT=0; this.throwT=0; this.cooking=0; this.crouch=false; this.cr=0; this.phase=0; this.cover=null; this.aimK=0; this.recoil=0; this.spreadK=0; this.hit=0; this.inv=0; this.takedown=null; this.dead=0; this.stepT=0; this.vaultFrom=new THREE.Vector3(); this.vaultTo=new THREE.Vector3(); this.rollDir=new THREE.Vector3();
    this.rig.setWeapon(this.w); }
  get w(){ return this.slots[this.cur]; }
  get st(){ return wstat(this.w); }
  busy(){ return this.roll>=0||this.vault>=0||this.takedown||this.slide>0; }
  fwd(v){ return v.set(Math.sin(this.camYaw),0,Math.cos(this.camYaw)); }
  update(dt){ const r=this.rig; if(!this.alive){ this.dead+=dt; r.pose({dead:this.dead,deadDir:1},dt); return; }
    this.fireCd-=dt; this.inv-=dt; this.hit=Math.max(0,this.hit-dt*4); this.recoil=damp(this.recoil,0,10,dt); if(this.aimK>0.6){ const sw=(this.st&&this.st.scope?1:.35)*(this.cr>0.5?.45:1)*(Math.hypot(this.vel.x,this.vel.z)>1?2:1); this.camYaw+=Math.cos(G.time*1.3)*dt*.012*sw; this.camPitch+=Math.sin(G.time*2.1)*dt*.009*sw; } this.spreadK=damp(this.spreadK,0,6,dt);
    if(this.takedown){ this.updTakedown(dt); return; }
    const F=this.fwd(V1), Rt=V2.set(-Math.cos(this.camYaw),0,Math.sin(this.camYaw));
    let ix=input.mx, iy=input.my; const il=Math.hypot(ix,iy); if(il>1){ix/=il;iy/=il;}
    const aiming=input.aim&&!this.busy(); this.aimK=damp(this.aimK,aiming?1:0,12,dt);
    let sprint=(input.sprint||il>0.97&&TOUCH)&&iy>0.3&&!aiming&&!input.fire&&this.reload<=0&&!this.cooking;
    // actions
    if(input.rollP&&!this.busy()){ const ob=world.findLow(this.pos,il>0.1?V3.copy(F).multiplyScalar(iy).addScaledVector(Rt,ix).normalize():V3.set(Math.sin(this.yaw),0,Math.cos(this.yaw)));
      if(ob){ this.startVault(ob); } else { this.roll=0; this.inv=0.45; this.rollDir.copy(il>0.1?V3.copy(F).multiplyScalar(iy).addScaledVector(Rt,ix).normalize():V3.set(Math.sin(this.yaw),0,Math.cos(this.yaw))); this.yaw=Math.atan2(this.rollDir.x,this.rollDir.z); A.whoosh(); this.cover=null; } }
    if(input.crouchP){ if(sprint&&!this.busy()){ this.slide=0.75; this.slideDir=new THREE.Vector3(Math.sin(this.yaw),0,Math.cos(this.yaw)); A.whoosh(); fx.dust(this.pos); } else this.crouch=!this.crouch; }
    if(input.coverP){ if(this.cover){ this.cover=null; } else this.enterCover(); }
    if(input.knifeP&&!this.busy()&&this.knifeT<=0) this.melee();
    if(input.swapP&&!this.busy()){ this.cur=1-this.cur; this.reload=0; r.setWeapon(this.w); A.reload(0); hud.weapon(); }
    if(input.reloadP) this.startReload();
    // grenade cook/throw
    if(input.nade&&!this.cooking&&this.nades>0&&!this.busy()&&this.throwT<=0){ this.cooking=0.001; A.pin(); }
    if(this.cooking){ this.cooking+=dt; if(Math.floor(this.cooking*2)!==Math.floor((this.cooking-dt)*2))A.tick(); if(this.cooking>3.5){ this.nades--; explode(this.pos.clone().setY(1),1,'player'); this.cooking=0; } else if(!input.nade){ this.throwNade(); } }
    if(this.throwT>0)this.throwT+=dt; if(this.throwT>0.7)this.throwT=0;
    // movement
    let speed=sprint?6.8:this.crouch||this.cover?2.2:aiming?2.8:4.2; if(this.cooking)speed*=0.8;
    const mv=V3.copy(F).multiplyScalar(iy).addScaledVector(Rt,ix);
    if(this.roll>=0){ this.roll+=dt/0.6; mv.copy(this.rollDir).multiplyScalar(6.5*(1-this.roll*0.5)); if(this.roll>=1)this.roll=-1; }
    else if(this.vault>=0){ this.vault+=dt/0.55; const t=Math.min(1,this.vault); this.pos.lerpVectors(this.vaultFrom,this.vaultTo,t); this.pos.y=Math.sin(t*Math.PI)*1.1; if(this.vault>=1){this.vault=-1;this.pos.y=0;} mv.set(0,0,0); }
    else if(this.slide>0){ this.slide-=dt; mv.copy(this.slideDir).multiplyScalar(8*Math.min(1,this.slide*1.6+0.3)); if(this.slide<=0){this.crouch=true;} }
    else mv.multiplyScalar(speed);
    if(this.cover){ const c=this.cover; const n=V1.set(c.nx,0,c.nz); const dn=mv.dot(n); if(dn>0.5){ this.cover=null; } else { mv.addScaledVector(n,-dn); } }
    if(this.vault<0){ this.vel.x=damp(this.vel.x,mv.x,this.roll>=0||this.slide>0?30:12,dt); this.vel.z=damp(this.vel.z,mv.z,this.roll>=0||this.slide>0?30:12,dt); this.pos.addScaledVector(this.vel,dt); world.collide(this.pos,0.4); }
    const hs=Math.hypot(this.vel.x,this.vel.z); this.phase+=dt*hs*(sprint?1.5:1.9); this.stepT-=dt*hs; if(this.stepT<0){ this.stepT=sprint?2.4:2.0; A.step(sprint); }
    const wantCr=(this.crouch||(this.cover&&!(aiming||input.fire)))&&this.slide<=0; this.cr=damp(this.cr,wantCr?1:0,10,dt); if(sprint)this.crouch=false;
    // facing
    const face=aiming||input.fire||this.cooking||this.cover&&(aiming||input.fire); let ty=this.yaw;
    if(face||hs<0.3&&this.knifeT>0) ty=this.camYaw; else if(hs>0.5&&this.roll<0&&this.slide<=0) ty=Math.atan2(this.vel.x,this.vel.z); if(this.roll<0&&this.slide<=0&&this.vault<0) this.yaw+=angDiff(this.yaw,ty)*Math.min(1,dt*(face?20:10));
    // reload
    if(this.magT>0&&this.reload>0){ this.magT-=dt; if(this.magT<=0) fx.magDrop(V1.set(this.pos.x+Math.cos(this.yaw)*.25,1.0,this.pos.z-Math.sin(this.yaw)*.25),this.yaw); }
    if((sprint&&Math.random()<dt*7)||(this.roll>=0&&Math.random()<dt*25)||(this.slide>0&&Math.random()<dt*30)) fx.dustKick(this.pos,this.slide>0?3:2,this.slide>0||this.roll>=0?1.2:.8);
    if(this.reload>0){ this.reload-=dt; const st=this.st; if(this.reload<=0){ const a=this.ammo[this.w]; const need=st.mag-a.mag, take=Math.min(need,a.res); a.mag+=take; if(this.w!=='pistol')a.res-=take; A.reload(1); hud.weapon(); } }
    // fire
    if(input.fire&&!this.busy()&&this.knifeT<=0&&!this.cooking&&!(sprint&&!aiming)) this.tryFire();
    if(this.knifeT>0){ this.knifeT+=dt; if(this.knifeT>0.75)this.knifeT=0; }
    r.root.position.copy(this.pos); r.root.rotation.y=this.yaw;
    r.pose({recoil:this.recoil*30,phase:this.phase,move:Math.min(1,hs/4.2),sprint,crouch:this.cr,aim:this.aimK,pitch:face?this.camPitch:0,reload:this.reload>0?1-this.reload/this.st.rel:0,cooking:this.cooking>0,throwT:this.throwT,knifeT:this.knifeT,roll:this.roll,slide:this.slide,vault:this.vault,hit:this.hit,hitSide:this.hitSide||1,wname:this.w},dt);
    // pickups & objectives
    for(const pk of world.pickups){ if(!pk.alive)continue; pk.o.rotation.y+=dt*2; pk.o.position.y=0.15+Math.sin(G.time*3)*0.1; if(pk.o.position.distanceTo(V1.copy(this.pos).setY(pk.o.position.y))<1.3) this.pickup(pk); }
  }
  pickup(pk){ if(pk.type==='medkit'){ if(this.hp>=this.maxHp)return; this.hp=Math.min(this.maxHp,this.hp+50); hud.pop('+50 HEALTH','#5f5'); } else if(pk.type==='armorpk'){ if(this.armor>=this.maxArmor)return; this.armor=this.maxArmor; hud.pop('ARMOR RESTORED','#6af'); } else { for(const w in this.ammo){ const s=wstat(w); this.ammo[w].res=Math.min(s.mag*8,this.ammo[w].res+s.mag*2);} this.nades=Math.min(this.nades+1,6+save.nades); hud.pop('+AMMO +1 GRENADE','#fc4'); }
    pk.alive=false; pk.o.visible=false; A.buy(); hud.weapon(); }
  startVault(ob){ const cx=(ob.minX+ob.maxX)/2, cz=(ob.minZ+ob.maxZ)/2; const ex=ob.maxX-ob.minX, ez=ob.maxZ-ob.minZ; this.vaultFrom.copy(this.pos);
    if(ex<ez){ const s=Math.sign(this.pos.x-cx)||1; this.vaultTo.set(cx-s*(ex/2+0.6),0,this.pos.z); } else { const s=Math.sign(this.pos.z-cz)||1; this.vaultTo.set(this.pos.x,0,cz-s*(ez/2+0.6)); }
    this.vault=0; this.yaw=Math.atan2(this.vaultTo.x-this.pos.x,this.vaultTo.z-this.pos.z); this.cover=null; A.whoosh(); this.vel.set(0,0,0); }
  enterCover(){ let best=null,bd=2.2; for(const c of world.covers){ if(c.ob.dead)continue; const d=Math.hypot(c.x-this.pos.x,c.z-this.pos.z); if(d<bd){bd=d;best=c;} } if(!best){ hud.pop('NO COVER NEARBY','#aaa'); return; }
    this.cover=best; const ob=best.ob; const px=clamp(this.pos.x,ob.minX,ob.maxX), pz=clamp(this.pos.z,ob.minZ,ob.maxZ); this.pos.set(px+best.nx*0.0,0,pz+best.nz*0.0); world.collide(this.pos,0.45); A.step(true); hud.pop(best.low?'IN COVER · AIM TO PEEK':'IN COVER','#9cf'); }
  startReload(){ const a=this.ammo[this.w], st=this.st; if(this.reload>0||a.mag>=st.mag||a.res<=0||this.busy())return; this.reload=st.rel; A.reload(0); this.magT=st.rel*.3; }
  tryFire(){ const st=this.st, a=this.ammo[this.w]; if(this.fireCd>0||this.reload>0)return; if(a.mag<=0){ this.fireCd=0.25; A.dry(); this.startReload(); return; }
    this.fireCd=60/st.rpm; if(!st.auto) input.fire=TOUCH?input.fire:false; a.mag--; G.shots++; this.cover&&0;
    const m=this.rig.muzzle.getWorldPosition(V1); const cam=camera.position.clone(); const dir=new THREE.Vector3(); camera.getWorldDirection(dir);
    if(TOUCH) aimAssist(dir,cam);
    const spread=st.spread*(1-0.6*this.aimK)*(1+this.spreadK*3)*(this.cr>0.5?0.7:1)*(Math.hypot(this.vel.x,this.vel.z)>1?1.6:1);
    if(st.rocket){ const d=dir.clone(); const hitp=castShot(cam,d,st.range,true).p; const rd=hitp.clone().sub(m).normalize(); if(st.gl){ const dd=hitp.distanceTo(m); rd.y+=6*dd/(2*900); rd.normalize(); } rockets.push({p:m.clone(),v:rd.multiplyScalar(st.gl?30:38),t:0,owner:'player',g:st.gl?6:0,s:st.gl?1.05:1.4,dmg:st.dmg}); }
    else for(let i=0;i<(st.pellets||1);i++){ const d=dir.clone(); d.x+=(Math.random()-.5)*2*spread; d.y+=(Math.random()-.5)*2*spread; d.z+=(Math.random()-.5)*2*spread; d.normalize();
      const h=castShot(cam,d,Math.max(st.range*2.2,140),false); if(window.__shotlog)window.__shotlog.push([+(h.t||0).toFixed(1),h.enemy?'E':h.ob?'O':h.ground?'G':'-',h.ob&&h.ob.h]); const fall=h.t>st.range?Math.max(.45,1-(h.t-st.range)/(st.range*2)):1; fx.tracer(m,h.p,this.w==='goldrifle'?[1,.85,.2]:[1,.75,.35]); if(h.enemy) h.enemy.damage(st.dmg*fall*(h.head?2.2:1),h.head,d,'player',this.w); else if(h.ob){ fx.sparks(h.p,6,h.n); fx.decal(h.p,h.n); if(Math.random()<.3)A.ric(); damageObstacle(h.ob,st.dmg); } else if(h.ground){ fx.dust(h.p,world.T?[0.6,.55,.45]:undefined); fx.sparks(h.p,3,h.n,[.9,.8,.6]); } }
    fx.muzzle(m,dir,(st.pellets?1.5:this.w==='sniper'||this.w==='m82'?1.6:1)*(st.supp?0.35:1),true); fx.casing(m,V2.set(-Math.cos(this.yaw),0,Math.sin(this.yaw)).multiplyScalar(-1)); if(Math.random()<.4)setTimeout(()=>A.casing(),300);
    A.shot(st.supp?'supp':this.w); this.recoil+=st.kick; this.spreadK=Math.min(1,this.spreadK+0.15); this.camPitch+=st.kick*(0.7+Math.random()*0.5); this.camYaw+=(Math.random()-.5)*st.kick*0.6; G.shake=Math.max(G.shake,st.kick*2);
    if(!st.quiet) alertNoise(this.pos,40); else alertNoise(this.pos,10); hud.weapon(); hud.cross(); }
  throwNade(){ const d=new THREE.Vector3(); camera.getWorldDirection(d); const p=this.pos.clone().setY(1.8); const v=nadeVel(d); nades.push(new Nade(p,v,3.5-this.cooking,'player')); this.cooking=0; this.throwT=0.01; this.nades--; A.whoosh(); hud.weapon(); }
  melee(){ this.knifeT=0.01; A.knife(); // takedown check
    let best=null,bd=2.2; for(const e of enemies){ if(e.dead)continue; const d=e.pos.distanceTo(this.pos); if(d<bd){bd=d;best=e;} }
    if(best){ const toP=Math.atan2(this.pos.x-best.pos.x,this.pos.z-best.pos.z); const behind=Math.abs(angDiff(best.yaw,toP))>1.9;
      if((behind||best.state!=='combat')&&best.type!=='boss'){ this.knifeT=0; this.startTakedown(best); return; }
      setTimeout(()=>{ if(!best.dead&&best.pos.distanceTo(this.pos)<2.4){ best.damage(best.type==='boss'?80:65,false,V1.subVectors(best.pos,this.pos).normalize(),'player','knife'); } },250); } }
  startTakedown(e){ this.takedown={e,t:0}; e.takenDown=true; e.state='takedown'; this.yaw=Math.atan2(e.pos.x-this.pos.x,e.pos.z-this.pos.z); e.yaw=this.yaw; const back=V1.set(Math.sin(this.yaw),0,Math.cos(this.yaw)); this.pos.copy(e.pos).addScaledVector(back,-0.75); this.cover=null; slowmo(0.9,0.45); hud.pop('SILENT TAKEDOWN','#fff'); }
  updTakedown(dt){ const td=this.takedown; td.t+=dt; const t=td.t, r=this.rig;
    r.root.position.copy(this.pos); r.root.rotation.y=this.yaw;
    r.pose({crouch:0.4,knifeT:t>0.35?clamp((t-0.35)*1.2,0.01,0.7):0,takedownKnife:true,pitch:-0.1},dt);
    // arm wrap: left arm around enemy neck
    r.rot('shoulderL',-1.7,0,-0.9,20,dt); r.rot('elbowL',-1.6,0,0,20,dt);
    if(t>0.55&&!td.k){ td.k=1; A.knife(); fx.hitFx(V1.copy(td.e.pos).setY(1.4),V2.set(0,0,1),false); td.e.damage(9999,false,V2.set(Math.sin(this.yaw),0,Math.cos(this.yaw)),'player','takedown'); }
    if(t>1.1){ this.takedown=null; } }
  damage(d,from){ if(!this.alive||this.inv>0&&from!=='self')return; if(this.inv>0)return; let dd=d; if(this.armor>0){ const ab=Math.min(this.armor,dd*0.65); this.armor-=ab; dd-=ab; } this.hp-=dd; this.hit=1; A.hurt(); hud.dmg(from); G.shake=Math.max(G.shake,0.25); G.streak=0;
    if(this.hp<=0){ this.hp=0; this.alive=false; this.dead=0; gameOver(); } }
}
function nadeVel(d){ return new THREE.Vector3(d.x,Math.max(d.y,-0.3)+0.45,d.z).normalize().multiplyScalar(17); }
class Nade{ constructor(p,v,fuse,owner){ this.p=p; this.v=v; this.fuse=fuse; this.owner=owner; this.m=lib.weapons.grenade.clone(); this.m.position.copy(p); scene.add(this.m); this.bounce=0; }
  update(dt){ this.fuse-=dt; this.v.y-=16*dt; const np=V1.copy(this.p).addScaledVector(this.v,dt);
    if(np.y<0.05){ np.y=0.05; this.v.y*=-0.35; this.v.x*=0.6; this.v.z*=0.6; if(Math.abs(this.v.y)>1)A.casing(); }
    for(const o of world.obs){ if(o.dead||np.y>o.h)continue; if(np.x>o.minX&&np.x<o.maxX&&np.z>o.minZ&&np.z<o.maxZ){ if(this.p.x<=o.minX||this.p.x>=o.maxX){ this.v.x*=-0.5; np.x=this.p.x; } else if(this.p.z<=o.minZ||this.p.z>=o.maxZ){ this.v.z*=-0.5; np.z=this.p.z; } else { this.v.y=Math.abs(this.v.y)*0.3; np.y=o.h+0.05; } } }
    this.p.copy(np); this.m.position.copy(np); this.m.rotation.x+=dt*8; this.m.rotation.z+=dt*5;
    if(this.fuse<=0){ scene.remove(this.m); explode(this.p,1,this.owner); return false; } return true; } }
// arc preview
const arcPts=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(40*3),3)),new THREE.PointsMaterial({color:0xffe080,size:0.12,transparent:true,opacity:.9,depthWrite:false})); arcPts.frustumCulled=false; arcPts.visible=false; scene.add(arcPts);
const arcRing=new THREE.Mesh(new THREE.RingGeometry(5.6,6,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xff6030,transparent:true,opacity:.5,depthWrite:false})); arcRing.visible=false; scene.add(arcRing);
function updArc(){ if(!P||!P.cooking){ arcPts.visible=arcRing.visible=false; return; } const d=new THREE.Vector3(); camera.getWorldDirection(d); const v=nadeVel(d), p=P.pos.clone().setY(1.8); const a=arcPts.geometry.attributes.position; let last=p.clone();
  for(let i=0;i<40;i++){ for(let s=0;s<2;s++){ v.y-=16*0.03; p.addScaledVector(v,0.03); if(p.y<0.05){p.y=0.05; v.y*=-0.35; v.x*=.6; v.z*=.6;} } a.setXYZ(i,p.x,p.y,p.z); last.copy(p); } a.needsUpdate=true; arcPts.visible=true; arcRing.visible=true; arcRing.position.set(last.x,0.06,last.z); arcRing.material.opacity=0.3+0.3*Math.sin(G.time*10); }
function castShot(o,d,range,ignoreEnemies){ let best={t:range,p:o.clone().addScaledVector(d,range)}; const h=world.ray(o,d,range);
  // skip obstacles between camera and player
  if(h){ best={t:h.t,ob:h.ob,n:h.n,ground:h.ground,p:o.clone().addScaledVector(d,h.t)}; if(h.t<V1.copy(P.pos).sub(o).length()+1.2&&h.ob){ const o2=o.clone().addScaledVector(d,h.t+0.05); const r2=castShot(o2,d,range-h.t,ignoreEnemies); return r2; } }
  if(!ignoreEnemies) for(const e of enemies){ if(e.dead)continue; const r=e.hitTest(o,d,best.t); if(r){ best={t:r.t,enemy:e,head:r.head,p:o.clone().addScaledVector(d,r.t)}; } }
  if(ignoreEnemies) for(const e of enemies){ if(e.dead)continue; const r=e.hitTest(o,d,best.t); if(r) best={t:r.t,p:o.clone().addScaledVector(d,r.t)}; }
  return best; }
function aimAssist(dir,cam){ let best=null,ba=0.07; for(const e of enemies){ if(e.dead)continue; const t=V2.copy(e.pos).setY((e.y||0)+1.3*e.scale).sub(cam); const dist=t.length(); if(dist>60)continue; t.normalize(); const a=Math.acos(clamp(t.dot(dir),-1,1)); if(a<ba&&world.los(cam,V3.copy(e.pos).setY((e.y||0)+1.3*e.scale))){ba=a;best=t.clone();} } if(best) dir.lerp(best,0.6).normalize(); }
const WMC=new Map(); function wreck(ob,crush=0){ const o=ob.obj; o.traverse(m=>{ if(!m.isMesh)return; if(!WMC.has(m.material)){ const n=m.material.clone(); if(n.color)n.color.multiplyScalar(0.13).lerp(new THREE.Color(0x1a1612),.3); if(n.emissive){ n.emissive.set(0x000000); n.emissiveIntensity=0; } n.roughness=1; n.metalness=.1; WMC.set(m.material,n); } m.material=WMC.get(m.material); });
  if(crush){ o.scale.y*=1-crush; o.rotation.z+=(Math.random()-.5)*crush*.6; o.rotation.x+=(Math.random()-.5)*crush*.4; ob.h*=1-crush; } o.visible=true; }
function damageObstacle(ob,d){ if(ob.explosive&&!ob.dead){ ob.hp-=d; if(ob.hp<=0){ ob.dead=true; ob.obj.visible=false; explode(new THREE.Vector3((ob.minX+ob.maxX)/2,0.6,(ob.minZ+ob.maxZ)/2),1.3,'player'); fx.fire(new THREE.Vector3((ob.minX+ob.maxX)/2,0.1,(ob.minZ+ob.maxZ)/2),9,.7); } }
  if(ob.tank&&!ob.dead){ ob.hp-=d*(d>100?1:0.15); hud.boss(ob.hp/ob.maxHp,'ARMORED TANK'); if(ob.hp<=0){ ob.dead=true; const c=new THREE.Vector3((ob.minX+ob.maxX)/2,1,(ob.minZ+ob.maxZ)/2); explode(c,2.5,'player'); fx.fire(c.clone().setY(1.4),40,1.5); setTimeout(()=>explode(c.clone().add(new THREE.Vector3(1.5,1,0)),1.5,'player'),250); wreck(ob,.08); G.objDone=true; hud.boss(-1); slowmo(1.5,0.25); objectiveCheck(); } } }
function explode(p,s,owner){ fx.explosion(p,s); G.dirt=Math.max(G.dirt||0,clamp(1.2-p.distanceTo(P.pos)/30,0,1)*s); A.boom(p.distanceTo(P.pos)); G.shake=Math.max(G.shake,clamp(1.6-p.distanceTo(P.pos)/20,0.1,1.5)*s); G.flash=Math.max(G.flash||0,clamp(0.12-p.distanceTo(P.pos)/150,0,0.12)); const R=6*s;
  for(const e of enemies){ if(e.dead)continue; const d=e.pos.distanceTo(p); if(d<R&&world.los(V1.copy(p).setY(p.y+0.5),V2.copy(e.pos).setY((e.y||0)+1))) e.damage(200*s*(1-d/R)+30,false,V3.subVectors(e.pos,p).normalize(),owner,'explosive'); }
  const dp=P.pos.distanceTo(p); if(dp<R&&world.los(V1.copy(p).setY(p.y+0.5),V2.copy(P.pos).setY(1))) P.damage((owner==='player'?60:45)*s*(1-dp/R)+10,'explosion');
  for(const o of world.obs){ if(o.dead)continue; const c=V1.set((o.minX+o.maxX)/2,0.5,(o.minZ+o.maxZ)/2); const d=c.distanceTo(p); if(d<R+1){ if(o.explosive) setTimeout(()=>damageObstacle(o,99),120+Math.random()*150); if(o.tank) damageObstacle(o,260*s*(1-d/(R+3))); } }
  alertNoise(p,50); }
function alertNoise(p,r){ for(const e of enemies){ if(e.dead||e.state==='takedown')continue; if(e.pos.distanceTo(p)<r){ e.alert(P.pos); } } }
// ---------------- enemies ----------------
const ETYPE={grunt:{kind:'enemy',model:['ai_rifle','ai_insurg','ai_militant','ai_insurg','enemy','enemy2','enemy3'],hp:90,w:'rifle',acc:.32,dmg:7,burst:[3,5],rof:.13,speed:3.8,scale:1},
  elite:{kind:'elite',model:'ai_officer',hp:170,w:'smg',acc:.36,dmg:6,burst:[5,8],rof:.08,speed:4.4,scale:1.02},
  sniper:{kind:'enemy',model:'ai_sniper',hp:80,w:'sniper',acc:.6,dmg:38,burst:[1,1],rof:1,speed:0,scale:1},
  breacher:{kind:'enemy',model:['ai_militant','ai_rifle'],hp:110,w:'shotgun',acc:.55,dmg:16,burst:[1,2],rof:.75,speed:5.0,scale:.98,rush:true},
  heavy:{kind:'elite',model:'ai_heavy',hp:320,w:'lmg',acc:.26,dmg:6,burst:[9,15],rof:.085,speed:2.4,scale:1.12,heavy:true},
  boss:{kind:'boss',hp:900,w:'lmg',acc:.3,dmg:8,burst:[10,18],rof:.09,speed:2.6,scale:1.25}};
class Enemy{
  constructor(type,pos,opt={}){ const T=ETYPE[type]; this.type=type; this.T=T; this.scale=T.scale; this.rig=new Rig(T.kind,T.scale,T.model); this.rig.setWeapon(T.w); scene.add(this.rig.root);
    this.pos=pos.clone(); this.yaw=Math.random()*6; this.hp=opt.hp||T.hp; this.maxHp=this.hp; this.state='patrol'; this.sus=0; this.losT=Math.random()*.3; this.see=false; this.target=null; this.wait=Math.random()*2; this.phase=Math.random()*6;
    this.cover=null; this.coverT=0; this.peek=false; this.burst=0; this.fireCd=1+Math.random(); this.last=new THREE.Vector3(); this.dead=false; this.deadT=0; this.hit=0; this.crouch=0; this.vel=new THREE.Vector3(); this.y=opt.y||0; this.name=opt.name; this.nadeCd=6; this.summon=[0.66,0.33];
    if(type==='sniper'){ this.laser=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3)),new THREE.LineBasicMaterial({color:0xff2020,transparent:true,opacity:.6,blending:THREE.AdditiveBlending})); this.laser.frustumCulled=false; scene.add(this.laser); this.aimT=0; }
    if(opt.alert) this.alert(P.pos); }
  hitTest(o,d,maxT){ const s=this.scale, by=this.y, cr=this.crouch*0.3; // head sphere + body capsule
    const hc=V3.set(this.pos.x,by+(1.74-cr)*s,this.pos.z); let t=raySphere(o,d,hc,0.17*s); if(t!==null&&t<maxT) return {t,head:true};
    // body: vertical segment approx with 3 spheres
    let best=null; for(const y of [0.45,0.95,1.38]){ const c=V3.set(this.pos.x,by+(y-cr*(y/1.4))*s,this.pos.z); const tt=raySphere(o,d,c,(y>1?0.3:0.26)*s); if(tt!==null&&tt<maxT&&(best===null||tt<best))best=tt; } return best!==null?{t:best,head:false}:null; }
  alert(p){ if(this.dead)return; if(this.state!=='combat'){ this.state='combat'; this.react=0.35+Math.random()*0.4; this.cover=null; if(this.icon)this.icon=1; } this.last.copy(p); this.sus=1; }
  damage(d,head,dir,src,wpn){ if(this.dead)return; this.hp-=d; this.hit=1; this.hitSide=(Math.cos(this.yaw)*dir.x-Math.sin(this.yaw)*dir.z)>0?1:-1; fx.hitFx(V1.copy(this.pos).setY(this.y+(head?1.74:1.2)*this.scale),dir,this.type==='boss'||this.type==='elite'); if(src==='player'){ G.hits++; hud.hitmark(head,this.hp<=0); A.hit(head); if(this.state!=='combat')this.alert(P.pos); this.last.copy(P.pos); }
    if(this.type==='boss'){ const fr=this.hp/this.maxHp;
      if(fr<.66&&!this.ph1&&this.hp>0){ this.ph1=1; this.T={...this.T,speed:this.T.speed*1.4,rof:this.T.rof*.75,acc:this.T.acc*1.15}; hud.pop(this.name+' IS ENRAGED!','#ff4a3a'); fx.dustKick(this.pos.clone(),14,1.6); G.shake=Math.max(G.shake,.5); A.slowmo(); this.rageT=1.2; }
      if(fr<.33&&!this.ph2&&this.hp>0){ this.ph2=1; hud.pop('INCOMING BARRAGE!','#ffb030'); for(let i=0;i<5;i++){ const a=i/5*6.28, tp=P.pos.clone().add(new THREE.Vector3(Math.cos(a)*(3+Math.random()*3),0,Math.sin(a)*(3+Math.random()*3))); const v=tp.sub(this.pos).setY(0); const fl=v.length()/14; v.normalize().multiplyScalar(14); v.y=fl*8; setTimeout(()=>{ if(!this.dead) nades.push(new Nade(this.pos.clone().setY(2.6),v,1.8+i*.15,'enemy')); },i*180); } if(!G.M.final) spawnReinforce(3); }
      hud.boss(Math.max(0,this.hp/this.maxHp),this.name); for(let i=0;i<this.summon.length;i++){ if(this.summon[i]&&this.hp/this.maxHp<this.summon[i]){ this.summon[i]=0; spawnReinforce(4); hud.pop(this.name+' CALLS REINFORCEMENTS!','#f84'); } } }
    if(this.hp<=0) this.die(head,dir,wpn); }
  die(head,dir,wpn){ this.dead=true; this.deadT=0; dropGun(this,dir,wpn); this.deadDir=(Math.sin(this.yaw)*dir.x+Math.cos(this.yaw)*dir.z)>0?-1:1; this.deadType=wpn==='explosive'?(Math.random()<.5?0:2):head?0:Math.floor(Math.random()*3); if(this.deadType===1)this.deadDir=1; this.deadSide=Math.random()<.5?-1:1; this.deadV=new THREE.Vector3(dir.x,0,dir.z).normalize().multiplyScalar(wpn==='explosive'?7:wpn==='shotgun'?3.5:head?1.2:1.6); if(this.laser)scene.remove(this.laser); for(const c of world.covers)if(c.taken===this)c.taken=null;
    G.kills++; if(head)G.heads++; G.streak++; G.streakT=4; META.ev('kills'); if(head)META.ev('heads'); if(wpn==='takedown'){ META.ev('tds'); META.tutEv('td'); } if(wpn==='explosive')META.ev('boom'); if(G.streak>=2)META.ev('streak',G.streak); if(this.type==='boss')META.ev('boss'); let cash=this.type==='boss'?1500:this.type==='heavy'?140:this.type==='elite'?90:this.type==='breacher'?75:60; if(head){cash+=40;} if(wpn==='takedown')cash+=80; if(wpn==='explosive')cash+=20; cash+=Math.min(G.streak-1,5)*15; G.earned+=cash; hud.money(cash);
    const left=enemies.filter(e=>!e.dead).length;
    let msg=wpn==='takedown'?'TAKEDOWN':head?'HEADSHOT':wpn==='explosive'?'BLOWN UP':''; const names={2:'DOUBLE KILL',3:'TRIPLE KILL',4:'MULTI KILL',5:'RAMPAGE',6:'UNSTOPPABLE'}; if(G.streak>=2){ msg=(names[Math.min(G.streak,6)]||'UNSTOPPABLE')+(msg?' · '+msg:''); A.streak(G.streak); }
    hud.kill(msg,cash,G.streak);
    if(this.type==='boss'){ slowmo(2.2,0.15); hud.boss(-1); G.objDone=true; A.slowmo(); }
    else if(G.streak===4||G.streak===7||left===0&&(G.M.obj==='kill'||G.M.obj==='waves')||(head&&wpn==='sniper')){ slowmo(left===0?1.8:1.0,0.2); A.slowmo(); G.finisher=this; }
    setTimeout(objectiveCheck,50); }
  update(dt){ const r=this.rig; r.lod(camera.position.distanceTo(r.root.position)); if(this.dead){ this.deadT+=dt; r.root.position.set(this.pos.x,this.y>0?Math.max(0,this.y-this.deadT*this.deadT*12):0,this.pos.z); if(this.y>0&&r.root.position.y<=0){ this.y=0; } if(this.deadV){ this.pos.addScaledVector(this.deadV,dt); this.deadV.multiplyScalar(Math.max(0,1-dt*5)); world.collide(this.pos,0.35); } r.pose({dead:this.deadT,deadDir:this.deadDir,deadType:this.deadType,deadSide:this.deadSide},dt); return; }
    if(this.state==='takedown'){ r.pose({hit:0.6,move:0},dt); r.rot('head',-0.6,0,0,20,dt); r.rot('shoulderL',-0.5,0,0.4,20,dt); r.rot('shoulderR',-0.5,0,-0.4,20,dt); return; }
    this.hit=Math.max(0,this.hit-dt*4); this.fireCd-=dt; const toP=V1.subVectors(P.pos,this.pos); const dist=toP.length(); const angP=Math.atan2(toP.x,toP.z);
    this.losT-=dt; if(this.losT<=0){ this.losT=0.2; const eye=V2.set(this.pos.x,this.y+1.6*this.scale,this.pos.z), tgt=V3.set(P.pos.x,P.pos.y+(P.cr>0.5?0.75:1.3),P.pos.z); this.see=P.alive&&dist<(world.T.lamps&&!world.T.tree&&G.M.theme==='night'?24:42)&&world.los(eye,tgt); }
    const inCone=Math.abs(angDiff(this.yaw,angP))<(this.state==='combat'?2.6:1.05);
    if(this.state!=='combat'){ if(this.see&&inCone){ this.sus+=dt*(dist<10?2.5:dist<25?1.0:0.45)*(P.cr>0.5?0.5:1)*(Math.hypot(P.vel.x,P.vel.z)>5?1.6:1); if(this.sus>=1){ this.alert(P.pos); for(const o of enemies) if(!o.dead&&o!==this&&o.pos.distanceTo(this.pos)<22) o.alert(P.pos); } } else this.sus=Math.max(0,this.sus-dt*0.25); }
    let mv=V2.set(0,0,0), speed=0, ty=this.yaw;
    if(this.type==='sniper') this.updSniper(dt,dist,angP);
    else if(this.state==='patrol'){ if(!this.target||this.pos.distanceTo(this.target)<1.2){ this.wait-=dt; if(this.wait<0){ this.target=world.patrol[Math.floor(Math.random()*world.patrol.length)]; if(this.target.distanceTo(this.pos)>25)this.target=null; this.wait=2+Math.random()*3; } }
      if(this.target){ mv.subVectors(this.target,this.pos).setY(0).normalize(); speed=1.5; ty=Math.atan2(mv.x,mv.z); } }
    else { // combat
      if(this.react>0){ this.react-=dt; ty=angP; }
      else if(this.T.rush){ ty=angP; if(dist>4.5){ mv.copy(toP).setY(0).normalize(); const z=Math.sin(G.time*2.2+this.phase)*.55; mv.x+=Math.cos(angP)*z; mv.z-=Math.sin(angP)*z; mv.normalize(); speed=this.T.speed*(this.see?1:.8); } if(this.see&&this.fireCd<=0&&dist<15) this.shootCycle(dist); }
      else if(this.T.heavy){ ty=angP; if(dist>16||!this.see){ mv.copy(toP).setY(0).normalize(); speed=this.T.speed; } if(this.see&&this.fireCd<=0) this.shootCycle(dist); }
      else if(this.type==='boss'){ ty=angP; if(dist>9){ mv.copy(toP).setY(0).normalize(); speed=this.T.speed; } this.nadeCd-=dt; if(this.nadeCd<0&&dist<30&&dist>6){ this.nadeCd=5+Math.random()*3; const v=V3.copy(toP).setY(0); const fl=v.length()/14; v.normalize().multiplyScalar(14); v.y=fl*8; nades.push(new Nade(this.pos.clone().setY(2.4),v,1.6+Math.random()*.4,'enemy')); A.pin(); }
        if(this.see&&this.fireCd<=0) this.shootCycle(dist); }
      else { if(!this.cover||this.coverT<=0){ this.pickCover(); }
        if(this.cover){ const c=this.cover; const d=Math.hypot(c.x-this.pos.x,c.z-this.pos.z); if(d>0.6){ mv.set(c.x-this.pos.x,0,c.z-this.pos.z).normalize(); speed=this.T.speed; ty=d>3?Math.atan2(mv.x,mv.z):angP; this.peek=false; }
          else { ty=angP; this.coverT-=dt; this.peekT=(this.peekT||0)-dt; if(this.peekT<=0){ this.peek=!this.peek; this.peekT=this.peek?1.6+Math.random():1+Math.random()*1.5; if(this.peek)this.burst=0; } if(this.peek&&this.see&&this.fireCd<=0) this.shootCycle(dist); } }
        else { ty=angP; if(dist>14){ mv.copy(toP).setY(0).normalize(); speed=this.T.speed*0.8; } else if(this.type==='elite'){ mv.set(Math.cos(angP),0,-Math.sin(angP)).multiplyScalar(Math.sin(G.time*0.7+this.phase)>0?1:-1); speed=3; } if(this.see&&this.fireCd<=0) this.shootCycle(dist); }
        if(!this.see&&this.last.distanceTo(this.pos)>3&&(!this.cover||this.coverT<1)){ /* advance */ } } }
    // separation
    for(const o of enemies){ if(o===this||o.dead)continue; const dx=this.pos.x-o.pos.x, dz=this.pos.z-o.pos.z, d2=dx*dx+dz*dz; if(d2<1.2&&d2>1e-4){ const d=Math.sqrt(d2); this.pos.x+=dx/d*(1.1-d)*0.5; this.pos.z+=dz/d*(1.1-d)*0.5; } }
    this.vel.x=damp(this.vel.x,mv.x*speed,8,dt); this.vel.z=damp(this.vel.z,mv.z*speed,8,dt); if(this.type!=='sniper'){ this.pos.addScaledVector(this.vel,dt); world.collide(this.pos,0.42*this.scale); }
    this.yaw+=angDiff(this.yaw,ty)*Math.min(1,dt*7); const hs=Math.hypot(this.vel.x,this.vel.z); this.phase+=dt*hs*1.9;
    const wantCr=this.cover&&this.cover.low&&!this.peek&&Math.hypot(this.cover.x-this.pos.x,this.cover.z-this.pos.z)<0.8?1:0; this.crouch=damp(this.crouch,wantCr,8,dt);
    r.root.position.set(this.pos.x,this.y,this.pos.z); r.root.rotation.y=this.yaw;
    const pitch=this.state==='combat'?Math.atan2((P.pos.y+1.2)-(this.y+1.4),dist):0;
    this.rk=damp(this.rk||0,0,12,dt); r.pose({recoil:this.rk,phase:this.phase,move:Math.min(1,hs/3.8),sprint:false,crouch:this.crouch,aim:this.state==='combat'?1:0,pitch,hit:this.hit,hitSide:this.hitSide||1},dt);
    if(this.state!=='combat'){ r.rot('shoulderR',-0.9,0,0.15,8,dt); r.rot('elbowR',-0.9,0,0,8,dt); r.anchor.rotation.x=damp(r.anchor.rotation.x,0.7,8,dt); }
    if(this.mark){ this.mark.position.set(this.pos.x,this.y+2.3*this.scale,this.pos.z); this.mark.visible=this.state!=='combat'&&this.sus>0.05; this.mark.material.color.setRGB(1,1-this.sus,0.2); this.mark.scale.setScalar(0.3+this.sus*0.25); } }
  pickCover(){ if(this.cover)this.cover.taken=null; this.cover=null; let best=null,bs=1e9; for(const c of world.covers){ if(c.taken||c.ob.dead)continue; const d=Math.hypot(c.x-this.pos.x,c.z-this.pos.z); if(d>16)continue; const pd=Math.hypot(c.x-P.pos.x,c.z-P.pos.z); if(pd<7||pd>40)continue; const dot=(P.pos.x-c.x)*c.nx+(P.pos.z-c.z)*c.nz; if(dot>-1)continue; const s=d+Math.abs(pd-18)*0.4; if(s<bs){bs=s;best=c;} } if(best){ best.taken=this; this.cover=best; } this.coverT=6+Math.random()*6; }
  muzzleP(){ return this.rig.muzzle.getWorldPosition(new THREE.Vector3()); }
  shootCycle(dist){ const T=this.T; if(this.burst<=0){ this.burst=T.burst[0]+Math.floor(Math.random()*(T.burst[1]-T.burst[0]+1)); }
    this.burst--; this.fireCd=this.burst>0?T.rof:0.7+Math.random()*1.0; this.fireShot(dist); }
  fireShot(dist){ const T=this.T, m=this.muzzleP(); const tgt=V3.set(P.pos.x,P.pos.y+(P.cr>0.5?0.8:1.25),P.pos.z);
    const pm=Math.hypot(P.vel.x,P.vel.z); let acc=T.acc*clamp(1.3-dist/45,0.25,1.2)*(pm>3?0.6:1)*(P.roll>=0||P.slide>0?0.25:1)*(P.cr>0.5?0.75:1)*diff();
    const clear=world.los(m,tgt); const hit=clear&&Math.random()<acc; const end=tgt.clone(); if(!hit){ end.x+=(Math.random()-.5)*2.2; end.y+=(Math.random()-.3)*1.2; end.z+=(Math.random()-.5)*2.2; const dd=end.clone().sub(m); const L=dd.length(); dd.normalize(); const h=world.ray(m,dd,L+20); end.copy(m).addScaledVector(dd,h?h.t:L+20); if(h&&h.ob){ fx.sparks(end,4,h.n); } else if(h&&h.ground) fx.dust(end); if(m.distanceTo(P.pos)>3&&end.distanceTo(tgt)<3)A.ric(); }
    this.rk=1; fx.tracer(m,end,this.type==='boss'?[1,.3,.2]:[1,.55,.3]); fx.muzzle(m,V1.subVectors(tgt,m).normalize(),this.type==='boss'?1.4:0.9); A.shot(this.type==='boss'?'boss':this.type==='sniper'?'sniper':'enemy',dist);
    if(hit) P.damage(T.dmg*(0.8+Math.random()*0.4)*(this.dk||1),this); }
  updSniper(dt,dist,angP){ const pos=this.laser.geometry.attributes.position; const m=this.muzzleP(); this.yaw+=angDiff(this.yaw,this.state==='combat'?angP:this.yaw+Math.sin(G.time*0.4+this.phase)*0.01)*Math.min(1,dt*3);
    let end=V3.set(Math.sin(this.yaw),0,Math.cos(this.yaw)).multiplyScalar(60).add(m); end.y=1;
    if(this.state==='combat'&&this.see){ this.aimT+=dt; end=V3.set(P.pos.x,1.2,P.pos.z).lerp(V1.set(P.pos.x+3,1,P.pos.z),Math.max(0,1-this.aimT)*0.8); this.laser.material.opacity=0.3+this.aimT*0.35; if(this.aimT>2.2){ this.aimT=0; this.fireShot(dist); } } else { this.aimT=Math.max(0,this.aimT-dt); this.laser.material.opacity=0.35; }
    pos.setXYZ(0,m.x,m.y,m.z); pos.setXYZ(1,end.x,end.y,end.z); pos.needsUpdate=true; }
}
function raySphere(o,d,c,r){ const ox=o.x-c.x,oy=o.y-c.y,oz=o.z-c.z; const b=ox*d.x+oy*d.y+oz*d.z; const cc=ox*ox+oy*oy+oz*oz-r*r; const h=b*b-cc; if(h<0)return null; const t=-b-Math.sqrt(h); return t>0?t:null; }
const diff=()=>1+G.mi*0.05;
const markMat=new THREE.SpriteMaterial({color:0xffff00,transparent:true,depthTest:false});
{ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); g.fillStyle='#fff'; g.font='bold 56px sans-serif'; g.textAlign='center'; g.fillText('!',32,54); markMat.map=new THREE.CanvasTexture(c); }
const drops=[]; function dropGun(e,dir,wpn){ const g=e.rig.gun; if(!g||e.type==='boss')return; scene.attach(g); e.rig.gun=null; const f=wpn==='explosive'?5:1.6; drops.push({o:g,v:new THREE.Vector3(dir.x*f+(Math.random()-.5),1.5+Math.random()*1.5+(wpn==='explosive'?3:0),dir.z*f+(Math.random()-.5)),av:new THREE.Vector3((Math.random()-.5)*8,(Math.random()-.5)*6,(Math.random()-.5)*8),t:0}); if(drops.length>16){ scene.remove(drops.shift().o); } }
function updDrops(dt){ for(const d of drops){ if(d.rest)continue; d.t+=dt; d.v.y-=18*dt; d.o.position.addScaledVector(d.v,dt); d.o.rotation.x+=d.av.x*dt; d.o.rotation.y+=d.av.y*dt; d.o.rotation.z+=d.av.z*dt;
  if(d.o.position.y<0.06){ d.o.position.y=0.06; if(Math.abs(d.v.y)>2.5){ d.v.y*=-.3; d.v.x*=.5; d.v.z*=.5; d.av.multiplyScalar(.4); A.casing(); } else { d.rest=true; d.o.rotation.x=0; d.o.rotation.z=Math.PI/2*(Math.random()<.5?1:-1); } } } }
function addEnemy(type,pos,opt){ const e=new Enemy(type,pos,opt); e.mark=new THREE.Sprite(markMat.clone()); e.mark.visible=false; scene.add(e.mark); enemies.push(e); return e; }
function spawnReinforce(n){ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2; const p=new THREE.Vector3(Math.cos(a)*world.H*0.8,0,Math.sin(a)*world.H*0.7); world.collide(p,0.5); addEnemy(i%3===0?'elite':i%3===2&&G.mi>=2?'breacher':'grunt',p,{alert:true}); } }
// ---------------- flow ----------------
function slowmo(dur,scale){ G.slowT=dur; G.slowS=scale; }
function setTheme(T){ const s=sky.material.uniforms; s.top.value.set(T.sky[0]); s.bot.value.set(T.sky[1]); s.sunC.value.set(T.sun); s.sunDir.value.set(...T.sunPos).normalize();
  scene.fog=new THREE.Fog(T.fog,T.fogD[0],T.fogD[1]); scene.background=new THREE.Color(T.fog); sun.color.set(T.sun); sun.intensity=T.sunI; rim.color.set(T.rim?T.rim[0]:0); rim.intensity=T.rim?T.rim[1]:0; rim.position.set(-T.sunPos[0],T.sunPos[1]*.6,-T.sunPos[2]); hemi.color.set(T.hemi[0]); hemi.groundColor.set(T.hemi[1]); hemi.intensity=T.hemi[2]*1.7; renderer.toneMappingExposure=T.exp;
  { const es=new THREE.Scene(); const sk=new THREE.Mesh(sky.geometry,sky.material); es.add(sk); const gr=new THREE.Mesh(new THREE.CircleGeometry(300,16).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(T.hemi[1]).multiplyScalar(0.6)})); gr.position.y=-5; es.add(gr); if(!setTheme.pm)setTheme.pm=new THREE.PMREMGenerator(renderer); if(scene.environment)scene.environment.dispose(); scene.environment=setTheme.pm.fromScene(es,0,0.1,1000).texture; scene.environmentIntensity=0.45; gr.geometry.dispose(); gr.material.dispose(); }
  const g=T.grade; grade.uniforms.uC.value=g[0]; grade.uniforms.uS.value=g[1]; grade.uniforms.uLift.value.set(...g[2]); grade.uniforms.uGain.value.set(...g[3]); }
function clearLevel(){ for(const r of ATT.rigs)scene.remove(r.root); ATT.rigs.length=0; ATT.foes.length=0; ATT.mate=null; ATT.p0=null; ATT.t=0; META.tutStop(); for(const d of drops)scene.remove(d.o); drops.length=0; if(decals){ decals.clearDynamic(); } if(fx)fx.setWeather(null); for(const e of enemies){ scene.remove(e.rig.root); freeRig(e.rig.root); if(e.mark)scene.remove(e.mark); if(e.laser)scene.remove(e.laser); } enemies.length=0; for(const n of nades)scene.remove(n.m); nades.length=0; for(const r of rockets)if(r.m)scene.remove(r.m); rockets.length=0; if(P)scene.remove(P.rig.root); }
let heli=null;
const SURV_MAP=7;
function startSurvival(){ startMission(SURV_MAP,true); }
function startMission(mi,surv=false){ G.survival=!!surv; if(G.trial){ G.trialNow=G.trial; G.trial=null; G.trialMi=mi; } else if(G.trialMi!==mi) G.trialNow=null; show(null); curtain(); clearLevel(); G.mi=mi; const M=G.M=surv?Object.assign({},MISSIONS[mi],{obj:'survival',name:'SURVIVAL',enemies:7,elite:0,boss:null,waves:1e9}):MISSIONS[mi]; world.lib=lib; world.build(mi); setTheme(world.T); fx.setTheme(world.T,M.theme); A.ambience(M.theme); for(const q of world.fires) fx.fire(new THREE.Vector3(q[0],q[1],q[2]),1e9,q[3]);
  Object.assign(G,{time:0,kills:0,heads:0,shots:0,hits:0,streak:0,streakT:0,earned:0,wave:0,objDone:false,slowT:0,planted:0,bossSeen:false,bossCam:0,intel:false,extractOn:false,finisher:null,survBreak:false,banked:0,survPay:0,lastAdWave:0}); if(surv)G.wave=1;
  if(P&&P.rig){ scene.remove(P.rig.root); freeRig(P.rig.root); } P=new Player(); P.yaw=P.camYaw=0;
  const R=Math.random; const spots=[...world.enemySpots]; let n=M.enemies;
  for(let i=0;i<n;i++){ let p; if(spots.length&&i%2===0){ const s=spots[i%spots.length]; p=new THREE.Vector3(s[0]+(R()-.5)*10,0,s[1]+(R()-.5)*10); } else p=world.patrol[i%world.patrol.length].clone().add(new THREE.Vector3((R()-.5)*4,0,(R()-.5)*4)); if(p.z<-world.H+18)p.z+=20; world.collide(p,0.5); addEnemy(i<M.elite?(G.mi>=4&&i===M.elite-1?'heavy':'elite'):(G.mi>=2&&i%5===3?'breacher':'grunt'),p); }
  if(!surv) for(const t of (world.towers||[])) addEnemy('sniper',new THREE.Vector3(t[0],0,t[1]),{y:6.2});
  if(M.obj==='boss'){ const bp=(()=>{ const c=new THREE.Vector3(), q=new THREE.Vector3(), best=new THREE.Vector3(0,0,world.H*0.55); let bs=-1, sd=12345; const rn=()=>(sd=sd*16807%2147483647)/2147483647; for(let i=0;i<60;i++){ const r=i?2+rn()*12:0, t=rn()*6.283; c.set(Math.sin(t)*r,1.8,world.H*0.55+Math.cos(t)*r); if(Math.abs(c.x)>world.H-6||Math.abs(c.z)>world.H-6)continue; if(world.obs.some(o=>c.x>o.minX-1.5&&c.x<o.maxX+1.5&&c.z>o.minZ-1.5&&c.z<o.maxZ+1.5))continue; let sc=0; for(let k=0;k<12;k++){ const a=k/12*6.283; for(const d of [3,6]){ q.set(c.x+Math.sin(a)*d,1.8,c.z+Math.cos(a)*d); if(world.los(c,q))sc++; } } sc-=r*.15; if(sc>bs){ bs=sc; best.set(c.x,0,c.z); } } return best; })();
    const b=addEnemy('boss',bp,{hp:M.bossHp,name:M.boss}); G.bossRef=b; if(M.final){ b.summon=[0.75,0.5,0.25]; } }
  if(!heli){ heli=lib.props.heli.clone(); heli.rotor=heli.getObjectByName('rotor'); heli.trotor=heli.getObjectByName('trotor'); } scene.add(heli);
  hud.objective(); hud.weapon(); hud.boss(-1); $('hud').classList.remove('hide'); if(TOUCH)$('touch').classList.remove('hide');
  if(!window.SF_NOWARM) warmGPU(); intro(); }
function objText(){ const M=G.M; const left=enemies.filter(e=>!e.dead&&e.type!=='sniper').length;
  if(G.extractOn) return 'REACH EXTRACTION ▲';
  switch(M.obj){ case 'kill': return `ELIMINATE HOSTILES · ${left} LEFT`; case 'destroy': return `PLANT CHARGES · ${G.planted}/${M.n}`; case 'intel': return 'RECOVER INTEL LAPTOP'; case 'boss': return `KILL ${M.boss}`; case 'tank': return 'DESTROY THE TANK'; case 'survival': return `SURVIVAL · WAVE ${G.wave} · ${left} LEFT · BEST ${(save.best&&save.best.survival)||0}`; case 'waves': return `HOLD OUT · WAVE ${Math.max(1,G.wave)}/${M.waves} · ${left} LEFT`; } }
function objectiveCheck(){ if(G.state!=='play')return; const M=G.M; const left=enemies.filter(e=>!e.dead&&e.type!=='sniper').length;
  if(M.obj==='kill'&&left===0) complete();
  else if(M.obj==='survival'&&left===0&&!G.survBreak) survWaveDone();
  else if(M.obj==='waves'&&left===0){ if(G.wave<M.waves){ G.wave++; hud.pop('WAVE '+G.wave+' INCOMING','#f84'); setTimeout(()=>{ if(G.state==='play') spawnReinforce(5+G.wave*2); hud.objective(); },2500); } else { G.extractOn=true; world.extractMesh.visible=true; hud.pop('AREA SECURE · EXTRACT','#5f9'); } }
  else if((M.obj==='boss'||M.obj==='tank')&&G.objDone) setTimeout(complete,2200);
  else if(M.obj==='destroy'&&G.planted>=M.n&&!G.extractOn){ G.extractOn=true; world.extractMesh.visible=true; }
  hud.objective(); }
function updObjectives(dt){ const M=G.M; let prompt='';
  for(const t of world.targets){ if(t.planted||t.dead||!t.target)continue; const c=V1.set((t.minX+t.maxX)/2,0,(t.minZ+t.maxZ)/2); const d=Math.max(Math.abs(P.pos.x-c.x)-(t.maxX-t.minX)/2,Math.abs(P.pos.z-c.z)-(t.maxZ-t.minZ)/2);
    if(d<1.4){ prompt=M.obj==='intel'?'HOLD E / USE · DOWNLOAD INTEL':'HOLD E / USE · PLANT C4'; if(input.useHeld){ t.prog=(t.prog||0)+dt/(M.obj==='intel'?2.5:1.5); prompt+=` ${Math.min(100,t.prog*100|0)}%`; if(t.prog>=1){ t.planted=1; A.buy();
      if(M.obj==='intel'){ G.intel=true; G.extractOn=true; world.extractMesh.visible=true; hud.pop('INTEL SECURED · EXTRACT','#5f9'); t.obj.visible=false; spawnReinforce(4); }
      else { G.planted++; hud.pop('CHARGE PLANTED · 3s','#fc4'); const cc=c.clone(); const tt=t; setTimeout(()=>{ tt.dead=true; wreck(tt,.4); explode(cc.setY(1.5),2.2,'player'); fx.fire(cc.clone().setY(.2),45,1.6); setTimeout(()=>explode(cc.clone().add(new THREE.Vector3(1,0.5,1)),1.2,'player'),200); },3000); alertNoise(P.pos,30); } objectiveCheck(); } } else t.prog=Math.max(0,(t.prog||0)-dt); } }
  if(G.extractOn){ world.extractMesh.rotation.y+=dt; world.extractMesh.material.opacity=0.15+Math.sin(G.time*4)*0.06; if(P.pos.distanceTo(world.extract)<2.8) complete(); }
  // takedown prompt
  if(!prompt) for(const e of enemies){ if(e.dead||e.type==='boss')continue; if(e.pos.distanceTo(P.pos)<2.2&&(e.state!=='combat'||Math.abs(angDiff(e.yaw,Math.atan2(P.pos.x-e.pos.x,P.pos.z-e.pos.z)))>1.9)){ prompt=TOUCH?ic('knife')+' KNIFE · TAKEDOWN':'F · SILENT TAKEDOWN'; break; } }
  hud.prompt(prompt); }
// ---------------- cinematics ----------------
let cine=null; // {keys:[{t,pos,look}],T,onEnd,subs}
function freeRig(r){ r.traverse(o=>{ if(o.isSkinnedMesh&&o.skeleton&&o.skeleton.boneTexture){ o.skeleton.dispose(); } }); }
function warmGPU(){ try{ const hid=[], tmp=[]; scene.traverse(o=>{ if(!o.visible&&!o.isLight){ hid.push(o); o.visible=true; } });
  const add=o=>{ if(o&&o.isObject3D&&!o.parent){ o.userData._wp=o.position.clone(); o.position.set(P.pos.x,-50,P.pos.z); scene.add(o); tmp.push(o); o.traverse(c=>{ if(!c.visible&&!c.isLight){hid.push(c); c.visible=true;} }); } };
  for(const k in lib.chars) add(lib.chars[k]); for(const k in (lib.weapons||{})) add(lib.weapons[k]);
  const _m0=renderer.info.memory.textures; renderer.compile(scene,camera); const _m1=renderer.info.memory.textures; const seen=new Set(); scene.traverse(o=>{ const m=o.material; if(!m)return; for(const mm of (Array.isArray(m)?m:[m])) for(const k of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','alphaMap','aoMap']){ const t=mm[k]; if(t&&!seen.has(t)){ seen.add(t); renderer.initTexture(t); } } });
  if(!warmGPU.rt) warmGPU.rt=new THREE.WebGLRenderTarget(64,64); const sm=renderer.shadowMap.needsUpdate; renderer.shadowMap.needsUpdate=true; const _m2=renderer.info.memory.textures; renderer.setRenderTarget(warmGPU.rt); renderer.render(scene,camera); if(window.__wl)console.log('WARM',_m0,_m1,_m2,renderer.info.memory.textures,seen.size); renderer.setRenderTarget(null); renderer.shadowMap.needsUpdate=sm||!renderer.shadowMap.autoUpdate;
  for(const o of tmp){ scene.remove(o); o.position.copy(o.userData._wp); } for(const o of hid) o.visible=false; }catch(e){ console.warn('warm',e); } }
function intro(){ G.state='cine'; SDK.gameplayStop(); const H=world.H, first=!save.seenIntro&&G.mi===0, M=G.M;
  heli.visible=true; const hp0=new THREE.Vector3(-30,22,-H-40), hp1=new THREE.Vector3(0,7,-H+6), hp2=new THREE.Vector3(40,30,-H-30); A.heli(true); A.music(true,0);
  const T=first?9:5.5;
  cine={t:0,T,first,heliPath:[hp0,hp1,hp2],
    cam:(t)=>{ const k=t/T; if(first){ if(k<0.35){ const kk=k/0.35; return [new THREE.Vector3(lerp(-50,-10,kk),lerp(30,14,kk),lerp(-H-60,-H-8,kk)),heli.position]; }
        if(k<0.65){ const kk=(k-0.35)/0.3; return [new THREE.Vector3(Math.cos(kk*2+1)*30,lerp(25,18,kk),Math.sin(kk*2+1)*30),new THREE.Vector3(0,0,0)]; }
        const kk=(k-0.65)/0.35; return [new THREE.Vector3(lerp(6,2.5,kk),lerp(9,2.4,kk),-H+6+lerp(-6,-3.2,kk)),P.pos.clone().setY(lerp(4,1.4,kk))]; }
      const a=k*1.6+0.6; if(k<0.7) return [new THREE.Vector3(Math.cos(a)*H*0.7,lerp(30,16,k),Math.sin(a)*H*0.5),new THREE.Vector3(0,2,0)];
      const kk=(k-0.7)/0.3; return [new THREE.Vector3(lerp(Math.cos(a)*H*0.7,P.pos.x-0.8,kk*kk),lerp(16,2.3,kk),lerp(Math.sin(a)*H*0.5,P.pos.z-3.4,kk*kk)),V1.copy(P.pos).setY(1.4).lerp(new THREE.Vector3(0,2,0),1-kk)]; },
    subs:first?[[0.2,'COMMAND: Strike Force Zero, you are over the drop zone.'],[3.2,'Hostile outpost confirmed. Weapons free.'],[6.2,'Good luck, soldier. Make it loud — or make it silent.']]:[[0.3,M.brief]]};
  $('cine').classList.remove('hide'); $('cine').classList.add('on'); $('skip').classList.remove('hide');
  showCard(); if(first){ save.seenIntro=true; persist(); } }
function showCard(){ const M=G.M, c=$('card'); c.querySelector('.cn').textContent='MISSION '+(G.mi+1); c.querySelector('.cz').textContent=M.name; c.querySelector('.cl').textContent=M.loc; c.querySelector('.co').textContent=M.brief; c.classList.remove('hide','out'); void c.offsetWidth; c.classList.add('in'); }
function updCine(dt){ const c=cine; c.t+=dt; const k=c.t/c.T; const H=world.H;
  // heli path: arrive (0-.45), hover (.45-.7), leave
  const [a,b,d]=c.heliPath; const hk=c.first?k:0.45+k*0.55; if(hk<0.45){ const s=hk/0.45; const e=1-Math.pow(1-s,2); heli.position.lerpVectors(a,b,e); } else if(hk<0.7){ heli.position.copy(b); heli.position.y=b.y+Math.sin(c.t*2)*0.3; } else { const s=(hk-0.7)/0.3; heli.position.lerpVectors(b,d,s*s); }
  heli.rotation.y=Math.PI+(hk>0.7?-(hk-0.7)*2:0); heli.rotation.z=hk<0.45?0.15:hk>0.7?-0.25:0; heli.rotation.x=hk<0.45?0.12:0; if(heli.rotor)heli.rotor.rotation.y+=dt*30; if(heli.trotor)heli.trotor.rotation.x+=dt*40;
  // player drop
  if(hk<0.5){ P.rig.root.visible=hk>0.4; P.pos.set(0,0,-H+6); P.rig.root.position.set(0,Math.max(0,(0.5-hk)*60),-H+6); } else { P.rig.root.visible=true; P.rig.root.position.copy(P.pos); }
  P.rig.pose({crouch:hk<0.56?1:0,move:0},dt);
  const [cp,cl]=c.cam(c.t); camera.position.copy(cp); camera.lookAt(cl); camera.fov=55; camera.updateProjectionMatrix();
  const sub=c.subs.filter(s=>s[0]<=c.t).pop(); $('subs').textContent=sub?sub[1]:'';
  if(c.t>=c.T) endCine(); }
function bossIntroCheck(){ const b=G.bossRef; if(!b||G.bossSeen||b.dead)return; const d=b.pos.distanceTo(P.pos); if(d<30&&world.los(V1.copy(P.pos).setY(1.6),V2.copy(b.pos).setY(1.8))||d<16){ G.bossSeen=true; G.bossCam=3.4; G.bossCam0=3.4; b.yaw=Math.atan2(P.pos.x-b.pos.x,P.pos.z-b.pos.z); A.slowmo(); A.music(true,2); { const hp=new THREE.Vector3(b.pos.x,1.9,b.pos.z), q=new THREE.Vector3(); G.bossA=b.yaw; let bs=-1; for(const o of [0,.5,-.5,1,-1,1.6,-1.6,2.3,-2.3,3.14]){ let ok=true; for(const r of [7.2,5,3.6]) for(const da of [-.9,0,.5]){ q.set(b.pos.x+Math.sin(b.yaw+o+da)*r,1.6,b.pos.z+Math.cos(b.yaw+o+da)*r); if(!world.los(hp,q))ok=false; } if(ok) for(let j=0;j<=6&&ok;j++){ const kk=j/6, aa=b.yaw+o+lerp(-0.9,0.5,kk), rr=lerp(5.5,3.2,kk), cx=b.pos.x+Math.sin(aa)*rr, cz=b.pos.z+Math.cos(aa)*rr; for(const t of world.obs) if(/pine|palm|tree|net|tower/.test(t.name)&&Math.hypot((t.minX+t.maxX)/2-cx,(t.minZ+t.maxZ)/2-cz)<3.2){ ok=false; break; } } if(!ok)continue; let sc=10-Math.abs(o); for(const r of [3,6,10]){ q.set(b.pos.x-Math.sin(b.yaw+o)*r,1.8,b.pos.z-Math.cos(b.yaw+o)*r); if(world.los(hp,q))sc+=4; } if(sc>bs){ bs=sc; G.bossA=b.yaw+o; } } b.yaw=G.bossA; } $('hud').classList.add('cinehide');
    const el=$('bossintro'); el.querySelector('.bn').textContent=b.name; el.querySelector('.bs').textContent=G.M.final?'WARLORD · FINAL TARGET':'FIELD COMMANDER · HIGH VALUE TARGET'; el.classList.remove('hide'); el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); $('cine').classList.remove('hide'); $('cine').classList.add('on'); G.bossRoar=0; } }
function bossCamUpd(dt){ if(!(G.bossCam>0))return; G.bossCam-=dt; const b=G.bossRef, k=1-G.bossCam/G.bossCam0, s=b.scale||1.25; const a=G.bossA+lerp(-0.9,0.5,k*k*(3-2*k)), r=lerp(5.5,3.2,k);
  camera.position.set(b.pos.x+Math.sin(a)*r,lerp(.9,2.2,k)*s,b.pos.z+Math.cos(a)*r); camera.lookAt(b.pos.x,1.55*s,b.pos.z); camera.fov=lerp(48,38,k); camera.updateProjectionMatrix(); b.rig.root.position.copy(b.pos); b.yaw=a; b.rig.root.rotation.y=a; b.rig.pose({aim:k>.5?1:0,move:0,crouch:0},dt); bossKey.position.set(camera.position.x*.6+b.pos.x*.4,2.6*s,camera.position.z*.6+b.pos.z*.4); bossKey.intensity=Math.min(1,k*4)*14; bossKey.distance=12; bossKey.color.setHex(0xfff0e0);
  if(k>.58&&!G.bossRoar){ G.bossRoar=1; A.roar&&A.roar(); for(let j=0;j<5;j++) fx.dust(V1.set(b.pos.x+(Math.random()-.5)*2,.2,b.pos.z+(Math.random()-.5)*2),fx.dustCol); G.shake=Math.max(G.shake,.9*(save.set.shake??1)); G.flash=Math.max(G.flash||0,.08); }
  if(G.bossCam<=0){ $('bossintro').classList.add('hide'); $('cine').classList.remove('on'); $('hud').classList.remove('cinehide'); setTimeout(()=>$('cine').classList.add('hide'),600); bossKey.intensity=0; camera.fov=55; camera.updateProjectionMatrix(); P.camYaw=Math.atan2(P.pos.x-b.pos.x,P.pos.z-b.pos.z)+Math.PI; P.camPitch=0; G.bossCam=0; } }
function endCine(){ if(!cine)return; cine=null; heli.visible=false; A.heli(false); $('cine').classList.remove('on'); $('skip').classList.add('hide'); $('subs').textContent=''; setTimeout(()=>$('cine').classList.add('hide'),600);
  const c=$('card'); c.classList.add('out'); setTimeout(()=>c.classList.add('hide'),700);
  P.pos.set(0,0,-world.H+6); P.camYaw=0; P.yaw=0; G.state='play'; A.music(true,1); SDK.gameplayStart(); lockPointer(); if(G.mi===0)META.tutStart(P); }
// ---------------- camera ----------------
const V3B=new THREE.Vector3(); const camPos=new THREE.Vector3(), camLook=new THREE.Vector3(); let camDist=3.2;
function updCamera(dt){ if(!P)return; const aim=P.aimK, scope=P.st.scope&&aim>0.6&&P.alive;
  const yaw=P.camYaw, pitch=P.camPitch; const f=V1.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
  const right=V2.set(-Math.cos(yaw),0,Math.sin(yaw)); const headY=lerp(1.65,1.15,P.cr)+P.pos.y*0.7-(P.slide>0?0.5:0);
  let dist=lerp(3.3,1.5,aim)*(P.alive?1:2.2), sh=lerp(0.75,0.6,aim); if(scope){dist=0.2;sh=0.05;} else if(innerWidth<innerHeight){ dist*=1.35; sh*=0.42; }
  if(P.takedown){ dist=2.4; sh=1.4; }
  const pivot=V3.set(P.pos.x,headY,P.pos.z).addScaledVector(right,sh);
  const want=pivot.clone().addScaledVector(f,-dist); // collision
  const dd=want.clone().sub(pivot); const L=dd.length(); dd.normalize(); const h=world.ray(pivot,dd,L); if(h&&h.t<L){ want.copy(pivot).addScaledVector(dd,Math.max(0.3,h.t-0.25)); }
  camDist=damp(camDist,1,10,dt); camPos.lerp(want,1-Math.exp(-(P.roll>=0||P.vault>=0?14:25)*dt)); if(!camPos.lengthSq())camPos.copy(want); camera.position.copy(camPos);
  camLook.copy(pivot).addScaledVector(f,30); camera.lookAt(camLook);
  if(G.shake>0){ const sk=G.shake*save.set.shake; camera.position.x+=(Math.random()-.5)*sk*0.25; camera.position.y+=(Math.random()-.5)*sk*0.25; camera.rotation.z+=(Math.random()-.5)*sk*0.03; G.shake=Math.max(0,G.shake-dt*2.5); }
  const fov=scope?18:lerp(68,50,aim)+(P.slide>0||P.roll>=0?6:0)+(G.slowT>0?-8:0); camera.fov=damp(camera.fov,fov,10,dt); camera.updateProjectionMatrix();
  $('scope').classList.toggle('on',!!scope); P.rig.root.visible=!scope; }
// ---------------- rockets ----------------
function updRockets(dt){ for(let i=rockets.length-1;i>=0;i--){ const r=rockets[i]; if(!r.m){ r.m=lib.weapons.grenade.clone(); r.m.scale.set(1.2,1.2,2.5); scene.add(r.m); }
  const step=r.v.length()*dt; const d=r.v.clone().normalize(); let hit=world.ray(r.p,d,step); let he=null; for(const e of enemies){ if(e.dead)continue; const h=e.hitTest(r.p,d,hit?hit.t:step); if(h){ he=h; } }
  if(r.g)r.v.y-=r.g*dt; r.p.addScaledVector(r.v,dt); r.t+=dt; r.m.position.copy(r.p); r.m.lookAt(V1.copy(r.p).add(d)); fx.smoke.add(r.p.x,r.p.y,r.p.z,0,.3,0,1.4,.35,.75,.72,.7,.5,3,-.2,1); fx.add.add(r.p.x,r.p.y,r.p.z,-d.x*2,-d.y*2,-d.z*2,.12,.4,1,.6,.2,1,0,0,0);
  if(hit||he||r.t>4){ scene.remove(r.m); rockets.splice(i,1); if(hit&&hit.ob&&hit.ob.tank) damageObstacle(hit.ob,300); explode(r.p,r.s||1.4,r.owner); } } }
// ---------------- main loop ----------------
let last=performance.now(), fpsA=60, fpsT=0;
function loop(){ requestAnimationFrame(loop); const now=performance.now(); let rdt=Math.min(0.05,(now-last)/1000); last=now; if(window.__perf){ renderer.info.autoReset=false; renderer.info.reset(); } else renderer.info.autoReset=true; fpsA=lerp(fpsA,1/Math.max(rdt,1e-3),0.05);
  autoQuality(rdt);
  if(G.slowT>0){ G.slowT-=rdt; G.ts=damp(G.ts,G.slowS,12,rdt); } else G.ts=damp(G.ts,1,6,rdt); const dt=rdt*G.ts;
  grade.uniforms.uSlow.value=damp(grade.uniforms.uSlow.value,G.slowT>0?1:0,8,rdt); grade.uniforms.uT.value=now/1000; G.flash=Math.max(0,(G.flash||0)-rdt*2); grade.uniforms.uFlash.value=G.flash; G.dirt=Math.max(0,(G.dirt||0)-rdt*.7); { const cd=V1; camera.getWorldDirection(cd); const sp=world.T?world.T.sunPos:[40,55,-30]; const sl=Math.hypot(sp[0],sp[1],sp[2]); const sf=Math.max(0,(cd.x*sp[0]+cd.y*sp[1]+cd.z*sp[2])/sl); grade.uniforms.uDirt.value=Math.min(1,G.dirt+Math.pow(sf,6)*(world.T===THEMES.night?0:.6)); }
  if(G.state==='cine'&&cine){ updCine(rdt); enemies.forEach(e=>e.update(dt)); fx.update(dt,camera); }
  else if(G.state==='play'||G.state==='dead'||G.state==='done'){ G.time+=dt; if(G.state==='play'&&!(G.bossCam>0))gatherInput(rdt); else if(G.bossCam>0){ input.fire=false; input.mx=input.my=0; } P.update(dt); if(!(G.bossCam>0)) for(const e of enemies)e.update(dt); for(let i=nades.length-1;i>=0;i--) if(!nades[i].update(dt)) nades.splice(i,1); updRockets(dt); updDrops(dt); if(P&&P.rig.muzzle){ P.rig.muzzle.getWorldPosition(V3B); fx.barrel(V3B,dt); } fx.update(dt,camera); if(G.state==='play'){ META.tutUpd(rdt,P,G); bossIntroCheck(); updObjectives(dt); if(G.streakT>0){G.streakT-=dt; if(G.streakT<=0)G.streak=0;} } updCamera(rdt); bossCamUpd(rdt); updArc(); hud.update(rdt);
    grade.uniforms.uDmg.value=damp(grade.uniforms.uDmg.value,P.alive?clamp((1-P.hp/P.maxHp)*0.8+P.hit*0.4,0,1)*(P.hp<40?1:0.5):1,6,rdt); }
  else if(G.state==='menu'){ menuScene(rdt*(window.SF_ATTX||1)); }
  // sun follows camera for shadow coverage
  const fc=P&&G.state!=='menu'?P.pos:V1.set(0,0,0); const sp=world.T?world.T.sunPos:[40,55,-30]; { const gx=Q>1?fc.x:Math.round(fc.x), gz=Q>1?fc.z:Math.round(fc.z); sun.position.set(gx+sp[0],sp[1],gz+sp[2]); sun.target.position.set(gx,0,gz); } if(!renderer.shadowMap.autoUpdate){ shF=(shF+1)%shEvery; if(!shF)renderer.shadowMap.needsUpdate=true; } sky.position.copy(camera.position);
  { const hz=grade.uniforms.uHz.value; grade.uniforms.uAsp.value=camera.aspect; let n=0; if(fx){ const v=new THREE.Vector3(); for(const h of fx.haze){ if(n>=4)break; v.copy(h.p).project(camera); if(v.z>1||Math.abs(v.x)>1.3||Math.abs(v.y)>1.3)continue; const dist=camera.position.distanceTo(h.p); hz[n++].set(v.x*.5+.5,v.y*.5+.5,Math.min(.22,1.6*h.s/dist),Math.min(1,h.t)*Math.min(1,25/dist)); } } for(;n<4;n++)hz[n].w=0; }
  composer.render(); if(window.__perf){ const pf=window.__perf; pf.t.push(performance.now()-now); pf.c.push(renderer.info.render.calls); pf.tr.push(renderer.info.render.triangles); pf.p=renderer.info.programs.length; const ft=performance.now()-now; if(ft>80) (pf.h=pf.h||[]).push([Math.round(ft),G.state,renderer.info.programs.length,G.bossCam>0?1:0]); }; }
let qT=0, qLo=0, qHi=0, qCool=0; function autoQuality(dt){ if(window.SF_NOAUTO||G.state!=='play')return; qT+=dt; qCool=Math.max(0,qCool-dt); if(qT<3)return; qT=0;
  // hysteresis: need 2 slow windows (<28fps) to degrade, 3 fast windows (>50fps) to restore resolution; 8s cooldown after any change
  if(fpsA<28){ qLo++; qHi=0; } else if(fpsA>50){ qHi++; qLo=0; } else { qLo=0; qHi=0; }
  if(qCool>0)return;
  if(qLo>=2){ qLo=0; qCool=8; if(Q>0){ Q--; applyQuality(); } // effects first: shadows, bloom, lamps, particles, draw distance
    } // render resolution is never lowered (user preference: no blur)
  else if(qHi>=3&&DYN<1){ qHi=0; qCool=8; DYN=Math.min(1,DYN+0.1); renderer.setPixelRatio(PR()); resize(); } }
// ---------------- title attract mode: scripted 3-shot gameplay loop behind the menu ----------------
let menuT=0; const ATT={rigs:[],mate:null,foes:[],t:0,o:new THREE.Vector3()};
function attractSetup(){ for(const r of ATT.rigs)scene.remove(r.root); ATT.rigs.length=0; ATT.foes.length=0; ATT.t=0;
  const o=ATT.o.set(P.pos.x,0,P.pos.z); const m=new Rig('soldier'); m.setWeapon('rifle'); scene.add(m.root); ATT.mate=m; ATT.rigs.push(m);
  const blocked=(x,z)=>world.obs.some(b=>x>b.minX-1&&x<b.maxX+1&&z>b.minZ-1&&z<b.maxZ+1);
  for(let i=0;i<3;i++){ let x=o.x+1-i*4.5, z=o.z+21+(i%2)*2.5; for(let k=0;k<20&&blocked(x,z);k++){ x+=(Math.random()-.5)*3; z+=(Math.random()-.5)*3; } const r=new Rig('enemy'); r.setWeapon(i===1?'smg':'rifle'); scene.add(r.root); ATT.rigs.push(r); ATT.foes.push({r,p:new THREE.Vector3(x,0,z),die:0,dt:-1}); } }
function attractReset(){ ATT.p0=ATT.o.clone(); ATT.ph=0; for(const f of ATT.foes){ f.dt=-1; } ATT.shot=0; ATT.kill=0; }
function menuScene(dt){ menuT+=dt; if(!P)return; if(!ATT.mate)attractSetup(); const L=24, t=menuT%L; if(t<ATT.t)attractReset(); ATT.t=t; if(!ATT.p0)attractReset();
  const o=ATT.o, seg=t<8?0:t<15?1:2, mt=ATT.mate; let move=0, aim=1, fire=false;
  if(seg===0){ P.pos.copy(o); }
  else if(seg===1){ move=1; aim=.4; P.pos.set(o.x,0,o.z+(t-8)*2.0); }
  else { P.pos.set(o.x,0,o.z+14); aim=1; }
  ATT.ph+=dt*move*9; const mp=V2.set(P.pos.x+(seg===2?-1.5:1.5),0,P.pos.z-1.1);
  // camera per shot
  if(seg===0){ const a=menuT*0.12; camera.position.set(o.x+Math.sin(a)*4.8,1.7,o.z+Math.cos(a)*4.8); camera.lookAt(o.x+.6,1.2,o.z); camera.fov=50; }
  else if(seg===1){ const k=(t-8)/7; camera.position.set(P.pos.x-2.6+k*.8,0.75,P.pos.z+5.2-k*.6); camera.lookAt(P.pos.x+.4,1.15,P.pos.z); camera.fov=46; }
  else { const k=(t-15)/9; camera.position.set(P.pos.x+2.2-k*.4,1.8-k*.2,P.pos.z-4.2+k*.8); camera.lookAt(P.pos.x-2.2,1.1,P.pos.z+8); camera.fov=44; }
  camera.updateProjectionMatrix();
  // squad
  const alive=ATT.foes.filter(f=>f.dt<0); const tgt=seg===2&&alive.length?alive[0]:null;
  const yaw=tgt?Math.atan2(tgt.p.x-P.pos.x,tgt.p.z-P.pos.z):(seg===0?0.3:0);
  P.rig.root.position.copy(P.pos); P.rig.root.rotation.y=yaw; P.rig.pose({aim,pitch:0.02,phase:ATT.ph,move,sprint:0},dt);
  mt.root.position.copy(mp); mt.root.rotation.y=tgt?Math.atan2(tgt.p.x-mp.x,tgt.p.z-mp.z):(seg===0?-0.2:0); mt.pose({aim,pitch:0.02,phase:ATT.ph+1.3,move,crouch:seg===2?1:0},dt);
  // firefight
  if(seg===2){ const st=t-15; if(st>1.0&&tgt){ ATT.shot-=dt; if(ATT.shot<=0){ ATT.shot=0.11; const sh=Math.random()<.5?P.rig:mt; if(sh.muzzle){ const m=sh.muzzle.getWorldPosition(V3B); const e=V1.set(tgt.p.x+(Math.random()-.5)*.5,1.0+Math.random()*.7,tgt.p.z); fx.tracer(m,e,[1,.75,.35]); fx.muzzle(m,V2.subVectors(e,m).normalize(),.9); if(Math.random()<.35)fx.hitFx(e,V2.clone().negate(),false); } }
      ATT.kill+=dt; if(ATT.kill>1.6){ ATT.kill=0; tgt.dt=0; if(alive.length===2) fx.explosion(V1.set(tgt.p.x+1.5,0,tgt.p.z+1),0.7); } }
    for(const f of alive) if(f!==tgt||st<1){ if(Math.random()<dt*3&&f.r.muzzle){ const m=f.r.muzzle.getWorldPosition(V3B); fx.tracer(m,V1.set(P.pos.x+(Math.random()-.5)*3,1+Math.random(),P.pos.z+(Math.random()-.5)*2),[1,.55,.3]); fx.muzzle(m,V2.subVectors(V1,m).normalize(),.8); } } }
  for(const f of ATT.foes){ const r=f.r; r.root.position.copy(f.p); if(f.dt>=0){ f.dt+=dt; r.pose({dead:f.dt,deadDir:1},dt); } else { r.root.rotation.y=Math.atan2(P.pos.x-f.p.x,P.pos.z-f.p.z); r.pose({aim:seg===2?1:0,pitch:0,phase:0,move:0,crouch:0},dt); } r.lod&&r.lod(camera.position.distanceTo(f.p)); }
  fx.update(dt,camera);
  if(seg<2&&Math.random()<dt*0.35){ const p=new THREE.Vector3(o.x+(Math.random()-.5)*40,0,o.z+28+Math.random()*16); fx.explosion(p,0.6); } }
// ---------------- input ----------------
let locked=false; const pressed={};
function lockPointer(){ if(!TOUCH&&canvas.requestPointerLock&&!window.SF_TEST){ try{canvas.requestPointerLock();}catch(e){} } }
document.addEventListener('pointerlockchange',()=>{ locked=document.pointerLockElement===canvas; if(!locked&&G.state==='play'&&!TOUCH&&!window.SF_TEST) pause(); });
addEventListener('keydown',e=>{ if(e.repeat)return; keys[e.code]=true; pressed[e.code]=true; if(e.code==='Escape'||e.code==='KeyP'){ if(G.state==='play')pause(); } if(e.code==='Space'&&G.state==='cine')endCine(); if(['Space','Tab'].includes(e.code))e.preventDefault(); });
addEventListener('keyup',e=>{ keys[e.code]=false; });
canvas.addEventListener('mousedown',e=>{ A.init(); if(G.state==='play'&&!locked&&!TOUCH)lockPointer(); if(e.button===0)keys.M0=true; if(e.button===2)keys.M2=true; });
addEventListener('mouseup',e=>{ if(e.button===0)keys.M0=false; if(e.button===2)keys.M2=false; });
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{ if(locked&&G.state==='play'&&P){ const s=0.0022*(P.aimK>0.5?(P.st.scope?0.3:0.6):1); const ss=s*save.set.sens; P.camYaw-=e.movementX*ss; P.camPitch=clamp(P.camPitch-e.movementY*ss*(save.set.inv?-1:1),-1.0,1.1); } });
addEventListener('wheel',e=>{ if(G.state==='play')pressed.Swap=true; });
// touch
const T={stick:null,look:null,btn:{}};
function setupTouch(){ const st=$('stick'), kn=$('knob');
  st.addEventListener('touchstart',e=>{ e.preventDefault(); A.init(); const t=e.changedTouches[0]; const r=st.getBoundingClientRect(); T.stick={id:t.identifier,cx:r.left+r.width/2,cy:r.top+r.height/2,r:r.width/2}; mvStick(t); },{passive:false});
  const mvStick=t=>{ const s=T.stick; let dx=(t.clientX-s.cx)/s.r, dy=(t.clientY-s.cy)/s.r; const l=Math.hypot(dx,dy); if(l>1){dx/=l;dy/=l;} input.mx=dx; input.my=-dy; kn.style.transform=`translate(${dx*s.r*0.6}px,${dy*s.r*0.6}px)`; };
  addEventListener('touchmove',e=>{ for(const t of e.changedTouches){ if(T.stick&&t.identifier===T.stick.id)mvStick(t); else if(T.look&&t.identifier===T.look.id&&P){ const dx=t.clientX-T.look.x, dy=t.clientY-T.look.y; T.look.x=t.clientX; T.look.y=t.clientY; const s=0.0055*(P.aimK>0.5?(P.st.scope?0.3:0.55):1); const ss=s*save.set.sens; P.camYaw-=dx*ss; P.camPitch=clamp(P.camPitch-dy*ss*(save.set.inv?-1:1),-1,1.1); } } },{passive:false});
  const end=e=>{ for(const t of e.changedTouches){ if(T.stick&&t.identifier===T.stick.id){ T.stick=null; input.mx=input.my=0; kn.style.transform=''; } if(T.look&&t.identifier===T.look.id)T.look=null; for(const k in T.btn) if(T.btn[k]===t.identifier){ T.btn[k]=null; const b=$(k); b&&b.classList.remove('dn'); } } };
  addEventListener('touchend',end); addEventListener('touchcancel',end);
  canvas.addEventListener('touchstart',e=>{ e.preventDefault(); A.init(); for(const t of e.changedTouches){ if(t.clientX>innerWidth*0.35&&!T.look) T.look={id:t.identifier,x:t.clientX,y:t.clientY}; } },{passive:false});
  for(const b of document.querySelectorAll('#tbtns .tb')){ b.addEventListener('touchstart',e=>{ e.preventDefault(); e.stopPropagation(); A.init(); const t=e.changedTouches[0]; T.btn[b.id]=t.identifier; b.classList.add('dn'); pressed[b.id]=true; if(b.id==='tAim')input.aimToggle=!input.aimToggle; if(b.id==='tSprint')input.sprintToggle=!input.sprintToggle;
      if(b.id==='tFire'&&!T.look) T.look={id:t.identifier,x:t.clientX,y:t.clientY}; },{passive:false}); }
}
function gatherInput(dt){ const k=keys;
  if(!TOUCH){ input.mx=(k.KeyD?1:0)-(k.KeyA?1:0); input.my=(k.KeyW?1:0)-(k.KeyS?1:0); input.fire=!!k.M0; input.aim=!!k.M2; input.sprint=!!(k.ShiftLeft||k.ShiftRight); input.nade=!!k.KeyG; input.useHeld=!!k.KeyE; }
  else { input.fire=T.btn.tFire!=null; input.aim=!!input.aimToggle||input.fire&&false; input.sprint=!!input.sprintToggle; input.nade=T.btn.tNade!=null; input.useHeld=T.btn.tUse!=null; if(input.fire)input.sprintToggle=false; }
  input.crouchP=pressed.KeyC||pressed.ControlLeft||pressed.tCrouch; input.rollP=pressed.Space||pressed.tRoll; input.reloadP=pressed.KeyR||pressed.tReload; input.knifeP=pressed.KeyF||pressed.KeyV||pressed.tKnife; input.coverP=pressed.KeyQ||pressed.tCover; input.swapP=pressed.Digit1||pressed.Digit2||pressed.Swap||pressed.tSwap||pressed.Tab;
  for(const key in pressed) pressed[key]=false; if(TOUCH&&$('tAim'))$('tAim').classList.toggle('on',!!input.aimToggle); if(TOUCH&&$('tSprint'))$('tSprint').classList.toggle('on',!!input.sprintToggle); }
// ---------------- HUD ----------------
const hud={
  t:0, killQ:[],
  weapon(){ if(!P)return; const a=P.ammo[P.w], st=P.st; $('wname').textContent=st.name; $('ammo').innerHTML=`${a.mag}<small>/${P.w==='pistol'?'∞':a.res}</small>`; $('ammo').classList.toggle('low',a.mag<=Math.ceil(st.mag*0.25)); $('nades').innerHTML=ic('grenade')+' '+P.nades; },
  objective(){ $('obj').textContent=objText(); },
  money(c){ const m=$('cash'); m.textContent='+$'+c; m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop'); },
  pop(t,col='#fff'){ const d=document.createElement('div'); d.className='popm'; d.textContent=t; d.style.color=col; $('pops').appendChild(d); setTimeout(()=>d.remove(),2200); },
  kill(msg,cash,streak){ const k=$('killmsg'); k.innerHTML=(msg?`<b>${msg}</b>`:'<b>ELIMINATED</b>')+`<span>+$${cash}</span>`+(streak>=2?`<i>x${streak} COMBO</i>`:''); k.classList.remove('show'); void k.offsetWidth; k.classList.add('show'); this.objective(); },
  hitmark(head,kill){ const h=$('hitm'); h.className=''; void h.offsetWidth; h.className='show'+(head?' head':'')+(kill?' kill':''); },
  cross(){ $('cross').style.setProperty('--s',(10+P.spreadK*22)+'px'); },
  dmg(from){ if(!from||!from.pos){ return; } const a=Math.atan2(from.pos.x-P.pos.x,from.pos.z-P.pos.z)-P.camYaw; const d=document.createElement('div'); d.className='dmgdir'; d.style.transform=`rotate(${-a}rad)`; $('dmgdirs').appendChild(d); setTimeout(()=>d.remove(),900); },
  boss(f,name){ const b=$('bossbar'); if(f<0){ b.classList.add('hide'); return; } b.classList.remove('hide'); if(name)b.querySelector('span').textContent=name; b.querySelector('i').style.width=(f*100)+'%'; },
  prompt(t){ const p=$('prompt'); if(p._t!==t){p._t=t;p.innerHTML=t;} p.classList.toggle('show',!!t); },
  update(dt){ $('hpb').style.width=(P.hp/P.maxHp*100)+'%'; $('arb').style.width=(P.armor/P.maxArmor*100)+'%'; $('time').textContent=fmt(G.time); $('slowv').classList.toggle('on',G.slowT>0); $('cross').classList.toggle('aim',P.aimK>0.5);
    $('cookbar').style.width=P.cooking?(Math.min(1,P.cooking/3.5)*100)+'%':'0'; $('cookbar').parentElement.classList.toggle('show',!!P.cooking);
    $('relbar').style.width=P.reload>0?((1-P.reload/P.st.rel)*100)+'%':'0'; $('relbar').parentElement.classList.toggle('show',P.reload>0);
    this.t-=dt; if(this.t<=0){ this.t=0.1; this.radar(); } },
  radar(){ const c=$('radar'), g=c.getContext('2d'), W=c.width, R=W/2, sc=R/40; g.clearRect(0,0,W,W); g.save(); g.translate(R,R); g.beginPath(); g.arc(0,0,R-1,0,7); g.fillStyle='rgba(10,20,25,.55)'; g.fill(); g.strokeStyle='rgba(120,220,255,.5)'; g.stroke(); g.clip();
    g.rotate(P.camYaw+Math.PI); const sw=(G.time*2)%(Math.PI*2); g.fillStyle='rgba(80,255,180,.08)'; g.beginPath(); g.moveTo(0,0); g.arc(0,0,R,sw,sw+0.6); g.fill();
    const pt=(x,z)=>[-(x-P.pos.x)*sc,(z-P.pos.z)*sc];
    g.fillStyle='rgba(200,220,230,.25)'; for(const o of world.obs){ if(o.dead)continue; const [x1,y1]=pt(o.minX,o.minZ),[x2,y2]=pt(o.maxX,o.maxZ); g.fillRect(Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1),Math.abs(y2-y1)); }
    for(const e of enemies){ if(e.dead)continue; const [x,y]=pt(e.pos.x,e.pos.z); g.fillStyle=e.type==='boss'?'#ff2a5a':e.state==='combat'?'#ff4030':'#ffb040'; g.beginPath(); g.arc(x,y,e.type==='boss'?5:3,0,7); g.fill(); }
    for(const t of world.targets){ if(t.dead||t.planted)continue; const [x,y]=pt((t.minX+t.maxX)/2,(t.minZ+t.maxZ)/2); g.fillStyle='#ffe040'; g.fillRect(x-4,y-4,8,8); }
    if(G.extractOn){ const [x,y]=pt(world.extract.x,world.extract.z); g.strokeStyle='#40ffa0'; g.lineWidth=2; g.beginPath(); g.arc(x,y,6,0,7); g.stroke(); }
    g.restore(); g.fillStyle='#7ff'; g.beginPath(); g.moveTo(R,R-6); g.lineTo(R-4,R+4); g.lineTo(R+4,R+4); g.fill(); }
};
const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
// ---------------- screens ----------------
function curtain(){ let f=document.getElementById('fade'); if(!f){ f=document.createElement('div'); f.id='fade'; document.body.appendChild(f); } f.classList.add('on'); void f.offsetWidth; requestAnimationFrame(()=>requestAnimationFrame(()=>f.classList.remove('on'))); }
function show(id){ if(id==='title')survLabel(); for(const p of document.querySelectorAll('.panel'))p.classList.add('hide'); $('screen').classList.toggle('hide',!id); $('hud').style.visibility=id?'hidden':''; if(id){ const p=$(id); p.classList.remove('hide'); p.classList.remove('enter'); void p.offsetWidth; p.classList.add('enter'); } }
function trans(fn){ const t=$('trans'); t.classList.add('on'); A.whoosh(); setTimeout(()=>{ fn(); setTimeout(()=>t.classList.remove('on'),80); },420); }
function survLabel(){ const b=$('survBest'); if(b)b.textContent=(save.best&&save.best.survival)?'BEST: WAVE '+save.best.survival:'ENDLESS WAVES'; }
function toMenu(){ SDK.gameplayStop(); A.music(true,0); G.state='menu'; $('hud').classList.add('hide'); $('touch').classList.add('hide'); hud.boss(-1); if(document.exitPointerLock)document.exitPointerLock();
  if(!P||!world.root){ startMenuScene(); } show('title'); $('tmoney').textContent='$'+save.money; survLabel(); if(!window.SF_TEST||/daily/.test(location.search)) setTimeout(()=>{ if(G.state==='menu'&&!$('title').classList.contains('hide')) META.dailyCheck(); },900); }
function startMenuScene(){ clearLevel(); world.lib=lib; world.build(0); setTheme(THEMES.mountain); P=new Player(); P.pos.set(0,0,-world.H+8); enemies.length=0; }
function mapScreen(){ const m=$('missions'); m.innerHTML=''; MISSIONS.forEach((M,i)=>{ const lock=i>=save.unlocked; const st=save.stars[i]||0; const d=document.createElement('button'); d.className='mcard th-'+M.theme+(lock?' lock':''); d.style.animationDelay=(i*0.05)+'s';
  d.innerHTML=`<div class="mn">${String(i+1).padStart(2,'0')}</div><div class="mt">${M.name}</div><div class="ml">${M.loc}</div><div class="ms">${ic('star').repeat(st)}<em>${ic('star').repeat(3-st)}</em></div>${M.obj==='boss'?'<div class="mb">BOSS</div>':''}${lock?'<div class="mlk">'+ic('lock')+'</div>':''}`;
  if(!lock) d.onclick=()=>{ A.ui(); brief(i); }; m.appendChild(d); }); show('map'); }
function brief(i){ const M=MISSIONS[i]; $('bname').textContent='MISSION '+(i+1)+' · '+M.name; $('bloc').textContent=M.loc; $('bobj').textContent=M.brief; $('bthreat').textContent=`Hostiles: ${M.enemies}+ · Elites: ${M.elite}${M.boss?' · Boss: '+M.boss:''}`;
  const sel=$('bload'); sel.innerHTML=''; for(const w of save.owned) if(w!=='pistol'){ const b=document.createElement('button'); b.className='lw'+(save.primary===w?' on':''); b.textContent=WEAPONS[w].name; b.onclick=()=>{ save.primary=w; persist(); brief(i); A.ui(); }; sel.appendChild(b); }
  $('deploy').onclick=async()=>{ A.ui(); await Promise.race([lib.aiLoad,new Promise(r=>setTimeout(r,8000))]); trans(()=>{ show(null); startMission(i); }); }; show('briefing'); }
function shop(){ $('smoney').textContent='$'+save.money; const L=$('wlist'); L.innerHTML='';
  for(const w of WORDER){ const W=WEAPONS[w], own=save.owned.includes(w), st=wstat(w); const d=document.createElement('div'); d.className='witem'+(own?' own':'')+(prevW===w?' sel':''); d.onclick=e=>{ if(e.target.tagName!=='BUTTON'){ prevW=w; for(const x of L.children)x.classList.remove('sel'); d.classList.add('sel'); setPrev(w); skins(); atts();} };
    const bar=(v,m)=>`<b><i style="width:${clamp(v/m,0,1)*100}%"></i></b>`;
    d.innerHTML=`<div class="wn"><img class="wic" src="assets/icons/w_${w}.webp" alt="" onerror="this.remove()">${W.name}${save.primary===w?' <span class="eq">EQUIPPED</span>':''}${G.trial===w?' <span class="trial">TRIAL READY</span>':''}</div><div class="wst"><label>DMG</label>${bar(st.dmg*(W.pellets||1),180)}<label>RATE</label>${bar(W.rpm,900)}<label>MAG</label>${bar(st.mag,100)}<label>RANGE</label>${bar(W.range,250)}</div>`;
    const act=document.createElement('div'); act.className='wact';
    if(!own){ const b=document.createElement('button'); b.textContent='BUY $'+W.price; b.disabled=save.money<W.price; b.onclick=()=>{ save.money-=W.price; save.owned.push(w); if(w!=='pistol')save.primary=w; persist(); A.buy(); shop(); }; act.appendChild(b); if(w!=='pistol'&&G.trial!==w){ const t=document.createElement('button'); t.className='adb'; t.innerHTML=il('ad','TRY 1 MISSION'); t.onclick=async()=>{ const r=await SDK.rewarded(); if(adOK(r)){ G.trial=w; toast(W.name+' UNLOCKED FOR NEXT MISSION','#7ff0b0'); A.buy(); shop(); } else toast('AD NOT AVAILABLE','#f88'); }; act.appendChild(t); } }
    else { if(w!=='pistol'&&save.primary!==w){ const b=document.createElement('button'); b.textContent='EQUIP'; b.onclick=()=>{ save.primary=w; persist(); A.ui(); shop(); }; act.appendChild(b); }
      for(const [k,lab] of [['dmg','DMG'],['mag','MAG'],['rel','RELOAD']]){ const l=upLvl(w,k); const cost=Math.round((W.price||600)*0.3+250)*(l+1); const b=document.createElement('button'); b.className='up'; b.innerHTML=`${lab} <i class="pips">${'<b class=on></b>'.repeat(l)}${'<b></b>'.repeat(3-l)}</i>`+(l<3?`<small>$${cost}</small>`:''); b.disabled=l>=3||save.money<cost; b.onclick=()=>{ save.money-=cost; save.up[w]=save.up[w]||{}; save.up[w][k]=l+1; persist(); A.buy(); shop(); }; act.appendChild(b); } }
    d.appendChild(act); L.appendChild(d); }
  const G2=$('gear'); G2.innerHTML=''; for(const [k,lab,base] of [['armor','ARMOR PLATES (+25)',700],['nades','GRENADE POUCH (+1)',500]]){ const l=save[k]; const cost=base*(l+1); const b=document.createElement('button'); b.innerHTML=`${lab} <i class="pips">${'<b class=on></b>'.repeat(l)}${'<b></b>'.repeat(3-l)}</i> `+(l<3?`<small>$${cost}</small>`:''); b.disabled=l>=3||save.money<cost; b.onclick=()=>{ save.money-=cost; save[k]++; persist(); A.buy(); shop(); }; G2.appendChild(b); }
  { const h=document.createElement('h3'); h.textContent='OPERATOR'; h.className='oph'; G2.appendChild(h); const row=document.createElement('div'); row.className='ops'; G2.appendChild(row); save.ops=save.ops||['std']; const cur=save.op||'std';
    for(const o of OPS){ const own=save.ops.includes(o.id); const b=document.createElement('button'); b.className='opb'+(cur===o.id?' on':''); b.innerHTML=`<i style="background:${o.c}"></i>${o.name}<small>${own?(cur===o.id?'EQUIPPED':'EQUIP'):o.ad?'▶ AD':'$'+o.price}</small>`; if(!own&&!o.ad&&save.money<o.price)b.classList.add('poor');
      b.onclick=async()=>{ if(!own){ if(o.ad){ const r=await SDK.rewarded(); if(!adOK(r)){ toast("AD NOT AVAILABLE","#f88"); return; } } else { if(save.money<o.price){ toast('NOT ENOUGH FUNDS','#f88'); return; } save.money-=o.price; } save.ops.push(o.id); A.buy(); toast(o.name+' UNLOCKED','#7ff0b0'); } save.op=o.id; persist(); A.ui(); shop(); };
      row.appendChild(b); } }
  show('shop'); if(!prevW)prevW=save.primary; setPrev(prevW); startPrev(); skins(); atts(); }
function slotsOf(w){ const M=MOUNT[w]||{}; return Object.keys(ATTS).filter(k=>k==='muzzle'?M.muzzle!==undefined:!!M[k]); }
function atts(){ const box=$('attBox'); if(!box)return; box.innerHTML=''; const w=prevW; const owned=w==='pistol'||save.owned.includes(w);
  if(!owned){ box.innerHTML='<p class="dim">Buy this weapon to unlock attachments</p>'; return; }
  const sl=slotsOf(w); if(!sl.length){ box.innerHTML='<p class="dim">No attachment slots on this weapon</p>'; return; }
  save.att=save.att||{}; save.attOwn=save.attOwn||{}; const eq=save.att[w]=save.att[w]||{}; const own=save.attOwn[w]=save.attOwn[w]||[];
  for(const k of sl){ const g=document.createElement('div'); g.className='atg'; g.innerHTML=`<label>${SLOTNAME[k]}</label>`;
    const mk=(o)=>{ const b=document.createElement('button'); const on=o?eq[k]===o.id:!eq[k]; const has=!o||own.includes(o.id); b.className='atb'+(on?' on':'')+(has?' own':'');
      b.innerHTML=o?`<b>${o.name}</b><small>${on?'EQUIPPED':has?'EQUIP':'$'+o.price}</small>`:'<b>NONE</b><small>'+(on?'EQUIPPED':'REMOVE')+'</small>'; if(o)b.title=o.d;
      if(o&&!has&&save.money<o.price)b.classList.add('poor');
      b.onclick=()=>{ if(o&&!has){ if(save.money<o.price){ toast('NOT ENOUGH FUNDS','#f88'); return; } save.money-=o.price; own.push(o.id); A.buy(); toast(o.name+' UNLOCKED','#7ff0b0'); } else A.ui(); if(o)eq[k]=o.id; else delete eq[k]; persist(); setPrev(w); shop(); };
      g.appendChild(b); };
    mk(null); for(const o of ATTS[k])mk(o); box.appendChild(g); } }
function skins(){ if(prevW==='pistol'||save.owned.includes(prevW)) META.skinPanel(prevW,()=>{ setPrev(prevW); skins(); $('smoney').textContent='$'+save.money; }); else $('skinBox').innerHTML='<p class="dim">Buy this weapon to unlock skins</p>'; }
let shopBack='title';
function toast(t,c){ let e=$('toast'); if(!e){ e=document.createElement('div'); e.id='toast'; document.body.appendChild(e);} e.textContent=t; e.style.color=c||'#fff'; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); }
let prevW=null, PV=null;
function adOK(r){ return r==='ok'||(r==='unavailable'&&window.SF_TEST); }
async function adCoins(){ const r=await SDK.rewarded(); if(adOK(r)){ save.money+=400; persist(); A.buy(); toast('+$400','#7ff0b0'); $('tmoney').textContent='$'+save.money; if(!$('shop').classList.contains('hide'))shop(); } else toast('AD NOT AVAILABLE','#f88'); }
function setPrev(w){ $('wprevName').textContent=WEAPONS[w].name; if(!PV)return; if(PV.m)PV.piv.remove(PV.m); const m=lib.weapons[w].clone(); m.position.set(0,0,0); m.updateMatrixWorld(true); const b=new THREE.Box3().setFromObject(m), c=b.getCenter(new THREE.Vector3()), sz=b.getSize(new THREE.Vector3()); m.position.sub(c); const k=Math.min(5.4/Math.max(sz.x,sz.z),1.7/sz.y); PV.piv.scale.setScalar(k); META.applySkin(m,w); if(save.owned.includes(w)||w==='pistol') addAtts(m,w,attEq(w),{}); PV.piv.add(m); PV.m=m; PV.t=0; }
function startPrev(){ const cv=$('wprev'); if(!PV){ const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true}); r.setPixelRatio(Math.min(TOUCH?1.5:2,devicePixelRatio)); r.toneMapping=THREE.ACESFilmicToneMapping; r.outputColorSpace=THREE.SRGBColorSpace; r.toneMappingExposure=1.7;
    const sc=new THREE.Scene(); const cam=new THREE.PerspectiveCamera(10,4,0.1,60); cam.position.set(0,1.6,12); cam.lookAt(0,0,0);
    sc.add(new THREE.HemisphereLight(0xdfe8ff,0x3a2a18,1.4)); const k=new THREE.DirectionalLight(0xffe2b0,3); k.position.set(2,3,2); sc.add(k); const rim=new THREE.DirectionalLight(0x6fb8ff,2.5); rim.position.set(-3,1,-2); sc.add(rim);
    const pm=new THREE.PMREMGenerator(r); const es=new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10,16,8),new THREE.MeshBasicMaterial({side:THREE.BackSide,color:0x8899aa}))); const lt=new THREE.Mesh(new THREE.PlaneGeometry(6,3),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide})); lt.position.set(0,6,2); lt.lookAt(0,0,0); es.add(lt); sc.environment=pm.fromScene(es).texture;
    const piv=new THREE.Group(); sc.add(piv); PV={r,sc,cam,piv,m:null,t:0};  setPrev(prevW); }
  if(PV.run)return; PV.run=true; let lt=performance.now();
  const loop=now=>{ if($('shop').classList.contains('hide')){ PV.run=false; return; } const dt=Math.max(0,Math.min(0.05,(now-lt)/1000)); lt=now; PV.t+=dt; const w=cv.clientWidth|0, h=cv.clientHeight|0; if(w&&h&&(cv.width!==Math.floor(w*PV.r.getPixelRatio())||cv.height!==Math.floor(h*PV.r.getPixelRatio()))){ PV.r.setSize(w,h,false); PV.cam.aspect=w/h; PV.cam.updateProjectionMatrix(); }
    PV.piv.rotation.set(0.12+Math.sin(PV.t*0.7)*0.06, -Math.PI/2+0.35+PV.t*0.8, 0); const s0=PV.piv.scale.x; if(PV.m){ const e=Math.min(1,PV.t*3); PV.m.scale.setScalar(0.6+0.4*(1-Math.pow(1-e,3))); } PV.r.render(PV.sc,PV.cam); requestAnimationFrame(loop); };
  requestAnimationFrame(loop); }
function complete(){ if(G.state!=='play')return; G.state='done'; SDK.gameplayStop(); SDK.happytime(); A.music(false); A.win(); hud.prompt(''); if(document.exitPointerLock)document.exitPointerLock();
  const M=G.M; const acc=G.shots?G.hits/G.shots:0; const par=240+G.mi*30; const stars=1+(acc>=0.35?1:0)+(G.time<par?1:0); const reward=500+G.mi*250; const total=reward+G.earned+stars*100;
  G.lastTotal=total; G.doubled=false; G.trialMi=-1; save.money+=total; save.stars[G.mi]=Math.max(save.stars[G.mi]||0,stars); save.unlocked=Math.max(save.unlocked,Math.min(MISSIONS.length,G.mi+2)); persist(); META.ev('missions'); if(stars===3)META.ev('star3'); if(P.hp>=90)META.ev('clean');
  setTimeout(()=>{ show('done'); $('dtitle').textContent=M.final?'WAR IS OVER':'MISSION COMPLETE'; $('dsub').textContent=M.name;
    const rows=[['ELIMINATIONS',G.kills],['HEADSHOTS',G.heads],['ACCURACY',Math.round(Math.min(1,acc)*100)+'%'],['TIME',fmt(G.time)],['COMBAT CASH','$'+G.earned],['MISSION REWARD','$'+reward],['STAR BONUS','$'+stars*100],['TOTAL','$'+total]];
    const s=$('dstats'); s.innerHTML=''; rows.forEach((r,i)=>{ const d=document.createElement('div'); d.className='row'+(i===rows.length-1?' tot':''); d.style.animationDelay=(0.4+i*0.12)+'s'; d.innerHTML=`<span>${r[0]}</span><b>${r[1]}</b>`; s.appendChild(d); });
    const st=$('dstars'); st.innerHTML=''; for(let i=0;i<3;i++){ const e=document.createElement('span'); e.innerHTML=ic('star'); e.className=i<stars?'on':''; e.style.animationDelay=(1.6+i*0.25)+'s'; st.appendChild(e); }
    $('dnext').classList.toggle('hide',G.mi>=MISSIONS.length-1); const db=$('ddouble'); db.disabled=false; db.innerHTML=il('ad','x2 REWARD'); db.classList.remove('hide'); },G.slowT>0?1800:900); }
function survBank(extra){ const add=Math.max(0,G.earned-G.banked)+(extra||0); G.banked=G.earned; if(add>0){ save.money+=add; G.survPay+=add; } save.best=save.best||{}; const done=Math.max(0,G.wave-1); if(done>(save.best.survival||0)){ save.best.survival=done; G.newBest=true; } persist(); return add; }
function survWaveDone(){ G.survBreak=true; const n=G.wave; const bonus=150+n*75; survBank(bonus); hud.pop('WAVE '+n+' CLEARED · +$'+bonus,'#5f9'); A.win&&0;
  if(n%5===0&&P){ P.hp=P.maxHp; P.armor=P.maxArmor; P.nades=Math.max(P.nades,3+save.nades); for(const w in P.ammo){ const st=wstat(w); P.ammo[w].res=w==='pistol'?9999:st.mag*4; } setTimeout(()=>{ if(G.state==='play')hud.pop('RESUPPLY · HEALTH & AMMO','#7ff0b0'); },1200); }
  const next=async()=>{ if(G.state!=='play'||!G.survival)return;
    // midgame ad at a natural break: at most every 5 waves (the SDK wrapper also enforces a 90s cooldown)
    if(n%5===0&&n-G.lastAdWave>=5&&!window.SF_NOAD){ G.lastAdWave=n; G.state='paused'; SDK.gameplayStop(); A.music(false); const r=await SDK.midgame(); G.state='play'; SDK.gameplayStart(); A.music(true,1); last=performance.now(); }
    // purge old bodies so endless play does not pile up rigs
    for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; if(e.dead&&e.deadT>0.3){ scene.remove(e.rig.root); freeRig(e.rig.root); if(e.mark)scene.remove(e.mark); if(e.laser)scene.remove(e.laser); if(G.finisher===e)G.finisher=null; enemies.splice(i,1); } }
    G.wave++; G.survBreak=false; hud.pop('WAVE '+G.wave+' INCOMING','#f84'); spawnWave(G.wave); hud.objective(); };
  setTimeout(next,n%5===0?5000:3500); }
function spawnWave(n){ const cnt=Math.min(4+n*2,22); const hpK=1+0.07*(n-1), dk=Math.min(2,1+0.05*(n-1)); const eliteF=Math.min(0.5,0.12+0.03*n); const heavies=n>=5?1+Math.floor(n/10):0;
  for(let i=0;i<cnt;i++){ const a=Math.random()*Math.PI*2; const p=new THREE.Vector3(Math.cos(a)*world.H*0.8,0,Math.sin(a)*world.H*0.7); world.collide(p,0.5);
    const t=i<heavies?'heavy':Math.random()<eliteF?'elite':(n>=3&&Math.random()<0.25)?'breacher':'grunt'; const e=addEnemy(t,p,{alert:true}); e.hp*=hpK; e.maxHp=e.hp; e.dk=dk; } }
function gameOver(){ G.state='dead'; if(G.survival){ G.newBest=false; survBank(0); } SDK.gameplayStop(); A.music(false); A.lose(); slowmo(1.2,0.3); if(document.exitPointerLock)document.exitPointerLock(); setTimeout(()=>{ show('dead'); $('dinfo').textContent=G.survival?`SURVIVED ${G.wave-1} WAVES · BEST ${save.best.survival||0}${G.newBest?' (NEW!)':''} · ${G.kills} KILLS · +$${G.survPay}`:`${G.kills} eliminations · ${fmt(G.time)}`; },1600); }
function pause(){ if(G.state!=='play')return; G.state='paused'; SDK.gameplayStop(); show('pausep'); }
function resume(){ show(null); G.state='play'; SDK.gameplayStart(); lockPointer(); last=performance.now(); }
async function betweenAd(fn){ SDK.gameplayStop(); await SDK.midgame(); fn(); }
function bindUI(){ const on=(id,f)=>$(id).addEventListener('click',()=>{ A.init(); A.ui(); f(); });
  on('play',()=>trans(mapScreen)); on('armory',()=>{ shopBack='title'; trans(shop); }); on('mapBack',()=>trans(()=>show('title'))); on('bBack',()=>mapScreen()); on('bShop',()=>{ shopBack='map'; shop(); });
  on('shopBack',()=>{ shopBack==='map'?mapScreen():(show('title'),$('tmoney').textContent='$'+save.money); });
  on('dnext',()=>betweenAd(()=>trans(()=>{ show(null); startMission(G.mi+1); }))); on('dshop',()=>betweenAd(()=>{ shopBack='map'; toMenuBg(); shop(); })); on('dmenu',()=>betweenAd(()=>trans(()=>{ toMenu(); })));
  on('retry',()=>betweenAd(()=>trans(()=>{ show(null); startMission(G.mi,G.survival); })));
  on('surv',()=>trans(()=>{ show(null); startSurvival(); })); on('deadMenu',()=>trans(()=>toMenu()));
  on('revive',async()=>{ const r=await SDK.rewarded(); if(r==='ok'||r==='unavailable'&&window.SF_TEST){ P.alive=true; P.hp=P.maxHp; P.armor=P.maxArmor; P.dead=0; P.inv=2; show(null); G.state='play'; SDK.gameplayStart(); A.music(true,1); lockPointer(); } else hud.pop('AD NOT AVAILABLE','#f88'); });
  on('adCoinsT',adCoins); on('adCoinsS',adCoins);
  on('ddouble',async()=>{ if(G.doubled)return; const r=await SDK.rewarded(); if(adOK(r)){ G.doubled=true; save.money+=G.lastTotal; persist(); A.buy(); const db=$('ddouble'); db.innerHTML=il('check','DOUBLED'); db.disabled=true; const t=$('dstats').querySelector('.tot b'); if(t)t.textContent='$'+G.lastTotal*2; } else toast('AD NOT AVAILABLE','#f88'); });
  on('resume',resume); on('pmenu',()=>trans(()=>toMenu())); on('prestart',()=>trans(()=>{ show(null); startMission(G.mi,G.survival); }));
  on('mute',()=>{ $('mute').innerHTML=ic(A.toggle()?'mute':'sound'); }); on('pmute',()=>{ $('pmute').textContent=A.toggle()?'SOUND: OFF':'SOUND: ON'; });
  on('qual',()=>META.settings(()=>show('title'))); on('achBtn',()=>META.achPanel(()=>show('title'))); on('psettings',()=>META.settings(()=>show('pausep')));
  on('skip',()=>endCine()); $('pauseBtn').addEventListener('click',()=>pause());
  SDK.setAdHooks({onStart(){ A.adMute(true); },onEnd(){ A.adMute(false); }}); }
function toMenuBg(){ G.state='menu'; $('hud').classList.add('hide'); $('touch').classList.add('hide'); startMenuScene(); }
// ---------------- boot ----------------
(async()=>{ try{ SDK.initSDK(); await loadAll(); } catch(e){ console.error(e); $('loadtxt').textContent='LOAD ERROR'; return; }
  fx=new FX(scene); decals=new Decals(scene,lib.tex.decals); fx.setDecals(decals); world.decals=decals; world.DC=DC; if(save.q>=0)Q=save.q; applyQuality(); bindUI(); if(TOUCH){ setupTouch(); document.body.classList.add('touch'); }
  applyIcons();
  META.initMeta({save,persist,A,SDK,toast,adOK,TOUCH,show,getQ:()=>Q,setQ:q=>{ Q=q; save.q=Q; persist(); applyQuality(); },onMoney:()=>{ $('tmoney').textContent='$'+save.money; }});
  startMenuScene(); G.state='menu'; loop(); SDK.loadingStop(); $('loading').classList.add('gone'); toMenu(); window.SF_READY=true; })();
window.SF={composer,ATT,ATTS,MOUNT,startSurvival,spawnWave,objectiveCheck,icon:w=>{ setPrev(w); PV.piv.rotation.set(0,-Math.PI/2,0); PV.r.render(PV.sc,PV.cam); return PV.r.domElement.toDataURL('image/png'); },castShot,TT:T,setOp:v=>{save.op=v;},get SAVE(){return save;},setMenuT:v=>{menuT=v;},META,wreck,A,renderer,get fx(){return fx;},get decals(){return decals;},G,get P(){return P;},enemies,world,startMission,endCine,complete,slowmo,explode,save,lib,input,keys,pressed,shop,mapScreen,brief,setQ:q=>{Q=q;applyQuality();},sdkLog:SDK.sdkLog,get fps(){return fpsA;},camera,hud};
