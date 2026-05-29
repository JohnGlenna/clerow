-- Clerow billing schema
-- One subscription row per user. All writes happen server-side via the
-- service-role key (the Stripe webhook), which bypasses RLS. Users may only
-- read their own row — there is no insert/update/delete policy for them.

create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  status                 text not null default 'incomplete',  -- active|trialing|past_due|canceled|incomplete|...
  plan                   text,                                 -- founder|team|enterprise
  price_id               text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_customer_idx on public.subscriptions(stripe_customer_id);

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_owner on public.subscriptions;
create policy subscriptions_select_owner on public.subscriptions
  for select using (auth.uid() = user_id);
