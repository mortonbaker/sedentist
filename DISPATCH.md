# Dispatch: Build & Optimize Sedentist.com — Static Site SEO Overhaul

## Context

**Project:** `C:\Users\morto\Code\sedentist`
**Type:** Static site → Cloudflare Pages (same stack as `river-tree-dentist`)

**What exists today:**
- `src/sitemap.xml` — 60 pages from the old WordPress site
- `src/asset-ledger.json` — 271 assets (JS, CSS, fonts, images, media) totaling ~6MB, already downloaded to `assets/`
- `assets/css/`, `assets/js/`, `assets/fonts/`, `assets/images/`, `assets/media/` — all downloaded, hashed filenames
- `_headers` — Cloudflare Pages headers configured (security + caching)
- `_redirects` — WordPress URL cleanup rules already written
- `package.json` — puppeteer-based crawler scripts; no build step yet

**What is MISSING:**
- Zero HTML pages have been built. The site does not exist yet as static files.
- No font optimization, no schema markup, no prerendering pipeline.

---

## Mission

Build a complete, SEO-optimized static marketing site for **Sedentist.com** — a dental practice in [location TBD from content] — then deploy it to Cloudflare Pages.

---

## Reference: What Was Done for River Tree Dentist

Use this as the exact template. Every change below must be replicated:

### 1. Font System (river-tree-dentist/src/index.css)
```
- Font pairing: DM Sans (body) + DM Serif Display (headings) via Google Fonts
- Self-hosted TTF backup in public/fonts/
- @font-face declared in CSS pointing to local file
- font-display: swap on both fonts
```
**Action:** Choose appropriate fonts for sedentist.com. If the old site used Roboto + something old (Times New Roman feel), swap to a modern pairing. DM Sans + DM Serif Display is a safe default that matches the dental/medical aesthetic.

### 2. Static Schema Injection (river-tree-dentist/scripts/prerender.mjs + schema-data.mjs)
```
- Created scripts/schema-data.mjs — JSON data defining all schemas per route
- Created scripts/prerender.mjs — builds static HTML pages, injects:
  * <meta name="robots"> on every page
  * Local font preloads (no Google CDN)
  * Full schema.org JSON-LD: Dentist, WebSite, WebPage, ImageObject, VideoObject, SpeakableSpecification, FAQPage, ContactPage, Person
  * Robots meta tag
  * Correct OpenGraph image per page
```
**Action:** Create `scripts/schema-data.mjs` and update `scripts/prerender.mjs` to generate static HTML with schema baked in. This is the most critical SEO step.

### 3. Service Page Images (river-tree-dentist/src/data/services.ts + service-detail.tsx)
```
- Added imageSlug and imageAlt fields to each service's data
- Added <img> rendering to service-detail.tsx below the intro block
- 15 services each got a relevant image from assets/images/
- ImageObject schema injected per service
```
**Action:** If sedentist has service pages, apply the same pattern. Map slug → image file. Add image to the data, render it in the template, inject ImageObject schema.

### 4. SEO Component (river-tree-dentist/src/components/seo.tsx)
```
- Full <Helmet> with: title, description, canonical, robots, OG, Twitter, business meta
- Schema arrays: FAQPage, BreadcrumbList, ImageObject, VideoObject, SpeakableSpecification
- Dynamic og:image based on page context
```
**Action:** Create a reusable SEO component for sedentist. Reuse the pattern from river-tree-dentist.

### 5. _headers Cleanup (river-tree-dentist/_headers)
```
- Removed Google Fonts preconnect headers (no longer needed with self-hosted fonts)
- Security headers: X-Frame-Options, X-Content-Type-Options, etc.
- Long cache for /assets/* (immutable), short/no-cache for HTML
- Removed stale preconnect to fonts.googleapis.com
```
**Action:** The existing _headers in sedentist already has good baseline headers. Verify Google Fonts preconnects are removed if using self-hosted fonts.

### 6. prerender.mjs — Font + Meta Optimizations
```
- Replaced Google Fonts preload links with local asset paths
- Replaced Google Fonts <link> stylesheet with clean URL
- Stripped stale preload <link> tags pointing to fonts.gstatic.com
- Injected <meta name="robots"> on every pre-rendered page
- Preload CSS before JS in document <head>
```
**Action:** Apply the same regex replacements to sedentist's prerender output.

---

## Step-by-Step Execution Plan

### Phase 1: Understand the Content

1. Read `src/sitemap.xml` fully — understand ALL 60 pages and their types (service, blog, about, contact, etc.)
2. Read `src/asset-ledger.json` — understand what images/fonts/assets exist
3. Identify the practice name, location, phone, hours, doctor name from the content — these become the schema
4. Identify which pages are service pages, which are informational, which are blog

### Phase 2: Choose Fonts and Update CSS

1. Pick a body font + heading font pairing appropriate for a dental practice
2. Download the heading font TTF to `public/fonts/`
3. Declare @font-face in `src/index.css` pointing to local file
4. Set `--font-sans` and `--font-serif` CSS variables
5. Apply `font-sans` to body, `font-serif` to h1-h6 in the base CSS

### Phase 3: Build the Reusable SEO Infrastructure

1. Create `scripts/schema-data.mjs`:
   - Define `dentistSchema` with practice name, address, phone, hours, geo, sameAs, aggregateRating
   - Build route-type → schema mapping: homepage, service pages, about, contact, blog
   - Export `getSchemaForRoute(path)` function
   - Include ImageObject, VideoObject (for YouTube embeds), SpeakableSpecification

