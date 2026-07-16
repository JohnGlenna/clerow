-- 3-email drip sequence for outreach leads.
--
-- Sequence state lives on the lead (drives the cron queue):
--   sequence_step    emails sent so far (0..3; 3 = sequence complete)
--   last_emailed_at  bumped on EVERY send (first touch + follow-ups)
--   smtp_message_id  Message-ID of email 1, so follow-ups thread in Gmail
--
-- outreach_sends is the full send log: one row per email actually sent.
-- It powers the admin Sent view and the rolling-24h send cap.

alter table public.leads
  add column if not exists sequence_step int not null default 0,
  add column if not exists last_emailed_at timestamptz,
  add column if not exists smtp_message_id text;

-- Every already-emailed lead enters the sequence at step 1; leads emailed
-- >3 days ago become due for follow-up #2 immediately (cap paces them out).
update public.leads
   set sequence_step = 1, last_emailed_at = emailed_at
 where status = 'emailed' and emailed_at is not null and sequence_step = 0;

create index if not exists leads_followup_due_idx
  on public.leads (last_emailed_at)
  where status = 'emailed' and sequence_step between 1 and 2;

create table if not exists public.outreach_sends (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  step       int  not null check (step between 1 and 3),
  to_email   text not null,
  subject    text not null,
  body       text not null,
  message_id text,
  sent_at    timestamptz not null default now()
);

create index if not exists outreach_sends_sent_at_idx on public.outreach_sends (sent_at desc);
create index if not exists outreach_sends_lead_idx on public.outreach_sends (lead_id);

-- Founder-only via the service-role client, like leads: RLS on, no policies.
alter table public.outreach_sends enable row level security;

-- Backfill step-1 log rows for already-emailed leads from their newest scan
-- draft. email_copy is packed as 'Subject: <s>\n\n<body>' (lib/prospect/persist.ts);
-- the case-guards mirror unpackEmail's fallback (no match -> whole text is body).
insert into public.outreach_sends (lead_id, step, to_email, subject, body, sent_at)
select l.id, 1, l.email,
       case when s.email_copy like 'Subject: %' and position(E'\n\n' in s.email_copy) > 0
            then regexp_replace(split_part(s.email_copy, E'\n\n', 1), '^Subject: ', '')
            else '' end,
       case when s.email_copy like 'Subject: %' and position(E'\n\n' in s.email_copy) > 0
            then substr(s.email_copy, position(E'\n\n' in s.email_copy) + 2)
            else s.email_copy end,
       l.emailed_at
  from public.leads l
  join lateral (
    select email_copy from public.prospect_scans
     where website_key = l.website_key and email_copy is not null
     order by created_at desc limit 1
  ) s on true
 where l.status = 'emailed' and l.emailed_at is not null and l.email is not null
   and not exists (select 1 from public.outreach_sends os where os.lead_id = l.id and os.step = 1);
