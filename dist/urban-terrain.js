'use strict';
// GEDTM ground heights and WorldCover built-up influence share the same nodes.
// Load the tiles surrounding the camera, including the far terrain mesh.
function createUrbanTerrain(){
  const graphs=new WeakMap(),images=new Map();
  let index;
  function manifest(){
    if(!index)index=fetch('urban-terrain/index.json').then(async response=>{
      if(!response.ok)throw Error('Missing urban terrain index');
      const {grid,cells,tiles}=await response.json();
      return {grid,cells,tiles:new Set(tiles)};
    }).catch(error=>{index=null;throw error;});
    return index;
  }
  function readTile(key,cells){
    if(images.has(key)){
      const cached=images.get(key);images.delete(key);images.set(key,cached);return cached;
    }
    const promise=new Promise((resolve,reject)=>{
      const image=new Image();
      image.onerror=()=>reject(Error('Missing urban terrain '+key));
      image.onload=()=>{
        try{
          const size=cells+1;
          if(image.naturalWidth!==size||image.naturalHeight!==size)throw Error('Invalid urban terrain '+key);
          const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
          const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
          const pixels=ctx.getImageData(0,0,size,size).data;
          canvas.width=canvas.height=1;resolve(pixels);
        }catch(error){reject(error);}
      };
      image.src='urban-terrain/'+key+'.png';
    }).catch(error=>{if(images.get(key)===promise)images.delete(key);throw error;});
    images.set(key,promise);
    if(images.size>12)images.delete(images.keys().next().value);
    return promise;
  }
  function makeSampler(tiles,cells){
    if(!tiles.length)return null;
    const stride=(cells+1)*4;
    function delta(data,i,source){
      return ((data[i]*256+data[i+1]-32768)*.1-source)*(data[i+2]/255);
    }
    return (x,z,source)=>{
      for(const {origin,sx,sz,data} of tiles){
        const col=(x-origin.x)*sx,row=(z-origin.z)*sz;
        if(col< -1e-8||row< -1e-8||col>cells+1e-8||row>cells+1e-8)continue;
        const u=Math.max(0,Math.min(cells,col)),v=Math.max(0,Math.min(cells,row));
        const i=Math.min(cells-1,Math.floor(u)),j=Math.min(cells-1,Math.floor(v));
        const at=j*stride+i*4,fx=u-i,fz=v-j;
        return source+(1-fz)*((1-fx)*delta(data,at,source)+fx*delta(data,at+4,source))
          +fz*((1-fx)*delta(data,at+stride,source)+fx*delta(data,at+stride+4,source));
      }
      return source;
    };
  }
  async function load(graph,x,z){
    if(!graph?.point||!graph.geo)return false;
    let spec;
    try{spec=await manifest();}catch{return false;}
    const {grid,cells,tiles}=spec,range=18000;
    const [west,north]=graph.geo(x-range,z-range),[east,south]=graph.geo(x+range,z+range);
    const keys=[];
    for(let iy=Math.floor(south*grid);iy<=Math.floor(north*grid);iy++)
      for(let ix=Math.floor(west*grid);ix<=Math.floor(east*grid);ix++){
        const key=ix+'_'+iy;
        if(tiles.has(key))keys.push(key);
      }
    let state=graphs.get(graph);
    if(!state){state={signature:'',sampler:null,resident:new Map()};graphs.set(graph,state);}
    const signature=keys.join(',');
    if(state.pending?.signature===signature)return state.pending.promise;
    if(state.signature===signature){state.pending=null;return false;}
    const request={signature};state.pending=request;
    request.promise=Promise.allSettled(keys.map(key=>state.resident.get(key)??readTile(key,cells))).then(results=>{
      if(state.pending!==request)return false;
      state.pending=null;
      const loaded=[];
      results.forEach((result,i)=>{
        if(result.status!=='fulfilled')return;
        const [ix,iy]=keys[i].split('_').map(Number);
        const origin=graph.point(ix/grid,(iy+1)/grid),end=graph.point((ix+1)/grid,iy/grid);
        loaded.push({key:keys[i],origin,sx:cells/(end.x-origin.x),sz:cells/(end.z-origin.z),data:result.value});
      });
      const next=loaded.map(tile=>tile.key).join(',');
      if(state.signature===next)return false;
      state.signature=next;state.sampler=makeSampler(loaded,cells);
      state.resident=new Map(loaded.map(tile=>[tile.key,tile.data]));return true;
    });
    return request.promise;
  }
  return {load,current:graph=>graphs.get(graph)?.sampler??null};
}
