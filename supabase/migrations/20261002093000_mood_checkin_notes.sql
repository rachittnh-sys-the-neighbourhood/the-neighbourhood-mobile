-- Optional free-text note on a daily mood check-in ("Add a note" on
-- MoodCheckInCard / the Past check-ins screen). Purely additive, nullable,
-- no backfill needed.

alter table mood_checkins add column if not exists note text;
