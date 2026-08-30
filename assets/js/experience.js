import { supabase } from '../../supabase.js?v=a77a873f';
import { trackVisit } from './analytics-track.js';
trackVisit();

    const isMobile = () => window.innerWidth <= 768;

    function renderDesc(description) {
      if (!description) return '';
      const points = description
        .split(/\s*-\s+/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
      if (points.length <= 1) return `<p class="exp-desc">${description}</p>`;

      const listClass = isMobile() && points.length > 4 ? 'exp-desc-list collapsed' : 'exp-desc-list';
      const list = `<ul class="${listClass}">${points.map(p => `<li>${p}</li>`).join('')}</ul>`;

      // Tambah toggle button kalau di mobile dan lebih dari 4 poin
      if (isMobile() && points.length > 4) {
        return list + `<button class="exp-toggle" type="button">
          <i class="fas fa-chevron-down"></i> Lihat selengkapnya
        </button>`;
      }

      return list;
    }

    async function loadExperience() {
      const grid = document.getElementById('expGrid');

      const { data, error } = await supabase
        .from('experience')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error || !data || data.length === 0) {
        grid.innerHTML = `<div class="state-box" style="grid-column:1/-1">
          <i class="fas fa-triangle-exclamation"></i>
          <p>Gagal memuat data experience.</p>
        </div>`;
        return;
      }

      // Stats
      const statsEl = document.getElementById('expStats');
      statsEl.style.display = 'flex';
      document.getElementById('statTotal').textContent = data.length;
      document.getElementById('statAktif').textContent = data.filter(e => e.is_active).length;

      const years = data
        .map(e => parseInt(e.period_start?.match(/\d{4}/)?.[0]))
        .filter(y => !isNaN(y));
      if (years.length) {
        const diff = new Date().getFullYear() - Math.min(...years);
        document.getElementById('statTahun').textContent = diff > 0 ? `${diff}+` : '< 1';
      }

      // Rows — editorial: periode+status kiri, detail kanan
      let delay = 0.15;
      grid.innerHTML = data.map(e => {
        const tags  = (e.tags || []).map(t => `<span class="exp-tag">${t}</span>`).join('');
        const badge = e.is_active
          ? `<span class="exp-badge aktif"><span class="badge-dot"></span>Aktif</span>`
          : `<span class="exp-badge selesai">Selesai</span>`;

        const d = delay; delay += 0.08;
        return `
          <section class="exp-row" style="animation:cardIn .5s ease ${d}s forwards">
            <div class="exp-row-side">
              <span class="exp-period">${e.period_start} — ${e.period_end || 'Saat Ini'}</span>
              ${e.duration ? `<span class="exp-duration">${e.duration}</span>` : ''}
              ${badge}
            </div>
            <div class="exp-row-body">
              <h2 class="exp-title">${e.job_title}</h2>
              <p class="exp-company">${e.company}</p>
              ${renderDesc(e.description)}
              ${tags ? `<div class="exp-tags">${tags}</div>` : ''}
            </div>
          </section>`;
      }).join('');
    }

    loadExperience();

// Toggle expand/collapse deskripsi di mobile
  function toggleDesc(btn) {
    const list = btn.previousElementSibling;
    const isCollapsed = list.classList.contains('collapsed');
    if (isCollapsed) {
      list.classList.remove('collapsed');
      btn.classList.add('expanded');
      btn.innerHTML = '<i class="fas fa-chevron-down"></i> Tampilkan lebih sedikit';
    } else {
      list.classList.add('collapsed');
      btn.classList.remove('expanded');
      btn.innerHTML = '<i class="fas fa-chevron-down"></i> Lihat selengkapnya';
    }
  }

  // Event delegation — script type="module" scope, inline onclick gak bisa akses function di sini
  document.getElementById('expGrid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.exp-toggle');
    if (btn) toggleDesc(btn);
  });

(function() {
    const hamburger = document.getElementById('hamburger');
    const sidebar   = document.getElementById('sidebar');
    const backdrop  = document.getElementById('nav-backdrop');
    if (!hamburger || !sidebar || !backdrop) return;

    function openMenu() {
      sidebar.classList.add('open');
      backdrop.classList.add('visible');
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      sidebar.classList.remove('open');
      backdrop.classList.remove('visible');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', () => {
      sidebar.classList.contains('open') ? closeMenu() : openMenu();
    });

    backdrop.addEventListener('click', closeMenu);

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeMenu();
    });
  })();