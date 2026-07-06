# Contact Form + WhatsApp Button — Design

## Goal
Give visitors a dedicated way to reach out — a contact form (stored for Danar to read later) and a one-click WhatsApp button — without changing the site's existing look and feel.

## Scope
- New page `contact.html`, added as the 8th nav item (after "Events")
- Contact form (Nama, Email, Subjek, Pesan) that saves submissions to a new Supabase `messages` table
- "Chat via WhatsApp" button linking to `wa.me/<profile.phone>`, empty chat (no pre-filled text)
- Email + social links repeated here (already exist elsewhere) for convenience
- New admin panel page "Pesan" to view and delete submitted messages

Out of scope: email notifications on new message, read/unread status, a new email service (Resend/SendGrid), rate limiting beyond what already exists in the codebase, WA number stored separately from `profile.phone`.

## Layout (approved via visual mockup, Option A)

Split layout, matching the existing `.page-header` (title + subtitle) convention used on every other page:

- **Left column:** "Let's talk." heading, short subtitle, green "Chat via WhatsApp" button, email line, row of social icons (reuse the existing footer/nav-overlay social links)
- **Right column:** the form — Nama, Email, Subjek, Pesan (textarea), Kirim Pesan button

On mobile (`max-width: 768px`), columns stack: info column first, form below — same responsive pattern already used elsewhere on the site (e.g., `.hero-bottom` stacking).

## Data Model

New table:

```sql
create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

-- Anyone (anonymous visitors) can submit the form
create policy "Public insert messages" on messages
  for insert with check (true);

-- Only the logged-in admin can read or delete messages
create policy "Auth read messages" on messages
  for select using (auth.role() = 'authenticated');

create policy "Auth delete messages" on messages
  for delete using (auth.role() = 'authenticated');
```

This mirrors the existing RLS convention in `supabase_schema.sql` (`Public read X` / `Auth insert X` policies on other tables) but inverted: here, INSERT is public and SELECT/DELETE are admin-only, since a message needs to be writable by anonymous visitors but readable only by Danar.

## Frontend (`contact.html`, new `assets/css/contact.css`, new `assets/js/contact.js`)

- `contact.html` follows the exact structural skeleton of every other page (`site-header`, `nav-overlay` — with the new 8th nav link added to **every page's** nav list, not just this one — `main#main-content`, `page-header`, `site.js` for the hamburger menu)
- The WhatsApp number is read from the existing `profile.phone` column (already fetched on other pages, e.g. via the chatbot's `formatPhone()` logic in `backend_resume/server.js` — the frontend needs its own lightweight digit-stripping since it has no access to that backend helper): strip non-digits, if it starts with `0` replace with `62`, then build `https://wa.me/<digits>`
- Form submission: on submit, insert a row into `messages` via the existing `supabase` client (same import as every other page's JS: `import { supabase } from '../../supabase.js'`) — no new backend endpoint, no `backend_resume` changes
- Success: toast/inline confirmation + clear the form fields
- Failure (network/RLS error): inline error message, form values preserved so the user doesn't retype
- Basic client-side validation: all fields except Subjek are required; Subjek is optional (nullable in the schema)

## Admin Panel (`admin.html`, `assets/js/admin.js`)

- New sidebar link `<button class="sidebar-link" data-page="messages"><i class="fas fa-envelope"></i> Pesan</button>` in `admin.html`, alongside the existing Profile/Skills/Portfolio/etc. links
- New `pageMap` entry: `messages: { title:'Pesan <span>Masuk</span>', load:loadMessages, hasAdd:false }` in `assets/js/admin.js`, following the exact pattern of the existing six entries (admin.js:131-136)
- `loadMessages()` fetches all rows from `messages` ordered by `created_at` descending, renders each as a card (name, email, subject, message, formatted date) with a delete button
- Delete removes the row from Supabase and re-renders the list (mirrors the existing delete pattern used for skills/portfolio/etc. elsewhere in `admin.js`)
- No pagination for v1 (YAGNI — a personal portfolio's contact volume doesn't need it; can be added later if it becomes a real problem)

## Edge Cases
- No messages yet → admin page shows an empty state ("Belum ada pesan masuk"), consistent with other admin pages' empty states
- `profile.phone` missing/null → WhatsApp button is hidden (same hidden-when-absent pattern as the CV download button), rather than linking to a broken `wa.me/` URL
- Form submitted with empty required field → client-side validation blocks submit before hitting Supabase
- Supabase insert fails (RLS misconfigured, network down) → user sees an error message and their typed text is preserved, not lost

## Testing
No automated test suite in this codebase (static site). Manual verification:
- Submit the contact form as a visitor, confirm success message + form clears, confirm the row appears in Supabase
- Submit with a missing required field, confirm client-side validation blocks it
- Open the new admin "Pesan" page, confirm the submitted message appears, confirm delete removes it
- Click "Chat via WhatsApp" and confirm it opens the correct WA chat with the number formatted correctly
- Confirm the new 8th nav link appears and works correctly on all 8 pages (the 7 existing + the new one)
- Resize to mobile width, confirm the two-column layout stacks (info first, form below)
