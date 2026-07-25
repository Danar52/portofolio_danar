# Hero Illustration + Name Marquee — Design

> Revised after implementation. The first version of this spec described a
> figure sitting inside the centre row behind a two-line name. That shipped,
> was reviewed against a reference (dennissnellenberg.com), and was rebuilt:
> the figure now spans the whole hero and the name is a single oversized line
> that loops. This document describes what the code actually does.

## Context

The hero on [index.html](../../../index.html) is a three-row grid ([index.css](../../../assets/css/index.css)): `.hero-top` (status + location), `.hero-center`, and `.hero-bottom` (role + CTAs). Before this work the centre row held only a two-line `<h1>`, leaving a large blank band across the upper two-thirds of the viewport.

The source file is `assets/profile_pic.PNG`: 1024×1536, **no alpha channel**, subject drawn over a flat cream background measured at `rgb(252, 247, 238)` in all four corners. The page background is `#f0f0ef`. Dropping the file in as-is paints a visible cream rectangle over the page — which is what the first attempt looked like.

## 1. Preparing the asset

The background has to be genuinely removed, not disguised.

**Chosen approach — border flood-fill with ImageMagick 7** (installed at `/opt/homebrew/bin/magick`). The cream region is flooded to transparent from the image border with a colour tolerance. This is safe for this artwork because the subject has a solid black outline: the fill is region-connected, so it cannot cross into the jacket and shirt, which are themselves near-cream.

Rejected alternatives:

- **`mix-blend-mode: multiply` on the untouched file.** Costs nothing to produce, but the page background is *darker* than the image background, so multiply drags the whole illustration grey and darkens the cream clothing along with it. It hides the seam rather than removing it, and breaks over any non-flat backdrop.
- **Off-site / manual removal.** Best possible edge quality, but it is work the user has to do by hand and the result is not reproducible from the repo.

**Tolerance is the whole game.** At **18% fuzz the fill breaks into the trousers**, whose colour is close enough to the background to connect through a thin spot in the outline. 5–12% leaves the figure intact. **12%** is used — the highest safe value, and it shows no fringe even composited over near-black.

**Output pipeline:**

1. Flood-fill the border colour to transparent at 12% fuzz.
2. `-trim` the transparent margin so the subject's own box drives layout, not the artboard's.
3. Downscale to **800px wide**.
4. Export **WebP** (primary) and a **128-colour quantised PNG** (fallback), wired through `<picture>`.

| | Before | After |
| --- | --- | --- |
| WebP | — | 54K |
| PNG fallback | 1.3 MB, no alpha | 71K, alpha |

Quantisation costs an RMSE of 0.57% against the full-colour PNG — imperceptible on flat illustration. The original `profile_pic.PNG` stays in the repo as the master.

## 2. Layout

### The figure

Absolutely positioned in `.hero`, horizontally centred, `bottom: 0` so it stands on the rule above the marquee, and tall enough to reach the header.

Its height is the single source of truth for the whole composition:

```
--portrait-h: calc(100vh - var(--header-height) - 12px)
--portrait-w: calc(var(--portrait-h) * 800 / 1298)
```

Because the aspect ratio is fixed, CSS knows the figure's width without measuring anything at runtime — and the rule gap below is computed from the same value, so the two can never disagree.

**Why it stops at the header rather than at `y=0`:** `.site-header` paints an opaque bar (`background: var(--bg)`), so a figure running to the top of the viewport had the top of its head painted over. It read as a crop, not as depth. The extra **12px** is clearance for the parallax, which can lift the figure by up to 8px; without it the head slid back under the bar on an upward drift and the crop reappeared intermittently. At full upward drift the head sits at 63 against a header ending at 60.

### Interrupted rules

`.hero-top` and `.hero-bottom` used to carry plain borders running edge to edge. The figure crosses both, so each is drawn instead as two segments — `::before` on the left, `::after` on the right — that stop short of the figure and resume beyond it. The line reads as passing behind the illustration.

```
width: calc(50% - var(--rule-cut) / 2 - var(--rule-gap) + var(--container-padding))
```

`--rule-cut` defaults to `--portrait-w` and is kept separate from it so a narrow screen can stand the figure down from interrupting the rules without also resizing it. The trailing `--container-padding` pulls each segment out to the viewport edge, since the bars sit inside the hero's horizontal padding.

Measured at 1440×860: left segment ends at 425, figure spans 456–986, right segment starts at 1015 — a 28px gap each side, comfortably clear of the 12px the parallax can drift it.

The hero's own bottom border stays intact: the figure stands on it.

### Name marquee

One line, `clamp(64px, 16vw, 260px)`, set wider than the viewport, full-bleed through the hero's padding, rendering in front of the figure. The hero clips it (`overflow: hidden`).

**Repetition and SEO.** The track holds four copies of the name, each followed by a dash. Only the `<h1>` carries the name as content; every other copy and every separator is `aria-hidden`. Repeating the phrase four times inside one heading would read as keyword stuffing to a crawler and would make a screen reader announce the name four times. The page keeps exactly one clean `<h1>` reading `Eka Danar Arrasyid`.

**Seam geometry — the part that is easy to get wrong.** The loop shifts the track by exactly `xPercent: -25`, so the track must repeat every quarter of its own width. That requires four *identical* units.

