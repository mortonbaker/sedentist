const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://sedentist.com';
const OUTPUT_DIR = 'C:\\Users\\morto\\Code\\sedentist';
const ASSETS_DIR = path.join(OUTPUT_DIR, 'assets');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'src', 'asset-ledger.json');

const SITEMAP_URLS = [
  'https://sedentist.com/',
  'https://sedentist.com/sample-page/',
  'https://sedentist.com/contact/',
  'https://sedentist.com/about/',
  'https://sedentist.com/testimonial/',
  'https://sedentist.com/gallery/',
  'https://sedentist.com/services/',
  'https://sedentist.com/services/family-dentistry/',
  'https://sedentist.com/services/general-dentistry/',
  'https://sedentist.com/services/crown/',
  'https://sedentist.com/services/denture-or-partial/',
  'https://sedentist.com/services/extractions/',
  'https://sedentist.com/services/implants/',
  'https://sedentist.com/services/memory-free-dentistry/',
  'https://sedentist.com/services/wisdom-teeth-removal/',
  'https://sedentist.com/services/teeth-whitening/',
  'https://sedentist.com/services/root-canals/',
  'https://sedentist.com/services/fillings/',
  'https://sedentist.com/services/dental-cleaning-exams/',
  'https://sedentist.com/services/dental-bonding/',
  'https://sedentist.com/oral-infection-control/',
  'https://sedentist.com/patient-info/',
  'https://sedentist.com/blog/',
  'https://sedentist.com/can-a-dry-mouth-cause-cavities/',
  'https://sedentist.com/how-painful-is-the-dental-implant-process/',
  'https://sedentist.com/do-oral-piercings-cause-infections/',
  'https://sedentist.com/are-dental-implants-noticeable/',
  'https://sedentist.com/are-there-any-differences-between-mouth-washes/',
  'https://sedentist.com/how-can-i-reduce-my-costs-for-dental-care/',
  'https://sedentist.com/what-can-a-cosmetic-dentist-do/',
  'https://sedentist.com/what-are-the-pros-and-cons-of-dental-crowns/',
  'https://sedentist.com/how-long-do-dental-crowns-last/',
  'https://sedentist.com/how-do-i-know-if-i-have-a-cavity/',
  'https://sedentist.com/how-can-poor-oral-health-affect-the-rest-of-the-body/',
  'https://sedentist.com/is-it-better-to-get-a-dental-implant-or-a-bridge/',
  'https://sedentist.com/when-should-a-person-switch-dentists/',
  'https://sedentist.com/how-often-do-dental-implants-need-to-be-replaced/',
  'https://sedentist.com/can-dental-cleanings-damage-enamel/',
  'https://sedentist.com/how-do-i-help-with-tooth-pain/',
  'https://sedentist.com/is-dental-bonding-permanent/',
  'https://sedentist.com/is-it-worth-buying-an-electric-tooth-brush/',
  'https://sedentist.com/why-am-i-vomiting-after-a-wisdom-teeth-removal/',
  'https://sedentist.com/category/cosmetic-dentistry/',
  'https://sedentist.com/category/family-dentistry/',
  'https://sedentist.com/category/uncategorized/',
  'https://sedentist.com/tag/brushing-faq/',
  'https://sedentist.com/tag/cavities/',
  'https://sedentist.com/tag/cavity-cause/',
  'https://sedentist.com/tag/dental-cleaning/',
  'https://sedentist.com/tag/dry-mouth/',
  'https://sedentist.com/tag/electric-tooth-brush/',
  'https://sedentist.com/tag/symptoms/',
  'https://sedentist.com/tag/vomiting/',
  'https://sedentist.com/tag/wisdom-teeth-removal/',
  'https://sedentist.com/author/rothrube/'
];

const ASSET_TYPES = {
  css: { folder: 'css', patterns: [/\.css/i] },
  js: { folder: 'js', patterns: [/\.js(?:\?|$)/i] },
  images: { folder: 'images', patterns: [/\.(jpg|jpeg|png|gif|webp|ico|avif)(?:\?|$)/i] },
  fonts: { folder: 'fonts', patterns: [/\.(woff2?|ttf|otf|eot)(?:\?|$)/i] },
  media: { folder: 'media', patterns: [/\.(mp4|webm|ogg|mp3|wav|pdf|svg)(?:\?|$)/i] }
};

