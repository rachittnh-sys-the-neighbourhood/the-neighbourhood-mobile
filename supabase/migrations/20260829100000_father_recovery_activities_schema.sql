create type father_activity_category as enum (
  'supporting_her_recovery', 'bonding_with_baby', 'couple_relationship',
  'your_own_wellbeing', 'becoming_a_father', 'practical_load'
);
create type father_activity_relevance as enum ('all', 'vaginal', 'caesarean');
create type father_activity_time_of_day as enum ('anytime', 'morning', 'evening', 'night');
create type father_activity_effort as enum ('gentle', 'moderate');
create type father_activity_with_baby as enum ('yes', 'no', 'optional');

create table father_activities (
  id text primary key,
  category father_activity_category not null,
  month_postpartum int not null check (month_postpartum between 1 and 12),
  applies_to father_activity_relevance not null default 'all',
  title text not null,
  description text not null,
  duration_minutes int,
  duration_label text not null,
  time_of_day father_activity_time_of_day not null,
  with_baby father_activity_with_baby not null,
  effort_level father_activity_effort not null,
  next_step text,
  created_at timestamptz not null default now()
);
create index idx_father_activities_month_category on father_activities(month_postpartum, category);
alter table father_activities enable row level security;
create policy "authenticated read father_activities" on father_activities for select using (true);

create table father_daily_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  plan_date date not null,
  supporting_her_recovery_activity_id text references father_activities(id) on delete set null,
  bonding_with_baby_activity_id text references father_activities(id) on delete set null,
  couple_relationship_activity_id text references father_activities(id) on delete set null,
  your_own_wellbeing_activity_id text references father_activities(id) on delete set null,
  becoming_a_father_activity_id text references father_activities(id) on delete set null,
  practical_load_activity_id text references father_activities(id) on delete set null,
  swaps jsonb not null default '{}'::jsonb,
  unique (profile_id, plan_date)
);
alter table father_daily_plans enable row level security;
create policy "own father_daily_plans" on father_daily_plans for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create or replace function public.father_activity_pool(
  p_month int, p_category father_activity_category, p_delivery father_activity_relevance
)
returns table(id text, ord bigint)
language sql
stable
as $$
  select a.id, row_number() over (order by a.id) as ord
  from father_activities a
  where a.month_postpartum = p_month
    and a.category = p_category
    and (a.applies_to = 'all' or a.applies_to = p_delivery)
$$;

create or replace function public.get_or_create_father_daily_plan(p_profile_id uuid)
returns father_daily_plans
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_date date; v_dob date; v_birth_method text;
  v_delivery father_activity_relevance; v_month int; v_day int;
  v_plan father_daily_plans; v_ids text[];
