-- Both RPCs picked the OLDEST child (order by date_of_birth asc) to derive
-- the parent's own postpartum month. A parent's recovery/support content
-- should follow whichever child was born most recently, matching the fix
-- in app/(tabs)/you/*.tsx (see lib/childAge.ts youngestChild).
create or replace function public.get_or_create_mother_daily_plan(p_profile_id uuid)
returns mother_daily_plans
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_date date; v_dob date; v_birth_method text;
  v_delivery mother_activity_relevance; v_month int; v_day int;
  v_plan mother_daily_plans; v_ids text[];
begin
  if p_profile_id <> auth.uid() then raise exception 'not your profile'; end if;
  select birth_method into v_birth_method from profiles where id = p_profile_id;
  v_delivery := case when v_birth_method in ('vaginal', 'caesarean') then v_birth_method::mother_activity_relevance else null end;
  select date_of_birth into v_dob from children where parent_id = p_profile_id order by date_of_birth desc limit 1;
  if v_dob is null then raise exception 'no child found'; end if;
  v_date := mother_plan_date_for(p_profile_id);
  v_month := mother_month_for(v_dob, v_date);
  select * into v_plan from mother_daily_plans where profile_id = p_profile_id and plan_date = v_date;
  if found then return v_plan; end if;
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
  select * into v_plan from mother_daily_plans where profile_id = p_profile_id and plan_date = v_date;
  return v_plan;
end;
$function$;

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
  select date_of_birth into v_dob from children where parent_id = p_profile_id order by date_of_birth desc limit 1;
  if v_dob is null then raise exception 'no child found'; end if;
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
