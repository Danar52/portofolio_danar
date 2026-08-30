# Admin Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin dashboard's flat table/card components with an "editorial" component system (large numbers, hairline separators, hover-reveal actions) validated via visual companion mockups, applied consistently across Analytics, the 5 CRUD pages (Skills/Portfolio/Experience/Events/Certifications), and a new inbox split-view for Messages — without changing the sidebar/topbar shell, auth flow, or any Supabase query logic beyond what a new `messages.is_read` column requires.

**Architecture:** Two new/rewritten CSS component families in `assets/css/admin.css` (editorial stat-row + list-row, and inbox split-view + form/modal polish), each consumed by a rewritten `load*()` render function in `assets/js/admin.js` that keeps its existing Supabase query and existing `open*Form()`/`delete*()` handlers untouched — only the `innerHTML` template each function builds changes. One schema addition (`messages.is_read`) backs the inbox's unread state.

**Tech Stack:** Same as the rest of the project — vanilla JS (non-module `admin.js`, global function scope so inline `onclick=` handlers keep working), Supabase JS v2, plain CSS, no build step, no test runner (manual browser verification per task).

## Global Constraints

- Sidebar/topbar shell (`#adminSidebar`, `.topbar`, `pageMap`/`data-page` nav switching in `admin.js`) is **not** touched by this plan — same structure as today.
- No new colors — every new CSS rule reuses existing `:root` tokens (`--bg`, `--bg-surface`, `--bg-elevated`, `--border`, `--border-mid`, `--text-1/2/3`, `--success`, `--error`, `--shadow-sm`, `--shadow-md`, `--accent-lt`). No new tokens are added.
- Every `load*()` rewrite must call `escapeHtml()` (already defined once in `admin.js`, reused — never redefined) on every DB-sourced string interpolated into `innerHTML`. Several of today's `load*()` functions (`loadSkills`, `loadPortfolio`, `loadExperience`, `loadEvents`, `loadCertifications`) do **not** currently escape their interpolated text — since this plan rewrites every one of those templates anyway, add the escaping as part of the rewrite (zero extra file-touch cost, closes a pre-existing gap).
- No `open*Form()` or `delete*()` handler signatures change — list-row rewrites keep calling the exact same functions with the exact same arguments as today's table rewrites did.
- No public-facing (non-admin) file is touched by this plan.
- Live Supabase schema changes (Task 1) are a production-database action — the SQL gets committed to `supabase_schema.sql`; the human applies it manually in the Supabase SQL Editor, per this repo's established convention. No task in this plan has live DB write access.
- `messages`' existing RLS (not touched by this plan — already gates `select`/`delete` through `authenticated`, verified by `loadMessages()`'s current working queries) is untouched; the new `is_read` column just adds one more `authenticated`-gated `update`.
- Hover-only actions (`.list-actions`) must remain reachable on touch devices — gate the always-hidden state behind `@media (hover: hover)`/reveal behind `@media (hover: none)`, matching the existing `(hover: hover)`/`(hover: none)` pattern already used elsewhere in this codebase (`assets/js/site.js`, `assets/css/base.css`).

---

### Task 1: `messages.is_read` column

**Files:**
- Modify: `supabase_schema.sql` (append new section at end)
- Live DB: human applies manually (see Global Constraints)

**Interfaces:**
- Produces: `messages.is_read` (`BOOLEAN NOT NULL DEFAULT false`) — Task 7's `loadMessages()` rewrite selects and updates this column by exact name.

- [ ] **Step 1: Append the migration SQL to `supabase_schema.sql`**

The `messages` table itself predates this repo's `supabase_schema.sql` documentation (it was created via a manual SQL Editor migration in an earlier project and was never backfilled into this file — out of scope to fix here). Add a new section at the end of the file:

```sql
-- ── 9. MESSAGES — add read-state (2026-08-30) ───────────────
-- `messages` itself predates this schema file (created via a manual
-- migration before this file tracked it). This column is the only
-- change; run it once against the live table.
ALTER TABLE messages ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Commit**

```bash
git add supabase_schema.sql
git commit -m "$(cat <<'EOF'
Add messages.is_read for the inbox unread state

Existing rows default to unread — the admin clears the backlog
naturally by opening each once. Human applies this manually in the
Supabase SQL Editor, per this repo's convention.
EOF
)"
```

---

### Task 2: CSS — editorial stat-row + list-row components

**Files:**
- Modify: `assets/css/admin.css`

**Interfaces:**
- Produces: `.ed-stat-row`, `.ed-stat`, `.ed-stat-num` (+ `.ed-stat-num-sm` modifier), `.ed-stat-label`, `.ed-stat-delta` (+ `.up`/`.down` modifiers) — Task 4 (`loadAnalytics()` rewrite) emits markup using these exact class names.
- Produces: `.list-wrap`, `.list-row`, `.list-thumb`, `.list-main`, `.list-title`, `.list-sub`, `.list-meta`, `.list-actions`, `.list-group-title` — Tasks 5–6 (`loadSkills`/`loadPortfolio`/`loadExperience`/`loadEvents`/`loadCertifications` rewrites) emit markup using these exact class names.
- Consumes/keeps: `.badge`, `.pct-wrap`/`.pct-bar`/`.pct-fill`/`.pct-num`, `.tbl-img`/`.tbl-pdf`/`.tbl-img-placeholder` (all pre-existing, unmodified) — reused inside `.list-thumb`/`.list-meta` slots by Tasks 5–6.
- Removes: `.stat-card-row`, `.stat-card`, `.stat-card:hover`, `.stat-card i`, `.stat-num`, `.stat-label` (the Task-3-era component) — superseded by `.ed-stat-row`/`.ed-stat`. `.analytics-cols` (used by the still-unchanged Top Pages/Referrer tables on the Analytics page) is **not** removed.

- [ ] **Step 1: Replace the STAT CARDS section with the editorial stat-row**

In `assets/css/admin.css`, find this exact block (currently lines 574–629, immediately before `.analytics-cols`):

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
  border-radius: 8px;
  padding: 18px 20px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
}
.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  border-color: var(--border-mid);
}

.stat-card i {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: var(--accent-lt);
  color: var(--text-1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.stat-num {
  font-family: var(--font-display);
  font-size: 23px;
  font-weight: 450;
  color: var(--text-1);
  letter-spacing: -0.3px;
  line-height: 1.2;
}
.stat-label {
  font-size: 10px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 3px;
}

```

