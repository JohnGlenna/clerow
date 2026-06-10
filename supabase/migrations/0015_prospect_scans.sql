-- Prospect scans — the founder-only outreach tool at /admin/prospect-scan.
--
-- One row per ChatGPT (gpt-5.4-mini) visibility scan of a PROSPECT brand (not a
-- Clerow customer): which buyer prompts were asked, whether the prospect was
-- mentioned, which competitors were, and the generated cold-email copy.
-- Rows double as a 14-day cache keyed on website_key so the same prospect is
-- never paid for twice in a fortnight.

create table if not exists public.prospect_scans (
  id              uuid primary key default gen_random_uuid(),
  brand           text not null,
  website         text not null,            -- as entered (may include scheme/path)
  website_key     text not null,            -- normalized bare host, cache lookup key
  category        text not null,
  language        text not null default 'no' check (language in ('no','en')),
  mentioned_count int not null default 0,
  total_prompts   int not null default 6,
  competitors     jsonb not null default '[]'::jsonb,  -- [{name, mentions}]
  answers         jsonb not null default '[]'::jsonb,  -- [{prompt, answer, mentioned, competitors}]
  email_copy      text,                     -- "Subject: ...\n\n<body>" snapshot
  created_at      timestamptz not null default now()
);

create index if not exists prospect_scans_website_key_idx
  on public.prospect_scans (website_key, created_at desc);

-- Managed exclusively by the admin API routes via the service-role client.
-- Enable RLS with no policies so nothing is reachable under a user/anon session
-- (same pattern as oauth_clients / 0011).
alter table public.prospect_scans enable row level security;
