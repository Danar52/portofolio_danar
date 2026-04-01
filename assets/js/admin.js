pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── CONFIG ──────────────────────────────────────────────────
const SUPABASE_URL      = 'https://vdnysjewpqunxokscaan.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbnlzamV3cHF1bnhva3NjYWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjQ2MDcsImV4cCI6MjA4OTUwMDYwN30.GfnHPRuO8bDdfTJeOhLAV0gw54_PDGojQCrVPTzSA3g';

let db;
try {
  const { createClient } = supabase;
  db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.error('Gagal inisialisasi Supabase:', err);
  document.querySelector('.content').innerHTML = '<div style="text-align:center;padding:60px 24px;color:#f87171"><i class="fas fa-exclamation-triangle" style="font-size:40px;margin-bottom:16px;display:block"></i><p style="font-size:15px;font-weight:600">Gagal terhubung ke server</p><p style="font-size:13px;opacity:.7;margin-top:8px">Refresh halaman ini atau cek koneksi internet.</p></div>';
}

if (db) {
  db.auth.getSession().then(({ data }) => {
    if (!data.session) window.location.href = 'admin-login.html';
  });
}

// ── Mobile Sidebar Toggle ───────────────────────────────────
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('adminSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
}

if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    function showToast(msg, type='success') {
      const t = document.getElementById('toast');
      t.className = type;
      t.querySelector('i').className = `fas ${type==='success'?'fa-check-circle':'fa-circle-exclamation'}`;
      document.getElementById('toastText').textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3500);
    }
    function openModal(title, bodyHTML, onSave) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML = bodyHTML;
      document.getElementById('modalOverlay').classList.add('open');
      document.getElementById('btnSave').onclick = onSave;
    }
    function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
    function confirmDelete(msg, onConfirm) {
      document.getElementById('confirmText').textContent = msg;
      document.getElementById('confirmOverlay').classList.add('open');
      document.getElementById('confirmOk').onclick = () => {
        document.getElementById('confirmOverlay').classList.remove('open');
        onConfirm();
      };
    }
    document.getElementById('modalClose').onclick = closeModal;
    document.getElementById('btnCancel').onclick  = closeModal;
    document.getElementById('confirmCancel').onclick = () => document.getElementById('confirmOverlay').classList.remove('open');
    document.getElementById('modalOverlay').onclick  = e => { if(e.target===document.getElementById('modalOverlay')) closeModal(); };

    async function uploadFile(file, folder) {
      const ext  = file.name.split('.').pop().toLowerCase();
      const path = `${folder}/${Date.now()}.${ext}`;
      const { error } = await db.storage.from('portfolio-images').upload(path, file, { upsert: true });
      if (error) { showToast('Gagal upload: '+error.message, 'error'); return null; }
      return db.storage.from('portfolio-images').getPublicUrl(path).data.publicUrl;
    }
    async function generatePDFThumbnail(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async e => {
          try {
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(e.target.result) }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width; canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            canvas.toBlob(resolve, 'image/png', 0.92);
          } catch(err) { reject(err); }
        };
        reader.readAsArrayBuffer(file);
      });
    }
    async function uploadCertFile(file, progressEl) {
      const isPDFFile = file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf');
      const ts = Date.now();
      if (progressEl) { progressEl.classList.add('show'); progressEl.querySelector('span').textContent = isPDFFile?'Mengupload PDF...':'Mengupload gambar...'; }
      const fileUrl = await uploadFile(file, 'certs');
      if (!fileUrl) { if(progressEl) progressEl.classList.remove('show'); return null; }
      let thumbnailUrl = fileUrl;
      if (isPDFFile) {
        if (progressEl) progressEl.querySelector('span').textContent = 'Membuat thumbnail dari PDF...';
        try {
          const blob = await generatePDFThumbnail(file);
          const thumbPath = `certs/thumb_${ts}.png`;
          const { error } = await db.storage.from('portfolio-images').upload(thumbPath, blob, { upsert:true, contentType:'image/png' });
          thumbnailUrl = error ? null : db.storage.from('portfolio-images').getPublicUrl(thumbPath).data.publicUrl;
        } catch(err) { console.warn('Gagal buat thumbnail:', err); thumbnailUrl = null; }
      }
      if (progressEl) progressEl.classList.remove('show');
      return { fileUrl, thumbnailUrl };
    }
    function isPDF(url) { return url && url.toLowerCase().includes('.pdf'); }
    function renderTablePreview(c) {
      if (c.thumbnail_url) return `<img class="tbl-img" src="${c.thumbnail_url}" alt="thumb">`;
      if (c.image_url && !isPDF(c.image_url)) return `<img class="tbl-img" src="${c.image_url}" alt="cert">`;
      if (c.image_url && isPDF(c.image_url))  return `<a href="${c.image_url}" target="_blank" class="tbl-pdf"><i class="fas fa-file-pdf"></i><span>PDF</span></a>`;
      return `<div class="tbl-img-placeholder"><i class="fas fa-certificate"></i></div>`;
    }
    function renderCurrentFileInfo(c) {
      if (!c?.image_url) return '';
      const fileName = c.image_url.split('/').pop();
      const isFilePDF = isPDF(c.image_url);
      return `<div class="current-file-preview">
          <i class="file-icon ${isFilePDF?'pdf-icon fas fa-file-pdf':'fas fa-image'}"></i>
          <div class="file-info"><p class="file-name">${fileName}</p><span class="file-type-badge ${isFilePDF?'pdf':''}">${isFilePDF?'PDF':'Gambar'}</span></div>
          <a href="${c.image_url}" target="_blank"><i class="fas fa-external-link-alt"></i> Buka</a></div>
        ${c.thumbnail_url?`<img src="${c.thumbnail_url}" style="width:100%;border-radius:8px;max-height:140px;object-fit:cover;margin-bottom:8px">`:''}
        <p class="form-hint" style="margin-bottom:8px">Upload file baru untuk mengganti</p>`;
    }

    // ══ NAVIGATION ══
    const pageMap = {
      profile:        { title:'Edit <span>Profil</span>',           load:loadProfile,        hasAdd:false },
      skills:         { title:'Manage <span>Skills</span>',         load:loadSkills,         hasAdd:true  },
      portfolio:      { title:'Manage <span>Portfolio</span>',      load:loadPortfolio,      hasAdd:true  },
      experience:     { title:'Manage <span>Experience</span>',     load:loadExperience,     hasAdd:true  },
      events:         { title:'Manage <span>Event / Org</span>',    load:loadEvents,         hasAdd:true  },
      certifications: { title:'Manage <span>Certification</span>',  load:loadCertifications, hasAdd:true  },
    };
    let currentPage = 'skills';

    document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
      link.addEventListener('click', () => {
        currentPage = link.dataset.page;
        document.querySelectorAll('.sidebar-link[data-page]').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${currentPage}`).classList.add('active');
        document.getElementById('topbarTitle').innerHTML = pageMap[currentPage].title;
        document.getElementById('btnAddNew').style.display      = pageMap[currentPage].hasAdd ? '' : 'none';
        document.getElementById('btnSaveProfile').style.display = currentPage==='profile' ? '' : 'none';
        closeSidebar();
        pageMap[currentPage].load();
      });
    });
    document.getElementById('btnAddNew').addEventListener('click', () => {
      ({skills:openSkillForm,portfolio:openPortfolioForm,experience:openExpForm,events:openEventForm,certifications:openCertForm})[currentPage]?.();
    });

    // ══ PORTFOLIO ══
    const PORTFOLIO_TYPES = [
      {val:'web',      label:'Web Dev'},
      {val:'design',   label:'Design'},
      {val:'ui',       label:'UI/UX'},
      {val:'branding', label:'Branding'},
      {val:'motion',   label:'Motion'},
      {val:'other',    label:'Lainnya'},
    ];

    async function loadPortfolio() {
      const el = document.getElementById('portfolioContent');
      el.innerHTML = '<div class="loading"><i class="fas fa-circle-notch"></i></div>';
      const { data, error } = await db.from('portfolio').select('*').order('sort_order').order('created_at', { ascending: false });
      if (error||!data) { el.innerHTML='<p style="color:red;padding:20px">Gagal load data.</p>'; return; }

      const typeLabel = Object.fromEntries(PORTFOLIO_TYPES.map(t=>[t.val,t.label]));
      const typeBadgeCls = { web:'badge-web', design:'badge-design', ui:'badge-ui', branding:'badge-branding', motion:'badge-motion', other:'badge-other' };

      el.innerHTML = data.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Preview</th><th>Judul</th><th>Tipe</th><th>Tahun</th><th>Status</th><th style="width:110px">Aksi</th></tr></thead>
        <tbody>${data.map(p=>`<tr>
          <td>${p.thumbnail_url
            ? `<img class="tbl-img" src="${p.thumbnail_url}" alt="${p.title}">`
            : `<div class="tbl-img-placeholder"><i class="fas fa-image"></i></div>`}</td>
          <td style="font-weight:600;color:var(--heading);max-width:200px">
            <p style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.title}</p>
            ${p.is_featured?'<span style="font-family:var(--font-nav);font-size:10px;color:#b5590a;font-weight:700">★ Featured</span>':''}
          </td>
          <td><span class="badge ${typeBadgeCls[p.type]||'badge-other'}">${typeLabel[p.type]||p.type}</span></td>
          <td style="font-size:12px;opacity:.7">${p.year||'—'}</td>
          <td><span class="badge ${p.is_published?'badge-aktif':'badge-selesai'}">${p.is_published?'Published':'Draft'}</span></td>
          <td><div class="td-actions">
            <button class="btn btn-outline btn-sm" onclick="openPortfolioForm(${JSON.stringify(p).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deletePortfolio(${p.id},'${p.title.replace(/'/g,'\\\'').replace(/"/g,'&quot;')}')"><i class="fas fa-trash"></i></button>
          </div></td></tr>`).join('')}
        </tbody></table></div>`
        : '<div class="empty-state"><i class="fas fa-briefcase-clock"></i><p>Belum ada portfolio.</p></div>';
    }

    function openPortfolioForm(data=null) {
      const isEdit = !!data?.id;
      const tagsArr = data?.tags || [];
      const typeOptions = PORTFOLIO_TYPES.map(t =>
        `<option value="${t.val}" ${data?.type===t.val?'selected':''}>${t.label}</option>`
      ).join('');

      openModal(isEdit?'Edit Portfolio':'Tambah Portfolio', `
        <div class="form-group"><label class="form-label">Judul Project</label>
          <input class="form-input" id="f_title" value="${data?.title||''}" placeholder="cth: Redesign App E-Commerce"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Tipe</label>
            <select class="form-select" id="f_type">${typeOptions}</select></div>
          <div class="form-group"><label class="form-label">Tahun</label>
            <input class="form-input" id="f_year" value="${data?.year||''}" placeholder="cth: 2024"/></div>
        </div>
        <div class="form-group"><label class="form-label">Deskripsi</label>
          <textarea class="form-textarea" id="f_desc" placeholder="Ceritakan project ini...">${data?.description||''}</textarea></div>

        <div class="form-group"><label class="form-label">Tags <span style="opacity:.4">(Enter/koma untuk tambah)</span></label>
          <div class="tags-input-wrap" id="tagsWrap">
            ${tagsArr.map(t=>`<span class="tag-chip">${t}<button onclick="removeTag(this)">✕</button></span>`).join('')}
            <input class="tags-input" id="tagInput" placeholder="cth: Figma, Laravel..."/>
          </div></div>

        <div class="form-group"><label class="form-label">Thumbnail / Cover</label>
          ${data?.thumbnail_url?`<img src="${data.thumbnail_url}" style="width:100%;border-radius:8px;max-height:140px;object-fit:cover;margin-bottom:8px"><p class="form-hint" style="margin-bottom:8px">Upload baru untuk mengganti</p>`:''}
          <div class="file-upload-area"><input type="file" id="f_thumb" accept="image/*"/>
            <i class="fas fa-cloud-upload-alt"></i><p>Klik untuk upload thumbnail</p><p class="file-type-hint">JPG, PNG, WEBP</p>
          </div></div>

        <p style="font-family:var(--font-nav);font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)">Link Terkait <span style="opacity:.4;font-weight:400;text-transform:none;letter-spacing:0">(semua opsional)</span></p>
        <div class="form-row">
          <div class="form-group"><label class="form-label"><i class="fas fa-external-link-alt" style="color:var(--accent);margin-right:5px"></i>URL Live / Demo</label>
            <input class="form-input" id="f_live" value="${data?.url_live||''}" placeholder="https://..."/></div>
          <div class="form-group"><label class="form-label"><i class="fab fa-github" style="color:var(--accent);margin-right:5px"></i>GitHub</label>
            <input class="form-input" id="f_github" value="${data?.url_github||''}" placeholder="https://github.com/..."/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label"><i class="fab fa-behance" style="color:var(--accent);margin-right:5px"></i>Behance</label>
            <input class="form-input" id="f_behance" value="${data?.url_behance||''}" placeholder="https://behance.net/..."/></div>
          <div class="form-group"><label class="form-label"><i class="fab fa-figma" style="color:var(--accent);margin-right:5px"></i>Figma</label>
            <input class="form-input" id="f_figma" value="${data?.url_figma||''}" placeholder="https://figma.com/..."/></div>
        </div>

        <div class="form-row">
          <div class="form-group"><label class="form-label">Sort Order</label>
            <input class="form-input" id="f_sort" type="number" value="${data?.sort_order||0}"/>
            <p class="form-hint">Urutan tampil (kecil = duluan)</p></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:4px">
          <div class="toggle-wrap">
            <label class="toggle"><input type="checkbox" id="f_featured" ${data?.is_featured?'checked':''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">Featured (tampil lebih menonjol)</span>
          </div>
          <div class="toggle-wrap">
            <label class="toggle"><input type="checkbox" id="f_published" ${data?.is_published!==false?'checked':''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">Published (tampil di halaman publik)</span>
          </div>
        </div>
      `, async () => {
        const btnSave = document.getElementById('btnSave');
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fas fa-circle-notch" style="animation:spin .8s linear infinite"></i> Menyimpan...';

        let thumbnailUrl = data?.thumbnail_url || null;
        const thumbFile = document.getElementById('f_thumb').files[0];
        if (thumbFile) {
          thumbnailUrl = await uploadFile(thumbFile, 'portfolio');
          if (!thumbnailUrl) { btnSave.disabled=false; btnSave.innerHTML='<i class="fas fa-floppy-disk"></i> Simpan'; return; }
        }

        const tags = [...document.querySelectorAll('#tagsWrap .tag-chip')].map(c=>c.textContent.replace('✕','').trim());
        const payload = {
          title:         document.getElementById('f_title').value.trim(),
          type:          document.getElementById('f_type').value,
          year:          document.getElementById('f_year').value.trim() || null,
          description:   document.getElementById('f_desc').value.trim(),
          tags,
          thumbnail_url: thumbnailUrl,
          url_live:      document.getElementById('f_live').value.trim() || null,
          url_github:    document.getElementById('f_github').value.trim() || null,
          url_behance:   document.getElementById('f_behance').value.trim() || null,
          url_figma:     document.getElementById('f_figma').value.trim() || null,
          sort_order:    parseInt(document.getElementById('f_sort').value) || 0,
          is_featured:   document.getElementById('f_featured').checked,
          is_published:  document.getElementById('f_published').checked,
          updated_at:    new Date().toISOString(),
        };

        if (!payload.title) { showToast('Judul tidak boleh kosong','error'); btnSave.disabled=false; btnSave.innerHTML='<i class="fas fa-floppy-disk"></i> Simpan'; return; }

        const { error } = isEdit
          ? await db.from('portfolio').update(payload).eq('id', data.id)
          : await db.from('portfolio').insert(payload);

        btnSave.disabled=false; btnSave.innerHTML='<i class="fas fa-floppy-disk"></i> Simpan';
        if (error) { showToast('Gagal menyimpan: '+error.message,'error'); return; }
        closeModal(); showToast(isEdit?'Portfolio diperbarui!':'Portfolio ditambahkan!'); loadPortfolio();
      });

      setTimeout(() => {
        document.getElementById('tagInput')?.addEventListener('keydown', e => {
          if (e.key==='Enter'||e.key===',') {
            e.preventDefault();
            const val = e.target.value.trim().replace(/,$/,'');
            if (!val) return;
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = `${val}<button onclick="removeTag(this)">✕</button>`;
            document.getElementById('tagsWrap').insertBefore(chip, e.target);
            e.target.value = '';
          }
        });
      }, 50);
    }

    async function deletePortfolio(id, title) {
      confirmDelete(`Hapus portfolio "${title}"?`, async () => {
        const { error } = await db.from('portfolio').delete().eq('id', id);
        if (error) { showToast('Gagal hapus','error'); return; }
        showToast('Portfolio dihapus!'); loadPortfolio();
      });
    }

    // ══ PROFILE ══
    let profileId = null;

    async function loadProfile() {
      const el = document.getElementById('profileContent');
      el.innerHTML = '<div class="loading"><i class="fas fa-circle-notch"></i></div>';
      const { data, error } = await db.from('profile').select('*').single();
      if (error||!data) { el.innerHTML='<p style="color:red;padding:20px">Gagal load data profil.</p>'; return; }
      profileId = data.id;
      const initials = data.full_name?.split(' ').map(n=>n[0]).slice(0,2).join('')||'ED';
      const photoHtml = data.photo_url
        ? `<img class="profile-photo-preview" id="photoPreview" src="${data.photo_url}" alt="Foto">`
        : `<div class="profile-photo-placeholder" id="photoPreview"><span>${initials}</span></div>`;

      el.innerHTML = `
        <div class="profile-edit-wrap">
          <div class="profile-photo-card">
            ${photoHtml}
            <p class="profile-photo-name" id="previewName">${data.full_name||'—'}</p>
            <p class="profile-photo-role" id="previewRole">${data.role||''}</p>
            <label class="photo-upload-btn">
              <i class="fas fa-camera"></i> Ganti Foto
              <input type="file" id="photoFileInput" accept="image/*" onchange="handlePhotoChange(this)"/>
            </label>
            <div class="photo-saving-overlay" id="photoSavingOverlay">
              <i class="fas fa-circle-notch"></i><span>Mengupload foto...</span>
            </div>
            ${data.photo_url?`<button class="btn btn-danger btn-sm" style="width:100%;justify-content:center" onclick="removePhoto()"><i class="fas fa-trash"></i> Hapus Foto</button>`:''}
          </div>
          <div class="profile-form-card">
            <p class="form-section-title">Informasi Utama</p>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Nama Lengkap</label>
                <input class="form-input" id="p_name" value="${data.full_name||''}" oninput="document.getElementById('previewName').textContent=this.value||'—'"/></div>
              <div class="form-group"><label class="form-label">Role / Jabatan</label>
                <input class="form-input" id="p_role" value="${data.role||''}" placeholder="cth: Informatics Engineering Student" oninput="document.getElementById('previewRole').textContent=this.value"/></div>
            </div>
            <div class="form-group"><label class="form-label">Bio / Tentang Saya</label>
              <textarea class="form-textarea" id="p_bio" rows="3">${data.bio||''}</textarea></div>
            <p class="form-section-title">Informasi Personal</p>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Tanggal Lahir</label>
                <input class="form-input" id="p_birth" type="date" value="${data.birth_date||''}"/></div>
              <div class="form-group"><label class="form-label">Kota / Domisili</label>
                <input class="form-input" id="p_city" value="${data.city||''}" placeholder="cth: Bekasi"/></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Email</label>
                <input class="form-input" id="p_email" type="email" value="${data.email||''}" placeholder="email@contoh.com"/></div>
              <div class="form-group"><label class="form-label">Nomor HP <span style="opacity:.4">(opsional)</span></label>
                <input class="form-input" id="p_phone" value="${data.phone||''}" placeholder="+62 ..."/></div>
            </div>
            <p class="form-section-title">Media Sosial</p>
            <div class="form-row">
              <div class="form-group"><label class="form-label"><i class="fab fa-linkedin-in" style="color:var(--accent);margin-right:6px"></i>LinkedIn</label>
                <input class="form-input" id="p_linkedin" value="${data.url_linkedin||''}" placeholder="https://linkedin.com/in/..."/></div>
              <div class="form-group"><label class="form-label"><i class="fab fa-github" style="color:var(--accent);margin-right:6px"></i>GitHub</label>
                <input class="form-input" id="p_github" value="${data.url_github||''}" placeholder="https://github.com/..."/></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label"><i class="fab fa-instagram" style="color:var(--accent);margin-right:6px"></i>Instagram</label>
                <input class="form-input" id="p_instagram" value="${data.url_instagram||''}" placeholder="https://instagram.com/..."/></div>
              <div class="form-group"><label class="form-label"><i class="fab fa-x-twitter" style="color:var(--accent);margin-right:6px"></i>X / Twitter</label>
                <input class="form-input" id="p_x" value="${data.url_x||''}" placeholder="https://x.com/..."/></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label"><i class="fab fa-tiktok" style="color:var(--accent);margin-right:6px"></i>TikTok</label>
                <input class="form-input" id="p_tiktok" value="${data.url_tiktok||''}" placeholder="https://tiktok.com/@..."/></div>
              <div class="form-group"><label class="form-label"><i class="fab fa-behance" style="color:var(--accent);margin-right:6px"></i>Behance</label>
                <input class="form-input" id="p_behance" value="${data.url_behance||''}" placeholder="https://behance.net/..."/></div>
            </div>
          </div>
        </div>`;
      document.getElementById('btnSaveProfile').onclick = saveProfile;
    }

    async function handlePhotoChange(input) {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const el = document.getElementById('photoPreview');
        if (el.tagName==='IMG') { el.src = e.target.result; }
        else { const img=document.createElement('img'); img.className='profile-photo-preview'; img.id='photoPreview'; img.src=e.target.result; el.replaceWith(img); }
      };
      reader.readAsDataURL(file);
      const overlay = document.getElementById('photoSavingOverlay');
      overlay.classList.add('show');
      const url = await uploadFile(file, 'profile');
      if (!url) { overlay.classList.remove('show'); return; }
      const { error } = await db.from('profile').update({ photo_url: url }).eq('id', profileId);
      overlay.classList.remove('show');
      if (error) { showToast('Gagal menyimpan foto','error'); return; }
      showToast('Foto profil berhasil diperbarui! 📸');
    }

    async function removePhoto() {
      const { error } = await db.from('profile').update({ photo_url: null }).eq('id', profileId);
      if (error) { showToast('Gagal hapus foto','error'); return; }
      showToast('Foto profil dihapus!'); loadProfile();
    }

    async function saveProfile() {
      const btn = document.getElementById('btnSaveProfile');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch" style="animation:spin .8s linear infinite"></i> Menyimpan...';
      const payload = {
        full_name:     document.getElementById('p_name').value.trim(),
        role:          document.getElementById('p_role').value.trim(),
        bio:           document.getElementById('p_bio').value.trim(),
        birth_date:    document.getElementById('p_birth').value||null,
        city:          document.getElementById('p_city').value.trim(),
        email:         document.getElementById('p_email').value.trim(),
        phone:         document.getElementById('p_phone').value.trim()||null,
        url_linkedin:  document.getElementById('p_linkedin').value.trim()||null,
        url_github:    document.getElementById('p_github').value.trim()||null,
        url_instagram: document.getElementById('p_instagram').value.trim()||null,
        url_x:         document.getElementById('p_x').value.trim()||null,
        url_tiktok:    document.getElementById('p_tiktok').value.trim()||null,
        url_behance:   document.getElementById('p_behance').value.trim()||null,
        updated_at:    new Date().toISOString(),
      };
      const { error } = await db.from('profile').update(payload).eq('id', profileId);
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-floppy-disk"></i> Simpan Profil';
      if (error) { showToast('Gagal menyimpan: '+error.message,'error'); return; }
      showToast('Profil berhasil disimpan!');
    }

    // ══ SKILLS ══
    let existingCategories = [];
    async function loadSkills() {
      const el = document.getElementById('skillsContent');
      el.innerHTML = '<div class="loading"><i class="fas fa-circle-notch"></i></div>';
      const { data, error } = await db.from('skills').select('*').order('category').order('sort_order');
      if (error||!data) { el.innerHTML='<p style="color:red;padding:20px">Gagal load data.</p>'; return; }
      existingCategories = [...new Set(data.map(s=>s.category).filter(Boolean))];
      const groups = {};
      data.forEach(s => { if(!groups[s.category]) groups[s.category]=[]; groups[s.category].push(s); });
      let html = '';
      for (const [cat, items] of Object.entries(groups)) {
        html += `<div style="margin-bottom:28px">
          <h3 style="font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--heading);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)">${cat}</h3>
          <div class="table-wrap"><table>
            <thead><tr><th>Skill</th><th>Persentase</th><th style="width:100px">Aksi</th></tr></thead>
            <tbody>${items.map(s=>`<tr>
              <td>${s.skill_name}</td>
              <td><div class="pct-wrap"><div class="pct-bar"><div class="pct-fill" style="width:${s.percentage}%"></div></div><span class="pct-num">${s.percentage}%</span></div></td>
              <td><div class="td-actions">
                <button class="btn btn-outline btn-sm" onclick="openSkillForm(${JSON.stringify(s).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteSkill(${s.id},'${s.skill_name}')"><i class="fas fa-trash"></i></button>
              </div></td></tr>`).join('')}
            </tbody></table></div></div>`;
      }
      el.innerHTML = html || '<div class="empty-state"><i class="fas fa-list-check"></i><p>Belum ada skill.</p></div>';
    }
    function openSkillForm(data=null) {
      const isEdit = !!data?.id;
      const datalistOptions = existingCategories.map(c=>`<option value="${c}">`).join('');
      openModal(isEdit?'Edit Skill':'Tambah Skill', `
        <datalist id="categoryList">${datalistOptions}</datalist>
        <div class="form-group"><label class="form-label">Kategori</label>
          <input class="form-input" id="f_cat" list="categoryList" placeholder="cth: Frontend, Backend, Design..." value="${data?.category||''}" autocomplete="off"/>
          <p class="form-hint">Ketik bebas. Kategori yang sudah ada muncul sebagai saran.</p></div>
        <div class="form-group"><label class="form-label">Nama Skill</label>
          <input class="form-input" id="f_name" placeholder="cth: PHP" value="${data?.skill_name||''}"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Sort Order</label>
            <input class="form-input" id="f_sort" type="number" value="${data?.sort_order||0}"/>
            <p class="form-hint">Urutan dalam kategori (kecil = duluan)</p></div>
          <div class="form-group"><label class="form-label">Persentase: <span id="pctLabel" style="color:var(--accent);font-weight:700">${data?.percentage||70}%</span></label>
            <div class="range-wrap" style="margin-top:8px">
              <input type="range" id="f_pct" min="0" max="100" value="${data?.percentage||70}" oninput="document.getElementById('pctLabel').textContent=this.value+'%';document.getElementById('pctDisp').textContent=this.value+'%'"/>
              <span class="range-val" id="pctDisp">${data?.percentage||70}%</span></div></div>
        </div>
      `, async () => {
        const catVal = document.getElementById('f_cat').value.trim();
        if (!catVal) { showToast('Kategori tidak boleh kosong','error'); return; }
        const payload = { category:catVal, category_icon:'fas fa-star', skill_name:document.getElementById('f_name').value.trim(), skill_icon:'', percentage:parseInt(document.getElementById('f_pct').value), sort_order:parseInt(document.getElementById('f_sort').value)||0 };
        if (!payload.skill_name) { showToast('Nama skill tidak boleh kosong','error'); return; }
        const {error} = isEdit?await db.from('skills').update(payload).eq('id',data.id):await db.from('skills').insert(payload);
        if (error) { showToast('Gagal menyimpan: '+error.message,'error'); return; }
        closeModal(); showToast(isEdit?'Skill diperbarui!':'Skill ditambahkan!'); loadSkills();
      });
    }
    async function deleteSkill(id,name) {
      confirmDelete(`Hapus skill "${name}"?`, async () => {
        const {error} = await db.from('skills').delete().eq('id',id);
        if (error) { showToast('Gagal hapus','error'); return; }
        showToast('Skill dihapus!'); loadSkills();
      });
    }

    // ══ EXPERIENCE ══
    async function loadExperience() {
      const el = document.getElementById('expContent');
      el.innerHTML = '<div class="loading"><i class="fas fa-circle-notch"></i></div>';
      const {data,error} = await db.from('experience').select('*').order('sort_order');
      if (error||!data) { el.innerHTML='<p style="color:red;padding:20px">Gagal load data.</p>'; return; }
      el.innerHTML = data.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Jabatan</th><th>Perusahaan</th><th>Periode</th><th>Status</th><th style="width:100px">Aksi</th></tr></thead>
        <tbody>${data.map(e=>`<tr>
          <td style="font-weight:600;color:var(--heading)">${e.job_title}</td><td>${e.company}</td>
          <td style="font-size:12px;opacity:.7">${e.period_start} — ${e.period_end||'Sekarang'}</td>
          <td><span class="badge ${e.is_active?'badge-aktif':'badge-selesai'}">${e.is_active?'Aktif':'Selesai'}</span></td>
          <td><div class="td-actions">
            <button class="btn btn-outline btn-sm" onclick="openExpForm(${JSON.stringify(e).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteExp(${e.id},'${e.job_title.replace(/'/g,'\\\'')}')" ><i class="fas fa-trash"></i></button>
          </div></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty-state"><i class="fas fa-briefcase"></i><p>Belum ada experience.</p></div>';
    }
    function openExpForm(data=null) {
      const isEdit=!!data?.id, tagsArr=data?.tags||[];
      openModal(isEdit?'Edit Experience':'Tambah Experience', `
        <div class="form-group"><label class="form-label">Nama Jabatan / Posisi</label><input class="form-input" id="f_title" value="${data?.job_title||''}" placeholder="cth: Web Developer Intern"/></div>
        <div class="form-group"><label class="form-label">Perusahaan / Instansi</label><input class="form-input" id="f_company" value="${data?.company||''}" placeholder="cth: PT. ABC"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Periode Mulai</label><input class="form-input" id="f_start" value="${data?.period_start||''}" placeholder="cth: Januari 2024"/></div>
          <div class="form-group" id="f_end_wrap" style="${data?.is_active?'display:none':''}"><label class="form-label">Periode Akhir</label><input class="form-input" id="f_end" value="${data?.is_active?'':(data?.period_end||'')}" placeholder="cth: Maret 2024"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Durasi</label><input class="form-input" id="f_dur" value="${data?.duration||''}" placeholder="cth: 6 bln"/></div>
          <div class="form-group"><label class="form-label">Sort Order</label><input class="form-input" id="f_sort" type="number" value="${data?.sort_order||0}"/></div>
        </div>
        <div class="form-group"><label class="form-label">Deskripsi</label>
          <textarea class="form-textarea" id="f_desc">${data?.description||''}</textarea>
          <p class="form-hint">Awali tiap poin dengan "- " agar tampil sebagai bullet point</p></div>
        <div class="form-group"><label class="form-label">Tags <span style="opacity:.4">(Enter/koma untuk tambah)</span></label>
          <div class="tags-input-wrap" id="tagsWrap">
            ${tagsArr.map(t=>`<span class="tag-chip">${t}<button onclick="removeTag(this)">✕</button></span>`).join('')}
            <input class="tags-input" id="tagInput" placeholder="cth: PHP"/>
          </div></div>
        <div class="form-group"><div class="toggle-wrap">
          <label class="toggle"><input type="checkbox" id="f_active" ${data?.is_active?'checked':''}><span class="toggle-slider"></span></label>
          <span class="toggle-label">Masih aktif / sedang berlangsung</span>
        </div></div>
      `, async () => {
        const isActive=document.getElementById('f_active').checked;
        const tags=[...document.querySelectorAll('#tagsWrap .tag-chip')].map(c=>c.textContent.replace('✕','').trim());
        const payload={job_title:document.getElementById('f_title').value,company:document.getElementById('f_company').value,period_start:document.getElementById('f_start').value,period_end:isActive?'Saat Ini':(document.getElementById('f_end').value||null),duration:document.getElementById('f_dur').value,description:document.getElementById('f_desc').value,tags,is_active:isActive,sort_order:parseInt(document.getElementById('f_sort').value)||0};
        const {error}=isEdit?await db.from('experience').update(payload).eq('id',data.id):await db.from('experience').insert(payload);
        if(error){showToast('Gagal menyimpan','error');return;}
        closeModal();showToast(isEdit?'Experience diperbarui!':'Experience ditambahkan!');loadExperience();
      });
      setTimeout(()=>{
        document.getElementById('f_active')?.addEventListener('change',function(){document.getElementById('f_end_wrap').style.display=this.checked?'none':'block';if(this.checked)document.getElementById('f_end').value='';});
        document.getElementById('tagInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();const val=e.target.value.trim().replace(/,$/,'');if(!val)return;const chip=document.createElement('span');chip.className='tag-chip';chip.innerHTML=`${val}<button onclick="removeTag(this)">✕</button>`;document.getElementById('tagsWrap').insertBefore(chip,e.target);e.target.value='';}});
      },50);
    }
    function removeTag(btn){btn.parentElement.remove();}
    async function deleteExp(id,name){confirmDelete(`Hapus experience "${name}"?`,async()=>{const{error}=await db.from('experience').delete().eq('id',id);if(error){showToast('Gagal hapus','error');return;}showToast('Experience dihapus!');loadExperience();});}

    // ══ EVENTS ══
    async function loadEvents() {
      const el=document.getElementById('eventsContent');
      el.innerHTML='<div class="loading"><i class="fas fa-circle-notch"></i></div>';
      const{data,error}=await db.from('events').select('*').order('sort_order');
      if(error||!data){el.innerHTML='<p style="color:red;padding:20px">Gagal load data.</p>';return;}
      const typeBadge={org:'badge-org',event:'badge-event',comp:'badge-comp'};
      const typeLabel={org:'Organisasi',event:'Event',comp:'Kompetisi'};
      el.innerHTML=data.length?`<div class="table-wrap"><table>
        <thead><tr><th>Foto</th><th>Nama Kegiatan</th><th>Tipe</th><th>Peran</th><th>Periode</th><th style="width:100px">Aksi</th></tr></thead>
        <tbody>${data.map(e=>`<tr>
          <td>${e.image_url?`<img class="tbl-img" src="${e.image_url}" alt="${e.name}">`:`<div class="tbl-img-placeholder"><i class="fas fa-image"></i></div>`}</td>
          <td style="font-weight:600;color:var(--heading)">${e.name}</td>
          <td><span class="badge ${typeBadge[e.type]}">${typeLabel[e.type]}</span></td>
          <td style="font-size:12px">${e.role||'-'}</td>
          <td style="font-size:12px;opacity:.7">${e.period||'-'}</td>
          <td><div class="td-actions">
            <button class="btn btn-outline btn-sm" onclick="openEventForm(${JSON.stringify(e).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteEvent(${e.id},'${e.name.replace(/'/g,'\\\'')}')" ><i class="fas fa-trash"></i></button>
          </div></td></tr>`).join('')}
        </tbody></table></div>`:'<div class="empty-state"><i class="fas fa-calendar-days"></i><p>Belum ada event.</p></div>';
    }
    function openEventForm(data=null){
      const isEdit=!!data?.id;
      openModal(isEdit?'Edit Event / Org':'Tambah Event / Org',`
        <div class="form-group"><label class="form-label">Tipe</label>
          <select class="form-select" id="f_type"><option value="org" ${data?.type==='org'?'selected':''}>Organisasi</option><option value="event" ${data?.type==='event'?'selected':''}>Event</option><option value="comp" ${data?.type==='comp'?'selected':''}>Kompetisi</option></select></div>
        <div class="form-group"><label class="form-label">Nama Kegiatan</label><input class="form-input" id="f_name" value="${data?.name||''}" placeholder="cth: HMTI UPB"/></div>
        <div class="form-group"><label class="form-label">Peran / Posisi</label><input class="form-input" id="f_role" value="${data?.role||''}" placeholder="cth: Kepala Divisi"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Periode</label><input class="form-input" id="f_period" value="${data?.period||''}" placeholder="cth: 2023 — 2024"/></div>
          <div class="form-group"><label class="form-label">Lokasi</label><input class="form-input" id="f_loc" value="${data?.location||''}" placeholder="cth: Bekasi / Online"/></div>
        </div>
        <div class="form-group"><label class="form-label">Deskripsi</label><textarea class="form-textarea" id="f_desc">${data?.description||''}</textarea></div>
        <div class="form-group"><label class="form-label">Foto Kegiatan</label>
          ${data?.image_url?`<img src="${data.image_url}" style="width:100%;border-radius:8px;max-height:140px;object-fit:cover;margin-bottom:8px"><p class="form-hint" style="margin-bottom:8px">Upload baru untuk mengganti</p>`:''}
          <div class="file-upload-area"><input type="file" id="f_img" accept="image/*"/><i class="fas fa-cloud-upload-alt"></i><p>Klik untuk upload foto</p><p class="file-type-hint">JPG, PNG, WEBP</p></div></div>
        <div class="form-group"><label class="form-label">Sort Order</label><input class="form-input" id="f_sort" type="number" value="${data?.sort_order||0}"/></div>
      `,async()=>{
        let imageUrl=data?.image_url||null;
        const imgFile=document.getElementById('f_img').files[0];
        if(imgFile){imageUrl=await uploadFile(imgFile,'events');if(!imageUrl)return;}
        const payload={type:document.getElementById('f_type').value,name:document.getElementById('f_name').value,role:document.getElementById('f_role').value,period:document.getElementById('f_period').value,location:document.getElementById('f_loc').value,description:document.getElementById('f_desc').value,image_url:imageUrl,sort_order:parseInt(document.getElementById('f_sort').value)||0};
        const{error}=isEdit?await db.from('events').update(payload).eq('id',data.id):await db.from('events').insert(payload);
        if(error){showToast('Gagal menyimpan','error');return;}
        closeModal();showToast(isEdit?'Event diperbarui!':'Event ditambahkan!');loadEvents();
      });
    }
    async function deleteEvent(id,name){confirmDelete(`Hapus "${name}"?`,async()=>{const{error}=await db.from('events').delete().eq('id',id);if(error){showToast('Gagal hapus','error');return;}showToast('Event dihapus!');loadEvents();});}

    // ══ CERTIFICATIONS ══
    async function loadCertifications(){
      const el=document.getElementById('certContent');
      el.innerHTML='<div class="loading"><i class="fas fa-circle-notch"></i></div>';
      const{data,error}=await db.from('certifications').select('*').order('sort_order');
      if(error||!data){el.innerHTML='<p style="color:red;padding:20px">Gagal load data.</p>';return;}
      el.innerHTML=data.length?`<div class="table-wrap"><table>
        <thead><tr><th>Preview</th><th>Nama Sertifikat</th><th>Issuer</th><th>Tanggal</th><th>Link</th><th style="width:100px">Aksi</th></tr></thead>
        <tbody>${data.map(c=>`<tr>
          <td>${renderTablePreview(c)}</td>
          <td style="font-weight:600;color:var(--heading)">${c.cert_name}</td>
          <td style="font-size:12px"><i class="${c.issuer_icon||'fas fa-building'}" style="color:var(--accent);margin-right:6px"></i>${c.issuer}</td>
          <td style="font-size:12px;opacity:.7">${c.issued_date||'-'}</td>
          <td>${c.cert_url?`<a href="${c.cert_url}" target="_blank" style="color:var(--accent);font-size:12px"><i class="fas fa-external-link-alt"></i> Lihat</a>`:'<span style="opacity:.3;font-size:12px">—</span>'}</td>
          <td><div class="td-actions">
            <button class="btn btn-outline btn-sm" onclick="openCertForm(${JSON.stringify(c).replace(/"/g,'&quot;')})"><i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteCert(${c.id},'${c.cert_name.replace(/'/g,'\\\'')}')" ><i class="fas fa-trash"></i></button>
          </div></td></tr>`).join('')}
        </tbody></table></div>`:'<div class="empty-state"><i class="fas fa-award"></i><p>Belum ada sertifikasi.</p></div>';
    }
    function openCertForm(data=null){
      const isEdit=!!data?.id;
      openModal(isEdit?'Edit Certification':'Tambah Certification',`
        <div class="form-group"><label class="form-label">Nama Sertifikat</label><input class="form-input" id="f_name" value="${data?.cert_name||''}" placeholder="cth: Belajar Dasar Pemrograman Web"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Issuer / Penerbit</label><input class="form-input" id="f_issuer" value="${data?.issuer||''}" placeholder="cth: Dicoding"/></div>
          <div class="form-group"><label class="form-label">Icon Issuer (FA class)</label><input class="form-input" id="f_icon" value="${data?.issuer_icon||''}" placeholder="fas fa-graduation-cap"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Tanggal Terbit</label><input class="form-input" id="f_date" value="${data?.issued_date||''}" placeholder="cth: Oktober 2024"/></div>
          <div class="form-group"><label class="form-label">Sort Order</label><input class="form-input" id="f_sort" type="number" value="${data?.sort_order||0}"/></div>
        </div>
        <div class="form-group"><label class="form-label">Link Verifikasi <span style="opacity:.4">(opsional)</span></label><input class="form-input" id="f_url" value="${data?.cert_url||''}" placeholder="https://..."/></div>
        <div class="form-group">
          <label class="form-label">Upload Sertifikat <span style="opacity:.4;font-weight:400">— Foto atau PDF</span></label>
          ${renderCurrentFileInfo(data)}
          <div class="file-upload-area"><input type="file" id="f_cert_file" accept="image/*,.pdf"/><i class="fas fa-cloud-upload-alt"></i><p>Klik untuk upload file sertifikat</p><p class="file-type-hint">JPG, PNG, WEBP atau PDF · Thumbnail dari PDF dibuat otomatis</p></div>
          <div class="upload-progress" id="uploadProgress"><i class="fas fa-circle-notch"></i><span>Memproses file...</span></div>
        </div>
      `,async()=>{
        const btnSave=document.getElementById('btnSave');
        btnSave.disabled=true;btnSave.innerHTML='<i class="fas fa-circle-notch" style="animation:spin .8s linear infinite"></i> Menyimpan...';
        let imageUrl=data?.image_url||null,thumbnailUrl=data?.thumbnail_url||null;
        const file=document.getElementById('f_cert_file').files[0];
        if(file){const result=await uploadCertFile(file,document.getElementById('uploadProgress'));if(!result){btnSave.disabled=false;btnSave.innerHTML='<i class="fas fa-floppy-disk"></i> Simpan';return;}imageUrl=result.fileUrl;thumbnailUrl=result.thumbnailUrl;}
        const payload={cert_name:document.getElementById('f_name').value,issuer:document.getElementById('f_issuer').value,issuer_icon:document.getElementById('f_icon').value,issued_date:document.getElementById('f_date').value,cert_url:document.getElementById('f_url').value||null,image_url:imageUrl,thumbnail_url:thumbnailUrl,sort_order:parseInt(document.getElementById('f_sort').value)||0};
        const{error}=isEdit?await db.from('certifications').update(payload).eq('id',data.id):await db.from('certifications').insert(payload);
        btnSave.disabled=false;btnSave.innerHTML='<i class="fas fa-floppy-disk"></i> Simpan';
        if(error){showToast('Gagal menyimpan: '+error.message,'error');return;}
        closeModal();showToast(isEdit?'Sertifikat diperbarui!':'Sertifikat ditambahkan!');loadCertifications();
      });
    }
    async function deleteCert(id,name){confirmDelete(`Hapus sertifikat "${name}"?`,async()=>{const{error}=await db.from('certifications').delete().eq('id',id);if(error){showToast('Gagal hapus','error');return;}showToast('Sertifikat dihapus!');loadCertifications();});}

    document.getElementById('btnLogout').addEventListener('click', async () => {
      await db.auth.signOut();
      window.location.href = 'admin-login.html';
    });

    loadSkills();