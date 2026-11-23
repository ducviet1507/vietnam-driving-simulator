// Run from the repository root after installing tools/smoke's dependencies.
// node tools/smoke/graphics-drive-benchmark.mjs b5cfb0cb before.json
// node tools/smoke/graphics-drive-benchmark.mjs working after.json
// BENCH_BASE pins the HTML/JS/CSS used with the working renderer sources.
// BENCH_BROWSER overrides the Chromium executable path.
// Optional env: BENCH_GROUPS (comma-separated group ids), BENCH_SPEEDS, BENCH_ROUTES,
// BENCH_SECONDS, BENCH_REPEAT, BENCH_SHOT_DIR. Reuse an output path to resume.
// BENCH_DIAG=1 adds per-stall Chromium CPU samples and JS/WebGL timing; use
// a separate JSON output because instrumentation changes the timing.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const [revision, output] = process.argv.slice(2);
assert(revision && output, 'Provide a Git commit or working, and an output JSON path');
const repo = fileURLToPath(new URL('../../', import.meta.url)), dist = path.join(repo, 'dist');
const git = (...args) => execFileSync('git', args, {cwd:repo, maxBuffer:80*1024*1024});
const commit = git('rev-parse', '--verify', (revision === 'working' ? process.env.BENCH_BASE||'HEAD' : revision) + '^{commit}').toString().trim();
// Load the entry page, styles and classic scripts as one immutable snapshot;
// heavy unchanged models, imagery and tiles stream directly from the checkout.
const entries=git('ls-tree','-z',commit+':dist').toString().split('\0')
  .map(entry=>entry.match(/^\d+ blob ([0-9a-f]+)\t(.+\.(?:js|mjs|css|html))$/)).filter(Boolean);
const blobs=execFileSync('git',['cat-file','--batch'],{cwd:repo,maxBuffer:80*1024*1024,
  input:entries.map(entry=>entry[1]).join('\n')+'\n'});
const overrides = new Map();
let offset=0;
for(const [,sha,name] of entries){
  const eol=blobs.indexOf(10,offset),[hash,type,size]=blobs.toString('ascii',offset,eol).split(' ');
  assert(hash===sha&&type==='blob');
  offset=eol+1;
  overrides.set('/'+name,blobs.subarray(offset,offset+Number(size)));
  offset+=Number(size)+1;
}
const runtimeHash=createHash('sha256');
for(const file of ['cabin.js','central-streetscapes.js','driving-water.js','world-scene.js']){
  const contents=revision==='working'?await readFile(path.join(dist,file)):overrides.get('/'+file);
  overrides.set('/'+file,contents);
  runtimeHash.update(file).update(contents);
}
const runtimeSha256=runtimeHash.digest('hex');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css',
  '.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try{
    let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(name==='/')name='/index.html';
    const file=path.resolve(dist,'.'+name);
    if(!file.startsWith(dist+path.sep))throw Error('path');
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
    if(overrides.has(name))return res.end(overrides.get(name));
    if(!(await stat(file)).isFile())throw Error('asset');
    createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const duration=Number(process.env.BENCH_SECONDS||8);
