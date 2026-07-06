# Contact Form + WhatsApp Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `contact.html` page (WhatsApp button + contact form) reachable from every page's nav, with submissions stored in Supabase and readable/deletable from a new admin panel page.

**Architecture:** One new nullable-free table (`messages`) with inverted RLS (public INSERT, admin-only SELECT/DELETE). A new static page follows the exact structural skeleton every other page already uses (same nav-overlay markup, same `main#main-content`/`page-header` pattern, same per-page `assets/css/<page>.css` + `assets/js/<page>.js` split). The admin panel gets a new read-only-with-delete page following the exact `pageMap`/`loadX`/`deleteX` pattern already used for Events/Certifications.

**Tech Stack:** Vanilla JS (no framework, no bundler), Supabase (Postgres + Auth + RLS), static HTML/CSS.

## Global Constraints

- No automated test runner in this repo (static site, no `package.json`) — every task's "test" step is manual verification via browser preview tools, not an automated test.
- This project's root `CLAUDE.md` mandates full SEO metadata (title, description, keywords, author, robots, theme-color, canonical, Open Graph, Twitter Card, JSON-LD breadcrumb) on every page, no orphan pages, no duplicate titles/descriptions — `contact.html` must get the same treatment already applied to the other 7 pages, and must be added to `sitemap.xml`.
- `assets/js/<page>.js` files (public-facing pages) are loaded `type="module"` in their HTML — use plain top-level function declarations, no `window.` assignment, no inline `onclick` attributes (matches `index.js`/`profil.js` convention).
- `assets/js/admin.js` is a plain non-module script — top-level functions are implicitly global, referenced via inline `onclick` attributes (matches the existing `loadEvents`/`deleteEvent` pattern).
- Reuse existing helpers/CSS tokens instead of inventing new ones: `showToast()`, `confirmDelete()` (admin.js), the `db` Supabase client already initialized in `admin.js`, the `supabase` client already exported from `supabase.js` for public pages, and the CSS custom properties defined in `assets/css/base.css` (`--bg`, `--bg-surface`, `--border`, `--border-mid`, `--text-1`, `--text-2`, `--text-3`, `--font-body`, `--font-display`).
- No new Supabase Storage bucket, no new backend endpoint in `backend_resume` — the form inserts directly into Supabase from the browser using the existing anon key, exactly like every other page's read queries already do.
- WhatsApp button links to `https://wa.me/<digits>` built from `profile.phone`: strip all non-digit characters, then if the result starts with `0` replace that leading `0` with `62` (Indonesian numbers are stored with a leading `0` but WhatsApp's `wa.me` links require the country code instead); if it already starts with `62`, leave it as-is. No pre-filled message text (per user decision).

---

### Task 1: Add the `messages` table in Supabase

**Files:**
- No file in this repo — this is a Supabase SQL Editor change (manual, same as the CV feature's DB migration)

**Interfaces:**
- Produces: a `messages` table (`id uuid`, `name text`, `email text`, `subject text` nullable, `message text`, `created_at timestamptz`), consumed by Task 3 (public INSERT) and Task 5 (admin SELECT/DELETE)

- [ ] **Step 1: Run this in the Supabase project's SQL Editor**

```sql
create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "Public insert messages" on messages
  for insert with check (true);

create policy "Auth read messages" on messages
  for select using (auth.role() = 'authenticated');

create policy "Auth delete messages" on messages
  for delete using (auth.role() = 'authenticated');
```

- [ ] **Step 2: Verify in the Supabase Table Editor**

Confirm the `messages` table exists with the 5 columns above, RLS is enabled, and 3 policies are listed (Public insert messages / Auth read messages / Auth delete messages).

- [ ] **Step 3: Commit**

Nothing to commit for this task (no local file changed) — proceed directly to Task 2.

---

### Task 2: Create `contact.html` + `assets/css/contact.css` (static markup only)

**Files:**
- Create: `contact.html`
- Create: `assets/css/contact.css`
- Modify: `sitemap.xml`

**Interfaces:**
- Produces: the following element IDs, all consumed by Task 4 (`contact.js`):
  - `#waButton` — the `<a>` tag for the WhatsApp button (starts with no `href`, hidden via `style="display:none"` until Task 4 sets it — same hidden-until-wired pattern as the CV download button)
  - `#contactEmail` — `<span>` that will show `profile.email`
  - `#contactForm` — the `<form>` element
  - `#c_name`, `#c_email`, `#c_subject`, `#c_message` — form inputs
  - `#contactFormMsg` — a status element for success/error messages after submit

No JavaScript in this task — Task 4 wires up all behavior. This task only produces markup and styling.

- [ ] **Step 1: Create `contact.html`**

Model this exactly on the structural skeleton of `profil.html` (same `site-header`, same `nav-overlay` — but with an 8th nav item added, see below — same `main#main-content`, same script tags at the bottom), with full SEO metadata matching the pattern already used on the other 7 pages (see `profil.html`'s `<head>` for the exact pattern to copy: canonical, OG, Twitter, icons, manifest, preconnect/dns-prefetch, and a `BreadcrumbList` JSON-LD block).

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Kontak — Eka Danar Arrasyid | Software Engineer Indonesia</title>
  <meta name="description" content="Hubungi Eka Danar Arrasyid untuk kolaborasi, pekerjaan, atau proyek freelance — lewat WhatsApp, email, atau form kontak langsung."/>
  <meta name="keywords" content="Kontak Eka Danar Arrasyid, Kontak Software Engineer Indonesia, Kontak Web Developer Indonesia, Hire PHP Developer, Hire Laravel Developer"/>
  <meta name="author" content="Eka Danar Arrasyid"/>
  <meta name="robots" content="index, follow, max-image-preview:large"/>
  <meta name="theme-color" content="#f0f0ef"/>
  <link rel="canonical" href="https://www.edanararrasyid.my.id/contact.html"/>

  <!-- Open Graph -->
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="Eka Danar Arrasyid"/>
  <meta property="og:title" content="Kontak — Eka Danar Arrasyid"/>
  <meta property="og:description" content="Hubungi Eka Danar Arrasyid untuk kolaborasi, pekerjaan, atau proyek freelance."/>
  <meta property="og:url" content="https://www.edanararrasyid.my.id/contact.html"/>
  <meta property="og:image" content="https://www.edanararrasyid.my.id/assets/bot_avatar.png"/>
  <meta property="og:locale" content="id_ID"/>

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="Kontak — Eka Danar Arrasyid"/>
  <meta name="twitter:description" content="Hubungi Eka Danar Arrasyid untuk kolaborasi, pekerjaan, atau proyek freelance."/>
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
  <link rel="stylesheet" href="./assets/css/contact.css"/>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.edanararrasyid.my.id/" },
      { "@type": "ListItem", "position": 2, "name": "Contact", "item": "https://www.edanararrasyid.my.id/contact.html" }
    ]
  }
  </script>
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
    <div class="page-header">
      <h1 class="page-title">Cont<span>act</span></h1>
      <p class="page-subtitle">Let's talk.</p>
    </div>

    <div class="contact-wrap">
      <div class="contact-info">
        <p class="contact-lead">Ada proyek, tawaran kerja, atau cuma mau say hi? Gas langsung chat atau isi form di samping.</p>

        <a id="waButton" class="contact-wa-btn" target="_blank" rel="noopener noreferrer" style="display:none">
          <i class="fab fa-whatsapp"></i> Chat via WhatsApp
        </a>

        <div class="contact-email-row">
          <i class="fas fa-envelope"></i>
          <span id="contactEmail">—</span>
        </div>

        <div class="contact-social-row">
          <a href="https://x.com/DanarrArrsyd"                   target="_blank" class="contact-social">Twitter</a>
          <a href="https://www.instagram.com/danar_arrsyd/"       target="_blank" class="contact-social">Instagram</a>
          <a href="https://www.linkedin.com/in/ekadanararrasyid/" target="_blank" class="contact-social">LinkedIn</a>
          <a href="https://github.com/Danar52"                    target="_blank" class="contact-social">GitHub</a>
        </div>
      </div>

      <form id="contactForm" class="contact-form">
        <div class="contact-field">
          <label for="c_name">Nama</label>
          <input type="text" id="c_name" name="name" required maxlength="100"/>
        </div>
        <div class="contact-field">
          <label for="c_email">Email</label>
          <input type="email" id="c_email" name="email" required maxlength="150"/>
        </div>
        <div class="contact-field">
          <label for="c_subject">Subjek <span class="contact-optional">(opsional)</span></label>
          <input type="text" id="c_subject" name="subject" maxlength="150"/>
        </div>
        <div class="contact-field">
          <label for="c_message">Pesan</label>
          <textarea id="c_message" name="message" rows="5" required maxlength="2000"></textarea>
        </div>
        <button type="submit" id="contactSubmitBtn" class="contact-submit-btn">Kirim Pesan</button>
        <p id="contactFormMsg" class="contact-form-msg" role="status"></p>
      </form>
    </div>
  </main>

  <script src="./assets/js/site.js"></script>
  <script type="module" src="./assets/js/contact.js"></script>
  <script type="module" src="chatbot.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `assets/css/contact.css`**

```css
/* ═══════════════════════════════════════════════════════════════
   CONTACT.CSS — Contact page
═══════════════════════════════════════════════════════════════ */

.contact-wrap {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 48px;
  padding: 0 40px 80px;
  max-width: 1100px;
}

.contact-lead {
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-2);
  margin-bottom: 28px;
}

.contact-wa-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 14px 26px;
  background: #25D366;
  color: #fff;
  text-decoration: none;
  border-radius: 40px;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  transition: opacity 0.2s;
  margin-bottom: 22px;
}
.contact-wa-btn:hover { opacity: 0.85; }
.contact-wa-btn i { font-size: 18px; }

.contact-email-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-1);
  margin-bottom: 22px;
}
.contact-email-row i { color: var(--text-3); }

.contact-social-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
.contact-social {
  font-family: var(--font-body);
  font-size: 12.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-2);
  text-decoration: none;
  border-bottom: 1px solid var(--border-mid);
  padding-bottom: 2px;
  transition: color 0.2s, border-color 0.2s;
}
.contact-social:hover { color: var(--text-1); border-color: var(--text-1); }

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.contact-field { display: flex; flex-direction: column; gap: 8px; }
.contact-field label {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-3);
}
.contact-optional { text-transform: none; letter-spacing: normal; opacity: 0.7; }

.contact-field input,
.contact-field textarea {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-1);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 13px 16px;
  resize: vertical;
  transition: border-color 0.2s;
}
.contact-field input:focus,
.contact-field textarea:focus {
  outline: none;
  border-color: var(--text-1);
}

.contact-submit-btn {
  align-self: flex-start;
  padding: 13px 28px;
  background: var(--text-1);
  color: var(--bg);
  border: none;
  border-radius: 40px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 0.2s;
}
.contact-submit-btn:hover { opacity: 0.8; }
.contact-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.contact-form-msg {
  font-family: var(--font-body);
  font-size: 12.5px;
  min-height: 16px;
  margin: 0;
}
.contact-form-msg.success { color: #2f9e44; }
.contact-form-msg.error   { color: #e03131; }

@media (max-width: 768px) {
  .contact-wrap { grid-template-columns: 1fr; padding: 0 20px 56px; gap: 36px; }
}
```

- [ ] **Step 3: Add `contact.html` to `sitemap.xml`**

Add this `<url>` block to `sitemap.xml`, following the exact pattern of the existing entries (same `<lastmod>` value already used for the other entries):

```xml
  <url>
    <loc>https://www.edanararrasyid.my.id/contact.html</loc>
    <lastmod>2026-07-06</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.7</priority>
  </url>
```

- [ ] **Step 4: Manual verification**

Start the preview server (`resume` launch config), navigate to `/contact.html`. Confirm: page loads with no console errors, two-column layout renders (info left, form right), resize to 375px width confirms the layout stacks to a single column, the "Chat via WhatsApp" button and its text are present but invisible (`display:none` — this is expected, Task 4 wires it), all other nav links across the site are unaffected (Task 3 handles adding the Contact link to them).

- [ ] **Step 5: Commit**

```bash
git add contact.html assets/css/contact.css sitemap.xml
git commit -m "Add contact page markup, styling, and sitemap entry"
```

---

### Task 3: Add the "Contact" nav link to the 7 existing pages

**Files:**
- Modify: `index.html`
- Modify: `profil.html`
- Modify: `skills.html`
- Modify: `experience.html`
- Modify: `portfolio.html`
- Modify: `certification.html`
- Modify: `event.html`

**Interfaces:**
- No code interfaces — this is a markup-only, mechanical, identical edit applied to 7 files.

Every one of these 7 files has the exact same `<ul class="nav-links-list">` block (verified: identical text across all of them). Apply this **exact same edit** to each of the 7 files listed above — find this in each file:

```html
        <li><a href="event.html"         class="nav-link"><span class="nav-link-num">07</span>Events<i class="fas fa-arrow-right nav-link-arrow"></i></a></li>
      </ul>
```

and replace it with:

```html
        <li><a href="event.html"         class="nav-link"><span class="nav-link-num">07</span>Events<i class="fas fa-arrow-right nav-link-arrow"></i></a></li>
        <li><a href="contact.html"       class="nav-link"><span class="nav-link-num">08</span>Contact<i class="fas fa-arrow-right nav-link-arrow"></i></a></li>
      </ul>
```

- [ ] **Step 1: Apply the edit to all 7 files**

Apply the exact replacement above to `index.html`, `profil.html`, `skills.html`, `experience.html`, `portfolio.html`, `certification.html`, and `event.html`. Do not touch `contact.html` itself in this task — it already has the 8-item nav from Task 2.

- [ ] **Step 2: Manual verification**

Start the preview server, open each of the 7 pages, open the nav overlay (click the menu toggle), confirm "08 Contact" appears as the last item and clicking it navigates to `/contact.html`. Spot-check at least 3 of the 7 pages plus `contact.html` itself.

- [ ] **Step 3: Commit**

```bash
git add index.html profil.html skills.html experience.html portfolio.html certification.html event.html
git commit -m "Add Contact nav link to all existing pages"
```

---

### Task 4: `assets/js/contact.js` — WhatsApp wiring + form submission

**Files:**
- Create: `assets/js/contact.js`

**Interfaces:**
- Consumes: `#waButton`, `#contactEmail`, `#contactForm`, `#c_name`, `#c_email`, `#c_subject`, `#c_message`, `#contactSubmitBtn`, `#contactFormMsg` (all produced by Task 2's `contact.html`); `supabase` client from `../../supabase.js` (same import used by every other public page's JS, e.g. `profil.js:1`)
- Produces: nothing consumed by later tasks — this is the last piece of the public-facing feature

- [ ] **Step 1: Write `assets/js/contact.js`**

```js
import { supabase } from '../../supabase.js';

function buildWhatsAppUrl(phone) {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  return `https://wa.me/${digits}`;
}

