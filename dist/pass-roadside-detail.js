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

// Stations are metres uphill from the start of the Hải Vân Cup stage.
// The two approaches flank the same wooded island. The turnout opens to
// the left as the driver turns right around its tip (CN-01).
const haiVanPilot={start:820,end:1820,wallRuns:[[-1,1160,1308],[1,1352,1496]]};
function haiVanTurnout(d){
  if(d<=1308||d>=1352)return 0;
  return 19*Math.sin(Math.PI*(d-1308)/44)**2;
}
function replacesHaiVanBeam(d){
  return d>=haiVanPilot.wallRuns[0][1]&&d<=haiVanPilot.wallRuns[1][2];
}

// The world uses the full OSM road and a moving origin. Match its actual
// pavement to the 20 m course trace; never place the wall on the coarse trace.
function worldHaiVanPilot(graph,cx,cz,stage){
  const first=haiVanPilot.start/stage.step-1,last=haiVanPilot.end/stage.step+1;
  const trace=stage.trace.slice(first,last+1).map(([u,v])=>{
    const p=graph.point(stage.start[0]+u/1e6,stage.start[1]+v/1e6);
    return {x:p.x-cx,z:p.z-cz};
  });
  const pieces=[];
  function station(x,z){
    let best=12*12,result=null;
    for(let i=1;i<trace.length;i++){
      const a=trace[i-1],b=trace[i],dx=b.x-a.x,dz=b.z-a.z;
      const f=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
      const error=(a.x+f*dx-x)**2+(a.z+f*dz-z)**2;
      if(error<best){best=error;result=(first+i-1+f)*stage.step;}
    }
    return result;
  }
  function match(s){
    if(s.oneway||!['primary','trunk','secondary'].includes(s.kind))return;
    const a=station(s.ax,s.az),b=station(s.bx,s.bz);
    if(a===null||b===null||Math.abs(b-a)<.05||Math.abs(Math.abs(b-a)-s.len)>Math.max(4,s.len*.20))return;
    pieces.push({a,b,s});return {a,b};
  }
  function sample(d,side,gap){
    const r=pieces.find(p=>(d-p.a)*(d-p.b)<=0);
    if(!r)return null;
    const t=(d-r.a)/(r.b-r.a),s=r.s,along=s.len*t;
    const off=Math.sign(r.b-r.a)*side*(s.w+gap);
    return {x:s.ax+s.fx*along+s.nx*off,z:s.az+s.fz*along+s.nz*off};
  }
  return {match,sample,get visible(){return pieces.length>0;}};
}

