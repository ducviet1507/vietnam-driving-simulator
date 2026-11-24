import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';

const context={ClipperLib:createRequire(import.meta.url)('../../dist/clipper.min.js')};
for(const file of ['surface-materials','sidewalk-contours','vietnam-relief','grounded-walkways']){
  runInNewContext(readFileSync(new URL('../../dist/'+file+'.js',import.meta.url),'utf8'),context);
}
function road(ax,az,bx,bz,w,walkWidth=1.85){
  const len=Math.hypot(bx-ax,bz-az),fx=(bx-ax)/len,fz=(bz-az)/len;
  return {ax,az,bx,bz,fx,fz,nx:-fz,nz:fx,len,w,walkWidth};
}
function layout(roads,wet=()=>false){
  const walks=context.createGroundedWalkways(null,{cx:0,cz:0,step:32,height:()=>0,ground:()=>0,wet,needsDetail:()=>true});
  let sections=0;
  context.traceSidewalks(roads,()=>roads,(a,b,...ends)=>{
    walks.sidewalk(a,b,...ends);
    sections++;
    for(const t of [0,.5,1]){
      const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      for(const s of roads){
        const u=Math.max(0,Math.min(s.len,(x-s.ax)*s.fx+(z-s.az)*s.fz));
        const gap=Math.hypot(x-s.ax-u*s.fx,z-s.az-u*s.fz)-s.w;
        assert.ok(gap>=-.006,'kerb encroaches '+(-gap).toFixed(3)+' m');
      }
    }
  },()=>{});
  assert.ok(sections>0);
  return walks.liftAt;
}
const main=road(-40,0,40,0,5),spur=road(0,0,0,38,3,1.2);
for(const reverse of [false,true]){
  const signed=reverse?road(40,0,-40,0,5,3):road(-40,0,40,0,5,3);
  signed.walkSides=reverse?[3,0]:[0,3];
  const measured=layout([signed]);
  assert.ok(measured(0,7.6)>0,'surveyed three-metre walk');
  assert.equal(measured(0,-5.6),0,'opposite verge stays open in either drawing direction');
}
const tee=layout([main,spur]);
for(let x=-37;x<=37;x+=.25)assert.ok(tee(x,-5.8)>0,'continuous opposite side of T');
for(let z=0;z<=35;z+=.25)assert.equal(tee(0,z),0,'open branch');
assert.equal(tee(3.1,5.1),0,'recessed corner');
assert.ok(tee(4.25,6.25)>0,'paved corner');
assert.equal(tee(0,-5.08),.12);
assert.equal(tee(0,-5.7),.108);
const cross=layout([main,spur,road(0,0,0,-35,3,1.2)]);
for(const x of [-1,1])for(const z of [-1,1])assert.ok(cross(x*4.25,z*6.25)>0);
const skew=layout([main,road(0,0,38,16,3,1.2),road(0,0,-30,-25,5.5)]);
assert.equal(skew(19,8),0);
const bend=layout([road(-40,0,0,0,4),road(0,0,1,1,4),road(1,1,19,23,4)]);
assert.equal(bend(1,1),0);
const mixed=layout([main,road(0,0,0,35,7.5,0)]);
assert.equal(mixed(7.8,24),0);
assert.ok(mixed(16,5.7)>0);
const boulevard=layout([road(-40,0,0,0,8),road(0,0,40,0,5),spur]);
assert.ok(boulevard(-17,-8.8)>0&&boulevard(17,-5.8)>0);
assert.equal(boulevard(-17,-7.9),0);
const shore=layout([main],(x,z)=>x>2&&x<18&&z<0);
assert.equal(shore(10,-5.8),0);
assert.ok(shore(1,-5.8)>0&&shore(19,-5.8)>0);
console.log('PASS sidewalk joins, mixed widths, short bends, road clearance and wet ground');
