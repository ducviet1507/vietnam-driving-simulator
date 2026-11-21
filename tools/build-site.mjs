import {bundleJourneyScripts} from "./bundle-journey.mjs";
import {packJourneyData} from "./pack-journey-data.mjs";
import {packRoadAssets} from "./pack-road-assets.mjs";
import {prepareSightSurfaces} from "./prepare-sight-surfaces.mjs";
import {preparePageUrls} from "./page-urls.mjs";
import {execFileSync,spawn} from "node:child_process";
import {mkdir,readFile,rename,writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {pipeline} from "node:stream/promises";
import {once} from "node:events";

const root = fileURLToPath(new URL("../", import.meta.url));
const client = path.join(root,"dist/client");
const server = path.join(root,"dist/server");
await mkdir(client,{recursive:true});
await mkdir(server,{recursive:true});
// Export the exact public asset tree of the revision being published. In particular,
// no local config, test output, generated Worker or dotfiles from the checkout enter it.
const archive = spawn("git",["archive","--format=tar","HEAD:dist"],{cwd:root,stdio:["ignore","pipe","inherit"]});
const unpack = spawn(process.platform==="win32"?"tar.exe":"tar",["-xf","-","-C",client],{cwd:root,stdio:["pipe","inherit","inherit"]});
const results = await Promise.all([once(archive,"close"),once(unpack,"close"),pipeline(archive.stdout,unpack.stdin)]);
if(results[0][0]!==0||results[1][0]!==0) throw new Error("Could not export the game assets.");
await Promise.all([packRoadAssets(client),prepareSightSurfaces(client)]);
const pagePaths = await preparePageUrls(client);
await packJourneyData(client);
await bundleJourneyScripts(client);
// Sites normalizes public .html assets with a 307 before invoking the Worker.
// Keep the document bytes in the asset store and let the Worker own page URLs.
const documents = path.join(client, "page-content");
await mkdir(documents, {recursive:true});
for (const page of pagePaths) {
  const stem = page === "/" ? "index" : page.slice(1);
  await rename(path.join(client, stem + ".html"), path.join(documents, stem + ".bin"));
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
// Sites accepts a single ES module as its Worker entry point.
await writeFile(path.join(server,"index.js"),body
  .replace('import "../dist/road-tile-codec.js";',()=>roadCodec)
  .replace('import pagePaths from "./page-paths.js";',"const pagePaths = new Set("+JSON.stringify(pagePaths)+");")
  .replace('import courseLengths from "./course-lengths.js";',"const courseLengths = "+JSON.stringify(courses)+";")
  .replace('import guidedLengths from "./guided-lengths.js";',"const guidedLengths = "+JSON.stringify(guided)+";"));
const wrangler = {
  name:"tay-lai-viet",main:"index.js",compatibility_date:"2026-05-15",
  assets:{directory:"../client",binding:"ASSETS",html_handling:"none",run_worker_first:true},
  d1_databases:[{binding:"DB",database_name:"taylai",database_id:"00000000-0000-4000-8000-000000000000"}],
};
await writeFile(path.join(server,"wrangler.json"),JSON.stringify(wrangler,null,2)+"\n");
const sha = execFileSync("git",["rev-parse","--short","HEAD"],{cwd:root,encoding:"utf8"}).trim();
console.log("Prepared "+Object.keys(courses).length+" race courses and static assets for "+sha);