async function loadContactInfo() {
  const { data, error } = await supabase.from('profile').select('phone, email').single();
  if (error || !data) return;

  if (data.email) {
    document.getElementById('contactEmail').textContent = data.email;
  }

  if (data.phone) {
    const btn = document.getElementById('waButton');
    btn.href = buildWhatsAppUrl(data.phone);
    btn.style.display = '';
  }
}

loadContactInfo();

function setFormMsg(text, type) {
  const el = document.getElementById('contactFormMsg');
  el.textContent = text;
  el.className = `contact-form-msg ${type}`;
}

const form = document.getElementById('contactForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name    = document.getElementById('c_name').value.trim();
  const email   = document.getElementById('c_email').value.trim();
  const subject = document.getElementById('c_subject').value.trim();
  const message = document.getElementById('c_message').value.trim();

  if (!name || !email || !message) {
    setFormMsg('Nama, email, dan pesan wajib diisi.', 'error');
    return;
  }

  const btn = document.getElementById('contactSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Mengirim...';
  setFormMsg('', '');

  const { error } = await supabase.from('messages').insert({
    name,
    email,
    subject: subject || null,
    message,
  });

  btn.disabled = false;
  btn.textContent = 'Kirim Pesan';

  if (error) {
    setFormMsg('Gagal mengirim pesan. Coba lagi bentar.', 'error');
    return;
  }

  form.reset();
  setFormMsg('Pesan terkirim! Gw bakal balas secepatnya 🙌', 'success');
});
```

- [ ] **Step 2: Manual verification**

With the preview server running and a real `profile.phone`/`profile.email` already set (they are, from earlier features), reload `/contact.html`:
- Confirm the WhatsApp button becomes visible and its `href` is `https://wa.me/62...` (check via browser devtools that a leading `0` in the stored phone number was correctly replaced with `62`, not left as `620...`)
- Confirm the email under the button shows the real `profile.email` value
- Submit the form with an empty "Nama" field, confirm the inline error message appears and no network request is made
- Submit the form fully filled in, confirm: the button shows "Mengirim..." briefly, then the success message appears, the form fields clear, and a new row appears in the Supabase `messages` table (check via Supabase Table Editor)
- Check `preview_console_logs` for errors on all of the above

