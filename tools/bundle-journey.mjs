import {createHash} from "node:crypto";
import {readFile, readdir, unlink, writeFile} from "node:fs/promises";
import path from "node:path";
import {Script} from "node:vm";

// Group adjacent classic scripts at their existing parser position. The source
// page remains playable in dist/ and other game modes can reuse their own files.
export async function bundleJourneyScripts(client) {
  const index = path.join(client, "index.html");
  const html = await readFile(index, "utf8");
  const sources = new Map();
  const bundles = new Set();
  const scriptTag = /<script src="([\w.-]+\.js)"><\/script>/g;
  for (const match of html.matchAll(scriptTag)) {
    const name = match[1];
    if (!sources.has(name)) sources.set(name, await readFile(path.join(client, name), "utf8"));
  }

  const chunks = [];
  let end = 0;
  let batch = [];
  let previousStrict = false;
  async function flush() {
    if (!batch.length) return;
    if (batch.length === 1) {
      chunks.push(batch[0][0]);
    } else {
      const code = batch.map(([,name]) => "/* " + name + " */\n" + sources.get(name)).join("\n;\n");
      const digest = createHash("sha256").update(code).digest("hex").slice(0,16);
      const filename = "journey-" + digest + ".bundle.js";
      new Script(code, {filename}); // Catch duplicate top-level bindings at build time.
      await writeFile(path.join(client, filename), code);
      bundles.add(filename);
      chunks.push('<script src="' + filename + '"></script>');
    }
    batch = [];
  }

  for (const match of html.matchAll(scriptTag)) {
    const gap = html.slice(end, match.index);
    const name = match[1], code = sources.get(name);
    const strict = /^\s*(?:["']use strict["'])\s*;/.test(code.replace(/^(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*(?:\n|$))*/, ""));
    // Parser writes and currentScript must execute with their original tag and
    // URL. Keep the shared Three.js runtime independently cacheable across pages.
    const standalone = name === "three.min.js" || /document\s*\.\s*(?:write(?:ln)?|currentScript)\b/.test(code);
    if (gap.trim() || standalone || strict !== previousStrict) await flush();
    if (!batch.length) chunks.push(gap);
    if (standalone) chunks.push(match[0]);
    else batch.push(match);
    end = match.index + match[0].length;
    previousStrict = strict;
  }
  await flush();
  chunks.push(html.slice(end));
  await writeFile(index, chunks.join(""));
  // Repeated release builds may target the same generated client directory.
  for (const file of await readdir(client)) {
    if (/^journey-[\da-f]{16}\.bundle\.js(?:\.gz)?$/.test(file) && !bundles.has(file.replace(/\.gz$/, "")))
      await unlink(path.join(client, file));
  }
}
