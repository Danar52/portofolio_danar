# Magnetic Cursor + Text Lens Magnify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing custom cursor with (1) automatic magnetic pull on every link/button, wired so the cursor ring pulls toward the same point as the element, and (2) a real text-magnification lens (DOM clone, not a filter) when hovering body copy.

**Architecture:** Reuse the existing GSAP-driven magnetic-hover system in `motion.js` (currently opt-in via `[data-magnetic]`) by broadening its selector and clamping its offset, then expose the active pull target through the existing `window.Motion` hook so `site.js`'s ring rAF loop can chase it. Text lens is new code in `site.js`'s cursor block: a single reusable DOM clone of the hovered text element, scaled and circle-clipped, translated to keep the magnified text aligned under the ring.

**Tech Stack:** Vanilla JS (no bundler, no test runner — this is a static HTML/CSS/JS site), GSAP 3.12.5 (already loaded via CDN on all 9 pages), plain CSS.

## Global Constraints

- Magnetic pull radius of effect = element's own bounds (no pre-entry pull); offset clamped to ±15px on each axis.
- Default magnetic strength for elements without `data-magnetic`: `0.35` (existing default). Elements with an explicit `data-magnetic="N"` keep using `N`.
- Text lens scope: `p, li, h1, h2, h3, h4, h5, h6` only — never `a, button, [role="button"]`.
- Text lens scale: `1.6x`. Clip radius: `20px` (matches base `.cursor-ring` diameter of 40px from commit `10bb877`).
- Everything stays inert when `prefers-reduced-motion: reduce` is set, or on non-hover/touch devices — reuse the existing gates already in `motion.js` (`reduced`, `canHover`) and `site.js` (`(hover: hover)` match, `cursorReduced`). Do not add new reduced-motion checks; the existing ones already wrap all of this code.
- No test framework exists in this repo — every "test" step below is a manual browser verification with exact actions and exact expected observations, not an automated assertion.
- All 9 pages that include the cursor markup (`certification.html`, `contact.html`, `experience.html`, `portfolio-detail.html`, `profil.html`, `index.html`, `event.html`, `skills.html`, `portfolio.html`) share the same `site.js`/`motion.js`/`base.css`, so a single edit to each shared file covers all of them — no per-page changes needed.

---

### Task 1: Broaden magnetic hover to all links/buttons, clamp offset, expose target hook

**Files:**
- Modify: `assets/js/motion.js:172-196` (the `magnetic()` function and its `MAGNETIC HOVER` comment block)
- Modify: `assets/js/motion.js:220-223` (the `window.Motion` export)

