-- The daily mood check-in on You's hub -- a father's ("How's today
-- treating you?"), separate from and lighter than the weekly recovery
-- check-in in parent_checkins (energy/help-available, see
-- 20260910092000_partner_name_and_checkins.sql). That one adapts content
-- (a "running on empty" answer surfaces quick meals); this one is a daily
-- habit hook -- a single tap, no cadence gate, meant to be answered every
-- day -- and also feeds which of today's three FOR TODAY roles is
-- suggested first (see lib/fatherRoles.ts FATHER_MOOD_ROLE).
--
-- One row per profile per calendar day (checkin_date, not created_at, so
-- "already answered today" is a plain equality check regardless of what
-- time of day it was answered) -- re-answering the same day updates that
-- day's row rather than creating a second one.
create table if not exists mood_checkins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  checkin_date date not null default current_date,
  mood text not null, -- rough | meh | okay | good | great
  created_at timestamptz not null default now(),
  unique (profile_id, checkin_date)
);

comment on table mood_checkins is
  'Daily mood check-in (one tap, five options) -- distinct from the weekly parent_checkins recovery check-in. Never scored or shown to anyone else; used to render the This Week strip and to suggest which FOR TODAY role opens first.';

create index if not exists mood_checkins_profile_date_idx
  on mood_checkins (profile_id, checkin_date desc);

alter table mood_checkins enable row level security;

drop policy if exists "mood_checkins_own_read" on mood_checkins;
create policy "mood_checkins_own_read" on mood_checkins
  for select using (auth.uid() = profile_id);

drop policy if exists "mood_checkins_own_write" on mood_checkins;
create policy "mood_checkins_own_write" on mood_checkins
  for insert with check (auth.uid() = profile_id);

drop policy if exists "mood_checkins_own_update" on mood_checkins;
create policy "mood_checkins_own_update" on mood_checkins
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
