/**
 * chatbot.js — Floating AI Chatbot "Eka Danar"
 * v3.0 — Context window trim, full markdown, dynamic suggestions
 */

import { supabase } from './supabase.js';

// ─── 🔗 SETTINGAN ─────────────────────────────────────────────────────────
const BACKEND_URL  = 'https://backend-chatbot-self.vercel.app/api/chat';
const BOT_PHOTO_URL = './assets/bot_avatar.png';
const MAX_HISTORY  = 10; // max pesan yang dikirim ke backend (trim otomatis)
// ──────────────────────────────────────────────────────────────────────────

// ── STATIC SUGGESTIONS (awal) ────────────────────────────────────────────
const SUGGESTIONS_INIT = [
  'Tech stack lo apa aja?',
  'Ada project yang bisa gw lihat?',
  'Lagi sibuk ngerjain apa sekarang?',
  'Gimana cara hire / kontak lo?',
];

// ── DYNAMIC SUGGESTIONS — muncul setelah bot jawab ───────────────────────
// Bot akan kasih tag konteks, kita match ke suggestion yang relevan
const DYNAMIC_SUGGESTIONS = {
  skills:       ['Skill mana yang paling lo andelin?', 'Lo bisa UI/UX juga?', 'Gimana cara lo belajar skill itu?'],
  portfolio:    ['Boleh liat project terbaiknya?', 'Tech stack project itu apa?', 'Ada project open source ga?'],
  experience:   ['Gimana pengalaman kerja pertama lo?', 'Lo internship atau freelance?', 'Ada tips buat freshgrad?'],
  contact:      ['Bisa langsung DM lo?', 'Berapa rate freelance lo?', 'Lo open buat collab?'],
  education:    ['Jurusan TI susah ngga sih?', 'Organisasi apa yang lo ikutin?', 'KP lo di mana?'],
  certification:['Sertifikasi apa yang paling berguna?', 'Dicoding worth it ngga?', 'Rekomendasiin platform belajar dong'],
  general:      ['Cerita dong soal project terbaru', 'Skill apa yang lagi lo pelajarin?', 'Ada tips buat pemula?'],
};

// ── TOOLTIP MESSAGES ──────────────────────────────────────────────────────
const TOOLTIP_MSGS = [
  'Hei! Ada yang bisa gw bantu? 👋',
  'Tanya apa aja soal gw!',
  'Psst, gw online nih 👀',
  'Mau tau skill gw? Tanya aja!',
];

// ── ERROR POOLS ───────────────────────────────────────────────────────────
const ERROR_OVERLOAD = [
  'Server lagi overload, coba lagi bentar 🔄',
  'API-nya lagi antri panjang, tunggu sebentar ya.',
  'Lagi rame banget nih, retry dulu deh.',
  'Waduh padet banget nih, bentar ya.'
];
const ERROR_BACKEND = [
  'Backend nge-lag, ketik ulang ya 😅',
  'Ada gangguan di server, coba sekali lagi.',
  'Hmm ada yang aneh di balik layar, kirim ulang pesan lo.',
  'Server lagi drama, coba lagi deh.'
];
const ERROR_NETWORK = [
  'Koneksi putus, cek internet lo dulu 📡',
  'Gagal nyambung ke server, refresh dulu bro.',
  'Network error nih, coba lagi sebentar.',
  'Sinyal ilang kayaknya, coba lagi ya.'
];

const _rand = (pool) => pool[Math.floor(Math.random() * pool.length)];

