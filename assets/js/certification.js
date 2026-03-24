import { supabase } from '../../supabase.js';

    function isPDF(url) { return url && url.toLowerCase().includes('.pdf'); }

    function openLightbox(thumbnailUrl, originalUrl) {
      const isFilePDF = isPDF(originalUrl);
      document.getElementById('lightboxImg').src = thumbnailUrl;
      const pdfLabel = document.getElementById('lightboxPdfLabel');
      const pdfLink  = document.getElementById('lightboxPdfLink');
      if (isFilePDF && originalUrl) {
        pdfLabel.style.display = 'block';
        pdfLink.href = originalUrl;
      } else {
        pdfLabel.style.display = 'none';
      }
      document.getElementById('lightbox').classList.add('open');
    }

    async function loadCertifications() {
      const grid = document.getElementById('certGrid');
      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .order('sort_order');

      if (error || !data || data.length === 0) {
        grid.innerHTML = `<div class="state-box" style="grid-column:1/-1"><i class="fas fa-triangle-exclamation"></i><p>Gagal memuat data.</p></div>`;
        return;
      }

      document.getElementById('statTotal').textContent  = data.length;
      document.getElementById('statIssuer').textContent = new Set(data.map(c => c.issuer)).size;

      let delay = 0.3;
      grid.innerHTML = data.map(c => {
        const displayImg  = c.thumbnail_url || (c.image_url && !isPDF(c.image_url) ? c.image_url : null);
        const originalUrl = c.image_url;
        const isFilePDF   = isPDF(originalUrl);

        const previewArea = displayImg
          ? `<div class="cert-img-wrap"
               data-thumbnail="${displayImg}"
               data-original="${originalUrl || ''}"
               data-is-pdf="${isFilePDF}">
               <img src="${displayImg}" alt="${c.cert_name}" loading="lazy">
               ${isFilePDF ? `<span class="pdf-badge"><i class="fas fa-file-pdf"></i> PDF</span>` : ''}
               <div class="cert-zoom-overlay ${isFilePDF ? 'pdf-overlay' : ''}">
                 <i class="fas fa-magnifying-glass-plus"></i>
                 <span>${isFilePDF ? 'Lihat Preview' : 'Lihat Sertifikat'}</span>
               </div>
             </div>`
          : `<div class="cert-img-wrap" style="cursor:default">
               <div class="cert-img-placeholder">
                 <div class="cert-frame"><i class="fas fa-certificate"></i></div>
                 <span class="cert-placeholder-label">Belum ada file</span>
               </div>
             </div>`;

        const d = delay; delay += 0.1;
        return `
          <div class="cert-card" style="animation:fadeUp .55s ease ${d}s forwards">
            ${previewArea}
            <div class="cert-body">
              <div class="cert-issuer-row">
                <div class="cert-issuer-icon"><i class="${c.issuer_icon || 'fas fa-building'}"></i></div>
                <span class="cert-issuer">${c.issuer}</span>
              </div>
              <p class="cert-name">${c.cert_name}</p>
              <div class="cert-footer">
                <span class="cert-date"><i class="fas fa-calendar"></i> ${c.issued_date || '—'}</span>
                ${c.cert_url ? `<a href="${c.cert_url}" target="_blank" class="cert-link"><i class="fas fa-arrow-up-right-from-square"></i> Verifikasi</a>` : ''}
              </div>
            </div>
          </div>`;
      }).join('');

      document.querySelectorAll('.cert-img-wrap[data-thumbnail]').forEach(wrap => {
        wrap.addEventListener('click', () => {
          openLightbox(wrap.dataset.thumbnail, wrap.dataset.original);
        });
      });
    }

    document.getElementById('lightboxClose').addEventListener('click', () => document.getElementById('lightbox').classList.remove('open'));
    document.getElementById('lightbox').addEventListener('click', e => {
      if (e.target === document.getElementById('lightbox')) document.getElementById('lightbox').classList.remove('open');
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') document.getElementById('lightbox').classList.remove('open');
    });

    loadCertifications();

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