Replace it with:

```css
/* ═══════════════════════════════════════════════════════════════
   EDITORIAL STAT ROW (Analytics)
═══════════════════════════════════════════════════════════════ */
.ed-stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  padding-bottom: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.ed-stat { flex: 1; min-width: 130px; }

.ed-stat-num {
  font-family: var(--font-display);
  font-size: 52px;
  font-weight: 450;
  letter-spacing: -2px;
  color: var(--text-1);
  line-height: 1;
}
.ed-stat-num.ed-stat-num-sm { font-size: 22px; letter-spacing: -0.5px; }

.ed-stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-3);
  margin-top: 10px;
}

.ed-stat-delta { font-size: 12px; margin-top: 4px; }
.ed-stat-delta.up   { color: var(--success); }
.ed-stat-delta.down { color: var(--error); }

@media (max-width: 900px) {
  .ed-stat-row { gap: 24px; }
  .ed-stat-num { font-size: 38px; letter-spacing: -1px; }
}
@media (max-width: 560px) {
  .ed-stat { flex: 1 1 45%; }
}

```

(`.analytics-cols` immediately follows this block in the file and must remain exactly as-is — do not touch it.)

- [ ] **Step 2: Add the list-row component**

Append this new section immediately after the `EMPTY & LOADING STATES` section (search for `.loading i { font-size: 22px; }` followed by `@keyframes spin` — insert the new section right after that `@keyframes spin` block, before `TAGS INPUT`):

```css
/* ═══════════════════════════════════════════════════════════════
   EDITORIAL LIST ROW (Skills / Portfolio / Experience / Events /
   Certifications) — replaces <table> rendering on those pages.
═══════════════════════════════════════════════════════════════ */
.list-wrap {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}
.list-row:last-child { border-bottom: none; }
.list-row:hover { background: var(--bg-surface); }

.list-thumb {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: var(--bg-elevated);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--text-3);
  overflow: hidden;
}
.list-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

.list-main { flex: 1; min-width: 0; }
.list-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.list-sub { font-size: 12px; color: var(--text-3); margin-top: 3px; }

.list-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--text-3);
  flex-shrink: 0;
  white-space: nowrap;
}

.list-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
@media (hover: hover) {
  .list-actions { opacity: 0; transition: opacity 0.15s; }
  .list-row:hover .list-actions { opacity: 1; }
}

.list-group-title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-1);
  padding-bottom: 10px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.list-group-title span { font-weight: 400; color: var(--text-3); font-size: 11px; }

@media (max-width: 560px) {
  .list-row { flex-wrap: wrap; padding: 14px 16px; }
  .list-meta { width: 100%; order: 3; margin-top: 4px; }
}

```

- [ ] **Step 3: Manual check**

Nothing references these classes yet (Tasks 4–6 wire the markup) — skip a standalone visual check, same pattern as the prior Task 3 CSS pass.

- [ ] **Step 4: Commit**

```bash
git add assets/css/admin.css
git commit -m "$(cat <<'EOF'
Replace stat-card with editorial stat-row, add list-row component

Supersedes the prior stat-card-row/.stat-card pass with the large-
number editorial treatment validated via visual companion mockups.
New list-row component (unused until Tasks 4-6 wire it up) replaces
<table> rendering on the 5 CRUD admin pages.
EOF
)"
```

---

### Task 3: CSS — inbox split-view + form/modal typography polish

**Files:**
- Modify: `assets/css/admin.css`

**Interfaces:**
- Produces: `.inbox-wrap` (+ `.show-detail` modifier), `.inbox-list`, `.inbox-item` (+ `.active`/`.read` modifiers), `.inbox-name`, `.inbox-name-text`, `.inbox-dot`, `.inbox-preview`, `.inbox-date`, `.inbox-detail`, `.inbox-detail-title`, `.inbox-detail-meta`, `.inbox-detail-body`, `.inbox-detail-actions`, `.inbox-back-btn` — Task 7 (`loadMessages()` rewrite) emits markup using these exact class names and toggles `.show-detail` on `.inbox-wrap` from JS.
- Modifies in place: `.modal-header`, `.modal-title`, `.modal-body`, `.modal-footer`, `.form-group`, `.form-section-title` — no new class names, existing markup (every `openModal()`/`open*Form()` call across the whole admin) picks up the new spacing/type-scale automatically, no JS changes needed.

- [ ] **Step 1: Add the inbox split-view component**

Append this new section immediately after the list-row section added in Task 2 Step 2 (before `TAGS INPUT`):

```css
/* ═══════════════════════════════════════════════════════════════
   INBOX SPLIT-VIEW (Messages)
═══════════════════════════════════════════════════════════════ */
.inbox-wrap {
  display: grid;
  grid-template-columns: 300px 1fr;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg);
}

.inbox-list {
  border-right: 1px solid var(--border);
  overflow-y: auto;
  max-height: 640px;
}

.inbox-item {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
}
.inbox-item:last-child { border-bottom: none; }
.inbox-item:hover { background: var(--bg-surface); }
.inbox-item.active { background: var(--bg-surface); box-shadow: inset 2px 0 0 var(--text-1); }

.inbox-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.inbox-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.inbox-item.read .inbox-name { font-weight: 450; color: var(--text-2); }

.inbox-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-1); flex-shrink: 0; }

.inbox-preview {
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inbox-date { font-size: 10px; color: var(--text-3); margin-top: 6px; }

.inbox-detail { padding: 32px; overflow-y: auto; max-height: 640px; }
.inbox-detail-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 450;
  color: var(--text-1);
  letter-spacing: -0.4px;
}
.inbox-detail-meta { font-size: 12px; color: var(--text-3); margin: 8px 0 24px; }
.inbox-detail-body { font-size: 14px; color: var(--text-2); line-height: 1.75; white-space: pre-wrap; }
.inbox-detail-actions { margin-top: 28px; display: flex; gap: 10px; flex-wrap: wrap; }

.inbox-back-btn { display: none; }

@media (max-width: 900px) {
  .inbox-wrap { grid-template-columns: 1fr; }
  .inbox-list { max-height: none; border-right: none; }
  .inbox-detail { max-height: none; display: none; }
  .inbox-wrap.show-detail .inbox-list { display: none; }
  .inbox-wrap.show-detail .inbox-detail { display: block; }
  .inbox-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-2);
    background: none;
    border: none;
    cursor: pointer;
    margin-bottom: 16px;
    padding: 0;
  }
}

```