let manifest = {
  generated: new Date().toISOString(),
  baseUrl: BASE_URL,
  totalAssets: 0,
  totalSize: 0,
  byType: {},
  assets: [],
  failed: [],
  pagesCrawled: 0,
  pagesFailed: [],
  downloadedFiles: []
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getAssetFolder(url) {
  const urlLower = url.toLowerCase();
  for (const [type, config] of Object.entries(ASSET_TYPES)) {
    for (const pattern of config.patterns) {
      if (pattern.test(urlLower)) {
        return config.folder;
      }
    }
  }
  return 'images';
}

function getAssetType(url) {
  const urlLower = url.toLowerCase();
  for (const [type, config] of Object.entries(ASSET_TYPES)) {
    for (const pattern of config.patterns) {
      if (pattern.test(urlLower)) {
        return type;
      }
    }
  }
  if (/\.svg/i.test(urlLower)) return 'svg';
  return 'unknown';
}

function sanitizeFilename(url) {
  try {
    const parsed = new URL(url);
    let filename = parsed.pathname.split('/').filter(Boolean).join('_') || 'file';
    if (parsed.search) filename += parsed.search.replace(/[^a-z0-9]/gi, '_');
    filename = filename.replace(/^_/, '').replace(/_+/g, '_');
    if (filename.length > 200) filename = filename.substring(0, 200);
    return filename || 'asset';
  } catch {
    return url.replace(/[^a-z0-9]/gi, '_').substring(0, 200) || 'asset';
  }
}

function getLocalPath(url) {
  const type = getAssetFolder(url);
  const filename = sanitizeFilename(url);
  return path.join(ASSETS_DIR, type, filename);
}

async function downloadAsset(url) {
  const localPath = getLocalPath(url);
  const type = getAssetType(url);
  
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': BASE_URL + '/'
      },
      maxRedirects: 5
    });

    ensureDir(path.dirname(localPath));
    fs.writeFileSync(localPath, response.data);

    const size = Buffer.byteLength(response.data);
    manifest.totalSize += size;
    manifest.totalAssets++;

    if (!manifest.byType[type]) {
      manifest.byType[type] = { count: 0, size: 0 };
    }
    manifest.byType[type].count++;
    manifest.byType[type].size += size;

    const relativePath = localPath.replace(OUTPUT_DIR, '').replace(/\\/g, '/');
    manifest.assets.push({
      originalUrl: url,
      localPath: relativePath,
      fileType: type,
      size: size,
      status: 'downloaded'
    });
    manifest.downloadedFiles.push(relativePath);

    console.log(`  [OK] ${type}: ${url} -> ${path.basename(localPath)}`);
    return { success: true, path: localPath, size };
  } catch (error) {
    console.log(`  [FAIL] ${url} - ${error.message}`);
    manifest.failed.push({
      originalUrl: url,
      fileType: type,
      status: 'failed',
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function crawlPage(browser, url) {
  const page = await browser.newPage();
  const collectedAssets = [];
  
  page.on('request', request => {
    const reqUrl = request.url();
    const resourceType = request.resourceType();
    
    if (resourceType === 'stylesheet') {
      collectedAssets.push({ url: reqUrl, type: 'css' });
    } else if (resourceType === 'script') {
      collectedAssets.push({ url: reqUrl, type: 'js' });
    } else if (resourceType === 'image') {
      collectedAssets.push({ url: reqUrl, type: 'image' });
    } else if (resourceType === 'font') {
      collectedAssets.push({ url: reqUrl, type: 'font' });
    } else if (resourceType === 'media') {
      collectedAssets.push({ url: reqUrl, type: 'media' });
    }
  });

  try {
    console.log(`\nCrawling: ${url}`);
    
    await page.goto(url, { 
      waitUntil: ['networkidle2', 'domcontentloaded'],
      timeout: 60000 
    });
    
    await sleep(3000);
    
    const title = await page.title();
    console.log(`  Title: ${title}`);
    
    const html = await page.content();
    
    const assetRegexes = [
      /href=["']([^"']*\.css[^"']*)["']/gi,
      /src=["']([^"']*\.js[^"']*)["']/gi,
      /src=["']([^"']*\.(jpg|jpeg|png|gif|webp|ico|avif)[^"']*)["']/gi,
      /url\(["']([^"']+)["']\)/gi,
      /href=["']([^"']*\.(woff2?|ttf|otf|eot)[^"']*)["']/gi,
      /src=["']([^"']*\.(mp4|webm|mp3|ogg|pdf|svg)[^"']*)["']/gi,
      /<img[^>]+src=["']([^"']+)["']/gi,
      /<link[^>]+href=["']([^"']+)["']/gi,
      /<script[^>]+src=["']([^"']+)["']/gi,
      /data-src=["']([^"']+)["']/gi,
      /data-original=["']([^"']+)["']/gi,
      /background-image:\s*url\(["']?([^"')]+)["']?\)/gi
    ];

    for (const regex of assetRegexes) {
      let match;
      while ((match = regex.exec(html)) !== null) {
        let assetUrl = match[1];
        if (assetUrl && !assetUrl.startsWith('data:') && !assetUrl.startsWith('blob:')) {
          if (!assetUrl.startsWith('http')) {
            if (assetUrl.startsWith('//')) {
              assetUrl = 'https:' + assetUrl;
            } else if (assetUrl.startsWith('/')) {
              assetUrl = BASE_URL + assetUrl;
            } else {
              assetUrl = BASE_URL + '/' + assetUrl;
            }
          }
          collectedAssets.push({ url: assetUrl, type: 'html_reference' });
        }
      }
    }
    
    const uniqueAssets = [...new Map(collectedAssets.map(a => [a.url, a])).values()];
    console.log(`  Found ${uniqueAssets.length} unique assets`);
    
    manifest.pagesCrawled++;
    
    return uniqueAssets;
  } catch (error) {
    console.log(`  [ERROR] ${error.message}`);
    manifest.pagesFailed.push({ url, error: error.message });
    return [];
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Asset Harvester for sedentist.com');
  console.log('='.repeat(60));
  console.log(`\nStarting at ${new Date().toISOString()}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  
  ensureDir(ASSETS_DIR);
  ensureDir(path.join(ASSETS_DIR, 'css'));
  ensureDir(path.join(ASSETS_DIR, 'js'));
  ensureDir(path.join(ASSETS_DIR, 'images'));
  ensureDir(path.join(ASSETS_DIR, 'fonts'));
  ensureDir(path.join(ASSETS_DIR, 'media'));
  ensureDir(path.join(OUTPUT_DIR, 'pages'));

  console.log('\nInitializing headless browser...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--ignore-certificate-errors',
      '--window-size=1920,1080'
    ]
  });

  const allAssets = [];
  
  for (let i = 0; i < SITEMAP_URLS.length; i++) {
    const url = SITEMAP_URLS[i];
    console.log(`\n[${i + 1}/${SITEMAP_URLS.length}]`);
    
    const assets = await crawlPage(browser, url);
    allAssets.push(...assets);
    
    if (i < SITEMAP_URLS.length - 1) {
      await sleep(2000);
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log('Downloading assets...');
  console.log('='.repeat(60));

  const uniqueAssets = [...new Map(allAssets.map(a => [a.url, a])).values()];
  console.log(`Total unique assets to download: ${uniqueAssets.length}`);

  for (const asset of uniqueAssets) {
    await downloadAsset(asset.url);
  }

  manifest.generated = new Date().toISOString();
  
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved to: ${MANIFEST_PATH}`);

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Pages crawled: ${manifest.pagesCrawled}/${SITEMAP_URLS.length}`);
  console.log(`Total assets: ${manifest.totalAssets}`);
  console.log(`Total size: ${(manifest.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Failed: ${manifest.failed.length}`);
  
  for (const [type, data] of Object.entries(manifest.byType)) {
    console.log(`  ${type}: ${data.count} files (${(data.size / 1024).toFixed(2)} KB)`);
  }
  
  console.log('\nAsset folders:');
  console.log(`  CSS: ${path.join(ASSETS_DIR, 'css')}`);
  console.log(`  JS: ${path.join(ASSETS_DIR, 'js')}`);
  console.log(`  Images: ${path.join(ASSETS_DIR, 'images')}`);
  console.log(`  Fonts: ${path.join(ASSETS_DIR, 'fonts')}`);
  console.log(`  Media: ${path.join(ASSETS_DIR, 'media')}`);
}

main().catch(console.error);
