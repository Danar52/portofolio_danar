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

  /* ── PAGE TRANSITIONS ───────────────────────────────────── */
  const curtain = document.getElementById('pageTransition');

  function goTo(href) {
    if (!curtain) { window.location.href = href; return; }
    curtain.classList.remove('pt-out');
    curtain.classList.add('pt-in');
    setTimeout(() => { window.location.href = href; }, 580);
  }

  if (curtain) {
    window.addEventListener('load', () => {
      curtain.classList.remove('pt-in');
      void curtain.offsetWidth;
      curtain.classList.add('pt-out');
      setTimeout(() => curtain.classList.remove('pt-out'), 650);
    });
  }

  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto') ||
        href.startsWith('tel') || href.startsWith('http') ||
        a.target === '_blank') return;
    if (href.endsWith('.html') || href === '/' || href.endsWith('/')) {
      a.addEventListener('click', e => { e.preventDefault(); goTo(href); });
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
