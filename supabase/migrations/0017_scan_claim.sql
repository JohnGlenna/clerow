-- Atomic scan claim: a brand-level lock so two concurrent run_full_scan calls
-- (e.g. an MCP client retrying after a timeout) can never both start a scan.
-- Claimed via a conditional UPDATE (null or expired -> now()); the 5-minute
-- expiry window in the claim query is the crash backstop.
alter table public.brands add column if not exists scan_claimed_at timestamptz;
