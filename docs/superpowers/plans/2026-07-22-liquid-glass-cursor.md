# Liquid Glass Cursor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing `.cursor-ring` into a frosted-glass disc (blur, saturation, a static specular highlight) that also stretches slightly along the direction of travel on fast mouse movement, then relaxes back to a circle — Apple's "Liquid Glass" material language, not a literal text-magnifying loupe.

**Architecture:** Two files only — `assets/css/base.css` (the ring's visual material and its dark-surface overrides) and `assets/js/site.js` (the squish transform, derived from the existing chase-lerp with no new physics, plus mirroring the `pt-in` class onto `<html>` so the dark-surface CSS has something reliable to select). `.cursor-dot` is untouched throughout.

**Tech Stack:** Vanilla CSS (`backdrop-filter`, `@supports`) and vanilla JS (`requestAnimationFrame` loop already in `site.js`). No build step, no test framework — this is a static HTML/CSS/JS site. Every verification step below runs a JS snippet in the actual browser via the project's existing browser-tool workflow (the same pattern used for every prior feature this session: make the change, then assert the resulting computed styles/DOM state match what was intended) rather than a red/green unit-test cycle, because none exists in this codebase and inventing a fake one would be worse than being honest about it.

## Global Constraints

- Only `.cursor-ring` changes visually. `.cursor-dot` keeps its current `mix-blend-mode: difference` and is not touched by any task.
- No new physics/spring system. The squish factor is derived from the existing `(mx - rx, my - ry)` chase-lerp gap already computed every frame — never a second simulation.
- The ring stays `display: none` under `(hover: none)` exactly as today. Not a target of this work.
- No SVG filter / `feDisplacementMap` distortion. Glass look comes from `backdrop-filter: blur() saturate()` only, guarded by `@supports` so an unsupported browser gets today's plain ring, never a broken or invisible one.
- `prefers-reduced-motion: reduce` disables the squish only. The glass material itself (blur/tint/highlight) is a static style and stays on regardless.
- Each task must leave the ring in a working, correctly-centred state when done — never partway through a transform-ownership change (see Task 4 for why this matters).

---

## Task 1: Glass material on `.cursor-ring` (no transform/motion changes yet)

**Files:**
- Modify: `assets/css/base.css:171-179` (the `.cursor-ring` rule block)

**Interfaces:**
- Consumes: nothing new.
- Produces: `.cursor-ring` renders as a frosted disc (backdrop-filter blur + saturate, translucent white fill, dark-tinted border) instead of a blend-mode-inverted outline. `transform: translate(-50%, -50%)` stays static in CSS for now — Task 4 is the only task that moves transform ownership to JS, so this task cannot leave the ring uncentred.

- [ ] **Step 1: Replace the `.cursor-ring` rule**

Current block (`assets/css/base.css:171-179`):

```css
.cursor-ring {
  position: fixed; width: 28px; height: 28px;
  border: 1px solid rgba(255,255,255,0.55);
  border-radius: 50%; pointer-events: none; z-index: 99998;
  mix-blend-mode: difference;
  transform: translate(-50%, -50%);
  will-change: left, top;
  transition: width 0.25s ease, height 0.25s ease, border-color 0.25s, opacity 0.3s;
}
```

Replace with:

```css
/* Frosted glass, not blend-mode inversion: backdrop-filter can't be combined
   reliably with mix-blend-mode across browsers, and this project has already
   spent real effort chasing silent Safari-only failures. Dark surfaces (nav
   panel, transition curtain) get an explicit override below instead of an
   automatic colour-inversion trick. */
.cursor-ring {
  position: fixed; width: 28px; height: 28px;
  background: rgba(255,255,255,0.35);
  backdrop-filter: blur(6px) saturate(1.5) brightness(1.05);
  -webkit-backdrop-filter: blur(6px) saturate(1.5) brightness(1.05);
  border: 1px solid rgba(28,28,26,0.28);
  border-radius: 50%; pointer-events: none; z-index: 99998;
  transform: translate(-50%, -50%);
  will-change: left, top;
  transition: width 0.25s ease, height 0.25s ease, border-color 0.25s,
              background-color 0.25s, opacity 0.3s;
}
/* No backdrop-filter support: fall back to a plain translucent ring rather
   than an invisible one (a solid-colour background would look wrong; no
   background at all reproduces today's outline-only look). */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .cursor-ring { background: transparent; }
}
```

- [ ] **Step 2: Also update the hover/click size-state border colours**

These currently assume the blend-mode-inverted white border. Change (`assets/css/base.css:180-183`, only the `.cursor-ring` lines — leave the `.cursor-dot` lines exactly as they are):

```css
body.cur-hover .cursor-dot  { width: 7px; height: 7px; background: rgba(255,255,255,0.75); }
body.cur-hover .cursor-ring { width: 44px; height: 44px; border-color: rgba(255,255,255,0.3); }
body.cur-click .cursor-dot  { width: 3px; height: 3px; }
body.cur-click .cursor-ring { width: 18px; height: 18px; }
```

to:

```css
body.cur-hover .cursor-dot  { width: 7px; height: 7px; background: rgba(255,255,255,0.75); }
body.cur-hover .cursor-ring { width: 44px; height: 44px; border-color: rgba(28,28,26,0.4); }
body.cur-click .cursor-dot  { width: 3px; height: 3px; }
body.cur-click .cursor-ring { width: 18px; height: 18px; }
```

- [ ] **Step 3: Verify in the browser**

Load any page (dev server: `python3 -m http.server` or the project's existing `npx serve` launch config), open the Browser tool, and run:

```js
(() => {
  const ring = document.getElementById('cursorRing');
  const cs = getComputedStyle(ring);
  return JSON.stringify({
    backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
    background: cs.backgroundColor,
    blendMode: cs.mixBlendMode,
    borderColor: cs.borderColor,
    transform: cs.transform,
  }, null, 1);
})()
```

Expected: `backdropFilter` contains `blur` and `saturate`; `background` is `rgba(255, 255, 255, 0.35)`; **`blendMode` is `normal`** (not `difference` — this is the regression to watch for); `borderColor` is `rgba(28, 28, 26, 0.28)`; `transform` is still `matrix(1, 0, 0, 1, 0, 0)` or similar (unchanged, still centred — Task 4 hasn't run yet).

- [ ] **Step 4: Commit**

```bash
python3 scripts/bump-assets.py
git add -A
git commit -m "Give the cursor ring a frosted-glass material instead of blend-mode inversion"
```

(The pre-commit hook also runs `bump-assets.py` automatically — running it first here just lets you see what it staged before the commit happens.)

---

## Task 2: Specular highlight

**Files:**
- Modify: `assets/css/base.css` (add a new rule immediately after the `.cursor-ring` block from Task 1)

**Interfaces:**
- Consumes: `.cursor-ring` from Task 1 (must already have `position: fixed`, `border-radius: 50%`, no `overflow` restriction).
- Produces: `.cursor-ring::before` — a small static radial-gradient patch suggesting a lit curved surface. It has no independent position-tracking of its own; it moves and rotates with the ring because it is the ring's own pseudo-element.

- [ ] **Step 1: Add the highlight rule**

Insert directly after the `.cursor-ring` rule (and its `@supports` block) from Task 1:

```css
/* Static — not tracked to the cursor's direction of travel or any external
   light source. A moving highlight would need a second per-frame
   computation for a detail nobody consciously looks at; a fixed one reads
   just as convincingly as "a lit curved surface" at this size. */
.cursor-ring::before {
  content: '';
  position: absolute;
  top: 15%; left: 15%;
  width: 35%; height: 35%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(255,255,255,0) 70%);
  pointer-events: none;
}
```

- [ ] **Step 2: Verify in the browser**

```js
(() => {
  const cs = getComputedStyle(document.getElementById('cursorRing'), '::before');
  return JSON.stringify({
    content: cs.content,
    background: cs.backgroundImage,
    width: cs.width,
    position: cs.position,
  }, null, 1);
})()
```

Expected: `content` is `""` (empty string, quoted); `background` contains `radial-gradient`; `position` is `absolute`.

- [ ] **Step 3: Commit**

```bash
python3 scripts/bump-assets.py
git add -A
git commit -m "Add a static specular highlight to the cursor ring"
```

---

## Task 3: Dark-surface overrides + the missing `pt-in` html-class mirror

**Files:**
- Modify: `assets/css/base.css` (add a new override rule after Task 2's highlight rule)
- Modify: `assets/js/site.js:157` (mirror `pt-in` onto `<html>` when the outgoing transition curtain rises)
- Modify: `assets/js/site.js:196` (mirror the removal, in the bfcache-restore handler)

**Interfaces:**
- Consumes: `html.nav-open` (already toggled at `assets/js/site.js:78`), `html.pt-arrive` (already toggled at `assets/js/site.js:164-176`, set by the inline `<head>` script on arrival) — both pre-existing.
- Produces: `html.pt-in`, toggled at the same two call sites where `curtain.classList` already toggles `pt-in` on the panel element itself. Nothing outside this task should ever need to add or remove `html.pt-in` — these two sites are exhaustive (a full page navigation clears all classes for free; only the bfcache-restore path needs an explicit removal, which is exactly what the existing code at line 196 already handles for `curtain`'s own class).

- [ ] **Step 1: Read the exact current lines to confirm they haven't shifted**

```bash
grep -n "pt-in" assets/js/site.js
```

Expected output includes exactly these two lines (line numbers may have drifted slightly from Tasks 1-2, which only touched CSS — confirm against the actual grep output, not the numbers below):

```
157:    curtain.classList.add('pt-in');
196:      curtain.classList.remove('pt-in');
```

If the surrounding code doesn't match what's shown in Steps 2-3 below, stop and re-read `assets/js/site.js` in full before proceeding — don't guess at the insertion point.

- [ ] **Step 2: Mirror the `add`**

In `goTo()`, change:

```js
    pauseScroll(true);
    curtain.classList.add('pt-in');
    setTimeout(() => { window.location.href = href; }, CURTAIN_MS);
```

to:

```js
    pauseScroll(true);
    curtain.classList.add('pt-in');
    // Mirrored onto <html> alongside nav-open/pt-arrive so the cursor ring's
    // dark-surface CSS can select against it without a new mechanism.
    document.documentElement.classList.add('pt-in');
    setTimeout(() => { window.location.href = href; }, CURTAIN_MS);
```

- [ ] **Step 3: Mirror the `remove`**

In the `pageshow` bfcache-restore handler, change:

```js
  if (curtain) {
    window.addEventListener('pageshow', e => {
      if (!e.persisted) return;
      curtain.classList.remove('pt-in');
      document.documentElement.classList.remove('pt-arrive');
    });
  }
```

to:

```js
  if (curtain) {
    window.addEventListener('pageshow', e => {
      if (!e.persisted) return;
      curtain.classList.remove('pt-in');
      document.documentElement.classList.remove('pt-in');
      document.documentElement.classList.remove('pt-arrive');
    });
  }
```

- [ ] **Step 4: Run `node --check` on the modified file**

```bash
node --check assets/js/site.js
```

Expected: no output (clean syntax).

- [ ] **Step 5: Add the CSS override**

Insert after Task 2's `.cursor-ring::before` rule:

```css
/* The page is light almost everywhere; these are the two exceptions. Each
   is already flagged on <html> — nav-open and pt-arrive existed before this
   feature, pt-in was added to site.js above specifically so this selector
   list is exhaustive without :has() or DOM-order assumptions. */
html.nav-open .cursor-ring,
html.pt-arrive .cursor-ring,
html.pt-in .cursor-ring {
  background: rgba(255,255,255,0.16);
  border-color: rgba(255,255,255,0.45);
}
```

- [ ] **Step 6: Verify the CSS override in the browser**

```js
(() => {
  const ring = document.getElementById('cursorRing');
  const html = document.documentElement;
  const read = () => ({ bg: getComputedStyle(ring).backgroundColor,
                         border: getComputedStyle(ring).borderColor });
  const light = read();
  html.classList.add('nav-open');
  const navOpen = read();
  html.classList.remove('nav-open');
  html.classList.add('pt-in');
  const ptIn = read();
  html.classList.remove('pt-in');
  return JSON.stringify({ light, navOpen, ptIn }, null, 1);
})()
```

Expected: `light.bg` is `rgba(255, 255, 255, 0.35)` (Task 1's default); `navOpen.bg` and `ptIn.bg` are both `rgba(255, 255, 255, 0.16)` (this task's override) — `navOpen` and `ptIn` should be identical to each other and different from `light`.

- [ ] **Step 7: Verify the `pt-in` class actually appears during a real navigation**

Click any internal nav link (e.g. from the homepage, click "Portfolio" in the nav panel) and, in the moment before the page unloads, run:

```js
document.documentElement.classList.contains('pt-in')
```

Expected: `true`. (This has a short window — the page navigates away after `CURTAIN_MS` = 860ms, so run this immediately after clicking.)

- [ ] **Step 8: Commit**

```bash
python3 scripts/bump-assets.py
git add -A
git commit -m "Give the cursor ring dark-surface overrides for the nav panel and transition curtain"
```

---

## Task 4: Liquid squish motion

**Files:**
- Modify: `assets/css/base.css` (remove the now-redundant static `transform` line from `.cursor-ring` — JS takes full ownership of `transform` in this task)
- Modify: `assets/js/site.js:9-22` (the cursor state variables and the `loop()` function)

**Interfaces:**
- Consumes: `mx, my, rx, ry` (existing module-scope `let` variables, `assets/js/site.js:9`), the existing `dot`/`ring` element references (`assets/js/site.js:7-8`).
- Produces: `ring.style.transform` is now set every frame by JS (previously static in CSS) as `translate(-50%,-50%) rotate(<angle>rad) scale(<1+stretch>, <1-stretch*0.6>) rotate(<-angle>rad)`, or plain `translate(-50%,-50%)` when `prefers-reduced-motion: reduce` matches. **This must land in the same commit as the CSS removal below** — removing the CSS `transform` without the JS replacement (or vice versa) leaves the ring visibly off-centre.

- [ ] **Step 1: Remove the static `transform` from `.cursor-ring`**

In the CSS block Task 1 wrote, remove this one line (leave everything else in the rule as-is):

```css
  transform: translate(-50%, -50%);
```

- [ ] **Step 2: Replace the cursor state block**

Current (`assets/js/site.js:9-22`), the full block from the `let` declaration through the end of the `loop()` IIFE:

```js
  let mx = 0, my = 0, rx = 0, ry = 0, raf;

  if (dot && ring && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });

    (function loop() {
      rx += (mx - rx) * 0.11;
      ry += (my - ry) * 0.11;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      raf = requestAnimationFrame(loop);
    })();
```

Replace that whole block with:

```js
  let mx = 0, my = 0, rx = 0, ry = 0, raf;

  if (dot && ring && window.matchMedia('(hover: hover)').matches) {
    // Local to this block rather than a shared module-scope constant: the
    // transition section further down declares its own REDUCED the same
    // way, and referencing that one from here would hit its temporal-dead-
    // zone, since this code runs immediately, before that later line does.
    const cursorReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });

    (function loop() {
      const dx = mx - rx, dy = my - ry;
      rx += dx * 0.11;
      ry += dy * 0.11;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';

      if (cursorReduced) {
        ring.style.transform = 'translate(-50%,-50%)';
      } else {
        // Derived from the same chase-lerp gap already computed above — no
        // separate spring simulation. Stretch decays to 0 on its own as
        // rx/ry catch up to mx/my, which is what relaxes the ring back to a
        // circle without any extra easing code.
        const magnitude = Math.hypot(dx, dy);
        const stretch = Math.min(magnitude / 60, 1) * 0.35;
        const angle = Math.atan2(dy, dx);
        ring.style.transform =
          `translate(-50%,-50%) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.6}) rotate(${-angle}rad)`;
      }

      raf = requestAnimationFrame(loop);
    })();
```

Everything after this (the `addHover` function, the `mouseleave`/`mouseenter` listeners, and the closing `}` of the `if` block) stays exactly as it already is — only the lines shown above change.

- [ ] **Step 3: Run `node --check`**

```bash
node --check assets/js/site.js
```

Expected: no output.

- [ ] **Step 4: Verify centring didn't regress**

```js
(() => {
  const ring = document.getElementById('cursorRing');
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 300 }));
  return new Promise(r => setTimeout(() => {
    const rect = ring.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    r(JSON.stringify({ centre: { x: Math.round(cx), y: Math.round(cy) },
                        transform: getComputedStyle(ring).transform }, null, 1));
  }, 500));
})()
```

Expected: `centre.x` and `centre.y` are close to `400, 300` (within a few px — the ring is still chasing via the 0.11 lerp, 500ms is enough time for it to arrive) and `transform` is not `none`.

- [ ] **Step 5: Verify the squish reacts to a fast movement**

```js
(() => {
  const ring = document.getElementById('cursorRing');
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
  return new Promise(r => setTimeout(() => {
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 900, clientY: 700 }));
    setTimeout(() => {
      const midTransform = getComputedStyle(ring).transform;
      setTimeout(() => {
        const settledTransform = getComputedStyle(ring).transform;
        r(JSON.stringify({ midTransform, settledTransform }, null, 1));
      }, 1500);
    }, 30);
  }, 300));
})()
```

Expected: `midTransform` is a `matrix(...)` whose values are NOT a pure identity/rotation matrix (i.e. it reflects a non-1:1 scale — the `a` and `d` matrix components differ noticeably) shortly after the big jump; `settledTransform` is back to a matrix representing `translate(-50%,-50%)` with no scale distortion (`a` ≈ `d` ≈ 1) after the ring has had time to catch up.

- [ ] **Step 6: Commit**

```bash
python3 scripts/bump-assets.py
git add -A
git commit -m "Give the cursor ring liquid squish motion derived from its existing chase-lerp"
```

---

## Task 5: Cross-page and cross-state verification (no code changes)

**Files:** none — this task only verifies Tasks 1-4 together, on real pages, matching the spec's own Testing section.

- [ ] **Step 1: Verify `.cur-hover` / `.cur-click` sizing still works with the new background/backdrop-filter**

On the homepage, hover a link and check:

```js
(() => {
  const ring = document.getElementById('cursorRing');
  const link = document.querySelector('a.hero-cta, a[href]');
  link.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  const hoverSize = getComputedStyle(ring).width;
  link.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
  const restSize = getComputedStyle(ring).width;
  return JSON.stringify({ hoverSize, restSize }, null, 1);
})()
```

Expected: `hoverSize` is `44px`, `restSize` is `28px`.

- [ ] **Step 2: Verify the `@supports` fallback path leaves a working ring**

In the browser's DevTools, open the Rendering/Experiments panel (or equivalent) and disable `backdrop-filter` support emulation if available; otherwise, temporarily comment out the `backdrop-filter` and `-webkit-backdrop-filter` lines in the `.cursor-ring` rule locally, reload, and confirm the ring still renders (transparent background, visible border, still tracks the cursor) — then restore the lines. This step is a manual spot-check; there is no automated way to force `@supports not (...)` to match from a script in this project's toolset.

- [ ] **Step 3: Verify `prefers-reduced-motion: reduce` disables the squish but not the glass material**

`matchMedia` results can't be overridden from a page script — this needs real DevTools emulation (Chrome/Edge: Rendering tab → "Emulate CSS media feature prefers-reduced-motion" → reduce; Firefox: `about:config` → `ui.prefersReducedMotion` → `1`; Safari: System Settings → Accessibility → Display → Reduce Motion, or the responsive design mode's media-feature toggle). With it forced on, reload the page, move the mouse quickly across the screen, and confirm:
- the ring still shows the frosted background/border/highlight from Tasks 1-2 (glass material stays on)
- the ring never visibly stretches into an ellipse, even on a fast flick (squish is off)

Turn the emulation back off afterward.

- [ ] **Step 4: Spot-check the squish direction visually**

Automated verification of the exact stretch angle is unreliable here: the stretch direction depends on `mx - rx` at the moment a frame runs, and the gap between a dispatched `mousemove` and the next `requestAnimationFrame` callback isn't deterministic from outside the loop, so scripted assertions can only confirm "some distortion happened," not "in exactly this direction." With emulation off again, move the real mouse in a fast straight line (e.g. a quick diagonal flick from one corner of the viewport toward the centre) and confirm by eye that the ring elongates along that same line, not perpendicular to it or at a fixed angle regardless of movement direction.

- [ ] **Step 5: Check the browser console for errors on at least three pages**

Load `index.html`, `contact.html`, and `portfolio.html` in turn and check the console is clean (no errors related to `cursorRing`, `classList`, or `matchMedia`).

- [ ] **Step 6: Confirm `.cursor-dot` is unaffected**

```js
(() => {
  const cs = getComputedStyle(document.getElementById('cursorDot'));
  return JSON.stringify({ blendMode: cs.mixBlendMode, background: cs.backgroundColor }, null, 1);
})()
```

Expected: `blendMode` is `difference`, `background` is `rgb(255, 255, 255)` — unchanged from before this feature.

No commit for this task (no files changed). If any check fails, go back to the relevant task, fix, and re-run that task's own verification before returning here.
