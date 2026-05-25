// Image optimization pass.
//
// 1. Resize any image whose longest side > MAX_DIM down to MAX_DIM (preserves aspect).
// 2. Generate a sibling .webp at quality 78 for every raster image.
// 3. Re-encode the original JPEG/PNG with reasonable compression so we have a
//    sensible fallback that still loads fast on browsers without WebP.
//
// Output lives next to the originals in assets/images/. The build step copies
// everything into pages/assets/images/.
//
// Usage: node scripts/optimize-images.mjs [--force]
//   --force   re-process even if .webp sibling already exists

import { readdirSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IMG_DIR = path.join(ROOT, "assets", "images");
const FORCE = process.argv.includes("--force");

const MAX_DIM = 1600;            // px — anything bigger gets resized
const JPEG_QUALITY = 82;
const PNG_COMPRESSION = 9;        // pngquant-ish via libimagequant; sharp uses zlib level here
const WEBP_QUALITY = 78;

const RASTER = new Set([".jpg", ".jpeg", ".png"]);

const files = readdirSync(IMG_DIR);

let processed = 0;
let resized = 0;
let webpMade = 0;
let totalSavedKB = 0;

for (const name of files) {
  const ext = path.extname(name).toLowerCase();
  if (!RASTER.has(ext)) continue;

  const inPath = path.join(IMG_DIR, name);
  const webpPath = inPath.replace(/\.(jpe?g|png)$/i, ".webp");

  // Skip if .webp already exists and we're not forcing
  if (!FORCE) {
    try {
      statSync(webpPath);
      continue;
    } catch { /* doesn't exist yet, proceed */ }
  }

  // Read entire file into a Buffer first to avoid Windows file-lock races
  // between sharp's input handle and our writeFileSync.
  const origBuf = readFileSync(inPath);
  const origSize = origBuf.length;

  let meta;
  try {
    meta = await sharp(origBuf, { failOn: "none" }).metadata();
  } catch (err) {
    console.warn(`skip ${name}: ${err.message}`);
    continue;
  }
  if (!meta.width || !meta.height) {
    console.warn(`skip ${name}: no dimensions (probably corrupt or HTML stub)`);
    continue;
  }

  // 1. Resize if too big
  const longest = Math.max(meta.width, meta.height);
  const needsResize = longest > MAX_DIM;

  function buildPipeline() {
    let p = sharp(origBuf, { failOn: "none" });
    if (needsResize) {
      p = p.resize({
        width: meta.width >= meta.height ? MAX_DIM : null,
        height: meta.height > meta.width ? MAX_DIM : null,
        withoutEnlargement: true,
      });
    }
    return p;
  }

  if (needsResize) resized++;

  // 2. Re-encode the original format
  let outBuf;
  if (ext === ".png") {
    outBuf = await buildPipeline()
      .png({ compressionLevel: PNG_COMPRESSION, palette: true })
      .toBuffer();
  } else {
    outBuf = await buildPipeline()
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true })
      .toBuffer();
  }
  if (outBuf.length < origSize) {
    writeFileSync(inPath, outBuf);
    totalSavedKB += (origSize - outBuf.length) / 1024;
  }

  // 3. WebP sibling — built from the same in-memory source buffer
  const webpBuf = await buildPipeline()
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
  writeFileSync(webpPath, webpBuf);
  webpMade++;

  processed++;
  if (processed % 25 === 0) console.log(`  ${processed} processed...`);
}

console.log(`\nProcessed: ${processed}`);
console.log(`Resized (> ${MAX_DIM}px longest side): ${resized}`);
console.log(`WebP siblings generated: ${webpMade}`);
console.log(`Bytes saved on originals: ${(totalSavedKB / 1024).toFixed(1)} MB`);