**Interfaces:**
- Produces: `window.Motion.magneticTarget()` → returns `{x: number, y: number}` (viewport coordinates of the currently-pulled element's new center) while a magnetic element is under the pointer, or `null` otherwise. Task 2 consumes this.

- [ ] **Step 1: Read the current implementation to confirm line numbers before editing**

Run: `grep -n "MAGNETIC HOVER\|function magnetic\|window.Motion" "/Users/ekadanararrasyid/VS Code/resume_danar/assets/js/motion.js"`
Expected output includes:
```
172:  /* ── MAGNETIC HOVER ─────────────────────────────────────────
176:  function magnetic() {
220:  window.Motion = {
```
If line numbers differ, adjust the edit below accordingly — the anchor text (not the line number) is what matters.

- [ ] **Step 2: Replace the `magnetic()` function**

Replace this exact block (currently `assets/js/motion.js:172-196`):

```js
  /* ── MAGNETIC HOVER ─────────────────────────────────────────
     Element drifts toward the cursor within its own bounds.
     Pointer-only; skipped entirely on touch.
  ─────────────────────────────────────────────────────────── */
  function magnetic() {
    if (!canHover || !hasGsap) return;

    document.querySelectorAll('[data-magnetic]').forEach(el => {
      const strength = parseFloat(el.dataset.magnetic) || 0.35;

      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - (r.left + r.width  / 2)) * strength,
          y: (e.clientY - (r.top  + r.height / 2)) * strength,
          duration: 0.6,
          ease: 'power3.out',
        });
      });

      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }
```

with:

```js
  /* ── MAGNETIC HOVER ─────────────────────────────────────────
     Element drifts toward the cursor within its own bounds.
     Pointer-only; skipped entirely on touch. Applies to every
     link/button automatically — data-magnetic on an element still
     overrides the default strength (index.html's hero CTAs keep
     their gentler 0.3/0.25). magneticTarget tracks the live pull
     point so the cursor ring (site.js) can chase the same spot
     instead of the raw pointer.
  ─────────────────────────────────────────────────────────── */
  let magneticTarget = null;

  function magnetic() {
    if (!canHover || !hasGsap) return;

    document.querySelectorAll('a, button, [role="button"]').forEach(el => {
      const strength = parseFloat(el.dataset.magnetic) || 0.35;

      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const rawX = (e.clientX - (r.left + r.width  / 2)) * strength;
        const rawY = (e.clientY - (r.top  + r.height / 2)) * strength;
        const x = Math.max(-15, Math.min(15, rawX));
        const y = Math.max(-15, Math.min(15, rawY));
        gsap.to(el, { x, y, duration: 0.6, ease: 'power3.out' });
        magneticTarget = { x: r.left + r.width / 2 + x, y: r.top + r.height / 2 + y };
      });

      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
        magneticTarget = null;
      });
    });
  }
```

- [ ] **Step 3: Add the hook to the `window.Motion` export**

Replace (currently `assets/js/motion.js:220-223`):

```js
  window.Motion = {
    refresh: bindReveals,
    lenis: () => lenis,
  };
```

with:

```js
  window.Motion = {
    refresh: bindReveals,
    lenis: () => lenis,
    magneticTarget: () => magneticTarget,
  };
```

- [ ] **Step 4: Manual verification in the browser**

Open `index.html` in the dev preview (or any of the 9 pages), with DevTools open.

1. Hover the hero CTA button (`.hero-cta`, has `data-magnetic="0.3"`) — it should drift toward the pointer, same as before this change (strength unchanged since it has an explicit `data-magnetic`).
2. Hover a plain nav link that never had `data-magnetic` (e.g. a link in the header nav) — it should now also drift toward the pointer, using the 0.35 default, and the drift should never exceed 15px in either axis even when the mouse is far inside a large element. Verify by running this in the DevTools console while hovering near the edge of a big element: `document.querySelector('a').style.transform` should show `translate(±15px or less, ±15px or less, 0px)`.
3. In the console, run `window.Motion.magneticTarget()` while hovering a link — expect an `{x, y}` object. Move the mouse off the link — expect `null`.

Expected: all three checks pass with no console errors.

- [ ] **Step 5: Commit**

```bash
git add assets/js/motion.js
git commit -m "Broaden magnetic hover to all links/buttons, clamp to 15px

Extends the existing [data-magnetic] GSAP system instead of building
a second one: default strength 0.35 for any a/button/[role=button]
without an explicit data-magnetic value, offset clamped to ±15px, and
a magneticTarget() hook exposed via window.Motion so the cursor ring
can chase the same pull point."
```

---

### Task 2: Ring chases the magnetic target instead of the raw pointer

**Files:**
- Modify: `assets/js/site.js:23-44` (the ring's rAF `loop()`)

**Interfaces:**
- Consumes: `window.Motion.magneticTarget()` from Task 1 — may be `undefined` if `motion.js` hasn't executed yet (site.js runs synchronously before the deferred `gsap`/`motion.js` scripts), so guard with optional chaining.

- [ ] **Step 1: Read the current loop to confirm line numbers**

Run: `grep -n "function loop\|const dx = mx - rx" "/Users/ekadanararrasyid/VS Code/resume_danar/assets/js/site.js"`
Expected: a match around line 23-24. Adjust the edit below if line numbers moved.

- [ ] **Step 2: Replace the loop's target calculation**

Replace this exact block (currently `assets/js/site.js:23-27`):

```js
    (function loop() {
      const dx = mx - rx, dy = my - ry;
      rx += dx * 0.11;
      ry += dy * 0.11;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
```

with:

```js
    (function loop() {
      // Chase whatever a magnetic element (motion.js) is currently pulling
      // toward, so the ring and the element read as one motion; fall back
      // to the raw pointer the rest of the time. Optional chaining because
      // site.js runs before the deferred gsap/motion.js scripts execute.
      const target = window.Motion?.magneticTarget?.();
      const tx = target ? target.x : mx;
      const ty = target ? target.y : my;
      const dx = tx - rx, dy = ty - ry;
      rx += dx * 0.11;
      ry += dy * 0.11;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
```

The rest of `loop()` (stretch/rotation math, `raf = requestAnimationFrame(loop)`) is unchanged — it already reads `dx, dy` from the lines above.

- [ ] **Step 3: Manual verification in the browser**

Open any of the 9 pages with DevTools open, `(hover: hover)` device (mouse, not touch emulation).

1. Move the mouse in empty space, away from any link/button — the ring should chase the pointer exactly as before this change (visually identical lag/stretch behavior).
2. Hover a link/button and hold the mouse near its edge (not dead center) — the ring should visibly settle over the element's (shifted) center rather than sitting under the raw mouse position, matching where the element itself has drifted to.
3. Move the mouse off the element — the ring should resume chasing the raw pointer again with no visible snap/jump.

Expected: all three checks pass, no console errors, dot (`#cursorDot`) is unaffected and still tracks the raw pointer exactly (dot logic at `site.js:18-21` was not touched).

- [ ] **Step 4: Commit**

```bash
git add assets/js/site.js
git commit -m "Ring chases the magnetic pull target, not just the raw pointer

Reads motion.js's new magneticTarget() hook each frame; falls back to
the raw mx/my when no magnetic element is active, so the existing
chase-lerp behavior is unchanged everywhere else."
```

---

### Task 3: Text lens magnify for body copy

**Files:**
- Modify: `assets/js/site.js` (inside the existing `if (dot && ring && window.matchMedia('(hover: hover)').matches) { ... }` block, after the `addHover` wiring)
- Modify: `assets/css/base.css` (new rules, placed after the existing cursor block, i.e. after line 230's `@media (hover: none) { .cursor-dot, .cursor-ring { display: none; } }`)

**Interfaces:**
- Produces: nothing consumed by other tasks — this is a self-contained addition.
- Consumes: nothing from Task 1/2 — independent element scope (`p, li, h1-h6` vs `a, button, [role="button"]`), per the spec's "Interaction Between the Two Features" section.

- [ ] **Step 1: Read the current cursor block to find the exact insertion point**

Run: `grep -n "addHover(el)\|querySelectorAll('a, button" "/Users/ekadanararrasyid/VS Code/resume_danar/assets/js/site.js"`
Expected: a match around `site.js:52` (`document.querySelectorAll('a, button, [role="button"]').forEach(addHover);`). Insert the new code immediately after this line, still inside the same enclosing `if` block (before its closing `}` at what is currently line 56).

- [ ] **Step 2: Add the text lens code to site.js**

Insert immediately after (currently) `site.js:52`:

```js
    document.querySelectorAll('a, button, [role="button"]').forEach(addHover);

    /* ── TEXT LENS MAGNIFY ────────────────────────────────────
       Real magnification (a live clone, not a filter) so hovered
       body copy reads larger under the ring. Scoped to body text
       only — links/buttons already get the magnetic + glass-ring
       treatment and don't need a second effect stacked on top.
    ─────────────────────────────────────────────────────────── */
    const LENS_SCALE = 1.6;
    const LENS_RADIUS = 20; // half of base .cursor-ring's 40px (base.css)
    let lensClone = null;

    function showLens(el) {
      if (!el.textContent.trim()) return;
      hideLens();
      lensClone = el.cloneNode(true);
      lensClone.classList.add('cursor-lens-clone');
      lensClone.setAttribute('aria-hidden', 'true');
      const r = el.getBoundingClientRect();
      lensClone.style.left = r.left + 'px';
      lensClone.style.top = r.top + 'px';
      lensClone.style.width = r.width + 'px';
      lensClone.style.height = r.height + 'px';
      document.body.appendChild(lensClone);
    }

    function updateLens(el, e) {
      if (!lensClone) return;
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const tx = -(px * (LENS_SCALE - 1));
      const ty = -(py * (LENS_SCALE - 1));
      lensClone.style.transform = `translate(${tx}px, ${ty}px) scale(${LENS_SCALE})`;
      lensClone.style.clipPath = `circle(${LENS_RADIUS}px at ${e.clientX}px ${e.clientY}px)`;
    }

    function hideLens() {
      if (lensClone) { lensClone.remove(); lensClone = null; }
    }

    function attachLens(el) {
      el.addEventListener('mouseenter', () => showLens(el));
      el.addEventListener('mousemove', e => updateLens(el, e));
      el.addEventListener('mouseleave', hideLens);
    }
    document.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6').forEach(attachLens);
```

- [ ] **Step 3: Add the supporting CSS**

Append to `assets/css/base.css`, immediately after line 230 (`@media (hover: none) { .cursor-dot, .cursor-ring { display: none; } }`):

```css

/* ── TEXT LENS MAGNIFY ────────────────────────────────────────────
   A live clone of the hovered text block, scaled and circle-clipped
   so it reads as magnification rather than a filter. The clone keeps
   the source element's classes, so font/colour rules — including the
   dark-surface overrides above — apply with no extra CSS here.
─────────────────────────────────────────────────────────────── */
.cursor-lens-clone {
  position: fixed;
  margin: 0;
  list-style: none;
  transform-origin: top left;
  pointer-events: none;
  z-index: 99997;
  will-change: transform, clip-path;
}
.cursor-lens-clone * { pointer-events: none; }
@media (hover: none) { .cursor-lens-clone { display: none; } }
```

- [ ] **Step 4: Manual verification in the browser**

Open `profil.html` or `experience.html` (pages with long body paragraphs) with DevTools open.

1. Hover a long paragraph — a magnified (1.6x) clone of that paragraph's text should appear, clipped to a ~40px circle that follows the cursor, with the magnified text staying visually aligned with the real text underneath as the mouse moves slowly across it.
2. Move the mouse quickly back and forth across the paragraph — no leftover/duplicate clones should appear (`document.querySelectorAll('.cursor-lens-clone').length` in the console should always be `0` or `1`, never more).
3. Move off the paragraph entirely — the clone should be removed (`document.querySelectorAll('.cursor-lens-clone').length === 0`).
4. Hover a paragraph that contains an inline `<a>` link — click the link where it's visible outside the lens circle — the click should navigate normally (the clone's `pointer-events: none` must not block it).
5. Open the nav menu overlay and hover one of its `<li>` items (which wrap a `nav-link` anchor) — confirm the text lens (on the `<li>`) and the magnetic pull (on the inner `<a>`) can both be visually present at once without looking broken; this is expected per the spec (disjoint element sets, both allowed to coexist).
6. With `prefers-reduced-motion: reduce` simulated in DevTools (Rendering tab → Emulate CSS media feature), confirm no lens clone appears at all when hovering text (the whole cursor block is skipped by the existing top-level gate).

Expected: all six checks pass, no console errors, no orphaned `.cursor-lens-clone` nodes left in the DOM after moving the mouse away.

- [ ] **Step 5: Commit**

```bash
git add assets/js/site.js assets/css/base.css
git commit -m "Add text lens magnify for hovered body copy

Clones the hovered p/li/h1-6 element into a single reusable overlay,
scaled 1.6x and clipped to a circle matching the base cursor ring's
40px diameter, translated opposite the pointer so the magnified text
stays aligned with the source underneath. Scoped away from links and
buttons, which already get the magnetic + glass-ring treatment."
```

---

### Task 4: Cross-page consistency check

**Files:** none (verification only — all changes in Tasks 1-3 are in shared `site.js`/`motion.js`/`base.css`, loaded identically by all 9 pages)

**Interfaces:** none.

- [ ] **Step 1: Spot-check the remaining pages**

`site.js`, `motion.js`, and `base.css` are shared, unversioned includes (no `?v=` cache-bust bump needed here since none of the HTML files themselves changed — only the JS/CSS they already reference). Open each of the 9 pages once and confirm the cursor (dot + ring) still renders and both new behaviors work:

`certification.html`, `contact.html`, `experience.html`, `portfolio-detail.html`, `profil.html`, `index.html`, `event.html`, `skills.html`, `portfolio.html`

For each: hover one link/button (magnetic pull + ring chase) and one paragraph or list item (text lens). No console errors on any page.

- [ ] **Step 2: Confirm the pre-existing `data-magnetic` elements on index.html still behave correctly**

On `index.html`, hover `.hero-cta` (`data-magnetic="0.3"`), `#heroCvBtn` (`data-magnetic="0.3"`), and `.footer-email` (`data-magnetic="0.25"`) — each should pull at its own explicit strength (not the new 0.35 default), still clamped to 15px.

- [ ] **Step 3: Final full-diff review**

```bash
git log --oneline -4
git diff HEAD~3 HEAD --stat
```

Expected: exactly 3 commits (Tasks 1-3), touching only `assets/js/motion.js`, `assets/js/site.js`, and `assets/css/base.css`. No HTML files modified (none needed to be — the cache-busting `?v=` query strings on `<script>`/`<link>` tags are optional for local testing; bump them only if/when this ships, per the pattern in commit `10bb877`).
