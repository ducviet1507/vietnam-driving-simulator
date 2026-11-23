import {prepareJourneyOpening,writeDeparturePages} from "./prepare-journey-opening.mjs";
import {bundleJourneyScripts} from "./bundle-journey.mjs";
import {packJourneyData} from "./pack-journey-data.mjs";
import {packRoadAssets} from "./pack-road-assets.mjs";
import {prepareSightSurfaces} from "./prepare-sight-surfaces.mjs";
import {preparePageUrls} from "./page-urls.mjs";
import {execFileSync} from "node:child_process";
import {mkdir,mkdtemp,readFile,readdir,rename,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {promisify} from "node:util";
import {gzip,gunzipSync,gzipSync} from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));
const revision = execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
const trailerPath = "trailer/qua-mot-khuc-cua.mp4";
const client = path.join(root,"dist/client");
const server = path.join(root,"dist/server");
await mkdir(client,{recursive:true});
await mkdir(server,{recursive:true});
// Export the exact public asset tree of the revision being published. In particular,
// no local config, test output, generated Worker or dotfiles from the checkout enter it.
const scratch = await mkdtemp(path.join(tmpdir(),"vivu3d-export-"));
try {
  const archive = path.join(scratch,"assets.tar");
  execFileSync("git",["archive","--format=tar","--output",archive,"HEAD:dist"],{cwd:root,stdio:"inherit"});
  execFileSync(process.platform==="win32"?"tar.exe":"tar",["-xf",archive,"-C",client],{cwd:root,stdio:"inherit"});
} finally {
  await rm(scratch,{recursive:true,force:true});
}
// The public trailer streams from this exact GitHub revision through the Worker.
await rm(path.join(client,trailerPath));
// The three full-resolution captures stream through the Worker at their
// public URLs, pinned to the same source revision as the rest of this build.
for (const name of ["my-son","my-son-g4","den-ngoc-son"]) {
  await rm(path.join(client,"landmark-scans",name+".glb"));
}
// Terrain generation consumes this national raster offline. Its public URL
// serves the original PNG from the pinned source revision.
await rm(path.join(client,"streetscape","surfaces","vietnam-elevation.png"));
await Promise.all([packRoadAssets(client),prepareSightSurfaces(client)]);
// Population and land-cover rasters are already gzip streams. Repack the
// release copies at level 9 while preserving the exact sampled pixels.
const environmentDir=path.join(client,"vn-environment");
const environmentTiles=(await readdir(environmentDir)).filter(name=>name.endsWith(".gz"));
const gzipAsync=promisify(gzip);
for(let index=0;index<environmentTiles.length;index+=4){
  await Promise.all(environmentTiles.slice(index,index+4).map(async name=>{
    const file=path.join(environmentDir,name),source=await readFile(file);
    const packed=await gzipAsync(gunzipSync(source),{level:9});
    if(packed.length<source.length)await writeFile(file,packed);
  }));
}
// The Worker serves the original bytes at each public URL.
async function storeGzip(file) {
  await writeFile(file+".gz",gzipSync(await readFile(file),{level:9}));
  await rm(file);
}
for (const directory of ["streetscape","traffic"]) {
  const folder = path.join(client,directory);
  for (const name of await readdir(folder)) {
    if (!name.endsWith(".glb")) continue;
    await storeGzip(path.join(folder,name));
  }
}
const pagePaths = await preparePageUrls(client);
await packJourneyData(client);
const departures = await prepareJourneyOpening(client);
await bundleJourneyScripts(client);
// Sites normalizes public .html assets with a 307 before invoking the Worker.
// Keep the document bytes in the asset store and let the Worker own page URLs.
const documents = path.join(client, "page-content");
await mkdir(documents, {recursive:true});
await writeDeparturePages(documents, await readFile(path.join(client, "index.html"),"utf8"), departures);
for (const page of pagePaths) {
  const stem = page === "/" ? "index" : page.slice(1);
  await rename(path.join(client, stem + ".html"), path.join(documents, stem + ".bin"));
}
for (const name of await readdir(documents)) {
  if (name.endsWith(".bin")) await storeGzip(path.join(documents,name));
}
// A public .txt asset is served by Sites before the Worker can declare its charset.
for (const name of await readdir(client, {recursive:true})) {
  if (name.endsWith(".txt")) {
    const file = path.join(client, name);
    await rename(file, file + ".bin");
  }
}
const stageScript = await readFile(path.join(client,"mountain-stages.js"),"utf8");
const stages = JSON.parse(stageScript.slice(stageScript.indexOf("window.mountainStages=")+"window.mountainStages=".length).trim().replace(/;$/,""));
const courses = {river:2240,pass:2480};
for(const stage of stages) courses[stage.id]=stage.angles.length*stage.step;
const featured = JSON.parse(await readFile(path.join(client,"featured-drives.json"),"utf8"));
const guided = Object.fromEntries(featured.map(route => [route.id,route.metres]));
if(featured.length!==Object.keys(guided).length || featured.some(r=>!Number.isInteger(r.metres)||r.metres<=0||r.id==="xuyen-viet"||Object.hasOwn(courses,r.id)))
  throw new Error("Invalid or duplicate featured drive.");
const body = await readFile(path.join(root,"worker/leaderboard.mjs"),"utf8");
const roadCodec = await readFile(path.join(client,"road-tile-codec.js"),"utf8");
// The Worker restores these assets at their original URLs. Pack after preparing
// the courses and pages, which read the public JSON and CSS during the build.
for (const name of await readdir(client,{recursive:true})) {
  if (/\.(json|css)$/.test(name)) await storeGzip(path.join(client,name));
}
for (const name of await readdir(client)) {
  if (name.endsWith(".js")) await storeGzip(path.join(client,name));
}
// Keep the regional model modules and pass terrain in the same lossless
// representation as the main scripts. Their public import URLs stay stable.
for (const directory of ["journey-data","stage-terrain"]) {
  for (const name of await readdir(path.join(client,directory))) {
    if (/\.m?js$/.test(name)) await storeGzip(path.join(client,directory,name));
  }
}
// Sites accepts a single ES module as its Worker entry point.
await writeFile(path.join(server,"index.js"),body
  .replace('import trailerUrl from "./trailer-url.js";',"const trailerUrl = "+JSON.stringify("https://raw.githubusercontent.com/tang-vu/vietnam-driving-simulator/"+revision+"/dist/"+trailerPath)+";")
  .replace('import "../dist/road-tile-codec.js";',()=>roadCodec)
  .replace('import departureIds from "./departure-ids.js";',"const departureIds = new Set("+JSON.stringify(departures.map(stop=>stop.id))+");")
  .replace('import pagePaths from "./page-paths.js";',"const pagePaths = new Set("+JSON.stringify(pagePaths)+");")
  .replace('import courseLengths from "./course-lengths.js";',"const courseLengths = "+JSON.stringify(courses)+";")
  .replace('import guidedLengths from "./guided-lengths.js";',"const guidedLengths = "+JSON.stringify(guided)+";"));
const wrangler = {
  name:"tay-lai-viet",main:"index.js",compatibility_date:"2026-05-15",
  assets:{directory:"../client",binding:"ASSETS",html_handling:"none",run_worker_first:true},
  d1_databases:[{binding:"DB",database_name:"taylai",database_id:"00000000-0000-4000-8000-000000000000"}],
};
await writeFile(path.join(server,"wrangler.json"),JSON.stringify(wrangler,null,2)+"\n");
console.log("Prepared "+Object.keys(courses).length+" race courses and static assets for "+revision.slice(0,7));
