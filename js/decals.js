// Atlas decals (4x4 cells): one InstancedMesh for static level dressing + one ring buffer for bullet holes / scorch.
import * as THREE from 'three';
export const DC={hole:0,holeM:1,scorch:2,oil:3,grime:4,crack:5,tracks:6,sand:7,zero:8,jackal:9,noentry:10,danger:11,exit:12,b07:13,puddle:14,target:15};
const Z=new THREE.Vector3(0,0,1), Q=new THREE.Quaternion(), Q2=new THREE.Quaternion(), M=new THREE.Matrix4(), S=new THREE.Vector3(), P=new THREE.Vector3(), C=new THREE.Color();
function makeMat(tex,rough){ const m=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,roughness:rough,metalness:0});
  m.onBeforeCompile=sh=>{ sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 dCell; varying float vDA;')
      .replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv=vec2((uv.x+mod(dCell.x,4.0))*0.25,(uv.y+3.0-floor(dCell.x/4.0))*0.25); vDA=dCell.y;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vDA;').replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.a*=vDA;'); };
  return m; }
class Pool{ constructor(scene,tex,n,rough,order){ const g=new THREE.PlaneGeometry(1,1); this.cell=new Float32Array(n*2); g.setAttribute('dCell',new THREE.InstancedBufferAttribute(this.cell,2));
    this.mesh=new THREE.InstancedMesh(g,makeMat(tex,rough),n); this.mesh.count=0; this.mesh.frustumCulled=false; this.mesh.renderOrder=order; this.mesh.receiveShadow=true; this.n=n; this.i=0; scene.add(this.mesh);
    for(let k=0;k<n;k++) this.mesh.setColorAt(k,C.set(0xffffff)); }
  set(k,pos,nrm,sx,sy,cell,rot,col,alpha){ Q.setFromUnitVectors(Z,nrm); Q2.setFromAxisAngle(Z,rot); Q.multiply(Q2); P.copy(pos).addScaledVector(nrm,0.012+(k%7)*0.0007); S.set(sx,sy,1); M.compose(P,Q,S); this.mesh.setMatrixAt(k,M);
    this.mesh.setColorAt(k,C.set(col)); this.cell[k*2]=cell; this.cell[k*2+1]=alpha; this.mesh.instanceMatrix.needsUpdate=true; this.mesh.instanceColor.needsUpdate=true; this.mesh.geometry.attributes.dCell.needsUpdate=true; } }
export class Decals{
  constructor(scene,tex){ tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4; this.st=new Pool(scene,tex,700,0.95,1); this.dy=new Pool(scene,tex,260,0.8,2); }
  clearStatic(){ this.st.mesh.count=0; this.st.i=0; } clearDynamic(){ this.dy.mesh.count=0; this.dy.i=0; }
  stat(pos,nrm,sx,sy,cell,rot=0,col=0xffffff,alpha=1){ const p=this.st; if(p.i>=p.n)return; p.set(p.i++,pos,nrm,sx,sy,cell,rot,col,alpha); p.mesh.count=p.i; }
  add(pos,nrm,s,cell,col=0xffffff,alpha=1){ const p=this.dy; const k=p.i%p.n; p.set(k,pos,nrm,s,s,cell,Math.random()*6.28,col,alpha); p.i++; p.mesh.count=Math.min(p.n,p.i); }
}
