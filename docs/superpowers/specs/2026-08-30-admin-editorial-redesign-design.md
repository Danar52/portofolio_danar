# Admin Editorial Redesign — Design

## Goal
Replace the admin dashboard's generic-CRUD visual language (dense tables, small type, flat cards) with an "editorial" component system that matches the public site's actual DNA — same font (General Sans, already shared), same grey-studio token palette (already shared), but the public site's composition: big confident numbers, generous whitespace, thin-line separators instead of boxed borders everywhere. This is a component/CSS + rendering-markup overhaul, not a new feature, and not a navigation-structure change.

## Out of scope
- Sidebar/topbar shell structure — stays as-is (fixed left sidebar, sticky topbar, `pageMap`/`data-page` switching in `admin.js`). Only the shell's *styling details* (already partly done in the prior Task 3 pass — shadows, `.topbar.scrolled`) carry over; no structural change.
- Auth flow, `admin-login.html` — untouched.
- Any new admin feature beyond what's needed to support the new Messages read-state (see Data model below). No new content types, no new nav items.
- Custom cursor / page-transition curtain / magnetic-lens effects from the public site — these are public-site-only signature motion features; porting them to a data-entry dashboard would work against efficiency, which is the whole reason for this redesign. Admin gets the editorial *typography and spacing* language, not the public site's interactive flourishes.
- Chart.js visuals in Analytics (bar chart) — unchanged; only the stat-row/card treatment around it changes.

## Design direction (validated via visual companion, both approved by the user)

**"Editorial"**: large, confident numbers (52px display weight) as the primary visual anchor, thin 1px `--border` hairlines instead of boxed card borders between sections, generous padding, small uppercase-tracked labels (11px, 1.5px letter-spacing) doing the secondary-hierarchy work that borders/color used to do. Stat deltas (`▲ 12%`) in `--success`/`--error` at 12px, subordinate to the big number. This directly extends the public site's "one weight everywhere, hierarchy from size and colour" typography philosophy (`base.css`'s own stated principle) into the dashboard.

Two concrete patterns came out of this direction, validated against realistic mockups:

1. **List row** (replaces `<table>` on Skills, Portfolio, Experience, Events, Certifications): each item is a full-width row, ~18px vertical padding (vs. today's dense `12px 16px` table cells), a small icon/thumbnail on the left, title + subtitle stacked, and per-row actions (edit/delete) that are invisible until the row is hovered — decluttering the resting state instead of showing action buttons on every row all the time.
2. **Inbox split-view** (replaces the Messages `<table>`): a fixed-width list pane on the left (sender + one-line preview + relative date, unread rows visually distinct), a detail pane on the right showing the full message and actions (reply via `mailto:`, mark read, delete). Selecting a list item swaps the detail pane's content — no page navigation, no modal.

Forms and modals (`.form-group`/`.modal`/profile page) get the same typographic scale-up (larger headings, more breathing room) but keep their current structural layout — this is a polish pass on those, not a rebuild.

## 1. Data model — `messages.is_read`

```sql
ALTER TABLE messages ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;
```

Existing rows default to `false` (shown as unread) — acceptable, since the admin will naturally clear the backlog by opening each once. No RLS change needed (existing `messages` policies already gate by `authenticated`, same access pattern as before, verified against the current `loadMessages()`'s already-working `select`/`delete` calls).

Selecting a message in the inbox list pane fires `UPDATE messages SET is_read = true WHERE id = ...` (fire it once per selection, not on every re-render) and updates local render state immediately so the dot disappears without a full reload.

Live-migration handling follows this repo's established convention: the SQL above gets committed to `supabase_schema.sql` (new versioned section) and the human runs it manually in the Supabase SQL Editor — no agent has live DB write access.

## 2. Component changes — `assets/css/admin.css`

- **Stat row** (Analytics): replaces Task 3's `.stat-card-row`/`.stat-card` grid with a flex row of large numbers + labels + deltas, separated by a single bottom hairline from the chart below. Class names change (this supersedes, not extends, the Task 3 component) — the plan's file-structure section will name the exact new classes.
- **List row**: new component for the 5 CRUD list pages (Skills, Portfolio, Experience, Events, Certifications), replacing each page's `<table>`/`.table-wrap` rendering. Existing `.pct-wrap`/`.pct-bar`/`.pct-fill` (skill percentage) and `.tbl-img`/`.tbl-pdf` (thumbnails) patterns get adapted into the new row layout rather than reinvented — same visual language, new container.
- **Inbox split-view**: new component, two-pane layout (list + detail), only used by Messages.
- **Forms/modals**: typographic scale-up only (larger `.modal-title`/`.form-section-title`, more `.modal-body`/`.form-group` spacing) — no structural change to `.modal`/`.form-group`/`.profile-edit-wrap`.
- **Tokens** (`:root` in `admin.css`): unchanged — same grey-studio variables, same shadow tokens from Task 3. New component CSS reuses them, doesn't introduce new colors.

## 3. Rendering changes — `assets/js/admin.js`

Each of these functions currently builds a `<table>` (or, for Analytics, the Task 3 stat-card grid) via template literals in `innerHTML`; each gets its template rewritten to the new markup, with existing data-fetch/aggregation logic (Supabase queries, escaping, sorting) preserved as-is — this is a presentation-layer change, not a data-layer change:

- `loadAnalytics()` → new stat-row markup.
- `loadSkills()`, `loadPortfolio()`, `loadExperience()`, `loadEvents()`, `loadCertifications()` → new list-row markup, each keeping its existing per-item action handlers (edit opens the existing modal forms, delete opens the existing confirm modal — unchanged).
- `loadMessages()` → full rewrite: split-view render, click-to-select interaction, `is_read` UPDATE-on-select, `mailto:` reply action added (new — email client compose link using `m.email`, pre-filled subject "Re: " + existing subject if present).
- `loadProfile()` → unchanged data logic; only the HTML it emits gets the typographic polish (handled mostly at the CSS level, minimal template changes).

Existing `escapeHtml()` (added in the analytics work) continues to be used for all DB-sourced text in every rewritten template — this redesign does not touch that safety property, and the plan should call it out explicitly per list-row/inbox template so it isn't dropped during the rewrite.

## 4. `assets/js/admin.js` — Messages selection state

New local state inside the Messages page's render scope: which message id is currently selected (defaults to the first/most-recent message on load, or an empty-state in the detail pane if there are zero messages). Clicking a list item re-renders only the detail pane and the list's active/read styling — it does not re-fetch from Supabase (the already-loaded `data` array is reused), except for the one `is_read` UPDATE call.

## 5. `admin.html`

Messages page container (`#page-messages` → `#messagesContent`) needs no id changes — the split-view markup renders entirely inside the existing `#messagesContent` div, same pattern as every other page. No new nav items, no structural changes to `admin.html` beyond what `loadMessages()` renders into that existing container.

## Testing

- Manual, per page: open each of Analytics, Skills, Portfolio, Experience, Events, Certifications, Messages, Profile in the admin dashboard; confirm the new component renders correctly with real Supabase data, confirm empty-state still shows correctly when a table has zero rows (reuse existing `.empty-state` pattern).
- Messages: confirm clicking a list item updates the detail pane, confirms `is_read` flips in the DB (spot-check via Supabase table view), confirms the unread dot disappears after selection without a full page reload.
- Confirm every existing action (edit/delete on all 5 CRUD pages, delete on Messages, save on Profile) still works after the markup rewrite — these are presentation changes over unchanged handlers, but must be re-verified since the buttons/handlers are being re-templated.
- Responsive: re-check the existing `@media (max-width: 900px)`/`(max-width: 560px)` breakpoints against the new list-row and inbox split-view layouts (the split-view in particular needs a mobile fallback — likely stacking list-then-detail rather than a fixed two-column grid below 900px).
- Resize/hover: confirm list-row hover-reveal actions are also reachable on touch devices (hover-only actions are a common mobile-accessibility gap) — the plan should specify a touch fallback (e.g. always-visible actions below the list-row breakpoint, matching the pattern already used for `.hamburger`/mobile sidebar).