- [ ] **Step 3: Commit**

```bash
git add assets/js/contact.js
git commit -m "Wire up WhatsApp button and contact form submission"
```

---

### Task 5: Admin panel — "Pesan" page (view + delete messages)

**Files:**
- Modify: `admin.html`
- Modify: `assets/js/admin.js`

**Interfaces:**
- Consumes: `db` (Supabase client already initialized in `admin.js:10`), `showToast(msg, type?)` (`admin.js:39`), `confirmDelete(msg, onConfirm)` (`admin.js:54`), the existing `pageMap` object and sidebar-link click handler (`admin.js:130-153`)
- Produces: `loadMessages()` and `deleteMessage(id, name)` — global functions (plain script, no `type="module"`), referenced by the new `pageMap.messages` entry and an inline `onclick` in the rendered table

- [ ] **Step 1: Add the sidebar link and page container in `admin.html`**

In `admin.html`, find this line (around line 37):

```html
      <button class="sidebar-link" data-page="certifications"><i class="fas fa-certificate"></i> Certification</button>
```

Add this line right after it:

```html
      <button class="sidebar-link" data-page="messages"><i class="fas fa-envelope"></i> Pesan</button>
```

Then find this line (around line 64):

```html
      <div class="page" id="page-certifications"><div id="certContent"><div class="loading"><i class="fas fa-spinner fa-spin"></i></div></div></div>
```

