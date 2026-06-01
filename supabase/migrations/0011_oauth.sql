-- OAuth 2.0 for the Clerow MCP server.
--
-- Lets a user connect Clerow to Claude (or any MCP client) by pasting the server
-- URL — Claude does Dynamic Client Registration (RFC 7591) + the authorization
-- code flow with PKCE, and we hand back an access token.
--
-- The access token itself is a regular Clerow API key (see api_keys / 0007), so
-- the MCP server resolves it with the existing resolveKey(). We only persist the
-- registered clients and the short-lived authorization codes here.

create table if not exists public.oauth_clients (
  client_id text primary key,
  client_name text,
  redirect_uris text[] not null default '{}',
  token_endpoint_auth_method text not null default 'none',
  created_at timestamptz not null default now()
);

create table if not exists public.oauth_codes (
  code text primary key,
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  code_challenge text,
  code_challenge_method text,
  scope text,
  resource text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists oauth_codes_expires_idx on public.oauth_codes (expires_at);

-- These tables are managed exclusively by the OAuth API routes via the
-- service-role client. Enable RLS with no policies so nothing is reachable under
-- a normal user/anon session.
alter table public.oauth_clients enable row level security;
alter table public.oauth_codes enable row level security;
