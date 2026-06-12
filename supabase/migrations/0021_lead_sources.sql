-- New lead-discovery sources: The Hub (Nordic startups), Y Combinator,
-- BetaList, and the generic startup-hub directory scraper.

alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads add constraint leads_source_check
  check (source in ('brreg','producthunt','shownh','thehub','ycombinator','betalist','directory'));
