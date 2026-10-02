-- Adds dosing metadata to mother_activities' physical_recovery content, for the
-- You hub's "companion thread" -- a quiet nudge under the mood check-in that offers
-- today's physical-recovery activity as either a spread-through-the-day rep set
-- (pelvic floor / core reconnection work) or a weekly cadence (longer, cleared
-- fitness-building sessions like walks). All six columns are nullable and additive;
-- every existing row is untouched until explicitly set below.
--
-- Deliberately NOT populated for most rows -- a stretch, a scar-massage routine, a
-- posture check, or a reflective prompt is still a single "do this today" activity,
-- same as it's always been. Only rows that genuinely call for repetition (pelvic
-- floor/core rows, explicitly reps-shaped) or a weekly cadence (sustained cardio or
-- strength sessions, several explicitly already titled "3 times a week" / "weekly")
-- get dosing fields -- months 1-3 get neither, since no moderate-effort content
-- exists before month 4 (see 20261002090000's doctor-clearance split) and nothing
-- in the acute phase should be dosed as a daily repeat protocol.
--
-- repeat_* and weekly_target_* are mutually exclusive per row by construction here
-- (no row below sets both) -- the companion thread's swap logic should preserve
-- that split: a swap stays within the same shape (repeat vs weekly), the same
-- effort_level, and the existing month/applies_to pool, never crossing from a
-- gentle rep set into a moderate weekly session or vice versa.

alter table mother_activities add column if not exists repeat_sets int;
alter table mother_activities add column if not exists repeat_reps int;
alter table mother_activities add column if not exists repeat_times_per_day int;
alter table mother_activities add column if not exists repeat_note text;
alter table mother_activities add column if not exists weekly_target_sessions int;
alter table mother_activities add column if not exists weekly_target_note text;

-- Pelvic floor / core-reconnection rows -- a spread-through-the-day rep protocol.
update mother_activities set
  repeat_sets = v.repeat_sets,
  repeat_reps = v.repeat_reps,
  repeat_times_per_day = v.repeat_times_per_day,
  repeat_note = v.repeat_note
from (values
  ('build-squeeze-stamina-m4', 3, 10, 3, 'Spread these through the day — morning, afternoon, evening — rather than all at once.'),
  ('reconnect-with-your-tummy-muscles-m4', 3, 10, 3, 'A gentle activation, not a workout. Spread it through the day.'),
  ('quick-squeezes-m5', 3, 10, 3, 'Spread these through the day rather than all at once.'),
  ('squeeze-while-you-move-m5', 2, 10, 2, 'Fit these into something you''re already doing — standing, walking, feeding.'),
  ('squeezes-in-every-position-m6', 3, 10, 3, 'Try sitting, standing, and lying down across the day.'),
  ('hip-lift-more-reps-m6', 3, 12, 2, 'Morning and evening is plenty — no need for more.'),
  ('fast-and-slow-squeezes-m7', 3, 10, 3, 'Spread these through the day rather than all at once.'),
  ('tummy-and-squeeze-together-m8', 3, 10, 2, 'Once cleared, combine both — morning and evening is enough.'),
  ('squeeze-while-lifting-heavier-m11', 1, 10, 3, 'A quick check-in each time you lift something heavier today.')
) as v(id, repeat_sets, repeat_reps, repeat_times_per_day, repeat_note)
where mother_activities.id = v.id;

-- Longer, cleared, fitness-building sessions -- a weekly cadence rather than a daily set.
update mother_activities set
  weekly_target_sessions = v.weekly_target_sessions,
  weekly_target_note = v.weekly_target_note
from (values
  ('walk-fast-and-slow-m4', 3, 'Aim for a walk like this three times this week, not just today.'),
  ('30-minute-walk-with-fast-bits-m5', 3, 'Aim for three walks like this a week.'),
  ('getting-stronger-step-by-step-m5', 2, 'Twice a week is enough to build from here.'),
  ('30-minute-walk-fast-and-slow-m7', 3, 'Aim for three walks like this a week.'),
  ('35-minute-walk-fast-and-slow-m8', 3, 'Aim for three walks like this a week.'),
  ('go-back-to-something-you-loved-m10', 2, 'Twice a week, if you can — this is about joy, not obligation.'),
  ('strength-workout-3-times-a-week-m10', 3, 'Three sessions a week, with rest days between.'),
  ('weekly-outdoor-time-alone-m10', 1, 'Once a week, just for you.'),
  ('strength-workout-written-down-m11', 3, 'Three sessions a week, with rest days between.'),
  ('work-toward-a-5km-walk-or-run-m11', 3, 'Build toward this across three sessions a week.'),
  ('finish-the-5km-walk-or-run-m12', 3, 'Three sessions a week gets you there.'),
  ('make-the-solo-walk-a-habit-m12', 3, 'Three walks a week, for you alone.')
) as v(id, weekly_target_sessions, weekly_target_note)
where mother_activities.id = v.id;
