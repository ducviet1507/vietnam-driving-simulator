import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const T=createRequire(import.meta.url)('../../dist/three.min.js');
const ctx=vm.createContext({updateTerrainNormals:function*(_,g){g.computeVertexNormals();}});
vm.runInContext(readFileSync(new URL('../../dist/pass-road-grades.js',import.meta.url),'utf8'),ctx);
const edge={id:1,length:128,points:[{x:-64,z:0},{x:64,z:0}],dist:[0,128]};
const bridge={...edge,id:2,points:[{x:-64,z:110},{x:64,z:110}],traffic:{bridge:true}};
const graph={nearby:()=>[edge,bridge]},tiles=new Map([['1_1',{1:[1000,1020,1040],2:[1050,1050]}]]);
const terrain={base:90,ground:(x,z)=>50+.4*x+.2*z};
const f=ctx.createPassRoadFormation(graph,tiles,terrain,0,0,130,()=>4);
assert.equal(f.roadHeight(edge,64),12);
assert.equal(f.roadHeight(bridge,64),15);
assert.equal(f.ground(0,110),terrain.ground(0,110));
assert.ok(Math.abs(f.ground(0,0)-11.80)<1e-8);
const size=256,land=new T.Mesh(new T.PlaneGeometry(size,size,8,8));
const original=land.geometry.index,p=land.geometry.attributes.position;
for(let i=0;i<p.count;i++)p.setZ(i,f.ground(p.getX(i),-p.getY(i)));
land.rotation.x=-Math.PI/2;land.position.y=-.17;
const job=ctx.meshPassRoadFormation(T,f,land,0,0,size);let step;
do{step=job.next();}while(!step.done);
assert.ok(land.geometry.index.count<original.count);
land.updateMatrixWorld(true);
const formationMesh=land.children[0],patch=formationMesh.geometry;
const camera=new T.PerspectiveCamera(55,16/9,.1,400);
let trimmed=false;
for(const target of [[0,10,-90],[0,10,90],[500,10,500],[0,10,0]]){
  camera.position.set(0,15,10);camera.lookAt(...target);camera.updateMatrixWorld();
  const projection=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(formationMesh.matrixWorld);
  const clip=Array.from({length:patch.attributes.position.count},(_,i)=>{
    const p=new T.Vector3().fromBufferAttribute(patch.attributes.position,i);
    return new T.Vector4(p.x,p.y,p.z,1).applyMatrix4(projection);
  });
  formationMesh.onBeforeRender(null,null,camera);
  const {start,count}=patch.drawRange;
  trimmed||=count<patch.index.count;
  for(let i=0;i<patch.index.count;i+=3){
    if(i>=start&&i<start+count)continue;
    const points=[0,1,2].map(j=>clip[patch.index.getX(i+j)]);
    assert.ok(['x','y','z'].some(axis=>[-1,1].some(sign=>points.every(p=>sign*p[axis]>p.w))),
      'A skipped formation triangle can intersect the camera view');
  }
  formationMesh.onAfterRender();
  assert.deepEqual(patch.drawRange,{start:0,count:Infinity});
}
assert.ok(trimmed,'At least one camera must cull terrain bands');
const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
for(let x=-120;x<=120;x+=11)for(let z=-100;z<=100;z+=13){
  ray.set(new T.Vector3(x+.3,300,z+.6),down);
  const hits=ray.intersectObject(land,true);
  assert.ok(hits.length,'Missing ground under road or cut');
  assert.ok(Math.abs(hits[0].point.y-(f.ground(x+.3,z+.6)-.17))<.0001,'Collision and visible ground diverged');
}
step.value.dispose();assert.equal(land.geometry.index,original);assert.equal(land.children.length,0);
// A correction at the end of a survey must survive a short side-road edge,
// then taper away on the next edge instead of jumping back at its junction.
const rd=(id,start,end,x,length)=>({id,start,end,length,points:[{x,z:0},{x:x+length,z:0}],dist:[0,length]});
const main=rd(9,1,2,-80,80),side=rd(10,2,3,0,12),tail=rd(11,3,4,12,240);
const junctions={nearby:()=>[main,side,tail],nodes:new Map([[1,[main]],[2,[main,side]],[3,[side,tail]],[4,[tail]]]),
  sample:({edge,s})=>({x:edge.points[0].x+s,z:0})};
const joined=ctx.createPassRoadFormation(junctions,new Map([['1_1',{9:[180,180]}]]),
  {base:0,ground:()=>10},0,0,300,()=>4);
assert.equal(joined.roadHeight(side,0),18);
assert.ok(Math.abs(joined.roadHeight(side,12)-joined.roadHeight(tail,0))<1e-8);
assert.equal(joined.roadHeight(tail,200),null);
let attempts=0;
ctx.fetch=async()=>({ok:true,json:async()=>({grid:4,sourceSha256:'roads',tiles:['420_40']})});
ctx.fetchMapTile=async()=>{if(!attempts++)throw Error('Interrupted image request');return {9:[180,180]};};
const loader=ctx.createPassRoadGrades(),g={sourceSha256:'roads',geo:(x,z)=>[105.1+x/110000,10.1-z/110000]};
assert.equal(await loader.load({...g,sourceSha256:'old'},0,0),false);
assert.equal(await loader.load(g,0,0),false);
assert.equal(await loader.load(g,0,0),true);
const active=loader.tiles(g);
assert.equal(active.get('420_40')[9][0],180);
assert.equal(await loader.load(g,0,0),false);
assert.equal(await loader.load(g,110000,0),true);
assert.equal(loader.tiles(g).size,0);assert.equal(active.size,1);
console.log('PASS graded road formation, unmodified riverbed and the visible earthwork mesh');
