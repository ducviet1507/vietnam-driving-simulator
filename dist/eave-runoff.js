'use strict';

// Register the actual lip of a rendered canopy. Coordinates are local to the
// streamed district, so the drops and the building move together on a rebase.
function addEaveRunoff(T,group,fronts,ground,material){
  const lips=group.userData.eaves||[];
  for(const f of fronts){
    if(f.canopy>.18)lips.push([f.x+f.nx*f.canopy,f.y+f.top,f.z+f.nz*f.canopy,f.ux,f.uz,f.half*2]);
  }
  if(!lips.length)return null;
  const positions=[],fall=[];
  for(const [x,y,z,ux,uz,width] of lips){
    const count=Math.min(8,Math.max(2,Math.round(width/1.15)));
    for(let i=0;i<count;i++){
      const u=width*((i+.31)/count-.5),px=x+ux*u,pz=z+uz*u;
      const height=y-ground(px,pz)-.06;
      if(height<=.15)continue;
      const seed=Math.abs(Math.sin(x*.37+z*.71+i*19.12));
      for(const tip of [0,1]){
        positions.push(px,y-.035,pz);
        fall.push(height,seed,tip);
      }
    }
  }
  if(!positions.length)return null;
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('fall',new T.Float32BufferAttribute(fall,3));
  const mesh=new T.LineSegments(g,material);
  mesh.name='Runoff from canopy edges';mesh.visible=false;mesh.frustumCulled=false;
  group.add(mesh);
  return mesh;
}

function createEaveMaterial(T,store){
  return new T.ShaderMaterial({
    uniforms:{waterLeft:store,seconds:{value:0}},transparent:true,depthWrite:false,
    vertexShader:`
      uniform float waterLeft,seconds;
      attribute vec3 fall;
      varying float opacity;
      void main(){
        float duration=sqrt(2.*fall.x/9.81);
        float period=duration+.18+fall.y*.51;
        float cycle=seconds/period+fall.y*12.;
        float age=fract(cycle)*period;
        float active=step(fract(floor(cycle)*.618+fall.y*23.),waterLeft);
        float depth=min(fall.x,4.905*age*age);
        vec3 p=position-vec3(0.,max(0.,depth-fall.z*min(.16,.016+.085*age)),0.);
        vec4 mv=modelViewMatrix*vec4(p,1.);
        opacity=active*step(age,duration)*(1.-smoothstep(22.,70.,length(mv.xyz)));
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`
      varying float opacity;
      void main(){
        gl_FragColor=vec4(.52,.66,.73,.58*opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}
