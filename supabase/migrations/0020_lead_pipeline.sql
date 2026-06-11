-- Lead pipeline automation (cron qualify → scan → Outbox → one-click send).
--
-- New status 'rejected': the quality gate (or the admin skipping a draft)
-- parked this lead — dead/empty/parked site or wrong website. Never re-picked
-- by the pipeline; reject_reason says why.
-- emailed_at: when the outreach email was actually sent through Gmail — also
-- drives the daily send cap (count of today's emailed_at).

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new','scanned','emailed','replied','customer','rejected'));

alter table public.leads add column if not exists reject_reason text;
alter table public.leads add column if not exists emailed_at timestamptz;
