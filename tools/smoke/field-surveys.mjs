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
const access=JSON.parse(readFileSync(file('vn-roads/index.json'),'utf8')).sightAccess.stops;
for(const site of [...VietnamLandmarks.entries,...VietnamTourism.entries]){
  if(site.mappedEntrance)assert.ok(!access[site.catalogId||site.id],site.name+' still has a generated access road');
  if(site.viewOf){
    const [modelId,index]=site.viewOf;
    const model=VietnamLandmarks.entries.find(s=>s.id===modelId);
    assert.ok(Number.isInteger(index)&&model?.views?.[index],site.name+' points to an unknown model camera');
  }
}
const ids=new Set([...VietnamLandmarks.entries,...VietnamTourism.entries].map(s=>s.id));
// Keep the two cross-province homonyms separate, and the Hương Sơn approach
// at the coach station even when a direct link selects a stop up the mountain.
const huongSon=runInContext("heritageVisits.find(v=>v[0]==='chua-huong-huong-son')[2]",context);
const coachStation=[105.7877197,20.614076];
for(const catalogId of huongSon){
  const pin=VietnamTourism.entries.find(site=>site.id===catalogId);
  const model=VietnamLandmarks.entries.find(site=>site.catalogId===catalogId);
  assert.equal(model?.province,'Hà Nội',catalogId);
  assert.deepEqual([...pin.start],coachStation,pin.name);
  assert.deepEqual([...model.start],coachStation,model.name);
}
for(const [id,province] of [['chua-giai-oan','Quảng Ninh'],['chua-huong-tich-ha-tinh','Hà Tĩnh']])
  assert.equal(VietnamLandmarks.entries.find(site=>site.id===id)?.province,province);
// The original Thạch Động pin is on the neighbouring hill. A raw Atlas link
// must still select the temple in the surveyed tower and park on the access road.
const thachDongPin=VietnamTourism.entries.find(site=>site.id==='osm-node-2327003316');
const thachDong=VietnamLandmarks.entries.find(site=>site.catalogId===thachDongPin.id);
assert.equal(thachDong.id,'thach-dong-ha-tien');
assert.ok(Math.hypot((thachDong.lon-104.475072)*109500,(thachDong.lat-10.4108219)*110900)<10);
assert.deepEqual([...thachDong.start],[104.47545,10.410973]);
const haTien=runInContext("heritageVisits.find(v=>v[0]==='binh-san-thach-dong-ha-tien')[2]",context);
const photographs=JSON.parse(readFileSync(file('sight-photos/index.json'),'utf8'));
for(const id of haTien){
  const pin=VietnamTourism.entries.find(site=>site.id===id);
  assert.ok(pin.mappedEntrance,pin.name);
  assert.ok(readFileSync(file('sight-photos/'+photographs[id].file)).length>0,pin.name);
}
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
// The Hiêu terraces follow a long, shallow reach even after terrain is reloaded.
// A generic waterfall at this pin produces a tall isolated wall.
const hieu=VietnamLandmarks.entries.find(s=>s.id==='osm-node-6215416985');
const cascade=new T.Group();
context.atob=atob;
for(const renderer of ['tree-scan-data.js','tree-models.js'])runInContext(readFileSync(file(renderer),'utf8'),context);
hieu.build(T,{group:cascade});
const bed=cascade.children.find(mesh=>mesh.material.customProgramCacheKey()==='hydro-shallow-stream');
assert.ok(bed,hieu.name);
const slope=(x,z)=>.02*x-.195*z;
cascade.userData.fitGround(slope);
const flow=bed.geometry.attributes.position;
let upper=-Infinity,lower=Infinity;
for(let i=0;i<flow.count;i++){
  const x=flow.getX(i),z=flow.getZ(i),height=flow.getY(i);
  assert.ok(Math.abs(height-slope(x,z))<2,'A step rises too far above the streambed');
  if(z<-18)upper=Math.max(upper,height);
  if(z>18)lower=Math.min(lower,height);
}
assert.ok(Number.isFinite(upper-lower)&&upper-lower>6,'The sampled reach should descend downstream');
const previous=flow.getY(0);
cascade.userData.fitGround((x,z)=>slope(x,z)+2.5);
assert.ok(Math.abs(flow.getY(0)-previous-2.5)<.002,'The river must move with the updated terrain');
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
const upstream='https://raw.githubusercontent.com/tang-vu/vietnam-driving-simulator/'+'1'.repeat(40)+'/dist/trailer/qua-mot-khuc-cua.mp4';
const calls=[];
const workerText=readFileSync(new URL('../../worker/leaderboard.mjs',import.meta.url),'utf8');
const worker=createContext({URL,Headers,Response,Request,trailerUrl:upstream,
  fetch:async (url,options)=>{
    calls.push([String(url),options.method,options.headers.get('Range')]);
    return String(url).includes('raw.githubusercontent.com')?new Response(null,{status:503}):
      new Response(new Uint8Array([103,108,84,70]),{status:206,headers:{'Content-Range':'bytes 0-3/32'}});
  }});
runInContext(workerText.slice(workerText.indexOf('async function serveGameAsset('),workerText.indexOf('export default')),worker);
const url=new URL('https://vivu3d.com/landmark-scans/my-son.glb');
const response=await worker.serveGameAsset(new Request(url,{headers:{Range:'bytes=0-3'}}),{},url);
assert.equal(response.status,206);assert.equal(response.headers.get('Content-Type'),'model/gltf-binary');
assert.equal(response.headers.get('Content-Range'),'bytes 0-3/32');
assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[103,108,84,70]);
assert.equal(calls.length,2);assert.equal(calls[1][2],'bytes=0-3');
assert.ok(calls[0][0].endsWith('/dist/landmark-scans/my-son.glb'));
assert.ok(calls[1][0].startsWith('https://cdn.jsdelivr.net/gh/tang-vu/vietnam-driving-simulator@'+'1'.repeat(40)+'/dist/'));
console.log('PASS survey stops, stele measurements, embedded 3D scans, photographic destinations and mapped cave passages');
