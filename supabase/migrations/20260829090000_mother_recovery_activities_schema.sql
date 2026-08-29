-- Postpartum recovery activities for the mother, mirroring the child's
-- activities/daily_plans model: a fixed content table plus a per-day
-- rotation, one activity per category, gated to the first 12 months
-- postpartum (see lib/recoveryRelevance.ts, RECOVERY_RELEVANT_MONTHS) and
-- filtered by the mother's birth method (profiles.birth_method).
--
-- Distinct from the existing static "Postpartum Care" library
-- (CARE_TOPICS in lib/parentCare.ts) — that stays as reference reading;
-- this is the actionable, rotating daily set.

create type mother_activity_category as enum (
  'physical_recovery', 'emotional_wellness', 'mother_baby_bonding', 'couple_connection'
);
create type mother_activity_relevance as enum ('all', 'vaginal', 'caesarean');
create type mother_activity_time_of_day as enum ('anytime', 'morning', 'evening', 'during_nap');
create type mother_activity_effort as enum ('gentle', 'moderate');
create type mother_activity_with_baby as enum ('yes', 'no', 'optional');

create table mother_activities (
  id text primary key,
  category mother_activity_category not null,
  month_postpartum int not null check (month_postpartum between 1 and 12),
  applies_to mother_activity_relevance not null default 'all',
  title text not null,
  description text not null,
  duration_minutes int not null,
  time_of_day mother_activity_time_of_day not null,
  with_baby mother_activity_with_baby not null,
  effort_level mother_activity_effort not null,
  progression_notes text,
  created_at timestamptz not null default now()
);
create index idx_mother_activities_month_category on mother_activities(month_postpartum, category);

alter table mother_activities enable row level security;
create policy "authenticated read mother_activities" on mother_activities for select using (true);

create table mother_daily_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  plan_date date not null,
  physical_recovery_activity_id text references mother_activities(id) on delete set null,
  emotional_wellness_activity_id text references mother_activities(id) on delete set null,
  mother_baby_bonding_activity_id text references mother_activities(id) on delete set null,
  couple_connection_activity_id text references mother_activities(id) on delete set null,
  swaps jsonb not null default '{}'::jsonb,
  unique (profile_id, plan_date)
);

alter table mother_daily_plans enable row level security;
create policy "own mother_daily_plans" on mother_daily_plans for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- "Month N postpartum" for a child born on p_dob, as of p_on — same
-- calendar-month math as lib/childAge.ts's computeAge (whole elapsed
-- months, +1 because "month 1" covers the first month of life), clamped
-- to the 1-12 range this content is authored for. Matching
-- isRecoveryRelevant's <=12-months cutoff means month 12 is still valid
-- content on a child's 12-month birthday; the client stops asking once
-- the child is older than that.
create or replace function public.mother_month_for(p_dob date, p_on date default current_date)
returns int
language sql
immutable
as $$
  select greatest(1, least(
    (extract(year from age(p_on, p_dob)) * 12 + extract(month from age(p_on, p_dob)))::int + 1,
    12
  ));
$$;

-- The family's local "today", for the mother's own plan — same pattern as
-- plan_date_for(child_id), just keyed directly off the parent's profile
-- rather than through a child.
create or replace function public.mother_plan_date_for(p_profile_id uuid)
returns date
language sql
stable security definer
set search_path to 'public'
as $$
  select (now() at time zone coalesce(p.timezone, 'Asia/Kolkata'))::date
  from profiles p
  where p.id = p_profile_id;
$$;

-- Orders a (month, category) pool for the day-index rotation below.
-- p_delivery is the mother's confirmed birth method ('vaginal' /
-- 'caesarean'), or null if she hasn't said (or said "prefer not to say")
-- — in which case only 'all' activities are eligible, never a
-- delivery-specific one guessed wrong.
create or replace function public.mother_activity_pool(
  p_month int, p_category mother_activity_category, p_delivery mother_activity_relevance
)
returns table(id text, ord bigint)
language sql
stable
as $$
  select a.id, row_number() over (order by a.id) as ord
  from mother_activities a
  where a.month_postpartum = p_month
    and a.category = p_category
    and (a.applies_to = 'all' or a.applies_to = p_delivery)
$$;

create or replace function public.get_or_create_mother_daily_plan(p_profile_id uuid)
returns mother_daily_plans
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_date date;
  v_dob date;
  v_birth_method text;
  v_delivery mother_activity_relevance;
  v_month int;
  v_day int;
  v_plan mother_daily_plans;
  v_ids text[];
