-- Clerow API keys — long-lived credentials for the Clerow MCP server.
--
-- The existing Bearer path (lib/supabase/server.ts) only accepts short-lived
-- Supabase JWTs, which expire and can't be pasted once into an MCP client config.
-- These keys are long-lived: we store only a SHA-256 hash (never the secret) plus
-- a short prefix for display. The MCP server resolves a presented key via the
-- service-role admin client (bypassing RLS) by hash; the dashboard manages keys
-- under owner-scoped RLS.

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  name text not null default 'MCP key',
  key_hash text not null unique,
  prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_user_idx on public.api_keys(user_id);

alter table public.api_keys enable row level security;

create policy "api_keys_select_own" on public.api_keys
  for select using (auth.uid() = user_id);
create policy "api_keys_insert_own" on public.api_keys
  for insert with check (auth.uid() = user_id);
create policy "api_keys_update_own" on public.api_keys
  for update using (auth.uid() = user_id);
create policy "api_keys_delete_own" on public.api_keys
  for delete using (auth.uid() = user_id);
