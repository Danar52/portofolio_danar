/**
 * chatbot.js — Floating AI Chatbot "Eka Danar"
 * Aman dari maling kuota! API Key disembunyikan di Vercel.
 */

import { supabase } from './supabase.js';

// ─── 🔗 GANTI DENGAN URL VERCEL LO ───────────────────────────────────────
// Contoh: 'https://backend-eka.vercel.app/api/chat'
// PASTIKAN UJUNGNYA ADA /api/chat
const BACKEND_URL = 'https://backend-chatbot-self.vercel.app/api/chat';
// ──────────────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Skill apa aja yang kamu punya?',
  'Ceritain pengalaman organisasimu',
  'Lagi kuliah di mana sekarang?',
  'Gimana cara hire / kontak kamu?',
];

// ── STYLES (Tetap sama seperti aslinya) ──────────────────────────────────
const STYLES = `
  :root { --cb-accent: #0563bb; --cb-accent-dark: #0452a0; --cb-bg: #ffffff; --cb-surface: #f8f9fa; --cb-border: #e9ecef; --cb-text: #272829; --cb-text-muted: #6b7c8e; --cb-radius: 18px; --cb-shadow: 0 8px 40px rgba(5,99,187,0.18); --cb-font: "Poppins", system-ui, sans-serif; --cb-font-body: "Roboto", system-ui, sans-serif; }
  #cb-bubble { position: fixed; bottom: 28px; right: 28px; width: 56px; height: 56px; border-radius: 50%; background: var(--cb-accent); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 6px 24px rgba(5,99,187,0.38); z-index: 9999; transition: transform 0.25s, background 0.2s; animation: cb-popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  #cb-bubble:hover { background: var(--cb-accent-dark); transform: scale(1.1); }
  #cb-bubble.open  { background: var(--cb-accent-dark); }
  #cb-bubble .cb-icon-chat, #cb-bubble .cb-icon-close { position: absolute; transition: opacity 0.2s, transform 0.2s; }
  #cb-bubble .cb-icon-close { opacity: 0; transform: rotate(-90deg); }
  #cb-bubble.open .cb-icon-chat  { opacity: 0; transform: rotate(90deg); }
  #cb-bubble.open .cb-icon-close { opacity: 1; transform: rotate(0deg); }
  #cb-notif { position: fixed; bottom: 72px; right: 26px; width: 12px; height: 12px; border-radius: 50%; background: #e53935; border: 2px solid #fff; z-index: 10000; animation: cb-pulseDot 1.6s ease-in-out infinite; transition: opacity 0.3s; }
  #cb-notif.hidden { opacity: 0; pointer-events: none; }
  #cb-tooltip { position: fixed; bottom: 38px; right: 92px; background: var(--cb-text); color: #fff; padding: 8px 14px; border-radius: 10px; font-family: var(--cb-font); font-size: 12px; font-weight: 500; white-space: nowrap; z-index: 9998; opacity: 0; pointer-events: none; transition: opacity 0.25s; }
  #cb-tooltip::after { content: ''; position: absolute; right: -8px; top: 50%; transform: translateY(-50%); border: 5px solid transparent; border-left-color: var(--cb-text); }
  #cb-tooltip.visible { opacity: 1; }
  #cb-window { position: fixed; bottom: 96px; right: 28px; width: 360px; max-height: 560px; border-radius: var(--cb-radius); background: var(--cb-bg); border: 1px solid var(--cb-border); box-shadow: var(--cb-shadow); display: flex; flex-direction: column; z-index: 9998; overflow: hidden; opacity: 0; transform: translateY(20px) scale(0.95); pointer-events: none; transition: opacity 0.28s, transform 0.28s cubic-bezier(0.34,1.2,0.64,1); }
  #cb-window.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
  .cb-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: var(--cb-accent); color: #fff; flex-shrink: 0; }
  .cb-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-family: "Raleway", sans-serif; font-weight: 800; font-size: 14px; flex-shrink: 0; overflow: hidden; }
  .cb-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .cb-header-info { flex: 1; }
  .cb-header-name { font-family: var(--cb-font); font-size: 13px; font-weight: 600; line-height: 1.2; }
  .cb-header-status { font-family: var(--cb-font); font-size: 10px; opacity: 0.8; display: flex; align-items: center; gap: 5px; }
  .cb-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #4cef8f; display: inline-block; animation: cb-pulseDot 1.8s ease-in-out infinite; }
  .cb-clear-btn { background: rgba(255,255,255,0.15); border: none; color: #fff; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
  .cb-clear-btn:hover { background: rgba(255,255,255,0.28); }
  .cb-messages { flex: 1; overflow-y: auto; padding: 16px 14px; display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth; }
  .cb-messages::-webkit-scrollbar { width: 4px; }
  .cb-messages::-webkit-scrollbar-thumb { background: rgba(5,99,187,0.15); border-radius: 4px; }
  .cb-msg { display: flex; gap: 8px; align-items: flex-end; animation: cb-msgIn 0.25s ease forwards; }
  .cb-msg.user { flex-direction: row-reverse; }
  .cb-msg-avatar { width: 26px; height: 26px; border-radius: 50%; background: var(--cb-surface); border: 1px solid var(--cb-border); display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--cb-accent); flex-shrink: 0; overflow: hidden; }
  .cb-msg-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .cb-msg-bubble { max-width: 78%; padding: 9px 13px; border-radius: 14px; font-family: var(--cb-font-body); font-size: 13px; line-height: 1.6; color: var(--cb-text); background: var(--cb-surface); border: 1px solid var(--cb-border); word-break: break-word; }
  .cb-msg.user .cb-msg-bubble { background: var(--cb-accent); color: #fff; border-color: var(--cb-accent); border-bottom-right-radius: 4px; }
  .cb-msg.bot .cb-msg-bubble { border-bottom-left-radius: 4px; }
  .cb-typing .cb-msg-bubble { padding: 12px 16px; }
  .cb-dots { display: flex; gap: 4px; align-items: center; height: 14px; }
  .cb-dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--cb-text-muted); animation: cb-dot 1.2s ease-in-out infinite; }
  .cb-dots span:nth-child(2) { animation-delay: 0.2s; }
  .cb-dots span:nth-child(3) { animation-delay: 0.4s; }
  .cb-suggestions { padding: 0 14px 10px; display: flex; flex-wrap: wrap; gap: 6px; flex-shrink: 0; }
  .cb-suggestion-btn { padding: 5px 11px; border-radius: 20px; border: 1px solid var(--cb-accent); background: rgba(5,99,187,0.05); color: var(--cb-accent); font-family: var(--cb-font); font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .cb-suggestion-btn:hover { background: var(--cb-accent); color: #fff; }
  .cb-input-area { padding: 10px 14px 14px; border-top: 1px solid var(--cb-border); display: flex; gap: 8px; align-items: flex-end; flex-shrink: 0; background: var(--cb-bg); }
  #cb-input { flex: 1; border: 1px solid var(--cb-border); border-radius: 12px; padding: 9px 13px; font-family: var(--cb-font-body); font-size: 13px; color: var(--cb-text); background: var(--cb-surface); resize: none; outline: none; max-height: 100px; min-height: 38px; line-height: 1.5; transition: border-color 0.2s; }
  #cb-input:focus { border-color: var(--cb-accent); }
  #cb-input::placeholder { color: var(--cb-text-muted); }
  #cb-send { width: 38px; height: 38px; border-radius: 10px; background: var(--cb-accent); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: background 0.2s, transform 0.15s; flex-shrink: 0; }
  #cb-send:hover { background: var(--cb-accent-dark); transform: scale(1.05); }
  #cb-send:disabled { background: var(--cb-border); cursor: not-allowed; transform: none; }
  @keyframes cb-popIn { from { opacity:0; transform:scale(0.5); } to { opacity:1; transform:scale(1); } }
  @keyframes cb-msgIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes cb-pulseDot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(1.3);} }
  @keyframes cb-dot { 0%,60%,100%{transform:translateY(0);opacity:0.4;} 30%{transform:translateY(-5px);opacity:1;} }
  @media (max-width: 768px) { #cb-window { width: calc(100vw - 32px); right: 16px; bottom: 80px; } #cb-bubble { bottom: 16px; right: 16px; } #cb-notif { bottom: 60px; right: 14px; } #cb-tooltip { display: none; } }
`;

