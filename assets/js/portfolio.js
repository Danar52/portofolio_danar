import { supabase } from '../../supabase.js';

    const TYPE_CONFIG = {
      web:   { label: 'Web Dev', icon: 'fas fa-code',      cls: 'badge-web'   },
      design:{ label: 'Design',  icon: 'fas fa-pen-ruler', cls: 'badge-design'},
      other: { label: 'Lainnya', icon: 'fas fa-box-open',  cls: 'badge-other' },
    };

    let allItems = [];

    function getThumbSrc(item) {
      if (item.thumbnail_url) return { type: 'img', src: item.thumbnail_url };
      if (item.url_live)      return { type: 'microlink', url: item.url_live };
      return { type: 'placeholder' };
    }

    function buildThumbHtml(item, cfg) {
      const t = getThumbSrc(item);
      if (t.type === 'img') return `<img src="${t.src}" alt="${item.title}" loading="lazy">`;
      if (t.type === 'microlink') {
        const encoded = encodeURIComponent(t.url);
        return `<div class="thumb-microlink" data-url="${encoded}">
          <div class="thumb-loading"><i class="fas fa-circle-notch fa-spin"></i></div>
          <img class="thumb-ml-img" style="display:none" alt="${item.title}" loading="lazy">
        </div>`;
      }
      return `<div class="thumb-placeholder"><i class="${cfg.icon}"></i><span>${cfg.label}</span></div>`;
    }

    async function loadPortfolio() {
      const el = document.getElementById('portfolioContent');
      const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('is_published', true)
        .order('sort_order')
        .order('created_at', { ascending: false });

      if (error) {
        el.innerHTML = `<div class="state-box"><i class="fas fa-triangle-exclamation"></i><p>Gagal memuat data.</p></div>`;
        return;
      }
      if (!data || data.length === 0) {
        el.innerHTML = `<div class="state-box"><i class="fas fa-folder-open"></i><p>Belum ada karya yang dipublikasikan.</p></div>`;
        return;
      }

      allItems = data;
      renderGrid(data);
    }

    function renderGrid(items) {
      const el = document.getElementById('portfolioContent');
      if (items.length === 0) {
        el.innerHTML = `<div class="state-box"><i class="fas fa-filter"></i><p>Tidak ada item di kategori ini.</p></div>`;
        return;
      }

      const cardsHtml = items.map((item, idx) => {
        const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
        const isFeatured = item.is_featured ? 'featured' : '';
        const thumbHtml  = buildThumbHtml(item, cfg);
        const tagsHtml   = (item.tags || []).slice(0, 3).map(t => `<span class="card-tag">${t}</span>`).join('');

        return `
          <div class="portfolio-card ${isFeatured}" data-type="${item.type}" data-id="${item.id}"
            style="opacity:0;transform:translateY(20px);animation:fadeUp .5s ease ${0.05*idx+0.3}s forwards">
            <div class="card-thumb">
              ${thumbHtml}
              <span class="card-badge ${cfg.cls}"><i class="${cfg.icon}"></i>${cfg.label}</span>
            </div>
            <div class="card-body">
              <p class="card-title">${item.title}</p>
              <p class="card-desc">${item.description || ''}</p>
              <div class="card-footer">
                <div class="card-tags">${tagsHtml}</div>
                <span class="card-link"><i class="fas fa-arrow-right"></i> Lihat detail</span>
              </div>
            </div>
          </div>`;
      }).join('');

      el.innerHTML = `<div class="portfolio-grid">${cardsHtml}</div>`;

      document.querySelectorAll('.portfolio-card').forEach(card => {
        card.addEventListener('click', () => {
          const id   = parseInt(card.dataset.id);
          const item = allItems.find(i => i.id === id);
          if (item) openLightbox(item);
        });
      });

      // Microlink screenshots
      document.querySelectorAll('.thumb-microlink').forEach(wrap => {
        const encoded = wrap.dataset.url;
        const img     = wrap.querySelector('.thumb-ml-img');
        const loading = wrap.querySelector('.thumb-loading');
        img.src = `https://api.microlink.io/?url=${encoded}&screenshot=true&meta=false&embed=screenshot.url`;
        img.onload  = () => { loading.style.display = 'none'; img.style.display = 'block'; };
        img.onerror = () => { loading.innerHTML = '<i class="fas fa-globe" style="font-size:28px;color:var(--accent-color);opacity:.3"></i>'; };
      });
    }

    // Filter
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter   = btn.dataset.filter;
        const filtered = filter === 'all' ? allItems : allItems.filter(i => i.type === filter);
        renderGrid(filtered);
      });
    });

    // Lightbox — Split Panel
    function openLightbox(item) {
      const cfg      = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
      const tagsHtml = (item.tags || []).map(t => `<span class="lightbox-tag">${t}</span>`).join('');

      // ─── Image Pane (left on desktop / top on mobile) ───────────────
      let imgContent;
      if (item.thumbnail_url) {
        imgContent = `<img class="lightbox-img" src="${item.thumbnail_url}" alt="${item.title}" loading="lazy">`;
      } else if (item.url_live) {
        const encoded = encodeURIComponent(item.url_live);
        const mlSrc   = `https://api.microlink.io/?url=${encoded}&screenshot=true&meta=false&embed=screenshot.url`;
        imgContent = `
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center" id="lbThumbSpinWrap">
            <i class="fas fa-circle-notch fa-spin" style="font-size:28px;color:var(--accent-color);opacity:.5"></i>
          </div>
          <img class="lightbox-img" src="${mlSrc}" alt="${item.title}" style="display:none"
            onload="document.getElementById('lbThumbSpinWrap').style.display='none';this.style.display='block'"
            onerror="document.getElementById('lbThumbSpinWrap').style.display='none'">`;
      } else {
        imgContent = `<div class="lightbox-img-placeholder"><i class="${cfg.icon}"></i></div>`;
      }

      const imgPane = `
        <div class="lightbox-img-pane">
          ${imgContent}
          <span class="lightbox-img-badge ${cfg.cls}">
            <i class="${cfg.icon}"></i>${cfg.label}
          </span>
        </div>`;

      // ─── Action buttons ──────────────────────────────────────────────
      const actionLinks = [];
      if (item.url_live)    actionLinks.push(`<a href="${item.url_live}"    target="_blank" class="lb-btn lb-btn-primary"><i class="fas fa-external-link-alt"></i> Lihat Live</a>`);
      if (item.url_github)  actionLinks.push(`<a href="${item.url_github}"  target="_blank" class="lb-btn lb-btn-outline"><i class="fab fa-github"></i> GitHub</a>`);
      if (item.url_behance) actionLinks.push(`<a href="${item.url_behance}" target="_blank" class="lb-btn lb-btn-outline"><i class="fab fa-behance"></i> Behance</a>`);
      if (item.url_figma)   actionLinks.push(`<a href="${item.url_figma}"   target="_blank" class="lb-btn lb-btn-outline"><i class="fab fa-figma"></i> Figma</a>`);

      // ─── Assemble ────────────────────────────────────────────────────
      document.getElementById('lightboxContent').innerHTML = `
        ${imgPane}
        <div class="lightbox-body">
          ${item.year ? `<p class="lightbox-year">${item.year}</p>` : ''}
          <h2 class="lightbox-title">${item.title}</h2>
          <div class="lightbox-divider"></div>
          <p class="lightbox-desc">${item.description || ''}</p>
          ${tagsHtml ? `<div class="lightbox-tags">${tagsHtml}</div>` : ''}
          <div class="lightbox-spacer"></div>
          ${actionLinks.length ? `<div class="lightbox-actions">${actionLinks.join('')}</div>` : ''}
        </div>`;

      document.getElementById('lightboxOverlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      document.getElementById('lightboxOverlay').classList.remove('open');
      document.body.style.overflow = '';
    }

    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightboxOverlay').addEventListener('click', e => {
      if (e.target === document.getElementById('lightboxOverlay')) closeLightbox();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

    loadPortfolio();

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