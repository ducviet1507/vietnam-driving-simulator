import path from 'node:path';
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createContext, runInContext} from 'node:vm';

const directory = fileURLToPath(new URL('../dist/', import.meta.url));
const origin = 'https://vivu3d.com';
const context = createContext({window: {}});
for (const name of ['bank', 'mountain-stages', 'scenic-passes']) {
  const code = await readFile(path.join(directory, name + '.js'), 'utf8');
  runInContext(code, context, {filename: name + '.js'});
}
const {driveBank, driveBankSource, driveChapters, mountainStages} = context.window;
const passes = runInContext('scenicPasses', context);
const profile = runInContext('smoothRoadProfile', context);
const pages = new Map();

function escape(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
}

const library = {slug:'library', name:'Ngân hàng 600 câu hỏi'};
const atlas = {slug:'cung-duong', name:'Cung đường nổi tiếng'};
const bankCredit = `<a href="${driveBankSource}">Bộ 600 câu hỏi dùng cho sát hạch lái xe cơ giới đường bộ · Cục CSGT, 2025</a>`;
function page({slug, name, title, description, parent, body, image = 'social-preview.jpg', imageAlt = 'ViVu3D mô phỏng lái xe trên đường đèo', extraHead = '', scripts = ''}) {
  const url = origin + '/' + slug;
  const crumbs = [{name:'ViVu3D', slug:''}, ...(parent ? [parent] : []), {name, slug}];
  const breadcrumb = {
    '@context':'https://schema.org', '@type':'BreadcrumbList',
    itemListElement:crumbs.map((item, i) => ({'@type':'ListItem', position:i + 1, name:item.name, item:origin + '/' + item.slug}))
  };
  const trail = crumbs.map((item, i) => i === crumbs.length - 1 ? `<span aria-current="page">${escape(item.name)}</span>` :
    `<a href="${item.slug ? item.slug + '.html' : './'}">${escape(item.name)}</a>`).join(' <span aria-hidden="true">/</span> ');
  pages.set(slug, `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#142720">
  <title>${escape(title)} · ViVu3D</title>
  <meta name="description" content="${escape(description)}">
  <link rel="canonical" href="${url}">
  <link rel="icon" type="image/png" sizes="96x96" href="favicon.png">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="vi_VN">
  <meta property="og:site_name" content="ViVu3D">
  <meta property="og:title" content="${escape(title)} · ViVu3D">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${origin}/${image}">
  <meta property="og:image:alt" content="${escape(imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${JSON.stringify(breadcrumb).replace(/</g, '\\u003c')}</script>
  <link rel="stylesheet" href="guides.css">
${extraHead}
</head>
<body>
<header class="mast"><a class="brand" href="./">ViVu<b>3D</b></a><nav aria-label="Chế độ chơi"><a href="cung-duong.html">Cung đường</a><a href="hall.html">Sân tập</a></nav></header>
<main>
  <nav class="crumbs" aria-label="Đường dẫn">${trail}</nav>
  ${body}
</main>
${scripts}
</body>
</html>
`);
}

function chapterSlug(slug) {
  return 'ly-thuyet-' + slug;
}

const chapterLinks = driveChapters.map(([first, last, title, slug]) =>
  `<li><a href="${chapterSlug(slug)}.html"><strong>${escape(title)}</strong><span>Câu ${first}–${last}</span></a></li>`).join('\n');
page({...library, title:'Ngân hàng 600 câu hỏi lý thuyết lái xe', description:'Tra cứu 600 câu hỏi lý thuyết lái xe của Cục CSGT theo sáu chương, xem hình và đáp án từng câu hoặc tự làm bài trên ViVu3D.',
  extraHead:'<link rel="stylesheet" href="quiz.css"><link rel="stylesheet" href="answer-feedback.css">',
  body:`<h1>Ngân hàng 600 câu hỏi lý thuyết lái xe</h1>
  <p class="intro">Chọn một chương để đọc câu hỏi, xem hình minh họa và đối chiếu đáp án. Khi tự luyện, bạn có thể làm lại các câu đã trả lời sai.</p>
  <div class="actions"><button id="practice" class="primary" hidden>Luyện câu hỏi</button><a href="theory-exam.html">Thi thử lý thuyết hạng B</a></div>
  <h2>Tra cứu theo chương</h2><ol class="chapters">${chapterLinks}</ol>
  <footer>Nguồn câu hỏi và đáp án · ${bankCredit}</footer>`,
  scripts:`<dialog id="quiz" aria-labelledby="quiz-title"></dialog>
<script src="bank.js" defer></script><script src="answer-feedback.js" defer></script><script src="quiz.js" defer></script><script src="library.js" defer></script>`
});

function questionMarkup(q) {
  if (!Number.isInteger(q.correct) || !q.choices[q.correct]) throw new Error('Missing answer for ' + q.id);
  const options = q.choices.map(choice => `<li>${escape(choice)}</li>`).join('');
  const figure = q.image ? `<img loading="lazy" decoding="async" class="diagram" src="${escape(q.image)}" alt="${escape(q.imageAlt)}">` : '';
  return `<section id="cau-${q.id}" class="question">
  <h3><a href="#cau-${q.id}">Câu ${q.id}</a> ${escape(q.prompt)}</h3>
  ${figure}<ol type="A">${options}</ol>
  <details><summary>Xem đáp án</summary><p><b>${String.fromCharCode(65 + q.correct)}.</b> ${escape(q.choices[q.correct])}</p></details>
</section>`;
}

