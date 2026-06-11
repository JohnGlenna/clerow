-- Prospect scans now peek at the prospect's real homepage so the outreach
-- email can prove we looked ("I took a look at <domain> – …" + a concrete tip).
-- Stored alongside the scan so the admin UI can show what the crawler saw and
-- cached loads keep the evidence. Null for old rows / unreachable sites.

alter table public.prospect_scans
  add column if not exists site_peek jsonb;  -- {url, title, description, text, tip:{observation, tip}|null}
