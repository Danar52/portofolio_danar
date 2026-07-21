import { supabase } from '../../supabase.js?v=a77a873f';

/* ── SELECTED WORK ────────────────────────────────────────── */
const workList     = document.getElementById('workList');
const workHoverImg = document.getElementById('workHoverImg');
let hoverImgX = 0, hoverImgY = 0;

async function loadWork() {
  if (!workList) return;

  const { data, error } = await supabase
    .from('portfolio')
    .select('id, title, type, thumbnail_url, created_at')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .limit(4);

  if (error || !data || data.length === 0) {
    workList.innerHTML = `<li class="state-box"><p>Belum ada karya.</p></li>`;
    return;
  }

  const TYPE_LABEL = { web: 'Web Dev', design: 'Design', other: 'Other' };

  workList.innerHTML = data.map((item, i) => {
    const year  = item.created_at ? new Date(item.created_at).getFullYear() : '';
    const cat   = TYPE_LABEL[item.type] || item.type || '';
    return `
      <li class="work-item" data-img="${item.thumbnail_url || ''}"
          style="animation-delay:${0.08 * i}s">
        <span class="work-item-name">${item.title}</span>
        <span class="work-item-cat">${cat}</span>
        <span class="work-item-year">${year}</span>
      </li>`;
  }).join('');

  /* Reveal items on scroll */
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.15 });
  workList.querySelectorAll('.work-item').forEach(el => obs.observe(el));

  /* Hover image effect */
  if (workHoverImg) {
    document.addEventListener('mousemove', e => {
      hoverImgX = e.clientX;
      hoverImgY = e.clientY;
      workHoverImg.style.left = (hoverImgX + 24) + 'px';
      workHoverImg.style.top  = (hoverImgY - 80) + 'px';
    });

    workList.querySelectorAll('.work-item').forEach(item => {
      const imgSrc = item.dataset.img;
      item.addEventListener('mouseenter', () => {
        if (imgSrc) {
          workHoverImg.src = imgSrc;
          workHoverImg.classList.add('show');
        }
      });
      item.addEventListener('mouseleave', () => {
        workHoverImg.classList.remove('show');
      });
    });
  }
}

loadWork();

/* ── HOME TEASERS — ringkasan tiap menu ──────────────────── */
async function loadTeasers() {
  const [profRes, eduRes, expRes, skillRes, certRes, eventRes] = await Promise.all([
    supabase.from('profile').select('bio, birth_date, cv_url').single(),
    supabase.from('education').select('year_start, is_active').order('sort_order'),
    supabase.from('experience').select('job_title, company, period_start, period_end, is_active').order('sort_order'),
    supabase.from('skills').select('skill_name, category').order('category').order('sort_order'),
    supabase.from('certifications').select('cert_name, issuer, issued_date').order('sort_order'),
    supabase.from('events').select('name, type, role, period').order('sort_order'),
  ]);

  renderAbout(profRes.data, eduRes.data || []);
  renderExp(expRes.data || []);
  renderSkills(skillRes.data || []);
  renderCreds(certRes.data || [], eventRes.data || []);
  revealSections();
}

function renderCvButton(p) {
  const btn = document.getElementById('heroCvBtn');
  if (!btn || !p?.cv_url) return;
  btn.href = `${p.cv_url}?download=Danar-CV.pdf`;
  btn.style.display = '';
}

function renderAbout(p, eduList) {
  const bioEl   = document.getElementById('haBio');
  const statsEl = document.getElementById('haStats');
  if (!bioEl || !p) { document.getElementById('homeAbout')?.remove(); return; }

  renderCvButton(p);
  bioEl.textContent = p.bio || '';

  let age = null;
  if (p.birth_date) {
    const b = new Date(p.birth_date), t = new Date();
    age = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
  }
  const eduStart = eduList.length ? eduList[eduList.length - 1].year_start : null;
  const yearsLearning = eduStart ? new Date().getFullYear() - eduStart : null;

  const stats = [
    age           ? { n: age,                 l: 'Usia (thn)' }   : null,
    yearsLearning ? { n: yearsLearning + '+', l: 'Thn Belajar' }  : null,
    eduList.length? { n: eduList.length,      l: 'Pendidikan' }   : null,
  ].filter(Boolean);

  statsEl.innerHTML = stats.map(s => `
    <div class="ha-stat">
      <span class="ha-stat-num">${s.n}</span>
      <span class="ha-stat-lbl">${s.l}</span>
    </div>`).join('');
}

