'use strict';

// The vector survey uses 1e-5 degree deltas relative to the tile, including
// for a parcel that extends outside it. Keep the complete rings and their holes.
function decodeFarmTile(key,rows,grid,scale){
  const [east,north]=key.split('_').map(Number);
  return rows.map(([kind,id,parts])=>{
    let west=Infinity,south=Infinity,right=-Infinity,top=-Infinity;
    const rings=parts.map(delta=>{
      const coords=new Int32Array(delta.length);
      let lon=east*scale/grid,lat=north*scale/grid;
      for(let i=0;i<delta.length;i+=2){
        lon+=delta[i];lat+=delta[i+1];coords[i]=lon;coords[i+1]=lat;
        west=Math.min(west,lon);right=Math.max(right,lon);south=Math.min(south,lat);top=Math.max(top,lat);
      }
      return coords;
    });
    return {kind,id,rings,west,south,right,top};
  });
}

function createMappedFarmland(T,compact){
  const base='vn-farmland/',span=2048,resolution=compact?512:1024;
  const tileCache=new Map(),buffers=[];
  const uniforms={farmMap:{value:null},farmCentre:{value:new T.Vector2()},farmActive:{value:0}};
  let indexRequest,owner,signature,version=0,nearTiles=[];
  async function load(graph,x,z){
    const stamp=++version;
    try{
      indexRequest??=fetch(base+'index.json').then(async r=>{
        if(!r.ok)throw Error('Farmland index '+r.status);
        const index=await r.json();index.tiles=new Set(index.tiles);return index;
      }).catch(e=>{indexRequest=null;throw e;});
      const {grid,scale,tiles}=await indexRequest;
      const [lon,lat]=graph.geo(x,z),dx=2100/graph.mx,dy=2100/graph.my,keys=[];
      for(let i=Math.floor((lon-dx)*grid);i<=Math.floor((lon+dx)*grid);i++){
        for(let j=Math.floor((lat-dy)*grid);j<=Math.floor((lat+dy)*grid);j++){
          const key=i+'_'+j;if(tiles.has(key))keys.push(key);
        }
      }
      if(stamp!==version||owner===graph&&signature===keys.join('/'))return false;
      const results=await Promise.all(keys.map(key=>{
        if(!tileCache.has(key))tileCache.set(key,fetchMapTile(base+key+'.gz')
          .then(rows=>decodeFarmTile(key,rows,grid,scale)).catch(e=>{tileCache.delete(key);throw e;}));
        return tileCache.get(key);
      }));
      if(stamp!==version)return false;
      owner=graph;nearTiles=results;signature=keys.join('/');
      for(const key of tileCache.keys())if(!keys.includes(key))tileCache.delete(key);
      return true;
    }catch{return false;}
  }
  function* prepare(graph,cx,cz){
    const features=[],water=[],seen=new Set();
    let ctx,buffer,work=0;
    if(graph&&graph===owner){
      const [west,north]=graph.geo(cx-span/2,cz-span/2),[east,south]=graph.geo(cx+span/2,cz+span/2);
      for(const records of nearTiles)for(const f of records){
        if((++work&511)===0)yield;
        if(f.west>east*1e5||f.right<west*1e5||f.top<south*1e5||f.south>north*1e5)continue;
        const key=f.kind+f.id;
        if(seen.has(key))continue;seen.add(key);
        const parts=f.rings.map(coords=>{
          const pts=[];
          for(let i=0;i<coords.length;i+=2)pts.push(graph.point(coords[i]/1e5,coords[i+1]/1e5));
          return pts;
        });
        const nw=graph.point(f.west/1e5,f.top/1e5),se=graph.point(f.right/1e5,f.south/1e5);
        features.push({kind:f.kind,id:f.id,parts,nw,se});
        if(f.kind==='ditch'||f.kind==='canal'){
          for(const points of parts)water.push({kind:f.kind,width:f.kind==='ditch'?2.4:5,points,bankSpacing:2});
        }
      }
    }
    const crops={field:35,rice:82,terrace:128,orchard:173},parcels=new Map(),cell=96;
    for(const f of features){
      if(crops[f.kind]===undefined)continue;
      if(!ctx){
        buffer=buffers.find(b=>b.texture!==uniforms.farmMap.value);
        if(!buffer){
          const canvas=document.createElement('canvas');canvas.width=canvas.height=resolution;
          const texture=new T.CanvasTexture(canvas);
          texture.flipY=false;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
          buffer={texture,ctx:canvas.getContext('2d')};buffers.push(buffer);
        }
        ctx=buffer.ctx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,resolution,resolution);
        const k=resolution/span;ctx.setTransform(k,0,0,k,resolution/2,resolution/2);
      }
      if((++work&31)===0)yield;
      const shell=f.parts[0];
      for(let iz=Math.floor(Math.max(cz-span/2,f.nw.z)/cell);iz<=Math.floor(Math.min(cz+span/2,f.se.z)/cell);iz++)
        for(let ix=Math.floor(Math.max(cx-span/2,f.nw.x)/cell);ix<=Math.floor(Math.min(cx+span/2,f.se.x)/cell);ix++){
          const key=ix+','+iz;if(!parcels.has(key))parcels.set(key,[]);parcels.get(key).push(f);
        }
      let longest=0,nx=1,nz=0;
      for(let i=0;i<shell.length;i++){
        const a=shell[i],b=shell[(i+1)%shell.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
        if(len>longest){longest=len;nx=-dz/len;nz=dx/len;}
      }
      f.nx=nx;f.nz=nz;
      const tint=crops[f.kind]+Number(f.id.slice(1))%13;
      ctx.fillStyle='rgb('+tint+','+Math.round(127+nx*126)+','+Math.round(127+nz*126)+')';
      ctx.beginPath();
      for(const ring of f.parts){
        if(ring.length<3)continue;
        ctx.moveTo(ring[0].x-cx,ring[0].z-cz);
        for(let i=1;i<ring.length;i++)ctx.lineTo(ring[i].x-cx,ring[i].z-cz);
        ctx.closePath();
      }
      ctx.fill('evenodd');
    }
    function parcelAt(x,z){
      for(const f of parcels.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){
        if(x<f.nw.x||x>f.se.x||z<f.nw.z||z>f.se.z)continue;
        let inside=false;
        for(const ring of f.parts)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
          const a=ring[i],b=ring[j];
          if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
        }
        if(inside)return f;
      }
      return null;
    }
    return {features,water,parcelAt,hasParcels:parcels.size>0,activate(){
      uniforms.farmActive.value=ctx?1:0;
      if(ctx){buffer.texture.needsUpdate=true;uniforms.farmMap.value=buffer.texture;uniforms.farmCentre.value.set(cx,cz);}
    }};
  }
  function shade(shader,soil){
    Object.assign(shader.uniforms,uniforms,{soilWater:soil});
    shader.vertexShader='varying float farmHeight;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n farmHeight=position.z;');
    shader.fragmentShader='varying float farmHeight; uniform sampler2D farmMap; uniform vec2 farmCentre; uniform float farmActive,soilWater;\n'+
      shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 farmUV=(groundMetres-farmCentre)/2048.+.5;
        if(farmActive>.5 && all(greaterThan(farmUV,vec2(0.))) && all(lessThan(farmUV,vec2(1.)))){
          vec4 parcel=texture2D(farmMap,farmUV);
          vec2 across=parcel.gb*2.-1.;
          float band=dot(groundMetres,across)*8.1;
          vec3 leaf=mix(vec3(.117,.174,.047),vec3(.225,.228,.071),fract(parcel.r*9.7));
          if(parcel.r>.25 && parcel.r<.63)leaf=mix(vec3(.077,.171,.046),vec3(.204,.254,.072),fract(parcel.r*10.1));
          if(parcel.r>.63){leaf=vec3(.074,.135,.047);band*=.19;}
          float contour=1.;
          if(parcel.r>.45 && parcel.r<.63){
            // Contour bands follow the surveyed hillside. Their interval is illustrative.
            float phase=farmHeight*.73;
            contour=1.-.30*(1.-smoothstep(.04,.18,abs(fract(phase)-.5)))*(1.-smoothstep(.08,.5,fwidth(phase)));
          }
          float rows=1.+.13*cos(band)*(1.-smoothstep(.45,2.8,fwidth(band)));
          float grain=clamp(dot(diffuseColor.rgb,vec3(.8,2.2,.45)),.64,1.22);
          diffuseColor.rgb=mix(diffuseColor.rgb,leaf*grain*rows*contour*(1.-.17*soilWater),
            .77*parcel.a*(1.-bankWet));
        }`);
  }
  return {load,prepare,shade};
}

// Several clumps share one instanced patch. Only the crop rows beside roads
// need individual leaves; distant rows are already in the terrain material.
function createCropRows(T){
  const pos=[],col=[];
  for(let row=-1;row<=1;row++)for(let clump=-2;clump<=2;clump++){
    const x=clump*.38,z=row*.58+.07*Math.sin(clump+row);
    for(let i=0;i<5;i++){
      const angle=i*2.40+clump,dx=Math.cos(angle),dz=Math.sin(angle),h=.34+.16*Math.cos(i+row);
      const w=.022,mx=x+.10*dx,mz=z+.10*dz;
      pos.push(x-dz*w,0,z+dx*w,x+dz*w,0,z-dx*w,mx,h*.66,mz,
        mx-dz*w*.65,h*.59,mz+dx*w*.65,mx+dz*w*.65,h*.59,mz-dx*w*.65,x+dx*.22,h,z+dz*.22);
      col.push(.060,.115,.025,.068,.126,.030,.17,.25,.052,
        .14,.22,.049,.14,.22,.049,.28,.33,.076);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(col,3));
  geometry.computeVertexNormals();
  const material=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
  return function* plantRows(group,farms,segments,cx,cz,ground,terrace,clear,plant,compact){
    if(!farms.hasParcels)return;
    const seen=new Set(),matrix=new T.Object3D(),poses=[],tints=[];
    let work=0,trees=0;
    roadSections: for(const s of [...segments].sort((a,b)=>a.rank-b.rank)){
      if(s.elevated||s.rank>(compact?180:320))continue;
      for(let d=0;d<s.len;d+=3.6)for(const sign of [-1,1])for(let gap=3;gap<=45;gap+=3.8){
        if((++work&255)===0)yield;
        const x=cx+s.ax+s.fx*d+s.nx*sign*(s.w+gap),z=cz+s.az+s.fz*d+s.nz*sign*(s.w+gap);
        const f=farms.parcelAt(x,z);if(!f)continue;
        const orchard=f.kind==='orchard',pitch=orchard?5.7:2.2,base=f.parts[0][0];
        const px=x-base.x,pz=z-base.z;
        const i=Math.round((px*f.nx+pz*f.nz)/pitch),j=Math.round((px*f.nz-pz*f.nx)/pitch);
        const key=f.id+','+i+','+j;if(seen.has(key))continue;seen.add(key);
        const wx=base.x+pitch*(i*f.nx+j*f.nz),wz=base.z+pitch*(i*f.nz-j*f.nx);
        const lx=wx-cx,lz=wz-cz;
        if(farms.parcelAt(wx,wz)!==f||!clear(lx,lz,orchard?1.3:1.1))continue;
        const seed=(Math.imul(i,73856093)^Math.imul(j,19349663))>>>0,t=(seed%997)/997;
        if(orchard){
          if(trees<(compact?35:90)){plant(lx,lz,2.7+t,seed);trees++;}
          continue;
        }
        const y=terrace?.(lx,lz)??ground(lx,lz)-.17;
        matrix.position.set(lx,y-.02,lz);matrix.rotation.y=Math.atan2(f.nx,f.nz);
        matrix.scale.set(1.1,.81+t*.44,1.12);matrix.updateMatrix();
        poses.push(matrix.matrix.clone());tints.push(t);
        if(poses.length>=(compact?300:900))break roadSections;
      }
    }
    if(!poses.length)return;
    const mesh=new T.InstancedMesh(geometry,material,poses.length),colour=new T.Color();
    poses.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,colour.setRGB(.84+tints[i]*.22,.91+tints[i]*.12,.75));});
    mesh.name='Roadside crop rows';mesh.receiveShadow=true;group.add(mesh);
  };
}

// Step only the identified terrace parcels. Each terrace top follows a height
// band cut from the local DEM; the recorded polygon and all its holes are kept.
function* buildRiceTerraces(T,{features,cx,cz,reach,ground,blocked,group,material}){
  const verts=[],colours=[],cells=new Map(),cell=12,rise=.76;
  const face=(a,b,c,colour)=>{
    verts.push(...a,...b,...c);for(let i=0;i<3;i++)colours.push(...colour);
  };
  function clip(poly,height,above){
    const out=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[(i+poly.length-1)%poly.length],b=poly[i];
      const takeA=above?a[1]>=height:a[1]<=height,takeB=above?b[1]>=height:b[1]<=height;
      if(takeA!==takeB){
        const t=(height-a[1])/(b[1]-a[1]);
        out.push([a[0]+(b[0]-a[0])*t,height,a[2]+(b[2]-a[2])*t]);
      }
      if(takeB)out.push(b);
    }
    return out;
  }
  function vertex(x,z){return [x,ground(x,z)-.17,z];}
  const top=[.145,.222,.063],earth=[.164,.128,.064];
  for(const f of features){
    if(f.kind!=='terrace')continue;
    const rings=f.parts.map(r=>r.map(p=>new T.Vector2(p.x-cx,p.z-cz)));
    const triangles=T.ShapeUtils.triangulateShape(rings[0],rings.slice(1)),all=rings.flat();
    const pending=triangles.map(ids=>ids.map(i=>vertex(all[i].x,all[i].y)));
    let work=0;
    while(pending.length){
      if((++work&127)===0)yield;
      const tri=pending.pop();
      const xs=tri.map(p=>p[0]),zs=tri.map(p=>p[2]);
      if(Math.min(...xs)>reach||Math.max(...xs)<-reach||Math.min(...zs)>reach||Math.max(...zs)<-reach)continue;
      let edge=0,longest=0;
      for(let i=0;i<3;i++){
        const a=tri[i],b=tri[(i+1)%3],d=Math.hypot(b[0]-a[0],b[2]-a[2]);
        if(d>longest){edge=i;longest=d;}
      }
      const a=tri[edge],b=tri[(edge+1)%3],c=tri[(edge+2)%3];
      if(longest>7){
        const m=vertex((a[0]+b[0])/2,(a[2]+b[2])/2);
        pending.push([a,m,c],[m,b,c]);continue;
      }
      if(blocked((a[0]+b[0]+c[0])/3,(a[2]+b[2]+c[2])/3,longest*.68+.3))continue;
      const low=Math.min(a[1],b[1],c[1]),high=Math.max(a[1],b[1],c[1]);
      for(let band=Math.floor(low/rise);band<=Math.floor(high/rise);band++){
        const floor=band*rise,lid=floor+rise;
        const poly=clip(clip(tri,floor,true),lid,false);
        if(poly.length<3)continue;
        const shelf=poly.map(p=>[p[0],lid+.012,p[2]]);
        const bounds=shelf.map(p=>[Math.floor(p[0]/cell),Math.floor(p[2]/cell)]);
        for(let i=1;i<shelf.length-1;i++)face(shelf[0],shelf[i+1],shelf[i],top);
        for(let i=0;i<poly.length;i++){
          const j=(i+1)%poly.length;
          if(Math.min(shelf[i][1]-poly[i][1],shelf[j][1]-poly[j][1])>.035){
            face(poly[i],shelf[i],shelf[j],earth);face(poly[i],shelf[j],poly[j],earth);
          }
        }
        for(let ix=Math.min(...bounds.map(p=>p[0]));ix<=Math.max(...bounds.map(p=>p[0]));ix++)
          for(let iz=Math.min(...bounds.map(p=>p[1]));iz<=Math.max(...bounds.map(p=>p[1]));iz++){
            const key=ix+','+iz;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(shelf);
          }
      }
    }
  }
  if(!verts.length)return null;
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(verts,3));
  g.setAttribute('uv',farmTexcoords(T,verts,cx,cz));
  g.setAttribute('color',new T.Float32BufferAttribute(colours,3));g.computeVertexNormals();
  const mesh=new T.Mesh(g,material);mesh.name='Lao Chai rice terrace benches';
  mesh.receiveShadow=true;group.add(mesh);
  return (x,z)=>{
    const list=cells.get(Math.floor(x/cell)+','+Math.floor(z/cell));
    for(const poly of list||[]){
      let inside=false;
      for(let i=0,j=poly.length-1;i<poly.length;j=i++){
        const a=poly[i],b=poly[j];
        if((a[2]>z)!==(b[2]>z)&&x<(b[0]-a[0])*(z-a[2])/(b[2]-a[2])+a[0])inside=!inside;
      }
      if(inside)return poly[0][1];
    }
    return null;
  };
}

function farmTexcoords(T,positions,cx,cz){
  const uv=[];
  for(let i=0;i<positions.length;i+=3)uv.push(positions[i]*.65+(cx*.65)%1,positions[i+2]*.65+(cz*.65)%1);
  return new T.Float32BufferAttribute(uv,2);
}

// Grounded ribbons are restricted to the near field. Water is cut by the
// existing shoreline mesh, which supplies both the bank and the immersion test.
function* buildFarmEdges(T,{features,cx,cz,reach,ground,blocked,existingBridge,shore,group,material}){
  const verts=[],colours=[],indices=[],decks=[],deckIndices=[],crossings=[];
  const stats={boundaries:0,tracks:0,bridges:0};
  let work=0;
  function ribbon(ax,az,bx,bz,half,kind){
    const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
    if(len<.08)return;
    const fx=dx/len,fz=dz/len,near=Math.max(0,Math.min(len,-ax*fx-az*fz));
    const depth=reach**2-(ax+fx*near)**2-(az+fz*near)**2;
    if(depth<=0)return;
    const radius=Math.sqrt(depth),lo=Math.max(0,near-radius),hi=Math.min(len,near+radius);
    const steps=Math.max(1,Math.ceil((hi-lo)/4)),track=kind==='track',terrace=kind==='terrace';
    let previous=-1;
    for(let j=0;j<=steps;j++){
      const d=lo+(hi-lo)*j/steps,x=ax+fx*d,z=az+fz*d;
      if(blocked(x,z,half)){previous=-1;continue;}
      const start=verts.length/3;
      for(const k of [-1,-.52,0,.52,1]){
        const px=x-fz*half*k,pz=z+fx*half*k;
        const soil=ground(px,pz)-.17,crown=track?.04:terrace?.32:.17;
        const h=(1-Math.abs(k))*crown+(track?.035:0);
        verts.push(px,soil+h,pz);
        const rut=track&&Math.abs(k)===.52;
        const tone=rut?[.30,.22,.13]:track?[.18,.205,.09]:
          Math.abs(k)===1?[.12,.104,.066]:[.19,.215,.085];
        colours.push(...tone);
      }
      if(previous>=0)for(let k=0;k<4;k++)indices.push(previous+k,start+k+1,start+k,previous+k,previous+k+1,start+k+1);
      previous=start;
    }
  }
  for(const f of features){
    if((++work&7)===0)yield;
    if(f.kind==='canal'||f.kind==='ditch')continue;
    for(const part of f.parts){
      if(part.length<2)continue;
      if(f.kind==='bridge'){
        const a=part[0],b=part.at(-1),ax=a.x-cx,az=a.z-cz,bx=b.x-cx,bz=b.z-cz;
        const len=Math.hypot(bx-ax,bz-az),mx=(ax+bx)/2,mz=(az+bz)/2;
        if(len<1||len>100||Math.hypot(mx,mz)>reach||existingBridge(f.id,mx,mz,(bx-ax)/len,(bz-az)/len))continue;
        const stations=[0];
        for(let j=1;j<part.length;j++)stations.push(stations[j-1]+Math.hypot(part[j].x-part[j-1].x,part[j].z-part[j-1].z));
        const total=stations.at(-1),y0=ground(ax,az)+.04,y1=ground(bx,bz)+.04;
        const level=shore?.sample(mx,mz,false,false)?.level;
        const rise=Math.max(0,(level??-Infinity)+.28-(y0+y1)/2);
        const height=t=>y0+(y1-y0)*t+rise*(1-Math.abs(2*t-1));
        for(let j=1;j<part.length;j++){
          const p=part[j-1],q=part[j],length=stations[j]-stations[j-1];
          if(length<.05)continue;
          const fx=(q.x-p.x)/length,fz=(q.z-p.z)/length;
          const low=stations[j-1],high=stations[j],stationsOnDeck=[low];
          if(low<total/2&&total/2<high)stationsOnDeck.push(total/2);
          stationsOnDeck.push(high);
          for(let k=1;k<stationsOnDeck.length;k++){
            const s=stationsOnDeck[k-1],end=stationsOnDeck[k],x=p.x-cx+(s-low)*fx,z=p.z-cz+(s-low)*fz;
            const y=height(s/total),ey=height(end/total),l=end-s,i=decks.length/3;
            crossings.push({x,z,fx,fz,l,y,ey});
            for(const [px,py,pz] of [[x,y,z],[x+fx*l,ey,z+fz*l]]){
              for(const [w,dy] of [[-1.05,-.21],[-1.05,0],[1.05,0],[1.05,-.21]])decks.push(px-w*fz,py+dy,pz+w*fx);
            }
            for(let side=0;side<3;side++)deckIndices.push(i+side,i+side+1,i+side+4,i+side+1,i+side+5,i+side+4);
          }
        }
        stats.bridges++;continue;
      }
      const track=f.kind==='track',before=indices.length;
      for(let i=0;i<(track?part.length-1:part.length);i++){
        const a=part[i],b=part[(i+1)%part.length];
        ribbon(a.x-cx,a.z-cz,b.x-cx,b.z-cz,track?1.12:f.kind==='terrace'?.65:.46,f.kind);
        if((++work&127)===0)yield;
      }
      if(indices.length>before)stats[track?'tracks':'boundaries']++;
    }
  }
  for(const [positions,faces,mat,name] of [[verts,indices,material.farmSoil,'Mapped field banks and tracks'],
    [decks,deckIndices,material.concrete,'Mapped farm access bridges']]){
    if(!faces.length)continue;
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    if(positions===verts){
      g.setAttribute('color',new T.Float32BufferAttribute(colours,3));
      g.setAttribute('uv',farmTexcoords(T,positions,cx,cz));
    }
    g.setIndex(faces);g.computeVertexNormals();
    const mesh=new T.Mesh(g,mat);mesh.name=name;mesh.receiveShadow=true;group.add(mesh);
    if(positions===decks){mesh.castShadow=true;shore?.addCover(g);}
  }
  group.userData.agriculture=stats;
  if(!crossings.length)return null;
  return (x,z)=>{
    for(const c of crossings){
      const dx=x-c.x,dz=z-c.z,t=dx*c.fx+dz*c.fz;
      if(t>=0&&t<=c.l&&Math.abs(dz*c.fx-dx*c.fz)<=1.05)return c.y+(c.ey-c.y)*t/c.l;
    }
    return null;
  };
}
