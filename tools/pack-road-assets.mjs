import {readFile,readdir,rename,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';

const root=fileURLToPath(new URL('../',import.meta.url));
const clientPath=path.join(root,'dist','client');
const tileName=/^\d+_\d+(?:_\d+_\d+)?\.gz$/;

export function encodeRoadTile(rows){
  // VRD1 stores UTF-8 label tables, then separately compressible varint
  // columns. Coordinates stay in the source's 1e-5 degree integer grid. A
  // shape stores only its interior points: its endpoint coordinates are
  // recovered from node references, without identifying two different IDs.
  const bytes=[];
  function uint(n){
    if(!Number.isSafeInteger(n)||n<0)throw Error('Non-integer road tile value.');
    while(n>=128){bytes.push((n%128)+128);n=Math.floor(n/128);}
    bytes.push(n);
  }
  function signed(n){uint(n<0?-2*n-1:2*n);}
  const nodes=[],byId=new Map(),names=new Map(),kinds=new Map(),starts=[],ends=[];
  function node(id,x,y){
    // A synthetic or rounded endpoint may share an OSM ID without sharing
    // both position integers. Keep each such triple separately.
    let found=byId.get(id);
    for(let v=found;v;v=v.next)if(v.x===x&&v.y===y)return v;
    const v={id,x,y,next:found,index:0};byId.set(id,v);nodes.push(v);return v;
  }
  for(const row of rows){
    const [id,a,b,name,kind,oneway,c]=row;
    if(row.length!==7||!Number.isSafeInteger(id)||typeof name!=='string'||typeof kind!=='string'||
       oneway!==0&&oneway!==1||c.length<4||c.length%2)throw Error('Unexpected road row shape.');
    starts.push(node(a,c[0],c[1]));ends.push(node(b,c.at(-2),c.at(-1)));
    if(!names.has(name))names.set(name,names.size);
    if(!kinds.has(kind))kinds.set(kind,kinds.size);
  }
  nodes.sort((a,b)=>a.id-b.id||a.x-b.x||a.y-b.y);nodes.forEach((v,i)=>v.index=i);
  bytes.push(86,82,68,49);uint(rows.length);uint(nodes.length);
  for(const dict of [names,kinds]){
    uint(dict.size);
    for(const text of dict.keys()){
      const chunk=Buffer.from(text,'utf8');uint(chunk.length);
      for(const byte of chunk)bytes.push(byte);
    }
  }
  for(const field of ['id','x','y']){
    let previous=0;
    for(const v of nodes){signed(v[field]-previous);previous=v[field];}
  }
  let previous=0;
  for(const row of rows){signed(row[0]-previous);previous=row[0];}
  previous=0;
  for(let i=0;i<rows.length;i++){signed(starts[i].index-previous);previous=ends[i].index;}
  for(let i=0;i<rows.length;i++)signed(ends[i].index-starts[i].index);
  for(const row of rows)uint(names.get(row[3]));
  for(const row of rows)uint(kinds.get(row[4]));
  for(const row of rows)uint(row[6].length-4+row[5]);
  for(let axis=0;axis<2;axis++)for(const row of rows){
    const c=row[6];
    for(let j=axis+2;j<c.length-2;j+=2)signed(c[j]-c[j-2]);
  }
  return Buffer.from(bytes);
}

async function processTiles(directory,write){
  // A sparse release checkout only has the exported dist/client tree.
  await import(pathToFileURL(path.join(path.dirname(directory),'road-tile-codec.js')).href);
  const entries=new Set(await readdir(directory));
  const files=[...new Set([...entries].map(name=>name.replace(/\.vrd\.gz$/,'.gz')).filter(name=>tileName.test(name)))].sort();
  if(!files.length)throw Error('Road tile directory is empty: '+directory);
  let sourceBytes=0,packedBytes=0,edges=0,alreadyPacked=0;
  for(const file of files){
    // Sites serves physical assets before invoking the Worker. Only its
    // private representation can occupy a file in the public asset tree.
    const target=path.join(directory,file.replace(/\.gz$/,'.vrd.gz'));
    const input=entries.has(file)?path.join(directory,file):target;
    const original=await readFile(input),source=gunzipSync(original);
    if(RoadTileCodec.packed(source)){
      const rows=RoadTileCodec.decode(source);
      if(!encodeRoadTile(rows).equals(source))throw Error('Invalid previously packed road tile: '+file);
      if(write&&input!==target)await rename(input,target);
      alreadyPacked++;edges+=rows.length;packedBytes+=original.length;continue;
    }
    const rows=JSON.parse(source),packed=gzipSync(encodeRoadTile(rows),{level:9});
    const json=Buffer.from(JSON.stringify(RoadTileCodec.decode(gunzipSync(packed))));
    if(!json.equals(source))throw Error('Road tile round-trip differs: '+file);
    if(write){
      const tmp=target+'.packing-'+process.pid;
      try{
        await writeFile(tmp,packed);
        await rename(tmp,target);
        if(input!==target)await unlink(input);
      }
      finally{await unlink(tmp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
    }
    sourceBytes+=original.length;packedBytes+=packed.length;edges+=rows.length;
  }
  console.log('Road assets: '+files.length+' tiles, '+edges+' edge rows, '+sourceBytes+' new source bytes, '+packedBytes+' packed bytes, '+alreadyPacked+' already packed.');
  return {files:files.length,edges,sourceBytes,packedBytes,alreadyPacked};
}

export async function packRoadAssets(client){
  if(path.resolve(client)!==path.resolve(clientPath))throw Error('Road packing requires the generated dist/client directory.');
  const result=await processTiles(path.join(client,'vn-roads'),true);
  const matrixDir=path.join(client,'route-network');
  for(const name of await readdir(matrixDir)){
    if(!/^costs-\d+\.gz$/.test(name))continue;
    const file=path.join(matrixDir,name),source=gunzipSync(await readFile(file));
    if(source.length%4)throw Error('Invalid source route matrix '+name);
    // VRC1 stores consecutive signed differences in four byte planes, so
    // gzip can compress the long runs in their high bytes independently.
    const count=source.length/4,planes=Buffer.allocUnsafe(source.length+5);
    planes.write('VRC1',0);planes[4]=0;
    let previous=0;
    for(let i=0;i<count;i++){
      const value=source.readInt32LE(i*4),delta=(value-previous)|0;
      for(let byte=0;byte<4;byte++)planes[5+i+count*byte]=(delta>>>(8*byte))&255;
      previous=value;
    }
    if(!source.equals(Buffer.from(RoadTileCodec.routeCosts(planes).buffer)))throw Error('Route costs changed in '+name);
    await writeFile(file.replace(/\.gz$/,'.vrc.gz'),gzipSync(planes,{level:9}));
    await unlink(file);
  }
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  if(process.argv[2]==='--verify')await processTiles(path.join(root,'dist','vn-roads'),false);
  else await packRoadAssets(clientPath);
}
