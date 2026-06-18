-- Prospect full-scan reports: a founder-triggered, multi-model scan of an
-- arbitrary prospect site rendered at a unique public link (with a "Get started"
-- CTA). It reuses the real scan pipeline by creating a hidden "prospect brand",
-- so we (A) flag those brands so they never leak into a user's own dashboard and
-- (B) mint shareable report tokens for them.

-- ---------- A: brands.is_prospect ----------
-- True for the synthetic brands created by the admin prospect-report tool. Every
-- owner-facing brand query filters these out; the public report page reads them
-- via the service-role client.
alter table public.brands add column if not exists is_prospect boolean not null default false;

-- ---------- B: prospect_report_links — the report's public token ----------
-- Minted/revoked by the founder behind the admin gate, resolved with the
-- service-role client on the public /report/[token] page. Same convention as
-- metrics_share_links: RLS on, no policies = service-role only.
create table if not exists public.prospect_report_links (
  id         uuid primary key default gen_random_uuid(),
  brand_id   uuid not null references public.brands(id) on delete cascade,
  token      text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists prospect_report_links_brand_id_idx on public.prospect_report_links(brand_id);

alter table public.prospect_report_links enable row level security;
