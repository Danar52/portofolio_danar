// ── CONFIG — ganti dengan milik lo ──────────────────────
    const SUPABASE_URL     = 'https://vdnysjewpqunxokscaan.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbnlzamV3cHF1bnhva3NjYWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjQ2MDcsImV4cCI6MjA4OTUwMDYwN30.GfnHPRuO8bDdfTJeOhLAV0gw54_PDGojQCrVPTzSA3g';
    // ────────────────────────────────────────────────────────

    const { createClient } = supabase;
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Kalau sudah login, langsung redirect ke dashboard
    db.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = 'admin.html';
    });

    // ── Toggle password visibility ───────────────────────────
    document.getElementById('togglePw').addEventListener('click', () => {
      const input   = document.getElementById('password');
      const icon    = document.getElementById('eyeIcon');
      const isHidden = input.type === 'password';
      input.type    = isHidden ? 'text' : 'password';
      icon.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
    });

    // ── Login ────────────────────────────────────────────────
    async function doLogin() {
      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const errorMsg = document.getElementById('errorMsg');
      const errorTxt = document.getElementById('errorText');
      const btn      = document.getElementById('btnLogin');
      const spinner  = document.getElementById('spinner');
      const icon     = document.getElementById('loginIcon');
      const btnText  = document.getElementById('btnText');

      // Validasi
      if (!email || !password) {
        errorTxt.textContent = 'Email dan password wajib diisi.';
        errorMsg.classList.add('show');
        return;
      }

      // Loading state
      btn.disabled      = true;
      spinner.style.display = 'block';
      icon.style.display    = 'none';
      btnText.textContent   = 'Memproses...';
      errorMsg.classList.remove('show');

      const { error } = await db.auth.signInWithPassword({ email, password });

      if (error) {
        errorTxt.textContent = 'Email atau password salah. Coba lagi.';
        errorMsg.classList.add('show');
        btn.disabled          = false;
        spinner.style.display = 'none';
        icon.style.display    = 'inline';
        btnText.textContent   = 'Masuk';
      } else {
        btnText.textContent = 'Berhasil! Mengalihkan...';
        setTimeout(() => window.location.href = 'admin.html', 800);
      }
    }

    document.getElementById('btnLogin').addEventListener('click', doLogin);

    // Enter key
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });