'use strict';
(() => {
  const A = window.CentralArch;

  // 1. Bảo tàng tỉnh Thanh Hóa — Iconic Giant Đông Sơn Bronze Drum architectural landmark
  function baoTangThanhHoa(T, kit) {
    const { box, stamp, round, tapered } = kit;
    const bronze = 0x7b633c, patina = 0x4f685c, gold = 0xd6ae4a, glass = 0x264454, granite = 0xaba599, cream = 0xede5d4;

    // Stepped circular granite plaza
    stamp(round, granite, 0, 0.22, 0, 19.5, 0.44, 19.5);
    A.steps(kit, 0, 16.5, 11.5, 2.2, 4, 0.24, 0.42, 0x908a7f);

    // Lower flared base of the giant Đông Sơn bronze drum (chân trống)
    tapered(patina, 0, 2.4, -0.5, 15.6, 12.4, 4.4, 1, 24);
    // Cylindrical drum waist (thân trống) wrapped in tall glazed museum bands & bronze ribs
    stamp(round, glass, 0, 6.2, -0.5, 12.1, 3.6, 12.1);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      box(bronze, Math.sin(a) * 12.35, 6.2, -0.5 + Math.cos(a) * 12.35, 0.48, 3.8, 0.48, a);
    }
    // Iconic wide overhanging convex upper shoulder (tang trống) & flat drumhead (mặt trống đồng)
    tapered(bronze, 0, 9.5, -0.5, 12.4, 16.4, 3.1, 1, 24);
    stamp(round, gold, 0, 11.15, -0.5, 16.6, 0.34, 16.6);
    stamp(round, patina, 0, 11.42, -0.5, 15.4, 0.24, 15.4);
    // Stylized 12-ray Đông Sơn sun star emblem on top of the drum roof
    stamp(round, gold, 0, 11.62, -0.5, 3.6, 0.16, 3.6);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      box(gold, Math.sin(a) * 6.8, 11.60, -0.5 + Math.cos(a) * 6.8, 0.46, 0.14, 6.2, a);
    }
    // Paired traditional loop drum handles (quai trống) on left & right flanks
    for (const s of [-1, 1]) {
      const handle = new T.TorusGeometry(1.65, 0.32, 8, 14, Math.PI);
      stamp(handle, bronze, s * 13.6, 6.6, -0.5, 1, 1.15, 1, 0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2);
      handle.dispose();
    }

    // Projecting contemporary glass-and-cream arrival portico at front (+Z)
    box(cream, 0, 3.4, 12.6, 12.2, 6.4, 4.4);
    box(glass, 0, 3.1, 14.84, 8.6, 4.8, 0.16);
    box(bronze, 0, 6.65, 13.2, 13.4, 0.55, 5.8);
    A.plaque(T, kit, 'BẢO TÀNG TỈNH THANH HÓA', 0, 6.65, 16.16, 9.2, 1.05, { bg: '#5a3d20', fg: '#f8e082' });

    A.trees(T, kit, [
      { x: -16.8, z: 10.6, h: 7.4, kind: 'banyan' },
      { x: 16.8, z: 10.6, h: 7.4, kind: 'banyan' }
    ]);
  }

  // 2. Đền Sòng Sơn (Bỉm Sơn, Thanh Hóa) — "Đền Sòng thiêng nhất xứ Thanh" with clear Suối Cá stream & stone bridge
  function denSongSon(T, kit) {
    const { box, stamp, round } = kit;
    const ochre = 0xe3c888, crimson = 0x86241b, tile = 0x943f2b, gold = 0xdcb045, stone = 0x948d81, stream = 0x2f7d86;

    // Brick-paved sacred courtyard bisected by the iconic clear emerald stream (Suối Cá Đền Sòng)
    box(0x9b5a44, 0, 0.14, 1.0, 28, 0.28, 26);
    box(stream, 0, 0.20, 5.2, 27.6, 0.24, 3.2);
    for (const sz of [3.55, 6.85]) box(stone, 0, 0.34, sz, 27.6, 0.36, 0.35);
    // Arched stone footbridge spanning the sacred stream to the main hall
    box(stone, 0, 0.52, 5.2, 4.6, 0.34, 4.2);
    for (const s of [-1, 1]) {
      box(0xb9b09e, s * 2.15, 1.05, 5.2, 0.28, 0.78, 4.2);
    }

    // Ornate front 3-bay Mother Goddess Tam Quan gate at z = +10.6
    const gz = 10.6;
    A.vaultedBay(T, kit, 0, gz, 5.0, 4.6, 1.54, 2.3, 2.3, ochre, 0xb89652, 0x5c3e2a);
    for (const s of [-1, 1]) {
      A.vaultedBay(T, kit, s * 4.3, gz, 3.6, 3.3, 0.96, 1.65, 1.85, ochre, 0xb89652, 0x5c3e2a);
      A.curvedRoof(T, kit, s * 4.3, 3.35, gz, 4.4, 2.7, 0.82, tile, 0xded0b0, gold, 0.26);
    }
    A.curvedRoof(T, kit, 0, 4.65, gz, 6.2, 3.3, 0.98, tile, 0xded0b0, gold, 0.30, { dragons: true, goldColor: gold });
    A.plaque(T, kit, 'ĐỀN SÒNG SƠN', 0, 4.05, gz + 1.24, 4.0, 0.66, { bg: '#7b1f18', fg: '#f8dc76' });

    // Double-tier sanctuary dedicated to Thánh Mẫu Liễu Hạnh behind the stream
    const hz = -4.2;
    box(stone, 0, 0.58, hz, 17.6, 1.16, 10.6);
    A.steps(kit, 0, hz + 5.8, 5.8, 1.4, 4, 0.28, 0.38, 0x827c71);
    box(ochre, 0, 3.0, hz - 0.3, 15.0, 3.7, 8.2);
    for (let i = -3; i <= 3; i++) {
      stamp(round, crimson, i * 2.3, 3.0, hz + 4.15, 0.20, 3.7, 0.20);
    }
    A.curvedRoof(T, kit, 0, 4.88, hz, 18.0, 10.8, 1.65, tile, 0xded0b0, gold, 0.32);
    box(crimson, 0, 7.05, hz, 11.4, 1.65, 6.4);
    A.curvedRoof(T, kit, 0, 7.9, hz, 13.4, 8.4, 1.9, tile, 0xded0b0, gold, 0.30, { dragons: true, goldColor: gold });

    A.trees(T, kit, [
      { x: -12.0, z: -7.2, h: 9.2, kind: 'banyan' },
      { x: 12.0, z: -7.2, h: 9.2, kind: 'banyan' },
      { x: -11.4, z: 9.4, h: 7.0, kind: 'banyan' }
    ]);
  }

  // 3. Đàn Tế Nam Giao Thành Nhà Hồ (Vĩnh Lộc, Thanh Hóa) — UNESCO 3-tier interlocking green limestone Sky Altar + King's Well
  function danTeNamGiaoTayDo(T, kit) {
    const { box, stamp, round } = kit;
    const blueStone = 0x7c8682, darkStone = 0x5c6662, paleStone = 0x9aa39e, grass = 0x4b7440;

    // Vast grassy UNESCO archaeological precinct
    box(grass, 0, 0.12, 0, 38, 0.24, 38);

    // Tier 1: Outer interlocking Tây Đô green limestone terrace wall
    box(blueStone, 0, 0.55, 0, 31.0, 1.1, 31.0);
    box(0x88928d, 0, 1.12, 0, 29.2, 0.14, 29.2);
    for (const s of [-1, 1]) {
      box(darkStone, s * 15.2, 1.45, 0, 0.85, 0.85, 31.0);
      box(darkStone, 0, 1.45, s * 15.2, 31.0, 0.85, 0.85);
    }

    // Tier 2: Middle green-limestone platform stepping up toward Đốn Sơn hill
    box(blueStone, 0, 1.75, -1.2, 21.8, 1.35, 21.8);
    box(paleStone, 0, 2.48, -1.2, 20.4, 0.16, 20.4);
    // 4 grand axial monolithic green-stone stairways
    A.steps(kit, 0, 16.4, 5.2, 2.0, 4, 0.28, 0.48, darkStone);
    A.steps(kit, 0, 10.6, 4.6, 2.0, 4, 0.32, 0.45, darkStone);

    // Tier 3: Sacred upper Viên Đàn circular stone foundation ring & sacrificial Heaven Altar
    box(blueStone, 0, 3.15, -2.0, 13.4, 1.25, 13.4);
    stamp(round, paleStone, 0, 3.92, -2.0, 5.4, 0.42, 5.4);
    box(darkStone, 0, 4.55, -2.4, 2.8, 1.15, 1.55);
    stamp(round, 0x5c4f3d, 0, 4.42, 0.2, 0.58, 0.95, 0.58);

    // Iconic square monolithic stone King's Well (Giếng Vua — Thành Nhà Hồ) in the SE corner!
    const wx = 11.2, wz = 10.2;
    box(0x285f6b, wx, 1.18, wz, 3.2, 0.22, 3.2);
    for (const s of [-1, 1]) {
      box(darkStone, wx, 1.42, wz + s * 1.9, 4.4, 0.72, 0.62);
      box(darkStone, wx + s * 1.9, 1.42, wz, 0.62, 0.72, 3.2);
    }

    A.plaque(T, kit, 'ĐÀN TẾ NAM GIAO - THÀNH NHÀ HỒ', 0, 1.62, 16.2, 8.6, 0.92, { bg: '#384b46', fg: '#f4df8d' });
    A.trees(T, kit, [
      { x: -16.8, z: -15.6, h: 11.2, kind: 'pine' },
      { x: 16.8, z: -15.6, h: 11.4, kind: 'pine' },
      { x: -16.8, z: 14.8, h: 9.8, kind: 'pine' }
    ]);
  }

  // 4. Nhà thờ Chính tòa Thanh Hóa (1926) — Historic ochre-and-stone Gothic cathedral with soaring central bell spire
  function nhaThoThanhHoa(T, kit) {
    A.gothicChurch(T, kit, {
      wall: 0xdccaa4,
      trim: 0xb69f78,
      roof: 0x8a3d2b,
      glass: 0x284359,
      w: 14.6,
      d: 26.5,
      naveH: 9.8,
      towerH: 25.5,
      twinTowers: false,
      title: 'NHÀ THỜ CHÍNH TÒA THANH HÓA'
    });
    A.trees(T, kit, [
      { x: -11.4, z: 8.6, h: 8.2, kind: 'banyan' },
      { x: 11.4, z: 8.6, h: 8.2, kind: 'banyan' }
    ]);
  }

  // 5. Chùa Cầm Sơn (Thiên Cầm, Cẩm Xuyên, Hà Tĩnh) — Cliffside coastal temple overlooking Thiên Cầm Bay
  function chuaCamSon(T, kit) {
    const { box, stamp, round, tapered } = kit;
    const ochre = 0xe2c88d, tile = 0x8f3f2c, gold = 0xdba844, stone = 0x8f8a80, crimson = 0x7b231a;

    // Terraced stone mountain cliff platform
    box(stone, 0, 0.45, 0.5, 28, 0.9, 25);
    A.steps(kit, 0, 13.6, 6.2, 1.8, 4, 0.22, 0.40, 0x7c786e);

    // Coastal Tam Quan gate overlooking the bay
    A.vaultedBay(T, kit, 0, 10.0, 4.8, 4.4, 1.48, 2.2, 2.2, ochre, 0xb89658, 0x5c422c);
    for (const s of [-1, 1]) {
      A.vaultedBay(T, kit, s * 4.2, 10.0, 3.4, 3.2, 0.94, 1.6, 1.8, ochre, 0xb89658, 0x5c422c);
      A.curvedRoof(T, kit, s * 4.2, 3.25, 10.0, 4.2, 2.6, 0.82, tile, 0xdcd0b2, gold, 0.26);
    }
    A.curvedRoof(T, kit, 0, 4.45, 10.0, 5.8, 3.2, 0.95, tile, 0xdcd0b2, gold, 0.28, { dragons: true, goldColor: gold });
    A.plaque(T, kit, 'CHÙA CẦM SƠN', 0, 3.9, 11.18, 3.8, 0.64, { bg: '#782018', fg: '#f8dc76' });

    // Tall white Quan Âm Nam Hải statue facing the East Sea on right terrace
    stamp(round, stone, 8.6, 1.25, 3.2, 2.1, 0.72, 2.1);
    tapered(0xd47d86, 8.6, 1.95, 3.2, 0.92, 1.28, 0.82, 1, 10);
    tapered(0xf2f0ea, 8.6, 4.45, 3.2, 0.76, 0.44, 4.2, 0.85, 12);
    const head = new T.SphereGeometry(0.45, 10, 8);
    stamp(head, 0xf2f0ea, 8.6, 6.85, 3.2);
    head.dispose();

    // Double-tier main hall raised on mountain plinth
    const hz = -3.8;
    box(stone, 0, 1.25, hz, 16.6, 0.95, 10.2);
    box(ochre, 0, 3.55, hz - 0.3, 14.0, 3.6, 7.8);
    for (let i = -3; i <= 3; i++) {
      stamp(round, crimson, i * 2.15, 3.55, hz + 3.95, 0.19, 3.6, 0.19);
    }
    A.curvedRoof(T, kit, 0, 5.4, hz, 16.8, 10.4, 1.6, tile, 0xdcd0b2, gold, 0.32);
    box(crimson, 0, 7.55, hz, 10.6, 1.55, 6.2);
    A.curvedRoof(T, kit, 0, 8.35, hz, 12.6, 8.0, 1.85, tile, 0xdcd0b2, gold, 0.30, { dragons: true, goldColor: gold });

    A.trees(T, kit, [
      { x: -11.6, z: -6.8, h: 10.2, kind: 'pine' },
      { x: 11.6, z: -6.8, h: 10.4, kind: 'pine' },
      { x: -10.8, z: 3.4, h: 9.2, kind: 'pine' }
    ]);
  }

  // 6. Khu tưởng niệm Tổng Bí thư Hà Huy Tập (Cẩm Hưng, Cẩm Xuyên, Hà Tĩnh) — Thatched ancestral house + memorial hall & bronze bust
  function khuTuongNiemHaHuyTap(T, kit) {
    const { box, stamp, round, tapered } = kit;
    const thatch = 0xb59c6a, wood = 0x5d3d26, tile = 0x8c3f2c, cream = 0xeee4ce, granite = 0xa39e94, bronze = 0x6f5536;

    box(0xaa9c82, 0, 0.14, 0.5, 28, 0.28, 24);

    // Traditional 3-bay thatched wooden ancestral house of General Secretary Hà Huy Tập on left
    const hx = -6.2, hz = -1.8;
    box(0x8c8478, hx, 0.22, hz, 11.2, 0.44, 6.8);
    box(0x947e57, hx, 1.55, hz - 0.4, 9.8, 2.25, 4.8);
    for (let i = -2; i <= 2; i++) {
      stamp(round, wood, hx + i * 2.2, 1.55, hz + 2.6, 0.13, 2.3, 0.13);
    }
    A.gabledRoof(T, kit, hx, 2.7, hz, 11.4, 7.0, 2.5, thatch, 0x8e764d, { alongX: true, overhang: 0.85, thick: 0.34 });

    // Stately red-tiled memorial & incense sanctuary on right
    const mx = 6.4, mz = -3.4;
    box(granite, mx, 0.45, mz, 11.4, 0.9, 8.2);
    box(cream, mx, 2.65, mz - 0.3, 9.6, 3.4, 6.2);
    for (let i = -2; i <= 2; i++) {
      stamp(round, 0x6c241b, mx + i * 2.05, 2.65, mz + 3.1, 0.17, 3.4, 0.17);
    }
    A.curvedRoof(T, kit, mx, 4.4, mz, 11.8, 8.6, 1.75, tile, 0xd8c8a8, 0xd2a44c, 0.30);

    // Front granite pedestal with bronze bust of Tổng Bí thư Hà Huy Tập
    box(granite, 0, 0.42, 6.4, 7.2, 0.64, 5.4);
    box(0x767067, 0, 1.68, 6.0, 2.2, 1.9, 1.9);
    tapered(bronze, 0, 3.12, 6.0, 0.86, 0.58, 1.1, 0.8, 10);
    const head = new T.SphereGeometry(0.44, 10, 8);
    stamp(head, bronze, 0, 3.98, 6.0);
    head.dispose();
    A.plaque(T, kit, 'KHU LƯU NIỆM HÀ HUY TẬP', 0, 1.72, 7.02, 5.6, 0.72, { bg: '#6e2119', fg: '#f8dd7e' });

    A.trees(T, kit, [
      { x: -11.6, z: 6.8, h: 8.6, kind: 'palm' },
      { x: -11.6, z: 2.6, h: 8.8, kind: 'palm' },
      { x: 11.8, z: 6.4, h: 7.8, kind: 'banyan' },
      { x: -11.8, z: -7.8, h: 8.4, kind: 'banyan' }
    ]);
  }

  // 7. Khu di tích Hải Thượng Lãn Ông Lê Hữu Trác (Hương Sơn, Hà Tĩnh) — UNESCO physician tomb & hillside memorial temple
  function haiThuongLanOng(T, kit) {
    const { box, stamp, round } = kit;
    const stone = 0x8f8c83, darkStone = 0x6f6c64, ochre = 0xdec895, tile = 0x863f2e, gold = 0xd2a54a, crimson = 0x79251b;

    // Terraced mountain memorial court with carved stone balustrade steps
    box(stone, 0, 0.22, 1.5, 28, 0.44, 26);
    A.steps(kit, 0, 11.4, 6.8, 2.0, 4, 0.24, 0.42, darkStone);

    // Front symbolic stone Tomb & Medical Heritage Stele Pavilion (Khu mộ Đại danh y)
    box(darkStone, -7.2, 0.52, 5.2, 6.4, 0.85, 6.4);
    box(0xc9c3b6, -7.2, 1.38, 5.2, 2.6, 1.05, 3.8);
    box(0x5b5850, -7.2, 2.25, 3.2, 1.55, 2.2, 0.36); // inscribed medical ethics stele
    // Medicinal herb pond & bridge on right forecourt
    box(stone, 7.4, 0.32, 5.2, 6.6, 0.52, 5.6);
    box(0x2f6c74, 7.4, 0.44, 5.2, 5.8, 0.28, 4.8);

    // Stately double-tier Memorial Temple dedicated to Hải Thượng Lãn Ông
    A.vietnameseHall(T, kit, {
      w: 16.4, d: 9.8, baseH: 1.15, colH: 3.6,
      wall: ochre, wood: crimson, tile, ridge: 0xd9cbb0, eave: gold,
      doubleTier: true, bays: 5,
      title: 'HẢI THƯỢNG LÃN ÔNG'
    });

    // Fragrant mountain pines of Minh Tự / Hương Sơn
    A.trees(T, kit, [
      { x: -12.2, z: -7.8, h: 11.0, kind: 'pine' },
      { x: 12.2, z: -7.8, h: 11.2, kind: 'pine' },
      { x: -12.4, z: 9.2, h: 9.6, kind: 'pine' },
      { x: 12.4, z: 9.2, h: 9.6, kind: 'pine' }
    ]);
  }

  // 8. Di tích Sân bay Tà Cơn — Khe Sanh (Quảng Trị) — Historic steel-matting runway, C-130 Hercules aircraft & UH-1 Huey display!
  function sanBayTaCon(T, kit) {
    const { box, stamp, round, tapered, outline } = kit;
    const runway = 0x5c5b55, redSoil = 0x8f4e34, olive = 0x5a634b, darkOlive = 0x414838, propDisc = 0x2f3335, museumCream = 0xe8e1cf, roofRed = 0x983b2c;

    // Khe Sanh red basalt earth & iconic perforated steel-planking airfield apron (ghi sắt Tà Cơn)
    box(redSoil, 0, 0.10, 0, 42, 0.20, 32);
    box(runway, -2.0, 0.24, 2.5, 34, 0.16, 18);
    // White runway threshold stripes
    for (const sz of [-2.5, 0.5, 3.5, 6.5]) {
      box(0xdcd9ce, -16.8, 0.34, sz, 3.2, 0.06, 0.65);
    }

    // === FULL-SCALE C-130 HERCULES TRANSPORT AIRCRAFT (Iconic centerpiece of Tà Cơn!) ===
    const ax = -4.2, az = 3.2;
    // Cylindrical fuselage oriented along local X (nose at +X)
    stamp(round, olive, ax, 2.65, az, 1.68, 17.5, 1.68, 0, 0, Math.PI / 2);
    // Rounded nose cone & dark cockpit windshield
    const nose = new T.SphereGeometry(1.64, 12, 10);
    stamp(nose, olive, ax + 8.6, 2.55, az, 1.65, 0.95, 0.96);
    nose.dispose();
    box(0x202b33, ax + 8.3, 3.25, az, 1.45, 0.72, 2.15);
    // Rear upswept tail ramp cone
    tapered(olive, ax - 10.6, 3.15, az, 1.64, 0.62, 5.4, 1, 12, 0, 0, Math.PI / 2 + 0.14);
    // High straight-tapered cargo wings (22m wingspan!)
    box(olive, ax + 1.2, 4.18, az, 3.4, 0.42, 22.8);
    box(darkOlive, ax + 0.4, 4.16, az, 2.2, 0.34, 23.4);
    // 4 turboprop engine nacelles + 4-blade propellers under wings
    for (const wz of [-7.4, -3.8, 3.8, 7.4]) {
      stamp(round, darkOlive, ax + 2.4, 3.65, az + wz, 0.52, 2.8, 0.52, 0, 0, Math.PI / 2);
      stamp(round, propDisc, ax + 3.92, 3.65, az + wz, 0.14, 2.95, 0.14);
      stamp(round, propDisc, ax + 3.92, 3.65, az + wz, 0.14, 0.14, 2.95);
    }
    // Iconic towering vertical tail fin + horizontal stabilizers
    outline([[0, 0], [-2.4, 5.4], [-4.2, 5.4], [-3.4, 0]], olive, ax - 8.8, 3.6, az - 0.22, 0.44);
    box(darkOlive, ax - 11.4, 3.85, az, 1.9, 0.26, 8.6);
    // Landing gear struts & tires
    for (const [gx, gz] of [[7.4, 0], [0.6, -1.7], [0.6, 1.7], [-0.8, -1.7], [-0.8, 1.7]]) {
      stamp(round, 0x222426, ax + gx, 0.72, az + gz, 0.55, 0.42, 0.55, 0, Math.PI / 2);
      stamp(round, 0x7d8388, ax + gx, 1.4, az + gz, 0.12, 1.1, 0.12);
    }

    // === PARKED UH-1 HUEY HELICOPTER ON RIGHT APRON ===
    const hx = 10.6, hz = 5.4;
    box(darkOlive, hx, 1.75, hz, 4.6, 1.55, 1.85);
    box(0x21323b, hx + 1.65, 1.85, hz, 1.35, 1.15, 1.68); // helicopter cockpit glass
    box(olive, hx - 4.4, 2.15, hz, 4.8, 0.48, 0.48); // tail boom
    box(darkOlive, hx - 6.6, 2.85, hz, 0.65, 1.65, 0.18); // tail fin
    stamp(round, 0x2a2d30, hx, 2.95, hz, 0.14, 0.95, 0.14); // rotor mast
    box(0x282b2e, hx, 3.38, hz, 8.6, 0.08, 0.34, 0.45); // main rotor blades
    for (const sz of [-0.95, 0.95]) box(0x3a3e42, hx, 0.45, hz + sz, 4.2, 0.12, 0.12); // landing skids

    // Historic Tà Cơn Museum Pavilion & Control Tower behind runway
    box(museumCream, 1.5, 2.9, -10.8, 18.6, 5.4, 7.6);
    A.gabledRoof(T, kit, 1.5, 5.65, -10.8, 19.4, 8.2, 1.85, roofRed, 0xd8cdb6, { alongX: true, overhang: 0.45 });
    box(0xb5aea0, 12.6, 4.6, -10.4, 4.2, 8.8, 4.2); // airfield watchtower
    box(0x223b4a, 12.6, 7.8, -10.4, 4.4, 1.65, 4.4);
    A.plaque(T, kit, 'SÂN BAY TÀ CƠN - KHE SANH', 1.5, 5.2, -6.9, 8.8, 1.02, { bg: '#6e2119', fg: '#f8e082' });
  }

  // 9. Bảo tàng Tổng hợp Quảng Bình – Quảng Trị (Đồng Hới) — Sweeping curved coastal pavilion by Nhật Lệ River
  function baoTangQuangBinh(T, kit) {
    const { box, stamp, round } = kit;
    const white = 0xf2eee4, sand = 0xdbc9a6, terra = 0x9c4832, glass = 0x264b60, stone = 0xa29d92;

    // Riverfront stone museum terrace
    box(stone, 0, 0.22, 0, 34, 0.44, 24);
    A.steps(kit, 0, 9.8, 14.0, 2.0, 4, 0.24, 0.42, 0x8f8a80);

    // Main contemporary 2-story gallery block with rhythmic sandstone brise-soleil piers
    box(white, 0, 4.8, -1.6, 26.8, 8.8, 12.6);
    box(glass, 0, 4.6, 4.78, 22.4, 7.2, 0.22);
    for (let i = -5; i <= 5; i++) {
      box(sand, i * 2.45, 4.8, 5.15, 0.46, 8.8, 1.05);
    }
    // Sweeping dramatic upturned coastal wave-wing roof shell spanning 31m
    for (let i = -6; i <= 6; i++) {
      const t = i / 6;
      const yCurve = 9.4 + t * t * 1.85;
      box(terra, i * 2.5, yCurve, -0.8, 2.65, 0.48, 15.8, 0, 0, t * 0.22);
    }
    box(white, 0, 9.25, -0.8, 27.6, 0.42, 13.8);

    // Projecting shaded entrance canopy & outdoor historical heritage bronze cannon display
    box(sand, 0, 4.2, 7.2, 12.6, 0.48, 4.4);
    for (const sx of [-5.2, 5.2]) stamp(round, white, sx, 2.25, 8.8, 0.32, 3.9, 0.32);
    // Historic fortress cannon on stone plinth on left courtyard
    box(0x888378, -11.4, 0.65, 7.2, 3.2, 0.85, 2.2);
    stamp(round, 0x3b3d3e, -11.4, 1.45, 7.2, 0.26, 2.6, 0.26, 0.35, 0, Math.PI / 2 - 0.14);

    A.plaque(T, kit, 'BẢO TÀNG TỔNG HỢP QUẢNG TRỊ', 0, 5.05, 9.45, 8.6, 0.95, { bg: '#74241c', fg: '#f8e28c' });
    A.trees(T, kit, [
      { x: 13.8, z: 7.4, h: 8.6, kind: 'palm' },
      { x: -14.6, z: -6.8, h: 8.2, kind: 'banyan' },
      { x: 14.6, z: -6.8, h: 8.2, kind: 'banyan' }
    ]);
  }

  // 10. Hoành Sơn Quan (Đỉnh Đèo Ngang — 1833) — Iconic weathered Minh Mạng stone mountain-pass arch gate
  function hoanhSonQuan(T, kit) {
    const { box, stamp, round } = kit;
    const mossStone = 0x7c796c, darkBrick = 0x625d51, lichen = 0x6c755e, rampart = 0x8a8576, pathStone = 0x9b9586;

    // Mountain-pass stone terrace & historic stepped mandarin highway (Thiên lý Bắc – Nam)
    box(0x5d6e4c, 0, 0.16, 0, 30, 0.32, 22);
    box(pathStone, 0, 0.38, 0, 6.4, 0.28, 21.6);
    A.steps(kit, 0, 8.6, 5.8, 2.8, 5, 0.16, 0.46, 0x898477);
    A.steps(kit, 0, -8.6, 5.8, 2.8, 5, 0.16, 0.46, 0x898477);

    // Iconic vaulted fortress pass gate spanning the summit road (4.2m wide x 5.2m tall masonry citadel block)
    A.vaultedBay(T, kit, 0, 0, 10.8, 6.2, 2.35, 2.65, 5.4, mossStone, rampart, darkBrick);
    // Mossy weathering stone patches & stepped crenelated Nguyễn battlements (tường hoa mai) on top
    box(rampart, 0, 6.38, 0, 11.4, 0.38, 5.8);
    for (let x = -5.2; x <= 5.2; x += 1.3) {
      for (const f of [-1, 1]) {
        box(mossStone, x, 7.05, f * 2.58, 0.82, 1.05, 0.44);
        box(lichen, x, 7.62, f * 2.58, 0.90, 0.18, 0.50);
      }
    }
    // Sweeping stone mountain rampart wing walls extending left & right down the flanks of Đèo Ngang!
    for (const s of [-1, 1]) {
      box(mossStone, s * 9.2, 2.45, 0, 8.2, 4.6, 2.8);
      box(darkBrick, s * 9.2, 4.88, 0, 8.4, 0.28, 3.0);
      for (let k = 0; k < 4; k++) {
        box(rampart, s * (6.2 + k * 2.0), 5.38, 1.15, 0.95, 0.78, 0.42);
      }
      // Corner watch buttress piers
      box(darkBrick, s * 13.4, 2.6, 0, 2.2, 5.0, 3.4);
    }

    // Historic 1833 stone inscription lintel "HOÀNH SƠN QUAN" on both northern & southern faces!
    A.plaque(T, kit, 'HOÀNH SƠN QUAN', 0, 5.45, 2.86, 4.4, 0.72, { bg: '#9b9484', fg: '#3b352c', border: 0x5c574b });
    A.plaque(T, kit, 'HOÀNH SƠN QUAN', 0, 5.45, -2.86, 4.4, 0.72, { ry: Math.PI, bg: '#9b9484', fg: '#3b352c', border: 0x5c574b });

    // Wind-swept mountain pines clinging to Đèo Ngang ridge
    A.trees(T, kit, [
      { x: -13.2, z: -5.6, h: 8.8, kind: 'pine' },
      { x: 13.2, z: -5.6, h: 9.2, kind: 'pine' },
      { x: -12.6, z: 6.4, h: 7.8, kind: 'pine' },
      { x: 12.6, z: 6.4, h: 8.2, kind: 'pine' }
    ]);
  }

  (window.VietnamSights ??= []).push(
    {
      id: 'bao-tang-tinh-thanh-hoa', name: 'Bảo tàng tỉnh Thanh Hóa', city: 'Thanh Hóa', province: 'Thanh Hóa', region: 'Trung Bộ',
      lon: 105.780389, lat: 19.815137, start: [105.781070, 19.815132], yaw: 1.563,
      width: 40, depth: 36,
      solids: [[0, -0.5, 16.5, 16.5], [0, 12.6, 6.4, 2.4]],
      description: 'Công trình bảo tàng tạo hình Trống đồng Đông Sơn khổng lồ tại trung tâm Thanh Hóa với tang trống đồng vươn rộng, mặt trời 12 cánh trên mái và sảnh kính hiện đại.',
      photo: 'https://vi.wikipedia.org/wiki/Thanh_H%C3%B3a',
      source: 'https://vi.wikipedia.org/wiki/Thanh_H%C3%B3a',
      map: 'https://www.openstreetmap.org/?mlat=19.815137&mlon=105.780389#map=18/19.815137/105.780389',
      build: baoTangThanhHoa
    },
    {
      id: 'den-song-son', name: 'Đền Sòng Sơn', city: 'Bỉm Sơn', province: 'Thanh Hóa', region: 'Trung Bộ',
      lon: 105.870500, lat: 20.088500, start: [105.870860, 20.088735], yaw: 2.176,
      width: 28, depth: 26,
      solids: [[0, -4.2, 8.8, 5.4], ...A.archPiers(0, 10.6, 5.0, 1.54, 2.3)],
      description: 'Ngôi đền thờ Thánh Mẫu Liễu Hạnh danh tiếng ("Đền Sòng thiêng nhất xứ Thanh") tại Bỉm Sơn với cổng tam quan, dòng suối cá xanh trong vắt qua cầu đá và chính điện uy nghi.',
      photo: 'https://visitthanhhoa.com/',
      source: 'https://vi.wikipedia.org/wiki/%C4%90%E1%BB%81n_S%C3%B2ng_S%C6%A1n',
      map: 'https://www.openstreetmap.org/?mlat=20.0885&mlon=105.8705#map=17/20.0885/105.8705',
      build: denSongSon
    },
    {
      id: 'dan-te-nam-giao-tay-do', name: 'Đàn Tế Nam Giao Thành Nhà Hồ', city: 'Vĩnh Lộc', province: 'Thanh Hóa', region: 'Trung Bộ',
      lon: 105.622850, lat: 20.046050, start: [105.622960, 20.045620], yaw: 0.237,
      width: 38, depth: 38,
      solids: [[0, -2.0, 7.0, 7.0], [11.2, 10.2, 2.4, 2.4]],
      description: 'Di sản Văn hóa Thế giới thuộc quần thể Thành Nhà Hồ (xây năm 1402 dưới chân núi Đốn Sơn), gồm ba cấp nền đá xanh xếp khối, đường thần đạo và Giếng Vua đá vuông cổ kính.',
      photo: 'https://thanhnhaho.vn/',
      source: 'https://vi.wikipedia.org/wiki/%C4%90%C3%A0n_t%E1%BA%BF_Nam_Giao_(nh%C3%A0_H%E1%BB%93)',
      map: 'https://www.openstreetmap.org/?mlat=20.04605&mlon=105.62285#map=17/20.04605/105.62285',
      build: danTeNamGiaoTayDo
    },
    {
      id: 'nha-tho-chinh-toa-thanh-hoa', name: 'Nhà thờ Chính tòa Thanh Hóa', city: 'Thanh Hóa', province: 'Thanh Hóa', region: 'Trung Bộ',
      lon: 105.778850, lat: 19.814020, start: [105.778850, 19.813700], yaw: 0.0,
      width: 24, depth: 30,
      solids: [[0, 0, 7.6, 13.5]],
      description: 'Nhà thờ Chính tòa Giáo phận Thanh Hóa xây dựng năm 1926 theo phong cách Gothic – Roman với tháp chuông vươn cao, cửa sổ hoa hồng và sắc tường vàng đất ấm áp.',
      photo: 'https://vi.wikipedia.org/wiki/Nh%C3%A0_th%E1%BB%9D_ch%C3%ADnh_t%C3%B2a_Thanh_H%C3%B3a',
      source: 'https://vi.wikipedia.org/wiki/Nh%C3%A0_th%E1%BB%9D_ch%C3%ADnh_t%C3%B2a_Thanh_H%C3%B3a',
      map: 'https://www.openstreetmap.org/?mlat=19.81402&mlon=105.77885#map=18/19.81402/105.77885',
      build: nhaThoThanhHoa
    },
    {
      id: 'chua-cam-son', name: 'Chùa Cầm Sơn (Thiên Cầm)', city: 'Cẩm Xuyên', province: 'Hà Tĩnh', region: 'Trung Bộ',
      lon: 106.093750, lat: 18.277720, start: [106.093589, 18.277409], yaw: -0.458,
      width: 28, depth: 26,
      solids: [[0, -3.8, 8.4, 5.2], [8.6, 3.2, 2.2, 2.2], ...A.archPiers(0, 10.0, 4.8, 1.48, 2.2)],
      description: 'Ngôi cổ tự Yên Lạc – Cầm Sơn tọa lạc trên triền núi Thiên Cầm nhìn ra biển Đông với tam quan mái đao, tượng Quan Âm Nam Hải trắng và chính điện giữa rừng thông biển.',
      photo: 'https://hatinh.gov.vn/',
      source: 'https://hatinh.gov.vn/',
      map: 'https://www.openstreetmap.org/?mlat=18.27772&mlon=106.09375#map=18/18.27772/106.09375',
      build: chuaCamSon
    },
    {
      id: 'khu-tuong-niem-ha-huy-tap', name: 'Khu lưu niệm Tổng Bí thư Hà Huy Tập', city: 'Cẩm Xuyên', province: 'Hà Tĩnh', region: 'Trung Bộ',
      lon: 105.991420, lat: 18.228820, start: [105.991800, 18.228760], yaw: 1.42,
      width: 28, depth: 24,
      solids: [[-6.2, -1.8, 5.6, 3.5], [6.4, -3.4, 5.8, 4.2], [0, 6.4, 3.6, 2.7]],
      description: 'Di tích lịch sử tại xã Cẩm Hưng, Cẩm Xuyên tưởng niệm cố Tổng Bí thư Hà Huy Tập với ngôi nhà gỗ mái tranh quê hương, nhà trưng bày – dâng hương và tượng đài bán thân.',
      photo: 'https://hatinh.gov.vn/',
      source: 'https://hatinh.gov.vn/',
      map: 'https://www.openstreetmap.org/?mlat=18.22882&mlon=105.99142#map=17/18.22882/105.99142',
      build: khuTuongNiemHaHuyTap
    },
    {
      id: 'khu-luu-niem-hai-thuong-lan-ong', name: 'Khu di tích Hải Thượng Lãn Ông', city: 'Hương Sơn', province: 'Hà Tĩnh', region: 'Trung Bộ',
      lon: 105.435694, lat: 18.529432, start: [105.435680, 18.528840], yaw: -0.023,
      width: 28, depth: 26,
      solids: [[0, 0, 8.4, 5.2], [-7.2, 5.2, 3.2, 3.2], [7.4, 5.2, 3.3, 2.8]],
      description: 'Quần thể di tích mộ và nhà thờ Đại danh y – Danh nhân Văn hóa Thế giới UNESCO Hải Thượng Lãn Ông Lê Hữu Trác dưới chân núi Minh Tự, Hương Sơn.',
      photo: 'https://hatinh.gov.vn/',
      source: 'https://hatinh.gov.vn/',
      map: 'https://www.openstreetmap.org/?mlat=18.529432&mlon=105.435694#map=17/18.529432/105.435694',
      build: haiThuongLanOng
    },
    {
      id: 'san-bay-ta-con', name: 'Di tích Sân bay Tà Cơn (Khe Sanh)', city: 'Hướng Hóa', province: 'Quảng Trị', region: 'Trung Bộ',
      lon: 106.724050, lat: 16.653550, start: [106.723920, 16.653070], yaw: -0.255,
      width: 42, depth: 32,
      solids: [[-4.2, 3.2, 10.5, 11.4], [10.6, 5.4, 4.4, 2.2], [1.5, -10.8, 9.4, 4.0], [12.6, -10.4, 2.2, 2.2]],
      description: 'Di tích Quốc gia đặc biệt Đường 9 – Khe Sanh với đường băng ghi sắt, nhà bảo tàng – đài kiểm soát, máy bay vận tải quân sự C-130 Hercules bốn động cơ và trực thăng UH-1.',
      photo: 'https://vi.wikipedia.org/wiki/S%C3%A2n_bay_T%C3%A0_C%C6%A1n',
      source: 'https://vi.wikipedia.org/wiki/S%C3%A2n_bay_T%C3%A0_C%C6%A1n',
      map: 'https://www.openstreetmap.org/?mlat=16.65355&mlon=106.72405#map=17/16.65355/106.72405',
      build: sanBayTaCon
    },
    {
      id: 'bao-tang-tong-hop-quang-binh', name: 'Bảo tàng Tổng hợp Quảng Bình – Quảng Trị', city: 'Đồng Hới', province: 'Quảng Trị', region: 'Trung Bộ',
      lon: 106.623629, lat: 17.468221, start: [106.623260, 17.468162], yaw: -1.406,
      width: 34, depth: 24,
      solids: [[0, -1.6, 13.6, 6.6], [-11.4, 7.2, 1.8, 1.4]],
      description: 'Công trình bảo tàng đương đại mái cánh sóng uốn lượn ven sông Nhật Lệ tại Đồng Hới với hàng lam đá sa thạch, mặt tiền kính lớn và khu trưng bày hiện vật ngoài trời.',
      photo: 'https://quangbinhtourism.vn/',
      source: 'https://quangbinhtourism.vn/',
      map: 'https://www.openstreetmap.org/?mlat=17.468221&mlon=106.623629#map=18/17.468221/106.623629',
      build: baoTangQuangBinh
    },
    {
      id: 'hoanh-son-quan', name: 'Hoành Sơn Quan (Đỉnh Đèo Ngang)', city: 'Quảng Trạch', province: 'Quảng Trị', region: 'Trung Bộ',
      lon: 106.469689, lat: 17.956345, start: [106.469659, 17.956815], yaw: -3.080,
      width: 30, depth: 22,
      solids: [...A.archPiers(0, 0, 10.8, 2.35, 5.4), [-9.2, 0, 4.2, 1.5], [9.2, 0, 4.2, 1.5]],
      description: 'Cửa ải đá xây năm 1833 đời vua Minh Mạng ngay trên đỉnh Đèo Ngang giữa Hà Tĩnh và Quảng Trị, gồm vòm cuốn rêu phong, tường thành hoa mai và bậc đá thiên lý Bắc – Nam.',
      photo: 'https://vi.wikipedia.org/wiki/Ho%C3%A0nh_S%C6%A1n_Quan',
      source: 'https://vi.wikipedia.org/wiki/Ho%C3%A0nh_S%C6%A1n_Quan',
      map: 'https://www.openstreetmap.org/?mlat=17.956345&mlon=106.469689#map=18/17.956345/106.469689',
      build: hoanhSonQuan
    }
  );
})();
