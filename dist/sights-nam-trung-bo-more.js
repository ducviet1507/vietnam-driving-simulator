'use strict';
(() => {
  const A = window.CentralArch;

  // 1. Khu chứng tích Sơn Mỹ (Quảng Ngãi)
  function chungTichSonMy(T, kit) {
    const limestone = 0xd2d1c7;
    kit.palette({stone:[limestone,0xcacbc2,0xacaaa1,0x777779,0x676768]});
    kit.palette({stone: limestone});
    kit.box(0xacaaa1,0,.16,0,17,.32,13.5);
    kit.box(0x777779,0,.50,-.9,10.2,.36,5.6);
    kit.box(0x676768,0,1.38,-.9,9.75,1.42,5.15);
    const base = 2.09;
    A.statueFigure(T,kit,limestone,.16,base,-.98,6.70,{
      rightArm:[[-.118,.97,.005],[-.082,1.096,.018],[-.044,1.118,.052]],
      leftArm:[[.138,.658,.041],[.048,.652,.105],[-.018,.669,.112]]});
    const child = A.carving(T,kit,limestone,.16,base,-.98,6.70);
    // The child lies across the left forearm, head tipped outwards.
    child.sweep([[-.086,.706,.092,.029,.036],[.012,.706,.124,.053,.049],[.09,.695,.114,.048,.043],
      [.147,.681,.102,.024,.026]]);
    child.sweep([[.142,.673,.108,.020,.024],[.166,.657,.109,.048,.046],[.199,.645,.103,.050,.047],[.226,.632,.096,.030,.032]]);
    child.sweep([[-.07,.699,.098,.025,.026],[-.11,.657,.124,.026,.026],[-.114,.603,.143,.018,.017]]);
    child.sweep([[-.036,.69,.14,.024,.026],[-.055,.636,.17,.023,.023],[-.045,.58,.177,.015,.016]]);
    child.finish();
    // Lower figures form a continuous stone group on the same plinth. Bodies
    // turn in towards one another and leave the central raised arm in silhouette.
    const family = A.carving(T,kit,0xcacbc2,0,base,-.85,1);
    family.sweep([[-3.7,.04,.22,.57,.78],[-3.18,.68,.29,.71,.79],[-2.47,1.52,.12,.74,.61],
      [-2.25,2.56,-.06,.72,.53],[-2.36,3.08,-.08,.32,.33]],.07);
    family.sweep([[-2.34,2.95,-.02,.25,.30],[-2.4,3.18,0,.38,.38],[-2.39,3.53,-.06,.42,.41],[-2.46,3.77,-.10,.26,.27]]);
    family.sweep([[-2.76,.06,.60,.74,.59],[-2.42,.90,.71,.58,.51],[-2.08,1.60,.77,.64,.51],[-1.90,2.1,.71,.39,.32]],.07);
    family.sweep([[-1.94,1.99,.75,.28,.27],[-2.03,2.20,.79,.34,.35],[-2.13,2.49,.76,.35,.35],[-2.16,2.64,.70,.21,.24]]);
    family.sweep([[-2.89,2.83,.24,.26,.27],[-3.02,2.18,.68,.23,.26],[-2.49,1.76,.98,.18,.20],[-2.06,1.86,1.10,.14,.17]]);
    family.sweep([[3.72,.10,-.30,.54,.71],[3.31,.59,-.04,.70,.64],[3.34,1.29,.04,.67,.66],[3.04,1.74,.18,.49,.52],
      [2.86,1.88,.31,.33,.33],[2.65,1.84,.49,.48,.40],[2.53,1.64,.61,.27,.28]],.045);
    family.sweep([[-.52,.50,.87,.42,.40],[.18,.69,.78,.61,.60],[1.02,.84,.72,.52,.43],[2.13,.66,.68,.33,.41],[2.76,.56,.54,.27,.28]],.05);
    family.sweep([[3.14,1.48,.45,.29,.32],[2.60,.90,.83,.25,.28],[1.94,.85,.97,.18,.18]],.035);
    for (const [cx,cy,cz] of [[-2.40,3.30,.34],[-2.10,2.32,1.08],[2.67,1.72,.81]]) {
      family.sweep([[cx,cy-.10,cz,.07,.06],[cx,cy,cz+.02,.075,.095],[cx,cy+.17,cz-.01,.044,.052]],0,10);
      for (const s of [-1,1]) family.sweep([[cx+s*.03,cy+.14,cz,.03,.04],[cx+s*.14,cy+.17,cz-.01,.05,.055],
        [cx+s*.24,cy+.11,cz-.07,.03,.035]],0,10);
    }
    family.finish();
    A.trees(T, kit, [{ x: -11.5, z: 4.0, h: 9.2, kind: 'banyan' }, { x: 11.5, z: 4.0, h: 8.8, kind: 'banyan' }]);
  }

  // 2. Hải đăng Ba Làng An (Bình Sơn, Quảng Ngãi)
  function haiDangBaLangAn(T, kit) {
    A.lighthouse(T, kit, {
      h: 20, rBase: 2.5, rTop: 1.6, body: 0xf1ede2, band: 0x383c40, dome: 0xa22f24,
      striped: true, octagonal: true, title: 'HẢI ĐĂNG BA LÀNG AN'
    });
  }

  // 3. Nhà thờ Gỗ Kon Tum (1913 — gỗ cà chít Romanesque kết hợp nhà sàn Ba Na)
  function nhaThoGoKonTum(T, kit) {
    const {box,stamp,round,tapered,profile,outline} = kit;
    const frame=0x40372f, boards=0x665144, ochre=0xb49b66, lime=0xe6dac2;
    const clay=0x865942, slate=0x544b44, stone=0x9e978b, glass=0x536c81;
    kit.palette({timber:[frame,boards],plaster:lime,stone,tile:[clay,slate],glass});
    // A round-head opening cut through a full spandrel. The paired, slimmer
    // posts underneath it leave sightlines through the raised gallery.
    function arcade(x,y,z,span,spring,angle) {
      const r=span*.455, top=spring+r+.23, shape=new T.Shape();
      shape.moveTo(-span/2,0); shape.lineTo(-r,0); shape.lineTo(-r,spring);
      shape.absarc(0,spring,r,Math.PI,0,true);
      shape.lineTo(r,0); shape.lineTo(span/2,0); shape.lineTo(span/2,top);
      shape.lineTo(-span/2,top); shape.closePath();
      profile(shape,frame,x,y,z,.26,angle);
      const band=new T.TorusGeometry(r,.055,5,24,Math.PI);
      stamp(band,ochre,x+.28*Math.sin(angle),y+spring,z+.28*Math.cos(angle),1,1,1,angle);
      band.dispose();
    }
    box(stone,0,.50,0,19,1,32);
    for(let i=0;i<5;i++)box(stone,0,.1+i*.10,17.15-i*.36,18.8-i*.08,.20+i*.20,.75);
    // White infill and dark structural posts are visible above both lower aisles.
    box(lime,0,6.10,-1.0,10,10.2,28);
    A.gabledRoof(T,kit,0,11.25,-1.0,10.8,29.1,3.55,clay,slate);
    for(const side of [-1,1]){
      for(let j=0;j<9;j++){
        const z=-13.6+3.18*j;
        box(frame,side*5.04,6.02,z,.14,9.9,.15);
        box(boards,side*5.10,9.55,z+1.22,.10,1.35,.58);
      }
      // Row of transverse pitched porches and slender balusters down each aisle.
      for(let j=0;j<5;j++){
        const z=-11.9+5.55*j, x=side*7.05;
        A.gabledRoof(T,kit,x,5.65,z,4.35,5.2,1.62,slate,frame,{alongX:true,overhang:.19});
        outline([[-2.74,0],[0,1.62],[2.74,0]],boards,side*9.1,5.65,z,.12,Math.PI/2);
        arcade(side*8.97,1.02,z,5.48,2.10,side*Math.PI/2);
        box(frame,side*9,2.0,z,.12,.14,5.5);
        for(let i=-4;i<=4;i++)box(boards,side*9,1.48,z+i*.53,.11,.90,.085);
      }
    }
    // Three open bays span the stair landing. Set the inner doors back under the porch.
    for(const [cx,span] of [[-6.1,4.7],[0,7.5],[6.1,4.7]]){
      arcade(cx,1.02,14.75,span,2.50,0);
      box(boards,cx,3.03,12.95,span*.63,4,.14);
    }
    for(const x of [-8.45,-3.77,3.77,8.45]){
      box(frame,x,3.05,14.98,.37,4.05,.41);
      box(ochre,x,4.94,14.98,.57,.18,.55);
    }
    for(const side of [-1,1]){
      outline([[-side*2.35,0],[-side*2.35,3.7],[side*2.35,0]],
        boards,side*6.1,5.65,14.70,.3);
    }
    // Front gable: tall bay, circular stained glass, smaller arched panels and gold-edged posts.
    const face=15.06;
    box(boards,0,9.88,14.1,8.3,7.12,1.72);
    outline([[-4.35,0],[0,3.20],[4.35,0]],boards,0,13.42,13.12,1.84);
    for(const x of [-3.85,-2.15,2.15,3.85])box(frame,x,9.9,face,.18,7.02,.19);
    for(const y of [6.48,8.52,13.37])box(ochre,0,y,face,8.12,.09,.12);
    for(let i=-3;i<=3;i++)arcade(i*.99,6.58,face,.94,.93,0);
    stamp(round,glass,0,10.83,face,1.88,.18,1.88,0,Math.PI/2);
    for(const r of [.34,.91,1.8]){
      const ring=new T.TorusGeometry(r,r>1?.09:.045,6,48);
      stamp(ring,ochre,0,10.83,face+.14);ring.dispose();
    }
    for(let i=0;i<12;i++){
      const a=Math.PI*i/6;
      box(0xa39a87,.99*Math.sin(a),10.83+.99*Math.cos(a),face+.13,.05,1.60,.07,0,0,-a);
    }
    for(const side of [-1,1]){
      A.strut(T,kit,ochre,side*4.32,13.44,face,0,16.53,face,.068);
      box(ochre,side*3.04,10.74,face,.68,2.38,.12);
      box(glass,side*3.04,10.74,face+.09,.49,2.19,.10);
    }
    // Receding square belfry behind the façade, with louvred vents and narrow spire.
    for(const [cy,w,h] of [[15.83,4.40,4.1],[19.07,3.05,2.55]]){
      box(boards,0,cy,11.78,w,h,w);
      for(const side of [-1,1])for(const bay of [-.21,.21]){
        box(frame,bay*w,cy,11.78+side*w*.502,w*.28,h*.65,.16);
        box(frame,side*w*.502,cy,11.78+bay*w,.16,h*.65,w*.28);
        for(let i=-2;i<=2;i++){
          box(ochre,bay*w,cy+i*h*.11,11.78+side*(w*.5+.09),w*.25,.09,.11);
          box(ochre,side*(w*.5+.09),cy+i*h*.11,11.78+bay*w,.11,.09,w*.25);
        }
      }
      box(frame,0,cy+h*.5,11.78,w+.52,.28,w+.52);
    }
    tapered(clay,0,23.15,11.78,2.36,.11,5.66,1,4);
    for(const x of [-1.64,1.64])for(const z of [-1.64,1.64])
      A.strut(T,kit,ochre,x,20.38,11.78+z,0,25.98,11.78,.058);
    box(frame,0,26.46,11.78,.11,1.05,.11);
    box(frame,0,26.65,11.78,.65,.10,.10);
  }

  // 4. Cầu treo Kon Klor (TP. Kon Tum — cầu treo dây võng màu cam rực rỡ)
  function cauTreoKonKlor(T, kit) {
    A.suspensionBridge(T, kit, {
      len: 215, w: 9.8, towerX: 64, towerH: 30,
      towerColor: 0xd96e2c, cableColor: 0xc95224, deckColor: 0x6c7275
    });
  }

  // 5. Quần thể Tháp Bánh Ít (4 tháp Chăm cổ trên đỉnh đồi Bình Định)
  function thapBanhIt(T, kit) {
    const {building,stairs}=createTempleFoundations(T,kit);
    const sandstone=0xbca78a,brick=0xa04c32,dark=0x823e2d;
    kit.palette({brick:[brick,dark],stone:sandstone});
    // Main sanctuary and the kosagrha share the summit. The other two towers
    // stand on their own hillside landings across the eastward approach.
    building(-2,0,1.74,13.2,17.6,()=>{
      A.chamTower(T,kit,0,0,{w:11.15,h:27,tiers:3,brick,darkBrick:dark,sandstone});
    });
    building(5,14,-.175,15.3,7.0,()=>{
      kit.box(dark,0,.53,0,15.3,1.06,7);
      kit.box(brick,0,3.50,0,14.35,5.1,6.3);
      for(const side of [-1,1]){
        for(let k=-3;k<=3;k++){
          kit.box(dark,k*2.04,3.28,side*3.19,.43,4.44,.18);
          kit.box(sandstone,k*2.04,5.55,side*3.24,.56,.22,.31);
        }
        kit.box(dark,0,5.94,side*3.30,15.22,.39,.38);
      }
      // The longitudinal ends rise far above the waist of the boat roof.
      for(let i=0;i<24;i++){
        const x=-7.45+(i+.5)*14.9/24,end=Math.pow(Math.abs(x)/7.45,2.9);
        kit.outline([[-3.62,0],[-2.42,1.26],[0,2.20+end*1.89],[2.42,1.26],[3.62,0]],
          i%7===0?dark:brick,x-.313,6,0,.628,Math.PI/2);
      }
    });
    building(26,54,1.74,9.4,11.5,()=>{
      A.chamTower(T,kit,0,0,{w:8.0,h:14.8,tiers:3,brick:0xaf6040,darkBrick:dark,sandstone});
      for(const side of [-1,1])for(const end of [-1,1]){
        kit.tapered(brick,side*2.73,12.55,end*2.73,.69,1.04,.98,1,8);
        kit.tapered(dark,side*2.73,13.19,end*2.73,1.08,.85,.34,1,8);
      }
    });
    const gate=building(104,-18,1.74,10.2,15,()=>{
      kit.box(dark,0,.06,0,10.2,.12,15);
      // Open east-west passage. Curved brick courses carry the tiers over it.
      const span=2.33,shape=new T.Shape();
      shape.moveTo(-4.35,0);shape.lineTo(-span,0);shape.lineTo(-span,3.5);
      shape.quadraticCurveTo(-span,5.39,0,6.72);shape.quadraticCurveTo(span,5.39,span,3.5);
      shape.lineTo(span,0);shape.lineTo(4.35,0);shape.lineTo(4.35,7.34);shape.lineTo(-4.35,7.34);shape.closePath();
      kit.profile(shape,brick,0,0,-6.5,13);
      for(const side of [-1,1])for(const z of [-5.9,-2.0,2.0,5.9]){
        kit.box(dark,side*4.37,3.62,z,.52,7.18,.67);
        kit.box(brick,side*4.39,6.99,z,.71,.32,.85);
      }
      for(let i=0;i<3;i++){
        const w=9.4-i*2.14,d=14.0-i*3.14,y=7.34+i*1.90;
        kit.box(dark,0,y+.22,0,w,.44,d);
        kit.box(brick,0,y+1.08,0,w-1.42,1.32,d-1.65);
      }
      kit.tapered(sandstone,0,13.57,0,1.10,.34,1.37,1,8);
    });
    stairs(gate,111.3,-19.23,117,-20,4.45,.12,13);
    stairs(gate,96.7,-16.77,90,-15.58,4.45,.12,15);
  }

  // 6. Nhóm Tháp Dương Long (Tây Sơn — cụm tháp Chăm gạch cao nhất Đông Nam Á)
  function thapDuongLong(T, kit) {
    kit.box(0x8b7e6b, 0, 0.42, 0, 38, 0.84, 16);
    A.chamTower(T, kit, -11.5, 0, { w: 7.4, h: 25.5, tiers: 4, brick: 0xa85239, sandstone: 0xd0bf9f });
    A.chamTower(T, kit, 0, 0, { w: 9.0, h: 31.5, tiers: 4, brick: 0x9e4a32, sandstone: 0xd4c3a3 });
    A.chamTower(T, kit, 11.5, 0, { w: 7.2, h: 24.8, tiers: 4, brick: 0xaa553b, sandstone: 0xd0bf9f });
    A.trees(T, kit, [{ x: -18.0, z: -5.5, h: 8.5, kind: 'palm' }, { x: 18.0, z: -5.5, h: 8.8, kind: 'banyan' }]);
  }

  // 7. Bảo tàng Quang Trung & Đền thờ Tây Sơn Tam Kiệt
  function baoTangQuangTrung(T, kit) {
    A.tamQuan(T, kit, {
      wall: 0xe6d29c, trim: 0xc99c4a, tile: 0xa23d28, ridge: 0xdcb85e, eave: 0xdfb24c,
      wCenter: 5.6, wSide: 3.8, depth: 3.0, hCenter: 5.2, hSide: 3.6, twoTierSides: true,
      title: 'BẢO TÀNG QUANG TRUNG', plaque: { bg: '#7c1e16', fg: '#f8da72' }
    });
    kit.box(0x90887b, 0, 0.55, -10.5, 22.0, 1.1, 11.0);
    kit.box(0xe6d29c, 0, 3.1, -10.8, 19.6, 4.0, 8.8);
    A.curvedRoof(T, kit, 0, 5.1, -10.5, 22.4, 11.4, 2.5, 0xa23d28, 0xdcb85e, 0xdfb24c, 0.34, { dragons: true });
    A.trees(T, kit, [{ x: -13.5, z: -4.5, h: 11.2, kind: 'banyan' }, { x: 13.5, z: -4.5, h: 8.0, kind: 'palm' }]);
  }

  // 8. Quảng trường Đại Đoàn Kết (TP. Pleiku, Gia Lai)
  function quangTruongDaiDoanKet(T, kit) {
    const { box, stamp, round } = kit;
    A.memorialMonument(T, kit, {
      plazaW: 30, plazaD: 22, style: 'statue', wings: false, flags: false,
      stone: 0xa8a99b, darkStone: 0x696d65,
      sculpt(T,kit,base) {
        kit.palette({metal:0x986f50,stone:[0x72776d,0xb0b0a2,0xb9b9ac]});
        kit.box(0x72776d,0,(base+4.5)/2,-1.2,7.8,4.5-base,5.35);
        A.statueFigure(T,kit,0x986f50,0,4.5,-1.2,10.8,{beard:true,jacket:true,openHand:true,
          rightArm:[[-.165,.674,.085],[-.154,.822,.13],[-.159,.894,.137]],
          leftArm:[[.142,.651,0],[.153,.472,.018],[.151,.41,.024]]});
        // The stone frieze opens into stepped, splayed lotus petals behind the figure.
        for (let i=-4;i<=4;i++) {
          const k=Math.abs(i),height=[7.3,6.8,5.9,5.2,4.8][k], width=1.85;
          const ring=[[-width,0],[width,0],[width,height-1.45],[width*.63,height-.64],[width*.13,height],
            [-width*.40,height-.44],[-width,height-1.23]];
          kit.outline(ring,k%2?0xb0b0a2:0xb9b9ac,i*3.42,.35,-7.8+k*.61,1.05,i*.082);
        }
      },
      title: 'QUẢNG TRƯỜNG ĐẠI ĐOÀN KẾT'
    });
    // Iconic carved giant Central Highlands stone gong (Cồng chiêng đá) beside the monument
    box(0x76726a, 10.5, 1.35, 3.2, 3.4, 1.4, 2.2);
    stamp(round, 0x4e4842, 10.5, 4.0, 3.2, 2.2, 0.42, 2.2, 0, Math.PI / 2);
    stamp(round, 0xd8ae48, 10.5, 4.0, 3.44, 0.65, 0.24, 0.65, 0, Math.PI / 2);
  }

  // 9. Tượng đài Chiến thắng Buôn Ma Thuột (Ngã Sáu Ban Mê — Xe tăng 980 trên vòm cầu)
  function tuongDaiChienThangBmt(T, kit) {
    const { box, stamp, outline, round } = kit;
    const white = 0xeae6dc, darkStone = 0x76736c, tankGreen = 0x475e3e, darkTrack = 0x2f3c2a;
    kit.palette({stone: darkStone});

    // Circular Ngã Sáu roundabout granite tiered base
    stamp(round, darkStone, 0, 0.45, 0, 11.5, 0.9, 11.5);
    stamp(round, 0x4e793e, 0, 0.96, 0, 9.8, 0.22, 9.8);
    // Iconic crossed sweeping concrete arch pedestal rising 10m into the air!
    const arch = [
      [-6.8, 0], [-5.2, 5.2], [-2.4, 8.8], [0, 9.8], [2.4, 8.8], [5.2, 5.2], [6.8, 0],
      [5.4, 0], [4.0, 4.6], [1.8, 7.6], [0, 8.4], [-1.8, 7.6], [-4.0, 4.6], [-5.4, 0]
    ];
    outline(arch, white, 0, 0.9, -0.75, 1.5);
    outline(arch, white, 0, 0.9, -0.75, 1.5, Math.PI / 2);
    box(white, 0, 10.6, 0, 5.2, 0.85, 7.8);

    // Iconic T-54 Tank #980 mounted proudly atop the soaring arch!
    const ty = 11.45;
    box(tankGreen, 0, ty + 0.55, 0, 3.1, 1.1, 5.6);
    for (const s of [-1, 1]) box(darkTrack, s * 1.55, ty + 0.35, 0, 0.65, 0.85, 5.8);
    stamp(round, 0x526b47, 0, ty + 1.45, 0.2, 1.35, 0.95, 1.55);
    // Cannon barrel angled heroically upward
    A.strut(T, kit, 0x3b4f34, 0, ty + 1.55, 1.2, 0, ty + 2.65, 5.8, 0.14);
    A.plaque(T, kit, 'CHIẾN THẮNG BUÔN MA THUỘT', 0, 2.2, 7.6, 6.2, 0.84, { bg: '#84231b', fg: '#f8da72' });
  }

  // 10. Tháp Nhạn (Núi Nhạn, Tuy Hòa, Phú Yên / Đắk Lắk)
  function thapNhanTuyHoa(T, kit) {
    kit.box(0x887f72, 0, 0.42, 0, 18, 0.84, 18);
    A.chamTower(T, kit, 0, 0, { w: 8.6, h: 23.5, tiers: 4, brick: 0xa84e34, darkBrick: 0x863b26, sandstone: 0xcab898 });
    A.trees(T, kit, [{ x: -10.2, z: -6.5, h: 10.2, kind: 'pine' }, { x: 10.2, z: -6.5, h: 9.8, kind: 'pine' }]);
  }

  // 11. Nhà thờ Mằng Lăng (1892, Tuy An, Phú Yên / Đắk Lắk — Gothic cổ rêu phong)
  function nhaThoMangLang(T, kit) {
    A.gothicChurch(T, kit, {
      w: 15.5, d: 30, naveH: 9.8, towerH: 22.5, twinTowers: true,
      wall: 0xa8a59d, trim: 0xc8c3b8, roof: 0x7c4636, dark: 0x2d2926,
      title: 'NHÀ THỜ MẰNG LĂNG'
    });
    A.trees(T, kit, [{ x: -11.2, z: 10.5, h: 9.5, kind: 'banyan' }, { x: 11.2, z: 10.5, h: 9.2, kind: 'banyan' }]);
  }

  // 12. Nhà thờ Núi / Nhà thờ Chính tòa Nha Trang (1928 — đá chẻ xám Gothic)
  function nhaThoNuiNhaTrang(T, kit) {
    A.gothicChurch(T, kit, {
      w: 17.0, d: 35, naveH: 11.2, towerH: 30.0, twinTowers: false,
      wall: 0xb0aba0, trim: 0xd2cdc0, roof: 0x6f7375, dark: 0x2b2d30,
      title: 'NHÀ THỜ NÚI NHA TRANG'
    });
    A.trees(T, kit, [{ x: -11.5, z: 12.0, h: 8.2, kind: 'palm' }, { x: 11.5, z: 12.0, h: 8.5, kind: 'palm' }]);
  }

  // 13. Chùa Long Sơn – Kim Thân Phật Tổ (Nha Trang — tượng Phật trắng khổng lồ trên đài sen)
  function chuaLongSonNhaTrang(T, kit) {
    const { box, stamp, round, tapered } = kit;
    const white = 0xf2f0ea, cream = 0xe4dfd4, stone = 0x8f8a80;
    kit.palette({plaster: cream, stone});

    const {building,stairs}=createTempleFoundations(T,kit);
    // The chánh điện is at street level. The stair landings bend around the
    // east side of the slope before reaching the Kim Thân Phật Tổ above.
    const lowerHall=building(0,0,-.38,28.4,31.6,()=>{
      A.vietnameseHall(T,kit,{w:26,d:29,baseH:1.18,colH:5.30,doubleTier:true,bays:5,
        tile:0xc3653f,wood:0x513a31,wall:0xd3b88d,ridge:0x9c9690,eave:0xaf8c64,
        atticColor:0x79533d,title:'CHÙA LONG SƠN',incense:false});
    });
    stairs(lowerHall,-8,15,-11,24,5.1,1.17,23);
    stairs(lowerHall,5.8,19.25,2,29,3.0,1.17,25);
    building(33,-41,.90,7.8,7.8,()=>{
      box(stone,0,.30,0,7.8,.60,7.8);
      for(const x of [-2.7,2.7])for(const z of [-2.7,2.7]){
        stamp(round,0x82462d,x,2.88,z,.26,4.65,.26);
        stamp(round,stone,x,.82,z,.40,.50,.40);
      }
      box(0x593d2b,0,4.94,0,6.76,.36,.40);
      const bell=new T.LatheGeometry([[0,0],[1.14,0],[1.19,.16],[1.0,.30],[.87,1.48],[.66,2.12],[.32,2.32],[.24,2.54],[0,2.54]]
        .map(([r,y])=>new T.Vector2(r,y)),24);
      stamp(bell,0x6d5742,0,1.62,0);bell.dispose();
      tapered(0x594331,0,4.50,0,.06,.06,.84,1,8);
      A.curvedRoof(T,kit,0,5.00,0,8.45,8.45,2.28,0xb65c39,cream,0xb39365,.40);
    });
    const summit=building(44,-87,.93,21,21,()=>{
      box(stone,0,.55,0,21,1.10,21);
      // The paving makes a flower around the octagonal memorial base.
      for(let i=0;i<8;i++){
        const angle=i*Math.PI/4;
        stamp(round,0xc7b495,Math.sin(angle)*6.36,1.111,Math.cos(angle)*6.36,1.95,.022,2.74,angle);
      }

      // Sculpted white octagonal lotus-petal pedestal (Đài sen 7m)
      tapered(cream, 0, 3.6, -1.5, 6.4, 5.6, 5.0, 1, 8);
      kit.palette({plaster:[white,cream]});
      A.lotusSeat(T,kit,0,5.84,-1.5,5.3,1.30,white,cream);
      const size=14/(1.048-.31),origin=7.3-.31*size;
      A.statueFigure(T,kit,white,0,origin,-1.5,size,{seated:true,
        rightArm:[[-.155,.492,.033],[-.035,.457,.147],[.016,.466,.161]],
        leftArm:[[.155,.504,.032],[.050,.470,.132],[-.018,.470,.148]]});
      const drape=A.carving(T,kit,white,0,origin,-1.5,size);
      for(let i=0;i<4;i++) drape.sweep([[-.109,.785-i*.011,.008,.007,.012],[-.071,.708-i*.014,.058,.008,.009],
        [.029,.624-i*.012,.063,.008,.009],[.098,.585-i*.015,.017,.005,.007]]);
      drape.finish();
      // Small commemorative portraits set into the eight faces of the base.
      for(let i=0;i<8;i++){
        const angle=(i+.5)*Math.PI/4;
        const relief=A.carving(T,kit,0xa47836,Math.sin(angle)*5.86,3.86,-1.5+Math.cos(angle)*5.86,1,angle);
        relief.sweep([[0,-.65,0,.49,.14],[0,-.20,.04,.53,.14],[0,-.03,.03,.29,.10],
          [0,.22,.09,.27,.18],[0,.46,.05,.20,.14],[0,.50,.04,.04,.05]],0,12);relief.finish();
      }
    });
    stairs(summit,52,-85,75,-64,5.4,1.10,35);
  }

  // 14. Tháp Chăm Pô Sah Inư (Phan Thiết, Bình Thuận / Lâm Đồng)
  function thapPoSahInu(T, kit) {
    kit.box(0x8e806d, 0, 0.35, 0, 28, 0.70, 18);
    A.chamTower(T, kit, -3.5, -1.2, { w: 7.4, h: 17.5, tiers: 3, brick: 0xa65038 });
    A.chamTower(T, kit, 7.2, 2.2, { w: 5.4, h: 13.0, tiers: 3, brick: 0x9c4932 });
    A.chamTower(T, kit, -10.2, 4.8, { w: 3.6, h: 8.5, tiers: 2, brick: 0xae583f });
    A.trees(T, kit, [{ x: 11.8, z: -5.5, h: 7.8, kind: 'palm' }, { x: -12.5, z: -5.2, h: 8.0, kind: 'palm' }]);
  }

  // 15. Tháp Nước Phan Thiết (1934 — tháp bát giác gạch đỏ hình đài sen bên sông Cà Ty)
  function thapNuocPhanThiet(T, kit) {
    const { stamp, tapered, box } = kit;
    const brick = 0xa9523b, darkBrick = 0x8a402d, cream = 0xebe2cc, tile = 0x7c3b2a;
    kit.palette({brick: [brick, darkBrick], plaster: cream, tile});

    // Octagonal riverside park plinth & lower arched brick base
    tapered(0x8c867c, 0, 0.45, 0, 7.2, 6.8, 0.9, 1, 8);
    tapered(brick, 0, 3.2, 0, 5.6, 5.2, 4.8, 1, 8);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      box(0x2d211c, Math.sin(a) * 5.1, 2.8, Math.cos(a) * 5.1, 1.5, 3.0, 0.2, a);
    }
    // Tall slender tapering octagonal red-brick shaft (22m)
    tapered(brick, 0, 13.8, 0, 4.6, 3.3, 16.5, 1, 8);
    // Decorative vertical pilasters & slit vents
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + Math.PI / 8;
      box(darkBrick, Math.sin(a) * 3.9, 13.8, Math.cos(a) * 3.9, 0.35, 16.0, 0.28, a);
    }
    // Iconic projecting corbelled octagonal lotus water reservoir tank (Đài nước bát giác)
    tapered(cream, 0, 22.8, 0, 3.4, 5.6, 1.8, 1, 8);
    tapered(brick, 0, 26.2, 0, 5.5, 5.5, 5.2, 1, 8);
    tapered(cream, 0, 29.0, 0, 5.8, 5.6, 0.45, 1, 8);
    // Conical octagonal roof & finial spire
    tapered(tile, 0, 30.8, 0, 5.7, 0.25, 3.2, 1, 8);
    A.plaque(T, kit, 'THÁP NƯỚC PHAN THIẾT', 0, 5.4, 5.45, 4.2, 0.66, { bg: '#efe2c0', fg: '#782b1e' });
  }

  // 16. Quảng trường Lâm Viên Đà Lạt (Nụ hoa Atiso kính xanh & Khối Hoa Dã Quỳ vàng rực!)
  function quangTruongLamVien(T, kit) {
    const {stamp,tapered}=kit,{building}=createTempleFoundations(T,kit);
    const emerald=[0x1f7270,0x257775,0x2a827a],leaves=[0xa9ce3d,0xabcf30,0x85b832];
    const petals=[0xedbd39,0xe6af31,0xf2c845],frame=0x405b53,base=0x93918a;
    kit.palette({stone:base,metal:frame,glass:[...emerald,...leaves,...petals]});

    // Each panel is set into its steel frame. Twisting the rings carries the
    // spiral bands continuously over the bud and the broad petals across the roof.
    function glazing(rings,segments,tint){
      const swatches=new Map();
      function triangle(vertices,colour){
        if(!swatches.has(colour))swatches.set(colour,[]);
        swatches.get(colour).push(...vertices.flat());
      }
      function point(ring,i){
        const [r,y,twist]=ring,angle=i*Math.PI*2/segments+twist;
        return [Math.sin(angle)*r,y,Math.cos(angle)*r];
      }
      function pane(a,b,c,colour){
        triangle([a,b,c],frame);
        const centre=a.map((v,j)=>(v+b[j]+c[j])/3);
        const face=[a,b,c].map(p=>p.map((v,j)=>(v*.971+centre[j]*.029)*(j===1?1:1.002)+(j===1?.018:0)));
        triangle(face,colour);
      }
      for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){
        const a=point(rings[j],i),b=point(rings[j],i+1),c=point(rings[j+1],i+1),d=point(rings[j+1],i);
        pane(a,b,c,tint(i,j,0));pane(a,c,d,tint(i,j,1));
      }
      for(const [colour,positions] of swatches){
        const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
        geo.computeVertexNormals();stamp(geo,colour,0,0,0);geo.dispose();
      }
    }

    // Western café footprint (OSM way 1304080959). Its yellow-green leaves
    // twist around an upright teardrop of teal glass.
    building(0,0,0,19.0,19.0,()=>{
      tapered(base,0,.23,0,10.65,10.65,.46,1,48);
      const rings=[[7.8,.45,0],[9.35,2.0,.17],[10.05,4.0,.36],[10.22,6.2,.56],
        [9.68,8.5,.78],[8.36,10.5,1.01],[6.57,12.4,1.23],[4.39,13.9,1.47],[2.25,15.15,1.67],[.04,15.83,1.89]];
      glazing(rings,48,(i,j,k)=>(i%12<6?leaves:emerald)[(i+j+k)%3]);
    });

    // The opera house (OSM way 777439868) is a low 41 m dome east of the café. The
    // gold lobes sweep down over the blue-green curtain wall toward the lake.
    building(132.98,5.93,0,37.2,37.2,()=>{
      tapered(base,0,.27,0,20.30,20.30,.54,1,60);
      const rings=[[17.35,.53,.05],[19.13,2.48,.09],[20.18,4.85,.14],[20.40,7.15,.18],
        [19.89,9.55,.22],[18.98,11.40,.26],[17.22,13.38,.30],[15.11,15.04,.34],
        [12.39,16.48,.38],[8.77,17.61,.42],[4.81,18.21,.45],[.05,18.51,.47]];
      glazing(rings,60,(i,j,k)=>{
        const bearing=(i+k*.36+.5)/60*Math.PI*2,edge=(1-Math.cos(bearing*5))*.5;
        return (j+.5>1.05+5.2*edge?petals:emerald)[(i+j+k)%3];
      });
    });
  }

  // 17. Nhà thờ Con Gà Đà Lạt (1931 — tường hồng cam & tháp chuông 47m có gà đồng trên đỉnh)
  function nhaThoConGaDaLat(T, kit) {
    A.gothicChurch(T, kit, {
      w: 15.8, d: 35, naveH: 10.6, towerH: 31.5, twinTowers: false,
      wall: 0xdf9f88, trim: 0xf4e4d6, roof: 0x8c3c2e, dark: 0x332825,
      title: 'NHÀ THỜ CON GÀ ĐÀ LẠT'
    });
    // Iconic golden bronze weathercock perched atop the towering spire
    kit.box(0xe6be4c, 0, 35.8, 15.7, 0.95, 0.55, 0.22);
    A.trees(T, kit, [
      { x: -11.5, z: 8.5, h: 13.0, kind: 'pine' }, { x: 11.5, z: 8.5, h: 12.2, kind: 'pine' },
      { x: -11.8, z: -8.0, h: 12.5, kind: 'pine' }, { x: 11.8, z: -8.0, h: 11.8, kind: 'pine' }
    ]);
  }

  // 18. Trường Cao đẳng Sư phạm Đà Lạt (1927 — dãy nhà cong gạch đỏ & tháp chuông cao vút)
  function cdSuPhamDaLat(T, kit) {
    const { box, tapered } = kit;
    const redBrick = 0xa84b36, cream = 0xf2e7d2, roof = 0x7c392a, dark = 0x2b2928;

    // Signature sweeping curved 3-story French red-brick classroom wing (10 arc segments)
    const R = 24.0;
    const segs = 9;
    kit.palette({plaster: cream});
    for (let i = 0; i < segs; i++) {
      const a = -0.58 + (i / (segs - 1)) * 1.16;
      const sx = Math.sin(a) * R;
      const sz = Math.cos(a) * R - R + 2.0;
      const yaw = a;
      // Red brick wall segment + pale arched cloister ground arcade + 2 rows of French windows
      box(redBrick, sx, 4.8, sz, 4.2, 9.2, 6.2, yaw);
      box(cream, sx, 0.35, sz, 4.4, 0.7, 6.6, yaw);
      box(cream, sx, 9.45, sz, 4.4, 0.32, 6.6, yaw);
      // Ground arcade arch opening & upstairs windows facing inner courtyard (+Z)
      const fx = sx + Math.sin(a) * 3.15, fz = sz + Math.cos(a) * 3.15;
      box(dark, fx, 1.9, fz, 2.2, 3.2, 0.14, yaw);
      box(dark, fx, 5.4, fz, 1.8, 2.0, 0.14, yaw);
      box(dark, fx, 8.0, fz, 1.8, 1.7, 0.14, yaw);
      // Steep Dalat tiled roof segment
      tapered(roof, sx, 11.2, sz, 4.4, 2.8, 3.2, 0.9, 4);
    }

    // Iconic 54m-scale slender red-brick Bell Tower anchoring the right end of the curve
    const tx = 14.5, tz = -1.2;
    box(redBrick, tx, 13.5, tz, 4.4, 27.0, 4.4);
    box(cream, tx, 22.0, tz, 4.8, 0.36, 4.8);
    for (const f of [-1, 1]) {
      box(dark, tx, 24.5, tz + f * 2.24, 1.65, 3.8, 0.14);
      box(dark, tx + f * 2.24, 24.5, tz, 0.14, 3.8, 1.65);
    }
    tapered(roof, tx, 29.8, tz, 3.2, 0.18, 5.8, 1, 4);
    A.plaque(T, kit, 'CAO ĐẲNG SƯ PHẠM ĐÀ LẠT', 0, 3.8, 5.4, 6.6, 0.82, { bg: '#f2e6ca', fg: '#7c2b1e' });
    A.trees(T, kit, [
      { x: -16.5, z: 3.5, h: 14.0, kind: 'pine' }, { x: 18.2, z: 4.5, h: 13.5, kind: 'pine' },
      { x: -8.5, z: -8.5, h: 13.0, kind: 'pine' }, { x: 6.5, z: -9.5, h: 13.8, kind: 'pine' }
    ]);
  }

  const sights = [
    {
      id: 'chung-tich-son-my', name: 'Khu chứng tích Sơn Mỹ', city: 'TP. Quảng Ngãi', province: 'Quảng Ngãi',
      lon: 108.872704, lat: 15.177955, yaw: -1.312, width: 25, depth: 20,
      start: [108.871750, 15.177710],
      map: 'https://www.openstreetmap.org/node/13260659280',
      source: 'https://vovworld.vn/vi-VN/media/chung-tich-son-my-sau-50-nam-tham-sat-my-lai-1558953.vov5',
      build: chungTichSonMy
    },
    
    {
      id: 'nha-tho-go-kon-tum', name: 'Nhà thờ Gỗ Kon Tum', city: 'Kon Tum', province: 'Quảng Ngãi', formerProvince: 'Kon Tum',
      lon: 108.013228, lat: 14.345115, yaw: 1.636, width: 20, depth: 36,
      start: [108.013423, 14.345127], viewDistance: 1250,
      map: 'https://www.openstreetmap.org/way/464462559',
      source: 'https://dulichkontum.gov.vn/',
      build: nhaThoGoKonTum
    },
    {
      id: 'cau-treo-kon-klor', name: 'Cầu treo Kon Klor', city: 'Kon Tum', province: 'Quảng Ngãi', formerProvince: 'Kon Tum',
      lon: 108.035525, lat: 14.346990, yaw: -1.0523, width: 185, depth: 13,
      viewAngle: -0.45, viewElevation: 0.22,
      start: [108.03515, 14.34765], viewDistance: 1500,
      solids: [[0, -5.6, 108, 0.7], [0, 5.6, 108, 0.7]],
      map: 'https://www.openstreetmap.org/#map=17/14.34699/108.03553',
      source: 'https://dulichkontum.gov.vn/',
      build: cauTreoKonKlor
    },
    {
      id: 'thap-banh-it', name: 'Tháp Bánh Ít', city: 'Tuy Phước', province: 'Gia Lai', formerProvince: 'Bình Định',
      lon: 109.135186, lat: 13.868437, yaw: 0, width: 24, depth: 18,
      start: [109.137156,13.867346], viewDistance: 1350,
      solids:[[-1,0,9,6.3],[5,14,7.8,3.7],[26,54,5.7,4.5],[104,-21.5,6.4,1.4],[104,-14.5,6.4,1.4]],
      views:[{name:'Tháp chính và tháp Yên Ngựa',offset:[1,6],height:24,viewRadius:64,viewAngle:1.15},
        {name:'Qua tháp cổng',offset:[104,-18],height:12,viewRadius:34,viewAngle:1.73},
        {name:'Toàn cảnh sườn đồi',offset:[47,14],height:18,viewRadius:170,viewAngle:1.8,viewElevation:.52}],
      description:'Từ đường vào phía đông, tháp cổng mở lối lên đồi. Tháp chính và tháp mái cong hình yên ngựa đứng gần nhau ở đỉnh. Tháp còn lại nằm về phía đông nam.',
      map: 'https://www.openstreetmap.org/way/677227553',
      source: 'https://dsvh.gov.vn/Upload/files/Thap%20Cham%20Binh%20Dinh.pdf',
      build: thapBanhIt
    },
    {
      id: 'thap-duong-long', name: 'Tháp Dương Long', city: 'Tây Sơn', province: 'Gia Lai', formerProvince: 'Bình Định',
      lon: 108.990388, lat: 13.924992, yaw: -3.117, width: 38, depth: 18,
      start: [108.990374, 13.925552], viewDistance: 1450,
      map: 'https://www.openstreetmap.org/node/11784634071',
      source: 'https://dsvh.gov.vn/',
      build: thapDuongLong
    },
    {
      id: 'bao-tang-quang-trung', name: 'Bảo tàng Quang Trung', city: 'Tây Sơn', province: 'Gia Lai', formerProvince: 'Bình Định',
      lon: 108.920886, lat: 13.923923, yaw: 1.392, width: 28, depth: 26,
      start: [108.921996, 13.923728], viewDistance: 1300,
      map: 'https://www.openstreetmap.org/way/239866174',
      source: 'https://dsvh.gov.vn/',
      build: baoTangQuangTrung
    },
    {
      id: 'quang-truong-dai-doan-ket', name: 'Quảng trường Đại Đoàn Kết', city: 'Pleiku', province: 'Gia Lai',
      lon: 108.005989, lat: 13.982935, yaw: -2.177, width: 32, depth: 24,
      start: [108.005865, 13.983018], viewDistance: 1250,
      map: 'https://www.openstreetmap.org/node/5997147685',
      source: 'https://baochinhphu.vn/ket-luan-cua-ban-bi-thu-trung-uong-dang-ve-viec-xay-dung-tuong-dai-bac-ho-tai-gia-lai-10240252.htm',
      build: quangTruongDaiDoanKet
    },
    {
      id: 'tuong-dai-chien-thang-bmt', name: 'Tượng đài Chiến thắng Buôn Ma Thuột', city: 'Buôn Ma Thuột', province: 'Đắk Lắk',
      lon: 108.037800, lat: 12.679600, yaw: -2.521, width: 24, depth: 24,
      start: [108.037530, 12.679970], viewDistance: 1300,
      map: 'https://www.openstreetmap.org/#map=18/12.67960/108.03780',
      source: 'https://daklak.gov.vn/',
      build: tuongDaiChienThangBmt
    },
    {
      id: 'thap-nhan-tuy-hoa', name: 'Tháp Nhạn Tuy Hòa', city: 'Tuy Hòa', province: 'Đắk Lắk', formerProvince: 'Phú Yên',
      lon: 109.301598, lat: 13.082314, yaw: -0.860, width: 20, depth: 20,
      start: [109.301320, 13.082080], viewDistance: 1400,
      map: 'https://www.openstreetmap.org/node/4674771389',
      source: 'https://dsvh.gov.vn/',
      build: thapNhanTuyHoa
    },
    {
      id: 'nha-tho-mang-lang', name: 'Nhà thờ Mằng Lăng', city: 'Tuy An', province: 'Đắk Lắk', formerProvince: 'Phú Yên',
      lon: 109.236750, lat: 13.332450, yaw: 1.919, width: 22, depth: 34,
      start: [109.237180, 13.332603], viewDistance: 1200,
      map: 'https://www.openstreetmap.org/#map=17/13.33245/109.23675',
      source: 'https://phuyentourism.gov.vn/',
      build: nhaThoMangLang
    },
    {
      id: 'nha-tho-nui-nha-trang', name: 'Nhà thờ Núi Nha Trang', city: 'Nha Trang', province: 'Khánh Hòa',
      lon: 109.188128, lat: 12.246788, yaw: -0.512, width: 22, depth: 38,
      start: [109.187820, 12.246250], viewDistance: 1350,
      map: 'https://www.openstreetmap.org/way/162818208',
      source: 'https://nhatrang-travel.com/',
      build: nhaThoNuiNhaTrang
    },
    {
      id: 'chua-long-son-nha-trang', name: 'Chùa Long Sơn – Kim Thân Phật Tổ', city: 'Nha Trang', province: 'Khánh Hòa',
      lon: 109.180556, lat: 12.251258, yaw: 0, width: 29, depth: 32,
      modeledStairWays:[1239863980,1239863982,196896062],
      solids:[[0,0,12,13],[44,-87,6.7,6.7],[33,-41,2.7,2.7]],
      views:[{name:'Kim Thân Phật Tổ',offset:[44,-87],height:22,viewRadius:43,viewAngle:1.04},
        {name:'Chánh điện dưới chân đồi',offset:[0,0],height:10,viewRadius:49,viewAngle:-.32},
        {name:'Từ chánh điện lên đồi Trại Thủy',offset:[20,-40],height:27,viewRadius:138,viewAngle:1.07}],
      description:'Từ chánh điện ở chân đồi Trại Thủy, bậc đá dẫn lên gác chuông và tượng Kim Thân Phật Tổ ngồi trên đài sen trắng.',
      start: [109.180550, 12.250710], viewDistance: 1450,
      map: 'https://www.openstreetmap.org/way/196896036',
      source: 'https://dulichso.khanhhoa.gov.vn/article/chua-long-son-b4e',
      build: chuaLongSonNhaTrang
    },
    {
      id: 'thap-po-sah-inu', name: 'Tháp Pô Sah Inư', city: 'Phan Thiết', province: 'Lâm Đồng', formerProvince: 'Bình Thuận',
      lon: 108.146122, lat: 10.936053, yaw: -2.282, width: 28, depth: 20,
      start: [108.145490, 10.936590], viewDistance: 1300,
      map: 'https://www.openstreetmap.org/node/491586802',
      source: 'https://dsvh.gov.vn/',
      build: thapPoSahInu
    },
    {
      id: 'thap-nuoc-phan-thiet', name: 'Tháp Nước Phan Thiết', city: 'Phan Thiết', province: 'Lâm Đồng', formerProvince: 'Bình Thuận',
      lon:108.1000173,lat:10.9287668,yaw:2.355,width:16,depth:16,
      start:[108.0997649,10.9285053],viewDistance:1450,mappedEntrance:true,approachMeters:40,
      arrivalNote:'Từ đường Bà Triệu đi vào Công viên Tháp Nước ở bờ bắc sông Cà Ty.',
      map:'https://www.openstreetmap.org/node/2666384178',
      source:'https://baolamdong.vn/cong-nhan-thap-nuoc-phan-thiet-la-di-tich-lich-su-van-hoa-cap-tinh-309191.html',
      build: thapNuocPhanThiet
    },
    {
      id: 'quang-truong-lam-vien', name: 'Quảng trường Lâm Viên', city: 'Đà Lạt', province: 'Lâm Đồng',
      lon:108.4441707,lat:11.9385315,yaw:0,width:22,depth:22,
      start:[108.4439198,11.9392552],viewDistance:1350,mappedEntrance:true,approachMeters:85,
      solids:[[0,0,8.5,8.5],[132.98,5.93,16.7,16.7]],
      views:[{name:'Nụ hoa Atisô',offset:[0,0],height:16,viewRadius:38,viewAngle:2.46,viewElevation:.17},
        {name:'Khối hoa Dã Quỳ',offset:[132.98,5.93],height:19,viewRadius:57,viewAngle:2.9,viewElevation:.19},
        {name:'Toàn cảnh quảng trường',offset:[68,3],height:16,viewRadius:181,viewAngle:2.96,viewElevation:.43}],
      arrivalNote:'Từ đường Trần Quốc Toản bên hồ Xuân Hương đi vào quảng trường. Nụ Atisô ở phía tây, khối hoa Dã Quỳ ở phía đông.',
      map:'https://www.openstreetmap.org/way/1304080959',
      source:'https://visitlamdong.vn/vi/quangtruonglamvien',
      build: quangTruongLamVien
    },
    {
      id: 'nha-tho-con-ga-da-lat', name: 'Nhà thờ Con Gà Đà Lạt', city: 'Đà Lạt', province: 'Lâm Đồng',
      lon: 108.437600, lat: 11.936640, yaw: -2.554, width: 22, depth: 38,
      start: [108.437464, 11.936803], viewDistance: 1450,
      map: 'https://www.openstreetmap.org/#map=18/11.93664/108.43760',
      source: 'https://dalat.lamdong.gov.vn/',
      build: nhaThoConGaDaLat
    },
    {
      id: 'cd-su-pham-da-lat', name: 'Cao đẳng Sư phạm Đà Lạt', city: 'Đà Lạt', province: 'Lâm Đồng',
      lon: 108.455750, lat: 11.934750, yaw: -2.816, width: 38, depth: 20,
      start: [108.455220, 11.936290], viewDistance: 1400,
      map: 'https://www.openstreetmap.org/#map=17/11.93475/108.45575',
      source: 'https://dalat.lamdong.gov.vn/',
      build: cdSuPhamDaLat
    }
  ];

  window.VietnamSights = (window.VietnamSights || []).concat(sights);
})();
