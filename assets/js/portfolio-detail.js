import { supabase } from '../../supabase.js';

const TYPE_CONFIG = {
  web:    { label: 'Web Dev', icon: 'fas fa-code' },
  design: { label: 'Design',  icon: 'fas fa-pen-ruler' },
  other:  { label: 'Lainnya', icon: 'fas fa-box-open' },
};

function showNotFound() {
  document.getElementById('detailContent').innerHTML = `
    <div class="state-box">
      <i class="fas fa-triangle-exclamation"></i>
      <p>Project tidak ditemukan.</p>
    </div>`;
}

function parseGallery(raw) {
  let gallery = raw;
  if (typeof gallery === 'string') {
    try { gallery = JSON.parse(gallery); } catch { gallery = []; }
  }
  return Array.isArray(gallery) ? gallery : [];
}

function buildHeroHtml(item, gallery) {
  if (gallery.length > 0) {
    return `<img class="detail-hero-img" id="detailHeroImg" src="${gallery[0]}" alt="${item.title}">`;
  }
  if (item.thumbnail_url) {
    return `<img class="detail-hero-img" src="${item.thumbnail_url}" alt="${item.title}">`;
  }
  if (item.url_live) {
    // Single direct mshots request — no retry loop here (unlike the grid's
    // loadScreenshot()), since this is one hero image, not a whole grid of
    // thumbnails; a plain first-load placeholder image is an acceptable
    // occasional result for this page.
    return `<img class="detail-hero-img" src="https://s.wordpress.com/mshots/v1/${encodeURIComponent(item.url_live)}?w=1200&h=750" alt="${item.title}">`;
  }
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
  return `<div class="detail-hero-placeholder"><i class="${cfg.icon}"></i></div>`;
}

function buildGalleryStripHtml(gallery, title) {
  if (gallery.length <= 1) return '';
  return `<div class="detail-gallery-strip">${gallery.map((src, i) => `
    <img class="detail-gallery-thumb${i === 0 ? ' active' : ''}" src="${src}" data-src="${src}" alt="${title} ${i + 1}">
  `).join('')}</div>`;
}

async function loadDetail() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { showNotFound(); return; }

  const { data: item, error } = await supabase
    .from('portfolio')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (error || !item) { showNotFound(); return; }

  document.title = `${item.title} — Eka Danar Arrasyid`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && item.description) metaDesc.setAttribute('content', item.description);

  const cfg     = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
  const gallery = parseGallery(item.gallery_images);

  const tagsHtml = (item.tags || []).map(t => `<span class="detail-tag">${t}</span>`).join('');

  const sections = [
    { label: 'Latar<br>Belakang', value: item.background },
    { label: 'Masalah',          value: item.problem },
    { label: 'Solusi',           value: item.solution },
    { label: 'Hasil',            value: item.result },
  ].filter(s => s.value);

  const sectionsHtml = sections.map(s => `
    <div class="detail-section">
      <span class="detail-section-label">${s.label}</span>
      <div class="detail-section-body"><p>${s.value}</p></div>
    </div>`).join('');

  const actionLinks = [];
  if (item.url_live)    actionLinks.push(`<a href="${item.url_live}"    target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn-primary"><i class="fas fa-external-link-alt"></i> Lihat Live</a>`);
  if (item.url_github)  actionLinks.push(`<a href="${item.url_github}"  target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn-outline"><i class="fab fa-github"></i> GitHub</a>`);
  if (item.url_behance) actionLinks.push(`<a href="${item.url_behance}" target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn-outline"><i class="fab fa-behance"></i> Behance</a>`);
  if (item.url_figma)   actionLinks.push(`<a href="${item.url_figma}"   target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn-outline"><i class="fab fa-figma"></i> Figma</a>`);

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-hero">${buildHeroHtml(item, gallery)}</div>
    ${buildGalleryStripHtml(gallery, item.title)}
    <div class="detail-body">
      <span class="detail-meta"><i class="${cfg.icon}"></i>${cfg.label}${item.year ? ' · ' + item.year : ''}</span>
      <h1 class="detail-title">${item.title}</h1>
      ${tagsHtml ? `<div class="detail-tags">${tagsHtml}</div>` : ''}
      ${sectionsHtml}
      ${actionLinks.length ? `<div class="detail-actions">${actionLinks.join('')}</div>` : ''}
    </div>`;

  if (gallery.length > 1) {
    document.querySelectorAll('.detail-gallery-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        document.getElementById('detailHeroImg').src = thumb.dataset.src;
        document.querySelectorAll('.detail-gallery-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  }
}

loadDetail();
