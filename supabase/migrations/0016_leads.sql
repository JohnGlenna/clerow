-- Outbound leads — businesses discovered by the admin Discover tab
-- (Brønnøysund / Product Hunt / Show HN) on /admin/prospect-scan.
--
-- This IS the entire sales CRM for now: one row per company (deduped on the
-- website domain) with a single status field moving
-- new → scanned → emailed → replied → customer. Re-fetching a source upserts
-- name/contact/meta but never touches status, so manual pipeline updates stick.

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  source      text not null check (source in ('brreg','producthunt','shownh')),
  name        text not null,
  website     text not null,                -- as discovered (may include scheme/path)
  website_key text not null,                -- normalized bare host, dedupe key
  email       text,
  phone       text,
  meta        jsonb not null default '{}'::jsonb,  -- source-specific: niche, place, tagline, topics, points…
  status      text not null default 'new'
              check (status in ('new','scanned','emailed','replied','customer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists leads_website_key_uniq on public.leads (website_key);
create index if not exists leads_status_idx on public.leads (status);

-- Managed exclusively by the admin API routes via the service-role client.
-- Enable RLS with no policies so nothing is reachable under a user/anon session.
alter table public.leads enable row level security;
