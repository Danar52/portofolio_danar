# Admin Redesign + Visitor Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visitor-analytics page to the admin dashboard (daily trend, top pages, top referrers) and give `admin.html`/`admin.css` a visual polish pass, without touching the public site or the existing admin data model.

**Architecture:** A new Supabase table (`page_visits`) collects one row per page load from the 9 public pages via a shared tracking module. The existing admin dashboard's single-page-app pattern (`pageMap` + `.page`/`.sidebar-link[data-page]` toggling in `admin.js`) gets one more entry — `analytics` — which becomes the default landing page. Chart.js (loaded from the CDN already whitelisted in `vercel.json`'s CSP) renders the daily trend as a bar chart; everything else reuses existing admin.css table/badge/bar patterns plus new shadow tokens and a `.stat-card` component.

**Tech Stack:** Vanilla JS (ES modules), Supabase JS v2 (`@supabase/supabase-js@2`), Chart.js 4 (UMD via jsdelivr), plain CSS (no framework). Static HTML site deployed on Vercel — no build step, no test runner.

## Global Constraints

- No change to public-page layout, colors, typography, or JS behavior beyond the one-line tracking call added to each page's module script.
- No change to `admin.js` DOM selectors that existing code depends on (`id=`/`class=` hooks stay intact).
- No new colors introduced in `admin.css` — same grey-studio token palette (`--bg`, `--text-1`, `--accent`, etc.), only new shadow tokens and a new component.
- CSP in `vercel.json` already whitelists `cdnjs.cloudflare.com` and `cdn.jsdelivr.net` in `script-src` — Chart.js from jsdelivr needs no CSP change. Verify this holds (Task 4) rather than assuming.
- `page_visits` stores no PII: no IP, no user-agent, no cookie/session id.
- Live Supabase schema changes (Task 1) are a production-database action — confirm with the user before applying, per the standing safety rules on hard-to-reverse actions.
- The repo's pre-commit hook (`scripts/hooks/pre-commit`) auto-runs `scripts/bump-assets.py` and stages the `?v=` stamp updates on every commit that touches `assets/css/*.js`/`assets/js/*.js`/`supabase.js` references — no manual stamping step needed in this plan.
- Security follow-up from the spec (RLS hardening on content tables / disabling public Supabase signup) is explicitly **out of scope** for this plan — it's a separate, user-confirmed follow-up, not a task here.

---

### Task 1: `page_visits` table + RLS

**Files:**
- Modify: `supabase_schema.sql` (append new section at end)
- Live DB: apply via Supabase MCP `apply_migration`, gated on user confirmation

**Interfaces:**
- Produces: table `page_visits(id, page, path, referrer, visited_at)`, columns and constraints exactly as below — Task 2's `trackVisit()` and Task 5's `loadAnalytics()` both depend on these exact column names.

- [ ] **Step 1: Append the table + RLS SQL to `supabase_schema.sql`**

Add at the end of the file:

```sql
-- ── 8. PAGE VISITS (visitor analytics) ──────────────────────
-- No PII: no IP, no user-agent, no cookie/session id.
CREATE TABLE page_visits (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page        TEXT NOT NULL CHECK (page IN (
                'index','profil','experience','skills','certification',
                'portfolio','portfolio-detail','event','contact'
              )),
  path        TEXT NOT NULL,
  referrer    TEXT,
  visited_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;

-- Public pages write their own visit row; nothing else.
CREATE POLICY "Public insert page_visits" ON page_visits
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only the logged-in admin can read visit data.
CREATE POLICY "Auth read page_visits" ON page_visits
  FOR SELECT
  TO authenticated
  USING (true);
```

- [ ] **Step 2: Apply the migration to the live Supabase project**

This writes to production. Confirm with the user before running, then apply via the Supabase MCP tool (`apply_migration`), using the SQL from Step 1 as the migration body, name it e.g. `add_page_visits_table`.

- [ ] **Step 3: Verify the table and policies**

