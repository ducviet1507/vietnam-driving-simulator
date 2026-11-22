import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createContext,runInContext} from 'node:vm';
import {gunzipSync} from 'node:zlib';

const file=name=>new URL('../../dist/'+name,import.meta.url);
const context=createContext({matchMedia:()=>({matches:true})});
context.window=context;
const html=readFileSync(file('index.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
for(const name of scripts.slice(scripts.indexOf('sight-details.js'),scripts.indexOf('vietnam-landmarks.js')+1)){
  runInContext(readFileSync(file(name),'utf8'),context,{filename:name});
}
const {VanMieuSurvey:survey,VietnamLandmarks,VietnamTourism,NatureFieldCaptures,VietnamHydrography}=context;
const roadIndex=JSON.parse(readFileSync(file('vn-roads/index.json'),'utf8'));
const access=roadIndex.sightAccess.stops;
for(const site of [...VietnamLandmarks.entries,...VietnamTourism.entries]){
  if(site.mappedEntrance)assert.ok(!access[site.catalogId||site.id],site.name+' still has a generated access road');
  if(site.viewOf){
    const [modelId,index]=site.viewOf;
    const model=VietnamLandmarks.entries.find(s=>s.id===modelId);
    assert.ok(Number.isInteger(index)&&model?.views?.[index],site.name+' points to an unknown model camera');
  }
}
// Cars reach the Hứa Hòa Hưng gate. The patrol lane inside the bird reserve
// used to appear as a residential street and as a route to the observation deck.
const birdReserveRoads=JSON.parse(gunzipSync(readFileSync(file('vn-roads/422_36.gz'))));
assert.ok(birdReserveRoads.some(row=>row[3].includes('Hưng')&&row.slice(1,3).includes(7820762922)));
assert.ok(!birdReserveRoads.some(row=>row.slice(1,3).includes(4770759122)));
// At Bãi Môn, the parking lane meets both directions of QL29. Visitors leave
// the car at the ticket area and continue toward the cape on foot.
const routeNetwork=createRequire(import.meta.url)('../../dist/route-network-core.js');
const capeTile='437_51',capeRoads=JSON.parse(gunzipSync(readFileSync(file('vn-roads/'+capeTile+'.gz'))));
const capeTraffic=JSON.parse(gunzipSync(readFileSync(file('vn-traffic/'+capeTile+'.gz'))));
const capeGraph=new routeNetwork.Tile(roadIndex,capeTile,capeRoads,capeTraffic);
const lane=50000002,northbound=50000001,southApproach=706075;
const canTurn=(from,to)=>capeGraph.arcs[capeGraph.byId.get(from)].next.includes(capeGraph.byId.get(to));
assert.ok(canTurn(southApproach,lane)&&canTurn(-northbound,lane)&&canTurn(-lane,northbound)&&canTurn(-lane,-southApproach));
const beach=VietnamTourism.entries.find(s=>s.id==='osm-way-160203374');
const parking=routeNetwork.nearest(beach.start,capeRoads);
assert.ok(parking.id===lane&&parking.error<4,'Bãi Môn must start beside its ticket area');
// The real lane at Vịnh Mốc ends where its centreline opens into the coach
// yard. The public footpaths through the museum grounds are visited on foot.
const vinhMocTile='428_68',museumLane=50000004;
const museumRoads=JSON.parse(gunzipSync(readFileSync(file('vn-roads/'+vinhMocTile+'.gz'))));
const museumTraffic=JSON.parse(gunzipSync(readFileSync(file('vn-traffic/'+vinhMocTile+'.gz'))));
const museumGraph=new routeNetwork.Tile(roadIndex,vinhMocTile,museumRoads,museumTraffic);
for(const [from,to] of [[2885243,museumLane],[-50000003,museumLane],[-museumLane,50000003],[-museumLane,-2885243]]){
  assert.ok(museumGraph.arcs[museumGraph.byId.get(from)].next.includes(museumGraph.byId.get(to)));
}
const museumGate=VietnamTourism.entries.find(s=>s.id==='osm-node-1016630618');
const museumParking=routeNetwork.nearest(museumGate.start,museumRoads);
assert.ok(museumParking.id===museumLane&&museumParking.error<3,'Vịnh Mốc must park at the coach yard');
// The memorial on the traffic island and the grave at 1 Phan Đình Phùng
// have separate photos and destinations even though they honour the same person.
const goCongStops=runInContext("heritageVisits.find(v=>v[0]==='pho-cu-go-cong')[2]",context);
const graveId='dong-thap-lang-mo-truong-dinh',statueId='osm-node-10608268024';
assert.ok(goCongStops.includes(graveId)&&!goCongStops.includes(statueId));
const grave=VietnamLandmarks.entries.find(site=>site.catalogId===graveId);
const statue=VietnamTourism.entries.find(site=>site.id===statueId);
const graveDistance=Math.hypot((grave.lon-statue.lon)*109500,(grave.lat-statue.lat)*110900);
assert.ok(graveDistance>100&&graveDistance<200);
const ids=new Set([...VietnamLandmarks.entries,...VietnamTourism.entries].map(s=>s.id));
// The royal residences in Buôn Ma Thuột and at Lắk are separate buildings.
// The provincial VR360 interior at 2 Y Ngông belongs to the city residence.
const lakVisit=runInContext("heritageVisits.find(v=>v[0]==='ho-lak-buon-jun-biet-dien')[2]",context);
const cityResidence='biet-dien-bao-dai-bmt',lakeResidence='osm-way-52823719';
assert.ok(lakVisit.includes(lakeResidence)&&!lakVisit.includes(cityResidence));
assert.ok(NatureFieldCaptures[cityResidence].some(scene=>scene.url.endsWith('#node13')));
assert.ok(!(NatureFieldCaptures[lakeResidence]||[]).some(scene=>scene.url.includes('ban-do-so-du-lich-daklak')));
const jun=VietnamTourism.entries.find(site=>site.id==='dak-lak-ben-thuyen-buon-jun');
// The lake polygon, statue and offshore pin share the car park. The pine
// avenue through the tea fields has its own roadside arrival north of the lake.
const pleikuGate=[107.9993443,14.0342026];
for(const id of ['osm-way-506959800','osm-node-13105153109','osm-node-13105118510','osm-node-3600339699']){
  assert.deepEqual([...VietnamTourism.entries.find(site=>site.id===id).start],pleikuGate,id);
}
const teaAvenue=VietnamLandmarks.entries.find(site=>site.catalogId==='osm-way-741701880');
assert.deepEqual([...teaAvenue.start],[108.0121527,14.0635859]);
const prison=VietnamLandmarks.entries.find(site=>site.catalogId==='osm-node-1730268393');
assert.deepEqual([...prison.start],[108.0473086,12.6757888],'Use the Phạm Hồng Thái visitor entrance');
assert.ok(NatureFieldCaptures[prison.catalogId].some(scene=>scene.url.endsWith('/tour/446/index.html')));
// Bãi Chùa has two separate visitor buildings. The larger exhibition hall is
// by the ceremony plaza; the smaller memorial hall stands along the shore.
const exhibit=VietnamLandmarks.entries.find(site=>site.catalogId==='phu-yen-nha-trung-bay-vung-ro');
const memorialHall=VietnamLandmarks.entries.find(site=>site.catalogId==='osm-node-12382639867');
assert.ok(memorialHall.lon-exhibit.lon>.002 && memorialHall.lon-exhibit.lon<.0025);
assert.deepEqual([...exhibit.start],[109.4191949,12.8776377]);
assert.deepEqual([...memorialHall.start],[...exhibit.start]);
const dambri=VietnamLandmarks.entries.filter(site=>site.catalogId==='osm-node-3093994368');
assert.deepEqual(Array.from(dambri,site=>site.id),['thac-dambri'],'Only the surveyed waterfall should render');
const upperDambri=VietnamTourism.entries.find(site=>site.id==='osm-node-3094058858');
assert.deepEqual([...upperDambri.viewOf],['thac-dambri',1]);
const eastShore=VietnamTourism.entries.find(site=>site.id==='osm-node-1765142229');
assert.ok(lakVisit.includes(jun.id)&&lakVisit.includes(eastShore.id));
assert.ok(jun.lon+.012<eastShore.lookout.lon,'The village landing is west of the resort peninsula');
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
assert.notEqual(photographs[graveId].file,photographs[statueId].file);
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
// Đảo Yến is outside the road district when the visitor is on the beach.
// Its sampled summit and concave coastline must remain visible in that view.
const vungChua=VietnamLandmarks.entries.find(s=>s.id==='vung-chua-dao-yen'),bayScene=new T.Group();
context.atob=atob;vungChua.build(T,{group:bayScene});bayScene.userData.fitGround(()=>0);
const yen=bayScene.getObjectByName('Đảo Yến – bờ và sườn đảo');
assert.ok(Math.hypot(yen.position.x,yen.position.z)>1300);
const coastline=yen.geometry.boundingBox;
assert.ok(coastline.max.y>65&&coastline.max.y<72&&coastline.min.y<0);
assert.ok(coastline.max.z-coastline.min.z>870&&coastline.max.x-coastline.min.x>575);
const islandPeak=coastline.max.y;bayScene.userData.fitGround(()=>4.5);
assert.ok(Math.abs(yen.geometry.boundingBox.max.y-islandPeak-4.5)<1e-4);
// The Hiêu terraces follow a long, shallow reach even after terrain is reloaded.
// A generic waterfall at this pin produces a tall isolated wall.
const hieu=VietnamLandmarks.entries.find(s=>s.id==='osm-node-6215416985');
const cascade=new T.Group();
context.atob=atob;
for(const renderer of ['tree-scan-data.js','tree-models.js'])runInContext(readFileSync(file(renderer),'utf8'),context);
// The mapped northern flight descends to the pass road. Reloading a district
// must refit the steps to the new terrain without accumulating the old slope.
const pass=VietnamLandmarks.entries.find(site=>site.id==='hoanh-son-quan'),summit=new T.Group();
assert.equal(pass.catalogId,'osm-node-8250669293');
pass.build(T,{group:summit,palette(){},box(){},profile(){}});
summit.add(new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial()));
const flight=summit.getObjectByName('Hoành Sơn Quan stone flight').geometry;
const stairs=flight.attributes.position,startHeights=[];
assert.ok(Math.min(...Array.from({length:stairs.count},(_,i)=>stairs.getZ(i)))<-50);
summit.userData.fitGround((x,z)=>.31*z);
for(let i=0;i<stairs.count;i++)startHeights.push(stairs.getY(i));
assert.ok(Math.min(...startHeights)<-15 && Math.max(...startHeights)>.4);
summit.userData.fitGround((x,z)=>.31*z+2);
for(let i=0;i<stairs.count;i++)assert.ok(Math.abs(stairs.getY(i)-startHeights[i]-2)<2e-6);
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
