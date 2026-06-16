-- app_settings: a tiny key→jsonb store for global, founder-controlled switches.
-- First use is the auto-scan kill switch read by the cron routes
-- (/api/cron/daily-scan + /api/cron/prospect-pipeline) and flipped from the
-- admin Prospect Scanner. RLS on with no policies = service-role only; the cron
-- routes and the admin API both reach it through createAdminClient (which
-- bypasses RLS), so no policy is needed.
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Seed the auto-scan kill switch OFF — automated scanning stays paused until a
-- founder flips it on in Admin → Prospect Scanner. Absent/non-true is also
-- treated as OFF in code, so there is never surprise API spend.
insert into public.app_settings (key, value)
values ('auto_scans_enabled', 'false'::jsonb)
on conflict (key) do nothing;