Use the Supabase MCP `list_tables` tool (or `execute_sql` with `select * from pg_policies where tablename = 'page_visits';`) and confirm:
- `page_visits` exists with the 5 columns above.
- Two policies exist: `Public insert page_visits` (INSERT, role `anon`) and `Auth read page_visits` (SELECT, role `authenticated`).

- [ ] **Step 4: Manual smoke test — anon insert allowed, anon select denied**

Using the project's anon key (already public in `supabase.js`), run from a scratch Node/browser console:

```js
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
const db = createClient('https://vdnysjewpqunxokscaan.supabase.co', '<anon key from supabase.js>');
await db.from('page_visits').insert({ page: 'index', path: '/', referrer: null });
// Expected: { error: null } — insert succeeds
const { data, error } = await db.from('page_visits').select('*');
// Expected: data === [] (RLS hides rows from anon), error === null
```

- [ ] **Step 5: Commit**

```bash
git add supabase_schema.sql
git commit -m "$(cat <<'EOF'
Add page_visits table for visitor analytics

INSERT open to anon (public pages track their own visit), SELECT
restricted to authenticated (admin-only read). No PII columns.
EOF
)"
```

---

### Task 2: Tracking module + wiring into the 9 public pages

**Files:**
- Create: `assets/js/analytics-track.js`
- Modify: `assets/js/index.js:1`, `assets/js/profil.js:1`, `assets/js/experience.js:1`, `assets/js/skills.js:1`, `assets/js/certification.js:1`, `assets/js/portfolio.js:1`, `assets/js/portfolio-detail.js:1`, `assets/js/event.js:1`, `assets/js/contact.js:1`

**Interfaces:**
- Consumes: `supabase` named export from `../../supabase.js` (already imported by every file in this task).
- Produces: `trackVisit(): Promise<void>` from `assets/js/analytics-track.js` — call it, no return value used.

- [ ] **Step 1: Create `assets/js/analytics-track.js`**

```js
import { supabase } from '../../supabase.js?v=a77a873f';

const PAGE_SLUGS = {
  '/': 'index',
  '/index.html': 'index',
  '/profil.html': 'profil',
  '/experience.html': 'experience',
  '/skills.html': 'skills',
  '/certification.html': 'certification',
  '/portfolio.html': 'portfolio',
  '/portfolio-detail.html': 'portfolio-detail',
  '/event.html': 'event',
  '/contact.html': 'contact',
};

export async function trackVisit() {
  try {
    const page = PAGE_SLUGS[location.pathname];
    if (!page) return; // unknown path (e.g. 404) — don't track
    await supabase.from('page_visits').insert({
      page,
      path: location.pathname,
      referrer: document.referrer || null,
    });
  } catch (_) {
    // tracking must never break the page
  }
}
```

