'use strict';
(()=>{
  const A=window.CentralArch,id='tuong-dai-me-suot',catalogId='osm-node-8716478190';
  const lon=106.6270915,lat=17.4654799,yaw=.431;
  const source='https://svhttdl.quangtri.gov.vn/chi-tiet/-/view-article/1/1647938258475/1786420807291';
  // The public survey pin is within six metres of the dark rectangular dais.
  // The podium, circular planting beds and river railing follow imagery and the 2026 street photograph.
  const c=Math.cos(yaw),s=Math.sin(yaw);
  function camera(name,x,z,ex,ez,h,eye,fov,photoCatalogId,description){
    const dx=ex-x,dz=ez-z,dy=eye-h;
    return {name,offset:[c*x+s*z,-s*x+c*z],height:h/.46,viewBase:'monument',viewAngle:yaw+Math.atan2(dx,dz),
      viewRadius:Math.hypot(dx,dz,dy),viewElevation:Math.atan2(dy,Math.hypot(dx,dz)),viewFov:fov,photoCatalogId,description};
  }
  const views=[
    camera('Mẹ Suốt nhìn từ sân ven sông',0,0,.65,13.5,3.32,1.66,43,catalogId,
      'Từ mép sân phía nam nhìn lên mái chèo dựng đứng, thân tượng và bệ đá đen. Sông Nhật Lệ nằm bên phải người xem.'),
    camera('Phù điêu trên mũi thuyền',-.36,.32,-7.35,9.2,3.38,1.96,45,'dong-hoi-phu-dieu-me-suot',
      'Ở phía đường Quách Xuân Kỳ có các gương mặt trên mũi thuyền. Qua bên kia thân tượng, các nếp đá chuyển thành hình sóng nước.'),
    camera('Qua hàng cau nhìn ra Nhật Lệ',0,0,-14.4,9.6,3.02,1.84,54,'dong-hoi-hang-cau-me-suot',
      'Từ lối lát ven phố nhìn qua hàng cau tới tượng. Sau bệ đá là lan can bờ kè, lòng sông và bờ Bảo Ninh.'),
  ];
  const heights=views.map(v=>v.height);
  function sculpture(T,kit){
    const stone=0xb9b7ac,plinth=0x393736;
    kit.palette({stone:[stone,plinth,0xd1ccba,0x929181]});
    kit.box(0x666664,0,.15,0,7.6,.30,10.6);
    kit.box(0xc7c5bd,0,.32,0,7.42,.06,10.42);
    kit.box(plinth,0,.44,-.32,3.98,.20,3.62);
    kit.box(0x43423e,0,1.17,-.34,3.61,1.40,3.22);
    A.plaque(T,kit,'MẸ SUỐT ANH HÙNG',0,1.54,1.284,1.83,.34,{bg:'#49463e',fg:'#d3c6a1',frame:false});
    const hull=A.carving(T,kit,stone,0,1.84,0,1);
    hull.sweep([[0,0,-.19,.95,.67],[-.12,.27,-.14,.85,.65],[-.06,.52,-.08,.72,.61],
      [0,.79,-.03,.79,.76],[.04,1.03,0,.76,.84],[.07,1.18,-.09,.55,.64]],.06,24);
    // The relief sits on a carved boat. Its raised gunwales converge at the bow.
    const ribs=[[-1.19,.34,2.65],[-.82,.72,2.75],[-.20,.95,2.79],[.48,.90,2.78],[.98,.61,2.83],[1.44,.22,2.95]],boat=[];
    const face=(p,q,r)=>boat.push(...p,...q,...r);
    const sections=ribs.map(([z,w,y])=>[[-w,y,z],[-w*.73,y-.24,z-.04],[-w*.23,y-.48,z-.07],
      [w*.23,y-.48,z-.07],[w*.73,y-.24,z-.04],[w,y,z]]);
    for(let n=1;n<sections.length;n++)for(let side=0;side<6;side++){
      const j=(side+1)%6,a=sections[n-1],b=sections[n];face(a[side],a[j],b[side]);face(a[j],b[j],b[side]);
    }
    for(const section of [sections[0],sections.at(-1)])for(let j=1;j<5;j++)face(section[0],section[j],section[j+1]);
    const body=new T.BufferGeometry();body.setAttribute('position',new T.Float32BufferAttribute(boat,3));body.computeVertexNormals();
    kit.stamp(body,0xa8a699,0,0,0);body.dispose();
    for(const [x,z,lift] of [[.53,-.78,.05],[.65,-.37,.11],[.59,-.10,-.03]]){
      hull.sweep([[x,.20+lift,z,.09,.16],[x+.18,.39+lift,z+.1,.16,.25],
        [x+.26,.63+lift,z+.3,.13,.25],[x+.12,.72+lift,z+.55,.06,.15]],.04);
    }
    hull.finish();
    const form=new T.SphereGeometry(1,12,8);
    // Four carved faces emerge from the western side of the boat, visible below the oar in Linhcandng's close view.
    for(const [i,z] of [-.67,-.25,.18,.61].entries()){
      const x=[-.67,-.85,-.90,-.76][i],y=2.88+i*.012;
      kit.stamp(form,stone,x,y-.18,z,.215,.22,.235);kit.stamp(form,0xb6b2a4,x-.058,y+.045,z,.170,.216,.153);
      kit.stamp(form,0x99998d,x-.043,y+.179,z-.014,.172,.108,.163);
      kit.stamp(form,0xc6c4b8,x-.183,y+.050,z+.090,.064,.053,.045);
      kit.stamp(form,0x9d9b8b,x-.159,y+.104,z+.069,.058,.025,.039);
    }
    form.dispose();
    const base=3.01,h=4.00;
    A.statueFigure(T, kit, stone, 0,base,0,h,{headcloth:true,
      rightArm:[[-.137,.722,.079],[.051,.728,.123],[.085,.732,.126]],
      leftArm:[[.143,.62,.022],[.11,.502,.135],[.128,.475,.138]]});
    const oar = A.carving(T,kit,0xb7b8ab,0,base,0,h);
    oar.sweep([[.21,-.035,.15,.041,.013],[.203,.035,.15,.049,.017],[.171,.20,.145,.032,.018],
      [.156,.322,.14,.015,.015],[.072,.756,.128,.015,.015]],0,12);
    // Wind lifts the loose cloth behind the planted figure.
    oar.sweep([[.105,.335,-.065,.079,.030],[.218,.409,-.098,.086,.028],[.284,.470,-.153,.047,.025],
      [.3,.514,-.171,.007,.010]],.18);
    oar.finish();
    const marble=0xb7a899;
    kit.box(0x66544c,0,.42,2.87,1.13,.14,.88);
    for(const x of [-.31,.31])kit.box(marble,x,.57,2.87,.21,.19,.52);
    kit.box(marble,0,.84,2.87,.85,.47,.63);kit.box(0xa69584,0,1.085,2.87,.88,.06,.67);
    kit.box(0x51493e,0,1.12,2.87,.72,.02,.50);
    const rim=new T.TorusGeometry(.115,.012,5,18);kit.stamp(rim,0x8c7d6a,0,.85,3.193);rim.dispose();
    for(const x of [-.18,-.075,.025,.12,.20])kit.box(0x9d493a,x,1.19,2.87,.012,.19,.012);
  }
  function grounds(T,kit){
    const paving=0xbcbdb6,kerb=0xa9aca2,rail=0xc3c6c0;
    kit.box(paving,-1.7,-.12,0,22,.34,56);
    for(const x of [-11.1,-8.5,-5.9,-3.3,-.7,1.9,4.5,7.1])kit.box(0xa5a79f,x,.057,0,.028,.012,55.9);
    for(let z=-26;z<=26;z+=2.6)kit.box(0xa5a79f,-1.7,.056,z,21.95,.012,.032);
    const palms=[];
    for(const z of [-20,-5,10,23]){
      kit.box(kerb,-10.9,.12,z,2.45,.19,10.1);kit.box(0x53644d,-10.9,.23,z,2.28,.07,9.94);
      palms.push({x:-10.9,z:z-.9,h:8.35+(z+20)*.021,width:4.8,kind:'palm'});
    }
    const shrub=new T.LatheGeometry([[0,0],[.48,.10],[.81,.21],[.88,.36],[.77,.61],[.59,.79],[.34,.94],[.13,1],[0,1.01]].map(([r,y])=>new T.Vector2(r,y)),16);
    const round=new T.CylinderGeometry(1,1,1,28);
    kit.stamp(round,kerb,.4,.12,-12.7,2.33,.17,2.33);kit.stamp(round,0x70805c,.4,.22,-12.7,2.19,.07,2.19);
    kit.stamp(round,0x96988f,-.7,.068,13.1,3.8,.022,3.8);kit.stamp(round,paving,-.7,.085,13.1,3.55,.015,3.55);
    for(const z of [-20,-10,-3,6,15,23])kit.stamp(shrub,0x53644b,6.9,.06,z,.82,1.35,.82);
    round.dispose();shrub.dispose();
    for(let z=-27;z<=27;z+=3)kit.box(rail,9.02,.51,z,.12,.98,.13);
    for(const y of [.35,.68,1.0])kit.box(rail,9.02,y,0,.064,.066,54);
    A.trees(T,kit,[...palms,{x:.4,z:-12.7,h:4.6,width:6.1},{x:-5.1,z:-22,h:5.8,width:6.4}]);
  }
  function build(T,kit){
    grounds(T,kit);sculpture(T,kit);
    let rest;
    kit.group.userData.fitGround=ground=>{
      const level=Math.max(0,ground(-5,0),ground(0,0),ground(0,5));
      rest??=kit.group.children.map(o=>o.position.y);kit.group.children.forEach((o,i)=>{o.position.y=rest[i]+level;});
      views.forEach((v,i)=>{v.height=heights[i]+level/.46;});
    };
  }
  (window.VietnamSights??=[]).push({id,catalogId,name:'Tượng đài Mẹ Suốt',lon,lat,yaw,region:'Trung Bộ',city:'Đồng Hới',province:'Quảng Trị',formerProvince:'Quảng Bình',
    kind:'Đài tưởng niệm',width:8,depth:11,gardenRadius:10,viewDistance:710,start:[106.6269387,17.4654104],mappedEntrance:true,visitOnArrival:true,
    reserve:(x,z,p)=>x> -12.8-p&&x<9.4+p&&Math.abs(z)<28+p,solids:[[0,-.34,1.8,1.61]],
    source,map:'https://www.openstreetmap.org/node/8716478190',photo:'https://commons.wikimedia.org/?curid=93541902',
    description:'Tượng đá Mẹ Suốt cầm mái chèo cao khoảng 7 m kể cả bệ. Công trình khánh thành năm 2003 trên bờ Nhật Lệ, gần bến đò xưa. Vị trí bệ và bố cục sân theo ảnh vệ tinh. Các khuôn mặt chạm nổi được giản lược theo ảnh chụp.',
    arrivalNote:'Xe dừng trên đường Quách Xuân Kỳ phía công viên. Từ lối đi bộ sát hàng cau có thể vòng ra trước bệ đá để nhìn dọc bờ sông.',views,build});
})();
