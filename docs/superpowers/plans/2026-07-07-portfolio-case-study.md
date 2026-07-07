# Portfolio Case Study Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the portfolio lightbox modal with a dedicated `portfolio-detail.html?id=<id>` case-study page (structured story sections + image gallery), and let the admin author that content.

**Architecture:** One new template page whose entire content is rendered client-side from a Supabase row looked up by the `id` query param — same pattern every other page on this site already uses. The old lightbox (HTML/CSS/JS) is deleted outright, not kept as a fallback. The admin's existing portfolio form gains 4 new optional textareas and a multi-image upload control that reuses the existing `uploadFile()` helper.

**Tech Stack:** Vanilla JS (`type="module"` for public pages, plain script for `admin.js`), Supabase (Postgres + Storage), static HTML/CSS, no build step, no test runner.

## Global Constraints

- No automated test runner in this repo — every task's "test" step is manual verification via the browser preview tools.
- Public page scripts (`portfolio.js`, the new `portfolio-detail.js`) are `type="module"`: plain top-level function declarations, no `window.` assignment, no inline `onclick` HTML attributes.
- `assets/js/admin.js` is a plain non-module script: top-level functions are implicitly global, referenced via inline `onclick`/`onchange` attributes — this is the established convention, not a smell to fix.
- Reuse existing helpers instead of inventing new ones: `uploadFile(file, folder)` (admin.js:67, returns `Promise<string|null>`), `showToast()`, `confirmDelete()`, `openModal()`/`closeModal()` (all in admin.js), the `TYPE_CONFIG` object shape (`{ label, icon, cls }`) already defined in `portfolio.js`.
- This project's root `CLAUDE.md` mandates full SEO metadata on every page (title, description, keywords, author, robots, theme-color, canonical, Open Graph, Twitter Card, JSON-LD) — `portfolio-detail.html` gets the same static boilerplate as every other page, with `document.title`/meta description additionally updated dynamically per-project once data loads (accepted limitation: raw social-share unfurling will show the static fallback, not per-project values — this was discussed and accepted, not a gap to fix).
- `portfolio-detail.html` is NOT added to `sitemap.xml` (dynamic per-row IDs, static sitemap file) — Googlebot discovers these pages by crawling the links from `portfolio.html`, which remains in the sitemap.
- No new HTML pages beyond `portfolio-detail.html`. No new Supabase Storage bucket — gallery images reuse the existing `portfolio-images` bucket via `uploadFile(file, 'portfolio')`, same as the existing thumbnail upload.

---

### Task 1: Add story/gallery columns to the `portfolio` table

