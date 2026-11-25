'use strict';
// Roadside reflections for the player's coated body and glazing. Each update
// renders just one cube face. Materials only sample a completed six-face set.
function createStreetVehicleLight(T,renderer,scene){
  const environment={value:null},amount={value:0};
  let targets,cube,face=0,writable=0,next=0,lastX=Infinity,lastZ=Infinity;
  function coat(material){
    const old=material.onBeforeCompile,key=material.customProgramCacheKey();
    const glass=material.name==='glass';
    material.onBeforeCompile=function(shader,...args){
      old.call(this,shader,...args);
      shader.uniforms.driveStreetCube=environment;shader.uniforms.driveStreetWeight=amount;
      shader.fragmentShader='uniform samplerCube driveStreetCube;\nuniform float driveStreetWeight;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
        vec3 streetRay=inverseTransformDirection(reflect(-normalize(vViewPosition),normal),viewMatrix);
        float grazing=pow(1.0-max(dot(normalize(vViewPosition),normal),0.0),2.0);
        outgoingLight=mix(outgoingLight,textureCube(driveStreetCube,streetRay).rgb,
          driveStreetWeight*(${glass?'.20+.40':'.055+.26'}*grazing));
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey=()=>key+'-street-'+Number(glass);material.needsUpdate=true;
  }
  function reflect(position,hidden,now,enabled){
    if(!enabled){amount.value=0;return;}
    if(now<next)return;
    if(!targets){
      targets=[0,1].map(()=>new T.WebGLCubeRenderTarget(48,{minFilter:T.LinearFilter,generateMipmaps:false}));
      cube=new T.CubeCamera(.45,100,targets[0]);cube.coordinateSystem=renderer.coordinateSystem;cube.updateCoordinateSystem();
    }
    if(Math.hypot(position.x-lastX,position.z-lastZ)>18){face=0;amount.value=0;}
    if(face===0){
      cube.position.copy(position);cube.position.y+=1.25;cube.updateMatrixWorld(true);
      lastX=position.x;lastZ=position.z;
    }
    next=now+95;
    const target=renderer.getRenderTarget(),activeFace=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel(),
      auto=renderer.shadowMap.autoUpdate,needs=renderer.shadowMap.needsUpdate,xr=renderer.xr.enabled;
    const visibility=hidden.map(o=>o.visible);
    try{
      for(const o of hidden)o.visible=false;
      renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;renderer.xr.enabled=false;
      renderer.setRenderTarget(targets[writable],face);renderer.render(scene,cube.children[face]);
    }finally{
      renderer.setRenderTarget(target,activeFace,mip);renderer.xr.enabled=xr;
      renderer.shadowMap.autoUpdate=auto;renderer.shadowMap.needsUpdate=needs;
      hidden.forEach((o,i)=>o.visible=visibility[i]);
    }
    if(++face===6){environment.value=targets[writable].texture;amount.value=1;writable=1-writable;face=0;}
  }
  // Headlight and stop-lamp streaks on the wet road, laid along each
  // vehicle's heading and the slope of its own deck.
  const streakMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,
    blending:T.AdditiveBlending,uniforms:{film:{value:0}},
    vertexShader:'varying vec2 tex; varying vec3 lamp; void main(){tex=uv;lamp=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 tex; varying vec3 lamp; uniform float film; void main(){float w=1.-smoothstep(.04,.50,abs(tex.x-.5));float fall=pow(1.-tex.y,2.)*smoothstep(0.,.09,tex.y);gl_FragColor=vec4(lamp,film*w*w*fall);\n#include <colorspace_fragment>\n}'});
  const streaks=new T.InstancedMesh(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),streakMat,20);
  streaks.name='Wet road lamp reflections';streaks.frustumCulled=false;streaks.visible=false;
  streaks.setColorAt(0,new T.Color());scene.add(streaks);
  const pose=new T.Object3D(),color=new T.Color();
  function wetLights(vehicles,wet,night){
    const film=Math.max(0,Math.min(1,wet*1.3))*Math.max(0,Math.min(1,night));
    streaks.visible=film>.015;if(!streaks.visible)return;
    streakMat.uniforms.film.value=film;let i=0;
    for(const v of vehicles){
      if(i>=20)break;
      const fx=Math.sin(v.yaw),fz=-Math.cos(v.yaw),rx=-fz,rz=fx;
      for(const rear of [false,true]){
        const dir=rear?-1:1,span=rear?(v.brake?3.1:1.8):5.2;
        const distance=dir*(v.length*.5+span*.48),angle=v.yaw+(rear?Math.PI:0);
        for(const side of v.bike?[0]:[-1,1]){
          const offset=v.bike?0:side*v.width*.32;
          pose.position.set(v.x+fx*distance+rx*offset,v.y+.034+distance*v.grade,v.z+fz*distance+rz*offset);
          // The plane's uv.y increases along -Z, away from the lamp.
          pose.rotation.set(Math.atan(v.grade)*dir,-angle,0,'YXZ');
          pose.scale.set(rear?.57:.8,1,span);pose.updateMatrix();
          streaks.setMatrixAt(i,pose.matrix);
          color.setHex(rear?(v.brake?0xff3d24:0xa62517):0xffedbd);
          streaks.setColorAt(i++,color);
        }
      }
    }
    streaks.count=i;streaks.instanceColor.needsUpdate=true;streaks.instanceMatrix.needsUpdate=true;
  }
  return {coat,reflect,wetLights};
}
