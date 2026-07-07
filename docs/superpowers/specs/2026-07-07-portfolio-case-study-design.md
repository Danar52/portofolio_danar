# Portfolio Case Study Detail Page — Design

## Goal
Replace the portfolio lightbox modal with a dedicated case-study detail page per project, so visitors can read the story behind a project (context, problem, solution, result) instead of just a title + short description in a popup.

## Scope
- New page `portfolio-detail.html?id=<portfolio.id>`, reached from "Lihat Detail" on `portfolio.html`
- 4 structured story sections (Latar Belakang, Masalah, Solusi, Hasil), each optional/independently hideable
- Multi-image gallery per project (optional)
- Admin panel: new form fields for the 4 story sections + gallery upload
- Full removal of the existing lightbox modal (HTML/CSS/JS) — no fallback path, per explicit decision

Out of scope: per-project static HTML files (rejected approach — see prior discussion), sitemap entries for detail pages (dynamic IDs, static sitemap), server-side rendering/pre-rendered meta tags for social share previews.

## Data Model

Add to the existing `portfolio` table:

```sql
alter table portfolio
  add column if not exists background      text,
  add column if not exists problem         text,
  add column if not exists solution        text,
  add column if not exists result          text,
  add column if not exists gallery_images  jsonb;
```

- `background`/`problem`/`solution`/`result`: nullable free text, one per story section
- `gallery_images`: nullable JSON array of image URL strings, e.g. `["https://.../a.png", "https://.../b.png"]` — same storage convention already used for `tags` (JSON array parsed client-side with a try/catch fallback)
- No RLS changes needed — `portfolio` already has public SELECT / authenticated-only INSERT/UPDATE/DELETE policies, and these are just new columns on the same table

## Public Page: `portfolio-detail.html`

Structural skeleton identical to every other page (site-header, nav-overlay with the 8 nav links, `main#main-content`, `site.js`, `chatbot.js`) — same SEO metadata boilerplate as the rest of the site (title/description/OG/Twitter/canonical pointing to `https://www.edanararrasyid.my.id/portfolio-detail.html` as the static fallback, `robots: index, follow`).

**Data loading** (`assets/js/portfolio-detail.js`, new file):
- Read `id` from `URLSearchParams(window.location.search)`
- Query: `supabase.from('portfolio').select('*').eq('id', id).eq('is_published', true).single()`
- If no `id` in URL, or the query errors/returns nothing (wrong id, unpublished, or deleted project) → render a "Project tidak ditemukan" empty state with a link back to `portfolio.html`. Do not throw, do not leave a blank/broken page.
- On success: update `document.title` and the `<meta name="description">` tag's content dynamically to the project's title/description (best-effort SEO for Googlebot's JS-rendering pass — raw social-share unfurling will still show the static fallback meta, an accepted limitation of this architecture)

**Layout** (top to bottom):
1. "← Kembali ke Portfolio" link (top of `main`, links to `portfolio.html`)
2. Hero media: if `gallery_images` has entries, show the first image large + the rest as a horizontal thumbnail strip below it (click a thumbnail to swap the large image — simple, no external carousel library). If `gallery_images` is empty, fall back to the existing thumbnail/live-screenshot logic already in `portfolio.js`'s `getThumbSrc()`/`loadScreenshot()` (reused, not reimplemented) so old projects without a gallery still show something.
3. Meta row: type badge + year (same `TYPE_CONFIG` labels/icons already defined in `portfolio.js`)
4. Title (`h1`, following `.page-title`-style but sized for a project title, not the page header)
5. Tags row (same `.pf-tag` pill style already in `portfolio.css`)
6. Story sections, in this fixed order, each rendered only if its field is non-empty: Latar Belakang (`background`) → Masalah (`problem`) → Solusi (`solution`) → Hasil (`result`). Each section is a heading + paragraph, visually separated (reuse the site's existing section-label pattern from `profil.css`'s `.about-section-label` / `.about-section-body` two-column layout for consistency with how "About" already presents labeled sections).
7. Action buttons row at the bottom: Live/GitHub/Behance/Figma — same markup/classes as the current lightbox's `.lightbox-actions`/`.lb-btn`/`.lb-btn-primary`/`.lb-btn-outline` (these classes move from `portfolio.css`'s lightbox section to a new "detail page" section in the same file, since the lightbox itself is being deleted)

If a project has none of the 4 story fields filled in (old/legacy data), the page still renders steps 1-5 and 7 — just without any story section — which satisfies "tetap ke halaman detail, tampilkan apa yang ada."

## `portfolio.js` Changes

