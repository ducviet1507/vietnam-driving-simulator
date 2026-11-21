import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

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
