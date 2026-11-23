'use strict';
// Parse and search the country index away from the driving and map render loop.
const types={
  road:['Đường',''],address:['Địa chỉ',''],city:['Thành phố',''],town:['Thị trấn',''],village:['Làng, thôn',''],locality:['Địa danh',''],archipelago:['Quần đảo','quan dao'],
  fuel:['Cây xăng','cay xang|tram xang|tram nhien lieu|gas station'],cafe:['Quán cà phê','quan ca phe|ca phe|cafe|coffee'],
  market:['Chợ','cho|market'],school:['Trường học','truong hoc|truong|dai hoc|school'],hospital:['Bệnh viện','benh vien|benh vien da khoa|hospital'],
  restaurant:['Nhà hàng','nha hang|quan an|restaurant'],hotel:['Khách sạn','khach san|hotel'],shop:['Cửa hàng','cua hang|shop'],
  pharmacy:['Nhà thuốc','nha thuoc|hieu thuoc|pharmacy'],bank:['Ngân hàng','ngan hang|bank'],
  station:['Nhà ga, bến xe','ben xe|nha ga'],attraction:['Điểm tham quan',''],other:['Địa điểm','']
};
const categories=Object.entries(types).flatMap(([kind,[,words]])=>words?words.split('|').map(text=>({kind,text})):[]).sort((a,b)=>b.text.length-a.text.length);
function fold(text){
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d')
    .replace(/\b(?:tp\.?\s*hcm|tphcm|hcmc?|sai gon|saigon|ho chi minh city)\b/g,'ho chi minh')
    .replace(/\b(?:ha noi city|hanoi|hn)\b/g,'ha noi').replace(/\bdanang\b/g,'da nang')
    .replace(/\bql[\s.]*(?=\d)/g,'quoc lo ').replace(/\bdt[\s.]*(?=\d)/g,'duong tinh ')
    .replace(/\bq[.\s]*(?=\d)/g,'quan ').replace(/\bp[.\s]*(?=\d)/g,'phuong ')
    .replace(/\b(?:tp|t\.p)\.(?=\S)/g,'thanh pho ').replace(/\btp\b/g,'thanh pho')
    .replace(/\b(?:bv|dh)\b/g,s=>s==='bv'?'benh vien':'dai hoc')
    .replace(/[^\p{L}\p{N}/-]+/gu,' ').replace(/ +/g,' ').trim();
}
// Allow a single missing, extra, substituted or transposed letter in a name.
function oneEdit(a,b){
  if(a.length<4||Math.abs(a.length-b.length)>1)return false;
  let i=0;while(i<a.length&&a[i]===b[i])i++;
  if(a.length>b.length)return a.slice(i+1)===b.slice(i);
  if(b.length>a.length)return a.slice(i)===b.slice(i+1);
  return a.slice(i+1)===b.slice(i+1)||(a[i]===b[i+1]&&a[i+1]===b[i]&&a.slice(i+2)===b.slice(i+2));
}
const contexts=new Map(),aliasesByText=new Map(),catalog=[],loaded=new Set(),downloads=new Map();
let extras=[],latest=null,loading=false,manifestRequest,addressRequest,manifest,failure=false;
function makeEntry(row,ref=null){
  const [label,kind,x,y,locality,province,aliases]=row;
  const area=[locality,province].filter(Boolean).join(' · ');
  if(!contexts.has(area))contexts.set(area,' '+fold(area)+' ');
  const name=fold(label),alternate=aliases||'';
  if(!aliasesByText.has(alternate))aliasesByText.set(alternate,' '+fold(alternate)+' ');
  return {label,kind,lon:x/1e5,lat:y/1e5,locality,province,ref,name,title:' '+name+' ',alias:aliasesByText.get(alternate),area:contexts.get(area)};
}
function plan(text){
  let query=fold(text),near=/\b(?:gan day|gan toi|gan xe|quanh day|quanh toi|quanh xe|near me|nearby)\b/.test(query);
  query=query.replace(/\b(?:gan day|gan toi|gan xe|quanh day|quanh toi|quanh xe|near me|nearby)\b/g,' ').replace(/ +/g,' ').trim();
  const original=query;
  // “Trường Sa” is a place name even though “trường” alone can mean school.
  const category=categories.find(c=>(c.text!=='truong'||!/^truong sa(?: |$)/.test(query))&&(query===c.text||query.startsWith(c.text+' ')));
  if(category)query=query.slice(category.text.length).trim();
  const anchor=category&&query.match(/^(?:gan|quanh) (.+)$/)?.[1];
  if(anchor){query='';near=true;}
  const number=/^(?:so\s+)?(\d+[a-z]?(?:[/-]\d+[a-z]?)*)(?:\s+|$)/.exec(query)?.[1];
  query=query.replace(/^so\s+(?=\d)/,'');
  const tokens=query.replace(/\b(?:thanh pho|duong|tinh|phuong|quan|huyen|thi xa)\b/g,' ').split(/\s+/).filter(Boolean);
  const street=/^(?:duong|pho|quoc lo) /.test(original);
  return {query,original,category,near,anchor,number,street,tokens:tokens.length?tokens:query.split(' ').filter(Boolean)};
}
function match(e,p,fuzzy){
  if(p.category&&e.kind!==p.category.kind&&!e.title.includes(' '+p.category.text+' ')&&!e.alias.includes(' '+p.category.text+' '))return -1;
  if(p.number&&!e.title.startsWith(' '+p.number+' ')&&e.name!==p.number)return -1;
  if(e.catalogName&&(e.catalogName===p.original||e.catalogName===p.query))return 0;
  if(!p.tokens.length)return 1;
  if(e.name===p.original||(e.featured&&e.title.startsWith(' '+p.original+' ')))return 0;
  let inName=0,typos=0;
  for(let i=0;i<p.tokens.length;i++){
    const token=p.tokens[i],prefix=i===p.tokens.length-1&&!/^\d/.test(token),part=' '+token+(prefix?'':' ');
    if(e.title.includes(part)||e.alias.includes(part)){inName++;continue;}
    if(e.area.includes(part))continue;
    if(fuzzy&&!typos&&token.length>=4&&e.name.split(' ').some(w=>oneEdit(token,w))){typos++;inName++;continue;}
    return -1;
  }
  if(!inName&&!p.category)return -1;
  if(typos)return 9;
  if(e.name===p.query||e.name===p.original)return 0;
  if(p.original.startsWith(e.name+' '))return 1;
  if(p.street&&e.kind==='road'&&p.original.replace(/^(?:duong|pho) /,'').startsWith(e.name+' '))return 2;
  if(e.title.startsWith(' '+p.original))return 1;
  if(e.alias.includes(' '+p.original+' ')||e.title.includes(' '+p.query+' '))return 2;
  return inName===p.tokens.length?3:4;
}
function onlyCurated(filter){return filter==='heritage'||filter==='model'||filter==='mountain';}
function search(input){
  const p=plan(input.text),found=[],seen=new Set();
  const curated=onlyCurated(input.filter),needsCatalog=!curated||!!p.anchor;
  let [cx,cy]=input.center,anchorName='';
  if(p.anchor){
    const words=plan(p.anchor);let best=null,score=Infinity;
    function consider(e){
      const rank=match(e,words,false);
      if(rank<0||rank>4||!words.tokens.some(t=>e.title.includes(' '+t)))return;
      const d=Math.min(1,Math.hypot(e.lon-cx,e.lat-cy)/30);
      const value=rank+(e.ref!=null?0:.25)+d*.2;
      if(value<score){best=e;score=value;}
    }
    for(const e of extras)consider(e);
    for(const e of catalog)consider(e);
    if(best){cx=best.lon;cy=best.lat;anchorName=best.label;}
  }
  const unitX=111.32*Math.cos(cy*Math.PI/180),limit=input.limit||24;
  const wanted=input.filter==='all'?'':fold(input.filter);
  const distance=e=>Math.hypot((e.lon-cx)*unitX,(e.lat-cy)*110.9);
  function collect(e,fuzzy){
    if(wanted&&!(input.filter==='model'?e.ref!=null&&e.custom:input.filter==='mountain'?e.mountain:input.filter==='heritage'?e.heritage:
      e.area.includes(' '+wanted+' ')||e.region===input.filter))return;
    if(p.near&&(Math.abs(e.lat-cy)>.14||Math.abs(e.lon-cx)*unitX>15))return;
    const rank=match(e,p,fuzzy);
    if(rank<0)return;
    const km=distance(e);
    if(p.near&&km>15)return;
    const key=e.name+'|'+Math.round(e.lon*1000)+'|'+Math.round(e.lat*1000);
    if(seen.has(key))return;seen.add(key);
    found.push({e,rank,km});
  }
  if((p.query||p.category)&&(!p.anchor||anchorName)){
    for(const e of extras)collect(e,false);
    if(!curated)for(const e of catalog)collect(e,false);
    if(!found.length&&p.query.length>=4&&!p.number){
      for(const e of extras)collect(e,true);
      if(!curated)for(const e of catalog)collect(e,true);
    }
  }
  found.sort((a,b)=>(p.street?Number(b.e.kind==='road')-Number(a.e.kind==='road'):0)||a.rank-b.rank||
    (!p.near&&!p.category&&a.rank===0?Number(!!b.e.custom)-Number(!!a.e.custom):0)||
    (!p.category?Number(!!b.e.featured)-Number(!!a.e.featured):0)||a.km-b.km||a.e.label.localeCompare(b.e.label,'vi'));
  const hits=found.slice(0,limit).map(({e,km,rank})=>({ref:e.ref,name:e.label||types[e.kind]?.[0],kind:types[e.kind]?.[0]||'Địa điểm',
    lon:e.lon,lat:e.lat,context:[e.locality,e.province].filter(Boolean).join(' · '),km,approx:rank===9}));
  postMessage({id:input.id,hits,total:found.length,near:p.near,anchor:anchorName,missingAnchor:!!p.anchor&&!anchorName,loading:needsCatalog&&!!loading,error:needsCatalog&&failure});
}
async function readCompressed(file){
  const response=await fetch('vn-search/'+file);
  if(!response.ok)throw Error('Search shard '+response.status);
  const bytes=new Uint8Array(await response.arrayBuffer());
  return bytes[0]===31&&bytes[1]===139?new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json():JSON.parse(new TextDecoder().decode(bytes));
}
function getManifest(){
  return manifestRequest??=fetch('vn-search/index.json').then(r=>{
    if(!r.ok)throw Error('Search index '+r.status);
    return r.json();
  }).then(value=>manifest=value).catch(error=>{manifestRequest=null;throw error;});
}
async function candidateFiles(input){
  const manifest=await getManifest(),{shards,addressIndex}=manifest;
  if(input!==latest||loaded.size===shards.length)return [];
  const query=plan(input.text);
  if(!query.number||!addressIndex||shards.length>31)return shards;
  // A numbered match must start with this house number, and all query words
  // must occur in its name, aliases or area. Prefixes also cover partial typing.
  let index;
  try{
    addressRequest??=readCompressed(addressIndex).catch(error=>{addressRequest=null;throw error;});
    index=await addressRequest;
  }catch{return shards;}
  let mask=-1;
  for(const word of query.tokens){
    if(word.length>=2)mask&=index[word.slice(0,6)]??0;
  }
  const files=shards.filter((file,i)=>(mask&(1<<i))&&!loaded.has(file));
  // Short inputs such as “48 H” still span the country. Give a typist time
  // to finish the street name before starting several waves of downloads.
  if(files.length>4)await new Promise(resolve=>setTimeout(resolve,400));
  return files;
}
function loadShard(file){
  if(!downloads.has(file)){
    const request=readCompressed(file).then(rows=>{
      const entries=rows.map(row=>makeEntry(row));
      for(const entry of entries)catalog.push(entry);
      loaded.add(file);
    }).finally(()=>downloads.delete(file));
    downloads.set(file,request);
  }
  return downloads.get(file);
}
async function prepare(input){
  try{
    const files=await candidateFiles(input);
    let next=0;
    async function read(){
      while(input===latest&&next<files.length){
        const file=files[next++];
        if(loaded.has(file))continue;
        try{await loadShard(file);}catch{if(input===latest)failure=true;}
      }
    }
    await Promise.all(Array.from({length:Math.min(4,files.length)},read));
  }catch{if(input===latest)failure=true;}
  if(input===latest){loading=false;search(input);}
}
onmessage=({data})=>{
  if(data.type==='extras'){
    extras=data.entries.map(({row,id,custom,catalogName,mountain,heritage,featured,region})=>
      Object.assign(makeEntry(row,id),{custom,catalogName:catalogName?fold(catalogName):null,mountain,heritage,featured,region}));
    if(latest)search(latest);
  }else if(data.type==='prepare'){getManifest().catch(()=>{});}
  else if(data.type==='query'){
    latest=data;failure=false;
    loading=loaded.size!==manifest?.shards.length&&(!onlyCurated(data.filter)||!!plan(data.text).anchor);
    if(loading)prepare(data);
    search(data);
  }
};