- [ ] **Step 2: Polish modal/form typography in place**

In `assets/css/admin.css`, change:

```css
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 28px 16px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 450;
  color: var(--text-1);
  letter-spacing: -0.3px;
}
```

to:

```css
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26px 32px 18px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 450;
  color: var(--text-1);
  letter-spacing: -0.4px;
}
```

Change:

```css
.modal-body { padding: 24px 28px; }

.modal-footer {
  padding: 16px 28px 24px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  border-top: 1px solid var(--border);
}
```

to:

```css
.modal-body { padding: 28px 32px; }

.modal-footer {
  padding: 18px 32px 28px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  border-top: 1px solid var(--border);
}
```

Change:

```css
.form-group { margin-bottom: 18px; }
```

to:

```css
.form-group { margin-bottom: 22px; }
```

Change:

```css
.form-section-title {
  font-size: 10px;
  font-weight: 450;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 16px;
  margin-top: 24px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}
```

to:

```css
.form-section-title {
  font-size: 11px;
  font-weight: 450;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 1.8px;
  margin-bottom: 18px;
  margin-top: 28px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}
```

- [ ] **Step 3: Manual check**

Log into the admin dashboard (any page that opens a modal, e.g. Skills → "Tambah Baru"), confirm the modal renders with the new larger title/spacing and nothing visually breaks (no overlapping text, no clipped buttons). This CSS is already live on existing markup, unlike Task 2's list-row — verify it now.

- [ ] **Step 4: Commit**

```bash
git add assets/css/admin.css
git commit -m "$(cat <<'EOF'
Add inbox split-view CSS, polish modal/form typography

Inbox component unused until Task 7 wires it up. Modal/form spacing
and type scale increase (17px->20px title, 18px->22px form-group
gap) applies immediately to every existing modal across the admin.
EOF
)"
```

---

### Task 4: `admin.js` — rewrite `loadAnalytics()` to the editorial stat-row

**Files:**
- Modify: `assets/js/admin.js` (the `loadAnalytics()` function, currently the block from `async function loadAnalytics() {` through its closing `}` before `async function loadPortfolio()`)

**Interfaces:**
- Consumes: `.ed-stat-row`/`.ed-stat`/`.ed-stat-num`/`.ed-stat-num-sm`/`.ed-stat-label`/`.ed-stat-delta`/`.up`/`.down` (Task 2), `escapeHtml()` (pre-existing).
- Unchanged: the `page_visits` query logic (the `Promise.all` count+scoped-select pair), `localDayKey()`, the Top Pages/Referrer table rendering (still uses `.analytics-cols`/`.table-wrap`/`.pct-wrap`/`.pct-bar`/`.pct-fill`/`.pct-num`, all pre-existing and unmodified), and the Chart.js init block — none of that changes in this task, only the stat block's markup between the query results and the `<canvas>`.

- [ ] **Step 1: Add delta computation for "Hari Ini" and "Minggu Ini"**

In `loadAnalytics()`, after the existing `byDay`/`byPage`/`byRef`/`totalToday`/`totalWeek` computation loop (the `(data || []).forEach(row => { ... })` block) and before `const topRefEntry = ...`, add:

```js
      const yesterdayStr = localDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      const totalYesterday = byDay[yesterdayStr] || 0;
      const todayDelta = totalYesterday > 0
        ? Math.round((totalToday - totalYesterday) / totalYesterday * 100)
        : null;

      const prevWeekStart = new Date(weekAgo);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      let totalPrevWeek = 0;
      (data || []).forEach(row => {
        const d = new Date(row.visited_at);
        if (d >= prevWeekStart && d < weekAgo) totalPrevWeek++;
      });
      const weekDelta = totalPrevWeek > 0
        ? Math.round((totalWeek - totalPrevWeek) / totalPrevWeek * 100)
        : null;

      function deltaHtml(delta) {
        if (delta === null) return '';
        const cls = delta >= 0 ? 'up' : 'down';
        const arrow = delta >= 0 ? '▲' : '▼';
        return `<p class="ed-stat-delta ${cls}">${arrow} ${Math.abs(delta)}% vs periode lalu</p>`;
      }
```

(`delta === null` means there's no prior-period data to compare against — e.g. the site's first day/week of tracking — and the stat renders without a delta line rather than a misleading "∞%" or divide-by-zero artifact.)

- [ ] **Step 2: Replace the stat block markup**

In the same function, change:

```js
      el.innerHTML = `
        <div class="stat-card-row">
          <div class="stat-card"><i class="fas fa-eye"></i><div><p class="stat-num">${totalAll ?? 0}</p><p class="stat-label">Total Visits</p></div></div>
          <div class="stat-card"><i class="fas fa-calendar-day"></i><div><p class="stat-num">${totalToday}</p><p class="stat-label">Visits Hari Ini</p></div></div>
          <div class="stat-card"><i class="fas fa-calendar-week"></i><div><p class="stat-num">${totalWeek}</p><p class="stat-label">Visits Minggu Ini</p></div></div>
          <div class="stat-card"><i class="fas fa-link"></i><div><p class="stat-num" style="font-size:16px">${escapeHtml(topRef)}</p><p class="stat-label">Top Referrer</p></div></div>
        </div>
        <div class="table-wrap" style="padding:20px;margin-bottom:24px">
          <canvas id="visitsChart" height="90"></canvas>
        </div>
```

to:

```js
      el.innerHTML = `
        <div class="ed-stat-row">
          <div class="ed-stat"><p class="ed-stat-num">${totalAll ?? 0}</p><p class="ed-stat-label">Total Visits</p></div>
          <div class="ed-stat"><p class="ed-stat-num">${totalToday}</p><p class="ed-stat-label">Visits Hari Ini</p>${deltaHtml(todayDelta)}</div>
          <div class="ed-stat"><p class="ed-stat-num">${totalWeek}</p><p class="ed-stat-label">Visits Minggu Ini</p>${deltaHtml(weekDelta)}</div>
          <div class="ed-stat"><p class="ed-stat-num ed-stat-num-sm">${escapeHtml(topRef)}</p><p class="ed-stat-label">Top Referrer</p></div>
        </div>
        <div class="table-wrap" style="padding:20px;margin-bottom:24px">
          <canvas id="visitsChart" height="90"></canvas>
        </div>
```

