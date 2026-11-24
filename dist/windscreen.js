'use strict';

// The glass and the wiper pivots use the same local metre coordinates. Camera
// movement, suspension and looking out a side window all follow the cabin rig.
function createDrivingWindscreen(T, cabin, truck) {
  const width = truck ? 2.17 : 1.81;
  const rise = truck ? .85 : .86, rake = truck ? .22 : 1.03;
  const height = Math.hypot(rise, rake), topWidth = truck ? 2.05 : 1.32;
  const pane = new T.Group();
  pane.name = 'Rain on windscreen';
  pane.rotation.order = 'YXZ';
  pane.rotation.y = truck ? 0 : Math.PI;
  pane.rotation.x = Math.atan2(rake, rise);
  pane.position.set(0, truck ? 1.925 : .961, truck ? -3.65 : .865);
  cabin.add(pane);

  const inner = width * .125, outer = width * (truck ? .395 : .46);
  const blade = new T.Shape();
  // A narrow steel arm joins the blade halfway along its rubber lip.
  const joint = (inner + outer) / 2;
  const outline = [[0,-.009],[joint-.07,-.031],[joint,-.015],[joint,-.006],
    [outer,-.004],[outer,.005],[inner,.009],[inner,.001],[joint-.022,-.001],
    [joint-.07,-.017],[0,.006]];
  blade.moveTo(...outline[0]);
  for (const [x,y] of outline.slice(1)) blade.lineTo(x,y);
  blade.closePath();
  const bladeGeometry = new T.ExtrudeGeometry(blade, {depth:.008,bevelEnabled:false});
  const bladeMaterial = new T.MeshStandardMaterial({color:0x303435, roughness:.58, metalness:.35});
  const parked = .035;
  const wipers = [-.36,.03].map((fraction,index) => {
    const mesh = new T.Mesh(bladeGeometry, bladeMaterial);
    mesh.position.set(width*fraction,.006,-.003);
    mesh.rotation.z = parked;
    pane.add(mesh);
    return {mesh, travel:index ? 1.33 : 1.57, low:parked, high:parked};
  });

  const limit = 520;
  const beads = new Float32Array(limit * 4), ages = new Float32Array(limit);
  const instances = new T.InstancedBufferAttribute(beads, 4).setUsage(T.DynamicDrawUsage);
  const geometry = new T.InstancedBufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute([-1,-1,0,1,-1,0,-1,1,0,1,1,0],3));
  geometry.setIndex([0,1,2,2,1,3]);
  geometry.setAttribute('bead', instances);
  geometry.instanceCount = 0;
  const material = new T.ShaderMaterial({
    uniforms:{brightness:{value:1}}, transparent:true, depthWrite:false, extensions:{derivatives:true},
    vertexShader:`
      attribute vec4 bead;
      varying vec2 disc;
      void main() {
        disc=position.xy;
        vec2 point=bead.xy+disc*bead.z*vec2(1.,bead.w);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(point,.008,1.);
      }`,
    fragmentShader:`
      uniform float brightness;
      varying vec2 disc;
      void main() {
        float radius=length(disc);
        float edge=max(fwidth(radius),.06);
        float cover=1.-smoothstep(1.-edge,1.+edge,radius);
        float rim=smoothstep(.46,.91,radius);
        float sky=smoothstep(.0,.85,-disc.y);
        float glint=exp(-16.*dot(disc-vec2(-.27,.45),disc-vec2(-.27,.45)));
        vec3 colour=mix(vec3(.012,.02,.025),vec3(.58,.69,.78)*brightness,sky);
        colour+=vec3(1.,.97,.88)*glint*brightness;
        gl_FragColor=vec4(colour,cover*(.09+.37*rim+.52*glint));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const drops = new T.Mesh(geometry, material);
  drops.frustumCulled = false;
  drops.renderOrder = 4;
  pane.add(drops);

  let count = 0, arrivals = 0, phase = 0, wait = .6, previousTime;
  return function update(rain, speed, light, now) {
    if (previousTime != null && now - previousTime > 20000) {
      count = arrivals = phase = 0;
      wait = .6;
      for (const {mesh} of wipers) mesh.rotation.z = parked;
    }
    const dt = Math.min(.1, Math.max(0,(now - (previousTime ?? now))*.001));
    previousTime = now;
    pane.visible = rain > .015 || count > 0 || phase > 0;
    if (!pane.visible) return;
    material.uniforms.brightness.value = Math.min(1.15,.19 + light*.36);
    const sweeping = phase > 0 || (rain > .015 && (wait -= dt) <= 0);
    const start = phase;
    if (sweeping) phase = Math.min(1, phase + dt*(.75+.36*rain));
    const lift = (1-Math.cos(phase*2*Math.PI))*.5;
    for (const w of wipers) {
      const before = w.mesh.rotation.z, after = parked+w.travel*lift;
      w.low = Math.min(before,after)-.014;
      w.high = start < .5 && phase >= .5 ? parked+w.travel+.014 : Math.max(before,after)+.014;
      w.mesh.rotation.z = after;
    }
    if (phase === 1) { phase = 0; wait = .14 + 3.8*(1-rain)**2; }

    arrivals += dt*rain*(145+Math.min(30,speed)*5);
    while (arrivals >= 1) {
      arrivals--;
      if (count === limit) continue;
      const y = Math.random()*height;
      const x = (Math.random()-.5)*(width+(topWidth-width)*y/height-.02);
      const i = count*4, size = Math.random()**2;
      beads[i] = x; beads[i+1] = y;
      beads[i+2] = .0018+.0046*size; beads[i+3] = 1.06+.64*size;
      ages[count++] = 5+Math.random()*9;
    }
    for (let n=count-1; n>=0; n--) {
      const i=n*4, x=beads[i], radius=beads[i+2];
      // Large drops drain at rest and are pushed up the sloping glass at speed.
      const y=beads[i+1] += dt*Math.max(0,radius-.003)*(-7+Math.min(35,speed)*.52);
      ages[n] -= dt;
      let cleared = y<0 || y>height || Math.abs(x)>(width+(topWidth-width)*y/height)*.5 || ages[n]<=0;
      if (!cleared && sweeping) {
        for (const w of wipers) {
          const dx=x-w.mesh.position.x, dy=y-w.mesh.position.y, radiusSq=dx*dx+dy*dy;
          if (radiusSq<inner*inner || radiusSq>outer*outer) continue;
          const angle=Math.atan2(dy,dx);
          if (angle>=w.low && angle<=w.high) { cleared=true; break; }
        }
      }
      if (cleared) {
        count--;
        beads.copyWithin(i,count*4,count*4+4);
        ages[n]=ages[count];
      }
    }
    geometry.instanceCount=count;
    drops.visible=count>0;
    if (count) instances.needsUpdate=true;
  };
}
