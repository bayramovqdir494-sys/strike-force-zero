// VFX: GPU point particles (additive fire/sparks + alpha smoke), tracers, muzzle flashes, casings, shockwaves, light pool.
import * as THREE from 'three';
const V=new THREE.Vector3();
function spriteTex(){ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.35,'rgba(255,255,255,.55)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); }
function smokeTex(){ const N=128, c=document.createElement('canvas'); c.width=c.height=N; const g=c.getContext('2d'), im=g.createImageData(N,N);
  const H=(x,y)=>{ const t=Math.sin(x*127.1+y*311.7)*43758.5453; return t-Math.floor(t); }, VN=(x,y)=>{ const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy); return (H(ix,iy)*(1-sx)+H(ix+1,iy)*sx)*(1-sy)+(H(ix,iy+1)*(1-sx)+H(ix+1,iy+1)*sx)*sy; };
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const u=x/N-.5,v=y/N-.5, r=Math.hypot(u,v)*2; let n=0,a=1,f=4; for(let o=0;o<5;o++){ n+=VN(x/N*f+o*7,y/N*f+o*3)*a; a*=.5; f*=2; } n/=1.94;
    const fall=Math.max(0,1-r), al=Math.pow(fall,1.6)*Math.max(0,Math.min(1,0.15+(n-0.3)*1.8)); const k=(y*N+x)*4; const sh=0.78+0.32*(0.5-v)+0.15*n; im.data[k]=im.data[k+1]=im.data[k+2]=Math.min(255,sh*235); im.data[k+3]=al*200; }
  g.putImageData(im,0,0); return new THREE.CanvasTexture(c); }
