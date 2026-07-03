-- The prospect scan no longer takes a manual "Category / niche": buyer prompts
-- and the competitor judgment are grounded in the crawled homepage instead.
-- New rows stop writing category; old rows keep theirs for reference.
alter table public.prospect_scans alter column category drop not null;
