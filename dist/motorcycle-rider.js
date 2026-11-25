'use strict';

// Original touring gear. All dimensions are in metres; the grips and rider face +Z.
(() => {
  const tau=Math.PI*2;
  function tailor(p) {
    const {T,finish}=p;
    const textile=finish('jacket graphite',0x343e47,.87);
    const canvas=finish('jacket sandstone',0xbfb297,.83);
    const leather=finish('leather and boot uppers',0x282c30,.62);
    const pants=finish('riding denim',0xffffff,.88);pants.map=denimMap(T);
    const orange=finish('safety orange',0xd35d30,.66);
    const reflector=finish('reflective piping',0xc8cbc3,.40,.22);

    // Shared indexed strips keep the twists at the knees, knuckles and elbows smooth.
    function grid(parent,material,columns,rows,point,closed=false) {
      const pos=[],uv=[],index=[],stride=columns+1;
      for(let j=0;j<=rows;j++)for(let i=0;i<stride;i++){
        const v=point(i/columns,j/rows);
        pos.push(v.x,v.y,v.z);uv.push(i/columns,j/rows);
      }
      for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
        const a=j*stride+i,b=a+1,c=a+stride,d=b+stride;
        index.push(a,b,c,b,d,c);
      }
      const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
      geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
      geo.setIndex(index);geo.computeVertexNormals();
      if(closed){
        const normals=geo.attributes.normal,one=new T.Vector3(),two=new T.Vector3();
        for(let j=0;j<=rows;j++){
          const a=j*stride,b=a+columns;
          one.fromBufferAttribute(normals,a).add(two.fromBufferAttribute(normals,b)).normalize();
          normals.setXYZ(a,one.x,one.y,one.z);normals.setXYZ(b,one.x,one.y,one.z);
        }
      }
      const mesh=new T.Mesh(geo,material);parent.add(mesh);
      return mesh;
    }
    function sample(table,index){
      const k=Math.max(0,Math.min(table.length-1,index));
      const a=Math.min(Math.floor(k),table.length-2),t=k-a;
      return table[a].map((v,i)=>v+(table[a+1][i]-v)*t);
    }
    // Elliptical hoops measured across x, with independent front and rear depths.
    // A power below one flattens the jacket panels and the soles of the boots.
    function shell(parent,material,table,power=1,segments=28,shape=null) {
      const at=(angle,index,pad=0)=>{
        const [x,y,z,width,front,back]=sample(table,index),s=Math.sin(angle),c=Math.cos(angle);
        const v=new T.Vector3(x+Math.sign(s)*(width+pad)*Math.abs(s)**power,y,
          z+Math.sign(c)*((c>=0?front:back)+pad)*Math.abs(c)**power);
        if(shape)shape(v,angle,index);return v;
      };
      grid(parent,material,segments,table.length-1,(u,v)=>at(u*tau,v*(table.length-1)),true);
      return at;
    }
    // Put each section across the local limb axis, including bends in both planes.
    function limb(parent,material,table,segments=18){
      const centres=table.map(([x,y,z])=>new T.Vector3(x,y,z));
      const sections=table.map((row,i)=>{
        const d=centres[Math.min(i+1,table.length-1)].clone().sub(centres[Math.max(i-1,0)]).normalize();
        const across=new T.Vector3(1,0,0).addScaledVector(d,-d.x).normalize();
        return {across,depth:across.clone().cross(d).normalize()};
      });
      const at=(angle,index,pad=0)=>{
        const k=Math.max(0,Math.min(table.length-1,index)),i=Math.min(Math.floor(k),table.length-2);
        const point=j=>centres[j].clone()
          .addScaledVector(sections[j].across,(table[j][3]+pad)*Math.sin(angle))
          .addScaledVector(sections[j].depth,(table[j][4]+pad)*Math.cos(angle));
        return point(i).lerp(point(i+1),k-i);
      };
      grid(parent,material,segments,table.length-1,(u,v)=>at(u*tau,v*(table.length-1)),true);
      return at;
    }
    // Sew a curved panel directly onto a loft; its bounds may vary with the angle.
    function panel(parent,material,at,left,right,bottom,top,pad=.0015,cols=20,rows=4){
      grid(parent,material,cols,rows,(u,v)=>{
        const a=left+(right-left)*u,lo=typeof bottom==='function'?bottom(a):bottom,
          hi=typeof top==='function'?top(a):top;
        return at(a,lo+(hi-lo)*v,pad);
      });
    }
    return {T,textile,canvas,leather,pants,orange,reflector,shell,grid,limb,panel};
  }

  let jacketTexture;
  function jacketMap(T){
    if(jacketTexture)return jacketTexture;
    const cloth=document.createElement('canvas');cloth.width=1024;cloth.height=512;
    const c=cloth.getContext('2d');
    c.fillStyle='#39424a';c.fillRect(0,0,1024,512);
    function patch(path,colour,edge=null,width=2){
      const piece=new Path2D(path);
      if(colour){c.fillStyle=colour;c.fill(piece);}
      if(edge){c.strokeStyle=edge;c.lineWidth=width;c.stroke(piece);}
    }
    function seam(path){
      patch(path,null,'#252d32',4);c.setLineDash([3,3]);
      patch(path,null,'#818383',1);c.setLineDash([]);
    }
    for(const flip of [false,true]){
      c.save();if(flip){c.translate(1024,0);c.scale(-1,1);}
      // Balanced pattern pieces meet along the centre back; only the front has a zip.
      patch('M0 18 L281 -10 Q331 15 365 38 Q418 76 512 73 L512 211 Q442 208 394 194 Q355 182 313 185 L264 202 Q214 193 156 220 L54 242 L0 217 Z','#beaf93');
      patch('M44 21 Q54 71 95 106 Q140 147 213 153 L229 132 Q158 115 132 81 L103 13 Z','#a6977e');
      patch('M281 0 Q300 63 358 93 Q406 121 455 126 L464 113 Q390 98 361 69 L332 0 Z','#807d70');
      patch('M0 85 L24 93 L67 155 L83 254 L70 305 L44 293 L35 184 L0 151 Z','#454b4a');
      patch('M67 252 L178 212 L181 220 L72 259 Z','#d15f36');
      patch('M78 267 L185 226 L188 234 L80 275 Z','#242c30');
      patch('M393 195 Q441 210 512 211 L512 218 Q438 217 391 202 L333 192 L337 188 Z','#d46a39');
      patch('M419 197 Q459 207 508 208 L508 212 Q459 212 418 202 Z','#e2e2cf');
      patch('M253 202 Q290 193 308 203 Q345 227 376 244 Q367 321 327 379 Q293 417 237 423 L227 386 Q262 347 280 290 Q282 247 253 202 Z','#4a555a');
      seam('M370 212 Q367 279 339 335 Q323 377 276 410');
      seam('M245 221 Q214 289 206 363 L200 430');
      patch('M56 333 L173 295 L174 305 L59 344 Z','#222a2e');
      patch('M63 334 L105 321 L106 324 L64 337 Z','#a9aca5');
      patch('M383 357 Q448 338 512 341 L512 405 Q433 406 381 421 Q378 398 383 357 Z','#323b41');
      for(let i=0;i<6;i++)patch('M387 '+(363+8*i)+' Q447 '+(347+8*i)+' 512 '+(348+8*i),null,'#50595e',2);
      patch('M299 432 L363 417 Q404 412 424 413 L416 423 Q366 426 307 445 Z','#232c32');
      c.restore();
    }
    c.fillStyle='#272f35';c.fillRect(0,457,1024,38);
    seam('M0 460 L1024 460');seam('M0 491 L1024 491');
    for(const x of [0,1023]){
      c.fillStyle='#1c252a';c.fillRect(x-8,18,16,441);
      c.setLineDash([2,2]);patch('M'+x+' 27 V455',null,'#989997',3);c.setLineDash([]);
    }
    // Woven textile grain and shallow creases are baked into a single shared map.
    const pixel=c.getImageData(0,0,1024,512),rgba=pixel.data;
    let seed=31;
    for(let y=0;y<512;y++)for(let x=0;x<1024;x++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const weave=(x%3===0?1.7:-.7)+(y%3===0?-1.8:.6);
      const fold=(y>225&&y<450?2.4:1.1)*Math.sin(y*.168+3*Math.cos(x*.014));
      const light=weave+fold+(seed/4294967296-.5)*7,k=(1024*y+x)*4;
      rgba[k]+=light;rgba[k+1]+=light;rgba[k+2]+=light;
    }
    c.putImageData(pixel,0,0);
    jacketTexture=new T.CanvasTexture(cloth);jacketTexture.colorSpace=T.SRGBColorSpace;
    jacketTexture.anisotropy=2;
    return jacketTexture;
  }

  let denimTexture;
  function denimMap(T){
    if(denimTexture)return denimTexture;
    const fabric=document.createElement('canvas');fabric.width=fabric.height=256;
    const c=fabric.getContext('2d'),data=c.createImageData(256,256),rgba=data.data;
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const u=x/256,v=1-y/256;
      const fade=(1-Math.cos(tau*u*2))*.5;
      const bend=Math.exp(-((v-.54)**2)/.008)+.5*Math.exp(-((v-.16)**2)/.007);
      const folds=bend*Math.sin(v*135+4*Math.cos(u*tau)+2*u)*4.8;
      const weave=((x+2*y)%7<3?1.8:-1.9)+((x^y)%3)*.7;
      const n=folds+weave+fade*(3+5*bend),i=(y*256+x)*4;
      rgba[i]=49+n;rgba[i+1]=62+n;rgba[i+2]=76+n;rgba[i+3]=255;
    }
    c.putImageData(data,0,0);
    for(const x of [61,195]){
      const v=new Path2D('M'+x+' 0 q-5 39 3 73 t1 63 q-7 36 -2 65 t2 56');
      c.strokeStyle='#253442';c.lineWidth=3.3;c.stroke(v);
      c.setLineDash([2,2]);c.strokeStyle='#888874';c.lineWidth=.8;c.stroke(v);c.setLineDash([]);
    }
    denimTexture=new T.CanvasTexture(fabric);denimTexture.colorSpace=T.SRGBColorSpace;return denimTexture;
  }

  function helmet(p,g,kit) {
    const {shell,panel,orange,grid}=kit;
    const pearl=p.finish('helmet pearl ceramic',0xe7e6df,.29,.22);
    const visor=p.finish('smoked visor',0xffffff,.16,.36);
    const glaze=new Uint8Array([
      30,42,54,255,36,50,62,255,43,59,72,255,63,81,90,255,
      79,98,105,255,73,91,100,255,60,75,90,255,43,54,68,255
    ]);
    const tint=new kit.T.DataTexture(glaze,1,8);
    tint.colorSpace=kit.T.SRGBColorSpace;tint.magFilter=kit.T.LinearFilter;tint.minFilter=kit.T.LinearFilter;
    tint.needsUpdate=true;visor.map=tint;
    const seal=p.trim;
    const head=p.group(g,'rider_helmet',0,1.372,-.056);
    const shape=(v,a,i)=>{
      // The chin guard drops at the front and sweeps upward by the strap.
      v.y+=Math.max(0,1-i/3)*(.024-.026*Math.cos(a));
      v.z-=.008*Math.max(0,i-5)/5;
    };
    const surface=shell(head,pearl,[
      [0,-.003,.012,.088,.122,.097],[0,.008,.012,.113,.161,.121],
      [0,.034,.008,.129,.171,.139],[0,.075,.004,.140,.167,.149],
      [0,.111,0,.144,.161,.152],[0,.159,0,.143,.151,.157],
      [0,.191,0,.140,.144,.155],[0,.216,0,.132,.135,.148],
      [0,.241,0,.115,.121,.130],[0,.262,0,.095,.099,.110],
      [0,.279,0,.061,.066,.075],[0,.286,0,.028,.031,.034],[0,.287,0,.001,.001,.001]
    ],.96,48,shape);
    panel(head,seal,surface,0,tau,.01,.34,.0017,48,2);
    shell(head,seal,[[0,.014,.012,.077,.068,.078],[0,.021,.015,.109,.140,.102],
      [0,.031,.012,.111,.147,.109]],.95,36);
    const lower=a=>3.13+.92*(1-Math.cos(a)),upper=a=>6.56-.93*(1-Math.cos(a));
    panel(head,seal,surface,-1.66,1.66,a=>lower(a)-.12,a=>upper(a)+.14,.002,36,8);
    panel(head,visor,surface,-1.61,1.61,lower,upper,.0045,36,8);
    for(const s of [-1,1]){
      const at=surface(s*1.55,4.70,.004);
      const fastener=p.oval(head,seal,at.x,at.y,at.z,.006,.021,.021);
      fastener.rotation.z=s*.06;
      p.oval(head,p.metal,at.x+s*.005,at.y,at.z,.004,.009,.009);
      // Pinstripes taper into the brow and frame the rear air extractors.
      const centre=v=>s*(1.87+.75*Math.sin(v*1.28)-.32*v);
      grid(head,orange,6,18,(u,v)=>surface(centre(v)+(u-.5)*(.025+.39*Math.sin(Math.PI*v)),2.1+7.7*v,.0024));
      grid(head,seal,4,18,(u,v)=>surface(centre(v)+s*.18+(u-.5)*(.01+.12*Math.sin(Math.PI*v)),2.9+7.3*v,.0032));
      const vent=s<0?3.38:2.49;
      panel(head,seal,surface,vent,vent+.40,5.65,6.08,.0027,8,2);
      const brow=s<0?-.59:.28;
      panel(head,seal,surface,brow,brow+.30,7.54,7.78,.0028,8,2);
    }
    panel(head,seal,surface,-.34,.34,a=>1.68+1.08*Math.abs(a),a=>2.53+.24*Math.abs(a),.0031,14,3);
    panel(head,pearl,surface,-.29,.29,a=>2.06+.71*Math.abs(a),a=>2.15+.71*Math.abs(a),.0048,14,2);
    // Low rear spoiler shelters the two exhaust vents. The lip tapers into the shell.
    grid(head,pearl,30,6,(u,v)=>{
      const taper=Math.sin(u*Math.PI),a=2.16+u*1.96;
      const lip=.018*taper*(1-v)*(1-v);
      return surface(a,6.09+v*.90-.36*taper,.0012+lip);
    });
    return head;
  }

  function glove(p,g,kit,side){
    const {limb,leather,panel}=kit,s=side;
    const palm=limb(g,leather,[
      [s*.295,1.049,.271,.036,.033],[s*.301,1.047,.295,.042,.035],
      [s*.303,1.046,.319,.047,.031],[s*.305,1.053,.342,.047,.029],
      [s*.305,1.053,.359,.044,.024],[s*.306,1.047,.367,.036,.018]
    ],16);
    // Four padded fingers curl around the crosswise rubber grip.
    for(let i=0;i<4;i++){
      const x=s*(.273+i*.021),z=.368-.006*Math.abs(i-1.3),r=.0096-i*.0005;
      limb(g,leather,[[x,1.057,z-.017,r,r],[x,1.057,z+.002,r,r],
        [x,1.047,z+.014,r,r],[x,1.032,z+.015,r,r*.92],[x,1.022,z+.004,r*.86,r*.9],
        [x,1.022,z-.005,.002,.002]],8);
      p.oval(g,p.trim,x,1.075-i*.001,z-.022,.009,.006,.012);
    }
    limb(g,leather,[[s*.275,1.044,.313,.014,.014],[s*.264,1.035,.327,.013,.013],
      [s*.262,1.024,.343,.012,.011],[s*.272,1.021,.351,.003,.004]],10);
    panel(g,p.trim,palm,0,tau,.16,1.19,.002,16,2);
  }

  function sleeve(p,g,kit,s,cockpit) {
    const {limb,panel,canvas,textile,reflector,orange,leather}=kit;
    const forearm=[
      [s*.268,1.087,.094,.061,.065],[s*.272,1.074,.131,.057,.058],
      [s*.277,1.062,.172,.055,.053],[s*.285,1.050,.215,.047,.046],
      [s*.291,1.047,.247,.042,.041],[s*.295,1.049,.278,.041,.039],
      [s*.297,1.049,.289,.036,.034]
    ].map(([x,y,z,w,d])=>{
      // Bend at the elbow, bringing the wrists onto the donor bike's swept grips.
      const f=Math.min(1,Math.max(0,(z-.094)/.177));
      return [x+s*.011*f,y+.025*f,z-.056*f,w,d];
    });
    const shoulder=[
      [s*.144,1.273,-.122,.065,.068],[s*.176,1.266,-.101,.080,.085],
      [s*.192,1.239,-.077,.081,.085],[s*.212,1.200,-.047,.072,.075],
      [s*.232,1.158,-.012,.065,.066],[s*.250,1.115,.031,.062,.064],
      [s*.263,1.091,.061,.063,.066]
    ];
    // In the cockpit the sleeves continue towards the chest below the eye.
    // Close them behind the elbows for a look over either shoulder.
    const upper=cockpit?[
      [s*.23,.91,-.40,.002,.002],[s*.25,.91,-.37,.080,.079],
      [s*.29,.963,-.24,.077,.076],[s*.316,1.006,-.114,.069,.068],
      [s*.311,1.043,-.043,.066,.067],[s*.292,1.076,.031,.064,.067]
    ]:shoulder;
    const surface=limb(g,textile,upper.concat(forearm));
    const outer=s>0?Math.PI*.5:Math.PI*1.5;
    const start=upper.length;
    if(cockpit){
      // The swept forearm is the nearest visible part when viewed over the tank.
      panel(g,canvas,surface,Math.PI-.99,Math.PI+.99,2.15,5.8,.0028,22,12);
      panel(g,orange,surface,Math.PI-.95,Math.PI+.95,4.33,4.53,.0035,20,2);
    }else{
      panel(g,canvas,surface,outer-1.32,outer+1.32,1.0,a=>4.8+.36*Math.cos(a-outer),.0019);
      panel(g,orange,surface,outer-1.28,outer+1.28,3.49,3.75,.0028);
      panel(g,reflector,surface,outer-1.28,outer+1.28,3.78,3.90,.003);
    }
    panel(g,canvas,surface,outer-.77,outer+.77,start+.75,start+3.9,.0019);
    const crown=Math.PI+s*.18;
    panel(g,leather,surface,crown-.62,crown+.62,start+.35,start+3.8,.0028,14,10);
    panel(g,reflector,surface,crown-.58,crown-.46,start+.75,start+3.2,.0037,4,10);
    panel(g,leather,surface,0,tau,start+4.65,start+5.65,.0018,20,2);
    panel(g,textile,surface,crown-.87,crown+.87,start+4.74,start+5.39,.0034,16,4);
    const hand=p.group(g,'',s*.011,.025,-.056);
    glove(p,hand,kit,s);
    // Flatten this placement so the two gloves batch with both sleeves by material.
    for(const piece of hand.children.slice()){piece.position.add(hand.position);g.add(piece);}
    hand.removeFromParent();
  }

  function leg(p,g,kit,s) {
    const {pants,shell,limb,panel,textile,leather}=kit;
    const surface=limb(g,pants,[
      [s*.091,.899,-.293,.088,.095],[s*.119,.875,-.245,.097,.105],
      [s*.140,.835,-.179,.095,.105],[s*.161,.780,-.098,.090,.100],
      [s*.181,.714,-.022,.083,.090],[s*.191,.656,.051,.077,.083],
      [s*.194,.627,.079,.077,.079],[s*.195,.593,.080,.074,.075],
      [s*.193,.562,.039,.067,.071],[s*.191,.527,-.024,.065,.071],
      [s*.190,.492,-.101,.060,.064],[s*.190,.460,-.167,.051,.051],
      [s*.190,.422,-.226,.050,.050]
    ],20);
    const out=s>0?1.40:tau-1.40;
    panel(g,textile,surface,out-.96,out+.96,4.85,8.37,.0021,15,8);
    for(const h of [5.31,5.72,6.13])panel(g,pants,surface,out-.80,out+.80,h,h+.087,.0033,12,2);
    const x=s*.190,foot=p.group(g,'',0,.003,-.18);
    const boot=shell(foot,leather,[
      [x,.328,-.036,.050,.151,.085],[x,.336,-.035,.056,.155,.089],
      [x,.350,-.035,.059,.154,.088],[x,.367,-.039,.058,.151,.084],
      [x,.386,-.043,.054,.132,.079],[x,.399,-.052,.053,.100,.073],
      [x,.411,-.064,.050,.066,.063],[x,.438,-.058,.055,.058,.061],
      [x,.457,-.049,.053,.058,.061],[x,.463,-.047,.049,.054,.057]
    ],.72,24);
    panel(foot,p.trim,boot,0,tau,.16,1.66,.0025,24,3);
    panel(foot,textile,boot,out-1.0,out+1.0,6.2,8.45,.0021,15,3);
    p.oval(foot,p.trim,x+s*.048,.404,-.070,.010,.026,.029);
  }

  window.buildMotorcycleRider=function(p,root){
    const kit=tailor(p),{shell,textile,pants}=kit;
    shell(root,pants,[[0,.821,-.27,.087,.089,.096],[0,.836,-.272,.155,.133,.139],
      [0,.861,-.265,.170,.143,.154],[0,.903,-.247,.163,.148,.150],
      [0,.933,-.237,.145,.123,.120]],.86);
    const outer=p.finish('touring jacket',0xffffff,.86);
    outer.map=jacketMap(p.T);
    shell(root,outer,[
      [0,.871,-.249,.145,.128,.151],[0,.882,-.249,.162,.138,.162],
      [0,.901,-.243,.165,.141,.157],[0,.942,-.230,.153,.141,.151],
      [0,.987,-.216,.155,.140,.152],[0,1.041,-.195,.165,.141,.152],
      [0,1.098,-.175,.180,.141,.145],[0,1.162,-.154,.191,.143,.136],
      [0,1.216,-.137,.197,.141,.128],[0,1.255,-.129,.194,.133,.119],
      [0,1.277,-.121,.178,.123,.106],[0,1.299,-.110,.141,.104,.094],
      [0,1.318,-.104,.091,.074,.081],[0,1.321,-.103,.072,.062,.070]
    ],.86,36);
    const arms=p.group(root,'rider_arms');
    for(const s of [-1,1]){
      leg(p,root,kit,s);sleeve(p,arms,kit,s,false);
    }
    shell(root,p.trim,[[0,1.288,-.104,.096,.095,.087],[0,1.309,-.1,.099,.089,.088],
      [0,1.348,-.090,.091,.087,.090],[0,1.361,-.088,.081,.079,.081]],.9,24);
    shell(root,textile,[[0,1.319,-.096,.071,.065,.069],[0,1.365,-.082,.069,.064,.070],
      [0,1.413,-.066,.071,.066,.071]],1,20);
    return helmet(p,root,kit);
  };
  window.buildMotorcycleGloves=function(p,front){
    const kit=tailor(p);
    for(const s of [-1,1])sleeve(p,front,kit,s,true);
  };

  // Wheels and handlebars rotate as rigid parts. Blending that same rotation from
  // the upper arm to the wrist lets the rider keep a grip without pulling the coat.
  const steeringData=new WeakMap();
  window.steerMotorcycleRider=function(model,angle,pivotX,pivotZ){
    let state=steeringData.get(model);
    if(!state){
      const arms=model.getObjectByName('rider_arms');
      if(!arms)return;
      const parts=[];
      arms.traverse(mesh=>{
        if(!mesh.isMesh)return;
        // Cloned garage models share buffers until their first steering adjustment.
        const geo=mesh.geometry=mesh.geometry.clone();
        const position=geo.attributes.position,normal=geo.attributes.normal;
        const weights=new Float32Array(position.count);
        for(let i=0;i<weights.length;i++){
          const t=Math.max(0,Math.min(1,(position.getZ(i)+.09)/.305));
          weights[i]=t*t*(3-2*t);
        }
        geo.computeBoundingSphere();geo.boundingSphere.radius+=.22;
        parts.push({position,normal,bindPos:position.array.slice(),bindNormal:normal.array.slice(),weights});
      });
      state={parts,angle:0};steeringData.set(model,state);
    }
    if(Math.abs(angle-state.angle)<.001)return;
    state.angle=angle;
    const c=Math.cos(angle)-1,s=Math.sin(angle);
    for(const part of state.parts){
      const {position,normal,bindPos,bindNormal,weights}=part;
      for(let i=0;i<weights.length;i++){
        const k=3*i,x=bindPos[k]-pivotX,z=bindPos[k+2]-pivotZ,nx=bindNormal[k],nz=bindNormal[k+2],w=weights[i];
        position.array[k]=bindPos[k]+w*(x*c+z*s);
        position.array[k+2]=bindPos[k+2]+w*(z*c-x*s);
        normal.array[k]=nx+w*(nx*c+nz*s);
        normal.array[k+2]=nz+w*(nz*c-nx*s);
      }
      position.needsUpdate=true;normal.needsUpdate=true;
    }
  };
})();

