// Re-download every attachment referenced in the WordPress XML export.
// The original crawler hit SGCaptcha and saved 225-byte HTML stubs as .jpeg/.png.
// This script fetches with a real browser UA, which we confirmed bypasses the
// captcha for public uploads.
//
// Filename mapping: https://sedentist.com/wp-content/uploads/2022/01/foo.jpeg
//   -> assets/images/wp-content_uploads_2022_01_foo.jpeg
//
// Usage: node scripts/fetch-media.mjs [--force]
//   --force   re-download even non-stub files

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const XML_PATH = path.join(ROOT, "southeastdental.WordPress.2026-05-22.xml");
const OUT_DIR = path.join(ROOT, "assets", "images");
const FORCE = process.argv.includes("--force");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

mkdirSync(OUT_DIR, { recursive: true });

const xml = readFileSync(XML_PATH, "utf8");

// Pull every <wp:attachment_url>...</wp:attachment_url>
const urlRegex =
  /<wp:attachment_url><!\[CDATA\[(https?:\/\/sedentist\.com\/wp-content\/uploads\/[^\]]+)\]\]><\/wp:attachment_url>/gi;
const urls = [...xml.matchAll(urlRegex)].map((m) => m[1]);

// Also pull every inline reference inside post/page content so we get
// resized variants (e.g. -768x513, -1024x682) the XML doesn't list as
// attachments but the pages embed.
const inlineRegex =
  /https?:\/\/sedentist\.com\/wp-content\/uploads\/[A-Za-z0-9_\-./]+\.(?:jpe?g|png|gif|webp|svg)/gi;
const inlineUrls = [...xml.matchAll(inlineRegex)].map((m) => m[0]);

// Also scan the original crawled HTML pages, which embed WP-resized variants
// (e.g. -1024x449) that aren't in the XML as bare URLs.
const CRAWL_DIR = path.join(ROOT, "src", "crawled-pages");
const crawledUrls = [];
if (existsSync(CRAWL_DIR)) {
  for (const f of readdirSync(CRAWL_DIR)) {
    if (!f.endsWith(".html")) continue;
    const html = readFileSync(path.join(CRAWL_DIR, f), "utf8");
    for (const m of html.matchAll(inlineRegex)) crawledUrls.push(m[0]);
  }
}

const allUrls = [...new Set([...urls, ...inlineUrls, ...crawledUrls])];
console.log(`Attachment URLs in XML: ${urls.length}`);
console.log(`Inline refs in XML: ${inlineUrls.length}`);
console.log(`Inline refs in crawled HTML: ${crawledUrls.length}`);
console.log(`Unique total: ${allUrls.length}`);

function flatNameFor(url) {
  // strip prefix, replace remaining slashes with underscores
  const tail = url.replace(/^https?:\/\/sedentist\.com\/wp-content\/uploads\//, "");
  return "wp-content_uploads_" + tail.replace(/\//g, "_");
}

function isCaptchaStub(filePath) {
  if (!existsSync(filePath)) return false;
  const sz = statSync(filePath).size;
  if (sz > 4096) return false; // real image
  const head = readFileSync(filePath, "utf8").slice(0, 200).toLowerCase();
  return head.includes("<html") || head.includes("sgcaptcha") || head.includes("captcha");
}

let downloaded = 0;
let skipped = 0;
let failed = 0;
const failures = [];

for (const url of allUrls) {
  const name = flatNameFor(url);
  const outPath = path.join(OUT_DIR, name);

  if (!FORCE && existsSync(outPath) && !isCaptchaStub(outPath)) {
    skipped++;
    continue;
  }

  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "image/*,*/*" } });
    if (!res.ok) {
      failed++;
      failures.push(`${res.status}  ${url}`);
      continue;
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) {
      failed++;
      failures.push(`bad content-type ${ct}  ${url}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(outPath, buf);
    downloaded++;
    if (downloaded % 10 === 0) console.log(`  ${downloaded} downloaded...`);
  } catch (err) {
    failed++;
    failures.push(`${err.message}  ${url}`);
  }
}

console.log(`\nDownloaded: ${downloaded}`);
console.log(`Skipped (already real): ${skipped}`);
console.log(`Failed: ${failed}`);
if (failures.length) {
  console.log("\nFailures:");
  for (const f of failures.slice(0, 50)) console.log("  " + f);
  if (failures.length > 50) console.log(`  ... and ${failures.length - 50} more`);
}
