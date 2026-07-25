# Hero Illustration + Name Marquee — Design

> Rewritten from the shipped code, not from the original proposal. An earlier
> version of this document described a figure sitting inside the centre row
> behind a two-line name; that was rebuilt against a reference
> (dennissnellenberg.com) before it settled. Everything below was read back
> out of `index.html`, `assets/css/index.css`, `assets/js/motion.js` and
> `assets/js/site.js`.

## Context

The hero is a three-row grid: `.hero-top` (status + location), `.hero-center`, `.hero-bottom` (role + CTAs), with `min-height: 100vh` and `overflow: hidden`. Before this work the centre row held a two-line `<h1>` and the upper two-thirds of the viewport was blank.

The source artwork is `assets/profile_pic.PNG`: 1024×1536, **no alpha channel**, subject drawn over flat cream measured at `rgb(252, 247, 238)` in all four corners. The page background is `#f0f0ef`, so the untouched file paints a visible cream rectangle over the page.

## 1. The asset

The background is removed, not disguised.

**Border flood-fill with ImageMagick 7.** The cream is flooded to transparent inward from the image border. This is safe for this artwork specifically because the subject has a solid black outline: the fill is region-connected and cannot cross it into the jacket and shirt, which are themselves near-cream.

Rejected:

- **`mix-blend-mode: multiply` on the untouched file.** Free to produce, but the page background is *darker* than the image background, so multiply drags the whole illustration grey and darkens the cream clothing with it. It hides the seam instead of removing it, and fails over any non-flat backdrop.
- **Off-site or manual removal.** Better edge control, but it is hand work and the result is not reproducible from the repo.

**Tolerance is the whole game.** At **18% fuzz the fill breaks into the trousers** — their colour is close enough to the background to connect through a thin spot in the outline. 5–12% leaves the figure intact. **12%** is used: the highest safe value, and it shows no fringe even composited over near-black.

Pipeline: flood-fill at 12% → `-trim` → downscale to **800px wide** → export WebP plus a **128-colour quantised PNG** fallback, wired through `<picture>`.

| | Before | After |
| --- | --- | --- |
| WebP | — | 54K |
| PNG fallback | 1.3 MB, no alpha | 71K, alpha |

Quantisation costs an RMSE of 0.57% — imperceptible on flat illustration. `profile_pic.PNG` stays in the repo as the master.

## 2. Layout

### The figure

`<picture class="hero-portrait">` is a direct child of `.hero`, absolutely positioned, centred with `translateX(-50%)`, `bottom: 0` so it stands on the rule above the marquee. It passes behind the header and both text bars.

Its height is the single source of truth for the composition:

```css
--portrait-h: calc(100vh - var(--header-height) - 12px);
--portrait-w: calc(var(--portrait-h) * 800 / 1298);
```

Because the aspect ratio is fixed, CSS derives the figure's width without measuring anything at runtime, and the rule gap below is computed from the same value — the two cannot disagree.

**Why it stops at the header rather than `y=0`:** `.site-header` paints an opaque bar (`background: var(--bg)`), so a figure running to the top of the viewport had the top of its head painted over. It read as a crop, not as depth.

**Why the extra 12px:** clearance for the parallax, which can lift the figure by up to 8px. Without it the head slid back under the bar on an upward drift and the crop reappeared intermittently. At full upward drift the head sits at 63 against a header ending at 60.

### Interrupted rules

`.hero-top` and `.hero-bottom` no longer carry borders. Each draws two segments instead — `::before` left, `::after` right — that stop short of the figure and resume beyond it, so the line reads as passing behind the illustration:

```css
width: calc(50% - var(--rule-cut) / 2 - var(--rule-gap) + var(--container-padding));
```

`--rule-cut` defaults to `--portrait-w` but is a **separate variable on purpose**, so a narrow screen can stand the figure down from interrupting the rules without also resizing it. The trailing `--container-padding` pulls each segment out to the viewport edge, since the bars sit inside the hero's padding.

The hero's own bottom border stays intact — the figure stands on it.

### Name marquee

