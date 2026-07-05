import { supabase } from '../../supabase.js';

    const TYPE_CONFIG = {
      web:   { label: 'Web Dev', icon: 'fas fa-code',      cls: 'badge-web'   },
      design:{ label: 'Design',  icon: 'fas fa-pen-ruler', cls: 'badge-design'},
      other: { label: 'Lainnya', icon: 'fas fa-box-open',  cls: 'badge-other' },
    };

    let allItems = [];

    // ══════════════════════════════════════════════════════════
    // SCREENSHOT LOADER — mShots (primary) → Microlink → icon
    // Microlink free ±50 req/hari → gampang habis, spinner muter
    // terus. thum.io free nge-serve gambar error "sign-up" dengan
    // HTTP 200 → tak terdeteksi onerror. mShots (WordPress) gratis
    // tanpa kuota ketat dan jalan dari browser; screenshot pertama
    // butuh generate → server balikin placeholder "generating"
    // 400×300 dulu, jadi perlu retry pakai cache-buster.
    // ══════════════════════════════════════════════════════════
    function loadScreenshot(wrap, rawUrl) {
      const img     = wrap.querySelector('.thumb-ml-img');
      const loading = wrap.querySelector('.thumb-loading');
      const encoded = encodeURIComponent(rawUrl);
      const showFail = () => {
        loading.innerHTML = '<i class="fas fa-globe" style="font-size:24px;color:var(--text-3);opacity:.4"></i>';
      };

      const tryMicrolink = () => {
        img.onload  = () => { loading.style.display = 'none'; img.style.display = 'block'; };
        img.onerror = showFail;
        img.src = `https://api.microlink.io/?url=${encoded}&screenshot=true&meta=false&embed=screenshot.url`;
      };

      let attempt = 0;
      const MAX_RETRY = 10;
      img.onload = () => {
        // Placeholder "generating" mShots = 400×300
        if (img.naturalWidth === 400 && img.naturalHeight === 300 && attempt < MAX_RETRY) {
          attempt++;
          setTimeout(() => {
            img.src = `https://s.wordpress.com/mshots/v1/${encoded}?w=900&h=563&r=${Date.now()}`;
          }, 2500);
          return;
        }
        loading.style.display = 'none';
        img.style.display = 'block';
      };
      img.onerror = tryMicrolink;
      img.src = `https://s.wordpress.com/mshots/v1/${encoded}?w=900&h=563`;
    }

    function getThumbSrc(item) {
      if (item.thumbnail_url) return { type: 'img', src: item.thumbnail_url };
      if (item.url_live)      return { type: 'screenshot', url: item.url_live };
      return { type: 'placeholder' };
    }

    function buildThumbHtml(item, cfg) {
      const t = getThumbSrc(item);
      if (t.type === 'img') return `<img src="${t.src}" alt="${item.title}" loading="lazy">`;
      if (t.type === 'screenshot') {
        return `<div class="thumb-microlink" data-url="${item.url_live}">
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

      let delay = 0.15;
      const rowsHtml = items.map(item => {
        const cfg       = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
        const thumbHtml = buildThumbHtml(item, cfg);
        const tagsHtml  = (item.tags || []).slice(0, 4).map(t => `<span class="pf-tag">${t}</span>`).join('');
        const metaBits  = [cfg.label, item.year].filter(Boolean).join(' · ');

        const d = delay; delay += 0.08;
        return `
          <section class="pf-row" data-type="${item.type}" data-id="${item.id}"
            style="animation:fadeUp .55s ease ${d}s forwards">
            <div class="pf-thumb">${thumbHtml}</div>
            <div class="pf-body">
              <span class="pf-meta">${metaBits}</span>
              <h2 class="pf-title">${item.title}</h2>
              ${item.description ? `<p class="pf-desc">${item.description}</p>` : ''}
              ${tagsHtml ? `<div class="pf-tags">${tagsHtml}</div>` : ''}
              <span class="pf-link">Lihat detail <i class="fas fa-arrow-right"></i></span>
            </div>
          </section>`;
      }).join('');

      el.innerHTML = `<div class="pf-list">${rowsHtml}</div>`;

      document.querySelectorAll('.pf-row').forEach(row => {
        row.addEventListener('click', () => {
          const id   = parseInt(row.dataset.id);
          const item = allItems.find(i => i.id === id);
          if (item) openLightbox(item);
        });
      });

      // Screenshot thumbnails
      document.querySelectorAll('.thumb-microlink').forEach(wrap => {
        loadScreenshot(wrap, wrap.dataset.url);
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

    // Lightbox
    function openLightbox(item) {
      const cfg      = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
      const tagsHtml = (item.tags || []).map(t => `<span class="lightbox-tag">${t}</span>`).join('');

      let imgContent;
      if (item.thumbnail_url) {
        imgContent = `<img class="lightbox-img" src="${item.thumbnail_url}" alt="${item.title}" loading="lazy">`;
      } else if (item.url_live) {
        // w=900 sama kayak thumbnail list → screenshot udah di-generate
        // & ke-cache dari list, lightbox tinggal ambil versi cache-nya
        imgContent = `
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center" id="lbThumbSpinWrap">
            <i class="fas fa-circle-notch fa-spin" style="font-size:24px;color:var(--text-3);opacity:.5"></i>
          </div>
          <img class="lightbox-img" src="https://s.wordpress.com/mshots/v1/${encodeURIComponent(item.url_live)}?w=900&h=563" alt="${item.title}" style="display:none"
            onload="document.getElementById('lbThumbSpinWrap').style.display='none';this.style.display='block'"
            onerror="document.getElementById('lbThumbSpinWrap').style.display='none'">`;
      } else {
        imgContent = `<div class="lightbox-img-placeholder"><i class="${cfg.icon}"></i></div>`;
      }

      const imgPane = `
        <div class="lightbox-img-pane">
          ${imgContent}
          <span class="lightbox-img-badge">
            <i class="${cfg.icon}"></i>${cfg.label}
          </span>
        </div>`;

      const actionLinks = [];
      if (item.url_live)    actionLinks.push(`<a href="${item.url_live}"    target="_blank" class="lb-btn lb-btn-primary"><i class="fas fa-external-link-alt"></i> Lihat Live</a>`);
      if (item.url_github)  actionLinks.push(`<a href="${item.url_github}"  target="_blank" class="lb-btn lb-btn-outline"><i class="fab fa-github"></i> GitHub</a>`);
      if (item.url_behance) actionLinks.push(`<a href="${item.url_behance}" target="_blank" class="lb-btn lb-btn-outline"><i class="fab fa-behance"></i> Behance</a>`);
      if (item.url_figma)   actionLinks.push(`<a href="${item.url_figma}"   target="_blank" class="lb-btn lb-btn-outline"><i class="fab fa-figma"></i> Figma</a>`);

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
