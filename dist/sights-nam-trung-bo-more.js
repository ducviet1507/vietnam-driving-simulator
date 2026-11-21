'use strict';
(() => {
  const A = window.CentralArch;

  // 1. Khu chứng tích Sơn Mỹ (Quảng Ngãi)
  function chungTichSonMy(T, kit) {
    const { box, stamp, tapered } = kit;
    const blackStone = 0x323538, marble = 0xd6d2c8, bronze = 0x5c4a38;
    box(0x88847c, 0, 0.35, 0, 24, 0.7, 20);
    box(0x3a6472, 0, 0.72, 5.8, 12.5, 0.14, 4.2);
    box(blackStone, 0, 2.2, -1.5, 6.2, 3.0, 4.4);
    A.plaque(T, kit, 'CHỨNG TÍCH SƠN MỸ', 0, 2.2, 0.76, 5.2, 0.82, { bg: '#2c2f32', fg: '#f0dfaa' });
    // Sculpted mother-and-raised-fist memorial silhouette atop black stone plinth
    tapered(bronze, 0, 6.4, -1.5, 1.55, 1.1, 5.4, 0.78, 10);
    box(bronze, 0.95, 10.2, -1.5, 0.75, 2.6, 0.75);
    const head = new T.SphereGeometry(0.68, 10, 8);
    stamp(head, bronze, -0.35, 9.5, -1.5); head.dispose();
    // Flanking carved stone relief walls
    for (const s of [-1, 1]) {
      box(marble, s * 7.8, 2.5, -3.2, 6.8, 3.4, 0.9, -s * 0.2);
      box(0x9b958b, s * 7.8, 2.5, -2.7, 5.8, 2.2, 0.14, -s * 0.2);
    }
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
    const { box, stamp, round, tapered, outline } = kit;
    const timber = 0x5c3622, darkWood = 0x3e2315, trim = 0xc9ab7c, roof = 0x733a28;
    // Raised Ba Na stilt-house stone-and-timber veranda plinth
    box(0x887f74, 0, 0.55, 0, 18.5, 1.1, 34);
    A.steps(kit, 0, 17.5, 6.2, 1.8, 5, 0.22, 0.36, 0x999084);
    // All-timber nave with side wooden cloister arches
    box(timber, 0, 5.8, -1.2, 14.4, 9.4, 27.5);
    A.gabledRoof(T, kit, 0, 10.5, -1.2, 15.8, 28.4, 5.4, roof, trim);
    for (let z = -13.5; z <= 10.5; z += 3.0) {
      for (const s of [-1, 1]) {
        stamp(round, darkWood, s * 7.8, 3.2, z, 0.16, 4.4, 0.16);
        box(0x281912, s * 7.26, 6.6, z + 1.5, 0.12, 3.2, 1.35);
      }
    }
    // Iconic central soaring wooden bell tower + twin flanking mini-spires
    const fz = 12.6;
    box(timber, 0, 10.5, fz, 5.8, 19.0, 5.4);
    outline([[-7.4, 0], [0, 7.6], [7.4, 0]], timber, 0, 10.5, fz - 1.2, 1.8);
    box(darkWood, 0, 3.2, fz + 2.75, 2.8, 4.4, 0.16);
    stamp(round, trim, 0, 9.4, fz + 2.75, 1.45, 0.22, 1.45, 0, Math.PI / 2);
    stamp(round, 0x35485a, 0, 9.4, fz + 2.82, 1.15, 0.14, 1.15, 0, Math.PI / 2);
    tapered(darkWood, 0, 23.6, fz, 3.3, 0.14, 7.2, 1, 4);
    box(0xdcb450, 0, 28.2, fz, 0.18, 2.8, 0.18);
    box(0xdcb450, 0, 28.8, fz, 1.4, 0.18, 0.18);
    for (const s of [-1, 1]) {
      box(timber, s * 5.8, 8.2, fz + 0.4, 2.4, 14.2, 2.4);
      tapered(darkWood, s * 5.8, 17.5, fz + 0.4, 1.45, 0.12, 4.4, 1, 4);
    }
    A.plaque(T, kit, 'NHÀ THỜ GỖ KON TUM', 0, 6.2, fz + 2.82, 4.6, 0.68, { bg: '#472819', fg: '#f6dc90' });
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
    kit.box(0x887c6a, 0, 0.45, 0, 34, 0.9, 26);
    // Main central Kalan (22m), Gate Tower, Stele Tower, and unique Saddle-Roof Tower (Tháp Yên Ngựa)
    A.chamTower(T, kit, 0, -3.5, { w: 7.8, h: 22.0, tiers: 4, brick: 0xa44e36 });
    A.chamTower(T, kit, -10.5, 4.5, { w: 5.4, h: 13.5, tiers: 3, brick: 0x9b4730 });
    A.chamTower(T, kit, 10.8, 4.0, { w: 5.2, h: 12.8, tiers: 3, brick: 0xac553c });
    // Iconic Tháp Yên Ngựa (saddle-shaped boat roof) on right rear
    kit.box(0xa44e36, 10.5, 4.2, -6.5, 6.4, 7.6, 4.8);
    A.curvedRoof(T, kit, 10.5, 8.0, -6.5, 8.2, 5.8, 3.2, 0x8a3f2b, 0xc5b293, 0xa44e36, 0.46);
    A.trees(T, kit, [{ x: -14.5, z: -8.0, h: 8.5, kind: 'banyan' }, { x: 15.2, z: -1.5, h: 7.5, kind: 'palm' }]);
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
      plazaW: 30, plazaD: 22, h: 17, style: 'statue', backdrop: true, wings: false,
      stone: 0xcbc4b8, darkStone: 0x6f6b64, bronze: 0x5c4833, accent: 0xaa3024,
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
    const white = 0xf2f0ea, cream = 0xe4dfd4, stone = 0x8f8a80, gold = 0xdcb24e;

    // Hilltop stone plaza & ascending dragon stairs
    box(stone, 0, 0.55, 0, 24, 1.1, 24);
    A.steps(kit, 0, 11.2, 8.8, 2.2, 6, 0.22, 0.40, cream);

    // Sculpted white octagonal lotus-petal pedestal (Đài sen 7m)
    tapered(cream, 0, 3.6, -1.5, 6.4, 5.6, 5.0, 1, 8);
    // Decorative ring of white lotus petals around top of pedestal
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI * 2 / 12;
      box(white, Math.sin(a) * 5.6, 6.2, -1.5 + Math.cos(a) * 5.6, 1.85, 2.1, 0.45, a, -0.25);
    }

    // Iconic gleaming white 14m seated Buddha (Kim Thân Phật Tổ)
    const by = 6.4;
    // Crossed meditative legs base
    tapered(white, 0, by + 1.8, -1.5, 5.2, 4.6, 3.2, 0.72, 14);
    // Torso & draped monastic robe shoulders
    tapered(white, 0, by + 6.4, -1.5, 3.4, 2.7, 6.6, 0.72, 14);
    box(white, 0, by + 8.6, -1.5, 6.2, 2.4, 3.0);
    // Serene Buddha head, ushnisha topknot & golden halo behind
    const head = new T.SphereGeometry(1.65, 14, 10);
    stamp(head, white, 0, by + 11.4, -1.5);
    const knot = new T.SphereGeometry(0.68, 10, 8);
    stamp(knot, white, 0, by + 13.0, -1.5);
    head.dispose(); knot.dispose();
    stamp(round, gold, 0, by + 11.6, -3.2, 2.6, 0.16, 2.6, 0, Math.PI / 2);

    A.plaque(T, kit, 'CHÙA LONG SƠN', 0, 2.6, 4.4, 4.8, 0.78, { bg: '#7c241b', fg: '#f8da74' });
    A.trees(T, kit, [{ x: -10.5, z: -8.0, h: 9.0, kind: 'palm' }, { x: 10.5, z: -8.0, h: 9.2, kind: 'palm' }]);
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
    const { box, stamp, tapered } = kit;
    const plaza = 0xb8b2a5, darkStone = 0x76736c;
    const sunGold = 0xe8b926, sunDark = 0xc9961c, leafGreen = 0x2e7d52, glassTeal = 0x4ca68a;

    // Vast lakeside tiered granite square overlooking Hồ Xuân Hương
    box(darkStone, 0, 0.45, 0, 38, 0.9, 26);
    box(plaza, 0, 1.0, 0, 35, 0.35, 23);
    A.steps(kit, 0, 12.2, 18, 2.0, 5, 0.20, 0.40, plaza);

    // LEFT ICON: Giant Wild Sunflower Pavilion (Khối Hoa Dã Quỳ khổng lồ nghiêng mặt về hồ)
    const fx = -9.2, fz = -1.5;
    tapered(leafGreen, fx, 4.6, fz, 7.6, 5.2, 7.2, 0.85, 10);
    // Tilted faceted golden sunflower crown petals radiating outward
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI * 2 / 12;
      const px = fx + Math.sin(a) * 5.8;
      const pz = fz + Math.cos(a) * 4.8 + 1.2;
      box(i % 2 ? sunGold : sunDark, px, 8.2 + Math.cos(a) * 1.4, pz, 2.4, 6.2, 0.85, a, 0.38);
    }
    // Dark-gold glazed heart of the sunflower facing the square
    const core = new T.CylinderGeometry(3.8, 3.8, 1.2, 12);
    stamp(core, 0x5c421c, fx, 8.6, fz + 2.4, 1, 1, 1, 0, 0.95);
    core.dispose();

    // RIGHT ICON: Giant Spiral Emerald-Glass Artichoke Bud (Nụ Hoa Atiso kính màu 15m!)
    const ax = 9.5, az = -1.2;
    tapered(0x7c7970, ax, 1.6, az, 6.2, 5.8, 1.2, 1, 12);
    // Layered spiral twisting green glass-and-steel artichoke petals rising to a golden-tipped bud
    for (let tier = 0; tier < 4; tier++) {
      const r = 5.4 - tier * 1.05;
      const ty = 3.8 + tier * 2.8;
      const twist = tier * 0.28;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 + twist;
        box(k % 2 ? glassTeal : leafGreen,
          ax + Math.sin(a) * r * 0.72, ty, az + Math.cos(a) * r * 0.72,
          r * 0.72, 3.4, 0.38, a, -0.32 - tier * 0.08);
      }
    }
    tapered(sunGold, ax, 14.8, az, 1.5, 0.18, 3.0, 1, 8);

    A.plaque(T, kit, 'QUẢNG TRƯỜNG LÂM VIÊN', 0, 1.85, 10.6, 7.2, 0.92, { bg: '#225942', fg: '#fae07c' });
    A.trees(T, kit, [
      { x: -17.5, z: -9.5, h: 12.5, kind: 'pine' }, { x: 17.5, z: -9.5, h: 12.0, kind: 'pine' },
      { x: 0, z: -10.5, h: 11.2, kind: 'pine' }
    ]);
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
      source: 'https://dsvh.gov.vn/',
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
      lon: 109.135186, lat: 13.868437, yaw: -0.731, width: 35, depth: 26,
      start: [109.134140, 13.867300], viewDistance: 1350,
      map: 'https://www.openstreetmap.org/way/677227553',
      source: 'https://dsvh.gov.vn/',
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
      source: 'https://dulichgialai.vn/',
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
      lon: 109.180556, lat: 12.251258, yaw: -0.011, width: 26, depth: 26,
      start: [109.180550, 12.250710], viewDistance: 1450,
      map: 'https://www.openstreetmap.org/way/196896036',
      source: 'https://nhatrang-travel.com/',
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
      lon: 108.100350, lat: 10.927750, yaw: 2.355, width: 16, depth: 16,
      start: [108.100443, 10.927841], viewDistance: 1450,
      map: 'https://www.openstreetmap.org/#map=18/10.92775/108.10035',
      source: 'https://binhthuantourism.vn/',
      build: thapNuocPhanThiet
    },
    {
      id: 'quang-truong-lam-vien', name: 'Quảng trường Lâm Viên', city: 'Đà Lạt', province: 'Lâm Đồng',
      lon: 108.445250, lat: 11.940350, yaw: 0.300, width: 38, depth: 28,
      start: [108.445454, 11.939702], viewDistance: 1350,
      map: 'https://www.openstreetmap.org/#map=17/11.94035/108.44525',
      source: 'https://dalat.lamdong.gov.vn/',
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