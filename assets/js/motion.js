/* ═══════════════════════════════════════════════════════════════
   MOTION.JS — smooth scroll · scroll reveal · magnetic hover

   Loaded after GSAP + Lenis (see each page's <head>).
   Every feature degrades: if a library is missing the page still
   works, and if the OS asks for reduced motion nothing animates.
═══════════════════════════════════════════════════════════════ */

;(function () {
  'use strict';

  const root       = document.documentElement;
  const reduced    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover   = window.matchMedia('(hover: hover)').matches;
  const hasGsap    = typeof window.gsap !== 'undefined';
  const hasLenis   = typeof window.Lenis !== 'undefined';

  /* Reduced motion: reveal everything up front and stop here. */
  if (reduced) {
    root.classList.add('no-motion');
    return;
  }

  /* ── SMOOTH SCROLL (Lenis) ──────────────────────────────────
     Lenis keeps native scrollbar + native anchor semantics, so
     crawlers and keyboard users are unaffected — unlike a
     transform-based hijack.
  ─────────────────────────────────────────────────────────── */
  let lenis = null;

  if (hasLenis) {
    lenis = new Lenis({
      duration: 1.05,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Native scrolling on touch — smooth-scroll libs wreck INP there.
      smoothTouch: false,
    });

    if (hasGsap) {
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }

    /* In-page anchors go through Lenis so they ease instead of jump. */
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      a.addEventListener('click', e => {
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80 });
      });
    });

    /* The nav overlay locks body scroll — Lenis needs telling too. */
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        // site.js has already flipped the class by the time this fires.
        menuToggle.classList.contains('is-open') ? lenis.stop() : lenis.start();
      });
      document.querySelectorAll('.nav-overlay .nav-link')
        .forEach(l => l.addEventListener('click', () => lenis.start()));
    }
  }

  /* ── SCROLL REVEAL ──────────────────────────────────────────
     Opt in with data-reveal on any element. Optional data-reveal-delay
     (seconds) staggers siblings.

     A position sweep rather than IntersectionObserver. IO only reports
     *changes* in intersection, so an element that goes from below the
     viewport to above it in one jump — anchor link, restored scroll
     position, Lenis scrollTo — never fires and stays at opacity 0
     permanently. The sweep tests absolute position instead, so
     "already passed" reveals just like "now entering".

     ScrollTrigger is also unsuitable here: teaser content arrives from
     Supabase after first paint, so the page is short when reveals are
     first bound and a trigger created then fires the footer instantly.
  ─────────────────────────────────────────────────────────── */
  const pending = new Set();
  let sweepQueued = false;

  function sweep() {
    sweepQueued = false;
    const limit = window.innerHeight * 0.88;
    pending.forEach(el => {
      const r = el.getBoundingClientRect();
      // Entering from below, or already scrolled past above.
      if (r.top < limit || r.bottom < 0) {
        el.classList.add('is-revealed');
        pending.delete(el);
      }
    });
  }

  function queueSweep() {
    // rAF never fires while the tab is hidden, and scroll events still can
    // (restored position, programmatic scrollTo) — sweep inline in that case.
    if (document.hidden) { sweep(); return; }
    if (sweepQueued) return;
    sweepQueued = true;
    requestAnimationFrame(sweep);
  }

  window.addEventListener('scroll', queueSweep, { passive: true });
  window.addEventListener('resize', queueSweep, { passive: true });

  function bindReveals(scope, immediate) {
    const els = (scope || document).querySelectorAll('[data-reveal]:not([data-reveal-bound])');
    els.forEach(el => {
      el.setAttribute('data-reveal-bound', '');
      const delay = parseFloat(el.dataset.revealDelay || 0);
      if (delay) el.style.transitionDelay = delay + 's';
      pending.add(el);
    });
    if (!els.length) return;

    // The first pass runs synchronously: rAF is paused in a background tab, so
    // a queued one would leave the page blank until it gains focus.
    //
    // Later passes come from the MutationObserver, which fires repeatedly while
    // Supabase content renders. Sweeping synchronously there forces a layout on
    // every batch — right when the page-transition reveal is animating, which
    // is exactly what makes it stutter. Queue those instead.
    if (immediate) sweep(); else queueSweep();
  }

  /* ── HERO LINE MASK ─────────────────────────────────────────
     Wrap each .hero-line in an overflow-hidden mask and slide the
     line up from behind it. Purely visual — the DOM text and the
     <h1> structure are untouched, so SEO and a11y are unaffected.
  ─────────────────────────────────────────────────────────── */
  function heroLines() {
    const lines = document.querySelectorAll('.hero-name .hero-line');
    if (!lines.length || !hasGsap) return;

    lines.forEach(line => {
      const mask = document.createElement('span');
      mask.className = 'line-mask';
      mask.setAttribute('aria-hidden', 'false');
      line.parentNode.insertBefore(mask, line);
      mask.appendChild(line);
      // The CSS keyframe fade is replaced by the GSAP tween below.
      line.style.animation = 'none';
      line.style.opacity = '1';
    });

    // y:0 is explicit on purpose. The CSS start state is
    // translateY(32px); without resetting y, GSAP adopts that as the
    // element's y and only tweens yPercent, leaving a permanent 32px
    // offset once the tween lands.
    gsap.fromTo(lines,
      { yPercent: 110, y: 0 },
      {
        yPercent: 0,
        y: 0,
        duration: 1,
        ease: 'power4.out',
        stagger: 0.09,
        delay: 0.15,
      }
    );
  }

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
  // Kept alongside the point so the target can be invalidated when the element
  // it was measured from is no longer the one under the pointer. See the
  // guards below the binder.
  let magneticEl = null;
  const magneticBound = new WeakSet();

  /* Per-element defaults, so the navigation can be tuned without an attribute
     repeated across nine HTML files. data-magnetic still wins over both.

     The two nav cases pull differently for a reason: the toggle is a compact
     control that can afford a firm, springy grab, while a nav link is a wide
     row sitting close to its neighbours — the same travel there reads as the
     list wobbling, so it is pulled softer and kept on a short vertical leash. */
  const MAGNETIC_TUNING = [
    { sel: '.menu-toggle', strength: 0.5,  maxX: 12, maxY: 10 },
    { sel: '.nav-link',    strength: 0.28, maxX: 16, maxY: 7  },
  ];

  function magnetic() {
    if (!canHover || !hasGsap) return;

    document.querySelectorAll('a, button, [role="button"]').forEach(el => {
      if (magneticBound.has(el)) return;
      magneticBound.add(el);
      const tune = MAGNETIC_TUNING.find(t => el.matches(t.sel)) || {};
      const strength = parseFloat(el.dataset.magnetic) || tune.strength || 0.35;
      const maxX = tune.maxX || 15;
      const maxY = tune.maxY || 15;

      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const rawX = (e.clientX - (r.left + r.width  / 2)) * strength;
        const rawY = (e.clientY - (r.top  + r.height / 2)) * strength;
        const x = Math.max(-maxX, Math.min(maxX, rawX));
        const y = Math.max(-maxY, Math.min(maxY, rawY));
        gsap.to(el, { x, y, duration: 0.6, ease: 'power3.out' });
        /* Where the cursor ring should sit while this element is pulled.
           Snapping it to the element's centre only reads as "locked onto the
           control" while the control is small enough for its centre to be
           near the pointer. A nav link is a full-width row, and locking there
           parked the ring in the middle of the panel while the pointer was
           off at the edge — it stopped following the cursor entirely. Wide
           elements therefore keep the pointer and take only the same drift
           the element itself is taking. */
        const compact = r.width <= 90 && r.height <= 90;
        magneticTarget = compact
          ? { x: r.left + r.width / 2 + x, y: r.top + r.height / 2 + y }
          : { x: e.clientX + x, y: e.clientY + y };
        magneticEl = el;
      });

      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
        if (magneticEl === el) clearMagnetic();
      });
    });
  }

  function clearMagnetic() {
    magneticTarget = null;
    magneticEl = null;
  }

  /* mouseleave is not a reliable end to the pull. It never fires when the
     element is removed or re-rendered under a stationary pointer (Supabase
     repaints whole lists), and it does not fire on scroll at all — yet the
     target is an absolute viewport point captured at hover time, so the
     moment the page scrolls it describes a place the element has left. The
     cursor ring chases that point and gets stranded there, once seen 600px
     below the fold while the pointer sat mid-page.

     Both guards close that: any pointer movement outside the pulled element
     drops the target, and so does a scroll. The next mousemove re-establishes
     it immediately if the pointer really is still over the element. */
  if (canHover) {
    document.addEventListener('mousemove', e => {
      if (!magneticEl) return;
      if (!magneticEl.isConnected || !magneticEl.contains(e.target)) clearMagnetic();
    }, { passive: true, capture: true });

    window.addEventListener('scroll', () => {
      if (magneticEl) clearMagnetic();
    }, { passive: true });
  }

  /* ── POINTER PARALLAX ───────────────────────────────────────
     Background drift, not a magnetic grab: the element leans a few
     pixels toward the pointer's position in the viewport as a whole,
     rather than toward a point inside its own box.

     Written to custom properties instead of `transform` on purpose —
     the elements this runs on already carry a transform of their own
     (the hero portrait is centred with translateX(-50%)), and writing
     the whole property from here would wipe it. The stylesheet decides
     how --px/--py are composed; this only supplies the numbers.

     Travel is capped rather than scaled to the viewport: at these
     amplitudes the point is a hint of depth, and a cap keeps the
     figure from wandering on a very wide screen.
  ─────────────────────────────────────────────────────────── */
  const PARALLAX_MAX_X = 12;
  const PARALLAX_MAX_Y = 8;
  const parallaxBound = new WeakSet();
  const parallaxEls = [];
  // Target (written by the pointer) and current (eased toward it on the
  // ticker), both normalised to -1..1 across the viewport.
  let parallaxTX = 0, parallaxTY = 0, parallaxCX = 0, parallaxCY = 0;

  function parallax() {
    if (!canHover || !hasGsap) return;

    document.querySelectorAll('[data-parallax]').forEach(el => {
      if (parallaxBound.has(el)) return;
      parallaxBound.add(el);
      parallaxEls.push(el);
    });

    if (!parallaxEls.length || parallax.listening) return;
    parallax.listening = true;

    /* One document-level listener driving every parallax element: the input is
       the pointer's position in the viewport, which is the same number for all
       of them. The bound elements live in an array so the hot path never
       touches the DOM to find them again. */
    document.addEventListener('mousemove', e => {
      parallaxTX = (e.clientX / window.innerWidth) * 2 - 1;
      parallaxTY = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    /* Eased on the ticker rather than by starting a tween per mousemove.
       Firing gsap.to() on every pointer event means each new tween restarts
       its own ease from wherever the last one had got to, and a fast move
       queues dozens of them — the drift arrives in steps instead of gliding.
       One value, one lerp, one write per frame is both smoother and cheaper.

       The factor is normalised against real elapsed time so the glide takes
       the same wall-clock time on a 60Hz and a 120Hz display. */
    gsap.ticker.add((time, deltaTime) => {
      const ease = 1 - Math.pow(1 - 0.08, (deltaTime || 16.67) / 16.67);
      parallaxCX += (parallaxTX - parallaxCX) * ease;
      parallaxCY += (parallaxTY - parallaxCY) * ease;

      for (let i = parallaxEls.length - 1; i >= 0; i--) {
        const el = parallaxEls[i];
        // Elements can be replaced wholesale by a Supabase re-render; drop
        // them here rather than writing properties nobody will read.
        if (!el.isConnected) { parallaxEls.splice(i, 1); continue; }

        // Depth is a fraction of the cap, so it reads the way the magnetic
        // strengths above do: 0.02 is full travel, lower is subtler.
        const scale = Math.min((parseFloat(el.dataset.parallax) || 0.02) / 0.02, 1);
        el.style.setProperty('--px', (parallaxCX * PARALLAX_MAX_X * scale).toFixed(2) + 'px');
        el.style.setProperty('--py', (parallaxCY * PARALLAX_MAX_Y * scale).toFixed(2) + 'px');
      }
    });
  }

  /* ── HERO NAME MARQUEE ──────────────────────────────────────
     The name loops horizontally in front of the illustration, and
     scrolling drives it: down speeds it up, up runs it backwards.

     The track holds four identical copies, so shifting it by exactly
     one quarter of its own width lands the next copy precisely where
     the last one was — the seam is never visible and the tween can
     simply repeat.
  ─────────────────────────────────────────────────────────── */
  function heroMarquee() {
    const track = document.getElementById('heroMarqueeTrack');
    if (!track || !hasGsap) return;

    const tween = gsap.to(track, {
      xPercent: -25,
      duration: 26,
      ease: 'none',
      repeat: -1,
    });

    // Idle speed. Scroll pushes this away from 1 — negative runs the loop
    // backwards, which is what makes scrolling up reverse the name.
    let scale = 1;

    function push(velocity) {
      // Clamped: a flick of the wheel should lean the marquee, not fling it
      // into an unreadable blur.
      scale = Math.max(-8, Math.min(8, 1 + velocity * 0.35));
    }

    if (lenis) {
      lenis.on('scroll', ({ velocity }) => push(velocity));
    } else {
      // No Lenis: derive the same signal from raw scroll position.
      let last = window.scrollY;
      window.addEventListener('scroll', () => {
        const now = window.scrollY;
        push((now - last) * 0.5);
        last = now;
      }, { passive: true });
    }

    /* Decays back to the idle speed on its own, so the marquee settles
       instead of holding whatever the last scroll frame left behind. */
    gsap.ticker.add((time, deltaTime) => {
      const ease = 1 - Math.pow(1 - 0.06, (deltaTime || 16.67) / 16.67);
      scale += (1 - scale) * ease;
      tween.timeScale(scale);
    });
  }

  /* ── BOOT ───────────────────────────────────────────────────
     Content from Supabase arrives after first paint, so watch for
     late [data-reveal] nodes instead of binding only once.
  ─────────────────────────────────────────────────────────── */
  function init() {
    heroLines();
    bindReveals(null, true);
    magnetic();
    parallax();
    heroMarquee();

    const mo = new MutationObserver(muts => {
      const added = muts.some(m => m.addedNodes.length);
      if (added) { bindReveals(); magnetic(); }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.Motion = {
    refresh: bindReveals,
    lenis: () => lenis,
    magneticTarget: () => magneticTarget,
  };

})();
