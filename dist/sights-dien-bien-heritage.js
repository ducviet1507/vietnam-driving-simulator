'use strict';
(() => {
  const sites=window.VietnamSights??=[];
  const granite=0x797b77,slate=0x545c59,cream=0xd8ccae,sand=0xb3a38c,rose=0xa56e59;
  const bronze=0xa47f50,patina=0x876746,bronzeLight=0xb39360,leaf=0x566c40;
  const peakYaw=-1.67,stairYaw=-1.62,cemeteryYaw=-1.65;
  const provincial='https://dienbien.gov.vn/vi/bai-viet/VPUB--Mot-so-cong-trinh-van-hoa-nghe-thuat-noi-batvgrnzj';
  const statuePhotos='https://nvsk.vnanet.vn/print/photo-nhung-dia-chi-do-khong-the-bo-qua-khi-toi-manh-dat-dien-bien-anh-hung--145629.vna';
  function local(yaw,x,z){return [x*Math.cos(yaw)+z*Math.sin(yaw),z*Math.cos(yaw)-x*Math.sin(yaw)];}
  function view(name,height,viewRadius,viewAngle,viewElevation,offset=[0,0],viewFov=55){
    return {name,height,viewRadius,viewAngle,viewElevation,offset,viewFov};
  }
  function add(id,node,name,lon,lat,start,yaw,width,depth,details,build){
    sites.push({id,name,catalogId:'osm-node-'+node,lon,lat,start,yaw,width,depth,city:'Điện Biên Phủ',province:'Điện Biên',
      region:'Bắc Bộ',kind:'Di tích',visitOnArrival:true,map:'https://www.openstreetmap.org/node/'+node,...details,build});
  }
  function finishes(k){k.palette({stone:[granite,slate,cream,sand,rose,0x8d857c,0x555653,0xa6a29a,0xa7816e,0xbc9581],
    metal:[bronze,patina,bronzeLight,0xb49055]});}
  function star(k,x,y,z,r,color,depth){
    const p=[];for(let i=0;i<10;i++){const a=i*Math.PI/5,v=r*(i%2?.403:1);p.push([Math.sin(a)*v,Math.cos(a)*v]);}
    k.outline(p,color,x,y,z,depth);
  }
  function hat(T,k,x,y,z,rad,color){
    // The sculpted field hat has a broad, sloping brim above the brow.
    const geom=new T.SphereGeometry(1,18,7,0,Math.PI*2,0,Math.PI/2);
    k.stamp(geom,color,x,y,z,rad,rad*.58,rad*1.06);geom.dispose();
    k.tapered(color,x,y,z,rad*1.22,rad,.09,1.09,20);
  }
  function bronzeFlag(T,k){
    // A single heavy sheet sweeps from the tall staff down behind the child.
    // The folds are sculptural. Its lower edge lifts clear of the bearer.
    const v=[],ix=[],cols=24,rows=7;
    function sheet(u,t){
      const bottom=10.64+.43*Math.cos(2*Math.PI*u+.55)+1.32*u,top=11.93+3.64*u**1.38+.62*u**4;
      const fold=.46*Math.abs(Math.sin(2.57*Math.PI*u-2.16*t))-.23+.28*Math.abs(Math.sin(4.57*u+3.7*t));
      return [-2.84+u*5.45,bottom+(top-bottom)*t,.32+.69*Math.sin(Math.PI*u)*Math.sin(1.22*Math.PI*(t+.24*u))+fold];
    }
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      v.push(...sheet(i/cols,j/rows));
      if(i<cols&&j<rows){const a=j*(cols+1)+i,b=a+cols+1;ix.push(a,a+1,b,b,a+1,b+1);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();
    k.stamp(g,bronze,0,0,0);
    for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];
    g.setIndex(ix);g.computeVertexNormals();k.stamp(g,patina,0,0,-.075);g.dispose();
    CentralArch.strut(T,k,bronzeLight,2.59,8.45,.44,2.59,16.2,.44,.108);
    // The raised words follow the lower ribbon of the cast flag.
    const cv=document.createElement('canvas');cv.width=1024;cv.height=96;
    const c=cv.getContext('2d');c.fillStyle='#dbbb7d';c.textAlign='center';c.textBaseline='middle';
    c.font='bold 61px Georgia';c.fillText('QUYẾT CHIẾN QUYẾT THẮNG',512,47,980);
    const text=[],uv=[],tri=[];
    for(let i=0;i<=cols;i++){
      const u=i/cols;
      for(const y of [0,1]){
        const p=sheet(.14+.77*u,.08+y*.16);p[2]+=.115;text.push(...p);uv.push(u,y);
      }
      if(i<cols){const a=2*i;tri.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    const label=new T.BufferGeometry();label.setAttribute('position',new T.Float32BufferAttribute(text,3));
    label.setAttribute('uv',new T.Float32BufferAttribute(uv,2));label.setIndex(tri);label.computeVertexNormals();
    const texture=new T.CanvasTexture(cv);texture.colorSpace=T.SRGBColorSpace;
    k.group.add(new T.Mesh(label,new T.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.16,depthWrite:false,roughness:.62,side:T.DoubleSide})));
  }
  function bearer(T,k,tint,x,y,z,h,pose){
    // Spread the stance below the hips and turn the carved face upward.
    // Transform the statue's own local sections before its surveyed pose.
    const sculpt={stamp(g,...args){
      const p=g.attributes.position;
      for(let i=0;i<p.count;i++){
        const u=p.getX(i),v=p.getY(i),w=p.getZ(i),leg=Math.max(0,1-v/.47);
        let a=u*(1.14+leg*1.55),b=v,c=w*1.08;
        if(v>.838&&Math.abs(u)<.071&&Math.abs(w)<.10){
          const angle=.41,dy=v-.843;
          b=.843+dy*Math.cos(angle)+w*Math.sin(angle);
          c=w*Math.cos(angle)-dy*Math.sin(angle);
        }
        const lean=(pose.lean||0)*Math.min(1,Math.max(0,(v-.47)/.39));
        p.setXYZ(i,a+lean,b,c);
      }
      g.computeVertexNormals();k.stamp(g,...args);
    }};
    CentralArch.statueFigure(T,sculpt,tint,x,y,z,h,pose);
    const a=pose.yaw,dx=(pose.lean||0)*h,dz=-.039*h;
    hat(T,k,x+Math.cos(a)*dx+Math.sin(a)*dz,y+.956*h,z-Math.sin(a)*dx+Math.cos(a)*dz,h*.065,patina);
  }
  function peak(T,k){
    finishes(k);
    const f=createTempleFoundations(T,k);
    f.building(0,0,0,22,17,()=>{
      k.box(granite,0,.14,0,22,.28,17);
      // Three rectangular stone-faced tiers are slightly rotated relative
      // to one another, as in the national tourism inventory.
      for(const [yaw,w,d,y,h,color] of [[.07,17.1,11.2,.58,.72,0x555653],[-.10,14.8,10,1.39,.90,slate],[.03,12.8,8.9,2.66,1.66,0x555653]]){
        k.box(color,0,y,0,w,h,d,yaw);k.box(granite,0,y+h/2,0,w+.13,.105,d+.13,yaw);
      }
      k.box(patina,0,3.58,0,8.54,.24,5.03,.035);
      // The bronze group is a single composition of three adults. The
      // child and bouquet rise on the west, the tall staff to their right.
      bearer(T,k,bronze,-1.70,3.62,.22,6.83,{yaw:-.55,lean:.016,jacket:true,stepUp:.055,
        rightArm:[[-.18,.70,.10],[-.135,.845,.22],[-.119,.865,.207]],
        leftArm:[[.10,.695,.14],[-.11,.74,.21],[-.17,.77,.21]]});
      CentralArch.statueFigure(T,k,bronzeLight,-2.77,8.69,1.02,3.25,{yaw:-.30,robe:true,
        rightArm:[[-.16,.94,.02],[-.15,1.17,.06],[-.14,1.22,.065]],
        leftArm:[[.18,.94,.03],[.22,1.07,.07],[.25,1.11,.07]],openHand:true});
      hat(T,k,-2.77,11.81,1.00,.21,bronze);
      for(let j=0;j<8;j++){
        const a=j*2.40,r=.21+.05*(j%3),x=-3.14+r*Math.cos(a),z=1.39+r*Math.sin(a),y=12.82+.12*Math.sin(j);
        CentralArch.strut(T,k,bronze,-3.09,12.54,1.42,x,y,z,.033);
        k.outline([[-.12,0],[-.19,.15],[-.11,.13],[-.045,.24],[.022,.13],[.11,.21],[.095,.09],[.18,.13],[.13,.01],[.015,-.035]],
          bronzeLight,x,y,z,.12,a);
      }
      bearer(T,k,bronze,1.25,3.61,.52,7.35,{yaw:.44,lean:-.018,jacket:true,stepUp:.035,
        rightArm:[[-.04,.93,.13],[.10,1.16,.13],[.16,1.22,.11]],
        leftArm:[[.185,.72,.06],[.19,.91,.06],[.18,.95,.055]]});
      bearer(T,k,patina,.03,3.61,-1.0,6.96,{yaw:Math.PI+.21,jacket:true,stepUp:.07,
        rightArm:[[-.18,.66,.085],[-.06,.57,.15]],leftArm:[[.19,.70,.052],[.17,.87,.10]]});
      bronzeFlag(T,k);
      const rock=new T.SphereGeometry(1,12,7);
      for(const s of [-1,1])for(let j=0;j<4;j++){
        const x=s*(3.75+j*.69),z=4.86;
        k.box(slate,x,.52,z,.79,.32,.85);k.stamp(rock,leaf,x,.99,z,.47,.55,.46);
      }
      rock.dispose();
    });
  }
  add('tuong-dai-chien-thang-dien-bien-phu','4275610390','Tượng đài Chiến thắng Điện Biên Phủ',103.018884,21.392106,
    [103.019837,21.390958],peakYaw,22,17,{
      source:'https://vietnamtourism.vn/index.php/tourism/items/2073',photo:statuePhotos,
      description:'Trên đỉnh D1, ba người lính trong tác phẩm của Nguyễn Hải tựa lưng vào nhau. Một người nâng em bé Thái cầm hoa, một người giương cờ. Cụm tượng đồng cao 12,6 m trên bệ đá ba tầng.',
      gardenRadius:12,solids:[[0,0,8.50,5.65]],modeledBuildings:['w1333769529'],
      views:[view('Nhóm tượng đồng nhìn từ phía tây',16.8,34,peakYaw+.27,.13),
        view('Em bé cầm hoa dưới nếp cờ',22.4,13.0,peakYaw-.21,.06,local(peakYaw,-1.15,.5)),
        view('Bệ đá ba tầng trên đỉnh đồi',10,34,peakYaw+.82,.31)]},peak);

  function stoneRelief(T,k){
    // The southern wall of the ceremonial square is a curved, 58 m frieze.
    // Suggest its procession, bicycles and landscape in low relief. The
    // individual panels remain continuous around the shallow bend.
    const stone=0x878f89,light=0x9ba19b;
    const profile=u=>Math.sin(Math.PI*u)*3.0+.44*Math.sin(Math.PI*2*u);
    const height=u=>5.25+1.52*Math.sin(Math.PI*u)+1.10*Math.abs(Math.sin(6.5*u+.35))+.46*Math.sin(19*u+.60);
    const face=(u)=>[profile(u),-29+58*u];
    const rim=new T.TorusGeometry(.58,.064,5,16);
    for(let j=0;j<29;j++){
      const u=j/29,v=(j+1)/29,mid=(u+v)/2,[x0,z0]=face(u),[x1,z1]=face(v);
      const x=(x0+x1)/2,z=(z0+z1)/2,len=Math.hypot(x1-x0,z1-z0);
      const yaw=-Math.PI/2+Math.atan2(x1-x0,z1-z0);
      k.place(x,z,yaw,()=>{
        const a=height(u),b=height(v);
        k.box(slate,0,.32,0,len+.04,.64,1.13);
        k.outline([[-len/2,.57],[len/2+.025,.57],[len/2+.025,b],[-len/2,a]],stone,0,0,-.20,.40);
        // Overlapping mountain silhouettes are continuous across stone joints.
        for(let layer=0;layer<2;layer++){
          const line=q=>3.36+layer*.96+.59*Math.sin(16*q+layer)+.56*Math.sin(34*q+1.81*layer)+.27*Math.cos(49*q-layer);
          const profile=[[-len/2,.61],[len/2,.61]];
          for(let m=4;m>=0;m--)profile.push([len*(m/4-.5),line((j+m/4)/29)]);
          k.outline(profile,layer?0x89938d:0x929c94,0,0,.201+(1-layer)*.036,.048);
        }
      });
    }
    const head=new T.SphereGeometry(1,13,9);
    function onWall(at,draw){
      const u=.5+at/58,[x,z]=face(u),a=profile(u+.002)-profile(u-.002);
      k.place(x,z,-Math.PI/2+Math.atan2(a,.232),draw);
    }
    function person(at,y,h,stance,headwear,turn=1){
      onWall(at,()=>{
        const shape=(coords,z,depth,tint=light)=>k.outline(coords.map(([x,v])=>[x*h*turn,v*h]),tint,0,y,z,depth);
        const stride=stance==='walk'?.28:stance==='seated'?.38:.14,hip=stance==='seated'?.38:.49;
        shape([[-.22,0],[-.13,.22],[-.10,hip],[-.13,.64],[-.16,.77],[-.06,.82],[.02,.81],
          [.095,.79],[.17,.68],[.12,.55],[.115,hip],[.05,.40],[stride,.17],[stride+.09,.04],
          [stride+.06,.012],[stride-.04,.018],[-.025,.27],[-.11,.06],[-.14,.013]],.29,.22);
        k.stamp(head,light,-.025*h*turn,y+.635*h,.50,.142*h,.202*h,.20,0,0,turn*.12);
        k.stamp(head,light,.019*h*turn,y+.474*h,.47,.119*h,.145*h,.16);
        k.stamp(head,light,.016*h*turn,y+.885*h,.45,.09*h,.114*h,.17);
        shape([[.062,.88],[.097,.914],[.128,.871],[.095,.863],[.086,.825]],.54,.11);
        if(headwear==='conical')shape([[-.18,.935],[.025,1.06],[.20,.924],[.07,.91],[-.10,.91]],.42,.17);
        else if(headwear==='cap')shape([[-.097,.938],[-.065,.993],[.045,1.01],[.12,.978],[.185,.963],[.16,.945],[-.018,.943]],.43,.11);
        let elbow=[.22,.60],hand=[.36,.68];
        if(stance==='carry'){elbow=[.23,.76];hand=[.30,.88];}
        else if(stance==='wave'){elbow=[.20,.90];hand=[.33,1.08];}
        else if(stance==='seated'){elbow=[.20,.59];hand=[.43,.65];}
        const joint=(p,q,r)=>CentralArch.strut(T,k,light,p[0]*h*turn,y+p[1]*h,.47,q[0]*h*turn,y+q[1]*h,.48,r*h);
        joint([.09,.76],elbow,.062);joint(elbow,hand,.047);
        joint([-.04,hip],[-.12,.23],.068);joint([-.12,.23],[-.19,.04],.057);
        joint([.07,hip],[stride*.68,.25],.068);joint([stride*.68,.25],[stride+.018,.052],.053);
      });
    }
    // Interpret the documented table gathering, transport by bicycle and
    // carrying pole, and the homecoming on separate stretches of the frieze.
    for(const [d,h,t] of [[-27.3,2.8,1],[-25.3,3.12,1],[-22.8,3.08,-1],[-20.65,3.12,-1]])
      person(d,1.67,h,'seated','cap',t);
    onWall(-24,()=>{k.box(light,0,3.32,.54,4.9,.22,.32);for(const x of [-1.86,1.86])k.box(light,x,2.72,.54,.19,1.18,.23);});
    for(const [at,y,h,dir] of [[-17.2,1.19,2.77,1],[-12.9,1.02,3.22,1],[-8.62,1.72,2.85,-1]]){
      onWall(at,()=>{
        for(const x of [-1.16,1.03]){
          k.stamp(rim,light,x,y+.51,.62,1.18,1.18,.72);
          for(let j=0;j<8;j++){
            const a=j*Math.PI/4;
            CentralArch.strut(T,k,light,x,y+.51,.61,x+.66*Math.sin(a),y+.51+.66*Math.cos(a),.61,.021);
          }
        }
        for(const [a,b] of [[[-1.16,.52],[-.39,1.51]],[[-.39,1.51],[.08,.54]],[[.08,.54],[-1.16,.52]],[[.08,.54],[.90,1.39]],[[.90,1.39],[1.03,.52]],[[.90,1.39],[.62,1.66]]])
          CentralArch.strut(T,k,light,a[0],a[1]+y,.62,b[0],b[1]+y,.62,.059);
        k.box(light,-.69,2.31+y,.45,1.27,1.02,.26);
        for(const dx of [-1.13,-.50])k.box(stone,dx,y+2.31,.60,.055,1.03,.075);
      });
      person(at-.91,y+.04,h,'walk','conical',dir);
    }
    for(const [at,y,h,cap] of [[-5.0,2.00,3.39,'conical'],[-.75,1.01,3.07,'cap'],[4.50,1.18,3.54,'conical']]){
      person(at,y,h,'carry',cap);
      onWall(at,()=>{
        k.outline([[-1.82,0],[-.40,.17],[.46,.18],[1.48,-.04],[1.47,-.12],[.42,.095],[-.43,.09],[-1.82,-.073]],light,0,y+h*.84,.55,.103);
        for(const x of [-1.49,1.35]){
          for(const s of [-1,1])CentralArch.strut(T,k,light,x,y+h*.85,.54,x+s*.47,y+h*.44,.54,.036);
          k.outline([[-.60,.19],[.59,.19],[.48,-.12],[.24,-.31],[-.25,-.30],[-.49,-.12]],light,x,y+h*.42,.48,.15);
        }
      });
    }
    for(const [d,y,h,stance,dir] of [[8.8,1.43,3.3,'walk',1],[11.7,1.04,3.31,'wave',1],[14.4,2.13,2.88,'wave',-1],
      [17.8,1.01,3.32,'walk',1],[20,2.59,2.80,'wave',-1],[21.72,1.05,3.39,'wave',1],[25.22,1.13,3.06,'wave',-1],[27.03,1.00,2.4,'walk',-1]])
      person(d,y,h,stance,'cap',dir);
    for(const at of [12.1,23.85])onWall(at,()=>{
      k.outline([[-.05,0],[.06,0],[.69,4.54],[2.92,4.95],[4.02,4.56],[2.90,5.76],[.76,5.42],[.84,5.91],[.74,5.94]],light,0,1.08,.34,.12);
    });
    rim.dispose();head.dispose();
  }
  function ceremonial(T,k){
    finishes(k);const f=createTempleFoundations(T,k);
    // Offsets are measured from the visitor pin at the northern edge of the
    // lower plaza. Its centre and the stair axis are distinct on the imagery.
    f.building(24,10,0,40,53,()=>{
      k.box(0xa6a29a,0,.19,0,40,.30,53);
      for(let j=0;j<8;j++)k.box(j%2?granite:sand,-16+j*4.5,.346,4,.08,.022,42);
      k.place(18.9,0,0,()=>stoneRelief(T,k));
      for(let j=0;j<4;j++){
        const x=-13+j*7.7;
        k.box(slate,x,.47,22.5,1.11,.24,1.11);
        k.stamp(k.round,0xa8a9a1,x,3.35,22.5,.075,5.65,.075);
      }
    });
    const runs=[[0,35,64],[35,40,0],[40,118,128],[118,134,0],[134,164,64],[164,170,0],[170,199,64]];
    const axis=[[0,11.25],[117.6,10.86],[122.0,10.65],[134.0,9.96],[175.0,10.14],[199.0,11.16]];
    const cross=m=>{
      let j=1;while(j<axis.length-1&&axis[j][0]<m)j++;
      const [a,x]=axis[j-1],[b,y]=axis[j];return x+(y-x)*(m-a)/(b-a);
    };
    const along=m=>-17.15-m;
    const parts=[];
    for(const [lo,hi,count] of runs){
      const steps=count||1,run=(hi-lo)/steps;
      for(let i=0;i<steps;i++){
        const m=lo+(i+.5)*run,x=cross(m),z=along(m),index=parts.length;
        parts.push({start:lo+i*run,end:lo+(i+1)*run,landing:!count,m,x,z});
        f.fixture(g=>levels(g)[index],()=>{
          k.box(rose,x,-.29,z,9.14,.60,run+.028);
          for(const s of [-1,1]){
            k.box(granite,x+s*5.49,-.29,z,1.84,.60,run+.028);
            k.box(0xa6a29a,x+s*6.95,-.14,z,1.13,.36,run+.028);
          }
          if(count&&i%4===0)k.box(0x8d857c,x,.018,z+run*.45,9.10,.032,.038);
        });
      }
    }
    // A landing cannot simply take the height of its centre: the DEM may
    // climb several metres between its two ends. Fit one continuous profile
    // above the sampled relief, sharing the landing height with its steps.
    let sampled,heights;
    function levels(g){
      if(sampled===g)return heights;
      sampled=g;
      heights=parts.map(({start,end,landing})=>{
        let h=-Infinity;const n=landing?Math.ceil(end-start):1;
        for(let j=0;j<=n;j++){
          const m=start+(end-start)*j/n,x=cross(m),z=along(m);
          h=Math.max(h,g(x,z),g(x-6.4,z),g(x+6.4,z));
        }
        return h+.28;
      });
      for(let i=heights.length-2;i>=0;i--)heights[i]=Math.max(heights[i],heights[i+1]-.205);
      for(let i=1;i<heights.length;i++)heights[i]=Math.max(heights[i],heights[i-1]+.015);
      return heights;
    }
    // Twenty-eight pairs of small stone markers line the public ascent.
    for(let j=0;j<28;j++)for(const s of [-1,1]){
      const m=2+j*7.19,x=cross(m)+s*7.06,z=along(m);
      const i=parts.findIndex(p=>p.end>=m);
      f.fixture(g=>Math.max(g(x,z),levels(g)[i]),()=>{
        k.box(slate,x,.14,z,.74,.28,.75);
        k.box(cream,x,.89,z,.48,1.28,.50);
        k.outline([[-.23,0],[-.27,.38],[-.40,.58],[-.43,.90],[-.18,.66],[.05,.45],[.26,.34],[.22,0]],
          cream,x,1.42,z-.22,.46,s<0?0:Math.PI);
      });
    }
    const trees=[];
    for(let j=0;j<10;j++)for(const s of [-1,1]){
      const m=8+j*19.7+(s<0?2.6:0);
      trees.push({x:cross(m)+s*(13.6+2.6*Math.sin(j*1.7)),z:along(m),h:5.8+(j%4)*.65,width:4.0+(j%3)*.53});
    }
    const firstTree=k.group.children.length;
    CentralArch.trees(T,k,trees);
    trees.forEach((tree,i)=>{
      const mesh=k.group.children[firstTree+i];
      f.fixture(g=>g(tree.x,tree.z),()=>{},h=>{mesh.position.y=h;});
    });
    let skirt;
    const baseFit=k.group.userData.fitGround;
    k.group.userData.fitGround=g=>{
      baseFit(g);
      if(!skirt){
        const geom=new T.BufferGeometry();
        geom.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(parts.length*2*18),3));
        const texture=new T.TextureLoader().load('streetscape/verge-grass.webp');texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.SRGBColorSpace;
        geom.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(parts.length*2*12),2));
        skirt=new T.Mesh(geom,new T.MeshStandardMaterial({map:texture,color:0xa6ae8b,roughness:.97,side:T.DoubleSide}));
        skirt.castShadow=skirt.receiveShadow=true;k.group.add(skirt);
      }
      const levelsNow=levels(g),{position,uv}=skirt.geometry.attributes;let index=0;
      for(const [i,{start,end}] of parts.entries())for(const s of [-1,1]){
        const xa=cross(start)+s*7.48,xb=cross(end)+s*7.48,za=along(start),zb=along(end),top=levelsNow[i]-.04;
        const outerA=xa+s*6.70,outerB=xb+s*6.70;
        const a=[xa,top,za],b=[xb,top,zb],c=[outerB,g(outerB,zb)-.16,zb],d=[outerA,g(outerA,za)-.16,za];
        for(const p of [a,b,c,a,c,d]){position.setXYZ(index,...p);uv.setXY(index,p[0]/3.7,p[2]/3.7);index++;}
      }
      position.needsUpdate=true;uv.needsUpdate=true;skirt.geometry.computeVertexNormals();skirt.geometry.computeBoundingSphere();
    };
  }
  add('san-hanh-le-doi-d1','5492241221','Sân hành lễ và trục bậc đồi D1',103.016610,21.392356,
    [103.016674,21.392736],stairYaw,52,235,{
      source:'https://www.qdnd.vn/quoc-phong-an-ninh/chien-thang-dien-bien-phu-moc-son-lich-su/dien-bien-hom-nay/tuong-dai-chien-thang-dien-bien-phu-diem-den-cua-chien-thang-va-hoa-binh-771459',photo:provincial,
      description:'Từ sân lễ dưới chân đồi, 320 bậc đá và ba chiếu nghỉ dẫn lên tượng đài. Phía nam sân là bức phù điêu đá xanh dài 58 m. Hai hàng cột nhỏ men theo lối lên.',
      gardenRadius:22,boundary:[[3,38],[3,-17],[3,-216],[18,-216],[18,-17],[47,-17],[47,38]],
      reserve:(x,z,r)=>(Math.abs(x-11)<8+r&&z>=-217-r&&z<=-16+r)||(x>=3-r&&x<=47+r&&z>=-18-r&&z<=38+r),
      solids:[[44,10,1.1,27],[11,-116.7,6.45,99.6]],
      views:[view('Phù điêu đá xanh ở sân hành lễ',8.8,53,stairYaw-Math.PI/2-.14,.11,local(stairYaw,43,10)),
        view('Bánh xe và quang gánh trên phù điêu',7.7,14.2,stairYaw-Math.PI/2-.10,.045,local(stairYaw,44.8,1.6)),
        view('Trục bậc nhìn về đỉnh D1',5.4,32,stairYaw+.05,.09,local(stairYaw,11.3,-34),49),
        view('Chiếu nghỉ và cột mốc đá',5.1,20,stairYaw+.26,.17,local(stairYaw,12,-135))]},ceremonial);

  function memorialWing(T,k,sign){
    const outline=[[0,4.95],[3.78,0],[14.25,0],[0,12.45]],shape=new T.Shape();
    outline.forEach(([x,y],i)=>i?shape.lineTo(sign*x,y):shape.moveTo(sign*x,y));shape.closePath();
    // Leave a small unpierced crown and margins along the aperture and
    // the roof edge. There are 322 small perforations on each folded leaf.
    let points=[],pitch=.53;
    while(points.length<322){
      pitch-=.003;points=[];
      for(let y=.66;y<11.55;y+=pitch)for(let u=.47;u<13.54;u+=pitch){
        if(y>12.45-u*12.45/14.25-.51||y<4.95-u*4.95/3.78+.40||u<1.08&&y>10.2)continue;
        points.push([u,y]);
      }
    }
    for(const [u,y] of points.slice(0,322)){
      const hole=new T.Path();
      for(let j=0;j<10;j++){
        const a=j*Math.PI/5,r=pitch*(j%2?.21:.41),x=sign*u+Math.sin(a)*r,yy=y+Math.cos(a)*r;
        j?hole.lineTo(x,yy):hole.moveTo(x,yy);
      }
      hole.closePath();shape.holes.push(hole);
    }
    const g=new T.ShapeGeometry(shape);k.stamp(g,cream,0,0,0);
    const reverse=g.clone(),idx=reverse.index.array;
    for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];
    reverse.computeVertexNormals();k.stamp(reverse,cream,0,0,-.28);reverse.dispose();g.dispose();
    for(let i=0;i<outline.length;i++){
      const a=outline[i],b=outline[(i+1)%outline.length];
      CentralArch.strut(T,k,cream,sign*a[0],a[1],-.14,sign*b[0],b[1],-.14,.16);
    }
  }
  function remembrance(T,k){
    for(let i=0;i<5;i++)k.box(i%2?rose:0x8d857c,0,.11+i*.15,2.5,42.2-i*.62,.22,15.4-i*.57);
    k.box(slate,0,.85,1.8,37.9,.34,11.25);
    // The central opening is triangular and the two perforated walls fold
    // away from the ridge. Dark polished stone is visible behind the altar.
    for(const s of [-1,1])k.place(0,3.2,s*.34,()=>{
      memorialWing(T,k,s);
      k.box(slate,s*8.81,.58,-.09,9.97,.96,.69);
    });
    k.outline([[-3.88,0],[0,5.25],[3.88,0]],0x393b37,0,.96,-1.32,.31);
    k.box(slate,0,1.52,.94,3.43,.55,1.16);
    k.box(0x555653,0,1.87,.94,3.76,.16,1.33);
    star(k,0,11.10,3.24,.49,0x5a5b51,.06);
    // Groups on either side of the memorial are gilded, against the dark
    // granite. To the left, two women and a child lift a ribbon together.
    for(const s of [-1,1])k.box(slate,s*16.31,1.25,3.5,3.85,.49,3.14);
    const gilt=0xc5a052;
    CentralArch.statueFigure(T,k,gilt,-17.1,1.51,3.6,3.42,{robe:true,yaw:.08,
      leftArm:[[.16,.60,.13],[.20,.55,.21]],rightArm:[[-.13,.60,.10],[-.11,.55,.20]]});
    CentralArch.statueFigure(T,k,gilt,-15.49,1.51,3.66,3.19,{robe:true,yaw:-.13,
      rightArm:[[-.14,.60,.14],[-.20,.53,.22]]});
    CentralArch.statueFigure(T,k,gilt,-16.17,1.51,4.33,1.70,{leftArm:[[.14,.74,.07],[.20,.96,.12]]});
    k.outline([[-1.30,.53],[-.83,.24],[-.43,.30],[.09,.55],[.74,.55],[1.18,.38],[1.17,.17],[.72,.35],
      [.19,.37],[-.42,.10],[-.91,.08],[-1.30,.28]],gilt,-16.20,2.93,4.24,.10);
    for(const [x,z,h,a] of [[15.70,3.68,3.55,-.20],[16.91,3.40,3.31,.31]]){
      CentralArch.statueFigure(T,k,gilt,x,1.51,z,h,{jacket:true,yaw:a});
      hat(T,k,x,1.51+h*.97,z,.23,gilt);
    }
  }
  function cemeteryGate(T,k){
    const white=0xd1d1be,verde=0x737c70;
    const face=new T.Shape();
    face.moveTo(-10.8,0);face.lineTo(-2.14,0);face.lineTo(-2.14,3.04);
    face.absarc(0,3.04,2.14,Math.PI,0,true);face.lineTo(2.14,0);face.lineTo(10.8,0);
    face.lineTo(9.47,6.24);face.lineTo(-9.47,6.24);face.closePath();
    k.profile(face,granite,0,.42,-3.05,6.10);
    for(const s of [-1,1]){
      const x=s*6.17;
      k.outline([[-1.32,0],[-1.32,2.43],[-.82,2.78],[0,2.92],[.79,2.78],[1.32,2.43],[1.32,0]],
        0x8a4c35,x,.42,3.075,.085);
      for(const d of [-.70,0,.70])k.box(0x80523a,x+d,1.73,3.17,.035,2.53,.034);
    }
    for(let i=0;i<13;i++){
      const a=i*Math.PI/13,b=(i+1)*Math.PI/13-.006;
      const pt=(r,t)=>[r*Math.cos(t),r*Math.sin(t)];
      k.outline([pt(2.145,a),pt(2.42,a),pt(2.42,b),pt(2.145,b)],i%2?0xa6a29a:sand,0,3.46,3.08,.18);
    }
    k.box(white,0,6.80,0,19.5,.27,6.47);
    for(const z of [-2.96,2.96]){
      for(let i=-10;i<=10;i++)k.box(white,i*.89,7.16,z,.22,.63,.25);
      k.box(white,0,7.51,z,19.17,.17,.32);
    }
    for(const x of [-2.86,2.86])for(const z of [-1.81,1.81])k.box(cream,x,7.93,z,.37,2.55,.37);
    CentralArch.curvedRoof(T,k,0,8.99,0,8.67,6.32,1.3,verde,0x889082,white,.23);
    for(const x of [-1.96,1.96])for(const z of [-1.23,1.23])k.box(cream,x,10.91,z,.24,1.54,.24);
    const bell=new T.LatheGeometry([[.03,.89],[.27,.79],[.40,.60],[.45,.18],[.57,.07],[.55,0]].map(([x,y])=>new T.Vector2(x,y)),18);
    k.stamp(bell,bronze,0,10.25,0);bell.dispose();
    CentralArch.curvedRoof(T,k,0,11.69,0,6.18,4.57,1.12,verde,0x889082,white,.24);
    k.stamp(k.round,0xb1b1a6,.24,10.62,2.75,.043,7.67,.043);
    k.wavingFlag(2.4,1.5,.25,14.4,2.75);
    for(let t=0;t<4;t++)k.box(granite,0,.062*(4-t),3.10+(t+.5)*.35,9.2,.124*(4-t),.38);
    // A narrow footbridge reaches across the water in front of the gate.
    k.box(0xa6a29a,0,.20,7.62,5.08,.41,6.43);
    for(const s of [-1,1])k.box(slate,s*2.48,.58,7.60,.24,.63,6.42);
  }
  function remembranceGallery(T,k){
    const white=0xcfd0c4;
    k.box(granite,0,.19,0,46,.38,6.55);
    k.box(0xaeafa1,0,2.31,0,45.75,4.22,.36);
    k.box(0x454a48,0,2.10,-.23,44.70,3.24,.12);
    k.box(0xba9452,0,2.01,.24,44.68,2.52,.25);
    for(let j=0;j<15;j++){
      const x=-21.1+j*3.015;
      // Perforated paving, glazed plaques and the open concrete galleries
      // appear on opposite sides of the wall in the press photographs.
      k.box(0xb8ac84,x,2.06,-.31,.027,3.23,.018);
      for(let n=0;n<12;n++)k.box(0x8e8065,x-.04+(n%3)*.03,.74+n*.25,-.312,1.9+.16*((n+j)%4),.018,.016);
      k.outline([[-1.3,-.45],[-.85,.15],[-.61,.44],[-.53,.28],[-.78,.03],[-.36,.17],[-.18,.62],[.06,.67],
        [.22,.52],[.13,.39],[.34,.28],[.72,.60],[.88,.58],[.51,.11],[.19,-.03],[.07,-.58],[-.267,-.56],[-.40,-.16],[-.74,-.42]],
        0xc6a05c,x,2.02,.42,.085);
    }
    for(let j=0;j<=8;j++){
      const x=-22.65+j*5.66;
      for(const z of [-2.45,2.62])k.box(white,x,2.54,z,.28,4.79,.30);
      k.box(white,x,4.92,.08,.30,.31,5.51);
    }
    for(const z of [-2.45,2.62])k.box(white,0,4.92,z,45.92,.33,.34);
    k.box(0xbdbaa9,0,4.83,-1.37,45.7,.18,2.38);
    k.box(0x7a9284,0,.092,6.65,45.7,.17,5.65);
    for(const z of [3.65,9.65])k.box(granite,0,.19,z,46,.37,.23);
  }
  function markerGeometry(T){
    const loop=[[-.28,0],[.28,0]];
    for(let i=0;i<=8;i++){
      const a=i*Math.PI/8;loop.push([.28*Math.cos(a),.53+.23*Math.sin(a)]);
    }
    const v=[],ix=[],n=loop.length;
    for(const z of [-.075,.075])for(const [x,y] of loop)v.push(x,y,z);
    for(let j=0;j<n;j++){
      const q=(j+1)%n;ix.push(j,q,q+n,j,q+n,j+n);
      if(j>0&&j<n-1)ix.push(0,j+1,j,n,n+j,n+j+1);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();return g;
  }
  function graves(T,k,f){
    const head=markerGeometry(T),tiny=new T.Shape();
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5,r=i%2?.034:.081;
      i?tiny.lineTo(r*Math.sin(a),r*Math.cos(a)):tiny.moveTo(r*Math.sin(a),r*Math.cos(a));
    }
    tiny.closePath();const emblem=new T.ShapeGeometry(tiny);
    for(const s of [-1,1])for(const [strip,xMid] of [10.4,20.5,32.1,42.4].entries()){
      // Inner plots leave room for the altar court and four large named
      // graves. The outer plots continue further east on both flanks.
      const inner=strip<2,count=inner?16:24,first=inner?55:21.4;
      for(let row=0;row<count;row++){
        const z=first+row*(inner?4.02:3.87)+Math.floor(row/4)*.72;
        f.fixture(g=>g(s*xMid,z),()=>{
          for(let col=0;col<4;col++){
            const x=s*(xMid+(col-1.5)*1.93);
            k.box(0xa7816e,x,.12,z,1.53,.25,2.34);
            k.box(0xbc9581,x,.315,z,1.37,.15,2.19);
            k.stamp(head,0x595c57,x,.39,z-.68);
            k.stamp(emblem,0xc3a359,x,.95,z-.595);
          }
        });
      }
    }
    for(const s of [-1,1])for(const z of [38.4,45.9]){
      const x=s*13.95;
      f.building(x,z,0,3.74,4.14,()=>{
        k.box(0x555653,0,.26,0,3.60,.52,4.03);
        k.box(slate,0,.59,0,3.18,.20,3.68);
        k.stamp(head,0x555653,0,.69,-.79,2.5,2.28,2.0);
        k.stamp(emblem,0xc3a359,0,1.96,-.62,2.0,2.0,1);
      });
    }
    head.dispose();emblem.dispose();
  }
  function cemetery(T,k){
    finishes(k);const f=createTempleFoundations(T,k);
    // OSM way 403835051 is the cemetery boundary. The A-shaped memorial is
    // mapped separately as way 1334668993. The entrance is some 140 m west
    // of the visitor pin, rather than at the centre of the grave plots.
    f.building(0,3.2,0,44,22,()=>remembrance(T,k));
    f.building(0,139.0,0,22,10,()=>cemeteryGate(T,k));
    for(const s of [-1,1])f.building(s*33.60,141.1,0,46,6.6,()=>remembranceGallery(T,k));
    f.building(-55.0,107.9,0,14.7,25.0,()=>{
      // The caretaker's building on the northern boundary is a raised
      // Thai-style house. Its terracotta roof is visible on the aerial image.
      k.box(0x8d857c,0,.12,0,14.7,.24,25);
      for(const x of [-5.85,5.85])for(const z of [-9.0,-2.95,2.95,9.0])k.box(0x826a56,x,1.41,z,.39,2.70,.39);
      k.box(0x977a60,0,2.68,0,12.82,.30,21.32);
      k.box(0xad8769,0,3.96,0,11.52,2.40,19.94);
      for(const z of [-7.5,-2.5,2.5,7.5])k.box(0x51483c,5.81,4.02,z,.14,1.31,1.7);
      k.place(0,0,Math.PI/2,()=>CentralArch.curvedRoof(T,k,0,5.18,0,24.35,14.18,3.6,0xb56f4d,0x905b43,0x88543d,.33));
    });
    graves(T,k,f);
    // Ground-fitting continuous paving joins the entry, plot paths and the
    // memorial court. Level grave plinths remain independent of the paths.
    const walks=[];
    function paving(x,z,w,d,color,h=.094,map=null){
      const geom=new T.PlaneGeometry(w,d,Math.max(1,Math.ceil(w/3)),Math.max(1,Math.ceil(d/3)));
      geom.rotateX(-Math.PI/2);geom.translate(x,0,z);
      if(map){
        const uv=geom.attributes.uv;
        for(let j=0;j<uv.count;j++)uv.setXY(j,uv.getX(j)*w/3.7,uv.getY(j)*d/3.7);
      }
      const path=new T.Mesh(geom,new T.MeshStandardMaterial({map,color,roughness:.94}));
      path.receiveShadow=true;k.group.add(path);walks.push({geom,h});
    }
    paving(0,22.0,26.8,26.30,granite);
    paving(0,83.05,5.18,96.3,0xa6a29a);
    paving(0,135.1,12.35,8.7,0xa6a29a);
    const lawn=new T.TextureLoader().load('streetscape/verge-grass.webp');
    lawn.wrapS=lawn.wrapT=T.RepeatWrapping;lawn.colorSpace=T.SRGBColorSpace;
    const bush=new T.SphereGeometry(1,10,7);
    for(const s of [-1,1]){
      paving(s*17.75,85.65,23.4,75.0,0x9ca278,.034,lawn);
      paving(s*38.9,70.4,18.8,105.7,0x9ca278,.032,lawn);
      for(const x of [25.9,37.3])paving(s*x,71.6,1.08,108.4,0xa6a29a,.082);
      for(const z of [52.25,70.5,89.2,107.4])paving(s*25.8,z,41.6,.96,0xa6a29a,.080);
      for(const z of [25.0,43.7,62.1,80.2,98.7,118.8])for(const x of [24.9,47.11]){
        f.fixture(g=>g(s*x,z),()=>{
          k.stamp(k.round,0x796950,s*x,.44,z,.14,.85,.14);
          k.stamp(bush,0x66794a,s*x,1.13,z,.88,.84,.78);
          k.stamp(bush,0x5b7142,s*x+.14,1.87,z,.61,.50,.58);
        });
      }
    }
    bush.dispose();
    for(let j=0;j<12;j++){
      const z=39.9+j*7.6;
      for(const s of [-1,1]){
        const x=s*3.59;
        f.fixture(g=>g(x,z),()=>{
          for(let i=-2;i<=2;i++){
            const q=z+i*1.47;
            k.box(i%2?0x657643:0x627644,x,.30,q,.75,.62,1.48);
          }
          if(j%2===0){
            k.stamp(k.round,0x677169,x,.92,z,.07,1.84,.07);
            const ball=new T.SphereGeometry(.24,8,5);k.stamp(ball,0xd8d7bc,x,1.99,z);ball.dispose();
          }
        });
      }
    }
    const trees=[{x:-12,z:8,h:8.3,width:7.2},{x:11.8,z:8.1,h:8.8,width:7.4},
      {x:-46,z:126,h:11,width:8.3},{x:48,z:124,h:10,width:9.0},{x:-49,z:12,h:12,width:8.4}];
    for(const s of [-1,1])for(let j=0;j<7;j++)trees.push({x:s*5.17,z:40+j*13.7,h:3.3+j%3*.28,width:3.02,kind:'palm'});
    const first=k.group.children.length;
    CentralArch.trees(T,k,trees);
    trees.forEach((tree,i)=>{
      const object=k.group.children[first+i],base=object.position.y;
      f.fixture(g=>g(tree.x,tree.z),()=>{},h=>{object.position.y=base+h;});
    });
    const fit=k.group.userData.fitGround;
    k.group.userData.fitGround=g=>{
      fit(g);
      for(const {geom,h} of walks){
        const p=geom.attributes.position;
        for(let j=0;j<p.count;j++)p.setY(j,g(p.getX(j),p.getZ(j))+h);
        p.needsUpdate=true;geom.computeVertexNormals();geom.computeBoundingSphere();
      }
    };
  }
  add('nghia-trang-liet-si-a1','4411037089','Nghĩa trang liệt sĩ quốc gia A1',103.018328,21.381026,
    [103.018595,21.381007],cemeteryYaw,122,192,{
      source:'https://svhttdl.dienbien.gov.vn/ditich/pages/2013/Cac-cong-trinh-the-hien-truyen-thong-va-dao-ly-Uon-8734.aspx',
      photo:'https://nvsk.vnanet.vn/nghia-trang-liet-sy-a1-nhan-chung-lich-su-ve-tinh-than-quat-cuong-cua-dan-toc-1-145620.vna',
      description:'Qua cổng đá và gác chuông phía tây, lối đi giữa hai hàng cây dẫn tới nhà tưởng niệm hình chữ A. Những ngôi sao nhỏ trên hai cánh tường gợi nhớ 644 liệt sĩ yên nghỉ tại đây.',
      gardenRadius:53,modeledBuildings:['w1334668993'],boundary:[[-61,-26],[61,-26],[61,149],[-61,149]],
      reserve:(x,z,r)=>Math.abs(x)<60+r&&z>=-17-r&&z<150+r,
      solids:[[0,0,14,6],[-7,139,4,3.1],[7,139,4,3.1],[-33.6,141.1,23,3.3],[33.6,141.1,23,3.3],[-55,107.9,7.35,12.50]],
      views:[view('Nhà tưởng niệm hình chữ A',13.9,38,cemeteryYaw+.09,.09,local(cemeteryYaw,0,3.6),54),
        view('Cổng đá và gác chuông phía tây',13.8,37.5,cemeteryYaw-.20,.13,local(cemeteryYaw,0,139)),
        view('Lối giữa những hàng mộ',6.1,36,cemeteryYaw-.04,.16,local(cemeteryYaw,0,78)),
        view('Hai cánh tường sao của nhà tưởng niệm',15.0,16.5,cemeteryYaw+.61,.09,local(cemeteryYaw,1.75,2.95),54)]},cemetery);
})();