// Everyday traffic scooters face +Z; their rider's left side is +X. The six
// rigid joints and two shared PBR finishes stay on the vehicle across body LODs.
(() => {
  const palettes=[
    [0x466b73,0x32404b,0xe8e2ce,0xc59373,0x405e79], [0x92906a,0x384451,0x58413b,0xb87e5d,0x5c7057],
    [0xad6251,0x343b42,0xe1d5b6,0xcb9774,0xbc9654], [0x43536a,0x55534a,0x4b6670,0xbe8d68,0x4e687c],
    [0xc3bba5,0x445063,0x854f43,0xa97759,0x566b60], [0x667963,0x474856,0xdfd9c2,0xd0a180,0x4e6688],
    [0x827582,0x38434a,0x3c555d,0xbd896b,0x99784c], [0x73829a,0x454944,0xddd6ce,0xc59676,0x476e69]
  ];
  const sole=0x2c3031,strap=0x353637;
  const thighLength=.384,shinLength=.356;
  const cache=new WeakMap();

  // Build all closed surfaces into one indexed skin, with colour in linear
  // space. The coat morph uses the same shoulder, wrist and seat attachment
  // points in both poses; it can open around the legs without adding a layer.
  function pattern(T,style,detailed){
    const pos=[],wet=[],col=[],wetCol=[],joints=[],weights=[],tri=[[],[]];
    const cloth=0,gloss=1,up=new T.Vector3(0,1,0);
    const passenger=style===2||style===6;
    function vertex(p,w,c,rc,b){
      pos.push(p.x,p.y,p.z);wet.push(w.x-p.x,w.y-p.y,w.z-p.z);
      col.push(c.r,c.g,c.b);wetCol.push(rc.r-c.r,rc.g-c.g,rc.b-c.b);
      joints.push(b,0,0,0);weights.push(1,0,0,0);
    }
    function rings(b,m,c,rows,N=12,options={}){
      const first=pos.length/3,colour=new T.Color(c),rainColour=new T.Color(options.rainColour??c);
      const levels=detailed?rows.map((_,i)=>i):[...new Set([0,Math.floor((rows.length-1)*.5),rows.length-1])];
      if(!detailed)N=6;
      const at=(row,t)=>{
        const [x,y,z,rx,rz]=row;
        return new T.Vector3(x+rx*Math.sin(t),y,z+rz*Math.cos(t));
      };
      for(const i of levels)for(let j=0;j<N;j++){
        const a=j*2*Math.PI/N,point=at(rows[i],a),rain=at(options.rain?.[i]??rows[i],a);
        options.shape?.(point,i,a);options.shape?.(rain,i,a);
        options.transform?.(point);options.transform?.(rain);
        const shade=options.weave?.(i,a)??1;
        vertex(point,rain,colour.clone().multiplyScalar(shade),rainColour.clone().multiplyScalar(shade),b);
      }
      for(let i=1;i<levels.length;i++)for(let j=0;j<N;j++){
        const a=first+(i-1)*N+j,b=first+(i-1)*N+(j+1)%N;
        tri[m].push(a,b,a+N,b,b+N,a+N);
      }
      for(let j=1;j<N-1;j++){
        const last=first+(levels.length-1)*N;
        tri[m].push(first,first+j+1,first+j,last,last+j,last+j+1);
      }
    }
    function oval(b,m,c,x,y,z,rx,ry,rz,N=12){
      if(!detailed&&Math.max(rx,ry,rz)<.065)return;
      const rows=[],steps=N<=10?4:6;
      for(let i=0;i<=steps;i++){
        const a=Math.PI*i/steps-Math.PI/2,r=Math.max(.02,Math.cos(a));
        rows.push([x,y+ry*Math.sin(a),z,rx*r,rz*r]);
      }
      rings(b,m,c,rows,N);
    }
    function segment(b,c,a,end,ra,rb,wetColour=c){
      if(!detailed&&ra<.02)return;
      const start=new T.Vector3(...a),d=new T.Vector3(...end).sub(start),length=d.length();
      const rot=new T.Quaternion().setFromUnitVectors(up,d.normalize());
      const radius=t=>ra+(rb-ra)*t;
      const profile=ra<.02?[[0,1],[1,1]]:[[-.026,.72],[.07,1],[.46,1],[.76,.95],[.815,1.02],[.94,.98],[1.025,.90]];
      rings(b,cloth,c,profile.map(([t,k])=>[0,t*length,0,radius(t)*k,radius(t)*k*.94]),ra<.02?6:10,
        {transform:p=>p.applyQuaternion(rot).add(start),rainColour:wetColour,
          weave:(i,a)=>1-.065*(i===4||i===6?1:0)-.05*Math.abs(Math.sin(a))**12});
    }
    function shoe(b,x,y,z){
      rings(b,cloth,sole,[[x,y-.075,z+.05,.056,.142],[x,y-.060,z+.05,.06,.145],
        [x,y-.055,z+.05,.061,.145]],12);
      rings(b,cloth,0x454947,[[x,y-.054,z+.05,.060,.143],[x,y-.035,z+.048,.060,.142],
        [x,y-.019,z+.033,.057,.122],[x,y+.005,z+.011,.052,.094],[x,y+.034,z-.012,.044,.053]],12);
    }
    function person(extra){
      const colors=palettes[(style+(extra?3:0))%palettes.length];
      const [jacket,denim,helmet,skin,rain]=colors,z=extra?-.46:-.085,y=extra?.026:0,id=extra?5:1;
      const bodyRows=[[.78,.00,.153,.118],[.84,.00,.168,.13],[.95,.014,.157,.115],
        [1.11,.027,.181,.140],[1.235,.04,.201,.117],[1.284,.044,.123,.085],[1.30,.042,.073,.073]];
      const dry=bodyRows.map(([h,d,w,l])=>[0,h+y,z+d,w,l]);
      const cape=dry.map(row=>row.slice());
      cape[0]=[0,.698+y,z+.057,.228,extra?.194:.252];cape[1]=[0,.815+y,z+.04,.205,.195];
      cape[2][3]=.188;cape[3][3]=.199;cape[4][3]=.222;
      rings(0,cloth,jacket,dry,18,{rain:cape,rainColour:rain,
        weave:(row,a)=>.94+.06*Math.cos(2*a)-.06*(row===1||row===5?1:0)});
      // A stitched front placket, drawn on the dry jacket and the rain shell.
      const placket=rows=>rows.slice(1).map(([x,h,d,w,l])=>[x,h,d+l-.002,.005,.004]);
      if(detailed)rings(0,cloth,0x4b5051,placket(dry),6,{rain:placket(cape),rainColour:0x68777a});
      oval(0,cloth,denim,0,.790+y,z-.006,.153,.093,.15);
      oval(0,cloth,skin,0,1.313+y,z+.043,.059,.082,.062);
      rings(0,cloth,jacket,[[0,1.275+y,z+.04,.09,.08],[0,1.305+y,z+.04,.074,.072]],12,{rainColour:rain});
      // Face and helmet are in a head-local frame whose origin is the neck.
      rings(id,cloth,skin,[[0,-.004,.010,.041,.048],[0,.022,.016,.071,.075],
        [0,.072,.010,.091,.087],[0,.126,.001,.094,.094],[0,.181,-.005,.082,.084]],16);
      oval(id,cloth,skin,0,.095,.091,.014,.025,.020,10);
      oval(id,cloth,skin,0,.080,.10,.017,.009,.012,10);
      oval(id,cloth,0x945e50,0,.048,.092,.023,.003,.005,10);
      for(const side of [-1,1]){
        oval(id,cloth,skin,side*.091,.094,-.006,.014,.029,.017,8);
        oval(id,cloth,0x513c34,side*.038,.125,.091,.018,.004,.005,8);
        oval(id,cloth,strap,side*.037,.111,.094,.013,.003,.005,8);
        segment(id,strap,[side*.087,.087,-.018],[side*.066,.006,.039],.008,.007);
      }
      // The brow sits above the eyes, with a deeper shell over the nape.
      const rim=(p,i,a)=>{p.y-=Math.max(0,1-i/3)*.044*(1-Math.cos(a));};
      rings(id,gloss,strap,[[0,.139,-.006,.105,.109],[0,.149,-.006,.111,.116],
        [0,.162,-.006,.111,.116]],18,{shape:rim});
      const shellColor=extra?palettes[(style+2)%8][2]:helmet;
      rings(id,gloss,shellColor,[[0,.149,-.006,.112,.117],[0,.173,-.005,.115,.12],
        [0,.195,-.006,.107,.114],[0,.225,-.008,.089,.093],[0,.247,-.009,.057,.063],
        [0,.256,-.01,.016,.019]],18,{shape:rim});
      oval(id,gloss,shellColor,0,.15,.083,.096,.007,.069);
      for(const side of [-1,1])oval(id,gloss,0x686b68,side*.108,.135,-.005,.004,.011,.011,8);
      for(const side of [-1,1]){
        const shoulder=[side*.161,1.228+y,z+.028],
          elbow=[side*(extra?.184:.222),1.032+y,z+(extra?.035:.119)],
          hand=extra?[side*.142,.984,-.17]:[side*.285,1.084,.204];
        segment(0,jacket,shoulder,elbow,.077,.055,rain);
        segment(0,jacket,elbow,hand,.058,.036,rain);
        oval(0,cloth,skin,...hand,.044,.030,.046,10);
        oval(0,cloth,skin,hand[0]-side*.027,hand[1]-.009,hand[2]+.013,.018,.018,.031,8);
        const hip=[side*.109,.77+y,z-.012],knee=[side*(extra?.213:.177),.56+y,z+(extra?.205:.302)],
          ankle=[side*(extra?.219:.181),extra?.327:.243,z+(extra?.103:.183)];
        if(extra||side<0){
          segment(0,denim,hip,knee,.105,.073);oval(0,cloth,denim,...knee,.073,.073,.077);
          segment(0,denim,knee,ankle,.075,.047);shoe(0,...ankle);
        }else{
          segment(2,denim,[0,0,0],[0,thighLength,0],.104,.073);
          oval(3,cloth,denim,0,0,0,.073,.073,.077);
          segment(3,denim,[0,0,0],[0,shinLength,0],.075,.047);shoe(4,0,0,0);
        }
      }
    }
    person(false);if(passenger)person(true);
    const geometry=new T.BufferGeometry(),attribute=(arr,n)=>new T.Float32BufferAttribute(arr,n);
    geometry.setAttribute('position',attribute(pos,3));geometry.setAttribute('color',attribute(col,3));
    geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(joints,4));geometry.setAttribute('skinWeight',attribute(weights,4));
    geometry.setIndex(tri[0].concat(tri[1]));geometry.addGroup(0,tri[0].length,0);geometry.addGroup(tri[0].length,tri[1].length,1);
    geometry.computeVertexNormals();
    geometry.morphTargetsRelative=true;geometry.morphAttributes.position=[attribute(wet,3)];geometry.morphAttributes.color=[attribute(wetCol,3)];
    const draped=new T.BufferGeometry();draped.setIndex(geometry.index);
    draped.setAttribute('position',attribute(pos.map((value,i)=>value+wet[i]),3));draped.computeVertexNormals();
    const wetNormals=draped.attributes.normal.array,dryNormals=geometry.attributes.normal.array;
    geometry.morphAttributes.normal=[attribute(wetNormals.map((value,i)=>value-dryNormals[i]),3)];
    return geometry;
  }

  window.createTrafficScooterRider=function(T,parent){
    if(!cache.has(T))cache.set(T,{patterns:new Map(),materials:[
      new T.MeshStandardMaterial({vertexColors:true,roughness:.83}),
      new T.MeshStandardMaterial({vertexColors:true,roughness:.31,metalness:.09})]});
    const {patterns,materials}=cache.get(T);
    function outfit(style,detailed){
      const key=style+(detailed?8:0);
      if(!patterns.has(key))patterns.set(key,pattern(T,style,detailed));
      return patterns.get(key);
    }
    const mesh=new T.SkinnedMesh(outfit(0,false),materials[0]);mesh.name='traffic-scooter-rider';
    mesh.castShadow=true;mesh.receiveShadow=true;
    const bones=['body','driver head','left thigh','left shin','left shoe','passenger head'].map(name=>{
      const bone=new T.Bone();bone.name=name;mesh.add(bone);return bone;
    });
    // Bind in scooter-local space before attachment, including when a pooled
    // traffic root has already moved, rotated or been tilted onto a grade.
    mesh.bind(new T.Skeleton(bones));parent.add(mesh);
    mesh.boundingSphere=new T.Sphere(new T.Vector3(0,.815,-.12),1.06);
    bones[1].position.set(0,1.326,-.046);bones[5].position.set(0,1.352,-.421);
    const up=new T.Vector3(0,1,0),hip=new T.Vector3(.109,.77,-.097),ankle=new T.Vector3(),
      axis=new T.Vector3(),towardFront=new T.Vector3(),knee=new T.Vector3(),dir=new T.Vector3();
    let occupant,plant=0,look=0,coat=0,lastPlant=-1,detail;
    function placeFoot(amount){
      if(Math.abs(lastPlant-amount)<.0002)return;
      lastPlant=amount;
      const s=amount*amount*(3-2*amount);
      ankle.set(.181+.115*s+.038*Math.sin(Math.PI*s),.243-.179*s,.098-.193*s);
      // Solve the two measured lengths analytically. The knee keeps pointing
      // forward while the boot swings out around the scooter footboard.
      axis.subVectors(ankle,hip);const length=axis.length();axis.divideScalar(length);
      towardFront.set(.21,0,1).addScaledVector(axis,-(.21*axis.x+axis.z)).normalize();
      const along=(thighLength**2-shinLength**2+length**2)/(2*length);
      knee.copy(hip).addScaledVector(axis,along).addScaledVector(towardFront,Math.sqrt(Math.max(0,thighLength**2-along**2)));
      bones[2].position.copy(hip);bones[2].quaternion.setFromUnitVectors(up,dir.subVectors(knee,hip).normalize());
      bones[3].position.copy(knee);bones[3].quaternion.setFromUnitVectors(up,dir.subVectors(ankle,knee).normalize());
      bones[4].position.copy(ankle);bones[4].rotation.set(-.065*(1-s),.14*s,0);
    }
    function update(car,dt,context={}){
      const speed=Math.abs(car.speed||0),standing=1-T.MathUtils.smoothstep(speed,.12,1.35);
      const desired=car.recoil?.fallen||car.flood?0:standing;
      const gaze=T.MathUtils.clamp(context.look??car.steer??0,-1,1);
      const wet=T.MathUtils.smoothstep(Number(context.rain)||0,.04,.42);
      const requestedDetail=context.detail!==false;
      if(occupant!==car.id||lastPlant<0){
        const seed=typeof car.id==='number'?car.id:Array.from(String(car.id??'')).reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0)|0,0);
        const style=((seed%8)+8)%8;occupant=car.id;detail=undefined;
        mesh.userData.passenger=style===2||style===6;mesh.userData.style=style;
        plant=desired;look=gaze;coat=wet;lastPlant=-1;
      }else{
        const time=Math.max(0,Math.min(dt||0,.25));
        plant+=(desired-plant)*(1-Math.exp(-time*(desired>plant?6:8)));
        look+=(gaze-look)*(1-Math.exp(-time*5));
        coat+=(wet-coat)*(1-Math.exp(-time*1.35));
      }
      if(detail!==requestedDetail){
        detail=requestedDetail;
        mesh.geometry=outfit(mesh.userData.style,detail);mesh.material=detail?materials:materials[0];
      }
      placeFoot(plant);bones[1].rotation.y=-look*.58;bones[5].rotation.y=-look*.23;
      mesh.morphTargetInfluences[0]=coat;
    }
    return {mesh,update};
  };
})();
