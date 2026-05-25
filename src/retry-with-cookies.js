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
const LEDGER_PATH = path.join(OUTPUT_DIR, 'src', 'asset-ledger.json');

const FAILED_URLS = [
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental05.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental06-1.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental07-1.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-435.css?ver=1773379108',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental03.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental04-1.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental05-2.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental06-2.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental04-2.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental05-3.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental07-2.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-444.css?ver=1773323209',
  'https://sedentist.com/wp-content/uploads/2022/01/AdobeStock_46602515-768x512-1.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental05-4.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental06-3.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental07-3.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-454.css?ver=1773300689',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental04-3-2048x1366.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental05-5.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental06-4.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental07-4.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental04-3.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-464.css?ver=1773262422',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental08-1-2048x1366.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental09-2-2048x1152.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental08-1.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental09-2.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-473.css?ver=1773581385',
  'https://sedentist.com/wp-content/uploads/2022/01/Sedation-Dentistry-768x513-1.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental05-6.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental06-5.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental07-5.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-486.css?ver=1773654702',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental08-2-2048x1547.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental09-3-2048x1366.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental10-1-2048x1371.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental08-2.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental09-3.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental10-1.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-499.css?ver=1773494722',
  'https://sedentist.com/wp-content/uploads/2022/01/AdobeStock_295586054-1536x864-1.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-508.css?ver=1773319989',
  'https://sedentist.com/wp-content/uploads/2022/01/AdobeStock_104902833-1536x1024-1.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/AdobeStock_243244426-1536x1024-1.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/AdobeStock_355157640-1536x1056-1.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-517.css?ver=1773379109',
  'https://sedentist.com/wp-content/uploads/2022/01/AdobeStock_194228504-1536x1152-1.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/AdobeStock_108201874-1536x1024-1.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/AdobeStock_259157149-1536x1025-1.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-526.css?ver=1773451701',
  'https://sedentist.com/wp-content/uploads/2022/01/AdobeStock_67766775-1536x1024-1.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/AdobeStock_280639516-1536x1024-1.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/AdobeStock_282004457-1536x1025-1.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-544.css?ver=1774020264',
  'https://sedentist.com/wp-content/uploads/2022/01/sedentist-1.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/Dental-bonding-2.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/Dental-bonding-3.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-237.css?ver=1773273142',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-276.css?ver=1773265504',
  'https://sedentist.com/wp-content/uploads/elementor/google-fonts/css/inter.css?ver=1744852656',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental04-1.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental05.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental06-1.png',
  'https://sedentist.com/wp-content/uploads/elementor/google-fonts/fonts/inter-ucc73fwrk3iltehus_nvmrmxcp50sjia1zl7.woff2',
  'https://sedentist.com/wp-content/uploads/2022/01/visa-1-2048x1279.jpg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental08-1.jpg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental09.png',
  'https://sedentist.com/wp-content/uploads/2022/01/visa-1-scaled.jpg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental10.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental12.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental13.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental14-300x113.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental15-1.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental16.jpg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental17.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental18.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental19.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental20.jpg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental21.png',
  'https://sedentist.com/wp-content/uploads/2022/01/Metlife-Transparent-Background-1-1-300x65.jpg',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental23.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental24-1-300x130.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental25.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental26.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental27.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental28.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental29.png',
  'https://sedentist.com/wp-content/uploads/2022/01/southeastdental30.jpg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-357.css?ver=1773321672',
  'https://sedentist.com/wp-content/uploads/2021/10/Wisdom-Teeth-Removal.jpg',
  'https://sedentist.com/wp-content/uploads/2021/10/Electric-Toothbrush.jpg',
  'https://sedentist.com/wp-content/uploads/2021/09/Dental-Bonding.jpg',
  'https://sedentist.com/wp-content/uploads/2021/09/Dry-Mouth.jpg',
  'https://sedentist.com/wp-content/uploads/2021/04/post-15-feat.jpeg',
  'https://sedentist.com/wp-content/uploads/2021/04/post-14-feat.jpeg',
  'https://sedentist.com/wp-content/uploads/2021/04/post-13-feat.jpeg',
  'https://sedentist.com/wp-content/uploads/2021/04/post-12.jpg',
  'https://sedentist.com/wp-content/uploads/2021/04/post-11.jpg',
  'https://sedentist.com/wp-content/uploads/elementor/google-fonts/fonts/robotoslab-bngmuxzytxpivibgjjsb6ufn5qu.woff2',
  'https://sedentist.com/wp-content/plugins/elementor-pro/assets/js/archive-posts.d30c917134774f65dd6d.bundle.min.js',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-677.css?ver=1773270150',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-361.css?ver=1773262490',
  'https://sedentist.com/wp-content/uploads/2021/09/Dry-Mouth-1024x576.jpg',
  'https://sedentist.com/wp-content/plugins/elementor/assets/lib/font-awesome/css/regular.min.css?ver=5.15.3',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-663.css?ver=1773474119',
  'https://sedentist.com/wp-content/uploads/2021/04/post-15-feat-1024x449.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-656.css?ver=1773348358',
  'https://sedentist.com/wp-content/uploads/2021/04/post-13-feat-1024x449.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-648.css?ver=1773474119',
  'https://sedentist.com/wp-content/uploads/2021/04/post-12-1024x449.jpg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-640.css?ver=1773295388',
  'https://sedentist.com/wp-content/uploads/2021/04/post-11-1024x449.jpg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-630.css?ver=1773473527',
  'https://sedentist.com/wp-content/uploads/2021/04/post-11-1024x449.jpg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-621.css?ver=1773682029',
  'https://sedentist.com/wp-content/uploads/2021/04/post-9-feat-1024x449.jpg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-614.css?ver=1773366961',
  'https://sedentist.com/wp-content/uploads/2021/04/post-8-feat-1024x449.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-607.css?ver=1773530105',
  'https://sedentist.com/wp-content/uploads/2022/04/post-7-1024x449.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-600.css?ver=1773284630',
  'https://sedentist.com/wp-content/uploads/2022/04/post-6-feat-1024x449.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-593.css?ver=1773318542',
  'https://sedentist.com/wp-content/uploads/2022/04/post5-featured-1024x449.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-585.css?ver=1773759186',
  'https://sedentist.com/wp-content/uploads/2021/04/post-4-featured-1024x449.jpeg',
  'https://sedentist.com/wp-content/uploads/2021/04/switch-dentist.jpg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-576.css?ver=1773506019',
  'https://sedentist.com/wp-content/uploads/2021/04/post3-1024x449.jpeg',
  'https://sedentist.com/wp-content/uploads/2021/04/post3-inner-1024x683.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-566.css?ver=1773262490',
  'https://sedentist.com/wp-content/uploads/2022/01/Damage-Enamel-1024x449.jpeg',
  'https://sedentist.com/wp-content/uploads/2022/01/Damage-Enamel-img-1024x682.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-558.css?ver=1773266290',
  'https://sedentist.com/wp-content/uploads/2022/01/anxietyfeat-scaled-ozl1nou3jhyepmptoh74nllf8bxfla6es0y39oetfs-1024x449-1.jpeg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-364.css?ver=1773266290',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-684.css?ver=1773474119',
  'https://sedentist.com/wp-content/uploads/2021/09/Dental-Bonding-1024x768.jpg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-696.css?ver=1773306439',
  'https://sedentist.com/wp-content/uploads/2021/10/Electric-Toothbrush-1024x682.jpg',
  'https://sedentist.com/wp-content/uploads/elementor/css/post-703.css?ver=1773276874',
  'https://sedentist.com/wp-content/uploads/2021/10/Wisdom-Teeth-Removal-1024x682.jpg',
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

async function downloadWithCookie(url, cookies) {
  const localPath = getLocalPath(url);
  const type = getAssetType(url);
  
  try {
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': BASE_URL + '/',
        'Cookie': cookieHeader
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

    console.log(`  [OK] ${type}: ${url}`);
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

async function main() {
  console.log('='.repeat(60));
  console.log('Asset Retry - Using Browser Cookies');
  console.log('='.repeat(60));
  
  ensureDir(ASSETS_DIR);
  ensureDir(path.join(ASSETS_DIR, 'css'));
  ensureDir(path.join(ASSETS_DIR, 'js'));
  ensureDir(path.join(ASSETS_DIR, 'images'));
  ensureDir(path.join(ASSETS_DIR, 'fonts'));
  ensureDir(path.join(ASSETS_DIR, 'media'));

  console.log('\nLaunching browser to get Cloudflare clearance...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();
  
  console.log('Loading homepage to clear Cloudflare...');
  await page.goto(BASE_URL + '/', { 
    waitUntil: ['networkidle2', 'domcontentloaded'],
    timeout: 120000 
  });
  
  await sleep(5000);
  
  const cookies = await page.cookies(BASE_URL);
  console.log(`Got ${cookies.length} cookies`);
  
  if (cookies.length === 0) {
    console.log('WARNING: No cookies received. Cloudflare may still be blocking.');
  }
  
  await browser.close();

  console.log(`\nRetrying ${FAILED_URLS.length} failed assets with cookies...\n`);
  
  for (let i = 0; i < FAILED_URLS.length; i++) {
    const url = FAILED_URLS[i];
    console.log(`[${i + 1}/${FAILED_URLS.length}]`);
    await downloadWithCookie(url, cookies);
    await sleep(500);
  }

  manifest.generated = new Date().toISOString();
  
  const existingLedger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf-8'));
  const mergedAssets = [...existingLedger.assets, ...manifest.assets];
  const mergedFailed = [...(existingLedger.failed || []), ...manifest.failed];
  
  const finalLedger = {
    ...existingLedger,
    assets: mergedAssets,
    failed: mergedFailed,
    totalAssets: mergedAssets.filter(a => a.status === 'downloaded').length,
    totalFailed: mergedFailed.length,
    retryGenerated: manifest.generated
  };
  
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(finalLedger, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('RETRY SUMMARY');
  console.log('='.repeat(60));
  console.log(`Downloaded: ${manifest.totalAssets}`);
  console.log(`Failed: ${manifest.failed.length}`);
  console.log(`Total assets now: ${finalLedger.totalAssets}`);
  console.log(`Total failed: ${finalLedger.totalFailed}`);
}

main().catch(console.error);