- Flex `gap` fails: four items produce only three gaps, so the track is `4·item + 3·gap` and the loop slips a quarter of a gap every cycle.
- A separator placed only *between* copies fails for the same reason: three separators for four names.

So the dash goes after **every** copy including the last. Measured: names 4 × 1784, separators 4 × 198, unit 1982 against a quarter-track of 1982.75 — a 0.75px rounding error.

**Contrast:** the name is `--text-1` (`#1c1c1a`) landing on a tan jacket. High-contrast on its own, so no scrim, no text-shadow, no opacity reduction on the artwork.

### Layout stability and accessibility

Explicit `width`/`height` on the `<img>` reserve the box before decode, so the hero cannot shift. Paired with `fetchpriority="high"`, a `<link rel="preload">` for the WebP, and no lazy loading — it is above the fold and is the LCP element. Measured CLS is **0**, the WebP resolves in 197ms, and the PNG fallback is never fetched.

`alt=""` plus `aria-hidden="true"` on the picture: the image depicts the person whose name is spelled out in the adjacent `<h1>`, so describing it again is redundant noise. Empty `alt` is the correct treatment for a decorative image, not a missing one.

### Responsive

Below 768px `--portrait-h` drops to `54vh` and the figure falls to **45% opacity**, stepping back to a backdrop so the name stays dominant on a narrow column.

The interrupted rules are switched off there (`--rule-cut: 0px; --rule-gap: 0px`). The figure is nearly as wide as the screen at that size, which left two stubs a few pixels long that read as damage rather than depth. With no cut and no gap the two segments are each half the width plus the padding, so they meet in the middle and draw one continuous line.

## 3. Motion

All of it rides infrastructure already in [motion.js](../../../assets/js/motion.js), which owns every pointer-driven motion on the site and holds the gates this needs: `canHover`, `hasGsap`, and the module-level `reduced` early-return that stops the whole file before any binder is defined.

**Entrance** — the figure fades and scales in on a delay, sequenced after the name's own reveal. The animation lives on the inner `<img>`, never on the `<picture>` wrapper: a filling animation keeps ownership of whatever property it touches, so an entrance animating `transform` on the wrapper would silently swallow every parallax offset written afterwards.

The reduced-motion case needs its own rule. The global block zeroes `animation-duration` but not `animation-delay`, and the resting state is `opacity: 0` — the figure would sit invisible for the full delay and then pop in. It opts out of the animation entirely instead.

**Parallax** — a generic `[data-parallax]` binder, clamped to **±12px** horizontally and **±8px** vertically.

It writes `--px`/`--py` rather than `transform`, because the elements it drives carry a transform of their own (the figure is centred with `translateX(-50%)`) and writing the whole property from JS would wipe it. For the same reason `data-parallax` sits on the wrapper, not the `<img>`: custom properties inherit downward, so setting them on the image would never reach the element whose transform consumes them.

It runs as **one lerp on the ticker**, not a tween per `mousemove`. Starting a tween per event means each new one restarts its ease from wherever the last had reached, and a fast pointer queues dozens at once — the drift arrives in steps rather than gliding. The factor is normalised against real elapsed time so it feels identical at 60Hz and 120Hz.

**Marquee** — an endless linear tween on the track, with `timeScale` driven by scroll velocity: down speeds it up, up runs it backwards, and it decays back to idle on its own. Clamped to ±8 so a flick of the wheel leans the marquee rather than flinging it into a blur. Measured `+7.60` scrolling down, `−7.48` scrolling up, both settling to `1`.

Velocity comes from Lenis when present, with a raw `scrollY`-delta fallback when it is not.

## 4. Interaction with the text lens

The text lens paints an **opaque patch of the surface colour** inside its disc ([site.js `surfaceOf`](../../../assets/js/site.js)). That patch is load-bearing: without it the untouched original text shows through beneath the enlarged copy and the two sets of glyphs overlap.

It also assumes the text sits on a flat colour. That was true everywhere until the name moved over the illustration, where magnifying it would punch a flat `#f0f0ef` hole through the artwork.

**Resolution (confirmed with the user):** `.hero-marquee` is in `LENS_EXCLUDE` in site.js. The hero name loses the magnifier; every other piece of text on every page is unaffected.

## Files touched

| File | Change |
| --- | --- |
| `assets/` | Cut-out WebP + PNG derived from `profile_pic.PNG` |
| `index.html` | `<picture>` as a direct child of `.hero`; marquee track replacing the two-line `<h1>`; WebP preload |
| `assets/css/index.css` | Figure sizing and placement, interrupted rules, marquee typography and seam padding, responsive and reduced-motion rules |
| `assets/js/motion.js` | `[data-parallax]` binder (ticker lerp) and `heroMarquee()` |
| `assets/js/site.js` | `.hero-marquee` added to `LENS_EXCLUDE` |

Scoped to `index.html` only. No other page gains a hero illustration.

## Known trade-offs

- The hero is assumed to be `100vh` tall. A viewport short enough for content to push it taller would leave the figure anchored to the bottom with its top below the header line. Accepted so the rule-gap arithmetic stays exact without measuring in JS.
- The hero name no longer magnifies under the text lens (see §4).

## Out of scope

- Any change to the illustration's artwork itself.
- A dark-theme variant — the site has no theme switcher.
- Hero illustrations on other pages.
