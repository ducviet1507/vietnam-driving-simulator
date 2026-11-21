'use strict';
// Each cell covers 1/32 degree. Page slots run west to east, then north to south.
function sightRasterPages(base,grid,extensions){
  const pages=new Map(),byGraph=new WeakMap();
  let index;
  function page(name){
    if(!pages.has(name)){
      const read=ext=>new Promise((resolve,reject)=>{
        const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=base+name+ext;
      });
      pages.set(name,Promise.all(extensions.map(read)).catch(e=>{pages.delete(name);throw e;}));
    }
    return pages.get(name);
  }
  async function load(graph,x,z){
    const [lon,lat]=graph.geo(x,z),west=Math.floor(lon*grid)-1,north=Math.floor(lat*grid)+2;
    const last=byGraph.get(graph);
    if(last?.west===west&&last.north===north)return false;
    const next={west,north,cells:[],ready:false,previous:last?.ready?last:last?.previous};
    byGraph.set(graph,next);
    try{
      index??=fetch(base+'index.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(book=>{
        const cells=new Map();
        for(const [tag,slots] of Object.entries(book)){
          const x=Number(tag.slice(4))*grid,y=Number(tag.slice(1,3))*grid;
          slots.forEach(([i,j],n)=>cells.set((x+i)+','+(y+j),{name:tag+'-'+Math.floor(n/32),slot:n%32}));
        }
        return cells;
      }).catch(e=>{index=null;throw e;});
      const book=await index,needed=new Set();
      for(let j=0;j<3;j++)for(let i=0;i<3;i++){
        const tile=book.get((west+i)+','+(north-1-j));if(!tile)continue;
        needed.add(tile.name);
        next.cells.push({...tile,i,j});
      }
      await Promise.all(next.cells.map(async tile=>{tile.images=await page(tile.name);}));
      if(byGraph.get(graph)!==next)return false;
      next.ready=true;delete next.previous;
      for(const key of pages.keys())if(!needed.has(key))pages.delete(key);
      return true;
    }catch{if(byGraph.get(graph)===next){if(next.previous)byGraph.set(graph,next.previous);else byGraph.delete(graph);}return false;}
  }
  return {load,current(graph){
    const found=graph&&byGraph.get(graph);
    return found?.ready?found:found?.previous||null;
  }};
}
function createSightLandscapes(T){
  const grid=32,size=96,side=3*size;
  const coarse=sightRasterPages('sight-landscapes/',grid,['.webp','.surface.webp','-water.png']);
  const fine=sightRasterPages('sight-imagery/',grid*4,['.webp']);
  let front,spare;
  function createView(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=side;
  const colour=canvas.getContext('2d');
  const mask=canvas.cloneNode(),surface=mask.getContext('2d',{willReadFrequently:true});
  canvas.width=canvas.height=side*4;
  const water=document.createElement('canvas');water.width=water.height=side*4;
  const waterPen=water.getContext('2d',{willReadFrequently:true});
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const waterTexture=new T.CanvasTexture(water);
  const uniforms={sightImage:{value:texture},sightWater:{value:waterTexture},sightBounds:{value:new T.Vector4(0,0,1,1)},sightEnabled:{value:0}};
  let active=null,activeFine=null,pixels=null;
  function setOrigin(graph){
    const next=coarse.current(graph),detail=fine.current(graph);
    if(active===next&&activeFine===detail)return;
    active=next;activeFine=detail;pixels=null;uniforms.sightEnabled.value=0;
    if(!next?.cells.length)return;
    colour.clearRect(0,0,canvas.width,canvas.height);surface.clearRect(0,0,side,side);waterPen.clearRect(0,0,water.width,water.height);
    for(const {slot,i,j,images} of next.cells){
      const rect=[slot%8*size,Math.floor(slot/8)*size,size,size,i*size,j*size,size,size];
      colour.drawImage(images[0],...rect.slice(0,4),...rect.slice(4).map(n=>n*4));surface.drawImage(images[1],...rect);
      waterPen.drawImage(images[2],...rect.map(n=>n*4));
    }
    if(detail)for(const {slot,i,j,images} of detail.cells){
      const x=(detail.west-next.west*4+i)*size,y=(next.north*4-detail.north+j)*size;
      colour.drawImage(images[0],slot%8*size,Math.floor(slot/8)*size,size,size,x,y,size,size);
    }
    const origin=graph.point(next.west/grid,next.north/grid);
    uniforms.sightBounds.value.set(origin.x,origin.z,grid/(3*graph.mx),grid/(3*graph.my));
    pixels=surface.getImageData(0,0,side,side).data;
    texture.needsUpdate=waterTexture.needsUpdate=true;uniforms.sightEnabled.value=1;
  }
  function sample(x,z,heights){
    if(!pixels)return null;
    const b=uniforms.sightBounds.value,u=(x-b.x)*b.z*side-.5,v=(z-b.y)*b.w*side-.5;
    const i=Math.floor(u),j=Math.floor(v);
    if(i<0||j<0||i>=side-1||j>=side-1)return null;
    const k=(j*side+i)*4;
    if(!heights)return pixels[k+2]||null;
    const east=k+4,south=k+side*4,se=south+4;
    if(!pixels[k+2]||!pixels[east+2]||!pixels[south+2]||!pixels[se+2])return null;
    const elev=p=>pixels[p]*256+pixels[p+1]-128,fx=u-i,fy=v-j;
    return (elev(k)*(1-fx)+elev(east)*fx)*(1-fy)+(elev(south)*(1-fx)+elev(se)*fx)*fy;
  }
  function paintWater(ctx,cx,cz){
    if(!pixels)return;
    const b=uniforms.sightBounds.value;
    ctx.save();ctx.globalCompositeOperation='destination-over';
    ctx.drawImage(water,b.x-cx,b.y-cz,1/b.z,1/b.w);ctx.restore();
  }
  return {uniforms,setOrigin,matches:graph=>active===coarse.current(graph)&&activeFine===fine.current(graph),
    paintWater,cover:(x,z)=>sample(x,z,false),elevation:(x,z)=>sample(x,z,true),get visible(){return !!pixels;}};
  }
  front=createView();
  const uniforms=Object.fromEntries(Object.entries(front.uniforms).map(([key,u])=>[key,{value:u.value}]));
  async function load(graph,x,z){
    return (await Promise.all([coarse.load(graph,x,z),fine.load(graph,x,z)])).some(Boolean);
  }
  function shade(shader,position='groundMetres',exposure='1.-bankWet'){
    Object.assign(shader.uniforms,uniforms);
    shader.fragmentShader='uniform sampler2D sightImage; uniform sampler2D sightWater; uniform vec4 sightBounds; uniform float sightEnabled;\n'+
      shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 sightUV=(${position}-sightBounds.xy)*sightBounds.zw;
      if(sightEnabled>.5 && all(greaterThan(sightUV,vec2(0.))) && all(lessThan(sightUV,vec2(1.)))){
        vec4 observed=texture2D(sightImage,vec2(sightUV.x,1.-sightUV.y));
        float fineGrain=clamp(dot(diffuseColor.rgb,vec3(.21,.72,.07))*3.8,.60,1.34);
        diffuseColor.rgb=mix(diffuseColor.rgb,observed.rgb*fineGrain,.86*observed.a*(${exposure}));
        float sea=texture2D(sightWater,vec2(sightUV.x,1.-sightUV.y)).a;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.049,.13,.145)+observed.rgb*.10,.91*sea*(${exposure}));
      }`);
  }
  function prepare(graph){
    if(front.matches(graph))return front;
    spare??=createView();spare.setOrigin(graph);return spare;
  }
  function activate(view){
    if(front===view)return;
    spare=front;front=view;
    for(const key of Object.keys(uniforms))uniforms[key].value=view.uniforms[key].value;
  }
  return {load,shade,prepare,activate};
}
