-- Clerow "The Climb" — leveled task ladder + lightweight site audit.
--
-- Tasks gain a ladder `level` and a stable `ladder_key` so the ladder generator
-- can (a) group tasks into levels and (b) idempotently top up ONLY the active
-- level (locked levels insert nothing — this is what kills the dashboard task
-- flood). `ladder_key` is the stable slug per generated step (mirrors geoSteps
-- ids), so re-running the generator never duplicates a task.
--
-- Brands gain the latest lightweight site audit (robots.txt / llms.txt / H1 /
-- title / meta description / schema / HTTPS checks) as jsonb plus the time it
-- ran. Latest-only; no history table needed for v1. tasks/brands already carry
-- owner-scoped RLS from 0001, so no new policy is required.

alter table public.tasks add column if not exists level int;
alter table public.tasks add column if not exists ladder_key text;

-- One task per (brand, ladder_key): the safety net behind ensureLadderTasks'
-- select-missing-then-insert idempotency.
create unique index if not exists tasks_brand_ladder_key_uidx
  on public.tasks(brand_id, ladder_key)
  where ladder_key is not null;

create index if not exists tasks_brand_level_idx on public.tasks(brand_id, level);

alter table public.brands add column if not exists site_audit jsonb;
alter table public.brands add column if not exists site_audited_at timestamptz;