Add this line right after it:

```html
      <div class="page" id="page-messages"><div id="messagesContent"><div class="loading"><i class="fas fa-spinner fa-spin"></i></div></div></div>
```

- [ ] **Step 2: Register the page in `pageMap`**

In `assets/js/admin.js`, find the `pageMap` object (line 130-137):

```js
    const pageMap = {
      profile:        { title:'Edit <span>Profil</span>',           load:loadProfile,        hasAdd:false },
      skills:         { title:'Manage <span>Skills</span>',         load:loadSkills,         hasAdd:true  },
      portfolio:      { title:'Manage <span>Portfolio</span>',      load:loadPortfolio,      hasAdd:true  },
      experience:     { title:'Manage <span>Experience</span>',     load:loadExperience,     hasAdd:true  },
      events:         { title:'Manage <span>Event / Org</span>',    load:loadEvents,         hasAdd:true  },
      certifications: { title:'Manage <span>Certification</span>',  load:loadCertifications, hasAdd:true  },
    };
```

Add one more entry so it reads:

```js
    const pageMap = {
      profile:        { title:'Edit <span>Profil</span>',           load:loadProfile,        hasAdd:false },
      skills:         { title:'Manage <span>Skills</span>',         load:loadSkills,         hasAdd:true  },
      portfolio:      { title:'Manage <span>Portfolio</span>',      load:loadPortfolio,      hasAdd:true  },
      experience:     { title:'Manage <span>Experience</span>',     load:loadExperience,     hasAdd:true  },
      events:         { title:'Manage <span>Event / Org</span>',    load:loadEvents,         hasAdd:true  },
      certifications: { title:'Manage <span>Certification</span>',  load:loadCertifications, hasAdd:true  },
      messages:       { title:'Pesan <span>Masuk</span>',           load:loadMessages,       hasAdd:false },
    };
```

