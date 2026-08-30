import { supabase } from '../../supabase.js?v=a77a873f';

const PAGE_SLUGS = {
  '/': 'index',
  '/index.html': 'index',
  '/profil.html': 'profil',
  '/experience.html': 'experience',
  '/skills.html': 'skills',
  '/certification.html': 'certification',
  '/portfolio.html': 'portfolio',
  '/portfolio-detail.html': 'portfolio-detail',
  '/event.html': 'event',
  '/contact.html': 'contact',
};

export async function trackVisit() {
  try {
    const page = PAGE_SLUGS[location.pathname];
    if (!page) return; // unknown path (e.g. 404) — don't track
    await supabase.from('page_visits').insert({
      page,
      path: location.pathname,
      referrer: document.referrer || null,
    });
  } catch (_) {
    // tracking must never break the page
  }
}
