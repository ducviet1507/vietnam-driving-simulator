'use strict';
// The baked imagery and elevation share the bounds of Web Mercator z8 tiles
// x=200..206, y=110..122. Heights are metres above sea level.
const vietnamReliefStep=32;
function createVietnamRelief(T,scene,compact,landscapes,tunnelCut,landWidth){
  const urls='streetscape/surfaces/vietnam-',imagery=new T.TextureLoader().load(urls+'landcover.webp');
  imagery.colorSpace=T.SRGBColorSpace;
  const nearCentre={value:new T.Vector2()},eye={value:new T.Vector2()},anchor={value:new T.Vector2()};
  const passSurface=createPassSurface(T);
  const mat=new T.MeshLambertMaterial({name:'Vietnam relief',map:imagery,side:T.DoubleSide,color:0xc9d5bc});
  mat.onBeforeCompile=shader=>{
    shader.uniforms.terrainEye=eye;shader.uniforms.terrainAnchor=anchor;shader.uniforms.nearCentre=nearCentre;
    shader.vertexShader='uniform vec2 terrainEye,terrainAnchor;varying float horizonDistance;varying vec2 canopy;\n'+shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\n canopy=terrainAnchor+position.xz; horizonDistance=distance(terrainEye,position.xz);');
    shader.fragmentShader=`uniform vec2 nearCentre;varying float horizonDistance;
      varying vec2 canopy;
      float standHash(vec2 i){vec3 p=fract(vec3(i.xyx)*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float standNoise(vec2 x){
        vec2 cell=floor(x),f=fract(x);f=f*f*(3.-2.*f);
        return mix(mix(standHash(cell),standHash(cell+vec2(1,0)),f.x),mix(standHash(cell+vec2(0,1)),standHash(cell+vec2(1,1)),f.x),f.y);
      }\n`+shader.fragmentShader.replace('#include <map_fragment>',
      `#include <map_fragment>\n vec2 local=abs(canopy-nearCentre);if(max(local.x,local.y)<${(landWidth/2).toFixed(1)}) discard; float mottling=(standNoise(canopy*.028)-.5)*.46+(standNoise(canopy*.083)-.5)*.23; diffuseColor.rgb*=1.+mottling*(1.-smoothstep(3500.,11000.,horizonDistance));`)
      .replace('#include <fog_fragment>',
      '#ifdef USE_FOG\n gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,.17+.79*(1.-exp(-horizonDistance*.00009)));\n #endif');
    landscapes.shade(shader,'canopy','1.');
    passSurface.shade(shader,'canopy','.86');
    tunnelCut?.shade(shader,'canopy');
  };
  const texels=Float32Array.from({length:256},(_,v)=>3500*(v/255)**1.6);
  // Fixed geographic lattice: shared ridgelines retain exactly the same vertices
  // when the streaming window moves by one cell.
  const cells=compact?128:160,spacing=512,stride=cells+1;
  const axis=new Float32Array(stride);
  for(let i=1;i<=cells/2;i++){
    const tail=(i-40)/(cells/2-40),size=i<=40?vietnamReliefStep:tail<=.25?64:tail<=.50?128:tail<=.75?384:1024;
    axis[cells/2+i]=axis[cells/2+i-1]+size;axis[cells/2-i]=-axis[cells/2+i];
  }
  const count=stride*stride,indices=[];
  for(let j=0;j<cells;j++)for(let k=0;k<cells;k++){
    const a=j*stride+k,b=a+stride;indices.push(a,b,a+1,a+1,b,b+1);
  }
  const triangles=new T.Uint16BufferAttribute(indices,1);
  function horizonGeometry(){
    const geometry=new T.BufferGeometry();
    for(const [name,size] of [['position',3],['normal',3],['uv',2]]){
      geometry.setAttribute(name,new T.BufferAttribute(new Float32Array(count*size),size).setUsage(T.DynamicDrawUsage));
    }
    geometry.setIndex(triangles);return geometry;
  }
  const mesh=new T.Mesh(horizonGeometry(),mat);mesh.name='Vietnam terrain horizon';mesh.visible=false;mesh.frustumCulled=false;scene.add(mesh);
  let spare,building=null,displayedTerrain;
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
  // Meshes, tyres and landmark foundations share these triangles and vertical datum.
  const step=vietnamReliefStep,cacheSide=128,cacheMask=cacheSide-1;
  function sampleTerrain(graph,activePass,landscapes){
  const nodes=new Float64Array(cacheSide*cacheSide),nodeX=new Int32Array(nodes.length),nodeZ=new Int32Array(nodes.length);
  nodes.fill(NaN);
  const base=graph&&pixels?elevation(...uvAt(0,0,graph)):0;
  const hoanKiem=graph?.point?.(105.8521,21.02865);
  function localDatum(x,z,surface){
    if(!hoanKiem)return surface-base;
    const east=(x-hoanKiem.x)/340,south=(z-hoanKiem.z)/525;
    if(Math.abs(east)>=1.55||Math.abs(south)>=1.55)return surface-base;
    // Hanoi H1-1B, decision 1360/QĐ-UBND §4.5.2.2: ground formation 8.4–11.5 m.
    // Roofs and trees in the DSM otherwise create a 10% descent into Hồ Gươm.
    // Keep small changes in the street grade. The mapped shoreline supplies the bank and bed.
    const formation=T.MathUtils.clamp(8.4+(surface-8.4)*.10,8.4,11.5);
    const blend=1-T.MathUtils.smoothstep(Math.hypot(east,south),.85,1.55);
    return surface+(formation-surface)*blend-base;
  }
  function height(x,z,u,v){
    let regional=elevation(u,v);
    if(activePass){
      const p=activePass,east=(x-p.x)*p.eastScale,south=z-p.z;
      const tx=east*p.cos+south*p.sin,tz=-east*p.sin+south*p.cos;
      const weight=1-T.MathUtils.smoothstep(Math.max(Math.abs(tx),Math.abs(tz)),11200,15200);
      if(weight)regional+=(p.grid.elevation(tx,tz)-regional)*weight;
    }
    const centre=landscapes.elevation(x,z);
    if(centre===null)return localDatum(x,z,regional);
    // A surface model can include a roof or a tree crown. Remove isolated spikes
    // over one survey pixel while retaining the full rise between valley and ridge.
    const west=landscapes.elevation(x-32,z)??centre,east=landscapes.elevation(x+32,z)??centre;
    const north=landscapes.elevation(x,z-32)??centre,south=landscapes.elevation(x,z+32)??centre;
    const average=(north+south+east+west)*.25;
    const cleaned=.75*Math.min(centre,Math.max(west,east,north,south)+2)+.25*average;
    const weight=landscapes.elevationWeight(x,z);
    return localDatum(x,z,regional+(cleaned-regional)*weight);
  }
  function node(i,j){
    const key=(j&cacheMask)*cacheSide+(i&cacheMask);
    if(nodeX[key]===i&&nodeZ[key]===j&&!Number.isNaN(nodes[key]))return nodes[key];
    const x=i*step,z=j*step,value=height(x,z,...uvAt(x,z,graph));
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
  return {graph,pass:activePass,landscapes,base,ground,grade,height,step,revision:Symbol(),
    altitude:(x,z)=>graph&&pixels?base+ground(x,z):0};
  }
  const byGraph=new WeakMap(),requested=new WeakMap(),passCache=new Map();
  let activePass=null;
  async function loadLocal(g,x,z){
    const current=byGraph.get(g);
    let closest=null,range=12000;
    for(const stage of [...(window.mountainStages||[]),...(window.landmarkTerrain||[])]){
      const p=g.point(...stage.start),dist=Math.hypot(p.x-x,p.z-z);
      if(dist<range){range=dist;closest={...p,stage};}
    }
    requested.set(g,closest?.stage.id);
    if(!closest){byGraph.delete(g);return !!current;}
    if(current?.stage.id===closest.stage.id)return false;
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
    if(!grid||requested.get(g)!==stage.id||byGraph.get(g)?.stage.id===stage.id)return false;
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
      terrain=next;graph=next.graph;activePass=next.pass;
      building=null;
      passSurface.select(activePass?.stage.id,activePass?.x,activePass?.z,activePass?.cos,activePass?.sin,activePass?.eastScale);
    }
    originX=x;originZ=z;nearCentre.value.set(Math.round(x/step)*step,Math.round(z/step)*step);
  }
  const ground=(x,z)=>terrain.ground(x,z);
  function* buildHorizon(ax,az){
    const target=spare??=horizonGeometry(),attrs=target.attributes;
    const pos=attrs.position.array,uv=attrs.uv.array;
    const us=Float64Array.from(axis,dx=>uvAt(ax+dx,az)[0]);
    for(let j=0,i=0;j<=cells;j++){
      const dz=axis[j],v=uvAt(ax,az+dz)[1];
      for(let k=0;k<=cells;k++,i++){
        const dx=axis[k],u=us[k];
        pos[i*3]=dx;pos[i*3+1]=terrain.height(ax+dx,az+dz,u,v)-.17;pos[i*3+2]=dz;
        uv[i*2]=u;uv[i*2+1]=1-v;
      }
      if((j&3)===3)yield;
    }
    yield* updateTerrainNormals(T,target);
    for(const attr of Object.values(attrs))attr.needsUpdate=true;
    target.boundingSphere=null;
    spare=mesh.geometry;mesh.geometry=target;anchorX=ax;anchorZ=az;anchor.value.set(ax,az);displayedTerrain=terrain;
  }
  function update(x,z){
    if(!graph||!pixels)return;
    const [u,v]=uvAt(x,z);mesh.visible=u>=0&&u<1&&v>=0&&v<1;if(!mesh.visible)return;
    const ax=Math.round(x/spacing)*spacing,az=Math.round(z/spacing)*spacing;
    if(!building&&(ax!==anchorX||az!==anchorZ||displayedTerrain!==terrain))building=buildHorizon(ax,az);
    if(building){
      const deadline=displayedTerrain?.graph===graph?performance.now()+1.5:Infinity;
      do{if(building.next().done){building=null;break;}}while(performance.now()<deadline);
    }
    mesh.position.set(anchorX-originX,0,anchorZ-originZ);eye.value.set(x-anchorX,z-anchorZ);
  }
  return {prepare,activate,update,loadLocal,ready,ground,step,passSurface};
}
