import { supabase } from '../../supabase.js?v=a77a873f';
import { trackVisit } from './analytics-track.js';
trackVisit();

    async function loadSkills() {
      const wrapper = document.getElementById('skillsWrapper');
      const statsEl = document.getElementById('skillsStats');

      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('category')
        .order('sort_order');

      if (error || !data || data.length === 0) {
        wrapper.innerHTML = `<div class="state-box"><i class="fas fa-triangle-exclamation"></i><p>Gagal memuat data skills.</p></div>`;
        return;
      }

      // Grouping
      const groups = {};
      data.forEach(s => {
        if (!groups[s.category]) groups[s.category] = [];
        groups[s.category].push(s);
      });

      // Stats
      document.getElementById('statTotal').textContent      = data.length;
      document.getElementById('statCategories').textContent = Object.keys(groups).length;
      statsEl.style.display = 'flex';

      // Render — editorial: kategori kiri, nama skill besar kanan
      let html  = '';
      let delay = 0.15;

      for (const [cat, items] of Object.entries(groups)) {
        html += `
          <section class="skill-section" style="animation:fadeUp .55s ease ${delay}s forwards">
            <span class="skill-section-label">${cat}<em>${items.length}</em></span>
            <div class="skill-section-body">
              ${items.map((s, i) => `
                <span class="skill-item" style="animation-delay:${delay + 0.04 * i}s">${s.skill_name}</span>
              `).join('')}
            </div>
          </section>`;
        delay += 0.1;
      }

      wrapper.innerHTML = html;
    }

    loadSkills();

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
      window.addEventListener('resize', () => { if (window.innerWidth > 768) closeMenu(); });
    })();