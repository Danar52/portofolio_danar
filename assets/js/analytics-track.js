// Raw fetch instead of the shared Supabase client: keepalive needs to be set
// on the request itself, and supabase-js gives no way to pass it through.
// keepalive lets the request survive the page unload that follows a nav
// click almost immediately — plain fetch gets cancelled mid-flight on that
// unload in Safari far more readily than in Chromium, which is why visits
// were going untracked when navigating page to page.
const SUPABASE_URL      = 'https://vdnysjewpqunxokscaan.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbnlzamV3cHF1bnhva3NjYWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjQ2MDcsImV4cCI6MjA4OTUwMDYwN30.GfnHPRuO8bDdfTJeOhLAV0gw54_PDGojQCrVPTzSA3g';

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
    await fetch(`${SUPABASE_URL}/rest/v1/page_visits`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        page,
        path: location.pathname,
        referrer: document.referrer || null,
      }),
    });
  } catch (_) {
    // tracking must never break the page
  }
}
