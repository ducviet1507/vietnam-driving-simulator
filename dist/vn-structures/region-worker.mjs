import {readRegionTile} from './region-tiles.mjs';

self.onmessage=async({data:{id,request}})=>{
  try{
    const value=await readRegionTile(request);
    self.postMessage({id,value},value instanceof Uint8Array?[value.buffer]:[]);
  }catch(error){self.postMessage({id,error:error.message||String(error)});}
};