begin
  if p_profile_id <> auth.uid() then raise exception 'not your profile'; end if;
  select birth_method into v_birth_method from profiles where id = p_profile_id;
  v_delivery := case when v_birth_method in ('vaginal', 'caesarean') then v_birth_method::father_activity_relevance else null end;
  select date_of_birth into v_dob from children where parent_id = p_profile_id order by date_of_birth asc limit 1;
  if v_dob is null then raise exception 'no child found'; end if;
  -- mother_plan_date_for / mother_month_for are parent-generic despite the
  -- name (family timezone + child dob, nothing mother-specific) — reused
  -- here rather than duplicated.
  v_date := mother_plan_date_for(p_profile_id);
  v_month := mother_month_for(v_dob, v_date);
  select * into v_plan from father_daily_plans where profile_id = p_profile_id and plan_date = v_date;
  if found then return v_plan; end if;
  v_day := (v_date - date '1970-01-01');
  select array[
    (select p.id from father_activity_pool(v_month, 'supporting_her_recovery', v_delivery) p
      order by p.ord offset (v_day % greatest((select count(*) from father_activity_pool(v_month, 'supporting_her_recovery', v_delivery)), 1)) limit 1),
    (select p.id from father_activity_pool(v_month, 'bonding_with_baby', v_delivery) p
      order by p.ord offset (v_day % greatest((select count(*) from father_activity_pool(v_month, 'bonding_with_baby', v_delivery)), 1)) limit 1),
    (select p.id from father_activity_pool(v_month, 'couple_relationship', v_delivery) p
      order by p.ord offset (v_day % greatest((select count(*) from father_activity_pool(v_month, 'couple_relationship', v_delivery)), 1)) limit 1),
    (select p.id from father_activity_pool(v_month, 'your_own_wellbeing', v_delivery) p
      order by p.ord offset (v_day % greatest((select count(*) from father_activity_pool(v_month, 'your_own_wellbeing', v_delivery)), 1)) limit 1),
    (select p.id from father_activity_pool(v_month, 'becoming_a_father', v_delivery) p
      order by p.ord offset (v_day % greatest((select count(*) from father_activity_pool(v_month, 'becoming_a_father', v_delivery)), 1)) limit 1),
    (select p.id from father_activity_pool(v_month, 'practical_load', v_delivery) p
      order by p.ord offset (v_day % greatest((select count(*) from father_activity_pool(v_month, 'practical_load', v_delivery)), 1)) limit 1)
  ] into v_ids;
  insert into father_daily_plans (
    profile_id, plan_date,
    supporting_her_recovery_activity_id, bonding_with_baby_activity_id,
    couple_relationship_activity_id, your_own_wellbeing_activity_id,
    becoming_a_father_activity_id, practical_load_activity_id
  )
  values (p_profile_id, v_date, v_ids[1], v_ids[2], v_ids[3], v_ids[4], v_ids[5], v_ids[6])
  on conflict (profile_id, plan_date) do nothing;
  select * into v_plan from father_daily_plans where profile_id = p_profile_id and plan_date = v_date;
  return v_plan;
end;
$function$;

create or replace function public.swap_father_plan_category(p_profile_id uuid, p_category father_activity_category)
returns father_daily_plans
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_plan father_daily_plans; v_dob date; v_birth_method text;
  v_delivery father_activity_relevance; v_month int; v_count int; v_next int; v_id text; v_day int;
begin
  v_plan := get_or_create_father_daily_plan(p_profile_id);
  select birth_method into v_birth_method from profiles where id = p_profile_id;
  v_delivery := case when v_birth_method in ('vaginal', 'caesarean') then v_birth_method::father_activity_relevance else null end;
  select date_of_birth into v_dob from children where parent_id = p_profile_id order by date_of_birth asc limit 1;
  v_month := mother_month_for(v_dob, v_plan.plan_date);
  v_day := (v_plan.plan_date - date '1970-01-01');
  select count(*) into v_count from father_activity_pool(v_month, p_category, v_delivery);
  if v_count <= 1 then return v_plan; end if;
  v_next := coalesce((v_plan.swaps ->> p_category::text)::int, 0) + 1;
  select p.id into v_id from father_activity_pool(v_month, p_category, v_delivery) p
  order by p.ord offset ((v_day + v_next) % v_count) limit 1;
  update father_daily_plans set
    swaps = v_plan.swaps || jsonb_build_object(p_category::text, v_next),
    supporting_her_recovery_activity_id = case when p_category = 'supporting_her_recovery' then v_id else supporting_her_recovery_activity_id end,
    bonding_with_baby_activity_id       = case when p_category = 'bonding_with_baby'       then v_id else bonding_with_baby_activity_id end,
    couple_relationship_activity_id     = case when p_category = 'couple_relationship'     then v_id else couple_relationship_activity_id end,
    your_own_wellbeing_activity_id      = case when p_category = 'your_own_wellbeing'      then v_id else your_own_wellbeing_activity_id end,
    becoming_a_father_activity_id       = case when p_category = 'becoming_a_father'       then v_id else becoming_a_father_activity_id end,
    practical_load_activity_id          = case when p_category = 'practical_load'          then v_id else practical_load_activity_id end
  where id = v_plan.id
  returning * into v_plan;
  return v_plan;
end;
$function$;
