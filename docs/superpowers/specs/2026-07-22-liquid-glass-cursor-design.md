# Liquid Glass Cursor — Design

## Goal

Give the existing custom cursor ring a frosted-glass material — blur, saturation, a specular highlight — plus a touch of liquid motion (stretch and relax) when it changes direction quickly. This is Apple's "Liquid Glass" material language (translucent, refractive-looking chrome), not a literal magnifying loupe that enlarges text.

## Scope

- Applies only to `.cursor-ring` (`assets/css/base.css`, `assets/js/site.js`). `.cursor-dot` is untouched.
- One small addition to the existing curtain toggle in `site.js`: mirror `pt-in` onto `<html>` alongside the existing `nav-open`/`pt-arrive` toggles, so the ring's dark-surface CSS can select against it (see Dark surfaces below). No new state machine — same toggle, one more class name.
- Ring always tracks the cursor, on every page, exactly as it does today — this is a material and motion change to an existing element, not a new hover-triggered feature.
- Existing `.cur-hover` (44px) and `.cur-click` (18px) size states are kept.

**Out of scope:** literal text magnification/loupe (see prior discussion — rejected in favour of this), a new physics/spring system (the squish is derived from the existing chase-lerp, not a second simulation), touch devices (the ring is already `display: none` under `(hover: none)` and stays that way), `prefers-reduced-data` handling.

## Visual material

The ring becomes a frosted disc:

```css
.cursor-ring {
  background: rgba(255,255,255,0.35);
  backdrop-filter: blur(6px) saturate(1.5) brightness(1.05);
  -webkit-backdrop-filter: blur(6px) saturate(1.5) brightness(1.05);
  border: 1px solid rgba(28,28,26,0.28);
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .cursor-ring { background: transparent; } /* today's plain-ring look */
}
```

A specular highlight sits inside it as a small radial-gradient patch fixed to the ring's own top-left (a `::before`, not tracked to any external light source) — the cheap, static way to suggest a lit curved surface.

**Dark surfaces.** The page is light almost everywhere; the two exceptions are the nav panel and the transition curtain. `nav-open` and `pt-arrive` are already toggled on `<html>` (`assets/js/site.js`), which is how `.menu-toggle` inverts today. `pt-in`, however, is currently only ever set on `#pageTransition` itself (`curtain.classList.add('pt-in')` / `.remove('pt-in')`, lines ~157 and ~196) — never on `<html>` — so it can't be selected from the ring without either a new JS line or `:has()`.

This work adds that missing line, mirroring the existing convention rather than introducing a new one: `document.documentElement.classList.add('pt-in')` alongside the existing `curtain.classList.add('pt-in')`, removed at the same point `curtain.classList.remove('pt-in')` already runs. With that in place, the CSS is one deterministic rule set:

```css
html.nav-open .cursor-ring,
html.pt-arrive .cursor-ring,
html.pt-in .cursor-ring {
  background: rgba(255,255,255,0.16);
  border-color: rgba(255,255,255,0.45);
}
```

Three known contexts, all flagged on `<html>`, all selectable without `:has()` or DOM-order assumptions.

`.cursor-dot` keeps its current `mix-blend-mode: difference` unchanged.

## Liquid motion

No new physics system. The existing chase-lerp already produces a velocity signal for free:

```js
const dx = mx - rx, dy = my - ry;   // computed before rx/ry update, each frame
```

Each frame: derive `magnitude = Math.hypot(dx, dy)` and `angle = Math.atan2(dy, dx)`. Map magnitude to a stretch factor (`clamp(magnitude / 60, 0, 1) * 0.35`, tunable during implementation), then set the ring's transform to rotate into the direction of travel, stretch along that axis, squash the perpendicular axis, rotate back:

```
translate(-50%,-50%) rotate(angle) scale(1+stretch, 1-stretch*0.6) rotate(-angle)
```

Because `stretch` is derived from the same lerp gap that's already shrinking every frame, it decays back to a circle on its own as the ring catches up — no separate spring/easing code needed. The specular highlight rotates along with the squish transform; for a liquid blob that reads as light catching the surface as it deforms, not as a bug.

`prefers-reduced-motion: reduce` disables the squish (ring stays a plain circle, still glass-textured, still tracks the cursor at the same lerp as always) — consistent with how `REDUCED` already gates motion elsewhere in `site.js` and `motion.js`. The glass material itself (blur/tint/highlight) is a static style, not motion, and stays on regardless.

## Cross-browser posture

`backdrop-filter` is broad-support at this point (Safari, Chrome, Firefox all ship it). The `@supports` fallback above means an unsupported browser silently gets today's plain translucent ring — never a broken or invisible one. No SVG-filter/`feDisplacementMap` distortion trick: that technique has inconsistent, sometimes buggy behaviour inside `backdrop-filter` specifically in Safari, and this project has already spent real effort chasing silent Safari-only failures this session. The liquid feel comes from motion (already proven, cheap, deterministic), not from pixel-level backdrop distortion.

## Testing

- Verify the glass tint/border reads correctly in all three contexts the CSS explicitly targets: a light page, the open nav panel, and while the transition curtain covers the screen.
- Verify the squish direction visually matches the actual mouse direction on a fast flick, and that it settles back to circular within a few frames of the mouse stopping.
- Verify `prefers-reduced-motion: reduce` yields a static circular glass ring — no stretch, still glass-textured.
- Verify `.cur-hover` (44px) and `.cur-click` (18px) still resize correctly with the new background/backdrop-filter in place.
- Verify the `@supports` fallback path (can be forced by temporarily renaming the property in DevTools) leaves a working, non-broken ring.
