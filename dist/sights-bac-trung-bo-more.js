'use strict';
(() => {
  const A = window.CentralArch;

  // 1. Chùa Hương Tích (Can Lộc, Hà Tĩnh — Hoan Châu đệ nhất danh lam)
  function chuaHuongTich(T, kit) {
    const { stamp, box } = kit;
    const rock = new T.DodecahedronGeometry(1, 1);
    for (const [rx, ry, rz, sx, sy, sz] of [[-12, 3.8, -6.5, 4.8, 5.2, 4.2], [12, 4.0, -6.2, 4.8, 5.4, 4.5], [0, 4.6, -11.5, 9.2, 6.4, 4.6]]) {
      stamp(rock, 0x7c7a74, rx, ry, rz, sx, sy, sz);
    }
    rock.dispose();
    A.vietnameseHall(T, kit, {
      w: 17.0, d: 10.2, baseH: 1.3, colH: 3.6, bays: 5,
      wall: 0xe6d3a0, wood: 0x66271b, tile: 0x99412d, ridge: 0xd9b862, eave: 0xd4a64a,
      doubleTier: true, atticColor: 0x8a2c20,
      title: 'CHÙA HƯƠNG TÍCH', plaque: { bg: '#732118', fg: '#f8da74' }
    });
    box(0x888175, 0, 0.35, 9.8, 12.5, 0.7, 3.2);
    A.trees(T, kit, [
      { x: -11.5, z: 2.5, h: 11.2, kind: 'pine' }, { x: 11.5, z: 2.5, h: 10.8, kind: 'pine' },
      { x: -13.5, z: -2.0, h: 10.0, kind: 'pine' }, { x: 13.5, z: -2.0, h: 10.4, kind: 'pine' }
    ]);
  }

  // 2. Đền Chợ Củi (Đền Ông Hoàng Mười, Nghi Xuân, Hà Tĩnh)
  function denChoCui(T, kit) {
    A.tamQuan(T, kit, {
      wall: 0xe8d08e, trim: 0xc99c4a, tile: 0xa63f2a, ridge: 0xdfc16a, eave: 0xe0b44c,
      wCenter: 5.4, wSide: 3.8, depth: 3.0, hCenter: 5.0, hSide: 3.6, twoTierSides: true,
      title: 'ĐỀN CHỢ CỦI', plaque: { bg: '#7c1e16', fg: '#f8da72' }
    });
    kit.box(0xe8d08e, 0, 2.7, -8.5, 15.2, 3.8, 7.2);
    A.curvedRoof(T, kit, 0, 4.6, -8.5, 17.8, 9.5, 2.35, 0xa63f2a, 0xdfc16a, 0xe0b44c, 0.32, { dragons: true });
    A.trees(T, kit, [{ x: -11.5, z: -4.0, h: 9.2, kind: 'banyan' }, { x: 11.5, z: -4.0, h: 7.4, kind: 'palm' }]);
  }

  // 3. Đền Võ Miếu (TP. Hà Tĩnh)
  function denVoMieu(T, kit) {
    A.vietnameseHall(T, kit, {
      w: 16.5, d: 10.0, baseH: 1.0, colH: 3.3, bays: 5,
      wall: 0xdfd0a8, wood: 0x5c271c, tile: 0x8c4230, ridge: 0xd0be96, eave: 0xc99c4a,
      doubleTier: false, title: 'ĐỀN VÕ MIẾU'
    });
    kit.box(0xd9c79b, 0, 1.35, 9.2, 4.6, 2.1, 0.48);
    kit.box(0x8c4230, 0, 2.52, 9.2, 5.0, 0.30, 0.72);
    A.trees(T, kit, [{ x: -11.2, z: 3.2, h: 9.5, kind: 'banyan' }, { x: 11.2, z: -2.0, h: 7.2, kind: 'palm' }]);
  }

  // 4. Tượng đài Xô Viết Nghệ Tĩnh (Ngã ba Nghèn, Can Lộc)
  function tuongDaiXoVietCanLoc(T, kit) {
    A.memorialMonument(T, kit, {
      plazaW: 25, plazaD: 19, h: 17, style: 'statue', backdrop: true,
      stone: 0xcac3b6, darkStone: 0x746f68, bronze: 0x6a553d, accent: 0xb23225,
      title: 'XÔ VIẾT NGHỆ TĨNH 1930-1931'
    });
  }

  // 5. Hải đăng Cửa Nhượng (Thiên Cầm, Cẩm Xuyên)
  function haiDangCuaNhuong(T, kit) {
    A.lighthouse(T, kit, {
      h: 18.5, rBase: 2.4, rTop: 1.55, body: 0xf1ece0, band: 0xd89d34, dome: 0x9e3226,
      striped: true, title: 'HẢI ĐĂNG CỬA NHƯỢNG'
    });
  }

  // 6. Cầu Nhật Lệ 1 (Đồng Hới — cầu vòm thép bắc qua sông Nhật Lệ)
  function cauNhatLe(T, kit) {
    A.steelTrussBridge(T, kit, {
      len: 260, w: 14.5, spans: 5, archH: 10.2,
      steel: 0xd4d9dc, steelDark: 0x8a979e, pierColor: 0x9e9a8f, arched: true
    });
  }

  // 7. Tượng đài Mẹ Suốt (Bến đò sông Nhật Lệ, Đồng Hới)
  function tuongDaiMeSuot(T, kit) {
    const { box, stamp, outline, tapered } = kit;
    const stone = 0xd2cbc0, darkStone = 0x7a756d, bronze = 0x624e38, water = 0x3b6c7a;

    // Riverfront stepped granite plaza & stylized wooden ferryboat bow pedestal
    box(darkStone, 0, 0.35, 0, 18, 0.70, 16);
    box(stone, 0, 0.85, 0, 14, 0.42, 12);
    // Boat-hull sculpted pedestal beneath Mother Suốt's statue
    outline([[-4.6, 0], [-6.2, 2.2], [-3.2, 2.5], [3.2, 2.5], [6.2, 2.2], [4.6, 0]], stone, 0, 1.05, -1.6, 3.2);
    box(water, 0, 1.12, 3.6, 11.5, 0.16, 2.6);
    A.plaque(T, kit, 'TƯỢNG ĐÀI MẸ SUỐT', 0, 1.95, 1.72, 4.8, 0.76, { bg: '#78251c', fg: '#f6d674' });

    // Iconic bronze statue of Mother Suốt standing tall with her raised oar (mái chèo)
    const sy = 3.55;
    tapered(bronze, 0, sy + 2.8, 0, 1.25, 0.85, 5.6, 0.8, 12);
    box(bronze, 0, sy + 6.0, 0, 2.1, 1.9, 1.15);
    const head = new T.SphereGeometry(0.66, 12, 10);
    stamp(head, bronze, 0, sy + 7.55, 0); head.dispose();
    // Sweeping wooden-style bronze ferry oar held at an angle
    A.strut(T, kit, 0x4f3e2b, -1.8, sy + 1.2, 0.6, 2.6, sy + 8.6, 0.6, 0.12);
    box(0x4f3e2b, 2.75, sy + 8.85, 0.6, 0.55, 1.45, 0.12, 0, 0, -0.45);
    A.trees(T, kit, [{ x: -7.8, z: -5.5, h: 7.4, kind: 'palm' }, { x: 7.8, z: -5.5, h: 7.2, kind: 'palm' }]);
  }

  // 8. Hải đăng Nhật Lệ (Cửa biển Nhật Lệ, Đồng Hới)
  function haiDangNhatLe(T, kit) {
    A.lighthouse(T, kit, {
      h: 19, rBase: 2.5, rTop: 1.65, body: 0xf1ede2, band: 0xb83828, dome: 0x9c2e22,
      striped: true, title: 'HẢI ĐĂNG NHẬT LỆ'
    });
  }

  // 9. Địa đạo Vịnh Mốc (Vĩnh Linh, Quảng Trị)
  function diaDaoVinhMoc(T, kit) {
    const { box, stamp, round } = kit;
    const redEarth = 0x8e4c36, grassHill = 0x52753b, timber = 0x5c3c28, stone = 0x8c8578;

    // Red basalt coastal hillside mound housing the underground village tunnels
    const hill = new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);
    stamp(hill, grassHill, 0, -0.2, -3.5, 14.5, 6.2, 10.5);
    stamp(hill, redEarth, 0, -0.2, 2.2, 7.6, 4.4, 4.6);
    hill.dispose();

    // Reinforced arched stone-and-timber tunnel entrance portal (Cửa địa đạo)
    A.vaultedBay(T, kit, 0, 5.4, 5.2, 3.6, 1.45, 1.75, 2.6, stone, redEarth, 0x3b3028);
    box(0x1b1614, 0, 1.5, 4.4, 2.8, 3.0, 0.4);
    for (const s of [-1, 1]) stamp(round, timber, s * 1.6, 1.75, 6.8, 0.16, 3.5, 0.16);
    box(timber, 0, 3.55, 6.8, 3.8, 0.28, 0.35);
    A.plaque(T, kit, 'ĐỊA ĐẠO VỊNH MỐC', 0, 4.15, 6.82, 4.4, 0.68, { bg: '#6e231a', fg: '#f6d874' });

    // Ventilation shafts peeking out of the hillside & exhibition pavilion on left
    for (const [vx, vz] of [[-5.2, -2.0], [5.8, -3.5], [1.2, -7.2]]) {
      stamp(round, stone, vx, 4.8, vz, 0.42, 2.2, 0.42);
      stamp(round, 0x6b655c, vx, 5.95, vz, 0.58, 0.18, 0.58);
    }
    box(0xe6dbc4, -12.0, 2.1, 4.2, 7.6, 3.8, 6.2);
    A.gabledRoof(T, kit, -12.0, 4.0, 4.2, 8.0, 6.6, 1.75, 0x994230, 0xd8ccb2, { alongX: true });
    A.trees(T, kit, [
      { x: 10.8, z: 3.5, h: 8.8, kind: 'banyan' }, { x: -8.5, z: -7.2, h: 9.2, kind: 'pine' },
      { x: 8.8, z: -7.5, h: 8.5, kind: 'pine' }
    ]);
  }

  // 10. Thánh địa La Vang (Hải Lăng, Quảng Trị — Tháp chuông cổ & Linh đài Đức Mẹ)
  function thanhDiaLaVang(T, kit) {
    const { box, stamp, round, tapered } = kit;
    const brick = 0x9c553d, agedStone = 0xb8aa92, cream = 0xefe6d2, gold = 0xdcb24e;

    // Broad pilgrimage stone square
    box(0x9a9488, 0, 0.32, 0, 30, 0.64, 24);

    // Iconic weathered 3-story historic brick Bell Tower ruins of the old La Vang Basilica (on left)
    const bx = -7.2, bz = -1.5;
    box(brick, bx, 3.6, bz, 5.8, 6.6, 5.8);
    box(agedStone, bx, 7.0, bz, 6.2, 0.35, 6.2);
    box(brick, bx, 9.8, bz, 4.8, 5.2, 4.8);
    box(agedStone, bx, 12.5, bz, 5.2, 0.32, 5.2);
    box(brick, bx, 14.8, bz, 3.9, 4.2, 3.9);
    // Open arched bell-tower windows & ruined crenellated parapet crown
    for (const [wy, ww, wh] of [[3.6, 2.0, 3.4], [9.8, 1.6, 2.8], [14.8, 1.3, 2.2]]) {
      for (const f of [-1, 1]) {
        box(0x281e1a, bx, wy, bz + f * (ww * 1.45), ww, wh, 0.18);
        box(0x281e1a, bx + f * (ww * 1.45), wy, bz, 0.18, wh, ww);
      }
    }
    for (const sx of [-1.5, 0, 1.5]) box(brick, bx + sx, 17.3, bz + 1.85, 0.85, 0.8, 0.35);

    // Linh Đài Đức Mẹ La Vang — Vietnamese curved-tile canopy shrine + white marble Marian statue (on right)
    const lx = 6.4, lz = 0.5;
    box(cream, lx, 1.1, lz, 10.6, 1.0, 10.6);
    A.steps(kit, lx, lz + 6.0, 6.2, 1.4, 4, 0.25, 0.34, cream);
    for (const dx of [-4.2, 4.2]) for (const dz of [-4.2, 4.2]) {
      stamp(round, cream, lx + dx, 4.5, lz + dz, 0.28, 5.8, 0.28);
    }
    A.curvedRoof(T, kit, lx, 7.4, lz, 12.4, 12.4, 2.35, 0x2f6d7e, gold, gold, 0.20);
    // White marble pedestal & Marian statue beneath the shrine canopy
    box(0xdfd9cc, lx, 2.4, lz, 2.2, 1.6, 2.2);
    tapered(0xf5f2ea, lx, 4.4, lz, 0.65, 0.38, 2.4, 0.85, 10);
    const head = new T.SphereGeometry(0.35, 10, 8);
    stamp(head, 0xf5f2ea, lx, 5.85, lz); head.dispose();
    A.plaque(T, kit, 'THÁNH ĐỊA LA VANG', 0, 1.65, 10.8, 6.4, 0.84, { bg: '#efe4c8', fg: '#5a3022' });
    A.trees(T, kit, [{ x: -13.2, z: -7.5, h: 10.0, kind: 'banyan' }, { x: 13.5, z: -7.2, h: 9.5, kind: 'banyan' }]);
  }

  const sights = [
    {
      id: 'chua-huong-tich-ha-tinh', name: 'Chùa Hương Tích', city: 'Can Lộc', province: 'Hà Tĩnh',
      lon: 105.756850, lat: 18.496650, yaw: 0.780, width: 28, depth: 24,
      start: [105.758460, 18.495100], viewDistance: 1300,
      map: 'https://www.openstreetmap.org/#map=17/18.49665/105.75685',
      source: 'https://dulichhatinh.com.vn/',
      build: chuaHuongTich
    },
    {
      id: 'den-cho-cui', name: 'Đền Chợ Củi', city: 'Nghi Xuân', province: 'Hà Tĩnh',
      lon: 105.736700, lat: 18.590750, yaw: -1.724, width: 24, depth: 22,
      start: [105.734718, 18.591040], viewDistance: 1250,
      map: 'https://www.openstreetmap.org/#map=17/18.59075/105.73670',
      source: 'https://dulichhatinh.com.vn/',
      build: denChoCui
    },
    {
      id: 'den-vo-mieu-ha-tinh', name: 'Đền Võ Miếu Hà Tĩnh', city: 'TP. Hà Tĩnh', province: 'Hà Tĩnh',
      lon: 105.908582, lat: 18.342182, yaw: -1.366, width: 22, depth: 20,
      start: [105.908338, 18.342134],
      map: 'https://www.openstreetmap.org/node/5373874858',
      source: 'https://dsvh.gov.vn/',
      build: denVoMieu
    },
    {
      id: 'tuong-dai-xo-viet-can-loc', name: 'Tượng đài Xô Viết Nghệ Tĩnh', city: 'Can Lộc', province: 'Hà Tĩnh',
      lon: 105.776010, lat: 18.452689, yaw: 2.193, width: 26, depth: 20,
      start: [105.776153, 18.452787],
      map: 'https://www.openstreetmap.org/node/4409318890',
      source: 'https://dulichhatinh.com.vn/',
      build: tuongDaiXoVietCanLoc
    },
    
    {
      id: 'cau-nhat-le', name: 'Cầu Nhật Lệ', city: 'Đồng Hới', province: 'Quảng Trị', formerProvince: 'Quảng Bình',
      lon: 106.627250, lat: 17.472435, yaw: -2.8726, width: 200, depth: 17,
      viewAngle: -2.25, viewElevation: 0.22,
      start: [106.62635, 17.47218], viewDistance: 1550,
      solids: [[0, -7.8, 130, 0.7], [0, 7.8, 130, 0.7]],
      map: 'https://www.openstreetmap.org/#map=17/17.47244/106.62725',
      source: 'https://quangbinhtourism.vn/',
      build: cauNhatLe
    },
    {
      id: 'tuong-dai-me-suot', name: 'Tượng đài Mẹ Suốt', city: 'Đồng Hới', province: 'Quảng Trị', formerProvince: 'Quảng Bình',
      lon: 106.625480, lat: 17.466880, yaw: -1.166, width: 18, depth: 16,
      start: [106.625308, 17.466812],
      map: 'https://www.openstreetmap.org/#map=18/17.46688/106.62548',
      source: 'https://quangbinhtourism.vn/',
      build: tuongDaiMeSuot
    },
    
    {
      id: 'dia-dao-vinh-moc', name: 'Địa đạo Vịnh Mốc', city: 'Vĩnh Linh', province: 'Quảng Trị',
      lon: 107.112150, lat: 17.074950, yaw: 1.758, width: 32, depth: 24,
      start: [107.112712, 17.075052], viewDistance: 1200,
      map: 'https://www.openstreetmap.org/#map=17/17.07495/107.11215',
      source: 'https://dsvh.gov.vn/',
      build: diaDaoVinhMoc
    },
    {
      id: 'thanh-dia-la-vang', name: 'Thánh địa La Vang', city: 'Hải Lăng', province: 'Quảng Trị',
      lon: 107.192250, lat: 16.716650, yaw: 1.850, width: 30, depth: 24,
      start: [107.192890, 16.716826], viewDistance: 1300,
      map: 'https://www.openstreetmap.org/#map=17/16.71665/107.19225',
      source: 'https://quangtritourism.gov.vn/',
      build: thanhDiaLaVang
    }
  ];

  window.VietnamSights = (window.VietnamSights || []).concat(sights);
})();