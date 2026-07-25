/* site.js — cursor · menu overlay · page transitions */

;(function () {
  'use strict';

  /* ── CUSTOM CURSOR ──────────────────────────────────────── */
  const dot  = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  let mx = 0, my = 0, rx = 0, ry = 0, raf;
  // Assigned by the lens block below and called from the rAF loop, so the
  // magnifier is driven by the ring's own eased position instead of the raw
  // pointer — the two used to drift apart on every fast move.
  let drawLensFn = null;
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

    // Tells base.css it is safe to hide the native pointer — this block is
    // the only thing that draws a replacement for it.
    document.body.classList.add('has-cursor');

    /* Positioned through transform rather than left/top. Writing left/top every
       frame put both elements through layout on each move; a transform is
       composited, which is what takes the last of the judder out of the
       motion. */
    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
    }, { passive: true });

    let lastT = 0;
    (function loop(now) {
      /* Frame-rate independent easing. A flat per-frame factor makes the ring
         chase at a speed that depends on the display: noticeably laggier on
         60Hz than on 120Hz, and it stutters whenever a frame runs long.
         Converting the factor through the real elapsed time keeps the same
         feel everywhere. */
      const dt = lastT ? Math.min(now - lastT, 50) : 16.67;
      lastT = now;
      const ease = 1 - Math.pow(1 - 0.16, dt / 16.67);

      // Chase whatever a magnetic element (motion.js) is currently pulling
      // toward, so the ring and the element read as one motion; fall back
      // to the raw pointer the rest of the time. Optional chaining because
      // site.js runs before the deferred gsap/motion.js scripts execute.
      const target = window.Motion?.magneticTarget?.();
      const tx = target ? target.x : mx;
      const ty = target ? target.y : my;
      const dx = tx - rx, dy = ty - ry;
      rx += dx * ease;
      ry += dy * ease;

      const place = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;

      // The velocity stretch has to be off while magnifying: the rim is
      // framing a circular clip, and squashing one without the other leaves
      // the glass visibly out of round against its own contents.
      if (cursorReduced || document.body.classList.contains('cur-lens')) {
        ring.style.transform = place;
      } else {
        /* Derived from the same chase-lerp gap already computed above — no
           separate spring simulation. Stretch decays to 0 on its own as
           rx/ry catch up to mx/my, which is what relaxes the ring back to a
           circle without any extra easing code. Squared falloff so slow
           moves stay perfectly round and only a real flick deforms it. */
        const magnitude = Math.hypot(dx, dy);
        const t = Math.min(magnitude / 90, 1);
        const stretch = t * t * 0.3;
        const angle = Math.atan2(dy, dx);
        ring.style.transform =
          `${place} rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.6}) rotate(${-angle}rad)`;
      }

      // Same eased point the ring is drawn at, so the magnified circle sits
      // exactly inside the rim rather than racing ahead of it.
      if (drawLensFn) drawLensFn(rx, ry);

      raf = requestAnimationFrame(loop);
    })(performance.now());

    function addHover(el) {
      el.addEventListener('mouseenter', () => document.body.classList.add('cur-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cur-hover'));
      el.addEventListener('mousedown',  () => document.body.classList.add('cur-click'));
      el.addEventListener('mouseup',    () => document.body.classList.remove('cur-click'));
    }
    document.querySelectorAll('a, button, [role="button"]').forEach(addHover);

    /* ── TEXT LENS MAGNIFY ────────────────────────────────────
       Real magnification (a live clone, not a filter) so hovered
       text reads larger under the ring. Applies to any text on any
       page: the element is resolved from the pointer rather than
       bound ahead of time, so table cells, labels, captions and
       anything Supabase renders later are all covered by the same
       code path.
       Gated on cursorReduced: this is a live pointer-tracking
       transform/clip-path effect, not covered by the reduced-motion
       CSS (which only zeroes animation/transition durations), so it
       must be skipped entirely to honor prefers-reduced-motion.
    ─────────────────────────────────────────────────────────── */
    if (!cursorReduced) {
    /* Screen radius of the magnified disc. Half of .cursor-ring's cur-lens
       size (44px in base.css), so the glass rim frames the magnification
       exactly instead of cropping it or floating outside it. */
    const LENS_R = 22;
    const LENS_SCALE_MAX = 1.18;
    const LENS_SCALE_MIN = 1.04;
    let lensClone = null;
    let lensEl = null;
    // Eased, not snapped: the disc opens and closes rather than popping, and
    // the zoom rides in with it. Both relax back to 0 / MIN on the way out,
    // which is also what tells the loop when the clone can be removed.
    let lensR = 0, lensRTarget = 0;
    let lensScale = LENS_SCALE_MIN;

    /* Everything that decides how a run of text is drawn. The clone is
       reparented to <body>, which breaks every rule selected through an
       ancestor — `.hero-title .hero-line` stops matching, and a 52px heading
       came out at the 16px default, so the "magnifier" was rendering smaller
       text than the page underneath it. Copying the resolved values across
       makes the clone independent of where it hangs in the tree. */
    const LENS_STYLE_PROPS = [
      'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch',
      'font-variation-settings', 'font-feature-settings', 'font-kerning',
      'line-height', 'letter-spacing', 'word-spacing', 'text-transform',
      'text-align', 'text-indent', 'text-decoration', 'text-shadow',
      'white-space', 'word-break', 'overflow-wrap', 'color', 'opacity',
      'direction', 'vertical-align', 'display', 'box-sizing',
      'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      '-webkit-text-fill-color', '-webkit-text-stroke',
    ];

    function copyTextStyles(src, dest, isRoot) {
      const s = getComputedStyle(src);
      let css = '';
      LENS_STYLE_PROPS.forEach(p => {
        const v = s.getPropertyValue(p);
        if (v) css += p + ':' + v + ';';
      });
      /* The root carries the explicit width/height taken from the source
         rect, and those do nothing on an inline box — it would collapse to
         its content and re-wrap differently from the original. */
      if (isRoot && s.display === 'inline') css += 'display:inline-block;';
      dest.style.cssText += css;

      const sk = src.children, dk = dest.children;
      for (let i = 0; i < sk.length && i < dk.length; i++) {
        copyTextStyles(sk[i], dk[i], false);
      }
    }

    function surfaceOf(el) {
      let node = el;
      while (node && node !== document.documentElement) {
        const c = getComputedStyle(node).backgroundColor;
        // Anything with alpha left in it is a real surface; fully transparent
        // means the paint is coming from further up.
        if (c && !/^rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') return c;
        node = node.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor || '#f0f0ef';
    }

    function showLens(el) {
      if (!el.textContent.trim()) return;
      lensRTarget = LENS_R;
      // Re-added here, not only on the first show: leaving an element and
      // coming back to it before the disc has finished shrinking reopens the
      // same clone, and the rim state has to come back with it.
      document.body.classList.add('cur-lens');
      if (lensEl === el) return;
      if (lensClone) lensClone.remove();
      lensClone = el.cloneNode(true);
      lensEl = el;
      lensClone.classList.add('cursor-lens-clone');
      lensClone.setAttribute('aria-hidden', 'true');
      // Anything focusable inside the clone would otherwise land in the tab
      // order twice, reading the same text to a screen reader again.
      lensClone.querySelectorAll('a, button, input, [tabindex]')
        .forEach(n => n.setAttribute('tabindex', '-1'));
      copyTextStyles(el, lensClone, true);
      /* Opaque, or the untouched original shows through the disc underneath
         the enlarged copy and the two sets of glyphs sit on top of each
         other. The colour is read off the nearest ancestor that actually
         paints one, so the patch matches whatever surface the text sits on —
         the page, a card, or the dark panel — rather than assuming --bg.

         backgroundColor, not the background shorthand: the shorthand also
         resets background-clip, which is what gradient-filled text rides on. */
      lensClone.style.backgroundColor = surfaceOf(el);
      document.body.appendChild(lensClone);
    }

    /* Called once per frame from the cursor loop with the ring's own eased
       centre. Geometry: clip-path is resolved in the clone's untransformed
       box, so the on-screen disc measures lensR * lensScale — the radius
       fed to circle() has to be divided back down by the scale, which is
       what the old fixed 20px missed (it drew a 32px disc inside a 20px
       rim). The translate keeps the point under the cursor pinned while
       everything around it grows away from it. */
    function drawLens(cx, cy) {
      if (!lensClone) return;

      lensR += (lensRTarget - lensR) * 0.18;
      const scaleTarget = lensRTarget ? LENS_SCALE_MAX : LENS_SCALE_MIN;
      lensScale += (scaleTarget - lensScale) * 0.14;

      if (!lensRTarget && lensR < 0.4) { hideLens(); return; }

      const r = lensEl.getBoundingClientRect();
      lensClone.style.left = r.left + 'px';
      lensClone.style.top = r.top + 'px';
      lensClone.style.width = r.width + 'px';
      lensClone.style.height = r.height + 'px';

      const px = cx - r.left, py = cy - r.top;
      const tx = -(px * (lensScale - 1));
      const ty = -(py * (lensScale - 1));
      lensClone.style.transform = `translate(${tx}px, ${ty}px) scale(${lensScale})`;
      lensClone.style.clipPath = `circle(${lensR / lensScale}px at ${px}px ${py}px)`;
    }
    drawLensFn = drawLens;

    // Starts the close; the loop removes the clone once the disc has shrunk.
    function closeLens() {
      lensRTarget = 0;
      document.body.classList.remove('cur-lens');
    }

    function hideLens() {
      if (lensClone) { lensClone.remove(); lensClone = null; lensEl = null; }
      lensR = 0; lensRTarget = 0; lensScale = LENS_SCALE_MIN;
      document.body.classList.remove('cur-lens');
    }
    hideLensFn = hideLens;

    /* Panels that are chrome rather than reading material. The nav links stay
       out because they already answer to the magnetic pull — two effects on
       one element fought each other — and the curtain and chat bubble are
       overlays the lens has no business reaching into. */
    const LENS_EXCLUDE = '.nav-overlay, .page-transition, #cb-root, .menu-toggle';

    /* The element that actually owns the text under the pointer, or null.
       Only elements holding a text node of their own qualify, which is what
       keeps this to the innermost span/cell/heading instead of walking up to
       a section wrapper and cloning half the page. */
    function textElementAt(target) {
      if (!(target instanceof Element)) return null;
      if (target.closest(LENS_EXCLUDE)) return null;
      if (/^(HTML|BODY|IMG|SVG|CANVAS|INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return null;
      const hasOwnText = Array.prototype.some.call(
        target.childNodes,
        n => n.nodeType === 3 && n.textContent.trim()
      );
      return hasOwnText ? target : null;
    }

    /* Resolved per pointer move rather than bound per element up front.
       Binding a selector this broad with mouseenter/mouseleave does not work:
       on nested text the child's mouseleave fires while the pointer is still
       inside the parent, and the parent never re-enters, so the lens dies
       mid-sentence. Reading the deepest target off each event sidesteps that,
       and content rendered later needs no rescan — there is nothing bound to
       keep in sync. */
    document.addEventListener('mousemove', e => {
      const el = textElementAt(e.target);
      if (!el) { if (lensEl) closeLens(); return; }
      showLens(el);
    }, { passive: true });

    // No scroll listener either: drawLens re-reads the source rect every
    // frame, so the clone tracks smooth-scrolled content on its own.
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
    /* The links slide in on a filling CSS animation, which keeps ownership of
       `transform` after it ends and beats the inline transform gsap's
       magnetic hover writes. .is-ready (base.css) drops that animation once
       the last link has landed, handing the property over.

       Timings mirror the stylesheet: 0.21s is the last nth-child delay plus
       0.55s of animation on the way in; 0.8s is the panel's own transition on
       the way out — pulling .is-ready any earlier would snap the links back
       to their parked position in full view of the closing panel. */
    const linksList = overlay.querySelector('.nav-links-list');
    let readyTimer;

    const setMenu = open => {
      menuOpen = open;
      toggle.classList.toggle('is-open', open);
      overlay.classList.toggle('is-open', open);
      document.documentElement.classList.toggle('nav-open', open);
      document.body.style.overflow = open ? 'hidden' : '';

      if (!linksList) return;
      clearTimeout(readyTimer);
      if (open) {
        readyTimer = setTimeout(() => linksList.classList.add('is-ready'), 800);
      } else {
        readyTimer = setTimeout(() => {
          linksList.classList.remove('is-ready');
          /* Closing by click never fires mouseleave, so a pulled link keeps
             its inline transform. Left in place it would outrank the slide-in
             animation and the link would simply not animate next time. */
          linksList.querySelectorAll('.nav-link').forEach(link => {
            if (window.gsap) gsap.killTweensOf(link);
            link.style.transform = '';
          });
        }, 850);
      }
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