(The pre-commit hook rewrites the `?v=` stamp on the `supabase.js` import automatically — the literal value above doesn't need to match exactly.)

- [ ] **Step 2: Wire into each of the 9 page module scripts**

For each file, add the import and a call at the very top, right after the existing `supabase.js` import line. Example for `assets/js/index.js` (line 1 today is `import { supabase } from '../../supabase.js?v=a77a873f';`):

```js
import { supabase } from '../../supabase.js?v=a77a873f';
import { trackVisit } from './analytics-track.js';
trackVisit();

/* ── SELECTED WORK ────────────────────────────────────────── */
```

Repeat the same two added lines (`import { trackVisit } from './analytics-track.js';` and `trackVisit();`) immediately after the existing `supabase.js` import line, in each of:
- `assets/js/profil.js`
- `assets/js/experience.js`
- `assets/js/skills.js`
- `assets/js/certification.js`
- `assets/js/portfolio.js`
- `assets/js/portfolio-detail.js`
- `assets/js/event.js`
- `assets/js/contact.js`

Do not add this to `admin.js`, anything loaded by `admin-login.html`, or `404.html`.

- [ ] **Step 3: Manual test — visits recorded**

Serve the site locally (or open the deployed preview) and visit each of the 9 pages once. In the Supabase dashboard (Table Editor → `page_visits`), confirm 9 new rows appear with the expected `page` slug and `path`. Open the browser console on each page and confirm no errors are thrown (a failed insert should fail silently).

- [ ] **Step 4: Commit**

```bash
git add assets/js/analytics-track.js assets/js/index.js assets/js/profil.js assets/js/experience.js assets/js/skills.js assets/js/certification.js assets/js/portfolio.js assets/js/portfolio-detail.js assets/js/event.js assets/js/contact.js
git commit -m "$(cat <<'EOF'
Track page visits from the 9 public pages

Fire-and-forget insert into page_visits on module load; silently
no-ops on unknown paths or network/RLS failure so it can never
break the page it's tracking.
EOF
)"
```

---

### Task 3: Admin visual polish — shadow tokens + `.stat-card` + analytics layout CSS

**Files:**
- Modify: `assets/css/admin.css`

Before writing CSS, run this task's styling through the `frontend-design` skill so the new component reads as part of a considered system (spacing, elevation, hover state) rather than an ad-hoc addition — reuse the existing token names (`--bg`, `--text-1`, `--border`, `--accent-lt`, etc.) rather than inventing new colors.

**Interfaces:**
- Produces: CSS classes `.stat-card-row`, `.stat-card`, `.stat-num`, `.stat-label`, `.analytics-cols`, `.topbar.scrolled` — Task 5's `loadAnalytics()` and its scroll listener depend on these exact class names.

- [ ] **Step 1: Add shadow tokens to `:root`**

In `assets/css/admin.css`, inside the existing `:root { ... }` block (after the `--sidebar-w`/`--error`/`--success` lines, before the legacy-compat comment), add:

```css
  --shadow-sm: 0 1px 3px rgba(28,28,26,0.06), 0 1px 2px rgba(28,28,26,0.04);
  --shadow-md: 0 8px 24px rgba(28,28,26,0.08), 0 2px 6px rgba(28,28,26,0.05);
```

- [ ] **Step 2: Apply shadows to existing surfaces**

Add `box-shadow: var(--shadow-sm);` to the existing `.sidebar-brand` rule and the existing `.table-wrap` rule (both already defined in `admin.css`).

Add a scroll-triggered shadow on the topbar — append a new rule near the existing `.topbar { ... }` block:

```css
.topbar.scrolled { box-shadow: var(--shadow-sm); }
```

- [ ] **Step 3: Add the `.stat-card` component**

Append a new section (after the existing `SKILL PERCENTAGE BAR` section, before `EMPTY & LOADING STATES`):

```css
/* ═══════════════════════════════════════════════════════════════
   STAT CARDS
═══════════════════════════════════════════════════════════════ */
.stat-card-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s, transform 0.2s;
}
.stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }

.stat-card i {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--accent-lt);
  color: var(--text-1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.stat-num {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 450;
  color: var(--text-1);
  letter-spacing: -0.3px;
  line-height: 1.2;
}
.stat-label {
  font-size: 10.5px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-top: 2px;
}

.analytics-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 900px) {
  .stat-card-row { grid-template-columns: repeat(2, 1fr); }
  .analytics-cols { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .stat-card-row { grid-template-columns: 1fr; }
}
```

- [ ] **Step 4: Manual visual check**

Not yet wired to markup (that's Task 5) — visually verify in Task 5's manual test instead. Skip a standalone check here.

- [ ] **Step 5: Commit**

```bash
git add assets/css/admin.css
git commit -m "$(cat <<'EOF'
Add shadow tokens and stat-card component to admin.css

Grey-studio palette unchanged — only elevation (shadow) and the new
stat-card component, reused by the upcoming Analytics page.
EOF
)"
```

---

### Task 4: `admin.html` — nav entry, page container, Chart.js

**Files:**
- Modify: `admin.html`

**Interfaces:**
- Consumes: `.stat-card-row`/`.analytics-cols` classes from Task 3 (referenced by Task 5's rendered HTML, not by this task directly).
- Produces: `<div class="page" id="page-analytics">` container with inner `<div id="analyticsContent">` — Task 5's `loadAnalytics()` targets `#analyticsContent` exactly as `loadSkills()` targets `#skillsContent` today.

- [ ] **Step 1: Add the "Overview" nav section above "Profil"**

In `admin.html`, inside `<nav class="sidebar-nav">`, replace:

```html
      <p class="nav-section-label">Profil</p>
      <button class="sidebar-link" data-page="profile"><i class="fas fa-user"></i> Edit Profil</button>
```

with:

```html
      <p class="nav-section-label">Overview</p>
      <button class="sidebar-link active" data-page="analytics"><i class="fas fa-chart-line"></i> Analytics</button>

      <p class="nav-section-label">Profil</p>
      <button class="sidebar-link" data-page="profile"><i class="fas fa-user"></i> Edit Profil</button>
```

- [ ] **Step 2: Remove the default-active state from the Skills nav link**

Change:

```html
      <button class="sidebar-link active" data-page="skills"><i class="fas fa-code"></i> Skills</button>
```

to:

```html
      <button class="sidebar-link" data-page="skills"><i class="fas fa-code"></i> Skills</button>
```

- [ ] **Step 3: Add the Analytics page container**

In `admin.html`, inside `<div class="content">`, replace:

```html
      <div class="page" id="page-profile"><div id="profileContent"><div class="loading"><i class="fas fa-spinner fa-spin"></i></div></div></div>
      <div class="page active" id="page-skills"><div id="skillsContent"><div class="loading"><i class="fas fa-spinner fa-spin"></i></div></div></div>
```

with:

```html
      <div class="page active" id="page-analytics"><div id="analyticsContent"><div class="loading"><i class="fas fa-spinner fa-spin"></i></div></div></div>
      <div class="page" id="page-profile"><div id="profileContent"><div class="loading"><i class="fas fa-spinner fa-spin"></i></div></div></div>
      <div class="page" id="page-skills"><div id="skillsContent"><div class="loading"><i class="fas fa-spinner fa-spin"></i></div></div></div>
```

- [ ] **Step 4: Add Chart.js before `admin.js`**

Change:

```html
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script src="./assets/js/admin.js?v=bf99d896"></script>
```

to:

```html
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <script src="./assets/js/admin.js?v=bf99d896"></script>
```

- [ ] **Step 5: Verify CSP covers the new CDN request**

Open `vercel.json` and confirm `script-src` already includes `https://cdn.jsdelivr.net` (it does — same host `supabase-js` already loads from). No change needed; this step is a check, not an edit.

- [ ] **Step 6: Commit**

```bash
git add admin.html
git commit -m "$(cat <<'EOF'
Add Analytics nav entry and page container, load Chart.js

Analytics becomes the default active page on admin.html load,
replacing Skills as the landing page.
EOF
)"
```

---

### Task 5: `admin.js` — `loadAnalytics()`, pageMap entry, default page, scroll shadow

**Files:**
- Modify: `assets/js/admin.js:129-153` (pageMap + nav wiring + default page), append new `loadAnalytics()` function, append scroll listener near the sidebar-toggle wiring at the top of the file.

**Interfaces:**
- Consumes: `db` (existing Supabase client, `assets/js/admin.js:10`), `escapeHtml()` (defined in this task, Step 1), `.stat-card-row`/`.stat-card`/`.analytics-cols`/`.pct-wrap`/`.pct-bar`/`.pct-fill`/`.pct-num`/`.empty-state` classes (Task 3 + existing admin.css), `#analyticsContent` container (Task 4), global `Chart` (Task 4's CDN script).
- Produces: `loadAnalytics(): Promise<void>`, registered in `pageMap.analytics`.

- [ ] **Step 1: Add an HTML-escaping helper**

`page_visits.page` is constrained by a DB `CHECK` (Task 1), but `path`/`referrer` are free text and the insert is public — anyone can POST arbitrary strings to those two columns directly against the REST API, bypassing the tracking script entirely. Escape everything derived from those columns before it goes into `innerHTML`.

In `assets/js/admin.js`, add near the top, after the `closeSidebar()` function (around line 34):

```js
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
```

- [ ] **Step 2: Add the topbar scroll-shadow listener**

Add right after the `escapeHtml` function from Step 1:

```js
const topbarEl = document.querySelector('.topbar');
document.querySelector('.content').addEventListener('scroll', () => {
  topbarEl.classList.toggle('scrolled', document.querySelector('.content').scrollTop > 4);
});
```

(`.content` is the scrollable container in `admin.html` — confirm this matches the actual scroll parent when testing in Step 6; if `.content` itself doesn't scroll and `#adminMain` or `window` does instead, attach the listener there instead and adjust the scrollTop read accordingly.)

- [ ] **Step 3: Register `analytics` in `pageMap` and make it the default page**

In `assets/js/admin.js`, change:

```js
    const pageMap = {
      profile:        { title:'Edit <span>Profil</span>',           load:loadProfile,        hasAdd:false },
      skills:         { title:'Manage <span>Skills</span>',         load:loadSkills,         hasAdd:true  },
```

to:

```js
    const pageMap = {
      analytics:      { title:'Visitor <span>Analytics</span>',     load:loadAnalytics,      hasAdd:false },
      profile:        { title:'Edit <span>Profil</span>',           load:loadProfile,        hasAdd:false },
      skills:         { title:'Manage <span>Skills</span>',         load:loadSkills,         hasAdd:true  },
```

Then change:

```js
    let currentPage = 'skills';
```

to:

```js
    let currentPage = 'analytics';
```

- [ ] **Step 4: Trigger the initial load from `analytics` instead of `skills`**

At the bottom of `assets/js/admin.js`, change:

```js
    loadSkills();
```

to:

```js
    loadAnalytics();
```

- [ ] **Step 5: Add `loadAnalytics()`**

Add this function near the other `load*` functions (e.g. right before `async function loadPortfolio()`):

```js
    async function loadAnalytics() {
      const el = document.getElementById('analyticsContent');
      el.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i></div>';

      const { data, error } = await db.from('page_visits').select('page, path, referrer, visited_at');
      if (error) {
        el.innerHTML = `<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><p>Gagal memuat data: ${escapeHtml(error.message)}</p></div>`;
        return;
      }
      if (!data || !data.length) {
        el.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>Belum ada data kunjungan.</p></div>';
        return;
      }

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 6);

      const byDay = {};
      const byPage = {};
      const byRef = {};
      let totalToday = 0, totalWeek = 0;

      data.forEach(row => {
        const d = new Date(row.visited_at);
        const dayStr = d.toISOString().slice(0, 10);
        byDay[dayStr] = (byDay[dayStr] || 0) + 1;
        byPage[row.page] = (byPage[row.page] || 0) + 1;
        if (dayStr === todayStr) totalToday++;
        if (d >= weekAgo) totalWeek++;

        let bucket = 'Direct';
        if (row.referrer) {
          try {
            const host = new URL(row.referrer).hostname.replace(/^www\./, '');
            if (host && host !== location.hostname) bucket = host;
          } catch (_) { /* malformed referrer — treat as Direct */ }
        }
        byRef[bucket] = (byRef[bucket] || 0) + 1;
      });

      const totalAll = data.length;
      const topRefEntry = Object.entries(byRef).sort((a, b) => b[1] - a[1])[0];
      const topRef = topRefEntry ? topRefEntry[0] : '—';

      const days = [];
      for (let i = 29; i >= 0; i--) {
        const dt = new Date(now);
        dt.setDate(dt.getDate() - i);
        days.push(dt.toISOString().slice(0, 10));
      }
      const series = days.map(d => byDay[d] || 0);

      const topPages = Object.entries(byPage).sort((a, b) => b[1] - a[1]);
      const maxPageCount = topPages.length ? topPages[0][1] : 1;
      const topRefs = Object.entries(byRef).sort((a, b) => b[1] - a[1]).slice(0, 5);

      el.innerHTML = `
        <div class="stat-card-row">
          <div class="stat-card"><i class="fas fa-eye"></i><div><p class="stat-num">${totalAll}</p><p class="stat-label">Total Visits</p></div></div>
          <div class="stat-card"><i class="fas fa-calendar-day"></i><div><p class="stat-num">${totalToday}</p><p class="stat-label">Visits Hari Ini</p></div></div>
          <div class="stat-card"><i class="fas fa-calendar-week"></i><div><p class="stat-num">${totalWeek}</p><p class="stat-label">Visits Minggu Ini</p></div></div>
          <div class="stat-card"><i class="fas fa-link"></i><div><p class="stat-num" style="font-size:16px">${escapeHtml(topRef)}</p><p class="stat-label">Top Referrer</p></div></div>
        </div>
        <div class="table-wrap" style="padding:20px;margin-bottom:24px">
          <canvas id="visitsChart" height="90"></canvas>
        </div>
        <div class="analytics-cols">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Halaman</th><th>Visits</th></tr></thead>
              <tbody>${topPages.map(([page, count]) => `
                <tr><td>${escapeHtml(page)}</td><td><div class="pct-wrap"><div class="pct-bar"><div class="pct-fill" style="width:${Math.round(count / maxPageCount * 100)}%"></div></div><span class="pct-num">${count}</span></div></td></tr>
              `).join('')}</tbody>
            </table>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Sumber</th><th>Visits</th></tr></thead>
              <tbody>${topRefs.map(([ref, count]) => `<tr><td>${escapeHtml(ref)}</td><td>${count}</td></tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      `;

      if (window._visitsChartInstance) window._visitsChartInstance.destroy();
      window._visitsChartInstance = new Chart(document.getElementById('visitsChart'), {
        type: 'bar',
        data: {
          labels: days.map(d => d.slice(5)),
          datasets: [{ label: 'Visits', data: series, backgroundColor: '#1c1c1a', borderRadius: 4 }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        },
      });
    }
```

- [ ] **Step 6: Manual test — Analytics loads as the landing page**

Log into `admin.html`. Confirm:
- Analytics is the page shown immediately (sidebar "Analytics" link highlighted, `topbarTitle` reads "Visitor Analytics").
- With the rows seeded in Task 2's test, the 4 stat cards show non-zero numbers, the bar chart renders 30 days, the two tables list pages/referrers.
- Click "Skills" then back to "Analytics" — page switches correctly, chart re-renders without throwing (checks the `Chart.destroy()` guard in Step 5).
- Scroll the content area — topbar gains a shadow past a few pixels of scroll, loses it back at the top.
- With zero rows (e.g. against a fresh Supabase project), the empty state (`.empty-state`, "Belum ada data kunjungan.") renders instead of a crash.
- Resize to mobile width (< 900px) — stat cards reflow to 2 columns, then 1 column under 560px; the two tables stack vertically.
- Open the browser console — confirm no CSP violation errors from the Chart.js load.

- [ ] **Step 7: Commit**

```bash
git add assets/js/admin.js
git commit -m "$(cat <<'EOF'
Add loadAnalytics() and make it the default admin landing page

Aggregates page_visits client-side into daily trend (Chart.js),
top pages, and top referrers. Escapes all DB-sourced text before
interpolating into innerHTML — path/referrer are free text on an
anon-insertable table, so treat them as untrusted.
EOF
)"
```

---

## Plan Self-Review Notes

- **Spec coverage:** §1 data model → Task 1. §2 tracking → Task 2. §3 Analytics page → Tasks 4–5. §4 visual polish → Task 3. §5 security follow-up → explicitly excluded per spec ("flagged, not auto-applied"), called out under Global Constraints instead of a task.
- **Added beyond the spec, justified:** the `CHECK` constraint on `page` (Task 1) and the `escapeHtml()` helper (Task 5) were not in the spec's data model but close a stored-XSS path opened by the spec's own design — `page_visits` INSERT is intentionally public, so any of its text columns can carry attacker-chosen content into the admin dashboard's `innerHTML` rendering unless escaped. Documented inline in Task 5's commit message rather than silently added.
- **Type/name consistency checked:** `trackVisit()` (Task 2) inserts `{page, path, referrer}` — matches `page_visits` columns from Task 1 exactly. `loadAnalytics()` (Task 5) selects `page, path, referrer, visited_at` — same names. `#analyticsContent` (Task 4) is the only element `loadAnalytics()` (Task 5) touches by id, matching the `loadSkills()`/`#skillsContent` precedent already in the file.
