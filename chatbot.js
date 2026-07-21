/**
 * chatbot.js — Floating AI Chatbot "Danar Alter"
 * v5.5 — Greeting fix + retry persistent
 *
 * CHANGES dari v5.4:
 * - FIX #7: greeting tidak lagi menyebut "AI" — konsisten dengan identitas Danar
 * - FIX #8: retry button pakai data-attribute, tidak duplikat ID
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────
const BACKEND_URL    = 'https://backend-chatbot-self.vercel.app/api/chat';
const GREETING_URL   = 'https://backend-chatbot-self.vercel.app/api/greeting';
const BOT_PHOTO_URL  = './assets/bot_avatar.png';
const MAX_HISTORY    = 12;
const MAX_INPUT_CHAR = 300;
// ─────────────────────────────────────────────────────────────────────────

const SUGGESTIONS_INIT = [
    'Tech stack lo apa aja?',
    'Cerita dong soal project Kenco!',
    'Lo pernah juara lomba coding?',
    'Gimana cara kontak atau hire lo?',
];

const DYNAMIC_SUGGESTIONS = {
    skills:        ['Skill mana yang paling lo andelin?', 'Lo bisa desain juga?', 'Gimana cara lo belajar skill itu?'],
    portfolio:     ['Tech stack project Kenco apa aja?', 'Bisa gw lihat websitenya?', 'Lo lagi ngerjain project baru?'],
    experience:    ['Kerja di manufaktur sambil kuliah berat ga?', 'Lo handle berapa role di Kenco?', 'Ada tips kerja sambil kuliah?'],
    contact:       ['Bisa langsung DM lo?', 'Lo open buat freelance atau collab?', 'Email lo apa?'],
    education:     ['Jurusan TI di UPB gimana?', 'Lo aktif organisasi di kampus?', 'KP lo di mana rencananya?'],
    certification: ['Sertif Dicoding lo yang mana aja?', 'Cisco Networking Basic susah ga?', 'Rekomendasiin platform belajar dong'],
    tech:          ['HTML CSS JS cukup buat web dev sekarang?', 'PHP vs Node.js pilih mana?', 'Roadmap web dev buat pemula dari mana?'],
    career:        ['Tips kerja di industri manufaktur?', 'Fresh grad IT bisa langsung kerja di mana?', 'CV yang bagus buat IT itu kayak gimana?'],
    design:        ['Lo pakai Canva buat apa aja?', 'Gimana cara belajar UI/UX dari nol?', 'Portfolio desain yang bagus itu kayak gimana?'],
    bisnis:        ['Tips dapet klien pertama buat freelancer?', 'Cara mulai bisnis digital yang simpel?', 'Digital marketing buat pemula mulai dari mana?'],
    office:        ['Excel lo pake buat apa di kerjaan?', 'Google Spreadsheet vs Excel mending mana?', 'Tips Excel buat non-IT?'],
    achievement:   ['Kompetisi NCT itu ngoding apa aja?', 'Persiapan lo sebelum lomba gimana?', 'Lo ikut lomba lagi ga ke depannya?'],
    general:       ['Lagi sibuk ngerjain apa sekarang?', 'Skill apa yang lagi lo pelajarin?', 'Ada tips buat mahasiswa TI semester awal?'],
};

const TOOLTIP_MSGS = [
    'Hei! Ada yang bisa gw bantu? 👋',
    'Tanya apa aja soal gw!',
    'Psst, gw online nih 👀',
    'Mau tau skill gw? Tanya aja!',
];

const ERROR_OVERLOAD = [
    'Server lagi overload, coba lagi bentar 🔄',
    'API-nya lagi antri panjang, tunggu sebentar ya.',
    'Lagi rame banget nih, retry dulu deh.',
    'Waduh padet banget nih, bentar ya.',
];
const ERROR_BACKEND = [
    'Backend nge-lag, ketik ulang ya 😅',
    'Ada gangguan di server, coba sekali lagi.',
    'Hmm ada yang aneh di balik layar, kirim ulang pesan lo.',
    'Server lagi drama, coba lagi deh.',
];
const ERROR_NETWORK = [
    'Koneksi putus, cek internet lo dulu 📡',
    'Gagal nyambung ke server, refresh dulu bro.',
    'Network error nih, coba lagi sebentar.',
    'Sinyal ilang kayaknya, coba lagi ya.',
];

const _rand = arr => arr[Math.floor(Math.random() * arr.length)];

// ── STYLES ────────────────────────────────────────────────────────────────
const STYLES = `
  #cb-root {
    --cb-accent:#1c1c1a; --cb-accent-dark:#3a3a38; --cb-bg:#f0f0ef;
    --cb-surface:#e8e8e7; --cb-border:#d4d4d3; --cb-text:#1c1c1a;
    --cb-muted:#6e6e6c; --cb-radius:10px;
    --cb-shadow:0 12px 44px rgba(28,28,26,0.16);
    --cb-font:"General Sans",system-ui,sans-serif;
    --cb-body:"General Sans",system-ui,sans-serif;
    --cb-display:"General Sans",system-ui,sans-serif;
  }
  #cb-bubble{position:fixed;bottom:28px;right:28px;width:54px;height:54px;border-radius:50%;background:var(--cb-accent);color:var(--cb-bg);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 6px 24px rgba(28,28,26,0.28);z-index:9999;transition:transform .25s,background .2s;animation:cb-popIn .4s cubic-bezier(.34,1.56,.64,1) forwards}
  #cb-bubble:hover{background:var(--cb-accent-dark);transform:scale(1.08)}
  #cb-bubble.open{background:var(--cb-accent-dark)}
  #cb-bubble .cb-ic,#cb-bubble .cb-ix{position:absolute;transition:opacity .2s,transform .2s}
  #cb-bubble .cb-ix{opacity:0;transform:rotate(-90deg)}
  #cb-bubble.open .cb-ic{opacity:0;transform:rotate(90deg)}
  #cb-bubble.open .cb-ix{opacity:1;transform:rotate(0)}
  #cb-notif{position:fixed;bottom:70px;right:26px;width:11px;height:11px;border-radius:50%;background:#3d9e6e;border:2px solid var(--cb-bg);z-index:10000;animation:cb-pulse 1.6s ease-in-out infinite;transition:opacity .3s}
  #cb-notif.hidden{opacity:0;pointer-events:none}
  #cb-tip{position:fixed;bottom:38px;right:92px;background:var(--cb-accent);color:var(--cb-bg);padding:8px 14px;border-radius:6px;font-family:var(--cb-font);font-size:12px;font-weight:450;white-space:nowrap;z-index:9998;opacity:0;pointer-events:none;transition:opacity .25s}
  #cb-tip::after{content:'';position:absolute;right:-8px;top:50%;transform:translateY(-50%);border:5px solid transparent;border-left-color:var(--cb-accent)}
  #cb-tip.show{opacity:1}
  #cb-win{position:fixed;bottom:94px;right:28px;width:360px;max-height:580px;border-radius:var(--cb-radius);background:var(--cb-bg);border:1px solid var(--cb-border);box-shadow:var(--cb-shadow);display:flex;flex-direction:column;z-index:9998;overflow:hidden;opacity:0;transform:translateY(20px) scale(.95);pointer-events:none;transition:opacity .28s,transform .28s cubic-bezier(.34,1.2,.64,1)}
  #cb-win.open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}
  .cb-hdr{display:flex;align-items:center;gap:10px;padding:14px 16px;background:var(--cb-accent);color:var(--cb-bg);flex-shrink:0}
  .cb-av{width:36px;height:36px;border-radius:50%;background:rgba(240,240,239,.16);display:flex;align-items:center;justify-content:center;font-family:var(--cb-display);font-weight:450;font-size:14px;flex-shrink:0;overflow:hidden}
  .cb-av img{width:100%;height:100%;object-fit:cover;border-radius:50%}
  .cb-hi{flex:1}
  .cb-hn{font-family:var(--cb-display);font-size:13px;font-weight:450;line-height:1.2;letter-spacing:.2px}
  .cb-hs{font-family:var(--cb-font);font-size:10px;opacity:.75;display:flex;align-items:center;gap:5px}
  .cb-dot{width:6px;height:6px;border-radius:50%;background:#5fc492;display:inline-block;animation:cb-pulse 1.8s ease-in-out infinite}
  .cb-acts{display:flex;gap:6px}
  .cb-ibtn{background:rgba(240,240,239,.12);border:none;color:var(--cb-bg);width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;transition:background .2s}
  .cb-ibtn:hover{background:rgba(240,240,239,.26)}
  #cb-tbar{padding:3px 14px;background:var(--cb-surface);border-bottom:1px solid var(--cb-border);display:flex;align-items:center;gap:8px;flex-shrink:0}
  .cb-tlbl{font-family:var(--cb-font);font-size:10px;color:var(--cb-muted);white-space:nowrap}
  .cb-ttrack{flex:1;height:3px;background:var(--cb-border);border-radius:999px;overflow:hidden}
  .cb-tfill{height:100%;border-radius:999px;background:var(--cb-accent);transition:width .4s ease}
  .cb-tfill.warn{background:#b5893a}
  .cb-tfill.danger{background:#c0564f}
  .cb-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}
  .cb-msgs::-webkit-scrollbar{width:4px}
  .cb-msgs::-webkit-scrollbar-thumb{background:var(--cb-border);border-radius:4px}
  .cb-msg{display:flex;gap:8px;align-items:flex-end;animation:cb-in .25s ease forwards}
  .cb-msg.user{flex-direction:row-reverse}
  .cb-mav{width:26px;height:26px;border-radius:50%;background:var(--cb-surface);border:1px solid var(--cb-border);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--cb-text);flex-shrink:0;overflow:hidden}
  .cb-mav img{width:100%;height:100%;object-fit:cover;border-radius:50%}
  .cb-bbl{max-width:80%;padding:10px 14px;border-radius:10px;font-family:var(--cb-body);font-size:13.5px;line-height:1.7;color:var(--cb-text);background:var(--cb-surface);border:1px solid var(--cb-border);word-break:break-word}
  .cb-msg.user .cb-bbl{background:var(--cb-accent);color:var(--cb-bg);border-color:var(--cb-accent);border-bottom-right-radius:3px}
  .cb-msg.bot  .cb-bbl{border-bottom-left-radius:3px}
  .cb-cursor{display:inline-block;width:2px;height:14px;background:var(--cb-accent);margin-left:2px;vertical-align:middle;animation:cb-blink .7s step-end infinite}
  .cb-bbl a{color:var(--cb-text);font-weight:450;text-decoration:underline;word-break:break-all}
  .cb-msg.user .cb-bbl a{color:var(--cb-bg)}
  .cb-bbl strong{font-weight:450}
  .cb-bbl em{font-style:italic}
  .cb-bbl code{background:rgba(28,28,26,.07);color:var(--cb-text);padding:1px 5px;border-radius:3px;font-family:"Courier New",monospace;font-size:12px}
  .cb-msg.user .cb-bbl code{background:rgba(240,240,239,.2);color:var(--cb-bg)}
  .cb-bbl pre{background:rgba(28,28,26,.05);border:1px solid var(--cb-border);border-radius:6px;padding:10px 12px;margin:6px 0;overflow-x:auto}
  .cb-bbl pre code{background:none;padding:0;color:var(--cb-text);font-size:12px}
  .cb-bbl ul,.cb-bbl ol{padding-left:18px;margin:6px 0;display:flex;flex-direction:column;gap:3px}
  .cb-bbl ul li{list-style:disc}
  .cb-bbl ol li{list-style:decimal}
  .cb-bbl li{font-size:13.5px;line-height:1.6}
  .cb-bbl hr{border:none;border-top:1px solid var(--cb-border);margin:8px 0}
  #cb-counter{font-family:var(--cb-font);font-size:10px;color:var(--cb-muted);text-align:right;padding:0 14px 6px;flex-shrink:0;transition:color .2s}
  #cb-counter.warn{color:#b5893a}
  #cb-counter.danger{color:#c0564f}
  .cb-typing .cb-bbl{padding:12px 16px}
  .cb-dots{display:flex;gap:4px;align-items:center;height:14px}
  .cb-dots span{width:6px;height:6px;border-radius:50%;background:var(--cb-muted);animation:cb-dot 1.2s ease-in-out infinite}
  .cb-dots span:nth-child(2){animation-delay:.2s}
  .cb-dots span:nth-child(3){animation-delay:.4s}
  .cb-sugg{padding:0 14px 10px;display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0}
  .cb-sbtn{padding:6px 13px;border-radius:20px;border:1px solid var(--cb-border);background:transparent;color:var(--cb-muted);font-family:var(--cb-font);font-size:11.5px;font-weight:450;cursor:pointer;transition:all .2s;white-space:nowrap;animation:cb-in .3s ease forwards}
  .cb-sbtn:hover{background:var(--cb-accent);border-color:var(--cb-accent);color:var(--cb-bg)}
  .cb-iarea{padding:10px 14px 6px;border-top:1px solid var(--cb-border);display:flex;gap:8px;align-items:flex-end;flex-shrink:0;background:var(--cb-bg)}
  #cb-inp{flex:1;border:1px solid var(--cb-border);border-radius:8px;padding:9px 13px;font-family:var(--cb-body);font-size:13.5px;color:var(--cb-text);background:var(--cb-surface);resize:none;outline:none;max-height:100px;min-height:38px;line-height:1.5;transition:border-color .2s,box-shadow .2s}
  #cb-inp:focus{border-color:var(--cb-accent);box-shadow:0 0 0 3px rgba(28,28,26,.07)}
  #cb-inp::placeholder{color:var(--cb-muted)}
  #cb-snd{width:38px;height:38px;border-radius:8px;background:var(--cb-accent);color:var(--cb-bg);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:background .2s,transform .15s;flex-shrink:0}
  #cb-snd:hover{background:var(--cb-accent-dark);transform:scale(1.05)}
  #cb-snd:disabled{background:var(--cb-border);color:var(--cb-muted);cursor:not-allowed;transform:none}
  .cb-retry-wrap{display:flex;justify-content:flex-end;margin-top:-4px;margin-right:34px;margin-bottom:2px}
  .cb-retry{display:none;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;border:1px solid var(--cb-border);background:var(--cb-surface);color:var(--cb-muted);cursor:pointer;transition:all .2s;animation:cb-in .25s ease forwards}
  .cb-retry:hover{background:var(--cb-accent);border-color:var(--cb-accent);color:var(--cb-bg);transform:rotate(180deg)}
  .cb-retry i{font-size:12px}
  .cb-retry.show{display:flex}
  @keyframes cb-popIn{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
  @keyframes cb-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes cb-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.3)}}
  @keyframes cb-dot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}
  @keyframes cb-blink{50%{opacity:0}}
  @media(max-width:768px){
    #cb-win{width:calc(100vw - 32px);right:16px;bottom:80px;max-height:70vh}
    #cb-bubble{bottom:16px;right:16px}
    #cb-notif{bottom:60px;right:14px}
    #cb-tip{display:none}
  }
`;

// ── MARKDOWN PARSER ───────────────────────────────────────────────────────
function md(raw) {
    const urls = [];
    let s = raw.replace(/(https?:\/\/[^\s<>"]+?)([.,!?:;）)]*(?=\s|$))/g, (_, url, trail) => {
        const i = urls.length;
        urls.push(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${trail}`);
        return `\x00U${i}\x00`;
    });

    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    s = s.replace(/\x00U(\d+)\x00/g, (_, i) => urls[+i]);

    s = s
        .replace(/```[\w]*\n?([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trim()}</code></pre>`)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
        .replace(/^---$/gm, '<hr>');

    s = s.replace(/((?:^[ \t]*[-•] .+\n?)+)/gm, blk => {
        const items = blk.trim().split('\n').map(l => `<li>${l.replace(/^[ \t]*[-•] /, '').trim()}</li>`).join('');
        return `<ul>${items}</ul>`;
    });
    s = s.replace(/((?:^\d+\. .+\n?)+)/gm, blk => {
        const items = blk.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '').trim()}</li>`).join('');
        return `<ol>${items}</ol>`;
    });

    s = s.replace(/\n/g, '<br>').replace(/(<\/ul>|<\/ol>|<\/pre>|<hr>)<br>/g, '$1');
    return s;
}

function detectTopic(t) {
    t = t.toLowerCase();
    if (/skill|stack|tool|framework|html|css|javascript|php|mysql|bootstrap|bisa apa/.test(t))       return 'skills';
    if (/project|portfolio|karya|bikin|develop|website|app|kenco/.test(t))                           return 'portfolio';
    if (/kerja|intern|freelance|pengalaman|magang|manufaktur|produksi|maintenance|planning/.test(t))  return 'experience';
    if (/kontak|hire|collab|email|wa|whatsapp|hubungi|rate/.test(t))                                 return 'contact';
    if (/kuliah|kampus|universitas|semester|jurusan|upb|pelita bangsa|kp/.test(t))                   return 'education';
    if (/sertifik|certif|dicoding|cisco|credly|kursus|networking/.test(t))                           return 'certification';
    if (/excel|word|powerpoint|spreadsheet|office|google sheet/.test(t))                             return 'office';
    if (/juara|lomba|kompetisi|nct|fast|ngoding cepat|qcc|achievement/.test(t))                      return 'achievement';
    if (/laravel|codeigniter|react|vue|next|python|golang|roadmap|belajar coding|bahasa pemrograman/.test(t)) return 'tech';
    if (/cv|resume|fresh.?grad|karir|gaji|hiring|rekrut|industri|wfh|remote/.test(t))                return 'career';
    if (/desain|design|figma|ui|ux|canva|adobe|warna|tipografi|branding|logo/.test(t))               return 'design';
    if (/bisnis|klien|marketing|jualan|digital|startup|umkm|duit|income/.test(t))                    return 'bisnis';
    return 'general';
}

// ── MAIN CLASS ────────────────────────────────────────────────────────────
class EkaChatbot {
    constructor() {
        this.open         = false;
        this.loading      = false;
        this.history      = [];
        this.avatarUrl    = BOT_PHOTO_URL;
        this.ctx          = { name: 'Danar', portfolioCount: 0 };
        this.lastUserText = '';

        this._css();
        this._html();
        this._events();
        this._loadCtx();
        setTimeout(() => this._tooltip(), 3000);
    }

    _css() {
        const s = document.createElement('style');
        s.textContent = STYLES;
        document.head.appendChild(s);
    }

    _html() {
        const w = document.createElement('div');
        w.id = 'cb-root';
        w.innerHTML = `
          <div id="cb-tip">${_rand(TOOLTIP_MSGS)}</div>
          <div id="cb-notif"></div>
          <button id="cb-bubble" aria-label="Chatbot">
            <i class="fas fa-comment-dots cb-ic"></i>
            <i class="fas fa-times cb-ix"></i>
          </button>
          <div id="cb-win" role="dialog">
            <div class="cb-hdr">
              <div class="cb-av" id="cb-av">${this.avatarUrl ? `<img src="${this.avatarUrl}" alt="Danar">` : 'D'}</div>
              <div class="cb-hi">
                <div class="cb-hn">Danar Alter</div>
                <div class="cb-hs"><span class="cb-dot"></span>Online — Versi Digital</div>
              </div>
              <div class="cb-acts">
                <button class="cb-ibtn" id="cb-clr" title="Reset"><i class="fas fa-rotate-right"></i></button>
              </div>
            </div>
            <div id="cb-tbar">
              <span class="cb-tlbl" id="cb-tlbl">0 / ${MAX_HISTORY} pesan</span>
              <div class="cb-ttrack"><div class="cb-tfill" id="cb-tfill" style="width:0%"></div></div>
            </div>
            <div class="cb-msgs" id="cb-msgs"></div>
            <div class="cb-sugg" id="cb-sugg"></div>
            <div class="cb-iarea">
              <textarea id="cb-inp" placeholder="Tanya apa aja tentang Danar..." rows="1" maxlength="${MAX_INPUT_CHAR}"></textarea>
              <button id="cb-snd" aria-label="Kirim"><i class="fas fa-paper-plane"></i></button>
            </div>
            <div id="cb-counter" style="display:none">0 / ${MAX_INPUT_CHAR}</div>
          </div>`;
        document.body.appendChild(w);
    }

    _events() {
        document.getElementById('cb-bubble').onclick = () => this._toggle();
        document.getElementById('cb-snd').onclick    = () => this._send();
        document.getElementById('cb-clr').onclick    = () => this._reset();
        const inp = document.getElementById('cb-inp');
        inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._send(); } };
        inp.oninput   = () => {
            inp.style.height = 'auto';
            inp.style.height = Math.min(inp.scrollHeight, 100) + 'px';
            this._updateCounter(inp.value.length);
        };
        inp.onfocus = () => this._updateCounter(inp.value.length);
        this._renderSugg(SUGGESTIONS_INIT);
    }

    _updateCounter(len) {
        const el = document.getElementById('cb-counter');
        if (!el) return;
        el.style.display = len > 0 ? 'block' : 'none';
        el.textContent   = `${len} / ${MAX_INPUT_CHAR}`;
        el.className     = len >= MAX_INPUT_CHAR ? 'danger' : len >= MAX_INPUT_CHAR * 0.8 ? 'warn' : '';
    }

    async _loadCtx() {
        try {
            const res  = await fetch(GREETING_URL);
            const data = await res.json();
            this.ctx   = {
                name:           data.name           || 'Danar',
                portfolioCount: data.portfolioCount || 0,
            };
        } catch {
            this.ctx = { name: 'Danar', portfolioCount: 0 };
        }
        this._addBot(this._greeting());
    }

    // FIX #7: greeting tidak menyebut "AI" — konsisten dengan identitas Danar
    _greeting() {
        const { name, portfolioCount } = this.ctx;
        return _rand([
            `Yo! Gw ${name} — versi digital 🤖\nTanya soal skills, project, pengalaman, atau cara kontak gw.`,
            `Hei! Gw ${name}, versi digital.\nMau tau soal skill, karya, atau pengalaman gw? Tanya aja langsung.`,
            `Sup! Gw ${name} versi digital 🤖\n${portfolioCount > 0 ? `Gw punya ${portfolioCount} project di portfolio. ` : ''}Gas tanya apa aja!`,
        ]);
    }

    _updateBar() {
        while (this.history.length > MAX_HISTORY) {
            this.history.shift();
            if (this.history.length > 0 && this.history[0].role === 'model') {
                this.history.shift();
            }
        }
        while (this.history.length > 0 && this.history[0].role !== 'user') {
            this.history.shift();
        }

        const count = this.history.length;
        const pct   = (count / MAX_HISTORY) * 100;
        const fill  = document.getElementById('cb-tfill');
        const lbl   = document.getElementById('cb-tlbl');
        if (!fill || !lbl) return;
        fill.style.width = pct + '%';
        fill.className   = 'cb-tfill' + (pct >= 100 ? ' danger' : pct >= 66 ? ' warn' : '');
        lbl.textContent  = `${count} / ${MAX_HISTORY} pesan`;
    }

    _renderSugg(list) {
        const w = document.getElementById('cb-sugg');
        w.innerHTML = '';
        w.style.display = 'flex';
        list.forEach(q => {
            const b = document.createElement('button');
            b.className   = 'cb-sbtn';
            b.textContent = q;
            b.onclick     = () => { document.getElementById('cb-inp').value = q; this._send(); };
            w.appendChild(b);
        });
    }

    _dynSugg(reply) {
        const topic = detectTopic(reply);
        const pool  = DYNAMIC_SUGGESTIONS[topic] || DYNAMIC_SUGGESTIONS.general;
        this._renderSugg([...pool].sort(() => Math.random() - .5).slice(0, 3));
    }

    // ── FIX #6+#8: RETRY — pakai data-attribute, bukan ID ─────────────────

    _showRetry() {
        const wraps = document.querySelectorAll('.cb-retry-wrap');
        const last  = wraps[wraps.length - 1];
        if (last) last.querySelector('[data-retry]')?.classList.add('show');
    }

    _hideRetry() {
        document.querySelectorAll('.cb-retry-wrap').forEach(el => el.remove());
    }

    _retry() {
        if (this.loading || !this.lastUserText) return;
        const wraps = document.querySelectorAll('.cb-retry-wrap');
        const last  = wraps[wraps.length - 1];
        last?.querySelector('[data-retry]')?.classList.remove('show');
        this.history.push({ role: 'user', parts: [{ text: this.lastUserText }] });
        this._updateBar();
        this._call(1);
    }

    // ─────────────────────────────────────────────────────────────────────

    async _send() {
        const inp  = document.getElementById('cb-inp');
        const text = inp.value.trim();
        if (!text || this.loading) return;

        if (text.length > MAX_INPUT_CHAR) {
            this._addBot(`Pesannya kepanjangan — maksimal ${MAX_INPUT_CHAR} karakter ya 😄`);
            return;
        }

        this.lastUserText = text;
        this._hideRetry();

        document.getElementById('cb-sugg').style.display = 'none';
        inp.value        = '';
        inp.style.height = 'auto';
        this._updateCounter(0);
        this._addUser(text);
        this.history.push({ role: 'user', parts: [{ text }] });
        this._updateBar();
        await this._call(1);
    }

    async _call(attempt) {
        const MAX = 3;
        this.loading = true;
        document.getElementById('cb-snd').disabled = true;

        const bubbleId = 'cb-stream-' + Date.now();
        this._addStreamBubble(bubbleId);

        try {
            const trimmed = this.history
                .filter(m => m?.role && typeof m?.parts?.[0]?.text === 'string' && m.parts[0].text.trim());

            if (trimmed.length === 0) {
                this._removeEl(bubbleId);
                this.loading = false;
                document.getElementById('cb-snd').disabled = false;
                return;
            }

            const res = await fetch(BACKEND_URL, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ contents: trimmed, stream: true }),
            });

            if (res.status === 429) {
                this._removeEl(bubbleId);
                const data       = await res.json().catch(() => ({}));
                const retryMatch = (data?.error?.message || '').match(/retry in ([\d.]+)s/i);
                const wait       = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 10;
                if (attempt < MAX) {
                    const cid = this._addCountdown(wait, attempt, MAX);
                    await this._wait(wait, cid);
                    document.getElementById(cid)?.remove();
                    await this._call(attempt + 1);
                } else {
                    this.history.pop();
                    this._addBot(_rand(ERROR_OVERLOAD));
                    this._showRetry();
                }
                return;
            }

            if (!res.ok || !res.body) {
                this._removeEl(bubbleId);
                this.history.pop();
                this._addBot(_rand(ERROR_BACKEND));
                this._showRetry();
                return;
            }

            const reader  = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer    = '';
            let fullText  = '';
            const bubble  = document.getElementById(bubbleId);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    const t = line.trim();
                    if (!t || t === 'data: [DONE]') continue;
                    if (t.startsWith('data: ')) {
                        try {
                            const json = JSON.parse(t.slice(6));
                            if (json.error) throw new Error(json.error);
                            if (json.delta) {
                                fullText += json.delta;
                                if (bubble) {
                                    bubble.querySelector('.cb-bbl').innerHTML =
                                        md(fullText) + '<span class="cb-cursor"></span>';
                                    this._scroll();
                                }
                            }
                        } catch (_) {}
                    }
                }
            }

            if (!fullText.trim()) {
                this._removeEl(bubbleId);
                this.history.pop();
                this._addBot(_rand(ERROR_BACKEND));
                this._showRetry();
                return;
            }

            if (bubble) {
                bubble.querySelector('.cb-bbl').innerHTML = md(fullText);
            }

            this.history.push({ role: 'model', parts: [{ text: fullText }] });
            this._updateBar();
            setTimeout(() => this._dynSugg(fullText), 400);

        } catch (err) {
            this._removeEl(bubbleId);
            this.history.pop();
            this._addBot(_rand(ERROR_NETWORK));
            this._showRetry();
            console.error('[Chatbot] error:', err);
        } finally {
            this.loading = false;
            document.getElementById('cb-snd').disabled = false;
            document.getElementById('cb-inp')?.focus();
        }
    }

    _av() {
        return this.avatarUrl
            ? `<img src="${this.avatarUrl}" alt="Danar">`
            : `<i class="fas fa-robot"></i>`;
    }

    _addStreamBubble(id) {
        const msgs = document.getElementById('cb-msgs');
        const div  = document.createElement('div');
        div.className = 'cb-msg bot';
        div.id = id;
        div.innerHTML = `
          <div class="cb-mav">${this._av()}</div>
          <div class="cb-bbl">
            <div class="cb-dots"><span></span><span></span><span></span></div>
          </div>`;
        msgs.appendChild(div);
        this._scroll();
    }

    // FIX #8: pakai data-attribute, tidak pakai ID — hindari duplikat
    _addUser(text) {
        const msgs = document.getElementById('cb-msgs');

        const div  = document.createElement('div');
        div.className = 'cb-msg user';
        div.innerHTML = `
          <div class="cb-mav"><i class="fas fa-user"></i></div>
          <div class="cb-bbl">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
        msgs.appendChild(div);

        const retryWrap = document.createElement('div');
        retryWrap.className = 'cb-retry-wrap';
        retryWrap.innerHTML = `
          <button class="cb-retry" data-retry title="Kirim ulang pesan">
            <i class="fas fa-rotate-right"></i>
          </button>`;
        msgs.appendChild(retryWrap);

        retryWrap.querySelector('[data-retry]').onclick = () => this._retry();
        this._scroll();
    }

    _addBot(text) {
        const msgs = document.getElementById('cb-msgs');
        const div  = document.createElement('div');
        div.className = 'cb-msg bot';
        div.innerHTML = `<div class="cb-mav">${this._av()}</div><div class="cb-bbl">${md(text)}</div>`;
        msgs.appendChild(div);
        this._scroll();
    }

    _addCountdown(sec, attempt, max) {
        const msgs = document.getElementById('cb-msgs');
        const id   = 'cb-cd-' + Date.now();
        const div  = document.createElement('div');
        div.className = 'cb-msg bot';
        div.innerHTML = `
          <div class="cb-mav">${this._av()}</div>
          <div class="cb-bbl">
            Lagi rame nih 🔄 Auto-retry dalam <strong id="${id}-s">${sec}</strong>s...
            <span style="opacity:.5;font-size:11px;display:block;margin-top:3px">Percobaan ${attempt} dari ${max}</span>
          </div>`;
        msgs.appendChild(div);
        this._scroll();
        return id;
    }

    _wait(sec, id) {
        return new Promise(res => {
            let r  = sec;
            const el = document.getElementById(`${id}-s`);
            const iv = setInterval(() => {
                r--;
                if (el) el.textContent = r;
                if (r <= 0) { clearInterval(iv); res(); }
            }, 1000);
        });
    }

    _removeEl(id) { document.getElementById(id)?.remove(); }

    _toggle() {
        this.open = !this.open;
        document.getElementById('cb-bubble').classList.toggle('open', this.open);
        document.getElementById('cb-win').classList.toggle('open', this.open);
        document.getElementById('cb-notif').classList.add('hidden');
        document.getElementById('cb-tip').classList.remove('show');
        if (this.open) {
            setTimeout(() => document.getElementById('cb-inp')?.focus(), 300);
            this._scroll();
        }
    }

    _reset() {
        this.history      = [];
        this.lastUserText = '';
        document.getElementById('cb-msgs').innerHTML = '';
        this._updateBar();
        this._renderSugg(SUGGESTIONS_INIT);
        this._addBot(this._greeting());
    }

    _scroll() {
        const m = document.getElementById('cb-msgs');
        if (m) setTimeout(() => m.scrollTop = m.scrollHeight, 50);
    }

    _tooltip() {
        if (this.open) return;
        const t = document.getElementById('cb-tip');
        t.textContent = _rand(TOOLTIP_MSGS);
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 4000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new EkaChatbot());
} else {
    new EkaChatbot();
}