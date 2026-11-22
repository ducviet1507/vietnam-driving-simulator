'use strict';
(() => {

  // 1. Tháp Chuông Ngã ba Đồng Lộc (Can Lộc, Hà Tĩnh)
  function ngaBaDongLoc(T, {palette, box, stamp, round, tapered, profile, place}) {
    const granite = 0xaaa49b, cream = 0xe9e1d4, brick = 0xa0654f;
    const timber = 0x633d31, tile = 0x984937, ridge = 0x8a7066, bronze = 0x75634a;
    palette({stone: granite, plaster: cream, brick, timber, tile, metal: bronze});
    tapered(granite, 0, .14, 0, 11.2, 11.2, .28, 1, 8);
    tapered(brick, 0, .31, 0, 10.8, 10.8, .12, 1, 8);

    // The octagonal balconies have open cream arches and upturned tiled hips.
    const floors = [.37, 5.25, 9.49, 13.67, 17.81, 21.92, 26.03];
    const eaves = [4.12, 8.38, 12.56, 16.71, 20.83, 24.93, 30.64, 33.14];
    for (let floor = 0; floor < floors.length; floor++) {
      const base = floors[floor], radius = 4.48 - floor * .21;
      const roof = eaves[floor], height = roof - base;
      tapered(granite, 0, base + .12, 0, radius + .12, radius + .12, .24, 1, 8);
      if (floor < 6) tapered(timber, 0, base + height / 2, 0, radius * .48, radius * .46, height, 1, 8);
      for (let side = 0; side < 8; side++) {
        const angle = (side + .5) * Math.PI / 4;
        const inner = radius * Math.cos(Math.PI / 8);
        const halfWidth = radius * Math.sin(Math.PI / 8);
        const archWidth = halfWidth * .78, spring = base + .77;
        const band = new T.Shape();
        band.moveTo(-halfWidth, base + .22); band.lineTo(-archWidth, base + .22);
        band.lineTo(-archWidth, spring);
        band.absarc(0, spring, archWidth, Math.PI, 0, true);
        band.lineTo(archWidth, base + .22); band.lineTo(halfWidth, base + .22);
        band.lineTo(halfWidth, spring + .1);
        band.quadraticCurveTo(halfWidth * .9, spring + archWidth + .28, 0, spring + archWidth + .28);
        band.quadraticCurveTo(-halfWidth * .9, spring + archWidth + .28, -halfWidth, spring + .1);
        band.closePath();
        place(Math.sin(angle) * inner, Math.cos(angle) * inner, angle, () => {
          profile(band, cream, 0, 0, -.15, .30);
          box(cream, 0, base + .46, .02, halfWidth * 2, .42, .24);
        });
        const post = side * Math.PI / 4;
        stamp(round, timber, Math.sin(post) * radius, base + height / 2, Math.cos(post) * radius,
          .27, height, .27);
      }
    }

    // Eight swept octagonal roofs. Carry the stone-coloured ridge caps up each hip.
    function roof(level, radius, inner, rise) {
      const pos = [], underside = [];
      const ring = (a, t, u) => {
        const b = a + Math.PI / 4, r = radius + (inner - radius) * t;
        const x = (1 - u) * Math.sin(a) + u * Math.sin(b), z = (1 - u) * Math.cos(a) + u * Math.cos(b);
        return new T.Vector3(x * r, level + rise * t * t + .60 * Math.pow(Math.abs(2 * u - 1), 3) * (1 - t), z * r);
      };
      function triangle(a, b, c) { pos.push(...a.toArray(), ...b.toArray(), ...c.toArray()); }
      for (let side = 0; side < 8; side++) {
        const a = side * Math.PI / 4;
        for (let k = 0; k < 5; k++) for (let j = 0; j < 4; j++) {
          const t = j / 4, next = (j + 1) / 4, u = k / 5, v = (k + 1) / 5;
          const A = ring(a, t, u), B = ring(a, t, v), C = ring(a, next, u), D = ring(a, next, v);
          triangle(A, B, C); triangle(B, D, C);
          if (!j) {
            const lowA = A.clone(), lowB = B.clone(); lowA.y -= .19; lowB.y -= .19;
            triangle(A, lowA, B); triangle(lowA, lowB, B);
            const inside = p => new T.Vector3(p.x * .58, level + .45, p.z * .58);
            const innerA = inside(A), innerB = inside(B);
            underside.push(...lowA.toArray(), ...innerA.toArray(), ...lowB.toArray(),
              ...lowB.toArray(), ...innerA.toArray(), ...innerB.toArray(),
              ...innerA.toArray(), 0, level + .45, 0, ...innerB.toArray());
          }
        }
        const points = [0, .25, .5, .75, 1].map(t => ring(a, t, 0));
        const hip = new T.TubeGeometry(new T.CatmullRomCurve3(points), 6, .095, 6, false);
        stamp(hip, ridge, 0, .04, 0); hip.dispose();
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
      stamp(geo, tile, 0, 0, 0); geo.dispose();
      const soffit = new T.BufferGeometry();
      soffit.setAttribute('position', new T.Float32BufferAttribute(underside, 3)); soffit.computeVertexNormals();
      stamp(soffit, timber, 0, 0, 0); soffit.dispose();
    }
    eaves.forEach((y, i) => roof(y, 6.85 - i * .33, i === 7 ? .22 : 4.2 - i * .20, i === 7 ? 2.76 : 1.34));
    tapered(timber, 0, 32.44, 0, 2.74, 2.6, 1.60, 1, 8);
    tapered(ridge, 0, 36.25, 0, .21, .035, .70, 1, 12);

    // Ministry of Culture inauguration record: seventh-floor bell, 1.95 m across and 3.7 m tall.
    const lip = 26.72;
    const profilePoints = [[.90, .09], [.975, .09], [.975, .20], [.88, .30], [.76, .48],
      [.73, 1.65], [.67, 2.52], [.55, 2.92], [.32, 3.13], [.15, 3.18]];
    const bell = new T.LatheGeometry(profilePoints.map(([r, y]) => new T.Vector2(r, y)), 36);
    stamp(bell, bronze, 0, lip - .09, 0); bell.dispose();
    for (const [r, y] of [[.93, .22], [.78, .46], [.75, .68], [.73, 1.41]]) {
      tapered(bronze, 0, lip + y, 0, r, r, .05, 1, 36);
    }
    const bail = new T.TorusGeometry(.245, .065, 8, 18);
    stamp(bail, bronze, 0, lip + 3.39, 0); bail.dispose();
    box(timber, 0, lip + 3.77, 0, 4.2, .22, .29);
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

  // 5. Thành cổ Quảng Trị. The mound and the south gate have separate mapped foundations.
  function thanhCoQuangTri(T, kit) {
    const {palette, stamp, box, tapered, round, place} = kit;
    const lawn = 0x73874d, paver = 0xb7806d, stone = 0xc2aba0, trim = 0xddc9b6;
    const timber = 0x7a4231, tile = 0xba834a, bronze = 0x775740;
    palette({brick: paver, stone: [stone, trim], timber, tile, metal: bronze});
    const foot = 19, crest = 7.25, base = .19, top = 5.1;
    tapered(paver, 0, .095, 0, 25.1, 25.1, .19, 1, 64);
    // Four round-ended recesses alternate with the stairways on the grassy slopes.
    const surface = [], walls = [];
    function tri(bucket, a, b, c) { bucket.push(...a, ...b, ...c); }
    function mesh(points, color) {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(points, 3)); geo.computeVertexNormals();
      stamp(geo, color, 0, 0, 0); geo.dispose();
    }
    const polar = (r, a, y) => [Math.sin(a) * r, y, Math.cos(a) * r];
    const radii = [crest, 8.8, 9.15, 9.7, 10.3, 11.1, 12.4, 14, 16.4, foot];
    function cutAngle(r) {
      const t = Math.min(1, Math.max(0, (r - 8.8) / 2.3));
      return Math.asin(1.83 * Math.sqrt(1 - (1 - t) ** 2) / r);
    }
    function point(quadrant, r, t) {
      const gap = cutAngle(r), a = quadrant + gap + (Math.PI / 2 - 2 * gap) * t;
      return polar(r, a, base + (top - base) * (foot - r) / (foot - crest));
    }
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      for (let j = 1; j < radii.length; j++) {
        const outer = radii[j], inner = radii[j - 1];
        for (let k = 0; k < 16; k++) {
          const u = k / 16, v = (k + 1) / 16;
          const A = point(a, outer, u), B = point(a, outer, v), C = point(a, inner, u), D = point(a, inner, v);
          tri(surface, A, B, C); tri(surface, B, D, C);
        }
        if (outer > 8.8) for (const end of [0, 1]) {
          const A = point(a, outer, end), B = point(a, inner, end);
          const C = [A[0], base, A[2]], D = [B[0], base, B[2]];
          if (end) { tri(walls, A, C, B); tri(walls, B, C, D); }
          else { tri(walls, A, B, C); tri(walls, B, D, C); }
        }
      }
      place(0, 0, a, () => {
        const opening = new T.Shape();
        opening.moveTo(-1.52, 0); opening.lineTo(1.52, 0); opening.lineTo(1.52, .83);
        opening.absarc(0, .83, 1.52, 0, Math.PI, false); opening.closePath();
        kit.profile(opening, 0x48423b, 0, base, 10.33, .12);
        const rim = new T.Shape();
        rim.moveTo(-1.78, 0); rim.lineTo(-1.52, 0); rim.lineTo(-1.52, .83);
        rim.absarc(0, .83, 1.52, Math.PI, 0, true);
        rim.lineTo(1.52, 0); rim.lineTo(1.78, 0); rim.lineTo(1.78, .83);
        rim.absarc(0, .83, 1.78, 0, Math.PI, false); rim.closePath();
        kit.profile(rim, trim, 0, base, 10.46, .18);
      });
      // Each staircase follows a mapped OSM stair axis, halfway between the recessed walks.
      place(0, 0, a + Math.PI / 4, () => {
        // The documented aggregate is 81. Individual flight counts are not surveyed.
        const count = i === 3 ? 21 : 20, tread = (foot - crest) / count;
        for (let n = 0; n < count; n++) {
          const y = base + (top - base) * (n + 1) / count;
          box(paver, 0, (y + base) / 2, foot - (n + .5) * tread, 2.48, y - base, tread + .02);
        }
        for (const side of [-1, 1]) {
          const length = Math.hypot(foot - crest, top - base), pitch = Math.atan2(top - base, foot - crest);
          box(trim, side * 1.34, (top + base) / 2 + .19, (foot + crest) / 2, .21, .24, length, 0, pitch);
        }
      });
    }
    mesh(surface, lawn); mesh(walls, trim);
    tapered(stone, 0, top + .01, 0, crest + .04, crest + .04, .12, 1, 64);
    // Curved coping and its open slots are interrupted where each flight reaches the platform.
    for (let i = 0; i < 64; i++) {
      const angle = (i + .5) * Math.PI / 32;
      if ([6, 7, 8, 9].includes(i % 16)) continue;
      const x = Math.sin(angle) * 7.09, z = Math.cos(angle) * 7.09;
      box(stone, x, top + .49, z, .74, .16, .20, angle);
      box(stone, x, top + .25, z, .19, .42, .18, angle);
    }
    // Yin and yang share the round altar platform. The lamp stands beside the roofed altar.
    const deck = top + .68;
    tapered(stone, 0, top + .36, 0, 3.98, 3.98, .61, 1, 64);
    for (let i = 0; i < 81; i++) {
      const a = i * Math.PI * 2 / 81;
      box(trim, Math.sin(a) * 3.99, top + .38, Math.cos(a) * 3.99, .265, .40, .09, a);
    }
    for (const [a, tint] of [[0, 0xa46e62], [Math.PI, 0x789291]]) {
      const half = new T.CylinderGeometry(3.87, 3.87, .08, 32, 1, false, a, Math.PI);
      stamp(half, tint, 0, deck, 0); half.dispose();
    }
    const lampX = -1.7;
    const lampShape = [[.01, 0], [.64, 0], [.67, .18], [.37, .41], [.44, .78], [.89, 1.03],
      [1.03, 1.28], [.94, 1.43], [.58, 1.51], [.45, 1.65], [.32, 2.01], [.25, 6.88],
      [.20, 7.26], [.29, 7.35], [.33, 7.56], [.26, 7.78], [.04, 8.1]];
    const lamp = new T.LatheGeometry(lampShape.map(([r, y]) => new T.Vector2(r, y)), 32);
    stamp(lamp, 0xa06c53, lampX, deck + .04, 0); lamp.dispose();
    place(1.33, 0, 0, () => {
      for (const x of [-1.13, 1.13]) for (const z of [-1.30, 1.30]) {
        stamp(round, timber, x, deck + 1.65, z, .30, 3.28, .30);
        tapered(stone, x, deck + .15, z, .22, .18, .24, 1, 12);
      }
      window.CentralArch.curvedRoof(T, kit, 0, deck + 3.24, 0, 3.43, 3.75, .96, tile, 0x716454, bronze, .18);
      const bowl = new T.LatheGeometry([[.28, 0], [.50, .09], [.37, .23], [.39, .39],
        [.64, .55], [.68, .82], [.76, .90], [.70, 1.00]].map(([r, y]) => new T.Vector2(r, y)), 24);
      stamp(bowl, bronze, 0, deck + .04, 0); bowl.dispose();
    });
  }

  function congTienQuangTri(T, kit) {
    const {palette, box, profile, outline} = kit;
    const wall = 0x938b7f, trim = 0xb0a79a, dark = 0x777166, tile = 0xaa7447;
    palette({stone: [wall, trim, dark], tile});
    // Width and axis of the public Nam môn are taken from OSM way 1137794040.
    const shell = new T.Shape();
    shell.moveTo(-15.65, 0); shell.lineTo(-1.73, 0); shell.lineTo(-1.73, 2.32);
    shell.absarc(0, 2.32, 1.73, Math.PI, 0, true); shell.lineTo(1.73, 0);
    shell.lineTo(15.65, 0); shell.lineTo(15.65, 4.72); shell.lineTo(4.4, 4.72);
    shell.lineTo(4.4, 5.78); shell.lineTo(-4.4, 5.78); shell.lineTo(-4.4, 4.72);
    shell.lineTo(-15.65, 4.72); shell.closePath();
    profile(shell, wall, 0, -.04, -4.15, 8.30);
    for (const face of [-1, 1]) {
      const fz = face * 4.16;
      for (const side of [-1, 1]) {
        box(trim, side * 3.62, 2.80, fz, .44, 5.61, .22);
        box(dark, side * 10.05, 4.78, fz, 11.25, .22, .42);
        box(wall, side * 14.28, 5.13, fz, .83, .54, .55);
      }
      for (let i = 0; i < 15; i++) {
        const a = i * Math.PI / 15, b = (i + 1) * Math.PI / 15 - .014;
        const pt = (r, t) => [r * Math.cos(t), r * Math.sin(t)];
        outline([pt(1.73, a), pt(2.03, a), pt(2.03, b), pt(1.73, b)],
          i % 4 ? trim : wall, 0, 2.28, fz - .12, .24);
      }
      box(dark, 0, 5.79, fz, 8.99, .20, .42);
    }
    const watch = new T.Shape();
    watch.moveTo(-1.63, 0); watch.lineTo(-.48, 0); watch.lineTo(-.48, .8);
    watch.absarc(0, .8, .48, Math.PI, 0, true); watch.lineTo(.48, 0);
    watch.lineTo(1.63, 0); watch.lineTo(1.63, 2.16); watch.lineTo(-1.63, 2.16); watch.closePath();
    profile(watch, trim, 0, 5.75, -1.7, 3.4);
    window.CentralArch.curvedRoof(T, kit, 0, 7.86, 0, 4.07, 4.18, .86, tile, dark, dark, .28);
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
    id: 'nga-ba-dong-loc', memorialVisit: true, name: 'Tháp Chuông Ngã ba Đồng Lộc', city: 'Can Lộc', province: 'Hà Tĩnh', region: 'Trung Bộ',
    lon: 105.740227, lat: 18.398218, start: [105.738368, 18.398306], yaw: -1.52, width: 24, depth: 24,
    views: [{name: 'Toàn cảnh tháp chuông', height: 36.6, viewAngle: -1.1, viewRadius: 66, viewElevation: .13},
      {name: 'Gác chuông tầng bảy', height: 62, viewAngle: -1.1273, viewRadius: 15, viewElevation: .035}],
    solids: [[0, 0, 4.8, 4.8]],
    description: 'Tháp chuông cao 36,6 m với bảy tầng và tám mái ngói trên đồi Đồng Lộc. Đại hồng chung nặng 5,7 tấn, cao 3,7 m, đường kính 1,95 m, treo tại tầng bảy.',
    photo: 'https://congdoanvietnam.vn/quy-tam-long-vang/thap-chuong-dong-loc-cong-trinh-cua-long-tri-an-46569.tld',
    source: 'https://bvhttdl.gov.vn/ha-tinh-khanh-thanh-thap-chuong-dong-loc-1514.htm',
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
    id: 'thanh-co-quang-tri', memorialVisit: true, name: 'Thành cổ Quảng Trị', city: 'Quảng Trị', province: 'Quảng Trị', region: 'Trung Bộ',
    lon: 107.1895097, lat: 16.7539213, start: [107.18741, 16.75449], yaw: -.288, width: 50, depth: 50,
    solids: [[0, 0, 18.8, 4.6], [0, 0, 17.1, 8.8], [0, 0, 13.8, 13.6],
      [0, 0, 9.6, 16.8], [0, 0, 4.8, 18.8]],
    views: [{name: 'Đài tưởng niệm trung tâm', height: 14, viewAngle: -.94, viewRadius: 46, viewElevation: .22},
      {name: 'Tầng dâng hương', height: 19, viewAngle: .34, viewRadius: 26, viewElevation: .31},
      {name: 'Cổng Tiền', offset: [-51.3, 180.1], height: 8.8, viewAngle: -.37, viewRadius: 47, viewElevation: .11,
        description: 'Cổng Tiền mở về phía nam. Qua cầu và vòm cổng, trục đường trong thành dẫn đến đài tưởng niệm.'}],
    description: 'Đài tưởng niệm giữa Thành cổ mang hình nấm mộ chung. Bốn cầu thang dẫn từ sân gạch lên tầng dâng hương, nơi có cây đèn thờ cao 8,1 m tưởng nhớ 81 ngày đêm năm 1972.',
    photo: 'https://vov.gov.vn/coi-thieng-thanh-co-quang-tri-mot-sang-som-mai-dtnew-413336',
    source: 'https://dsvh.gov.vn/di-tich-lich-su-thanh-co-quang-tri-va-nhung-dia-diem-luu-niem-su-kien-81-ngay-dem-nam-1972-2975',
    map: 'https://www.openstreetmap.org/node/3141269667',
    build: thanhCoQuangTri
  }, {
    id: 'cong-tien-thanh-co-quang-tri', memorialVisit: true, name: 'Cổng Tiền Thành cổ Quảng Trị', city: 'Quảng Trị', province: 'Quảng Trị', region: 'Trung Bộ',
    lon: 107.1890288, lat: 16.7523036, start: [107.188813, 16.751548], yaw: -.288, width: 31.4, depth: 8.4,
    viewAngle: -.37, viewRadius: 47, viewElevation: .11,
    solids: [[-8.72, 0, 6.92, 4.16], [8.72, 0, 6.92, 4.16]],
    description: 'Nam môn của Thành cổ gồm cửa vòm cuốn ở tầng dưới và vọng lâu ở tầng trên. Cổng nằm ở đầu cầu qua hào thành.',
    source: 'https://dsvh.gov.vn/di-tich-lich-su-thanh-co-quang-tri-va-nhung-dia-diem-luu-niem-su-kien-81-ngay-dem-nam-1972-2975',
    photo: 'https://vnexpress.net/thanh-co-quang-tri-xua-va-nay-4938680.html',
    map: 'https://www.openstreetmap.org/way/1137794040',
    build: congTienQuangTri
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
