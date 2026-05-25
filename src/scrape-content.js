const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://sedentist.com';
const OUTPUT_DIR = 'C:\\Users\\morto\\Code\\sedentist';
const PAGES_DIR = path.join(OUTPUT_DIR, 'src', 'crawled-pages');

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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function urlToFilePath(url) {
  const urlObj = new URL(url);
  let pathname = urlObj.pathname;
  
  if (pathname === '/' || pathname === '') {
    return path.join(PAGES_DIR, 'index.html');
  }
  
  pathname = pathname.replace(/\/$/, '');
  const safePath = pathname.replace(/^\//, '').replace(/\//g, '_');
  
  if (safePath.includes('.')) {
    return path.join(PAGES_DIR, safePath + '.html');
  }
  
  return path.join(PAGES_DIR, safePath + '.html');
}

function getPageSlug(url) {
  const urlObj = new URL(url);
  let pathname = urlObj.pathname;
  
  if (pathname === '/' || pathname === '') {
    return 'home';
  }
  
  pathname = pathname.replace(/\/$/, '').replace(/^\//, '');
  return pathname.replace(/\//g, '-');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function crawlPage(browser, url) {
  const page = await browser.newPage();
  
  const result = {
    url,
    slug: getPageSlug(url),
    success: false,
    title: null,
    html: null,
    error: null
  };
  
  try {
    console.log(`\nCrawling: ${url}`);
    
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br'
    });
    
    const response = await page.goto(url, { 
      waitUntil: ['networkidle2', 'domcontentloaded'],
      timeout: 90000 
    });
    
    const status = response ? response.status() : 0;
    console.log(`  Status: ${status}`);
    
    if (status >= 400) {
      result.error = `HTTP ${status}`;
      console.log(`  [FAIL] HTTP ${status}`);
      return result;
    }
    
    await sleep(5000);
    
    result.title = await page.title();
    console.log(`  Title: ${result.title}`);
    
    result.html = await page.content();
    
    const htmlLength = result.html.length;
    console.log(`  HTML size: ${(htmlLength / 1024).toFixed(1)} KB`);
    
    result.success = true;
    
  } catch (error) {
    result.error = error.message;
    console.log(`  [ERROR] ${error.message}`);
  } finally {
    await page.close();
  }
  
  return result;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Content Scraper for sedentist.com');
  console.log('='.repeat(60));
  console.log(`\nStarting at ${new Date().toISOString()}`);
  console.log(`Output directory: ${PAGES_DIR}`);
  
  ensureDir(PAGES_DIR);
  
  console.log('\nInitializing headless browser...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--ignore-certificate-errors',
      '--window-size=1920,1080',
      '--disable-gpu'
    ]
  });
  
  const results = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < SITEMAP_URLS.length; i++) {
    const url = SITEMAP_URLS[i];
    console.log(`\n[${i + 1}/${SITEMAP_URLS.length}]`);
    
    const result = await crawlPage(browser, url);
    results.push(result);
    
    if (result.success) {
      successCount++;
      
      const filePath = urlToFilePath(url);
      const dir = path.dirname(filePath);
      ensureDir(dir);
      
      fs.writeFileSync(filePath, result.html, 'utf8');
      console.log(`  [OK] Saved to: ${path.relative(PAGES_DIR, filePath)}`);
    } else {
      failCount++;
    }
    
    if (i < SITEMAP_URLS.length - 1) {
      await sleep(3000);
    }
  }
  
  await browser.close();
  
  const manifest = {
    generated: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalUrls: SITEMAP_URLS.length,
    successCount,
    failCount,
    pages: results.map(r => ({
      url: r.url,
      slug: r.slug,
      title: r.title,
      success: r.success,
      error: r.error,
      filePath: r.success ? path.relative(PAGES_DIR, urlToFilePath(r.url)) : null
    }))
  };
  
  const manifestPath = path.join(PAGES_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total URLs: ${SITEMAP_URLS.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`\nManifest saved to: ${manifestPath}`);
  console.log(`Crawled pages saved to: ${PAGES_DIR}`);
  
  if (failCount > 0) {
    console.log('\nFailed URLs:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.url}: ${r.error}`);
    });
  }
}

main().catch(console.error);
