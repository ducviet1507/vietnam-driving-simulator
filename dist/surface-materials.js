'use strict';
// Streamed surfaces have independent vertices per triangle. Compute their
// flat normal once per face, including when positions and normals are interleaved.
function writeFlatNormals(positions,normals,stride=3,offset=0){
  for(let a=0;a<positions.length;a+=stride*3){
    const b=a+stride,c=b+stride;
    const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2];
    const vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2];
    const x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;
    const length=Math.sqrt(x*x+y*y+z*z)||1;
    const nx=x/length,ny=y/length,nz=z/length;
    for(let i=a+offset;i<=c+offset;i+=stride){
      normals[i]=nx;normals[i+1]=ny;normals[i+2]=nz;
    }
  }
}
function setFlatNormals(T,geometry){
  const positions=geometry.attributes.position.array,normals=new Float32Array(positions.length);
  writeFlatNormals(positions,normals);
  geometry.setAttribute('normal',new T.BufferAttribute(normals,3));
}

// Each renderer shares one pair of atlases across building districts and shops.
const streetRoofAtlases=new WeakMap();
function shadeStreetRoof(T,shader,kind,plan,face){
  let atlas=streetRoofAtlases.get(T);
  if(!atlas){
    const loader=new T.TextureLoader(),ready={value:0};
    let loaded=0;
    const read=name=>loader.load('streetscape/surfaces/vn-roof-'+name+'.webp',()=>{if(++loaded===2)ready.value=1;});
    const colour=read('color');colour.colorSpace=T.SRGBColorSpace;
    atlas={roofPhoto:{value:colour},roofSurface:{value:read('surface')},roofReady:ready};
    streetRoofAtlases.set(T,atlas);
  }
  Object.assign(shader.uniforms,atlas);
  const vary='varying vec2 roofMetres; varying float roofKind;\n';
  shader.vertexShader=vary+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    roofKind=${kind};
    vec3 pitchNormal=${face};vec2 roofPlan=${plan};
    #ifdef USE_INSTANCING
      vec3 roofSize=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
      pitchNormal/=max(roofSize,vec3(.001));roofPlan*=roofSize.xz;
    #endif
    pitchNormal=normalize(pitchNormal);
    if(abs(pitchNormal.y)<.12)roofKind=-1.;
    if(pitchNormal.y<0.)pitchNormal=-pitchNormal;
    vec2 upslope=length(pitchNormal.xz)>.001?-normalize(pitchNormal.xz):vec2(0.,1.);
    roofMetres=vec2(dot(roofPlan,vec2(upslope.y,-upslope.x)),dot(roofPlan,upslope)/max(.12,pitchNormal.y));`);
  shader.fragmentShader=vary+`uniform sampler2D roofPhoto,roofSurface;uniform float roofReady;
    vec4 roofTexel(sampler2D atlas,vec2 uv,vec2 dx,vec2 dy){
      #if __VERSION__ >= 300
        return textureGrad(atlas,uv,dx,dy);
      #else
        return texture2D(atlas,uv);
      #endif
    }\n`+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float roofAmount=0.,roofRough=.9;vec2 roofBump=vec2(0.);
    if(roofReady>.5&&roofKind>-.1&&roofKind<1.1){
      float clay=step(.5,roofKind);
      vec2 repeated=roofMetres/mix(2.70,2.50,clay);
      vec2 cell=vec2(960./2048.,960./1024.);
      vec2 uv=vec2(clay*.5+32./2048.,32./1024.)+cell*fract(repeated);
      vec2 dx=dFdx(repeated)*cell,dy=dFdy(repeated)*cell;
      vec3 rgb=roofTexel(roofPhoto,uv,dx,dy).rgb;
      vec3 props=roofTexel(roofSurface,uv,dx,dy).rgb;
      roofAmount=1.-smoothstep(.045,.18,max(length(dx),length(dy)));
      vec3 mean=mix(vec3(.09849,.09787,.08221),vec3(.31087,.08641,.02647),clay);
      diffuseColor.rgb*=mix(vec3(1.),clamp(rgb/mean,vec3(.24),vec3(2.6)),roofAmount*.84);
      roofRough=props.b;roofBump=props.rg*2.-1.;
    }`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=mix(roughnessFactor,clamp(roofRough,.26,.98),roofAmount);`)
    .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      if(roofAmount>.001){
        vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition);
        vec2 du=dFdx(roofMetres),dv=dFdy(roofMetres);
        vec3 ax=cross(dy,normal),ay=cross(normal,dx);
        vec3 tangent=ax*du.x+ay*dv.x,bitangent=ax*du.y+ay*dv.y;
        float scale=inversesqrt(max(max(dot(tangent,tangent),dot(bitangent,bitangent)),1.e-12));
        vec2 slope=roofBump*(.68*roofAmount);
        normal=normalize(normal*sqrt(max(.02,1.-dot(slope,slope)))+scale*(tangent*slope.x+bitangent*slope.y));
      }`);
}

