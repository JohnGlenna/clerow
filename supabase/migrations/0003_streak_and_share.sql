-- Clerow streak + daily quests + shareable progress links
-- Adds: tasks.completed_at, tasks.for_date, brands.timezone,
--       brand_streak (Duolingo-style streak state), share_links (public report URLs).
-- RLS owner-scoped; the public share page reads via the service-role admin client.

-- ---------- tasks: completion timestamp + daily-quest day ----------
alter table public.tasks add column if not exists completed_at timestamptz;
alter table public.tasks add column if not exists for_date    date;

-- Existing done tasks count toward the streak from their creation day.
update public.tasks
   set completed_at = created_at
 where done and completed_at is null;

create index if not exists tasks_for_date_idx on public.tasks(brand_id, for_date);

-- ---------- brands: local timezone for day boundaries ----------
alter table public.brands add column if not exists timezone text not null default 'UTC';

-- ---------- brand_streak: persisted streak state (one row per brand) ----------
-- Freezes are *spent*, so the streak can't be purely derived — this row holds
-- the balance and which missed days a freeze covered. Recomputed by a
-- deterministic roll-forward (see lib/streak.ts) on authenticated dashboard load.
create table if not exists public.brand_streak (
  brand_id            uuid primary key references public.brands(id) on delete cascade,
  current_streak      int not null default 0,
  longest_streak      int not null default 0,
  freezes             int not null default 0,
  frozen_dates        date[] not null default '{}',
  last_evaluated_date date,
  updated_at          timestamptz not null default now()
);

-- ---------- share_links: public read-only progress URLs ----------
create table if not exists public.share_links (
  id         uuid primary key default gen_random_uuid(),
  brand_id   uuid not null references public.brands(id) on delete cascade,
  token      text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists share_links_brand_id_idx on public.share_links(brand_id);

-- ---------- RLS ----------
alter table public.brand_streak enable row level security;
alter table public.share_links  enable row level security;

drop policy if exists brand_streak_owner on public.brand_streak;
create policy brand_streak_owner on public.brand_streak
  for all using (exists (select 1 from public.brands b where b.id = brand_streak.brand_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.brands b where b.id = brand_streak.brand_id and b.user_id = auth.uid()));

drop policy if exists share_links_owner on public.share_links;
create policy share_links_owner on public.share_links
  for all using (exists (select 1 from public.brands b where b.id = share_links.brand_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.brands b where b.id = share_links.brand_id and b.user_id = auth.uid()));
