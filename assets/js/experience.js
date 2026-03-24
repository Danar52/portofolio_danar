import { supabase } from '../../supabase.js';

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
        return list + `<button class="exp-toggle" onclick="toggleDesc(this)">
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

      // Cards
      let delay = 0.15;
      grid.innerHTML = data.map(e => {
        const tags  = (e.tags || []).map(t => `<span class="exp-tag">${t}</span>`).join('');
        const badge = e.is_active
          ? `<span class="exp-badge aktif"><span class="badge-dot"></span> Aktif</span>`
          : `<span class="exp-badge selesai"><i class="fas fa-check" style="font-size:9px"></i> Selesai</span>`;

        const d = delay; delay += 0.08;
        return `
          <div class="exp-card ${e.is_active ? 'aktif' : ''}" style="animation:cardIn .5s ease ${d}s forwards">
            <div class="exp-card-header">
              <span class="exp-title">${e.job_title}</span>
              ${badge}
            </div>
            <p class="exp-company">
              <i class="fas fa-building"></i>
              ${e.company}
            </p>
            <span class="exp-period">
              <i class="fas fa-calendar-alt"></i>
              ${e.period_start} — ${e.period_end || 'Saat Ini'}
              ${e.duration ? `&nbsp;·&nbsp; ${e.duration}` : ''}
            </span>
            <div class="exp-divider"></div>
            ${renderDesc(e.description)}
            ${tags ? `<div class="exp-tags">${tags}</div>` : ''}
          </div>`;
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