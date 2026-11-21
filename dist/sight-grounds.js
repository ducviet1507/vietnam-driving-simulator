'use strict';
// Metre-scale ground finishes follow the mapped rings (including holes) and
// pedestrian ways. The relief mesh supplies their elevation and doesn't need
// another layer of nearly coplanar triangles.
function createSightGrounds(T,small){
  const base='sight-grounds/',canvas=document.createElement('canvas'),span=1120;
  canvas.width=canvas.height=small?768:1280;
  const pen=canvas.getContext('2d',{willReadFrequently:true});
  const texture=new T.CanvasTexture(canvas);
  texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
  const uniforms={visitorMap:{value:texture},visitorOrigin:{value:new T.Vector2()},visitorActive:{value:0}};
  const codes={sand:1,rock:2,lawn:3,orchard:3,tea:3,court:4,trail:5,walk:6,steps:6,drive:7};
  const cache=new Map(),states=new WeakMap();
  let manifest,mask,fixtures=[],originX=0,originZ=0;
  async function load(graph,x,z){
    const [lon,lat]=graph.geo(x,z),reach=span*.5+180;
    const W=Math.floor((lon-reach/graph.mx)*32),E=Math.floor((lon+reach/graph.mx)*32);
    const S=Math.floor((lat-reach/graph.my)*32),N=Math.floor((lat+reach/graph.my)*32);
    const signature=[W,E,S,N].join('/'),prior=states.get(graph);
    if(prior?.signature===signature)return prior.job;
    const state={signature,rows:prior?.rows||[]};
    states.set(graph,state);
    state.job=(async()=>{
      try{
        manifest??=fetch(base+'index.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();})
          .then(index=>new Set(index.bundles)).catch(e=>{manifest=null;throw e;});
        const available=await manifest,needed=new Set(),jobs=[];
        for(let i=W;i<=E;i++)for(let j=S;j<=N;j++){
          const key=Math.floor(i/8)+'_'+Math.floor(j/8);
          if(!available.has(key))continue;
          needed.add(key);
          if(!cache.has(key))cache.set(key,fetchMapTile(base+key+'.gz').catch(e=>{cache.delete(key);throw e;}));
          jobs.push(cache.get(key).then(bundle=>bundle[i+'_'+j]||[]));
        }
        const rows=(await Promise.all(jobs)).flat();
        if(states.get(graph)!==state)return false;
        state.rows=rows;state.job=false;
        for(const key of cache.keys())if(!needed.has(key))cache.delete(key);
        return true;
      }catch{if(states.get(graph)===state)states.delete(graph);return false;}
    })();
    return state.job;
  }
  function shade(shader){
    Object.assign(shader.uniforms,uniforms);
    shader.fragmentShader='uniform sampler2D visitorMap; uniform vec2 visitorOrigin; uniform float visitorActive;\n'+
      shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      vec2 vu=(groundMetres-visitorOrigin)/1120.+.5;
      if(visitorActive>.5 && all(greaterThan(vu,vec2(0.))) && all(lessThan(vu,vec2(1.)))){
        vec4 sampleGround=texture2D(visitorMap,vec2(vu.x,1.-vu.y));
        float type=floor(sampleGround.r*8.+.5);
        vec2 m=groundMetres;
        float grain=clamp(dot(diffuseColor.rgb,vec3(.23,.63,.14))*4.,.72,1.22);
        vec3 tint=vec3(.54,.41,.235);
        if(type==2.)tint=vec3(.26,.25,.218);
        if(type==3.)tint=vec3(.118,.214,.065);
        if(type==4.||type==6.){
          vec2 block=m/(type==4.?vec2(1.12,.61):vec2(.53,.28));
          block.x+=.5*mod(floor(block.y),2.);
          vec2 aa=max(fwidth(block),vec2(.004)),edge=min(fract(block),1.-fract(block));
          vec2 seam=smoothstep(vec2(.009)-aa*.45,vec2(.033)+aa*.45,edge);
          float fade=1.-smoothstep(.15,.85,max(aa.x,aa.y));
          float slab=fract(sin(dot(mod(floor(block),256.),vec2(27.1,18.9)))*4347.);
          tint=(type==4.?vec3(.36,.325,.282):vec3(.325,.274,.214))*(1.+fade*(.14*(slab-.5)-.34*(1.-seam.x*seam.y)));
        }
        if(type==5.)tint=vec3(.235,.16,.095);
        if(type==7.)tint=vec3(.23,.225,.21);
        diffuseColor.rgb=mix(diffuseColor.rgb,tint*grain,sampleGround.a*(1.-bankWet)*.92);
      }`);
  }
  function prepare(graph,cx,cz,landmarks){
    originX=cx;originZ=cz;fixtures=[];mask=null;uniforms.visitorActive.value=0;
    const rows=states.get(graph)?.rows;
    if(!rows?.length)return;
    const ratio=canvas.width/span,half=span/2;
    pen.setTransform(ratio,0,0,ratio,canvas.width/2,canvas.height/2);
    pen.clearRect(-half,-half,span,span);pen.lineCap=pen.lineJoin='round';
    const layers=[];
    for(const [kind,size,raw] of rows){
      const rings=raw.map(ring=>{
        let lon=0,lat=0;
        const points=[];
        for(let i=0;i<ring.length;i+=2){
          lon+=ring[i];lat+=ring[i+1];
          const p=graph.point(lon/1e6,lat/1e6);
          points.push([p.x-cx,p.z-cz]);
        }
        return points;
      });
      const ring=rings[0];
      if([0,1].some(axis=>ring.every(p=>p[axis]<-half-12)||ring.every(p=>p[axis]>half+12)))continue;
      const code=codes[kind];
      if(code)layers.push({kind,code,rings,size});
      if(!code||['steps','orchard','tea'].includes(kind))fixtures.push({kind,size,ring,rings});
    }
    layers.sort((a,b)=>a.code-b.code);
    function trace(points,closed){
      pen.moveTo(...points[0]);
      for(let i=1;i<points.length;i++)pen.lineTo(...points[i]);
      if(closed)pen.closePath();
    }
    for(const {code,rings} of layers){
      if(code>=5)continue;
      pen.beginPath();
      for(const ring of rings)trace(ring,true);
      pen.fillStyle='rgb('+Math.round(code*255/8)+' 0 0)';pen.fill('evenodd');
    }
    // Detailed architectural models already include paving and landscaping.
    pen.globalCompositeOperation='destination-out';
    for(const {ring} of landmarks?.buildingAreas||[]){
      pen.beginPath();trace(ring.map(p=>[p.x-cx,p.y-cz]),true);pen.fill();
    }
    pen.globalCompositeOperation='source-over';
    // An approach can run through a modeled gate and into its courtyard.
    for(const {kind,code,rings,size} of layers){
      if(code<5)continue;
      pen.beginPath();
      for(const ring of rings)trace(ring,false);
      pen.lineWidth=Math.min(14,size||(kind==='drive'?4:kind==='trail'?1.5:2.4));
      pen.strokeStyle='rgb('+Math.round(code*255/8)+' 0 0)';pen.stroke();
    }
    mask=pen.getImageData(0,0,canvas.width,canvas.height).data;
    uniforms.visitorOrigin.value.set(cx,cz);uniforms.visitorActive.value=1;texture.needsUpdate=true;
  }
  function groundCode(x,z){
    if(!mask)return 0;
    const i=Math.floor((.5+(x-originX)/span)*canvas.width),j=Math.floor((.5+(z-originZ)/span)*canvas.height);
    if(i<0||j<0||i>=canvas.width||j>=canvas.height)return 0;
    const pixel=(j*canvas.width+i)*4;
    return mask[pixel+3]>100?Math.round(mask[pixel]*8/255):0;
  }
  // Structural features share one vertex-coloured draw, with metre-space joints
  // on brickwork and end grain on timber. Keep the original path bearings.
  const material=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.88});
  material.onBeforeCompile=shader=>{
    const vary='varying vec2 groundsUV; varying float finishCode;\n';
    shader.vertexShader=vary+'attribute float finish;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n groundsUV=uv; finishCode=finish;');
    shader.fragmentShader=vary+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      if(finishCode>.5 && finishCode<1.5){
        vec2 p=groundsUV/vec2(.44,.17);p.x+=.5*mod(floor(p.y),2.);
        vec2 aa=max(fwidth(p),vec2(.002)),edge=min(fract(p),1.-fract(p));
        vec2 inside=smoothstep(vec2(.013)-aa*.5,vec2(.037)+aa*.5,edge);
        diffuseColor.rgb*=1.-(1.-inside.x*inside.y)*.36*(1.-smoothstep(.12,.9,max(aa.x,aa.y)));
      }else if(finishCode>1.5){
        float fibre=sin(groundsUV.y*47.+1.7*sin(groundsUV.x*2.6));
        diffuseColor.rgb*=1.+.07*fibre*(1.-smoothstep(.012,.072,fwidth(groundsUV.y)));
      }`);
  };
  function build(group,ground,blocked,obstacle,water,plant){
    const pos=[],rgb=[],uv=[],finish=[],colour=new T.Color();
    function quad(a,b,c,d,tint,code=0){
      colour.setHex(tint);
      const w=Math.hypot(...b.map((v,i)=>v-a[i])),h=Math.hypot(...d.map((v,i)=>v-a[i]));
      for(const p of [a,b,c,a,c,d]){pos.push(...p);rgb.push(colour.r,colour.g,colour.b);finish.push(code);}
      uv.push(0,0,w,0,w,h,0,0,w,h,0,h);
    }
    function slab(ax,az,bx,bz,half,loA,loB,hiA,hiB,tint,code=0){
      const length=Math.hypot(bx-ax,bz-az),nx=(az-bz)*half/length,nz=(bx-ax)*half/length;
      const a=[ax+nx,hiA,az+nz],b=[bx+nx,hiB,bz+nz],c=[bx-nx,hiB,bz-nz],d=[ax-nx,hiA,az-nz];
      const al=[a[0],loA,a[2]],bl=[b[0],loB,b[2]],cl=[c[0],loB,c[2]],dl=[d[0],loA,d[2]];
      quad(a,b,c,d,tint,code);quad(bl,b,a,al,tint,code);quad(dl,d,c,cl,tint,code);
      quad(al,a,d,dl,tint,code);quad(cl,c,b,bl,tint,code);
    }
    const close=small?145:225,reach=small?230:350;
    function inside(x,z,ring){
      let hit=false;
      for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const [a,b]=ring[i],[c,d]=ring[j];
        if((b>z)!==(d>z)&&x<a+(z-b)*(c-a)/(d-b))hit=!hit;
      }
      return hit;
    }
    function rows(kind,rings){
      const ring=rings[0],[ox,oz]=ring[0];
      let length=0,fx=1,fz=0;
      for(let i=0;i<ring.length;i++){
        const [x,z]=ring[i],[a,b]=ring[(i+1)%ring.length],d=Math.hypot(a-x,b-z);
        if(d>length){length=d;fx=(a-x)/d;fz=(b-z)/d;}
      }
      const smallCrop=kind==='tea',along=smallCrop?1.65:7.3,across=smallCrop?3.6:8;
      const reach=smallCrop?(small?75:115):(small?130:190);
      const originU=-ox*fx-oz*fz,originV=ox*fz-oz*fx;
      let minU=Infinity,minV=Infinity,maxU=-Infinity,maxV=-Infinity;
      for(const [x,z] of ring){
        const u=(x-ox)*fx+(z-oz)*fz,v=(z-oz)*fx-(x-ox)*fz;
        minU=Math.min(minU,u);maxU=Math.max(maxU,u);minV=Math.min(minV,v);maxV=Math.max(maxV,v);
      }
      const holes=rings.slice(1);
      for(let j=Math.ceil(Math.max(minV,originV-reach)/across);j*across<=Math.min(maxV,originV+reach);j++){
        for(let i=Math.ceil(Math.max(minU,originU-reach)/along);i*along<=Math.min(maxU,originU+reach);i++){
          const x=ox+fx*i*along-fz*j*across,z=oz+fz*i*along+fx*j*across;
          if(x*x+z*z>reach*reach||!inside(x,z,ring)||holes.some(r=>inside(x,z,r))||blocked(x,z,.45))continue;
          const noise=Math.sin(i*17.31+j*24.71);
          if(smallCrop)plant('tea',x,z,.99+noise*.06,1.78,Math.atan2(fx,fz));
          else plant('tree',x,z,4.35+noise*.42,4.6+noise*.44,i+j);
        }
      }
    }
    for(const {kind,ring,rings,size} of fixtures){
      if(kind==='orchard'||kind==='tea'){rows(kind,rings);continue;}
      if(ring.length===1){
        const [x,z]=ring[0];if(Math.hypot(x,z)>close||blocked(x,z,.45))continue;
        const baseY=ground(x,z);
        if(['tree','pine','palm'].includes(kind)){
          const seed=Math.sin((x+originX)*.15+(z+originZ)*.41),height=Math.min(55,size||9+seed*2.2);
          plant(kind,x,z,height,height*(kind==='pine'?.47:kind==='palm'?.61:.86),seed*3);
          continue;
        }
        function box(dx,dz,w,d,y,h,c,code=0){slab(x+dx-w/2,z+dz,x+dx+w/2,z+dz,d/2,baseY+y,baseY+y,baseY+y+h,baseY+y+h,c,code);}
        if(kind==='bench'||kind==='picnic_table'){
          const table=kind==='picnic_table';
          for(const dx of [-.57,.57])box(dx,0,.12,table?1.28:.46,-.16,.59,0x6b685c);
          for(const dz of table?[-.68,.68]:[0])for(let j=-1;j<=1;j++)box(0,dz+j*.13,1.72,.12,.39,.065,0x926948,2);
          if(table)box(0,0,1.88,.67,.7,.09,0x9b7751,2);
          else{
            for(const dx of [-.57,.57])box(dx,-.21,.065,.065,.41,.43,0x605b4e);
            for(const y of [.61,.78])box(0,-.20,1.72,.065,y,.105,0x936e4e,2);
          }
        }else if(kind==='board'){
          for(const dx of [-.69,.69])box(dx,0,.10,.13,-.15,2.03,0x655746,2);
          box(0,0,1.56,.09,.86,1.04,0x675c48);
          box(0,.051,1.39,.012,.96,.83,0xc8c5ae);
          box(0,0,1.73,.37,1.9,.08,0x625a50);
        }else if(kind==='flagpole'){
          const h=Math.min(55,size||8);box(0,0,.65,.65,-.15,.37,0xb3afa3);box(0,0,.09,.09,.17,h,0xb9c2c4);
        }else{
          const h=Math.min(28,size||(kind==='obelisk'?4:1.65)),w=Math.min(3,h*.42);
          box(0,0,w*1.6,w*1.35,-.16,.4,0x9e9a8f);box(0,0,w*1.3,w*1.05,.24,.19,0xaaa698);
          if(kind==='obelisk'){
            const lower=w*.45,upper=w*.20,y=baseY+.42,top=baseY+h;
            const ring=(r,level)=>[[-r,-r],[r,-r],[r,r],[-r,r]].map(([dx,dz])=>[x+dx,level,z+dz]);
            const a=ring(lower,y),b=ring(upper,top);
            for(let i=0;i<4;i++){const j=(i+1)%4;quad(a[i],a[j],b[j],b[i],0xaaa698);quad(b[i],b[j],[x,top+upper*2,z],[x,top+upper*2,z],0xb1aca1);}
          }else box(0,0,w,w*.48,.41,h*.8,0x848175);
        }
        continue;
      }
      for(let i=1;i<ring.length;i++){
        const [ax,az]=ring[i-1],[bx,bz]=ring[i],dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
        if(len<.12)continue;
        const nearest=Math.max(0,Math.min(1,-(ax*dx+az*dz)/(len*len)));
        if(Math.hypot(ax+nearest*dx,az+nearest*dz)>reach)continue;
        const step=kind==='steps'?.77:kind==='pier'?2.5:kind==='avenue'?8:6;
        const n=Math.ceil(len/step),fx=dx/len,fz=dz/len;
        for(let j=0;j<n;j++){
          const t=j/n,u=(j+1)/n,x=ax+dx*t,z=az+dz*t,xx=ax+dx*u,zz=az+dz*u,mx=(x+xx)/2,mz=(z+zz)/2;
          if(Math.hypot(mx,mz)>reach||blocked(mx,mz,.16,kind==='pier'))continue;
          const a=ground(x,z),b=ground(xx,zz);
          if(kind==='avenue'){
            const h=Math.min(40,size||8.5);
            plant('tree',mx,mz,h,h*.75,j*.83);
          }else if(kind==='steps'){
            const top=(a+b)/2-.055;
            slab(x,z,xx,zz,Math.min(8,size||2.4)/2,Math.min(a,b)-.20,Math.min(a,b)-.20,top,top,0xb4ae9e);
          }else if(kind==='pier'){
            const level=water(mx,mz)?.level,deck=Number.isFinite(level)?level+.96:Math.max(a,b)+.5;
            const half=Math.min(8,size||2)/2;
            slab(x,z,xx,zz,half,deck-.18,deck-.18,deck,deck,0x9b7c5d,2);
            for(const side of [-1,1]){
              const px=x-fz*half*.8*side,pz=z+fx*half*.8*side;
              slab(px-.09,pz,px+.09,pz,.09,deck-2.8,deck-2.8,deck-.16,deck-.16,0x766650,2);
            }
          }else{
            const hedge=kind==='hedge',fort=kind==='city_wall',h=Math.min(15,size||(hedge?1.14:fort?3.8:1.65)),half=hedge?.44:fort?1.15:.15;
            slab(x,z,xx,zz,half,a-.22,b-.22,a+h,b+h,hedge?0x597344:fort?0x978978:0xb2a493,hedge?0:1);
            if(!hedge)slab(x,z,xx,zz,half+.075,a+h-.08,b+h-.08,a+h+.045,b+h+.045,0x8e8475);
            obstacle({id:'grounds:'+kind+':'+Math.round(originX+mx)+':'+Math.round(originZ+mz),kind:'barrier',
              x:mx,z:mz,fx,fz,w:len/n/2,d:half,height:h,parts:[]});
          }
        }
      }
    }
    if(!pos.length)return;
    const geo=new T.BufferGeometry();
    for(const [name,array,size] of [['position',pos,3],['color',rgb,3],['uv',uv,2],['finish',finish,1]])
      geo.setAttribute(name,new T.Float32BufferAttribute(array,size));
    geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,material);mesh.name='Mapped visitor grounds';mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  }
  return {load,prepare,shade,mapped:(x,z)=>groundCode(x,z)>0,accessLane:(x,z)=>groundCode(x,z)===codes.drive,build};
}
