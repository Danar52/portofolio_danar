# CV/Resume PDF Download — Design

## Goal
Let site visitors download Danar's CV/resume as a PDF directly from the homepage hero, with the file manageable from the existing admin panel (no redeploy needed to update the CV).

## Scope
- Homepage hero "Download CV" button only (per user decision — not on Profil page or nav)
- Admin panel upload/replace/remove control
- Direct file download on click (not preview-in-tab)

Out of scope: analytics/download tracking, multi-language CV variants, CV preview modal.

## Data Model
Add one nullable column to the existing `profile` table:

```sql
alter table profile add column cv_url text;
```

No new table, no new storage bucket — reuses the existing `portfolio-images` Supabase Storage bucket (already used for photos and certification PDFs), under a new `cv/` folder prefix.

## Admin Panel (`admin.html` / `assets/js/admin.js`)

In the existing "Edit Profil" page (`loadProfile()`, around admin.js:324), add a small "CV/Resume" card next to the photo card:

- If `profile.cv_url` is set: show filename/link + "Hapus CV" button
- If not set: show file input + "Upload CV" button
- Upload flow mirrors the existing photo upload pattern exactly:
  ```js
  const url = await uploadFile(file, 'cv');           // reuses existing helper, admin.js:67
  await db.from('profile').update({ cv_url: url }).eq('id', profileId);
  ```
- Remove flow mirrors `removePhoto()`: `update({ cv_url: null })`
- Restrict file input to `accept=".pdf"`; reject non-PDF client-side before upload (reuse existing `showToast` for the error).

No new admin nav section — this lives inside the current Profile page since there's exactly one CV for one person.

## Frontend (`index.html` / `assets/js/index.js`)

`index.html` hero section gets a second CTA next to the existing "View my work" link:

```html
<a id="heroCvBtn" class="hero-cta hero-cta-outline" download style="display:none">
  Download CV <i class="fas fa-arrow-down"></i>
</a>
```

`index.js` already queries `profile` for the About teaser (`select('bio, birth_date')`, index.js:72) — extend this to `select('bio, birth_date, cv_url')` (no extra request). After the fetch:

```js
if (profile.cv_url) {
  const btn = document.getElementById('heroCvBtn');
  btn.href = `${profile.cv_url}?download=Danar-CV.pdf`;
  btn.style.display = '';
}
```

If `cv_url` is empty/null, the button stays hidden — homepage renders exactly as it does today.

`.hero-cta-outline` is a new CSS class (in `assets/css/index.css`, alongside the existing `.hero-cta`) — same shape/size/font as `.hero-cta`, but outlined (border using `var(--border-mid)`, transparent background, `var(--text-1)` text) instead of filled, so it reads as a secondary action next to "View my work". No changes to the existing `.hero-cta` styling.

## Forced Download Behavior

Supabase Storage public URLs serve inline by default (PDF opens in a new tab rather than downloading), since no `Content-Disposition: attachment` header is set. Appending `?download=<filename>` to the public URL is handled by Supabase Storage's API and makes it respond with the correct header — this needs no SDK changes, just the query string appended at render time in `index.js`. The HTML `download` attribute is kept as a fallback for browsers that support it natively on same-origin-ish cases, but the query param is what actually guarantees the behavior cross-origin.

## Edge Cases
- No CV uploaded yet → button hidden, no broken link, no console error
- Admin uploads a non-PDF → rejected client-side via `accept=".pdf"` + a type check before calling `uploadFile`
- Admin replaces CV → `uploadFile` uses `Date.now()` in the path (existing pattern), so old file isn't overwritten in storage; only `cv_url` pointer changes. (Same behavior as existing photo uploads — acceptable, consistent with current codebase, not a new problem this feature introduces.)

## Testing
- Manual: upload CV via admin, confirm button appears on homepage and downloads correct file with correct filename
- Manual: remove CV via admin, confirm button disappears from homepage
- Manual: confirm non-PDF file is rejected in admin upload UI