const repeat=Number(process.env.BENCH_REPEAT||1);
const diagnostic=process.env.BENCH_DIAG==='1';
assert(Number.isFinite(duration)&&duration>0,'BENCH_SECONDS must be positive');
assert(Number.isInteger(repeat)&&repeat>0,'BENCH_REPEAT must be a positive integer');
const routes={'dense':'bach-khoa-ho-guom','sparse':'thac-bac-sa-pa'};
const allSpeeds=[0,20,60,100,150,200];
const groups=[
  {id:'pc-wet',rain:true,cockpit:true,hour:21,quality:'high',touch:false,speeds:allSpeeds},
  {id:'touch-dry',rain:false,cockpit:false,hour:12,quality:'low',touch:true,speeds:allSpeeds},
  {id:'pc-dry',rain:false,cockpit:false,hour:12,quality:'high',touch:false,speeds:[60,200]},
  {id:'touch-wet',rain:true,cockpit:true,hour:21,quality:'medium',touch:true,speeds:[60,200]},
  {id:'touch-auto',rain:true,cockpit:true,hour:21,quality:'auto',touch:true,speeds:[60,200]},
  {id:'pc-1440p',rain:true,cockpit:true,hour:21,quality:'high',touch:false,
    viewport:{width:2560,height:1440},speeds:[200],repeats:3}
];
const enabled=(arg,key)=>!process.env[arg]||process.env[arg].split(',').includes(String(key));
const report=await readFile(output,'utf8').then(JSON.parse).catch(e=>{
  if(e.code!=='ENOENT')throw e;
  return {revision,commit,duration,created:new Date().toISOString(),rows:[]};
});
assert(report.revision===revision&&report.commit===commit&&report.duration===duration,'Different settings in existing report');
assert(Boolean(report.diagnostic)===diagnostic||!report.rows.length,'Use a separate diagnostic output');
report.diagnostic=diagnostic;
assert(!report.runtimeSha256||report.runtimeSha256===runtimeSha256,'Runtime source changed since earlier samples');
report.runtimeSha256=runtimeSha256;
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.BENCH_BROWSER||chromium.executablePath(),
    args:['--enable-gpu',...(process.platform==='win32'?['--use-angle=d3d11']:[])]});
  assert(!report.browser||report.browser===browser.version(),'Browser version changed since earlier samples');
  report.browser=browser.version();
  for(const config of groups.filter(g=>enabled('BENCH_GROUPS',g.id))){
    const viewport=config.viewport||(config.touch?{width:844,height:390}:{width:1280,height:720});
    for(const [name,id] of Object.entries(routes).filter(([name])=>enabled('BENCH_ROUTES',name))){
      const speeds=config.speeds.filter(s=>enabled('BENCH_SPEEDS',s));
      const todo=[];
      for(const speed of speeds){
        const count=Math.max(repeat,config.repeats||1,config.id==='pc-wet'&&speed===200?3:1);
        for(let run=1;run<=count;run++){
          if(!report.rows.some(row=>row.group===config.id&&row.route===name&&row.speed===speed&&row.run===run))todo.push({speed,run});
        }
      }
      if(!todo.length)continue;
      console.log('Loading',revision,config.id,id,'for',todo.length,'cases');
      const context=await browser.newContext({viewport,screen:viewport,hasTouch:config.touch,isMobile:config.touch,
        deviceScaleFactor:config.touch?2:1,serviceWorkers:'block',locale:'vi-VN'});
      const page=await context.newPage(), errors=[];
      page.on('pageerror',error=>{errors.push(error.message);console.error('Page:',error.message);});
      await page.addInitScript(({config,name})=>{
        let state=20261123;
        window.resetBenchSeed=()=>{state=20261123;};
        Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
        localStorage.setItem('taylai.cockpit.v1',JSON.stringify({graphics:config.quality}));
        localStorage.setItem('taylai.world.traffic',name==='dense'?'busy':'quiet');
        // Isolate the startup cost of preparing materials/driver programs from
        // total time until the guided departure first accepts driving input.
        window.benchStartup={};
        Object.defineProperty(window,'createWorldScene',{configurable:true,set(create){
          Object.defineProperty(window,'createWorldScene',{configurable:true,writable:true,value:(...args)=>{
            const scene=create(...args),prepare=scene.prepareShaders;
            scene.prepareShaders=async(...params)=>{
              const start=performance.now();
              try{return await prepare(...params);}
              finally{benchStartup.shaderPreparationMs=performance.now()-start;}
            };
            return scene;
          }});
        }});
      },{config,name});
      await page.route('**/*',route=>{
        const u=new URL(route.request().url());
        if(u.hostname==='api.open-meteo.com')return route.fulfill({json:{current:{time:Math.floor(Date.now()/1000),
          temperature_2m:26,weather_code:config.rain?63:0,precipitation:config.rain?3:0,cloud_cover:config.rain?90:0,is_day:config.rain?0:1}}});
        if(u.pathname.startsWith('/api/'))return route.fulfill({status:200,json:{runId:'00000000-0000-4000-8000-000000000000',entries:[]}});
        if(u.protocol.startsWith('http')&&u.origin!==base)return route.abort();
        return route.continue();
      });
      await page.goto(base+'/?drive='+id,{waitUntil:'domcontentloaded',timeout:120000});
      try{await page.waitForFunction(()=>{
        if(typeof mode==='undefined'||mode!=='grid'||!gfx||$('launch').disabled)return false;
        benchStartup.departureReadyMs=performance.now();return true;
      },null,{timeout:150000});}
      catch(e){console.error(await page.locator('#loadStatus').textContent());throw e;}
      await page.locator('#launch').click();
      await page.waitForFunction(()=>mode==='drive');
      const startup=await page.evaluate(()=>benchStartup);
      const gpu=await page.evaluate(config=>{
        const renderer=DrivingRenderer.get($('world')),gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
        window.bench={renderer,cursor:{...guide.start},leg:0,speed:0,moved:0,mul:1};
        car.opening=false;car.openingPose=0;car.dawn=0;car.scenicHour=config.hour;
        if(inside!==config.cockpit)$('camera').click();
        // Replay an OSM route with a fixed lane and an explicit path speed. The
        // normal game RAF, traffic simulation, tile streaming, HUD, audio and
        // renderer run; player controls, collisions and drivetrain are bypassed.
        hitVehicle=()=>{};
        tick=dt=>{
          const b=window.bench, route=guide.route;
          if(b.speed){
            const travelled=roads.advance(b.cursor,b.speed*dt*b.mul,options=>{
              const next=route.edges[b.leg+1];
              const opt=options.find(o=>o.edge.id===Math.abs(next)&&o.dir===Math.sign(next));
              if(!opt)throw Error('Discontinuous guided replay at '+b.leg);
              b.leg++;return opt;
            });
            b.moved+=travelled;
          }
          player={...b.cursor};
          const pose=roads.sample(player,roadLaneOffset(player));
          Object.assign(car,pose,{edge:player.edge,deckLift:roads.roadLevel(player.edge,player.s),speed:b.speed,
            vx:Math.sin(pose.yaw)*b.speed,vz:-Math.cos(pose.yaw)*b.speed,parked:!b.speed});
          distance=b.moved;
          guide.update(player,true);
          trafficStep(dt);spawnTick+=dt;if(spawnTick>1.6){fillTraffic();spawnTick=0;}
        };
        const draw=renderer.render.bind(renderer);
        renderer.render=(scene,camera)=>{
          const rt=renderer.getRenderTarget();
          if(bench.frame&&rt){
            if(rt.width===144&&rt.height===72||rt.width===256&&rt.height===80)bench.frame.mirror=true;
            if(rt.width===480&&rt.height===270||rt.width===256&&rt.height===144)bench.frame.water=true;
          }
          return draw(scene,camera);
        };
        const original=frame;
        frame=now=>{
          const dt=Math.max(0,now-last)/1000;
          bench.mul=dt>0.1?dt/.1:1;
          const sample=bench.samples?{dt:dt*1000,mirror:false,water:false}:null;
          bench.frame=sample;
          original(now);
          if(sample){
            sample.npc=npcs.length;sample.edges=nearby.length;
            sample.width=gl.drawingBufferWidth;sample.height=gl.drawingBufferHeight;
            sample.view=viewX+','+viewZ;sample.load=loadX+','+loadZ;
            bench.samples.push(sample);
            if(now>=bench.end){
              const done=bench.finish;bench.speed=0;bench.samples=null;done();
            }
          }
        };
        return ext&&gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      },config);
      assert(gpu&&!/swiftshader|llvmpipe/i.test(gpu),'Hardware rendering required: '+gpu);
      assert(!report.gpu||report.gpu===gpu,'GPU changed since earlier samples');
      report.gpu=gpu;
      let profiler;
      if(diagnostic){
        profiler=await context.newCDPSession(page);
        await profiler.send('Performance.enable');
        await profiler.send('Profiler.enable');
        await profiler.send('Profiler.setSamplingInterval',{interval:1000});
        await page.evaluate(()=>{
          const d=bench.diagnostic={spans:[],tasks:[]},renderer=bench.renderer;
          function wrap(object,key,label,recordAll=false){
            if(typeof object[key]!=='function')return;
            const original=object[key].bind(object);
            object[key]=(...args)=>{
              const start=performance.now();
              try{return original(...args);}
              finally{
                const end=performance.now();
                if(recordAll||end-start>=2)d.spans.push({name:typeof label==='string'?label:label(args),start,end});
              }
            };
          }
          wrap(renderer,'render',()=>{
            const t=renderer.getRenderTarget();
            return !t?'render-screen':(t.width===144&&t.height===72||t.width===256&&t.height===80)?'render-mirror':'render-offscreen';
          });
          wrap(renderer,'setDrawingBufferSize',([w,h,s])=>'resize '+w+'x'+h+' @ '+s,true);
          for(const key of ['compile','initTexture','setRenderTarget'])wrap(renderer,key,key);
          for(const key of ['advanceRoads','queueRoads'])wrap(gfx,key,key);
          const observer=new PerformanceObserver(list=>{
            for(const e of list.getEntries())d.tasks.push({start:e.startTime,end:e.startTime+e.duration});
          });
          observer.observe({type:'longtask',buffered:true});
        });
      }
      for(const {speed,run} of todo){
        if(profiler)await profiler.send('Profiler.start');
        const measurement=await page.evaluate(async({speed,duration,rain})=>{
          const b=bench;
          b.speed=0;b.leg=0;b.moved=0;b.cursor={...guide.start};
          guide=createGuidedDrive(roads,guide.route);
          tick(0);gfx.cancelRoads();pendingDistrict=null;
          while(busy)await new Promise(r=>setTimeout(r,20));
          await gfx.loadDistrict(roads,car.x,car.z);
          await structureRequest?.ready;
          refreshView(gfx.setRoads);loadX=car.x;loadZ=car.z;
          npcs=[];nextNpc=1;spawnTick=0;resetBenchSeed();seedTraffic();
          await new Promise(r=>setTimeout(r,1000));
          if(rain&&gfx.weather.rainfall<.5)throw Error('Rain did not load: '+gfx.weather.rainfall);
          const samples=[],startX=car.x,startZ=car.z,rainfall=gfx.weather.rainfall;
          let firstStamp;
          await new Promise(done=>requestAnimationFrame(()=>{
            firstStamp=last;b.speed=speed/3.6;b.samples=samples;b.end=last+duration*1000;b.finish=done;
          }));
          const dt=samples.map(s=>s.dt),sum=dt.reduce((a,v)=>a+v,0);
          const sorted=dt.slice().sort((a,b)=>a-b);
          const p=q=>sorted[Math.max(0,Math.ceil(q*sorted.length)-1)];
          let stalls;
          if(b.diagnostic){
            // The blocking work that delays a RAF generally belongs to the
            // preceding frame or an intervening task.
            await new Promise(resolve=>setTimeout(resolve,100));
            let start=firstStamp;
            stalls=dt.flatMap(interval=>{
              const from=start;start+=interval;
              if(interval<100)return [];
              const overlaps=event=>event.start<start&&event.end>from;
              return [{from,to:start,dt:interval,
                spans:b.diagnostic.spans.filter(overlaps),longtasks:b.diagnostic.tasks.filter(overlaps)}];
            });
          }
          return {frames:samples.length,elapsedMs:sum,metres:b.moved,actualKmh:b.moved/sum*3600,stalls,
            fps:samples.length*1000/sum,p50:p(.5),p95:p(.95),p99:p(.99),maxMs:p(1),over50:dt.filter(t=>t>50).length,
            mirror:samples.filter(s=>s.mirror).length,water:samples.filter(s=>s.water).length,both:samples.filter(s=>s.mirror&&s.water).length,
            npcRange:[Math.min(...samples.map(s=>s.npc)),Math.max(...samples.map(s=>s.npc))],edges:samples[0].edges,rainfall,
            buffers:[...new Set(samples.map(s=>s.width+'x'+s.height))],districtOrigins:new Set(samples.map(s=>s.view)).size,
            streamedOrigins:new Set(samples.map(s=>s.load)).size,start:[startX,startZ],netMetres:Math.hypot(car.x-startX,car.z-startZ)};
        },{speed,duration,rain:config.rain});
        if(profiler){
          const {profile}=await profiler.send('Profiler.stop');
          const {metrics}=await profiler.send('Performance.getMetrics');
          const navigation=metrics.find(v=>v.name==='NavigationStart').value;
          const nodes=new Map(profile.nodes.map(node=>[node.id,node]));
          const parent=new Map(profile.nodes.flatMap(node=>(node.children||[]).map(id=>[id,node.id])));
          let currentUs=profile.startTime;
          const sampleTimes=profile.timeDeltas.map(us=>(currentUs+=us)/1000-navigation*1000);
          for(const stall of measurement.stalls){
            const calls=new Map();
            for(let i=0;i<sampleTimes.length;i++){
              if(sampleTimes[i]<stall.from||sampleTimes[i]>=stall.to)continue;
              let id=profile.samples[i],stack=[];
              for(let n=0;id!==undefined&&n<5;n++,id=parent.get(id)){
                const f=nodes.get(id).callFrame;
                const source=f.url.split('/').pop();
                stack.push((f.functionName||'(anonymous)')+(source?' '+source+':'+(f.lineNumber+1):''));
              }
              const name=stack.join(' ← ');
              calls.set(name,(calls.get(name)||0)+1);
            }
            stall.cpuSamples=[...calls].sort((a,b)=>b[1]-a[1]).slice(0,7);
          }
        }
        assert(!errors.length,errors.join('\n'));
        assert(Math.abs(measurement.actualKmh-speed)<.2,JSON.stringify(measurement));
        if(config.cockpit)assert(measurement.mirror>0&&(config.quality==='auto'||measurement.water>0),'Missing reflection pass '+JSON.stringify(measurement));
        const row={group:config.id,route:name,routeId:id,speed,run,traffic:name==='dense'?'busy':'quiet',quality:config.quality,
          hour:config.hour,view:config.cockpit?'cockpit':'chase',viewport,startup,...measurement};
        report.rows.push(row);
        await writeFile(output,JSON.stringify(report,null,2)+'\n');
        console.log(config.id,name,speed,run,measurement.fps.toFixed(1)+' FPS','p99',measurement.p99.toFixed(1),'mirror+water',measurement.both);
        if(process.env.BENCH_SHOT_DIR&&speed===0&&run===1){
          await mkdir(process.env.BENCH_SHOT_DIR,{recursive:true});
          await page.screenshot({path:path.join(process.env.BENCH_SHOT_DIR,revision+'-'+config.id+'-'+name+'.png')});
        }
      }
      await context.close();
    }
  }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
