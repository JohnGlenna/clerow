-- Clerow historical snapshots — one aggregated row per brand per local day.
-- Powers week-over-week trends on Reports, and an anonymized cross-founder
-- leaderboard (ranked by latest overall score). Written by the authenticated
-- dashboard load and by the daily scan cron (service-role). RLS owner-scoped for
-- reads; the leaderboard reads via the service-role admin client.

create table if not exists public.brand_snapshots (
  id           uuid primary key default gen_random_uuid(),
  brand_id     uuid not null references public.brands(id) on delete cascade,
  captured_on  date not null,                 -- brand-local day
  overall      int  not null default 0,
  visibility   int  not null default 0,
  position     numeric,                        -- avg position across engines (nullable)
  sentiment    int,
  engines      int  not null default 0,        -- engines that had a result
  your_rank    int,                            -- rank among competitors (nullable)
  competitors  int  not null default 0,
  created_at   timestamptz not null default now(),
  unique (brand_id, captured_on)
);

create index if not exists brand_snapshots_brand_idx on public.brand_snapshots(brand_id, captured_on);

alter table public.brand_snapshots enable row level security;

drop policy if exists brand_snapshots_owner on public.brand_snapshots;
create policy brand_snapshots_owner on public.brand_snapshots
  for all using (exists (select 1 from public.brands b where b.id = brand_snapshots.brand_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.brands b where b.id = brand_snapshots.brand_id and b.user_id = auth.uid()));
