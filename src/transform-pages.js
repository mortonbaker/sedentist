const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Users\\morto\\Code\\sedentist';
const PAGES_DIR = path.join(ROOT_DIR, 'src', 'crawled-pages');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const OUTPUT_DIR = path.join(ROOT_DIR, 'pages');

const BASE_URL = 'https://sedentist.com';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function urlToLocalAssetPath(url) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return null;
  
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname !== 'sedentist.com' && !urlObj.hostname.endsWith('.sedentist.com')) {
      return null;
    }
    
    let pathname = urlObj.pathname;
    
    if (pathname.startsWith('/wp-content/')) {
      const assetPath = pathname.replace('/wp-content/', '');
      const localPath = path.join(ASSETS_DIR, 'images', assetPath.replace(/[^a-zA-Z0-9._-]/g, '_'));
      if (fs.existsSync(localPath)) {
        return localPath;
      }
    }
    
    if (pathname.startsWith('/assets/')) {
      const assetRel = pathname.replace('/assets/', '');
      const parts = assetRel.split('/');
      if (parts.length >= 2) {
        const type = parts[0];
        const filename = parts.slice(1).join('_');
        const localPath = path.join(ASSETS_DIR, type, filename);
        if (fs.existsSync(localPath)) {
          return localPath;
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

function rewriteAssets(html) {
  let result = html;
  
  result = result.replace(/href=["'](https:\/\/sedentist\.com\/wp-content\/[^"']+)["']/g, (match, url) => {
    const localPath = urlToLocalAssetPath(url);
    if (localPath) {
      const relPath = path.relative(OUTPUT_DIR, localPath).replace(/\\/g, '/');
      return `href="/${relPath}"`;
    }
    return match;
  });
  
  result = result.replace(/src=["'](https:\/\/sedentist\.com\/wp-content\/[^"']+)["']/g, (match, url) => {
    const localPath = urlToLocalAssetPath(url);
    if (localPath) {
      const relPath = path.relative(OUTPUT_DIR, localPath).replace(/\\/g, '/');
      return `src="/${relPath}"`;
    }
    return match;
  });
  
  result = result.replace(/srcset=["']([^"']+)["']/g, (match, srcset) => {
    const rewritten = srcset.split(',').map(src => {
      const [url, size] = src.trim().split(/\s+/);
      const localPath = urlToLocalAssetPath(url);
      if (localPath) {
        const relPath = path.relative(OUTPUT_DIR, localPath).replace(/\\/g, '/');
        return `/assets/images/${path.basename(localPath)} ${size || ''}`.trim();
      }
      return src;
    }).join(', ');
    return `srcset="${rewritten}"`;
  });
  
  return result;
}

function rewriteFonts(html) {
  let result = html;
  
  result = result.replace(/href=["']https:\/\/fonts\.googleapis\.com\/css2\?family=[^"']+["']/g, 
    'href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap"');
  
  result = result.replace(/href=["']https:\/\/fonts\.gstatic\.com\/[^"']+\.woff2\?["']/g, 
    'href="/assets/fonts/dm-serif-display.woff2"');
  
  result = result.replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com"[^>]*>/g, '');
  
  return result;
}

function addEnhancedSchema(html, pageType, pageSlug) {
  const siteName = 'Southeast Dental';
  const siteUrl = 'https://sedentist.com';
  
  const dentistSchema = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    "name": siteName,
    "description": "Southeast Dental provides comprehensive dental care including family dentistry, cosmetic dentistry, dental implants, and more.",
    "url": siteUrl,
    "telephone": "TODO: Add phone number",
    "email": "TODO: Add email",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "TODO: Add address",
      "addressLocality": "TODO: Add city",
      "addressRegion": "TODO: Add state",
      "postalCode": "TODO: Add zip",
      "addressCountry": "US"
    },
    "priceRange": "$$",
    "medicalSpecialty": "https://schema.org/Dentistry",
    "acceptsNewPatients": true,
    "sameAs": []
  };
  
  let schemas = [{ ...dentistSchema }];
  
  if (pageType === 'home') {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": siteName,
      "url": siteUrl,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${siteUrl}/?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    });
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": siteName,
      "url": siteUrl,
      "description": "Southeast Dental - Professional dental care in your area."
    });
  }
  
  if (pageType === 'service') {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Service",
      "name": pageSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      "description": `Professional dental service provided by ${siteName}.`,
      "provider": { "@type": "Dentist", "name": siteName }
    });
  }
  
  if (pageType === 'blog') {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Article",
      "name": pageSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      "author": { "@type": "Person", "name": "Dr. Rube" },
      "publisher": { "@type": "Dentist", "name": siteName }
    });
  }
  
  schemas.push({
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "cssSelector": ["h1", "h2", ".faq-answer"],
    "xpath": []
  });
  
  const schemaScripts = schemas.map(s => 
    `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n  </script>`
  ).join('\n');
  
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${schemaScripts}\n</head>`);
  }
  
  return html;
}

function cleanHtml(html) {
  let result = html;
  
  result = result.replace(/<script id="facebook-jssdk"[^>]*>[\s\S]*?<\/script>/g, '');
  
  result = result.replace(/<script[^>]*src="https:\/\/connect\.facebook\.net[^"]*"[^>]*><\/script>/g, '');
  
  result = result.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
  
  result = result.replace(/<meta name="ROBOTS" content="NOINDEX, NOFOLLOW">/g, 
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">');
  
  return result;
}

function getPageType(filename) {
  if (filename === 'index.html') return 'home';
  if (filename.startsWith('services_')) return 'service';
  if (filename.includes('-') && !filename.includes('_')) return 'blog';
  if (filename.includes('_')) return 'archive';
  return 'page';
}

function processPage(html, filename) {
  let result = html;
  
  const pageType = getPageType(filename);
  const pageSlug = filename.replace('.html', '').replace(/_/g, '-');
  
  result = rewriteAssets(result);
  result = rewriteFonts(result);
  result = cleanHtml(result);
  result = addEnhancedSchema(result, pageType, pageSlug);
  
  return result;
}

async function main() {
  console.log('Transforming crawled pages to static site...\n');
  
  ensureDir(OUTPUT_DIR);
  
  const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.html') && f !== 'manifest.json');
  
  console.log(`Found ${files.length} pages to transform\n`);
  
  for (const file of files) {
    const inputPath = path.join(PAGES_DIR, file);
    const html = fs.readFileSync(inputPath, 'utf8');
    
    const processed = processPage(html, file);
    
    const outputPath = path.join(OUTPUT_DIR, file);
    fs.writeFileSync(outputPath, processed, 'utf8');
    
    console.log(`[OK] ${file}`);
  }
  
  fs.copyFileSync(path.join(ROOT_DIR, '_headers'), path.join(OUTPUT_DIR, '_headers'));
  fs.copyFileSync(path.join(ROOT_DIR, '_redirects'), path.join(OUTPUT_DIR, '_redirects'));
  
  console.log('\nTransformation complete!');
  console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch(console.error);
