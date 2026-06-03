-- OAuth 2.1 hardening for the Clerow MCP server (see app/api/oauth/*).
--
-- 0011 shipped the authorization-code + PKCE flow but issued non-expiring access
-- tokens (Clerow API keys) and no refresh tokens. OAuth 2.1 wants short-lived
-- access tokens that the client silently refreshes. This migration adds:
--   1. api_keys.expires_at  — access tokens now expire; resolveKey() rejects past it.
--   2. oauth_refresh_tokens — rotating refresh tokens the client uses to mint a new
--      access token without sending the user back through the browser.
--
-- Manually-minted keys (the legacy dashboard path) leave expires_at null = never
-- expires, so nothing existing breaks.

alter table public.api_keys
  add column if not exists expires_at timestamptz;

create table if not exists public.oauth_refresh_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  -- The access-token api_keys row minted alongside this refresh token. On refresh
  -- we revoke it and mint a fresh pair (refresh-token rotation, OAuth 2.1 §4.3.1).
  access_key_id uuid references public.api_keys(id) on delete set null,
  scope text,
  resource text,
  created_at timestamptz not null default now()
);

create index if not exists oauth_refresh_tokens_user_idx
  on public.oauth_refresh_tokens (user_id);

-- Service-role only, like oauth_clients / oauth_codes: RLS on, no policies.
alter table public.oauth_refresh_tokens enable row level security;
