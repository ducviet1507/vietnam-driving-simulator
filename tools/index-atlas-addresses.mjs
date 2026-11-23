import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {gzipSync, gunzipSync} from 'node:zlib';

// Run after generating the OSM shards, or to index an existing data export.
const folder=process.argv[2] || fileURLToPath(new URL('../dist/vn-search',import.meta.url));
const manifestPath=path.join(folder,'index.json');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
if(manifest.shards.length>31)throw Error('The address index supports up to 31 shards.');
const worker=await readFile(new URL('../dist/atlas-search-worker.js',import.meta.url),'utf8');
const makeEntry=runInNewContext(worker+'\nmakeEntry',{onmessage:null});

// Use the same normalized text as match(), including administrative aliases.
// A positive bit only selects a file; the worker still checks the entire row.
const masks=new Map();
for(const [i,file] of manifest.shards.entries()){
  const rows=JSON.parse(gunzipSync(await readFile(path.join(folder,file))));
  const terms=new Set();
  for(const row of rows){
    const entry=makeEntry(row);
    if(!/^\d/.test(entry.name))continue;
    for(const field of [entry.name,entry.alias,entry.area]){
      for(const word of field.trim().split(' ')){
        for(let length=2;length<=Math.min(word.length,6);length++){
          terms.add(word.slice(0,length));
        }
      }
    }
  }
  for(const term of terms)masks.set(term,(masks.get(term)||0)|(1<<i));
}
manifest.addressIndex='address-prefixes.gz';
const index=Object.fromEntries([...masks].sort(([a],[b])=>a<b?-1:a>b?1:0));
await writeFile(path.join(folder,manifest.addressIndex),gzipSync(JSON.stringify(index),{level:9}));
await writeFile(manifestPath,JSON.stringify(manifest));
