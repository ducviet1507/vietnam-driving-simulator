'use strict';

// North-up Sentinel-2 pixels keep their position as the driving district moves.
// Upload just the landscape around the car, including the distant horizon.
function createNationalTerrainColour(T){
  const side=384,cache=new Map(),root='vn-satellite/';
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=side;
  const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);
  texture.name='Vietnam Sentinel-2';texture.colorSpace=T.SRGBColorSpace;
  const origin={value:new T.Vector2()},east={value:new T.Vector2()},north={value:new T.Vector2()};
  const visible={value:0};
  let index,loadingIndex,frame,lon,lat,px,pz,qx,qz,centreX,centreY,generation=0,retryAt=0;
  async function catalogue(){
    if(index)return index;
    if(!loadingIndex)loadingIndex=fetch(root+'index.json').then(async r=>{
      if(!r.ok)throw Error('satellite index');
      const data=await r.json();
      if(data.grid!==1||!(data.size>0))throw Error('satellite grid');
      return index={size:data.size,tiles:new Set(data.tiles)};
    }).finally(()=>{loadingIndex=null;});
    return loadingIndex;
  }
  function tile(key){
    let result=cache.get(key);
    if(result)cache.delete(key);
    else result=new Promise((resolve,reject)=>{
      const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error(key));
      img.src=root+key+'.webp';
    }).catch(()=>{if(cache.get(key)===result)cache.delete(key);return null;});
    cache.set(key,result);
    if(cache.size>8)cache.delete(cache.keys().next().value);
    return result;
  }
  function setFrame(id,longitude,latitude,mx,my,angle=0){
    if(frame===id)return;
    frame=id;visible.value=0;centreX=centreY=undefined;retryAt=0;generation++;
    lon=longitude;lat=latitude;
    const c=Math.cos(angle),s=Math.sin(angle);
    px=c/mx;pz=-s/mx;qx=-s/my;qz=-c/my;
  }
  async function fill(ticket,x,z){
    try{
      const {size,tiles}=await catalogue();
      if(ticket!==generation)return;
      const left=Math.round((lon+px*x+pz*z)*size)-side/2;
      const top=Math.round((lat+qx*x+qz*z)*size)+side/2;
      const jobs=[];
      for(let i=Math.floor(left/size);i<=Math.floor((left+side-1)/size);i++){
        for(let j=Math.floor((top-side)/size);j<=Math.floor((top-1)/size);j++){
          const key=i+'_'+j;
          if(tiles.has(key))jobs.push(tile(key).then(img=>({img,x:i*size-left,y:top-(j+1)*size})));
        }
      }
      const parts=await Promise.all(jobs);
      if(ticket!==generation)return;
      ctx.clearRect(0,0,side,side);
      for(const part of parts)if(part.img)ctx.drawImage(part.img,part.x,part.y);
      origin.value.set((lon*size-left)/side,(lat*size-top+side)/side);
      east.value.set(px*size/side,pz*size/side);north.value.set(qx*size/side,qz*size/side);
      texture.needsUpdate=true;visible.value=parts.some(part=>part.img)?1:0;
      if(parts.some(part=>!part.img))retryAt=performance.now()+30000;
    }catch{if(ticket===generation)retryAt=performance.now()+30000;}
  }
  function follow(x,z){
    if(!frame)return;
    if(centreX!==undefined&&Math.abs(x-centreX)<6000&&Math.abs(z-centreY)<6000&&
       (!retryAt||performance.now()<retryAt))return;
    centreX=x;centreY=z;retryAt=0;void fill(++generation,x,z);
  }
  function shade(shader,point,weight){
    Object.assign(shader.uniforms,{nationalColour:{value:texture},nationalOrigin:origin,nationalEast:east,
      nationalNorth:north,nationalVisible:visible});
    shader.fragmentShader='uniform sampler2D nationalColour; uniform vec2 nationalOrigin,nationalEast,nationalNorth; uniform float nationalVisible;\n'+
      shader.fragmentShader.replace('#include <color_fragment>',`
        if(nationalVisible>.5){
          vec2 uv=nationalOrigin+vec2(dot(${point},nationalEast),dot(${point},nationalNorth));
          if(all(greaterThan(uv,vec2(0.)))&&all(lessThan(uv,vec2(1.)))){
            vec4 observation=texture2D(nationalColour,uv);
            diffuseColor.rgb=mix(diffuseColor.rgb,observation.rgb,observation.a*clamp(${weight},0.,1.));
          }
        }
        #include <color_fragment>`);
  }
  return {setFrame,follow,shade};
}
