'use strict';
(() => {

  // 1. Tháp Chuông Ngã ba Đồng Lộc (Can Lộc, Hà Tĩnh)
  function ngaBaDongLoc(T, {palette, box, stamp, round, tapered, sign}) {
    const stone = 0x9c988d, granite = 0xd6d2c8, darkStone = 0x5c5b56;
    const cream = 0xebe3cf, redTile = 0x9e3e2d, bronze = 0x7b6343, gold = 0xd6ae4a;
    palette({stone: [stone, granite, darkStone], plaster: cream, metal: bronze});

    // Stepped octagonal hill terrace with 4 approach stairways
    tapered(stone, 0, 0.35, 0, 11.8, 11.4, 0.72, 1, 8);
    tapered(granite, 0, 0.92, 0, 8.6, 8.2, 0.48, 1, 8);
    for (let f = 0; f < 4; f++) {
      const a = f * Math.PI / 2, s = Math.sin(a), c = Math.cos(a);
      for (let st = 0; st < 4; st++) {
        box(granite, s * (10.5 - st * 0.42), 0.14 + st * 0.24, c * (10.5 - st * 0.42), 3.4, 0.24, 0.46, a);
      }
    }

    // Ground floor stone podium with 8 open arched openings housing the giant bronze bell
    tapered(darkStone, 0, 1.52, 0, 5.4, 5.2, 0.78, 1, 8);
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) * Math.PI / 4;
      box(cream, Math.sin(a) * 4.35, 3.8, Math.cos(a) * 4.35, 0.76, 4.1, 0.76, a);
    }
    // Giant suspended bronze bell (Đại Hồng Chung) visible inside ground pavilion
    tapered(bronze, 0, 3.6, 0, 1.15, 0.72, 2.25, 1, 16);
    stamp(round, gold, 0, 4.95, 0, 0.24, 0.45, 0.24);
    box(darkStone, 0, 5.85, 0, 8.8, 0.32, 8.8);
    sign('THÁP CHUÔNG ĐỒNG LỘC', 0, 5.65, 4.52, 4.1, 0.54);

    // 7 tapering octagonal tiers with red-tiled flared roofs (Tháp Chuông 7 tầng)
    let y = 5.95;
    for (let tier = 0; tier < 7; tier++) {
      const r = 4.25 - tier * 0.36, h = 2.75 - tier * 0.14;
      // Red flared octagonal eaves skirt
      tapered(redTile, 0, y + 0.38, 0, r * 1.38, r * 0.96, 0.85, 1, 8);
      // Cream octagonal story with recessed dark arch windows on all 8 faces
      tapered(cream, 0, y + 0.75 + h * 0.45, 0, r * 0.94, r * 0.9, h * 0.86, 1, 8);
      for (let f = 0; f < 8; f++) {
        const a = f * Math.PI / 4, d = r * 0.87;
        box(0x4a2f27, Math.sin(a) * d, y + 0.75 + h * 0.44, Math.cos(a) * d, r * 0.34, h * 0.56, 0.1, a);
        // Upturned golden roof corner tips
        const ca = (f + 0.5) * Math.PI / 4;
        box(gold, Math.sin(ca) * (r * 1.34), y + 0.12, Math.cos(ca) * (r * 1.34), 0.18, 0.38, 0.42, ca, -0.45);
      }
      y += h + 0.42;
    }
    // Top 8th lotus crown roof & golden spire
    tapered(redTile, 0, y + 0.65, 0, 2.35, 0.28, 1.55, 1, 8);
    tapered(gold, 0, y + 2.25, 0, 0.42, 0.05, 1.85, 1, 8);
  }

  // 2. Khu lưu niệm Đại thi hào Nguyễn Du (Tiên Điền, Nghi Xuân, Hà Tĩnh)
  function nguyenDu(T, kit) {
    const {box, stamp, outline, profile, round, tapered, sign} = kit;
    const ochre = 0xd4b678, cream = 0xe9dec0, timber = 0x5c3626, tile = 0x8f4634;
    const stone = 0x8d887d, brick = 0x995843, gold = 0xd1a84a;
    kit.palette({plaster: [ochre, cream], timber, tile, stone, brick});

    // Stone-bordered scholar courtyard & semi-circular lotus pond (hồ bán nguyệt)
    box(brick, 0, 0.14, 1.2, 23.0, 0.28, 19.5);
    // Front Tam Quan entrance gate (+Z)
    for (const [cx, w, h, r, sy] of [[0, 4.6, 4.5, 1.45, 2.15], [-4.5, 3.6, 3.2, 0.95, 1.55], [4.5, 3.6, 3.2, 0.95, 1.55]]) {
      const sh = new T.Shape();
      sh.moveTo(-w / 2, 0); sh.lineTo(-r, 0); sh.lineTo(-r, sy);
      sh.absarc(0, sy, r, Math.PI, 0, true);
      sh.lineTo(r, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h); sh.lineTo(-w / 2, h); sh.closePath();
      profile(sh, ochre, cx, 0.28, 7.6, 1.8);
    }
    sign('KHU LƯU NIỆM NGUYỄN DU', 0, 4.15, 9.48, 3.9, 0.56);
    window.CentralArch.curvedRoof(T, kit, 0, 4.82, 8.5, 5.8, 3.2, 0.95, tile, cream, gold, 0.3);
    for (const s of [-1, 1]) {
      window.CentralArch.curvedRoof(T, kit, s * 4.5, 3.52, 8.5, 4.4, 2.6, 0.72, tile, cream, gold, 0.26);
      // Flanking Tứ Trụ Biểu
      box(ochre, s * 7.4, 2.55, 8.5, 0.74, 4.5, 0.74);
      box(cream, s * 7.4, 4.85, 8.5, 0.92, 0.22, 0.92);
      tapered(gold, s * 7.4, 5.45, 8.5, 0.45, 0.08, 0.82, 1, 4);
    }

    // Classical 5-bay Nghệ-Tĩnh Memorial Hall (Nhà thờ Đại thi hào Nguyễn Du) at rear (-Z)
    box(stone, 0, 0.52, -3.5, 16.4, 0.64, 8.4);
    for (let st = 0; st < 3; st++) box(stone, 0, 0.18 + st * 0.16, 1.25 - st * 0.36, 5.6, 0.16, 0.42);
    box(ochre, 0, 2.3, -5.8, 15.0, 3.1, 0.35);
    for (const s of [-1, 1]) {
      outline([[-3.8, 0.84], [3.8, 0.84], [3.8, 3.65], [0, 6.2], [-3.8, 3.65]], ochre, s * 7.45, 0, -3.5, 0.28, Math.PI / 2);
    }
    for (const x of [-6.4, -3.2, 0, 3.2, 6.4]) {
      for (const z of [-6.1, -3.5, -0.7]) {
        stamp(round, timber, x, 2.35, z, 0.17, 3.2, 0.17);
      }
    }
    // Traditional wooden doors (cửa bức bàn)
    for (const dx of [-4.8, -1.6, 1.6, 4.8]) {
      box(timber, dx, 2.15, -1.65, 2.65, 2.55, 0.14);
      box(0x7c4a32, dx, 2.45, -1.56, 2.2, 1.15, 0.06);
    }
    window.CentralArch.curvedRoof(T, kit, 0, 3.85, -3.5, 17.6, 9.8, 2.55, tile, cream, ochre, 0.38);

    // Ornate carved stone screen (Bình phong) in courtyard center
    box(stone, 0, 1.45, 3.6, 4.4, 2.35, 0.42);
    box(cream, 0, 1.48, 3.83, 3.55, 1.55, 0.06);
    window.CentralArch.curvedRoof(T, kit, 0, 2.65, 3.6, 5.1, 1.45, 0.62, tile, cream, ochre, 0.32);
  }

  // 3. Quảng Bình Quan – Đồng Hới (Quảng Trị / Quảng Bình cũ)
  function quangBinhQuan(T, kit) {
    const {box, stamp, outline, profile, round, sign} = kit;
    const brick = [0xa25b43, 0x944e39, 0xae664b, 0x8a4834];
    const plaster = 0xd8cdb5, stone = 0x868176, tile = 0x8c3f2e, dark = 0x3b2821;
    kit.palette({plaster, stone, tile});

    // Circular/octagonal stone island plinth (like the real roundabout monument in Đồng Hới)
    box(stone, 0, 0.25, 0, 17.6, 0.5, 13.4);
    box(plaster, 0, 0.54, 0, 16.4, 0.16, 12.2);

    // Massive arched brick 1639 fortification base with central vaulted passageway
    const base = new T.Shape();
    base.moveTo(-6.6, 0); base.lineTo(-2.15, 0); base.lineTo(-2.15, 2.55);
    base.absarc(0, 2.55, 2.15, Math.PI, 0, true);
    base.lineTo(2.15, 0); base.lineTo(6.6, 0); base.lineTo(6.15, 5.35); base.lineTo(-6.15, 5.35); base.closePath();
    profile(base, brick[0], 0, 0.6, -4.1, 8.2);
    // Brick masonry texture & arch voussoirs on both front & rear faces
    for (const face of [-1, 1]) {
      const fz = face * 4.14;
      for (let i = 0; i < 13; i++) {
        const a = i * Math.PI / 13, b = (i + 1) * Math.PI / 13 - 0.012, pt = (q, t) => [q * Math.cos(t), q * Math.sin(t)];
        outline([pt(2.15, a), pt(2.48, a), pt(2.48, b), pt(2.15, b)], i % 2 ? plaster : stone, 0, 3.15, fz - 0.05, 0.12);
      }
      for (let row = 0; row < 5; row++) {
        for (const s of [-1, 1]) box(brick[(row + (s > 0 ? 1 : 0)) % 4], s * 4.25, 1.15 + row * 0.9, fz, 3.6, 0.8, 0.08);
      }
    }
    // Recessed open fortress doors
    for (const s of [-1, 1]) box(dark, s * 1.85, 2.0, 0, 0.16, 3.2, 1.45, s * 0.24);
    box(plaster, 0, 5.45, 4.18, 3.65, 0.74, 0.14);
    sign('QUẢNG BÌNH QUAN', 0, 5.45, 4.27, 3.35, 0.5);

    // Ornate parapet terrace with battlements & lotus corners
    box(plaster, 0, 6.08, 0, 12.9, 0.28, 8.7);
    for (const f of [-1, 1]) {
      for (let i = -4; i <= 4; i++) box(plaster, i * 1.45, 6.62, f * 4.12, 0.82, 0.84, 0.36);
    }
    for (const s of [-1, 1]) {
      for (let j = -2; j <= 2; j++) box(plaster, s * 6.22, 6.62, j * 1.65, 0.36, 0.84, 0.82);
    }

    // Upper Watchtower (Vọng Lâu) — distinctive double-tier curved-eave roof of Quảng Bình Quan
    box(plaster, 0, 7.65, 0, 8.4, 2.85, 5.4);
    for (const x of [-4.05, -1.35, 1.35, 4.05]) for (const z of [-2.55, 2.55]) stamp(round, 0x7b2d23, x, 7.65, z, 0.18, 2.9, 0.18);
    for (const f of [-1, 1]) for (const dx of [-2.4, 0, 2.4]) box(0x52281f, dx, 7.65, f * 2.74, 1.25, 1.85, 0.08);
    window.CentralArch.curvedRoof(T, kit, 0, 9.05, 0, 11.4, 7.4, 1.45, tile, plaster, plaster, 0.32);

    box(0x8d4031, 0, 10.95, 0, 5.8, 1.55, 3.6);
    for (const f of [-1, 1]) for (const dx of [-1.45, 1.45]) box(dark, dx, 10.95, f * 1.84, 1.05, 0.92, 0.08);
    window.CentralArch.curvedRoof(T, kit, 0, 11.65, 0, 8.2, 5.4, 1.42, tile, plaster, plaster, 0.28);

    // Finial crest on summit
    const orb = new T.SphereGeometry(0.28, 10, 8);
    stamp(orb, 0xcba14a, 0, 13.38, 0, 1, 1.15, 0.5);
    orb.dispose();
  }

  // 4. Kỳ đài & Cầu Hiền Lương – Sông Bến Hải (Vĩnh Linh, Quảng Trị)
  function hienLuong(T, {palette, box, stamp, round, tapered, sign, wavingFlag}) {
    const stone = 0x9b988e, white = 0xe6e3da, darkGranite = 0x52524f;
    const red = 0xb82924, gold = 0xdfb847, northBlue = 0x2e6b9e, southYellow = 0xdcb43e;
    palette({stone: [stone, darkGranite]});

    // Broad ceremonial riverfront plaza & 3-tier monumental pedestal of Kỳ đài Hiền Lương
    box(stone, 0, 0.22, 0, 22.0, 0.44, 18.0);
    box(white, 0, 0.72, -1.0, 14.5, 0.64, 11.5);
    for (let st = 0; st < 4; st++) box(white, 0, 0.14 + st * 0.2, 5.8 - st * 0.42, 6.2, 0.2, 0.48);

    // Tall concrete base pavilion (Đài tưởng niệm Vĩ tuyến 17)
    box(white, 0, 2.75, -1.0, 8.8, 3.45, 6.8);
    for (const s of [-1, 1]) {
      box(darkGranite, s * 4.55, 2.75, -1.0, 0.42, 3.65, 7.1);
      // Flanking sculpted historical relief wings
      box(0xb79f80, s * 7.2, 2.35, -2.0, 4.6, 2.75, 0.72, -s * 0.22);
      box(darkGranite, s * 7.2, 3.85, -2.0, 4.9, 0.28, 0.92, -s * 0.22);
    }
    // Red band & golden star plaque on front face
    box(red, 0, 3.65, 2.45, 5.2, 1.05, 0.14);
    sign('KỲ ĐÀI HIỀN LƯƠNG · VĨ TUYẾN 17', 0, 2.35, 2.46, 5.4, 0.62);
    box(gold, 0, 3.65, 2.54, 0.62, 0.62, 0.06, 0, 0, Math.PI / 4);

    // Towering 34m-scale Flag Tower Mast (Cột cờ Hiền Lương) with stylized steel ribs
    box(white, 0, 6.2, -1.0, 4.2, 3.6, 4.2);
    for (const dx of [-1.8, 1.8]) for (const dz of [-1.8, 1.8]) box(darkGranite, dx, 6.2, -1.0 + dz, 0.45, 3.7, 0.45);
    tapered(white, 0, 14.5, -1.0, 1.45, 0.52, 13.4, 1, 8);
    stamp(round, 0xcad0d4, 0, 25.5, -1.0, 0.22, 11.2, 0.22);
    // Giant waving red-and-gold national flag on top
    wavingFlag(8.4, 5.6, 0.22, 30.8, -1.0);

    // Iconic symbolic 2-tone Blue & Yellow steel-truss Hiền Lương Bridge monument span beside the plaza
    const bx = 0, bz = 9.2, spanW = 24.0;
    box(stone, bx, 0.32, bz, spanW + 2.0, 0.64, 5.2);
    for (const half of [-1, 1]) {
      const col = half < 0 ? northBlue : southYellow; // Iconic North Blue / South Yellow paint!
      const x0 = half < 0 ? -spanW / 2 : 0;
      for (const side of [-1, 1]) {
        const z = bz + side * 2.1;
        box(col, x0 + spanW / 4, 0.85, z, spanW / 2, 0.24, 0.24);
        box(col, x0 + spanW / 4, 3.65, z, spanW / 2 - 1.2, 0.24, 0.24);
        for (let b = 0; b <= 4; b++) {
          const px = x0 + b * (spanW / 8);
          box(col, px, 2.25, z, 0.2, 2.8, 0.2);
          if (b < 4) {
            box(col, px + spanW / 16, 2.25, z, 3.8, 0.14, 0.14, 0, 0, 0.72);
            box(col, px + spanW / 16, 2.25, z, 3.8, 0.14, 0.14, 0, 0, -0.72);
          }
        }
      }
    }
    // White demarcation line right down the center of the bridge
    box(white, 0, 0.68, bz, 0.28, 0.1, 4.6);
  }

  // 5. Thành cổ Quảng Trị (Cổng Tiền & Đài Tưởng Niệm 81 Ngày Đêm)
  function thanhCoQuangTri(T, {palette, box, stamp, profile, outline, tapered, round, sign}) {
    const brick = [0x98513c, 0x894734, 0xa55c44, 0x7b402f];
    const stone = 0x8a867b, cream = 0xd6cdb8, red = 0xa92d26, gold = 0xd4ad4b;
    palette({stone, plaster: cream});

    // Broad paved memorial plaza
    box(stone, 0, 0.16, 0, 26.0, 0.32, 24.0);

    // Front Vaulted Brick Citadel Gate (Cổng Thành cổ Quảng Trị) at +Z
    const gate = new T.Shape();
    gate.moveTo(-8.4, 0); gate.lineTo(-2.1, 0); gate.lineTo(-2.1, 2.35);
    gate.absarc(0, 2.35, 2.1, Math.PI, 0, true);
    gate.lineTo(2.1, 0); gate.lineTo(8.4, 0); gate.lineTo(7.9, 4.95); gate.lineTo(-7.9, 4.95); gate.closePath();
    profile(gate, brick[0], 0, 0.32, 6.8, 3.4);
    for (let i = 0; i < 11; i++) {
      const a = i * Math.PI / 11, b = (i + 1) * Math.PI / 11 - 0.012, pt = (q, t) => [q * Math.cos(t), q * Math.sin(t)];
      outline([pt(2.1, a), pt(2.42, a), pt(2.42, b), pt(2.1, b)], i % 2 ? cream : stone, 0, 2.67, 10.18, 0.12);
    }
    box(cream, 0, 5.4, 8.5, 16.4, 0.28, 3.8);
    for (let i = -5; i <= 5; i++) box(brick[Math.abs(i) % 4], i * 1.48, 5.98, 10.1, 0.85, 0.88, 0.38);
    box(cream, 0, 4.78, 10.28, 4.4, 0.72, 0.14);
    sign('THÀNH CỔ QUẢNG TRỊ', 0, 4.78, 10.37, 4.1, 0.52);

    // Central Octagonal Memorial Monument ("Đài Tưởng Niệm Trung Tâm" — 81 Days & Nights) at -Z
    const mz = -3.8;
    tapered(red, 0, 0.55, mz, 9.2, 8.8, 0.45, 1, 8);
    tapered(cream, 0, 1.15, mz, 7.2, 6.8, 0.78, 1, 8);
    // 8 ceremonial staircases ascending the octagonal memorial mound
    for (let f = 0; f < 4; f++) {
      const a = f * Math.PI / 2;
      box(cream, Math.sin(a) * 7.8, 0.75, mz + Math.cos(a) * 7.8, 2.6, 0.78, 1.9, a);
    }
    // Iconic sculpted ceremonial incense burner & red-lotus spire rising 8.1m
    tapered(stone, 0, 2.35, mz, 4.8, 3.9, 1.65, 1, 8);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      box(brick[0], Math.sin(a) * 3.85, 4.65, mz + Math.cos(a) * 3.85, 0.72, 3.4, 0.72, a);
    }
    // Golden flame / lotus crown atop the memorial
    tapered(0x785a3a, 0, 4.1, mz, 1.65, 1.95, 1.95, 1, 12);
    tapered(red, 0, 6.85, mz, 4.4, 2.2, 1.45, 1, 8);
    tapered(gold, 0, 8.95, mz, 1.55, 0.12, 2.95, 1, 8);
  }

  // 6. Chứng tích Nhà thờ Tam Tòa – Đồng Hới (Quảng Trị / Quảng Bình cũ)
  function nhaThoTamToa(T, {palette, box, stamp, outline, profile, tapered}) {
    const brick = [0x9f5d44, 0x8f523b, 0xab694e, 0x7a4734];
    const plaster = 0xc9be9f, moss = 0x5d6949, stone = 0x8e897d, dark = 0x352a24;
    palette({plaster, stone});

    // Riverside lawn stone base & low memorial fence
    box(stone, 0, 0.18, 0, 15.6, 0.36, 15.6);
    for (const [fx, fz, fw, fd] of [[0, -7.4, 15.0, 0.34], [-7.4, 0, 0.34, 15.0], [7.4, 0, 0.34, 15.0]]) {
      box(plaster, fx, 0.72, fz, fw, 0.78, fd);
    }

    // Iconic Surviving Portuguese-Gothic Red-Brick Bell Tower Ruin (Tháp chuông Tam Tòa)
    const bx = 0, bz = 1.6;
    // Lower arched portal facade with jagged bombed-out nave walls extending behind
    const front = new T.Shape();
    front.moveTo(-4.4, 0); front.lineTo(-1.45, 0); front.lineTo(-1.45, 2.3);
    front.absarc(0, 2.3, 1.45, Math.PI, 0, true);
    front.lineTo(1.45, 0); front.lineTo(4.4, 0); front.lineTo(4.4, 7.6);
    front.lineTo(2.9, 7.6); front.lineTo(2.9, 13.8); front.lineTo(0, 16.5); front.lineTo(-2.9, 13.8);
    front.lineTo(-2.9, 7.6); front.lineTo(-4.4, 7.6); front.closePath();
    profile(front, brick[0], bx, 0.36, bz - 1.65, 3.3);

    // Recessed Gothic bell-arch opening at upper belfry level
    outline([[-1.15, 0], [1.15, 0], [1.15, 2.4], [0.65, 3.25], [0, 3.75], [-0.65, 3.25], [-1.15, 2.4]], dark, bx, 8.9, bz + 1.68, 0.16);
    outline([[-1.15, 0], [1.15, 0], [1.15, 2.4], [0.65, 3.25], [0, 3.75], [-0.65, 3.25], [-1.15, 2.4]], dark, bx, 8.9, bz - 1.82, 0.16);
    // Classical Portuguese pilaster trims & broken cornices
    for (const s of [-1, 1]) {
      box(plaster, s * 4.25, 4.1, bz + 1.68, 0.56, 7.3, 0.24);
      box(plaster, s * 2.75, 10.6, bz + 1.68, 0.48, 6.2, 0.24);
      // Jagged ruined side nave masonry stubs extending back (-Z)
      outline([[0, 0], [7.2, 0], [7.2, 1.3], [5.1, 2.4], [3.2, 3.8], [1.4, 5.4], [0, 6.6]], brick[1], s * 4.15, 0.36, bz - 1.6, 0.55, Math.PI / 2);
      // Side buttress columns
      box(brick[2], s * 4.15, 1.85, bz - 4.4, 0.85, 2.9, 0.85);
    }
    // Horizontal stone mouldings & mossy weathered top
    for (const y of [4.8, 7.75, 13.6]) box(plaster, bx, y, bz, y > 8 ? 6.1 : 9.1, 0.3, 3.65);
    box(moss, 1.4, 14.2, bz, 1.8, 0.65, 1.6);
    // Tall slender cross silhouette atop the surviving gable
    box(plaster, bx, 17.85, bz, 0.22, 2.4, 0.22);
    box(plaster, bx, 18.4, bz, 1.25, 0.22, 0.22);
  }

  (window.VietnamSights ??= []).push({
    id: 'nga-ba-dong-loc', name: 'Tháp Chuông Ngã ba Đồng Lộc', city: 'Can Lộc', province: 'Hà Tĩnh', region: 'Trung Bộ',
    lon: 105.740227, lat: 18.398218, start: [105.738368, 18.398306], yaw: -1.52, width: 24, depth: 24, viewElevation: 0.22,
    solids: [[0, 0, 4.8, 4.8]],
    description: 'Tháp chuông bát giác bảy tầng mái ngói đỏ với đại hồng chung đặt trên đồi cao tại khu di tích lịch sử Ngã ba Đồng Lộc, Hà Tĩnh.',
    photo: 'https://baovanhoa.vn/van-hoa/di-san/nga-ba-dong-loc',
    source: 'https://vi.wikipedia.org/wiki/Ng%C3%A3_ba_%C4%90%E1%BB%93ng_L%E1%BB%99c',
    map: 'https://www.openstreetmap.org/node/4409284591',
    build: ngaBaDongLoc
  }, {
    id: 'khu-luu-niem-nguyen-du', name: 'Khu lưu niệm Đại thi hào Nguyễn Du', city: 'Nghi Xuân', province: 'Hà Tĩnh', region: 'Trung Bộ',
    lon: 105.766721, lat: 18.664766, start: [105.766427, 18.664673], yaw: -1.25, width: 24, depth: 21,
    solids: [[0, -3.5, 7.8, 4.2], [0, 3.6, 2.3, 0.5], [-4.5, 8.5, 1.8, 1.1], [4.5, 8.5, 1.8, 1.1]],
    description: 'Cổng tam quan, bình phong đá và nhà thờ cổ năm gian mái ngói cong tại làng Tiên Điền – quê hương Đại thi hào Nguyễn Du.',
    photo: 'https://hatinhtourism.vn/khu-luu-niem-dai-thi-hao-nguyen-du',
    source: 'https://vi.wikipedia.org/wiki/Khu_l%C6%B0u_ni%E1%BB%87m_Nguy%E1%BB%85n_Du',
    map: 'https://www.openstreetmap.org/node/7261144420',
    build: nguyenDu
  }, {
    id: 'quang-binh-quan', name: 'Quảng Bình Quan', city: 'Đồng Hới', province: 'Quảng Trị', region: 'Trung Bộ', formerProvince: 'Quảng Bình',
    lon: 106.62265, lat: 17.46572, start: [106.622696, 17.465590], yaw: 0.33, width: 18, depth: 14,
    solids: [[-4.4, 0, 2.2, 4.1], [4.4, 0, 2.2, 4.1]],
    description: 'Cổng thành lịch sử xây năm 1639 tại trung tâm Đồng Hới với vòm gạch lớn, tường thành lỗ châu mai và vọng lâu hai tầng mái đao cong.',
    photo: 'https://quangbinhtourism.vn/quang-binh-quan/',
    source: 'https://vi.wikipedia.org/wiki/Qu%E1%BA%A3ng_B%C3%ACnh_Quan',
    map: 'https://www.openstreetmap.org/?mlat=17.46572&mlon=106.62265#map=18/17.46572/106.62265',
    build: quangBinhQuan
  }, {
    id: 'hien-luong', name: 'Kỳ đài & Cầu Hiền Lương', city: 'Vĩnh Linh', province: 'Quảng Trị', region: 'Trung Bộ',
    lon: 107.050216, lat: 17.005652, start: [107.050818, 17.005837], yaw: 1.88, viewElevation: 0.21, width: 28, depth: 26,
    solids: [[0, -1, 4.5, 3.6], [0, 9.2, 12.2, 2.5]],
    description: 'Kỳ đài giới tuyến Vĩ tuyến 17 với lá cờ Tổ quốc tung bay bên sông Bến Hải và nhịp cầu giàn thép hai màu xanh – vàng lịch sử.',
    photo: 'https://vinwonders.com/vi/wonderpedia/news/cau-hien-luong-song-ben-hai/',
    source: 'https://vi.wikipedia.org/wiki/C%E1%BA%A7u_Hi%E1%BB%81n_L%C6%B0%C6%A1ng',
    map: 'https://www.openstreetmap.org/node/1016631030',
    build: hienLuong
  }, {
    id: 'thanh-co-quang-tri', name: 'Thành cổ Quảng Trị', city: 'Quảng Trị', province: 'Quảng Trị', region: 'Trung Bộ',
    lon: 107.189536, lat: 16.753930, start: [107.18741, 16.75449], yaw: -1.32, width: 28, depth: 26,
    solids: [[-5.2, 8.5, 3.2, 1.8], [5.2, 8.5, 3.2, 1.8], [0, -3.8, 7.2, 7.2]],
    description: 'Cổng thành gạch cổ lỗ châu mai cùng Đài tưởng niệm trung tâm hình bát giác tri ân 81 ngày đêm bảo vệ Thành cổ Quảng Trị.',
    photo: 'https://vinwonders.com/vi/wonderpedia/news/thanh-co-quang-tri/',
    source: 'https://vi.wikipedia.org/wiki/Th%C3%A0nh_c%E1%BB%95_Qu%E1%BA%A3ng_Tr%E1%BB%8B',
    map: 'https://www.openstreetmap.org/way/1189797496',
    build: thanhCoQuangTri
  }, {
    id: 'nha-tho-tam-toa', name: 'Chứng tích Nhà thờ Tam Tòa', city: 'Đồng Hới', province: 'Quảng Trị', region: 'Trung Bộ', formerProvince: 'Quảng Bình',
    lon: 106.623350, lat: 17.474978, start: [106.623100, 17.474978], yaw: -1.57, width: 17, depth: 17,
    solids: [[-3.1, 1.6, 1.4, 1.8], [3.1, 1.6, 1.4, 1.8], [-4.15, -2.5, 0.6, 3.6], [4.15, -2.5, 0.6, 3.6]],
    description: 'Tháp chuông gạch đỏ kiến trúc Bồ Đào Nha còn lưu giữ bên bờ sông Nhật Lệ – chứng tích chiến tranh nổi tiếng tại Đồng Hới.',
    photo: 'https://quangbinhtourism.vn/nha-tho-tam-toa/',
    source: 'https://vi.wikipedia.org/wiki/Nh%C3%A0_th%E1%BB%9D_Tam_T%C3%B2a',
    map: 'https://www.openstreetmap.org/way/343077412',
    build: nhaThoTamToa
  });
})();
