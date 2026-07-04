import { supabase } from '../../supabase.js';

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