function renderExp(list) {
  const el = document.getElementById('heList');
  if (!el || list.length === 0) { document.getElementById('homeExp')?.remove(); return; }

  el.innerHTML = list.slice(0, 4).map(e => `
    <a href="experience.html" class="he-row">
      <span class="he-period">${e.period_start} — ${e.is_active ? 'Saat Ini' : (e.period_end || '')}</span>
      <span class="he-title">${e.job_title}</span>
      <span class="he-company">${e.company}</span>
      <i class="fas fa-arrow-right he-arrow"></i>
    </a>`).join('');
}

function renderSkills(list) {
  const el = document.getElementById('hkGroups');
  if (!el || list.length === 0) { document.getElementById('homeSkills')?.remove(); return; }

  const groups = {};
  list.forEach(s => {
    if (!groups[s.category]) groups[s.category] = [];
    groups[s.category].push(s);
  });

  el.innerHTML = Object.entries(groups).map(([cat, items]) => {
    const top = items.slice(0, 6); // udah terurut sort_order dari query
    return `
      <div class="hk-group">
        <span class="hk-cat">${cat}</span>
        <ul class="hk-names">
          ${top.map(s => `<li>${s.skill_name}</li>`).join('')}
        </ul>
      </div>`;
  }).join('');
}

function renderCreds(certs, events) {
  const certList  = document.getElementById('hcCertList');
  const eventList = document.getElementById('hcEventList');
  if (!certList || (certs.length === 0 && events.length === 0)) {
    document.getElementById('homeCred')?.remove(); return;
  }

  document.getElementById('hcCertCount').textContent  = certs.length ? `(${certs.length})` : '';
  document.getElementById('hcEventCount').textContent = events.length ? `(${events.length})` : '';

  certList.innerHTML = certs.slice(0, 3).map(c => `
    <a href="certification.html" class="hc-row">
      <span class="hc-name">${c.cert_name}</span>
      <span class="hc-sub">${c.issuer}${c.issued_date ? ' · ' + c.issued_date : ''}</span>
    </a>`).join('');

  const typeLabel = { org: 'Organisasi', event: 'Event', comp: 'Kompetisi' };
  eventList.innerHTML = events.slice(0, 3).map(e => `
    <a href="event.html" class="hc-row">
      <span class="hc-name">${e.name}</span>
      <span class="hc-sub">${typeLabel[e.type] || e.type}${e.role ? ' · ' + e.role : ''}</span>
    </a>`).join('');
}

/* Position sweep, not IntersectionObserver: IO only reports *changes* in
   intersection, so a section that goes from below the viewport to above it
   in one jump (anchor link, restored scroll position) never fires and stays
   at opacity 0 permanently. Testing absolute position covers both cases. */
function revealSections() {
  const pending = new Set(document.querySelectorAll('.home-section'));
  let queued = false;

  function sweep() {
    queued = false;
    const limit = window.innerHeight * 0.88;
    pending.forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.top < limit || r.bottom < 0) { s.classList.add('visible'); pending.delete(s); }
    });
    if (pending.size === 0) {
      window.removeEventListener('scroll', queueSweep);
      window.removeEventListener('resize', queueSweep);
    }
  }
  function queueSweep() {
    // rAF never fires while the tab is hidden, and scroll events still can
    // (restored position, programmatic scrollTo) — sweep inline in that case.
    if (document.hidden) { sweep(); return; }
    if (queued) return;
    queued = true;
    requestAnimationFrame(sweep);
  }

  window.addEventListener('scroll', queueSweep, { passive: true });
  window.addEventListener('resize', queueSweep, { passive: true });
  // Synchronous first pass — rAF is paused in a background tab, so a queued
  // one would leave the page blank until it gains focus.
  sweep();
}

loadTeasers();