begin
  if p_profile_id <> auth.uid() then
    raise exception 'not your profile';
  end if;

  select birth_method into v_birth_method from profiles where id = p_profile_id;
  v_delivery := case when v_birth_method in ('vaginal', 'caesarean') then v_birth_method::mother_activity_relevance else null end;

  select date_of_birth into v_dob from children where parent_id = p_profile_id order by date_of_birth asc limit 1;
  if v_dob is null then
    raise exception 'no child found';
  end if;

  v_date := mother_plan_date_for(p_profile_id);
  v_month := mother_month_for(v_dob, v_date);

  select * into v_plan from mother_daily_plans
  where profile_id = p_profile_id and plan_date = v_date;

  if found then
    return v_plan;
  end if;

  v_day := (v_date - date '1970-01-01');

  select array[
    (select p.id from mother_activity_pool(v_month, 'physical_recovery', v_delivery) p
      order by p.ord offset (v_day % greatest((select count(*) from mother_activity_pool(v_month, 'physical_recovery', v_delivery)), 1)) limit 1),
    (select p.id from mother_activity_pool(v_month, 'emotional_wellness', v_delivery) p
      order by p.ord offset (v_day % greatest((select count(*) from mother_activity_pool(v_month, 'emotional_wellness', v_delivery)), 1)) limit 1),
    (select p.id from mother_activity_pool(v_month, 'mother_baby_bonding', v_delivery) p
      order by p.ord offset (v_day % greatest((select count(*) from mother_activity_pool(v_month, 'mother_baby_bonding', v_delivery)), 1)) limit 1),
    (select p.id from mother_activity_pool(v_month, 'couple_connection', v_delivery) p
      order by p.ord offset (v_day % greatest((select count(*) from mother_activity_pool(v_month, 'couple_connection', v_delivery)), 1)) limit 1)
  ] into v_ids;

  insert into mother_daily_plans (
    profile_id, plan_date,
    physical_recovery_activity_id, emotional_wellness_activity_id,
    mother_baby_bonding_activity_id, couple_connection_activity_id
  )
  values (p_profile_id, v_date, v_ids[1], v_ids[2], v_ids[3], v_ids[4])
  on conflict (profile_id, plan_date) do nothing;

  select * into v_plan from mother_daily_plans
  where profile_id = p_profile_id and plan_date = v_date;

  return v_plan;
end;
$function$;

create or replace function public.swap_mother_plan_category(p_profile_id uuid, p_category mother_activity_category)
returns mother_daily_plans
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_plan mother_daily_plans;
  v_dob date;
  v_birth_method text;
  v_delivery mother_activity_relevance;
  v_month int;
  v_count int;
  v_next int;
  v_id text;
  v_day int;
begin
  v_plan := get_or_create_mother_daily_plan(p_profile_id); -- also does the ownership check

  select birth_method into v_birth_method from profiles where id = p_profile_id;
  v_delivery := case when v_birth_method in ('vaginal', 'caesarean') then v_birth_method::mother_activity_relevance else null end;

  select date_of_birth into v_dob from children where parent_id = p_profile_id order by date_of_birth asc limit 1;
  v_month := mother_month_for(v_dob, v_plan.plan_date);
  v_day := (v_plan.plan_date - date '1970-01-01');

  select count(*) into v_count from mother_activity_pool(v_month, p_category, v_delivery);
  if v_count <= 1 then
    return v_plan;
  end if;

  v_next := coalesce((v_plan.swaps ->> p_category::text)::int, 0) + 1;

  select p.id into v_id from mother_activity_pool(v_month, p_category, v_delivery) p
  order by p.ord
  offset ((v_day + v_next) % v_count)
  limit 1;

  update mother_daily_plans set
    swaps = v_plan.swaps || jsonb_build_object(p_category::text, v_next),
    physical_recovery_activity_id  = case when p_category = 'physical_recovery'    then v_id else physical_recovery_activity_id end,
    emotional_wellness_activity_id = case when p_category = 'emotional_wellness'   then v_id else emotional_wellness_activity_id end,
    mother_baby_bonding_activity_id = case when p_category = 'mother_baby_bonding' then v_id else mother_baby_bonding_activity_id end,
    couple_connection_activity_id  = case when p_category = 'couple_connection'    then v_id else couple_connection_activity_id end
  where id = v_plan.id
  returning * into v_plan;

  return v_plan;
end;
$function$;
