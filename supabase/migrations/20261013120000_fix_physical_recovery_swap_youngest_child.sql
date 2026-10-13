-- swap_mother_physical_recovery_activity picked the OLDEST child
-- (order by date_of_birth asc) to derive the plan month -- the exact bug
-- 20260830060833_recovery_plans_use_youngest_child.sql already fixed
-- everywhere else, reintroduced here because this function was added
-- afterwards (20261002130000) and never got the same fix. Invisible for
-- a one-child family (asc and desc agree), but for a family with more
-- than one child, "Something else" was swapping in an activity sized
-- for the wrong child's postpartum month.

create or replace function public.swap_mother_physical_recovery_activity(p_profile_id uuid)
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
  v_day int;
  v_current_effort mother_activity_effort;
  v_current_has_repeat boolean;
  v_current_has_weekly boolean;
  v_count int;
  v_next int;
  v_id text;
begin
  v_plan := get_or_create_mother_daily_plan(p_profile_id); -- also does the ownership check

  if v_plan.physical_recovery_activity_id is null then
    return v_plan;
  end if;

  select effort_level, repeat_times_per_day is not null, weekly_target_sessions is not null
    into v_current_effort, v_current_has_repeat, v_current_has_weekly
  from mother_activities where id = v_plan.physical_recovery_activity_id;

  select birth_method into v_birth_method from profiles where id = p_profile_id;
  v_delivery := case when v_birth_method in ('vaginal', 'caesarean') then v_birth_method::mother_activity_relevance else null end;

  select date_of_birth into v_dob from children where parent_id = p_profile_id order by date_of_birth desc limit 1;
  v_month := mother_month_for(v_dob, v_plan.plan_date);
  v_day := (v_plan.plan_date - date '1970-01-01');

  select count(*) into v_count
  from mother_physical_recovery_constrained_pool(v_month, v_delivery, v_current_effort, v_current_has_repeat, v_current_has_weekly);

  if v_count <= 1 then
    return v_plan;
  end if;

  v_next := coalesce((v_plan.swaps ->> 'physical_recovery')::int, 0) + 1;

  select p.id into v_id
  from mother_physical_recovery_constrained_pool(v_month, v_delivery, v_current_effort, v_current_has_repeat, v_current_has_weekly) p
  order by p.ord
  offset ((v_day + v_next) % v_count)
  limit 1;

  update mother_daily_plans set
    swaps = v_plan.swaps || jsonb_build_object('physical_recovery', v_next),
    physical_recovery_activity_id = v_id
  where id = v_plan.id
  returning * into v_plan;

  return v_plan;
end;
$function$;