// ── STYLES ────────────────────────────────────────────────────────────────
const STYLES = `
  :root {
    --cb-accent:#0563bb; --cb-accent-dark:#0452a0; --cb-bg:#ffffff;
    --cb-surface:#f8f9fa; --cb-border:#e9ecef; --cb-text:#272829;
    --cb-text-muted:#6b7c8e; --cb-radius:18px;
    --cb-shadow:0 8px 40px rgba(5,99,187,0.18);
    --cb-font:"Poppins",system-ui,sans-serif;
    --cb-font-body:"Roboto",system-ui,sans-serif;
  }

  /* Bubble */
  #cb-bubble { position:fixed; bottom:28px; right:28px; width:56px; height:56px; border-radius:50%; background:var(--cb-accent); color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:22px; box-shadow:0 6px 24px rgba(5,99,187,0.38); z-index:9999; transition:transform 0.25s,background 0.2s; animation:cb-popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  #cb-bubble:hover { background:var(--cb-accent-dark); transform:scale(1.1); }
  #cb-bubble.open  { background:var(--cb-accent-dark); }
  #cb-bubble .cb-icon-chat,#cb-bubble .cb-icon-close { position:absolute; transition:opacity 0.2s,transform 0.2s; }
  #cb-bubble .cb-icon-close { opacity:0; transform:rotate(-90deg); }
  #cb-bubble.open .cb-icon-chat  { opacity:0; transform:rotate(90deg); }
  #cb-bubble.open .cb-icon-close { opacity:1; transform:rotate(0); }

  /* Notif & tooltip */
  #cb-notif { position:fixed; bottom:72px; right:26px; width:12px; height:12px; border-radius:50%; background:#e53935; border:2px solid #fff; z-index:10000; animation:cb-pulseDot 1.6s ease-in-out infinite; transition:opacity 0.3s; }
  #cb-notif.hidden { opacity:0; pointer-events:none; }
  #cb-tooltip { position:fixed; bottom:38px; right:92px; background:var(--cb-text); color:#fff; padding:8px 14px; border-radius:10px; font-family:var(--cb-font); font-size:12px; font-weight:500; white-space:nowrap; z-index:9998; opacity:0; pointer-events:none; transition:opacity 0.25s; }
  #cb-tooltip::after { content:''; position:absolute; right:-8px; top:50%; transform:translateY(-50%); border:5px solid transparent; border-left-color:var(--cb-text); }
  #cb-tooltip.visible { opacity:1; }

  /* Window */
  #cb-window { position:fixed; bottom:96px; right:28px; width:360px; max-height:580px; border-radius:var(--cb-radius); background:var(--cb-bg); border:1px solid var(--cb-border); box-shadow:var(--cb-shadow); display:flex; flex-direction:column; z-index:9998; overflow:hidden; opacity:0; transform:translateY(20px) scale(0.95); pointer-events:none; transition:opacity 0.28s,transform 0.28s cubic-bezier(0.34,1.2,0.64,1); }
  #cb-window.open { opacity:1; transform:translateY(0) scale(1); pointer-events:all; }

  /* Header */
  .cb-header { display:flex; align-items:center; gap:10px; padding:14px 16px; background:var(--cb-accent); color:#fff; flex-shrink:0; }
  .cb-avatar { width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-family:"Raleway",sans-serif; font-weight:800; font-size:14px; flex-shrink:0; overflow:hidden; }
  .cb-avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
  .cb-header-info { flex:1; }
  .cb-header-name { font-family:var(--cb-font); font-size:13px; font-weight:600; line-height:1.2; }
  .cb-header-status { font-family:var(--cb-font); font-size:10px; opacity:0.8; display:flex; align-items:center; gap:5px; }
  .cb-status-dot { width:6px; height:6px; border-radius:50%; background:#4cef8f; display:inline-block; animation:cb-pulseDot 1.8s ease-in-out infinite; }
  .cb-header-actions { display:flex; gap:6px; }
  .cb-icon-btn { background:rgba(255,255,255,0.15); border:none; color:#fff; width:28px; height:28px; border-radius:8px; cursor:pointer; font-size:11px; display:flex; align-items:center; justify-content:center; transition:background 0.2s; }
  .cb-icon-btn:hover { background:rgba(255,255,255,0.28); }

  /* Token counter */
  #cb-token-bar { padding:4px 14px; background:rgba(5,99,187,0.04); border-bottom:1px solid var(--cb-border); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
  .cb-token-label { font-family:var(--cb-font); font-size:10px; color:var(--cb-text-muted); }
  .cb-token-track { flex:1; height:3px; background:var(--cb-border); border-radius:999px; margin:0 8px; overflow:hidden; }
  .cb-token-fill { height:100%; border-radius:999px; background:var(--cb-accent); transition:width 0.4s ease; }
  .cb-token-fill.warn { background:#e59405; }
  .cb-token-fill.danger { background:#e53e3e; }

  /* Messages */
  .cb-messages { flex:1; overflow-y:auto; padding:16px 14px; display:flex; flex-direction:column; gap:10px; scroll-behavior:smooth; }
  .cb-messages::-webkit-scrollbar { width:4px; }
  .cb-messages::-webkit-scrollbar-thumb { background:rgba(5,99,187,0.15); border-radius:4px; }
  .cb-msg { display:flex; gap:8px; align-items:flex-end; animation:cb-msgIn 0.25s ease forwards; }
  .cb-msg.user { flex-direction:row-reverse; }
  .cb-msg-avatar { width:26px; height:26px; border-radius:50%; background:var(--cb-surface); border:1px solid var(--cb-border); display:flex; align-items:center; justify-content:center; font-size:11px; color:var(--cb-accent); flex-shrink:0; overflow:hidden; }
  .cb-msg-avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; }

  /* Bubble chat */
  .cb-msg-bubble { max-width:80%; padding:10px 14px; border-radius:14px; font-family:var(--cb-font-body); font-size:13px; line-height:1.65; color:var(--cb-text); background:var(--cb-surface); border:1px solid var(--cb-border); word-break:break-word; }
  .cb-msg.user .cb-msg-bubble { background:var(--cb-accent); color:#fff; border-color:var(--cb-accent); border-bottom-right-radius:4px; }
  .cb-msg.bot .cb-msg-bubble { border-bottom-left-radius:4px; }

  /* Markdown rendering di dalam bubble */
  .cb-msg-bubble a { color:var(--cb-accent); text-decoration:underline; word-break:break-all; }
  .cb-msg.user .cb-msg-bubble a { color:#cce0ff; }
  .cb-msg-bubble strong { font-weight:700; }
  .cb-msg-bubble em { font-style:italic; }
  .cb-msg-bubble code { background:rgba(5,99,187,0.08); color:var(--cb-accent); padding:1px 5px; border-radius:4px; font-family:"Courier New",monospace; font-size:12px; }
  .cb-msg.user .cb-msg-bubble code { background:rgba(255,255,255,0.2); color:#fff; }
  .cb-msg-bubble pre { background:rgba(5,99,187,0.06); border:1px solid var(--cb-border); border-radius:8px; padding:10px 12px; margin:6px 0; overflow-x:auto; }
  .cb-msg-bubble pre code { background:none; padding:0; color:var(--cb-text); font-size:12px; }
  .cb-msg-bubble ul, .cb-msg-bubble ol { padding-left:18px; margin:6px 0; display:flex; flex-direction:column; gap:3px; }
  .cb-msg-bubble ul li { list-style:disc; }
  .cb-msg-bubble ol li { list-style:decimal; }
  .cb-msg-bubble li { font-size:13px; line-height:1.55; }
  .cb-msg-bubble blockquote { border-left:3px solid var(--cb-accent); padding-left:10px; margin:6px 0; opacity:0.75; font-style:italic; }
  .cb-msg-bubble hr { border:none; border-top:1px solid var(--cb-border); margin:8px 0; }

  /* Typing */
  .cb-typing .cb-msg-bubble { padding:12px 16px; }
  .cb-dots { display:flex; gap:4px; align-items:center; height:14px; }
  .cb-dots span { width:6px; height:6px; border-radius:50%; background:var(--cb-text-muted); animation:cb-dot 1.2s ease-in-out infinite; }
  .cb-dots span:nth-child(2) { animation-delay:0.2s; }
  .cb-dots span:nth-child(3) { animation-delay:0.4s; }

  /* Dynamic suggestions */
  .cb-suggestions { padding:0 14px 10px; display:flex; flex-wrap:wrap; gap:6px; flex-shrink:0; transition:all 0.3s; }
  .cb-suggestion-btn { padding:5px 11px; border-radius:20px; border:1px solid var(--cb-accent); background:rgba(5,99,187,0.05); color:var(--cb-accent); font-family:var(--cb-font); font-size:11px; font-weight:500; cursor:pointer; transition:all 0.2s; white-space:nowrap; animation:cb-msgIn 0.3s ease forwards; }
  .cb-suggestion-btn:hover { background:var(--cb-accent); color:#fff; transform:translateY(-1px); box-shadow:0 3px 8px rgba(5,99,187,0.25); }

  /* Input */
  .cb-input-area { padding:10px 14px 14px; border-top:1px solid var(--cb-border); display:flex; gap:8px; align-items:flex-end; flex-shrink:0; background:var(--cb-bg); }
  #cb-input { flex:1; border:1.5px solid var(--cb-border); border-radius:12px; padding:9px 13px; font-family:var(--cb-font-body); font-size:13px; color:var(--cb-text); background:var(--cb-surface); resize:none; outline:none; max-height:100px; min-height:38px; line-height:1.5; transition:border-color 0.2s,box-shadow 0.2s; }
  #cb-input:focus { border-color:var(--cb-accent); box-shadow:0 0 0 3px rgba(5,99,187,0.1); }
  #cb-input::placeholder { color:var(--cb-text-muted); }
  #cb-send { width:38px; height:38px; border-radius:10px; background:var(--cb-accent); color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px; transition:background 0.2s,transform 0.15s; flex-shrink:0; }
  #cb-send:hover { background:var(--cb-accent-dark); transform:scale(1.05); }
  #cb-send:disabled { background:var(--cb-border); cursor:not-allowed; transform:none; }

  /* Animations */
  @keyframes cb-popIn  { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
  @keyframes cb-msgIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes cb-pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.3)} }
  @keyframes cb-dot { 0%,60%,100%{transform:translateY(0);opacity:0.4} 30%{transform:translateY(-5px);opacity:1} }

  @media (max-width:768px) {
    #cb-window { width:calc(100vw - 32px); right:16px; bottom:80px; max-height:70vh; }
    #cb-bubble { bottom:16px; right:16px; }
    #cb-notif  { bottom:60px; right:14px; }
    #cb-tooltip { display:none; }
  }
`;