const haiVanMaterials=new WeakMap();
function buildHaiVanPilot(T,{group,sample,ground,roadHeight,clear,opening,compact,trees,barrier}){
  let material=haiVanMaterials.get(T);
  if(!material){
    material=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
    const scan=new T.TextureLoader().load('streetscape/surfaces/plaster-color.webp');
    scan.colorSpace=T.SRGBColorSpace;scan.wrapS=scan.wrapT=T.RepeatWrapping;
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 detailMetres;\n'+shader.vertexShader.replace(
        '#include <begin_vertex>','#include <begin_vertex>\n detailMetres=uv;');
      shader.uniforms.concreteScan={value:scan};
      shader.fragmentShader='varying vec2 detailMetres; uniform sampler2D concreteScan;\n'+shader.fragmentShader.replace(
        '#include <color_fragment>',`#include <color_fragment>
          vec2 cell=detailMetres*26.;
          float grain=fract(52.9829*fract(dot(floor(cell),vec2(.06711,.00584))));
          float fine=1.-smoothstep(.35,1.2,max(fwidth(cell.x),fwidth(cell.y)));
          float patina=texture2D(concreteScan,detailMetres*vec2(.32,.63)).g;
          float streak=texture2D(concreteScan,detailMetres*vec2(1.2,.17)).g;
          diffuseColor.rgb*=.70+.63*patina+.25*streak+.13*(grain-.5)*fine;
          if(detailMetres.y<1. && detailMetres.y>.48){
            float top=smoothstep(.49,.53,detailMetres.y);
            float band=mod(detailMetres.x,8.);
            if(band<1.6)diffuseColor.rgb=mix(diffuseColor.rgb,band<.8?vec3(.50,.30,.040):vec3(.042,.045,.040),top*(.79-.25*patina));
          }`);
    };
    haiVanMaterials.set(T,material);
  }
  const vertices=[],uv=[],colors=[],indices=[],tone=new T.Color();
  function vertex(p,y,u,v,tint){
    vertices.push(p.x,y,p.z);uv.push(u,v);tone.setHex(tint);colors.push(tone.r,tone.g,tone.b);
  }
  function join(a,b,count){
    for(let k=1;k<count;k++)indices.push(a+k-1,a+k,b+k-1,a+k,b+k,b+k-1);
  }
  function cap(row){
    for(let i=1;i<face.length-1;i++)indices.push(row,row+i,row+i+1);
  }
  // A folded cap catches the sun above a pale, runoff-stained wall face.
  const face=[[-.22,-.29,0x77756c],[-.21,.13,0x999888],[-.16,.48,0xd1cdb7],
    [-.16,.65,0xded9c4],[-.12,.69,0xebe5ce],[.17,.69,0xd6d0bb],[.21,.64,0xc4beab],[.24,-.29,0x78766a]];
  for(const [side,start,end] of haiVanPilot.wallRuns){
    let prev=-1,prevFoot=null;
    for(let d=start;d<=end;d+=2){
      const foot=sample(d,side,1);
      if(!foot||!clear(foot.x,foot.z,.30)){if(prev>=0)cap(prev);prev=-1;continue;}
      const y=roadHeight(foot),row=vertices.length/3;
      for(const [out,h,tint] of face)vertex(sample(d,side,1+out),y+h,d,h,tint);
      if(prev>=0){join(prev,row,face.length);barrier?.(prevFoot,foot,d,side);}
      else cap(row);
      prev=row;prevFoot=foot;
    }
    if(prev>=0)cap(prev);
  }
  let prev=-1;
  for(let d=1308;d<=1352;d+=2){
    const width=haiVanTurnout(d),row=vertices.length/3;
    const edge=sample(d,-1,0);
    if(!edge){prev=-1;continue;}
    const y=roadHeight(edge);
    for(const f of [0,.25,.55,.8,1]){
      const p=sample(d,-1,.02+f*width);
      vertex(p,Math.max(y-.025-.018*f*width,ground(p.x,p.z)+.012),d,8+f*width,0xa49d90);
    }
    if(prev>=0)join(prev,row,5);
    prev=row;
  }
  if(indices.length){
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
    const mesh=new T.Mesh(g,material);mesh.name='Hải Vân turnout and parapets';
    mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  }
  // Sample in the course frame so the same thickets survive world rebases.
  // Keep tall crowns away from the view through the turnout and both lanes.
  let seed=27183;
  const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const batches=new Map(),pose=new T.Object3D();
  for(let d=haiVanPilot.start;d<haiVanPilot.end;d+=compact?10:7){
    for(const side of [-1,1])for(let band=0;band<4;band++){
      const station=d+noise()*6,gap=[2.5,10,28,65][band]+noise()*[7,17,38,70][band];
      const h=[1.3,3.4,7,11][band]+noise()*[2.7,5,9,9][band],w=h*(1.1+noise()*.8),angle=noise()*Math.PI;
      const variant=Math.floor(noise()*4),p=sample(station,side,gap);
      if(!p||opening(p.x,p.z)||!clear(p.x,p.z,w*.5+1))continue;
      const kind=band===0?'tea':band===1?'tree':'distant',key=kind+variant;
      let batch=batches.get(key);
      if(!batch){batch={kind,variant,poses:[]};batches.set(key,batch);}
      pose.position.set(p.x,ground(p.x,p.z)-.12,p.z);pose.rotation.y=angle;pose.scale.set(w,h,w);
      pose.updateMatrix();batch.poses.push(pose.matrix.clone());
    }
  }
  for(const {kind,variant,poses} of batches.values()){
    const far=kind==='distant',geom=far?trees.distantGeometry('tree',variant):trees.geometry(kind,true,variant);
    const mesh=new T.InstancedMesh(geom,far?trees.billboardMaterial():trees.material,poses.length);
    poses.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.computeBoundingSphere();
    mesh.receiveShadow=true;mesh.name='Hải Vân broadleaf verge';group.add(mesh);
  }
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
