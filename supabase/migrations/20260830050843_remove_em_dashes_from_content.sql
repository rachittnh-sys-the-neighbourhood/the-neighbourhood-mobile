-- One-off content cleanup: replace em dashes with appropriate punctuation
-- across all seeded, user-facing text. A single em dash between clauses
-- becomes a colon (explanation) or a comma (before a coordinating
-- conjunction); a pair of em dashes bracketing a short aside becomes
-- parentheses. Idempotent — a no-op on text with no em dash.
create or replace function public._debash(text) returns text language sql immutable as $$
  select case when $1 is null or position(chr(8212) in $1) = 0 then $1 else
    regexp_replace(
      regexp_replace(
        regexp_replace($1, chr(8212)||'\s*([^'||chr(8212)||'.!?]{1,100}?)\s*'||chr(8212)||'\s*', '(\1) ', 'g'),
        '\s*'||chr(8212)||'\s*(but|and|or|so|yet|nor|for|because|since|while|though|although)\M', ', \1', 'g'
      ),
      '\s*'||chr(8212)||'\s*', ': ', 'g'
    )
  end;
$$;

update activities set
  why = _debash(why),
  instructions = _debash(instructions),
  benefit = _debash(benefit),
  materials = _debash(materials),
  title = _debash(title)
where why like '%'||chr(8212)||'%' or instructions like '%'||chr(8212)||'%' or benefit like '%'||chr(8212)||'%'
   or materials like '%'||chr(8212)||'%' or title like '%'||chr(8212)||'%';

update mother_activities set
  title = _debash(title),
  description = _debash(description),
  progression_notes = _debash(progression_notes)
where title like '%'||chr(8212)||'%' or description like '%'||chr(8212)||'%' or progression_notes like '%'||chr(8212)||'%';

update father_activities set
  title = _debash(title),
  description = _debash(description),
  next_step = _debash(next_step),
  duration_label = _debash(duration_label)
where title like '%'||chr(8212)||'%' or description like '%'||chr(8212)||'%' or next_step like '%'||chr(8212)||'%' or duration_label like '%'||chr(8212)||'%';

update vaccination_schedule set
  notes = _debash(notes),
  vaccine_name = _debash(vaccine_name)
where coalesce(age_label,'')||coalesce(dose_label,'')||coalesce(notes,'')||coalesce(source,'')||vaccine_name like '%'||chr(8212)||'%';

drop function public._debash(text);