(The Top Pages/Referrer `.analytics-cols` block and the `Chart` init that follow are unchanged — do not touch them.)

- [ ] **Step 3: Manual test**

Log into the admin dashboard (Analytics is the default landing page). Confirm: 4 stat blocks render with large numbers, hairline separator below the row, "Hari Ini"/"Minggu Ini" show a delta line only when there's prior-period data (if this is a low-traffic dashboard with under ~2 weeks of history, `todayDelta`/`weekDelta` may both legitimately be `null` — confirm no delta line renders in that case, rather than a blank/broken one). Confirm the chart and the two tables below still render exactly as before (unchanged in this task).

- [ ] **Step 4: Commit**

```bash
git add assets/js/admin.js
git commit -m "$(cat <<'EOF'
Rewrite loadAnalytics() stat block to the editorial stat-row

Adds day-over-day and week-over-week deltas (null when there's no
prior-period data to compare against, rather than a divide-by-zero
artifact). Chart and Top Pages/Referrer tables unchanged.
EOF
)"
```

---

### Task 5: `admin.js` — rewrite `loadSkills()` and `loadPortfolio()` to list-row

**Files:**
- Modify: `assets/js/admin.js` (`loadSkills()` and `loadPortfolio()` functions)

**Interfaces:**
- Consumes: `.list-wrap`/`.list-row`/`.list-thumb`/`.list-main`/`.list-title`/`.list-sub`/`.list-meta`/`.list-actions`/`.list-group-title` (Task 2), `escapeHtml()`, `.badge`/`.tbl-img`/`.tbl-img-placeholder` (all pre-existing).
- Unchanged: `openSkillForm(data)`, `deleteSkill(id, name)`, `openPortfolioForm(data)`, `deletePortfolio(id, name)` — called with the exact same arguments as today.

- [ ] **Step 1: Rewrite `loadSkills()`**

Note: the current code's `payload` comment says "percentage tidak dipakai lagi di tampilan" (percentage is no longer used in the display) — do not reintroduce a percentage bar. The list-row's meta slot shows `sort_order` instead.

Change:

```js
    async function loadSkills() {
      const el = document.getElementById('skillsContent');
      el.innerHTML = '<div class="loading"><i class="fas fa-circle-notch"></i></div>';
      const { data, error } = await db.from('skills').select('*').order('category').order('sort_order');
      if (error||!data) { el.innerHTML='<p style="color:red;padding:20px">Gagal load data.</p>'; return; }
      existingCategories = [...new Set(data.map(s=>s.category).filter(Boolean))];
      const groups = {};
      data.forEach(s => { if(!groups[s.category]) groups[s.category]=[]; groups[s.category].push(s); });
      let html = '';
      for (const [cat, items] of Object.entries(groups)) {
        html += `<div style="margin-bottom:28px">
          <h3 style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--text-1);margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">${cat} <span style="font-weight:400;color:var(--text-3);font-size:11px">(${items.length})</span></h3>
          <div class="table-wrap"><table>
            <thead><tr><th>Skill</th><th style="width:90px">Urutan</th><th style="width:100px">Aksi</th></tr></thead>
            <tbody>${items.map(s=>`<tr>
              <td style="font-weight:500;color:var(--text-1)">${s.skill_name}</td>
              <td style="color:var(--text-3)">${s.sort_order ?? 0}</td>
              <td><div class="td-actions">
                <button class="btn btn-outline btn-sm" onclick="openSkillForm(${JSON.stringify(s).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteSkill(${s.id},'${s.skill_name}')"><i class="fas fa-trash"></i></button>
              </div></td></tr>`).join('')}
            </tbody></table></div></div>`;
      }
      el.innerHTML = html || '<div class="empty-state"><i class="fas fa-list-check"></i><p>Belum ada skill.</p></div>';
    }
```

to:

```js
    async function loadSkills() {
      const el = document.getElementById('skillsContent');
      el.innerHTML = '<div class="loading"><i class="fas fa-circle-notch"></i></div>';
      const { data, error } = await db.from('skills').select('*').order('category').order('sort_order');
      if (error||!data) { el.innerHTML='<p style="color:red;padding:20px">Gagal load data.</p>'; return; }
      existingCategories = [...new Set(data.map(s=>s.category).filter(Boolean))];
      const groups = {};
      data.forEach(s => { if(!groups[s.category]) groups[s.category]=[]; groups[s.category].push(s); });
      let html = '';
      for (const [cat, items] of Object.entries(groups)) {
        html += `<div style="margin-bottom:28px">
          <h3 class="list-group-title">${escapeHtml(cat)} <span>(${items.length})</span></h3>
          <div class="list-wrap">${items.map(s=>`
            <div class="list-row">
              <div class="list-thumb"><i class="fas fa-code"></i></div>
              <div class="list-main">
                <p class="list-title">${escapeHtml(s.skill_name)}</p>
                <p class="list-sub">Urutan #${s.sort_order ?? 0}</p>
              </div>
              <div class="list-actions">
                <button class="btn btn-outline btn-sm" onclick="openSkillForm(${JSON.stringify(s).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteSkill(${s.id},'${s.skill_name}')"><i class="fas fa-trash"></i></button>
              </div>
            </div>`).join('')}
          </div></div>`;
      }
      el.innerHTML = html || '<div class="empty-state"><i class="fas fa-list-check"></i><p>Belum ada skill.</p></div>';
    }
```

(`deleteSkill(${s.id},'${s.skill_name}')` keeps the pre-existing unescaped single-quote interpolation exactly as today — this is a pre-existing latent bug pattern shared with several other `delete*` calls in this file, e.g. a skill name containing an apostrophe would break the `onclick` attribute. It is out of scope for this plan, which is a rendering/CSS rewrite, not a bug-fix pass; flag it in your self-review as a pre-existing issue rather than silently fixing or silently ignoring it.)

- [ ] **Step 2: Rewrite `loadPortfolio()`**

Change:

