import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createContext, runInContext} from 'node:vm';
import {gzipSync} from 'node:zlib';

// Run the same registrations as the source game. This keeps model entrances,
// compound visits and legacy OSM IDs available before the national Atlas loads.
export async function packJourneyData(client) {
  const index = path.join(client, 'index.html');
  let html = await readFile(index, 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  const context = createContext({});
  context.window = context;
  const groups = [];
  const directory = path.join(client, 'journey-data');
  const generated = new Set();
  await mkdir(directory, {recursive:true});
  async function asset(name, content, extension) {
    const compressed = extension === 'json';
    const data = compressed ? gzipSync(content, {level:9}) : content;
    const hash = createHash('sha256').update(data).digest('hex').slice(0,16);
    const file = name + '-' + hash + '.' + extension + (compressed ? '.gz' : '');
    generated.add(file);
    await writeFile(path.join(directory, file), data);
    return 'journey-data/' + file;
  }
  for (const name of scripts.slice(scripts.indexOf('sight-details.js'), scripts.indexOf('vietnam-landmarks.js') + 1)) {
    const code = await readFile(path.join(client, name), 'utf8');
    const previous = context.VietnamSights?.length || 0;
    runInContext(code, context, {filename:name});
    if (code.includes('const A = window.CentralArch;')) {
      const sites = context.VietnamSights.slice(previous);
      if (!sites.length || sites.some(s => typeof s.build !== 'function')) throw Error('Missing models in ' + name);
      // These independent regional packs register into a private array at import.
      const module = 'const window = {CentralArch:globalThis.CentralArch};\n' + code + '\nexport default window.VietnamSights;\n';
      const file = await asset(name.slice(0,-3), module, 'mjs');
      groups.push({file, sites});
      html = html.replace('<script src="' + name + '"></script>', '');
    }
  }
  const atlas = context.VietnamTourism, details = context.VietnamSightDetails;
  const seed = new Set();
  for (const [, , stops] of runInContext('heritageVisits', context)) for (const id of stops) seed.add(id);
  // Models use the nearest mapped place for their region and province. Keep
  // nearby matches as well so duplicate pins resolve exactly as in the source.
  for (const model of context.VietnamLandmarks.entries) {
    seed.add(model.id);
    seed.add(model.catalogId);
    let best = Infinity, closest;
    for (const site of atlas.entries) {
      const d = (site.lon-model.lon)**2 + (site.lat-model.lat)**2;
      if (d < .003**2) seed.add(site.id);
      if (d < best) { best = d; closest = site.id; }
    }
    seed.add(closest);
  }
  const world = await readFile(path.join(client, 'world.js'), 'utf8');
  for (const match of world.matchAll(/osm-(?:way|node|relation)-\d+/g)) seed.add(match[0]);
  const entries = [], rest = [], tiles = new Map();
  const initialDetails = {};
  const tileScale = 4;
  for (const [order,site] of atlas.entries.entries()) {
    site.atlasOrder=order;
    if (seed.has(site.id)) {
      entries.push(site);
      if (details[site.id]) initialDetails[site.id] = details[site.id];
      continue;
    }
    const row = [site, details[site.id] || null];
    const tile = Math.floor(site.lon*tileScale) + '_' + Math.floor(site.lat*tileScale);
    if (!tiles.has(tile)) tiles.set(tile, []);
    tiles.get(tile).push(row);
    rest.push(row);
  }
  const files = {};
  for (const [key, rows] of tiles) files[key] = await asset(key, JSON.stringify(rows), 'json');
  const all = await asset('atlas', JSON.stringify(rest), 'json');
  const manifest = {metadata:atlas.metadata, aliases:atlas.aliases, entries, files, all, tileScale,
    provinces:[...new Set(atlas.entries.map(s => s.province))]};
  const origin = '// © OpenStreetMap contributors. ODbL 1.0. See VietnamTourism.metadata.\n';
  await writeFile(path.join(client, 'tourism-catalog.js'), origin + 'window.VietnamTourism=' + JSON.stringify(manifest) + ';\n');
  await writeFile(path.join(client, 'sight-details.js'), 'window.VietnamSightDetails=' + JSON.stringify(initialDetails) + ';\n');
  const register = 'VietnamTourism.modelGroups=' + JSON.stringify(groups) + ';\n' +
    'for(const group of VietnamTourism.modelGroups)(window.VietnamSights??=[]).push(...group.sites);\n';
  const registrations = await asset('regional-models', register, 'js');
  html = html.replace('<script src="central-arch.js"></script>', '$&<script src="' + registrations + '"></script>');
  await writeFile(index, html);
  for(const name of await readdir(directory)){
    if(/-[0-9a-f]{16}\.(json(?:\.gz)?|m?js)$/.test(name)&&!generated.has(name))await unlink(path.join(directory,name));
  }
}
