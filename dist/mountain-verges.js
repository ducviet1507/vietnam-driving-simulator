'use strict';

// Terrain and route coordinates here are metres in the course frame.
const mountainRails=new Map();
function railSetback(station,start,end){
  return 1.05+.46*(1-Math.min(1,(station-start)/4,(end-station)/4));
}
// Use the low-detail scanned silhouettes on intermediate ridges. Their roots
// sit on the actual rendered triangles, including the expanding horizon rings.
function buildRidgeWoodland(compact){
  const {x0,z0,nx,nz,grid}=nearTerrain,x1=x0+(nx-1)*grid,z1=z0+(nz-1)*grid;
  const spacing=compact?52:39,reach=featuredPass?1150:520;
  const groups=new Map(),pose=new T.Object3D();
  let seed=972491;
  function noise(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function tree(x,y,z){
    if(courseWoodland(x,z)!==2||mountainField.depth(x,z)>0||y<=mountainField.seaLevel)return;
    const variant=courseTrees.variantAt(x,z);
    const key=Math.floor(x/560)+','+Math.floor(z/560)+','+variant;
    if(!groups.has(key))groups.set(key,{variant,poses:[]});
    const height=8+noise()*10,width=height*(.78+noise()*.58);
    pose.position.set(x,y-.12,z);pose.rotation.y=noise()*Math.PI;pose.scale.set(width,height,width);
    pose.updateMatrix();groups.get(key).poses.push(pose.matrix.clone());
  }
  for(let x=x0;x<x1;x+=spacing)for(let z=z0;z<z1;z+=spacing){
    const px=x+noise()*spacing,pz=z+noise()*spacing;
    if(px>x1||pz>z1||courseWoodland(px,pz)!==2||nearest(px,pz).dist<205)continue;
    tree(px,renderedGround(px,pz),pz);
  }
  const index=hills.geometry.index.array,vertices=hills.geometry.attributes.position.array;
  for(let i=0;i<index.length;i+=3){
    const a=index[i]*3,b=index[i+1]*3,c=index[i+2]*3;
    const x=vertices[a],y=vertices[a+1],z=vertices[a+2];
    if(Math.max(x0-x,x-x1,z0-z,z-z1)>reach)continue;
    const bx=vertices[b]-x,bz=vertices[b+2]-z,cx=vertices[c]-x,cz=vertices[c+2]-z;
    const count=Math.floor(Math.abs(bx*cz-bz*cx)/(2*spacing*spacing)+noise());
    for(let k=0;k<count;k++){
      let u=noise(),v=noise();if(u+v>1){u=1-u;v=1-v;}
      tree(x+u*bx+v*cx,y+u*(vertices[b+1]-y)+v*(vertices[c+1]-y),z+u*bz+v*cz);
    }
  }
  const material=courseTrees.billboardMaterial();
  material.color.set(0x829e91);
  for(const {variant,poses} of groups.values()){
    const mesh=new T.InstancedMesh(courseTrees.distantGeometry('tree',variant),material,poses.length);
    poses.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.computeBoundingSphere();mesh.name='Wooded mountain ridges';scene.add(mesh);
  }
}
function buildMountainVerges(){
  const loader=new T.TextureLoader(),disturbed=surfaces.scanned('verge',0xc8c4a7,.48);
  disturbed.side=T.DoubleSide;
  const shoulders=[],uv=[],rail=[],railIndices=[];
  const section=[[-.052,.49],[.052,.545],[.068,.595],[-.042,.666],[.067,.728],[.052,.77],[-.049,.811]];
  function shoulder(side){
    let prev=null;
    for(let d=0;d<=route.finish;d+=4){
      if(!route.stage&&d>=bridgeStart-3&&d<=bridgeEnd+3){prev=null;continue;}
      const span=1.15+.24*Math.sin(d*.066+side)+.12*Math.cos(d*.19);
      const points=[roadHalfWidth+.01,roadHalfWidth+.37,roadHalfWidth+.7+span].map((l,i)=>{
        const p=at(d,l*side);
        return [p.x,i===0?p.y-.025:i===1?p.y-.085:renderedGround(p.x,p.z)+.03,p.z];
      });
      if(prev)for(let row=0;row<2;row++){
        for(const v of [prev[row],points[row],prev[row+1],prev[row+1],points[row],points[row+1]]){
          shoulders.push(...v);uv.push(v[0]/2.7,v[2]/2.7);
        }
      }
      prev=points;
    }
  }
  // A 4 m beam can see all intersecting road segments in its midpoint cell.
  // Include the shoulder, terminal flare and half-span in the cell padding.
  const roadCells=new Map(),roadSpans=[],cellSize=24,pad=roadHalfWidth+7;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    if(!len)continue;
    const r={ax:a.x,az:a.z,bx:b.x,bz:b.z,fx:dx/len,fz:dz/len,nx:-dz/len,nz:dx/len,
      vergeStart:{nx:Math.cos(a.h),nz:Math.sin(a.h)},vergeEnd:{nx:Math.cos(b.h),nz:Math.sin(b.h)},
      station:(i-1)*step,len,w:roadHalfWidth,profiled:!!route.stage};
    if(r.station<route.finish)roadSpans.push(r);
    for(let x=Math.floor((Math.min(a.x,b.x)-pad)/cellSize);x<=Math.floor((Math.max(a.x,b.x)+pad)/cellSize);x++)
      for(let z=Math.floor((Math.min(a.z,b.z)-pad)/cellSize);z<=Math.floor((Math.max(a.z,b.z)+pad)/cellSize);z++){
        const key=x+','+z;
        if(!roadCells.has(key))roadCells.set(key,[]);
        roadCells.get(key).push(r);
      }
  }
  function beam(side){
    const spans=[];
    let run=null;
    for(let d=4;d<route.finish-4;d+=4){
      const p=at(d),far=at(d,side*16),turn=(heading(d+12)-heading(d-12))/24;
      const interrupted=!route.stage&&(Math.abs(d-route.junction)<18||d>bridgeStart-12&&d<bridgeEnd+12);
      if(interrupted){run=null;continue;}
      if(d<48||turn*side>=-.0035&&renderedGround(far.x,far.z)>=p.y-1.45)continue;
      if(!run||d-run.end>16){run={start:d,end:d};spans.push(run);}
      else run.end=d;
    }
    const runs=[];
    for(const line of spans){
      run=null;
      for(let d=line.start;d<line.end;d+=4){
        // Use the middle of the terminal's outward flare and reserve its full width.
        const l=side*(roadHalfWidth+1.28),a=at(d,l),b=at(d+4,l);
        const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,key=Math.floor(mx/cellSize)+','+Math.floor(mz/cellSize);
        if(!guardrailFits(a.x,a.z,b.x,b.z,roadCells.get(key)||[],.57)||
          (!route.stage&&onBranch(mx,mz,3))){run=null;continue;}
        if(!run){run={start:d,end:d+4};runs.push(run);}
        else run.end=d+4;
      }
    }
    for(let i=runs.length-1;i>=0;i--)if(runs[i].end-runs[i].start<16)runs.splice(i,1);
    mountainRails.set(side,runs);
    for(const {start,end} of runs){
      let prev=-1;
      for(let d=start;d<=end;d+=4){
        const terminal=Math.min(1,(d-start)/4,(end-d)/4);
        const l=side*(roadHalfWidth+railSetback(d,start,end));
        const p=at(d,l),floor=Math.min(renderedGround(p.x,p.z),p.y-.08);
        const index=rail.length/3;
        for(const [out,h] of section){
          const q=at(d,l+side*out);rail.push(q.x,p.y+h-(1-terminal)*.36,q.z);
        }
        if(prev>=0)for(let k=1;k<section.length;k++)railIndices.push(prev+k-1,index+k-1,prev+k,index+k-1,index+k,prev+k);
        if((d-start)%8===0||d===end){
          const top=p.y+.75-(1-terminal)*.36;
          scatter('box',0x7d8180,p.x,(floor+top)/2,p.z,.11,top-floor,.12,-p.h);
          if(d%24===0&&terminal===1){
            const q=at(d,l-side*.09);
            scatter('box',0xd0aa71,q.x,p.y+.69,q.z,.085,.095,.05,-p.h);
          }
        }
        prev=index;
      }
    }
  }
  for(const side of [-1,1]){shoulder(side);beam(side);}
  if(mountainField&&route.stage){
    const details=new Map();
    const nearby=(x,z)=>roadCells.get(Math.floor(x/cellSize)+','+Math.floor(z/cellSize))||[];
    // This shoulder mesh bridges from the asphalt edge to the terrain over
    // roughly two metres. Put the drain on its exposed surface as well.
    function vergeSurface(x,z,s){
      const near=roadCoordinates(x,z,s.station),station=near.d,outer=Math.abs(near.offset)-s.w;
      const ground=renderedGround(x,z);
      if(outer>2.2)return ground+.018;
      const sign=Math.sign(near.offset);
      const span=1.15+.24*Math.sin(station*.066+sign)+.12*Math.cos(station*.19);
      const p=at(station,sign*(s.w+.7+span)),t=T.MathUtils.clamp((outer-.37)/(.33+span),0,1);
      return Math.max(ground,at(station).y-.085+(renderedGround(p.x,p.z)+.115-at(station).y)*t)+.018;
    }
    const sea=(x,z)=>mountainField.depth(x,z)>0;
    for(const s of roadSpans){
      const key=Math.floor(s.ax/170)+','+Math.floor(s.az/170);
      if(!details.has(key))details.set(key,passStoneBatch(T));
      for(const sign of [-1,1])details.get(key).section(s,sign,nearby,mountainField.ground,vergeSurface,sea);
    }
    for(const batch of details.values())batch.finish(scene,185);
  }
  function mesh(vertices,indices,coords,mat){
    if(!vertices.length)return;
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    if(indices)geo.setIndex(indices);
    if(coords)geo.setAttribute('uv',new T.Float32BufferAttribute(coords,2));
    geo.computeVertexNormals();
    const obj=new T.Mesh(geo,mat);obj.receiveShadow=true;obj.castShadow=!!indices;scene.add(obj);
  }
  mesh(shoulders,null,uv,disturbed);
  mesh(rail,railIndices,null,new T.MeshStandardMaterial({color:0xb0b3ad,metalness:.54,roughness:.55,side:T.DoubleSide}));
  if(featuredPass){
    // White roadside delineators pick out the outer edge of the next curve.
    // Test the nearest carriageway too: the next hairpin can double back here.
    for(let d=50;d<route.finish-20;d+=25){
      const turn=heading(d+16)-heading(d-16);
      if(Math.abs(turn)<.13)continue;
      const side=-Math.sign(turn),p=at(d,side*(roadHalfWidth+1.85)),n=nearest(p.x,p.z);
      const y=renderedGround(p.x,p.z);
      if(n.dist<roadHalfWidth+1||Math.abs(y-p.y)>.6)continue;
      scatter('box',0xdedcc8,p.x,y+.43,p.z,.21,.86,.22,-p.h);
      scatter('box',0xa44330,p.x,y+.90,p.z,.215,.16,.225,-p.h);
    }
  }
  const fern=loader.load('streetscape/surfaces/bank-fern.webp');fern.colorSpace=T.SRGBColorSpace;
  foliage.undergrowth=new T.MeshLambertMaterial({map:fern,side:T.DoubleSide,alphaTest:.34,color:0xd4d8be,emissive:0x89906c,emissiveMap:fern,emissiveIntensity:.8});
  geom.undergrowth=geom.leaf;
  if(featuredPass){
    foliage.undergrowth.emissive.set(0x060a07);
    foliage.undergrowth.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\n objectNormal=normalize(vec3((uv.x-.5)*.3,1.,.12));');
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\n normal*=faceDirection;');
    };
    // Weathered outcrops emerge from the cut side, especially in the limestone
    // gorge. Sample the ground under each rock and exclude adjacent switchbacks.
    const limestone=route.id==='deo-ma-pi-leng',rockColour=limestone?0xb3b5aa:0x9a9588;
    const colour=groundMap('surfaces/cut-rock-color.webp'),normal=groundMap('surfaces/cut-rock-normal.webp');
    normal.colorSpace=T.NoColorSpace;
    foliage.outcrop=new T.MeshStandardMaterial({map:colour,normalMap:normal,
      color:rockColour,roughness:.96,normalScale:new T.Vector2(.65,.65)});
    if(limestone)foliage.outcrop.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
        '#include <map_fragment>\n float rockLight=dot(diffuseColor.rgb,vec3(.30,.53,.17));'+
        '\n diffuseColor.rgb=vec3(.96,1.,.98)*(.025+rockLight*1.9);');
    };
    // Distort the same shared vertices consistently across UV seams. Flatten
    // the beds and tilt their upper edges like exposed strata on a cut slope.
    geom.outcrop=new T.IcosahedronGeometry(1,1);
    const positions=geom.outcrop.attributes.position;
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      const f=.86+.13*Math.sin(x*11+y*4-z*8)+.10*Math.cos(z*8-y*14);
      positions.setXYZ(i,x*f+.18*y,Math.min(.72,y*f+.14*x-.08*z),z*f);
    }
    geom.outcrop.computeVertexNormals();
    for(let d=25;d<route.finish;d+=limestone?17:47){
      const side=random()<.5?-1:1,l=side*(10+random()*18);
      const near=at(d,l),back=at(d,l+side*7);
      if(renderedGround(back.x,back.z)-renderedGround(near.x,near.z)<2.1)continue;
      for(let j=0;j<4;j++){
        const p=at(d+random()*7,l+side*random()*4),w=1+random()*2.3,h=w*(limestone?1.5:.82);
        if(nearest(p.x,p.z).dist<roadHalfWidth+w+2)continue;
        scatter('outcrop',rockColour,p.x,renderedGround(p.x,p.z)-h*.28,p.z,w,h,w*.64,-p.h+random()*.7,-.21+random()*.32);
      }
    }
  }
  // Conifers occur in pockets. Retain broadleaf vegetation on low coastal stages.
  const conifers=!route.stage||/o-quy-ho|khanh-le|prenn|mimosa|dran|dai-ninh|sacom|pha-din|khau-pha/.test(route.id);
  const compact=matchMedia('(pointer:coarse)').matches;
  // Scatter irregular stands beyond the verge, with staggered crowns and a low understory.
  for(let d=18;d<route.finish-12;d+=compact?39:28){
    const side=random()<.5?-1:1,centre=at(d,side*(24+random()*97));
    const pineStand=conifers&&random()<.68;
    for(let k=0;k<(compact?9:15);k++){
      const x=centre.x+(random()-.5)*49,z=centre.z+(random()-.5)*46;
      const n=nearest(x,z),y=renderedGround(x,z);
      if(n.dist<12||besideWater(n.d)&&y<waterLevel+.7)continue;
      const kind=pineStand&&random()<.84?'pine':'tree';
      const h=(kind==='pine'?10:6.2)+random()**.8*12,w=h*(kind==='pine'?.5:.56+random()*.38),yaw=random()*Math.PI;
      scatterTree(kind,x,y,z,w,h,yaw,n.dist>48);
    }
    for(let j=0;j<(compact?3:7);j++){
      const p=at(d+random()*22,side*(9+random()*15)),y=renderedGround(p.x,p.z);
      if(nearest(p.x,p.z).dist<8||besideWater(d)&&y<waterLevel+.6)continue;
      const h=.7+random()*1.05,w=h*(2.05+random()*.34),a=random()*Math.PI;
      for(let k=0;k<2;k++)scatter('undergrowth',0xffffff,p.x,y+h*.47,p.z,w,h,1,a+k*Math.PI/2);
    }
  }
  // Near trees already describe the road. Step out across the measured
  // downhill slope to place the middle canopy in mapped woodland.
  if(mountainField&&courseWoodland){
    const gap=compact?56:38;
    for(let d=20;d<route.finish;d+=gap){
      const road=at(d);
      for(const side of [-1,1]){
        for(const lateral of [143,205]){
          const p=at(d,side*(lateral+random()*17)),y=renderedGround(p.x,p.z);
          if(road.y-y<9||courseWoodland(p.x,p.z)!==2||mountainField.depth(p.x,p.z)>0)continue;
          for(let i=0;i<(compact?3:6);i++){
            const x=p.x+(random()-.5)*37,z=p.z+(random()-.5)*37;
            if(nearest(x,z).dist<16||courseWoodland(x,z)!==2||mountainField.depth(x,z)>0)continue;
            const h=7+random()*8,w=h*(.65+random()*.43);
            scatterTree('tree',x,renderedGround(x,z),z,w,h,random()*Math.PI,true);
          }
        }
      }
    }
    buildRidgeWoodland(compact);
  }
}
