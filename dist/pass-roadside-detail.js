'use strict';

// CN-01 locates the QL1 hairpin and its turnout; CN-03 and CN-04 look
// north-west across the wooded ravine to Lăng Cô. Keep the near aperture
// between the photographed shoulders while retaining trees down the valley.
function haiVanOpeningAt(east,north){
  const forward=-.38*east+.925*north,across=.925*east+.38*north;
  // The photographer was about 32 m across the turnout from the mapped
  // carriageway. The aperture starts along that short frontage.
  const along=Math.max(0,Math.min(1,across/31)),ahead=forward+10*along;
  const margin=9+.19*Math.max(0,ahead);
  return ahead>=-8&&ahead<=65&&across>-margin&&across<31+margin;
}
function worldHaiVanOpening(graph,cx,cz){
  if(!graph)return null;
  const anchor=graph.point(108.13122,16.19393);
  const dx=cx-anchor.x,dz=cz-anchor.z;
  if(Math.abs(dx)>1700||Math.abs(dz)>1700)return null;
  const mx=106904/graph.mx;
  return (x,z)=>haiVanOpeningAt((x+dx)*mx,-z-dz);
}
function courseHaiVanOpening(stage){
  if(stage?.id!=='deo-hai-van')return null;
  const angle=stage.bearing*Math.PI/180,cs=Math.cos(angle),sn=Math.sin(angle);
  const east=(stage.start[0]-108.13122)*111320*Math.cos(stage.start[1]*Math.PI/180);
  const north=(stage.start[1]-16.19393)*110900;
  return (x,z)=>haiVanOpeningAt(east+cs*x-sn*z,north-sn*x-cs*z);
}

function coursePassCover(stage){
  if(!stage?.forestMask)return null;
  const mask=atob(stage.forestMask);
  return (x,z)=>{
    const i=Math.floor(x/120+32),j=Math.floor(z/120+32);
    if(i<0||i>=64||j<0||j>=64)return 3;
    const cell=j*64+i;
    return (mask.charCodeAt(cell>>2)>>(2*(cell&3)))&3;
  };
}

