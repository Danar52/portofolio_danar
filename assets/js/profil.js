import { supabase } from '../../supabase.js';

    async function loadProfil() {
      const el = document.getElementById('profilContent');

      const [profRes, eduRes] = await Promise.all([
        supabase.from('profile').select('*').single(),
        supabase.from('education').select('*').order('sort_order')
      ]);

      if (profRes.error || !profRes.data) {
        el.innerHTML = `<div class="state-box"><i class="fas fa-triangle-exclamation"></i><p>Gagal memuat data profil.</p></div>`;
        return;
      }

      const p = profRes.data;
      const eduList = eduRes.data || [];

      // Hitung usia
      let age = '—';
      if (p.birth_date) {
        const birth = new Date(p.birth_date);
        const today = new Date();
        let a = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
        age = a;
      }

      const eduStart = eduList.length ? eduList[eduList.length - 1].year_start : null;
      const yearsLearning = eduStart ? (new Date().getFullYear() - eduStart) : '—';

      const birthDate = p.birth_date
        ? new Date(p.birth_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—';

      // Photo
      const photoHtml = p.photo_url
        ? `<img class="profil-photo" src="${p.photo_url}" alt="${p.full_name}">`
        : `<div class="profil-photo-placeholder">
             <span class="initials">${p.full_name.split(' ').map(n=>n[0]).slice(0,3).join('')}</span>
             <span class="photo-label">Photo</span>
           </div>`;

      // Socials — tanpa icon diganti font awesome tetap karena brand identity
      const socials = [
        { url: p.url_x,         icon: 'fab fa-x-twitter',   title: 'X' },
        { url: p.url_tiktok,    icon: 'fab fa-tiktok',      title: 'TikTok' },
        { url: p.url_instagram, icon: 'fab fa-instagram',   title: 'Instagram' },
        { url: p.url_linkedin,  icon: 'fab fa-linkedin-in', title: 'LinkedIn' },
        { url: p.url_github,    icon: 'fab fa-github',      title: 'GitHub' },
        { url: p.url_behance,   icon: 'fab fa-behance',     title: 'Behance' },
      ].filter(s => s.url);

      const socialsHtml = socials.map(s =>
        `<a href="${s.url}" target="_blank" class="profil-social-btn" title="${s.title}"><i class="${s.icon}"></i></a>`
      ).join('');

      // Kontak — dot pengganti icon
      const contacts = [
        p.email ? { text: p.email, href: `mailto:${p.email}` } : null,
        p.city  ? { text: p.city,  href: null }                : null,
        p.phone ? { text: `+${String(p.phone).replace(/\D/g,'')}`, href: `tel:${p.phone}` } : null,
      ].filter(Boolean);

      const contactsHtml = contacts.map(c =>
        c.href
          ? `<a href="${c.href}" class="profil-contact-item"><span class="contact-dot"></span><span class="profil-contact-text">${c.text}</span></a>`
          : `<div class="profil-contact-item"><span class="contact-dot"></span><span class="profil-contact-text">${c.text}</span></div>`
      ).join('');

      // Education
      const eduHtml = eduList.map(e => `
        <div class="edu-item">
          <div>
            <p class="edu-school">${e.school_name}</p>
            <p class="edu-jurusan">${e.major || ''}</p>
          </div>
          <span class="edu-tahun ${e.is_active ? '' : 'past'}">
            ${e.year_start}–${e.is_active ? 'Skrg' : (e.year_end || '')}
          </span>
        </div>`
      ).join('');

      // Interests — tanpa icon, pure text pill
      let interests = [
        { label: 'Web Development' },
        { label: 'UI/UX Design' },
        { label: 'Photography' },
        { label: 'Artificial Intelligence' },
        { label: 'Motion Graphics' },
        { label: 'Graphic Design' },
      ];
      if (p.interests) {
        try {
          const parsed = JSON.parse(p.interests);
          interests = parsed.map(i => ({ label: i.label || i }));
        } catch(_) {}
      }

      const interestsHtml = interests.map(i =>
        `<span class="interest-tag">${i.label}</span>`
      ).join('');

      el.innerHTML = `
        <div class="profil-wrapper">

          <!-- ═══ KIRI ═══ -->
          <div class="profil-left">
            <div class="profil-photo-wrap">${photoHtml}</div>
            <p class="profil-left-name">${p.full_name}</p>
            <p class="profil-left-role">${p.role || ''}</p>
            <div class="left-divider"></div>

            ${contactsHtml ? `<div class="profil-contact-list">${contactsHtml}</div>` : ''}
            ${socialsHtml ? `<div class="profil-socials">${socialsHtml}</div>` : ''}
            <div class="left-divider"></div>

            <div class="left-stats">
              <div class="left-stat-item">
                <span class="left-stat-value">${age}</span>
                <span class="left-stat-label">Usia (thn)</span>
              </div>
              <div class="left-stat-item">
                <span class="left-stat-value">${yearsLearning}+</span>
                <span class="left-stat-label">Thn Belajar</span>
              </div>
              <div class="left-stat-item">
                <span class="left-stat-value">${eduList.length}</span>
                <span class="left-stat-label">Pendidikan</span>
              </div>
            </div>
          </div>

          <!-- ═══ KANAN ═══ -->
          <div class="profil-right">

            <!-- Tentang Saya -->
            <div class="section-card">
              <span class="section-label">Tentang Saya</span>
              <p class="profil-bio">${p.bio || ''}</p>
            </div>

            <!-- Informasi Personal -->
            <div class="section-card">
              <span class="section-label">Informasi Personal</span>
              <div class="profil-info-grid">
                <div class="profil-info-item">
                  <p class="profil-info-label">Tanggal Lahir</p>
                  <p class="profil-info-value">${birthDate}</p>
                </div>
                <div class="profil-info-item">
                  <p class="profil-info-label">Domisili</p>
                  <p class="profil-info-value">${p.city || '—'}</p>
                </div>
                <div class="profil-info-item">
                  <p class="profil-info-label">Email</p>
                  <p class="profil-info-value"><a href="mailto:${p.email}">${p.email || '—'}</a></p>
                </div>
                <div class="profil-info-item">
                  <p class="profil-info-label">Status</p>
                  <p class="profil-info-value"><span class="status-badge">Mahasiswa Aktif</span></p>
                </div>
              </div>
            </div>

            <!-- Minat -->
            <div class="section-card">
              <span class="section-label">Minat &amp; Ketertarikan</span>
              <div class="interest-tags">${interestsHtml}</div>
            </div>

            <!-- Pendidikan -->
            ${eduHtml ? `
            <div class="section-card">
              <span class="section-label">Riwayat Pendidikan</span>
              <div class="edu-timeline">${eduHtml}</div>
            </div>` : ''}

          </div>
        </div>`;
    }

    loadProfil();

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