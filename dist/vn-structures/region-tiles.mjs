import {readFootprints,readHeightBlock} from './source.mjs';

async function bundled(folder,key){
  const response=await fetch(new URL(folder+'/'+key+'.gz',import.meta.url));
  if(!response.ok)throw Error('Missing bundled structure tile');
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes[0]!==31||bytes[1]!==139||(folder==='heights'&&bytes.length===512*512))return bytes;
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
}

export async function readRegionTile({kind,key,local,thresholds,source,i,j}){
  if(kind==='height'){
    const pixels=local?await bundled('heights',key):await readHeightBlock({source,i,j});
    if(pixels.length!==512*512)throw Error('Invalid structure height tile');
    return pixels;
  }
  const rows=local?JSON.parse(new TextDecoder().decode(await bundled('footprints',key))):await readFootprints(key,thresholds);
  if(!rows)return null;
  const cells=new Map();
  for(const row of rows){
    const ring=row[4][0];let x=0,y=0,west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
    for(let n=0;n<ring.length;n+=2){
      x+=ring[n];y+=ring[n+1];west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);
    }
    const lon=(west+east)/2e5,lat=(south+north)/2e5;
    const cell=Math.floor(lon/.001)+'_'+Math.floor(lat/.001);
    if(!cells.has(cell))cells.set(cell,[]);
    cells.get(cell).push({row,lon,lat});
  }
  return cells;
}

export function createRegionReader(){
  const pending=new Map();let serial=0,worker;
  try{worker=new Worker(new URL('./region-worker.mjs',import.meta.url),{type:'module'});}
  catch{return readRegionTile;}
  function fallback(){
    worker?.terminate();worker=null;
    for(const task of pending.values())task.resolve(readRegionTile(task.request));
    pending.clear();
  }
  worker.onmessage=({data:{id,value,error}})=>{
    const task=pending.get(id);if(!task)return;
    pending.delete(id);
    if(error)task.reject(Error(error));else task.resolve(value);
  };
  worker.onerror=worker.onmessageerror=fallback;
  return request=>worker?new Promise((resolve,reject)=>{
    const id=++serial;pending.set(id,{request,resolve,reject});
    try{worker.postMessage({id,request});}catch{fallback();}
  }):readRegionTile(request);
}