```js
      el.innerHTML = data.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Preview</th><th>Judul</th><th>Tipe</th><th>Tahun</th><th>Status</th><th style="width:110px">Aksi</th></tr></thead>
        <tbody>${data.map(p=>`<tr>
          <td>${p.thumbnail_url
            ? `<img class="tbl-img" src="${p.thumbnail_url}" alt="${p.title}">`
            : `<div class="tbl-img-placeholder"><i class="fas fa-image"></i></div>`}</td>
          <td style="font-weight:600;color:var(--heading);max-width:200px">
            <p style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.title}</p>
            ${p.is_featured?'<span style="font-family:var(--font-nav);font-size:10px;color:#b5590a;font-weight:700">★ Featured</span>':''}
          </td>
          <td><span class="badge ${typeBadgeCls[p.type]||'badge-other'}">${typeLabel[p.type]||p.type}</span></td>
          <td style="font-size:12px;opacity:.7">${p.year||'—'}</td>
          <td><span class="badge ${p.is_published?'badge-aktif':'badge-selesai'}">${p.is_published?'Published':'Draft'}</span></td>
          <td><div class="td-actions">
            <button class="btn btn-outline btn-sm" onclick="openPortfolioForm(${JSON.stringify(p).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deletePortfolio(${p.id},'${p.title.replace(/'/g,'\\\'').replace(/"/g,'&quot;')}')"><i class="fas fa-trash"></i></button>
          </div></td></tr>`).join('')}
        </tbody></table></div>`
        : '<div class="empty-state"><i class="fas fa-briefcase-clock"></i><p>Belum ada portfolio.</p></div>';
```

to:

```js
      el.innerHTML = data.length ? `<div class="list-wrap">${data.map(p=>`
        <div class="list-row">
          <div class="list-thumb">${p.thumbnail_url
            ? `<img src="${p.thumbnail_url}" alt="">`
            : `<i class="fas fa-image"></i>`}</div>
          <div class="list-main">
            <p class="list-title">${escapeHtml(p.title)}${p.is_featured?' <span style="color:#b5590a;font-size:11px;font-weight:600">★ Featured</span>':''}</p>
            <p class="list-sub">${escapeHtml(typeLabel[p.type]||p.type)}</p>
          </div>
          <div class="list-meta">
            <span>${escapeHtml(p.year||'—')}</span>
            <span class="badge ${p.is_published?'badge-aktif':'badge-selesai'}">${p.is_published?'Published':'Draft'}</span>
          </div>
          <div class="list-actions">
            <button class="btn btn-outline btn-sm" onclick="openPortfolioForm(${JSON.stringify(p).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deletePortfolio(${p.id},'${p.title.replace(/'/g,'\\\'').replace(/"/g,'&quot;')}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('')}
        </div>`
        : '<div class="empty-state"><i class="fas fa-briefcase-clock"></i><p>Belum ada portfolio.</p></div>';
```

(The `badge-web`/`badge-design`/etc. type badge that appeared in the old table is dropped from the meta slot here in favor of putting the type label in `.list-sub` — two badges plus a thumbnail plus a title in one row-height was cramped in the mockup; the published/draft badge is the one that matters most at a glance and stays in `.list-meta`. This is a deliberate simplification, not an oversight — note it in your report.)

- [ ] **Step 3: Manual test**

Log into admin, open Skills — confirm categories render as `.list-group-title` headers, rows show name + sort order, hover reveals edit/delete, both still work (edit opens the existing modal, delete opens the existing confirm dialog and actually deletes). Open Portfolio — confirm thumbnail/placeholder, title (+ Featured star when applicable), type as subtitle, year + Published/Draft badge in meta, hover actions, edit/delete both still work. Confirm empty-state renders correctly if either table has zero rows (temporarily check via Supabase, or trust the unchanged `data.length` guard).

- [ ] **Step 4: Commit**

```bash
git add assets/js/admin.js
git commit -m "$(cat <<'EOF'
Rewrite loadSkills() and loadPortfolio() to list-row markup

Adds escapeHtml() to every interpolated DB string in both templates
(neither had it before — a pre-existing gap, closed here since the
templates are being rewritten anyway). Skills drops the unused
percentage bar per the existing "percentage tidak dipakai lagi"
comment; Portfolio's type badge is dropped in favor of a text
subtitle to keep the row from getting cramped.
EOF
)"
```

---

### Task 6: `admin.js` — rewrite `loadExperience()`, `loadEvents()`, `loadCertifications()` to list-row

**Files:**
- Modify: `assets/js/admin.js` (`loadExperience()`, `loadEvents()`, `loadCertifications()` functions)

**Interfaces:**
- Consumes: same list-row classes as Task 5, plus `renderTablePreview()` (pre-existing helper, reused as-is for Certifications' thumbnail).
- Unchanged: `openExpForm`/`deleteExp`, `openEventForm`/`deleteEvent`, `openCertForm`/`deleteCert` — same arguments as today.

- [ ] **Step 1: Rewrite `loadExperience()`**

Change:

```js
      el.innerHTML = data.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Jabatan</th><th>Perusahaan</th><th>Periode</th><th>Status</th><th style="width:100px">Aksi</th></tr></thead>
        <tbody>${data.map(e=>`<tr>
          <td style="font-weight:600;color:var(--heading)">${e.job_title}</td><td>${e.company}</td>
          <td style="font-size:12px;opacity:.7">${e.period_start} — ${e.period_end||'Sekarang'}</td>
          <td><span class="badge ${e.is_active?'badge-aktif':'badge-selesai'}">${e.is_active?'Aktif':'Selesai'}</span></td>
          <td><div class="td-actions">
            <button class="btn btn-outline btn-sm" onclick="openExpForm(${JSON.stringify(e).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteExp(${e.id},'${e.job_title.replace(/'/g,'\\\'')}')" ><i class="fas fa-trash"></i></button>
          </div></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty-state"><i class="fas fa-briefcase"></i><p>Belum ada experience.</p></div>';
```

to:

```js
      el.innerHTML = data.length ? `<div class="list-wrap">${data.map(e=>`
        <div class="list-row">
          <div class="list-thumb"><i class="fas fa-briefcase"></i></div>
          <div class="list-main">
            <p class="list-title">${escapeHtml(e.job_title)}</p>
            <p class="list-sub">${escapeHtml(e.company)}</p>
          </div>
          <div class="list-meta">
            <span>${escapeHtml(e.period_start)} — ${escapeHtml(e.period_end||'Sekarang')}</span>
            <span class="badge ${e.is_active?'badge-aktif':'badge-selesai'}">${e.is_active?'Aktif':'Selesai'}</span>
          </div>
          <div class="list-actions">
            <button class="btn btn-outline btn-sm" onclick="openExpForm(${JSON.stringify(e).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteExp(${e.id},'${e.job_title.replace(/'/g,'\\\'')}')" ><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('')}
        </div>` : '<div class="empty-state"><i class="fas fa-briefcase"></i><p>Belum ada experience.</p></div>';
```

