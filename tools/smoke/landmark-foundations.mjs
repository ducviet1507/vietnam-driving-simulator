// Inspect the authored Three.js catalogue against the national and sight DEMs.
// Run with the project's static server, e.g. node tools/smoke/landmark-foundations.mjs
// --base=http://127.0.0.1:8000/ [--id=station] [--output=report.json].
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {chromium} from 'playwright-core';

const {values}=parseArgs({options:{base:{type:'string',default:'http://127.0.0.1:8000/'},
  id:{type:'string',multiple:true},output:{type:'string'}}});
// Production groups adjacent scripts into bundles but retains their individual
// public URLs. Use this revision's entry point for the catalogue load order.
const base=new URL(values.base),html=readFileSync(new URL('../../dist/index.html',import.meta.url),'utf8');
const scripts=Array.from(html.matchAll(/<script src="([^"]+)"><\/script>/g),m=>m[1]);
const catalogue=scripts.slice(scripts.indexOf('sight-details.js'),scripts.indexOf('vietnam-landmarks.js')+1);
assert.ok(catalogue.length>100);
const sources=['three.min.js','tree-scan-data.js','tree-models.js','surface-materials.js','pass-surface.js',
  'landmark-terrain.js','mountain-stages.js','stage-terrain.js',
  'sight-landscapes.js','urban-terrain.js','vietnam-relief.js','road-tile-codec.js','bridge-profiles.js',
  'tunnel-profiles.js','world-roads.js','world-road-traffic.js','pass-road-grades.js','world-scene.js','driving-water.js',...catalogue];
