import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';

const T=createRequire(import.meta.url)('../../dist/three.min.js'),context={window:{}};
runInNewContext(readFileSync(new URL('../../dist/vietnam-house-fronts.js',import.meta.url),'utf8'),context);
const fronts=context.window.VietnamHouseFronts;
const ring=points=>points.map(([x,y])=>new T.Vector2(x,y));
const lot=ring([[-3,0],[0,0],[3,0],[3,16],[-3,16]]);
const road={a:{x:-6,z:-4},dx:12,dz:0,length2:144,w:3.5,name:'Phố Hàng Bạc'};
const options={h:11,levels:3,seed:124,kind:'house',lon:105.85075,lat:21.034};
function inside(ring,x,z){
  let hit=false,a=ring.at(-1);
  for(const b of ring){
    if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)hit=!hit;
    a=b;
  }
  return hit;
}
function select(rings=[lot],opts=options,roads=[road]){
  return fronts.select(rings,roads,(x,z)=>inside(rings[0],x,z)&&!rings.slice(1).some(h=>inside(h,x,z)),opts);
}
let largest=0;
function checkModel(f,height){
  const pos=[];
  const result=fronts.draw(T,f,height,new T.Color(0xdbbc9a),new T.Color(0xa58a71),
    (x,y,z,u,v,col,finish)=>{
      assert.ok([x,y,z,u,v,col.r,col.g,col.b,finish].every(Number.isFinite));
      assert.ok(y>=-1e-8&&y<=height+1e-8);
      assert.ok(Math.abs((x-f.x)*f.ux+(z-f.z)*f.uz)<=f.half+.00001);
      const d=(x-f.x)*f.nx+(z-f.z)*f.nz;
      assert.ok(d<.000001&&d>=-f.inset-.000001);
      pos.push([x,y,z]);
    });
  for(let i=0;i<pos.length;i+=3){
    const a=new T.Vector3(...pos[i]),b=new T.Vector3(...pos[i+1]),c=new T.Vector3(...pos[i+2]);
    assert.ok(b.sub(a).cross(c.sub(a)).lengthSq()>1e-14,'nondegenerate triangle');
  }
  assert.equal(result.triangles,pos.length/3);
  assert.ok(result.triangles<520,'per-house triangle cap');
  assert.ok(pos.some(p=>Math.abs((p[0]-f.x)*f.nx+(p[2]-f.z)*f.nz+f.inset)<.001));
  largest=Math.max(result.triangles,largest);
}
const f=select();
assert.ok(f.hangBac&&f.inset>1&&f.nz<-.99);
assert.deepEqual([...f.edges],[0,1],'split straight wall is cut on both original edges');
assert.ok(select([[...lot].reverse()]).nz<-.99,'opposite winding');
assert.equal(select([lot],{...options,lon:106.2}).hangBac,false,'same street name in another city');
assert.equal(select([lot],{...options,zone:{id:'hoi-an'}}),null);
assert.equal(select([lot],{...options,kind:'temple'}),null);
assert.equal(select([lot],options,[{...road,a:{x:-6,z:-2}}]),null,'edge of carriageway covers the façade');

// A hole entirely inside the proposed loggia never touches its four corners.
const courtyard=ring([[.34,.26],[.53,.26],[.53,.49],[.34,.49]]);
assert.equal(select([lot,courtyard]),null);
const farHole=ring([[.34,1.18],[.53,1.18],[.53,1.49],[.34,1.49]]);
const shallow=select([lot,farHole]);
assert.ok(shallow&&shallow.inset<1.17,'shallower option clears an inner wall');
const alley=ring([[-3,0],[3,0],[3,12],[.5,12],[.5,.25],[.22,.25],[.22,12],[-3,12]]);
assert.equal(select([alley]),null,'an inward notch across the room');
for(const h of [3,5.13,6.4,9.9,13.35,16.85])for(const width of [2.51,6,13.9]){
  const plot=ring([[-width/2,0],[width/2,0],[width/2,18],[-width/2,18]]);
  for(const seed of [0,1,2,3,4,9,127,984,2480]){
    const model=select([plot],{...options,lon:seed%2===0?105.85075:106.2,h,seed,
      levels:Math.round(h/3.3),kind:seed%3===2?'retail':'house'});
    checkModel(model,h);
  }
}
console.log('Vietnam house fronts passed geometry, real depth, cut edges, winding, courtyard and budget checks.',{largest});
