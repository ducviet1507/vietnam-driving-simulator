// Run against the development server, e.g. node tools/smoke/capture-landmark-previews.mjs
// --base=http://127.0.0.1:8000/ --workers=2. By default only missing WebPs are written.
import {chromium} from 'playwright-core';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createContext,runInContext} from 'node:vm';
import {parseArgs} from 'node:util';

const {values}=parseArgs({options:{
  base:{type:'string',default:'http://127.0.0.1:8000/'},workers:{type:'string',default:'1'},
  id:{type:'string',multiple:true},view:{type:'string',default:'0'},zoom:{type:'string',default:'1'},
  replace:{type:'boolean'},list:{type:'boolean'}
}});
const root=fileURLToPath(new URL('../../dist/',import.meta.url));
const dest=id=>join(root,'landmark-previews',id+'.webp');
const base=new URL(values.base),workers=Number(values.workers),view=Number(values.view),zoom=Number(values.zoom);
if(![1,2].includes(workers)||!Number.isInteger(view)||view<0||!(zoom>=.35&&zoom<=2.8))throw Error('Invalid workers, view, or zoom');
if(values.replace&&!values.id?.length)throw Error('--replace requires explicit --id values');
const read=name=>readFileSync(join(root,name),'utf8');
const html=read('index.html'),scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const first=scripts.indexOf('sight-details.js'),last=scripts.indexOf('vietnam-landmarks.js');
if(first<0||last<first)throw Error('Landmark registration scripts missing from dist/index.html');
const vm=createContext({});
vm.window=vm;
for(const file of scripts.slice(first,last+1))runInContext(read(file),vm,{filename:file});
const all=vm.VietnamLandmarks.entries;
if(values.id?.some(id=>!all.some(site=>site.id===id)))throw Error('Unrecognised landmark ID');
const sites=all.filter(p=>(!values.id||values.id.includes(p.id))&&(values.replace||!existsSync(dest(p.id))));
console.log(all.length+' models, '+sites.length+' requested previews');
if(values.list){for(const p of sites)console.log(p.id);process.exit(0);}
// Local districts overlap. A nearest-neighbour order lets the actual world
// renderer reuse the same streamed buildings, water, terrain and textures.
function distance(a,b){return (a.lat-b.lat)**2+((a.lon-b.lon)*Math.cos(a.lat*Math.PI/180))**2;}
const remaining=[...sites].sort((a,b)=>a.lat-b.lat),ordered=[];
while(remaining.length){
  const prev=ordered.at(-1);
  const i=prev?remaining.reduce((best,s,j)=>distance(s,prev)<distance(remaining[best],prev)?j:best,0):0;
  ordered.push(remaining.splice(i,1)[0]);
}
const failures=[];
let written=0;
async function newPage(browser,id){
  const page=await browser.newPage({viewport:{width:432,height:294},deviceScaleFactor:1});
  page.setDefaultTimeout(120000);
  const url=new URL(base);url.searchParams.set('landmark',id);url.searchParams.set('view','tour');
  try{
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof mode!=='undefined'&&(mode==='tour'||mode==='error'),null,{timeout:150000});
    const error=await page.evaluate(()=>mode==='error'?document.getElementById('loadStatus').textContent:'');
    if(error)throw Error(error);
    return page;
  }catch(e){await page.close();throw e;}
}
async function frame(page,id){
  const ready=page.evaluate(async ({id,view})=>{
    const site=VietnamLandmarks.entries.find(p=>p.id===id);
    if(!site)throw Error('Served index is missing '+id);
    if(car.sightView?.monument.data.id!==id)await frameStop(site);
    const {x,z}=roads.point(site.lon,site.lat);
    if(!gfx.nearLandmark(x,z,id)&&!(site.surveyed&&gfx.sightFootprint(site,x,z)))throw Error('Model geometry did not load for '+id);
    const monument=car.sightView.monument;
    if(monument.data.id!==id)throw Error('Unexpected tour subject '+monument.data.id);
    if(view&&!monument.data.views?.[view])throw Error('Unavailable camera '+view);
    showMonument(monument,view);
    await document.fonts.ready;
    await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
  },{id,view});
  let timeout;
  try{
    await Promise.race([ready,new Promise((_,reject)=>{
      timeout=setTimeout(()=>reject(Error('Terrain and model timed out for '+id)),150000);
    })]);
  }finally{clearTimeout(timeout);}
  // Capture the composited driving scene on the same animation turn as the
  // draw. Reading the WebGL canvas later can return a cleared drawing buffer.
  return page.evaluate(({id,zoom})=>{
    if(car.sightView?.data.id!==id)throw Error('Tour changed during capture');
    Object.assign(car.sightView,{viewport:null,hour:10,zoom});
    gfx.render(car,npcs,0,false,performance.now());
    const source=document.getElementById('world'),canvas=document.createElement('canvas');
    canvas.width=288;canvas.height=196;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,canvas.width,canvas.height);
    const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data,bins=new Set();
    let visible=0;
    for(let i=0;i<rgba.length;i+=16){
      if(rgba[i+3]>245)visible++;
      bins.add(((rgba[i]>>4)<<8)|((rgba[i+1]>>4)<<4)|(rgba[i+2]>>4));
    }
    if(visible<canvas.width*canvas.height*.23||bins.size<17)throw Error('Blank or unrendered frame ('+bins.size+' colours)');
    return canvas.toDataURL('image/webp',.84).split(',')[1];
  },{id,zoom});
}
async function worker(queue){
  if(!queue.length)return;
  const browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  let page=null,age=0;
  try{
    for(const site of queue){
      let last;
      for(let attempt=0;attempt<2;attempt++){
        try{
          if(!page||age>=23){
            await page?.close();page=await newPage(browser,site.id);age=0;
          }
          const bytes=Buffer.from(await frame(page,site.id),'base64');
          if(bytes.toString('ascii',8,12)!=='WEBP'||bytes.length<350)throw Error('Invalid WebP');
          writeFileSync(dest(site.id),bytes,{flag:values.replace?'w':'wx'});
          age++;written++;console.log(written+'/'+ordered.length,site.id,bytes.length);last=null;break;
        }catch(e){
          last=e;console.error('Retry',site.id,e.message.slice(0,260));
          await page?.close().catch(()=>{});page=null;
        }
      }
      if(last)failures.push(site.id);
    }
  }finally{await browser.close();}
}
const split=Math.ceil(ordered.length/workers);
await Promise.all(Array.from({length:workers},(_,i)=>worker(ordered.slice(i*split,(i+1)*split))));
if(failures.length){console.error('Missing previews:',failures.join(' '));process.exitCode=1;}