2. Create `scripts/prerender.mjs`:
   - Read `src/sitemap.xml` to get the list of all routes
   - For each route: read the built HTML, inject schema JSON-LD before `</head>`, inject robots meta, replace font CDN links with local, strip stale preloads
   - Write static HTML to `dist/` or `pages/` matching the route structure
   - Also copy `_headers` and `_redirects` to output

3. The build pipeline should be:
   ```
   npm run build  → generates HTML from templates/components
   node scripts/prerender.mjs  → enhances HTML with static schema + font fixes
   node scripts/sitemap.mjs  → generates sitemap.xml
   ```

### Phase 4: Build the HTML Pages

1. If there are existing HTML templates/pages in `pages/`, read them and enhance them
2. If no HTML exists yet, build the site from scratch using a simple static site approach:
   - Create `pages/index.html` (homepage)
   - Create `pages/about/index.html`
   - Create `pages/contact/index.html`
   - Create `pages/services/index.html` (services overview)
   - Create `pages/services/[slug]/index.html` for each service
   - Create `pages/blog/index.html` + individual blog posts
   - Create `pages/gallery/index.html`, `pages/testimonial/index.html`
   - Create `pages/404.html`

3. Each page must include:
   - Semantic HTML structure
   - The SEO component output
   - Schema JSON-LD (injected by prerender.mjs)
   - Proper heading hierarchy
   - At least one image (from assets/images/ where available)

### Phase 5: Add Service Page Images (if service pages exist)

1. Map each service slug from sitemap.xml to an image in `assets/images/`
2. Add `imageSlug` + `imageAlt` to the service data structure
3. Render `<img src="/assets/images/[slug]" alt="[alt]" loading="lazy" />` in the service template
4. Add ImageObject schema for each service page

### Phase 6: Schema Audit

Verify every page type gets appropriate schema:
| Page | Schema Types |
|------|-------------|
| Homepage | Dentist + WebSite + WebPage + SpeakableSpecification |
| Services listing | Dentist + ServiceCatalog + SpeakableSpecification |
| Service detail | Dentist + Service + ImageObject + SpeakableSpecification |
| About | Dentist + Person (Dr. [name]) + SpeakableSpecification |
| Contact | Dentist + ContactPage + SpeakableSpecification |
| Blog posts | Dentist + Article + SpeakableSpecification |
| Gallery/Testimonial | Dentist + ImageGallery + SpeakableSpecification |

### Phase 7: Performance Optimizations

1. **Fonts:** Self-host the heading font. DM Sans via Google Fonts is acceptable (lightweight).
2. **Images:** Ensure all images in `assets/images/` are WebP or optimized. Check `asset-ledger.json` for image sizes — anything over 200KB should be optimized or lazy-loaded.
3. **CSS:** Consolidate all CSS into a single file. No inline styles in HTML body.
4. **JS:** No render-blocking JS in `<head>`. All scripts `defer` or `type="module"`.
5. **Preconnect:** Only preconnect to fonts.googleapis.com (for DM Sans), nothing else.

### Phase 8: _headers Audit

1. Remove any Google Fonts preconnect if using fully self-hosted fonts
2. Keep security headers (X-Frame-Options, X-Content-Type-Options, etc.)
3. Keep `Cache-Control: public, max-age=31536000, immutable` for `/assets/*`
4. Keep `Cache-Control: no-cache` for HTML pages
5. Ensure `/favicon.png` and `/opengraph.jpg` have proper cache headers

### Phase 9: Deploy

1. Run the full build: `npm run build && node scripts/prerender.mjs && node scripts/sitemap.mjs`
2. Verify `pages/` or `dist/` contains all static HTML files
3. Deploy: `npx wrangler pages deploy [output-dir] --project-name=sedentist`
4. Update the deploy URL in this file (CLAUDE.md equivalent)
5. Verify the deployed site loads correctly

---

## Important Rules

1. **This is a reference repo** — the agent should treat `C:\Users\morto\Code\sedentist` as the workspace root, not create new subdirectories unless necessary.

2. **Do not invent values** — if a phone number, address, or doctor name isn't in the crawled content, ask. Do not make up business details.

3. **Fonts first** — font choices affect every page. Get the CSS right before building all the pages.

4. **Schema is in the HTML** — all JSON-LD must be statically injected into the pre-rendered HTML files. It cannot be client-side React hydration — it must be present when a bot reads the raw file.

5. **Cloudflare Pages naming** — the Cloudflare Pages project name for sedentist.com should be `sedentist`. If that doesn't work, try `sedentist-com` or check existing projects via `wrangler pages project list`.

6. **Build output directory** — if the build outputs to `dist/public/`, deploy from there. If it outputs to `pages/`, deploy from there. Whichever is used, be consistent and document it.

---

## Deliverables Checklist

- [ ] `src/index.css` — font declarations, CSS variables, base typography
- [ ] `public/fonts/[heading-font].ttf` — self-hosted heading font
- [ ] `scripts/schema-data.mjs` — all schema definitions
- [ ] `scripts/prerender.mjs` — HTML enhancement script
- [ ] `scripts/sitemap.mjs` — sitemap generator
- [ ] All static HTML pages in `pages/` (or `dist/public/`)
- [ ] `_headers` updated with no Google CDN preconnects
- [ ] `sitemap.xml` generated
- [ ] `package.json` updated with build scripts
- [ ] Deployed to Cloudflare Pages
- [ ] Deploy URL documented
