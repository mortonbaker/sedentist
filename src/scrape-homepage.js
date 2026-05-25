const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://sedentist.com';
const OUTPUT_DIR = 'C:\\Users\\morto\\Code\\sedentist\\src\\crawled-pages';
const PAGE_FILE = path.join(OUTPUT_DIR, 'index.html');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('Homepage Scraper for sedentist.com');
  console.log('Trying to bypass Cloudflare challenge...');
  console.log('='.repeat(60));
  
  ensureDir(OUTPUT_DIR);
  
  console.log('\nLaunching browser...');
  
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
      '--disable-gpu',
      '--disable-web-security',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  });
  
  const page = await browser.newPage();
  
  console.log('\nNavigating to homepage...');
  
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\nAttempt ${attempts}/${maxAttempts}...`);
    
    try {
      await page.goto(BASE_URL, { 
        waitUntil: ['networkidle2', 'domcontentloaded'],
        timeout: 60000 
      });
      
      const title = await page.title();
      console.log(`  Title: ${title}`);
      
      if (title.includes('Robot Challenge') || title.includes('Checking your browser')) {
        console.log('  Still on challenge page, waiting longer...');
        await sleep(15000);
        continue;
      }
      
      await sleep(10000);
      
      const html = await page.content();
      
      if (html.includes('Robot Challenge') || html.includes('Checking your browser')) {
        console.log('  Page content still shows challenge, retrying...');
        await page.reload({ waitUntil: ['networkidle2'] });
        await sleep(15000);
        continue;
      }
      
      fs.writeFileSync(PAGE_FILE, html, 'utf8');
      console.log(`\n[OK] Saved homepage to: ${PAGE_FILE}`);
      console.log(`     Size: ${(html.length / 1024).toFixed(1)} KB`);
      
      await browser.close();
      console.log('\nHomepage scrape complete!');
      return;
      
    } catch (error) {
      console.log(`  Error: ${error.message}`);
      if (attempts < maxAttempts) {
        await sleep(5000);
      }
    }
  }
  
  console.log('\nFailed to bypass Cloudflare after all attempts.');
  console.log('Try manually exporting from WordPress admin or use a WordPress XML export.');
  
  await browser.close();
}

main().catch(console.error);
