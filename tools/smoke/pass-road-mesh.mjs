// Raycast the asphalt, earthwork and visible terrain on the public pass drive.
// node tools/smoke/pass-road-mesh.mjs --base=http://127.0.0.1:8000/ [--id=deo-hai-van]
// --baseline reports pre-fix geometry without enforcing the clearance checks.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {chromium} from 'playwright-core';

const {values}=parseArgs({options:{base:{type:'string',default:'http://127.0.0.1:8000/'},
  id:{type:'string',multiple:true},output:{type:'string'},baseline:{type:'boolean'}}});
const referencePasses=['deo-hai-van','deo-o-quy-ho','deo-ma-pi-leng','deo-pha-din','deo-khanh-le'];
const passes=values.id||referencePasses;

function measure(){
  const scene=window.passAuditScene;
  scene.updateMatrixWorld(true);
  const ground=scene.children.find(o=>o.geometry?.parameters?.width===2048&&o.geometry.hasAttribute('shoreSediment'));
  const asphalt=[],soil=[],cuttings=[];
  scene.traverseVisible(o=>{
    if(!o.isMesh)return;
    if(o.geometry.hasAttribute('carriageway')&&!/bridge/i.test(o.name))asphalt.push(o);
    const map=o.material?.map?.image?.currentSrc||'';
    if(/\/verge-color\.webp(?:\?|$)/.test(map))soil.push(o);
    if(o.name==='Exposed rock cuttings'||o.name==='Pass drainage and rock toes')cuttings.push(o);
  });
  if(!asphalt.length||!ground)throw Error('Missing asphalt or visible land mesh');
  const ray=new THREE.Raycaster(),eye=new THREE.Vector3(),down=new THREE.Vector3(0,-1,0);
  function top(objects,x,z,children=false){
    ray.set(eye.set(x,10000,z),down);
    const intersections=ray.intersectObjects(objects,children);
    return intersections.length?intersections[0].point.y:null;
  }
  const clearance=[],support=[],physics=[],crossfall=[],crown=[],grades=[],gradeChanges=[],shoulderGap=[];
  const missingLocations=[];
  let missing=0,sections=0,seamRays=0,penetrations=0,terrainPenetrations=0,earthworkPenetrations=0,cuttingPenetrations=0;
  let worst=null,worstTyre=null,worstShoulder=null,worstCrossfall=null;
  const names=new Set(),origin=[viewX,viewZ],start=player.edge;
  if(gfx.districtDistance(...origin)>.05)throw Error('District changed while measuring');
  const edges=roads.nearby(...origin,420).filter(e=>!e.traffic?.bridge&&!e.traffic?.tunnel&&
    roadSurfaceClass(e)==='asphalt'&&(e.id===start.id||e.name&&e.name===start.name||
      e.kind===start.kind&&(!start.name||!e.name)));
  for(const edge of edges){
    const width=worldRoadHalfWidth(edge),spac=6;
    let previous=null,previousGrade=null;
    for(let s=3;s<edge.length-3;s+=spac){
      const mid=roads.sample({edge,s,dir:1}),cx=mid.x-origin[0],cz=mid.z-origin[1];
      if(Math.hypot(cx,cz)>300){previous=previousGrade=null;continue;}
      const row=[];
      for(const f of [-.94,-.47,0,.47,.94]){
        const x=cx+Math.cos(mid.yaw)*width*f,z=cz+Math.sin(mid.yaw)*width*f;
        const land=top([ground],x,z,true);
        let road=top(asphalt,x,z);
        if(road===null){
          // Independent Float32 subdivisions can place the exact ridge between
          // triangles. Require pavement on all four sides one millimetre away.
          const ring=[[.001,0],[0,.001],[-.001,0],[0,-.001]].map(([dx,dz])=>top(asphalt,x+dx,z+dz));
          if(ring.every(v=>v!==null)&&Math.max(...ring)-Math.min(...ring)<.02){
            road=ring.reduce((sum,v)=>sum+v,0)/ring.length;seamRays++;
          }
        }
        if(land===null||road===null){
          if(missingLocations.length<8){
            const nearby=[.001,.01,.1].map(radius=>[radius,...[[1,0],[0,1],[-1,0],[0,-1]].map(([dx,dz])=>
              top(asphalt,x+dx*radius,z+dz*radius))]);
            missingLocations.push({edge:edge.id,station:s,offset:f*width,land,road,nearby,
              lonLat:roads.geo(x+origin[0],z+origin[1])});
          }
          break;
        }
        const earth=top(soil,x,z),rock=top(cuttings,x,z),tyre=gfx.ground(x+origin[0],z+origin[1],edge);
        row.push({road,land,earth,rock,tyre,x,z,f});
      }
      if(row.length!==5){missing++;previous=previousGrade=null;continue;}
      sections++;names.add(edge.name||edge.kind);
      for(const p of row){
        const base=Math.max(p.earth??-Infinity,p.rock??-Infinity,p.land),gap=p.road-p.land;
        const error=Math.abs(p.road-p.tyre);
        clearance.push(gap);support.push(p.road-base);physics.push(error);
        if(!worstTyre||error>worstTyre.error)
          worstTyre={edge:edge.id,station:s,offset:p.f*width,lonLat:roads.geo(p.x+origin[0],p.z+origin[1]),error,signed:p.tyre-p.road};
        if(p.road-base<-.02)penetrations++;
        if(gap<-.02)terrainPenetrations++;
        if(p.earth!==null&&p.road-p.earth<-.02)earthworkPenetrations++;
        if(p.rock!==null&&p.road-p.rock<-.02)cuttingPenetrations++;
        if(!worst||p.road-base<worst.clearance)
          worst={edge:edge.id,station:s,offset:p.f*width,lonLat:roads.geo(p.x+origin[0],p.z+origin[1]),
            layer:base===p.land?'terrain':base===p.rock?'cutting':'earthwork',clearance:p.road-base};
      }
      const left=row[0].road,center=row[2].road,right=row[4].road;
      crossfall.push(Math.abs(right-left)/(width*1.88)*100);
      const sideSlope=Math.max(Math.abs(center-left),Math.abs(center-right))/(width*.94)*100;
      crown.push(sideSlope);
      if(!worstCrossfall||sideSlope>worstCrossfall.pct)
        worstCrossfall={edge:edge.id,station:s,pct:sideSlope,heights:row.map(p=>+p.road.toFixed(3)),
          lonLat:roads.geo(mid.x,mid.z)};
      // Follow each earth batter past the asphalt to its outer rim. A thin
      // earth ribbon just underneath the tarmac can itself hover over the hill.
      for(const side of [-1,1]){
        const dx=side*Math.cos(mid.yaw),dz=side*Math.sin(mid.yaw);
        const height=(list,offset,children=false)=>top(list,cx+dx*(width+offset),cz+dz*(width+offset),children);
        let inside=0,outside=null;
        for(let offset=.5;offset<=7;offset+=.5){
          if(height(soil,offset)===null){outside=offset;break;}inside=offset;
        }
        if(outside===null||inside===0)continue;
        for(let j=0;j<5;j++){
          const m=(inside+outside)/2;
          if(height(soil,m)===null)outside=m;else inside=m;
        }
        const land=height([ground],inside,true),earth=height(soil,inside);
        if(land!==null&&earth!==null){
          const gap=earth-land;shoulderGap.push(gap);
          if(!worstShoulder||gap>worstShoulder.gap)
            worstShoulder={edge:edge.id,station:s,offset:side*(width+inside),gap,
              lonLat:roads.geo(mid.x+dx*(width+inside),mid.z+dz*(width+inside))};
        }
      }
      if(previous!==null){
        const grade=(center-previous)/spac*100;grades.push(Math.abs(grade));
        if(previousGrade!==null)gradeChanges.push(Math.abs(grade-previousGrade));
        previousGrade=grade;
      }
      previous=center;
    }
  }
  const stats=a=>{
    if(!a.length)return null;
    a.sort((p,q)=>p-q);
    const n=a.length-1,at=f=>+a[Math.round(n*f)].toFixed(3);
    return {min:at(0),p50:at(.5),p95:at(.95),max:at(1)};
  };
  const formation=ground.getObjectByName('Mountain road cuts and embankments');
  function hitsAt(lonLat,objects,children=false){
    const p=roads.point(...lonLat);
    ray.set(eye.set(p.x-origin[0],10000,p.z-origin[1]),down);
    return ray.intersectObjects(objects,children).slice(0,4).map(hit=>{
      const attr=hit.object.geometry.attributes;
      const corners=[hit.face.a,hit.face.b,hit.face.c].map(i=>{
        const xyz=new THREE.Vector3().fromBufferAttribute(attr.position,i).applyMatrix4(hit.object.matrixWorld);
        return [+(xyz.x-p.x+origin[0]).toFixed(3),+(xyz.z-p.z+origin[1]).toFixed(3),+xyz.y.toFixed(3),
          ...(attr.carriageway?[+attr.carriageway.getX(i).toFixed(3),+attr.carriageway.getY(i).toFixed(3)]:[])];
      });
      return {mesh:hit.object.name,height:hit.point.y,triangle:corners};
    });
  }
  if(worstTyre)worstTyre.layers=hitsAt(worstTyre.lonLat,asphalt);
  if(worst?.clearance<-.02){
    worst.layers=hitsAt(worst.lonLat,[ground,...soil,...cuttings,...asphalt],true);
    const p=roads.point(...worst.lonLat);
    worst.nearby=roads.nearby(p.x,p.z,30).map(edge=>roads.nearest(p.x,p.z,[edge]))
      .filter(cursor=>cursor&&cursor.error<30**2).sort((a,b)=>a.error-b.error).slice(0,5)
      .map(c=>({id:c.edge.id,kind:c.edge.kind,station:c.s,distance:Math.sqrt(c.error)}));
  }
  return {roads:[...names],sections,missing,seamRays,probes:clearance.length,formationTriangles:(formation?.geometry.index.count||0)/3,
    terrainClearanceM:stats(clearance),supportClearanceM:stats(support),tyreErrorM:stats(physics),
    outerShoulders:shoulderGap.length,outerShoulderAboveTerrainM:stats(shoulderGap),
    crossfallPct:stats(crossfall),halfWidthSlopePct:stats(crown),gradePct:stats(grades),
    gradeChangePer6mPctPoints:stats(gradeChanges),penetrations,terrainPenetrations,earthworkPenetrations,cuttingPenetrations,
    worst,worstTyre,worstShoulder,worstCrossfall,missingLocations};
}

