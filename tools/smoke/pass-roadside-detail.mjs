import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';

const dist=new URL('../../dist/',import.meta.url),T=createRequire(import.meta.url)('../../dist/three.min.js');
const ctx=vm.createContext({atob,window:{}});
for(const name of ['guardrail-clearance.js','pass-roadside-detail.js','mountain-stages.js'])
  vm.runInContext(readFileSync(new URL(name,dist),'utf8'),ctx);

const manifest=JSON.parse(readFileSync(new URL('vn-environment/index.json',dist)));
const tiles=new Map(),stages=ctx.window.mountainStages;
function raster(lon,lat){
  const u=lon*manifest.grid,v=lat*manifest.grid,x=Math.floor(u),y=Math.floor(v),key=x+'_'+y;
  if(!tiles.has(key)){
    const path=new URL('vn-environment/'+key+'.gz',dist);
    tiles.set(key,existsSync(path)?gunzipSync(readFileSync(path)):null);
  }
  const side=manifest.coverSize,i=Math.floor((u-x)*side),j=side-1-Math.floor((v-y)*side);
  const code=tiles.get(key)?.[manifest.populationSize**2+j*side+i];
  return code===10||code===95?2:code===20?1:code?0:3;
}
for(const stage of stages){
  assert.equal(Buffer.from(stage.forestMask,'base64').length,1024,stage.id);
  const cover=ctx.coursePassCover(stage),angle=stage.bearing*Math.PI/180,sn=Math.sin(angle),cs=Math.cos(angle);
  const [lon,lat]=stage.start,mx=111320*Math.cos(lat*Math.PI/180);
  for(let j=0;j<64;j++)for(let i=0;i<64;i++){
    const x=(i-31.5)*120,z=(j-31.5)*120;
    assert.equal(cover(x,z),raster(lon+(x*cs-z*sn)/mx,lat-(x*sn+z*cs)/110900),stage.id);
  }
  assert.equal(cover(3840,0),3);assert.equal(cover(0,-3841),3);
}

const bend=stages.find(s=>s.id==='deo-hai-van'),opening=ctx.courseHaiVanOpening(bend);
const graph={mx:107000,point:(lon,lat)=>({x:(lon-108)*107000,z:(16-lat)*110900})};
const district=graph.point(108.133,16.191),world=ctx.worldHaiVanOpening(graph,district.x,district.z);
const angle=bend.bearing*Math.PI/180,sn=Math.sin(angle),cs=Math.cos(angle);
for(const [lon,lat,clear] of [
  [108.13122,16.19393,true],[108.13155,16.19396,true], // carriageway and photographed turnout
  [108.13110,16.19421,true],[108.13184,16.19396,false],[108.13077,16.19502,false]
]){
  const p=graph.point(lon,lat),east=(lon-bend.start[0])*111320*Math.cos(bend.start[1]*Math.PI/180);
  const north=(lat-bend.start[1])*110900;
  assert.equal(world(p.x-district.x,p.z-district.z),clear,'world sightline');
  assert.equal(opening(east*cs-north*sn,-east*sn-north*cs),clear,'rotated course sightline');
}
assert.equal(ctx.worldHaiVanOpening(graph,0,0),null);
assert.equal(ctx.courseHaiVanOpening(stages.find(s=>s.id==='deo-ma-pi-leng')),null);

// A reversed OSM way must put the turnout on the same geographic shoulder
// as the increasing course stations, including after a render-origin change.
function pilotSegment(d,reverse,cx,cz){
  const model=ctx.worldHaiVanPilot(graph,cx,cz,bend);
  const p=[d,d+bend.step].map(station=>{
    const [u,v]=bend.trace[station/bend.step];
    const q=graph.point(bend.start[0]+u/1e6,bend.start[1]+v/1e6);
    return {x:q.x-cx,z:q.z-cz};
  });
  if(reverse)p.reverse();
  const [a,b]=p,dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),fx=dx/len,fz=dz/len;
  const s={ax:a.x,az:a.z,bx:b.x,bz:b.z,fx,fz,nx:-fz,nz:fx,len,w:4,kind:'trunk'};
  assert.equal(model.match({...s,kind:'service'}),undefined);
  assert.equal(model.match({...s,oneway:true}),undefined);
  const run=model.match(s);assert.ok(run&&model.visible);
  assert.equal(Math.sign(run.b-run.a),reverse?-1:1);
  assert.equal(model.sample(d-40,-1,0),null);
  const outer=model.sample(d+10,-1,ctx.haiVanTurnout(d+10));
  return [outer.x+cx,outer.z+cz];
}
const apron=pilotSegment(1320,false,0,0),reversed=pilotSegment(1320,true,district.x,district.z);
assert.ok(Math.hypot(apron[0]-reversed[0],apron[1]-reversed[1])<1e-6);
assert.equal(ctx.haiVanTurnout(1308),0);assert.equal(ctx.haiVanTurnout(1352),0);
assert.equal(ctx.haiVanTurnout(1330),19);

const own={ax:-35,az:0,bx:35,bz:0,fx:1,fz:0,nx:0,nz:1,station:0,len:70,w:4,
  rank:5,graded:true,profiled:true,kind:'primary'};
const crossing={ax:0,az:-20,bx:0,bz:20,fx:0,fz:1,len:40,w:3};
function build(s,excluded=false){
  const group=new T.Group(),surface=(x,z)=>30+z*.57;
  const work=ctx.buildWorldPassDetails(T,{segments:[s],group,surface,natural:surface,
    nearby:()=>[s,crossing],exclude:()=>excluded});
  for(const _ of work){}
  return group.children[0]?.geometry;
}
const visible=build(own);assert.ok(visible?.index.count>200);
const p=visible.attributes.position,indices=visible.index.array;
for(let i=0;i<indices.length;i+=3){
  const corners=Array.from(indices.slice(i,i+3)),xs=corners.map(i=>p.getX(i));
  assert.ok(Math.max(...xs)<=-3||Math.min(...xs)>=3,'stone crosses intersecting carriageway');
  for(const k of corners){
    assert.ok(p.getZ(k)>4.8,'stone entered pavement or downhill verge');
    assert.ok(Number.isFinite(p.getY(k)));
  }
}
for(const change of [{traffic:{bridge:true}},{traffic:{tunnel:true}},{elevated:true},{graded:false},
  {authoredPavement:true},{walkWidth:1.2},{kind:'residential'}])assert.equal(build({...own,...change}),undefined);
assert.equal(build(own,true),undefined);
console.log('PASS woodland raster for '+stages.length+' stages, Hải Vân sightline and uphill drainage clearance');
