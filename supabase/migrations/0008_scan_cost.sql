-- Clerow scan cost ledger — records the estimated API cost (USD) of each scan so
-- the per-plan monthly budget can be enforced (see lib/billing/cost.ts +
-- limits.ts). Founder ($29) caps at $5/mo of spend, etc. Summed per user over a
-- rolling window; a scan that would exceed the remaining budget is refused.

alter table public.scans add column if not exists est_cost numeric not null default 0;

create index if not exists scans_brand_started_idx on public.scans(brand_id, started_at);