// World and race use the same cross-sections. The bed follows the visible
// shoulder; both lips of the shallow stone channel stand above that surface.
// The exposed rock follows the actual uphill bank and fades into its surface.
const passDetailMaterials=new WeakMap();
function passStoneBatch(T){
  let material=passDetailMaterials.get(T);
  if(!material){
    material=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 stonePoint;\n'+shader.vertexShader.replace(
        '#include <begin_vertex>','#include <begin_vertex>\n stonePoint=position;');
      shader.fragmentShader='varying vec3 stonePoint;\n'+shader.fragmentShader.replace(
        '#include <color_fragment>',`#include <color_fragment>
          vec2 plane=stonePoint.xz+stonePoint.y*vec2(.59,.81);
          vec2 cell=plane*19.;
          float grain=fract(52.9829189*fract(dot(floor(cell),vec2(.06711056,.00583715))));
          float grit=1.-smoothstep(.23,.85,max(fwidth(cell.x),fwidth(cell.y)));
          diffuseColor.rgb*=.97+(grain-.5)*grit*.30
            +.045*sin(dot(plane,vec2(.79,-.34))+.68*sin(plane.y*.54));`);
    };
    passDetailMaterials.set(T,material);
  }
  const vertices=[],colours=[],indices=[],tone=new T.Color();
  const gutter=[[.90,.010,0x757468],[.94,.095,0x9f9e90],[1.025,.090,0xabaa9f],
    [1.13,.012,0x646355],[1.35,.015,0x625f50],[1.51,.15,0x929182],[1.63,.15,0xaaa89b],[1.68,.01,0x77776a]];
  const ledge=[[2.75,-.11,0x4c5549],[3.13,.04,0x596053],[3.56,.12,0x7d7e73],
    [3.70,.07,0x5b6056],[4.45,.16,0x838278],[4.65,.10,0x67695e],[5.15,-.11,0x555c50]];
  function normal(s,d,side){
    const f=d/s.len,a=s.vergeStart||s,b=s.vergeEnd||s;
    return {x:side*(a.nx+(b.nx-a.nx)*f),z:side*(a.nz+(b.nz-a.nz)*f)};
  }
  function row(s,side,d,profile,surface,face){
    const px=s.ax+s.fx*d,pz=s.az+s.fz*d,n=normal(s,d,side);
    const start=vertices.length/3;
    const grain=.5+.5*Math.sin((s.station+d)*.69+.8*Math.sin((s.station+d)*.25));
    for(const [distance,lift,tint] of profile){
      const lateral=s.w+distance+(face?grain*.22:0);
      const x=px+n.x*lateral,z=pz+n.z*lateral;
      const y=surface(x,z,s)+lift*(face?.42+grain*.92:1);
      vertices.push(x,y,z);
      tone.setHex(tint).multiplyScalar(face?.87+.16*grain:.98);
      colours.push(tone.r,tone.g,tone.b);
    }
    return start;
  }
  function connect(a,b,size){
    for(let i=0;i<size-1;i++)indices.push(a+i,b+i,a+i+1,a+i+1,b+i,b+i+1);
  }
  function section(s,side,nearby,natural,surface,exclude){
    const steps=Math.ceil(s.len/4.5);
    let gutterStart=-1,ledgeStart=-1;
    for(let i=0;i<steps;i++){
      const lo=i*s.len/steps,hi=(i+1)*s.len/steps,mid=(lo+hi)/2;
      const x=s.ax+s.fx*mid,z=s.az+s.fz*mid,nx=side*s.nx,nz=side*s.nz;
      const rise=natural(x+nx*(s.w+13),z+nz*(s.w+13))-natural(x+nx*s.w,z+nz*s.w);
      const dist=s.w+1.30,ax=s.ax+s.fx*lo,az=s.az+s.fz*lo,bx=s.ax+s.fx*hi,bz=s.az+s.fz*hi;
      const a=normal(s,lo,side),b=normal(s,hi,side);
      const gx=x+nx*dist,gz=z+nz*dist,neighbors=nearby(gx,gz);
      if(rise<1.55||exclude(gx,gz)||
         !guardrailFits(ax+a.x*dist,az+a.z*dist,bx+b.x*dist,bz+b.z*dist,neighbors,.59,s)){
        gutterStart=ledgeStart=-1;continue;
      }
      if(gutterStart<0)gutterStart=row(s,side,lo,gutter,surface,false);
      const end=row(s,side,hi,gutter,surface,false);
      connect(gutterStart,end,gutter.length);gutterStart=end;
      const rock=s.w+4.05,rx=x+nx*rock,rz=z+nz*rock;
      const toe=s.w+2.7,crest=s.w+5.7;
      if(!s.profiled||rise<3.8||exclude(rx,rz)||
         surface(x+nx*crest,z+nz*crest,s)-surface(x+nx*toe,z+nz*toe,s)<.78||
         !guardrailFits(ax+a.x*rock,az+a.z*rock,bx+b.x*rock,bz+b.z*rock,nearby(rx,rz),1.55,s)){
        ledgeStart=-1;continue;
      }
      if(ledgeStart<0)ledgeStart=row(s,side,lo,ledge,surface,true);
      const top=row(s,side,hi,ledge,surface,true);
      connect(ledgeStart,top,ledge.length);ledgeStart=top;
    }
  }
  function finish(group,reach=0){
    if(!indices.length)return;
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new T.Mesh(geometry,material);mesh.name='Pass drainage and rock toes';
    mesh.receiveShadow=true;
    if(!reach){group.add(mesh);return;}
    geometry.computeBoundingSphere();
    const centre=geometry.boundingSphere.center.clone(),radius=geometry.boundingSphere.radius;
    geometry.translate(-centre.x,-centre.y,-centre.z);
    const lod=new T.LOD();lod.position.copy(centre);
    lod.addLevel(mesh,0);lod.addLevel(new T.Object3D(),reach+radius,.12);group.add(lod);
  }
  return {section,finish};
}
function* buildWorldPassDetails(T,{segments,group,surface,natural,nearby,exclude}){
  const batch=passStoneBatch(T);
  let work=0;
  for(const s of segments){
    if(!s.graded||s.elevated||s.authoredPavement||s.walkWidth||s.traffic?.bridge||s.traffic?.tunnel||
       s.rank>380||s.len<1||!['trunk','primary','secondary','tertiary','unclassified'].includes(s.kind))continue;
    if((++work&7)===0)yield;
    for(const side of [-1,1])batch.section(s,side,nearby,natural,surface,exclude);
  }
  batch.finish(group);
}
