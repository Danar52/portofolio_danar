import { supabase } from '../../supabase.js';

    const typeLabel = { org: 'Organisasi', event: 'Event', comp: 'Kompetisi' };
    const typeBadge = { org: 'badge-org',  event: 'badge-event', comp: 'badge-comp' };
    const typeIcon  = { org: 'fas fa-users', event: 'fas fa-calendar-check', comp: 'fas fa-trophy' };

    let allData = [];

    async function loadEvents() {
      const grid = document.getElementById('eventGrid');
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('sort_order');

      if (error || !data || data.length === 0) {
        grid.innerHTML = `<div class="state-box" style="grid-column:1/-1"><i class="fas fa-triangle-exclamation"></i><p>Gagal memuat data event.</p></div>`;
        return;
      }

      allData = data;
      renderCards(data);
    }

    function renderCards(data) {
      const grid = document.getElementById('eventGrid');
      if (data.length === 0) {
        grid.innerHTML = `<div class="state-box" style="grid-column:1/-1"><i class="fas fa-calendar-days"></i><p>Tidak ada data.</p></div>`;
        return;
      }

      let delay = 0.3;
      grid.innerHTML = data.map(e => {
        const imgHtml = e.image_url
          ? `<img src="${e.image_url}" alt="${e.name}" loading="lazy">`
          : `<div class="event-img-placeholder">
               <div class="placeholder-icon-wrap"><i class="fas fa-image"></i></div>
               <span class="placeholder-text">Foto Kegiatan</span>
             </div>`;

        const d = delay; delay += 0.1;
        return `
          <div class="event-card" style="animation:fadeUp .55s ease ${d}s forwards" data-type="${e.type}">
            <div class="event-img-wrap">${imgHtml}</div>
            <div class="event-body">
              <span class="event-type-badge ${typeBadge[e.type] || 'badge-org'}">
                <i class="${typeIcon[e.type] || 'fas fa-circle'}"></i>
                ${typeLabel[e.type] || e.type}
              </span>
              <p class="event-name">${e.name}</p>
              <p class="event-role">${e.role || ''}</p>
              <div class="event-meta">
                ${e.period   ? `<span class="event-meta-item"><i class="fas fa-calendar"></i> ${e.period}</span>`       : ''}
                ${e.location ? `<span class="event-meta-item"><i class="fas fa-location-dot"></i> ${e.location}</span>` : ''}
              </div>
              <p class="event-desc">${e.description || ''}</p>
            </div>
          </div>`;
      }).join('');
    }

    document.getElementById('filterTabs').addEventListener('click', e => {
      const tab = e.target.closest('.filter-tab');
      if (!tab) return;
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      renderCards(filter === 'all' ? allData : allData.filter(d => d.type === filter));
    });

    loadEvents();

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