- `getThumbSrc()`, `loadScreenshot()`, `TYPE_CONFIG`: unchanged, reused by both `portfolio.js` (grid) and the new `portfolio-detail.js` (hero fallback) — `portfolio-detail.js` will duplicate these two small functions rather than share a module, since this codebase has no shared-module convention between page scripts (each page script is self-contained, per existing pattern in `index.js`/`profil.js`/etc.)
- The `.pf-link` span in each `.pf-row` becomes an `<a href="portfolio-detail.html?id=${item.id}">` instead of plain text — clicking it (or anywhere in the row, per the existing `.pf-row` click handler) navigates instead of opening a lightbox
- Remove: `openLightbox()`, `closeLightbox()`, the `lightboxOverlay`/`lightboxClose` event listeners, and the `.pf-row` click handler's call into `openLightbox` — replaced by a plain navigation (`window.location.href = ...`) or, more simply, since the row itself becomes clickable via the inner anchor, the row's own click handler can be removed entirely and only the anchor's default link behavior is relied on (simpler, fewer moving parts, and keyboard/screen-reader accessible for free since it's a real `<a>` now instead of a `<span>` with a synthetic click handler on an ancestor)

## `portfolio.html` Changes

Remove the entire `<div class="lightbox-overlay" id="lightboxOverlay">...</div>` block (dead markup once nothing opens it).

## `assets/css/portfolio.css` Changes

- Remove all `.lightbox-*`/`.lb-btn*` rules tied to the modal overlay itself (`.lightbox-overlay`, `.lightbox-box`, `.lightbox-img-pane`, `.lightbox-img-badge`, `.lightbox-year`, `.lightbox-close`, the `lbIn`/`lbUp` keyframes, and the mobile bottom-sheet responsive block for the lightbox) — this also removes the short-viewport fix added for the lightbox in the previous task, since the component it fixed no longer exists
- Keep/relocate `.lightbox-body`'s inner content styles (`.lightbox-title`, `.lightbox-divider`, `.lightbox-desc`, `.lightbox-tags`, `.lightbox-tag`, `.lightbox-spacer`, `.lightbox-actions`, `.lb-btn`, `.lb-btn-primary`, `.lb-btn-outline`) — rename their selectors to a `.detail-*` naming scheme (e.g. `.detail-title`, `.detail-tags`, `.detail-actions`) since they now live in a full page, not inside a modal, and add them to a new `assets/css/portfolio-detail.css` file (new page gets its own stylesheet, consistent with the one-CSS-file-per-page convention already used everywhere else on this site)

## Admin Panel (`admin.html`/`assets/js/admin.js`)

In `openPortfolioForm()` (admin.js:199), after the existing "Deskripsi" field and before "Tags":

- 4 new `<textarea>` fields: `f_background` (Latar Belakang), `f_problem` (Masalah), `f_solution` (Solusi), `f_result` (Hasil) — all optional, same `.form-textarea` styling as the existing description field
- A "Galeri Foto" upload section: a `<input type="file" id="f_gallery" accept="image/*" multiple>` plus a live preview row of thumbnails for both already-saved gallery images (with an individual × remove button per thumbnail) and newly-selected-but-not-yet-uploaded files (also removable before save) — mirrors the existing single-thumbnail preview pattern already used for `f_thumb`, extended to a list instead of one image

On save: any newly selected gallery files are uploaded via the existing `uploadFile(file, 'portfolio')` helper (one call per new file), the resulting URLs are appended to whatever existing gallery URLs the admin didn't remove, and the combined array is saved as `gallery_images` (JSON) alongside the 4 new text fields in the same `payload` object already built for the other fields.

## Edge Cases
- Missing/invalid/unpublished `id` in URL → "Project tidak ditemukan" state, link back to `portfolio.html`, no console error, no infinite spinner
- Project with zero story fields filled → page renders without any story section (no empty headings)
- Project with zero gallery images → hero falls back to `thumbnail_url` or live-screenshot exactly as the grid card already does today
- Admin removes all gallery images and saves → `gallery_images` becomes an empty array (or `null`), detail page correctly falls back to the thumbnail/screenshot path
- Admin uploads gallery files but one upload fails mid-batch → per the existing `uploadFile()` behavior (returns `null` + toasts an error on failure), the failed file is skipped and the successfully uploaded ones are still saved — consistent with how thumbnail upload failure is already handled elsewhere in this file (does not block the whole save)

## Testing
No automated test suite in this codebase. Manual verification:
- Click "Lihat Detail" on a project with a filled-in story + gallery → confirm all 4 sections show, gallery thumbnails swap the hero image, action buttons work, page title/meta update
- Click "Lihat Detail" on a legacy project with no story/gallery → confirm it still renders sensibly (hero fallback, no empty section headings)
- Visit `portfolio-detail.html` with no `id`, a garbage `id`, and an unpublished project's real `id` → confirm the not-found state in all three cases
- Confirm the old lightbox no longer exists anywhere (no dead HTML/CSS/JS, no way to trigger it)
- Resize to mobile width and to a short-height desktop window (the class of bug just fixed on the old lightbox) and confirm the new page has no equivalent overflow/clipping issue — it's a normal scrolling page, not a fixed-height modal, so this class of bug shouldn't recur, but verify visually anyway
