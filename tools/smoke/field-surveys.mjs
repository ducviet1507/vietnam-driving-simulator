import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createContext,runInContext} from 'node:vm';

const file=name=>new URL('../../dist/'+name,import.meta.url);
const context=createContext({matchMedia:()=>({matches:true})});
context.window=context;
const html=readFileSync(file('index.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
for(const name of scripts.slice(scripts.indexOf('sight-details.js'),scripts.indexOf('vietnam-landmarks.js')+1)){
  runInContext(readFileSync(file(name),'utf8'),context,{filename:name});
}
const {VanMieuSurvey:survey,VietnamLandmarks,VietnamTourism,NatureFieldCaptures,VietnamHydrography}=context;
const ids=new Set([...VietnamLandmarks.entries,...VietnamTourism.entries].map(s=>s.id));
const shelters=survey.features.filter(f=>f.steleRows);
assert.equal(shelters.flatMap(f=>f.steleRows).length,82);
assert.equal(new Set(shelters.map(f=>survey.refStops.get(f.ref))).size,10);
assert.equal(new Set(survey.stopIds).size,survey.stopIds.length);
for(const id of [...survey.stopIds,...Object.keys(NatureFieldCaptures)])assert.ok(ids.has(id),id);
for(const row of shelters.flatMap(f=>f.steleRows))assert.ok(row.height>0 && row.width>0 && row.year>=1442);
for(const name of readdirSync(file('landmark-scans/')).filter(f=>f.endsWith('.glb'))){
  const glb=readFileSync(file('landmark-scans/'+name));
  assert.equal(glb.readUInt32LE(8),glb.length,name);
  const data=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));
  assert.ok(data.buffers.every(b=>!b.uri) && (data.images||[]).every(i=>i.bufferView!=null),name);
  assert.ok(data.meshes.some(mesh=>mesh.primitives.length),name);
}
const three=createRequire(import.meta.url)('../../dist/three.min.js');
const T={...three,TextureLoader:class{load(){return new three.Texture();}}};
runInContext(readFileSync(file('tour-district.js'),'utf8'),context);
const draw=context.createVanMieuArchitecture(T);
const project={point:(lon,lat)=>({x:(lon-survey.origin[0])*103900,z:(survey.origin[1]-lat)*110900})};
for(const f of shelters){
  const ring=f.rings[0].slice(0,-1).map(([lon,lat])=>{const {x,z}=project.point(lon,lat);return new T.Vector2(x,z);});
  let count=0;
  const built=draw(f,ring,project,(x,y,z)=>{assert.ok(Number.isFinite(x+y+z));count++;});
  assert.ok(count>0,f.ref);
  assert.equal(built.stelae.length,f.steleRows.length);
  for(const [i,s] of built.stelae.entries()){
    assert.equal(s.year,f.steleRows[i].year);assert.equal(s.height,f.steleRows[i].height);assert.equal(s.width,f.steleRows[i].width);
    assert.ok(Number.isFinite(s.x+s.z+s.viewAngle));
    if(i)assert.ok(s.z<built.stelae[i-1].z,f.ref+' is reversed');
  }
}
for(const [id,p] of Object.entries(VietnamHydrography).filter(([,p])=>p.evidence==='passage')){
  const group=new T.Group();
  VietnamLandmarks.entries.find(s=>s.id===id).build(T,{group});
  group.userData.fitGround(()=>7);
  const lining=group.children.find(mesh=>mesh.userData.surveySection);
  assert.ok(lining,id);
  const pos=lining.geometry.attributes.position;
  for(const [x,z] of p.trace.slice(1)){
    const east=x-p.trace[0][0],south=z-p.trace[0][1];
    const dx=east*Math.cos(p.yaw)-south*Math.sin(p.yaw),dz=east*Math.sin(p.yaw)+south*Math.cos(p.yaw);
    let distance=Infinity;
    for(let i=0;i<pos.count;i++)distance=Math.min(distance,Math.hypot(dx-pos.getX(i),dz-pos.getZ(i)));
    assert.ok(distance<.02,id+' has a displaced passage centre');
  }
}
console.log('PASS survey stops, stele measurements, embedded 3D scans, photographic destinations and mapped cave passages');
