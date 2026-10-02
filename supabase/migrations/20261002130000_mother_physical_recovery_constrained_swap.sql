-- A narrower swap for the You hub's companion thread, used only for
-- physical_recovery's "Something else". The existing swap_mother_plan_category
-- (still used by the other three categories unchanged) rotates anywhere
-- within the month's whole category pool -- fine for a browsable card, but
-- not for the companion thread, where a gentle, spread-through-the-day
-- rep set must never swap into a moderate 30-minute weekly walk (or vice
-- versa). This constrains the swap pool to the SAME effort_level and the
-- SAME dosing shape (repeat-protocol / weekly-target / neither) as
-- whatever's showing today, on top of the existing month + delivery
-- filter -- "recovery appropriate" by construction, not by convention.
--
-- Falls back to leaving the plan unchanged when fewer than two matching
-- rows exist, same as the existing swap's own <=1 guard.

create or replace function public.mother_physical_recovery_constrained_pool(
  p_month int,
  p_delivery mother_activity_relevance,
  p_effort_level mother_activity_effort,
  p_has_repeat boolean,
  p_has_weekly boolean
)
returns table(id text, ord bigint)
language sql
stable
as $$
  select a.id, row_number() over (order by a.id) as ord
  from mother_activities a
  where a.month_postpartum = p_month
    and a.category = 'physical_recovery'
    and (a.applies_to = 'all' or a.applies_to = p_delivery)
    and a.effort_level = p_effort_level
    and (a.repeat_times_per_day is not null) = p_has_repeat
    and (a.weekly_target_sessions is not null) = p_has_weekly
$$;

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

  select date_of_birth into v_dob from children where parent_id = p_profile_id order by date_of_birth asc limit 1;
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
