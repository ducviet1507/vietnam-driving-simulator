/* Interior details use the dimensions and axes of the bundled sedan shell. */
window.buildDriverCabin = function(T, rig, mapCanvas) {
  const cabin=new T.Group();
  cabin.visible=false;
  rig.add(cabin);
  cabin.scale.setScalar(.842);cabin.rotation.y=Math.PI;
  const black=new T.MeshStandardMaterial({color:0x151b1c,metalness:.18,roughness:.58});
  const steel=new T.MeshStandardMaterial({color:0x909a97,metalness:.65,roughness:.28});
  const rubber=new T.MeshStandardMaterial({color:0x242728,metalness:.1,roughness:.76});
  const chrome=new T.MeshStandardMaterial({color:0xd0d5d1,metalness:.4,roughness:.25});
  function bevel(parent,outline,depth,material,radius=.005) {
    const shape=new T.Shape();
    const pts=outline.map(p=>new T.Vector2(...p));
    for(let i=0;i<pts.length;i++){
      const a=pts[i],b=pts[(i+1)%pts.length],mid=a.clone().lerp(b,.5);
      if(!i){const prev=pts[pts.length-1].clone().lerp(a,.5);shape.moveTo(prev.x,prev.y);}
      shape.quadraticCurveTo(a.x,a.y,mid.x,mid.y);
    }
    shape.closePath();
    const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,bevelSize:radius,bevelThickness:radius}),material);
    parent.add(mesh);return mesh;
  }
  function rounded(parent,w,h,depth,material,radius=.012) {
    const x=w/2,y=h/2,r=radius;
    return bevel(parent,[[-x+r,-y],[x-r,-y],[x,-y],[x,-y+r],[x,y-r],[x,y],[x-r,y],[-x+r,y],[-x,y],[-x,y-r],[-x,-y+r],[-x,-y]],depth,material,.002);
  }
  function panel(parent,w,h,material,x,y,z){
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),material);
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function canvasTexture(w,h){
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
    return {ctx:c.getContext('2d'),tex};
  }
  // Continuous molded upper dash. Its profile drops toward the windscreen and
  // folds into the darker fascia toward the seats.
  const hide=new T.MeshStandardMaterial({color:0x292d30,roughness:.85,metalness:.04,side:T.DoubleSide});
  const grain=canvasTexture(128,128), noise=grain.ctx.createImageData(128,128);
  for(let i=0;i<noise.data.length;i+=4){
    const value=155+Math.floor(Math.random()*70);
    noise.data.set([value,value,value,255],i);
  }
  grain.ctx.putImageData(noise,0,0);grain.tex.needsUpdate=true;
  grain.tex.wrapS=grain.tex.wrapT=T.RepeatWrapping;grain.tex.repeat.set(14,7);
  hide.bumpMap=grain.tex;hide.bumpScale=.0008;
  function swept(profile,material){
    const position=[],uv=[],indices=[];
    for(let i=0;i<=60;i++){
      const x=-1.02+i*2.04/60;
      const arch=.018*(1-x*x);
      for(const [y,z] of profile){
        position.push(x,y+arch,z+.10*x*x);uv.push(i/60,z);
      }
    }
    const n=profile.length;
    for(let i=0;i<60;i++)for(let j=0;j<n-1;j++){
      const a=i*n+j;indices.push(a,a+n,a+1,a+1,a+n,a+n+1);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(position,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();cabin.add(new T.Mesh(geo,material));
  }
  swept([[.40,.14],[.68,.14],[.77,.20],[.82,.30],[.88,.31],[.93,.34],[.995,.42],[1.012,.49],[1.018,.58],[1.003,.70],[.977,.87],[.95,1.00]],hide);
  swept([[.793,.250],[.806,.268],[.813,.286]],new T.MeshStandardMaterial({color:0x9b9d94,metalness:.58,roughness:.36,side:T.DoubleSide}));
  swept([[.811,.288],[.825,.297],[.841,.308]],new T.MeshStandardMaterial({color:0x383c38,metalness:.3,roughness:.48,side:T.DoubleSide}));
  function pipe(points,radius,material){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const mesh=new T.Mesh(new T.TubeGeometry(curve,18,radius,10,false),material);cabin.add(mesh);return mesh;
  }
  const lining=new T.MeshStandardMaterial({color:0x777b75,roughness:.95});
  for(const side of [-1,1]){
    const points=[[side*.92,.92,.84],[side*.88,1.12,.60],[side*.795,1.36,.31],[side*.645,1.85,-.17]];
    pipe(points,.040,lining);
    // Padded door caps meet the dash fascia at the windscreen corners.
    const door=new T.Group();door.position.set(side*.842,.72,-.04);door.rotation.y=side*Math.PI/2;cabin.add(door);
    rounded(door,1.66,.43,.094,hide,.036);
    rounded(door,1.65,.055,.108,black,.018).position.y=.205;
    rounded(door,.58,.026,.120,steel,.012).position.set(-side*.12,.038,.003);
    pipe([[side*.93,.963,.748],[side*.91,.953,.24],[side*.85,.938,-.46],[side*.82,.955,-.80]],.017,black);
    pipe(points.map(([x,y,z])=>[x-side*.038,y,z+.014]),.013,black);
  }
  const stitching=Array.from({length:21},(_,i)=>{const x=-1+i*.10;return [x,.998+.018*(1-x*x),.438+.10*x*x]});
  pipe(stitching,.0014,steel);
  const wheel=new T.Group();wheel.position.set(.37,.918,.002);cabin.add(wheel);
  const controls=new T.Group();controls.rotation.y=Math.PI;controls.rotation.x=.30;wheel.add(controls);
  const rim=new T.Mesh(new T.TorusGeometry(.181,.017,14,96),hide);
  rim.position.z=.047;controls.add(rim);
  const seam=new T.Mesh(new T.TorusGeometry(.170,.0014,5,96),steel);
  seam.position.z=.059;controls.add(seam);
  const stitch=[];
  for(let i=0;i<75;i++){
    for(const offset of [0,.047]){
      const a=i*2*Math.PI/75+offset;
      stitch.push(.179*Math.cos(a),.179*Math.sin(a),.064);
    }
  }
  const thread=new T.BufferGeometry();thread.setAttribute('position',new T.Float32BufferAttribute(stitch,3));
  controls.add(new T.LineSegments(thread,new T.LineBasicMaterial({color:0x928c81})));
  const lower=bevel(controls,[[-.061,-.043],[-.020,-.161],[.018,-.161],[.058,-.043],[.040,-.054],[.007,-.137],[-.009,-.137],[-.041,-.053]],.012,steel,.004);lower.position.z=.04;
  const pad=bevel(controls,[[-.097,.04],[-.067,.064],[.067,.064],[.097,.04],[.075,-.064],[.043,-.085],[-.043,-.085],[-.075,-.064]],.027,black,.012);
  pad.position.z=.038;
  for(const side of [-1,1]){
    const spoke=bevel(controls,[[side*.068,.02],[side*.17,.047],[side*.157,-.004],[side*.102,-.029],[side*.056,-.04]],.017,steel,.005);
    spoke.position.z=.028;
    const switchgear=rounded(controls,.047,.024,.005,rubber,.005);
    switchgear.position.set(side*.118,.014,.05);
    for(let i=-1;i<=1;i++){
      const line=rounded(controls,.006,.002,.001,chrome,.001);line.position.set(side*.118+i*.01,.014,.058);
    }
  }
  const insignia=canvasTexture(256,128),ic=insignia.ctx;
  ic.fillStyle='#242728';ic.fillRect(0,0,256,128);ic.textAlign='center';
  ic.fillStyle='#bfc6c5';ic.font='italic 700 34px sans-serif';ic.fillText('V',128,58);
  ic.font='12px sans-serif';ic.fillStyle='#979c99';ic.fillText('SRS AIRBAG',128,105);
  panel(controls,.090,.045,new T.MeshBasicMaterial({map:insignia.tex}),0,-.003,.080);insignia.tex.needsUpdate=true;
  const dash=new T.Group();dash.rotation.y=Math.PI;dash.position.set(.37,1.048,.35);cabin.add(dash);
  const visor=bevel(dash,[[-.22,-.069],[-.213,.043],[-.179,.089],[.159,.09],[.214,.064],[.222,-.064]],.078,black,.008);visor.position.z=-.069;
  const cluster=canvasTexture(768,230);
  panel(dash,.398,.120,new T.MeshBasicMaterial({map:cluster.tex}),0,.008,.023);
  const center=new T.Group();center.rotation.y=Math.PI;center.position.set(-.095,1.044,.345);cabin.add(center);
  rounded(center,.303,.151,.012,black);
  const nav=canvasTexture(480,224), n=nav.ctx;
  const mapScreen=panel(center,.287,.134,new T.MeshBasicMaterial({map:nav.tex,toneMapped:false}),0,0,.016);
  let mapDirty=true;
  function navigation(distance,course){
    if(!mapDirty)return;
    mapDirty=false;
    const w=n.canvas.width,h=n.canvas.height,mapHeight=course?h-40:h;
    const scale=Math.min(w/mapCanvas.width,mapHeight/mapCanvas.height);
    const width=mapCanvas.width*scale,height=mapCanvas.height*scale;
    n.fillStyle='#162825';n.fillRect(0,0,w,h);
    n.drawImage(mapCanvas,(w-width)/2,(mapHeight-height)/2,width,height);
    if(course){
      n.fillStyle='#0d191d';n.fillRect(0,mapHeight,w,40);
      n.font='600 23px sans-serif';n.textAlign='right';n.fillStyle='#afdecc';
      const remaining=Math.max(0,Math.round(course.finish-distance))+' m';
      n.fillText(remaining,w-10,h-11);
      n.textAlign='left';n.fillStyle='#e2f3ee';
      n.fillText(course.name,10,h-11,w-n.measureText(remaining).width-32);
    }
    nav.tex.needsUpdate=true;
  }
  for(const vx of [-.45,.74]){
    const vent=new T.Group();vent.position.set(vx,.884,.316);vent.rotation.y=Math.PI;cabin.add(vent);
    const width=vx<0?.36:.18;
    rounded(vent,width,.056,.008,black,.011);
    for(let row=-1;row<=1;row++)
      rounded(vent,width-.015,.003,.003,steel,.002).position.set(0,row*.011,.012);
  }
  // The mirror samples the actual rear roadway into a small target on a separate cadence.
  const mirror=new T.Group();mirror.position.set(.035,1.56,.30);mirror.rotation.y=Math.PI-.12;cabin.add(mirror);
  const post=rounded(mirror,.029,.37,.028,black);post.position.set(0,.196,-.045);
  rounded(mirror,.270,.083,.012,rubber,.014);
  const target=new T.WebGLRenderTarget(256,80,{generateMipmaps:false,minFilter:T.LinearFilter});
  target.texture.repeat.x=-1;target.texture.offset.x=1;
  panel(mirror,.253,.067,new T.MeshBasicMaterial({map:target.texture,toneMapped:false}),0,0,.016);
  // Sample a wider view outboard of the left door for lane changes.
  const sideTarget=new T.WebGLRenderTarget(144,72,{generateMipmaps:false,minFilter:T.LinearFilter});
  sideTarget.texture.repeat.x=-1;sideTarget.texture.offset.x=1;
  const sideMirror=new T.Group();sideMirror.position.set(.986,1.050,.69);sideMirror.rotation.y=Math.PI+.27;cabin.add(sideMirror);
  const mount=rounded(sideMirror,.12,.045,.046,black);mount.position.set(.092,-.049,-.035);
  rounded(sideMirror,.21,.105,.026,black,.026);
  panel(sideMirror,.194,.087,new T.MeshBasicMaterial({map:sideTarget.texture,toneMapped:false}),0,0,.032);
  const rearCamera=new T.PerspectiveCamera(27,256/80,.2,620);
  const wingCamera=new T.PerspectiveCamera(38,2,.2,620);
  let lastMirror=-Infinity,previousSpeed=-1,renderWing=false,preparedEnvironment;
  function instruments(speed){
    const value=Math.round(speed);if(value===previousSpeed)return;
    previousSpeed=value;const c=cluster.ctx;
    c.fillStyle='#081219';c.fillRect(0,0,768,230);
    for(const [cx,range,reading] of [[163,100,speed],[606,6,.9+speed%19/10]]){
      const cy=121,r=91;
      c.strokeStyle='#253e49';c.lineWidth=8;c.beginPath();c.arc(cx,cy,r,Math.PI*.77,Math.PI*2.23);c.stroke();
      c.strokeStyle='#83cdc9';c.lineWidth=4;c.beginPath();c.arc(cx,cy,r,Math.PI*.77,Math.PI*(.77+1.46*reading/range));c.stroke();
      for(let i=0;i<=30;i++){
        const angle=Math.PI*(.77+1.46*i/30),major=i%5===0;
        c.lineWidth=major?4:2;c.strokeStyle='#cfe2e0';c.beginPath();
        c.moveTo(cx+(r-8)*Math.cos(angle),cy+(r-8)*Math.sin(angle));c.lineTo(cx+(r-(major?20:14))*Math.cos(angle),cy+(r-(major?20:14))*Math.sin(angle));c.stroke();
      }
      const angle=Math.PI*(.77+1.46*reading/range);
      c.strokeStyle='#ff8755';c.lineWidth=4;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+(r-20)*Math.cos(angle),cy+(r-20)*Math.sin(angle));c.stroke();
    }
    c.textAlign='center';c.fillStyle='#f5fcf8';c.font='500 86px sans-serif';c.fillText(value,380,131);c.font='22px sans-serif';c.fillStyle='#93b6b5';c.fillText('km/h',380,163);c.fillStyle='#b3e6aa';c.font='23px sans-serif';c.fillText('D',380,200);
    cluster.tex.needsUpdate=true;
  }
  return {
    mapScreen,
    refreshMap(){mapDirty=true;},
    // On narrow screens, sit a little farther back to keep the wheel and console in view.
    seatInset(aspect){return T.MathUtils.clamp((1-aspect)*.40,0,.24);},
    prepare(renderer,scene,camera){
      if(!scene.environment||preparedEnvironment===scene.environment)return;
      preparedEnvironment=scene.environment;
      if(!renderer.extensions.has('KHR_parallel_shader_compile'))return;
      // The display and the linear mirror texture use different shader programs.
      // Submit both batches while the starting scene is visible, before a mirror
      // draw has to wait for the driver to link each material in turn.
      renderer.compile(scene,camera);
      const previous=renderer.getRenderTarget();
      try{
        renderer.setRenderTarget(target);
        renderer.compile(scene,rearCamera);
      }finally{renderer.setRenderTarget(previous);}
    },
    update(interior,speed,steering,distance,course){
      if(cabin.visible!==interior)document.body.toggleAttribute('data-dashboard-map',interior);
      cabin.visible=interior;

      wheel.rotation.z=interior?steering*.92:0;
      if(interior){instruments(speed);navigation(distance,course);}
    },
    reflect(renderer,scene,player,distance,lateral,interval=90){
      const now=performance.now();if(now-lastMirror<interval)return;lastMirror=now;
      const cam=renderWing?wingCamera:rearCamera;
      if(renderWing){
        cam.position.set(lateral-1.02,1.13,2-distance);cam.lookAt(lateral-5.6,.97,25-distance);
      }else{
        cam.position.set(lateral,1.23,4.46-distance);cam.lookAt(lateral,1.08,45-distance);
      }
      const previous=renderer.getRenderTarget(),visible=player.visible;
      player.visible=false;renderer.setRenderTarget(renderWing?sideTarget:target);renderer.render(scene,cam);
      renderWing=!renderWing;
      renderer.setRenderTarget(previous);player.visible=visible;
    }
  };
};
