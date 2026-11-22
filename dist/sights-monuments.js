'use strict';
(window.VietnamSights??=[]).push({
  id:'lung-cu',name:'Cột cờ Lũng Cú',city:'Lũng Cú',lon:105.316333,lat:23.363457,start:[105.31619,23.36254],
  width:19,depth:19,yaw:-.14,map:'https://www.openstreetmap.org/way/504649258',
  photo:'https://tgroup.vn/tours/tour-ha-giang-kham-pha-quan-ba-dong-van-lung-cu-ngoi-thuyen-tren-song-nho-que-chiem-nguong-hem-vuc-tu-san',
  source:'https://worldmatetravel.com/travel-guide/lung-cu-flag-tower-vietnam%E2%80%99s-northernmost-symbol-of-national-pride',
  build(T,{stamp,box,round,tapered,wavingFlag}){
    const grey=0xb0ac9e,slate=0x746f67,bronze=0x8a6751;
    for(let i=0;i<4;i++)tapered(i%2?grey:slate,0,.26+i*.35,0,10.6-i*.48,10.6-i*.48,.36,1,8);
    tapered(slate,0,2.05,0,8.65,8.15,1.5,1,8);
    tapered(bronze,0,4.65,0,8.12,4.89,3.8,1,8);
    tapered(0x84766b,0,7.28,0,4.96,4.3,1.55,1,8);
    tapered(grey,0,14.88,0,3.48,3.25,13.8,1,8);
    for(const [y,r,h] of [[8.05,3.72,.35],[21.89,3.6,.55],[22.45,4.13,.55],[22.88,4.38,.35]])tapered(slate,0,y,0,r,r,h,1,8);
    for(let side=0;side<8;side++){
      const a=(side+.5)*Math.PI/4,s=Math.sin(a),c=Math.cos(a);
      box(0x706f69,s*3.08,14.9,c*3.08,.65,11.83,.15,a);
      const medallion=new T.TorusGeometry(.75,.092,6,24);
      stamp(medallion,0xc6a98b,s*6.52,4.53,c*6.52,1,1,1,a,-.64);medallion.dispose();
      for(let i=-1;i<=1;i++){
        const t=i*1.04;
        box(grey,s*3.96+c*t,23.42,c*3.96-s*t,.12,1.13,.13,a);
      }
      box(slate,s*3.96,23.98,c*3.96,3.3,.13,.13,a);
    }
    stamp(round,0xa7a498,0,28.4,0,.17,11,.17);
    wavingFlag(9,6,.16,33.84,0);
  }
},{
  id:'thap-doi',name:'Tháp Đôi',city:'Quy Nhơn',lon:109.211083,lat:13.786253,start:[109.210773,13.786349],width:24,depth:13,yaw:Math.PI/2,
  map:'https://www.openstreetmap.org/node/1534828632',photo:'https://benthanhtourist.com/tour/du-lich-quy-nhon-ky-co-eo-gio-bao-tang-quang-trung',
  source:'https://dulichquynhon.binhdinh.gov.vn/en/thapdoiquynhon',
  solids:[[-6.3,0,4.35,4.65],[6,0,4.75,5]],
  build(T,{box,outline,tapered,random}){
    function tower(x,w,h,aged){
      const clay=aged?0x9a5c43:0xa65a3c,trim=0x964a31,dark=0x694635;
      for(let j=0;j<4;j++)box(j%2?trim:clay,x,j*.24+.12,0,w+1.2-j*.24,.25,w+1.3-j*.24);
      box(clay,x,h*.335,0,w,h*.59,w);
      for(let face=0;face<4;face++){
        const a=face*Math.PI/2,s=Math.sin(a),c=Math.cos(a);
        for(const t of [-.43,-.33,.33,.43])box(trim,x+c*w*t+s*w*.5,h*.34,-s*w*t+c*w*.5,w*.065,h*.54,.42,a);
        const z=w*.51,door=w*.23,base=1.02,high=h*.32;
        outline([[-door*.83,0],[-door*.83,high*.77],[0,high*1.39],[door*.83,high*.77],[door*.83,0]],trim,x+s*z,base,c*z,.32,a);
        outline([[-door*.54,0],[-door*.54,high*.68],[0,high*1.07],[door*.54,high*.68],[door*.54,0]],face?dark:0x342d28,x+s*(z+.36),base,c*(z+.36),.09,a);
      }
      for(let tier=0;tier<8;tier++){
        const level=h*(.63+tier*.043),size=w*(1.08-tier*.068);
        box(tier%2?clay:trim,x,level,0,size,h*.046,size);
        for(let j=0;j<5;j++){
          const off=(j-2)*size*.18;
          for(const side of [-1,1]){
            box(j%2===0?dark:clay,x+off,level+h*.017,side*size*.5,size*.095,h*.028,.25);
            box(clay,x+side*size*.5,level+h*.009,off,.26,h*.036,size*.11);
          }
        }
        if(tier===0||tier===2)for(const dx of [-1,1])for(const dz of [-1,1]){
          tapered(0x8e8071,x+dx*size*.48,level+.52,dz*size*.48,.5,.14,1.12,1,6);
          for(const wing of [-1,1])box(0x9a8973,x+dx*size*.48+wing*.34,level+.61,dz*size*.49,.68,.16,.35,0,0,wing*.5);
        }
      }
      for(let i=0;i<34;i++){const ox=(random()-.5)*w*.52,oz=(random()-.5)*w*.52;box(i%3?0x836344:0x646437,x+ox,h*.964+random()*.15,oz,.4+random()*.58,.2+random()*.3,.6,random());}
      for(let j=0;j<7;j++)box(trim,x,.09*(7-j),w*.53+j*.32,w*.26,.18*(7-j),.38);
    }
    tower(-6.3,8.7,18,true);tower(6,9.45,20,false);
  }
},{
  id:'tam-quan-rach-gia',name:'Cổng Tam Quan',city:'Rạch Giá',lon:105.091878,lat:9.997803,start:[105.09217,9.99742],width:21.6,depth:3.1,yaw:.645,
  map:'https://www.openstreetmap.org/node/5563291701',photo:'https://mia.vn/cam-nang-du-lich/du-lich-rach-gia-12808',
  source:'https://dulich.petrotimes.vn/cong-lang-tam-quan-doc-dao-nhat-viet-nam-561919.html',
  solids:[[-10.27,0,.46,1.06],[-4.45,0,.60,1.12],[4.45,0,.60,1.12],[10.27,0,.46,1.06]],
  build(T,{box,profile,outline}){
    function span(x,w,spring,rise,depth){
      const half=w*.40,shape=new T.Shape();
      shape.moveTo(-w/2,0);shape.lineTo(-half,0);shape.lineTo(-half,spring);shape.absellipse(0,spring,half,rise,Math.PI,0,true,0);
      shape.lineTo(half,0);shape.lineTo(w/2,0);shape.lineTo(w/2,spring+.35);
      shape.bezierCurveTo(w/2,spring+rise+.92,w*.29,spring+rise+1.6,0,spring+rise+1.6);
      shape.bezierCurveTo(-w*.29,spring+rise+1.6,-w/2,spring+rise+.92,-w/2,spring+.35);shape.closePath();
      profile(shape,0xd89681,x,0,-depth/2,depth);
      for(const side of [-1,1]){
        const trim=new T.Shape(),a=spring,rad=half+.26;
        trim.moveTo(-rad,0);trim.lineTo(-rad,a);trim.absellipse(0,a,rad,rise+.24,Math.PI,0,true,0);
        trim.lineTo(rad,0);trim.lineTo(half,0);trim.lineTo(half,a);
        trim.absellipse(0,a,half,rise,0,Math.PI,false,0);trim.lineTo(-half,0);trim.closePath();
        profile(trim,0xb75e4e,x,0,side*(depth/2+.015),.035);
      }
      const y=spring+rise+1.32;
      for(let tier=0;tier<2;tier++){
        const roof=w*(.80-tier*.13),d=depth+1.15-tier*.35,level=y+tier*.88;
        box(0xd78f75,x,level+.31,0,roof*.84,.66,d*.73);
        for(const side of [-1,1]){
          box(0xab5340,x,level+.58,side*d*.27,roof,.17,d*.56,0,side*.32);
          for(let i=0;i<Math.round(roof*3);i++)box(0xc17a53,x-roof*.49+i*.33,level+.67,side*d*.27,.072,.095,d*.55,0,side*.32);
          for(const end of [-1,1])outline([[0,0],[end*.51,.11],[end*.74,.58],[end*.61,.03],[end*.22,-.12]],0xa55942,x+end*roof*.48,level+.47,side*d*.46,.11);
        }
        box(0x99523d,x,level+.88,0,roof*.94,.15,.24);
      }
    }
    span(0,9.9,2.25,3.55,2.05);span(-7.52,6.05,1.95,2.1,1.65);span(7.52,6.05,1.95,2.1,1.65);
  }
},{
  id:'duc-ba-hoa-binh-sai-gon',catalogId:'osm-node-2410639584',name:'Tượng Đức Bà Hòa Bình',
  city:'Thành phố Hồ Chí Minh',province:'Hồ Chí Minh',region:'Nam Bộ',kind:'Di tích',
  lon:106.699627,lat:10.779255,start:[106.699792,10.77943],yaw:.786,width:1.74,depth:1.74,
  solids:[[0,0,.82,.82]],gardenRadius:2,visitOnArrival:true,
  map:'https://www.openstreetmap.org/node/2410639584',
  source:'https://tgpsaigon.net/bai-viet/ky-niem-50-nam-cung-hien-vuong-cung-thanh-duong-chanh-toa-duc-ba-sai-gon-43841',
  photo:'https://thanhnien.vn/nha-tho-duc-ba-sai-gon-duoc-dat-ten-tu-buc-tuong-duc-me-hoa-binh-185230409113206155.htm',
  description:'Tượng bằng cẩm thạch trắng cao 4,6 mét, do G. Ciocchetti tạc. Đức Mẹ ngước nhìn lên, hai tay nâng quả địa cầu có thánh giá. Bệ trụ bằng đá hoa cương đỏ nằm trên trục chính của nhà thờ.',
  views:[{name:'Tượng và mặt tiền nhà thờ',height:8.7,viewAngle:.818,viewRadius:12.6,viewElevation:-.070,viewFov:48},
    {name:'Quả địa cầu và gương mặt',height:14.55,viewAngle:1.28,viewRadius:2.8,viewElevation:-.08,viewFov:46},
    {name:'Bảng đồng trên trụ đá đỏ',height:3.27,viewAngle:.79,viewRadius:2.37,viewElevation:.025,viewFov:46}],
  build(T,k){
    const marble=0xe2dfd4,veil=0xd5d2c7,fold=0xc6c3b6,granite=0x8e5f53,rim=0x986c5c,bronze=0x667565;
    const pedestal=2.74,sphere=new T.SphereGeometry(1,22,16);
    k.palette({stone:[granite,rim],metal:bronze});
    // The column, bronze collar and little projecting cornice can be seen
    // clearly in the frontal photograph. All figure heights are above the cornice.
    const column=[[.015,.85],[.13,.85],[.19,.80],[.37,.79],[.41,.72],[.50,.69],
      [1.98,.65],[2.06,.69],[2.14,.68],[2.40,.68],[2.45,.73],[2.53,.76],[2.62,.76],[2.69,.65],[pedestal,.62]];
    for(let i=1;i<column.length;i++){
      const [a,r0]=column[i-1],[b,r1]=column[i];
      k.tapered(i===9?bronze:i%3?granite:rim,0,(a+b)/2,0,r0,r1,b-a,1,40);
    }
    for(let i=0;i<32;i++){
      const a=i*Math.PI/16,x=Math.sin(a)*.672,z=Math.cos(a)*.672;
      k.stamp(sphere,0x7b8779,x,2.27,z,.048,.102,.041,a,0,(i%2?1:-1)*.52);
    }
    const plaque=new T.Group(),paint=document.createElement('canvas');
    paint.width=640;paint.height=340;
    const g=paint.getContext('2d');g.fillStyle='#615f53';g.fillRect(0,0,640,340);
    g.strokeStyle='#98917e';g.lineWidth=8;g.strokeRect(14,14,612,312);
    g.fillStyle='#cfbea2';g.textAlign='center';g.textBaseline='middle';
    g.font='bold 77px Georgia';g.fillText('REGINA PACIS',320,93,565);
    g.font='bold 65px Georgia';g.fillText('ORA PRO NOBIS',320,174,568);
    g.font='bold 40px Georgia';g.fillText('XVII-II-MCMLIX',320,259,465);
    const texture=new T.CanvasTexture(paint);texture.colorSpace=T.SRGBColorSpace;
    const plate=new T.Mesh(new T.PlaneGeometry(.72,.38),new T.MeshStandardMaterial({map:texture,roughness:.77}));
    plate.position.set(0,1.57,.671);plaque.add(plate);k.group.add(plaque);
    for(const x of [-.333,.333])for(const y of [1.41,1.73])k.stamp(sphere,rim,x,y,.673,.014,.014,.013);

    // Successive horizontal sections preserve the figure's upright silhouette.
    // An open angular sweep leaves the robe visible between the two veil edges.
    function drape(rows,color,pleats=0){
      const coords=[],indices=[],segments=48;
      for(let i=0;i<rows.length;i++){
        const [y,rx,rz,z,opening=0,wave=0,shift=0]=rows[i];
        for(let j=0;j<=segments;j++){
          const a=opening+(Math.PI*2-opening*2)*j/segments;
          const ripple=wave*Math.cos(a*pleats+shift);
          coords.push((rx+ripple)*Math.sin(a),pedestal+y,z+(rz+ripple)*Math.cos(a));
          if(i&&j){
            const p=i*(segments+1)+j;
            indices.push(p-segments-2,p-segments-1,p-1,p-segments-1,p,p-1);
          }
        }
      }
      const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(coords,3));
      shell.setIndex(indices);shell.computeVertexNormals();k.stamp(shell,color,0,0,0);shell.dispose();
    }
    function oval(color,x,y,z,w,h,d,rx=0,rz=0){
      k.stamp(sphere,color,x,pedestal+y,z,w,h,d,0,rx,rz);
    }
    function cord(points,radius,color){
      const path=new T.CatmullRomCurve3(points.map(([x,y,z])=>new T.Vector3(x,pedestal+y,z)));
      const shape=new T.TubeGeometry(path,Math.max(9,points.length*3),radius,7,false);
      k.stamp(shape,color,0,0,0);shape.dispose();
    }
    drape([[0,.52,.48,0],[.12,.54,.5,0],[.24,.51,.48,-.01],[.36,.43,.41,-.014],[.52,.34,.30,-.035]],veil);
    oval(marble,-.11,.48,.22,.15,.12,.24,-.26);
    oval(marble,.14,.46,.28,.15,.10,.22,-.14);
    cord([[-.36,.23,.29],[-.28,.29,.40],[-.08,.31,.44],[.13,.34,.39],[.27,.37,.38]],.054,veil);
    oval(veil,.29,.37,.38,.085,.045,.063);
    drape([[.40,.44,.34,-.04,0,.030,.72],[.57,.43,.33,-.05,0,.036,.3],[1.32,.39,.30,-.04,0,.029,.1],
      [2.13,.37,.26,-.01,0,.026,-.15],[2.78,.34,.24,.01,0,.026,-.2],[3.15,.40,.27,.01,0,.017],
      [3.48,.43,.25,-.015],[3.67,.29,.19,-.01],[3.82,.145,.13,0]],marble,17);
    drape([[.35,.45,.36,-.045,1.28,.018],[.57,.49,.36,-.06,.91,.021],
      [1.45,.49,.35,-.079,.66,.022],[2.43,.50,.33,-.079,.71,.020],[3.12,.52,.33,-.04,.76,.017],
      [3.50,.51,.32,-.03,.76],[3.65,.38,.25,-.03,.66],[3.90,.28,.22,-.025,.73],
      [4.22,.255,.227,-.025,.88],[4.41,.244,.227,-.020,.83],[4.53,.190,.199,-.019,.63],
      [4.585,.090,.109,-.01,.10],[4.60,.012,.016,-.012,0]],veil,11);
    // Slightly raised chin, nose bridge, shallow brows and lips are cut from
    // the same stone. The reference has no painted facial features.
    drape([[3.60,.235,.155,.016],[3.75,.161,.128,.027],[3.87,.129,.113,.038],
      [3.99,.122,.106,.050],[4.055,.117,.112,.070],[4.103,.114,.142,.089],
      [4.153,.141,.153,.098],[4.215,.160,.163,.094],[4.275,.173,.160,.086],
      [4.332,.176,.156,.075],[4.409,.179,.157,.052],[4.487,.145,.131,.035],[4.525,.094,.115,.030]],marble);
    oval(marble,0,4.279,.236,.029,.076,.036,-.19);
    oval(marble,0,4.238,.263,.033,.026,.027);
    for(const s of [-1,1])oval(marble,s*.024,4.228,.255,.021,.016,.022);
    for(const side of [-1,1]){
      const dx=n=>side*n;
      cord([[dx(.038),4.335,.222],[dx(.079),4.350,.219],[dx(.126),4.341,.195]],.011,veil);
      cord([[dx(.041),4.313,.228],[dx(.083),4.323,.222],[dx(.12),4.318,.206]],.007,fold);
      cord([[dx(.02),4.506,.126],[dx(.13),4.472,.151],[dx(.18),4.381,.117],
        [dx(.198),4.21,.124],[dx(.206),4.02,.130],[dx(.228),3.78,.155],[dx(.284),3.58,.163]],.031,veil);
      // Elbows stay low and the hands rise inward around the orb.
      oval(veil,dx(.399),3.19,.019,.154,.339,.155,-.15,side*.13);
      cord([[dx(.432),2.99,.082],[dx(.425),2.93,.176],[dx(.351),2.98,.317],[dx(.269),3.06,.40]],.138,marble);
      cord([[dx(.463),3.04,.12],[dx(.443),2.84,.13],[dx(.418),2.74,.115],[dx(.391),2.76,.075]],.043,veil);
      oval(marble,dx(.216),3.11,.437,.085,.169,.081,-.19,-side*.57);
      for(let j=0;j<4;j++)
        cord([[dx(.238),3.087+j*.033,.469],[dx(.178),3.117+j*.035,.524],[dx(.114),3.17+j*.033,.547]],.018,marble);
    }
    cord([[-.050,4.164,.245],[-.018,4.172,.254],[0,4.168,.258],[.018,4.173,.254],[.050,4.164,.245]],.009,veil);
    cord([[-.038,4.155,.247],[0,4.148,.255],[.038,4.156,.247]],.008,marble);
    oval(veil,0,3.204,.411,.235,.241,.235);
    k.box(marble,0,pedestal+3.525,.408,.039,.174,.040);
    k.box(marble,0,pedestal+3.556,.408,.132,.033,.040);
    sphere.dispose();
  }
});
