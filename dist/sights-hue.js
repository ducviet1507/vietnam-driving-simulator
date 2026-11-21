'use strict';
(() => {
  function imperialRoof(T,kit,x,y,z,w,d,h,tile,ridge,eave,ridgeRatio=.32){
    window.CentralArch.curvedRoof(T,kit,x,y,z,w,d,h,tile,ridge,eave,ridgeRatio);
  }

  // 1. Ngọ Môn – Đại Nội Huế (U-shaped Imperial Bastion + Lầu Ngũ Phụng)
  function ngoMonHue(T, kit) {
    const {box, stamp, profile, outline, round, sign} = kit;
    const brick = 0x79746b, darkBrick = 0x5d5952, trim = 0xa7a194, rail = 0xbeb7a8;
    const crimson = 0x7e241d, goldTile = 0xd6a634, greenTile = 0x2f6c54, gold = 0xdfb84c;

    // Front stone Kim Thủy bridge approaching the royal center gate (+Z)
    const bridgeStart = 1, bridgeEnd = 21.6;
    const bridgeCenter = (bridgeStart + bridgeEnd) / 2, bridgeLength = bridgeEnd - bridgeStart;
    kit.palette({brick: [brick, darkBrick], glazedTile: [goldTile, greenTile]});
    box(trim, 0, 0.24, bridgeCenter, 9.6, 0.48, bridgeLength);
    for (const s of [-1, 1]) {
      box(rail, s * 4.55, 0.85, bridgeCenter, 0.42, 0.85, bridgeLength);
      for (let z = bridgeStart + 0.8; z < bridgeEnd; z += 2.1) box(trim, s * 4.55, 1.32, z, 0.54, 0.32, 0.54);
    }

    // Main U-shaped grey-brick foundation bastion (nền đài chữ U, ~5m high)
    // Center rear block with 3 portals (1 rectangular royal center + 2 arched side portals)
    const centerWall = new T.Shape();
    centerWall.moveTo(-17.5, 0);
    centerWall.lineTo(-10.8, 0); centerWall.lineTo(-10.8, 2.25); centerWall.absarc(-9.0, 2.25, 1.8, Math.PI, 0, true); centerWall.lineTo(-7.2, 0);
    centerWall.lineTo(-2.5, 0); centerWall.lineTo(-2.5, 3.45); centerWall.lineTo(2.5, 3.45); centerWall.lineTo(2.5, 0);
    centerWall.lineTo(7.2, 0); centerWall.lineTo(7.2, 2.25); centerWall.absarc(9.0, 2.25, 1.8, Math.PI, 0, true); centerWall.lineTo(10.8, 0);
    centerWall.lineTo(17.5, 0); centerWall.lineTo(17.5, 5.1); centerWall.lineTo(-17.5, 5.1); centerWall.closePath();
    profile(centerWall, brick, 0, 0, -9.8, 10.8);
    // Royal bronze-studded doors inside center portal
    for (const s of [-1, 1]) box(0x521d18, s * 2.1, 1.72, -4.4, 0.18, 3.35, 1.75, s * 0.24);
    box(gold, 0, 4.18, 1.06, 3.4, 0.72, 0.14);
    sign('NGỌ MÔN', 0, 4.18, 1.15, 3.1, 0.52);

    // Two forward-projecting U-wings (cánh chữ U) each with a vaulted wing portal (cửa dịch)
    for (const s of [-1, 1]) {
      const wx = s * 21.6;
      const wing = new T.Shape();
      wing.moveTo(-6.2, 0); wing.lineTo(-1.45, 0); wing.lineTo(-1.45, 1.95);
      wing.absarc(0, 1.95, 1.45, Math.PI, 0, true);
      wing.lineTo(1.45, 0); wing.lineTo(6.2, 0); wing.lineTo(6.2, 5.1); wing.lineTo(-6.2, 5.1); wing.closePath();
      profile(wing, darkBrick, wx, 0, -9.8, 22.8);
      // Stone cornice & decorative lotus balustrade around wing decks
      box(trim, wx, 5.2, 1.6, 12.9, 0.28, 23.2);
      for (let z = -9.2; z <= 12.6; z += 1.55) {
        box(rail, wx + s * 6.15, 5.75, z, 0.24, 0.85, 0.92);
        box(rail, wx - s * 6.15, 5.75, z, 0.24, 0.85, 0.92);
      }
      box(rail, wx, 5.75, 12.9, 12.4, 0.85, 0.24);
    }
    box(trim, 0, 5.2, -4.4, 35.6, 0.28, 11.4);
    for (let x = -15.6; x <= 15.6; x += 1.65) {
      box(rail, x, 5.75, 1.1, 0.95, 0.85, 0.24);
      box(rail, x, 5.75, -9.8, 0.95, 0.85, 0.24);
    }

    // Lầu Ngũ Phụng (Five-Phoenix Pavilion) — 2-tier crimson timber pavilion atop the U-bastion
    // Central main pavilion (golden Hoàng Lưu Ly double roof)
    box(trim, 0, 5.55, -4.4, 24.4, 0.45, 8.6);
    for (let i = -5; i <= 5; i++) {
      for (const z of [-8.1, -0.7]) stamp(round, crimson, i * 2.25, 7.65, z, 0.2, 3.85, 0.2);
    }
    box(crimson, 0, 7.55, -4.4, 21.8, 3.4, 6.2);
    for (let i = -4; i <= 4; i++) {
      for (const f of [-1, 1]) box(gold, i * 2.25, 7.55, -4.4 + f * 3.16, 1.15, 2.25, 0.08);
    }
    imperialRoof(T, kit, 0, 9.5, -4.4, 26.8, 10.6, 1.85, goldTile, gold, gold, 0.38);

    // Upper 2nd tier of central Lầu Ngũ Phụng (golden Hoàng Lưu Ly roof)
    box(crimson, 0, 11.95, -4.4, 15.2, 2.35, 5.4);
    for (let i = -3; i <= 3; i++) {
      for (const f of [-1, 1]) {
        box(0x3a1c17, i * 2.05, 12.0, -4.4 + f * 2.75, 1.15, 1.45, 0.08);
        box(gold, i * 2.05, 13.05, -4.4 + f * 2.75, 1.35, 0.22, 0.1);
      }
    }
    imperialRoof(T, kit, 0, 13.1, -4.4, 18.8, 8.2, 2.15, goldTile, gold, gold, 0.34);

    // Flanking Wing Pavilions (emerald-green Thanh Lưu Ly roofs extending forward along U-wings!)
    for (const s of [-1, 1]) {
      const wx = s * 21.6;
      // Rear corner pavilion
      box(crimson, wx, 7.45, -4.0, 7.6, 3.2, 8.8);
      for (const f of [-1, 1]) for (const z of [-7.2, -4.0, -0.8]) stamp(round, crimson, wx + f * 4.2, 7.55, z, 0.19, 3.7, 0.19);
      imperialRoof(T, kit, wx, 9.25, -4.0, 10.6, 11.2, 1.65, greenTile, trim, gold, 0.3);
      // Forward wing pavilion (2 tiers, iconic green Thanh Lưu Ly)
      box(crimson, wx, 7.45, 6.2, 7.2, 3.2, 8.6);
      for (const f of [-1, 1]) for (const z of [2.6, 6.2, 9.8]) stamp(round, crimson, wx + f * 4.0, 7.55, z, 0.19, 3.7, 0.19);
      imperialRoof(T, kit, wx, 9.25, 6.2, 10.4, 11.4, 1.6, greenTile, trim, gold, 0.28);
      box(crimson, wx, 11.35, 6.2, 5.2, 1.75, 5.8);
      imperialRoof(T, kit, wx, 12.2, 6.2, 7.8, 8.4, 1.55, greenTile, trim, gold, 0.26);
    }
  }

  // 2. Cầu Trường Tiền – Huế (6-span 402m Eiffel parabolic steel truss bridge across Sông Hương)
  function cauTruongTien(T, {palette, stamp, box, round}) {
    const steel = 0xc9cdd0, lightSteel = 0xdbe0e2, darkSteel = 0x868c91, stonePier = 0x8e8b81;
    palette({metal: [steel, darkSteel]});
    const spanLen = 67.0, numSpans = 6, total = spanLen * numSpans; // 402m total!
    const halfW = 6.25; // keeps full 10.4m secondary carriageway clear for driving!

    // Outer pedestrian walkways & low guardrails outside the asphalt
    for (const side of [-1, 1]) {
      box(darkSteel, 0, 0.18, side * (halfW + 0.55), total, 0.36, 1.45);
      box(steel, 0, 0.92, side * (halfW + 1.15), total, 0.14, 0.14);
    }

    // 7 heavy cut-stone river piers descending below water level
    for (let p = 0; p <= numSpans; p++) {
      const px = -total / 2 + p * spanLen;
      box(stonePier, px, -3.4, 0, 3.2, 6.2, halfW * 2 + 3.2);
      // Cutwater noses pointing upstream/downstream
      for (const s of [-1, 1]) {
        box(stonePier, px, -3.4, s * (halfW + 1.9), 2.2, 6.2, 2.2, Math.PI / 4);
      }
    }

    // 6 graceful parabolic Eiffel steel arch trusses ("6 vài 12 nhịp")
    for (let sp = 0; sp < numSpans; sp++) {
      const x0 = -total / 2 + sp * spanLen;
      const archH = (t) => 0.9 + Math.sin(t * Math.PI) * 9.8; // rises to ~10.7m at crown
      for (const side of [-1, 1]) {
        const z = side * halfW;
        // Parabolic upper chord via TubeGeometry
        const pts = [];
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          pts.push(new T.Vector3(x0 + t * spanLen, archH(t), z));
        }
        const chord = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.28, 6, false);
        stamp(chord, lightSteel, 0, 0, 0);
        chord.dispose();
        // Lower horizontal girder beam
        box(steel, x0 + spanLen / 2, 0.55, z, spanLen, 0.42, 0.42);
        // 10 vertical truss posts & X-bracing diagonals per span
        const bays = 10, bw = spanLen / bays;
        for (let b = 1; b < bays; b++) {
          const bx = x0 + b * bw, bh = archH(b / bays);
          box(steel, bx, bh / 2 + 0.25, z, 0.24, bh - 0.5, 0.28);
          // Diagonal web members
          const bxNext = x0 + (b + 1) * bw, bhNext = archH((b + 1) / bays);
          const dx = bw, dy1 = bhNext - 0.65, len1 = Math.hypot(dx, dy1);
          box(darkSteel, (bx + bxNext) / 2, (0.65 + bhNext) / 2, z, len1, 0.14, 0.16, 0, 0, Math.atan2(dy1, dx));
          const dy2 = 0.65 - bh, len2 = Math.hypot(dx, dy2);
          box(darkSteel, (bx + bxNext) / 2, (bh + 0.65) / 2, z, len2, 0.14, 0.16, 0, 0, Math.atan2(dy2, dx));
        }
      }
      // Overhead lateral wind-bracing portals high above the carriageway (y >= 6.8m -> totally clear for cars!)
      for (let b = 2; b <= 8; b++) {
        const bx = x0 + b * (spanLen / 10), bh = archH(b / 10);
        if (bh >= 6.8) {
          box(lightSteel, bx, bh - 0.2, 0, 0.26, 0.34, halfW * 2);
          if (b < 8) {
            const bNext = x0 + (b + 1) * (spanLen / 10);
            const midH = (bh + archH((b + 1) / 10)) / 2 - 0.2;
            const diagLen = Math.hypot(spanLen / 10, halfW * 2);
            const diagAng = Math.atan2(halfW * 2, spanLen / 10);
            box(darkSteel, (bx + bNext) / 2, midH, 0, diagLen, 0.12, 0.12, diagAng);
            box(darkSteel, (bx + bNext) / 2, midH, 0, diagLen, 0.12, 0.12, -diagAng);
          }
        }
      }
    }
  }

  // 3. Phu Văn Lâu – Huế (2-story Imperial Proclamation Pavilion beside Sông Hương)
  function phuVanLau(T, kit) {
    const {box, stamp, round, sign} = kit;
    const stone = 0xa8a397, rail = 0xc5bfb0, crimson = 0x86241d, goldTile = 0xd8a836, gold = 0xdfb84c;
    kit.palette({stone, glazedTile: goldTile});

    // Raised stone terrace & perimeter balustrade with front/rear ceremonial steps
    box(stone, 0, 0.48, 0, 16.5, 0.96, 13.8);
    for (const f of [-1, 1]) {
      for (let s = 0; s < 4; s++) box(rail, 0, 0.12 + s * 0.22, f * (7.85 - s * 0.35), 4.6, 0.22, 0.42);
      for (const s of [-1, 1]) box(rail, s * 5.2, 1.32, f * 6.65, 5.4, 0.72, 0.26);
    }
    for (const s of [-1, 1]) box(rail, s * 8.05, 1.32, 0, 0.26, 0.72, 13.4);

    // Ground floor — 16 vermilion lacquered wooden columns (open imperial pavilion)
    for (const x of [-5.2, -1.75, 1.75, 5.2]) {
      for (const z of [-4.2, -1.4, 1.4, 4.2]) {
        stamp(round, stone, x, 1.08, z, 0.28, 0.24, 0.28);
        stamp(round, crimson, x, 2.95, z, 0.18, 3.65, 0.18);
      }
    }
    // Ornate carved beams & gold fascia boards
    box(crimson, 0, 4.68, 0, 11.4, 0.42, 9.2);
    box(gold, 0, 4.45, 4.55, 10.6, 0.28, 0.12);
    imperialRoof(T, kit, 0, 4.88, 0, 15.6, 12.6, 1.65, goldTile, gold, gold, 0.34);

    // Second floor (tầng lầu) with red wooden railings & central golden plaque
    box(crimson, 0, 7.25, 0, 8.8, 2.45, 6.4);
    for (const x of [-4.2, -1.4, 1.4, 4.2]) for (const z of [-3.1, 3.1]) stamp(round, crimson, x, 7.3, z, 0.16, 2.65, 0.16);
    for (const f of [-1, 1]) {
      box(gold, 0, 6.55, f * 3.25, 8.6, 0.58, 0.14);
      for (const dx of [-2.4, 0, 2.4]) box(0x3c1a15, dx, 7.65, f * 3.24, 1.35, 1.45, 0.08);
    }
    box(crimson, 0, 8.45, 3.28, 3.2, 0.68, 0.14);
    sign('PHU VĂN LÂU', 0, 8.45, 3.37, 2.95, 0.48);
    imperialRoof(T, kit, 0, 8.68, 0, 12.4, 9.6, 1.85, goldTile, gold, gold, 0.32);

    // Twin stone stele pavilions ("Khuynh Cái – Hạ Mã") flanking the front plaza
    for (const s of [-1, 1]) {
      const sx = s * 10.6, sz = 3.2;
      box(stone, sx, 0.32, sz, 2.4, 0.64, 2.4);
      box(0x6d6a62, sx, 1.65, sz, 0.95, 2.1, 0.28);
      for (const dx of [-0.9, 0.9]) for (const dz of [-0.9, 0.9]) stamp(round, crimson, sx + dx, 1.85, sz + dz, 0.1, 2.5, 0.1);
      imperialRoof(T, kit, sx, 3.05, sz, 3.1, 3.1, 0.95, goldTile, gold, gold, 0.22);
    }
  }

  // 4. Cầu Ngói Thanh Toàn – Hương Thủy, Huế ("Thượng gia hạ kiều" 7-bay covered bridge)
  function cauNgoiThanhToan(T, {palette, box, stamp, outline, round}) {
    const wood = 0x5c3727, crimson = 0x8e2e24, jadeTile = 0x3b6c55, terraTile = 0x9b543a;
    const stone = 0x8d867a, cream = 0xd6cab0, gold = 0xd2a84b;
    const len = 18.2, halfD = 2.65;
    palette({timber: wood, glazedTile: jadeTile, tile: terraTile, stone, plaster: cream});

    // Stone bridge abutments & 6 rows of timber/masonry bridge piers
    box(stone, 0, 0.38, 0, len + 2.2, 0.76, 5.2);
    for (let i = -3; i <= 3; i++) {
      for (const s of [-1, 1]) box(stone, i * 2.55, -0.85, s * 1.95, 0.68, 2.2, 0.88);
    }
    // Approach steps at both ends
    for (const end of [-1, 1]) {
      for (let st = 0; st < 3; st++) box(stone, end * (len / 2 + 1.35 + st * 0.42), 0.56 - st * 0.22, 0, 0.48, 0.24, 4.4);
    }

    // 7 timber bays with round ironwood pillars & carved wooden benches along both sides
    for (let i = -3; i <= 3; i++) {
      const px = i * 2.55;
      for (const s of [-1, 1]) {
        stamp(round, wood, px, 2.25, s * 2.25, 0.14, 3.0, 0.14);
        stamp(round, wood, px, 2.55, s * 1.35, 0.15, 3.6, 0.15);
      }
      box(wood, px, 3.85, 0, 0.18, 0.22, 4.8);
    }
    // Side wooden benches (bục gỗ ngồi nghỉ) & ornate balustrades
    for (const s of [-1, 1]) {
      box(wood, 0, 1.15, s * 1.95, len - 0.8, 0.14, 0.78);
      box(crimson, 0, 1.65, s * 2.34, len - 0.6, 0.55, 0.12);
      for (let k = -16; k <= 16; k++) box(wood, k * 0.52, 1.65, s * 2.36, 0.08, 0.56, 0.1);
    }
    // Central raised altar bay (gian thờ bà Trần Thị Đạo)
    box(crimson, 0, 2.2, -1.65, 2.6, 2.9, 1.45);
    box(gold, 0, 3.35, -0.88, 1.85, 0.52, 0.1);

    // Iconic glazed yin-yang tiled pitched roof with elevated central altar crown
    const pitch = [[-halfD - 0.55, 0], [-halfD * 0.5, 0.82], [0, 1.85], [halfD * 0.5, 0.82], [halfD + 0.55, 0],
      [halfD + 0.55, -0.2], [0, 1.58], [-halfD - 0.55, -0.2]];
    outline(pitch, jadeTile, -len / 2 - 0.4, 3.65, 0, len + 0.8, Math.PI / 2);
    // Decorative terracotta ribs across the glazed roof
    for (let i = 0; i <= 26; i++) {
      outline(pitch, i % 4 === 0 ? terraTile : 0x4b7e65, -len / 2 - 0.35 + i * (len + 0.7) / 26, 3.69, 0, 0.06, Math.PI / 2);
    }
    // Elevated center ridge & ceramic phoenix/dragon finial
    box(cream, 0, 5.56, 0, len + 1.0, 0.24, 0.34);
    box(jadeTile, 0, 5.88, 0, 4.2, 0.65, 3.4);
    box(gold, 0, 6.28, 0, 4.5, 0.24, 0.36);
    for (const end of [-1, 1]) {
      outline([[-0.5, 0], [0.5, 0], [0.35, 0.35], [0, 0.72], [-0.35, 0.35]], cream, end * (len / 2 + 0.45), 5.6, -0.14, 0.28);
    }
  }

  // 5. Lăng Khải Định – Ứng Lăng (Huế) — Dramatic stepped stone/concrete hill mausoleum
  function langKhaiDinh(T, kit) {
    const {box, stamp, outline, tapered, round} = kit;
    const darkStone = 0x5c5c59, greyStone = 0x7b7a75, lightStone = 0x9e9c94, moss = 0x5c644e, gold = 0xbfa055;
    kit.palette({stone: [darkStone, greyStone, lightStone]});

    // Deep hillside foundation & 3 monumental stepped terraces ascending toward -Z
    box(darkStone, 0, -2.5, 0, 27, 5.2, 42);
    // Lower terrace (Tam Quan + approach stairs)
    box(greyStone, 0, 0.45, 13.5, 24.5, 0.9, 13.5);
    // Middle terrace (Sân Bái Đính + Bi Đình octagonal stele pavilion)
    box(greyStone, 0, 1.95, 1.5, 23.5, 3.9, 12.5);
    // Upper terrace (Cung Thiên Định — main tomb palace)
    box(darkStone, 0, 3.85, -11.5, 22.5, 7.7, 14.5);

    // Sweeping triple dragon staircases (bậc tam cấp rồng chầu)
    function stairs(y0, y1, z0, z1, w) {
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        box(lightStone, 0, y0 + (y1 - y0) * (t + 0.05), z0 + (z1 - z0) * t, w, (y1 - y0) / steps + 0.08, Math.abs(z1 - z0) / steps + 0.14);
      }
      // 4 sculpted dragon-wave balustrades framing the 3 stair lanes
      for (const sx of [-w * 0.5, -w * 0.17, w * 0.17, w * 0.5]) {
        const dz = Math.abs(z1 - z0), dy = y1 - y0;
        const len = Math.hypot(dz, dy), ang = Math.atan2(dy, dz);
        box(darkStone, sx, (y0 + y1) / 2 + 0.55, (z0 + z1) / 2, 0.38, 0.72, len, 0, ang);
        box(lightStone, sx, (y0 + y1) / 2 + 0.98, (z0 + z1) / 2, 0.44, 0.24, len, 0, ang);
      }
    }
    stairs(0.85, 3.9, 11.2, 7.4, 9.6);
    stairs(3.9, 7.65, -2.8, -6.4, 9.6);

    // Grand Front Indo-Gothic Tam Quan Pillars (Trụ Biểu)
    for (const [px, h, w] of [[-7.8, 6.2, 0.95], [-3.2, 8.2, 1.25], [3.2, 8.2, 1.25], [7.8, 6.2, 0.95]]) {
      box(darkStone, px, 1.0 + h / 2, 17.5, w, h, w);
      for (const y of [1.5, 1.0 + h * 0.5, 1.0 + h]) box(lightStone, px, y, 17.5, w * 1.22, 0.26, w * 1.22);
      tapered(lightStone, px, 1.0 + h + 0.95, 17.5, w * 0.65, 0.12, 1.65, 1, 4);
    }

    // Middle Terrace: Rows of Stone Mandarins/Guardians + Octagonal Bi Đình Stele Pavilion
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const gx = s * 6.8, gz = -1.2 + i * 2.1;
        box(lightStone, gx, 4.35, gz, 0.78, 0.9, 0.78);
        tapered(greyStone, gx, 5.45, gz, 0.34, 0.26, 1.35, 1, 8);
      }
    }
    // Octagonal Bi Đình pavilion at center of middle terrace
    tapered(darkStone, 0, 4.35, 2.2, 3.3, 3.1, 0.75, 1, 8);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      box(darkStone, Math.sin(a) * 2.4, 6.25, 2.2 + Math.cos(a) * 2.4, 0.42, 3.2, 0.42, a);
    }
    box(lightStone, 0, 6.0, 2.2, 1.15, 2.45, 0.34); // Imperial stele inside
    tapered(darkStone, 0, 8.45, 2.2, 3.6, 1.65, 1.35, 1, 8);
    tapered(greyStone, 0, 9.85, 2.2, 2.25, 0.25, 1.55, 1, 8);

    // Upper Terrace: Imposing Cung Thiên Định Palace (Indo-Gothic concrete + curved tiers)
    const py = 7.7, pz = -12.2;
    box(darkStone, 0, py + 2.8, pz, 16.8, 5.6, 9.8);
    // Gothic-Romanesque pointed arched façade colonnade
    for (let i = -3; i <= 3; i++) {
      const cx = i * 2.35;
      box(lightStone, cx, py + 2.9, pz + 4.98, 0.55, 5.5, 0.48);
      if (i < 3) {
        const ax = cx + 1.175;
        outline([[-0.82, 0], [0.82, 0], [0.82, 2.45], [0.45, 3.2], [0, 3.75], [-0.45, 3.2], [-0.82, 2.45]],
          0x2d2b29, ax, py + 0.35, pz + 4.95, 0.14);
      }
    }
    // Ornate weathered cornice, Gothic-Vietnamese parapet & stepped upper pavilion roof
    box(lightStone, 0, py + 5.72, pz, 17.6, 0.36, 10.6);
    for (let i = -6; i <= 6; i++) {
      tapered(i % 2 ? lightStone : moss, i * 1.32, py + 6.42, pz + 5.1, 0.26, 0.06, 1.05, 1, 4);
    }
    // Upper central sanctuary tier with curved imperial pagoda crown
    box(greyStone, 0, py + 7.2, pz, 9.8, 2.6, 6.2);
    for (const dx of [-2.8, 0, 2.8]) box(0x2d2b29, dx, py + 7.25, pz + 3.15, 1.35, 1.65, 0.1);
    imperialRoof(T, kit, 0, py + 8.5, pz, 12.2, 8.2, 1.95, darkStone, lightStone, gold, 0.3);
    // Flanking Gothic-Vietnamese pinnacle towers
    for (const s of [-1, 1]) {
      box(greyStone, s * 7.2, py + 6.8, pz + 3.8, 2.2, 2.2, 2.2);
      tapered(darkStone, s * 7.2, py + 8.85, pz + 3.8, 1.45, 0.2, 2.1, 1, 4);
    }
  }

  (window.VietnamSights ??= []).push({
    id: 'ngo-mon', catalogId: 'osm-way-172657562', name: 'Ngọ Môn', city: 'Huế', province: 'Huế', region: 'Trung Bộ',
    lon: 107.57895, lat: 16.46735, start: [107.578560, 16.465820], yaw: 0.623, viewAngle: 0.85, viewElevation: 0.24,
    width: 60, depth: 36,
    solids: [[-21.6, 1.6, 6.2, 11.4], [21.6, 1.6, 6.2, 11.4], [-14.2, -4.4, 3.3, 5.4], [-4.8, -4.4, 2.3, 5.4], [4.8, -4.4, 2.3, 5.4], [14.2, -4.4, 3.3, 5.4]],
    description: 'Cổng chính phía Nam của Hoàng thành Huế với nền đài chữ U năm lối cửa, cầu Kim Thủy và Lầu Ngũ Phụng hai tầng mái ngói hoàng lưu ly và thanh lưu ly.',
    photo: 'https://whc.unesco.org/en/list/678/',
    source: 'https://vi.wikipedia.org/wiki/Ng%E1%BB%8D_M%C3%B4n_(Hu%E1%BA%BF)',
    map: 'https://www.openstreetmap.org/way/172657562',
    build: ngoMonHue
  }, {
    id: 'cau-truong-tien', name: 'Cầu Trường Tiền', city: 'Huế', province: 'Huế', region: 'Trung Bộ',
    lon: 107.588855, lat: 16.468895, start: [107.588866, 16.468886], yaw: -0.7516, viewAngle: -0.22, viewElevation: 0.19,
    width: 185, depth: 20, viewDistance: 1400,
    solids: [[0, -6.6, 201, 0.7], [0, 6.6, 201, 0.7]],
    description: 'Cây cầu lịch sử bắc qua sông Hương với sáu vài mười hai nhịp vòm giàn thép hình vành lược đặc trưng của cố đô Huế.',
    photo: 'https://vinwonders.com/vi/wonderpedia/news/cau-truong-tien-hue/',
    source: 'https://vi.wikipedia.org/wiki/C%E1%BA%A7u_Tr%C6%B0%E1%BB%9Dng_Ti%E1%BB%81n',
    map: 'https://www.openstreetmap.org/node/14379527273',
    build: cauTruongTien
  }, {
    id: 'phu-van-lau', name: 'Phu Văn Lâu', city: 'Huế', province: 'Huế', region: 'Trung Bộ',
    lon: 107.580893, lat: 16.465503, start: [107.581000, 16.465364], yaw: 0.623, width: 24, depth: 15,
    solids: [[0, 0, 7.6, 6.4], [-10.6, 3.2, 1.2, 1.2], [10.6, 3.2, 1.2, 1.2]],
    description: 'Tòa lầu hai tầng mái ngói hoàng lưu ly, mười sáu cột sơn son hướng ra sông Hương trước Kỳ Đài – nơi niêm yết chiếu chỉ triều Nguyễn xưa.',
    photo: 'https://visithue.vn/diem-den/phu-van-lau',
    source: 'https://vi.wikipedia.org/wiki/Phu_V%C4%83n_L%C3%A2u',
    map: 'https://www.openstreetmap.org/way/531031520',
    build: phuVanLau
  }, {
    id: 'cau-ngoi-thanh-toan', name: 'Cầu Ngói Thanh Toàn', city: 'Hương Thủy', province: 'Huế', region: 'Trung Bộ',
    lon: 107.64232, lat: 16.46732, start: [107.642107, 16.467681], yaw: -2.625, width: 22, depth: 7.5,
    solids: [[0, 0, 9.6, 2.8]],
    description: 'Cây cầu gỗ cổ kiểu thượng gia hạ kiều gồm bảy gian mái ngói ống tráng men, bục ngồi hai bên và gian thờ giữa cầu tại làng Thanh Thủy Chánh.',
    photo: 'https://visithue.vn/diem-den/cau-ngoi-thanh-toan',
    source: 'https://vi.wikipedia.org/wiki/C%E1%BA%A7u_ng%C3%B3i_Thanh_To%C3%A0n',
    map: 'https://www.openstreetmap.org/?mlat=16.46732&mlon=107.64232#map=18/16.46732/107.64232',
    build: cauNgoiThanhToan
  }, {
    id: 'lang-khai-dinh', name: 'Lăng Khải Định', city: 'Huế', province: 'Huế', region: 'Trung Bộ',
    lon: 107.590339, lat: 16.399017, start: [107.589673, 16.398995], yaw: -1.536, viewElevation: 0.25, width: 28, depth: 42,
    solids: [[0, -12.2, 8.6, 5.2], [0, 2.2, 3.2, 3.2], [-7.8, 17.5, 0.7, 0.7], [-3.2, 17.5, 0.8, 0.8], [3.2, 17.5, 0.8, 0.8], [7.8, 17.5, 0.7, 0.7]],
    description: 'Ứng Lăng trên triền núi Châu Chữ với các bậc tam cấp rồng chầu, trụ biểu, sân Bái Đính, nhà bia Bi Đình bát giác và cung Thiên Định giao thoa kiến trúc Đông – Tây.',
    photo: 'https://visithue.vn/diem-den/lang-khai-dinh',
    source: 'https://vi.wikipedia.org/wiki/L%C4%83ng_Kh%E1%BA%A3i_%C4%90%E1%BB%8Bnh',
    map: 'https://www.openstreetmap.org/way/175035807',
    build: langKhaiDinh
  });
})();
