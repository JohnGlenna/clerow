-- Clerow initial schema
-- Tables: brands, prompts, scans, scan_results, result_brands, tasks
-- RLS enabled on all; owner-scoped to auth.uid(). Scan writes happen server-side
-- with the service-role key (which bypasses RLS).

create extension if not exists "pgcrypto";

-- ---------- enums ----------
do $$ begin
  create type prompt_intent   as enum ('solution','compare','problem','branded');
exception when duplicate_object then null; end $$;
do $$ begin
  create type prompt_volume   as enum ('high','medium','low','rising');
exception when duplicate_object then null; end $$;
do $$ begin
  create type prompt_source   as enum ('ai','user');
exception when duplicate_object then null; end $$;
do $$ begin
  create type scan_tier       as enum ('free','full');
exception when duplicate_object then null; end $$;
do $$ begin
  create type scan_status     as enum ('running','done','error');
exception when duplicate_object then null; end $$;
do $$ begin
  create type brand_sentiment as enum ('pos','neut','neg','warn');
exception when duplicate_object then null; end $$;

-- ---------- brands ----------
create table if not exists public.brands (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  url             text not null,
  company         text not null default '',
  industry        text not null default '',
  description     text not null default '',
  location        text not null default '',
  size            text not null default '',
  audience        text[] not null default '{}',
  competitors     text[] not null default '{}',
  differentiators text[] not null default '{}',
  geos            text[] not null default '{}',
  enrich_notes    text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists brands_user_id_idx on public.brands(user_id);

-- ---------- prompts ----------
create table if not exists public.prompts (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references public.brands(id) on delete cascade,
  text        text not null,
  intent      prompt_intent not null default 'solution',
  volume      prompt_volume not null default 'medium',
  is_primary  boolean not null default false,
  is_tracked  boolean not null default true,
  source      prompt_source not null default 'ai',
  created_at  timestamptz not null default now()
);
create index if not exists prompts_brand_id_idx on public.prompts(brand_id);

-- ---------- scans ----------
create table if not exists public.scans (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references public.brands(id) on delete cascade,
  tier        scan_tier not null default 'free',
  status      scan_status not null default 'running',
  engines     text[] not null default '{}',
  error       text,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists scans_brand_id_idx on public.scans(brand_id);

-- ---------- scan_results ----------
create table if not exists public.scan_results (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid not null references public.scans(id) on delete cascade,
  prompt_id       uuid not null references public.prompts(id) on delete cascade,
  engine          text not null,
  raw_answer      text not null default '',
  citations       jsonb not null default '[]'::jsonb,
  your_position   numeric,
  your_visibility numeric not null default 0,
  your_sentiment  numeric,
  created_at      timestamptz not null default now()
);
create index if not exists scan_results_scan_id_idx on public.scan_results(scan_id);

-- ---------- result_brands ----------
create table if not exists public.result_brands (
  id             uuid primary key default gen_random_uuid(),
  scan_result_id uuid not null references public.scan_results(id) on delete cascade,
  rank           int not null,
  name           text not null,
  is_you         boolean not null default false,
  visibility     numeric not null default 0,
  sentiment      brand_sentiment not null default 'neut',
  position       numeric
);
create index if not exists result_brands_scan_result_id_idx on public.result_brands(scan_result_id);

-- ---------- tasks ----------
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  brand_id   uuid not null references public.brands(id) on delete cascade,
  title      text not null,
  meta       text not null default '',
  xp         int not null default 0,
  impact     text not null default 'medium',
  done       boolean not null default false,
  source     text not null default 'scan',
  created_at timestamptz not null default now()
);
create index if not exists tasks_brand_id_idx on public.tasks(brand_id);

-- ---------- RLS ----------
alter table public.brands        enable row level security;
alter table public.prompts       enable row level security;
alter table public.scans         enable row level security;
alter table public.scan_results  enable row level security;
alter table public.result_brands enable row level security;
alter table public.tasks         enable row level security;

drop policy if exists brands_owner on public.brands;
create policy brands_owner on public.brands
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists prompts_owner on public.prompts;
create policy prompts_owner on public.prompts
  for all using (exists (select 1 from public.brands b where b.id = prompts.brand_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.brands b where b.id = prompts.brand_id and b.user_id = auth.uid()));

drop policy if exists scans_owner on public.scans;
create policy scans_owner on public.scans
  for all using (exists (select 1 from public.brands b where b.id = scans.brand_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.brands b where b.id = scans.brand_id and b.user_id = auth.uid()));

drop policy if exists tasks_owner on public.tasks;
create policy tasks_owner on public.tasks
  for all using (exists (select 1 from public.brands b where b.id = tasks.brand_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.brands b where b.id = tasks.brand_id and b.user_id = auth.uid()));

drop policy if exists scan_results_owner on public.scan_results;
create policy scan_results_owner on public.scan_results
  for all using (exists (
    select 1 from public.scans s join public.brands b on b.id = s.brand_id
    where s.id = scan_results.scan_id and b.user_id = auth.uid()))
  with check (exists (
    select 1 from public.scans s join public.brands b on b.id = s.brand_id
    where s.id = scan_results.scan_id and b.user_id = auth.uid()));

drop policy if exists result_brands_owner on public.result_brands;
create policy result_brands_owner on public.result_brands
  for all using (exists (
    select 1 from public.scan_results sr
    join public.scans s on s.id = sr.scan_id
    join public.brands b on b.id = s.brand_id
    where sr.id = result_brands.scan_result_id and b.user_id = auth.uid()))
  with check (exists (
    select 1 from public.scan_results sr
    join public.scans s on s.id = sr.scan_id
    join public.brands b on b.id = s.brand_id
    where sr.id = result_brands.scan_result_id and b.user_id = auth.uid()));