**Files:**
- No file in this repo — Supabase SQL Editor change (manual, same pattern as prior features' DB migrations)

**Interfaces:**
- Produces: `background text`, `problem text`, `solution text`, `result text`, `gallery_images jsonb` columns on `portfolio`, all nullable — consumed by Task 3 (frontend read) and Task 5 (admin write)

- [ ] **Step 1: Run this in the Supabase project's SQL Editor**

```sql
alter table portfolio
  add column if not exists background     text,
  add column if not exists problem        text,
  add column if not exists solution       text,
  add column if not exists result         text,
  add column if not exists gallery_images jsonb;
```

- [ ] **Step 2: Verify in the Supabase Table Editor**

Confirm `portfolio` now has the 5 new columns (all nullable, `gallery_images` type `jsonb`), and the existing rows/columns are untouched.

- [ ] **Step 3: Commit**

Nothing to commit for this task — proceed directly to Task 2.

---

### Task 2: Create `portfolio-detail.html` shell + `assets/css/portfolio-detail.css`

**Files:**
- Create: `portfolio-detail.html`
- Create: `assets/css/portfolio-detail.css`

**Interfaces:**
- Produces: `#detailContent` container element and the full set of CSS classes Task 3's JS will inject into it: `.detail-hero`, `.detail-hero-img`, `.detail-hero-placeholder`, `.detail-gallery-strip`, `.detail-gallery-thumb` (+ `.active` modifier), `.detail-body`, `.detail-meta`, `.detail-title`, `.detail-tags`, `.detail-tag`, `.detail-section`, `.detail-section-label`, `.detail-section-body`, `.detail-actions`, `.detail-btn`, `.detail-btn-primary`, `.detail-btn-outline`, `.detail-back`
- No JavaScript in this task — Task 3 adds `assets/js/portfolio-detail.js` separately. `#detailContent` stays a loading skeleton until then.

- [ ] **Step 1: Create `portfolio-detail.html`**

Model this on `portfolio.html`'s structural skeleton (same `site-header`, same 8-item `nav-overlay`, same script tags at the bottom) with full SEO metadata following the established pattern (see `portfolio.html`'s `<head>` for the exact fields to copy: canonical, OG, Twitter, icons, manifest, preconnect/dns-prefetch). Use a generic (non-project-specific) title/description as the static fallback, since actual per-project values are set dynamically by Task 3's JS.

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Detail Project — Eka Danar Arrasyid | Portfolio</title>
  <meta name="description" content="Studi kasus lengkap salah satu project Eka Danar Arrasyid — latar belakang, masalah, solusi, dan hasil."/>
  <meta name="keywords" content="Eka Danar Arrasyid, Studi Kasus Project, Portfolio Web Developer, Case Study"/>
  <meta name="author" content="Eka Danar Arrasyid"/>
  <meta name="robots" content="index, follow, max-image-preview:large"/>
  <meta name="theme-color" content="#f0f0ef"/>
  <link rel="canonical" href="https://www.edanararrasyid.my.id/portfolio-detail.html"/>

  <!-- Open Graph -->
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="Eka Danar Arrasyid"/>
  <meta property="og:title" content="Detail Project — Eka Danar Arrasyid"/>
  <meta property="og:description" content="Studi kasus lengkap salah satu project Eka Danar Arrasyid."/>
  <meta property="og:url" content="https://www.edanararrasyid.my.id/portfolio-detail.html"/>
  <meta property="og:image" content="https://www.edanararrasyid.my.id/assets/bot_avatar.png"/>
  <meta property="og:locale" content="id_ID"/>

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="Detail Project — Eka Danar Arrasyid"/>
  <meta name="twitter:description" content="Studi kasus lengkap salah satu project Eka Danar Arrasyid."/>
  <meta name="twitter:image" content="https://www.edanararrasyid.my.id/assets/bot_avatar.png"/>
  <meta name="twitter:site" content="@DanarrArrsyd"/>

  <link rel="icon" type="image/png" href="./assets/Title HTML.jpg"/>
  <link rel="apple-touch-icon" href="./assets/bot_avatar.png"/>
  <link rel="manifest" href="./manifest.json"/>

  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Outfit:wght@300;400;500&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>

  <link rel="stylesheet" href="./assets/css/base.css"/>
  <link rel="stylesheet" href="./assets/css/portfolio-detail.css"/>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <div class="cursor-dot" id="cursorDot"></div>
  <div class="cursor-ring" id="cursorRing"></div>
  <div class="page-transition" id="pageTransition"></div>

  <header class="site-header">
    <a href="index.html" class="site-logo">Danar<em>.</em></a>
    <button class="menu-toggle" id="menuToggle" aria-label="Toggle menu">
      <span class="menu-label">Menu</span>
      <div class="menu-bars"><span></span><span></span></div>
    </button>
  </header>

  <div class="nav-overlay" id="navOverlay">
    <nav>
      <ul class="nav-links-list">
        <li><a href="index.html"         class="nav-link"><span class="nav-link-num">01</span>Home<i class="fas fa-arrow-right nav-link-arrow"></i></a></li>
        <li><a href="profil.html"        class="nav-link"><span class="nav-link-num">02</span>About<i class="fas fa-arrow-right nav-link-arrow"></i></a></li>
        <li><a href="skills.html"        class="nav-link"><span class="nav-link-num">03</span>Skills<i class="fas fa-arrow-right nav-link-arrow"></i></a></li>
        <li><a href="experience.html"    class="nav-link"><span class="nav-link-num">04</span>Experience<i class="fas fa-arrow-right nav-link-arrow"></i></a></li>
        <li><a href="portfolio.html"     class="nav-link"><span class="nav-link-num">05</span>Portfolio<i class="fas fa-arrow-right nav-link-arrow"></i></a></li>
        <li><a href="certification.html" class="nav-link"><span class="nav-link-num">06</span>Certification<i class="fas fa-arrow-right nav-link-arrow"></i></a></li>
        <li><a href="event.html"         class="nav-link"><span class="nav-link-num">07</span>Events<i class="fas fa-arrow-right nav-link-arrow"></i></a></li>
        <li><a href="contact.html"       class="nav-link"><span class="nav-link-num">08</span>Contact<i class="fas fa-arrow-right nav-link-arrow"></i></a></li>
      </ul>
    </nav>
    <div class="nav-overlay-footer">
      <div class="nav-social-row">
        <a href="https://x.com/DanarrArrsyd"                   target="_blank" class="nav-social">Twitter</a>
        <a href="https://www.instagram.com/danar_arrsyd/"       target="_blank" class="nav-social">Instagram</a>
        <a href="https://www.linkedin.com/in/ekadanararrasyid/" target="_blank" class="nav-social">LinkedIn</a>
        <a href="https://github.com/Danar52"                    target="_blank" class="nav-social">GitHub</a>
      </div>
      <span class="nav-footer-loc">Bekasi, Indonesia</span>
    </div>
  </div>

  <main id="main-content">
    <a href="portfolio.html" class="detail-back"><i class="fas fa-arrow-left"></i> Kembali ke Portfolio</a>
    <div id="detailContent">
      <div class="state-box"><i class="fas fa-circle-notch spin"></i></div>
    </div>
  </main>

  <script src="./assets/js/site.js"></script>
  <script type="module" src="./assets/js/portfolio-detail.js"></script>
  <script type="module" src="chatbot.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `assets/css/portfolio-detail.css`**

