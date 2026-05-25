import { writeFileSync, mkdirSync, existsSync, readFileSync, cpSync, rmSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const pagesDir = join(rootDir, "pages");

const siteUrl = "https://sedentist.com";
const siteName = "Southeast Dental";

const phone = "(334) 370-9055";
const phoneAlt = "(334) 3-DENTAL";
const email = "SEdentalOM@gmail.com";
const streetAddress = "1865 East Main Street Suite 2";
const city = "Dothan";
const state = "AL";
const zip = "36301";
const hours = "Mon-Fri 8:00 AM - 5:00 PM";

function parseWordPressXml() {
  const xmlPath = join(rootDir, "southeastdental.WordPress.2026-05-22.xml");
  if (!existsSync(xmlPath)) {
    console.warn("⚠ WordPress XML not found, using fallback content");
    return null;
  }
  const xml = readFileSync(xmlPath, "utf8");
  const items = xml.split("<item>").slice(1);

  const posts = [];
  const pages = [];

  for (const item of items) {
    const get = (re) => {
      const m = item.match(re);
      return m ? m[1] : null;
    };
    const getCdata = (re) => {
      const m = item.match(re);
      return m ? m[1] : null;
    };

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

function stripWpHtml(html) {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/https?:\/\/www\.youtube\.com\/watch\?v=\S+/gi, "")
    .replace(/https?:\/\/youtu\.be\/\S+/gi, "")
    .replace(/https?:\/\/sedentist\.com\/wp-content\/uploads\//gi, "/assets/images/wp-content_uploads_")
    .replace(/srcset="[^"]*"/gi, "")
    .replace(/sizes="[^"]*"/gi, "")
    .replace(/loading="lazy"/gi, 'loading="lazy"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractCleanContent(html) {
  if (!html) return "";
  let cleaned = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=\S+/gi, "")
    .replace(/https?:\/\/youtu\.be\/\S+/gi, "")
    .replace(/https?:\/\/sedentist\.com\/wp-content\/uploads\//gi, "/assets/images/wp-content_uploads_")
    .replace(/\s*(-\s+)?\d+w,\s*/g, "")
    .replace(/srcset="[^"]*"/gi, "")
    .replace(/sizes="[^"]*"/gi, "")
    .replace(/width="\d*"\s*/gi, "")
    .replace(/height="\d*"\s*/gi, "");
  return cleaned.trim();
}

function getContactInfo() {
  return { phone, phoneAlt, email, streetAddress, city, state, zip, hours };
}

const wpData = parseWordPressXml();
const wpPages = wpData ? wpData.pages : [];
const wpPosts = wpData ? wpData.posts : [];

function getWpPage(slug) {
  return wpPages.find(p => p.slug === slug);
}

function getWpPost(slug) {
  return wpPosts.find(p => p.slug === slug);
}

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
  { name: "Family Dentistry", slug: "family-dentistry" },
  { name: "General Dentistry", slug: "general-dentistry" },
  { name: "Dental Crowns", slug: "crown" },
  { name: "Dentures & Partials", slug: "denture-or-partial" },
  { name: "Tooth Extractions", slug: "extractions" },
  { name: "Dental Implants", slug: "implants" },
  { name: "Memory-Free Dentistry", slug: "memory-free-dentistry" },
  { name: "Wisdom Teeth Removal", slug: "wisdom-teeth-removal" },
  { name: "Teeth Whitening", slug: "teeth-whitening" },
  { name: "Root Canals", slug: "root-canals" },
  { name: "Dental Fillings", slug: "fillings" },
  { name: "Dental Cleaning & Exams", slug: "dental-cleaning-exams" },
  { name: "Dental Bonding", slug: "dental-bonding" }
];

const routes = [
  { path: "/", title: `${siteName} - Professional Dental Care in Dothan, AL`, description: "Professional dental care services including family dentistry, cosmetic dentistry, dental implants, and more. Serving Dothan, AL and the Wiregrass area.", type: "home" },
  { path: "/about/", title: `About Us - ${siteName}`, description: "Dr. Lewis started Southeast Dental with two basic philosophies: evidence-based dentistry and patient education.", type: "about" },
  { path: "/author/rothrube/", title: `Dr. Lewis - ${siteName}`, description: "Meet Dr. Lewis, founder of Southeast Dental. Evidence-based dentistry and patient education.", type: "author" },
  { path: "/contact/", title: `Contact Us - ${siteName}`, description: `Contact our dental office at ${phone} for appointments and inquiries. Located at ${streetAddress}, ${city}, ${state} ${zip}.`, type: "contact" },
  { path: "/testimonial/", title: `Testimonials - ${siteName}`, description: "Read what our patients have to say about their experience at Southeast Dental.", type: "testimonial" },
  { path: "/gallery/", title: `Gallery - ${siteName}`, description: "View our dental practice gallery.", type: "gallery" },
  { path: "/services/", title: `Dental Services - ${siteName}`, description: "Explore our comprehensive range of dental services.", type: "services" },
  { path: "/oral-infection-control/", title: `Oral Infection Control - ${siteName}`, description: "Information about oral infection control procedures.", type: "info" },
  { path: "/patient-info/", title: `Patient Information - ${siteName}`, description: "Important information for our patients.", type: "info" },
  { path: "/sample-page/", title: `Sample Page - ${siteName}`, description: "Sample page.", type: "info" },
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
  routes.push({
    path: `/category/${cat.slug}/`,
    title: `${cat.name} - ${siteName}`,
    description: `Browse ${cat.name} articles.`,
    type: "category",
    categoryName: cat.name
  });
}

for (const tag of allTags) {
  routes.push({
    path: `/tag/${tag.slug}/`,
    title: `${tag.name} - ${siteName}`,
    description: `Articles about ${tag.name}.`,
    type: "tag",
    tagName: tag.name
  });
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

function generateNav() {
  return `
  <header>
    <nav class="container">
      <a href="/" class="logo">${siteName}</a>
      <ul class="nav-links">
        <li><a href="/about/">About</a></li>
        <li><a href="/services/">Services</a></li>
        <li><a href="/blog/">Blog</a></li>
        <li><a href="/gallery/">Gallery</a></li>
        <li><a href="/contact/">Contact</a></li>
      </ul>
      <button class="mobile-menu-btn" aria-label="Menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </nav>
  </header>`;
}

function generateFooter() {
  const ci = getContactInfo();
  return `
  <footer>
    <div class="container">
      <div class="footer-content">
        <div class="footer-section">
          <h4>${siteName}</h4>
          <p>Professional dental care for you and your family.</p>
        </div>
        <div class="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/about/">About Us</a></li>
            <li><a href="/services/">Services</a></li>
            <li><a href="/blog/">Blog</a></li>
            <li><a href="/contact/">Contact</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>Services</h4>
          <ul>
            ${services.slice(0, 4).map(s => `<li><a href="/services/${s.slug}/">${s.name}</a></li>`).join('\n            ')}
          </ul>
        </div>
        <div class="footer-section">
          <h4>Contact</h4>
          <ul>
            <li>${ci.streetAddress}</li>
            <li>${ci.city}, ${ci.state} ${ci.zip}</li>
            <li><a href="tel:${ci.phone.replace(/[^0-9+]/g, '')}">${ci.phone}</a></li>
            <li><a href="mailto:${ci.email}">${ci.email}</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
      </div>
    </div>
  </footer>`;
}

function generateHero(route) {
  if (route.path === "/") {
    return `
    <section class="hero">
      <div class="container">
        <h1>Your Trusted Dental Care Partner</h1>
        <p>Comprehensive dental services for the whole family. Experience compassionate care in a comfortable environment.</p>
        <div class="hero-buttons">
          <a href="/contact/" class="btn btn-white">Schedule Appointment</a>
          <a href="/services/" class="btn btn-secondary" style="border-color: white; color: white;">View Services</a>
        </div>
      </div>
    </section>`;
  }

  if (route.type === "post") {
    const postTitle = route.title.split(` - ${siteName}`)[0];
    return `
    <section class="page-header">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a> <span>/</span> <a href="/blog/">Blog</a> <span>/</span> <span>${postTitle}</span>
        </nav>
        <h1>${postTitle}</h1>
        ${route.date ? `<p class="post-meta">Published on ${route.date} by Dr. Lewis</p>` : ''}
      </div>
    </section>`;
  }

  if (route.type === "category") {
    const name = route.categoryName || route.title.split(` - ${siteName}`)[0];
    return `
    <section class="page-header">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a> <span>/</span> <a href="/blog/">Blog</a> <span>/</span> <span>${name}</span>
        </nav>
        <h1>${name}</h1>
      </div>
    </section>`;
  }

  if (route.type === "tag") {
    const name = route.tagName || route.title.split(` - ${siteName}`)[0];
    return `
    <section class="page-header">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a> <span>/</span> <a href="/blog/">Blog</a> <span>/</span> <span>Tag: ${name}</span>
        </nav>
        <h1>Tag: ${name}</h1>
      </div>
    </section>`;
  }

  if (route.type === "service") {
    return `
    <section class="page-header">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a> <span>/</span> <a href="/services/">Services</a> <span>/</span> <span>${route.serviceName}</span>
        </nav>
        <h1>${route.serviceName}</h1>
      </div>
    </section>`;
  }

  const titleText = route.title.split(` - ${siteName}`)[0];
  const subtitles = {
    "/blog/": "Oral health tips, treatment information, and practice updates.",
    "/services/": "Comprehensive dental care to meet all your oral health needs.",
    "/contact/": "We'd love to hear from you. Get in touch with us.",
    "/about/": "Learn about our practice and our commitment to your oral health.",
    "/author/rothrube/": "Learn about our practice and our commitment to your oral health.",
    "/testimonial/": "See what our patients have to say about their experience.",
    "/gallery/": "Take a look inside our practice."
  };

  return `
    <section class="page-header">
      <div class="container">
        <h1>${titleText}</h1>
        ${subtitles[route.path] ? `<p>${subtitles[route.path]}</p>` : ''}
      </div>
    </section>`;
}

function generateMainContent(route) {
  const ci = getContactInfo();

  if (route.type === "home") {
    return `
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2>Our Services</h2>
          <p>Comprehensive dental care for all your needs.</p>
        </div>
        <div class="services-grid">
          ${services.slice(0, 6).map(s => `
          <div class="service-card">
            <h3>${s.name}</h3>
            <p>Professional ${s.name.toLowerCase()} services for you and your family.</p>
            <a href="/services/${s.slug}/">Learn more →</a>
          </div>`).join('\n')}
        </div>
        <div style="text-align: center; margin-top: 2rem;">
          <a href="/services/" class="btn btn-primary">View All Services</a>
        </div>
      </div>
    </section>

    <section class="section section-muted">
      <div class="container">
        <div class="section-header">
          <h2>Why Choose Us?</h2>
          <p>Experience the difference with our patient-focused approach.</p>
        </div>
        <div class="services-grid">
          <div class="service-card">
            <h3>Experienced Team</h3>
            <p>Our skilled dental professionals are committed to providing top-quality care.</p>
          </div>
          <div class="service-card">
            <h3>Modern Technology</h3>
            <p>We use the latest dental technology to ensure accurate diagnoses and effective treatments.</p>
          </div>
          <div class="service-card">
            <h3>Comfortable Environment</h3>
            <p>Our office is designed with your comfort in mind, helping you feel at ease.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2>Latest from Our Blog</h2>
          <p>Stay informed with our dental health tips and news.</p>
        </div>
        <div class="blog-grid">
          ${allBlogPosts.slice(0, 3).map(p => `
          <article class="blog-card">
            <div class="blog-card-content">
              <h3><a href="/${p.slug}/">${p.title}</a></h3>
              <p>Read about ${p.title.toLowerCase()} in our latest article.</p>
              <div class="blog-card-meta">
                <span>${p.date}</span>
                <span>By Dr. Lewis</span>
              </div>
            </div>
          </article>`).join('\n')}
        </div>
        <div style="text-align: center; margin-top: 2rem;">
          <a href="/blog/" class="btn btn-primary">View All Posts</a>
        </div>
      </div>
    </section>

    <section class="section section-muted">
      <div class="container" style="text-align: center;">
        <h2>Ready to Schedule an Appointment?</h2>
        <p>Contact us today to take the first step towards a healthier smile.</p>
        <a href="/contact/" class="btn btn-primary">Contact Us</a>
      </div>
    </section>`;
  }

  if (route.type === "blog") {
    return `
    <section class="section">
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
          </article>`).join('\n')}
        </div>
      </div>
    </section>`;
  }

  if (route.type === "services") {
    return `
    <section class="section">
      <div class="container">
        <ul class="services-list">
          ${services.map(s => `
          <li>
            <a href="/services/${s.slug}/">${s.name}</a>
          </li>`).join('\n')}
        </ul>
      </div>
    </section>`;
  }

  if (route.type === "service") {
    const wpContent = route.wpContent;
    if (wpContent && wpContent.length > 100) {
      return `
      <section class="section">
        <div class="container">
          <div class="post-content">
            ${wpContent}
          </div>
          <div style="margin-top: 3rem;">
            <h3>Other Services</h3>
            <ul class="services-list" style="margin-top: 1rem;">
              ${services.filter(s => !route.path.includes(s.slug)).slice(0, 6).map(s => `
              <li><a href="/services/${s.slug}/">${s.name}</a></li>`).join('\n')}
            </ul>
          </div>
        </div>
      </section>`;
    }
    return `
    <section class="section">
      <div class="container">
        <div class="info-grid">
          <div class="info-box">
            <h3>About ${route.serviceName}</h3>
            <p>${route.description} Our experienced team provides professional ${route.serviceName.toLowerCase()} services using the latest techniques and technology.</p>
          </div>
          <div class="info-box">
            <h3>What to Expect</h3>
            <p>During your visit, we'll assess your individual needs and create a personalized treatment plan.</p>
          </div>
        </div>
        <div style="margin-top: 3rem;">
          <h3>Other Services</h3>
          <ul class="services-list" style="margin-top: 1rem;">
            ${services.filter(s => !route.path.includes(s.slug)).slice(0, 6).map(s => `
            <li><a href="/services/${s.slug}/">${s.name}</a></li>`).join('\n')}
          </ul>
        </div>
      </div>
    </section>`;
  }

  if (route.type === "post") {
    const wpContent = route.wpContent;
    if (wpContent && wpContent.length > 100) {
      const post = allBlogPosts.find(p => route.path.includes(p.slug));
      return `
      <section class="section">
        <div class="container">
          <article class="post-content">
            ${wpContent}
          </article>
          <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border);">
            ${post && post.categories.length ? `<p><strong>Categories:</strong></p><ul class="category-list">${post.categories.map(c => `<li><a href="/category/${c.slug}/">${c.name}</a></li>`).join(' ')}</ul>` : ''}
            ${post && post.tags.length ? `<p style="margin-top: 1rem;"><strong>Tags:</strong></p><ul class="tag-list">${post.tags.map(t => `<li><a href="/tag/${t.slug}/">${t.name}</a></li>`).join(' ')}</ul>` : ''}
          </div>
        </div>
      </section>`;
    }
    return `
    <section class="section">
      <div class="container">
        <article class="post-content">
          <p>${route.description}</p>
          <p><a href="/contact/">Contact us</a> to learn more or schedule an appointment.</p>
        </article>
      </div>
    </section>`;
  }

  if (route.type === "category") {
    const name = route.categoryName;
    const catPosts = allBlogPosts.filter(p => p.categories.some(c => c.slug === route.path.split("/")[2]));
    const displayPosts = catPosts.length > 0 ? catPosts : allBlogPosts.slice(0, 6);
    return `
    <section class="section">
      <div class="container">
        <p>Browse all posts in the ${name} category.</p>
        <div class="blog-grid">
          ${displayPosts.map(p => `
          <article class="blog-card">
            <div class="blog-card-content">
              <h3><a href="/${p.slug}/">${p.title}</a></h3>
              <p>Read about ${p.title.toLowerCase()} in our latest article.</p>
              <div class="blog-card-meta">
                <span>${p.date}</span>
                <span>By Dr. Lewis</span>
              </div>
            </div>
          </article>`).join('\n')}
        </div>
      </div>
    </section>`;
  }

  if (route.type === "tag") {
    const name = route.tagName;
    const tagPosts = allBlogPosts.filter(p => p.tags.some(t => t.slug === route.path.split("/")[2]));
    const displayPosts = tagPosts.length > 0 ? tagPosts : allBlogPosts.slice(0, 6);
    return `
    <section class="section">
      <div class="container">
        <p>Browse all posts tagged with "${name}".</p>
        <div class="blog-grid">
          ${displayPosts.map(p => `
          <article class="blog-card">
            <div class="blog-card-content">
              <h3><a href="/${p.slug}/">${p.title}</a></h3>
              <p>Read about ${p.title.toLowerCase()} in our latest article.</p>
              <div class="blog-card-meta">
                <span>${p.date}</span>
                <span>By Dr. Lewis</span>
              </div>
            </div>
          </article>`).join('\n')}
        </div>
      </div>
    </section>`;
  }

  if (route.path === "/contact/") {
    return `
    <section class="section">
      <div class="container">
        <div class="info-grid">
          <div class="info-box">
            <h3>Get in Touch</h3>
            <p>Let our amazing staff help you. Give us a call at <a href="tel:${ci.phone.replace(/[^0-9+]/g, '')}">${ci.phone}</a> or email us at <a href="mailto:${ci.email}">${ci.email}</a></p>
            <form class="contact-form" action="mailto:${ci.email}" method="POST" enctype="text/plain">
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
              <button type="submit" class="btn btn-primary">Send Message</button>
            </form>
          </div>
          <div class="info-box">
            <h3>Contact Information</h3>
            <p><strong>Address:</strong><br>${ci.streetAddress}<br>${ci.city}, ${ci.state} ${ci.zip}</p>
            <p><strong>Phone:</strong><br><a href="tel:${ci.phone.replace(/[^0-9+]/g, '')}">${ci.phone}</a> or <a href="tel:13343336825">${ci.phoneAlt}</a></p>
            <p><strong>Email:</strong><br><a href="mailto:${ci.email}">${ci.email}</a></p>
            <h4 style="margin-top: 1.5rem;">Office Hours</h4>
            <p>Monday - Friday: 8:00 AM - 5:00 PM<br>Saturday - Sunday: Closed</p>
            <h4 style="margin-top: 1.5rem;">Our Location</h4>
            <iframe frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="https://maps.google.com/maps?q=1865+EAST+MAIN+STREET+SUITE+2+DOTHAN%2C+AL+36301&t=m&z=14&output=embed&iwloc=near" title="Southeast Dental Location" aria-label="1865 East Main Street Suite 2 Dothan, AL 36301" style="width:100%;height:300px;border:0;"></iframe>
          </div>
        </div>
      </div>
    </section>`;
  }

  if (route.path === "/about/" || route.path === "/author/rothrube/") {
    const wpAbout = getWpPage("about");
    const wpContent = wpAbout ? extractCleanContent(wpAbout.content) : null;
    if (wpContent && wpContent.length > 100) {
      return `
      <section class="section">
        <div class="container">
          <div class="post-content">
            ${wpContent}
          </div>
        </div>
      </section>`;
    }
    return `
    <section class="section">
      <div class="container">
        <div class="info-grid">
          <div class="info-box">
            <h3>About Our Practice</h3>
            <p>Dr. Lewis started ${siteName} with two basic philosophies: evidence-based dentistry and patient education. We believe in doing what is best for our patient's oral health.</p>
          </div>
          <div class="info-box">
            <h3>Dr. Lewis</h3>
            <p>Dr. Lewis is a dedicated dentist committed to helping patients achieve and maintain excellent oral health.</p>
          </div>
        </div>
      </div>
    </section>`;
  }

  if (route.path === "/testimonial/") {
    const wpTest = getWpPage("testimonial");
    const wpContent = wpTest ? extractCleanContent(wpTest.content) : null;
    if (wpContent && wpContent.length > 100) {
      return `
      <section class="section">
        <div class="container">
          <div class="post-content">
            ${wpContent}
          </div>
        </div>
      </section>`;
    }
    return `
    <section class="section">
      <div class="container">
        <div class="blog-grid">
          <div class="testimonial">
            <blockquote>"The team at ${siteName} made my dental visit comfortable and stress-free."</blockquote>
            <cite>- Sarah M.</cite>
          </div>
        </div>
      </div>
    </section>`;
  }

  if (route.path === "/gallery/") {
    return `
    <section class="section">
      <div class="container">
        <div class="gallery-grid">
          <div class="gallery-item"><img src="/assets/images/wp-content_uploads_2022_01_sedentist-1.jpeg" alt="Our dental office" loading="lazy"></div>
          <div class="gallery-item"><img src="/assets/images/wp-content_uploads_2022_01_southeastdental05-3.jpeg" alt="Modern dental equipment" loading="lazy"></div>
          <div class="gallery-item"><img src="/assets/images/wp-content_uploads_2022_01_southeastdental06-1.jpeg" alt="Dental treatment room" loading="lazy"></div>
          <div class="gallery-item"><img src="/assets/images/wp-content_uploads_2022_01_southeastdental07-3.jpeg" alt="Our team" loading="lazy"></div>
          <div class="gallery-item"><img src="/assets/images/wp-content_uploads_2022_01_southeastdental08-1.jpeg" alt="Waiting area" loading="lazy"></div>
          <div class="gallery-item"><img src="/assets/images/wp-content_uploads_2022_01_southeastdental09-3.jpeg" alt="Practice exterior" loading="lazy"></div>
        </div>
      </div>
    </section>`;
  }

  if (route.path === "/oral-infection-control/") {
    return `
    <section class="section">
      <div class="container">
        <div class="post-content">
          <h2>Oral Infection Control</h2>
          <p>Maintaining good oral hygiene is essential for preventing infections and ensuring overall health. Our practice follows strict infection control protocols to protect our patients and staff.</p>
          <h3>Our Safety Measures</h3>
          <ul>
            <li>Sterilization of all dental instruments</li>
            <li>Use of disposable materials where possible</li>
            <li>Regular cleaning and disinfection of all surfaces</li>
            <li>Personal protective equipment for all staff</li>
          </ul>
        </div>
      </div>
    </section>`;
  }

  if (route.path === "/patient-info/") {
    return `
    <section class="section">
      <div class="container">
        <div class="info-grid">
          <div class="info-box">
            <h3>New Patients</h3>
            <p>Welcome to our practice! Here's what you need to know for your first visit:</p>
            <ul>
              <li>Please arrive 15 minutes early to complete paperwork</li>
              <li>Bring your insurance card and photo ID</li>
              <li>List any medications you're currently taking</li>
              <li>Note any allergies or medical conditions</li>
            </ul>
          </div>
          <div class="info-box">
            <h3>Insurance & Payment</h3>
            <p>We accept most major dental insurance plans. Please contact our office to verify your coverage.</p>
            <p>For patients without insurance, we offer flexible payment options to help make dental care more affordable.</p>
          </div>
        </div>
      </div>
    </section>`;
  }

  if (route.path === "/sample-page/") {
    return `
    <section class="section">
      <div class="container">
        <div class="post-content">
          <h2>Sample Page</h2>
          <p>This is a sample page placeholder.</p>
        </div>
      </div>
    </section>`;
  }

  return `
  <section class="section">
    <div class="container">
      <div class="post-content">
        <p>Content for this page is currently being developed. Please <a href="/contact/">contact us</a> for more information.</p>
      </div>
    </div>
  </section>`;
}

const dentistSchema = {
  "@context": "https://schema.org",
  "@type": "Dentist",
  "name": siteName,
  "description": `${siteName} provides comprehensive dental care in ${city}, ${state}.`,
  "url": siteUrl,
  "telephone": phone,
  "email": email,
  "address": {
    "@type": "PostalAddress",
    "streetAddress": streetAddress,
    "addressLocality": city,
    "addressRegion": state,
    "postalCode": zip,
    "addressCountry": "US"
  },
  "priceRange": "$$",
  "acceptsNewPatients": true,
  "medicalSpecialty": "https://schema.org/Dentistry",
  "sameAs": []
};

const serviceImageMap = {
  "family-dentistry": { slug: "wp-content_uploads_2022_01_sedentist-1.jpeg", alt: "Family dentistry services" },
  "general-dentistry": { slug: "wp-content_uploads_2022_01_sedentist-1.jpeg", alt: "General dentistry services" },
  "crown": { slug: "wp-content_uploads_2021_04_post-13-feat.jpeg", alt: "Dental crown services" },
  "denture-or-partial": { slug: "wp-content_uploads_2022_01_southeastdental04-3.jpeg", alt: "Dentures and partials" },
  "extractions": { slug: "wp-content_uploads_2022_01_southeastdental05-3.jpeg", alt: "Tooth extraction services" },
  "implants": { slug: "wp-content_uploads_2022_01_southeastdental06-1.jpeg", alt: "Dental implant services" },
  "memory-free-dentistry": { slug: "wp-content_uploads_2022_01_sedentist-1.jpeg", alt: "Memory-free dentistry" },
  "wisdom-teeth-removal": { slug: "wp-content_uploads_2021_10_Wisdom-Teeth-Removal.jpg", alt: "Wisdom teeth removal" },
  "teeth-whitening": { slug: "wp-content_uploads_2021_09_Dental-Bonding.jpg", alt: "Teeth whitening services" },
  "root-canals": { slug: "wp-content_uploads_2022_01_southeastdental07-3.jpeg", alt: "Root canal treatment" },
  "fillings": { slug: "wp-content_uploads_2022_01_southeastdental08-2.jpeg", alt: "Dental fillings" },
  "dental-cleaning-exams": { slug: "wp-content_uploads_2022_01_southeastdental09-3.jpeg", alt: "Dental cleaning and exams" },
  "dental-bonding": { slug: "wp-content_uploads_2021_09_Dental-Bonding.jpg", alt: "Dental bonding services" }
};

function buildServiceSchema(serviceSlug) {
  const img = serviceImageMap[serviceSlug];
  const schemas = [{ ...dentistSchema }];
  if (img) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "ImageObject",
      "url": `${siteUrl}/assets/images/${img.slug}`,
      "contentUrl": `${siteUrl}/assets/images/${img.slug}`,
      "description": img.alt,
      "author": { "@type": "Dentist", "name": siteName }
    });
  }
  schemas.push({
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "cssSelector": ["h1", "h2", ".service-description"],
    "xpath": []
  });
  return schemas;
}

function getSchemaForRoute(path, title, date) {
  if (path === "/") {
    return [
      { ...dentistSchema },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": siteName,
        "url": siteUrl,
        "potentialAction": {
          "@type": "SearchAction",
          "target": { "@type": "EntryPoint", "urlTemplate": `${siteUrl}/?q={search_term_string}` },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": siteName,
        "url": siteUrl,
        "description": `${siteName} - Professional dental care in ${city}, ${state}.`
      },
      { "@context": "https://schema.org", "@type": "SpeakableSpecification", "cssSelector": ["h1", "h2"], "xpath": [] }
    ];
  }

  if (path === "/about/" || path === "/author/rothrube/") {
    return [
      { ...dentistSchema },
      {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "Dr. Lewis",
        "jobTitle": "Dentist",
        "description": "Dr. Lewis is a dedicated dentist providing quality dental care.",
        "url": `${siteUrl}/author/rothrube`,
        "worksFor": { "@type": "Dentist", "name": siteName }
      },
      { "@context": "https://schema.org", "@type": "SpeakableSpecification", "cssSelector": ["h1", "h2"], "xpath": [] }
    ];
  }

  if (path === "/contact/") {
    return [
      { ...dentistSchema },
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "name": `Contact ${siteName}`,
        "url": `${siteUrl}/contact`,
        "description": `Contact our dental office at ${phone} for appointments.`
      },
      { "@context": "https://schema.org", "@type": "SpeakableSpecification", "cssSelector": ["h1", "h2"], "xpath": [] }
    ];
  }

  if (path === "/services/") {
    return [
      { ...dentistSchema },
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `Dental Services - ${siteName}`,
        "url": `${siteUrl}/services/`,
        "description": "Explore our comprehensive range of dental services."
      },
      { "@context": "https://schema.org", "@type": "SpeakableSpecification", "cssSelector": ["h1", "h2"], "xpath": [] }
    ];
  }

  if (path === "/blog/") {
    return [
      { ...dentistSchema },
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": `Dental Blog - ${siteName}`,
        "url": `${siteUrl}/blog/`,
        "description": "Read our dental blog for oral health tips and practice updates."
      },
      { "@context": "https://schema.org", "@type": "SpeakableSpecification", "cssSelector": ["h1"], "xpath": [] }
    ];
  }

  const serviceMatch = path.match(/^\/services\/([^/]+)\/?$/);
  if (serviceMatch) return buildServiceSchema(serviceMatch[1]);

  const categoryMatch = path.match(/^\/category\/([^/]+)\/?$/);
  if (categoryMatch) {
    return [
      { ...dentistSchema },
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${categoryMatch[1]} - ${siteName}`,
        "url": `${siteUrl}/category/${categoryMatch[1]}/`,
        "description": `Browse our ${categoryMatch[1]} articles.`
      },
      { "@context": "https://schema.org", "@type": "SpeakableSpecification", "cssSelector": ["h1"], "xpath": [] }
    ];
  }

  const tagMatch = path.match(/^\/tag\/([^/]+)\/?$/);
  if (tagMatch) {
    return [
      { ...dentistSchema },
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${tagMatch[1]} - ${siteName}`,
        "url": `${siteUrl}/tag/${tagMatch[1]}/`,
        "description": `Articles tagged with ${tagMatch[1]}.`
      },
      { "@context": "https://schema.org", "@type": "SpeakableSpecification", "cssSelector": ["h1"], "xpath": [] }
    ];
  }

  const blogMatch = path.match(/^\/([^/]+)\/?$/);
  if (blogMatch && title) {
    return [
      { ...dentistSchema },
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title.split(` - ${siteName}`)[0],
        "url": `${siteUrl}/${blogMatch[1]}/`,
        "datePublished": date,
        "author": { "@type": "Person", "name": "Dr. Lewis", "url": `${siteUrl}/author/rothrube/` },
        "publisher": { "@type": "Dentist", "name": siteName, "url": siteUrl }
      },
      { "@context": "https://schema.org", "@type": "SpeakableSpecification", "cssSelector": ["h1", "article p"], "xpath": [] }
    ];
  }

  return [{ ...dentistSchema }];
}

function injectSchema(html, route) {
  const schemas = getSchemaForRoute(route.path, route.title, route.date);
  const schemaScripts = schemas
    .map(s => `  <script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n  </script>`)
    .join("\n");
  return html.replace("</head>", `${schemaScripts}\n</head>`);
}

function generateBaseHtml(route) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <title>${route.title}</title>
  <meta name="description" content="${route.description}">
  <link rel="canonical" href="${siteUrl}${route.path}">
  <link href="/src/index.css" rel="stylesheet">
</head>
<body>
  ${generateNav()}

  <main>
    ${generateHero(route)}
    ${generateMainContent(route)}
  </main>

  ${generateFooter()}
</body>
</html>`;

  return injectSchema(html, route);
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
  const imagesSrc = join(rootDir, "assets", "images");
  const imagesDest = join(pagesDir, "assets", "images");
  mkdirSync(imagesDest, { recursive: true });
  cpSync(imagesSrc, imagesDest, { recursive: true });
  console.log("✓ Copied images to pages/assets/images/");

  const fontsSrc = join(rootDir, "public", "fonts");
  const fontsDest = join(pagesDir, "assets", "fonts");
  mkdirSync(fontsDest, { recursive: true });
  cpSync(fontsSrc, fontsDest, { recursive: true });
  console.log("✓ Copied fonts to pages/assets/fonts/");

  const cssSrc = join(rootDir, "src", "index.css");
  const cssDest = join(pagesDir, "src", "index.css");
  mkdirSync(join(pagesDir, "src"), { recursive: true });
  cpSync(cssSrc, cssDest);
  console.log("✓ Copied CSS to pages/src/index.css");

  const headersSrc = join(rootDir, "_headers");
  const redirectsSrc = join(rootDir, "_redirects");
  if (existsSync(headersSrc)) cpSync(headersSrc, join(pagesDir, "_headers"));
  if (existsSync(redirectsSrc)) cpSync(redirectsSrc, join(pagesDir, "_redirects"));
  console.log("✓ Copied _headers and _redirects");
}

function generateRobotsTxt() {
  const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
  writeFileSync(join(pagesDir, "robots.txt"), robots);
  console.log("✓ Generated robots.txt");
}

function generateSitemap() {
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const route of routes) {
    sitemap += `  <url>\n`;
    sitemap += `    <loc>${siteUrl}${route.path}</loc>\n`;
    sitemap += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    sitemap += `    <changefreq>${route.path === "/" ? "weekly" : route.type === "post" ? "monthly" : "monthly"}</changefreq>\n`;
    sitemap += `    <priority>${route.path === "/" ? "1.0" : route.type === "service" ? "0.8" : route.type === "post" ? "0.7" : "0.6"}</priority>\n`;
    sitemap += `  </url>\n`;
  }

  sitemap += `</urlset>\n`;
  writeFileSync(join(pagesDir, "sitemap.xml"), sitemap);
  console.log(`✓ Generated sitemap.xml with ${routes.length} URLs`);
}

console.log(`Building ${siteName} static site...\n`);

cleanOutputDir();
copyAssets();

for (const route of routes) {
  const outputPath = join(pagesDir, route.path === "/" ? "" : route.path.replace(/^\//, ''));
  try {
    const html = generateBaseHtml(route);
    mkdirSync(outputPath, { recursive: true });
    writeFileSync(join(outputPath, "index.html"), html);
    console.log(`✓ ${route.path}index.html`);
  } catch (err) {
    console.warn(`⚠ Could not generate ${route.path}: ${err.message}`);
  }
}

generateSitemap();
generateRobotsTxt();

console.log(`\n✓ Build complete: ${routes.length} pages in ${pagesDir}/`);