One line, full-bleed (`width: 100vw` with a negative margin cancelling the hero padding), rendering in front of the figure, clipped by the hero.

**Repetition and SEO.** The track holds four copies of the name, each followed by a dash. Only the `<h1>` carries the name as content; every copy and every separator is `aria-hidden`. Repeating the phrase four times inside one heading would read as keyword stuffing to a crawler and would make a screen reader announce the name four times. The page keeps exactly one `<h1>` reading `Eka Danar Arrasyid`.

**Seam geometry — the part that is easy to break.** The loop shifts the track by exactly `xPercent: -25`, so the track must repeat every quarter of its own width, which requires four *identical* units. Two ways to get this wrong, both already hit once:

- **Flex `gap`.** Four items produce only three gaps, so the track is `4·item + 3·gap` and the loop slips a quarter of a gap every cycle.
- **A separator only *between* copies.** Three separators for four names, same failure.

So the dash goes after **every** copy including the last, as its own element. Measured at 1440×860: names 4 × 1784, separators 4 × 198, unit 1982 against a quarter-track of 1982.75 — 0.75px of rounding.

**Contrast:** the name is `--text-1` (`#1c1c1a`) landing on a tan jacket. High-contrast on its own — no scrim, no text-shadow, no opacity reduction on the artwork.

### Layout stability and accessibility

Explicit `width`/`height` on the `<img>` reserve the box before decode. Paired with `fetchpriority="high"`, a `<link rel="preload">` for the WebP, and no lazy loading — it is above the fold and is the LCP element. Measured **CLS 0**, WebP resolved at 197ms, PNG fallback never fetched.

`alt=""` plus `aria-hidden="true"`: the image depicts the person whose name is in the adjacent `<h1>`, so describing it again is redundant noise. Empty `alt` is the correct treatment for a decorative image, not a missing one.

### Responsive

A phone is not a small desktop here. The composition is proportioned across the *width* on a wide screen; carrying those ratios straight down left the figure short of the fold under a tall empty band, with the name pinned at its clamp floor.

| | Desktop | ≤768px |
| --- | --- | --- |
| `--portrait-h` | `calc(100vh - header - 12px)` | `70vh` |
| Figure opacity | `1` | `0.5` |
| Name size | `clamp(64px, 16vw, 260px)` | `clamp(72px, 24vw, 150px)` |
| Separator padding | `clamp(20px, 4vw, 72px)` | `clamp(16px, 5vw, 40px)` |
| Rules | interrupted | continuous |

The steeper `vw` factor matters more than it looks: at 375px wide, `16vw` resolves to 60px and is pushed back up to the 64px floor, so the name stops growing with the screen and reads as small type that happens to be clipped rather than as oversized type.

The interrupted rules are switched off (`--rule-cut: 0px; --rule-gap: 0px`) because the figure is nearly as wide as the screen there, which left two stubs a few pixels long that read as damage rather than depth. With no cut and no gap the two segments are each half the width plus the padding, so they meet in the middle and draw one continuous line.

Measured at 375×812: `<h1>` and copies both 90px, four items of 697, unit 763 against a quarter-track of 763 — **seam error 0**.

#### Two traps in the mobile CSS

1. **Placement decides whether it applies at all.** The mobile typography lives in the `MOBILE` block at the *end* of index.css, after the base `.hero-name` rules. Those rules tie its specificity, so source order is the only thing choosing a winner — an earlier copy of the same overrides, written above them, was silently never applied.
2. **Never size `.hero-name` alone.** All three selectors (`.hero-name`, `.hero-name-dup`, `.hero-name-sep`) move together, or the four units stop being identical. A rule left over from the old two-line hero sized only `.hero-name` at this breakpoint, leaving the `<h1>` at 34px against copies at 62px and pushing the seam out by **170px** — a jump once per cycle, visible only at the join and invisible in a screenshot.

## 3. Motion

Everything rides infrastructure already in `motion.js`, which owns every pointer-driven motion on the site and holds the gates this needs: `canHover`, `hasGsap`, and the module-level `reduced` early-return that stops the whole file before any binder is defined.