const browser=await chromium.launch(),rows=[];
try{
  const page=await browser.newPage(),entry=new URL('foundation-audit.html',base).href;
  // Keep model textures out of this geometry measurement. Canvas signs and
  // other procedural surfaces still go through the original model builders.
  const markup='<body class="journey">'+sources.map(f=>'<script src="'+f+'"></script>').join('')+'</body>';
  await page.route(entry,r=>r.fulfill({contentType:'text/html',body:markup}));
  await page.goto(entry,{waitUntil:'load',timeout:120000});
  const ids=await page.evaluate(async()=>{
    const scene=new THREE.Scene(),textures=class{load(){return new THREE.Texture();}};
    const T={...THREE,TextureLoader:textures};
    const landscapes=createSightLandscapes(T),terrain=createVietnamRelief(T,scene,true,landscapes,null,2048);
    await terrain.ready;
    const grades=createPassRoadGrades();
    const [index,traffic,gradeIndex]=await Promise.all(['vn-roads/index.json','vn-traffic/index.json','pass-road-grades/index.json']
      .map(async url=>{
        const response=await fetch(url);
        if(!response.ok)throw Error(url+' '+response.status);
        return response.json();
      }));
    if(!gradeIndex.tiles?.length)throw Error('Missing surveyed pass tiles');
    if(traffic.graphSourceSha256===index.sourceSha256&&traffic.osmTimestamp===index.osmTimestamp)index.trafficTiles=traffic.tiles;
    const models=VietnamLandmarks.create(T,scene),registry=VietnamLandmarks.entries;
    const sites=new Map(registry.map(s=>[s.id,s]));
    window.inspectLandmark=async id=>{
      const site=sites.get(id),graph=new VietnamRoads(index,site.lon,site.lat);
      registry.splice(0,registry.length,site);
      await Promise.all([terrain.loadLocal(graph,0,0),landscapes.load(graph,0,0),grades.load(graph,0,0)]);
      const raw=terrain.prepare(graph,landscapes.prepare(graph)),tiles=grades.tiles(graph);
      if(tiles?.size)await graph.load(0,0);
      const formation=createPassRoadFormation(graph,tiles,raw,0,0,1088,worldRoadHalfWidth);
      const ground=formation?.ground??raw.ground;
      window.roads=graph;window.gfx={ground};
      const district=models.prepare(graph,0,0,ground);
      if(formation)district.setShoreFootings({step:formation.fine,intersects:formation.intersects,ground:(x,z,h)=>h});
      district.activate();
      const active=district.active[0];
      if(!active)return {id,surveyed:!!site.surveyed,vertices:0};
      active.mesh.updateMatrixWorld(true);
      let vertices=0,meshes=0;
      active.mesh.traverse(part=>{
        const geometry=part.geometry,points=geometry?.getAttribute('position');if(!points?.count)return;
        const finish=geometry.getAttribute('finishKind');
        if(finish&&finish.count!==points.count)throw Error('Missing per-vertex masonry finish for '+id);
        if(!geometry.boundingBox)geometry.computeBoundingBox();
        for(const corner of [geometry.boundingBox.min,geometry.boundingBox.max])
          if(!corner.toArray().every(Number.isFinite))throw Error('Non-finite model bounds for '+id+' '+part.name);
        vertices+=points.count;meshes++;
      });
      let low=Infinity,high=-Infinity;
      for(const [u,w] of [[-1,-1],[0,-1],[1,-1],[1,0],[0,0],[1,1],[0,1],[-1,1],[-1,0]]){
        const x=u*site.width/2,z=w*site.depth/2;
        const height=ground(x*active.c+z*active.s,-x*active.s+z*active.c);
        low=Math.min(low,height);high=Math.max(high,height);
      }
      // Sample the actual underside of documented bearing elements, inside
      // their rims so a ray cannot miss on a shared triangle boundary.
      const probes=[];
      if(id==='rong')for(const x of [-6.8,-2.2,2.2,6.8])for(const z of [-2.96,2.96])probes.push([x,z]);
      if(id==='sapa')for(let i=0;i<=40;i++){
        const f=i/40;
        for(const side of [-1,1])probes.push([side*5.17,-1.7+(f-.5)*27.84],[(f-.5)*10.34,-1.7+side*13.92]);
      }
      const radius={'lung-cu':9.74,'ke-ga':3.25,'hai-dang-tien-sa':2.38,'hai-dang-mui-dinh':2.23,
        'hai-dang-hon-lon':2.10,'hai-dang-ganh-rai':1.58}[id];
      if(radius)for(let i=0;i<48;i++)probes.push([radius*Math.sin(i*Math.PI/24),radius*Math.cos(i*Math.PI/24)]);
      let gap=null;
      if(probes.length){
        const ray=new THREE.Raycaster(),up=new THREE.Vector3(0,1,0);
        for(const [u,v] of probes){
          const p=active.mesh.localToWorld(new THREE.Vector3(u,0,v)),land=ground(p.x,p.z)-.17;
          ray.set(new THREE.Vector3(p.x,land-100,p.z),up);
          const hit=ray.intersectObject(active.mesh,true)[0];
          if(!hit)throw Error('Missing bearing geometry at '+id+' '+u+','+v);
          gap=Math.max(gap??-Infinity,hit.point.y-land);
        }
      }
      return {id,name:site.name,vertices,meshes,fitted:!!active.mesh.userData.fitGround,gap,passEarthworks:!!formation,
        surveyed:!!site.surveyed,explicitOpen:site.solids?.length===0,span:+(high-low).toFixed(2)};
    };
    return [...sites.keys()];
  });
  const check=values.id||ids;
  for(const id of check){
    assert.ok(ids.includes(id),id);
    try{rows.push(await page.evaluate(id=>window.inspectLandmark(id),id));}
    catch(e){throw Error(id+': '+e.message,{cause:e});}
  }
  const summary={entries:rows.length,withGeometry:rows.filter(r=>r.vertices>0).length,
    vertices:rows.reduce((total,r)=>total+r.vertices,0),fitted:rows.filter(r=>r.fitted).length,
    markedSurveyed:rows.filter(r=>r.surveyed).length,nearPassEarthworks:rows.filter(r=>r.passEarthworks).length};
  console.log(summary);
  if(values.output)writeFileSync(values.output,JSON.stringify({summary,entries:rows},null,2)+'\n');
  if(!values.id)assert.ok(summary.nearPassEarthworks>0,'Full catalogue never loaded surveyed pass earthworks');
  for(const site of rows)if(site.gap!==null&&site.gap!==undefined)
    assert.ok(site.gap<=.02,site.id+' has a '+site.gap.toFixed(2)+' m visible gap');
}finally{await browser.close();}
