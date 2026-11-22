'use strict';
(() => {
  const sites=window.VietnamSights??=[];
  const granite=0x797b77,slate=0x545c59,cream=0xd8ccae,sand=0xb3a38c,rose=0xa56e59;
  const bronze=0x896844,patina=0x71573f,bronzeLight=0x9e8057,leaf=0x566c40;
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
  function finishes(k){k.palette({stone:[granite,slate,cream,sand,rose,0x8d857c,0x555653,0xa6a29a],
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
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const u=i/cols,t=j/rows,x=-2.84+u*5.45;
      const bottom=10.64+.43*Math.cos(2*Math.PI*u+.55)+1.32*u;
      const top=11.93+3.64*u**1.38+.62*u**4;
      const z=.25+.63*Math.sin(Math.PI*u)*Math.sin(1.22*Math.PI*(t+.24*u))+.21*Math.sin(u*9.2-t*1.5);
      v.push(x,bottom+(top-bottom)*t,z);
      if(i<cols&&j<rows){const a=j*(cols+1)+i,b=a+cols+1;ix.push(a,a+1,b,b,a+1,b+1);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();
    k.stamp(g,bronze,0,0,0);
    for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];
    g.setIndex(ix);g.computeVertexNormals();k.stamp(g,patina,0,0,-.075);g.dispose();
    CentralArch.strut(T,k,bronzeLight,2.59,8.45,.19,2.59,16.2,.19,.108);
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
      CentralArch.statueFigure(T,k,bronze,-1.70,3.62,.22,6.83,{yaw:-.55,jacket:true,stepUp:.055,
        rightArm:[[-.18,.76,.08],[-.24,.92,.14],[-.24,.96,.15]],
        leftArm:[[.10,.695,.14],[-.11,.74,.21],[-.17,.77,.21]]});
      hat(T,k,-1.70,3.62+6.83*.966,.21,.46,patina);
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
      CentralArch.statueFigure(T,k,bronze,1.25,3.61,.52,7.35,{yaw:.44,jacket:true,stepUp:.035,
        rightArm:[[-.04,.93,.13],[.10,1.16,.13],[.16,1.22,.11]],
        leftArm:[[.185,.72,.06],[.19,.91,.06],[.18,.95,.055]]});
      hat(T,k,1.25,10.71,.49,.47,patina);
      CentralArch.statueFigure(T,k,patina,.03,3.61,-1.0,6.96,{yaw:Math.PI+.21,jacket:true,stepUp:.07,
        rightArm:[[-.18,.66,.085],[-.06,.57,.15]],leftArm:[[.19,.70,.052],[.17,.87,.10]]});
      hat(T,k,.03,10.35,-.98,.44,patina);bronzeFlag(T,k);
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
        for(let row=0;row<2;row++){
          const dx=row?.52:-.42,dy=.96+row*2.12+.24*Math.sin(j*.60+row);
          const walk=Math.sin(j*1.14+row)*.23;
          k.outline([[-.42,0],[-.20,.54],[-.10,.92],[-.34,1.26],[-.21,1.40],[-.04,1.35],
            [.03,1.62],[.19,1.72],[.34,1.63],[.35,1.45],[.20,1.34],[.45,1.11],[.71,1.29],
            [.79,1.24],[.46,.95],[.20,1.02],[.17,.65],[.28+walk,.37],[.46+walk,0],[.24+walk,0],
            [-.02,.53],[-.18,.30],[-.21,.02]],light,dx,dy,.20,.11);
        }
        if(j%4===2){
          for(const dx of [-.51,.50])k.stamp(rim,light,dx,1.13,.39,.72,.72,.56);
          for(const [p,q] of [[[-.50,1.13],[0,1.60]],[[0,1.60],[.50,1.13]],[[0,1.60],[-.01,1.12]]])
            CentralArch.strut(T,k,light,p[0],p[1],.39,q[0],q[1],.39,.040);
        }
        k.outline([[-.99,0],[-.55,.38],[-.17,.34],[.30,.72],[.56,.62],[1,.83],[1,.70],[.56,.49],[.30,.57],[-.17,.20],[-.55,.24],[-.99,-.11]],
          light,0,4.72+.49*Math.sin(j*.66),.21,.082);
      });
    }
    rim.dispose();
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
    const runs=[[0,35,64],[35,40,0],[40,118,128],[118,130,0],[130,164,64],[164,170,0],[170,199,64]];
    const cross=m=>10.7+.011*m,along=m=>-11.1-m;
    // Each tread takes its own terrain elevation. The flat landings retain
    // their surveyed lengths even on the coarser driving relief mesh.
    for(const [lo,hi,count] of runs){
      const steps=count||1,run=(hi-lo)/steps;
      for(let i=0;i<steps;i++){
        const m=lo+(i+.5)*run,x=cross(m),z=along(m);
        const level=g=>Math.max(g(x,z),g(x-6.3,z),g(x+6.3,z))+.16;
        f.fixture(level,()=>{
          k.box(rose,x,-.29,z,9.14,.60,run+.028);
          for(const s of [-1,1])k.box(granite,x+s*5.49,-.29,z,1.84,.60,run+.028);
          if(count&&i%4===0)k.box(0x8d857c,x,.018,z+run*.45,9.10,.032,.038);
        });
      }
    }
    // Twenty-eight pairs of small stone markers line the public ascent.
    for(let j=0;j<28;j++)for(const s of [-1,1]){
      const m=2+j*7.19,x=cross(m)+s*7.06,z=along(m);
      f.fixture(g=>g(x,z),()=>{
        k.box(slate,x,.14,z,.74,.28,.75);
        k.box(cream,x,.89,z,.48,1.28,.50);
        k.outline([[-.23,0],[-.27,.38],[-.40,.58],[-.43,.90],[-.18,.66],[.05,.45],[.26,.34],[.22,0]],
          cream,x,1.42,z-.22,.46,s<0?0:Math.PI);
      });
    }
  }
  add('san-hanh-le-doi-d1','5492241221','Sân hành lễ và trục bậc đồi D1',103.016610,21.392356,
    [103.016674,21.392736],stairYaw,52,235,{
      source:provincial,photo:'https://www.qdnd.vn/quoc-phong-an-ninh/chien-thang-dien-bien-phu-moc-son-lich-su/dien-bien-hom-nay/tuong-dai-chien-thang-dien-bien-phu-diem-den-cua-chien-thang-va-hoa-binh-771459',
      description:'Từ sân lễ dưới chân đồi, 320 bậc đá và ba chiếu nghỉ dẫn lên tượng đài. Phía nam sân là bức phù điêu đá xanh dài 58 m. Hai hàng cột nhỏ men theo lối lên.',
      gardenRadius:22,boundary:[[3,-17],[47,-17],[47,38],[3,38]],solids:[[44,10,1.1,27]],
      views:[view('Phù điêu đá xanh ở sân hành lễ',8.8,44,stairYaw-Math.PI/2-.14,.11,local(stairYaw,43,10)),
        view('Trục bậc nhìn về đỉnh D1',5.4,32,stairYaw+.05,.09,local(stairYaw,11.3,-34),49),
        view('Chiếu nghỉ và cột mốc đá',5.1,20,stairYaw+.49,.17,local(stairYaw,12,-135))]},ceremonial);

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
            k.box(0x8d857c,x,.12,z,1.53,.25,2.34);
            k.box(sand,x,.315,z,1.37,.15,2.19);
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
    f.building(0,22.2,0,26.7,23.9,()=>k.box(granite,0,.11,0,26.7,.22,23.9));
    for(let j=0;j<28;j++){
      const z=35.64+j*3.67;
      f.fixture(g=>g(0,z)+.05,()=>k.box(0xa6a29a,0,-.13,z,5.18,.32,3.70));
    }
    for(let j=0;j<12;j++){
      const z=39.9+j*7.6;
      for(const s of [-1,1]){
        const x=s*3.59;
        f.fixture(g=>g(x,z),()=>{
          k.box(0x5d764b,x,.30,z,.70,.60,7.58);
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
  }
  add('nghia-trang-liet-si-a1','4411037089','Nghĩa trang liệt sĩ quốc gia A1',103.018328,21.381026,
    [103.018595,21.381007],cemeteryYaw,122,192,{
      source:'https://svhttdl.dienbien.gov.vn/ditich/pages/2013/Cac-cong-trinh-the-hien-truyen-thong-va-dao-ly-Uon-8734.aspx',
      photo:'https://nvsk.vnanet.vn/nghia-trang-liet-sy-a1-nhan-chung-lich-su-ve-tinh-than-quat-cuong-cua-dan-toc-1-145620.vna',
      description:'Qua cổng đá và gác chuông phía tây, lối đi giữa hai hàng cây dẫn tới nhà tưởng niệm hình chữ A. Những ngôi sao nhỏ trên hai cánh tường gợi nhớ 644 liệt sĩ yên nghỉ tại đây.',
      gardenRadius:53,modeledBuildings:['w1334668993'],boundary:[[-61,-26],[61,-26],[61,149],[-61,149]],
      solids:[[0,0,14,6],[-7,139,4,3.1],[7,139,4,3.1],[-33.6,141.1,23,3.3],[33.6,141.1,23,3.3],[-55,107.9,7.35,12.50]],
      views:[view('Nhà tưởng niệm hình chữ A',13.9,38,cemeteryYaw+.09,.09,local(cemeteryYaw,0,3.6),54),
        view('Cổng đá và gác chuông phía tây',13.8,37.5,cemeteryYaw-.20,.13,local(cemeteryYaw,0,139)),
        view('Lối giữa những hàng mộ',6.1,36,cemeteryYaw-.04,.16,local(cemeteryYaw,0,78)),
        view('Hai cánh tường sao của nhà tưởng niệm',15.0,16.5,cemeteryYaw+.61,.09,local(cemeteryYaw,1.75,2.95),54)]},cemetery);
})();