```css
/* ═══════════════════════════════════════════════════════════════
   PORTFOLIO-DETAIL.CSS — Case study detail page
═══════════════════════════════════════════════════════════════ */

.detail-back {
  display: inline-flex; align-items: center; gap: 8px;
  margin: 40px 40px 0;
  font-family: var(--font-body); font-size: 12.5px; font-weight: 500;
  color: var(--text-2); text-decoration: none;
  transition: color 0.2s;
}
.detail-back:hover { color: var(--text-1); }

.detail-hero {
  margin: 28px 40px 0;
  border-radius: 8px; overflow: hidden;
  background: var(--bg-elevated);
  max-width: 900px;
}
.detail-hero-img { width: 100%; max-height: 520px; object-fit: cover; display: block; }
.detail-hero-placeholder {
  width: 100%; height: 320px;
  display: flex; align-items: center; justify-content: center;
}
.detail-hero-placeholder i { font-size: 48px; color: var(--text-3); opacity: 0.3; }

.detail-gallery-strip {
  display: flex; gap: 10px; flex-wrap: wrap;
  margin: 14px 40px 0; max-width: 900px;
}
.detail-gallery-thumb {
  width: 84px; height: 60px; object-fit: cover;
  border-radius: 6px; cursor: pointer;
  border: 2px solid transparent; opacity: 0.6;
  transition: opacity 0.18s, border-color 0.18s;
}
.detail-gallery-thumb:hover { opacity: 0.85; }
.detail-gallery-thumb.active { opacity: 1; border-color: var(--text-1); }

.detail-body { margin: 36px 40px 80px; max-width: 900px; }

.detail-meta {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: var(--font-body); font-size: 11px; font-weight: 500;
  color: var(--text-3); text-transform: uppercase; letter-spacing: 0.1em;
  margin-bottom: 12px;
}

.detail-title {
  font-family: var(--font-display); font-size: clamp(26px, 3.2vw, 38px);
  font-weight: 700; letter-spacing: -0.6px; line-height: 1.15;
  color: var(--text-1); margin-bottom: 18px;
}

.detail-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 32px; }
.detail-tag {
  font-family: var(--font-body); font-size: 10px; font-weight: 500;
  padding: 4px 12px; border-radius: 2px; letter-spacing: 0.04em;
  color: var(--text-2); border: 1px solid var(--border);
}

.detail-section {
  display: grid; grid-template-columns: 180px 1fr;
  gap: 32px; padding: 28px 0;
  border-bottom: 1px solid var(--border);
}
.detail-section:first-of-type { border-top: 1px solid var(--border); }
.detail-section-label {
  font-family: var(--font-body); font-size: 10.5px; font-weight: 500;
  color: var(--text-3); text-transform: uppercase; letter-spacing: 2px;
  line-height: 1.6; padding-top: 4px;
}
.detail-section-body { min-width: 0; }
.detail-section-body p {
  font-size: 14.5px; line-height: 1.85; color: var(--text-2);
  white-space: pre-wrap;
}

.detail-actions { display: flex; gap: 10px; flex-wrap: wrap; padding-top: 28px; }
.detail-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 24px; border-radius: 40px;
  font-family: var(--font-body); font-size: 11px; font-weight: 500;
  letter-spacing: 0.06em; text-transform: uppercase;
  cursor: pointer; text-decoration: none; border: none;
  transition: opacity 0.2s, border-color 0.2s, color 0.2s;
}
.detail-btn-primary { background: var(--text-1); color: var(--bg); }
.detail-btn-primary:hover { opacity: 0.8; }
.detail-btn-outline {
  background: transparent; color: var(--text-2);
  border: 1px solid var(--border);
}
.detail-btn-outline:hover { border-color: var(--text-1); color: var(--text-1); }

@media (max-width: 768px) {
  .detail-back  { margin: 28px 20px 0; }
  .detail-hero  { margin: 20px 20px 0; }
  .detail-gallery-strip { margin: 12px 20px 0; }
  .detail-body  { margin: 28px 20px 56px; }
  .detail-section { grid-template-columns: 1fr; gap: 8px; padding: 20px 0; }
}
```

