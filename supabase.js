// ============================================================
// supabase.js — Konfigurasi koneksi Supabase
// Taruh file ini di folder portfolio/
// Semua halaman HTML akan import file ini
// ============================================================

// ── GANTI 2 NILAI INI DENGAN MILIK LO ──────────────────────
// Ambil dari: Supabase Dashboard > Settings > API
const SUPABASE_URL    = 'https://vdnysjewpqunxokscaan.supabase.co';   // ← ganti
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbnlzamV3cHF1bnhva3NjYWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjQ2MDcsImV4cCI6MjA4OTUwMDYwN30.GfnHPRuO8bDdfTJeOhLAV0gw54_PDGojQCrVPTzSA3g'; // ← ganti
// ────────────────────────────────────────────────────────────

// ✅ GANTI JADI INI — lebih stabil untuk ESM browser import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helper: fetch dengan error handling ─────────────────────
export async function fetchData(table, options = {}) {
  try {
    let query = supabase.from(table).select(options.select || '*');

    if (options.order)  query = query.order(options.order, { ascending: options.asc ?? true });
    if (options.filter) query = query.eq(options.filter.col, options.filter.val);
    if (options.single) query = query.single();

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`[Supabase] Error fetching ${table}:`, err.message);
    return null;
  }
}

// ── Helper: upload image ke Storage ─────────────────────────
export async function uploadImage(file, folder = 'general') {
  try {
    const ext      = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('portfolio-images')
      .upload(fileName, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('portfolio-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err) {
    console.error('[Supabase] Upload error:', err.message);
    return null;
  }
}

// ── Helper: delete image dari Storage ───────────────────────
export async function deleteImage(imageUrl) {
  try {
    // Ambil path dari full URL
    const path = imageUrl.split('/portfolio-images/')[1];
    const { error } = await supabase.storage
      .from('portfolio-images')
      .remove([path]);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[Supabase] Delete error:', err.message);
    return false;
  }
}