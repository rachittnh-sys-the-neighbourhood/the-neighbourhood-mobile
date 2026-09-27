-- Partner's first name (asked once, right after Role, mother/father only —
-- see app/onboarding/partner-name.tsx) so a father's content can say "food
-- to support Priya's recovery" instead of misattributing it to his own
-- name, and so the mother's own content can name him too where useful.
-- Optional: null means never asked or left blank, same convention as the
-- other profile facts.
alter table profiles
  add column if not exists partner_name text;

comment on column profiles.partner_name is
  'Partner''s first name, asked once during onboarding (mother/father roles only). Used to personalise "for you" copy that is really about the other parent -- e.g. a father''s nutrition card naming his wife rather than himself.';

-- The weekly recovery check-in from the meal planner's "Recovery Check-in
-- (spec)" sheet -- replaces the old, unpersisted mood picker on You's hub
-- with something that actually remembers an answer and adapts content
-- (a "running on empty" energy answer surfaces quick-option meals and the
-- free-IFA-tablet reminder; "not really" on the help question surfaces a
-- one-line ask-for-help suggestion). Used for both roles: a mother's
-- check-in is about her recovery, a father's is about how he's doing
-- supporting her -- same two questions, role-appropriate copy client-side.
create table if not exists parent_checkins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  checkin_date date not null default current_date,
  energy text not null, -- good | okay | running_on_empty
  help_available text not null, -- yes | maybe | not_really
  created_at timestamptz not null default now()
);

comment on table parent_checkins is
  'Weekly (twice-weekly in the first 6 weeks) recovery check-in answers -- see lib/db/checkins.ts. Never scored or shown to anyone else; used only to adapt that day''s You-hub content.';

create index if not exists parent_checkins_profile_date_idx
  on parent_checkins (profile_id, checkin_date desc);

alter table parent_checkins enable row level security;

drop policy if exists "parent_checkins_own_read" on parent_checkins;
create policy "parent_checkins_own_read" on parent_checkins
  for select using (auth.uid() = profile_id);

drop policy if exists "parent_checkins_own_write" on parent_checkins;
create policy "parent_checkins_own_write" on parent_checkins
  for insert with check (auth.uid() = profile_id);
