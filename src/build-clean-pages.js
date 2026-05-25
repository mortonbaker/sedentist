const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT_DIR = 'C:\\Users\\morto\\Code\\sedentist';
const PAGES_DIR = path.join(ROOT_DIR, 'src', 'crawled-pages');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const OUTPUT_DIR = path.join(ROOT_DIR, 'pages');

const BASE_URL = 'https://sedentist.com';
const SITE_NAME = 'Southeast Dental';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getLocalAssetPath(url) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:')) return null;
  
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname !== 'sedentist.com') return null;
    
    const pathname = urlObj.pathname;
    
    if (pathname.startsWith('/wp-content/')) {
      const relativePath = pathname.replace('/wp-content/', '');
      const localPath = path.join(ASSETS_DIR, relativePath);
      if (fs.existsSync(localPath)) {
        return '/' + path.relative(OUTPUT_DIR, localPath).replace(/\\/g, '/');
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

function extractMainImage(html, page) {
  const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (ogImageMatch) {
    const localPath = getLocalAssetPath(ogImageMatch[1]);
    if (localPath) return { src: localPath, alt: page.title || '' };
  }
  
  const imgMatches = [...html.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g)];
  for (const match of imgMatches) {
    const src = match[1];
    if (!src.includes('google-analytics') && !src.includes('facebook') && !src.includes('wp-includes')) {
      const localPath = getLocalAssetPath(src);
      if (localPath) {
        const altMatch = match[0].match(/alt="([^"]*)"/);
        return { src: localPath, alt: altMatch ? altMatch[1] : '' };
      }
    }
  }
  
  return null;
}

function extractPageContent(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const title = document.querySelector('title')?.textContent?.replace(/ - Southeast Dental$/, '') || '';
  
  const h1 = document.querySelector('h1')?.textContent?.trim() || title;
  
  const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.querySelector('.elementor-section-wrap') || document.body;
  
  const paragraphs = [];
  const headings = [];
  const lists = [];
  const faqs = [];
  
  const elements = main.querySelectorAll('p, h2, h3, h4, li, blockquote, .elementor-toggle-item, .wp-block-post-content');
  
  for (const el of elements) {
    const text = el.textContent?.trim();
    if (!text || text.length < 20) continue;
    
    if (el.tagName === 'P') {
      paragraphs.push(text);
    } else if (/^H[2-4]$/.test(el.tagName)) {
      headings.push({ level: el.tagName, text });
    } else if (el.tagName === 'LI') {
      lists.push(text);
    } else if (el.classList.contains('elementor-toggle-item')) {
      const question = el.querySelector('.elementor-toggle-title')?.textContent?.trim();
      const answer = el.querySelector('.elementor-toggle-content')?.textContent?.trim();
      if (question && answer) {
        faqs.push({ question, answer });
      }
    }
    const isFaqItem = el.classList.contains('wp-block-details') || el.classList.contains('faq');
    if (isFaqItem) {
      const summaryEl = el.querySelector('summary') || el.querySelector('dt');
      const detailsEl = el.querySelector('dd') || el.querySelector('p:not(:first-child)');
      if (summaryEl && detailsEl) {
        faqs.push({ question: summaryEl.textContent.trim(), answer: detailsEl.textContent.trim() });
      }
    }
  }
  
  const contentBlocks = [];
  let currentBlock = null;
  
  for (const p of paragraphs) {
    const headingMatch = headings.find(h => {
      const headingIndex = paragraphs.indexOf(p);
      const hIndex = paragraphs.indexOf(headings.find(hd => hd.text === p)?.text);
      return false;
    });
    
    const isHeading = headings.some(h => {
      const hIdx = paragraphs.indexOf(headings.find(hd => hd.text === p)?.text);
      const pIdx = paragraphs.indexOf(p);
      return Math.abs(hIdx - pIdx) < 3;
    });
    
    if (!currentBlock || currentBlock.type !== 'paragraph') {
      if (currentBlock) contentBlocks.push(currentBlock);
      currentBlock = { type: 'paragraph', items: [p] };
    } else {
      currentBlock.items.push(p);
    }
  }
  if (currentBlock) contentBlocks.push(currentBlock);
  
  for (const heading of headings) {
    contentBlocks.push({ type: 'heading', level: heading.level, text: heading.text });
  }
  
  if (lists.length > 0) {
    contentBlocks.push({ type: 'list', items: lists });
  }
  
  return { title, h1, paragraphs, headings, lists, faqs, contentBlocks };
}

