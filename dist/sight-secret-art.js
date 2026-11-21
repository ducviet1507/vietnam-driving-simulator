'use strict';

// The three plates of each small print use the paper itself for the carved highlights.
(() => {
  const paper = 'var(--stamp-paper)', ink = 'currentColor', accent = 'var(--stamp-accent)';
  const shape = (d, fill = ink) => '<path d="' + d + '" fill="' + fill + '"/>';
  const line = (d, stroke = ink, width = 2) =>
    '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + width + '"/>';
  const dot = (cx, cy, r, fill = ink) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"/>';
  const cut = (d, width = 1.8) => line(d, paper, width);
  const water = line('M8 76q9 4 20 0m5 4q11 3 22-1m8-5q10 3 21-1m-66 11q9 2 17 0m21 3q9 1 15-2', ink, 1.4);

  function cog() {
    const points = [];
    for (let tooth = 0; tooth < 10; tooth++) {
      for (const [fraction, radius] of [[-.50,24],[-.30,24],[-.24,30],[.24,30],[.30,24]]) {
        const a = (tooth + fraction) * Math.PI / 5;
        points.push([(48 + radius * Math.sin(a)).toFixed(1), (48 - radius * Math.cos(a)).toFixed(1)].join(' '));
      }
    }
    return shape('M' + points.join('L') + 'Z');
  }

  const prints = {
    turtle:
      shape('M6 59q9-3 14-2c3-14 14-22 29-24 16-2 28 6 33 16 3 0 5-3 7-8 2-4 8-4 9 0 2 6-4 17-12 20l-13 2 4 6-3 3-10-7-19 1-10 7-5-1 6-8-14-2-9 1z') +
      shape('M22 55c5-12 15-18 28-19 13-1 22 4 29 14-16 8-40 10-57 5z', accent) +
      line('M24 53q23-13 51-5m-41-7 6 5 8-3 2-6m-9 10-2 7m23-15-4 5 6 7', ink, 1.6) +
      cut('M24 59q24 7 54-4m10 1 5-6') + dot(93,42,1.5,paper) + water,

    lantern:
      line('M11 12q32 11 74-5M49 18v9', ink, 2.5) +
      shape('M32 29q17-5 34-1l-1 5c16 9 17 25 3 37l-6 4-2 4-21 1-3-4c-20-9-22-29-6-40z') +
      shape('M34 35q14-4 28-2 19 15 2 35-13 5-26 4-19-15-4-37z', accent) +
      line('M39 34q-17 20 2 38m5-39q-9 22-1 39m8-39q6 18-1 38m8-39q15 17 0 37', ink, 1.55) +
      cut('M34 31q14-3 28-2m-22 46 20-2', 1.2) +
      line('M50 79v5m0 0-3 6m3-6 1 7m0-7 3 5', accent, 2.2),

    lotus:
      line('M49 69q-3 11-3 17m4-16q11 6 26 3', ink, 2) +
      shape('M49 69C32 66 19 55 18 36c13 4 22 9 31 21 7-12 18-21 32-25 0 18-10 31-27 36z') +
      shape('M49 64C35 52 37 35 50 15c14 17 17 33-1 49z', accent) +
      shape('M48 67q-1-23-23-37 0 25 23 37zm4 0q1-23 24-38-1 26-24 38z', accent) +
      line('M48 65q-2-14 2-34m1 34q9-11 15-23m-20 23q-8-9-13-19', ink, 1.55) +
      shape('M49 70Q20 73 7 49q17-2 40 13 24-17 44-17-10 23-42 25z') +
      cut('M14 53q15 11 29 13m12-1q18-5 28-14') + water,

    sail:
      dot(24,26,8,accent) +
      line('M53 15 50 68m-1-46L19 63m37-43 24 38', ink, 1.65) +
      shape('M49 22q-16 13-27 38 13-4 27-2z') +
      shape('M55 22q17 14 23 35-12-2-25 3z', accent) +
      cut('M45 31q-9 9-14 19m15-12-6 10m14 5q8-2 15-1', 1.4) +
      shape('M9 61q18 7 38 5 24-1 44-11-6 14-20 18l-38 2Q18 72 9 61z') +
      cut('M21 67q27 7 56-2', 1.5) + water,

    wing:
      shape('M7 25c17 2 29 8 40 21l8 1C62 32 74 22 91 14l-9 13 8-4-11 12 9-4-14 12 5-1-15 12-6 10-8 6 2-9-9 4-12 13 4-12-17 9 16-16-4-5C20 54 12 45 6 38l12 5L6 31l12 5z') +
      shape('M47 51q-12-14-32-20 20 9 30 24zm10-1q11-15 25-24-9 11-21 25z', accent) +
      cut('M17 41q11 8 23 11m-21-4q8 5 15 7m31-14 11-9m-11 16 12-10', 1.6) +
      shape('M51 57q3-4 8-7l9 1-8 4-4 5z') + dot(58,52,1,paper) +
      line('M10 79q9-6 21-7m32-7q13-5 25-16m-16 15q8-3 13-7', accent, 1.8),

    echo:
      shape('M5 28q16-8 31-12 16-3 29 2 14 4 29 0v46l-6 8-3-30-5 10-6-23-3 10-3-12-8 24-3 14-6-24-4 7-3-17-7 14-4-17-4 9-2-14-5 10-5-4-6 28-5 6z') +
      shape('M8 70q9-9 20-9l3-14 6 14 5-4 4 9-8 5-21 7z', accent) +
      cut('M12 33q9-8 19-9m15-2q14-1 20 4m-7 5-1 12m-3-8 1 12m21-20 2 8', 1.45) +
      line('M47 76q8-5 15 0m-20 4q14-9 27-1m-31 6q19-11 37-1', ink, 1.7) +
      dot(56,68,2.2,accent),

    beacon:
      shape('M13 53 40 30l-3 11z', accent) +
      shape('M56 29 87 9 68 30z', accent) +
      shape('M30 74q7-12 11-35l14-1q3 18 11 35zm7-38v-7h2v-8l8-7 9 7v8h3v7zm7-22 3-6 3 6z') +
      shape('M39 31h17v3H39zm4-8h9v6h-9z', paper) + line('M47 22v8', ink, 1.6) +
      shape('M39 50q9 2 19-1l3 9q-12 2-24 0z', accent) +
      cut('M43 41 41 47m-6 20 2-5m16-1 2 7', 1.5) +
      shape('M8 76 24 68l7 3 13-6 5 4 13-2 8 5 9-1 10 6-50 2z') + water,

    leaf:
      shape('M21 72C12 42 40 22 84 14c-8 10-7 22-12 33-8 20-29 28-51 25z') +
      shape('M25 65q10-32 50-45-9 12-12 23-13 18-38 22z', accent) +
      line('M14 85q14-31 54-59', ink, 3.3) +
      cut('M26 66q10-17 37-35m-29 25 1-14m8 5 2-13m7 6 1-9m-17 26 19-4m-12-4 17-6m-7-3 12-5', 1.5) +
      line('M12 72q-6-12-2-24m65 9q7-9 11-23', accent, 1.6),

    ink:
      shape('M26 67c3-6 5-10 6-17l13-12 11 9-12 14q-10 1-18 6z') +
      shape('M39 40 69 11q5-5 9 0t-1 9L52 50z', accent) +
      line('M42 38 69 12q6-5 9 0t-1 8L53 49m-16-5 11 9', ink, 2) +
      cut('M30 63q6-8 12-14m-5 11 8-8', 1.4) +
      shape('M27 66c-8 2-16 8-14 14 3 7 20 8 41 3 13-3 25-9 32-16-16 8-31 11-48 12 12-3 21-6 25-10-14 5-27 8-35 7-6 0-7-3-1-10z') +
      dot(77,78,2.4,accent) + dot(82,74,1.2,accent),

    star:
      dot(50,47,29,ink) + dot(50,47,25,paper) +
      shape('M50 17 57 38 79 38 61 52 68 74 50 61 31 74 38 52 20 38 43 38z',accent) +
      shape('M50 17v30l-7-9zm29 21L50 47l11 5zM68 74 50 47v14zM31 74l19-27-12 5zM20 38l30 9-7-9z') +
      line('M50 7v4m28 3-4 5m14 30h5m-9 23-5-4M50 83v5m-23-12-4 5M9 48h5m4-31 6 5', ink, 1.7),

    shell:
      shape('M44 76q-4-5-15-10C12 57 6 46 10 39q1-4 8-5-1-10 7-12 3-1 6 0 3-10 12-9 4 0 7 4 5-8 12-4 4 2 5 8 10-3 15 4 2 3 1 8 8 1 9 9 1 13-20 27l-11 7 4 6q-12 5-26 0z') +
      shape('M47 71q-14-16-21-39 12 15 23 39h3q0-25 7-49-1 26-4 48l3-1q11-21 23-31-9 18-21 32l-5 6z', accent) +
      cut('M46 71Q23 55 16 42m33 28Q38 49 33 29m18 40q-2-23-7-47m11 45q5-25 15-40m-9 42q14-11 23-23m-41 33 16 1', 1.8),

    arch:
      shape('M7 42q15-3 21-10l12-1 9-8 10 8h12q8 7 20 9-9 6-21 5l-2 3H31l-3-3q-11 1-21-3z') +
      shape('M16 40q14-3 17-6h10l6-6 8 6h10q4 4 14 6-14-1-23 0H40z', accent) +
      shape('M22 47h9v27l6 2v4H16v-4l6-2zm44 0h10v27l7 2v4H60v-4l6-2zM31 48h36v15h-7q-2-12-10-12t-12 12h-7z') +
      cut('M26 50v19m44-19v19m-35-24h29', 1.5) +
      line('M33 77h24m-23 4h24M10 85h77', ink, 1.75) + dot(49,19,2.5,accent),

    gear:
      cog() + dot(48,48,19,paper) + dot(48,48,15,accent) +
      line('M34 54 62 42m-21-7 14 26m-8-28 2 30', ink, 3) +
      dot(48,48,6,ink) + dot(48,48,2.7,paper) +
      cut('M31 36q6-10 17-10m9 42q9-4 12-12', 1.6) +
      line('M8 57q-1 10 8 20m-2-19q1 9 8 14m49-53q9 6 13 16m-10-21q10 7 15 19', accent, 2),

    drop:
      shape('M6 27q14-8 30-5l13 1 10-7 12 2 13-5 10 2v48l-12-3-5-13-5 6-5-14-6-3q-5 16-5 30l-9 5-15-6 1-11-11 7-5-6-12 5z') +
      shape('M22 27q15-4 39 0-9 15-9 31l-1 10-15 4 3-18-7 9q7-23 6-31-7-4-16-5z', paper) +
      shape('M40 28q7 0 13 1-8 18-8 33l-5 6q4-24 5-35z', accent) +
      cut('M9 35q11-6 19-4M68 25l12-4m-6 7 13-3m-8 7 10-3', 1.6) +
      line('M26 73q3-7 8-5 2-7 8-5 6-7 12-2 5-2 8 3 9-1 10 5M18 79q10-5 21-3m6-2q12-4 23 0m-36 8q12-1 30-1', ink, 1.8),

    dragon:
      shape('M8 76q8 3 13-3-8-1-12-9 10 4 16-2-6 0-11-8 9 5 19 0l7 1q9-8 19-5-5-5-6-11l-7-2 4-4-8-9 13 4-7-15 13 11 1-18 6 17 8-10-3 14 8 2 4 5 8-1-1 8-8 5-12-1c1 9 7 14 3 24-4 12-17 19-31 13 12 1 17-7 15-13-3-9-12-9-20-2-8 8-18 14-31 9z') +
      shape('M57 33q8-6 16-3l5 6 12 1-7 5-9-2-5-6-11 4z', accent) +
      cut('M17 71q10 2 20-7t20-6m8-13q2 7 5 12m-7 9q4 6-1 13m-34-16 4-3m5-1 4-3',1.7) +
      dot(72,32,1.5,ink) +
      line('M79 39q5 4 13 0m-10 4q7 7 13 1m-34-9q-6-4-11-2', ink,1.4),

    ridge:
      dot(74,24,9,accent) +
      shape('M4 64 25 37l6 7 19-29 19 32 6-8 20 29q-18-5-32-3-32 8-59-1z') +
      shape('M23 48 50 20 41 44l8-5-12 15 8-4-13 14-18 1z',accent) +
      cut('m22 48 4-6 5 6m17-20 3-5 8 14m13 12 3-5 9 13',1.8) +
      shape('M5 73q17-5 28-4 17 1 35-4 13-4 27 0-18-1-32 5-20 8-37 4-12-2-21-1z',accent) +
      line('M9 81q14-4 28-1t33-5m-43 11q11-1 18 0m31-13 11-2',ink,1.6)
  };

  // Dark ink, second ink, and unprinted paper. Each subject keeps its own colour family.
  const palettes = [
    ['#163f47','#d1803d','#f6e8c8'], ['#15394c','#d4964f','#f8edce'],
    ['#224a41','#9aab65','#f3eacc'], ['#24463c','#ca8751','#f6eaca'],
    ['#552e33','#d56946','#faebcc'], ['#58384b','#cf8663','#f7e8d2'],
    ['#293950','#779b93','#f3eacf'], ['#303b50','#b76a4d','#f6e6c6']
  ];
  const paletteFamilies = {
    turtle:2, lantern:4, lotus:4, sail:0, wing:6, echo:6, beacon:0, leaf:2,
    ink:6, star:4, shell:4, arch:4, gear:0, drop:0, dragon:2, ridge:2
  };
  const edge = 'M4 4' + 'h2a2 2 0 0 0 4 0h2'.repeat(14) +
    'v2a2 2 0 0 0 0 4v2'.repeat(14) + 'h-2a2 2 0 0 0-4 0h-2'.repeat(14) +
    'v-2a2 2 0 0 0 0-4v-2'.repeat(14) + 'z';

  function hashSeed(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
    let hash = 2166136261;
    for (const ch of String(seed)) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
    return hash >>> 0;
  }

  function postmark(seed) {
    const points = Array.from({length:4}, (_, i) => [85 + i * 3, 97 + ((seed >>> (4+i*3)) & 7)-3]);
    const route = line('M' + points.map(([x,y]) => x+' '+y).join('L'), ink, 1.2) +
      points.map(([x,y]) => dot(x,y,.95)).join('');
    const angle = (seed >>> 18) % 21 - 10;
    return '<g transform="rotate(' + angle + ' 90 97)"><g class="sight-stamp-postmark">' +
      '<circle cx="90" cy="97" r="10.3" fill="' + paper + '" stroke="currentColor" stroke-width="1.4"/>' +
      line('M83 93q6-6 13 0m-12 9q6 5 12-1m4-7q4-2 9-1m-8 4q4-2 8-1m-9 5q4-2 9-2', ink, 1) +
      route + '</g></g>';
  }

  function plate(key, code, size, className) {
    const [dark, second, stock] = palettes[paletteFamilies[key] + (code >>> 11 & 1)];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 '+size+' '+size);
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', className);
    svg.style.color = dark;
    svg.style.setProperty('--stamp-accent',second);
    svg.style.setProperty('--stamp-paper',stock);
    return svg;
  }

  window.createSightSecretGlyph = (motif, seed) => {
    const key = Object.hasOwn(prints, motif) ? motif : 'ridge';
    const svg = plate(key, hashSeed(seed), 100, 'sight-secret-glyph');
    svg.innerHTML = '<g stroke-linejoin="round" stroke-linecap="round">' + prints[key] + '</g>';
    return svg;
  };

  window.createSightSecretArt = (motif, seed) => {
    const key = Object.hasOwn(prints, motif) ? motif : 'ridge';
    const code = hashSeed(seed), svg = plate(key, code, 120, 'sight-secret-art');
    svg.innerHTML = shape(edge,paper) +
      '<g stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M12 12h96v96H12z" fill="none" stroke="currentColor" stroke-width=".95"/>' +
      line('M15 17v-2h6m78 0h6v5m-90 65v4h6m76 0h8v-5', ink, 1.4) +
      '<g transform="translate(15 8) scale(.91)"><g class="sight-stamp-print">' + prints[key] + '</g></g>' +
      line('M18 92h58m-58 2h23', ink, .8) +
      '<text x="18" y="103" fill="currentColor" font-family="Georgia,serif" font-size="7.4" font-weight="bold" letter-spacing="1.4">VIỆT NAM</text>' +
      postmark(code) + '</g>';
    return svg;
  };
})();