- [ ] **Step 3: Manual verification**

Start the preview server (`resume` launch config), navigate to `/portfolio-detail.html` (no `?id=`, so it'll just show the loading skeleton forever since Task 3's JS doesn't exist yet — that's expected). Confirm: page loads with no console errors, nav works (8 links present), the loading spinner shows inside `#detailContent`, no layout breakage at desktop and mobile (375px) widths.

- [ ] **Step 4: Commit**

```bash
git add portfolio-detail.html assets/css/portfolio-detail.css
git commit -m "Add portfolio-detail page shell and styling"
```

---

### Task 3: `assets/js/portfolio-detail.js` — load and render the case study

**Files:**
- Create: `assets/js/portfolio-detail.js`

**Interfaces:**
- Consumes: `#detailContent` (Task 2), `supabase` client from `../../supabase.js`, the `portfolio` table's columns including the 5 new ones from Task 1
- Produces: nothing consumed by later tasks — this is the last piece of the public-facing detail page

- [ ] **Step 1: Write `assets/js/portfolio-detail.js`**

```js
import { supabase } from '../../supabase.js';

const TYPE_CONFIG = {
  web:    { label: 'Web Dev', icon: 'fas fa-code' },
  design: { label: 'Design',  icon: 'fas fa-pen-ruler' },
  other:  { label: 'Lainnya', icon: 'fas fa-box-open' },
};

function showNotFound() {
  document.getElementById('detailContent').innerHTML = `
    <div class="state-box">
      <i class="fas fa-triangle-exclamation"></i>
      <p>Project tidak ditemukan.</p>
    </div>`;
}

function parseGallery(raw) {
  let gallery = raw;
  if (typeof gallery === 'string') {
    try { gallery = JSON.parse(gallery); } catch { gallery = []; }
  }
  return Array.isArray(gallery) ? gallery : [];
}

function buildHeroHtml(item, gallery) {
  if (gallery.length > 0) {
    return `<img class="detail-hero-img" id="detailHeroImg" src="${gallery[0]}" alt="${item.title}">`;
  }
  if (item.thumbnail_url) {
    return `<img class="detail-hero-img" src="${item.thumbnail_url}" alt="${item.title}">`;
  }
  if (item.url_live) {
    // Single direct mshots request — no retry loop here (unlike the grid's
    // loadScreenshot()), since this is one hero image, not a whole grid of
    // thumbnails; a plain first-load placeholder image is an acceptable
    // occasional result for this page.
    return `<img class="detail-hero-img" src="https://s.wordpress.com/mshots/v1/${encodeURIComponent(item.url_live)}?w=1200&h=750" alt="${item.title}">`;
  }
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
  return `<div class="detail-hero-placeholder"><i class="${cfg.icon}"></i></div>`;
}

function buildGalleryStripHtml(gallery, title) {
  if (gallery.length <= 1) return '';
  return `<div class="detail-gallery-strip">${gallery.map((src, i) => `
    <img class="detail-gallery-thumb${i === 0 ? ' active' : ''}" src="${src}" data-src="${src}" alt="${title} ${i + 1}">
  `).join('')}</div>`;
}

async function loadDetail() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { showNotFound(); return; }

  const { data: item, error } = await supabase
    .from('portfolio')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (error || !item) { showNotFound(); return; }

  document.title = `${item.title} — Eka Danar Arrasyid`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && item.description) metaDesc.setAttribute('content', item.description);

  const cfg     = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
  const gallery = parseGallery(item.gallery_images);

  const tagsHtml = (item.tags || []).map(t => `<span class="detail-tag">${t}</span>`).join('');

  const sections = [
    { label: 'Latar<br>Belakang', value: item.background },
    { label: 'Masalah',          value: item.problem },
    { label: 'Solusi',           value: item.solution },
    { label: 'Hasil',            value: item.result },
  ].filter(s => s.value);

  const sectionsHtml = sections.map(s => `
    <div class="detail-section">
      <span class="detail-section-label">${s.label}</span>
      <div class="detail-section-body"><p>${s.value}</p></div>
    </div>`).join('');

  const actionLinks = [];
  if (item.url_live)    actionLinks.push(`<a href="${item.url_live}"    target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn-primary"><i class="fas fa-external-link-alt"></i> Lihat Live</a>`);
  if (item.url_github)  actionLinks.push(`<a href="${item.url_github}"  target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn-outline"><i class="fab fa-github"></i> GitHub</a>`);
  if (item.url_behance) actionLinks.push(`<a href="${item.url_behance}" target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn-outline"><i class="fab fa-behance"></i> Behance</a>`);
  if (item.url_figma)   actionLinks.push(`<a href="${item.url_figma}"   target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn-outline"><i class="fab fa-figma"></i> Figma</a>`);

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-hero">${buildHeroHtml(item, gallery)}</div>
    ${buildGalleryStripHtml(gallery, item.title)}
    <div class="detail-body">
      <span class="detail-meta"><i class="${cfg.icon}"></i>${cfg.label}${item.year ? ' · ' + item.year : ''}</span>
      <h1 class="detail-title">${item.title}</h1>
      ${tagsHtml ? `<div class="detail-tags">${tagsHtml}</div>` : ''}
      ${sectionsHtml}
      ${actionLinks.length ? `<div class="detail-actions">${actionLinks.join('')}</div>` : ''}
    </div>`;

  if (gallery.length > 1) {
    document.querySelectorAll('.detail-gallery-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        document.getElementById('detailHeroImg').src = thumb.dataset.src;
        document.querySelectorAll('.detail-gallery-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  }
}

loadDetail();
```

