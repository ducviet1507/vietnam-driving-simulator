'use strict';
(() => {
  const A = window.CentralArch;

  // Waves have cut a low opening through one continuous tongue of basalt.
  function congToVoLySon(T, {group, random}) {
    const positions=[],colors=[],indices=[],shade=new T.Color();
    function add(x,y,z,tint,light){
      positions.push(x,y,z);shade.setHex(tint).multiplyScalar(light);
      colors.push(shade.r,shade.g,shade.b);
    }
    const rows=92,sides=36;
    for(let j=0;j<=rows;j++){
      const x=-10.5+21*j/rows;
      for(let i=0;i<sides;i++){
        const a=i*2*Math.PI/sides,c=Math.cos(a),s=Math.sin(a);
        const shoulder=1-Math.exp(-(((x+1)*.21)**4));
        const aperture=Math.max(0,1-((x+1+.31*s)/4.55)**2);
        const rough=.11*Math.sin(2.3*x+5*s)+.08*Math.cos(5.13*x-4*c)+.06*Math.sin(8*x+a*7);
        const base=-.83+2.91*aperture**.39+.13*Math.sin(4*x)*aperture;
        const crown=2.58+.32*shoulder+.20*Math.sin(.78*x)-Math.max(0,Math.abs(x)-7)*.95;
        const y=(crown+base)/2+(crown-base)/2*Math.sign(c)*Math.abs(c)**.62+rough;
        const z=.63*Math.sin(x*.30)+(.82+1.54*shoulder+rough)*Math.sign(s)*Math.abs(s)**.72;
        const tint=y<.42?0x485447:c<-.35?0x5b5148:0x66605a;
        add(x+rough*.35,y,z,tint,.83+rough*.73+.15*Math.cos(x*3.2+a));
        if(j){
          const k=j*sides+i,next=j*sides+(i+1)%sides;
          indices.push(k-sides,next-sides,k,k,next-sides,next);
        }
      }
    }
    // Broken, partly submerged lava beds leave narrow sea channels between them.
    for(let island=0;island<36;island++){
      const x=(random()-.5)*29,z=(random()-.5)*17;
      if(Math.abs(x+1)<4.6&&Math.abs(z)<2)continue;
      const width=.58+random()*2.3,depth=width*(.32+.37*random()),h=.18+random()*.45;
      const first=positions.length/3,turn=random()*6.28,segments=15;
      for(let r=0;r<4;r++)for(let i=0;i<segments;i++){
        const a=2*Math.PI*i/segments,rad=[1.1,1,.77,.02][r];
        const edge=1+.15*Math.sin(a*4+island)+.11*Math.cos(a*3.0-.4*island);
        const dx=width*Math.cos(a)*rad*edge,dz=depth*Math.sin(a)*rad*edge;
        const top=h*(1+.13*Math.sin(a*3+island));
        add(x+dx*Math.cos(turn)-dz*Math.sin(turn),[-.68,top*.42,top,top*1.03][r],z+dx*Math.sin(turn)+dz*Math.cos(turn),
          island%4===0&&r>=2?0x566140:0x504d47,.78+.16*r+.10*Math.sin(a*3+island));
        if(r){
          const k=first+r*segments+i,next=first+r*segments+(i+1)%segments;
          indices.push(k-segments,k,next-segments,next-segments,k,next);
        }
      }
    }
    const g=new T.BufferGeometry();g.setIndex(indices);g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();
    const ridge=new T.Mesh(g,globalThis.createSightStoneMaterial(T));ridge.castShadow=ridge.receiveShadow=true;group.add(ridge);
  }

  // 2. Bảo tàng Tổng hợp Quảng Ngãi — Terracotta & cream museum with tiered traditional roof & Sa Huỳnh jar monument
  function baoTangQuangNgai(T, kit) {
    const { box, stamp, round, tapered } = kit;
    const cream = 0xf0e7d4, trim = 0xd6c4a0, roof = 0x993e2b, glass = 0x264456, stone = 0xa29c90;
    kit.palette({plaster: cream, glass, stone});

    box(stone, 0, 0.18, 0, 32, 0.36, 24);
    A.steps(kit, 0, 9.6, 12.6, 2.0, 4, 0.22, 0.40, 0x8d877d);

    // 2-story warm cream museum pavilion with bold vertical colonnade
    box(cream, 0, 4.4, -1.6, 26.4, 8.2, 13.6);
    for (let i = -5; i <= 5; i++) {
      box(trim, i * 2.4, 4.4, 5.34, 0.42, 8.0, 0.56);
      if (i < 5) {
        box(glass, (i + 0.5) * 2.4, 2.45, 5.24, 1.55, 2.6, 0.14);
        box(glass, (i + 0.5) * 2.4, 6.15, 5.24, 1.55, 2.4, 0.14);
      }
    }
    // Tiered Vietnamese curved terracotta roof crowning the museum
    A.curvedRoof(T, kit, 0, 8.55, -1.6, 28.4, 15.6, 2.05, roof, cream, 0xd4a448, 0.34);
    box(cream, 0, 11.15, -1.6, 15.2, 1.65, 8.6);
    A.curvedRoof(T, kit, 0, 12.0, -1.6, 17.6, 10.6, 2.1, roof, cream, 0xd4a448, 0.32);

    // Iconic Sa Huỳnh Culture burial jar sculpture on granite plinth in courtyard!
    box(0x868075, -10.8, 0.52, 7.2, 3.2, 0.72, 3.2);
    tapered(0xa95b3c, -10.8, 1.75, 7.2, 0.78, 1.12, 1.65, 1, 12);
    tapered(0x944b30, -10.8, 2.95, 7.2, 1.12, 0.65, 0.85, 1, 12);

    A.plaque(T, kit, 'BẢO TÀNG TỔNG HỢP QUẢNG NGÃI', 0, 4.65, 5.75, 8.8, 0.95, { bg: '#73231b', fg: '#f8e084' });
    A.trees(T, kit, [
      { x: 11.8, z: 7.4, h: 7.8, kind: 'banyan' },
      { x: -13.4, z: -6.8, h: 8.2, kind: 'banyan' }
    ]);
  }

  // 3. Tháp Cánh Tiên (An Nhơn, Gia Lai / Bình Định) — 12th-century Champa "Fairy Wings" tower with sandstone wing flares
  function thapCanhTien(T, kit) {
    const { box, outline } = kit;
    const brick = 0xa95239, darkBrick = 0x853d2a, sandstone = 0xd6cab2, stone = 0x8e8679;
    kit.palette({brick: [brick, darkBrick], stone: [sandstone, stone]});

    // Laterite hill platform & stone steps
    box(0x7c7864, 0, 0.35, 0, 22, 0.7, 22);
    A.steps(kit, 0, 11.6, 5.2, 1.8, 4, 0.18, 0.38, stone);

    // Core 20m tall Champa Kalan brick tower
    A.chamTower(T, kit, 0, -0.8, { w: 8.2, h: 20.4, brick, darkBrick, sandstone });

    // Signature pale-sandstone "Fairy Wings" corner flares (cánh tiên đá sa thạch) curving out from upper tiers!
    for (const [ty, span, scale] of [[10.2, 4.35, 1.15], [13.4, 3.45, 0.95], [16.2, 2.65, 0.76]]) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const ang = Math.atan2(sx, sz);
        outline(
          [[0, 0], [0.95 * scale, 0.35 * scale], [1.25 * scale, 1.75 * scale], [0.42 * scale, 1.35 * scale], [0, 0.85 * scale]],
          sandstone, sx * span, ty, -0.8 + sz * span, 0.24, ang
        );
      }
    }

    A.plaque(T, kit, 'THÁP CÁNH TIÊN', 0, 1.25, 9.8, 4.4, 0.68, { bg: '#6e2c20', fg: '#f6dc84' });
    A.trees(T, kit, [
      { x: -9.8, z: -8.6, h: 8.2, kind: 'banyan' },
      { x: 9.8, z: -8.2, h: 7.8, kind: 'banyan' }
    ]);
  }

  // 4. Tháp Bình Lâm (Tuy Phước, Gia Lai / Bình Định) — Rare early-11th-century lowland Champa Kalan amid coconut palms
  function thapBinhLam(T, kit) {
    const { box } = kit;
    box(0x9a917e, 0, 0.22, 0, 20, 0.44, 20);
    A.chamTower(T, kit, 0, -0.6, {
      w: 8.4, h: 19.6,
      brick: 0x9e4b34,
      darkBrick: 0x7b3826,
      sandstone: 0xcabca0
    });
    A.plaque(T, kit, 'THÁP BÌNH LÂM', 0, 1.1, 8.8, 4.2, 0.66, { bg: '#6b2a1e', fg: '#f6dc82' });
    // Iconic lowland Bình Định village coconut palms surrounding the tower!
    A.trees(T, kit, [
      { x: -8.8, z: -7.2, h: 10.2, kind: 'palm' },
      { x: -9.6, z: 3.4, h: 9.4, kind: 'palm' },
      { x: 8.8, z: -6.8, h: 10.6, kind: 'palm' },
      { x: 9.4, z: 4.2, h: 9.2, kind: 'palm' }
    ]);
  }

  // 5. Tượng đài Trần Hưng Đạo (Bán đảo Phương Mai, Quy Nhơn) — Towering seaside granite cliff plinth & heroic bronze statue
  function tranHungDaoQuyNhon(T, kit) {
    const { box, stamp, round, tapered } = kit;
    const granite = 0xaba69c, darkGranite = 0x79746b, bronze = 0x5d4c35, patina = 0x4c685c;
    kit.palette({stone: [granite, darkGranite], metal: bronze});

    // Dramatic stepped coastal mountain summit platform
    box(darkGranite, 0, 0.65, 0, 28, 1.3, 24);
    A.steps(kit, 0, 12.6, 10.4, 2.4, 5, 0.26, 0.45, granite);
    box(granite, 0, 1.65, -1.4, 16.4, 1.2, 13.6);

    // Red coping courses and the inset relief panel beneath the ochre figure.
    const ochre=0xb89a5a, surround=0x944a34, base=5.8, h=10.1;
    kit.palette({stone:[ochre,surround]});
    box(surround,0,2.55,-1.4,7.8,.6,5.4);
    box(0x977f63,0,4.12,-1.4,7.05,2.60,4.87);
    box(surround,0,5.62,-1.4,7.55,.36,5.20);
    box(bronze,0,4.15,1.09,4.56,1.85,.16);
    for (const s of [-1,1]) {
      box(granite,s*7.8,3.45,-3.2,6.8,3.4,1.15,-s*.28);
      box(patina,s*7.8,3.45,-2.56,5.8,2.25,.16,-s*.28);
    }
    A.statueFigure(T,kit,ochre,0,base,-1.4,h,{beard:true,longCoat:true,stepUp:.073,
      rightArm:[[-.170,.805,.109],[-.22,.859,.244],[-.235,.881,.292]],
      leftArm:[[.168,.655,.017],[.128,.557,.083],[.124,.520,.101]]});
    const armor=A.carving(T,kit,ochre,0,base,-1.4,h);
    armor.sweep([[0,.948,0,.066,.064],[0,.956,0,.068,.066],[0,.990,-.004,.049,.052],[0,1.007,-.004,.027,.028],
      [0,1.020,-.005,.010,.012]],.035);
    armor.sweep([[0,.603,0,.093,.062],[0,.614,.002,.103,.072],[0,.641,.002,.105,.072],[0,.647,0,.094,.061]]);
    armor.sweep([[.122,.549,.098,.014,.014],[.126,.526,.106,.027,.016],[.154,.440,.126,.020,.016],
      [.211,.231,.129,.018,.014],[.235,.162,.119,.010,.009]]);
    armor.sweep([[-.233,.876,.288,.009,.010],[-.243,.894,.331,.008,.008],[-.251,.906,.354,.005,.006]]);
    armor.sweep([[-.075,.008,.088,.080,.099],[-.071,.040,.075,.076,.091],[-.070,.080,.078,.058,.078]],.06);
    armor.finish();

    A.plaque(T, kit, 'TRẦN HƯNG ĐẠO - QUY NHƠN', 0, 2.75, 4.9, 7.6, 0.92, { bg: '#5a221b', fg: '#f8e084' });
  }

  // 6. Biệt điện Bảo Đại (Buôn Ma Thuột, Đắk Lắk) — 1926 Central Highlands Êđê longhouse-inspired royal stilt villa
  function bietDienBaoDaiBmt(T, kit) {
    const { box, stamp, round } = kit;
    const cream = 0xeee4ce, timber = 0x5c3620, roof = 0x8f3f2b, stone = 0x8e877c, shutter = 0x264a38;
    kit.palette({plaster: cream, timber: [timber, shutter], stone});

    // Shaded basalt-earth courtyard & wide ceremonial garden walk
    box(0x8e7c64, 0, 0.14, 0.5, 34, 0.28, 22);

    // Signature elevated stilt undercroft inspired by Êđê longhouses (nhà sàn Tây Nguyên)!
    for (let i = -5; i <= 5; i++) {
      for (const pz of [-5.2, -1.8, 1.8, 5.2]) {
        box(stone, i * 2.55, 1.15, pz, 0.62, 2.2, 0.62);
      }
    }
    // Timber floor deck slab & grand sweeping double central front staircase
    box(timber, 0, 2.38, 0, 27.6, 0.45, 11.8);
    A.steps(kit, 0, 7.2, 6.2, 2.6, 6, 0.38, 0.44, stone);
    for (const s of [-1, 1]) {
      box(cream, s * 3.25, 1.55, 7.4, 0.35, 1.8, 3.2);
    }

    // Long horizontal colonial-highlands royal pavilion body with wraparound wooden veranda
    box(cream, 0, 4.75, -0.4, 24.4, 4.4, 8.8);
    for (let i = -5; i <= 5; i++) {
      const px = i * 2.4;
      stamp(round, timber, px, 4.7, 5.45, 0.17, 4.4, 0.17);
      if (i < 5) {
        box(0x28363c, (i + 0.5) * 2.4, 4.75, 4.05, 1.32, 2.65, 0.14);
        for (const sf of [-1, 1]) box(shutter, (i + 0.5) * 2.4 + sf * 0.78, 4.75, 4.12, 0.30, 2.6, 0.08);
      }
    }
    // Wooden veranda balustrade along the entire longhouse front
    box(timber, -7.8, 3.15, 5.45, 10.6, 0.92, 0.16);
    box(timber, 7.8, 3.15, 5.45, 10.6, 0.92, 0.16);

    // Sweeping wide overhanging red-tile hip roof sheltering the entire veranda
    A.curvedRoof(T, kit, 0, 6.95, 0, 29.4, 13.8, 3.4, roof, cream, 0xcba152, 0.36);

    A.plaque(T, kit, 'BIỆT ĐIỆN BẢO ĐẠI', 0, 6.55, 5.65, 5.6, 0.78, { bg: '#5a2b1c', fg: '#f8e084' });
    // Iconic ancient towering Buôn Ma Thuột shade trees (Cây Long Não cổ thụ!)
    A.trees(T, kit, [
      { x: -15.4, z: 6.4, h: 11.4, kind: 'banyan' },
      { x: 15.4, z: 6.4, h: 11.8, kind: 'banyan' },
      { x: -14.8, z: -7.8, h: 10.8, kind: 'banyan' },
      { x: 14.8, z: -7.8, h: 11.0, kind: 'banyan' }
    ]);
  }

  // 7. Chùa Thanh Lương (Tuy An, Đắk Lắk / Phú Yên) — Coral-stone & coconut-shell pagoda with Hồ Vô Cực emerging Quan Âm!
  function chuaThanhLuong(T, kit) {
    const { box, stamp, round, tapered } = kit;
    const coral = 0xded4be, coralDark = 0xb8ad96, coconutWood = 0x4e3222, tile = 0x8e422e, gold = 0xdba944, emeraldPool = 0x26858a, marble = 0xf2f0ea;
    kit.palette({tile, stone: marble});

    // Coastal coral-stone courtyard
    box(0xc5bba4, 0, 0.16, 1.0, 28, 0.32, 26);

    // Signature Hồ Vô Cực (Emerald Infinity Pool) on front-right with the famous emerging white Quan Âm Bồ Tát!
    const px = 4.6, pz = 6.2;
    box(coralDark, px, 0.38, pz, 11.4, 0.62, 7.8);
    box(emeraldPool, px, 0.54, pz, 10.4, 0.34, 6.8);
    // Floating carved white-marble bust & serene outstretched hand emerging gracefully from the emerald pool
    tapered(marble, px - 1.2, 1.32, pz - 0.2, 1.55, 0.92, 1.45, 0.8, 12); // emerging shoulders & robe
    const qHead = new T.SphereGeometry(0.68, 12, 10);
    stamp(qHead, marble, px - 1.2, 2.52, pz - 0.2);
    qHead.dispose();
    tapered(marble, px - 1.2, 3.25, pz - 0.2, 0.45, 0.26, 0.55, 1, 8); // Buddhist topknot & veil
    // Emerging blessing hand rising from the water beside her
    tapered(marble, px + 2.2, 1.45, pz + 0.6, 0.44, 0.28, 1.55, 0.7, 8, 0, 0, -0.18);

    // Porous coral-rock & coconut-shell sculpted Tam Quan gate on front-left
    const gx = -5.6, gz = 8.4;
    A.vaultedBay(T, kit, gx, gz, 4.8, 4.4, 1.45, 2.2, 2.2, coral, coconutWood, coralDark);
    A.curvedRoof(T, kit, gx, 4.45, gz, 5.8, 3.2, 0.96, tile, coral, gold, 0.28, { dragons: true, goldColor: gold });
    A.plaque(T, kit, 'CHÙA THANH LƯƠNG', gx, 3.92, gz + 1.18, 4.0, 0.64, { bg: '#4f301e', fg: '#f8df7c' });

    // Main Chánh Điện crafted with pale coral-stone walls, dark coconut-shell timber columns & double curved roofs
    const hz = -4.6;
    box(coralDark, 0, 0.58, hz, 17.6, 1.16, 10.6);
    A.steps(kit, 0, hz + 5.8, 5.8, 1.4, 4, 0.28, 0.38, 0xa89f8b);
    box(coral, 0, 3.0, hz - 0.3, 15.0, 3.7, 8.2);
    for (let i = -3; i <= 3; i++) {
      stamp(round, coconutWood, i * 2.3, 3.0, hz + 4.15, 0.20, 3.7, 0.20);
    }
    A.curvedRoof(T, kit, 0, 4.88, hz, 18.0, 10.8, 1.65, tile, coral, gold, 0.32);
    box(coconutWood, 0, 7.05, hz, 11.2, 1.65, 6.2);
    A.curvedRoof(T, kit, 0, 7.9, hz, 13.2, 8.2, 1.9, tile, coral, gold, 0.30, { dragons: true, goldColor: gold });

    A.trees(T, kit, [
      { x: -11.8, z: -6.8, h: 9.2, kind: 'palm' },
      { x: 11.8, z: -6.8, h: 9.6, kind: 'palm' },
      { x: -11.4, z: 7.2, h: 8.6, kind: 'palm' },
      { x: 12.2, z: 7.4, h: 8.8, kind: 'palm' }
    ]);
  }

  // 8. Viện Hải dương học Nha Trang (1922) — Classic yellow French coastal villa overlooking Nha Trang Bay
  function vienHaiDuongHoc(T, kit) {
    const { box, stamp, round, outline } = kit;
    const yellow = 0xe8cc7d, cream = 0xf4efe2, shutter = 0x265242, roof = 0x9b422e, blue = 0x236484, stone = 0x9f998d;
    kit.palette({plaster: cream, timber: shutter, stone});

    box(stone, 0, 0.18, 0, 32, 0.36, 22);
    A.steps(kit, 0, 8.2, 9.6, 1.8, 4, 0.20, 0.38, 0x8f8a7f);

    // Main 2-story 1922 French colonial marine institute building
    box(yellow, 0, 4.8, -1.2, 26.8, 8.8, 12.2);
    for (const y of [0.85, 4.85, 9.2]) box(cream, 0, y, -1.2, 27.6, 0.32, 12.8);
    A.gabledRoof(T, kit, 0, 9.35, -1.2, 27.4, 12.6, 2.65, roof, cream, { alongX: true, overhang: 0.55 });

    // Arched coastal loggia bays & green louvered shutters
    for (let i = -5; i <= 5; i++) {
      if (Math.abs(i) <= 1) continue;
      const x = i * 2.4;
      for (const wy of [2.75, 6.85]) {
        box(0x283640, x, wy, 4.96, 1.25, 2.35, 0.14);
        for (const sf of [-1, 1]) box(shutter, x + sf * 0.76, wy, 5.02, 0.30, 2.3, 0.08);
        box(cream, x, wy + 1.28, 5.04, 1.65, 0.20, 0.16);
      }
      box(cream, x + 1.2, 4.8, 5.02, 0.24, 8.6, 0.22);
    }

    // Projecting central gabled portico + marine anchor/wave crest
    box(yellow, 0, 5.2, 5.6, 8.2, 9.6, 2.2);
    A.vaultedBay(T, kit, 0, 6.2, 7.6, 4.4, 1.75, 2.15, 1.2, yellow, cream, 0x5c4a38);
    outline([[-4.4, 0], [0, 2.35], [4.4, 0]], cream, 0, 9.95, 5.6, 1.4);
    outline([[-4.7, -0.06], [0, 2.58], [4.7, -0.06], [4.3, -0.32], [0, 2.16], [-4.3, -0.32]], roof, 0, 10.0, 5.5, 1.6);
    stamp(round, blue, 0, 10.95, 7.05, 0.65, 0.14, 0.65, 0, Math.PI / 2);

    A.plaque(T, kit, 'VIỆN HẢI DƯƠNG HỌC NHA TRANG', 0, 5.05, 6.92, 7.8, 0.88, { bg: '#1e5274', fg: '#f8e28c' });
    A.trees(T, kit, [
      { x: -13.4, z: 7.4, h: 9.2, kind: 'palm' },
      { x: 13.4, z: 7.4, h: 9.2, kind: 'palm' },
      { x: -14.2, z: -6.4, h: 8.6, kind: 'palm' },
      { x: 14.2, z: -6.4, h: 8.6, kind: 'palm' }
    ]);
  }

  // 9. Tháp Chăm Po Rome (Ninh Phước, Khánh Hòa / Ninh Thuận) — 17th-century royal hill Kalan + Queen's brick shrine
  function thapPoRome(T, kit) {
    const { box, stamp, round } = kit;
    const brick = 0xa85239, darkBrick = 0x823c29, sandstone = 0xcebda0, dryHill = 0x9c8b68;
    kit.palette({brick: [brick, darkBrick], stone: sandstone});

    // Sun-baked Ninh Thuận stone hill terrace & boulder outcrops
    box(dryHill, 0, 0.35, 0, 26, 0.7, 24);
    A.steps(kit, 0, 12.6, 5.2, 2.0, 4, 0.18, 0.42, 0x867b67);

    // Main square red-brick Kalan of King Po Rome
    A.chamTower(T, kit, -1.8, -1.2, { w: 7.8, h: 17.8, brick, darkBrick, sandstone });

    // Smaller brick Queen's Shrine (Đền thờ Hoàng hậu Po Bia Sucih) beside main tower
    A.chamTower(T, kit, 7.4, 1.8, { w: 4.2, h: 8.6, brick: 0x9b4933, darkBrick, sandstone });

    // Sandstone Nandin sacred bull sculpture on plinth in forecourt
    box(sandstone, -1.8, 0.85, 6.8, 1.8, 0.55, 2.4);
    box(0xd8ccb2, -1.8, 1.48, 6.8, 0.95, 0.85, 1.65);

    A.plaque(T, kit, 'THÁP PO ROME', -1.8, 1.15, 10.6, 4.4, 0.68, { bg: '#6e2a1e', fg: '#f8dc82' });
  }

  // 10. Chùa Linh Phước — Chùa Ve Chai (Trại Mát, Đà Lạt) — 7-tier ceramic-mosaic bell tower + coiled mosaic Dragon!
  function chuaLinhPhuoc(T, kit) {
    const { box, stamp, round, tapered } = kit;
    const cobalt = 0x1e5c94, emerald = 0x2a7d62, gold = 0xe8b938, crimson = 0x9e2b24, mosaicWhite = 0xefe9db, stone = 0x9c968a;
    kit.palette({stone});

    // Ornate tile courtyard
    box(0xb5a68e, 0, 0.16, 1.0, 32, 0.32, 28);

    // Iconic 7-tier Linh Tháp Bell Tower (37m mosaic pagoda!) on right flank — glistening in cobalt, gold & emerald mosaic!
    A.octagonalTower(T, kit, 9.6, -1.2, {
      tiers: 7,
      baseW: 4.2,
      tierH: 2.35,
      wall: mosaicWhite,
      tile: cobalt,
      trim: gold
    });
    // Additional colorful mosaic accents on tower base
    stamp(round, crimson, 9.6, 1.2, -1.2, 4.4, 0.5, 4.4);

    // Famous 49m Coiled Broken-Bottle Mosaic Dragon (Con Rồng 12.000 vỏ chai!) winding across front garden pool!
    stamp(round, stone, -6.2, 0.34, 7.6, 5.2, 0.45, 4.2);
    stamp(round, 0x2b7280, -6.2, 0.46, 7.6, 4.7, 0.22, 3.7);
    for (let k = 0; k < 18; k++) {
      const t = k / 17;
      const ang = t * Math.PI * 2.4;
      const rx = -6.2 + Math.cos(ang) * (3.6 - t * 1.4);
      const rz = 7.6 + Math.sin(ang) * (2.6 - t * 0.9);
      const ry = 0.85 + Math.sin(t * Math.PI * 3) * 0.55 + t * 1.65;
      const seg = new T.SphereGeometry(0.48 - t * 0.08, 8, 8);
      stamp(seg, k % 3 === 0 ? emerald : (k % 3 === 1 ? gold : cobalt), rx, ry, rz);
      seg.dispose();
    }
    // Raised mosaic Dragon Head facing forward with crimson crest!
    box(gold, -4.6, 2.75, 9.4, 1.05, 0.95, 1.45, 0.35);
    box(crimson, -4.6, 3.35, 9.2, 0.55, 0.55, 0.95, 0.35);

    // Ornate polychrome Chánh Điện main sanctuary on left-rear with dragon-covered curved roofs
    const hz = -5.6, hx = -3.8;
    box(stone, hx, 0.58, hz, 16.4, 1.16, 10.6);
    A.steps(kit, hx, hz + 5.8, 5.8, 1.4, 4, 0.28, 0.38, 0x868075);
    box(mosaicWhite, hx, 3.05, hz - 0.3, 14.0, 3.8, 8.2);
    for (let i = -3; i <= 3; i++) {
      stamp(round, i % 2 ? cobalt : crimson, hx + i * 2.1, 3.05, hz + 4.15, 0.22, 3.8, 0.22);
    }
    A.curvedRoof(T, kit, hx, 4.95, hz, 16.8, 10.8, 1.65, gold, crimson, emerald, 0.32);
    box(cobalt, hx, 7.15, hz, 10.6, 1.65, 6.2);
    A.curvedRoof(T, kit, hx, 8.0, hz, 12.6, 8.0, 1.9, emerald, gold, crimson, 0.30, { dragons: true, goldColor: gold });

    A.plaque(T, kit, 'CHÙA LINH PHƯỚC - CHÙA VE CHAI', -2.0, 4.35, hz + 4.45, 7.2, 0.78, { bg: '#1a4c80', fg: '#f8e276' });
    A.trees(T, kit, [
      { x: -13.6, z: -7.2, h: 11.2, kind: 'pine' },
      { x: 13.8, z: 8.6, h: 10.4, kind: 'pine' }
    ]);
  }

  // 11. Thiền viện Trúc Lâm (Hồ Tuyền Lâm, Đà Lạt) — Serene Zen monastery with golden-brown curved roofs & pine canopy
  function thienVienTrucLam(T, kit) {
    const { box, stamp, round, tapered } = kit;
    const white = 0xf0ece0, wood = 0x5c2f1d, glazeBrown = 0x7b4726, gold = 0xdba944, stone = 0x928d82;
    kit.palette({timber: wood, stone});

    // Stepped hilltop monastery plaza with central hydrangea flowerbed
    box(stone, 0, 0.24, 1.0, 30, 0.48, 28);
    A.steps(kit, 0, 14.4, 6.8, 2.2, 5, 0.22, 0.42, 0x7f7a70);

    // Graceful 3-arch white-and-timber Tam Quan gate
    A.vaultedBay(T, kit, 0, 10.4, 5.0, 4.5, 1.52, 2.25, 2.2, white, wood, 0x4b3828);
    for (const s of [-1, 1]) {
      A.vaultedBay(T, kit, s * 4.3, 10.4, 3.4, 3.2, 0.94, 1.6, 1.8, white, wood, 0x4b3828);
      A.curvedRoof(T, kit, s * 4.3, 3.25, 10.4, 4.2, 2.6, 0.82, glazeBrown, 0xd8cab0, gold, 0.26);
    }
    A.curvedRoof(T, kit, 0, 4.55, 10.4, 6.0, 3.2, 0.98, glazeBrown, 0xd8cab0, gold, 0.28);
    A.plaque(T, kit, 'THIỀN VIỆN TRÚC LÂM', 0, 3.95, 11.6, 4.8, 0.66, { bg: '#5a2b18', fg: '#f8df7c' });

    // Flanking hexagonal Lầu Chuông & Lầu Trống pavilions
    for (const s of [-1, 1]) {
      const bx = s * 9.8, bz = 2.6;
      stamp(round, stone, bx, 0.48, bz, 2.5, 0.64, 2.5);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        stamp(round, wood, bx + Math.sin(a) * 1.85, 2.15, bz + Math.cos(a) * 1.85, 0.14, 2.8, 0.14);
      }
      tapered(glazeBrown, bx, 4.35, bz, 2.95, 0.35, 1.75, 1, 6);
    }

    // Serene double-tier Zen Chánh Điện sanctuary with gleaming brown-gold tiles
    A.vietnameseHall(T, kit, {
      w: 16.4, d: 10.2, baseH: 1.15, colH: 3.65,
      wall: white, wood, tile: glazeBrown, ridge: 0xd9cbb0, eave: gold,
      doubleTier: true, bays: 5
    });

    // Dense Đà Lạt mountain pine canopy framing Phượng Hoàng Hill
    A.trees(T, kit, [
      { x: -13.2, z: -8.6, h: 12.8, kind: 'pine' },
      { x: -8.8, z: -11.4, h: 13.6, kind: 'pine' },
      { x: 8.8, z: -11.4, h: 13.4, kind: 'pine' },
      { x: 13.2, z: -8.6, h: 12.6, kind: 'pine' },
      { x: -12.6, z: 9.2, h: 11.2, kind: 'pine' },
      { x: 12.6, z: 9.2, h: 11.4, kind: 'pine' }
    ]);
  }

  // 12. Dinh III Bảo Đại (Đà Lạt, Lâm Đồng) — Iconic 1933 French Art Deco Royal Summer Palace & terraced rose garden
  function dinh3BaoDaiDaLat(T, kit) {
    const { box, stamp, round } = kit;
    const cream = 0xf2e4b8, ivory = 0xf6f3ea, trim = 0xd6c698, glass = 0x2b4b5e, grass = 0x4b7740, rose = 0xc9425a, stone = 0x9b968a;
    kit.palette({plaster: cream, glass, stone});

    // Formal French terraced royal lawn & rose garden beds
    box(grass, 0, 0.16, 1.0, 34, 0.32, 26);
    box(stone, 0, 0.30, 8.2, 8.4, 0.18, 10.5); // central circular driveway approach
    for (const s of [-1, 1]) {
      box(rose, s * 8.6, 0.38, 8.8, 5.2, 0.24, 3.4);
      box(0xe2b642, s * 8.6, 0.38, 5.2, 4.4, 0.24, 2.2);
    }

    // Clean geometric 2-story 1933 Art Deco villa with crisp flat horizontal roof slabs!
    const vz = -2.8;
    box(stone, 0, 0.55, vz, 24.4, 1.1, 12.4);
    box(cream, 0, 4.35, vz, 22.8, 6.8, 10.8);
    // Crisp white Art Deco horizontal bands & flat overhanging modernist roof slab
    for (const y of [1.15, 4.45, 7.85]) {
      box(ivory, 0, y, vz, 23.6, 0.34, 11.6);
    }
    box(ivory, 0, 8.25, vz, 24.2, 0.38, 12.2);
    // Upper recessed 3rd-level royal study / sun terrace penthouse
    box(cream, -2.4, 9.65, vz - 0.8, 11.4, 2.6, 7.2);
    box(ivory, -2.4, 11.05, vz - 0.8, 12.2, 0.32, 7.8);

    // Signature rounded Art Deco glass conservatory bay on the right corner!
    stamp(round, cream, 11.2, 4.45, vz + 2.6, 2.85, 6.8, 2.85);
    stamp(round, glass, 11.2, 2.75, vz + 2.6, 2.92, 2.15, 2.92);
    stamp(round, glass, 11.2, 6.15, vz + 2.6, 2.92, 2.15, 2.92);
    stamp(round, ivory, 11.2, 7.95, vz + 2.6, 3.15, 0.36, 3.15);

    // Wide modernist ribbon windows across front facade + cantilevered porte-cochère entry canopy
    for (let i = -3; i <= 2; i++) {
      const wx = i * 3.1;
      box(glass, wx, 2.8, vz + 5.45, 2.15, 2.1, 0.14);
      box(glass, wx, 6.15, vz + 5.45, 2.15, 2.1, 0.14);
      box(trim, wx, 4.45, vz + 5.48, 2.35, 0.22, 0.16);
    }
    // Sweeping front porte-cochère canopy & balcony
    box(ivory, -0.5, 4.35, vz + 7.4, 8.4, 0.38, 4.2);
    for (const sx of [-4.2, 3.2]) stamp(round, ivory, sx, 2.4, vz + 9.0, 0.24, 3.8, 0.24);
    A.steps(kit, -0.5, vz + 9.2, 6.4, 1.6, 3, 0.28, 0.40, stone);

    A.plaque(T, kit, 'DINH III BẢO ĐẠI', -0.5, 4.88, vz + 9.55, 5.2, 0.72, { bg: '#5a3a22', fg: '#f8e288' });
    // Towering Đà Lạt pine grove encircling the hilltop palace
    A.trees(T, kit, [
      { x: -14.6, z: -8.6, h: 13.4, kind: 'pine' },
      { x: 14.8, z: -8.4, h: 13.0, kind: 'pine' },
      { x: -14.8, z: 6.4, h: 11.8, kind: 'pine' },
      { x: 14.8, z: 6.4, h: 12.2, kind: 'pine' }
    ]);
  }

  (window.VietnamSights ??= []).push(
    {
      id: 'cong-to-vo-ly-son', name: 'Cổng Tò Vò (Đảo Lý Sơn)', city: 'Lý Sơn', province: 'Quảng Ngãi', region: 'Trung Bộ',
      lon: 109.09912, lat: 15.38977, start: [109.09921, 15.38932], yaw: -.27,
      mappedEntrance: true, approachMeters: 51, arrivalNote: 'Từ đường ven biển phía bắc đảo, đi về phía bãi triều để ngắm vòm đá.',
      viewRadius: 24, viewElevation: .18,
      width: 32, depth: 26,
      solids: [[-6.8, 0, 2.8, 2.6], [6.8, 0, 2.8, 2.6]],
      description: 'Vòm đá nham thạch núi lửa tự nhiên kỳ vĩ bên bờ biển phía Tây đảo Lý Sơn, vươn cong giữa bãi đá bazan đen và làn nước biển xanh ngọc.',
      photo: 'https://quangngai.gov.vn/tin-tuc/tin-chi-dao-dieu-hanh/danh-lam-thang-canh-cong-to-vo-ly-son-duoc-xep-hang-di-tich-cap-quoc-gia.html',
      source: 'https://dsvh.gov.vn/cong-to-vo-tinh-quang-ngai-22309',
      map: 'https://www.openstreetmap.org/?mlat=15.38977&mlon=109.09912#map=18/15.38977/109.09912',
      build: congToVoLySon
    },
    {
      id: 'bao-tang-tong-hop-quang-ngai', name: 'Bảo tàng Tổng hợp Quảng Ngãi', city: 'Quảng Ngãi', province: 'Quảng Ngãi', region: 'Trung Bộ',
      lon: 108.808596, lat: 15.125301, start: [108.809164, 15.125481], yaw: 1.887,
      width: 32, depth: 24,
      solids: [[0, -1.6, 13.4, 7.0], [-10.8, 7.2, 1.8, 1.8]],
      description: 'Bảo tàng tỉnh Quảng Ngãi nổi bật với hai tầng mái ngói đỏ uốn cong, mặt tiền hàng cột nhịp điệu và tượng mộ chum văn hóa Sa Huỳnh ngoài sân.',
      photo: 'https://quangngai.gov.vn/',
      source: 'https://quangngai.gov.vn/',
      map: 'https://www.openstreetmap.org/?mlat=15.125301&mlon=108.808596#map=18/15.125301/108.808596',
      build: baoTangQuangNgai
    },
    {
      id: 'thap-canh-tien', name: 'Tháp Cánh Tiên', city: 'An Nhơn', province: 'Gia Lai', region: 'Trung Bộ',
      lon: 109.075120, lat: 13.928715, start: [109.075097, 13.929036], yaw: -3.071,
      width: 22, depth: 22,
      solids: [[0, -0.8, 4.6, 4.6]],
      description: 'Ngôi tháp Chăm thế kỷ XII giữa kinh đô Đồ Bàn xưa tại An Nhơn, nổi danh với những phiến đá sa thạch trắng ốp góc tầng vút cong như đôi cánh tiên.',
      photo: 'https://vi.wikipedia.org/wiki/Th%C3%A1p_C%C3%A1nh_Ti%C3%AAn',
      source: 'https://vi.wikipedia.org/wiki/Th%C3%A1p_C%C3%A1nh_Ti%C3%AAn',
      map: 'https://www.openstreetmap.org/?mlat=13.928715&mlon=109.07512#map=18/13.928715/109.07512',
      build: thapCanhTien
    },
    {
      id: 'thap-binh-lam', name: 'Tháp Bình Lâm', city: 'Tuy Phước', province: 'Gia Lai', region: 'Trung Bộ',
      lon: 109.185485, lat: 13.890160, start: [109.185442, 13.890456], yaw: -3.001,
      width: 22, depth: 22,
      solids: [[0, -0.6, 4.6, 4.6]],
      description: 'Ngôi tháp Chăm đầu thế kỷ XI hiếm hoi xây dựng ngay giữa vùng đồng bằng trù phú Tuy Phước, nổi bật giữa rặng dừa xanh mát của làng Bình Lâm.',
      photo: 'https://vi.wikipedia.org/wiki/Th%C3%A1p_B%C3%ACnh_L%C3%A2m',
      source: 'https://vi.wikipedia.org/wiki/Th%C3%A1p_B%C3%ACnh_L%C3%A2m',
      map: 'https://www.openstreetmap.org/?mlat=13.89016&mlon=109.185485#map=18/13.89016/109.185485',
      build: thapBinhLam
    },
    {
      id: 'tuong-dai-tran-hung-dao-quy-nhon', name: 'Tượng đài Trần Hưng Đạo (Quy Nhơn)', city: 'Quy Nhơn', province: 'Gia Lai', region: 'Trung Bộ',
      lon: 109.251837, lat: 13.761919, start: [109.253060, 13.761810], yaw: 1.480,
      width: 28, depth: 26,
      solids: [[0, -1.4, 5.2, 5.2], [-7.8, -3.2, 3.6, 1.0], [7.8, -3.2, 3.6, 1.0]],
      description: 'Tượng đài Hưng Đạo Đại Vương uy nghiêm trên mũi Hải Minh – bán đảo Phương Mai, vươn tay chỉ thẳng ra biển Đông bảo vệ vịnh Quy Nhơn.',
      photo: 'https://dulichbinhdinh.com.vn/',
      source: 'https://dulichbinhdinh.com.vn/',
      map: 'https://www.openstreetmap.org/?mlat=13.761919&mlon=109.251837#map=17/13.761919/109.251837',
      build: tranHungDaoQuyNhon
    },
    {
      id: 'biet-dien-bao-dai-bmt', name: 'Biệt điện Bảo Đại (Buôn Ma Thuột)', city: 'Buôn Ma Thuột', province: 'Đắk Lắk', region: 'Tây Nguyên',
      lon: 108.042116, lat: 12.674553, start: [108.041329, 12.674355], yaw: -1.320,
      width: 34, depth: 22,
      solids: [[0, 0, 13.8, 6.2]],
      description: 'Di tích lịch sử xây năm 1926 tại trung tâm Buôn Ma Thuột, kết hợp độc đáo kiến trúc nhà sàn dài Êđê Tây Nguyên với biệt thự Pháp cổ giữa vườn long não cổ thụ.',
      photo: 'https://vhttdl.daklak.gov.vn/',
      source: 'https://vhttdl.daklak.gov.vn/',
      map: 'https://www.openstreetmap.org/?mlat=12.674553&mlon=108.042116#map=18/12.674553/108.042116',
      build: bietDienBaoDaiBmt
    },
    {
      id: 'chua-thanh-luong', name: 'Chùa Thanh Lương (Tuy An)', city: 'Tuy An', province: 'Đắk Lắk', region: 'Trung Bộ',
      lon: 109.295771, lat: 13.181695, start: [109.295870, 13.181490], yaw: 0.442,
      width: 28, depth: 26,
      solids: [[0, -4.6, 8.8, 5.4], [4.6, 6.2, 5.7, 3.9], ...A.archPiers(-5.6, 8.4, 4.8, 1.45, 2.2)],
      description: 'Ngôi chùa độc đáo xây dựng từ đá san hô biển và gáo dừa tại xã An Chấn, Tuy An, nổi tiếng với Hồ Vô Cực xanh ngọc và tượng Quan Thế Âm Bồ Tát ẩn hiện trên mặt nước.',
      photo: 'https://vietnamtourism.gov.vn/',
      source: 'https://vietnamtourism.gov.vn/',
      map: 'https://www.openstreetmap.org/?mlat=13.181695&mlon=109.295771#map=18/13.181695/109.295771',
      build: chuaThanhLuong
    },
    {
      id: 'vien-hai-duong-hoc-nha-trang', name: 'Viện Hải dương học Nha Trang', city: 'Nha Trang', province: 'Khánh Hòa', region: 'Trung Bộ',
      lon: 109.214250, lat: 12.208050, start: [109.213915, 12.207911], yaw: -1.170,
      width: 32, depth: 22,
      solids: [[0, -1.2, 13.6, 6.4]],
      description: 'Cơ sở nghiên cứu biển lâu đời nhất Đông Nam Á thành lập năm 1922 tại Cầu Đá, Nha Trang, nổi bật với tòa nhà Pháp cổ tường vàng chớp xanh hướng ra vịnh biển.',
      photo: 'https://vi.wikipedia.org/wiki/Vi%E1%BB%87n_H%E1%BA%A3i_d%C6%B0%C6%A1ng_h%E1%BB%8Dc',
      source: 'https://vi.wikipedia.org/wiki/Vi%E1%BB%87n_H%E1%BA%A3i_d%C6%B0%C6%A1ng_h%E1%BB%8Dc',
      map: 'https://www.openstreetmap.org/?mlat=12.20805&mlon=109.21425#map=18/12.20805/109.21425',
      build: vienHaiDuongHoc
    },
    {
      id: 'thap-po-rome', name: 'Tháp Chăm Po Rome', city: 'Ninh Phước', province: 'Khánh Hòa', region: 'Trung Bộ',
      lon: 108.865847, lat: 11.501343, start: [108.866620, 11.501750], yaw: 2.062,
      width: 26, depth: 24,
      solids: [[-1.8, -1.2, 4.4, 4.4], [7.4, 1.8, 2.4, 2.4]],
      description: 'Ngọn tháp gạch nung cuối cùng của nghệ thuật kiến trúc Champa thế kỷ XVII trên đồi đá Hậu Sanh, thờ vua Po Rome cùng ngôi miếu Hoàng hậu và tượng bò thần Nandin.',
      photo: 'https://vi.wikipedia.org/wiki/Th%C3%A1p_Po_Rome',
      source: 'https://vi.wikipedia.org/wiki/Th%C3%A1p_Po_Rome',
      map: 'https://www.openstreetmap.org/?mlat=11.501343&mlon=108.865847#map=18/11.501343/108.865847',
      build: thapPoRome
    },
    {
      id: 'chua-linh-phuoc-da-lat', name: 'Chùa Linh Phước (Chùa Ve Chai)', city: 'Đà Lạt', province: 'Lâm Đồng', region: 'Tây Nguyên',
      lon: 108.499250, lat: 11.944250, start: [108.499584, 11.944350], yaw: 1.866,
      width: 32, depth: 28,
      solids: [[9.6, -1.2, 4.4, 4.4], [-3.8, -5.6, 8.4, 5.4], [-6.2, 7.6, 5.2, 4.2]],
      description: 'Ngôi chùa khảm sành sứ độc nhất vô nhị tại Trại Mát, Đà Lạt với tháp chuông Linh Tháp bảy tầng rực rỡ sắc lam – vàng, Chánh Điện khảm sứ và con rồng uốn lượn làm từ 12.000 vỏ chai.',
      photo: 'https://vi.wikipedia.org/wiki/Ch%C3%B9a_Linh_Ph%C6%B0%E1%BB%9Bc',
      source: 'https://vi.wikipedia.org/wiki/Ch%C3%B9a_Linh_Ph%C6%B0%E1%BB%9Bc',
      map: 'https://www.openstreetmap.org/?mlat=11.94425&mlon=108.49925#map=18/11.94425/108.49925',
      build: chuaLinhPhuoc
    },
    {
      id: 'thien-vien-truc-lam-da-lat', name: 'Thiền viện Trúc Lâm Đà Lạt', city: 'Đà Lạt', province: 'Lâm Đồng', region: 'Tây Nguyên',
      lon: 108.435250, lat: 11.904550, start: [108.435826, 11.905019], yaw: 2.263,
      width: 32, depth: 30,
      solids: [[0, 0, 8.4, 5.2], [-9.8, 2.6, 2.6, 2.6], [9.8, 2.6, 2.6, 2.6], ...A.archPiers(0, 10.4, 5.0, 1.52, 2.2)],
      description: 'Thiền viện lớn nhất thuộc thiền phái Trúc Lâm Yên Tử tọa lạc trên đồi Phượng Hoàng bên hồ Tuyền Lâm, nổi bật với mái ngói nâu vàng thanh tịnh giữa rừng thông Đà Lạt.',
      photo: 'https://vi.wikipedia.org/wiki/Thi%E1%BB%81n_vi%E1%BB%87n_Tr%C3%BAc_L%C3%A2m_%C4%90%C3%A0_L%E1%BA%A1t',
      source: 'https://vi.wikipedia.org/wiki/Thi%E1%BB%81n_vi%E1%BB%87n_Tr%C3%BAc_L%C3%A2m_%C4%90%C3%A0_L%E1%BA%A1t',
      map: 'https://www.openstreetmap.org/?mlat=11.90455&mlon=108.43525#map=18/11.90455/108.43525',
      build: thienVienTrucLam
    },
    {
      id: 'dinh-3-bao-dai-da-lat', name: 'Dinh III Bảo Đại (Đà Lạt)', city: 'Đà Lạt', province: 'Lâm Đồng', region: 'Tây Nguyên',
      lon: 108.429300, lat: 11.930120, start: [108.428760, 11.930220], yaw: -1.757,
      width: 34, depth: 26,
      solids: [[0, -2.8, 12.8, 6.4]],
      description: 'Biệt điện mùa hè phong cách Art Deco Pháp năm 1933 của vua Bảo Đại giữa đồi thông Ái Ân, Đà Lạt với hình khối ngang hiện đại, phòng kính bo tròn và vườn hoa hồng bậc thang.',
      photo: 'https://vi.wikipedia.org/wiki/Dinh_III_(%C4%90%C3%A0_L%E1%BA%A1t)',
      source: 'https://vi.wikipedia.org/wiki/Dinh_III_(%C4%90%C3%A0_L%E1%BA%A1t)',
      map: 'https://www.openstreetmap.org/?mlat=11.93012&mlon=108.4293#map=18/11.93012/108.4293',
      build: dinh3BaoDaiDaLat
    }
  );
})();
