import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const root=new URL('../../dist/',import.meta.url);
const context=vm.createContext({
  fetch:async path=>new Response(await readFile(new URL(path,root))),
  Response,Blob,DecompressionStream,TextDecoder,Uint8Array
});
vm.runInContext(await readFile(new URL('road-tile-codec.js',root),'utf8'),context);
vm.runInContext(await readFile(new URL('world-roads.js',root),'utf8'),context);
const Water=vm.runInContext('VietnamWater',context);
const index=JSON.parse(await readFile(new URL('vn-water/index.json',root)));
const cases=[
  [105.963381,20.994519,'Kênh Kiên Thành',8],
  [106.622586,17.470361,'Hào quanh thành Đồng Hới',8],
  [106.6246594,17.4677600,'Hào quanh thành Đồng Hới',25],
  [106.62415,17.470000,'Hào quanh thành Đồng Hới',28],
  [106.623135,17.46606,'Hào quanh thành Đồng Hới',26],
  [105.558866,10.069996,'Rạch Ô Môn',4],
  [106.54905,10.30279,'Kênh 14',36.5]
];
for(const [lon,lat,name,width] of cases){
  const mx=111320*Math.cos(lat*Math.PI/180),my=110900;
  const graph={mx,my,point:(a,b)=>({x:(a-lon)*mx,z:(lat-b)*my}),geo:(x,z)=>[lon+x/mx,lat-z/my]};
  const water=new Water(index,graph);
  assert.ok(await water.load(0,0));
  const found=water.nearby(0,0).some(feature=>feature.name===name&&feature.width===width&&
    feature.points.slice(1).some((b,i)=>{
      const a=feature.points[i],dx=b.x-a.x,dz=b.z-a.z;
      const t=Math.max(0,Math.min(1,-(a.x*dx+a.z*dz)/(dx*dx+dz*dz)));
      return Math.hypot(a.x+t*dx,a.z+t*dz)<1;
    }));
  assert.ok(found,'Mapped water at '+name);
}
console.log('PASS northern, central and southern crossing waterways and mapped canal width');

const T=createRequire(import.meta.url)('../../dist/three.min.js');
const waterContext={window:{}};
vm.runInNewContext(await readFile(new URL('driving-water.js',root),'utf8'),waterContext);
const water=waterContext.window.createDrivingWater(T,true);
const camera=new T.PerspectiveCamera(60,1,.1,800),scene=new T.Scene();
camera.position.y=2;
camera.lookAt(0,0,-10);
let captures=0,target=null;
const renderer={
  shadowMap:{needsUpdate:true},
  getRenderTarget:()=>target,setRenderTarget(next){target=next;},
  render(){captures++;assert.ok(target);assert.equal(water.material.visible,false);}
};
const profile={waterWidth:256,waterMs:130};
const reflect=(now,mirror,near=true)=>water.reflect(renderer,scene,camera,0,now,near,profile,mirror);
reflect(0,true);
assert.equal(captures,0);
assert.equal(water.capturePending,true);
reflect(16,false);
assert.equal(captures,1);
assert.equal(water.capturePending,false);
assert.equal(water.reflection.mirrorStrength.value,1);
assert.equal(renderer.shadowMap.needsUpdate,true);
assert.equal(target,null);
reflect(32,true);
assert.equal(water.capturePending,false);
reflect(180,true);
assert.equal(water.capturePending,true);
reflect(200,false,false);
assert.equal(water.capturePending,false);
assert.equal(water.reflection.mirrorStrength.value,0);
reflect(216,false);
assert.equal(captures,2);
console.log('PASS deferred reflections, cadence, leaving and re-entering water');

const low={waterWidth:0,waterMs:0};
water.prepare(renderer,low,()=>{
  assert.deepEqual([target.width,target.height],[1,1]);
  assert.equal(water.material.visible,false);
},true);
assert.equal(target,null);
water.reflect(renderer,scene,camera,0,232,true,low);
assert.equal(captures,2);
assert.equal(water.reflection.mirrorStrength.value,0);
reflect(248,false);
assert.equal(captures,3);
assert.equal(water.reflection.mirrorMap.value.image.width,256);
console.log('PASS single-pixel mirror warmup with water disabled and quality recovery');