- [ ] **Step 2: Manual verification**

You'll need at least one real, published `portfolio` row's `id` for this — get one from the Supabase Table Editor or by inspecting `portfolio.html`'s network response. With the preview server running:
- Visit `/portfolio-detail.html?id=<a real published id>` — confirm the hero image, title, meta (type + year), tags, and any filled story sections render; confirm `document.title` changes (check via browser tab title or devtools); confirm action buttons only appear for URLs that are actually set on that row
- Visit `/portfolio-detail.html?id=999999999` (an id that doesn't exist) — confirm the "Project tidak ditemukan" state renders, no console error, no infinite spinner
- Visit `/portfolio-detail.html` with no `id` param at all — confirm the same not-found state
- If that project has `gallery_images` populated (won't yet, since Task 5 hasn't shipped the admin UI — you can temporarily set it directly via the Supabase Table Editor as a JSON array of 2-3 existing image URLs for this test only, then revert), confirm the thumbnail strip appears and clicking a thumbnail swaps the hero image
- Check `preview_console_logs` for errors throughout

- [ ] **Step 3: Commit**

```bash
git add assets/js/portfolio-detail.js
git commit -m "Load and render portfolio case study detail page"
```

---

### Task 4: Point "Lihat Detail" at the new page and delete the lightbox

**Files:**
- Modify: `assets/js/portfolio.js`
- Modify: `portfolio.html`
- Modify: `assets/css/portfolio.css`

**Interfaces:**
- Consumes: nothing new
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Change the `.pf-link` span into a real link, in `assets/js/portfolio.js`**

Find this line inside `renderGrid()` (around line 116):

```js
              <span class="pf-link">Lihat detail <i class="fas fa-arrow-right"></i></span>
```

Replace it with:

```js
              <a href="portfolio-detail.html?id=${item.id}" class="pf-link">Lihat detail <i class="fas fa-arrow-right"></i></a>
```

- [ ] **Step 2: Remove the lightbox-opening row click handler**

Find this block inside `renderGrid()` (around lines 123-129):

```js
      document.querySelectorAll('.pf-row').forEach(row => {
        row.addEventListener('click', () => {
          const id   = parseInt(row.dataset.id);
          const item = allItems.find(i => i.id === id);
          if (item) openLightbox(item);
        });
      });

```

Delete this entire block. The row no longer needs a click handler — the `<a>` inside it (from Step 1) is now a real, keyboard-and-screen-reader-accessible link, and clicking anywhere else in the row doing nothing is acceptable (it wasn't a requirement that the *whole card* be clickable, only that "Lihat Detail" navigates).

- [ ] **Step 3: Remove the lightbox functions and their event listeners**

Find and delete this entire block (from the `// Lightbox` comment through the `keydown` listener, roughly lines 148-209 — everything from `function openLightbox(item) {` through `document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });`):

```js
    // Lightbox
    function openLightbox(item) {
      ... (full body as currently in the file) ...
    }

    function closeLightbox() {
      document.getElementById('lightboxOverlay').classList.remove('open');
      document.body.style.overflow = '';
    }

    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightboxOverlay').addEventListener('click', e => {
      if (e.target === document.getElementById('lightboxOverlay')) closeLightbox();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
```

Delete the whole thing — `getThumbSrc()`, `buildThumbHtml()`, `loadScreenshot()`, and `TYPE_CONFIG` (used by the grid, unrelated to the lightbox) must stay untouched.

- [ ] **Step 4: Remove the lightbox markup from `portfolio.html`**

Find and delete this block:

```html
  <!-- LIGHTBOX -->
  <div class="lightbox-overlay" id="lightboxOverlay">
    <div class="lightbox-box" id="lightboxBox">
      <button class="lightbox-close" id="lightboxClose"><i class="fas fa-times"></i></button>
      <div id="lightboxContent"></div>
    </div>
  </div>

```

- [ ] **Step 5: Remove the lightbox CSS from `assets/css/portfolio.css`**

Delete every rule whose selector starts with `.lightbox` or `.lb-btn`, the `lbIn`/`lbUp` `@keyframes` blocks, and the short-viewport `@media (max-height: 700px)` block that was added specifically for the lightbox in a previous task (it targeted `.lightbox-box`/`.lightbox-img-pane`/etc., which no longer exist). Also remove the "Lightbox — bottom sheet" rules inside the existing `@media (max-width: 768px)` block (`.lightbox-overlay`, `.lightbox-box`, `.lightbox-box::before`, `.lightbox-img-pane`, `.lightbox-body`, `.lightbox-title`, `.lightbox-desc`, `.lightbox-actions`, `.lb-btn` — but do NOT remove the other, unrelated rules in that same media query block like `.filter-bar`, `.pf-row`, `.pf-title`, etc.).

After this step, running `grep -n "lightbox\|lb-btn" assets/css/portfolio.css` should return nothing.

- [ ] **Step 6: Manual verification**

Start the preview server, go to `/portfolio.html`. Confirm:
- No console errors (this is the most important check — a stray reference to a removed function/element is the main risk of this task)
- Clicking "Lihat Detail" on any project navigates to `/portfolio-detail.html?id=<that project's id>` instead of opening a modal
- The grid itself (thumbnails, filters, tags) still looks and behaves exactly as before
- `grep -rn "lightbox\|openLightbox\|closeLightbox" assets/js/portfolio.js portfolio.html assets/css/portfolio.css` returns nothing

- [ ] **Step 7: Commit**

```bash
git add assets/js/portfolio.js portfolio.html assets/css/portfolio.css
git commit -m "Replace portfolio lightbox with case study detail page link"
```

---

### Task 5: Admin panel — story fields + gallery upload

**Files:**
- Modify: `assets/js/admin.js`
- Modify: `assets/css/admin.css`

**Interfaces:**
- Consumes: `uploadFile(file, folder)` (admin.js:67), `db` Supabase client, `showToast()`
- Produces: nothing consumed by later tasks (Task 6 is verification-only)

- [ ] **Step 1: Add gallery preview CSS to `assets/css/admin.css`**

Add this anywhere near the existing `.file-upload-area`/`.current-file-preview` rules (around line 676):

```css
.gallery-thumb-wrap {
  display: flex; flex-wrap: wrap; gap: 10px;
  margin-bottom: 10px;
}
.gallery-thumb-wrap:empty { margin-bottom: 0; }
.gallery-thumb-item {
  position: relative; width: 72px; height: 72px;
  border-radius: 6px; overflow: hidden;
  border: 1px solid var(--border);
}
.gallery-thumb-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gallery-thumb-remove {
  position: absolute; top: 3px; right: 3px;
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(0,0,0,0.65); color: #fff; border: none;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; cursor: pointer;
}
```

- [ ] **Step 2: Add story fields, gallery upload UI, and gallery state to `openPortfolioForm()`**

In `assets/js/admin.js`, find the start of `openPortfolioForm` (line 199):

```js
    function openPortfolioForm(data=null) {
      const isEdit = !!data?.id;
      const tagsArr = data?.tags || [];
      const typeOptions = PORTFOLIO_TYPES.map(t =>
        `<option value="${t.val}" ${data?.type===t.val?'selected':''}>${t.label}</option>`
      ).join('');
```

Replace it with (adds gallery state + a render function, everything else identical):

```js
    function openPortfolioForm(data=null) {
      const isEdit = !!data?.id;
      const tagsArr = data?.tags || [];
      const typeOptions = PORTFOLIO_TYPES.map(t =>
        `<option value="${t.val}" ${data?.type===t.val?'selected':''}>${t.label}</option>`
      ).join('');

      let galleryArr = data?.gallery_images || [];
      if (typeof galleryArr === 'string') {
        try { galleryArr = JSON.parse(galleryArr); } catch { galleryArr = []; }
      }
      if (!Array.isArray(galleryArr)) galleryArr = [];
      let pendingGalleryFiles = [];

      function renderGalleryPreview() {
        const wrap = document.getElementById('galleryPreviewWrap');
        if (!wrap) return;
        const savedHtml = galleryArr.map((url, i) => `
          <div class="gallery-thumb-item">
            <img src="${url}">
            <button type="button" class="gallery-thumb-remove" data-kind="saved" data-idx="${i}"><i class="fas fa-times"></i></button>
          </div>`).join('');
        const pendingHtml = pendingGalleryFiles.map((file, i) => `
          <div class="gallery-thumb-item">
            <img src="${URL.createObjectURL(file)}">
            <button type="button" class="gallery-thumb-remove" data-kind="pending" data-idx="${i}"><i class="fas fa-times"></i></button>
          </div>`).join('');
        wrap.innerHTML = savedHtml + pendingHtml;
        wrap.querySelectorAll('.gallery-thumb-remove').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            if (btn.dataset.kind === 'saved') galleryArr.splice(idx, 1);
            else pendingGalleryFiles.splice(idx, 1);
            renderGalleryPreview();
          });
        });
      }
```

- [ ] **Step 3: Add the 4 story textareas and gallery upload markup**

Find this line (the "Thumbnail / Cover" field, around line 224 pre-edit):

```js
        <div class="form-group"><label class="form-label">Thumbnail / Cover</label>
```

Insert this block immediately **before** it (so story fields + gallery sit between "Deskripsi" and "Thumbnail / Cover"):

```js
        <div class="form-group"><label class="form-label">Latar Belakang <span style="opacity:.4">(opsional)</span></label>
          <textarea class="form-textarea" id="f_background" placeholder="Konteks/latar belakang project...">${data?.background||''}</textarea></div>
        <div class="form-group"><label class="form-label">Masalah <span style="opacity:.4">(opsional)</span></label>
          <textarea class="form-textarea" id="f_problem" placeholder="Masalah yang diselesaikan...">${data?.problem||''}</textarea></div>
        <div class="form-group"><label class="form-label">Solusi <span style="opacity:.4">(opsional)</span></label>
          <textarea class="form-textarea" id="f_solution" placeholder="Proses/solusi yang dikerjakan...">${data?.solution||''}</textarea></div>
        <div class="form-group"><label class="form-label">Hasil <span style="opacity:.4">(opsional)</span></label>
          <textarea class="form-textarea" id="f_result" placeholder="Hasil/dampak project...">${data?.result||''}</textarea></div>

        <div class="form-group"><label class="form-label">Galeri Foto <span style="opacity:.4">(opsional, bisa lebih dari 1)</span></label>
          <div class="gallery-thumb-wrap" id="galleryPreviewWrap"></div>
          <div class="file-upload-area"><input type="file" id="f_gallery" accept="image/*" multiple/>
            <i class="fas fa-cloud-upload-alt"></i><p>Klik untuk upload foto galeri</p><p class="file-type-hint">JPG, PNG, WEBP — bisa pilih beberapa sekaligus</p>
          </div></div>

```

- [ ] **Step 4: Upload pending gallery files and save the combined array**

Find this block inside the save callback (around lines 264-269 pre-edit):

```js
        let thumbnailUrl = data?.thumbnail_url || null;
        const thumbFile = document.getElementById('f_thumb').files[0];
        if (thumbFile) {
          thumbnailUrl = await uploadFile(thumbFile, 'portfolio');
          if (!thumbnailUrl) { btnSave.disabled=false; btnSave.innerHTML='<i class="fas fa-floppy-disk"></i> Simpan'; return; }
        }
```

Add this immediately after it:

```js

        for (const file of pendingGalleryFiles) {
          const url = await uploadFile(file, 'portfolio');
          if (url) galleryArr.push(url);
        }
```

- [ ] **Step 5: Add the 4 story fields and `gallery_images` to the save payload**

Find the `payload` object (around lines 272-287 pre-edit):

```js
        const payload = {
          title:         document.getElementById('f_title').value.trim(),
          type:          document.getElementById('f_type').value,
          year:          document.getElementById('f_year').value.trim() || null,
          description:   document.getElementById('f_desc').value.trim(),
          tags,
          thumbnail_url: thumbnailUrl,
```

Insert 5 new lines right after `description:` and before `tags,`:

```js
        const payload = {
          title:          document.getElementById('f_title').value.trim(),
          type:           document.getElementById('f_type').value,
          year:           document.getElementById('f_year').value.trim() || null,
          description:    document.getElementById('f_desc').value.trim(),
          background:     document.getElementById('f_background').value.trim() || null,
          problem:        document.getElementById('f_problem').value.trim() || null,
          solution:       document.getElementById('f_solution').value.trim() || null,
          result:         document.getElementById('f_result').value.trim() || null,
          gallery_images: galleryArr,
          tags,
          thumbnail_url: thumbnailUrl,
```

(Re-aligning the existing colons is cosmetic — keep it if your editor auto-formats, but it's not required for correctness.)

- [ ] **Step 6: Wire up the gallery file input and initial render**

Find this block near the end of `openPortfolioForm` (around lines 300-313 pre-edit):

```js
      setTimeout(() => {
        document.getElementById('tagInput')?.addEventListener('keydown', e => {
          if (e.key==='Enter'||e.key===',') {
            e.preventDefault();
            const val = e.target.value.trim().replace(/,$/,'');
            if (!val) return;
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = `${val}<button onclick="removeTag(this)">✕</button>`;
            document.getElementById('tagsWrap').insertBefore(chip, e.target);
            e.target.value = '';
          }
        });
      }, 50);
    }
```

Replace the whole block with (adds gallery init after the existing `setTimeout`, still inside `openPortfolioForm`):

```js
      setTimeout(() => {
        document.getElementById('tagInput')?.addEventListener('keydown', e => {
          if (e.key==='Enter'||e.key===',') {
            e.preventDefault();
            const val = e.target.value.trim().replace(/,$/,'');
            if (!val) return;
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = `${val}<button onclick="removeTag(this)">✕</button>`;
            document.getElementById('tagsWrap').insertBefore(chip, e.target);
            e.target.value = '';
          }
        });
      }, 50);

      renderGalleryPreview();
      document.getElementById('f_gallery').addEventListener('change', (e) => {
        pendingGalleryFiles.push(...Array.from(e.target.files));
        e.target.value = '';
        renderGalleryPreview();
      });
    }
```

- [ ] **Step 7: Manual verification**

Log in to `/admin.html`, go to Portfolio, click "Tambah Baru" (or edit an existing project). Confirm:
- The 4 new textareas (Latar Belakang, Masalah, Solusi, Hasil) appear between Deskripsi and Thumbnail/Cover, all optional
- The "Galeri Foto" upload area appears below Thumbnail/Cover
- Selecting multiple image files at once shows all of them as thumbnails immediately (before saving), each with a working × remove button
- Removing a pending (not-yet-saved) thumbnail before saving works and doesn't upload it
- Saving with 2-3 gallery images successfully uploads them and persists `gallery_images` as a JSON array on the row (verify via Supabase Table Editor)
- Re-opening that same project's edit form shows the previously-saved gallery images as removable thumbnails too, and removing one + saving again correctly shrinks the array
- Existing fields (title, type, tags, thumbnail, links, sort order, featured/published toggles) still save correctly — this task must not regress the existing form

- [ ] **Step 8: Commit**

```bash
git add assets/js/admin.js assets/css/admin.css
git commit -m "Add story fields and gallery upload to admin Portfolio form"
```

---

### Task 6: Final end-to-end check

**Files:** none (verification only)

- [ ] **Step 1: Full flow smoke test**

Using the browser preview tools and the admin panel: create or edit one portfolio project with all 4 story fields filled in and 2-3 gallery images uploaded. Visit `/portfolio.html`, click "Lihat Detail" on that project, confirm the full case study renders correctly on `/portfolio-detail.html` (hero + gallery swap, all 4 sections, tags, action buttons, page title updates). Then check a legacy project (no story/gallery filled in) still renders sensibly with no empty section headings. Check `preview_console_logs` on both `/portfolio.html` and `/portfolio-detail.html` for errors. Resize to mobile (375px) and to a short desktop height (e.g. 1366x700, the class of viewport that broke the old lightbox) and confirm the new page has no equivalent clipping/overflow issue — it's a normal scrolling page now, not a fixed-height modal.

- [ ] **Step 2: Push**

```bash
git push origin main
```

Only after the user confirms they're satisfied with the manual verification results.
