-- ============================================================
-- PORTFOLIO DANAR — SUPABASE DATABASE SCHEMA
-- Jalankan di: Supabase Dashboard > SQL Editor > New Query
-- ============================================================


-- ── 1. PROFILE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile (
  id          SERIAL PRIMARY KEY,
  full_name   TEXT NOT NULL,
  role        TEXT,
  bio         TEXT,
  birth_date  DATE,
  city        TEXT,
  email       TEXT,
  photo_url   TEXT,
  url_x           TEXT,
  url_tiktok      TEXT,
  url_instagram   TEXT,
  url_linkedin    TEXT,
  url_github      TEXT,
  url_behance     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert data profil lo (hanya 1 row)
INSERT INTO profile (
  full_name, role, bio, birth_date, city, email,
  url_x, url_tiktok, url_instagram, url_linkedin, url_github, url_behance
) VALUES (
  'Eka Danar Arrasyid',
  'Informatics Engineering Student',
  'Menggabungkan kreativitas visual dan ketertarikan teknologi untuk menghasilkan karya yang inspiratif.',
  '2004-02-05',
  'Bekasi',
  'edanararrasyid@gmail.com',
  'https://x.com/DanarrArrsyd',
  'https://www.tiktok.com/@danararrsyd',
  'https://www.instagram.com/danar_arrsyd/',
  'https://www.linkedin.com/in/ekadanararrasyid/',
  'https://github.com/Danar52',
  'https://www.behance.net/ekadanararrasyid'
);


-- ── 2. EDUCATION ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS education (
  id           SERIAL PRIMARY KEY,
  school_name  TEXT NOT NULL,
  major        TEXT,
  year_start   INTEGER,
  year_end     INTEGER,       -- NULL = masih aktif
  is_active    BOOLEAN DEFAULT FALSE,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO education (school_name, major, year_start, year_end, is_active, sort_order) VALUES
  ('Universitas Pelita Bangsa', 'Teknik Informatika', 2023, NULL, TRUE,  1),
  ('SMAN 1 Cikarang Utara',     'MIPA',              2019, 2022, FALSE, 2);


-- ── 3. SKILLS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skills (
  id           SERIAL PRIMARY KEY,
  category     TEXT NOT NULL,   -- 'Frontend' | 'Backend' | 'Design' | 'Tools'
  category_icon TEXT,           -- Font Awesome class, e.g. 'fas fa-laptop-code'
  skill_name   TEXT NOT NULL,
  skill_icon   TEXT,            -- Font Awesome class, e.g. 'fab fa-html5'
  percentage   INTEGER CHECK (percentage BETWEEN 0 AND 100),
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO skills (category, category_icon, skill_name, skill_icon, percentage, sort_order) VALUES
  -- Frontend
  ('Frontend', 'fas fa-laptop-code', 'HTML / CSS',     'fab fa-html5',      85, 1),
  ('Frontend', 'fas fa-laptop-code', 'JavaScript',     'fab fa-js',         70, 2),
  ('Frontend', 'fas fa-laptop-code', 'Bootstrap',      'fab fa-bootstrap',  80, 3),
  ('Frontend', 'fas fa-laptop-code', 'Tailwind CSS',   'fas fa-wind',       65, 4),
  -- Backend
  ('Backend',  'fas fa-server',      'PHP',            'fab fa-php',        80, 1),
  ('Backend',  'fas fa-server',      'MySQL',          'fas fa-database',   75, 2),
  ('Backend',  'fas fa-server',      'Laravel',        'fab fa-laravel',    65, 3),
  ('Backend',  'fas fa-server',      'REST API',       'fas fa-plug',       60, 4),
  -- Design
  ('Design',   'fas fa-pen-ruler',   'Figma',          'fab fa-figma',      70, 1),
  ('Design',   'fas fa-pen-ruler',   'Adobe Illustrator', 'fas fa-bezier-curve', 65, 2),
  ('Design',   'fas fa-pen-ruler',   'Adobe Photoshop','fas fa-layer-group', 60, 3),
  -- Tools
  ('Tools & Others', 'fas fa-screwdriver-wrench', 'Git / GitHub', 'fab fa-git-alt', 75, 1),
  ('Tools & Others', 'fas fa-screwdriver-wrench', 'VS Code',      'fas fa-code',    90, 2),
  ('Tools & Others', 'fas fa-screwdriver-wrench', 'Command Line', 'fas fa-terminal',70, 3);


-- ── 4. EXPERIENCE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS experience (
  id           SERIAL PRIMARY KEY,
  job_title    TEXT NOT NULL,
  company      TEXT NOT NULL,
  period_start TEXT NOT NULL,   -- e.g. 'Januari 2024'
  period_end   TEXT,            -- NULL atau 'Sekarang'
  duration     TEXT,            -- e.g. '1 thn 2 bln'
  is_active    BOOLEAN DEFAULT FALSE,
  description  TEXT,
  tags         TEXT[],          -- Array: '{PHP, Laravel, MySQL}'
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO experience (job_title, company, period_start, period_end, duration, is_active, description, tags, sort_order) VALUES
  (
    'Web Developer Intern',
    'PT. Teknologi Nusantara Digital',
    'Januari 2024', 'Sekarang', '1 thn 2 bln', TRUE,
    'Bertanggung jawab dalam pengembangan dan pemeliharaan aplikasi web internal perusahaan menggunakan PHP dan Laravel. Berkolaborasi dengan tim desain untuk mengimplementasikan UI/UX yang responsif serta melakukan optimasi performa database MySQL.',
    ARRAY['PHP', 'Laravel', 'MySQL', 'Tailwind CSS', 'Git'],
    1
  ),
  (
    'Freelance Web Designer',
    'Freelance / Project Basis',
    'Juni 2023', 'Desember 2023', '7 bln', FALSE,
    'Menangani proyek desain dan pengembangan website untuk klien UMKM lokal. Membuat landing page, company profile, dan toko online sederhana menggunakan HTML, CSS, JavaScript, serta Figma untuk proses prototyping.',
    ARRAY['HTML / CSS', 'JavaScript', 'Figma', 'Bootstrap'],
    2
  ),
  (
    'Lab Assistant — Pemrograman Web',
    'Universitas Pelita Bangsa',
    'Agustus 2023', 'Januari 2024', '6 bln', FALSE,
    'Membantu dosen dalam pelaksanaan praktikum pemrograman web. Membimbing mahasiswa semester 1–2 dalam memahami konsep dasar HTML, CSS, dan JavaScript.',
    ARRAY['HTML / CSS', 'JavaScript', 'Teaching'],
    3
  );


-- ── 5. EVENTS / ORGANIZATION ────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id           SERIAL PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('org', 'event', 'comp')),
  name         TEXT NOT NULL,
  role         TEXT,
  period       TEXT,
  location     TEXT,
  description  TEXT,
  image_url    TEXT,            -- URL foto kegiatan
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO events (type, name, role, period, location, description, sort_order) VALUES
  ('org',   'Himpunan Mahasiswa Teknik Informatika', 'Kepala Divisi Media & Informasi',  '2023 — 2024',       'Universitas Pelita Bangsa', 'Mengelola konten media sosial, dokumentasi kegiatan, dan desain materi publikasi himpunan.', 1),
  ('comp',  'Hackathon Teknologi Nasional 2024',     'Peserta — Tim Developer',          'Maret 2024',        'Jakarta',                   'Berpartisipasi dalam hackathon 48 jam bersama tim 4 orang, membangun aplikasi manajemen sampah berbasis web yang meraih Top 10.', 2),
  ('event', 'IDCamp 2024 — Dicoding Indonesia',      'Peserta — Web Development Track',  'Juli — Okt 2024',   'Online',                    'Mengikuti program beasiswa belajar teknologi dari Indosat Ooredoo Hutchison. Menyelesaikan learning path Web Development.', 3),
  ('org',   'UKM Desain Grafis & Multimedia',        'Anggota Aktif — Divisi Kreatif',   '2023 — Sekarang',   'Universitas Pelita Bangsa', 'Aktif dalam pembuatan konten visual, poster, dan media promosi untuk berbagai kegiatan kampus.', 4),
  ('comp',  'UI/UX Design Competition — GEMASTIK 2024', 'Peserta — Kategori Desain',     'Oktober 2024',      'Bandung',                   'Mengikuti kompetisi UI/UX tingkat nasional yang diselenggarakan oleh Kemdikbud.', 5);


-- ── 6. CERTIFICATIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS certifications (
  id            SERIAL PRIMARY KEY,
  cert_name     TEXT NOT NULL,
  issuer        TEXT NOT NULL,
  issuer_icon   TEXT,           -- Font Awesome class
  issued_date   TEXT,           -- e.g. 'Oktober 2024'
  cert_url      TEXT,           -- Link verifikasi sertifikat
  image_url     TEXT,           -- Foto/scan sertifikat
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO certifications (cert_name, issuer, issuer_icon, issued_date, sort_order) VALUES
  ('Belajar Dasar Pemrograman Web',            'Dicoding Indonesia',  'fas fa-graduation-cap', 'Oktober 2024',   1),
  ('Google UX Design Professional Certificate','Google — Coursera',   'fab fa-google',         'Agustus 2024',   2),
  ('Full Stack Web Development Bootcamp',      'Hacktiv8 Indonesia',  'fas fa-laptop-code',    'Maret 2024',     3),
  ('AWS Cloud Practitioner Essentials',        'Amazon Web Services', 'fab fa-aws',            'Januari 2024',   4),
  ('Database Design & Programming with SQL',   'Oracle Academy',      'fas fa-database',       'November 2023',  5),
  ('UI/UX Design Fundamentals with Figma',     'Figma — Design School','fab fa-figma',         'September 2023', 6);


-- ── 7. ROW LEVEL SECURITY (RLS) ─────────────────────────────
-- Aktifkan RLS di semua tabel (data bisa dibaca publik, hanya admin yg bisa ubah)
ALTER TABLE profile        ENABLE ROW LEVEL SECURITY;
ALTER TABLE education      ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills         ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience     ENABLE ROW LEVEL SECURITY;
ALTER TABLE events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

-- Policy: siapapun bisa READ (untuk portfolio publik)
CREATE POLICY "Public read profile"        ON profile        FOR SELECT USING (true);
CREATE POLICY "Public read education"      ON education      FOR SELECT USING (true);
CREATE POLICY "Public read skills"         ON skills         FOR SELECT USING (true);
CREATE POLICY "Public read experience"     ON experience     FOR SELECT USING (true);
CREATE POLICY "Public read events"         ON events         FOR SELECT USING (true);
CREATE POLICY "Public read certifications" ON certifications FOR SELECT USING (true);

-- Policy: hanya user yang login (admin lo) yang bisa INSERT/UPDATE/DELETE
CREATE POLICY "Auth insert profile"        ON profile        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert education"      ON education      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert skills"         ON skills         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert experience"     ON experience     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert events"         ON events         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert certifications" ON certifications FOR ALL USING (auth.role() = 'authenticated');


-- ── 8. STORAGE BUCKET ───────────────────────────────────────
-- Jalankan ini terpisah setelah tabel selesai dibuat
-- Untuk upload foto kegiatan & sertifikat

INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-images', 'portfolio-images', true)
ON CONFLICT DO NOTHING;

-- Policy: siapapun bisa lihat gambar (public bucket)
CREATE POLICY "Public read images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-images');

-- Policy: hanya admin (authenticated) yang bisa upload
CREATE POLICY "Auth upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'portfolio-images' AND auth.role() = 'authenticated');

-- Policy: hanya admin yang bisa hapus
CREATE POLICY "Auth delete images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'portfolio-images' AND auth.role() = 'authenticated');