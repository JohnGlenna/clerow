-- 0013_result_brand_domain
-- Store the resolved website host (e.g. "salesforce.com") for each ranked brand
-- so the dashboard can show a real logo/domain instead of guessing `<name>.com`.
-- Nullable + additive: older rows stay null and the UI falls back to the guess.

alter table public.result_brands add column if not exists domain text;