for (const [i, [first, last, title, slug, intro]] of driveChapters.entries()) {
  const questions = driveBank.filter(q => q.id >= first && q.id <= last);
  if (questions.length !== last - first + 1 || questions.some((q, n) => q.id !== first + n)) throw new Error('Incomplete chapter ' + title);
  const jumps = questions.filter((q, n) => n % 10 === 0).map(q =>
    `<a href="#cau-${q.id}">${q.id}–${Math.min(q.id + 9, last)}</a>`).join(' ');
  page({slug:chapterSlug(slug), name:title, title:`${title} · Câu ${first}–${last} lý thuyết lái xe`, parent:library,
    description:`${intro} Xem ${questions.length} câu hỏi và đáp án trong bộ 600 câu của Cục CSGT.`,
    body:`<p class="kicker">Lý thuyết lái xe · Chương ${i + 1}</p>
    <h1>${escape(title)}</h1><p class="intro">${escape(intro)}</p>
    <p>${questions.length} câu hỏi, từ câu ${first} đến câu ${last}. Nguồn nội dung · ${bankCredit}.</p>
    <div class="actions"><a class="primary" href="library.html?chuong=${i + 1}">Luyện chương này</a><a href="library.html">Xem sáu chương</a></div>
    <h2>Đi đến nhóm câu hỏi</h2><nav class="jumps" aria-label="Nhóm câu hỏi">${jumps}</nav>
    <h2>Câu hỏi và đáp án</h2>
    ${questions.map(questionMarkup).join('\n')}
    <footer><a href="library.html">Mục lục 600 câu hỏi</a> · <a href="theory-exam.html">Thi thử lý thuyết hạng B</a></footer>`});
}

const format = (n, digits) => n.toLocaleString('vi-VN', {maximumFractionDigits:digits});
for (const [id, pass] of passes) {
  const stage = mountainStages.find(s => s.id === id);
  const heights = profile(stage);
  const length = format(stage.step * stage.angles.length / 1000, 2);
  const ascent = format(heights.reduce((gain, height, i) => gain + (i ? Math.max(0, height - heights[i - 1]) : 0), 0), 0);
  const [lon, lat] = stage.start;
  const [dx, dy] = stage.trace.at(-1);
  const coords = (x, y) => `${format(y, 5)}° B, ${format(x, 5)}° Đ`;
  const image = 'pass-plates/' + id + '.webp';
  const imageAlt = `Bản đồ chặng ${stage.name} trong ViVu3D, điểm xuất phát hình tròn và đích hình thoi`;
  page({slug:id, name:stage.name, parent:atlas, title:`${stage.name} · Bản đồ và chặng lái 3D`, image, imageAlt,
    description:`${pass.region}. ${pass.description} Xem bản đồ chặng mô phỏng dài ${length} km và vào lái.`,
    body:`<p class="kicker">${escape(pass.region)}</p><h1>${escape(stage.name)}</h1>
    <p class="intro">${escape(pass.description)}</p>
    <div class="pass-layout"><figure><img src="${image}" width="1000" height="620" alt="${escape(imageAlt)}">
    <figcaption>Bản đồ chặng trong game · ○ Xuất phát · ◇ Về đích</figcaption></figure>
    <section class="facts"><h2>Chặng lái mô phỏng</h2><dl>
    <dt>Cảnh quan</dt><dd>${escape(pass.landscape)}</dd><dt>Chiều dài chặng</dt><dd>${length} km</dd>
    <dt>Tổng leo dốc theo mặt đường trong game</dt><dd>${ascent} m</dd>
    <dt>Tọa độ xuất phát</dt><dd>${coords(lon, lat)}</dd><dt>Tọa độ về đích</dt><dd>${coords(lon + dx / 1e6, lat + dy / 1e6)}</dd></dl></section></div>
    <div class="actions"><a class="primary" href="./?pass=${id}&amp;light=morning">Lái tự do trên ${escape(stage.name)}</a><a href="cup.html?route=${id}&amp;light=morning">Đua tính giờ</a></div>
    <footer><a href="cung-duong.html#guide-${id}">So sánh sáu cung đèo và chọn ánh sáng</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> · <a href="streetscape/CREDITS.txt">Nguồn địa hình</a></footer>`});
}

for (const [slug, html] of pages) {
  const target = path.join(directory, slug + '.html');
  if (process.argv.includes('--check')) {
    if ((await readFile(target, 'utf8')).replace(/\r\n/g, '\n') !== html) {
      throw new Error('Regenerate guides with node tools/generate-guides.mjs: ' + slug);
    }
  } else {
    await writeFile(target, html);
  }
}
console.log(`${pages.size} guide pages, ${driveBank.length} questions, ${passes.size} passes.`);
