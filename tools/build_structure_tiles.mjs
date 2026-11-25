// Rebuild offline caches from the indexed public releases, from any directory.
// Run index_structure_sources.py first if refreshing the source index.
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {tileKeys,readFootprints,heightBlocks,readHeightBlock} from '../dist/vn-structures/source.mjs';

const base=new URL('../dist/vn-structures/',import.meta.url);
const sources=JSON.parse(await readFile(new URL('source-index.json',base),'utf8'));
const starts=[[105.8521,21.0277],[106.6994,10.7743],[108.2204,16.0677],[106.6821,20.8587],
  [107.5887,16.4645],[108.4373,11.9418],[105.7831,10.0324],[105.1507,9.1769],[104.9844,22.8234],
  [103.959,10.2135],[105.7965,20.555945],
  // Road entrances at Cát Cát, Cu Vai, Bản Đôn and Bản Giốc.
  [103.834512,22.328997],[104.375076,21.512144],[107.7957,12.89736],[106.72272,22.85141]];
const route=[[105.80868,20.53422],[105.81562,20.55036],[105.82136,20.56413],[105.83386,20.57232]];
for(let i=1;i<route.length;i++){
  const [a,b]=[route[i-1],route[i]],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.003);
  for(let j=0;j<=n;j++)starts.push(a.map((v,k)=>v+(b[k]-v)*j/n));
}
const footprints=new Set(),heights=new Map();
for(const [lon,lat] of starts){
  for(const k of tileKeys(lon,lat,950))footprints.add(k);
  for(const b of heightBlocks(sources.heightSources,lon,lat,950))heights.set(b.key,b);
}
await Promise.all(['footprints/','heights/'].map(p=>mkdir(new URL(p,base),{recursive:true})));
let count=0;
const jobs=[...footprints].map(key=>async()=>{
  const rows=await readFootprints(key,sources.thresholds);
  await writeFile(new URL('footprints/'+key+'.gz',base),gzipSync(JSON.stringify(rows),{level:9}));
  count+=rows?.length||0;
});
for(const [key,b] of heights)jobs.push(async()=>{
  const pixels=await readHeightBlock(b);
  await writeFile(new URL('heights/'+key+'.gz',base),gzipSync(pixels,{level:9}));
});
async function worker(){
  for(let next=jobs.shift();next;next=jobs.shift()){
    for(let tries=1;;tries++){
      try{await next();break;}catch(e){if(tries>=3)throw e;}
    }
  }
}
await Promise.all(Array.from({length:8},worker));
const files={footprints:[...footprints].sort(),heights:[...heights.keys()].sort(),buildings:count};
await writeFile(new URL('offline.new',base),JSON.stringify(files));
await rename(new URL('offline.new',base),new URL('offline.json',base));
console.log(count+' mapped footprints, '+files.footprints.length+' footprint tiles, '+files.heights.length+' height blocks.');
