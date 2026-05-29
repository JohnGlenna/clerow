-- Clerow quest archive — split "completed" from "dismissed from the active list".
-- A quest is `done` once a user checks it (feeds the streak + lifetime XP); they
-- can then `archived` it to clear it from "Today's quests" so other quests show.
-- Archiving keeps `done`/`completed_at` intact, so it never costs the user streak
-- or XP. The Archive page reads archived rows; active lists filter them out.
-- Tasks already have owner-scoped RLS (from 0001), so no new policy is needed.

alter table public.tasks add column if not exists archived boolean not null default false;
alter table public.tasks add column if not exists archived_at timestamptz;

create index if not exists tasks_brand_archived_idx on public.tasks(brand_id, archived);
