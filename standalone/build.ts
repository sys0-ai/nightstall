// Build the standalone page into dist/: index.html and one play.js bundle (the engine and baked world included).
import { cpSync, mkdirSync } from "node:fs";
const root = import.meta.dir + "/..", out = root + "/dist";
mkdirSync(out, { recursive: true });
const built = await Bun.build({ entrypoints: [import.meta.dir + "/play.ts"], outdir: out, target: "browser", format: "esm", minify: true });
if (!built.success) { console.error(built.logs); process.exit(1); }
cpSync(import.meta.dir + "/index.html", out + "/index.html");
console.log("built " + out);