### Entrance

The figure fades and scales in (`heroPortraitIn`, 0.9s, 0.5s delay), sequenced after the marquee's own reveal (0.25s) so it resolves behind something that has already landed.

The animation lives on the inner `<img>`, **never** on the `<picture>` wrapper: a filling animation keeps ownership of whatever property it touches, so an entrance animating `transform` on the wrapper would silently swallow every parallax offset written afterwards.

The resting opacity travels through `var(--portrait-opacity, 1)` inside the keyframe rather than a second `@keyframes` in the media query — keyframes are global regardless of the block they are nested in, and a duplicate name is a trap.

**Reduced motion needs its own rule.** The global block zeroes `animation-duration` but not `animation-delay`, and the resting state is `opacity: 0` — the figure would sit invisible for the full delay and then pop in. It opts out of the animation entirely instead.

### Parallax

A generic `[data-parallax]` binder, clamped to **±12px** horizontally and **±8px** vertically. The hero figure declares `data-parallax="0.02"`, which is full travel; lower is subtler.

It writes `--px`/`--py` rather than `transform`, because the elements it drives carry a transform of their own (the figure is centred with `translateX(-50%)`) and writing the whole property from JS would wipe it. For the same reason `data-parallax` sits on the **wrapper**, not the `<img>`: custom properties inherit downward, so setting them on the image would never reach the element whose transform consumes them.

It runs as **one lerp on the ticker**, not a tween per `mousemove`. Starting a tween per event means each new one restarts its ease from wherever the last had reached, and a fast pointer queues dozens at once — the drift arrives in steps rather than gliding. The factor is normalised against real elapsed time so it feels identical at 60Hz and 120Hz.

### Marquee

An endless linear tween (`xPercent: -25`, 26s, `repeat: -1`) with `timeScale` driven by scroll velocity: `1 + velocity * 0.35`, clamped to **±8** so a flick of the wheel leans the marquee rather than flinging it into a blur. Negative timeScale runs the loop backwards, which is what makes scrolling up reverse the name. It decays back to 1 on the ticker, so the marquee settles instead of holding whatever the last scroll frame left behind.

Measured `+7.60` scrolling down and `−7.48` scrolling up, both settling to `1`.

Velocity comes from Lenis when present, with a raw `scrollY`-delta fallback when it is not.

## 4. Interaction with the text lens

The text lens paints an **opaque patch of the surface colour** inside its disc (`surfaceOf` in site.js). That patch is load-bearing: without it the untouched original shows through beneath the enlarged copy and the two sets of glyphs overlap.

It also assumes the text sits on a flat colour. That held everywhere until the name moved over the illustration, where magnifying it would punch a flat `#f0f0ef` hole through the artwork.

**Resolution (confirmed with the user):** `.hero-marquee` is in `LENS_EXCLUDE` in site.js. The hero name loses the magnifier; every other piece of text on every page is unaffected.

## Files touched

| File | Change |
| --- | --- |
| `assets/` | `hero-portrait.webp` + `hero-portrait.png`, cut from `profile_pic.PNG` |
| `index.html` | `<picture>` as a direct child of `.hero`; marquee track replacing the two-line `<h1>`; WebP preload |
| `assets/css/index.css` | Figure sizing and placement, interrupted rules, marquee typography and seam padding, responsive and reduced-motion rules |
| `assets/js/motion.js` | `[data-parallax]` binder (ticker lerp) and `heroMarquee()` |
| `assets/js/site.js` | `.hero-marquee` added to `LENS_EXCLUDE` |

Scoped to `index.html`. No other page gains a hero illustration.

## Accepted trade-offs

- The hero is assumed to be `100vh` tall. A viewport short enough for content to push it taller would leave the figure anchored to the bottom with its top below the header line. Accepted so the rule-gap arithmetic stays exact without measuring in JS.
- The hero name no longer magnifies under the text lens (§4).

## Out of scope

- Any change to the illustration's artwork.
- A dark-theme variant — the site has no theme switcher.
- Hero illustrations on other pages.
