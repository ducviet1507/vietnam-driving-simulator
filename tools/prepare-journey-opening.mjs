import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {runInNewContext} from 'node:vm';

export async function prepareJourneyOpening(client) {
  const file = path.join(client, 'index.html');
  let html = await readFile(file, 'utf8');
  const [stops,departures] = await Promise.all(['journey-stops.js','journey-departures.js']
    .map(name => readFile(path.join(client,name),'utf8')));
  html = html.replace('<script src="journey-stops.js"></script><script src="journey-departures.js"></script>',
    () => '<script>' + stops + '\n' + departures + '</script>');

  // All opening styles live at the same relative depth. Keep their cascade and
  // leave styles outside the head (e.g. the route planner) in their original position.
  const head = html.slice(0,html.indexOf('</head>'));
  const tags = [...head.matchAll(/<link rel="stylesheet" href="([\w-]+\.css)">/g)];
  const sheets = await Promise.all(tags.map(tag => readFile(path.join(client,tag[1]),'utf8')));
  // A byte-order mark is only valid at the beginning of the combined resource.
  const css = sheets.map(sheet => sheet.replace(/^\uFEFF/,'')).join('\n'), hash = createHash('sha256').update(css).digest('hex').slice(0,16);
  const bundle = 'journey-' + hash + '.css';
  await writeFile(path.join(client,bundle),css);
  for (const [i,tag] of tags.entries()) html = html.replace(tag[0], i === 0 ? '<link rel="stylesheet" href="'+bundle+'">' : '');
  await writeFile(file,html);
  return runInNewContext(stops + '\njourneyStops');
}

export async function writeDeparturePages(directory, html, stops) {
  const escaped = value => value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  for (const stop of stops) {
    const values = {
      'og:title':stop.title + ' · Xuyên Việt cùng ViVu3D',
      'og:description':stop.note + ' Cầm lái và gửi bưu thiếp của bạn.',
      'og:url':'https://vivu3d.com/?intro=' + stop.id,
      'og:image':'https://vivu3d.com/buu-thiep/' + stop.id + '.jpg',
      'og:image:alt':'Bưu thiếp Xuyên Việt từ ' + stop.title + ' trong game ViVu3D'
    };
    const page = html.replace(/(<meta property="([^"]+)" content=")([^"]*)(")/g,
      (all,prefix,key,old,end) => Object.hasOwn(values,key) ? prefix + escaped(values[key]) + end : all);
    await writeFile(path.join(directory,'intro-' + stop.id + '.bin'),page);
  }
}