function getPageType(filename) {
  if (filename === 'index.html') return 'home';
  if (filename === 'contact.html') return 'contact';
  if (filename === 'about.html') return 'about';
  if (filename === 'gallery.html') return 'gallery';
  if (filename === 'testimonial.html') return 'testimonial';
  if (filename.startsWith('services_')) return 'service';
  if (filename === 'blog.html') return 'blog-listing';
  if (filename.includes('-')) return 'blog';
  if (filename.includes('_')) return 'archive';
  return 'page';
}

function buildNavHtml(currentPath) {
  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/services/', label: 'Services' },
    { href: '/about/', label: 'About' },
    { href: '/gallery/', label: 'Gallery' },
    { href: '/contact/', label: 'Contact' },
  ];
  
  return navItems.map(item => {
    const isActive = currentPath === item.href || (currentPath === '/' && item.href === '/');
    return `<li><a href="${item.href}" class="${isActive ? 'active' : ''}">${item.label}</a></li>`;
  }).join('');
}

function buildFooterHtml() {
  return `
    <footer>
      <div class="container">
        <div class="footer-content">
          <div class="footer-section">
            <h4>${SITE_NAME}</h4>
            <p>Providing quality dental care to Southeast Dental patients.</p>
          </div>
          <div class="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/services/">Services</a></li>
              <li><a href="/about/">About Us</a></li>
              <li><a href="/contact/">Contact</a></li>
            </ul>
          </div>
          <div class="footer-section">
            <h4>Services</h4>
            <ul>
              <li><a href="/services/family-dentistry/">Family Dentistry</a></li>
              <li><a href="/services/implants/">Dental Implants</a></li>
              <li><a href="/services/crown/">Crowns</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  `;
}

function buildHeroHtml(page) {
  const image = page.mainImage;
  
  if (image) {
    return `
    <section class="hero" style="background-image: linear-gradient(rgba(0,77,128,0.8), rgba(0,77,128,0.8)), url('${image.src}'); background-size: cover; background-position: center;">
      <div class="container">
        <h1>${page.h1 || page.title}</h1>
        ${page.excerpt ? `<p>${page.excerpt}</p>` : ''}
        <div class="hero-buttons">
          <a href="/contact/" class="btn btn-white">Schedule Appointment</a>
          <a href="/services/" class="btn btn-secondary">Our Services</a>
        </div>
      </div>
    </section>`;
  }
  
  return `
  <section class="hero">
    <div class="container">
      <h1>${page.h1 || page.title}</h1>
      ${page.excerpt ? `<p>${page.excerpt}</p>` : ''}
    </div>
  </section>`;
}

function buildContentHtml(page) {
  if (!page.content || page.content.length === 0) return '';
  
  let html = '<div class="section"><div class="container">';
  
  for (const block of page.content) {
    if (block.type === 'heading') {
      html += `<h${block.level.replace('H', '')}>${block.text}</h${block.level.replace('H', '')}>`;
    } else if (block.type === 'paragraph') {
      for (const p of block.items) {
        html += `<p>${p}</p>`;
      }
    } else if (block.type === 'list') {
      html += '<ul>';
      for (const item of block.items) {
        html += `<li>${item}</li>`;
      }
      html += '</ul>';
    }
  }
  
  html += '</div></div>';
  return html;
}

function buildFaqHtml(faqs) {
  if (!faqs || faqs.length === 0) return '';
  
  let html = '<section class="section section-muted"><div class="container"><h2>Frequently Asked Questions</h2><div class="faq-list">';
  
  for (const faq of faqs) {
    html += `
    <div class="faq-item">
      <div class="faq-question">${faq.question} <span>+</span></div>
      <div class="faq-answer">${faq.answer}</div>
    </div>`;
  }
  
  html += '</div></div></section>';
  return html;
}

