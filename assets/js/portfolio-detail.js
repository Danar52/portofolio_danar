import { supabase } from '../../supabase.js?v=a77a873f';
import { trackVisit } from './analytics-track.js';
trackVisit();

const TYPE_CONFIG = {
  web:    { label: 'Web Dev', icon: 'fas fa-code' },
  design: { label: 'Design',  icon: 'fas fa-pen-ruler' },
  other:  { label: 'Lainnya', icon: 'fas fa-box-open' },
};

const SITE = 'https://www.edanararrasyid.my.id';

/* ── INDEXING ──────────────────────────────────────────────────────────────
   This page is a template: its content depends entirely on ?id=. The markup
   ships with "index, follow" on purpose — a noindex in the served HTML can
   stop Google rendering the page at all, and then nothing here ever runs.
   Instead each outcome sets its own rules once the data is in.
────────────────────────────────────────────────────────────────────────── */
function setMeta(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/** Withhold from the index: nothing worth ranking is on the page. */
function markNotIndexable() {
  setMeta('meta[name="robots"]', 'content', 'noindex, follow');
}

/**
 * Point every canonical-ish URL at this exact project.
 *
 * The static canonical named the bare template URL, so every ?id= told Google
 * they were all the same document and the projects collapsed into one empty
 * page. Each one is its own URL now.
 */
function describeProject(item) {
  const url = `${SITE}/portfolio-detail.html?id=${encodeURIComponent(item.id)}`;
  const title = `${item.title} — Eka Danar Arrasyid`;
  const desc = item.description || `Studi kasus project ${item.title} oleh Eka Danar Arrasyid.`;
  const image = item.thumbnail_url || `${SITE}/assets/bot_avatar.png`;

  document.title = title;
  setMeta('link[rel="canonical"]', 'href', url);
  setMeta('meta[name="description"]', 'content', desc);

  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', desc);
  setMeta('meta[property="og:image"]', 'content', image);
  setMeta('meta[property="og:type"]', 'content', 'article');

  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', desc);
  setMeta('meta[name="twitter:image"]', 'content', image);
}

function showNotFound() {
  markNotIndexable();
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

  describeProject(item);

  const cfg     = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
  const gallery = parseGallery(item.gallery_images);

  const tagsHtml = (item.tags || []).map(t => `<span class="detail-tag">${t}</span>`).join('');

  const sections = [
    { label: 'Latar Belakang', value: item.background },
    { label: 'Masalah',        value: item.problem },
    { label: 'Solusi',         value: item.solution },
    { label: 'Hasil',          value: item.result },
  ].filter(s => s.value);

  // Accordion — section pertama kebuka default biar kolom kanan gak keliatan kosong
  const sectionsHtml = sections.map((s, i) => `
    <div class="detail-acc${i === 0 ? ' open' : ''}">
      <button type="button" class="detail-acc-head" aria-expanded="${i === 0 ? 'true' : 'false'}">
        <span class="detail-acc-label">${s.label}</span>
        <i class="fas fa-chevron-right detail-acc-arrow"></i>
      </button>
      <div class="detail-acc-body"><p>${s.value}</p></div>
    </div>`).join('');

  const actionLinks = [];
  if (item.url_live)    actionLinks.push(`<a href="${item.url_live}"    target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn-primary"><i class="fas fa-external-link-alt"></i> Lihat Live</a>`);
  if (item.url_github)  actionLinks.push(`<a href="${item.url_github}"  target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn-outline"><i class="fab fa-github"></i> GitHub</a>`);
  if (item.url_behance) actionLinks.push(`<a href="${item.url_behance}" target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn-outline"><i class="fab fa-behance"></i> Behance</a>`);
  if (item.url_figma)   actionLinks.push(`<a href="${item.url_figma}"   target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn-outline"><i class="fab fa-figma"></i> Figma</a>`);

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-split">
      <div class="detail-left">
        <div class="detail-hero">${buildHeroHtml(item, gallery)}</div>
        ${buildGalleryStripHtml(gallery, item.title)}
        <span class="detail-meta"><i class="${cfg.icon}"></i>${cfg.label}${item.year ? ' · ' + item.year : ''}</span>
        <h1 class="detail-title">${item.title}</h1>
        ${tagsHtml ? `<div class="detail-tags">${tagsHtml}</div>` : ''}
        ${actionLinks.length ? `<div class="detail-actions">${actionLinks.join('')}</div>` : ''}
      </div>
      ${sections.length ? `<div class="detail-right">${sectionsHtml}</div>` : ''}
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

  document.querySelectorAll('.detail-acc-head').forEach(head => {
    head.addEventListener('click', () => {
      const acc    = head.parentElement;
      const isOpen = acc.classList.toggle('open');
      head.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });
}

loadDetail();
