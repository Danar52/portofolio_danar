import { supabase } from '../../supabase.js?v=20260721';

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

      // Info rows — label kiri / nilai kanan
      const infoRows = [
        { label: 'Tanggal Lahir', value: birthDate },
        { label: 'Usia',          value: `${age} tahun` },
        { label: 'Domisili',      value: p.city || '—' },
        { label: 'Email',         value: p.email ? `<a href="mailto:${p.email}">${p.email}</a>` : '—' },
        p.phone ? { label: 'WhatsApp', value: `<a href="tel:${p.phone}">+${String(p.phone).replace(/\D/g,'')}</a>` } : null,
        { label: 'Status',        value: `<span class="about-status"><span class="about-status-dot"></span>Mahasiswa Aktif</span>` },
        { label: 'Lama Belajar',  value: `${yearsLearning}+ tahun` },
      ].filter(Boolean);

      const infoRowsHtml = infoRows.map(r => `
        <div class="about-row">
          <span class="about-row-label">${r.label}</span>
          <span class="about-row-value">${r.value}</span>
        </div>`).join('');

      const socialLinksHtml = socials.map(s =>
        `<a href="${s.url}" target="_blank" class="about-social">${s.title}</a>`
      ).join('');

      const eduRowsHtml = eduList.map(e => `
        <div class="about-edu-row">
          <div class="about-edu-main">
            <p class="about-edu-school">${e.school_name}</p>
            <p class="about-edu-major">${e.major || ''}</p>
          </div>
          <span class="about-edu-year ${e.is_active ? 'now' : ''}">${e.year_start} — ${e.is_active ? 'Sekarang' : (e.year_end || '')}</span>
        </div>`).join('');

      el.innerHTML = `
        <div class="about">

          <!-- Intro -->
          <section class="about-intro">
            <div class="about-photo-wrap">${photoHtml}</div>
            <div class="about-intro-body">
              <p class="about-bio">${p.bio || ''}</p>
              <div class="about-intro-meta">
                <span>${p.full_name}</span>
                <span class="about-meta-sep" aria-hidden="true"></span>
                <span>${p.role || ''}</span>
                <span class="about-meta-sep" aria-hidden="true"></span>
                <span>${p.city || ''}</span>
              </div>
            </div>
          </section>

          <!-- Informasi Personal -->
          <section class="about-section">
            <span class="about-section-label">Informasi<br>Personal</span>
            <div class="about-section-body">${infoRowsHtml}</div>
          </section>

          <!-- Minat -->
          <section class="about-section">
            <span class="about-section-label">Minat &amp;<br>Ketertarikan</span>
            <div class="about-section-body">
              <div class="about-interests">${interestsHtml}</div>
            </div>
          </section>

          <!-- Pendidikan -->
          ${eduRowsHtml ? `
          <section class="about-section">
            <span class="about-section-label">Riwayat<br>Pendidikan</span>
            <div class="about-section-body">${eduRowsHtml}</div>
          </section>` : ''}

          <!-- Sosial -->
          ${socialLinksHtml ? `
          <section class="about-section">
            <span class="about-section-label">Temukan<br>Gw Di</span>
            <div class="about-section-body">
              <div class="about-socials">${socialLinksHtml}</div>
            </div>
          </section>` : ''}

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