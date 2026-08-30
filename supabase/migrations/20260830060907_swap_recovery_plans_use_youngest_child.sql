-- Same youngest-child fix as 20260830060833, for the swap RPCs, which
-- independently re-derived v_dob with the same "oldest child" bug.
create or replace function public.swap_mother_plan_category(p_profile_id uuid, p_category mother_activity_category)
returns mother_daily_plans
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_plan mother_daily_plans; v_dob date; v_birth_method text;
  v_delivery mother_activity_relevance; v_month int; v_count int; v_next int; v_id text; v_day int;
begin
  v_plan := get_or_create_mother_daily_plan(p_profile_id); -- also does the ownership check
  select birth_method into v_birth_method from profiles where id = p_profile_id;
  v_delivery := case when v_birth_method in ('vaginal', 'caesarean') then v_birth_method::mother_activity_relevance else null end;
  select date_of_birth into v_dob from children where parent_id = p_profile_id order by date_of_birth desc limit 1;
  v_month := mother_month_for(v_dob, v_plan.plan_date);
  v_day := (v_plan.plan_date - date '1970-01-01');
  select count(*) into v_count from mother_activity_pool(v_month, p_category, v_delivery);
  if v_count <= 1 then return v_plan; end if;
  v_next := coalesce((v_plan.swaps ->> p_category::text)::int, 0) + 1;
  select p.id into v_id from mother_activity_pool(v_month, p_category, v_delivery) p
  order by p.ord offset ((v_day + v_next) % v_count) limit 1;
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
  v_plan := get_or_create_father_daily_plan(p_profile_id); -- also does the ownership check
  select birth_method into v_birth_method from profiles where id = p_profile_id;
  v_delivery := case when v_birth_method in ('vaginal', 'caesarean') then v_birth_method::father_activity_relevance else null end;
  select date_of_birth into v_dob from children where parent_id = p_profile_id order by date_of_birth desc limit 1;
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
