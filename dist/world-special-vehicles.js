'use strict';

// Exterior models face +Z, like the other garage assets. Cabins face -Z on the camera rig.
window.WorldSpecialVehicles = (() => {
  function workshop(T) {
    const boxGeometry = new T.BoxGeometry(1,1,1);
    const sphere = new T.SphereGeometry(1,20,12);
    const barrel = new T.CylinderGeometry(1,1,1,16);
    const up = new T.Vector3(0,1,0);
    const finish = (name,color,roughness=.62,metalness=.08) => {
      const material = new T.MeshStandardMaterial({color,roughness,metalness});
      material.name = name;
      return material;
    };
    const paint = finish('paint',0x24686b,.36,.40);
    const trim = finish('trim',0x252c30,.72), rubber = finish('rubber',0x171b1c,.86);
    const metal = finish('metal',0xa5afb1,.38,.63), darkMetal = finish('chassis',0x495259,.50,.47);
    const glass = finish('glass',0x42555d,.22,.42), cream = finish('alloy',0xd5d7cd,.53,.36);
    const amber = finish('indicator',0xffa33f,.3), red = finish('light_rear',0xc93426,.30);
    const light = finish('lamp',0xe6eddc,.27);
    light.emissive.setHex(0xffedbd);light.emissiveIntensity=.27;
    function part(group,geo,mat,x,y,z,w=1,h=1,l=1) {
      const mesh=new T.Mesh(geo,mat);
      mesh.position.set(x,y,z);mesh.scale.set(w,h,l);group.add(mesh);
      return mesh;
    }
    const box = (g,m,x,y,z,w,h,l) => part(g,boxGeometry,m,x,y,z,w,h,l);
    const oval = (g,m,x,y,z,w,h,l) => part(g,sphere,m,x,y,z,w,h,l);
    function rod(g,m,a,b,r) {
      const start=new T.Vector3(...a),delta=new T.Vector3(...b).sub(start);
      const center=start.addScaledVector(delta,.5);
      const mesh=part(g,barrel,m,center.x,center.y,center.z,r,delta.length(),r);
      mesh.quaternion.setFromUnitVectors(up,delta.normalize());
      return mesh;
    }
    function ring(g,m,x,y,z,r,t) {
      return part(g,new T.TorusGeometry(r,t,8,32),m,x,y,z);
    }
    // Extrude a silhouette with a rolled edge. The outline coordinates are (z, y).
    function hull(g,m,width,outline,bevel) {
      const shape=new T.Shape();
      outline.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));
      shape.closePath();
      const geo=new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelThickness:bevel,
        bevelSize:bevel,bevelSegments:2,curveSegments:2});
      geo.translate(0,0,-width/2);
      return part(g,geo,m,0,0,0).rotateY(Math.PI/2);
    }
    function group(parent,name,x=0,y=0,z=0) {
      const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;
    }
    return {T,finish,paint,trim,rubber,metal,darkMetal,glass,cream,amber,red,light,part,box,oval,rod,ring,hull,group};
  }

  // Body panels, spokes and small fittings can share one draw per finish on each moving part.
  function batch(T,root) {
    const normalMatrix=new T.Matrix3(),v=new T.Vector3(),uv=new T.Vector2();
    function collect(parent) {
      const byMaterial=new Map();
      for (const mesh of parent.children.slice()) {
        if (!mesh.isMesh) {collect(mesh);continue;}
        const geo=mesh.geometry,mat=mesh.material;
        let bucket=byMaterial.get(mat);
        if (!bucket) {bucket={pos:[],norm:[],uv:[],index:[]};byMaterial.set(mat,bucket);}
        mesh.updateMatrix();normalMatrix.getNormalMatrix(mesh.matrix);
        const base=bucket.pos.length/3,attr=geo.attributes;
        for(let i=0;i<attr.position.count;i++){
          v.fromBufferAttribute(attr.position,i).applyMatrix4(mesh.matrix);bucket.pos.push(v.x,v.y,v.z);
          v.fromBufferAttribute(attr.normal,i).applyNormalMatrix(normalMatrix);bucket.norm.push(v.x,v.y,v.z);
          uv.fromBufferAttribute(attr.uv,i);bucket.uv.push(uv.x,uv.y);
        }
        if(geo.index){for(const index of geo.index.array)bucket.index.push(base+index);}
        else{for(let i=0;i<attr.position.count;i++)bucket.index.push(base+i);}
        parent.remove(mesh);
      }
      for(const [material,b] of byMaterial){
        const geo=new T.BufferGeometry();
        geo.setAttribute('position',new T.Float32BufferAttribute(b.pos,3));
        geo.setAttribute('normal',new T.Float32BufferAttribute(b.norm,3));
        geo.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));geo.setIndex(b.index);
        parent.add(new T.Mesh(geo,material));
      }
    }
    collect(root);
  }

  function roadWheel(p,root,id,x,y,z,truck) {
    const {group,rod,ring,metal,trim,rubber,darkMetal}=p;
    const axle=group(root,id.startsWith('F')?'steer_'+id:'',x,y,z);
    const wheel=group(axle,'wheel_'+id);
    if(id.endsWith('R')&&id.length===2)wheel.rotation.y=Math.PI;
    const r=truck?.48:.316, width=truck?.26:.127;
    // A torus gives the bike its round tyre section. The truck has broad, flat tread.
    const tyre=ring(wheel,rubber,0,0,0,r-width*.48,width*.48);
    tyre.rotation.y=Math.PI/2;
    if(truck){
      rod(wheel,rubber,[-width*.40,0,0],[width*.40,0,0],r*.98);
      for(const s of [-1,1]){
        const face=s*width*.48;
        rod(wheel,darkMetal,[face-.015,0,0],[face+.015,0,0],r*.69);
        ring(wheel,metal,face,0,0,r*.56,.019).rotation.y=Math.PI/2;
        rod(wheel,metal,[face,0,0],[s*(width*.5+.052),0,0],r*.29);
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4,cy=Math.sin(a)*r*.43,cz=Math.cos(a)*r*.43;
          rod(wheel,trim,[face,cy,cz],[s*(width*.5+.02),cy,cz],.027);
        }
      }
    }else{
      ring(wheel,metal,0,0,0,.239,.016).rotation.y=Math.PI/2;
      rod(wheel,metal,[-.074,0,0],[.074,0,0],.052);
      for(let i=0;i<7;i++){
        const a=i*Math.PI*2/7;
        rod(wheel,darkMetal,[0,.035*Math.cos(a),.035*Math.sin(a)],
          [0,.239*Math.cos(a+.19),.239*Math.sin(a+.19)],.014);
      }
      ring(wheel,metal,-.045,0,0,.115,.017).rotation.y=Math.PI/2;
    }
    return axle;
  }

  function bikeControls(p,g) {
    const {rod,oval,box,trim,rubber,metal,glass,light}=p;
    for(const s of [-1,1]){
      rod(g,metal,[s*.045,.985,.39],[s*.246,1.035,.38],.018);
      rod(g,rubber,[s*.245,1.035,.38],[s*.354,1.044,.342],.021);
      rod(g,metal,[s*.245,1.05,.389],[s*.354,1.041,.388],.007);
      box(g,trim,s*.227,1.034,.396,.069,.058,.062);
      rod(g,trim,[s*.236,1.052,.408],[s*.395,1.196,.418],.008);
      oval(g,trim,s*.416,1.208,.423,.075,.047,.025);
      oval(g,glass,s*.416,1.21,.405,.067,.039,.014);
    }
    oval(g,trim,0,1.054,.507,.116,.067,.064).rotation.x=.38;
    oval(g,light,0,1.07,.488,.079,.027,.036).rotation.x=.38;
  }

  function buildBike(p,root) {
    const {T,box,oval,rod,hull,paint,trim,rubber,metal,darkMetal,amber,red,light,glass,finish}=p;
    const front=roadWheel(p,root,'F',0,.316,.72,false);
    roadWheel(p,root,'R',0,.316,-.72,false);
    const fork=p.group(front,'',0,-.316,-.72);
    for(const s of [-1,1]){
      rod(fork,metal,[s*.105,.315,.72],[s*.105,.963,.493],.029);
      rod(fork,darkMetal,[s*.105,.315,.72],[s*.105,.574,.627],.042);
      rod(root,darkMetal,[s*.115,.311,-.72],[s*.115,.38,-.04],.036);
      rod(root,paint,[s*.134,.44,-.06],[s*.134,.244,.18],.022);
      rod(root,paint,[s*.134,.244,.18],[s*.134,.257,.34],.022);
      rod(root,paint,[s*.134,.257,.34],[s*.134,.618,.415],.022);
      rod(root,darkMetal,[s*.145,.42,-.13],[s*.145,.84,.444],.026);
      rod(root,metal,[s*.142,.66,-.49],[s*.145,.41,-.04],.014);
      oval(fork,amber,s*.184,.888,.54,.036,.028,.025);
      oval(root,amber,s*.161,.721,-.84,.031,.019,.025);
      rod(root,metal,[s*.145,.762,-.848],[s*.145,.837,-.743],.012);
      rod(root,metal,[s*.145,.837,-.743],[s*.145,.829,-.571],.012);
    }
    for(const y of [.862,.962])rod(fork,darkMetal,[-.114,y,.505],[.114,y,.505],.025);
    rod(fork,darkMetal,[0,.809,.552],[0,.989,.39],.032);
    const mudguard=p.part(fork,new T.TorusGeometry(.342,.046,8,18,2.10),paint,0,.316,.72);
    mudguard.rotation.order='YXZ';mudguard.rotation.y=Math.PI/2;mudguard.rotation.z=.51;
    oval(fork,trim,0,.878,.544,.136,.11,.096);
    oval(fork,light,0,.878,.614,.110,.079,.031);
    bikeControls(p,fork);
    hull(root,darkMetal,.231,[[-.72,.62],[-.93,.72],[-.91,.76],[-.31,.751],[.18,.61],[.10,.47],[-.27,.48]],.018);
    hull(root,paint,.27,[[-.27,.59],[-.16,.755],[.02,.874],[.26,.905],[.39,.813],[.31,.66],[.04,.58]],.055);
    oval(root,paint,0,.827,.169,.184,.118,.230);
    oval(root,metal,0,.943,.148,.041,.005,.044);
    hull(root,trim,.25,[[-.91,.74],[-.88,.82],[-.59,.824],[-.46,.79],[-.13,.786],[-.11,.739],[-.59,.73]],.024);
    hull(root,paint,.235,[[-.90,.714],[-.89,.758],[-.56,.735],[-.27,.675],[-.35,.606],[-.63,.648]],.015);
    box(root,red,0,.748,-.932,.20,.052,.031);
    for(let i=0;i<3;i++)box(root,darkMetal,0,.823,-.824+i*.057,.227,.005,.008);
    const plate=box(root,p.cream,0,.60,-.89,.132,.109,.014);plate.rotation.x=.29;
    oval(root,darkMetal,0,.414,.106,.161,.165,.17);
    for(let i=0;i<5;i++)box(root,metal,0,.49+i*.018,.16,.27,.009,.194).rotation.x=-.20;
    rod(root,darkMetal,[.147,.455,.23],[.147,.257,.38],.030);
    rod(root,metal,[.147,.257,.38],[.18,.214,-.17],.032);
    rod(root,metal,[.18,.214,-.17],[.208,.372,-.71],.057);
    rod(root,trim,[.208,.372,-.71],[.211,.378,-.738],.048);
    rod(root,darkMetal,[-.226,.343,-.04],[.226,.343,-.04],.020);

    const jacket=finish('riding jacket',0x555e50,.85),jeans=finish('denim',0x2b3b4b,.91);
    const helmet=finish('helmet',0xe7dcc0,.34,.15);
    oval(root,jeans,0,.845,-.284,.155,.113,.137);
    oval(root,jacket,0,1.098,-.208,.207,.284,.15).rotation.x=.28;
    oval(root,darkMetal,0,1.281,-.161,.117,.051,.084);
    oval(root,trim,0,1.318,-.139,.11,.065,.09);
    oval(root,helmet,0,1.488,-.094,.139,.163,.143);
    oval(root,glass,0,1.502,-.005,.136,.084,.085);
    oval(root,helmet,0,1.414,-.006,.116,.051,.080);
    for(const s of [-1,1]){
      const hip=[s*.105,.852,-.28],knee=[s*.195,.587,.112],heel=[s*.177,.380,-.097];
      rod(root,jeans,hip,knee,.078);oval(root,jeans,...knee,.078,.078,.078);
      rod(root,jeans,knee,heel,.060);oval(root,rubber,s*.177,.369,-.013,.064,.054,.125);
      box(root,trim,s*.177,.333,-.007,.113,.019,.186);
      const shoulder=[s*.146,1.244,-.162],elbow=[s*.245,1.095,.018],hand=[s*.304,1.042,.349];
      rod(root,jacket,shoulder,elbow,.072);oval(root,jacket,...elbow,.072,.072,.072);
      rod(root,jacket,elbow,hand,.052);oval(root,trim,...hand,.055,.049,.070);
      rod(root,trim,[s*.290,1.056,.282],[s*.297,1.048,.316],.054);
    }
  }

  function buildTruck(p,g) {
    const {box,rod,hull,paint,trim,rubber,darkMetal,metal,cream,glass,red,light,amber}=p;
    for(const s of [-1,1]){
      roadWheel(p,g,'F'+(s>0?'L':'R'),s*1.012,.48,2.50,true);
      roadWheel(p,g,'R'+(s>0?'L':'R'),s*1.012,.48,-1.76,true);
      box(g,darkMetal,s*.49,.66,-.14,.16,.24,7.13);
      box(g,metal,s*.97,.51,.24,.09,.07,1.75);
      box(g,metal,s*.97,.72,.24,.09,.07,1.75);
      for(const z of [-2.32,1.92])box(g,rubber,s*.98,.46,z,.39,.62,.047);
      for(const axleZ of [-1.76,2.50]){
        hull(g,trim,.294,[[-.585,.589],[-.54,.822],[-.35,1.002],[.344,1.002],[.547,.822],
          [.574,.656],[.507,.661],[.48,.79],[.323,.937],[-.327,.937],[-.475,.785],[-.509,.589]],.014).position.set(s*1.019,0,axleZ);
      }
    }
    box(g,trim,0,.80,-2.92,.8,.29,.89);
    box(g,darkMetal,0,.88,-.95,2.40,.19,5.55);
    const cargo=p.finish('corrugated aluminium',0xc8c9c0,.53,.4);
    box(g,cargo,0,2.187,-.962,2.41,2.40,5.51);
    for(const s of [-1,1]){
      for(let i=0;i<41;i++)box(g,cream,s*1.213,2.20,-3.59+i*.131,.019,2.236,.026);
      for(const y of [1.045,3.36])box(g,metal,s*1.218,y,-.962,.052,.083,5.54);
      box(g,paint,s*1.236,1.349,-.962,.031,.23,5.47);
      box(g,amber,s*1.236,1.506,-.962,.032,.028,5.47);
      for(const z of [-3.65,1.74])box(g,metal,s*1.215,2.19,z,.065,2.382,.095);
      for(const z of [-3.36,-1.0,1.41])box(g,amber,s*1.247,1.063,z,.034,.068,.15);
      // Mirrored rear doors, locking bars, upper hinges and conspicuity markings.
      box(g,cream,s*.596,2.18,-3.733,1.15,2.23,.047);
      for(const hb of [.30,.89])rod(g,metal,[s*hb,1.12,-3.772],[s*hb,3.23,-3.772],.018);
      box(g,trim,s*.405,1.50,-3.789,.29,.046,.018);
      for(const y of [1.48,2.18,2.91])box(g,darkMetal,s*1.075,y,-3.77,.20,.067,.033);
      box(g,red,s*.95,.79,-3.684,.28,.145,.083);
      box(g,amber,s*1.13,.79,-3.684,.071,.145,.083);
    }
    box(g,metal,0,.47,-3.65,2.24,.12,.14);
    for(let i=0;i<4;i++)box(g,red,(i-1.5)*.56,.47,-3.723,.27,.077,.012);
    box(g,p.cream,0,.788,-3.711,.33,.139,.014);

    // Cab-over silhouette, with a swept-back windshield and separate far door glazing.
    hull(g,paint,2.18,[[1.92,1.23],[1.92,2.62],[2.10,2.77],[3.31,2.77],[3.52,2.51],[3.70,1.67],[3.71,1.22]],.073);
    box(g,paint,0,.997,3.29,2.26,.52,.76);
    const wind=box(g,glass,0,2.18,3.716,2.085,.798,.042);wind.rotation.x=-.211;
    box(g,metal,0,1.732,3.789,2.13,.031,.033);
    for(const x of [-.57,.39]){
      rod(g,trim,[x-.27,1.783,3.816],[x-.05,1.912,3.796],.012);
      rod(g,trim,[x-.245,1.859,3.809],[x+.311,1.944,3.791],.011);
    }
    box(g,trim,0,.681,3.669,2.265,.29,.207);
    box(g,darkMetal,0,1.219,3.783,1.08,.36,.045);
    for(let i=0;i<4;i++)box(g,metal,0,1.088+i*.083,3.812,1.032,.022,.022);
    box(g,p.cream,0,.693,3.778,.37,.151,.024);
    for(const s of [-1,1]){
      box(g,trim,s*.849,1.189,3.774,.553,.217,.073);
      box(g,light,s*.801,1.19,3.815,.409,.170,.032);
      box(g,amber,s*1.062,1.192,3.81,.080,.169,.033);
      hull(g,glass,.026,[[2.088,1.868],[2.09,2.59],[3.22,2.59],[3.45,2.36],[3.47,1.898]],.015).position.x=s*1.156;
      box(g,trim,s*1.177,2.23,2.369,.019,.71,.034);
      box(g,darkMetal,s*1.16,1.70,2.155,.046,.05,.151);
      box(g,trim,s*1.073,1.043,2.19,.22,.14,.52);
      box(g,metal,s*1.054,.78,2.12,.255,.087,.48);
      rod(g,trim,[s*1.12,2.07,3.35],[s*1.34,2.11,3.50],.028);
      rod(g,trim,[s*1.12,2.69,3.35],[s*1.34,2.62,3.50],.027);
      box(g,trim,s*1.342,2.365,3.493,.185,.57,.13);
      box(g,glass,s*1.342,2.365,3.42,.151,.516,.021);
    }
    hull(g,paint,1.69,[[2.03,2.855],[2.10,3.19],[2.32,3.22],[3.1,2.846]],.04);
  }

  function buildModel(T,kind) {
    const model=new T.Group(),p=workshop(T);
    if(kind==='motorcycle')buildBike(p,model);
    else if(kind==='box-truck')buildTruck(p,model);
    else throw new Error('Unknown special vehicle '+kind);
    batch(T,model);
    return model;
  }

  function buildCabin(T,rig,kind) {
    const bike=kind==='motorcycle',p=workshop(T);
    const cabin=p.group(rig,kind+'-interior');
    const {group,box,rod,oval,ring,trim,metal,paint,rubber,darkMetal}=p;
    const mirrorShapes=[];
    let controls,screen;
    if(bike){
      controls=group(cabin,'handlebars',0,0,-.40);
      const front=group(controls,'',0,0,.40);front.rotation.y=Math.PI;
      bikeControls(p,front);
      rod(front,metal,[-.12,.980,.401],[.12,.980,.401],.022);
      rod(front,darkMetal,[0,.805,.36],[0,.980,.401],.032);
      rod(front,darkMetal,[-.099,.964,.404],[0,.934,.328],.021);
      rod(front,darkMetal,[.099,.964,.404],[0,.934,.328],.021);
      oval(cabin,paint,0,.821,-.151,.191,.122,.298);
      oval(cabin,metal,0,.940,-.167,.041,.006,.044);
      const sleeve=p.finish('jacket cuff',0x555e50,.85);
      for(const s of [-1,1]){
        rod(front,sleeve,[s*.365,.936,.098],[s*.311,1.024,.296],.048);
        rod(front,trim,[s*.316,1.007,.265],[s*.303,1.034,.327],.045);
        oval(front,trim,s*.303,1.041,.344,.052,.042,.06);
      }
      screen=group(front,'display',0,1.071,.425);screen.rotation.y=Math.PI;screen.rotation.x=.28;
      box(screen,trim,0,0,-.008,.185,.083,.012);
    }else{
      p.hull(cabin,trim,2.22,[[-3.68,1.86],[-3.63,1.93],[-3.19,1.934],[-2.96,1.89],[-2.94,1.75],[-3.05,1.29],[-3.70,1.22]],.029);
      for(const s of [-1,1]){
        rod(cabin,trim,[s*1.115,1.85,-3.62],[s*1.042,2.80,-3.38],.050);
        box(cabin,darkMetal,s*1.103,1.512,-2.66,.088,.68,1.80);
        box(cabin,trim,s*1.105,1.865,-2.66,.09,.049,1.80);
        box(cabin,metal,s*1.050,1.812,-2.79,.024,.033,.185);
        // The stems and tall housing frame the actual images rendered below.
        rod(cabin,trim,[s*1.10,2.09,-3.32],[s*1.32,2.12,-3.51],.024);
        rod(cabin,trim,[s*1.08,2.67,-3.34],[s*1.32,2.61,-3.51],.024);
        const head=group(cabin,'mirror housing',s*1.32,2.365,-3.502);
        head.rotation.y=-s*.30;
        box(head,trim,0,0,0,.221,.552,.115);
        mirrorShapes.push(head);
      }
      box(cabin,darkMetal,0,2.79,-3.364,2.18,.10,.16);
      p.hull(cabin,trim,.62,[[-3.38,1.923],[-3.28,2.067],[-3.03,2.081],[-2.994,2.055],[-2.994,1.914]],.015).position.x=-.51;
      box(cabin,darkMetal,.18,1.818,-2.948,.38,.12,.035);
      for(let i=0;i<4;i++)box(cabin,trim,.18,1.776+i*.025,-2.923,.335,.010,.014);
      const column=group(cabin,'steering column',-.53,1.785,-2.824);column.rotation.x=-.65;
      controls=group(column,'steering wheel');
      ring(controls,rubber,0,0,0,.223,.023);
      for(const a of [0,Math.PI,1.5*Math.PI]){
        rod(controls,darkMetal,[0,0,0],[Math.cos(a)*.209,Math.sin(a)*.209,0],.022);
      }
      oval(controls,trim,0,0,.013,.08,.061,.023);
      screen=group(cabin,'display',-.51,1.997,-2.969);
    }
    batch(T,cabin);
    const canvas=document.createElement('canvas');canvas.width=bike?256:400;canvas.height=96;
    const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const display=new T.Mesh(new T.PlaneGeometry(bike?.156:.486,bike?.063:.123),
      new T.MeshBasicMaterial({map:texture,toneMapped:false}));
    screen.add(display);
    const mirrors=[],cam=new T.PerspectiveCamera(bike?46:55,bike?1.64:.414,.16,400);
    for(const side of [-1,1]){
      const w=bike?112:80,h=bike?68:192;
      const target=new T.WebGLRenderTarget(w,h,{generateMipmaps:false,minFilter:T.LinearFilter});
      target.texture.repeat.x=-1;target.texture.offset.x=1;
      const face=bike?new T.CircleGeometry(1,32):new T.PlaneGeometry(.184,.445);
      const mirror=new T.Mesh(face,
        new T.MeshBasicMaterial({map:target.texture,toneMapped:false}));
      if(bike){mirror.position.set(side*.416,1.21,-.380+.40);mirror.scale.set(.065,.038,1);controls.add(mirror);}
      else{mirror.position.z=.061;mirrorShapes[side<0?0:1].add(mirror);}
      if(bike)mirror.rotation.y=-side*.19;
      mirrors.push({target,side});
    }
    let lastSpeed=-Infinity,mirrorTime=-Infinity,mirrorIndex=0;
    const origin=new T.Vector3(),rear=new T.Vector3();
    cabin.visible=false;
    return {
      interior:cabin,
      seatView(eye,look,aspect) {
        const back=T.MathUtils.clamp(1-aspect,0,.65);
        if(bike){eye.set(0,1.445,.390+back*.48);look.set(0,.24,-7);}
        else{eye.set(-.52,2.32,-2.03+back*.45);look.set(-.51,1.27,-10);}
      },
      update(inside,speed,steering) {
        cabin.visible=inside;
        if(!inside)return;
        if(bike)controls.rotation.y=-steering*.36;else controls.rotation.z=-steering*1.65;
        const value=Math.round(Math.abs(speed));
        if(value===lastSpeed)return;
        lastSpeed=value;
        ctx.fillStyle=bike?'#b4cba8':'#182125';ctx.fillRect(0,0,canvas.width,96);
        ctx.fillStyle=bike?'#24352d':'#c3e9c7';ctx.textAlign='center';ctx.font='bold 70px monospace';
        ctx.fillText(String(value),bike?103:180,72);ctx.font='21px sans-serif';ctx.fillText('km/h',bike?207:262,68);
        if(!bike){
          for(const center of [48,352]){
            const start=.75*Math.PI,sweep=1.5*Math.PI;
            ctx.strokeStyle='#657571';ctx.lineWidth=4;ctx.beginPath();ctx.arc(center,51,36,start,start+sweep);ctx.stroke();
            for(let i=0;i<7;i++){
              const a=start+i*sweep/6;ctx.beginPath();ctx.moveTo(center+32*Math.cos(a),51+32*Math.sin(a));
              ctx.lineTo(center+36*Math.cos(a),51+36*Math.sin(a));ctx.stroke();
            }
            const angle=start+sweep*(center===48?Math.min(value/120,1):.62);
            ctx.strokeStyle='#efa45e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(center,51);
            ctx.lineTo(center+29*Math.cos(angle),51+29*Math.sin(angle));ctx.stroke();
          }
        }
        texture.needsUpdate=true;
      },
      drawMirrors(renderer,scene,interval,now,exterior) {
        if(!cabin.visible||now-mirrorTime<interval)return false;
        const {target,side}=mirrors[mirrorIndex];
        const x=side*(bike?.416:1.34),y=bike?1.19:2.365,z=bike?-.39:-3.34;
        origin.set(x,y,z);rear.set(x+side*(bike?5.4:3.2),y-.95,z+23);
        rig.localToWorld(origin);rig.localToWorld(rear);
        cam.position.copy(origin);cam.up.set(0,1,0).applyQuaternion(rig.quaternion);cam.lookAt(rear);
        const previous=renderer.getRenderTarget(),outside=exterior?.visible;
        try{
          cabin.visible=false;
          if(!bike&&exterior)exterior.visible=true;
          renderer.setRenderTarget(target);renderer.render(scene,cam);
        }finally{
          renderer.setRenderTarget(previous);cabin.visible=true;
          if(!bike&&exterior)exterior.visible=outside;
        }
        mirrorTime=now;mirrorIndex=1-mirrorIndex;return true;
      }
    };
  }
  return {buildModel,buildCabin};
})();
