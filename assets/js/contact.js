import { supabase } from '../../supabase.js?v=a77a873f';

function buildWhatsAppUrl(phone) {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  return `https://wa.me/${digits}`;
}

async function loadContactInfo() {
  const { data, error } = await supabase.from('profile').select('phone, email').single();
  if (error || !data) return;

  if (data.email) {
    document.getElementById('contactEmail').textContent = data.email;
  }

  if (data.phone) {
    const btn = document.getElementById('waButton');
    btn.href = buildWhatsAppUrl(data.phone);
    btn.style.display = '';
  }
}

loadContactInfo();

function setFormMsg(text, type) {
  const el = document.getElementById('contactFormMsg');
  el.textContent = text;
  el.className = `contact-form-msg ${type}`;
}

/* The message field has no box and no resize handle, so it grows to fit what
   is typed rather than scrolling inside itself. */
const messageField = document.getElementById('c_message');
function fitMessage() {
  messageField.style.height = 'auto';
  messageField.style.height = messageField.scrollHeight + 'px';
}
messageField.addEventListener('input', fitMessage);

const form = document.getElementById('contactForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name    = document.getElementById('c_name').value.trim();
  const email   = document.getElementById('c_email').value.trim();
  const subject = document.getElementById('c_subject').value.trim();
  const message = document.getElementById('c_message').value.trim();

  if (!name || !email || !message) {
    setFormMsg('Nama, email, dan pesan wajib diisi.', 'error');
    return;
  }

  const btn = document.getElementById('contactSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Mengirim...';
  setFormMsg('', '');

  const { error } = await supabase.from('messages').insert({
    name,
    email,
    subject: subject || null,
    message,
  });

  btn.disabled = false;
  btn.textContent = 'Kirim Pesan';

  if (error) {
    setFormMsg('Gagal mengirim pesan. Coba lagi bentar.', 'error');
    return;
  }

  form.reset();
  fitMessage();          // reset() empties it but leaves the grown height
  setFormMsg('Pesan terkirim! Gw bakal balas secepatnya 🙌', 'success');
});