`hasAdd:false` means the existing "Tambah Baru" button in the topbar automatically hides on this page (see `admin.js:148`, already generic) — no other wiring needed for that.

- [ ] **Step 3: Add `loadMessages()` and `deleteMessage()`**

Add these two functions anywhere at the top level of `assets/js/admin.js` (e.g. right after `deleteCert` around line 716):

```js
    async function loadMessages() {
      const el = document.getElementById('messagesContent');
      el.innerHTML = '<div class="loading"><i class="fas fa-circle-notch"></i></div>';
      const { data, error } = await db.from('messages').select('*').order('created_at', { ascending: false });
      if (error || !data) { el.innerHTML = '<p style="color:red;padding:20px">Gagal load data.</p>'; return; }
      el.innerHTML = data.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Nama</th><th>Email</th><th>Subjek</th><th>Pesan</th><th>Tanggal</th><th style="width:60px">Aksi</th></tr></thead>
        <tbody>${data.map(m => `<tr>
          <td style="font-weight:600;color:var(--heading)">${m.name}</td>
          <td style="font-size:12px">${m.email}</td>
          <td style="font-size:12px">${m.subject || '-'}</td>
          <td style="font-size:12px;max-width:280px;white-space:pre-wrap">${m.message}</td>
          <td style="font-size:12px;opacity:.7">${new Date(m.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
          <td><div class="td-actions">
            <button class="btn btn-danger btn-sm" onclick="deleteMessage('${m.id}','${m.name.replace(/'/g,'\\\'')}')"><i class="fas fa-trash"></i></button>
          </div></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty-state"><i class="fas fa-envelope-open"></i><p>Belum ada pesan masuk.</p></div>';
    }

    async function deleteMessage(id, name) {
      confirmDelete(`Hapus pesan dari "${name}"?`, async () => {
        const { error } = await db.from('messages').delete().eq('id', id);
        if (error) { showToast('Gagal hapus', 'error'); return; }
        showToast('Pesan dihapus!');
        loadMessages();
      });
    }
```

- [ ] **Step 4: Manual verification**

Log in to `/admin.html`, click the new "Pesan" sidebar link, confirm:
- If no messages exist yet, the empty state ("Belum ada pesan masuk.") shows
- After submitting a test message via the public `/contact.html` form (Task 4), reloading this admin page shows it in the table with correct name/email/subject/message/date
- Clicking the delete button shows the confirm dialog, confirming deletes the row and the table re-renders without it
- The "Tambah Baru" button in the topbar is hidden while on this page (since `hasAdd:false`)

- [ ] **Step 5: Commit**

```bash
git add admin.html assets/js/admin.js
git commit -m "Add admin Pesan page to view and delete contact messages"
```

---

### Task 6: Final end-to-end check

**Files:** none (verification only)

- [ ] **Step 1: Full flow smoke test**

Using the browser preview tools: start the `resume` server, visit `/contact.html`, confirm the WhatsApp button and email are populated, submit a real test message, confirm it appears in the admin "Pesan" page, delete it from there, confirm it's gone. Check `preview_console_logs` for errors across `/contact.html` and `/admin.html`. Spot-check the nav link on 2-3 other pages once more.

- [ ] **Step 2: Push**

```bash
git push origin main
```

Only after the user confirms they're satisfied with the manual verification results.
