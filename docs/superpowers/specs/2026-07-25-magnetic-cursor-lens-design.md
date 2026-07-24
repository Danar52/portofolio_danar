# Magnetic Cursor + Text Lens Magnify — Design

## Context

The site already has a custom cursor (dot + lerped ring) in [site.js](../../../assets/js/site.js) and [base.css](../../../assets/css/base.css), with a "glass lens" look on the ring (`backdrop-filter: blur(3px) saturate(1.7) brightness(1.08)`, added in commit `10bb877`). That glass effect is purely visual (filters pixels already rendered) — it does not magnify content.

This spec adds two new, independent cursor behaviors:

1. **Magnetic pull** on interactive elements (links/buttons).
2. **Text lens magnify** — real magnification of body copy when the cursor passes over it.

Both must respect the existing `prefers-reduced-motion` gate and the `(hover: hover)` gate already in place (site.js:11, :16) — non-hover devices and reduced-motion users see none of this.

## 1. Magnetic Pull

**Correction from initial draft:** a magnetic-hover system already exists in [motion.js:176-196](../../../assets/js/motion.js#L176) (GSAP-driven, opt-in via `[data-magnetic]`, currently used on 3 elements in index.html only). This spec extends that system rather than building a second, independent one in site.js — avoids two transform systems fighting over the same elements.

**Scope:** every `a, button, [role="button"]` gets magnetic behavior automatically (no more manual `data-magnetic` opt-in needed going forward — existing `data-magnetic="0.3"` / `"0.25"` attributes on index.html still work and simply override the default strength for those three elements).

**Behavior:**
- Pull activates once the pointer is over the element (motion.js's existing `mousemove` listener is per-element, so the element's own bounding box is the natural activation boundary — no separate 80px pre-entry radius is needed on top of that).
- Offset is `(pointer − element center) * strength`, **clamped to 15px** in each axis — this replaces the original uncapped `strength`-only offset, so large elements can't drag disproportionately far.
- Default `strength` for elements without an explicit `data-magnetic` value: `0.35` (existing default, motion.js:180).
- `#cursorRing` (owned by site.js) pulls toward the same target point as the element while a magnetic element is active, so ring and element read as one motion.
- On `mouseleave`, GSAP eases the element back to `x:0, y:0` (existing `elastic.out(1, 0.4)` release, motion.js:193) — kept as-is, it already reads well.

**Implementation:**
- Modify `magnetic()` in motion.js: change `document.querySelectorAll('[data-magnetic]')` to `document.querySelectorAll('a, button, [role="button"]')`, read `strength` the same way (`parseFloat(el.dataset.magnetic) || 0.35`), and clamp the computed `x`/`y` to `±15` before passing to `gsap.to`.
- New small export/global hook from motion.js so site.js's ring-loop can read "current magnetic target point" (or `null` when no element is active) — e.g. `window.Motion.magneticTarget()` returning `{x, y} | null`, updated inside the same `mousemove` handler that already computes the offset.
- site.js's existing rAF loop (site.js:23-44) checks this hook each frame: if non-null, lerp `rx, ry` toward that point instead of raw `mx, my`.

**Edge cases:**
- Zero-size bounding rect (e.g., `display:none` element) → `getBoundingClientRect()` naturally returns `0,0,0,0`; guard on `r.width > 0 && r.height > 0` before computing an offset, matching the zero-size guard already implied by needing a visible target to hover in the first place.
- `!canHover || !hasGsap` → `magnetic()` already no-ops entirely (motion.js:177); ring-side hook returns `null` in that case, so site.js's ring loop is unaffected.
- `prefers-reduced-motion` → motion.js returns before defining `magnetic()` at all (motion.js:19-22) when reduced; `[data-magnetic] { transform: none !important; }` (base.css:779) already exists as a second safety net.
- Touch/non-hover devices → `canHover` gate in motion.js and the `(hover: hover)` gate in site.js both already exclude them.

## 2. Text Lens Magnify

**Scope:** `p, li, h1, h2, h3, h4, h5, h6` — body copy only. Nav links and buttons are explicitly excluded; they already get the magnetic-pull + glass-ring treatment and don't need a second effect stacked on top.

**Behavior:**
- On hovering a scoped text element, a single persistent clone of that element renders in a fixed-position overlay, scaled `1.6x`, clipped to a circle matching the ring's current size/position.
- As the pointer moves, the clone translates opposite the pointer's movement (`offset = pointerDelta * (scale - 1)`) so the magnified text under the ring stays visually aligned with the real text behind it.
- On `mouseleave`, the clone is removed from the DOM entirely (not hidden) — prevents stale clones surviving a reflow of the source content.

**Implementation:**
- `mouseenter` on a scoped element → `el.cloneNode(true)` into a single reusable overlay node (`.cursor-lens-clone`), positioned fixed, `transform: scale(1.6)`, `clip-path: circle(<ring-radius> at var(--lens-x) var(--lens-y))`.
- Only one clone exists at a time; switching hovered elements tears down the old clone and builds a new one.
- Clone gets `pointer-events: none` and `aria-hidden="true"` — purely visual, never intercepts clicks or screen readers, and any interactive descendants (e.g., an inline `<a>` inside a `<p>`) inside the cloned markup are inert.
- `mousemove` updates both the translate-alignment offset and the `--lens-x/--lens-y` custom properties (kept in sync with ring position).
- Clone colors/fonts come from real DOM (not a rasterized image), so dark-surface overrides already in base.css apply with no extra work.

**Edge cases:**
- Empty/whitespace-only element → skip clone creation (`el.textContent.trim()` guard).
- Page transitions → existing transition/navigation hook in site.js must also tear down any live clone, so it doesn't persist onto the next page.
- Reduced motion / non-hover device → inert, same top-level gates as everything else.

## Interaction Between the Two Features

Magnetic pull (interactive elements) and text lens (body copy) listen on disjoint element sets in the common case. An inline `<a>` inside a `<p>` can trigger both independently and simultaneously — its own magnetic listener moves the anchor, while the enclosing `<p>`'s lens listener (if also hovered) runs its own clone. No shared state, no conflict.

## Testing (manual — no test framework in this project)

**Magnetic pull:**
1. Hover a large CTA → element + ring pull toward pointer, capped at 15px.
2. Hover a small nav link → pull is present but subtle, not distracting.
3. Rapidly move the mouse across several adjacent links/buttons → no jitter, no double-transform fighting between elements (check via DevTools performance).
4. Toggle `prefers-reduced-motion` → effect fully off, cursor behaves as before this feature.
4b. Confirm the 3 existing `data-magnetic="0.3"`/`"0.25"` elements on index.html still use their explicit strength rather than the new 0.35 default.

**Text lens:**
5. Hover a long paragraph → text inside the lens reads at 1.6x, stays aligned with source text during fast movement.
6. Check dark-surface pages (nav panel, transition curtain) → clone contrast matches overrides.
7. Hover a paragraph containing an inline link → click still hits the real link (clone's `pointer-events: none` doesn't intercept).
8. Navigate between pages while a lens clone is active → since navigation here is a full document load (`window.location.href`, not SPA routing — site.js:183), the DOM resets on its own; confirm no visual flash of a stale clone during the curtain transition itself.

**Cross-cutting:**
9. Verify all 9 HTML pages that include the cursor markup pick up both features consistently (markup is duplicated per file, per existing pattern from commit `10bb877`).
