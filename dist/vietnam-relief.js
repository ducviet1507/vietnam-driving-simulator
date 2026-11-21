'use strict';
// The baked imagery and elevation share the bounds of Web Mercator z8 tiles
// x=200..206, y=110..122. Heights are metres above sea level.
function createVietnamRelief(T,scene,compact,landscapes,tunnelCut){
  const urls='streetscape/surfaces/vietnam-',imagery=new T.TextureLoader().load(urls+'landcover.webp');
  imagery.colorSpace=T.SRGBColorSpace;
  const datum={value:0},passWeight={value:0},closeDetail={value:0},eye={value:new T.Vector2()},anchor={value:new T.Vector2()};
  const passSurface=createPassSurface(T);
  const mat=new T.MeshLambertMaterial({name:'Vietnam relief',map:imagery,side:T.DoubleSide,color:0xc9d5bc});
  mat.onBeforeCompile=shader=>{
    shader.uniforms.terrainDatum=datum;shader.uniforms.passWeight=passWeight;shader.uniforms.terrainEye=eye;shader.uniforms.terrainAnchor=anchor;
    shader.uniforms.closePassDetail=closeDetail;
    shader.vertexShader='attribute vec2 summitSurface;attribute float coarseElevation; uniform float terrainDatum,passWeight,closePassDetail;uniform vec2 terrainEye,terrainAnchor;varying float horizonDistance;varying vec2 canopy;\n'+shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\n canopy=terrainAnchor+position.xz; horizonDistance=distance(terrainEye,position.xz); transformed.y=(mix(coarseElevation,position.y,passWeight*mix(smoothstep(700.,1450.,horizonDistance),1.,closePassDetail))-terrainDatum)*mix(.43,.9,smoothstep(1800.,9500.,horizonDistance))-mix(70.,5.,smoothstep(530.,1500.,horizonDistance)); transformed.y=mix(transformed.y,summitSurface.x-mix(1.,.17,smoothstep(780.,1000.,horizonDistance)),summitSurface.y);');
    shader.fragmentShader=`varying float horizonDistance;
      varying vec2 canopy;
      float standHash(vec2 i){vec3 p=fract(vec3(i.xyx)*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float standNoise(vec2 x){
        vec2 cell=floor(x),f=fract(x);f=f*f*(3.-2.*f);
        return mix(mix(standHash(cell),standHash(cell+vec2(1,0)),f.x),mix(standHash(cell+vec2(0,1)),standHash(cell+vec2(1,1)),f.x),f.y);
      }\n`+shader.fragmentShader.replace('#include <map_fragment>',
      '#include <map_fragment>\n float mottling=(standNoise(canopy*.028)-.5)*.46+(standNoise(canopy*.083)-.5)*.23; diffuseColor.rgb*=1.+mottling*(1.-smoothstep(3500.,11000.,horizonDistance));')
      .replace('#include <fog_fragment>',
      '#ifdef USE_FOG\n gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,.17+.79*(1.-exp(-horizonDistance*.00009)));\n #endif');
    landscapes.shade(shader,'canopy','1.');
    passSurface.shade(shader,'canopy','.86');
    tunnelCut?.shade(shader,'canopy');
  };
  const texels=Float32Array.from({length:256},(_,v)=>3500*(v/255)**1.6);
  // Fixed geographic lattice: shared ridgelines retain exactly the same vertices
  // when the streaming window moves by one cell.
  const geometry=new T.BufferGeometry(),cells=compact?128:160,spacing=512,stride=cells+1;
  const axis=new Float32Array(stride);
  for(let i=1;i<=cells/2;i++){
    const f=i/(cells/2),size=f<=.42?64:f<=.64?128:f<=.83?256:512;
    axis[cells/2+i]=axis[cells/2+i-1]+size;axis[cells/2-i]=-axis[cells/2+i];
  }
  // Keep the same 64 m triangle under the pagoda even in the distant, coarser mesh.
  function summitAxis(offset){
    const i=axis.findIndex(value=>value>offset);
    if(i<1||i>=cells)return axis;
    const result=axis.slice(),low=Math.floor(offset/64)*64;
    result[i-1]=low;result[i]=low+64;return result;
  }
  const count=stride*stride,pos=new Float32Array(count*3),uv=new Float32Array(count*2),coarse=new Float32Array(count),indices=[];
  for(let j=0;j<cells;j++)for(let k=0;k<cells;k++){
    const a=j*stride+k,b=a+stride;indices.push(a,b,a+1,a+1,b,b+1);
  }
  const summitSurface=new T.BufferAttribute(new Float32Array(count*2),2);geometry.setAttribute('summitSurface',summitSurface);
  geometry.setAttribute('coarseElevation',new T.BufferAttribute(coarse,1));geometry.setAttribute('position',new T.BufferAttribute(pos,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setIndex(indices);
  const mesh=new T.Mesh(geometry,mat);mesh.name='Vietnam terrain horizon';mesh.visible=false;mesh.frustumCulled=false;scene.add(mesh);
  let graph=null,originX=0,originZ=0,anchorX=NaN,anchorZ=NaN,pixels=null,width=0,height=0;
  function uvAt(x,z,g=graph){
    const [lon,lat]=g.geo(x,z),r=lat*Math.PI/180;
    return [((lon+180)/360*256-200)/7,((1-Math.asinh(Math.tan(r))/Math.PI)*128-110)/13];
  }
  function elevation(u,v){
    const px=Math.max(0,Math.min(width-1,u*width-.5)),py=Math.max(0,Math.min(height-1,v*height-.5));
    const x=Math.floor(px),y=Math.floor(py),right=Math.min(x+1,width-1),down=Math.min(y+1,height-1),fx=px-x,fy=py-y;
    const a=texels[pixels[y*width+x]],b=texels[pixels[y*width+right]],c=texels[pixels[down*width+x]],d=texels[pixels[down*width+right]];
    return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
  }
  let finishLoad;const ready=new Promise(resolve=>{finishLoad=resolve;});
  const heights=new Image();heights.onerror=()=>finishLoad();heights.onload=()=>{
    width=heights.naturalWidth;height=heights.naturalHeight;
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(heights,0,0);
    const rgba=ctx.getImageData(0,0,width,height).data;pixels=new Uint8Array(width*height);
    for(let i=0;i<pixels.length;i++)pixels[i]=rgba[i*4];
    canvas.width=canvas.height=1;heights.onload=null;heights.removeAttribute('src');finishLoad();
  };heights.src=urls+'elevation.png';
  // The road mesh, terrain and wheels use the same two triangles in each 64 m cell.
  // Directly index nearby lattice vertices. The coordinate tags keep distant
  // locations distinct when they reuse a slot, including west/south of spawn.
  const step=64,cacheSide=64,cacheMask=cacheSide-1;
  function sampleTerrain(graph,activePass,landscapes){
  const nodes=new Float64Array(cacheSide*cacheSide),nodeX=new Int32Array(nodes.length),nodeZ=new Int32Array(nodes.length);
  nodes.fill(NaN);
  const base=graph&&pixels?elevation(...uvAt(0,0,graph)):0;
  function measured(x,z,coarse){
    const h=landscapes.elevation(x,z);
    // A DSM includes roofs and crowns. Retain the street datum in lowlands
    // and limit discontinuities between measured terrain and the regional DEM.
    return h===null?coarse:coarse+Math.max(-95,Math.min(95,h-coarse))*
      T.MathUtils.smoothstep(Math.max(coarse,h-15),18,90)*.85;
  }
  function node(i,j){
    const key=(j&cacheMask)*cacheSide+(i&cacheMask);
    if(nodeX[key]===i&&nodeZ[key]===j&&!Number.isNaN(nodes[key]))return nodes[key];
    const x=i*step,z=j*step;
    // A low-pass reconstruction removes abrupt changes of grade at DEM texel edges.
    const sample=(dx,dz)=>elevation(...uvAt(x+dx,z+dz,graph));
    const h=sample(0,0)*.5+(sample(-105,0)+sample(105,0)+sample(0,-105)+sample(0,105))*.125;
    let value=(measured(x,z,h)-base)*.43;
    if(activePass?.stage.id==='kim-bang'){
      const east=(x-activePass.x)*activePass.eastScale,south=z-activePass.z;
      const weight=1-T.MathUtils.smoothstep(Math.hypot(east,south),3600,5600);
      // Preserve the lake datum while the limestone summit rises above the halls.
      const local=activePass.grid.elevation(east,south);
      value+=((local-10)*.80+(10-base)*.43-value)*weight;
    }else if(activePass&&scenicPasses.has(activePass.stage.id)){
      const p=activePass,east=(x-p.x)*p.eastScale,south=z-p.z;
      const tx=east*p.cos+south*p.sin,tz=-east*p.sin+south*p.cos;
      const weight=1-T.MathUtils.smoothstep(Math.max(Math.abs(tx),Math.abs(tz)),4200,5400);
      // The drivable mesh shares these samples with the tyres. Filter single
      // DEM-cell spikes while preserving the relief across the road and valley.
      const h=p.grid.elevation(tx,tz)*.5+.125*(p.grid.elevation(tx-40,tz)+p.grid.elevation(tx+40,tz)+
        p.grid.elevation(tx,tz-40)+p.grid.elevation(tx,tz+40));
      value+=((h-base)*.43-value)*weight;
    }
    nodeX[key]=i;nodeZ[key]=j;nodes[key]=value;return value;
  }
  function ground(x,z){
    if(!pixels||!graph)return 0;
    const i=Math.floor(x/step),j=Math.floor(z/step),u=x/step-i,v=z/step-j;
    const b=node(i+1,j),c=node(i,j+1);
    if(u+v<=1){const a=node(i,j);return a+(b-a)*u+(c-a)*v;}
    const d=node(i+1,j+1);return d+(c-d)*(1-u)+(b-d)*(1-v);
  }
  function grade(x,z,yaw){
    const dx=2*Math.sin(yaw),dz=-2*Math.cos(yaw);
    return (ground(x+dx,z+dz)-ground(x-dx,z-dz))/4;
  }
  return {graph,pass:activePass,landscapes,base,ground,grade,measured,step,revision:Symbol(),
    altitude:(x,z)=>graph&&pixels?base+ground(x,z)/.43:0};
  }
  const byGraph=new WeakMap(),passCache=new Map();
  let activePass=null;
  async function loadLocal(g,x,z){
    const current=byGraph.get(g);
    if(current&&Math.hypot(current.x-x,current.z-z)<12000)return false;
    let closest=null,range=12000;
    for(const stage of [...(window.mountainStages||[]),...(window.landmarkTerrain||[])]){
      const p=g.point(...stage.start),dist=Math.hypot(p.x-x,p.z-z);
      if(dist<range){range=dist;closest={...p,stage};}
    }
    if(!closest){byGraph.delete(g);return !!current;}
    const {stage}=closest;
    if(!passCache.has(stage.id)){
      const promise=fetch('stage-terrain/'+stage.id+'.js').then(async response=>{
        if(!response.ok)throw Error(response.status);
        const match=/^window\.loadStageRelief\("([A-Za-z0-9+/=]+)"\);?\s*$/.exec(await response.text());
        if(!match)throw Error('Invalid elevation tile');
        return window.decodePassTerrain(match[1],stage.id);
      }).catch(()=>{passCache.delete(stage.id);return null;});
      passCache.set(stage.id,promise);
      if(passCache.size>3)passCache.delete(passCache.keys().next().value);
    }
    const grid=await passCache.get(stage.id);
    if(!grid)return false;
    const bearing=stage.bearing*Math.PI/180;
    // Convert world X back to east metres at the raster centre latitude.
    byGraph.set(g,{...closest,grid,sin:Math.sin(bearing),cos:Math.cos(bearing),
      eastScale:Math.cos(stage.start[1]*Math.PI/180)/Math.cos(g.lat*Math.PI/180)});
    return true;
  }
  let terrain=sampleTerrain(null,null,null);
  function prepare(g,view){
    const pass=g?byGraph.get(g):null;
    if(terrain.graph===g&&terrain.pass===pass&&terrain.landscapes===view)return terrain;
    return sampleTerrain(g,pass,view);
  }
  function activate(next,x,z){
    if(next!==terrain){
      terrain=next;graph=next.graph;activePass=next.pass;datum.value=next.base;
      anchorX=anchorZ=NaN;closeDetail.value=scenicPasses.has(activePass?.stage.id)?1:0;
      passSurface.select(activePass?.stage.id,activePass?.x,activePass?.z,activePass?.cos,activePass?.sin,activePass?.eastScale);
    }
    originX=x;originZ=z;
  }
  const ground=(x,z)=>terrain.ground(x,z);
  function update(x,z){
    if(!graph||!pixels)return;
    const [u,v]=uvAt(x,z);mesh.visible=u>=0&&u<1&&v>=0&&v<1;if(!mesh.visible)return;
    const ax=Math.round(x/spacing)*spacing,az=Math.round(z/spacing)*spacing;
    if(ax!==anchorX||az!==anchorZ){
      anchorX=ax;anchorZ=az;anchor.value.set(ax,az);let i=0;
      const pagoda=activePass?.stage.id==='kim-bang'&&window.VietnamSights?.find(site=>site.id==='chua-ngoc-tam-chuc');
      const peak=pagoda&&graph.point(pagoda.lon,pagoda.lat);
      const nearPeak=peak&&Math.hypot(peak.x-ax,peak.z-az)<5000;
      const xs=nearPeak?summitAxis(peak.x-ax):axis,zs=nearPeak?summitAxis(peak.z-az):axis;
      for(let j=0;j<=cells;j++)for(let k=0;k<=cells;k++,i++){
        const dx=xs[k],dz=zs[j];
        const blend=nearPeak?1-T.MathUtils.smoothstep(Math.hypot(ax+dx-peak.x,az+dz-peak.z),135,640):0;
        summitSurface.setXY(i,blend?ground(ax+dx,az+dz):0,blend);
        const [u,v]=uvAt(ax+dx,az+dz);
        let h=elevation(u,v);h=terrain.measured(ax+dx,az+dz,h);coarse[i]=h;
        if(activePass){
          const p=activePass,east=(ax+dx-p.x)*p.eastScale,south=az+dz-p.z;
          const tx=east*p.cos+south*p.sin,tz=-east*p.sin+south*p.cos;
          const coverage=1-T.MathUtils.smoothstep(Math.max(Math.abs(tx),Math.abs(tz)),11200,15200);
          h+=(p.grid.elevation(tx,tz)-h)*coverage;
        }
        pos.set([dx,h,dz],i*3);uv.set([u,1-v],i*2);
      }
      summitSurface.needsUpdate=true;geometry.attributes.coarseElevation.needsUpdate=geometry.attributes.position.needsUpdate=geometry.attributes.uv.needsUpdate=true;geometry.computeVertexNormals();
    }
    passWeight.value=activePass?1-T.MathUtils.smoothstep(Math.hypot(x-activePass.x,z-activePass.z),8600,12000):0;
    mesh.position.set(anchorX-originX,0,anchorZ-originZ);eye.value.set(x-anchorX,z-anchorZ);
  }
  return {prepare,activate,update,loadLocal,ready,ground,step,passSurface};
}
