import { writeFileSync, mkdirSync, existsSync, readFileSync, cpSync, rmSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const pagesDir = join(rootDir, "pages");

const siteUrl = "https://sedentist.com";
const siteName = "Southeast Dental";

const phone = "(334) 370-9055";
const phoneTel = "3343709055";
const email = "SEdentalOM@gmail.com";
const streetAddress = "1865 EAST MAIN STREET SUITE 2";
const cityState = "DOTHAN, AL 36301";
const fullAddress = `${streetAddress} ${cityState}`;
const facebookUrl = "https://www.facebook.com/SoutheastDental.DrLewis/";
const tiktokUrl = "https://www.tiktok.com/@southeastdentaldothan";
const scheduleUrl = "https://dental4.me/southeastdental/";
const patientPortalUrl = "https://southeast.curveconnex.com/";
const mapsUrl = "https://www.google.com/maps?ll=31.218653,-85.36338&z=18&t=m&hl=en-GB&gl=US&mapclient=embed&cid=18273813273315296357";

const img = (slug) => `/assets/images/wp-content_uploads_2022_01_${slug}`;

function parseWordPressXml() {
  const xmlPath = join(rootDir, "southeastdental.WordPress.2026-05-22.xml");
  if (!existsSync(xmlPath)) {
    console.warn("Warning: WordPress XML not found");
    return null;
  }
  const xml = readFileSync(xmlPath, "utf8");
  const items = xml.split("<item>").slice(1);

  const posts = [];
  const pages = [];

  for (const item of items) {
    const get = (re) => { const m = item.match(re); return m ? m[1] : null; };
    const getCdata = (re) => { const m = item.match(re); return m ? m[1] : null; };

    const title = getCdata(/<title><!\[CDATA\[([\s\S]*?)\]\]>/);
    const postName = getCdata(/<wp:post_name><!\[CDATA\[([\s\S]*?)\]\]>/);
    const postType = getCdata(/<wp:post_type><!\[CDATA\[([\s\S]*?)\]\]>/);
    const status = getCdata(/<wp:status><!\[CDATA\[([\s\S]*?)\]\]>/);
    const content = getCdata(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    const postDate = get(/<wp:post_date><!\[CDATA\[(.*?)\]\]>/);
    const categories = [...item.matchAll(/<category domain="category" nicename="([^"]*)"><!\[CDATA\[([^\]]*)\]\]>/g)].map(m => ({ slug: m[1], name: m[2] }));
    const tags = [...item.matchAll(/<category domain="post_tag" nicename="([^"]*)"><!\[CDATA\[([^\]]*)\]\]>/g)].map(m => ({ slug: m[1], name: m[2] }));

    if (status !== "publish") continue;

    const entry = { title, slug: postName, content, date: postDate, categories, tags };
    if (postType === "post") posts.push(entry);
    else if (postType === "page") pages.push(entry);
  }

  return { posts, pages };
}

function extractCleanContent(html) {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/https?:\/\/sedentist\.com\/wp-content\/uploads\//gi, "/assets/images/wp-content_uploads_")
    .replace(/srcset="[^"]*"/gi, "")
    .replace(/sizes="[^"]*"/gi, "")
    .replace(/width="\d*"\s*/gi, "")
    .replace(/height="\d*"\s*/gi, "")
    .trim();
}

const wpData = parseWordPressXml();
const wpPages = wpData ? wpData.pages : [];
const wpPosts = wpData ? wpData.posts : [];

function getWpPage(slug) { return wpPages.find(p => p.slug === slug); }

const allBlogPosts = wpPosts.map(p => ({
  title: p.title,
  slug: p.slug,
  date: p.date ? p.date.substring(0, 10) : "2022-01-30",
  content: extractCleanContent(p.content),
  categories: p.categories,
  tags: p.tags
}));

const allCategories = [];
const allTags = [];
for (const post of allBlogPosts) {
  for (const cat of post.categories) {
    if (!allCategories.find(c => c.slug === cat.slug)) allCategories.push(cat);
  }
  for (const tag of post.tags) {
    if (!allTags.find(t => t.slug === tag.slug)) allTags.push(tag);
  }
}

const services = [
  { name: "Family Dentistry", slug: "family-dentistry", img: "Cute-girl-at-doctors-office.-486155984_5760x3840-768x512-1.jpeg" },
  { name: "General Dentistry", slug: "general-dentistry", img: "happy-family-with-two-daughters-768x512-1.jpeg" },
  { name: "Dental Crowns", slug: "crown", img: "southeastdental06-1.jpeg" },
  { name: "Dentures & Partials", slug: "denture-or-partial", img: "southeastdental07.jpeg" },
  { name: "Tooth Extractions", slug: "extractions", img: "southeastdental08.jpeg" },
  { name: "Dental Implants", slug: "implants", img: "southeastdental09-1.jpeg" },
  { name: "Memory-Free Dentistry", slug: "memory-free-dentistry", img: "southeastdental10.jpeg" },
  { name: "Wisdom Teeth Removal", slug: "wisdom-teeth-removal", img: "southeastdental11.jpeg" },
  { name: "Teeth Whitening", slug: "teeth-whitening", img: "southeastdental12.jpeg" },
  { name: "Root Canals", slug: "root-canals", img: "southeastdental13.png" },
  { name: "Dental Fillings", slug: "fillings", img: "southeastdental14.jpeg" },
  { name: "Dental Cleaning & Exams", slug: "dental-cleaning-exams", img: "southeastdental15.jpeg" },
  { name: "Dental Bonding", slug: "dental-bonding", img: "Dental-bonding-2.jpeg" }
];

const serviceVideos = {
  "implants": "JfVxjgSvwDM",
  "wisdom-teeth-removal": "LsYICqp0v4w",
  "teeth-whitening": "upDgfjrg0wY",
  "root-canals": "pTQx_Y0azi8",
  "fillings": "cPWaqiKZncM",
  "dental-cleaning-exams": "GXApXA3PKAM",
  "dental-bonding": "dYXpT65epd8"
};

const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about/" },
  { label: "Services", href: "/services/" },
  { label: "Testimonials", href: "/testimonial/" },
  { label: "Blog", href: "/blog/" },
  { label: "Gallery", href: "/gallery/" },
  { label: "Contact", href: "/contact/" }
];

function svgIcon(type) {
  const icons = {
    facebook: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    tiktok: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
    hamburger: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#112153" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
    close: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#112153" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>`,
    arrowLeft: `<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
    arrowRight: `<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`
  };
  return icons[type] || "";
}

function generateHeader() {
  return `
  <header class="site-header">
    <div class="container">
      <div class="header-top">
        <div class="header-left">
          <button class="hamburger-toggle" onclick="document.getElementById('mobileMenu').classList.add('active')" aria-label="Open menu">
            ${svgIcon("hamburger")}
          </button>
          <div class="header-contact-info">
            <a href="${mapsUrl}">${streetAddress} ${cityState}</a>
            <a href="tel:${phoneTel}">${phone}</a>
          </div>
        </div>
        <div class="header-logo">
          <a href="/">
            <img src="${img("Southeast-Dental-Logo-Redesign-White-300x107-1.png")}" alt="${siteName}" width="300" height="107">
          </a>
        </div>
        <div class="header-right">
          <div class="social-icons">
            <a href="${facebookUrl}" class="social-icon" target="_blank" rel="noopener" aria-label="Facebook">${svgIcon("facebook")}</a>
            <a href="${tiktokUrl}" class="social-icon" target="_blank" rel="noopener" aria-label="TikTok">${svgIcon("tiktok")}</a>
          </div>
          <div class="header-buttons">
            <a href="${patientPortalUrl}" class="btn btn-sm btn-navy">Patient Portal</a>
            <a href="${scheduleUrl}" class="btn btn-sm btn-navy">Schedule Online</a>
          </div>
        </div>
      </div>
      <div class="mobile-header">
        <div class="mobile-logo">
          <a href="/">
            <img src="${img("Southeast-Dental-Logo-Redesign-White-300x107-1.png")}" alt="${siteName}" style="max-height:45px;width:auto;">
          </a>
        </div>
        <div class="mobile-controls">
          <button onclick="document.getElementById('mobileMenu').classList.add('active')" aria-label="Menu">${svgIcon("hamburger")}</button>
        </div>
      </div>
    </div>
    <div class="nav-bar">
      <nav>
        ${navItems.map(n => `<a href="${n.href}">${n.label}</a>`).join("")}
      </nav>
    </div>
  </header>

  <div id="mobileMenu" class="mobile-menu-overlay">
    <div class="mobile-menu-header">
      <a href="/"><img src="${img("Southeast-Dental-Logo-Redesign-White-300x107-1.png")}" alt="${siteName}" style="max-height:40px;width:auto;"></a>
      <button class="mobile-menu-close" onclick="document.getElementById('mobileMenu').classList.remove('active')" aria-label="Close menu">${svgIcon("close")}</button>
    </div>
    <nav class="mobile-menu-nav">
      ${navItems.map(n => `<a href="${n.href}">${n.label}</a>`).join("")}
    </nav>
    <div class="mobile-menu-footer">
      <div class="mobile-menu-btns">
        <a href="${scheduleUrl}" class="btn btn-md btn-navy" style="width:100%;">Schedule Online</a>
        <a href="${patientPortalUrl}" class="btn btn-md btn-navy" style="width:100%;">Patient Portal</a>
      </div>
      <div class="mobile-menu-social">
        <a href="${facebookUrl}" class="social-icon" target="_blank" rel="noopener">${svgIcon("facebook")}</a>
        <a href="${tiktokUrl}" class="social-icon" target="_blank" rel="noopener">${svgIcon("tiktok")}</a>
      </div>
      <div class="mobile-menu-contact">
        <a href="${mapsUrl}">${streetAddress} ${cityState}</a>
        <a href="tel:${phoneTel}">${phone}</a>
      </div>
    </div>
  </div>`;
}

function generateFooter() {
  return `
  <footer>
    <section class="footer-cta" style="background-image:url('${img("southeastdental15-1.png")}')">
      <div class="container">
        <h2>Want to schedule an appointment?</h2>
        <div class="footer-cta-buttons">
          <a href="${scheduleUrl}" class="btn btn-lg btn-white-solid">Schedule Online</a>
          <a href="/about/" class="btn btn-lg btn-white-solid">Learn More</a>
        </div>
      </div>
    </section>

    <section class="footer-map">
      <iframe src="https://maps.google.com/maps?q=1865+EAST+MAIN+STREET+SUITE+2+DOTHAN%2C+AL+36301&t=m&z=18&output=embed&iwloc=near" title="${siteName} Location" loading="lazy"></iframe>
      <div class="footer-contact-card">
        <div class="contact-card-header">
          <h3>Contacts</h3>
        </div>
        <div class="contact-card-body">
          <div class="contact-item">
            <img src="${img("location-icon.jpg")}" alt="" width="25" height="25">
            <span>${fullAddress}</span>
          </div>
          <div class="contact-item">
            <img src="${img("phone-icon.jpg")}" alt="" width="25" height="25">
            <a href="tel:${phoneTel}">${phone}</a>
          </div>
          <div class="contact-item">
            <img src="${img("mail-icon.jpg")}" alt="" width="25" height="25">
            <a href="mailto:${email}">${email}</a>
          </div>
          <div class="contact-divider"></div>
          <div class="contact-hours">
            <h4>Office Hours</h4>
            <p>Mon: 8am-5pm | Tue: 8am-5pm<br>Wed: 8am-5pm | Thu: 8am-5pm<br>Fri: 8am-5pm | Sat &amp; Sun: Closed</p>
          </div>
        </div>
      </div>
    </section>

    <section class="footer-bottom">
      <div class="footer-bottom-inner">
        <div class="footer-logo">
          <a href="/"><img src="${img("Southeast-Dental-Logo-Redesign-White-300x107-1.png")}" alt="${siteName}"></a>
        </div>
        <nav class="footer-nav">
          ${navItems.map(n => `<a href="${n.href}">${n.label}</a>`).join("")}
        </nav>
        <p class="footer-copyright">Copyright &copy; ${new Date().getFullYear()}. All Rights Reserved</p>
      </div>
    </section>
  </footer>`;
}

function generateHomepage() {
  return `
  <section class="hero-slider">
    <div class="hero-slides" id="heroSlider">
      <div class="hero-slide active" style="background:rgba(255,255,255,0.9);">
        <div class="hero-slide-content">
          <h2>Discover a new dental experience</h2>
          <p>At southeast dental</p>
          <a href="${scheduleUrl}" class="btn btn-lg btn-navy">Schedule Online</a>
        </div>
      </div>
      <div class="hero-slide" style="background:rgba(255,255,255,0.9);">
        <div class="hero-slide-content">
          <h2>No insurance? No problem</h2>
          <p>Click for more information for our in house discount plan</p>
          <a href="/contact/" class="btn btn-lg btn-navy">Learn more</a>
        </div>
      </div>
      <div class="hero-slide" style="background:rgba(255,255,255,0.9);">
        <div class="hero-slide-content">
          <h2>Dental implants for $2499</h2>
          <p>This offer includes implant body, abutment, crown. Does not include cost of grafting or complex cases.</p>
          <a href="/contact/" class="btn btn-lg btn-navy">Learn more</a>
        </div>
      </div>
    </div>
    <button class="hero-slider-arrow prev" onclick="heroSlide(-1)">${svgIcon("arrowLeft")}</button>
    <button class="hero-slider-arrow next" onclick="heroSlide(1)">${svgIcon("arrowRight")}</button>
  </section>

  <section class="section-about">
    <div class="container-narrow">
      <div class="two-col">
        <div class="col video-col">
          <iframe src="https://www.youtube.com/embed/F9D9rYmi2uM?rel=0" title="Southeast Dental Practice Commercial" loading="lazy" allowfullscreen></iframe>
        </div>
        <div class="col text-col">
          <h2>About Our Practice</h2>
          <p>Dr. Lewis started Southeast Dental with two basic philosophies: <strong>evidence-based</strong> dentistry and <strong>patient education.</strong> We believe in doing what is best for our patient's oral health. We strive to educate our patients on the importance of their oral health so they can make the best-informed decisions about their health.</p>
          <a href="/about/" class="btn btn-md btn-gray-outline">Learn More</a>
        </div>
      </div>
    </div>
  </section>

  <section class="section-why-choose">
    <div class="container-narrow">
      <div class="two-col reverse-mobile">
        <div class="col text-col" style="padding:0 17px 0 0;">
          <h2>Why Choose Us?</h2>
          <p>While a large part of what we do at Southeast Dental is aesthetic and very complex treatment driven, the core of what we do is general family care.</p>
          <p>We encourage you to involve yourself in your own treatment and ask questions throughout our relationship. We offer comprehensive services from routine checkups and emergency care to cosmetic makeovers. Call <a href="tel:${phoneTel}"><strong>${phone}</strong></a> for a free consultation.</p>
          <p style="font-size:14px;color:var(--text-gray);">Serving: Abbeville, Ashford, Dothan, Enterprise, Headland, Ozark, Panama City, Marianna, and more.</p>
          <a href="/about/" class="btn btn-md btn-gray-outline">Learn More</a>
        </div>
        <div class="col img-col">
          <img src="${img("southeastdental03.jpeg")}" alt="Southeast Dental office" style="border-radius:25px;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
        </div>
      </div>
    </div>
  </section>

  <section class="section-dr-lewis" style="background-image:url('${img("southeastdental04-1.png")}')">
    <div class="container-narrow">
      <div class="two-col reverse-mobile">
        <div class="col dr-lewis-photo">
          <img class="main-photo" src="${img("sedentist-1.jpeg")}" alt="Dr. Roth Lewis" style="border-radius:25px;">
          <div class="dr-lewis-gallery">
            <img src="${img("southeastdental06-1.png")}" alt="Office photo 1" loading="lazy">
            <img src="${img("southeastdental08-1.jpg")}" alt="Office photo 2" loading="lazy">
            <img src="${img("southeastdental09.png")}" alt="Office photo 3" loading="lazy">
            <img src="${img("southeastdental10.png")}" alt="Office photo 4" loading="lazy">
          </div>
        </div>
        <div class="col dr-lewis-text">
          <h2>Meet Dr. Roth Lewis</h2>
          <p>Dr. Roth Rube Harrison Lewis is a proud native of the area. Dr. Lewis was raised on a local dairy farm in Ashford, AL where he learned the value of education, hard work, dedication, discipline, and Christian family values.</p>
          <p>Dr. Lewis earned his Doctorate in Dental Medicine from the prestigious University of Louisville School of Dentistry in 2016. While attending the University, Dr. Lewis was named a Deans Scholar for his high levels of academic and clinical achievements.</p>
          <p>Dr. Lewis established his own practice in Dothan in 2020.</p>
          <ul>
            <li>American Dental Association</li>
            <li>American Academy of Dental Sleep Medicine</li>
            <li>Alabama Dental Association</li>
            <li>Academy of General Dentistry</li>
            <li>American Academy of Cosmetic Dentistry</li>
          </ul>
          <a href="/about/" class="btn btn-md btn-white-outline">Learn More</a>
        </div>
      </div>
    </div>
  </section>

  <section class="section-services-home" style="background-image:url('${img("southeastdental11.jpeg")}')">
    <div class="container-wide">
      <div class="service-cards-grid">
        ${services.slice(0, 4).map(s => `
        <div class="service-card">
          <img src="${img(s.img)}" alt="${s.name}" loading="lazy">
          <h3>${s.name}</h3>
          <a href="/services/${s.slug}/" class="btn btn-sm btn-navy-outline">Learn More</a>
        </div>`).join("")}
      </div>
    </div>
  </section>

  <section class="section-testimonials-home">
    <div class="container">
      <div class="testimonials-carousel">
        <div class="testimonial-slide active">
          <img src="${img("testimonial_2.png")}" alt="Joshua W.">
          <blockquote>"Dr. Lewis sets high standards for his work. If you want someone who will be honest with you and only do what is necessary, he is your guy."</blockquote>
          <cite>Joshua W.</cite>
        </div>
        <div class="testimonial-slide">
          <img src="${img("testimonial_1.png")}" alt="Mandi K.">
          <blockquote>"Dr. Lewis and his dental assistant came in on their day off to see my emergency. I am so appreciative of their dedication to their patients."</blockquote>
          <cite>Mandi K.</cite>
        </div>
        <button class="carousel-arrow prev" onclick="testSlide(-1)">${svgIcon("arrowLeft")}</button>
        <button class="carousel-arrow next" onclick="testSlide(1)">${svgIcon("arrowRight")}</button>
      </div>
    </div>
  </section>`;
}

function generateAboutPage() {
  return `
  <section class="page-hero-banner" style="background-image:url('${img("southeastdental07.jpeg")}')">
    <div class="page-hero-content">
      <h1 style="color:#fff;font-size:0;">About Southeast Dental</h1>
    </div>
  </section>

  <section style="padding:77px 0 0;">
    <div class="container-narrow">
      <div class="two-col">
        <div class="col text-col">
          <h2>About Our Practice</h2>
          <p>Dr. Lewis started Southeast Dental with two basic philosophies: <strong>evidence-based</strong> dentistry and <strong>patient education.</strong> We believe in doing what is best for our patient's oral health. We strive to educate our patients on the importance of their oral health so they can make the best-informed decisions about their health.</p>
        </div>
        <div class="col video-col">
          <iframe src="https://www.youtube.com/embed/F9D9rYmi2uM?rel=0" title="Southeast Dental Practice Commercial" loading="lazy" allowfullscreen></iframe>
        </div>
      </div>
    </div>
  </section>

  <section style="padding:94px 0 80px;">
    <div class="container-narrow">
      <div class="two-col reverse-mobile">
        <div class="col img-col">
          <img src="${img("southeastdental03.jpeg")}" alt="Southeast Dental office" style="border-radius:25px;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
        </div>
        <div class="col text-col">
          <h2>Why Choose Us?</h2>
          <p>While a large part of what we do at Southeast Dental is aesthetic and very complex treatment driven, the core of what we do is general family care.</p>
          <p>We encourage you to involve yourself in your own treatment and ask questions throughout our relationship. We offer comprehensive services from routine checkups and emergency care to cosmetic makeovers. Call <a href="tel:${phoneTel}"><strong>${phone}</strong></a> for a free consultation.</p>
          <p style="font-size:14px;color:var(--text-gray);">Serving: Abbeville, Ashford, Dothan, Enterprise, Headland, Ozark, Panama City, Marianna, and more across AL, GA, and FL.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section-dr-lewis" style="background-image:url('${img("southeastdental04-1.png")}')">
    <div class="container-narrow">
      <div class="two-col reverse-mobile">
        <div class="col dr-lewis-photo">
          <img class="main-photo" src="${img("sedentist-1.jpeg")}" alt="Dr. Roth Lewis" style="border-radius:25px;">
          <div class="dr-lewis-gallery">
            <img src="${img("southeastdental06-1.png")}" alt="Office photo 1" loading="lazy">
            <img src="${img("southeastdental08-1.jpg")}" alt="Office photo 2" loading="lazy">
            <img src="${img("southeastdental09.png")}" alt="Office photo 3" loading="lazy">
            <img src="${img("southeastdental10.png")}" alt="Office photo 4" loading="lazy">
          </div>
        </div>
        <div class="col dr-lewis-text">
          <h2>Meet Dr. Roth Lewis</h2>
          <p>Dr. Roth Rube Harrison Lewis is a proud native of the area. Dr. Lewis was raised on a local dairy farm in Ashford, AL where he learned the value of education, hard work, dedication, discipline, and Christian family values.</p>
          <p>Dr. Lewis earned his Doctorate in Dental Medicine from the prestigious University of Louisville School of Dentistry (Louisville, KY) in 2016. While attending the University, Dr. Lewis was named a Deans Scholar for his high levels of academic and clinical achievements.</p>
          <p>Prior to attending the University of Louisville, Dr. Lewis went to University of Alabama at Birmingham, UAB (Birmingham, AL) for his undergrad and received a Bachelor's of Art in Spanish graduating Magna Sum Laude.</p>
          <p>Dr. Lewis established his own practice in Dothan in 2020.</p>
          <ul>
            <li>American Dental Association</li>
            <li>American Academy of Dental Sleep Medicine</li>
            <li>Alabama Dental Association</li>
            <li>Academy of General Dentistry</li>
            <li>Kentucky Dental Association</li>
            <li>American Academy of Cosmetic Dentistry</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="section-testimonials-home" style="margin-top:0;">
    <div class="container">
      <div class="testimonials-carousel">
        <div class="testimonial-slide active">
          <img src="${img("testimonial_2.png")}" alt="Joshua W.">
          <blockquote>"Dr. Lewis sets high standards for his work. If you want someone who will be honest with you and only do what is necessary, he is your guy."</blockquote>
          <cite>Joshua W.</cite>
        </div>
        <div class="testimonial-slide">
          <img src="${img("testimonial_1.png")}" alt="Mandi K.">
          <blockquote>"Dr. Lewis and his dental assistant came in on their day off to see my emergency. I am so appreciative of their dedication to their patients."</blockquote>
          <cite>Mandi K.</cite>
        </div>
        <button class="carousel-arrow prev" onclick="testSlide(-1)">${svgIcon("arrowLeft")}</button>
        <button class="carousel-arrow next" onclick="testSlide(1)">${svgIcon("arrowRight")}</button>
      </div>
    </div>
  </section>`;
}

function generateServicesPage() {
  return `
  <section class="services-hero" style="background-image:url('${img("southeastdental11.jpeg")}')">
    <div class="container">
      <h1>Services</h1>
      <p>We encourage you to involve yourself in your own treatment and ask questions throughout our relationship.</p>
      <div class="services-hero-buttons">
        <a href="${scheduleUrl}" class="btn btn-lg btn-navy">Schedule Online</a>
        <a href="/about/" class="btn btn-lg btn-navy-outline" style="background:#fff;">Learn More</a>
      </div>
    </div>
  </section>

  ${services.map((s, i) => `
  <section class="service-section">
    <div class="container-wide">
      <div class="two-col-services ${i % 2 === 0 ? '' : 'reverse-mobile'}">
        <div class="col-text" style="${i % 2 !== 0 ? 'order:2;' : ''}">
          <h2>${s.name}</h2>
          <p>Professional ${s.name.toLowerCase()} services at Southeast Dental. Our experienced team provides personalized care using the latest techniques and technology.</p>
          <a href="/services/${s.slug}/" class="btn btn-md btn-navy-outline">Learn More</a>
        </div>
        <div class="col-img" style="${i % 2 !== 0 ? 'order:1;' : ''}">
          <img src="${img(s.img)}" alt="${s.name}" style="border-radius:25px;box-shadow:0 4px 20px rgba(0,0,0,0.1);" loading="lazy">
        </div>
      </div>
    </div>
  </section>`).join("")}`;
}

function generateTestimonialsPage() {
  const textTestimonials = [
    { quote: "Very cute little dental office. The staff is very nice and Dr. Lewis takes his time and explains everything to you. Will definitely be bringing my kids here.", author: "Zaboria H." },
    { quote: "Loved visiting Southeast Dental. The staff was very friendly and Dr. Lewis was amazing! I will definitely be returning and referring everyone I know!", author: "Felicia P." },
    { quote: "Able to get a appointment in the same week that I called. Very welcoming staff and the doctor took time to explain everything in detail.", author: "Brittany W." },
    { quote: "Online appointment, fast still high quality. I highly recommend Southeast Dental for all your dental needs!", author: "Zaboria H." },
    { quote: "Great staff and very fast!!! Will be coming back again and I would highly recommend Dr. Lewis!", author: "Felicia P." },
    { quote: "The BEST experience at the dentist EVER!!!! From the front desk to the dental assistant and Dr. Lewis, everyone was amazing!", author: "Brittany W." }
  ];

  const videoTestimonials = [
    { img: "testimonia-1-preview.png", videoId: "BwsIN6ErvOg", title: "Video Testimonial 1" },
    { img: "testimonia-2-preview.png", videoId: "p_547WVItQk", title: "Video Testimonial 2" },
    { img: "testimonia-3-preview.png", videoId: "HdcYoWJrEXU", title: "Video Testimonial 3" }
  ];

  return `
  <section>
    <div class="testimonials-grid">
      ${textTestimonials.map(t => `
      <div class="testimonial-card">
        <p class="testimonial-text">${t.quote}</p>
        <div class="testimonial-author">${t.author}</div>
      </div>`).join("")}
    </div>
  </section>

  <section class="video-testimonials">
    <h2>Video Testimonials</h2>
    <div class="video-testimonials-grid">
      ${videoTestimonials.map(v => `
      <div class="video-testimonial-thumb" onclick="openVideo('${v.videoId}')">
        <img src="${img(v.img)}" alt="${v.title}" loading="lazy">
      </div>`).join("")}
    </div>
  </section>

  <div id="videoLightbox" class="video-lightbox">
    <button class="video-lightbox-close" onclick="closeVideo()">&times;</button>
    <iframe id="videoFrame" src="" title="Video Testimonial" allow="autoplay;encrypted-media" allowfullscreen></iframe>
  </div>`;
}

function generateContactPage() {
  return `
  <section style="padding:80px 0;">
    <div class="container-narrow">
      <div class="two-col">
        <div class="col" style="padding:0 20px 0 0;">
          <h2 style="color:var(--navy-light);margin-bottom:20px;">Get in Touch</h2>
          <p style="margin-bottom:20px;">Let our amazing staff help you. Give us a call at <a href="tel:${phoneTel}"><strong>${phone}</strong></a> or email us at <a href="mailto:${email}">${email}</a></p>
          <form class="contact-form" action="mailto:${email}" method="POST" enctype="text/plain">
            <div class="form-group">
              <label for="name">Name</label>
              <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
              <label for="phone">Phone</label>
              <input type="tel" id="phone" name="phone">
            </div>
            <div class="form-group">
              <label for="message">Message</label>
              <textarea id="message" name="message" required></textarea>
            </div>
            <button type="submit" class="btn btn-md btn-navy">Send Message</button>
          </form>
        </div>
        <div class="col" style="padding:0 0 0 20px;">
          <h2 style="color:var(--navy-light);margin-bottom:20px;">Contact Information</h2>
          <p><strong>Address:</strong><br>${fullAddress}</p>
          <p><strong>Phone:</strong><br><a href="tel:${phoneTel}">${phone}</a></p>
          <p><strong>Email:</strong><br><a href="mailto:${email}">${email}</a></p>
          <h3 style="margin-top:1.5rem;font-size:1.25rem;color:var(--navy-light);">Office Hours</h3>
          <p>Monday - Friday: 8:00 AM - 5:00 PM<br>Saturday - Sunday: Closed</p>
          <h3 style="margin-top:1.5rem;font-size:1.25rem;color:var(--navy-light);">Our Location</h3>
          <iframe src="https://maps.google.com/maps?q=1865+EAST+MAIN+STREET+SUITE+2+DOTHAN%2C+AL+36301&t=m&z=14&output=embed&iwloc=near" title="Southeast Dental Location" style="width:100%;height:300px;border:0;margin-top:10px;" loading="lazy"></iframe>
        </div>
      </div>
    </div>
  </section>`;
}

function generateGalleryPage() {
  const galleryImages = [
    { src: img("sedentist-1.jpeg"), alt: "Our dental office" },
    { src: img("southeastdental05.jpeg"), alt: "Modern dental equipment" },
    { src: img("southeastdental06-1.jpeg"), alt: "Dental treatment room" },
    { src: img("southeastdental07-3.jpeg"), alt: "Our team" },
    { src: img("southeastdental08-1.jpeg"), alt: "Waiting area" },
    { src: img("southeastdental09-3.jpeg"), alt: "Practice exterior" }
  ];
  return `
  <section style="padding:80px 0;">
    <div class="container">
      <div class="gallery-grid">
        ${galleryImages.map(i => `<div class="gallery-item"><img src="${i.src}" alt="${i.alt}" loading="lazy"></div>`).join("")}
      </div>
    </div>
  </section>`;
}

function generateBlogPage() {
  return `
  <section style="padding:80px 0;">
    <div class="container">
      <div class="blog-grid">
        ${allBlogPosts.map(p => `
        <article class="blog-card">
          <div class="blog-card-content">
            <h3><a href="/${p.slug}/">${p.title}</a></h3>
            <p>Read about ${p.title.toLowerCase()} in our latest article.</p>
            <div class="blog-card-meta">
              <span>${p.date}</span>
              <span>By Dr. Lewis</span>
            </div>
          </div>
        </article>`).join("")}
      </div>
    </div>
  </section>`;
}

function generateServiceSubpage(route) {
  const s = services.find(s => route.path.includes(s.slug));
  const videoId = s ? serviceVideos[s.slug] : null;
  const wpPage = getWpPage(s ? s.slug : "");
  const wpContent = wpPage ? extractCleanContent(wpPage.content) : null;

  return `
  <section class="service-subpage">
    <div class="container-wide">
      ${videoId ? `
      <div class="two-col">
        <div class="col video-col">
          <iframe src="https://www.youtube.com/embed/${videoId}?rel=0" title="${route.serviceName || s.name}" loading="lazy" allowfullscreen></iframe>
        </div>
        <div class="col text-col">
          <h1>${route.serviceName || s.name}</h1>
          ${wpContent && wpContent.length > 100 ? `<div class="post-content">${wpContent}</div>` : `<p>Professional ${(route.serviceName || s.name).toLowerCase()} services at Southeast Dental. Our experienced team provides personalized care using the latest techniques and technology.</p>`}
        </div>
      </div>` : `
      <div class="container-narrow">
        <h1 style="color:var(--text-gray);font-family:var(--font-heading);font-size:clamp(28px,4vw,40px);font-weight:400;margin-bottom:20px;">${route.serviceName || s.name}</h1>
        ${wpContent && wpContent.length > 100 ? `<div class="post-content">${wpContent}</div>` : `<p>Professional ${(route.serviceName || s.name).toLowerCase()} services at Southeast Dental. Our experienced team provides personalized care using the latest techniques and technology.</p>`}
      </div>`}
      <div style="margin-top:3rem;">
        <h3 style="color:var(--navy-light);margin-bottom:1rem;">Other Services</h3>
        <ul class="services-list">
          ${services.filter(sv => !route.path.includes(sv.slug)).slice(0, 6).map(sv => `<li><a href="/services/${sv.slug}/">${sv.name}</a></li>`).join("")}
        </ul>
      </div>
    </div>
  </section>`;
}

function generatePostPage(route) {
  const wpContent = route.wpContent;
  const postTitle = route.title.split(` - ${siteName}`)[0];
  const post = allBlogPosts.find(p => route.path.includes(p.slug));

  return `
  <section style="padding:80px 0;">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>/</span> <a href="/blog/">Blog</a> <span>/</span> <span>${postTitle}</span>
      </nav>
      <article class="post-content">
        <h1>${postTitle}</h1>
        ${route.date ? `<p class="post-meta">Published on ${route.date} by Dr. Lewis</p>` : ''}
        ${wpContent && wpContent.length > 100 ? wpContent : `<p>${route.description}</p><p><a href="/contact/">Contact us</a> to learn more or schedule an appointment.</p>`}
      </article>
      ${post && post.categories.length ? `<div style="margin-top:2rem;padding-top:2rem;border-top:1px solid var(--border-light);"><p><strong>Categories:</strong></p><ul class="category-list">${post.categories.map(c => `<li><a href="/category/${c.slug}/">${c.name}</a></li>`).join(" ")}</ul></div>` : ''}
      ${post && post.tags.length ? `<div style="margin-top:1rem;"><p><strong>Tags:</strong></p><ul class="tag-list">${post.tags.map(t => `<li><a href="/tag/${t.slug}/">${t.name}</a></li>`).join(" ")}</ul></div>` : ''}
    </div>
  </section>`;
}

function generateCategoryPage(route) {
  const name = route.categoryName;
  const catPosts = allBlogPosts.filter(p => p.categories.some(c => c.slug === route.path.split("/")[2]));
  const displayPosts = catPosts.length > 0 ? catPosts : allBlogPosts.slice(0, 6);
  return `
  <section style="padding:80px 0;">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>/</span> <a href="/blog/">Blog</a> <span>/</span> <span>${name}</span>
      </nav>
      <h1>${name}</h1>
      <p style="margin:1rem 0 2rem;">Browse all posts in the ${name} category.</p>
      <div class="blog-grid">
        ${displayPosts.map(p => `
        <article class="blog-card">
          <div class="blog-card-content">
            <h3><a href="/${p.slug}/">${p.title}</a></h3>
            <p>Read about ${p.title.toLowerCase()} in our latest article.</p>
            <div class="blog-card-meta"><span>${p.date}</span><span>By Dr. Lewis</span></div>
          </div>
        </article>`).join("")}
      </div>
    </div>
  </section>`;
}

function generateTagPage(route) {
  const name = route.tagName;
  const tagPosts = allBlogPosts.filter(p => p.tags.some(t => t.slug === route.path.split("/")[2]));
  const displayPosts = tagPosts.length > 0 ? tagPosts : allBlogPosts.slice(0, 6);
  return `
  <section style="padding:80px 0;">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a> <span>/</span> <a href="/blog/">Blog</a> <span>/</span> <span>Tag: ${name}</span>
      </nav>
      <h1>Tag: ${name}</h1>
      <p style="margin:1rem 0 2rem;">Browse all posts tagged with "${name}".</p>
      <div class="blog-grid">
        ${displayPosts.map(p => `
        <article class="blog-card">
          <div class="blog-card-content">
            <h3><a href="/${p.slug}/">${p.title}</a></h3>
            <p>Read about ${p.title.toLowerCase()} in our latest article.</p>
            <div class="blog-card-meta"><span>${p.date}</span><span>By Dr. Lewis</span></div>
          </div>
        </article>`).join("")}
      </div>
    </div>
  </section>`;
}

function generatePatientInfoPage() {
  return `
  <section style="padding:80px 0;">
    <div class="container-narrow">
      <h1 style="color:var(--navy-light);margin-bottom:2rem;">Patient Information</h1>
      <div class="two-col">
        <div class="col" style="padding:0 20px 0 0;">
          <h2 style="font-size:1.5rem;color:var(--navy-light);margin-bottom:1rem;">New Patients</h2>
          <p>Welcome to our practice! Here's what you need to know for your first visit:</p>
          <ul>
            <li>Please arrive 15 minutes early to complete paperwork</li>
            <li>Bring your insurance card and photo ID</li>
            <li>List any medications you're currently taking</li>
            <li>Note any allergies or medical conditions</li>
          </ul>
        </div>
        <div class="col" style="padding:0 0 0 20px;">
          <h2 style="font-size:1.5rem;color:var(--navy-light);margin-bottom:1rem;">Insurance &amp; Payment</h2>
          <p>We accept most major dental insurance plans. Please contact our office to verify your coverage.</p>
          <p>For patients without insurance, we offer flexible payment options to help make dental care more affordable.</p>
          <img src="${img("visa-1-scaled.jpg")}" alt="We accept Visa and major credit cards" style="max-width:200px;margin-top:1rem;border-radius:4px;" loading="lazy">
        </div>
      </div>
    </div>
  </section>`;
}

function generateOralInfectionPage() {
  return `
  <section class="page-hero-banner" style="background-image:url('${img("southeastdental07.jpeg")}')">
    <div class="page-hero-content"></div>
  </section>
  <section style="padding:80px 0;">
    <div class="container-narrow">
      <h1 style="color:var(--navy-light);margin-bottom:1rem;">Oral Infection Control</h1>
      <p>Maintaining good oral hygiene is essential for preventing infections and ensuring overall health. Our practice follows strict infection control protocols to protect our patients and staff.</p>
      <h2 style="font-size:1.5rem;color:var(--navy-light);margin-top:2rem;margin-bottom:1rem;">Our Safety Measures</h2>
      <ul>
        <li>Sterilization of all dental instruments</li>
        <li>Use of disposable materials where possible</li>
        <li>Regular cleaning and disinfection of all surfaces</li>
        <li>Personal protective equipment for all staff</li>
      </ul>
    </div>
  </section>`;
}

const routes = [
  { path: "/", title: `${siteName} - Professional Dental Care in Dothan, AL`, description: "Professional dental care services including family dentistry, cosmetic dentistry, dental implants, and more. Serving Dothan, AL and the Wiregrass area.", type: "home" },
  { path: "/about/", title: `About Us - ${siteName}`, description: "Dr. Lewis started Southeast Dental with two basic philosophies: evidence-based dentistry and patient education.", type: "about" },
  { path: "/author/rothrube/", title: `Dr. Lewis - ${siteName}`, description: "Meet Dr. Lewis, founder of Southeast Dental. Evidence-based dentistry and patient education.", type: "about" },
  { path: "/contact/", title: `Contact Us - ${siteName}`, description: `Contact our dental office at ${phone} for appointments and inquiries. Located at ${fullAddress}.`, type: "contact" },
  { path: "/testimonial/", title: `Testimonials - ${siteName}`, description: "Read what our patients have to say about their experience at Southeast Dental.", type: "testimonial" },
  { path: "/gallery/", title: `Gallery - ${siteName}`, description: "View our dental practice gallery.", type: "gallery" },
  { path: "/services/", title: `Dental Services - ${siteName}`, description: "Explore our comprehensive range of dental services.", type: "services" },
  { path: "/oral-infection-control/", title: `Oral Infection Control - ${siteName}`, description: "Information about oral infection control procedures.", type: "oral-infection" },
  { path: "/patient-info/", title: `Patient Information - ${siteName}`, description: "Important information for our patients.", type: "patient-info" },
  { path: "/blog/", title: `Dental Blog - ${siteName}`, description: "Read our dental blog for oral health tips and practice updates.", type: "blog" },
];

for (const post of allBlogPosts) {
  routes.push({
    path: `/${post.slug}/`,
    title: `${post.title} - ${siteName}`,
    description: post.title,
    type: "post",
    date: post.date,
    wpContent: post.content
  });
}

for (const cat of allCategories) {
  routes.push({ path: `/category/${cat.slug}/`, title: `${cat.name} - ${siteName}`, description: `Browse ${cat.name} articles.`, type: "category", categoryName: cat.name });
}

for (const tag of allTags) {
  routes.push({ path: `/tag/${tag.slug}/`, title: `${tag.name} - ${siteName}`, description: `Articles about ${tag.name}.`, type: "tag", tagName: tag.name });
}

for (const s of services) {
  const wpPage = getWpPage(s.slug);
  routes.push({
    path: `/services/${s.slug}/`,
    title: `${s.name} - ${siteName}`,
    description: `Professional ${s.name.toLowerCase()} services at ${siteName}.`,
    type: "service",
    serviceName: s.name,
    wpContent: wpPage ? extractCleanContent(wpPage.content) : null
  });
}

function getSchemaForRoute(route) {
  const dentist = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    "name": siteName,
    "description": `${siteName} provides comprehensive dental care in Dothan, AL.`,
    "url": siteUrl,
    "telephone": phone,
    "email": email,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": streetAddress,
      "addressLocality": "Dothan",
      "addressRegion": "AL",
      "postalCode": "36301",
      "addressCountry": "US"
    },
    "priceRange": "$$",
    "acceptsNewPatients": true,
    "medicalSpecialty": "https://schema.org/Dentistry",
    "sameAs": [facebookUrl, tiktokUrl],
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "08:00",
      "closes": "17:00"
    }
  };

  if (route.path === "/") {
    return [
      dentist,
      { "@context": "https://schema.org", "@type": "WebSite", "name": siteName, "url": siteUrl, "potentialAction": { "@type": "SearchAction", "target": { "@type": "EntryPoint", "urlTemplate": `${siteUrl}/?q={search_term_string}` }, "query-input": "required name=search_term_string" } },
      { "@context": "https://schema.org", "@type": "WebPage", "name": siteName, "url": siteUrl, "description": `${siteName} - Professional dental care in Dothan, AL.` }
    ];
  }

  if (route.path === "/about/" || route.path === "/author/rothrube/") {
    return [
      dentist,
      { "@context": "https://schema.org", "@type": "Person", "name": "Dr. Roth Lewis", "jobTitle": "Dentist", "description": "Dr. Roth Lewis, founder of Southeast Dental. DMD from University of Louisville School of Dentistry.", "url": `${siteUrl}/author/rothrube/`, "worksFor": { "@type": "Dentist", "name": siteName } }
    ];
  }

  if (route.path === "/contact/") {
    return [dentist, { "@context": "https://schema.org", "@type": "ContactPage", "name": `Contact ${siteName}`, "url": `${siteUrl}/contact/`, "description": `Contact our dental office at ${phone}.` }];
  }

  if (route.path === "/services/") {
    return [dentist, { "@context": "https://schema.org", "@type": "CollectionPage", "name": `Dental Services - ${siteName}`, "url": `${siteUrl}/services/`, "description": "Explore our comprehensive range of dental services." }];
  }

  if (route.type === "service") {
    return [
      dentist,
      { "@context": "https://schema.org", "@type": "MedicalProcedure", "name": route.serviceName, "description": `Professional ${route.serviceName.toLowerCase()} at ${siteName}.`, "url": `${siteUrl}${route.path}`, "procedureType": "https://schema.org/NoninvasiveProcedure" }
    ];
  }

  if (route.type === "post" && route.date) {
    return [
      dentist,
      { "@context": "https://schema.org", "@type": "Article", "headline": route.title.split(` - ${siteName}`)[0], "url": `${siteUrl}${route.path}`, "datePublished": route.date, "author": { "@type": "Person", "name": "Dr. Roth Lewis", "url": `${siteUrl}/author/rothrube/` }, "publisher": { "@type": "Dentist", "name": siteName, "url": siteUrl } }
    ];
  }

  return [dentist];
}

const sliderScript = `
<script>
let heroIdx = 0;
function heroSlide(dir) {
  const slides = document.querySelectorAll('#heroSlider .hero-slide');
  slides[heroIdx].classList.remove('active');
  heroIdx = (heroIdx + dir + slides.length) % slides.length;
  slides[heroIdx].classList.add('active');
}
setInterval(function(){ heroSlide(1); }, 5000);

let testIdx = 0;
function testSlide(dir) {
  const slides = document.querySelectorAll('.testimonials-carousel .testimonial-slide');
  slides[testIdx].classList.remove('active');
  testIdx = (testIdx + dir + slides.length) % slides.length;
  slides[testIdx].classList.add('active');
}
setInterval(function(){ testSlide(1); }, 7000);

function openVideo(id) {
  document.getElementById('videoFrame').src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0';
  document.getElementById('videoLightbox').classList.add('active');
}
function closeVideo() {
  document.getElementById('videoFrame').src = '';
  document.getElementById('videoLightbox').classList.remove('active');
}
document.getElementById('videoLightbox').addEventListener('click', function(e) {
  if (e.target === this) closeVideo();
});
</script>`;

function generatePage(route) {
  let mainContent = "";

  switch (route.type) {
    case "home":
      mainContent = generateHomepage();
      break;
    case "about":
      mainContent = generateAboutPage();
      break;
    case "contact":
      mainContent = generateContactPage();
      break;
    case "testimonial":
      mainContent = generateTestimonialsPage();
      break;
    case "gallery":
      mainContent = generateGalleryPage();
      break;
    case "services":
      mainContent = generateServicesPage();
      break;
    case "service":
      mainContent = generateServiceSubpage(route);
      break;
    case "post":
      mainContent = generatePostPage(route);
      break;
    case "category":
      mainContent = generateCategoryPage(route);
      break;
    case "tag":
      mainContent = generateTagPage(route);
      break;
    case "blog":
      mainContent = generateBlogPage();
      break;
    case "oral-infection":
      mainContent = generateOralInfectionPage();
      break;
    case "patient-info":
      mainContent = generatePatientInfoPage();
      break;
    default:
      mainContent = `<section style="padding:80px 0;"><div class="container"><div class="post-content"><h1>${route.title}</h1><p>Content for this page is being developed. Please <a href="/contact/">contact us</a> for more information.</p></div></div></section>`;
  }

  const schemas = getSchemaForRoute(route);
  const schemaScripts = schemas.map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <title>${route.title}</title>
  <meta name="description" content="${route.description}">
  <link rel="canonical" href="${siteUrl}${route.path}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="/src/index.css" rel="stylesheet">
  ${schemaScripts}
</head>
<body>
  ${generateHeader()}

  <main>
    ${mainContent}
  </main>

  ${generateFooter()}
  ${sliderScript}
</body>
</html>`;
}

function cleanOutputDir() {
  if (existsSync(pagesDir)) {
    const entries = readdirSync(pagesDir);
    for (const entry of entries) {
      const fullPath = join(pagesDir, entry);
      if (entry === "assets" || entry === "src") continue;
      rmSync(fullPath, { recursive: true, force: true });
    }
  }
  mkdirSync(pagesDir, { recursive: true });
}

function copyAssets() {
  cpSync(join(rootDir, "assets", "images"), join(pagesDir, "assets", "images"), { recursive: true });
  console.log("Copied images");

  mkdirSync(join(pagesDir, "assets", "fonts"), { recursive: true });
  cpSync(join(rootDir, "public", "fonts"), join(pagesDir, "assets", "fonts"), { recursive: true });
  console.log("Copied fonts");

  mkdirSync(join(pagesDir, "src"), { recursive: true });
  cpSync(join(rootDir, "src", "index.css"), join(pagesDir, "src", "index.css"));
  console.log("Copied CSS");

  const headersSrc = join(rootDir, "_headers");
  const redirectsSrc = join(rootDir, "_redirects");
  if (existsSync(headersSrc)) cpSync(headersSrc, join(pagesDir, "_headers"));
  if (existsSync(redirectsSrc)) cpSync(redirectsSrc, join(pagesDir, "_redirects"));
  console.log("Copied _headers and _redirects");
}

function generateSitemap() {
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const route of routes) {
    sitemap += `  <url>\n    <loc>${siteUrl}${route.path}</loc>\n    <lastmod>${new Date().toISOString()}</lastmod>\n    <changefreq>${route.path === "/" ? "weekly" : "monthly"}</changefreq>\n    <priority>${route.path === "/" ? "1.0" : route.type === "service" ? "0.8" : route.type === "post" ? "0.7" : "0.6"}</priority>\n  </url>\n`;
  }
  sitemap += `</urlset>\n`;
  writeFileSync(join(pagesDir, "sitemap.xml"), sitemap);
  console.log(`Generated sitemap.xml (${routes.length} URLs)`);
}

function generateRobotsTxt() {
  writeFileSync(join(pagesDir, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
  console.log("Generated robots.txt");
}

console.log(`Building ${siteName}...\n`);

cleanOutputDir();
copyAssets();

let pageCount = 0;
for (const route of routes) {
  const outputPath = join(pagesDir, route.path === "/" ? "" : route.path.replace(/^\//, ""));
  try {
    const html = generatePage(route);
    mkdirSync(outputPath, { recursive: true });
    writeFileSync(join(outputPath, "index.html"), html);
    console.log(`  ${route.path}`);
    pageCount++;
  } catch (err) {
    console.warn(`  WARN ${route.path}: ${err.message}`);
  }
}

generateSitemap();
generateRobotsTxt();

console.log(`\nDone: ${pageCount} pages in ${pagesDir}/`);
