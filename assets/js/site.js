/* site.js — cursor · menu overlay · page transitions */

;(function () {
  'use strict';

  /* ── CUSTOM CURSOR ──────────────────────────────────────── */
  const dot  = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  let mx = 0, my = 0, rx = 0, ry = 0, raf;

  if (dot && ring && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });

    (function loop() {
      rx += (mx - rx) * 0.11;
      ry += (my - ry) * 0.11;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      raf = requestAnimationFrame(loop);
    })();

    function addHover(el) {
      el.addEventListener('mouseenter', () => document.body.classList.add('cur-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cur-hover'));
      el.addEventListener('mousedown',  () => document.body.classList.add('cur-click'));
      el.addEventListener('mouseup',    () => document.body.classList.remove('cur-click'));
    }
    document.querySelectorAll('a, button, [role="button"]').forEach(addHover);

    document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });
  }

  /* ── MENU OVERLAY ───────────────────────────────────────── */
  const toggle  = document.getElementById('menuToggle');
  const overlay = document.getElementById('navOverlay');
  let menuOpen = false;

  if (toggle && overlay) {
    toggle.addEventListener('click', () => {
      menuOpen = !menuOpen;
      toggle.classList.toggle('is-open', menuOpen);
      overlay.classList.toggle('is-open', menuOpen);
      document.body.style.overflow = menuOpen ? 'hidden' : '';
    });

    overlay.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        menuOpen = false;
        toggle.classList.remove('is-open');
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
      });
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
    if (!curtain || REDUCED) { window.location.href = href; return; }
    const name = labelFor(href, linkEl);
    if (ptLabel) ptLabel.innerHTML = name + '<i>.</i>';
    // Tells the next page it was reached by a click, so it knows to reveal
    // from under the panel instead of cutting straight to content.
    try { sessionStorage.setItem('pt-nav', name); } catch (e) {}
    pauseScroll(true);
    curtain.classList.remove('pt-out');
    curtain.classList.add('pt-in');
    setTimeout(() => { window.location.href = href; }, CURTAIN_MS);
  }

  /* Arrival: the inline <head> script has already put the panel over the page
     when this load came from a click. Slide it away as one continuous move. */
  if (curtain && document.documentElement.classList.contains('pt-arrive')) {
    if (ptLabel && window.__ptLabel) {
      ptLabel.innerHTML = window.__ptLabel + '<i>.</i>';
    }
    // Two frames, not one. The first still shares the frame with initial
    // layout and script; starting the slide there means the animation's
    // opening frames compete with page setup, which is the stutter. By the
    // second frame the first paint is done.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      curtain.classList.add('pt-out');
      setTimeout(() => {
        document.documentElement.classList.remove('pt-arrive');
        curtain.classList.remove('pt-out');
        pauseScroll(false);
      }, 1000);   // clears the 0.85s slide plus the delayed fade
    }));
  }

  /* Restoring from bfcache replays the DOM as it was left — mid-navigation,
     that means the curtain is still covering the page. Clear it. */
  if (curtain) {
    window.addEventListener('pageshow', e => {
      if (!e.persisted) return;
      curtain.classList.remove('pt-in', 'pt-out');
    });
  }

  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto') ||
        href.startsWith('tel') || href.startsWith('http') ||
        a.target === '_blank') return;
    if (href.endsWith('.html') || href === '/' || href.endsWith('/')) {
      a.addEventListener('click', e => {
        // Let the browser handle open-in-new-tab / new-window itself.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        goTo(href, a);
      });
    }
  });

  /* ── CUSTOM CONTEXT MENU ────────────────────────────────── */
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
