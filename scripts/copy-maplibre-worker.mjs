// Copies MapLibre's web worker into public/ so the browser can load it.
// (Bundlers can't resolve the worker's default URL, so MapView points setWorkerUrl() here.)
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const dist = path.dirname(require.resolve("maplibre-gl/dist/maplibre-gl.css"));
const outDir = path.join(process.cwd(), "public", "vendor");
mkdirSync(outDir, { recursive: true });
copyFileSync(path.join(dist, "maplibre-gl-worker.mjs"), path.join(outDir, "maplibre-gl-worker.mjs"));
console.log("[maplibre] worker copied to public/vendor/maplibre-gl-worker.mjs");
