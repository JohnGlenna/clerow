-- Admin metrics: (A) per-tool MCP usage log, (B) the global investor share link,
-- (C) subscriptions.canceled_at so cancellations have an honest timeline (the row
-- is upserted on user_id and updated_at is bumped by every webhook, so it can't
-- serve as a cancellation timestamp).

-- ---------- A: mcp_events — one row per MCP tool call ----------
-- Written fire-and-forget from the MCP tool layer with the service-role client;
-- read only by the admin dashboard. RLS on with no policies = service-role only.
create table if not exists public.mcp_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  brand_id    uuid references public.brands(id) on delete set null,
  key_id      uuid references public.api_keys(id) on delete set null,
  tool        text not null,
  ok          boolean not null default true,
  duration_ms integer,
  created_at  timestamptz not null default now()
);

create index if not exists mcp_events_user_idx on public.mcp_events(user_id, created_at desc);
create index if not exists mcp_events_created_idx on public.mcp_events(created_at);

alter table public.mcp_events enable row level security;

-- ---------- B: metrics_share_links — the investor page's global token ----------
-- Minted/revoked by the founder behind the admin gate, resolved with the
-- service-role client on the public /investors/[token] page. One active link
-- at a time (the API reuses the active row). RLS on, no policies.
create table if not exists public.metrics_share_links (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.metrics_share_links enable row level security;

-- ---------- C: subscriptions.canceled_at ----------
alter table public.subscriptions add column if not exists canceled_at timestamptz;

-- Backfill: updated_at is the best available approximation for rows that
-- churned before this column existed.
update public.subscriptions set canceled_at = updated_at
 where status = 'canceled' and canceled_at is null;
