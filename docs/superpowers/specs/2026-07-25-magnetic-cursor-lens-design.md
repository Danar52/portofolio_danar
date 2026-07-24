# Magnetic Cursor + Text Lens Magnify — Design

## Context

The site already has a custom cursor (dot + lerped ring) in [site.js](../../../assets/js/site.js) and [base.css](../../../assets/css/base.css), with a "glass lens" look on the ring (`backdrop-filter: blur(3px) saturate(1.7) brightness(1.08)`, added in commit `10bb877`). That glass effect is purely visual (filters pixels already rendered) — it does not magnify content.

This spec adds two new, independent cursor behaviors:

1. **Magnetic pull** on interactive elements (links/buttons).
2. **Text lens magnify** — real magnification of body copy when the cursor passes over it.

Both must respect the existing `prefers-reduced-motion` gate and the `(hover: hover)` gate already in place (site.js:11, :16) — non-hover devices and reduced-motion users see none of this.

## 1. Magnetic Pull

**Scope:** `a, button, [role="button"]` — same selector set already used for `addHover` (site.js:52), so magnetic wiring rides the same `querySelectorAll` pass.

**Behavior:**
- Radius: 80px from the element's bounding-rect center.
- Max pull: 15px.
- Both the element itself and `#cursorRing` translate toward the pointer while inside the radius; the element eases back to `translate(0,0)` via CSS transition on `mouseleave`.

**Implementation:**
- New `addMagnetic(el)` function alongside `addHover(el)` in site.js, called from the same `forEach` (site.js:52).
- `mouseenter` attaches a **local** `mousemove` listener scoped to that element (not the global rAF loop) — avoids an O(n) distance check against every magnetic element on every global mousemove.
- On each local `mousemove`: compute `dx, dy` from pointer to element center, clamp magnitude to 15px, `el.style.transform = translate(dx, dy)`.
- Ring's existing rAF loop (site.js:23-44) is fed a target point that differs from raw `mx, my` while a magnetic element is active, so ring and element move toward the same point.
- `mouseleave` removes the local listener and resets `el.style.transform` via a CSS `transition: transform` (not an instant snap).

**Edge cases:**
- Zero-size bounding rect (e.g., `display:none` element focused programmatically) → guard on `width > 0 && height > 0` before computing pull.
- Adjacent magnetic elements with overlapping 80px radii → no extra logic needed; only the element currently under `mouseenter` runs its local listener, so there's no ambiguity about which one "wins."
- Touch/non-hover devices and `prefers-reduced-motion` → entire feature inert (existing top-level gates).

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
3. Rapid mouse movement in/out of radius across several elements → no listener leaks, no jitter (check via DevTools performance/memory).
4. Toggle `prefers-reduced-motion` → effect fully off, cursor behaves as before this feature.

**Text lens:**
5. Hover a long paragraph → text inside the lens reads at 1.6x, stays aligned with source text during fast movement.
6. Check dark-surface pages (nav panel, transition curtain) → clone contrast matches overrides.
7. Hover a paragraph containing an inline link → click still hits the real link (clone's `pointer-events: none` doesn't intercept).
8. Navigate between pages while a lens clone is active → no stale clone carries over to the new page.

**Cross-cutting:**
9. Verify all 9 HTML pages that include the cursor markup pick up both features consistently (markup is duplicated per file, per existing pattern from commit `10bb877`).