function buildServicesGrid(services) {
  if (!services || services.length === 0) return '';
  
  return `
  <section class="section">
    <div class="container">
      <div class="section-header">
        <h2>Our Services</h2>
        <p>Comprehensive dental care for your whole family</p>
      </div>
      <div class="services-grid">
        ${services.map(s => `
        <div class="service-card">
          <h3>${s.title}</h3>
          <p>${s.excerpt}</p>
          <a href="${s.href}">Learn More &rarr;</a>
        </div>`).join('')}
      </div>
    </div>
  </section>`;
}

function generatePage(filename, page, content) {
  const pageType = getPageType(filename);
  const slug = filename.replace('.html', '').replace(/_/g, '-');
  const pathSlug = slug === 'home' ? '/' : `/${slug}/`;
  
  const schemaScripts = [];
  
  schemaScripts.push({
    "@context": "https://schema.org",
    "@type": "Dentist",
    "name": SITE_NAME,
    "description": `${SITE_NAME} provides comprehensive dental care.`,
    "url": BASE_URL,
    "telephone": "TODO: Add phone",
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
  });
  
  if (pageType === 'home') {
    schemaScripts.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": SITE_NAME,
      "url": BASE_URL,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${BASE_URL}/?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    });
  }
  
  if (pageType === 'service') {
    schemaScripts.push({
      "@context": "https://schema.org",
      "@type": "Service",
      "name": page.title,
      "description": page.excerpt || page.title,
      "provider": { "@type": "Dentist", "name": SITE_NAME }
    });
    if (page.mainImage) {
      schemaScripts.push({
        "@context": "https://schema.org",
        "@type": "ImageObject",
        "url": `${BASE_URL}${page.mainImage.src}`,
        "description": page.mainImage.alt
      });
    }
  }
  
  if (pageType === 'blog' && page.author) {
    schemaScripts.push({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": page.title,
      "author": { "@type": "Person", "name": page.author },
      "publisher": { "@type": "Dentist", "name": SITE_NAME }
    });
  }
  
  if (pageType === 'contact') {
    schemaScripts.push({
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "name": `Contact ${SITE_NAME}`,
      "url": `${BASE_URL}/contact/`
    });
  }
  
  schemaScripts.push({
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "cssSelector": ["h1", "h2"],
    "xpath": []
  });
  
  let bodyHtml = '';
  
  if (pageType === 'home') {
    bodyHtml = `
    ${buildHeroHtml(page)}
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2>Welcome to ${SITE_NAME}</h2>
          <p>Your trusted partner for dental care in the Southeast</p>
        </div>
        ${buildContentHtml(page)}
      </div>
    </section>
    ${buildServicesGrid([
      { title: 'Family Dentistry', href: '/services/family-dentistry/', excerpt: 'Comprehensive care for the whole family' },
      { title: 'Dental Implants', href: '/services/implants/', excerpt: 'Restore your smile with permanent implants' },
      { title: 'Crowns & Bridges', href: '/services/crown/', excerpt: 'Protect and restore damaged teeth' },
    ])}
    ${buildFaqHtml(page.faqs)}`;
  } else if (pageType === 'service') {
    bodyHtml = `
    ${buildHeroHtml(page)}
    <section class="section">
      <div class="container">
        <div class="breadcrumb">
          <a href="/">Home</a> &rsaquo; <a href="/services/">Services</a> &rsaquo; <span>${page.title}</span>
        </div>
        ${page.mainImage ? `<img src="${page.mainImage.src}" alt="${page.mainImage.alt}" class="service-image" loading="lazy">` : ''}
        ${buildContentHtml(page)}
      </div>
    </section>
    ${buildFaqHtml(page.faqs)}`;
  } else if (pageType === 'blog') {
    bodyHtml = `
    ${buildHeroHtml(page)}
    <section class="section">
      <div class="container">
        <div class="post-content">
          ${page.mainImage ? `<img src="${page.mainImage.src}" alt="${page.mainImage.alt}" class="post-image" loading="lazy">` : ''}
          <div class="post-meta">By ${page.author || 'Dr. Rube'} | ${SITE_NAME}</div>
          ${buildContentHtml(page)}
        </div>
      </div>
    </section>
    ${buildFaqHtml(page.faqs)}`;
  } else if (pageType === 'contact') {
    bodyHtml = `
    ${buildHeroHtml(page)}
    <section class="section">
      <div class="container">
        <div class="info-grid">
          <div class="info-box">
            <h3>Contact Information</h3>
            <p><strong>Phone:</strong> TODO: Add phone</p>
            <p><strong>Email:</strong> TODO: Add email</p>
            <p><strong>Address:</strong> TODO: Add address</p>
          </div>
          <div class="info-box">
            <h3>Office Hours</h3>
            <p>Monday - Friday: 8am - 5pm</p>
            <p>Saturday: By Appointment</p>
            <p>Sunday: Closed</p>
          </div>
        </div>
        <div class="contact-form">
          <h3>Send Us a Message</h3>
          <form>
            <div class="form-group">
              <label>Name</label>
              <input type="text" name="name" required>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" name="email" required>
            </div>
            <div class="form-group">
              <label>Phone</label>
              <input type="tel" name="phone">
            </div>
            <div class="form-group">
              <label>Message</label>
              <textarea name="message" rows="5" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Send Message</button>
          </form>
        </div>
      </div>
    </section>`;
  } else {
    bodyHtml = `
    ${buildHeroHtml(page)}
    <section class="section">
      <div class="container">
        <div class="post-content">
          ${buildContentHtml(page)}
        </div>
      </div>
    </section>`;
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <title>${page.title} - ${SITE_NAME}</title>
  <meta name="description" content="${page.excerpt || page.title + ' - ' + SITE_NAME}">
  <link rel="canonical" href="${BASE_URL}${pathSlug}">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <link href="/src/index.css" rel="stylesheet">
  
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🦷</text></svg>">
  
  ${schemaScripts.map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n  </script>`).join('\n  ')}
</head>
<body>
  <header>
    <nav class="container">
      <a href="/" class="logo">${SITE_NAME}</a>
      <ul class="nav-links">
        ${buildNavHtml(pathSlug)}
      </ul>
    </nav>
  </header>
  
  <main>
    ${bodyHtml}
  </main>
  
  ${buildFooterHtml()}
  
  <script>
    document.querySelectorAll('.faq-question').forEach(button => {
      button.addEventListener('click', () => {
        const item = button.parentElement;
        const answer = item.querySelector('.faq-answer');
        const isOpen = item.classList.contains('open');
        
        document.querySelectorAll('.faq-item.open').forEach(openItem => {
          openItem.classList.remove('open');
          openItem.querySelector('.faq-answer').style.display = 'none';
          openItem.querySelector('.faq-question span').textContent = '+';
        });
        
        if (!isOpen) {
          item.classList.add('open');
          answer.style.display = 'block';
          button.querySelector('span').textContent = '−';
        }
      });
    });
  </script>
</body>
</html>`;
  
  return html;
}

async function main() {
  console.log('Building clean static pages from crawled content...\n');
  
  ensureDir(OUTPUT_DIR);
  
  const cssSource = path.join(ROOT_DIR, 'src', 'index.css');
  if (fs.existsSync(cssSource)) {
    fs.copyFileSync(cssSource, path.join(OUTPUT_DIR, 'src', 'index.css'));
  }
  
  const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.html') && f !== 'manifest.json');
  
  console.log(`Processing ${files.length} pages...\n`);
  
  for (const file of files) {
    const inputPath = path.join(PAGES_DIR, file);
    const html = fs.readFileSync(inputPath, 'utf8');
    
    const content = extractPageContent(html);
    const mainImage = extractMainImage(html, { title: content.title });
    
    const page = {
      title: content.title,
      h1: content.h1,
      excerpt: content.paragraphs[0] || '',
      paragraphs: content.paragraphs,
      headings: content.headings,
      lists: content.lists,
      faqs: content.faqs,
      content: content.contentBlocks || [],
      mainImage,
      author: html.includes('rothrube') ? 'Dr. Rube' : null
    };
    
    const outputHtml = generatePage(file, page, content);
    
    const outputPath = path.join(OUTPUT_DIR, file);
    fs.writeFileSync(outputPath, outputHtml, 'utf8');
    
    console.log(`[OK] ${file} - ${page.title}`);
  }
  
  fs.copyFileSync(path.join(ROOT_DIR, '_headers'), path.join(OUTPUT_DIR, '_headers'));
  fs.copyFileSync(path.join(ROOT_DIR, '_redirects'), path.join(OUTPUT_DIR, '_redirects'));
  
  console.log('\nBuild complete!');
  console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch(console.error);