function streetRoofMaterial(T,colour,clay){
  const mat=new T.MeshStandardMaterial({color:colour,side:T.DoubleSide,roughness:clay?.9:.62});
  mat.name=clay?'Fired clay roof':'Corrugated steel roof';
  mat.onBeforeCompile=shader=>shadeStreetRoof(T,shader,clay?'1.':'0.','position.xz','normal');
  mat.customProgramCacheKey=()=>mat.name;
  return mat;
}

// Scanned road material channels share a UV transform across district changes.
function createRoadSurfaces(T,renderer){
  const loader=new T.TextureLoader(),anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  function scanned(name,tint,strength){
    function channel(kind){
      const tex=loader.load('streetscape/surfaces/'+name+'-'+kind+'.webp');
      tex.name=name+' '+kind;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=anisotropy;
      if(kind==='color')tex.colorSpace=T.SRGBColorSpace;
      return tex;
    }
    return new T.MeshStandardMaterial({name:'Scanned '+name,color:tint,map:channel('color'),roughnessMap:channel('rough'),
      normalMap:channel('normal'),normalScale:new T.Vector2(strength,strength),metalness:0,roughness:.94,envMapIntensity:.36});
  }
  function transform(material,repeatX,repeatY,offsetX=0,offsetY=0){
    for(const tex of [material.map,material.normalMap,material.roughnessMap]){
      tex.repeat.set(repeatX,repeatY);tex.offset.set(offsetX,offsetY);
    }
  }
  function weatheredAsphalt(mat,moisture,origin,reflection){
    mat.envMapIntensity=.67;
    mat.onBeforeCompile=shader=>{
      shader.uniforms.roadWetness=moisture.asphalt;
      shader.uniforms.standingWater=moisture.pools;
      shader.uniforms.roadOrigin={value:origin};
      Object.assign(shader.uniforms,reflection);
      const varyings='varying vec4 roadSample; varying vec4 roadMirrorUV; varying vec2 roadProfile;\n';
      shader.vertexShader=varyings+'attribute vec3 carriageway; uniform vec2 roadOrigin; uniform mat4 mirrorMatrix;\n'+
        shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n roadSample=vec4(position.xz+roadOrigin,carriageway.xy); vec4 roadWorld=modelMatrix*vec4(position,1.); roadProfile=vec2(roadWorld.y,carriageway.z); roadMirrorUV=mirrorMatrix*roadWorld;');
      shader.fragmentShader=varyings+`
        uniform float roadWetness, standingWater, mirrorStrength, mirrorLevel;
        uniform sampler2D mirrorMap;
        float roadHash(vec2 p){
          vec3 h=fract(p.xyx*vec3(.1031,.11369,.13787));
          h+=dot(h,h.yzx+19.19);return fract((h.x+h.y)*h.z);
        }
        float depressions(vec2 p){
          vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(roadHash(i),roadHash(i+vec2(1.,0.)),f.x),
                     mix(roadHash(i+vec2(0.,1.)),roadHash(i+1.),f.x),f.y);
        }\n`+
        shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
          // Sample a larger patch of the same scan to break up the four-metre repeat.
          vec2 metres=roadSample.xy;
          vec2 patchUV=mat2(.8,.6,-.6,.8)*metres/32.;
          float variation=smoothstep(.13,.35,texture2D(map,patchUV).g);
          float halfWidth=roadSample.w, lateral=abs(roadSample.z);
          float laneWidth=halfWidth>6.7 ? halfWidth*.5 : halfWidth;
          float centre=halfWidth<4.2 ? 0. : laneWidth*.5;
          float offset=abs(mod(lateral-centre+laneWidth*.5,max(laneWidth,.1))-laneWidth*.5);
          float tracks=(1.-smoothstep(.14,.50,abs(offset-.82)))*step(.01,halfWidth);
          float edge=smoothstep(halfWidth-.85,halfWidth,lateral)*step(.01,halfWidth);
          float film=0.;
          float exposed=step(-.5,roadProfile.y);
          if(exposed>.5 && (roadWetness>.004 || standingWater>.004)){
            float basin=.72*depressions(metres*.32)+.28*variation+.16*edge-.08*tracks+.22*roadProfile.y;
            vec3 roadPoint=vec3(metres.x,roadProfile.x,metres.y);
            vec3 face=cross(dFdx(roadPoint),dFdy(roadPoint));
            float grade=length(face.xz)/max(.000001,abs(face.y));
            float pool=smoothstep(.40,.73,basin)*(1.-smoothstep(.025,.115,grade));
            film=clamp(roadWetness*.24+standingWater*pool*.92,0.,1.);
          }
          diffuseColor.rgb*=mix(.83,1.18,variation)*(1.-.16*tracks);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.17,.122,.084),edge*.26);
          diffuseColor.rgb*=1.-.53*film-.13*roadWetness*exposed;`)
        .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          roughnessFactor=mix(clamp(roughnessFactor-.07*tracks,.52,.97),.085,film);`)
        .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
          normal=normalize(mix(normal,nonPerturbedNormal,.84*film));`)
        .replace('#include <opaque_fragment>',`
          if(film>.08 && mirrorStrength>.5 && roadMirrorUV.w>0.){
            vec2 uv=roadMirrorUV.xy/roadMirrorUV.w*.5+.5;
            float border=min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y));
            float levelFit=1.-smoothstep(.12,1.5,abs(roadProfile.x-mirrorLevel));
            float grazing=1.-max(0.,dot(normal,normalize(vViewPosition)));
            float reflectance=(.04+.71*pow(grazing,3.))*film*film*levelFit*smoothstep(0.,.045,border);
            vec2 ripple=(normal.xy-nonPerturbedNormal.xy)*.038;
            vec2 blur=vec2(.002,.004)*(1.5-film);
            uv=clamp(uv+ripple,blur,1.-blur);
            vec3 reflected=texture2D(mirrorMap,uv).rgb*.5+
              .25*(texture2D(mirrorMap,uv+blur).rgb+texture2D(mirrorMap,uv-blur).rgb);
            outgoingLight=mix(outgoingLight,reflected,reflectance);
          }
          #include <opaque_fragment>`);
    };
  }
  function roadPaint(tint,asphalt,wet,origin=new T.Vector2()){
    const paint=new T.MeshStandardMaterial({name:'Road marking',color:tint,side:T.DoubleSide,roughness:.81});
    paint.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,{paintGrain:{value:asphalt.map},paintOrigin:{value:origin},paintWet:wet});
      shader.vertexShader='uniform vec2 paintOrigin; varying vec2 paintMetres;\n'+shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n paintMetres=position.xz+paintOrigin;');
      shader.fragmentShader='uniform sampler2D paintGrain;uniform float paintWet;varying vec2 paintMetres;\n'+
        shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          vec3 aggregate=texture2D(paintGrain,paintMetres*.91).rgb;
          float pits=1.-smoothstep(.023,.115,dot(aggregate,vec3(.21,.72,.07)));
          float coarseGrain=texture2D(paintGrain,paintMetres*.071).g;
          float wear=pits*(.15+.42*(1.-smoothstep(.035,.19,coarseGrain)));
          diffuseColor.rgb=mix(diffuseColor.rgb,aggregate,wear)*(1.-.13*paintWet);`)
        .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          roughnessFactor=mix(.71+.19*wear,.30+.20*wear,paintWet);`);
    };
    return paint;
  }
  return {scanned,transform,weatheredAsphalt,roadPaint};
}