// ── MAIN CLASS ─────────────────────────────────────────────────────────────
class EkaChatbot {
  constructor() {
    this.isOpen    = false;
    this.isLoading = false;
    this.history   = [];
    this.context   = null;
    this.avatarUrl = null;
    this.systemPrompt = '';

    this._injectStyles();
    this._injectHTML();
    this._bindEvents();
    this._loadContext();

    setTimeout(() => this._showTooltip(), 3000);
  }

  _injectStyles() {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  _injectHTML() {
    const wrap = document.createElement('div');
    wrap.id = 'cb-root';
    wrap.innerHTML = `
      <div id="cb-tooltip">Hei! Ada yang bisa aku bantu? 👋</div>
      <div id="cb-notif"></div>
      <button id="cb-bubble" aria-label="Buka chatbot"><i class="fas fa-comment-dots cb-icon-chat"></i><i class="fas fa-times cb-icon-close"></i></button>
      <div id="cb-window" role="dialog" aria-label="Chatbot Eka Danar">
        <div class="cb-header">
          <div class="cb-avatar" id="cb-header-avatar">EDA</div>
          <div class="cb-header-info">
            <div class="cb-header-name">Eka Danar AI</div>
            <div class="cb-header-status"><span class="cb-status-dot"></span>Online</div>
          </div>
          <button class="cb-clear-btn" id="cb-clear" title="Reset percakapan"><i class="fas fa-rotate-right"></i></button>
        </div>
        <div class="cb-messages" id="cb-messages"></div>
        <div class="cb-suggestions" id="cb-suggestions"></div>
        <div class="cb-input-area">
          <textarea id="cb-input" placeholder="Tanya sesuatu tentang Eka..." rows="1"></textarea>
          <button id="cb-send" aria-label="Kirim"><i class="fas fa-paper-plane"></i></button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  _bindEvents() {
    document.getElementById('cb-bubble').addEventListener('click', () => this._toggle());
    document.getElementById('cb-send').addEventListener('click',   () => this._send());
    document.getElementById('cb-clear').addEventListener('click',  () => this._reset());

    const input = document.getElementById('cb-input');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._send(); }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    const sugWrap = document.getElementById('cb-suggestions');
    SUGGESTIONS.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'cb-suggestion-btn';
      btn.textContent = q;
      btn.addEventListener('click', () => {
        document.getElementById('cb-input').value = q;
        this._send();
      });
      sugWrap.appendChild(btn);
    });
  }

  async _loadContext() {
    try {
      const [profRes, eduRes, skillRes, expRes, eventRes, certRes] = await Promise.all([
        supabase.from('profile').select('*').single(),
        supabase.from('education').select('*').order('sort_order'),
        supabase.from('skills').select('*').order('sort_order').limit(40),
        supabase.from('experience').select('*').order('sort_order').limit(20),
        supabase.from('events').select('*').order('sort_order').limit(20),
        supabase.from('certifications').select('*').order('sort_order').limit(20),
      ]);

      this.context = {
        profile:        profRes.data  || {},
        education:      eduRes.data   || [],
        skills:         skillRes.data || [],
        experience:     expRes.data   || [],
        events:         eventRes.data || [],
        certifications: certRes.data  || [],
      };

      if (this.context.profile.photo_url) {
        this.avatarUrl = this.context.profile.photo_url;
        const el = document.getElementById('cb-header-avatar');
        if (el) el.innerHTML = `<img src="${this.avatarUrl}" alt="Eka">`;
      }
      this.systemPrompt = this._buildSystemPrompt();
    } catch (err) {
      console.warn('Chatbot: gagal load context', err);
      this.systemPrompt = this._buildSystemPrompt();
    }
    this._addBotMessage(this._buildGreeting());
  }

  _buildGreeting() {
    const name = this.context?.profile?.full_name?.split(' ')[0] || 'Eka';
    return `Hei! Aku ${name} — versi AI-nya 😄\nAku bisa jawab pertanyaan seputar skills, pengalaman, pendidikan, atau gimana cara menghubungi aku.\n\nMau tanya apa nih?`;
  }

  _buildSystemPrompt() {
    const p = this.context?.profile || {};
    return `Kamu adalah AI persona dari ${p.full_name || 'Eka Danar Arrasyid'}, seorang ${p.role || 'Informatics Engineering Student'}. Jawab dalam bahasa Indonesia yang santai tapi profesional. Gunakan gaya orang pertama ("aku"). Jawab ringkas maksimal 3 kalimat.`;
  }

  async _send() {
    const input = document.getElementById('cb-input');
    const text  = input.value.trim();
    if (!text || this.isLoading) return;

    document.getElementById('cb-suggestions').style.display = 'none';
    input.value = '';
    input.style.height = 'auto';
    this._addUserMessage(text);
    this.history.push({ role: 'user', parts: [{ text }] });

    await this._callGemini(1);
  }

  async _callGemini(attempt) {
    const MAX_ATTEMPTS = 3;
    this.isLoading = true;
    document.getElementById('cb-send').disabled = true;
    const typingId = this._addTyping();

    try {
      const contents = [
        { role: 'user',  parts: [{ text: this.systemPrompt }] },
        { role: 'model', parts: [{ text: 'Siap! Aku akan menjawab sebagai Eka Danar.' }] },
        ...this.history,
      ];

      // KODE YANG DIUBAH: NEMBAK KE VERCEL BUKAN KE GOOGLE LANGSUNG
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
        }),
      });

      const data = await response.json();
      this._removeTyping(typingId);

      if (response.status === 429 || data?.error?.code === 429) {
        const retryMsg   = data?.error?.message || '';
        const retryMatch = retryMsg.match(/retry in ([\d.]+)s/i);
        const retryAfter = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 10;

        if (attempt < MAX_ATTEMPTS) {
          const countdownId = this._addCountdownMessage(retryAfter, attempt, MAX_ATTEMPTS);
          await this._countdown(retryAfter, countdownId);
          document.getElementById(countdownId)?.remove();
          await this._callGemini(attempt + 1);
        } else {
          this.history.pop();
          this._addBotMessage('API lagi sibuk banget nih 😓 Coba lagi dalam beberapa menit ya!');
        }
        return;
      }

      if (data.error) {
        this.history.pop();
        this._addBotMessage('Ups, ada error dari server 😅 Coba refresh halaman ya!');
        return;
      }

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, aku tidak bisa menjawab saat ini 😅';
      this.history.push({ role: 'model', parts: [{ text: reply }] });
      this._addBotMessage(reply);

    } catch (err) {
      this._removeTyping(typingId);
      this.history.pop();
      this._addBotMessage('Aduh, ada gangguan koneksi nih 😅 Coba lagi ya!');
      console.error('Chatbot fetch error:', err);
    } finally {
      this.isLoading = false;
      document.getElementById('cb-send').disabled = false;
      document.getElementById('cb-input')?.focus();
    }
  }

  _addCountdownMessage(seconds, attempt, max) {
    const msgs = document.getElementById('cb-messages');
    const id   = 'cb-countdown-' + Date.now();
    const div  = document.createElement('div');
    div.className = 'cb-msg bot';
    div.id = id;
    const avatarInner = this.avatarUrl ? `<img src="${this.avatarUrl}" alt="Eka">` : '<i class="fas fa-robot"></i>';
    div.innerHTML = `<div class="cb-msg-avatar">${avatarInner}</div><div class="cb-msg-bubble">Lagi sibuk nih 🔄 Auto-retry dalam <strong id="${id}-sec">${seconds}</strong>s...<span style="opacity:0.5;font-size:11px;display:block;margin-top:3px">Percobaan ${attempt} dari ${max}</span></div>`;
    msgs.appendChild(div);
    this._scrollToBottom();
    return id;
  }

  _countdown(seconds, countdownId) {
    return new Promise(resolve => {
      let remaining = seconds;
      const secEl = document.getElementById(`${countdownId}-sec`);
      const interval = setInterval(() => {
        remaining--;
        if (secEl) secEl.textContent = remaining;
        if (remaining <= 0) { clearInterval(interval); resolve(); }
      }, 1000);
    });
  }

  _toggle() {
    this.isOpen = !this.isOpen;
    document.getElementById('cb-bubble').classList.toggle('open',  this.isOpen);
    document.getElementById('cb-window').classList.toggle('open',  this.isOpen);
    document.getElementById('cb-notif').classList.add('hidden');
    document.getElementById('cb-tooltip').classList.remove('visible');
    if (this.isOpen) { setTimeout(() => document.getElementById('cb-input')?.focus(), 300); this._scrollToBottom(); }
  }

  _reset() {
    this.history = [];
    document.getElementById('cb-messages').innerHTML = '';
    document.getElementById('cb-suggestions').style.display = 'flex';
    this._addBotMessage(this._buildGreeting());
  }

  _addUserMessage(text) {
    const msgs = document.getElementById('cb-messages');
    const div  = document.createElement('div');
    div.className = 'cb-msg user';
    div.innerHTML = `<div class="cb-msg-avatar"><i class="fas fa-user"></i></div><div class="cb-msg-bubble">${this._escapeHtml(text)}</div>`;
    msgs.appendChild(div);
    this._scrollToBottom();
  }

  _addBotMessage(text) {
    const msgs = document.getElementById('cb-messages');
    const div  = document.createElement('div');
    div.className = 'cb-msg bot';
    const avatarInner = this.avatarUrl ? `<img src="${this.avatarUrl}" alt="Eka">` : `<i class="fas fa-robot"></i>`;
    div.innerHTML = `<div class="cb-msg-avatar">${avatarInner}</div><div class="cb-msg-bubble">${this._formatText(text)}</div>`;
    msgs.appendChild(div);
    this._scrollToBottom();
  }

  _addTyping() {
    const msgs = document.getElementById('cb-messages');
    const id   = 'cb-typing-' + Date.now();
    const div  = document.createElement('div');
    div.className = 'cb-msg bot cb-typing';
    div.id = id;
    const avatarInner = this.avatarUrl ? `<img src="${this.avatarUrl}" alt="Eka">` : `<i class="fas fa-robot"></i>`;
    div.innerHTML = `<div class="cb-msg-avatar">${avatarInner}</div><div class="cb-msg-bubble"><div class="cb-dots"><span></span><span></span><span></span></div></div>`;
    msgs.appendChild(div);
    this._scrollToBottom();
    return id;
  }

  _removeTyping(id) { document.getElementById(id)?.remove(); }
  _scrollToBottom() { const msgs = document.getElementById('cb-messages'); if (msgs) setTimeout(() => msgs.scrollTop = msgs.scrollHeight, 50); }
  _showTooltip() { if (this.isOpen) return; const tooltip = document.getElementById('cb-tooltip'); tooltip.classList.add('visible'); setTimeout(() => tooltip.classList.remove('visible'), 4000); }
  _formatText(text) { return this._escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>'); }
  _escapeHtml(str) { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new EkaChatbot());
} else {
  new EkaChatbot();
}