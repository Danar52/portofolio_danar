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

})();
