'use strict';
(()=>{
  const id='chua-ang-tra-vinh',catalogId='osm-way-288574348',A=window.CentralArch;
  const lon=106.3036197,lat=9.9158007,yaw=1.76819,start=[106.304365,9.916022];
  const original=window.VietnamTourism.byId.get(catalogId);
  const source='https://vinhlong.gov.vn/du-khach-old/di-tich-lich-su',photo=n=>'https://commons.wikimedia.org/?curid='+n;
  const gold=0xe7bf62,light=0xf2d58b,ochre=0xc89947,stone=0x676253,brick=0xb06e54,clay=0xb2694b,wood=0x634835;
  const world=(x,z)=>[x*Math.cos(yaw)+z*Math.sin(yaw),-x*Math.sin(yaw)+z*Math.cos(yaw)];
  function view(name,target,eye,fov,url,photoCatalogId,description){
    const [x,h,z]=target,[ex,ey,ez]=eye,d=Math.hypot(ex-x,ez-z);
    return {name,offset:world(x,z),height:h/.46,viewBase:'monument',viewAngle:yaw+Math.atan2(ex-x,ez-z),
      viewElevation:Math.atan2(ey-h,d),viewRadius:Math.hypot(d,ey-h),viewFov:fov,photo:url,photoCatalogId,description};
  }
  const views=[
    view('Chánh điện nhìn từ sân phía đông',[0,6.5,1],[-.9,2.9,28.0],53,photo(25293197),catalogId,
      'Qua hàng rào ngoài và hai bậc nền là chánh điện quay về hướng đông. Trên mặt hồi, mảng chạm màu vàng nổi trên nền xanh lục.'),
    view('Lối qua hào ở phía tây',[13.4,.52,-66.9],[23,2.8,-80.3],53,source,'chua-ang-hao-nuoc',
      'Một cầu đi bộ hẹp nối hai bờ hào phía tây. Theo lòng hào về góc bắc có thể thấy khoảng cách giữa hai bờ thu hẹp dần. Đường bờ và vị trí cầu được đối chiếu với ảnh chụp từ trên cao.'),
    view('Ba cấp mái nhìn dọc hành lang',[0,6.1,1],[-20,3.3,30.8],51,photo(25228819),'chua-ang-hanh-lang',
      'Nhìn chéo qua nền đá xanh và hàng rào về ba cấp mái ngói. Mái dưới xòe rộng che hành lang, hai cấp trên thu hẹp dần về nóc.'),
    view('Phù điêu trên đầu hồi',[0,12.13,10.8],[1.65,9.8,22.8],39,photo(25293197),catalogId,
      'Góc nhìn cao ngang mái để xem tấm gỗ chạm hình tam giác ở đầu hồi. Họa tiết vàng trên nền xanh được lấy từ ảnh chánh điện chùa Âng.'),
    view('Chánh điện trong vòng hào',[14,1.7,-14],[80,96,97],59,source,'chua-ang-toan-canh',
      'Nhìn xuống các sân, dãy nhà và hào nước. Chánh điện có mặt bằng 12 × 24 m trên hai nền cao. Phía bắc, qua rừng cây là Ao Bà Om.'),
    view('Cổng chùa dưới hai hàng sao',[19.2,3.75,79.2],[18.6,2.22,90.7],45,photo(25293196),'chua-ang-cong-dong',
      'Trên cổng phía đông có ba mảng chạm nhô cao và những hình người chim đỡ diềm. Bảng tên cùng các nét chạm được phục dựng theo ảnh năm 2013. Sau cổng là lối đi giữa hai hàng cây.'),
    view('Tháp năm ngọn bên hào phía đông',[3.2,3.55,31.6],[-.65,2.10,55.4],40,
      'https://vov.gov.vn/ngoi-chua-khmer-gan-1000-nam-tuoi-o-tra-vinh-dtnew-534688','chua-ang-thap-nam-ngon',
      'Nhìn qua mặt nước tới ngôi tháp lưu giữ di cốt các vị sư cả từng trụ trì chùa. Bốn ngọn thấp bao quanh ngọn giữa, chánh điện mái ngói nằm ngay phía sau.'),
  ];
  function turned(T,k,color,x,y,z,profile){
    const g=new T.LatheGeometry(profile.map(([r,h])=>new T.Vector2(r,h)),16);
    k.stamp(g,color,x,y,z);g.dispose();
  }
  function curled(k,x,y,z,s){
    k.outline([[0,0],[s*.29,.08],[s*.55,.32],[s*.68,.64],[s*.63,.95],[s*.47,1.17],[s*.48,.74],
      [s*.33,.57],[s*.32,.85],[s*.21,.66],[s*.22,.38],[s*.12,.23]],gold,x,y,z-.07,.14);
  }
  function panels(T,k){
    const positions=[],uv=[],idx=[];
    // Project only the carved faces of the gable and the individual brackets.
    function face(points,texels){
      const base=positions.length/3;
      for(let i=0;i<points.length;i++){positions.push(...points[i]);uv.push(texels[i][0]/504,1-texels[i][1]/544);}
      for(let i=1;i+1<points.length;i++)idx.push(base,base+i,base+i+1);
    }
    function capital(x,z,sign,krud){
      const py=krud?220:2,w=108,h=208,top=7.80;
      const outline=[[.18,0],[.44,.09],[.50,.045],[.57,.09],[.82,0],[.79,.27],[.64,.48],[.60,.72],[.50,.88],[.38,.73],[.36,.49],[.21,.27]];
      const raw=outline.map(([u,v])=>new T.Vector2(u,v)),tris=T.ShapeUtils.triangulateShape(raw,[]);
      const pts=outline.map(([u,v])=>[x+sign*(u-.5)*.99,top-v*1.65,z+sign*.032]);
      for(const tri of tris)face(tri.map(i=>pts[i]),tri.map(i=>[392+w*outline[i][0],py+h*outline[i][1]]));
    }
    for(const s of [-1,1]){
      face([[-2.10,10.23,s*10.98],[2.10,10.23,s*10.98],[0,14.03,s*10.98]],[[22,423],[361,423],[190,24]]);
      for(let i=0;i<6;i++)capital((i-2.5)*2.35,s*12.05,s,i===0||i===5);
      for(const along of [true,false]){
        const extent=along?24:36,segments=extent/3;
        for(let i=0;i<segments;i++){
          const a=-extent/2+3*i,b=a+3,wall=along?18.006:12.006;
          const pts=[[a,-.42],[b,-.42],[b,1.35],[a,1.35]].map(([u,y])=>along?[u,y,s*wall]:[s*wall,y,u]);
          const left=i%2?251:7,right=i%2?496:237;
          face(pts,[[left,539],[right,539],[right,453],[left,453]]);
        }
      }
    }
    for(let i=0;i<2;i++){
      const x=-2.69+2.69*i;
      face([[x,-.21,19.928],[x+2.69,-.21,19.928],[x+2.69,1.35,19.928],[x,1.35,19.928]],
        [[7,539],[237,539],[237,453],[7,453]]);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const map=new T.TextureLoader().load('sight-imagery/chua-ang-hoa-van.webp');map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
    const m=new T.MeshStandardMaterial({map,side:T.DoubleSide,roughness:.87});
    const mesh=new T.Mesh(g,m);mesh.name='Mộc bản đầu hồi và phù điêu đầu cột';mesh.receiveShadow=true;k.group.add(mesh);
  }
  function roof(T,k){
    // The lower two roof tiers slope on four sides down to wide eaves.
    // The two end walls of the upper roof carry the triangular carved panels.
    function skirt(w,d,y,ww,dd,h){
      const outer=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
      const inner=[[-ww/2,-dd/2],[ww/2,-dd/2],[ww/2,dd/2],[-ww/2,dd/2]];
      const pos=[],idx=[];
      for(let i=0;i<4;i++){
        const a=outer[i],b=outer[(i+1)%4],c=inner[(i+1)%4],e=inner[i];
        const ix=pos.length/3;pos.push(a[0],y,a[1],b[0],y,b[1],c[0],y+h,c[1],e[0],y+h,e[1]);
        idx.push(ix,ix+2,ix+1,ix,ix+3,ix+2);
        A.strut(T,k,ochre,a[0],y,a[1],b[0],y,b[1],.105);
        A.strut(T,k,gold,a[0],y+.04,a[1],e[0],y+h+.04,e[1],.105);
        A.strut(T,k,wood,a[0],y-.16,a[1],b[0],y-.16,b[1],.14);
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
      k.stamp(g,clay,0,0,0);g.dispose();
      for(const [x,z] of outer)curled(k,x,y,z,Math.sign(x));
    }
    k.box(wood,0,7.87,0,16.45,.20,28.25);
    for(const s of [-1,1]){
      k.box(gold,0,7.90,s*14.16,16.59,.18,.16);k.box(gold,s*8.26,7.90,0,.16,.18,28.40);
    }
    skirt(16.7,28.4,7.92,10.15,24.9,1.16);
    skirt(10.4,25.15,9.13,4.52,21.8,1.15);
    A.gabledRoof(T,k,0,10.19,0,4.52,21.5,3.98,clay,gold,{thick:.15,overhang:.13});
    for(const s of [-1,1]){
      k.outline([[-2.26,0],[0,4],[2.26,0]],ochre,0,10.18,s*10.86-.055,.11);
      for(const side of [-1,1]){
        A.strut(T,k,gold,0,14.22,s*10.98,side*2.29,10.19,s*10.98,.09);
        curled(k,side*2.22,10.16,s*10.99,side);
        for(let j=1;j<16;j++){
          const t=j/16;k.outline([[0,0],[side*.105,.09],[side*.12,.27],[side*.035,.21],[-side*.018,.07]],gold,
            side*(2.27*t+.065),14.18-3.98*t,s*10.94,.085);
        }
      }
      turned(T,k,gold,0,14.12,s*10.96,[[.12,0],[.18,.1],[.11,.22],[.15,.33],[.055,.63],[0,.92]]);
    }
  }
  function railing(T,k,width,depth,y,h,gate,thickness){
    const shape=new T.Shape();shape.moveTo(-1,0);shape.lineTo(1,0);shape.lineTo(1,1);shape.lineTo(-1,1);shape.closePath();
    for(const side of [-1,1]){
      const hole=new T.Path();hole.moveTo(side*.10,.16);hole.bezierCurveTo(side*.22,.45,side*.76,.37,side*.82,.78);
      hole.bezierCurveTo(side*.37,.75,side*.10,.63,side*.10,.16);hole.closePath();shape.holes.push(hole);
      const upper=new T.Path();upper.absellipse(side*.34,.82,.15,.08,0,Math.PI*2,true);shape.holes.push(upper);
      const lower=new T.Path();lower.absellipse(side*.77,.22,.13,.09,0,Math.PI*2,true);shape.holes.push(lower);
    }
    const lattice=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:5});
    function run(x,z,length,angle){
      const n=Math.max(1,Math.round(length/2.02)),step=length/n,dx=Math.cos(angle),dz=-Math.sin(angle);
      for(let i=0;i<n;i++){
        const d=(i+.5)*step;k.stamp(lattice,light,x+dx*d,y,z+dz*d,step*.486,h*.88,1,angle);
      }
      for(let i=0;i<=n;i+=2){
        const px=x+dx*i*step,pz=z+dz*i*step;k.box(gold,px,y+h*.52,pz,.21,h*1.04,.21);
        k.tapered(light,px,y+h*1.12,pz,.15,.025,h*.17,1,8);
      }
    }
    for(const side of [-1,1]){
      run(side*width/2,depth/2,depth,Math.PI/2);
      run(-width/2,side*depth/2,(width-gate)/2,0);run(gate/2,side*depth/2,(width-gate)/2,0);
    }
    lattice.dispose();
  }
  function hall(T,k){
    k.palette({stone,tile:clay,plaster:light,timber:wood,brick});
    k.box(stone,0,.02,0,24,2.76,36);k.box(brick,0,1.41,0,24.02,.095,36.02);
    k.box(ochre,0,1.71,0,16.2,.56,29.1);k.box(brick,0,2.025,0,16.2,.08,29.1);
    railing(T,k,23.76,35.70,1.46,1.23,3.7,.11);railing(T,k,15.84,28.78,2.06,.70,3.1,.08);
    for(let i=0;i<8;i++)k.box(brick,0,(i+1)*.089,-20.55+i*.34,3.57,(i+1)*.178,.35);
    // The east photograph shows a landing reached from either side; the
    // stone face and openwork parapet below the entrance stay visible head-on.
    k.box(stone,0,.50,18.92,5.38,1.8,2.00);k.box(brick,0,1.42,18.92,5.42,.10,2.06);
    for(const s of [-1,1]){
      for(let i=0;i<8;i++)k.box(brick,s*(5.43-i*.365),(i+1)*.089,19,.38,(i+1)*.178,1.85);
      A.strut(T,k,light,s*2.64,2.48,19.95,s*5.64,1.11,19.95,.10);
      for(let i=0;i<7;i++){
        const t=i/6;k.box(gold,s*(2.69+t*2.87),1.89-1.34*t,19.95,.095,1.07,.13);
      }
      for(let i=0;i<4;i++)k.box(brick,0,1.46+(i+1)*.076,s*(15.7-i*.33),2.9,(i+1)*.152,.34);
    }
    k.box(ochre,0,4.98,-.35,9.15,5.83,18.9);
    for(const side of [-1,1]){
      for(let i=0;i<5;i++){
        const z=(i-2)*3.6;
        k.box(gold,side*4.61,4.64,z,.18,3.25,1.56);k.box(wood,side*4.72,4.66,z,.08,2.87,1.34);
        for(let j=0;j<3;j++)k.box(ochre,side*4.78,4.65,z+(j-1)*.36,.06,2.64,.045);
      }
      for(const x of [-2,2]){
        k.box(gold,x,4.23,side*9.86,2.05,4.35,.18);k.box(wood,x,4.14,side*9.99,1.70,4.05,.09);
      }
      for(const x of [-5.875,-3.525,-1.175,1.175,3.525,5.875]){
        k.stamp(k.round,light,x,5.04,side*11.64,.30,6,.30);
        k.box(gold,x,2.36,side*11.64,.76,.58,.76);k.box(gold,x,7.80,side*11.64,.80,.37,.70);
      }
      // Arcades run from post to post; their openings reveal the recessed walls.
      function arch(width,z){
        const r=width*.5-.20,bottom=3.9,top=7.72,spring=5.8;
        const outline=[[-width/2,top],[-width/2,bottom],[-r,bottom],[-r,spring]];
        for(let j=0;j<=14;j++){const a=Math.PI-j*Math.PI/14;outline.push([r*Math.cos(a),spring+r*Math.sin(a)]);}
        outline.push([r,bottom],[width/2,bottom],[width/2,top]);k.outline(outline,light,0,0,z-.11,.22);
      }
      for(let i=0;i<5;i++)k.place((i-2)*2.35,side*11.4,0,()=>arch(2.35,0));
      for(let j=0;j<6;j++)k.place(side*5.89,(j-2.5)*3.87,Math.PI/2,()=>arch(3.85,0));
      for(let j=0;j<5;j++)k.box(light,side*5.89,4.08,(j-2)*3.87,.42,4.06,.43);
    }
    roof(T,k);panels(T,k);
  }
  function terraceGate(T,k){
    const face=17.9;
    for(const sign of [-1,1]){
      const x=sign*2.05;
      k.box(light,x,3.03,face,.54,3.17,.44);
      for(const [y,w,h] of [[1.66,.73,.29],[2.12,.65,.16],[4.28,.68,.18],[4.57,.78,.15]]){
        k.box(gold,x,y,face,w,h,.53);
      }
      turned(T,k,light,x,4.66,face,[[.29,0],[.35,.07],[.29,.15],[.20,.22],[.15,.31],[0,.52]]);
    }
    function scroll(points,r){
      const path=new T.CatmullRomCurve3(points.map(([x,y])=>new T.Vector3(x,y,face+.025)));
      const g=new T.TubeGeometry(path,points.length*3,r,6,false);k.stamp(g,light,0,0,0);g.dispose();
    }
    k.box(gold,0,4.42,face,4.74,.14,.38);
    k.box(light,0,2.54,19.94,5.57,.14,.19);
    for(let j=-2;j<=2;j++){
      k.box(light,j*1.06,1.97,19.94,.13,1.03,.16);
      for(const s of [-1,1])A.strut(T,k,light,j*1.06,1.65,19.94,j*1.06+s*.50,2.36,19.94,.076);
    }
    for(const s of [-1,1]){
      scroll([[s*2.36,4.51],[s*2.19,4.79],[s*1.85,4.97],[s*1.58,4.89],[s*1.41,4.73],[s*1.0,5.1],[s*.51,5.17],[0,5.23]],.12);
      scroll([[s*1.55,4.48],[s*1.14,4.8],[s*.72,4.91],[s*.62,4.74],[s*.74,4.67],[s*.80,4.73]],.083);
    }
    turned(T,k,light,0,5.01,face,[[.16,0],[.20,.12],[.16,.23],[.10,.31],[0,.53]]);
  }
  function garden(T,k){
    const trees=createTreeModels(T),records=[],palms=[],pose=new T.Object3D(),rand=i=>{
      const d=Math.sin(i*63.092+2.71)*57832.9;return d-Math.floor(d);};
    // Plant the outer grove beyond the moat; preserve the crossing and leave
    // the open paved approach east of the temple clear.
    for(let i=0;i<285;i++){
      const x=-69+181*rand(i+2),z=-111+187*rand(i+989);
      if(x>-35&&x<65&&z>-76&&z<55||x>6&&x<23&&z<-57&&z>-93||z>36&&Math.abs(x-19.2)<7)continue;
      if(z>45&&z<67&&x> -14&&x<13)continue;
      if(x>74&&z>0)continue; // The grove at Ao Bà Om takes over to the north.
      records.push([x,z,16+14*rand(i+323),10+8*rand(i+770),rand(i+155)*6.28,false]);
    }
    for(const side of [-1,1])for(const [i,z] of [55.6,63.3,70.1,76.8].entries()){
      records.push([19.2+side*(5.0+rand(i+side)*1.3),z,18+rand(i+49)*5,7+rand(i+9)*2.4,rand(i+side)*6.28,false]);
    }
    for(const [x,z,h] of [[-12.8,8.8,5.2],[-14,14.2,4.4],[12.85,13.2,4.8],[13.7,-3.5,5.1],
      [-16.4,-5.7,6.6],[16.4,4.1,5.4],[-22.2,21.7,6.5],[21.1,18,5.7]]){
      palms.push([x,z,h,h*.82,rand(h)*6.28,false]);
    }
    for(const [x,z,s] of [[-3.0,21.6,1.2],[3.3,21.5,1.35],[-7.0,18.9,.94],[7.1,19.3,.86],[-12.8,15.1,1.2],[12.8,16.1,.88]]){
      turned(T,k,0xa46952,x,.06,z,[[.42*s,0],[.51*s,.14],[.68*s,.56],[.73*s,.62],[.72*s,.71],[.59*s,.72]]);
      records.push([x,z,1.67*s,1.48*s,rand(x+z)*6.28,true]);
    }
    const batches=[];
    for(const [kind,rows] of [['tree',records],['palm',palms]])for(let v=0;v<4;v++){
      const local=rows.filter((_,i)=>i%4===v);
      const near=[],far=[];
      for(const r of local){
        (kind==='palm'||r[5]||Math.min(Math.hypot(r[0],r[1]-24),Math.hypot(r[0]-13,r[1]+68))<33?near:far).push(r);
      }
      for(const [subset,scan] of [[near,true],[far,false]]){
        if(!subset.length)continue;
        const mesh=new T.InstancedMesh(scan?trees.geometry(kind,true,v):trees.distantGeometry(kind,v),
          scan?(kind==='palm'?trees.palmMaterial:trees.material):trees.billboardMaterial(),subset.length);
        mesh.receiveShadow=true;mesh.castShadow=scan;k.group.add(mesh);batches.push([mesh,subset]);
      }
    }
    return ground=>{
      for(const [mesh,rows] of batches){
        rows.forEach(([x,z,h,w,a,potted],i)=>{
          pose.position.set(x,potted?.67:ground(x,z),z);pose.rotation.y=a;pose.scale.set(w,h,w);
          pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
        });
        mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
      }
    };
  }
  function precinct(T,k){
    const roofRows=[[42.5,5.5,10,34],[43,-35,9.8,31],[38,-46,19,8.2],[27.5,-18,8.7,24],[22,4.4,8.4,29],
      [-1,-51,20,8],[-1.8,-34.5,17,7.2],[-17.5,-39,6,41]];
    for(const [x,z,w,d] of roofRows)k.place(x,z,0,()=>{
      k.box(0xc2a078,0,1.94,0,w,4.70,d);A.gabledRoof(T,k,0,4.25,0,w,d,Math.min(w,d)*.27,clay,ochre,{alongX:w>d,thick:.13});
      const along=w>d,n=Math.max(2,Math.floor(Math.max(w,d)/3.6));
      for(let j=0;j<n;j++)for(const s of [-1,1]){
        const t=(j+.5)/n-.5;k.box(wood,along?t*w:s*(w/2+.02),2.34,along?s*(d/2+.02):t*d,along?1.05:.055,1.48,along?.055:1.05);
      }
    });
    // A short pedestrian crossing and its two masonry parapets span the west moat.
    k.box(0xaaa28b,13.5,.14,-66.85,2.50,.41,14.0);
    for(const side of [-1,1]){
      const x=13.5+side*1.17;k.box(0xd1b687,x,.56,-66.85,.16,.85,14.0);
      k.box(ochre,x,1.04,-66.85,.21,.13,14.05);
      const z=-66.85+side*6.35;k.box(stone,13.5,-.48,z,2.59,1.55,.77);
    }
    for(const [x,z,s] of [[-9.1,12.7,.92],[-8.7,7.3,1],[9.6,12.9,.83]]){
      k.box(ochre,x,1.72,z,1.36,.53,1.36);
      turned(T,k,light,x,1.98,z,[[.66,0],[.69,.17],[.54,.32],[.53,.56],[.39,.78],[.43,.92],
        [.33,1.18],[.31,1.43],[.22,1.59],[.24,1.70],[.16,1.83],[.11,2.19*s],[.13,2.32*s],[0,2.89*s]]);
    }
  }
  function gateCarvings(T,k){
    const pts=[],uv=[];
    function panel(x,y,z,w,h,l,t,r,b,mirror=false){
      const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
      for(const i of [0,1,2,0,2,3]){
        const [u,v]=corners[i];pts.push(x+w*u,y+h*v,z);
        uv.push(((u<0)!==mirror?l:r)/740,1-(v<0?b:t)/370);
      }
    }
    for(const side of [-1,1]){
      const z=side*.45;
      panel(0,6.54,z,9.82,2.71,2,1,738,203,side<0);
      panel(0,4.87,z,3.96,.78,2,208,348,280,side<0);
      for(const s of [-1,1]){
        panel(s*2.26,4.18,side*.53,1.06,2.05,359,205,441,365,s>0);
        panel(s*4.32,4.20,side*.53,.86,2.01,454,205,522,365,s>0);
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();
    const map=new T.TextureLoader().load('sight-imagery/chua-ang-cong-dong.webp');map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
    const mesh=new T.Mesh(g,new T.MeshStandardMaterial({map,alphaTest:.48,side:T.DoubleSide,roughness:.88}));
    mesh.name='Ba mảng chạm và bảng tên ở cổng chùa';mesh.castShadow=mesh.receiveShadow=true;k.group.add(mesh);
  }
  function eastGate(T,k){
    const paint=0xdfc486;
    for(const s of [-1,1]){
      k.box(paint,s*2.27,2.31,0,.65,5.04,.83);
      k.box(paint,s*4.25,2.37,0,.59,5.15,.84);
      const span=2.1,spring=3.57,r=.73;
      const wall=[[-span/2,5.23],[-span/2,-.18],[-r,-.18],[-r,spring]];
      for(let j=0;j<=18;j++){const theta=pi*j/18;wall.push([-r*Math.cos(theta),spring+r*Math.sin(theta)]);}
      wall.push([r,-.18],[span/2,-.18],[span/2,5.23]);
      k.outline(wall,paint,s*3.31,0,-.39,.78);
      k.box(0xb29c66,s*3.31,1.69,-.02,1.42,.07,.10);
      k.box(0xa89872,s*3.31,.54,-.02,1.37,.85,.10);
      for(let j=-3;j<=3;j++)k.box(0xb9aa84,s*3.31+j*.188,2.00,0,.032,2.46,.068);
      for(const y of [.16,3.18])k.box(0xb7a06b,s*3.31,y,0,1.46,.073,.11);
      k.outline([[0,0],[.43,0],[.43,.42],[.15,.31]],paint,s*1.57,4.20,-.38,.76,s<0?pi:0);
      k.box(paint,s*9.82,.60,-.22,10.55,1.38,.51);
      k.box(light,s*9.82,2.29,-.22,10.62,.17,.64);
      for(let j=0;j<10;j++){
        const x=s*(5.01+j*1.05);
        for(const side of [-1,1]){
          const swash=new T.CatmullRomCurve3([[0,1.34],[side*.32,1.42],[side*.36,1.63],[side*.21,1.78],[0,1.83],[side*.29,2.02],[side*.43,2.19]]
            .map(([u,y])=>new T.Vector3(x+u,y,-.22)));
          const g=new T.TubeGeometry(swash,14,.059,6,false);k.stamp(g,paint,0,0,0);g.dispose();
        }
      }
      for(let j=0;j<6;j++){
        const x=s*(4.96+j*1.87);k.box(paint,x,1.22,.05,.25,2.62,.62);
        k.box(light,x,2.54,.05,.38,.15,.73);
      }
    }
    k.box(paint,0,4.90,0,9.12,.78,.83);
    k.box(ochre,0,5.29,0,9.84,.16,.99);gateCarvings(T,k);
  }
  function balusters(T,k,x,z,length,angle,h){
    k.place(x,z,angle,()=>{
      k.box(ochre,0,.18,0,length,.38,.32);k.box(gold,0,h,0,length,.13,.29);
      const count=Math.ceil(length/.52),step=length/count;
      for(let j=0;j<count;j++){
        turned(T,k,light,-length/2+(j+.5)*step,.32,0,[[.071,0],[.11,.07],[.074,.15],[.055,.21],[.093,.32],[.079,.40],[.068,h-.34]]);
      }
    });
  }
  function relicTower(T,k){
    const yellow=0xeac674,edge=0xd9b15e;
    const oval=new T.SphereGeometry(1,10,8);
    function tier(x,z,y,w,d,h,tint){
      k.box(tint,x,y+h/2,z,w,h,d);return y+h;
    }
    function pinnacle(x,y,z,s){
      const tiers=[[1.12,.21],[1.02,.13],[.95,.48],[1.01,.13],[.93,.11]];
      const start=y;
      for(const [w,h] of tiers)y=tier(x,z,y,w*s,w*s,h*s,yellow);
      for(const front of [-1,1]){
        const pz=z+front*.478*s;k.box(edge,x,start+.58*s,pz,.68*s,.39*s,.031);
        for(let j=0;j<8;j++){const a=j*pi/4;
          k.stamp(oval,light,x+.108*s*Math.sin(a),start+(.58+.108*Math.cos(a))*s,pz+front*.032,.044*s,.084*s,.016,0,0,-a);}
      }
      turned(T,k,gold,x,y,z,[[.48,0],[.54,.10],[.48,.17],[.50,.25],[.43,.32],[.45,.39],[.36,.49],[.37,.55],[.29,.73],
        [.32,.80],[.26,.87],[.23,1.12],[.20,1.19],[.15,1.33],[.17,1.40],[.10,1.59],[.070,1.89],[.082,1.98],[0,2.19]].map(([r,h])=>[r*s,h*s]));
      for(const [rad,h] of [[.51,.11],[.47,.26],[.41,.40],[.35,.56],[.28,.81]])turned(T,k,ochre,x,y+h*s,z,[[rad*s,0],[rad*s,.045*s]]);
    }
    k.place(3.16,31.81,0,()=>{
      tier(0,0,-.29,8.10,7.5,.55,edge);tier(0,0,.26,7.80,7.27,.35,yellow);
      tier(0,0,.61,6.96,6.55,.27,edge);tier(0,0,.88,5.29,4.55,2.58,yellow);
      tier(0,0,3.46,5.61,4.83,.16,edge);tier(0,0,3.62,5.84,4.99,.19,yellow);
      for(const s of [-1,1]){
        // Two seated guardians flank the reliquary in the frontal photograph.
        k.place(s*3.03,2.03,s*.30,()=>{
          k.stamp(oval,ochre,0,1.22,-.08,.22,.34,.34);k.stamp(oval,gold,0,1.51,.13,.19,.36,.19,0,.12);
          k.stamp(oval,gold,0,1.85,.20,.20,.23,.20);k.stamp(oval,light,0,1.82,.369,.145,.093,.13);
          for(const side of [-1,1]){
            k.tapered(ochre,side*.13,2.03,.13,.080,.016,.16,1,8);
            k.stamp(oval,gold,side*.11,1.17,.20,.067,.28,.08);
            k.stamp(oval,gold,side*.12,.953,.24,.082,.06,.13);
          }
        });
        for(const x of [-.73,.73]){
          k.box(edge,x,2.42,s*2.292,.72,.65,.07);
          for(let j=0;j<8;j++){
            const a=j*pi/4;k.box(wood,x+.142*Math.sin(a),2.42+.142*Math.cos(a),s*2.338,.060,.15,.02,0,0,-a);
          }
        }
        for(const x of [-1.87,1.87])pinnacle(x,3.81,s*1.66,1.10);
      }
      pinnacle(0,3.81,0,1.63);
    });
    k.place(11.82,32.72,0,()=>{
      tier(0,0,-.28,3.09,3.06,.55,edge);tier(0,0,.27,2.75,2.72,.29,yellow);
      tier(0,0,.56,2.29,2.26,2.14,yellow);
      k.box(edge,0,1.63,1.17,1.24,1.56,.09);
      k.box(0xb9a06e,0,1.64,1.226,1.03,1.34,.035);
      pinnacle(0,2.7,0,1.32);
    });
    oval.dispose();
  }
  function easternBank(T,k){
    // The sloping masonry meets the water at the photographed bank toes.
    // Leave the opening of the stair and the approach to the east crossing clear.
    function slope(points,inward){
      const pos=[],tri=(a,b,c)=>pos.push(...a,...b,...c,...c,...b,...a);
      for(let i=1;i<points.length;i++){
        const [x,z]=points[i-1],[u,v]=points[i];
        const a=[x,.26,z],b=[u,.26,v],c=[u,-1.21,v+inward*1.12],d=[x,-1.21,z+inward*1.12];
        tri(a,b,c);tri(a,c,d);
        k.box(0xc9b792,(x+u)/2,.26,(z+v)/2,Math.hypot(u-x,v-z),.18,.31,-Math.atan2(v-z,u-x));
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();
      k.stamp(g,stone,0,0,0);g.dispose();
    }
    slope([[-13.4,35.5],[-9,37.0],[-2,38.3],[6.3,38.8]],1);
    slope([[7.95,38.9],[13.25,38.56],[17.05,38.23]],1);
    slope([[-13.4,50.6],[-8.3,51.42],[.7,52.65],[9.6,53.03],[16.95,52.90]],-1);
    for(let j=0;j<7;j++)k.box(0x9f9580,7.12,.22-.179*j,38.82+j*.29,1.66,.23,.32);
  }
  function easternApproach(T,k){
    relicTower(T,k);easternBank(T,k);
    // The east crossing reaches the straight walk between the two rows of sao.
    // Both ramps are anchored on the banks; the bridge stays above the water.
    const walk=k.vertexCount();
    for(let i=0;i<19;i++)k.box(0xb0a58f,19.24,.062,36.3+i*2.65,4.05,.31,2.67);
    for(const s of [-1,1]){
      const x=19.24+s*2.03;
      k.box(0xa0755b,x,.22,46.0,.25,.49,15.4);
      k.box(0xa38f76,x,1.18,46.0,.13,.11,15.4);
      for(let j=0;j<=12;j++){
        k.box(j%3===0?ochre:wood,x,.71,38.42+j*1.26,j%3===0?.21:.074,1.13,.11);
      }
    }
    const gate=k.vertexCount(),firstChild=k.group.children.length;
    k.place(19.24,79.18,0,()=>eastGate(T,k));
    const end=k.vertexCount(),carvings=k.group.children.slice(firstChild);
    // The decorated railing follows the east edge of the relic court.
    balusters(T,k,1.1,37.42,26.8,-.035,1.00);
    for(const x of [-10.2,-2.9,6.4,14.05]){
      k.box(ochre,x,.18,37.0,.59,.36,.59);
      turned(T,k,edgeGold,x,.33,37.0,[[.20,0],[.21,.14],[.15,.29],[.14,1.80],[.19,1.95],[.26,2.03],[.29,2.35],[.20,2.53],[.07,2.71],[0,2.89]]);
    }
    let geom,rest;
    return ground=>{
      geom??=k.group.children.find(m=>m.geometry?.hasAttribute('finishKind'))?.geometry;if(!geom)return;
      const a=geom.attributes.position;rest??=Float32Array.from({length:end-walk},(_,i)=>a.getY(i+walk));
      const near=ground(19.24,37.0),far=ground(19.24,55.0),entry=ground(19.24,79.18);
      for(let i=walk;i<end;i++){
        const z=a.getZ(i),blend=Math.max(0,Math.min(1,(z-37)/18));
        const rise=i>=gate?entry:(z>55?ground(19.24,z):near+(far-near)*blend);
        a.setY(i,rest[i-walk]+rise);
      }
      for(const m of carvings)m.position.y=entry;
      views[5].height=(3.75+entry)/.46;a.needsUpdate=true;geom.computeBoundingBox();geom.computeBoundingSphere();
    };
  }
  const pi=Math.PI,edgeGold=0xc4a057;
  (window.VietnamSights??=[]).push({...original,id,catalogId,lon,lat,yaw,start,name:'Chùa Âng – chánh điện và hào nước',city:'Nguyệt Hóa',locality:'Trà Vinh',
    province:'Vĩnh Long',formerProvince:'Trà Vinh',region:'Nam Bộ',kind:'Chùa',source,photo:photo(25293197),visitOnArrival:true,mappedEntrance:true,
    width:24,depth:36,views,gardenRadius:4,boundary:[[-29,-73],[55,-71],[52,51],[29,54],[29,81],[9,81],[9,55],[-29,48]],solids:[[0,0,12,18]],
    reserve:(x,z,r)=>x>-30-r&&x<55+r&&z>-74-r&&z<54+r||Math.abs(x-19.24)<9+r&&z>=50-r&&z<81+r,
    description:'Chùa Âng (Wat Angkor Raig Borei) ở phường Nguyệt Hóa là di tích kiến trúc nghệ thuật quốc gia. Chánh điện quay về phía đông, mang hình thức kiến trúc từ năm 1842. Hai bậc nền và hàng rào theo số đo trong hồ sơ di tích. Đường hào, cao độ sân, mái và vị trí các nhà phụ là phần phục dựng.',
    arrivalNote:'Xe dừng trên đường phía đông khu chùa. Các góc ngắm đi bộ dẫn qua hào và lên sân chánh điện.',
    build(T,k){hall(T,k);terraceGate(T,k);precinct(T,k);const approach=easternApproach(T,k),trees=garden(T,k);
      k.group.userData.fitGround=ground=>{approach(ground);trees(ground);};}});
})();
