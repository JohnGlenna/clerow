-- Clerow cancellation feedback
-- Captures *why* a subscriber is leaving, collected by the survey shown before
-- we hand them off to the Stripe Billing Portal to actually cancel. One row per
-- submission (a user may cancel/resubscribe more than once). Users may insert
-- and read their own rows; churn analysis runs server-side via the service-role
-- key, which bypasses RLS.

create table if not exists public.cancellation_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  reason      text not null,                 -- the chosen survey reason
  detail      text,                          -- optional free-text elaboration
  plan        text,                          -- plan they were on at cancel time
  created_at  timestamptz not null default now()
);
create index if not exists cancellation_feedback_user_idx on public.cancellation_feedback(user_id);

alter table public.cancellation_feedback enable row level security;

drop policy if exists cancellation_feedback_insert_owner on public.cancellation_feedback;
create policy cancellation_feedback_insert_owner on public.cancellation_feedback
  for insert with check (auth.uid() = user_id);

drop policy if exists cancellation_feedback_select_owner on public.cancellation_feedback;
create policy cancellation_feedback_select_owner on public.cancellation_feedback
  for select using (auth.uid() = user_id);
