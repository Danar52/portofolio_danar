# Admin Redesign + Visitor Analytics — Design

## Goal
Upgrade visual quality of the admin dashboard (`admin.html` / `assets/css/admin.css`) to match the premium feel of the public site, and add a new visitor-analytics page inside admin so the owner can see how many people visit the portfolio, which pages, and where from. No redesign of public pages. No change to admin data model beyond the new analytics table.

## Out of scope
- Public-facing pages (index, profil, etc.) — untouched.
- Device/browser tracking (user-agent parsing) — not tracked.
- Any change to Supabase Auth signup settings — flagged as a separate follow-up action, not auto-applied here.

## 1. Data model

New table `page_visits`:

| column       | type        | notes                              |
|--------------|-------------|-------------------------------------|
| id           | bigint / identity | PK                            |
| page         | text        | page slug, e.g. `"index"`, `"profil"` |
| path         | text        | full pathname, e.g. `/profil.html` |
| referrer     | text, null  | `document.referrer`, raw           |
| visited_at   | timestamptz | default `now()`                    |

RLS:
- `INSERT`: allowed for `anon` (public pages write their own visit row).
- `SELECT`: allowed only for `authenticated` (admin dashboard reads).
- No `UPDATE`/`DELETE` policy — visit rows are immutable.

No PII stored (no IP, no user-agent, no cookies/session id).

## 2. Tracking integration

New module: `assets/js/analytics-track.js`.

```
export async function trackVisit() {
  try {
    const page = derive slug from location.pathname (e.g. "profil.html" -> "profil", "" / "index.html" -> "index")
    await supabase.from('page_visits').insert({
      page,
      path: location.pathname,
      referrer: document.referrer || null,
    });
  } catch (_) { /* swallow — tracking must never break the page */ }
}
```

Imported and called once at the top of each public page's own module entry script:
`index.js, profil.js, experience.js, skills.js, certification.js, portfolio.js, portfolio-detail.js, event.js, contact.js`.

Not added to `admin.html`, `admin-login.html`, or `404.html`.

No dedup/session logic — every page load = 1 row. Simplest model that answers "how many visitors, which day, which page."

## 3. Admin Analytics page

New sidebar section **"Overview"** placed above the existing **"Profil"** section, containing one nav item: **Analytics**. This becomes the default active page on `admin.html` load (replacing Skills as the landing page). Skills remains reachable via its existing nav item, just no longer pre-selected.

Content (`#page-analytics` / `#analyticsContent`, following the existing per-page container pattern in admin.html):

- **Stat card row** (4 cards, new `.stat-card` component — see Section 4): Total Visits (all-time), Visits Today, Visits This Week, Top Referrer.
- **Daily trend chart**: last 30 days, line or bar, via Chart.js loaded from `cdnjs` (already whitelisted in `vercel.json` CSP `script-src` — no CSP change needed).
- **Top Pages table**: page name, visit count, inline bar using the existing `.pct-bar`/`.pct-fill` pattern already in `admin.css` (reused, not duplicated).
- **Referrer breakdown**: top 5 sources, hostname parsed from `referrer` and bucketed (empty/same-origin → "Direct").

All aggregation happens client-side in JS after a single `select('page, path, referrer, visited_at')` query — traffic volume for a personal portfolio doesn't warrant a DB view/materialized aggregate.

## 4. Admin visual redesign (polish only)

Scope: visual weight only. No structural change, no new colors, no breaking `admin.js` DOM selectors (`id=`/`class=` hooks stay intact).

- New `.stat-card` component: elevated background, subtle border, soft shadow on hover, big number + label + icon. Used by the Analytics page.
- New shadow tokens (`--shadow-sm`, `--shadow-md`) added to `:root` in `admin.css`; applied to `.stat-card`, `.table-wrap`, `.sidebar-brand` — admin.css is currently almost flat (only modal/toast have shadow today).
- Sidebar active-link: keep current filled-pill style, add a small transition polish.
- Topbar: subtle shadow on scroll (`box-shadow` toggled via a scroll listener), replacing the flat border-only look.
- Table: slightly larger row padding; keep existing hover/border pattern.
- Typography and color palette: unchanged (`General Sans`, grey-studio tokens) — stays "satu tema" with the public site, just more visual hierarchy/depth.

Implementation of this section should go through the `frontend-design` skill to keep the visual language non-generic and consistent with the public site's design system, not just hand-rolled CSS tweaks.

## 5. Security follow-up (flagged, not auto-applied)

Current RLS on content tables (`profile`, `education`, `skills`, `experience`, `events`, `certifications`) uses `auth.role() = 'authenticated'` — any signed-up Supabase Auth account gets full write access, not just the owner. Exploitable only if public signup is enabled on the Supabase project (needs owner to check in Supabase Dashboard → Authentication → Providers).

Recommended fix (separate change, requires explicit go-ahead since it touches the live database):
1. Disable public signup in Supabase Auth settings (simplest — closes the whole path), and/or
2. Harden RLS policies to check a specific admin `auth.uid()` instead of any `authenticated` role.

`page_visits` (new table) is unaffected — its RLS is INSERT-anon / SELECT-authenticated, granting no write access to content.

## Testing

- Manual: open each of the 9 public pages, confirm a `page_visits` row is inserted (via Supabase table view or a quick `select`), confirm no console errors if the insert fails (network off / RLS misconfigured).
- Manual: log into admin, confirm Analytics loads as the default page, stat cards/chart/tables populate from seeded rows, no data = clean empty state (reuse `.empty-state` pattern).
- Manual: resize to mobile width, confirm Analytics page and stat cards reflow via existing `@media (max-width: 900px)` rules (extend if `.stat-card` row needs its own breakpoint).
- No CSP violations in browser console after adding Chart.js (verify `cdnjs.cloudflare.com` already covers it — it does, same host as Font Awesome).
