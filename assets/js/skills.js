import { supabase } from '../../supabase.js';

    function getLevel(pct) {
      if (pct >= 80) return { cls: 'high', label: 'Mahir' };
      if (pct >= 60) return { cls: 'mid',  label: 'Menengah' };
      return           { cls: 'low',  label: 'Dasar' };
    }

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
      const avg = Math.round(data.reduce((a, b) => a + (b.percentage || 0), 0) / data.length);
      document.getElementById('statTotal').textContent      = data.length;
      document.getElementById('statCategories').textContent = Object.keys(groups).length;
      document.getElementById('statAvg').textContent        = avg + '%';
      statsEl.style.display = 'flex';

      // Render
      let html  = '';
      let delay = 0.15;

      for (const [cat, items] of Object.entries(groups)) {
        html += `
          <div class="skill-section" style="animation:fadeUp .55s ease ${delay}s forwards">
            <div class="skill-section-header">
              <span class="skill-section-title">${cat}</span>
              <div class="skill-section-line"></div>
              <span class="skill-section-count">${items.length}</span>
            </div>

            <div class="skills-list">
              ${items.map(s => {
                const pct = s.percentage || 0;
                const lv  = getLevel(pct);
                return `
                  <div class="skill-row level-${lv.cls}">
                    <div class="skill-row-name">
                      <span class="skill-name-text">${s.skill_name}</span>
                      <span class="skill-level-badge ${lv.cls}">${lv.label}</span>
                    </div>
                    <div class="skill-row-bar">
                      <div class="skill-bar-track">
                        <div class="skill-bar-fill" data-pct="${pct}"></div>
                      </div>
                    </div>
                    <span class="skill-pct">${pct}%</span>
                  </div>`;
              }).join('')}
            </div>
          </div>`;
        delay += 0.1;
      }

      wrapper.innerHTML = html;

      // Animate bars
      setTimeout(() => {
        document.querySelectorAll('.skill-bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.pct + '%';
        });
      }, 350);
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