function emberTex(){ const c=document.createElement('canvas'); c.width=c.height=32; const g=c.getContext('2d'); const r=g.createRadialGradient(16,16,0,16,16,16); r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.2,'rgba(255,255,255,.8)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,32,32); return new THREE.CanvasTexture(c); }
class PSys{
  constructor(scene,n,additive){ this.n=n; this.i=0; const geo=new THREE.BufferGeometry();
    this.p=new Float32Array(n*3); this.c=new Float32Array(n*4); this.s=new Float32Array(n); this.v=new Float32Array(n*3); this.life=new Float32Array(n); this.max=new Float32Array(n); this.grow=new Float32Array(n); this.g=new Float32Array(n); this.drag=new Float32Array(n); this.s0=new Float32Array(n); this.a0=new Float32Array(n); this.fade=new Float32Array(n); this.rot=new Float32Array(n); this.spin=new Float32Array(n);
    geo.setAttribute('position',new THREE.BufferAttribute(this.p,3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('color',new THREE.BufferAttribute(this.c,4).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('size',new THREE.BufferAttribute(this.s,1).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('rot',new THREE.BufferAttribute(this.rot,1).setUsage(THREE.DynamicDrawUsage));
    this.mat=new THREE.ShaderMaterial({uniforms:{map:{value:additive?spriteTex():smokeTex()},uPx:{value:1},uLit:{value:new THREE.Color(1,1,1)},uAmb:{value:new THREE.Color(.6,.6,.65)}},defines:additive?{}:{SMOKE:1},transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,
      vertexShader:`attribute float size; attribute float rot; attribute vec4 color; varying vec4 vC; varying float vR; uniform float uPx; void main(){ vC=color; vR=rot; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*uPx*300.0/max(0.5,-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader:`uniform sampler2D map; uniform vec3 uLit, uAmb; varying vec4 vC; varying float vR; void main(){ vec2 pc=gl_PointCoord-.5; float cs=cos(vR), sn=sin(vR); vec2 q=vec2(cs*pc.x-sn*pc.y,sn*pc.x+cs*pc.y)+.5; vec4 t=texture2D(map,q);
#ifdef SMOKE
 float l=clamp(0.75-pc.y*1.1,0.,1.); vec3 col=vC.rgb*mix(uAmb,uLit,l)*t.r*1.15; gl_FragColor=vec4(col,vC.a*t.a);
#else
 gl_FragColor=vec4(vC.rgb*t.rgb,vC.a*t.a);
#endif
 }`});
    this.pts=new THREE.Points(geo,this.mat); this.pts.frustumCulled=false; this.pts.renderOrder=additive?3:2; scene.add(this.pts); for(let k=0;k<n;k++)this.p[k*3+1]=-999; }
  add(x,y,z,vx,vy,vz,life,size,r,g,b,a,grow=0,grav=0,drag=0,fade=1){ const i=this.i; this.i=(i+1)%this.n;
    this.p[i*3]=x;this.p[i*3+1]=y;this.p[i*3+2]=z; this.v[i*3]=vx;this.v[i*3+1]=vy;this.v[i*3+2]=vz; this.life[i]=life;this.max[i]=life; this.s0[i]=size; this.grow[i]=grow; this.g[i]=grav; this.drag[i]=drag; this.a0[i]=a; this.fade[i]=fade;
    this.c[i*4]=r;this.c[i*4+1]=g;this.c[i*4+2]=b;this.c[i*4+3]=a; this.s[i]=size; this.rot[i]=Math.random()*6.28; this.spin[i]=(Math.random()-.5)*1.2; }
  update(dt){ const p=this.p,v=this.v; for(let i=0;i<this.n;i++){ if(this.life[i]<=0)continue; this.life[i]-=dt; if(this.life[i]<=0){p[i*3+1]=-999;this.s[i]=0;continue;}
      const d=Math.max(0,1-this.drag[i]*dt); v[i*3]*=d; v[i*3+1]=v[i*3+1]*d-this.g[i]*dt; v[i*3+2]*=d; p[i*3]+=v[i*3]*dt; p[i*3+1]+=v[i*3+1]*dt; p[i*3+2]+=v[i*3+2]*dt; if(p[i*3+1]<0.02){p[i*3+1]=0.02; v[i*3+1]*=-0.3;}
      this.rot[i]+=this.spin[i]*dt; const k=this.life[i]/this.max[i]; this.s[i]=this.s0[i]*(1+this.grow[i]*(1-k)); this.c[i*4+3]=this.a0[i]*Math.pow(k,this.fade[i]); }
    const a=this.pts.geometry.attributes; a.position.needsUpdate=a.color.needsUpdate=a.size.needsUpdate=a.rot.needsUpdate=true; }
}
export class FX{
  constructor(scene){ this.scene=scene; this.add=new PSys(scene,1600,true); this.smoke=new PSys(scene,700,false);
    // tracers
    this.trN=48; const tg=new THREE.BufferGeometry(); this.trP=new Float32Array(this.trN*6); this.trC=new Float32Array(this.trN*6); this.trL=new Float32Array(this.trN); this.trI=0;
    tg.setAttribute('position',new THREE.BufferAttribute(this.trP,3)); tg.setAttribute('color',new THREE.BufferAttribute(this.trC,3));
    this.tr=new THREE.LineSegments(tg,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})); this.tr.frustumCulled=false; scene.add(this.tr);
    this.trD=[]; for(let i=0;i<this.trN;i++)this.trD.push({a:new THREE.Vector3(),b:new THREE.Vector3(),c:[1,1,1]});
    // light pool
    this.lights=[]; for(let i=0;i<4;i++){ const l=new THREE.PointLight(0xffaa55,0,12,2); l.userData.t=0; scene.add(l); this.lights.push(l); } this.li=0;
    // muzzle flash meshes (crossed quads)
    const mt=spriteTex(); this.flashMat=new THREE.SpriteMaterial({map:mt,color:0xffc070,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
    // casings
    this.casN=60; this.cas=new THREE.InstancedMesh(new THREE.CylinderGeometry(.012,.012,.05,6),new THREE.MeshStandardMaterial({color:0xd4a040,metalness:1,roughness:.3}),this.casN); this.cas.frustumCulled=false; scene.add(this.cas);
    this.casD=[]; for(let i=0;i<this.casN;i++){ this.casD.push({p:new THREE.Vector3(0,-50,0),v:new THREE.Vector3(),r:new THREE.Euler(),w:new THREE.Vector3(),t:0}); } this.casI=0; this.M=new THREE.Matrix4(); this.Q=new THREE.Quaternion(); this.S=new THREE.Vector3(1,1,1);
    // shockwave rings
    this.rings=[]; const rg=new THREE.RingGeometry(.8,1,40); rg.rotateX(-Math.PI/2);
    for(let i=0;i<4;i++){ const m=new THREE.Mesh(rg,new THREE.MeshBasicMaterial({color:0xffd0a0,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})); m.visible=false; m.userData.t=0; scene.add(m); this.rings.push(m); } this.ri=0;
    this.sprites=[]; this.decals=[]; const dg=new THREE.PlaneGeometry(.18,.18); this.decalGeo=dg; this.decalMat=new THREE.MeshBasicMaterial({map:spriteTex(),color:0x000000,transparent:true,opacity:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
    this.scorchMat=new THREE.MeshBasicMaterial({map:spriteTex(),color:0x000000,transparent:true,opacity:.75,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
    // debris chunks (instanced, physics, per-instance colour)
    this.debN=140; const dg2=new THREE.DodecahedronGeometry(1,0); this.deb=new THREE.InstancedMesh(dg2,new THREE.MeshStandardMaterial({roughness:.9,metalness:.1}),this.debN); this.deb.frustumCulled=false; this.deb.castShadow=true; scene.add(this.deb);
    this.debD=[]; for(let i=0;i<this.debN;i++){ this.debD.push({p:new THREE.Vector3(0,-50,0),v:new THREE.Vector3(),r:new THREE.Euler(),w:new THREE.Vector3(),t:0,s:.1,sx:1,sy:1}); this.deb.setColorAt(i,new THREE.Color(0x777777)); } this.debI=0;
    // magazines dropped on reload
    this.magN=12; this.mag=new THREE.InstancedMesh(new THREE.BoxGeometry(.035,.16,.07),new THREE.MeshStandardMaterial({color:0x22252a,roughness:.5,metalness:.6}),this.magN); this.mag.frustumCulled=false; scene.add(this.mag);
    this.magD=[]; for(let i=0;i<this.magN;i++)this.magD.push({p:new THREE.Vector3(0,-50,0),v:new THREE.Vector3(),r:new THREE.Euler(),w:new THREE.Vector3(),t:0}); this.magI=0;
    // continuous emitters (burning wrecks, fires) + heat-haze sources
    this.emit=[]; this.haze=[];
    // embers (additive, small) share the additive system; weather built on demand
    this.q=2; this.weather=null; this.dustCol=[.8,.72,.6]; }
  setDecals(d){ this.decalsSys=d; }
  setTheme(T,name){ { const gc=new THREE.Color(T.ground).lerp(new THREE.Color(0xd8ccb8),.4); this.dustCol=[gc.r,gc.g,gc.b]; } const lit=new THREE.Color(T.sun).multiplyScalar(Math.min(1.2,T.sunI/2.6)), amb=new THREE.Color(T.hemi[0]).lerp(new THREE.Color(T.fog),.5).multiplyScalar(.75*T.hemi[2]);
    this.smoke.mat.uniforms.uLit.value.copy(lit).add(amb.clone().multiplyScalar(.4)); this.smoke.mat.uniforms.uAmb.value.copy(amb);
    this.setWeather(name==='snow'?'snow':name==='night'||name==='jungle'?'rain':name==='fortress'||name==='refinery'?'ash':name==='desert'||name==='canyon'||name==='oasis'?'dust':null);
    for(const e of this.emit)e.t=0; this.emit.length=0; this.haze.length=0; }
  setWeather(type){ if(this.weather){ this.scene.remove(this.weather.obj); this.weather.obj.geometry.dispose(); this.weather=null; } if(!type)return;
    const qm=this.q>1?1:this.q===1?.55:.3, N=Math.round((type==='rain'?1400:type==='snow'?1600:type==='ash'?500:260)*qm), box=type==='rain'?36:40, H=type==='rain'?22:18;
    const g=new THREE.BufferGeometry(); let obj;
    if(type==='rain'){ const p=new Float32Array(N*6); for(let i=0;i<N;i++){ const x=(Math.random()-.5)*box,y=Math.random()*H,z=(Math.random()-.5)*box; p.set([x,y,z,x+.04,y-.55,z+.02],i*6); } g.setAttribute('position',new THREE.BufferAttribute(p,3));
      obj=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xa8b4c4,transparent:true,opacity:.22,depthWrite:false})); }
    else { const p=new Float32Array(N*3); for(let i=0;i<N;i++){ p[i*3]=(Math.random()-.5)*box; p[i*3+1]=Math.random()*H; p[i*3+2]=(Math.random()-.5)*box; } g.setAttribute('position',new THREE.BufferAttribute(p,3));
      const col=type==='snow'?0xffffff:type==='ash'?0xff8a40:0xe8d0a0; obj=new THREE.Points(g,new THREE.PointsMaterial({map:emberTex(),color:col,size:type==='snow'?.09:type==='ash'?.06:.05,transparent:true,opacity:type==='dust'?.5:.9,depthWrite:false,blending:type==='ash'?THREE.AdditiveBlending:THREE.NormalBlending})); }
    obj.frustumCulled=false; obj.renderOrder=4; this.scene.add(obj); this.weather={type,obj,N,box,H,t:0}; }
  fire(p,dur=12,scale=1){ this.emit.push({p:p.clone(),t:dur,t0:dur,s:scale,acc:0}); this.haze.push({p:p.clone().setY(p.y+1.5*scale),t:dur,s:scale}); }
  debris(p,n,col=0x7a7468,spd=7,size=.09){ const c=new THREE.Color(col); for(let i=0;i<n;i++){ const d=this.debD[this.debI]; const k=this.debI; this.debI=(this.debI+1)%this.debN; d.p.copy(p); const a=Math.random()*6.28, e=.3+Math.random()*1.1, s=spd*(.4+Math.random()*.8);
      d.v.set(Math.cos(a)*Math.cos(e)*s,Math.sin(e)*s,Math.sin(a)*Math.cos(e)*s); d.w.set((Math.random()-.5)*20,(Math.random()-.5)*20,(Math.random()-.5)*20); d.t=3+Math.random()*2; d.s=size*(.5+Math.random()); d.sx=.6+Math.random()*.8; d.sy=.5+Math.random()*.6;
      this.deb.setColorAt(k,c.clone().multiplyScalar(.75+Math.random()*.4)); } this.deb.instanceColor.needsUpdate=true; }
  magDrop(p,yaw){ const d=this.magD[this.magI]; this.magI=(this.magI+1)%this.magN; d.p.copy(p); d.v.set(Math.cos(yaw)*.6,-.5,-Math.sin(yaw)*.6); d.r.set(0,yaw,0); d.w.set(4+Math.random()*4,0,(Math.random()-.5)*6); d.t=20; }
  dustKick(p,n=3,s=1){ const c=this.dustCol; for(let i=0;i<n;i++) this.smoke.add(p.x+(Math.random()-.5)*.3,p.y+.05,p.z+(Math.random()-.5)*.3,(Math.random()-.5)*1.2*s,.3+Math.random()*.6*s,(Math.random()-.5)*1.2*s,.7+Math.random()*.5,.22*s,c[0],c[1],c[2],.35,3,.4,2.5,1.3); }
  light(p,color,int,dist,t){ const l=this.lights[this.li]; this.li=(this.li+1)%this.lights.length; l.position.copy(p); l.position.y=Math.max(l.position.y,1.2)+dist*.12; l.color.set(color); l.intensity=int; l.distance=dist; l.userData.t=t; l.userData.t0=t; l.userData.i0=int; }
  tracer(a,b,col=[1,.8,.4]){ const d=this.trD[this.trI]; this.trI=(this.trI+1)%this.trN; d.a.copy(a); d.b.copy(b); d.c=col; this.trL[this.trD.indexOf(d)]=1; d.k=0; d.len=a.distanceTo(b); }
  barrel(p,dt){ if(!(this.heat>0))return; this.heat=Math.max(0,this.heat-dt*.45); this.hAcc=(this.hAcc||0)+dt*Math.min(1,this.heat)*22; if(this.fireCool>0){ this.fireCool-=dt; return; } while(this.hAcc>1){ this.hAcc--; this.smoke.add(p.x+(Math.random()-.5)*.03,p.y+.02,p.z+(Math.random()-.5)*.03,(Math.random()-.5)*.12,.35+Math.random()*.25,(Math.random()-.5)*.12,1.1+Math.random()*.6,.05,.86,.86,.88,.13*Math.min(1,this.heat),.35,-.05,1.2); } }
  muzzle(p,dir,big=1,player=false){ if(player){ this.heat=Math.min(2.5,(this.heat||0)+.12*big); this.fireCool=.18; } const s=new THREE.Sprite(this.flashMat); s.position.copy(p); const k=(.35+Math.random()*.2)*big; s.scale.set(k,k,k); s.material.rotation=Math.random()*6; s.userData.t=.05; this.scene.add(s); this.sprites.push(s);
    for(let i=0;i<5;i++){ const sp=2+Math.random()*4; this.add.add(p.x,p.y,p.z,dir.x*sp+(Math.random()-.5),dir.y*sp+(Math.random()-.5),dir.z*sp+(Math.random()-.5),.06,.25*big,1,.7,.3,1,1); }
    this.smoke.add(p.x,p.y,p.z,dir.x*.6,.3,dir.z*.6,.8,.25*big,.8,.8,.8,.18,4,-.1,1.5); if(player) this.smoke.add(p.x+dir.x*.15,p.y,p.z+dir.z*.15,dir.x*1.8,.15,dir.z*1.8,.45,.12*big,.85,.85,.85,.22,2.2,0,3); this.light(p,0xffa040,player?6:3,8,.06); }
  casing(p,right){ const d=this.casD[this.casI]; this.casI=(this.casI+1)%this.casN; d.p.copy(p); d.v.set(right.x*2.5+(Math.random()-.5),2+Math.random(),right.z*2.5+(Math.random()-.5)); d.w.set(Math.random()*20,Math.random()*20,Math.random()*20); d.t=3; }
  sparks(p,n,nrm,col=[1,.75,.35]){ for(let i=0;i<n;i++){ const s=2+Math.random()*5; this.add.add(p.x,p.y,p.z,(nrm.x+(Math.random()-.5)*1.4)*s,(nrm.y+Math.random()*.8)*s,(nrm.z+(Math.random()-.5)*1.4)*s,.25+Math.random()*.25,.06,col[0],col[1],col[2],1,0,9.8,1); }
    this.smoke.add(p.x,p.y,p.z,nrm.x*.5,.4,nrm.z*.5,1,.2,.7,.68,.62,.35,5,-.2,1); }
  dust(p,col=[.8,.72,.6]){ for(let i=0;i<4;i++) this.smoke.add(p.x,p.y,p.z,(Math.random()-.5)*1.5,Math.random()*1.5,(Math.random()-.5)*1.5,1.2,.3,col[0],col[1],col[2],.5,4,1,2); }
  hitFx(p,dir,armor){ for(let i=0;i<8;i++){ const s=2+Math.random()*3; this.add.add(p.x,p.y,p.z,(-dir.x+(Math.random()-.5))*s,(Math.random())*s,(-dir.z+(Math.random()-.5))*s,.2,.08,armor?.5:1,armor?.8:.4,armor?1:.2,1,0,6,1);} }
  decal(p,n,metal=false){ if(this.decalsSys){ this.decalsSys.add(p,n,metal?.13:.16+Math.random()*.06,metal?1:0); if(n.y>.7){ this.dustKick(p,2,.6); this.debris(p,2,0x8a7a60,2.5,.025); } else { this.debris(p,2,metal?0x555a60:0x8a8478,3,.03); } return; } const m=new THREE.Mesh(this.decalGeo,this.decalMat); m.position.copy(p).addScaledVector(n,.01); m.lookAt(V.copy(p).add(n)); m.rotation.z=Math.random()*6; this.scene.add(m); this.decals.push(m); if(this.decals.length>60) this.scene.remove(this.decals.shift()); }
  explosion(p,scale=1){ const P=p;
    for(let i=0;i<26*scale;i++){ const a=Math.random()*6.28,e=Math.random()*1.4,s=(3+Math.random()*7)*scale; this.add.add(P.x,P.y+.3,P.z,Math.cos(a)*Math.cos(e)*s,Math.sin(e)*s,Math.sin(a)*Math.cos(e)*s,.4+Math.random()*.5,(.6+Math.random()*.5)*scale,.7,.34+Math.random()*.2,.08,.55,2.3,2,3,1.6); }
    for(let i=0;i<40*scale;i++){ const s=8+Math.random()*12; this.add.add(P.x,P.y+.3,P.z,(Math.random()-.5)*s,Math.random()*s,(Math.random()-.5)*s,.6+Math.random()*.6,.07,1,.8,.4,1,0,12,.5); }
    for(let i=0;i<24*scale;i++){ const s=1+Math.random()*3; this.smoke.add(P.x+(Math.random()-.5)*2,P.y+.5+Math.random(),P.z+(Math.random()-.5)*2,(Math.random()-.5)*s,1+Math.random()*2,(Math.random()-.5)*s,3+Math.random()*2.5,(1.2+Math.random())*scale,.22,.2,.19,.75,3,-.25,.8,1.2); }
    const r=this.rings[this.ri]; this.ri=(this.ri+1)%4; r.position.set(P.x,.15,P.z); r.visible=true; r.userData.t=.5; r.userData.s=scale;
    this.light(V.copy(P).setY(P.y+1.5),0xff8030,10*scale,18*scale,.4);
    if(this.decalsSys) this.decalsSys.add(V.set(P.x,0,P.z),new THREE.Vector3(0,1,0),4.6*scale,2,0xffffff,.95);
    else { const sc=new THREE.Mesh(new THREE.CircleGeometry(2.2*scale,16),this.scorchMat); sc.rotation.x=-Math.PI/2; sc.position.set(P.x,.03,P.z); this.scene.add(sc); this.decals.push(sc); if(this.decals.length>60) this.scene.remove(this.decals.shift()); }
    // debris chunks + dust ring + lingering column + short fire
    this.debris(V.set(P.x,P.y+.4,P.z),Math.round(9*Math.min(scale,1.6)),0x4a443c,7*Math.min(scale,1.5),.06*Math.min(scale,1.6));
    const c=this.dustCol; for(let i=0;i<18*scale;i++){ const a=i/(18*scale)*6.28, s=5+Math.random()*3; this.smoke.add(P.x+Math.cos(a)*.8,.25,P.z+Math.sin(a)*.8,Math.cos(a)*s,.4+Math.random()*.6,Math.sin(a)*s,1.6+Math.random(),.7*scale,c[0],c[1],c[2],.55,3,.2,2.2,1.2); }
    for(let i=0;i<8*scale;i++) this.smoke.add(P.x+(Math.random()-.5),P.y+1+i*.25,P.z+(Math.random()-.5),(Math.random()-.5)*.6,1.6+Math.random()*1.4,(Math.random()-.5)*.6,5+Math.random()*3,(1.4+Math.random())*scale,.16,.15,.15,.65,2.5,-.15,.4,1.4);
    this.haze.push({p:new THREE.Vector3(P.x,P.y+1.2,P.z),t:1.6,s:scale*1.4}); }
  update(dt,cam){ this.add.update(dt); this.smoke.update(dt);
    for(let i=this.emit.length-1;i>=0;i--){ const e=this.emit[i]; e.t-=dt; if(e.t<=0){ this.emit.splice(i,1); continue; } const k=Math.min(1,e.t/3)*e.s; e.acc+=dt*(this.q>1?60:34)*k;
      while(e.acc>1){ e.acc--; const r=.5*e.s; this.add.add(e.p.x+(Math.random()-.5)*r,e.p.y+.1,e.p.z+(Math.random()-.5)*r,(Math.random()-.5)*.6,1.8+Math.random()*1.8,(Math.random()-.5)*.6,.45+Math.random()*.35,(.5+Math.random()*.5)*e.s,1,.42+Math.random()*.25,.08,.75,-.6,-1.5,.8,1.2);
        if(Math.random()<.35) this.smoke.add(e.p.x,e.p.y+1.2*e.s,e.p.z,(Math.random()-.5)*.5+.3,1.5+Math.random(),(Math.random()-.5)*.5,4+Math.random()*2,.9*e.s,.12,.11,.11,.55,2.6,-.2,.3,1.4);
        if(Math.random()<.08) this.add.add(e.p.x,e.p.y+.6,e.p.z,(Math.random()-.5)*2,3+Math.random()*3,(Math.random()-.5)*2,1.2+Math.random(),.05,1,.6,.2,1,0,1.5,.5); }
      if(Math.random()<dt*20){ const l=this.lights[this.li]; } }
    for(let i=this.haze.length-1;i>=0;i--){ this.haze[i].t-=dt; if(this.haze[i].t<=0)this.haze.splice(i,1); }
    for(let i=0;i<this.debN;i++){ const d=this.debD[i]; if(d.t>0){ d.t-=dt; d.v.y-=14*dt; d.p.addScaledVector(d.v,dt); if(d.p.y<d.s*.5){ d.p.y=d.s*.5; d.v.y*=-.3; d.v.x*=.55; d.v.z*=.55; d.w.multiplyScalar(.5);} d.r.x+=d.w.x*dt; d.r.y+=d.w.y*dt; d.r.z+=d.w.z*dt; }
      const sc=d.t>0?d.s*Math.min(1,d.t*2):0; this.Q.setFromEuler(d.r); this.M.compose(d.p,this.Q,V.set(sc*d.sx,sc*d.sy,sc)); this.deb.setMatrixAt(i,this.M); } this.deb.instanceMatrix.needsUpdate=true;
    for(let i=0;i<this.magN;i++){ const d=this.magD[i]; if(d.t>0){ d.t-=dt; if(d.p.y>.04){ d.v.y-=9.8*dt; d.p.addScaledVector(d.v,dt); d.r.x+=d.w.x*dt; d.r.z+=d.w.z*dt; if(d.p.y<=.04){ d.p.y=.04; d.r.x=Math.PI/2; d.r.z=0; } } }
      this.Q.setFromEuler(d.r); this.M.compose(d.p,this.Q,V.set(d.t>0?1:0,d.t>0?1:0,d.t>0?1:0)); this.mag.setMatrixAt(i,this.M); } this.mag.instanceMatrix.needsUpdate=true;
    if(this.weather&&cam){ const w=this.weather, a=w.obj.geometry.attributes.position, p=a.array, B=w.box, hb=B/2; w.t+=dt; const cx=cam.position.x, cy=Math.max(0,cam.position.y-6), cz=cam.position.z;
      if(w.type==='rain'){ for(let i=0;i<w.N;i++){ const o=i*6; let y=p[o+1]-dt*22; let x=p[o], z=p[o+2]; if(y<cy){ y+=w.H; } if(x-cx>hb)x-=B; else if(cx-x>hb)x+=B; if(z-cz>hb)z-=B; else if(cz-z>hb)z+=B; if(y>cy+w.H)y-=w.H; p[o]=x; p[o+1]=y; p[o+2]=z; p[o+3]=x+.04; p[o+4]=y-.55; p[o+5]=z+.02; }  const ns=Math.floor(dt*90*this.q+Math.random()); for(let i=0;i<ns;i++){ const r=2+Math.random()*16, a=Math.random()*6.28, x=cam.position.x+Math.cos(a)*r, z=cam.position.z+Math.sin(a)*r; for(let k=0;k<2;k++) this.add.add(x,.04,z,(Math.random()-.5)*1.2,1.2+Math.random()*1.2,(Math.random()-.5)*1.2,.16,.07,.55,.6,.7,.5,0,6); } }
      else { const fall=w.type==='snow'?1.4:w.type==='ash'?-.25:0.05, sway=w.type==='dust'?2.2:.6; for(let i=0;i<w.N;i++){ const o=i*3; let x=p[o]+Math.sin(w.t*.7+i)*sway*dt+(w.type==='dust'?1.5*dt:0), y=p[o+1]-fall*dt, z=p[o+2]+Math.cos(w.t*.5+i*1.3)*sway*dt;
        if(y<cy)y+=w.H; if(y>cy+w.H)y-=w.H; if(x-cx>hb)x-=B; else if(cx-x>hb)x+=B; if(z-cz>hb)z-=B; else if(cz-z>hb)z+=B; p[o]=x; p[o+1]=y; p[o+2]=z; } }
      a.needsUpdate=true; }
    for(let i=this.sprites.length-1;i>=0;i--){ const s=this.sprites[i]; s.userData.t-=dt; if(s.userData.t<=0){ this.scene.remove(s); this.sprites.splice(i,1);} }
    for(const l of this.lights){ if(l.userData.t>0){ l.userData.t-=dt; l.intensity=l.userData.i0*Math.max(0,l.userData.t/l.userData.t0); } else l.intensity=0; }
    let k=0; for(let i=0;i<this.trN;i++){ const d=this.trD[i]; if(d.k===undefined||d.k>1){ this.trP.fill(0,i*6,i*6+6); continue; } d.k+=dt*Math.max(6,180/Math.max(1,d.len)); const t0=Math.min(1,d.k), t1=Math.max(0,d.k-.35);
      V.lerpVectors(d.a,d.b,t1); this.trP.set([V.x,V.y,V.z],i*6); V.lerpVectors(d.a,d.b,t0); this.trP.set([V.x,V.y,V.z],i*6+3); const f=Math.max(0,1-d.k); this.trC.set([0,0,0,d.c[0]*2*f,d.c[1]*2*f,d.c[2]*2*f],i*6); }
    this.tr.geometry.attributes.position.needsUpdate=this.tr.geometry.attributes.color.needsUpdate=true;
    for(let i=0;i<this.casN;i++){ const d=this.casD[i]; if(d.t>0){ d.t-=dt; d.v.y-=9.8*dt; d.p.addScaledVector(d.v,dt); if(d.p.y<.02){ d.p.y=.02; d.v.y*=-.35; d.v.x*=.6; d.v.z*=.6; d.w.multiplyScalar(.5);} d.r.x+=d.w.x*dt; d.r.y+=d.w.y*dt; d.r.z+=d.w.z*dt; }
      this.Q.setFromEuler(d.r); this.M.compose(d.p,this.Q,this.S); this.cas.setMatrixAt(i,this.M); } this.cas.instanceMatrix.needsUpdate=true;
    for(const r of this.rings){ if(r.userData.t>0){ r.userData.t-=dt; const k=1-r.userData.t/.5; r.scale.setScalar(.5+k*9*r.userData.s); r.material.opacity=(1-k)*.8; } else r.visible=false; } }
}