const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']}),report=[];
try{
  for(const id of passes){
    const page=await browser.newPage({viewport:{width:480,height:360}}),errors=[];
    try{
      page.on('pageerror',err=>errors.push(err.message));
      await page.addInitScript(()=>localStorage.setItem('taylai.cockpit.v1',JSON.stringify({graphics:'low'})));
      const url=new URL(values.base);url.searchParams.set('pass',id);
      await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:120000});
      await page.waitForFunction(()=>typeof mode!=='undefined'&&['grid','drive','error'].includes(mode),null,{timeout:180000});
      if(await page.evaluate(()=>mode==='error'))throw Error(await page.locator('#loadStatus').innerText());
      assert.ok(await page.evaluate(id=>mountainStages.some(stage=>stage.id===id),id),'Unknown pass '+id);
      await page.waitForFunction(()=>typeof THREE!=='undefined'&&typeof gfx!=='undefined'&&gfx,null,{timeout:120000});
      await page.evaluate(()=>{
        const before=THREE.Scene.prototype.onBeforeRender;
        THREE.Scene.prototype.onBeforeRender=function(...args){
          if(this.getObjectByName('Vietnam terrain horizon'))window.passAuditScene=this;
          return before?.apply(this,args);
        };
      });
      await page.waitForFunction(()=>window.passAuditScene&&gfx.districtDistance(viewX,viewZ)<.05,null,{timeout:120000});
      const result={pass:id,...await page.evaluate(measure)};report.push(result);
      console.log(JSON.stringify(result));
      assert.deepEqual(errors,[]);assert.ok(result.sections>=8,id+' needs more measured cross sections');
    }finally{await page.close();}
  }
  if(values.output)writeFileSync(values.output,JSON.stringify(report,null,2)+'\n');
  if(!values.baseline)for(const r of report){
    assert.ok(r.formationTriangles>0,r.pass+' did not render the surveyed road cuts and embankments');
    assert.equal(r.missing,0,r.pass+' has incomplete road or terrain cross sections');
    assert.equal(r.penetrations,0,r.pass+' has ground protruding through its pavement by more than 2 cm');
    if(referencePasses.includes(r.pass)){
      // These five launch areas have profiles. Their former terrain-following
      // pavement exceeded 19% longitudinal grade and their verges floated.
      assert.ok(r.gradePct.max<=16,r.pass+' exceeds 16% over a six-metre longitudinal interval');
      assert.ok(r.halfWidthSlopePct.max<=10,r.pass+' exceeds 10% between the crown and a lane edge');
      assert.ok(r.tyreErrorM.max<=.06,r.pass+' has a pavement triangle more than 6 cm from wheel contact');
      assert.ok(r.outerShoulders>r.sections&&r.outerShoulderAboveTerrainM.max<=.10,
        r.pass+' has incomplete verge coverage or a gap above 10 cm under the verge');
    }
  }
}finally{await browser.close();}
