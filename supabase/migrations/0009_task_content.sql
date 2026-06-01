-- Clerow content cache — pre-warmed "Make content" drafts.
--
-- When a scan establishes the active Climb level, the background pre-warm
-- (lib/content/prewarm.ts) generates the copy-paste-ready draft for each
-- LLM-backed task ahead of time and stores it here, so opening a box is instant
-- instead of showing "Generating your content…". The content route also writes
-- through to this column on a live (cache-miss) generation. Deterministic
-- Level-1 audit fixes (robots.txt / llms.txt) are never cached — they're built
-- on the fly and already instant.

alter table public.tasks add column if not exists content text;
alter table public.tasks add column if not exists content_at timestamptz;