- [ ] **Step 2: Rewrite `loadEvents()`**

Change:

```js
      el.innerHTML=data.length?`<div class="table-wrap"><table>
        <thead><tr><th>Foto</th><th>Nama Kegiatan</th><th>Tipe</th><th>Peran</th><th>Periode</th><th style="width:100px">Aksi</th></tr></thead>
        <tbody>${data.map(e=>`<tr>
          <td>${e.image_url?`<img class="tbl-img" src="${e.image_url}" alt="${e.name}">`:`<div class="tbl-img-placeholder"><i class="fas fa-image"></i></div>`}</td>
          <td style="font-weight:600;color:var(--heading)">${e.name}</td>
          <td><span class="badge ${typeBadge[e.type]}">${typeLabel[e.type]}</span></td>
          <td style="font-size:12px">${e.role||'-'}</td>
          <td style="font-size:12px;opacity:.7">${e.period||'-'}</td>
          <td><div class="td-actions">
            <button class="btn btn-outline btn-sm" onclick="openEventForm(${JSON.stringify(e).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteEvent(${e.id},'${e.name.replace(/'/g,'\\\'')}')" ><i class="fas fa-trash"></i></button>
          </div></td></tr>`).join('')}
        </tbody></table></div>`:'<div class="empty-state"><i class="fas fa-calendar-days"></i><p>Belum ada event.</p></div>';
```

to:

