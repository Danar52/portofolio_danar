# Hero Illustration — Design

## Context

The hero on [index.html](../../../index.html) is a three-row grid ([index.css:8](../../../assets/css/index.css#L8)): `.hero-top` (status + location), `.hero-center` (`1fr`, holds only the `<h1>` bottom-aligned), and `.hero-bottom` (role + CTAs). The `1fr` centre row is almost entirely empty — a large blank band across the upper two-thirds of the viewport.

This spec fills that band with an illustrated portrait of the site owner, sitting behind the name.

The source file is `assets/profile_pic.PNG`: 1024×1536, **no alpha channel**, subject drawn over a flat cream background measured at `rgb(252, 247, 238)` in all four corners. The page background is `#f0f0ef`. Dropping the file in as-is paints a visible cream rectangle over the page — which is what the first attempt looked like.

## 1. Preparing the asset

The background has to be genuinely removed, not disguised.

**Chosen approach — border flood-fill with ImageMagick 7** (already installed at `/opt/homebrew/bin/magick`). The cream region is flooded to transparent from the image border with a colour tolerance. This is safe for this specific artwork because the subject is drawn with a solid black outline: the fill is region-connected, so it cannot leak through the outline into the jacket and shirt, which are themselves near-cream.

Rejected alternatives:

- **`mix-blend-mode: multiply` on the untouched file.** Costs nothing to produce, but the page background is *darker* than the image background, so multiply drags the whole illustration grey and darkens the cream clothing along with it. It hides the seam rather than removing it, and breaks over any non-flat backdrop.
- **Off-site / manual removal.** Best possible edge quality, but it is work the user has to do by hand and the result is not reproducible from the repo.

**Output pipeline:**

1. Flood-fill the border colour to transparent with a tuned fuzz percentage.
2. `-trim` the transparent margin so the subject's own box drives layout, not the artboard's.
3. Downscale to **800px wide** (height follows the trimmed aspect). The figure renders at roughly 350px wide on a 1440px viewport, so 800px covers 2× displays with margin and nothing beyond that is doing visible work.
4. Export **WebP** as the primary and **PNG** as fallback, wired through `<picture>`.

The 1.3 MB original is unacceptable for what will be the page's LCP element. Both outputs are new files under `assets/`; the original `profile_pic.PNG` stays in the repo untouched as the master.

**Verification gate:** the cutout is inspected at full size before any markup is written. If flood-fill leaves a cream halo along the anti-aliased outline that cannot be tuned out, stop and report rather than shipping a fringed asset.

## 2. Layout

The illustration is a decorative element inside `.hero-center`, absolutely positioned, horizontally centred, and bottom-anchored to the `.hero-bottom` border so it stands *on* that rule rather than floating. Its height fills most of the centre row.

The `<h1>` renders in front (`z-index` above the image). Both are at full opacity — the name overlaps the figure directly.

**Contrast:** the name is `--text-1` (`#1c1c1a`) and lands on the tan jacket. That pairing is high-contrast on its own, so no scrim, no text-shadow, no opacity reduction on the artwork.

**Layout stability:** explicit `width` and `height` attributes on the `<img>`, so the box is reserved before the image decodes and the hero cannot shift (CLS). Paired with `fetchpriority="high"` and no lazy loading, since it is above the fold and LCP-relevant. Everything else on the site keeps its existing lazy-loading behaviour.

**Accessibility:** `alt=""` plus `aria-hidden="true"`. The image is decorative — it depicts the person whose name is spelled out in the adjacent `<h1>`, so describing it again is redundant noise for a screen reader. Empty `alt` is the correct treatment for a decorative image, not a missing one.

**Responsive:** below 768px the illustration drops to **60% opacity** and shrinks so it no longer competes with the name on a narrow column, while the hero keeps the same character it has on desktop.

## 3. Motion

Two layers, both riding infrastructure that already exists in [motion.js](../../../assets/js/motion.js):

- **Entrance** — fade plus a slight scale, sequenced *after* the two existing `.hero-line` reveals (`0.25s` and `0.38s` delays, [index.css:50](../../../assets/css/index.css#L50)) so the figure resolves behind a name that has already landed.
- **Parallax** — drift following the pointer, clamped to **±12px** horizontally and **±8px** vertically. Small enough to read as depth rather than as the illustration sliding around.

Parallax is implemented as a generic `[data-parallax]` binder in motion.js rather than bespoke hero code. That file already owns every pointer-driven motion on the site and already holds the gates this needs: `canHover` and `hasGsap` ([motion.js:14-15](../../../assets/js/motion.js#L14)), plus the module-level `reduced` early-return ([motion.js:19-22](../../../assets/js/motion.js#L19)) that stops all of motion.js before any binder is defined. No new gating mechanism, no second animation system.

The binder reuses the same clamped-offset shape as `magnetic()`, but drives the element from the pointer's position in the *viewport* rather than from the element's own centre, and with much smaller travel — this is background drift, not a magnetic grab.

## 4. Interaction with the text lens

The text lens paints an **opaque patch of the surface colour** inside its disc ([site.js `surfaceOf`](../../../assets/js/site.js)). That patch is load-bearing: without it the untouched original text shows through beneath the enlarged copy and the two sets of glyphs overlap.

It also assumes the text sits on a flat colour. That has been true everywhere until now. Once the name sits over the illustration, hovering it would punch a flat `#f0f0ef` hole through the artwork inside the lens disc.

**Resolution (confirmed with the user):** `.hero-name` is added to `LENS_EXCLUDE` in site.js. The hero name loses the magnifier; every other piece of text on every page is unaffected.

## Files touched

| File | Change |
| --- | --- |
| `assets/` | New cut-out WebP + PNG derived from `profile_pic.PNG` |
| `index.html` | `<picture>` block inside `.hero-center`, before the `<h1>` |
| `assets/css/index.css` | Illustration positioning, stacking, responsive rules |
| `assets/js/motion.js` | Generic `[data-parallax]` binder |
| `assets/js/site.js` | `.hero-name` added to `LENS_EXCLUDE` |

Scoped to `index.html` only. No other page gains a hero illustration.

## Out of scope

- Any change to the illustration's artwork itself.
- A dark-theme variant — the site has no theme switcher.
- Hero illustrations on other pages.