// ── MARKDOWN PARSER ───────────────────────────────────────────────────────
function parseMarkdown(raw) {
  let html = raw
    // Escape HTML dulu
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    // Code block (``` ```)
    .replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
      `<pre><code>${code.trim()}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr>')
    // URL auto-linkify (trailing punctuation excluded)
    .replace(/(https?:\/\/[^\s&lt;&gt;&quot;]+?)([.,!?:;）)]*(?:\s|$))/g,
      '<a href="$1" target="_blank" rel="noopener">$1</a>$2');

  // Bullet list: baris yang mulai dengan "- " atau "* "
  html = html.replace(/((?:^[ \t]*[-*] .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(line =>
      `<li>${line.replace(/^[ \t]*[-*] /, '').trim()}</li>`
    ).join('');
    return `<ul>${items}</ul>`;
  });

  // Ordered list: baris yang mulai dengan "1. "
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(line =>
      `<li>${line.replace(/^\d+\. /, '').trim()}</li>`
    ).join('');
    return `<ol>${items}</ol>`;
  });

  // Newline → <br> (kecuali di dalam block elements)
  html = html.replace(/\n/g, '<br>');
  // Fix double <br> setelah block elements
  html = html.replace(/(<\/ul>|<\/ol>|<\/pre>|<hr>)<br>/g, '$1');

  return html;
}

// ── DETECT TOPIC untuk dynamic suggestions ────────────────────────────────
function detectTopic(text) {
  const t = text.toLowerCase();
  if (/skill|stack|tool|framework|html|css|js|php|laravel|figma|bisa apa/.test(t)) return 'skills';
  if (/project|portfolio|karya|bikin|develop|website|app/.test(t)) return 'portfolio';
  if (/kerja|intern|freelance|pengalaman|experience|magang/.test(t)) return 'experience';
  if (/kontak|hire|collab|email|wa|whatsapp|hubungi|rate/.test(t)) return 'contact';
  if (/kuliah|kampus|universitas|semester|jurusan|ipk|kp/.test(t)) return 'education';
  if (/sertifik|certif|dicoding|google|aws|kursus/.test(t)) return 'certification';
  return 'general';
}

// ── MAIN CLASS ────────────────────────────────────────────────────────────
class EkaChatbot {
  constructor() {
    this.isOpen    = false;
    this.isLoading = false;
    this.history   = []; // full history lokal
    this.context   = null;
    this.avatarUrl = BOT_PHOTO_URL;

    this._injectStyles();
    this._injectHTML();
    this._bindEvents();
    this._loadContext();

    setTimeout(() => this._showTooltip(), 3000);
  }

  _injectStyles() {
    const s = document.createElement('style');
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  _injectHTML() {
    const wrap = document.createElement('div');
    wrap.id = 'cb-root';
    wrap.innerHTML = `
      <div id="cb-tooltip">${_rand(TOOLTIP_MSGS)}</div>
      <div id="cb-notif"></div>
      <button id="cb-bubble" aria-label="Buka chatbot">
        <i class="fas fa-comment-dots cb-icon-chat"></i>
        <i class="fas fa-times cb-icon-close"></i>
      </button>
      <div id="cb-window" role="dialog" aria-label="Chatbot Eka Danar">
        <div class="cb-header">
          <div class="cb-avatar" id="cb-header-avatar">
            ${this.avatarUrl ? `<img src="${this.avatarUrl}" alt="Danar">` : 'D'}
          </div>
          <div class="cb-header-info">
            <div class="cb-header-name">Danar Alter</div>
            <div class="cb-header-status"><span class="cb-status-dot"></span>Online — AI Ver.</div>
          </div>
          <div class="cb-header-actions">
            <button class="cb-icon-btn" id="cb-clear" title="Reset percakapan">
              <i class="fas fa-rotate-right"></i>
            </button>
          </div>
        </div>
        <div id="cb-token-bar">
          <span class="cb-token-label" id="cb-token-label">0 / ${MAX_HISTORY} pesan</span>
          <div class="cb-token-track"><div class="cb-token-fill" id="cb-token-fill" style="width:0%"></div></div>
        </div>
        <div class="cb-messages" id="cb-messages"></div>
        <div class="cb-suggestions" id="cb-suggestions"></div>
        <div class="cb-input-area">
          <textarea id="cb-input" placeholder="Tanya apa aja tentang Danar..." rows="1"></textarea>
          <button id="cb-send" aria-label="Kirim"><i class="fas fa-paper-plane"></i></button>
        </div>
      </div>`;
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

    this._renderSuggestions(SUGGESTIONS_INIT);
  }

  async _loadContext() {
    try {
      const [profRes, eduRes, skillRes, expRes, eventRes, certRes, portfolioRes] = await Promise.all([
        supabase.from('profile').select('*').single(),
        supabase.from('education').select('*').order('sort_order'),
        supabase.from('skills').select('*').order('sort_order').limit(40),
        supabase.from('experience').select('*').order('sort_order').limit(20),
        supabase.from('events').select('*').order('sort_order').limit(20),
        supabase.from('certifications').select('*').order('sort_order').limit(20),
        supabase.from('portfolio')
          .select('title, type, tags, year, url_live, url_github')
          .eq('is_published', true).order('sort_order').limit(20),
      ]);
      this.context = {
        profile:        profRes.data       || {},
        education:      eduRes.data        || [],
        skills:         skillRes.data      || [],
        experience:     expRes.data        || [],
        events:         eventRes.data      || [],
        certifications: certRes.data       || [],
        portfolio:      portfolioRes.data  || [],
      };
      if (!this.avatarUrl && this.context.profile.photo_url) {
        this.avatarUrl = this.context.profile.photo_url;
        const el = document.getElementById('cb-header-avatar');
        if (el) el.innerHTML = `<img src="${this.avatarUrl}" alt="Danar">`;
      }
    } catch (err) {
      console.warn('Chatbot: gagal load context', err);
      this.context = {};
    }
    this._addBotMessage(this._buildGreeting());
  }

  _buildGreeting() {
    const name  = this.context?.profile?.full_name?.split(' ')[0] || 'Danar';
    const count = this.context?.portfolio?.length || 0;
    const gs = [
      `Yo! Gw ${name} — versi AI 🤖\nTanya soal skills, project, pengalaman, atau cara kontak gw. Gas!`,
      `Hei! Gw AI-nya ${name}.\nMau tau soal skill, karya, atau pengalaman gw? Tanya aja langsung.`,
      `Sup! Gw ${name} tapi versi digital 🤖\n${count > 0 ? `Gw punya ${count} project di portfolio. ` : ''}Mau mulai dari mana?`,
    ];
    return _rand(gs);
  }

  // ── Context window trimming ───────────────────────────────────────────
  _getTrimmedHistory() {
    // Ambil MAX_HISTORY pesan terakhir aja yang dikirim ke backend
    return this.history.slice(-MAX_HISTORY);
  }

  _updateTokenBar() {
    const count = this.history.length;
    const pct   = Math.min((count / MAX_HISTORY) * 100, 100);
    const fill  = document.getElementById('cb-token-fill');
    const label = document.getElementById('cb-token-label');
    if (!fill || !label) return;
    fill.style.width = pct + '%';
    fill.className = 'cb-token-fill' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warn' : '');
    label.textContent = `${count} / ${MAX_HISTORY} pesan`;
  }

  // ── Dynamic suggestions ───────────────────────────────────────────────
  _renderSuggestions(list) {
    const wrap = document.getElementById('cb-suggestions');
    wrap.innerHTML = '';
    wrap.style.display = 'flex';
    list.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'cb-suggestion-btn';
      btn.textContent = q;
      btn.addEventListener('click', () => {
        document.getElementById('cb-input').value = q;
        this._send();
      });
      wrap.appendChild(btn);
    });
  }

  _updateDynamicSuggestions(botReply) {
    const topic = detectTopic(botReply);
    const pool  = DYNAMIC_SUGGESTIONS[topic] || DYNAMIC_SUGGESTIONS.general;
    // Pilih 3 random dari pool
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    this._renderSuggestions(shuffled);
  }

  // ── Send & backend ────────────────────────────────────────────────────
  async _send() {
    const input = document.getElementById('cb-input');
    const text  = input.value.trim();
    if (!text || this.isLoading) return;

    // Sembunyikan suggestions saat ngetik
    document.getElementById('cb-suggestions').style.display = 'none';
    input.value = '';
    input.style.height = 'auto';
    this._addUserMessage(text);
    this.history.push({ role: 'user', parts: [{ text }] });
    this._updateTokenBar();

    await this._callBackend(1);
  }

  async _callBackend(attempt) {
    const MAX_ATTEMPTS = 3;
    this.isLoading = true;
    document.getElementById('cb-send').disabled = true;
    const typingId = this._addTyping();

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Kirim HANYA trimmed history ke backend
        body: JSON.stringify({ contents: this._getTrimmedHistory() }),
      });

      const data = await response.json();
      this._removeTyping(typingId);

      if (response.status === 429 || data?.error?.code === 429) {
        const retryMsg   = data?.error?.message || '';
        const retryMatch = retryMsg.match(/retry in ([\d.]+)s/i);
        const retryAfter = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 10;
        if (attempt < MAX_ATTEMPTS) {
          const cid = this._addCountdownMessage(retryAfter, attempt, MAX_ATTEMPTS);
          await this._countdown(retryAfter, cid);
          document.getElementById(cid)?.remove();
          await this._callBackend(attempt + 1);
        } else {
          this.history.pop();
          this._addBotMessage(_rand(ERROR_OVERLOAD));
        }
        return;
      }

      if (data.error) {
        this.history.pop();
        this._addBotMessage(_rand(ERROR_BACKEND));
        return;
      }

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
        || 'Sorry gw ngeblank sebentar, coba lagi ya.';

      this.history.push({ role: 'model', parts: [{ text: reply }] });
      this._updateTokenBar();
      this._addBotMessage(reply);

      // Update dynamic suggestions berdasarkan reply bot
      setTimeout(() => this._updateDynamicSuggestions(reply), 400);

    } catch (err) {
      this._removeTyping(typingId);
      this.history.pop();
      this._addBotMessage(_rand(ERROR_NETWORK));
      console.error('Chatbot fetch error:', err);
    } finally {
      this.isLoading = false;
      document.getElementById('cb-send').disabled = false;
      document.getElementById('cb-input')?.focus();
    }
  }

  // ── UI Helpers ────────────────────────────────────────────────────────
  _addCountdownMessage(seconds, attempt, max) {
    const msgs = document.getElementById('cb-messages');
    const id   = 'cb-countdown-' + Date.now();
    const div  = document.createElement('div');
    div.className = 'cb-msg bot';
    const av = this.avatarUrl ? `<img src="${this.avatarUrl}" alt="Danar">` : '<i class="fas fa-robot"></i>';
    div.innerHTML = `
      <div class="cb-msg-avatar">${av}</div>
      <div class="cb-msg-bubble">
        Lagi rame nih 🔄 Auto-retry dalam <strong id="${id}-sec">${seconds}</strong>s...
        <span style="opacity:0.5;font-size:11px;display:block;margin-top:3px">Percobaan ${attempt} dari ${max}</span>
      </div>`;
    msgs.appendChild(div);
    this._scrollToBottom();
    return id;
  }

  _countdown(seconds, countdownId) {
    return new Promise(resolve => {
      let r = seconds;
      const el = document.getElementById(`${countdownId}-sec`);
      const iv = setInterval(() => {
        r--;
        if (el) el.textContent = r;
        if (r <= 0) { clearInterval(iv); resolve(); }
      }, 1000);
    });
  }

  _toggle() {
    this.isOpen = !this.isOpen;
    document.getElementById('cb-bubble').classList.toggle('open', this.isOpen);
    document.getElementById('cb-window').classList.toggle('open', this.isOpen);
    document.getElementById('cb-notif').classList.add('hidden');
    document.getElementById('cb-tooltip').classList.remove('visible');
    if (this.isOpen) {
      setTimeout(() => document.getElementById('cb-input')?.focus(), 300);
      this._scrollToBottom();
    }
  }

  _reset() {
    this.history = [];
    document.getElementById('cb-messages').innerHTML = '';
    this._updateTokenBar();
    this._renderSuggestions(SUGGESTIONS_INIT);
    this._addBotMessage(this._buildGreeting());
  }

  _addUserMessage(text) {
    const msgs = document.getElementById('cb-messages');
    const div  = document.createElement('div');
    div.className = 'cb-msg user';
    // User message pakai escape biasa (ga perlu markdown)
    div.innerHTML = `
      <div class="cb-msg-avatar"><i class="fas fa-user"></i></div>
      <div class="cb-msg-bubble">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
    msgs.appendChild(div);
    this._scrollToBottom();
  }

  _addBotMessage(text) {
    const msgs = document.getElementById('cb-messages');
    const div  = document.createElement('div');
    div.className = 'cb-msg bot';
    const av = this.avatarUrl ? `<img src="${this.avatarUrl}" alt="Danar">` : `<i class="fas fa-robot"></i>`;
    div.innerHTML = `
      <div class="cb-msg-avatar">${av}</div>
      <div class="cb-msg-bubble">${parseMarkdown(text)}</div>`;
    msgs.appendChild(div);
    this._scrollToBottom();
  }

  _addTyping() {
    const msgs = document.getElementById('cb-messages');
    const id   = 'cb-typing-' + Date.now();
    const div  = document.createElement('div');
    div.className = 'cb-msg bot cb-typing';
    div.id = id;
    const av = this.avatarUrl ? `<img src="${this.avatarUrl}" alt="Danar">` : `<i class="fas fa-robot"></i>`;
    div.innerHTML = `
      <div class="cb-msg-avatar">${av}</div>
      <div class="cb-msg-bubble"><div class="cb-dots"><span></span><span></span><span></span></div></div>`;
    msgs.appendChild(div);
    this._scrollToBottom();
    return id;
  }

  _removeTyping(id) { document.getElementById(id)?.remove(); }

  _scrollToBottom() {
    const msgs = document.getElementById('cb-messages');
    if (msgs) setTimeout(() => msgs.scrollTop = msgs.scrollHeight, 50);
  }

  _showTooltip() {
    if (this.isOpen) return;
    const t = document.getElementById('cb-tooltip');
    t.textContent = _rand(TOOLTIP_MSGS);
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 4000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new EkaChatbot());
} else {
  new EkaChatbot();
}