```js
      el.innerHTML=data.length?`<div class="list-wrap">${data.map(e=>`
        <div class="list-row">
          <div class="list-thumb">${e.image_url?`<img src="${e.image_url}" alt="">`:`<i class="fas fa-image"></i>`}</div>
          <div class="list-main">
            <p class="list-title">${escapeHtml(e.name)}</p>
            <p class="list-sub">${escapeHtml(e.role||'-')}</p>
          </div>
          <div class="list-meta">
            <span>${escapeHtml(e.period||'-')}</span>
            <span class="badge ${typeBadge[e.type]}">${escapeHtml(typeLabel[e.type])}</span>
          </div>
          <div class="list-actions">
            <button class="btn btn-outline btn-sm" onclick="openEventForm(${JSON.stringify(e).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteEvent(${e.id},'${e.name.replace(/'/g,'\\\'')}')" ><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('')}
        </div>`:'<div class="empty-state"><i class="fas fa-calendar-days"></i><p>Belum ada event.</p></div>';
```

- [ ] **Step 3: Rewrite `loadCertifications()`**

Change:

```js
      el.innerHTML=data.length?`<div class="table-wrap"><table>
        <thead><tr><th>Preview</th><th>Nama Sertifikat</th><th>Issuer</th><th>Tanggal</th><th>Link</th><th style="width:100px">Aksi</th></tr></thead>
        <tbody>${data.map(c=>`<tr>
          <td>${renderTablePreview(c)}</td>
          <td style="font-weight:600;color:var(--heading)">${c.cert_name}</td>
          <td style="font-size:12px"><i class="${c.issuer_icon||'fas fa-building'}" style="color:var(--accent);margin-right:6px"></i>${c.issuer}</td>
          <td style="font-size:12px;opacity:.7">${c.issued_date||'-'}</td>
          <td>${c.cert_url?`<a href="${c.cert_url}" target="_blank" style="color:var(--accent);font-size:12px"><i class="fas fa-external-link-alt"></i> Lihat</a>`:'<span style="opacity:.3;font-size:12px">—</span>'}</td>
          <td><div class="td-actions">
            <button class="btn btn-outline btn-sm" onclick="openCertForm(${JSON.stringify(c).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteCert(${c.id},'${c.cert_name.replace(/'/g,'\\\'')}')" ><i class="fas fa-trash"></i></button>
          </div></td></tr>`).join('')}
        </tbody></table></div>`:'<div class="empty-state"><i class="fas fa-award"></i><p>Belum ada sertifikasi.</p></div>';
```

to:

```js
      el.innerHTML=data.length?`<div class="list-wrap">${data.map(c=>`
        <div class="list-row">
          <div class="list-thumb">${renderTablePreview(c)}</div>
          <div class="list-main">
            <p class="list-title">${escapeHtml(c.cert_name)}</p>
            <p class="list-sub"><i class="${c.issuer_icon||'fas fa-building'}" style="margin-right:5px"></i>${escapeHtml(c.issuer)}</p>
          </div>
          <div class="list-meta">
            <span>${escapeHtml(c.issued_date||'-')}</span>
            ${c.cert_url?`<a href="${c.cert_url}" target="_blank" style="color:var(--text-1)"><i class="fas fa-external-link-alt"></i></a>`:''}
          </div>
          <div class="list-actions">
            <button class="btn btn-outline btn-sm" onclick="openCertForm(${JSON.stringify(c).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteCert(${c.id},'${c.cert_name.replace(/'/g,'\\\'')}')" ><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('')}
        </div>`:'<div class="empty-state"><i class="fas fa-award"></i><p>Belum ada sertifikasi.</p></div>';
```

(`renderTablePreview(c)` already returns a full `<img class="tbl-img" ...>`/`<a class="tbl-pdf" ...>`/`<div class="tbl-img-placeholder">` element sized for the old table cell — it visually fits inside `.list-thumb`'s 44×44 box because `.list-thumb img { width:100%; height:100%; object-fit:cover }` and `.tbl-pdf`/`.tbl-img-placeholder` are already flex-centered fixed-size boxes; no changes to `renderTablePreview()` itself are needed. Confirm this visually in Step 4 rather than assuming.)

- [ ] **Step 4: Manual test**

Log into admin, check Experience (title/company/period+status badge/hover actions), Events (image-or-icon thumb, name/role, type badge + period, hover actions), Certifications (image/PDF/placeholder thumb via the reused `renderTablePreview()`, name/issuer, date + external link, hover actions). Confirm every edit/delete button still opens the right modal/confirm dialog and actually saves/deletes. Confirm each page's empty-state still renders correctly with zero rows.

- [ ] **Step 5: Commit**

```bash
git add assets/js/admin.js
git commit -m "$(cat <<'EOF'
Rewrite loadExperience/loadEvents/loadCertifications to list-row

Same escapeHtml() gap closed as the prior list-row rewrite. Reuses
renderTablePreview() as-is inside the new .list-thumb box — verified
it fits without changes.
EOF
)"
```

---

### Task 7: `admin.js` — rewrite `loadMessages()` to the inbox split-view

**Files:**
- Modify: `assets/js/admin.js` (`loadMessages()` function; `deleteMessage()` stays but gains a call site update — see Step 2)

**Interfaces:**
- Consumes: `.inbox-wrap`/`.inbox-list`/`.inbox-item`/`.active`/`.read`/`.inbox-name`/`.inbox-name-text`/`.inbox-dot`/`.inbox-preview`/`.inbox-date`/`.inbox-detail`/`.inbox-detail-title`/`.inbox-detail-meta`/`.inbox-detail-body`/`.inbox-detail-actions`/`.inbox-back-btn`/`.show-detail` (Task 3), `escapeHtml()`, `messages.is_read` (Task 1).
- Produces: module-scope state `let messagesData = []` and `let selectedMessageId = null` (new — needed so clicking a list item can re-render just the detail pane from already-fetched data, without a full `loadMessages()` re-fetch).

- [ ] **Step 1: Replace `loadMessages()`**

Change:

```js
    async function loadMessages() {
      const el = document.getElementById('messagesContent');
      el.innerHTML = '<div class="loading"><i class="fas fa-circle-notch"></i></div>';
      const { data, error } = await db.from('messages').select('*').order('created_at', { ascending: false });
      if (error || !data) { el.innerHTML = '<p style="color:red;padding:20px">Gagal load data.</p>'; return; }
      el.innerHTML = data.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Nama</th><th>Email</th><th>Subjek</th><th>Pesan</th><th>Tanggal</th><th style="width:60px">Aksi</th></tr></thead>
        <tbody>${data.map(m => `<tr>
          <td style="font-weight:600;color:var(--heading)">${escapeHtml(m.name)}</td>
          <td style="font-size:12px">${escapeHtml(m.email)}</td>
          <td style="font-size:12px">${escapeHtml(m.subject) || '-'}</td>
          <td style="font-size:12px;max-width:280px;white-space:pre-wrap">${escapeHtml(m.message)}</td>
          <td style="font-size:12px;opacity:.7">${new Date(m.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
          <td><div class="td-actions">
            <button class="btn btn-danger btn-sm" onclick="deleteMessage('${m.id}','${m.name.replace(/'/g,'\\\'')}')"><i class="fas fa-trash"></i></button>
          </div></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty-state"><i class="fas fa-envelope-open"></i><p>Belum ada pesan masuk.</p></div>';
    }
```

to:

```js
    let messagesData = [];
    let selectedMessageId = null;

    async function loadMessages() {
      const el = document.getElementById('messagesContent');
      el.innerHTML = '<div class="loading"><i class="fas fa-circle-notch"></i></div>';
      const { data, error } = await db.from('messages').select('*').order('created_at', { ascending: false });
      if (error || !data) { el.innerHTML = '<p style="color:red;padding:20px">Gagal load data.</p>'; return; }
      messagesData = data;
      if (!data.length) {
        el.innerHTML = '<div class="empty-state"><i class="fas fa-envelope-open"></i><p>Belum ada pesan masuk.</p></div>';
        return;
      }
      selectedMessageId = data[0].id;
      el.innerHTML = `<div class="inbox-wrap" id="inboxWrap">
        <div class="inbox-list" id="inboxList"></div>
        <div class="inbox-detail" id="inboxDetail"></div>
      </div>`;
      renderInboxList();
      renderInboxDetail();
    }

    function fmtMsgDate(iso) {
      return new Date(iso).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    }

    function renderInboxList() {
      const listEl = document.getElementById('inboxList');
      listEl.innerHTML = messagesData.map(m => `
        <div class="inbox-item ${m.id===selectedMessageId?'active':''} ${m.is_read?'read':''}" onclick="selectMessage('${m.id}')">
          <div class="inbox-name">
            <span class="inbox-name-text">${escapeHtml(m.name)}</span>
            ${m.is_read?'':'<span class="inbox-dot"></span>'}
          </div>
          <p class="inbox-preview">${escapeHtml(m.subject || m.message)}</p>
          <p class="inbox-date">${fmtMsgDate(m.created_at)}</p>
        </div>`).join('');
    }

    function renderInboxDetail() {
      const detailEl = document.getElementById('inboxDetail');
      const m = messagesData.find(x => x.id === selectedMessageId);
      if (!m) { detailEl.innerHTML = ''; return; }
      const mailSubject = encodeURIComponent(`Re: ${m.subject || 'Pesan dari portfolio'}`);
      detailEl.innerHTML = `
        <button class="inbox-back-btn" onclick="closeInboxDetail()"><i class="fas fa-arrow-left"></i> Kembali ke daftar</button>
        <h3 class="inbox-detail-title">${escapeHtml(m.name)}</h3>
        <p class="inbox-detail-meta">${escapeHtml(m.email)} · ${fmtMsgDate(m.created_at)}${m.subject?` · ${escapeHtml(m.subject)}`:''}</p>
        <p class="inbox-detail-body">${escapeHtml(m.message)}</p>
        <div class="inbox-detail-actions">
          <a class="btn btn-primary" href="mailto:${encodeURIComponent(m.email)}?subject=${mailSubject}"><i class="fas fa-reply"></i> Balas via Email</a>
          <button class="btn btn-outline" onclick="deleteMessage('${m.id}','${m.name.replace(/'/g,'\\\'')}')"><i class="fas fa-trash"></i> Hapus</button>
        </div>`;
    }

    async function selectMessage(id) {
      selectedMessageId = id;
      document.getElementById('inboxWrap').classList.add('show-detail');
      renderInboxList();
      renderInboxDetail();
      const m = messagesData.find(x => x.id === id);
      if (m && !m.is_read) {
        m.is_read = true;
        renderInboxList();
        const { error } = await db.from('messages').update({ is_read: true }).eq('id', id);
        if (error) console.error('Gagal menandai pesan dibaca:', error.message);
      }
    }

    function closeInboxDetail() {
      document.getElementById('inboxWrap').classList.remove('show-detail');
    }
```

(`selectMessage` marks the local `messagesData` entry read and re-renders the list immediately — the dot disappears without waiting on the network — then fires the `UPDATE` in the background; a failed update only logs to the console, matching this codebase's existing tolerance for non-critical background writes, e.g. `analytics-track.js`'s own silent-failure pattern. `.show-detail` is added unconditionally on every select — harmless above the 900px breakpoint where the CSS rule that reads it doesn't apply.)

- [ ] **Step 2: Manual test**

Log into admin, open Pesan Masuk. Confirm: list renders with the most recent message auto-selected and its detail shown; unread messages show a dot, the initially-selected one gets marked read (dot disappears, and — check Supabase directly — `is_read` becomes `true` in the DB) as soon as it's opened; clicking other messages swaps the detail pane and updates the active/read state without a full reload; "Balas via Email" opens the system mail client (or at least produces a correct `mailto:` href — inspect it if you can't test the OS mail-client handoff) addressed to the sender with a "Re: ..." subject; "Hapus" still opens the existing confirm-delete flow and removes the message (confirm the list re-renders correctly, including re-selecting a remaining message or showing the empty state if that was the last one — read the existing `deleteMessage()`/`confirmDelete()` code path to confirm it still calls `loadMessages()` on success, which will naturally reset `selectedMessageId` to the new first message). Resize below 900px: confirm the list is what shows first, tapping an item reveals the detail pane (list hidden), and "Kembali ke daftar" returns to the list.

- [ ] **Step 3: Commit**

```bash
git add assets/js/admin.js
git commit -m "$(cat <<'EOF'
Rewrite loadMessages() to the inbox split-view

Adds mailto: quick-reply, is_read tracking (optimistic local update,
then a background UPDATE — failure only logs, consistent with this
codebase's existing tolerance for non-critical background writes),
and a mobile list/detail toggle via .show-detail.
EOF
)"
```

---

### Task 8: Cross-page responsive/touch verification pass

**Files:**
- None expected — this task is verification-only. If it finds a real breakage, fix it in the smallest possible diff to the file where the bug lives (most likely `assets/css/admin.css`) and say exactly what was wrong and why in the report.

**Interfaces:**
- Consumes: everything built in Tasks 1–7. No new interfaces produced.

- [ ] **Step 1: Desktop pass**

At a normal desktop width, walk every rewritten page (Analytics, Skills, Portfolio, Experience, Events, Certifications, Messages) plus Profile (CSS-only change from Task 3, not separately rewritten — confirm it still renders correctly with the new modal/form spacing, since `loadProfile()`'s markup itself was not touched by any task). For each list-row page, hover a row and confirm the edit/delete buttons fade in; move the mouse away and confirm they fade out.

- [ ] **Step 2: Mobile pass (< 900px, then < 560px)**

Resize (or use device emulation) to below 900px, then below 560px, and re-walk every page:
- List-row pages: confirm rows wrap sensibly at 560px (`.list-meta` drops to its own line per Task 2's Step 2 media query) and — critically — confirm edit/delete actions are visible without hovering (the `@media (hover: hover)` gate in Task 2 should mean touch/narrow-viewport devices simply never get the opacity:0 treatment; verify this by checking `(hover: none)` emulation specifically, not just narrow width, since a narrow desktop browser window still has `hover: hover` and would incorrectly hide actions if the gate were width-based instead of hover-based).
- Messages: confirm the list/detail toggle behavior from Task 7 Step 2 works when actually resized live (not just read from code) — select a message, confirm the detail pane replaces the list, confirm "Kembali ke daftar" returns to the list.
- Stat row (Analytics): confirm the 900px/560px breakpoints from Task 2 Step 1 reflow sensibly (2-up then stacked-ish via `flex: 1 1 45%`) and the large `52px`/`38px` numbers don't overflow their containers or force horizontal scroll on the page.

- [ ] **Step 2: Fix any real breakage found**

If Steps 1–2 find an actual bug (not a subjective "could look nicer" — a genuine overflow, unreachable action, or broken toggle), fix it directly in the relevant file (most likely a CSS media-query adjustment) and re-verify the specific broken case. If nothing is broken, skip this step and say so explicitly in the report — do not invent polish work outside what the earlier tasks already specified.

- [ ] **Step 3: Report**

Since this task makes no guaranteed code changes, there is no guaranteed commit. If Step 2 required a fix, commit it:

```bash
git add <changed file(s)>
git commit -m "$(cat <<'EOF'
Fix <specific responsive/touch issue> found in cross-page pass

EOF
)"
```

If no fix was needed, report DONE with no commit and say explicitly in the report that all checks in Steps 1–2 passed as originally implemented.

---

## Plan Self-Review Notes

- **Spec coverage:** Design spec §"Design direction" (stat-row + list-row + inbox patterns) → Tasks 2–3 (CSS) and Tasks 4–7 (JS). §1 (data model) → Task 1. §2 (component changes) → Tasks 2–3. §3 (rendering changes) → Tasks 4–7, including the explicit note that `loadProfile()` gets no template change (confirmed against the actual current code in Task 8 rather than just asserted). §4 (Messages selection state) → Task 7. §5 (`admin.html`) → correctly required no `admin.html` changes; confirmed no task touches it. Testing section's responsive/touch-fallback callout → Task 8.
- **Added beyond the spec, justified:** delta computation for Analytics stats (Task 4) — the spec's Design Direction section explicitly described "▲ 12%" deltas but didn't specify how to compute them; Task 4 grounds this in real day-over-day/week-over-week comparisons against already-fetched data, with an explicit `null` (no delta shown) case for insufficient history rather than a fabricated or divide-by-zero number. `escapeHtml()` gap-closing across 5 rewritten CRUD templates (Tasks 5–6) — not in the spec, but a direct, zero-extra-cost consequence of rewriting templates the spec already mandates rewriting; called out explicitly in each task rather than silently bundled.
- **Type/name consistency checked:** every CSS class Task 2/3 produces is consumed by exactly the task that says it will (`.ed-stat-*` only in Task 4, `.list-*` only in Tasks 5–6, `.inbox-*` only in Task 7) — cross-checked class name spelling between the CSS blocks and the JS template literals word-for-word while writing this plan. `messages.is_read` (Task 1) matches the column name read/written in Task 7 exactly. No task references a class or column not defined by an earlier task.
- **Known pre-existing issue surfaced, not silently fixed:** `deleteSkill`'s unescaped-apostrophe `onclick` argument (Task 5) — flagged inline as out of scope for a rendering-rewrite plan, so it doesn't get silently fixed (scope creep) or silently perpetuated without a record (the report will show whoever reads it that this was a deliberate, documented choice).
