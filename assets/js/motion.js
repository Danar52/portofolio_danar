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

  /* ── BOOT ───────────────────────────────────────────────────
     Content from Supabase arrives after first paint, so watch for
     late [data-reveal] nodes instead of binding only once.
  ─────────────────────────────────────────────────────────── */
  function init() {
    heroLines();
    bindReveals(null, true);
    magnetic();

    const mo = new MutationObserver(muts => {
      const added = muts.some(m => m.addedNodes.length);
      if (added) bindReveals();
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
  };

})();
