/* site.js — cursor · menu overlay · page transitions */

;(function () {
  'use strict';

  /* ── CUSTOM CURSOR ──────────────────────────────────────── */
  const dot  = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  let mx = 0, my = 0, rx = 0, ry = 0, raf;
  // Hoisted out of the reduced-motion-gated lens block below so goTo()
  // (defined later, in the PAGE TRANSITIONS section) can always call it to
  // tear down a stray lens clone before navigating — a no-op when reduced
  // motion is active, since the real hideLens is never assigned then.
  let hideLensFn = () => {};

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

    function addHover(el) {
      el.addEventListener('mouseenter', () => document.body.classList.add('cur-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cur-hover'));
      el.addEventListener('mousedown',  () => document.body.classList.add('cur-click'));
      el.addEventListener('mouseup',    () => document.body.classList.remove('cur-click'));
    }
    document.querySelectorAll('a, button, [role="button"]').forEach(addHover);

    /* ── TEXT LENS MAGNIFY ────────────────────────────────────
       Real magnification (a live clone, not a filter) so hovered
       body copy reads larger under the ring. Scoped to body text
       only — links/buttons already get the magnetic + glass-ring
       treatment and don't need a second effect stacked on top.
       Gated on cursorReduced: this is a live pointer-tracking
       transform/clip-path effect, not covered by the reduced-motion
       CSS (which only zeroes animation/transition durations), so it
       must be skipped entirely to honor prefers-reduced-motion.
    ─────────────────────────────────────────────────────────── */
    if (!cursorReduced) {
    const LENS_SCALE = 1.6;
    const LENS_RADIUS = 20; // half of base .cursor-ring's 40px (base.css)
    let lensClone = null;
    let lensEl = null;

    function positionLens(el) {
      if (!lensClone) return;
      const r = el.getBoundingClientRect();
      lensClone.style.left = r.left + 'px';
      lensClone.style.top = r.top + 'px';
      lensClone.style.width = r.width + 'px';
      lensClone.style.height = r.height + 'px';
    }

    function showLens(el) {
      if (!el.textContent.trim()) return;
      hideLens();
      lensClone = el.cloneNode(true);
      lensEl = el;
      lensClone.classList.add('cursor-lens-clone');
      lensClone.setAttribute('aria-hidden', 'true');
      document.body.appendChild(lensClone);
      positionLens(el);
    }

    function updateLens(el, e) {
      if (!lensClone) return;
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const tx = -(px * (LENS_SCALE - 1));
      const ty = -(py * (LENS_SCALE - 1));
      lensClone.style.transform = `translate(${tx}px, ${ty}px) scale(${LENS_SCALE})`;
      lensClone.style.clipPath = `circle(${LENS_RADIUS}px at ${px}px ${py}px)`;
    }

    function hideLens() {
      if (lensClone) { lensClone.remove(); lensClone = null; lensEl = null; }
    }
    hideLensFn = hideLens;

    const lensBound = new WeakSet();
    const LENS_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6';

    function attachLens(el) {
      if (lensBound.has(el)) return;
      lensBound.add(el);
      el.addEventListener('mouseenter', () => showLens(el));
      el.addEventListener('mousemove', e => updateLens(el, e));
      el.addEventListener('mouseleave', hideLens);
    }

    function scanLens(root) {
      if (!(root instanceof Element)) return;
      if (root.matches(LENS_SELECTOR)) attachLens(root);
      root.querySelectorAll(LENS_SELECTOR).forEach(attachLens);
    }

    scanLens(document.body);
    document.addEventListener('scroll', () => { if (lensEl) positionLens(lensEl); }, { passive: true });

    /* Supabase-rendered content (portfolio cards, bios, list items, etc.)
       arrives after this first scan, so watch for it the same way
       motion.js already watches for late [data-reveal] nodes. */
    const lensObserver = new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(node => scanLens(node));
      });
    });
    lensObserver.observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });
  }

  /* ── MENU OVERLAY ───────────────────────────────────────── */
  const toggle  = document.getElementById('menuToggle');
  const overlay = document.getElementById('navOverlay');
  let menuOpen = false;

  if (toggle && overlay) {
    /* Built here rather than repeated in every page's markup: both are purely
       decorative, and neither is reachable without the JS that opens the
       panel in the first place. */
    /* The panel needs to scroll when the links do not fit, but any overflow
       on it clips the curved edge sitting outside its box. So the scrolling
       moves to a wrapper around the existing content, and the curve stays a
       direct child of the unclipped panel. */
    const inner = document.createElement('div');
    inner.className = 'nav-inner';
    while (overlay.firstChild) inner.appendChild(overlay.firstChild);
    overlay.appendChild(inner);

    const curve = document.createElement('div');
    curve.className = 'nav-curve';
    overlay.appendChild(curve);

    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    document.body.appendChild(backdrop);

    // Mark the current page so its dot is lit before the cursor moves.
    const here = location.pathname.split('/').pop() || 'index.html';
    overlay.querySelectorAll('.nav-link').forEach(link => {
      const target = link.getAttribute('href');
      if (target === here || (here === 'index.html' && target === 'index.html')) {
        link.setAttribute('aria-current', 'page');
      }
    });

    // The chat widget is fixed at a higher z-index than the overlay, so it
    // floats over the open menu and lands on the social links. Flag the state
    // on <html> and let CSS take the widget out of the way.
    const setMenu = open => {
      menuOpen = open;
      toggle.classList.toggle('is-open', open);
      overlay.classList.toggle('is-open', open);
      document.documentElement.classList.toggle('nav-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };

    toggle.addEventListener('click', () => setMenu(!menuOpen));

    overlay.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => setMenu(false));
    });

    // Tapping the dimmed page closes the panel.
    backdrop.addEventListener('click', () => setMenu(false));

    /* Anywhere outside the panel closes it too. The backdrop alone is not
       enough: it sits below the header, and it is hidden entirely on phones
       where the panel is full width. */
    document.addEventListener('click', e => {
      if (!menuOpen) return;
      if (overlay.contains(e.target) || toggle.contains(e.target)) return;
      setMenu(false);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menuOpen) toggle.click();
    });
  }

  /* ── PAGE TRANSITIONS ─────────────────────────────────────
     The curtain rises on click and names where you are going.
     It is never shown on arrival: covering a freshly loaded page
     would delay LCP on every navigation.
  ─────────────────────────────────────────────────────────── */
  const curtain = document.getElementById('pageTransition');
  const ptLabel = document.getElementById('ptLabel');
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Must outlast the CSS transition (0.78s). At 760ms the navigation used to
     start 20ms before the panel finished arriving, so the browser began
     tearing down the document mid-animation — a visible hitch right at the
     end of every transition. */
  const CURTAIN_MS = 860;

  /* Lenis drives its rAF loop through gsap.ticker and keeps interpolating
     while the panel moves. Nothing is scrollable behind a full-screen cover,
     so stop it for the duration and give the frames back. */
  function pauseScroll(stop) {
    const lenis = window.Motion && window.Motion.lenis && window.Motion.lenis();
    if (!lenis) return;
    stop ? lenis.stop() : lenis.start();
  }

  const PAGE_NAMES = {
    'index.html':         'Home',
    'profil.html':        'About',
    'skills.html':        'Skills',
    'experience.html':    'Experience',
    'portfolio.html':     'Portfolio',
    'portfolio-detail.html': 'Project',
    'certification.html': 'Certification',
    'event.html':         'Events',
    'contact.html':       'Contact',
  };

  function labelFor(href, linkEl) {
    const file = href.split('/').pop().split('?')[0].split('#')[0];
    if (PAGE_NAMES[file]) return PAGE_NAMES[file];
    if (file === '' ) return PAGE_NAMES['index.html'];
    // Fall back to the link's own text so a new page still gets a name
    // without anyone remembering to update the map.
    return (linkEl && linkEl.textContent.trim().replace(/\s+/g, ' ')) || '';
  }

  function goTo(href, linkEl) {
    // Tear down any active lens clone before anything else: a click on an
    // inline <a> inside a hovered <p> never fires mouseleave (the pointer
    // stays over the <p>), so without this the clone (z-index 99997) would
    // sit visible on top of the curtain (z-index 99000) for the transition.
    hideLensFn();
    if (!curtain || REDUCED) { window.location.href = href; return; }
    const name = labelFor(href, linkEl);
    if (ptLabel) ptLabel.innerHTML = name + '<i>.</i>';
    // Tells the next page it was reached by a click, so it knows to reveal
    // from under the panel instead of cutting straight to content.
    try { sessionStorage.setItem('pt-nav', name); } catch (e) {}
    pauseScroll(true);
    curtain.classList.add('pt-in');
    // Mirrored onto <html> alongside nav-open/pt-arrive so the cursor ring's
    // dark-surface CSS can select against it without a new mechanism.
    document.documentElement.classList.add('pt-in');
    setTimeout(() => { window.location.href = href; }, CURTAIN_MS);
  }

  /* Arrival: the inline <head> script put the panel over the page and CSS is
     already animating it away. All that is left is to fill in the label and
     tidy up once the animation ends — none of which the motion waits on. */
  if (curtain && document.documentElement.classList.contains('pt-arrive')) {
    if (ptLabel && window.__ptLabel) {
      ptLabel.innerHTML = window.__ptLabel + '<i>.</i>';
    }
    // animationend bubbles, so check the target: any animation added to a
    // child later would otherwise tear the panel down early.
    curtain.addEventListener('animationend', function onDone(e) {
      if (e.target !== curtain || e.animationName !== 'ptReveal') return;
      curtain.removeEventListener('animationend', onDone);
      document.documentElement.classList.remove('pt-arrive');
      pauseScroll(false);
    });
  }

  /* Warm the destination on hover. Most of the dead time on arrival is the
     browser fetching and parsing the next document while the panel holds
     still; by then it is usually already in the cache. */
  const prefetched = new Set();
  function prefetch(href) {
    if (!href || prefetched.has(href)) return;
    prefetched.add(href);
    const l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = href;
    document.head.appendChild(l);
  }

  /* Restoring from bfcache replays the DOM as it was left — mid-navigation,
     that means the curtain is still covering the page. Clear it. */
  if (curtain) {
    window.addEventListener('pageshow', e => {
      if (!e.persisted) return;
      curtain.classList.remove('pt-in');
      document.documentElement.classList.remove('pt-in');
      document.documentElement.classList.remove('pt-arrive');
    });
  }

  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto') ||
        href.startsWith('tel') || href.startsWith('http') ||
        a.target === '_blank') return;
    if (href.endsWith('.html') || href === '/' || href.endsWith('/')) {
      a.addEventListener('mouseenter', () => prefetch(href), { once: true });
      a.addEventListener('touchstart',  () => prefetch(href), { once: true, passive: true });
      a.addEventListener('click', e => {
        // Let the browser handle open-in-new-tab / new-window itself.
        //
        // `e.button != null` rather than `e.button !== 0`: a click that
        // carries no button property at all — which some touch and
        // assistive-tech paths produce — would fail the strict test and
        // fall straight through to a plain navigation with no transition.
        if (e.defaultPrevented) return;
        if (e.button != null && e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        goTo(href, a);
      });
    }
  });

  /* ── CUSTOM CONTEXT MENU ──────────────────────────────────
     Pointer devices only. It replaces right-click, which has no equivalent
     on a phone — there the same event comes from a long press, and taking
     it over costs the visitor text selection, copy, and open-in-new-tab
     for no gain. Left native on touch.
  ─────────────────────────────────────────────────────────── */
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (FINE_POINTER) buildContextMenu();

  function buildContextMenu() {
  const CM_ITEMS = [
    { icon: 'fa-arrow-left',      label: 'Kembali',      action: () => history.back() },
    { icon: 'fa-rotate-right',    label: 'Muat Ulang',   action: () => location.reload() },
    { icon: 'fa-link',            label: 'Salin Link',   action: copyLink },
    { divider: true },
    { icon: 'fa-house',           label: 'Home',         action: () => goTo('index.html') },
    { icon: 'fa-briefcase',       label: 'Portfolio',    action: () => goTo('portfolio.html') },
    { icon: 'fa-envelope',        label: 'Kontak Gw',    action: () => { location.href = 'mailto:edanararrasyid@gmail.com'; } },
  ];

  function copyLink(menuEl) {
    navigator.clipboard?.writeText(location.href).then(() => {
      const item = menuEl.querySelector('[data-copy] span');
      if (item) { item.textContent = 'Tersalin!'; }
      setTimeout(hideMenu, 600);
    }).catch(hideMenu);
  }

  const cm = document.createElement('div');
  cm.className = 'ctx-menu';
  cm.setAttribute('role', 'menu');
  cm.innerHTML = CM_ITEMS.map(it => it.divider
    ? '<div class="ctx-divider"></div>'
    : `<button class="ctx-item" role="menuitem" ${it.label === 'Salin Link' ? 'data-copy' : ''}>
         <i class="fas ${it.icon}"></i><span>${it.label}</span>
       </button>`
  ).join('');
  document.body.appendChild(cm);

  const cmButtons = cm.querySelectorAll('.ctx-item');
  let btnIdx = 0;
  CM_ITEMS.forEach(it => {
    if (it.divider) return;
    const btn = cmButtons[btnIdx++];
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (it.label === 'Salin Link') { it.action(cm); return; }
      hideMenu();
      it.action();
    });
  });

  function showMenu(x, y) {
    cm.classList.add('open');
    const { offsetWidth: w, offsetHeight: h } = cm;
    cm.style.left = Math.min(x, window.innerWidth  - w - 12) + 'px';
    cm.style.top  = Math.min(y, window.innerHeight - h - 12) + 'px';
  }
  function hideMenu() { cm.classList.remove('open'); }

  let cmShownAt = 0;
  document.addEventListener('contextmenu', e => {
    e.preventDefault();
    cmShownAt = Date.now();
    showMenu(e.clientX, e.clientY);
  });
  // macOS: Ctrl+klik nge-fire contextmenu + click sekaligus →
  // click susulan itu jangan langsung nutup menu yang baru kebuka
  document.addEventListener('click', () => {
    if (Date.now() - cmShownAt < 250) return;
    hideMenu();
  });
  document.addEventListener('scroll', hideMenu, { passive: true });
  window.addEventListener('resize',   hideMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideMenu(); });
  }

  /* ── DETERRENT — blokir shortcut devtools/view-source ─────
     Catatan: ini cuma penghalang buat user awam. DevTools tetap
     bisa dibuka lewat menu bar browser — tak ada cara memblokir
     total dari JavaScript. ─────────────────────────────────── */
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    const combo = e.metaKey || e.ctrlKey;
    if (
      e.key === 'F12' ||
      (combo && e.altKey && (k === 'i' || k === 'j' || k === 'c')) || // Cmd/Ctrl+Alt+I/J/C
      (combo && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) || // Ctrl+Shift+I/J/C
      (combo && k === 'u')                                              // view-source
    ) {
      e.preventDefault();
    }
  });

})();
