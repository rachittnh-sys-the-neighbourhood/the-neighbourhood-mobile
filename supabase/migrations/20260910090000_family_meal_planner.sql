-- Family Meal Planner content, sourced from
-- "The Neighbourhood Meal Planner v11 (Expert Review)" workbook.
--
-- IMPORTANT: this workbook is explicitly frozen "for expert review" --
-- most rows carry a Reviewer_Decision of MODIFY or NEEDS_EVIDENCE and are
-- still pending RD/paediatrician sign-off (see the workbook's own
-- "Expert Review Guide" and "Dietitian Review Queue" sheets). The app
-- surfaces every one of these meals behind a persistent "under expert
-- review" banner (see components/ExpertReviewBanner.tsx) rather than
-- waiting for full clinical sign-off, per product decision.
--
-- The 18 meals the workbook itself marked R5_Publish_Hold = Yes
-- (unverified composite ingredients, a truncated source, or a deprecated
-- duplicate) are excluded outright, not just banner-flagged: M036, M069, M096, M097, M128, M132, M154, M168, M169, M180, M181, M184, M185, M198, M200, M201, M202, M203
--
-- Allergen flags use the workbook's own reconciled "Allergen QA" sheet
-- (Declared_Allergen_Flags where QA_Status = MATCH for every meal kept
-- here), not the raw source-PDF flags, which under-declared dairy in ghee.
create table if not exists family_meals (
  id text primary key,
  name text not null,
  family_id text,
  age_stages text[] not null default '{}', -- e.g. 6-8m, 8-12m, 12-24m, 2-4y, 4-7y
  slots text[] not null default '{}', -- breakfast | morning_snack | lunch | afternoon_snack | dinner
  vegetarian boolean not null default false,
  vegan boolean not null default false,
  has_egg boolean not null default false,
  non_veg boolean not null default false,
  ingredients text,
  food_groups text,
  choking_modifications text,
  age_guidance text,
  adaptation_guidance text,
  active_minutes int,
  passive_minutes int,
  total_minutes int,
  family_meal_compatible boolean not null default true,
  audience text, -- Child + family | Child | Mother
  allergen_flags text[] not null default '{}',
  mother_plate_role text,
  mother_cooking_step text, -- what to do differently while cooking, for the baby's portion
  mother_boost_good_for text, -- e.g. "Good for protein + iron"
  mother_boost_vegetarian text,
  mother_boost_eggetarian text,
  mother_boost_nonveg text,
  mother_boost_vegan text,
  prep_ahead_note text,
  source text not null default 'The Neighbourhood Meal Planner v11 (pending expert clinical review)',
  created_at timestamptz not null default now()
);

comment on table family_meals is
  'Whole-family meal content from the v11 meal planner workbook. Still pending RD/paediatrician sign-off -- see source comment above. Drives Home''s Family Meal tile, You > Nutrition, and (for age-appropriate slots) Child feeding guidance.';

alter table family_meals enable row level security;
drop policy if exists "family_meals_read_all" on family_meals;
create policy "family_meals_read_all" on family_meals for select using (true);

insert into family_meals (
  id, name, family_id, age_stages, slots,
  vegetarian, vegan, has_egg, non_veg, ingredients, food_groups,
  choking_modifications, age_guidance, adaptation_guidance,
  active_minutes, passive_minutes, total_minutes, family_meal_compatible, audience,
  allergen_flags, mother_plate_role, mother_cooking_step,
  mother_boost_good_for, mother_boost_vegetarian, mother_boost_eggetarian, mother_boost_nonveg, mother_boost_vegan,
  prep_ahead_note
)
values
(
  'M001', 'Moong Dal Khichdi', 'MF001', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Moongdal,rice,ghee,turmeric,hing', 'Grain+Pulse+Fat',
  'Ensure dal is well cooked; Mash for children under 12 months', '6–8 months: mashed; 8–12 months: soft; 12 months and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  10, 20, 30, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M002', 'Dal Rice Toor', 'MF001', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Toordal,rice,ghee', 'Grain+Pulse+Fat',
  'Ensure dal is well cooked', '6–8 months: thick smooth mash of dal and rice; 8–12 months: soft dal and rice; 12 months and older: usual family texture', 'Mash the dal for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  10, 25, 35, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M003', 'Dal Rice Masoor', 'MF001', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Masoordal,rice,ghee', 'Grain+Pulse+Fat',
  'Ensure dal is well cooked', '6–8 months: thick smooth mash of dal and rice; 8–12 months: soft dal and rice; 12 months and older: usual family texture', 'Mash the dal for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  10, 20, 30, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M004', 'Vegetable Khichdi', 'MF002', '{"8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,moongdal,mixedvegetables(carrot,pumpkin,beans),ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure vegetables are well cooked', '8–12 months: soft and lumpy; 12 months and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  15, 25, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M005', 'Pumpkin Khichdi', 'MF002', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,moongdal,pumpkin,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure pumpkin is well cooked', '6–8 months: thick smooth mash; 8–12 months: soft and mashed; 12 months and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  15, 25, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M006', 'Carrot Khichdi', 'MF002', '{"8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,moongdal,carrot,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure carrot is well cooked', '8–12 months: soft and mashed; 12 months and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  15, 25, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M007', 'Spinach Khichdi', 'MF002', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,moongdal,spinach,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure spinach is well cooked', '6–8 months: thick smooth mash; 8–12 months: soft and mashed; 12 months and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  15, 25, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M008', 'Methi Khichdi', 'MF002', '{"8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,moongdal,methi,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure methi is well cooked', '8–12 months: soft and mashed; 12 months and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  15, 25, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M009', 'Beetroot Khichdi', 'MF002', '{"8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,moongdal,beetroot,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure beetroot is well cooked', '8–12 months: soft and mashed; 12 months and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  15, 25, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M010', 'Mixed Veg Khichdi', 'MF002', '{"8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,moongdal,carrot,pumpkin,beans,peas,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure all vegetables are well cooked', '8–12 months: soft and lumpy; 12 months and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  20, 25, 45, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M011', 'Roti Dal Aloo', 'MF003', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Wheatroti,toordal,potatosabzi,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure roti is soft; Sabzi pieces manageable', '12–24 months: soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 30, 45, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M012', 'Roti Dal Gobi', 'MF003', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Wheatroti,toordal,cauliflowersabzi,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure roti is soft; Gobi pieces manageable', '12–24 months: soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 30, 45, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Sprinkle roasted til (sesame).',
  null
),
(
  'M013', 'Roti Dal Bhindi', 'MF003', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Wheatroti,toordal,okrasabzi,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure roti is soft; Bhindi pieces manageable', '12–24 months: soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 30, 45, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M014', 'Roti Dal Palak', 'MF003', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Wheatroti,toordal,spinachsabzi,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure roti is soft; Palak pieces manageable', '12–24 months: soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 30, 45, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M015', 'Roti Dal Methi', 'MF003', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Wheatroti,toordal,methisabzi,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure roti is soft; Methi pieces manageable', '12–24 months: soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 30, 45, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M016', 'Roti Dal Carrot', 'MF003', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Wheatroti,toordal,carrotsabzi,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure roti is soft; Carrot pieces manageable', '12–24 months: soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 30, 45, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M017', 'Roti Dal Beetroot', 'MF003', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Wheatroti,toordal,beetrootsabzi,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure roti is soft; Beetroot pieces manageable', '12–24 months: soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 30, 45, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M018', 'Roti Dal Mixed Veg', 'MF003', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Wheatroti,toordal,mixedvegetablesabzi(carrot,beans,cauliflower,peas),ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure roti is soft; Vegetable pieces manageable', '12–24 months: soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  20, 30, 50, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Sprinkle roasted til (sesame).',
  null
),
(
  'M019', 'Idli Sambar Toor', 'MF004', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast","lunch"}',
  true, false, false, false, 'Idli(rice,uraddal),sambar(toordal,mixedvegetables,tamarind)', 'Grain+Pulse+Vegetable',
  'Mash idli with sambar for children under 12 months', '8–12 months: mashed; 12–24 months: small pieces; 2 years and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt and mild spice from 12–24 months',
  15, 15, 30, true, 'Child + family',
  '{"None"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Squeeze some lemon on top.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M020', 'Idli Sambar Moong', 'MF004', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast","lunch"}',
  true, false, false, false, 'Idli(rice,uraddal),sambar(moongdal,mixedvegetables,tamarind)', 'Grain+Pulse+Vegetable',
  'Mash idli with sambar for children under 12 months', '8–12 months: mashed; 12–24 months: small pieces; 2 years and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt and mild spice from 12–24 months',
  15, 15, 30, true, 'Child + family',
  '{"None"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Squeeze some lemon on top.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M021', 'Idli Sambar Mixed Dal', 'MF004', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast","lunch"}',
  true, false, false, false, 'Idli(rice,uraddal),sambar(mixeddal,mixedvegetables,tamarind)', 'Grain+Pulse+Vegetable',
  'Mash idli with sambar for children under 12 months', '8–12 months: mashed; 12–24 months: small pieces; 2 years and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt and mild spice from 12–24 months',
  15, 15, 30, true, 'Child + family',
  '{"None"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Squeeze some lemon on top.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M022', 'Dosa Sambar Toor', 'MF005', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast","lunch"}',
  true, false, false, false, 'Dosa(rice,uraddal),sambar(toordal,mixedvegetables,tamarind)', 'Grain+Pulse+Vegetable',
  'Tear into small pieces for children under 2 years', '8–12 months: small soft pieces; 12–24 months: small pieces; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt and mild spice from 12–24 months; Ensure dosa is soft',
  20, 20, 40, true, 'Child + family',
  '{"None"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Squeeze some lemon on top.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M023', 'Dosa Sambar Moong', 'MF005', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast","lunch"}',
  true, false, false, false, 'Dosa(rice,uraddal),sambar(moongdal,mixedvegetables,tamarind)', 'Grain+Pulse+Vegetable',
  'Tear into small pieces for children under 2 years', '8–12 months: small soft pieces; 12–24 months: small pieces; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt and mild spice from 12–24 months; Ensure dosa is soft',
  20, 20, 40, true, 'Child + family',
  '{"None"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Squeeze some lemon on top.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M024', 'Dosa Sambar Mixed Dal', 'MF005', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast","lunch"}',
  true, false, false, false, 'Dosa(rice,uraddal),sambar(mixeddal,mixedvegetables,tamarind)', 'Grain+Pulse+Vegetable',
  'Tear into small pieces for children under 2 years', '8–12 months: small soft pieces; 12–24 months: small pieces; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt and mild spice from 12–24 months; Ensure dosa is soft',
  20, 20, 40, true, 'Child + family',
  '{"None"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Squeeze some lemon on top.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M025', 'Poha Kanda', 'MF006', '{"12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Poha,onion,potato,turmeric,mustardseeds', 'Grain+Vegetable',
  'Soak poha well so it is soft', '12–24 months: well-soaked, soft; 2 years and older: usual family texture', 'Avoid whole peanuts for children under 2 years; Reduce added salt',
  10, 15, 25, true, 'Child + family',
  '{"Mustard"}', 'Breakfast / light meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a handful of nuts.',
  null
),
(
  'M026', 'Poha Peanut', 'MF006', '{"2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Poha,onion,potato,peanuts,turmeric,mustardseeds', 'Grain+Vegetable+Nut',
  'Soak poha well so it is soft; Use finely crushed peanuts, not whole peanuts', '2 years and older: usual family texture', 'Omit peanuts if allergic; Reduce added salt',
  10, 15, 25, true, 'Child + family',
  '{"Peanut","Mustard"}', 'Breakfast / light meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Sprinkle roasted til (sesame).',
  null
),
(
  'M027', 'Poha Vegetable', 'MF006', '{"12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Poha,mixedvegetables(carrot,peas,beans),onion,turmeric,mustardseeds', 'Grain+Vegetable',
  'Soak poha well so it is soft; Ensure vegetables are well cooked', '12–24 months: well-soaked, soft; 2 years and older: usual family texture', 'Omit peanuts; Reduce added salt for children under 2 years',
  15, 15, 30, true, 'Child + family',
  '{"Mustard"}', 'Breakfast / light meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a handful of nuts.',
  null
),
(
  'M028', 'Upma Rava', 'MF007', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Semolina(rava),mixedvegetables,mustardseeds,curryleaves', 'Grain+Vegetable',
  'Cook thoroughly; Keep the food moist, not dry', '8–12 months: soft and lumpy; 12 months and older: usual family texture', 'No added salt for children under 12 months; minimal salt and mild spice from 12–24 months; ensure soft',
  10, 20, 30, true, 'Child + family',
  '{"Mustard","Wheat (gluten)"}', 'Breakfast / light meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a handful of nuts.',
  null
),
(
  'M029', 'Upma Rava Vegetable', 'MF007', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Semolina(rava),mixedvegetables(carrot,peas,beans),mustardseeds,curryleaves', 'Grain+Vegetable',
  'Cook thoroughly; Keep the food moist, not dry', '8–12 months: soft and lumpy; 12 months and older: usual family texture', 'No added salt for children under 12 months; minimal salt and mild spice from 12–24 months; ensure soft',
  15, 20, 35, true, 'Child + family',
  '{"Mustard","Wheat (gluten)"}', 'Breakfast / light meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a handful of nuts.',
  null
),
(
  'M030', 'Upma Dalia', 'MF007', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Brokenwheat(dalia),mixedvegetables,mustardseeds,curryleaves', 'Grain+Vegetable',
  'Cook thoroughly; Keep the food moist, not dry', '8–12 months: soft and lumpy; 12 months and older: usual family texture', 'No added salt for children under 12 months; minimal salt and mild spice from 12–24 months; ensure soft',
  15, 20, 35, true, 'Child + family',
  '{"Wheat (gluten)","Mustard"}', 'Breakfast / light meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a handful of nuts.',
  null
),
(
  'M031', 'Aloo Paratha Curd', 'MF008', '{"12-24m","2-4y","4-7y"}', '{"breakfast","dinner","lunch"}',
  true, false, false, false, 'Wheatparatha(potatostuffing),curd,ghee', 'Grain+Vegetable+Dairy',
  'Ensure paratha is soft; Tear into manageable pieces', '12–24 months: soft paratha pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paratha is soft',
  20, 20, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M032', 'Gobi Paratha Curd', 'MF008', '{"12-24m","2-4y","4-7y"}', '{"breakfast","dinner","lunch"}',
  true, false, false, false, 'Wheatparatha(cauliflowerstuffing),curd,ghee', 'Grain+Vegetable+Dairy',
  'Ensure paratha is soft; Tear into manageable pieces', '12–24 months: soft paratha pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paratha is soft',
  20, 20, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M033', 'Methi Paratha Curd', 'MF008', '{"12-24m","2-4y","4-7y"}', '{"breakfast","dinner","lunch"}',
  true, false, false, false, 'Wheatparatha(methistuffing),curd,ghee', 'Grain+Vegetable+Dairy',
  'Ensure paratha is soft; Tear into manageable pieces', '12–24 months: soft paratha pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paratha is soft',
  20, 20, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M034', 'Palak Paratha Curd', 'MF008', '{"12-24m","2-4y","4-7y"}', '{"breakfast","dinner","lunch"}',
  true, false, false, false, 'Wheatparatha(spinachstuffing),curd,ghee', 'Grain+Vegetable+Dairy',
  'Ensure paratha is soft; Tear into manageable pieces', '12–24 months: soft paratha pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paratha is soft',
  20, 20, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M035', 'Paneer Paratha Curd', 'MF008', '{"12-24m","2-4y","4-7y"}', '{"breakfast","dinner","lunch"}',
  true, false, false, false, 'Wheatparatha(paneerstuffing),curd,ghee', 'Grain+Dairy',
  'Ensure paratha is soft; Tear into manageable pieces', '12–24 months: soft paratha pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paratha is soft',
  20, 20, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M037', 'Egg Bhurji Roti', 'MF009', '{"12-24m","2-4y","4-7y"}', '{"breakfast","dinner","lunch"}',
  false, false, true, false, 'Eggs,onion,tomato,wheatroti,ghee', 'Grain+Egg+Vegetable',
  'Ensure egg is fully cooked; Tear roti', '12–24 months: mashed egg and soft roti; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure egg is fully cooked',
  10, 15, 25, true, 'Child + family',
  '{"Wheat (gluten)","Egg","Milk"}', 'Main meal', null,
  'Great source of choline and B12', 'For you (fallback): swap the egg for dal or paneer.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you (fallback): swap the egg for dal or chana.',
  null
),
(
  'M038', 'Egg Curry Roti', 'MF009', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, true, false, 'Boiledeggs,onion,tomato,spices,wheatroti,ghee', 'Grain+Egg+Vegetable',
  'Ensure egg is fully cooked; Tear roti', '12–24 months: mashed egg and soft roti; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure egg is fully cooked',
  15, 20, 35, true, 'Child + family',
  '{"Wheat (gluten)","Egg","Milk"}', 'Main meal', null,
  'Great source of choline and B12', 'For you (fallback): swap the egg for dal or paneer.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you (fallback): swap the egg for dal or chana.',
  null
),
(
  'M039', 'Egg Dosa', 'MF009', '{"12-24m","2-4y","4-7y"}', '{"breakfast","lunch"}',
  false, false, true, false, 'Dosa(rice,uraddal),egg,onion,ghee', 'Grain+Egg',
  'Tear dosa into small pieces for children under 2 years', '12–24 months: small pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure egg is fully cooked',
  20, 20, 40, true, 'Child + family',
  '{"Egg","Milk"}', 'Main meal', null,
  'Great source of choline and B12', 'For you (fallback): skip the egg; have extra dal, or add paneer.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): skip the egg; have extra dal.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M040', 'Egg Fried Rice', 'MF009', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, true, false, 'Rice,egg,mixedvegetables,ghee', 'Grain+Egg+Vegetable',
  'Ensure egg is fully cooked; Keep rice soft', '12–24 months: mashed egg and soft rice; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure egg is fully cooked',
  15, 20, 35, true, 'Child + family',
  '{"Egg","Milk"}', 'Main meal', null,
  'Great source of choline and B12', 'For you (fallback): swap the egg for dal or paneer.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the egg for dal or chana.',
  null
),
(
  'M041', 'Rice Fish Rohu', 'MF010', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Rice,rohufish,mixedvegetables,mustardoil', 'Grain+Fish+Vegetable',
  'Remove all bones; Ensure fish is fully cooked; For under 12 months, flake fish with your fingers to check for bones, then mash', '6–12 months: fully deboned fish, flaked and mashed with soft rice and vegetables to a thick mash; 12–24 months: deboned minced fish and soft rice; 2 years and older: deboned pieces', 'Allergen first steps: offer only after a few low-allergy first foods have gone well; introduce one new allergenic food at a time and watch for rash, vomiting or diarrhoea; get urgent help for swelling or breathing difficulty. If your baby has severe, persistent eczema or has had an immediate allergic reaction to any food (especially egg), talk to your paediatrician before offering this food. Once it is tolerated, keep offering it regularly; Remove all bones before serving; No added salt for children under 12 months; minimal salt and mild spice from 12–24 months',
  20, 25, 45, true, 'Child + family',
  '{"Fish","Mustard (oil)"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for omega-3 + protein', 'For you (fallback): swap the fish for dal or paneer.', 'For you (fallback): swap the fish for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the fish for dal or chana.',
  null
),
(
  'M042', 'Rice Fish Catla', 'MF010', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Rice,catlafish,mixedvegetables,mustardoil', 'Grain+Fish+Vegetable',
  'Remove all bones; Ensure fish is fully cooked; For under 12 months, flake fish with your fingers to check for bones, then mash', '6–12 months: fully deboned fish, flaked and mashed with soft rice and vegetables to a thick mash; 12–24 months: deboned minced fish and soft rice; 2 years and older: deboned pieces', 'Allergen first steps: offer only after a few low-allergy first foods have gone well; introduce one new allergenic food at a time and watch for rash, vomiting or diarrhoea; get urgent help for swelling or breathing difficulty. If your baby has severe, persistent eczema or has had an immediate allergic reaction to any food (especially egg), talk to your paediatrician before offering this food. Once it is tolerated, keep offering it regularly; Remove all bones before serving; No added salt for children under 12 months; minimal salt and mild spice from 12–24 months',
  20, 25, 45, true, 'Child + family',
  '{"Fish","Mustard (oil)"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for omega-3 + protein', 'For you (fallback): swap the fish for dal or paneer.', 'For you (fallback): swap the fish for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the fish for dal or chana.',
  null
),
(
  'M043', 'Rice Fish Sardine', 'MF010', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Rice,sardinefish,mixedvegetables,coconutoil', 'Grain+Fish+Vegetable',
  'Remove all bones, including small bones; Ensure fish is fully cooked; For under 12 months, flake fish with your fingers to check for bones, then mash', '6–12 months: fully deboned fish, flaked and mashed with soft rice and vegetables to a thick mash; 12–24 months: deboned minced fish and soft rice; 2 years and older: deboned pieces', 'Allergen first steps: offer only after a few low-allergy first foods have gone well; introduce one new allergenic food at a time and watch for rash, vomiting or diarrhoea; get urgent help for swelling or breathing difficulty. If your baby has severe, persistent eczema or has had an immediate allergic reaction to any food (especially egg), talk to your paediatrician before offering this food. Once it is tolerated, keep offering it regularly; Remove all bones before serving; No added salt for children under 12 months; minimal salt and mild spice from 12–24 months',
  20, 25, 45, true, 'Child + family',
  '{"Fish"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for omega-3 + protein', 'For you (fallback): swap the fish for dal or paneer.', 'For you (fallback): swap the fish for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the fish for dal or chana.',
  null
),
(
  'M044', 'Rajma Rice', 'MF011', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rajma,rice,ghee', 'Grain+Pulse',
  'Ensure rajma is very well cooked; Mash or soften for children under 2 years', '12–24 months: mashed rajma; 2 years and older: usual family texture', 'Mash rajma for children under 2 years; Reduce added salt',
  10, 30, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M045', 'Chole Rice', 'MF012', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Chickpeas,rice,ghee', 'Grain+Pulse',
  'Ensure chole is very well cooked; Mash or soften for children under 2 years', '12–24 months: mashed chole; 2 years and older: usual family texture', 'Mash chole for children under 2 years; Reduce added salt',
  10, 30, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M046', 'Ragi Porridge Milk', 'MF013', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Ragiflour,milk(<12m:breastmilkpreferred;ifnotbreastfed:formulaorfull-fatpasteurisedanimalmilk),jaggery(optional,>24m)', 'Grain+Dairy',
  'Keep a thick, manageable consistency; Avoid a watery consistency', '6–8 months: thick porridge; 8 months and older: usual family texture', 'Under 12 months: breast milk is preferred; if the baby is not breastfed, infant formula or full-fat pasteurised (or freshly boiled) animal milk can be used (WHO 2023); never use flavoured or sweetened milk; Add mashed banana for children under 12 months; No jaggery or sugar before 24 months; sweeten with mashed ripe banana if needed; No added salt for children under 12 months',
  5, 15, 20, false, 'Child',
  '{"Milk"}', 'Snack', null,
  'Good for protein + iron', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you (fallback): have roasted chana + fruit instead.',
  null
),
(
  'M047', 'Ragi Porridge Water', 'MF013', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, true, false, false, 'Ragiflour,water,jaggery(optional,>24m)', 'Grain',
  'Keep a thick, manageable consistency; Avoid a watery consistency', '6–8 months: thick porridge; 8 months and older: usual family texture', 'Add mashed banana for children under 12 months; No jaggery or sugar before 24 months; sweeten with mashed ripe banana if needed; No added salt for children under 12 months',
  5, 15, 20, false, 'Child',
  '{"None"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Add a boiled egg.', 'For you: Add a boiled egg.', 'For you: Add a handful of nuts.',
  null
),
(
  'M048', 'Jowar Porridge', 'MF013', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Jowarflour,water/milk(<12m:breastmilkpreferred;ifnotbreastfed:formulaorfull-fatpasteurisedanimalmilk),jaggery(optional,>24m)', 'Grain',
  'Keep a thick, manageable consistency; Avoid a watery consistency', '6–8 months: thick porridge; 8 months and older: usual family texture', 'Under 12 months: breast milk is preferred; if the baby is not breastfed, infant formula or full-fat pasteurised (or freshly boiled) animal milk can be used (WHO 2023); never use flavoured or sweetened milk; Add mashed banana for children under 12 months; No jaggery or sugar before 24 months; sweeten with mashed ripe banana if needed; No added salt for children under 12 months',
  5, 15, 20, false, 'Child',
  '{"Milk (if milk used)"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Add a boiled egg.', 'For you: Add a boiled egg.', 'Make yours with water or plant milk. For you: Add a handful of nuts.',
  null
),
(
  'M049', 'Bajra Porridge', 'MF013', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Bajraflour,water/milk(<12m:breastmilkpreferred;ifnotbreastfed:formulaorfull-fatpasteurisedanimalmilk),jaggery(optional,>24m)', 'Grain',
  'Keep a thick, manageable consistency; Avoid a watery consistency', '6–8 months: thick porridge; 8 months and older: usual family texture', 'Under 12 months: breast milk is preferred; if the baby is not breastfed, infant formula or full-fat pasteurised (or freshly boiled) animal milk can be used (WHO 2023); never use flavoured or sweetened milk; Add mashed banana for children under 12 months; No jaggery or sugar before 24 months; sweeten with mashed ripe banana if needed; No added salt for children under 12 months',
  5, 15, 20, false, 'Child',
  '{"Milk (if milk used)"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Add a boiled egg.', 'For you: Add a boiled egg.', 'Make yours with water or plant milk. For you: Add a handful of nuts.',
  null
),
(
  'M050', 'Oats Porridge Banana', 'MF014', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Oats,milk(<12m:breastmilkpreferred;ifnotbreastfed:formulaorfull-fatpasteurisedanimalmilk),banana', 'Grain+Fruit+Dairy',
  'Ensure oats are well cooked; Banana mashed', '6–8 months: thick porridge and mashed banana; 8 months and older: usual family texture', 'Under 12 months: breast milk is preferred; if the baby is not breastfed, infant formula or full-fat pasteurised (or freshly boiled) animal milk can be used (WHO 2023); never use flavoured or sweetened milk; Use water instead of milk if allergic; Mash banana for children under 12 months; No added salt for children under 12 months',
  5, 10, 15, false, 'Child',
  '{"Milk","Gluten(cross)"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M051', 'Oats Porridge Apple', 'MF014', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Oats,milk(<12m:breastmilkpreferred;ifnotbreastfed:formulaorfull-fatpasteurisedanimalmilk),apple(cooked)', 'Grain+Fruit+Dairy',
  'Ensure oats are well cooked; Apple cooked/ mashed', '6–8 months: thick porridge and apple purée; 8 months and older: usual family texture', 'Under 12 months: breast milk is preferred; if the baby is not breastfed, infant formula or full-fat pasteurised (or freshly boiled) animal milk can be used (WHO 2023); never use flavoured or sweetened milk; Use water instead of milk if allergic; Cook apple for children under 12 months; No added salt for children under 12 months',
  10, 10, 20, false, 'Child',
  '{"Milk","Gluten(cross)"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M052', 'Oats Porridge Papaya', 'MF014', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Oats,milk(<12m:breastmilkpreferred;ifnotbreastfed:formulaorfull-fatpasteurisedanimalmilk),papaya', 'Grain+Fruit+Dairy',
  'Ensure oats are well cooked; Papaya mashed', '6–8 months: thick porridge and mashed papaya; 8 months and older: usual family texture', 'Under 12 months: breast milk is preferred; if the baby is not breastfed, infant formula or full-fat pasteurised (or freshly boiled) animal milk can be used (WHO 2023); never use flavoured or sweetened milk; Use water instead of milk if allergic; Mash papaya for children under 12 months; No added salt for children under 12 months',
  5, 10, 15, false, 'Child',
  '{"Milk","Gluten(cross)"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M053', 'Oats Porridge Mango', 'MF014', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Oats,milk(<12m:breastmilkpreferred;ifnotbreastfed:formulaorfull-fatpasteurisedanimalmilk),mango', 'Grain+Fruit+Dairy',
  'Ensure oats are well cooked; Mango mashed', '6–8 months: thick porridge and mashed mango; 8 months and older: usual family texture', 'Under 12 months: breast milk is preferred; if the baby is not breastfed, infant formula or full-fat pasteurised (or freshly boiled) animal milk can be used (WHO 2023); never use flavoured or sweetened milk; Use water instead of milk if allergic; Mash mango for children under 12 months; No added salt for children under 12 months',
  5, 10, 15, false, 'Child',
  '{"Milk","Gluten(cross)"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M054', 'Oats Porridge Mixed Fruit', 'MF014', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Oats,milk,mixedfruits(banana,apple,papaya)', 'Grain+Fruit+Dairy',
  'Ensure oats are well cooked; Mash fruit or cut into small pieces', '8–12 months: thick porridge and mashed fruit; 12 months and older: usual family texture', 'Use water instead of milk if allergic; Mash fruit for children under 12 months; No added salt for children under 12 months',
  10, 10, 20, false, 'Child',
  '{"Milk","Gluten(cross)"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M055', 'Pasta Paneer Vegetable', 'MF015', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Pasta,paneer,mixedvegetables,ghee', 'Grain+Dairy+Vegetable',
  'Ensure pasta is well cooked; Cut into small pieces; Paneer soft cubes', '12–24 months: small pasta pieces and soft paneer; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure pasta is soft',
  15, 15, 30, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M056', 'Pasta Egg Vegetable', 'MF015', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, true, false, 'Pasta,egg,mixedvegetables,ghee', 'Grain+Egg+Vegetable',
  'Ensure pasta is well cooked; Cut into small pieces; Ensure egg is fully cooked', '12–24 months: small pasta pieces and mashed egg; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure egg is fully cooked',
  15, 15, 30, true, 'Child + family',
  '{"Wheat (gluten)","Egg","Milk"}', 'Main meal', null,
  'Great source of choline and B12', 'For you (fallback): swap the egg for dal or paneer.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the egg for dal or chana.',
  null
),
(
  'M057', 'Pasta Chicken Vegetable', 'MF015', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Pasta,chicken,mixedvegetables,ghee', 'Grain+Meat+Vegetable',
  'Ensure pasta is well cooked; Cut into small pieces; Mince or shred the chicken', '12–24 months: small pasta pieces and minced chicken; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure chicken is fully cooked',
  20, 20, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you (fallback): swap the chicken for dal or paneer.', 'For you (fallback): swap the chicken for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the chicken for dal or chana.',
  null
),
(
  'M058', 'Pasta Dal Vegetable', 'MF015', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Pasta,moongdal,mixedvegetables,ghee', 'Grain+Pulse+Vegetable',
  'Ensure pasta is well cooked; Cut into small pieces; Ensure dal is well cooked', '12–24 months: small pasta pieces and soft dal; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure pasta is soft',
  15, 25, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M059', 'Besan Cheela', 'MF016', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, true, false, false, 'Besan(chickpeaflour),onion,tomato,spices,oil', 'Pulse+Vegetable',
  'Cook thoroughly; Avoid making it oily', '12–24 months: small pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Serve with curd',
  10, 20, 30, true, 'Child + family',
  '{"None"}', 'Breakfast / light meal', null,
  'Good for protein + iron', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Sprinkle roasted til (sesame).',
  null
),
(
  'M060', 'Besan Cheela Vegetable', 'MF016', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, true, false, false, 'Besan,mixedvegetables(onion,tomato,carrot,spinach),spices,oil', 'Pulse+Vegetable',
  'Cook thoroughly; Avoid making it oily', '12–24 months: small pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Serve with curd',
  15, 20, 35, true, 'Child + family',
  '{"None"}', 'Breakfast / light meal', null,
  'Good for protein + iron', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Sprinkle roasted til (sesame).',
  null
),
(
  'M061', 'Moong Dal Cheela', 'MF016', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, true, false, false, 'Moongdalbatter,onion,tomato,spices,oil', 'Pulse+Vegetable',
  'Cook thoroughly; Avoid making it oily', '12–24 months: small pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Serve with curd',
  10, 20, 30, true, 'Child + family',
  '{"None"}', 'Breakfast / light meal', null,
  'Good for protein + iron', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Sprinkle roasted til (sesame).',
  null
),
(
  'M062', 'Moong Dal Cheela Vegetable', 'MF016', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, true, false, false, 'Moongdalbatter,mixedvegetables(onion,tomato,carrot,spinach),spices,oil', 'Pulse+Vegetable',
  'Cook thoroughly; Avoid making it oily', '12–24 months: small pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Serve with curd',
  15, 20, 35, true, 'Child + family',
  '{"None"}', 'Breakfast / light meal', null,
  'Good for protein + iron', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Sprinkle roasted til (sesame).',
  null
),
(
  'M063', 'Mixed Dal Cheela', 'MF016', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, true, false, false, 'Mixeddalbatter(moong+besan),mixedvegetables,spices,oil', 'Pulse+Vegetable',
  'Cook thoroughly; Avoid making it oily', '12–24 months: small pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Serve with curd',
  15, 20, 35, true, 'Child + family',
  '{"None"}', 'Breakfast / light meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Squeeze some lemon on top.',
  null
),
(
  'M064', 'Aloo Paratha', 'MF017', '{"12-24m","2-4y","4-7y"}', '{"breakfast","lunch"}',
  true, false, false, false, 'Wheatparatha(potatostuffing),ghee', 'Grain+Vegetable',
  'Ensure paratha is soft; Tear into manageable pieces', '12–24 months: soft paratha pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paratha is soft',
  20, 20, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M065', 'Gobi Paratha', 'MF017', '{"12-24m","2-4y","4-7y"}', '{"breakfast","lunch"}',
  true, false, false, false, 'Wheatparatha(cauliflowerstuffing),ghee', 'Grain+Vegetable',
  'Ensure paratha is soft; Tear into manageable pieces', '12–24 months: soft paratha pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paratha is soft',
  20, 20, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M066', 'Methi Paratha', 'MF017', '{"12-24m","2-4y","4-7y"}', '{"breakfast","lunch"}',
  true, false, false, false, 'Wheatparatha(methistuffing),ghee', 'Grain+Vegetable',
  'Ensure paratha is soft; Tear into manageable pieces', '12–24 months: soft paratha pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paratha is soft',
  20, 20, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M067', 'Palak Paratha', 'MF017', '{"12-24m","2-4y","4-7y"}', '{"breakfast","lunch"}',
  true, false, false, false, 'Wheatparatha(spinachstuffing),ghee', 'Grain+Vegetable',
  'Ensure paratha is soft; Tear into manageable pieces', '12–24 months: soft paratha pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paratha is soft',
  20, 20, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M068', 'Paneer Paratha', 'MF017', '{"12-24m","2-4y","4-7y"}', '{"breakfast","lunch"}',
  true, false, false, false, 'Wheatparatha(paneerstuffing),ghee', 'Grain+Dairy',
  'Ensure paratha is soft; Tear into manageable pieces', '12–24 months: soft paratha pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paratha is soft',
  20, 20, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M070', 'Vegetable Pulao', 'MF018', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,mixedvegetables(carrot,beans,peas,cauliflower),ghee,spices', 'Grain+Vegetable',
  'Ensure rice is well cooked; Ensure vegetables are soft', '12–24 months: soft rice and mashed vegetables; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure rice is soft',
  15, 25, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M071', 'Paneer Pulao', 'MF018', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,paneer,mixedvegetables,ghee,spices', 'Grain+Dairy+Vegetable',
  'Ensure rice is well cooked; Paneer soft cubes', '12–24 months: soft rice and soft paneer cubes; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure rice is soft',
  15, 25, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M072', 'Egg Pulao', 'MF018', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, true, false, 'Rice,egg,mixedvegetables,ghee,spices', 'Grain+Egg+Vegetable',
  'Ensure rice is well cooked; Ensure egg is fully cooked', '12–24 months: soft rice and mashed egg; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure egg is fully cooked',
  15, 25, 40, true, 'Child + family',
  '{"Egg","Milk"}', 'Main meal', null,
  'Great source of choline and B12', 'For you (fallback): swap the egg for dal or paneer.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the egg for dal or chana.',
  null
),
(
  'M073', 'Chicken Pulao', 'MF018', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Rice,chicken,mixedvegetables,ghee,spices', 'Grain+Meat+Vegetable',
  'Ensure rice is well cooked; Mince or shred the chicken', '12–24 months: soft rice and minced chicken; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure chicken is fully cooked',
  20, 30, 50, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you (fallback): swap the chicken for dal or paneer.', 'For you (fallback): swap the chicken for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the chicken for dal or chana.',
  null
),
(
  'M074', 'Fish Pulao', 'MF018', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Rice,fish(rohu/catla),mixedvegetables,ghee,spices', 'Grain+Fish+Vegetable',
  'Remove all bones; Ensure rice is well cooked; Make sure the fish is fully deboned', '12–24 months: soft rice and deboned minced fish; 2 years and older: deboned pieces', 'Remove all bones before serving; Reduce added salt and spice for children under 2 years',
  20, 30, 50, true, 'Child + family',
  '{"Fish","Milk"}', 'Main meal', null,
  'Good for omega-3 + protein', 'For you (fallback): swap the fish for dal or paneer.', 'For you (fallback): swap the fish for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the fish for dal or chana.',
  null
),
(
  'M075', 'Curd Rice Plain', 'MF019', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,curd,salt(minimal),tempering(mustardseeds,curryleaves)', 'Grain+Dairy',
  'Use fresh curd; Avoid very sour curd', '12–24 months: soft rice and curd; 2 years and older: usual family texture', 'Use minimal added salt for children under 2 years; Use fresh curd',
  5, 5, 10, true, 'Child + family',
  '{"Milk","Mustard"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M076', 'Curd Rice Pomegranate', 'MF019', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,curd,pomegranateseeds,salt(minimal),tempering(mustardseeds,curryleaves)', 'Grain+Dairy+Fruit',
  'Use fresh curd; For children under 2 years, avoid whole pomegranate seeds or supervise closely', '12–24 months: soft rice and curd(no seeds); 2 years and older: with seeds (supervise)', 'Use minimal added salt for children under 2 years; Use fresh curd; Supervise closely if serving pomegranate seeds',
  10, 5, 15, true, 'Child + family',
  '{"Milk","Mustard"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M077', 'Curd Rice Grapes', 'MF019', '{"2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,curd,grapes(quartered),salt(minimal),tempering(mustardseeds,curryleaves)', 'Grain+Dairy+Fruit',
  'Cut grapes lengthwise into quarters; Use fresh curd', '2 years and older: usual family texture(grapes quartered)', 'Use minimal added salt; Use fresh curd; Cut grapes lengthwise into quarters',
  10, 5, 15, true, 'Child + family',
  '{"Milk","Mustard"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M078', 'Curd Rice Banana', 'MF019', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,curd,banana,salt(minimal),tempering(mustardseeds,curryleaves)', 'Grain+Dairy+Fruit',
  'Use fresh curd; Mash or slice banana appropriately', '12–24 months: soft rice and curd and mashed banana; 2 years and older: sliced banana', 'Use minimal added salt for children under 2 years; Use fresh curd; Mash banana for children under 12 months',
  5, 5, 10, true, 'Child + family',
  '{"Milk","Mustard"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M079', 'Rajma Curry Rice', 'MF020', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rajmacurry,rice,ghee', 'Grain+Pulse',
  'Ensure rajma is very well cooked; Mash or soften for children under 2 years', '12–24 months: mashed rajma and soft rice; 2 years and older: usual family texture', 'Mash rajma for children under 2 years; Reduce added salt',
  10, 30, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M080', 'Chole Curry Rice', 'MF020', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Cholecurry,rice,ghee', 'Grain+Pulse',
  'Ensure chole is very well cooked; Mash or soften for children under 2 years', '12–24 months: mashed chole and soft rice; 2 years and older: usual family texture', 'Mash chole for children under 2 years; Reduce added salt',
  10, 30, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M081', 'Lobia Curry Rice', 'MF020', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Lobiacurry,rice,ghee', 'Grain+Pulse',
  'Ensure lobia is very well cooked; Mash or soften for children under 2 years', '12–24 months: mashed lobia and soft rice; 2 years and older: usual family texture', 'Mash lobia for children under 2 years; Reduce added salt',
  10, 25, 35, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M082', 'Mixed Dal Curry Rice', 'MF020', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Mixeddalcurry(toor+moong+masoor),rice,ghee', 'Grain+Pulse',
  'Ensure dal is well cooked', '12–24 months: soft dal and soft rice; 2 years and older: usual family texture', 'Reduce added salt for children under 2 years',
  10, 25, 35, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M083', 'Paneer Bhurji Roti', 'MF021', '{"12-24m","2-4y","4-7y"}', '{"breakfast","dinner","lunch"}',
  true, false, false, false, 'Paneerbhurji,wheatroti,ghee', 'Dairy+Grain',
  'Ensure paneer is soft; Keep roti soft', '12–24 months: soft paneer and soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paneer is soft',
  10, 15, 25, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M084', 'Paneer Curry Rice', 'MF021', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Paneercurry,rice,ghee', 'Dairy+Grain',
  'Serve paneer in soft, manageable pieces; Keep rice soft', '12–24 months: soft paneer cubes and soft rice; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paneer is soft',
  15, 20, 35, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M085', 'Paneer Curry Roti', 'MF021', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Paneercurry,wheatroti,ghee', 'Dairy+Grain',
  'Serve paneer in soft, manageable pieces; Keep roti soft', '12–24 months: soft paneer cubes and soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paneer is soft',
  15, 20, 35, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M086', 'Paneer Vegetable Curry Rice', 'MF021', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Paneer-vegetablecurry(paneer,carrot,beans,peas),rice,ghee', 'Dairy+Grain+Vegetable',
  'Serve paneer in soft, manageable pieces; Keep rice soft; Ensure vegetables are well cooked', '12–24 months: soft paneer cubes and soft rice and mashed vegetables; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paneer is soft',
  20, 20, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M087', 'Chicken Curry Rice', 'MF022', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Chickencurry,rice,ghee', 'Meat+Grain',
  'Ensure chicken is fully cooked; Mince or shred for children under 2 years', '12–24 months: minced chicken and soft rice; 2 years and older: shredded chicken', 'Reduce added salt and spice for children under 2 years; Ensure chicken is fully cooked',
  20, 30, 50, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you (fallback): swap the chicken for dal or paneer.', 'For you (fallback): swap the chicken for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the chicken for dal or chana.',
  null
),
(
  'M088', 'Chicken Curry Roti', 'MF022', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Chickencurry,wheatroti,ghee', 'Meat+Grain',
  'Ensure chicken is fully cooked; Mince or shred for children under 2 years; Keep roti soft', '12–24 months: minced chicken and soft roti pieces; 2 years and older: shredded chicken', 'Reduce added salt and spice for children under 2 years; Ensure chicken is fully cooked',
  20, 30, 50, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you (fallback): swap the chicken for dal or paneer.', 'For you (fallback): swap the chicken for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the chicken for dal or chana.',
  null
),
(
  'M089', 'Chicken Vegetable Curry Rice', 'MF022', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Chicken-vegetablecurry(chicken,carrot,beans,peas),rice,ghee', 'Meat+Grain+Vegetable',
  'Ensure chicken is fully cooked; Mince or shred for children under 2 years; Ensure vegetables are well cooked', '12–24 months: minced chicken and soft rice and mashed vegetables; 2 years and older: shredded chicken', 'Reduce added salt and spice for children under 2 years; Ensure chicken is fully cooked',
  25, 30, 55, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you (fallback): swap the chicken for dal or paneer.', 'For you (fallback): swap the chicken for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the chicken for dal or chana.',
  null
),
(
  'M090', 'Fish Curry Rice Rohu', 'MF023', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Rohufishcurry,rice,mustardoil', 'Fish+Grain',
  'Remove all bones; Ensure fish is fully cooked', '12–24 months: deboned minced fish and soft rice; 2 years and older: deboned pieces', 'Remove all bones before serving; Reduce added salt and spice for children under 2 years',
  20, 25, 45, true, 'Child + family',
  '{"Fish","Mustard (oil)"}', 'Main meal', null,
  'Good for omega-3 + protein', 'For you (fallback): swap the fish for dal or paneer.', 'For you (fallback): swap the fish for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the fish for dal or chana.',
  null
),
(
  'M091', 'Fish Curry Rice Catla', 'MF023', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Catlafishcurry,rice,mustardoil', 'Fish+Grain',
  'Remove all bones; Ensure fish is fully cooked', '12–24 months: deboned minced fish and soft rice; 2 years and older: deboned pieces', 'Remove all bones before serving; Reduce added salt and spice for children under 2 years',
  20, 25, 45, true, 'Child + family',
  '{"Fish","Mustard (oil)"}', 'Main meal', null,
  'Good for omega-3 + protein', 'For you (fallback): swap the fish for dal or paneer.', 'For you (fallback): swap the fish for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the fish for dal or chana.',
  null
),
(
  'M092', 'Fish Curry Rice Sardine', 'MF023', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Sardinefishcurry,rice,coconutoil', 'Fish+Grain',
  'Remove all bones, including small bones; Ensure fish is fully cooked', '12–24 months: deboned minced fish and soft rice; 2 years and older: deboned pieces', 'Remove all bones before serving; Reduce added salt and spice for children under 2 years',
  20, 25, 45, true, 'Child + family',
  '{"Fish"}', 'Main meal', null,
  'Good for omega-3 + protein', 'For you (fallback): swap the fish for dal or paneer.', 'For you (fallback): swap the fish for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the fish for dal or chana.',
  null
),
(
  'M093', 'Fish Curry Roti Rohu', 'MF023', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Rohufishcurry,wheatroti,mustardoil', 'Fish+Grain',
  'Remove all bones; Ensure fish is fully cooked; Keep roti soft', '12–24 months: deboned minced fish and soft roti pieces; 2 years and older: deboned pieces', 'Remove all bones before serving; Reduce added salt and spice for children under 2 years',
  20, 25, 45, true, 'Child + family',
  '{"Fish","Wheat (gluten)","Mustard (oil)"}', 'Main meal', null,
  'Good for omega-3 + protein', 'For you (fallback): swap the fish for dal or paneer.', 'For you (fallback): swap the fish for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the fish for dal or chana.',
  null
),
(
  'M094', 'Mutton Curry Rice', 'MF024', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Muttoncurry,rice,ghee', 'Meat+Grain',
  'Ensure mutton is very well cooked; Ensure the meat is tender; Mince for children under 2 years', '12–24 months: minced mutton and soft rice; 2 years and older: shredded mutton', 'Reduce added salt and spice for children under 2 years; Ensure mutton is very well cooked',
  25, 45, 70, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you (fallback): swap the mutton for dal or paneer.', 'For you (fallback): swap the mutton for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the mutton for dal or chana.',
  null
),
(
  'M095', 'Mutton Curry Roti', 'MF024', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Muttoncurry,wheatroti,ghee', 'Meat+Grain',
  'Ensure mutton is very well cooked; Ensure the meat is tender; Mince for children under 2 years; Keep roti soft', '12–24 months: minced mutton and soft roti pieces; 2 years and older: shredded mutton', 'Reduce added salt and spice for children under 2 years; Ensure mutton is very well cooked',
  25, 45, 70, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you (fallback): swap the mutton for dal or paneer.', 'For you (fallback): swap the mutton for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the mutton for dal or chana.',
  null
),
(
  'M098', 'Bhindi Rice', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Bhindisabzi,rice,ghee', 'Vegetable+Grain',
  'Ensure bhindi is well cooked; Keep rice soft', '12–24 months: mashed bhindi and soft rice; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure rice is soft',
  15, 20, 35, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M099', 'Bhindi Roti', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Bhindisabzi,wheatroti,ghee', 'Vegetable+Grain',
  'Ensure bhindi is well cooked; Keep roti soft', '12–24 months: mashed bhindi and soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 20, 35, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M100', 'Mixed Veg Rice', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Mixedvegetablesabzi(carrot,beans,cauliflower,peas),rice,ghee', 'Vegetable+Grain',
  'Ensure all vegetables are well cooked; Keep rice soft', '12–24 months: mashed vegetables and soft rice; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure rice is soft',
  20, 20, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M101', 'Mixed Veg Roti', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Mixedvegetablesabzi(carrot,beans,cauliflower,peas),wheatroti,ghee', 'Vegetable+Grain',
  'Ensure all vegetables are well cooked; Keep roti soft', '12–24 months: mashed vegetables and soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  20, 20, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M102', 'Palak Rice', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Palaksabzi,rice,ghee', 'Vegetable+Grain',
  'Ensure spinach is well cooked; Keep rice soft', '12–24 months: mashed spinach and soft rice; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure rice is soft',
  15, 20, 35, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M103', 'Palak Roti', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Palaksabzi,wheatroti,ghee', 'Vegetable+Grain',
  'Ensure spinach is well cooked; Keep roti soft', '12–24 months: mashed spinach and soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 20, 35, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M104', 'Methi Rice', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Methisabzi,rice,ghee', 'Vegetable+Grain',
  'Ensure methi is well cooked; Keep rice soft', '12–24 months: mashed methi and soft rice; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure rice is soft',
  15, 20, 35, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M105', 'Methi Roti', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Methisabzi,wheatroti,ghee', 'Vegetable+Grain',
  'Ensure methi is well cooked; Keep roti soft', '12–24 months: mashed methi and soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 20, 35, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M106', 'Carrot Rice', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Carrotsabzi,rice,ghee', 'Vegetable+Grain',
  'Ensure carrot is well cooked; Keep rice soft', '12–24 months: mashed carrot and soft rice; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure rice is soft',
  15, 20, 35, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M107', 'Carrot Roti', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Carrotsabzi,wheatroti,ghee', 'Vegetable+Grain',
  'Ensure carrot is well cooked; Keep roti soft', '12–24 months: mashed carrot and soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 20, 35, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M108', 'Beetroot Rice', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Beetrootsabzi,rice,ghee', 'Vegetable+Grain',
  'Ensure beetroot is well cooked; Keep rice soft', '12–24 months: mashed beetroot and soft rice; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure rice is soft',
  15, 20, 35, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M109', 'Beetroot Roti', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Beetrootsabzi,wheatroti,ghee', 'Vegetable+Grain',
  'Ensure beetroot is well cooked; Keep roti soft', '12–24 months: mashed beetroot and soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 20, 35, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M110', 'Pumpkin Rice', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Pumpkinsabzi,rice,ghee', 'Vegetable+Grain',
  'Ensure pumpkin is well cooked; Keep rice soft', '12–24 months: mashed pumpkin and soft rice; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure rice is soft',
  15, 20, 35, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M111', 'Pumpkin Roti', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Pumpkinsabzi,wheatroti,ghee', 'Vegetable+Grain',
  'Ensure pumpkin is well cooked; Keep roti soft', '12–24 months: mashed pumpkin and soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 20, 35, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M112', 'Vegetable Soup', 'MF026', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","lunch","morning_snack"}',
  true, true, false, false, 'Mixedvegetables(carrot,tomato,beans,spinach),water,salt(none<12m,minimal12-24m)', 'Vegetable',
  'Cool soup to a safe serving temperature; Ensure vegetables are well cooked', '8–12 months: pureed soup; 12–24 months: strained with small pieces; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months; Ensure vegetables are well cooked',
  15, 20, 35, true, 'Child + family',
  '{"None"}', 'Starter', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  '—', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.',
  null
),
(
  'M113', 'Tomato Soup', 'MF026', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","lunch","morning_snack"}',
  true, true, false, false, 'Tomato,water,salt(none<12m,minimal12-24m),pepper(optional,>18m)', 'Vegetable',
  'Cool soup to a safe serving temperature; Cook tomato well', '8–12 months: pureed soup; 12–24 months: strained; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months; Avoid pepper for children under 18 months',
  10, 15, 25, true, 'Child + family',
  '{"None"}', 'Starter', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  '—', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.',
  null
),
(
  'M114', 'Carrot Soup', 'MF026', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","lunch","morning_snack"}',
  true, true, false, false, 'Carrot,water,salt(none<12m,minimal12-24m)', 'Vegetable',
  'Cool soup to a safe serving temperature; Carrot well cooked', '6–8 months: thick purée (serve as a mash, not a drink); 8–12 months: pureed soup; 12–24 months: strained; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months',
  10, 20, 30, true, 'Child + family',
  '{"None"}', 'Starter', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  '—', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.',
  null
),
(
  'M115', 'Spinach Soup', 'MF026', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","lunch","morning_snack"}',
  true, true, false, false, 'Spinach,water,salt(none<12m,minimal12-24m)', 'Vegetable',
  'Cool soup to a safe serving temperature; Spinach well cooked', '8–12 months: pureed soup; 12–24 months: strained; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months',
  10, 15, 25, true, 'Child + family',
  '{"None"}', 'Starter', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  '—', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.',
  null
),
(
  'M116', 'Mixed Dal Soup', 'MF026', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","lunch","morning_snack"}',
  true, true, false, false, 'Mixeddal(moong+masoor),water,salt(none<12m,minimal12-24m),turmeric', 'Pulse',
  'Cool soup to a safe serving temperature; Ensure dal is well cooked', '6–8 months: thick purée (serve as a mash, not a drink); 8–12 months: pureed soup; 12–24 months: strained with small pieces; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months',
  10, 25, 35, true, 'Child + family',
  '{"None"}', 'Starter', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  '—', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.',
  null
),
(
  'M117', 'Chicken Soup', 'MF026', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","lunch","morning_snack"}',
  false, false, false, true, 'Chicken,mixedvegetables,water,salt(none<12m,minimal12-24m)', 'Meat+Vegetable',
  'Cool soup to a safe serving temperature; Mince chicken finely; Ensure vegetables are well cooked', '6–8 months: thick purée of chicken and vegetables, finely blended (serve as a mash, not a drink); 8–12 months: pureed soup with minced chicken; 12–24 months: strained with small pieces; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months; Ensure chicken is fully cooked',
  20, 30, 50, true, 'Child + family',
  '{"None"}', 'Starter', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  '—', 'For you (fallback): swap the chicken for dal or paneer.', 'For you (fallback): swap the chicken for eggs or dal.', 'For you: have it with roti or rice and dal.', 'For you (fallback): swap the chicken for dal or chana.',
  null
),
(
  'M118', 'Fish Soup', 'MF026', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","lunch","morning_snack"}',
  false, false, false, true, 'Fish(rohu/catla),mixedvegetables,water,salt(none<12m,minimal12-24m)', 'Fish+Vegetable',
  'Remove all bones; Cool soup to a safe serving temperature; Make sure the fish is fully deboned; Ensure vegetables are well cooked', '6–8 months: thick purée of fully deboned fish and vegetables (serve as a mash, not a drink); 8–12 months: pureed soup with deboned minced fish; 12–24 months: strained with small pieces; 2 years and older: usual family texture', 'Allergen first steps: offer only after a few low-allergy first foods have gone well; introduce one new allergenic food at a time and watch for rash, vomiting or diarrhoea; get urgent help for swelling or breathing difficulty. If your baby has severe, persistent eczema or has had an immediate allergic reaction to any food (especially egg), talk to your paediatrician before offering this food. Once it is tolerated, keep offering it regularly; Remove all bones before serving; No added salt for children under 12 months; minimal salt from 12–24 months',
  20, 30, 50, true, 'Child + family',
  '{"Fish"}', 'Starter', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  '—', 'For you (fallback): swap the fish for dal or paneer.', 'For you (fallback): swap the fish for eggs or dal.', 'For you: have it with roti or rice and dal.', 'For you (fallback): swap the fish for dal or chana.',
  null
),
(
  'M119', 'Fruit Curd Bowl', 'MF027', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Mixedfruits(banana,papaya,mango),curd', 'Fruit+Dairy',
  'Use soft fruit; Mashed for children under 12 months', '8–12 months: mashed fruit and curd; 12–24 months: small pieces and curd; 2 years and older: usual family texture', 'Mash fruit for children under 12 months; Use fresh curd; No added salt for children under 12 months',
  10, 0, 10, false, 'Child',
  '{"Milk"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M120', 'Fruit Curd Bowl Banana', 'MF027', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Banana,curd', 'Fruit+Dairy',
  'Ensure banana is mashed for children under 12 months', '8–12 months: mashed banana and curd; 12–24 months: sliced banana and curd; 2 years and older: usual family texture', 'Mash banana for children under 12 months; Use fresh curd; No added salt for children under 12 months',
  5, 0, 5, false, 'Child',
  '{"Milk"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M121', 'Fruit Curd Bowl Papaya', 'MF027', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Papaya,curd', 'Fruit+Dairy',
  'Ensure papaya is mashed for children under 12 months', '8–12 months: mashed papaya and curd; 12–24 months: small pieces and curd; 2 years and older: usual family texture', 'Mash papaya for children under 12 months; Use fresh curd; No added salt for children under 12 months',
  5, 0, 5, false, 'Child',
  '{"Milk"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M122', 'Fruit Curd Bowl Mango', 'MF027', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Mango,curd', 'Fruit+Dairy',
  'Ensure mango is mashed for children under 12 months', '8–12 months: mashed mango and curd; 12–24 months: small pieces and curd; 2 years and older: usual family texture', 'Mash mango for children under 12 months; Use fresh curd; No added salt for children under 12 months',
  5, 0, 5, false, 'Child',
  '{"Milk"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M123', 'Fruit Curd Bowl Apple', 'MF027', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Apple(cooked),curd', 'Fruit+Dairy',
  'Cook or mash apple for children under 12 months', '8–12 months: apple purée and curd; 12–24 months: small cooked pieces and curd; 2 years and older: usual family texture', 'Cook apple for children under 12 months; Use fresh curd; No added salt for children under 12 months',
  10, 10, 20, false, 'Child',
  '{"Milk"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M124', 'Fruit Curd Bowl Mixed', 'MF027', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Mixedfruits(banana,papaya,apple,mango),curd', 'Fruit+Dairy',
  'Use soft fruit; Mashed for children under 12 months', '8–12 months: mashed fruit and curd; 12–24 months: small pieces and curd; 2 years and older: usual family texture', 'Mash fruit for children under 12 months; Use fresh curd; No added salt for children under 12 months',
  10, 0, 10, false, 'Child',
  '{"Milk"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M125', 'Roasted Makhana', 'MF028', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Roastedmakhana(foxnuts),ghee(optional)', 'Nut',
  'Crush fully or soften for children under 2 years; Avoid hard pieces', '12–24 months: crushed fully to a powder or softened in milk/curd; 2 years and older: whole, seated and supervised', 'Roast until crisp but not hard; Crush fully or soften in milk/curd for children under 2 years',
  5, 10, 15, false, 'Child',
  '{"Milk"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'Make yours with oil instead of ghee. For you: Sprinkle roasted til (sesame).',
  null
),
(
  'M126', 'Murmura Curd', 'MF028', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Murmura(puffedrice),curd,salt(minimal)', 'Grain+Dairy',
  'Soak murmura in curd before serving; Keep the food moist, not dry', '12–24 months: well-soaked murmura and curd; 2 years and older: usual family texture', 'Soak murmura in curd; Use minimal added salt for children under 2 years',
  5, 0, 5, false, 'Child',
  '{"Milk"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M127', 'Murmura Banana', 'MF028', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Murmura,banana,milk/curd', 'Grain+Fruit+Dairy',
  'Soak murmura before serving; Mash banana for children under 12 months', '12–24 months: soaked murmura and mashed banana and milk; 2 years and older: usual family texture', 'Soak murmura; Mash banana for children under 12 months',
  5, 0, 5, false, 'Child',
  '{"Milk"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M129', 'Dhokla', 'MF029', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, false, false, false, 'Dhokla(fermentedbesan),tempering(mustardseeds,curryleaves,sesameseeds-optional),coriander', 'Pulse+Grain',
  'Ensure dhokla is soft; Cut into small pieces', '12–24 months: small soft pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure dhokla is soft',
  15, 20, 35, true, 'Child + family',
  '{"Mustard","Sesame (if used)"}', 'Breakfast / light meal', null,
  'Good for protein + iron', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M130', 'Khandvi', 'MF029', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, false, false, false, 'Khandvi(fermentedbesanrolls),tempering(mustardseeds,curryleaves,sesameseeds-optional),coriander', 'Pulse+Grain',
  'Ensure khandvi is soft; Cut into small pieces', '12–24 months: small soft pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure khandvi is soft',
  20, 20, 40, true, 'Child + family',
  '{"Mustard","Sesame (if used)"}', 'Breakfast / light meal', null,
  'Good for protein + iron', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M131', 'Appam', 'MF029', '{"12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Appam(fermentedricebatter),coconutmilk', 'Grain',
  'Ensure appam is soft; Tear into small pieces', '12–24 months: small soft pieces; 2 years and older: usual family texture', 'Reduce added salt for children under 2 years; Ensure appam is soft',
  15, 15, 30, true, 'Child + family',
  '{"None"}', 'Breakfast / light meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a boiled egg.', 'For you: Add a boiled egg.', 'For you: Add a handful of nuts.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M133', 'Fruit Custard', 'MF030', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack"}',
  true, false, false, false, 'Mixedfruits(banana,papaya,apple),custard(milk,cornflour),jaggery(optional,>24m)', 'Fruit+Dairy',
  'Ensure custard is soft; Use soft, mashed fruit for children under 2 years', '12–24 months: mashed fruit and unsweetened custard; 2 years and older: small pieces of fruit and custard', 'No jaggery or sugar before 24 months — sweeten with mashed ripe banana; A small amount of jaggery is optional from 24 months; Ensure custard is soft',
  15, 10, 25, false, 'Child',
  '{"Milk"}', 'Occasional treat', null,
  '—', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'For you (fallback): a piece of fruit instead.',
  null
),
(
  'M134', 'Shrikhand', 'MF030', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack"}',
  true, false, false, false, 'Shrikhand(hungcurd,cardamom,mashedbanana<24m),jaggery(optional,>24m)', 'Dairy',
  'Ensure shrikhand is soft', '12–24 months: small amounts, sweetened only with mashed ripe banana; 2 years and older: usual family texture', 'No jaggery or sugar before 24 months — sweeten with mashed ripe banana; A small amount of jaggery is optional from 24 months; Ensure shrikhand is soft',
  10, 0, 10, false, 'Child',
  '{"Milk"}', 'Occasional treat', null,
  '—', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'For you (fallback): a piece of fruit instead.',
  null
),
(
  'M135', 'Halwa Suji', 'MF030', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack"}',
  true, false, false, false, 'Sujihalwa(semolina,ghee,mashedbanana<24m),jaggery(optional,>24m)', 'Grain+Fat',
  'Ensure halwa is soft', '12–24 months: small amounts, sweetened only with mashed ripe banana; 2 years and older: usual family texture', 'No jaggery or sugar before 24 months — sweeten with mashed ripe banana; A small amount of jaggery is optional from 24 months; Ensure halwa is soft',
  10, 15, 25, false, 'Child',
  '{"Wheat (gluten)","Milk"}', 'Occasional treat', null,
  '—', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'Make yours with oil instead of ghee. For you: an occasional treat — enjoy.',
  null
),
(
  'M136', 'Halwa Ragi', 'MF030', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack"}',
  true, false, false, false, 'Ragihalwa(ragiflour,ghee,mashedbanana<24m),jaggery(optional,>24m)', 'Grain+Fat',
  'Ensure halwa is soft', '12–24 months: small amounts, sweetened only with mashed ripe banana; 2 years and older: usual family texture', 'No jaggery or sugar before 24 months — sweeten with mashed ripe banana; A small amount of jaggery is optional from 24 months; Ensure halwa is soft',
  10, 15, 25, false, 'Child',
  '{"Milk"}', 'Occasional treat', null,
  '—', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'Make yours with oil instead of ghee. For you: an occasional treat — enjoy.',
  null
),
(
  'M137', 'Halwa Wheat', 'MF030', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack"}',
  true, false, false, false, 'Wheathalwa(wheatflour,ghee,mashedbanana<24m),jaggery(optional,>24m)', 'Grain+Fat',
  'Ensure halwa is soft', '12–24 months: small amounts, sweetened only with mashed ripe banana; 2 years and older: usual family texture', 'No jaggery or sugar before 24 months — sweeten with mashed ripe banana; A small amount of jaggery is optional from 24 months; Ensure halwa is soft',
  10, 15, 25, false, 'Child',
  '{"Wheat (gluten)","Milk"}', 'Occasional treat', null,
  '—', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'Make yours with oil instead of ghee. For you: an occasional treat — enjoy.',
  null
),
(
  'M138', 'Kheer Rice', 'MF030', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack"}',
  true, false, false, false, 'Ricekheer(rice,milk,cardamom,mashedbanana<24m),jaggery(optional,>24m)', 'Grain+Dairy',
  'Ensure kheer is soft', '12–24 months: small amounts, sweetened only with mashed ripe banana; 2 years and older: usual family texture', 'No jaggery or sugar before 24 months — sweeten with mashed ripe banana; A small amount of jaggery is optional from 24 months; Ensure kheer is soft',
  10, 25, 35, false, 'Child',
  '{"Milk"}', 'Occasional treat', null,
  '—', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'For you (fallback): a piece of fruit instead.',
  null
),
(
  'M139', 'Kheer Ragi', 'MF030', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack"}',
  true, false, false, false, 'Ragikheer(ragiflour,milk,cardamom,mashedbanana<24m),jaggery(optional,>24m)', 'Grain+Dairy',
  'Ensure kheer is soft', '12–24 months: small amounts, sweetened only with mashed ripe banana; 2 years and older: usual family texture', 'No jaggery or sugar before 24 months — sweeten with mashed ripe banana; A small amount of jaggery is optional from 24 months; Ensure kheer is soft',
  10, 20, 30, false, 'Child',
  '{"Milk"}', 'Occasional treat', null,
  '—', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'For you (fallback): a piece of fruit instead.',
  null
),
(
  'M140', 'Kheer Suji', 'MF030', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack"}',
  true, false, false, false, 'Sujikheer(semolina,milk,cardamom,mashedbanana<24m),jaggery(optional,>24m)', 'Grain+Dairy',
  'Ensure kheer is soft', '12–24 months: small amounts, sweetened only with mashed ripe banana; 2 years and older: usual family texture', 'No jaggery or sugar before 24 months — sweeten with mashed ripe banana; A small amount of jaggery is optional from 24 months; Ensure kheer is soft',
  10, 20, 30, false, 'Child',
  '{"Wheat (gluten)","Milk"}', 'Occasional treat', null,
  '—', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'For you: an occasional treat — enjoy.', 'For you (fallback): a piece of fruit instead.',
  null
),
(
  'M141', 'Dal Khichdi Variation', 'MF001', '{"8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,mixeddal(moong+toor),ghee,turmeric', 'Grain+Pulse+Fat',
  'Ensure dal is well cooked; Mash for children under 12 months', '8–12 months: soft and mashed; 12 months and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  10, 25, 35, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M142', 'Lauki Khichdi', 'MF002', '{"8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,moongdal,lauki(bottlegourd),ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure lauki is well cooked; Mash for children under 12 months', '8–12 months: soft and mashed; 12 months and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  15, 25, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M143', 'Tinda Khichdi', 'MF002', '{"8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,moongdal,tinda(applegourd),ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure tinda is well cooked; Mash for children under 12 months', '8–12 months: soft and mashed; 12 months and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  15, 25, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M144', 'Corn Khichdi', 'MF002', '{"8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,moongdal,cornkernels,ghee', 'Grain+Pulse+Vegetable+Fat',
  'Ensure corn is well cooked; Purée and strain for children under 12 months', '8–12 months: purée and strain to remove corn kernel skins; 12 months and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months; minimal salt from 12–24 months',
  15, 25, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  null
),
(
  'M145', 'Idli Plain', 'MF004', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, true, false, false, 'Idli(rice,uraddal)', 'Grain+Pulse',
  'Mash idli for children under 12 months; Tear into small pieces', '8–12 months: mashed; 12–24 months: small pieces; 2 years and older: usual family texture', 'Mash for children under 12 months; No added salt for children under 12 months',
  15, 15, 30, true, 'Child + family',
  '{"None"}', 'Breakfast / light meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M146', 'Idli Ghee', 'MF004', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, false, false, false, 'Idli(rice,uraddal),ghee', 'Grain+Pulse+Fat',
  'Mash idli for children under 12 months; Tear into small pieces', '8–12 months: mashed with ghee; 12–24 months: small pieces with ghee; 2 years and older: usual family texture', 'Mash for children under 12 months; Add ghee; No added salt for children under 12 months',
  15, 15, 30, true, 'Child + family',
  '{"Milk"}', 'Breakfast / light meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M147', 'Dosa Plain', 'MF005', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, true, false, false, 'Dosa(rice,uraddal),oil', 'Grain+Pulse+Fat',
  'Tear dosa into small pieces for children under 2 years', '8–12 months: small soft pieces; 12–24 months: small pieces; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months; Ensure dosa is soft',
  20, 20, 40, true, 'Child + family',
  '{"None"}', 'Breakfast / light meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M148', 'Dosa Ghee', 'MF005', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, false, false, false, 'Dosa(rice,uraddal),ghee', 'Grain+Pulse+Fat',
  'Tear dosa into small pieces for children under 2 years', '8–12 months: small soft pieces; 12–24 months: small pieces; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months; Ensure dosa is soft',
  20, 20, 40, true, 'Child + family',
  '{"Milk"}', 'Breakfast / light meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M149', 'Uttapam', 'MF005', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Uttapam(rice,uraddalbatterwithvegetables),ghee', 'Grain+Pulse+Vegetable+Fat',
  'Tear uttapam into small pieces for children under 2 years', '8–12 months: small soft pieces; 12–24 months: small pieces; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt and mild spice from 12–24 months; Ensure uttapam is soft',
  20, 20, 40, true, 'Child + family',
  '{"Milk"}', 'Breakfast / light meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Squeeze some lemon on top.',
  'Plan ahead: batter needs about 8–12 hours of soaking/fermentation unless ready-made batter is used; the listed times assume batter is ready.'
),
(
  'M150', 'Poha Plain', 'MF006', '{"12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Poha,turmeric,mustardseeds,salt(minimal)', 'Grain',
  'Soak poha well so it is soft; Keep the food moist, not dry', '12–24 months: well-soaked, soft; 2 years and older: usual family texture', 'Soak poha well; Use minimal added salt for children under 2 years',
  5, 10, 15, true, 'Child + family',
  '{"Mustard"}', 'Breakfast / light meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a handful of nuts.',
  null
),
(
  'M151', 'Upma Plain', 'MF007', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, true, false, false, 'Semolina(rava),mustardseeds,curryleaves,oil', 'Grain+Fat',
  'Cook thoroughly; Keep the food moist, not dry', '8–12 months: soft and lumpy; 12 months and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months; Ensure upma is soft',
  10, 15, 25, true, 'Child + family',
  '{"Mustard","Wheat (gluten)"}', 'Breakfast / light meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a handful of nuts.',
  null
),
(
  'M152', 'Upma Ghee', 'MF007', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Semolina(rava),mustardseeds,curryleaves,ghee', 'Grain+Fat',
  'Cook thoroughly; Keep the food moist, not dry', '8–12 months: soft and lumpy; 12 months and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months; Ensure upma is soft',
  10, 15, 25, true, 'Child + family',
  '{"Milk","Mustard","Wheat (gluten)"}', 'Breakfast / light meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a handful of nuts.',
  null
),
(
  'M153', 'Thepla Plain', 'MF008', '{"12-24m","2-4y","4-7y"}', '{"breakfast","lunch"}',
  true, false, false, false, 'Thepla(wheat,methi,spices),ghee,curd', 'Grain+Vegetable+Dairy',
  'Ensure thepla is soft; Tear into manageable pieces', '12–24 months: soft thepla pieces and curd; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure thepla is soft',
  20, 20, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): skip the curd or milk; add a handful of roasted chana.',
  null
),
(
  'M155', 'Egg Boiled', 'MF009', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  false, false, true, false, 'Boiledegg', 'Egg',
  'Mash for children under 12 months; Cut into small pieces', '6–8 months: hard-boiled egg (white and yolk), mashed smooth with a little breast milk or water; 8–12 months: mashed; 12–24 months: small pieces; 2 years and older: halves', 'Allergen first steps: offer only after a few low-allergy first foods have gone well; introduce one new allergenic food at a time and watch for rash, vomiting or diarrhoea; get urgent help for swelling or breathing difficulty. If your baby has severe, persistent eczema or has had an immediate allergic reaction to any food (especially egg), talk to your paediatrician before offering this food. Once it is tolerated, keep offering it regularly; Ensure egg is fully cooked; Mash for children under 12 months; No added salt for children under 12 months',
  0, 10, 10, false, 'Child',
  '{"Egg"}', 'Snack', null,
  'Great source of choline and B12', 'For you (fallback): swap the egg for dal or paneer.', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you (fallback): swap the egg for dal or chana.',
  null
),
(
  'M156', 'Egg Scrambled', 'MF009', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  false, false, true, false, 'Scrambledegg,ghee', 'Egg+Fat',
  'Ensure egg is fully cooked; Soft', '8–12 months: mashed; 12–24 months: small pieces; 2 years and older: usual family texture', 'Allergen first steps: offer only after a few low-allergy first foods have gone well; introduce one new allergenic food at a time and watch for rash, vomiting or diarrhoea; get urgent help for swelling or breathing difficulty. If your baby has severe, persistent eczema or has had an immediate allergic reaction to any food (especially egg), talk to your paediatrician before offering this food. Once it is tolerated, keep offering it regularly; Ensure egg is fully cooked; No added salt for children under 12 months; minimal salt from 12–24 months',
  5, 5, 10, false, 'Child',
  '{"Egg","Milk"}', 'Snack', null,
  'Great source of choline and B12', 'For you (fallback): swap the egg for dal or paneer.', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you (fallback): swap the egg for dal or chana.',
  null
),
(
  'M157', 'Egg Omelette', 'MF009', '{"12-24m","2-4y","4-7y"}', '{"breakfast"}',
  false, false, true, false, 'Eggomelette(egg,onion,tomato),ghee,roti', 'Egg+Vegetable+Grain',
  'Ensure egg is fully cooked; Keep omelette soft; Keep roti soft', '12–24 months: mashed egg and soft roti; 2 years and older: small omelette pieces and roti', 'Ensure egg is fully cooked; Reduce added salt and spice for children under 2 years',
  10, 10, 20, true, 'Child + family',
  '{"Egg","Wheat (gluten)","Milk"}', 'Breakfast / light meal', null,
  'Great source of choline and B12', 'For you (fallback): swap the egg for dal or paneer.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you (fallback): swap the egg for dal or chana.',
  null
),
(
  'M158', 'Rice Fish Indian Mackerel', 'MF010', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Rice,Indianmackerel(bangda),mixedvegetables,coconutoil', 'Grain+Fish+Vegetable',
  'Remove all bones; Ensure fish is fully cooked; For under 12 months, flake fish with your fingers to check for bones, then mash', '6–12 months: fully deboned fish, flaked and mashed with soft rice and vegetables to a thick mash; 12–24 months: deboned minced fish and soft rice; 2 years and older: deboned pieces', 'Allergen first steps: offer only after a few low-allergy first foods have gone well; introduce one new allergenic food at a time and watch for rash, vomiting or diarrhoea; get urgent help for swelling or breathing difficulty. If your baby has severe, persistent eczema or has had an immediate allergic reaction to any food (especially egg), talk to your paediatrician before offering this food. Once it is tolerated, keep offering it regularly; Remove all bones before serving; No added salt for children under 12 months; minimal salt and mild spice from 12–24 months',
  20, 25, 45, true, 'Child + family',
  '{"Fish"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for omega-3 + protein', 'For you (fallback): swap the fish for dal or paneer.', 'For you (fallback): swap the fish for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the fish for dal or chana.',
  null
),
(
  'M159', 'Rajma Curry Roti', 'MF011', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rajmacurry,wheatroti,ghee', 'Pulse+Grain+Fat',
  'Ensure rajma is very well cooked; Mash or soften for children under 2 years; Keep roti soft', '12–24 months: mashed rajma and soft roti pieces; 2 years and older: usual family texture', 'Mash rajma for children under 2 years; Reduce added salt',
  10, 30, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M160', 'Chole Curry Roti', 'MF012', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Cholecurry,wheatroti,ghee', 'Pulse+Grain+Fat',
  'Ensure chole is very well cooked; Mash or soften for children under 2 years; Keep roti soft', '12–24 months: mashed chole and soft roti pieces; 2 years and older: usual family texture', 'Mash chole for children under 2 years; Reduce added salt',
  10, 30, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M161', 'Millet Mix Porridge', 'MF013', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Mixedmilletflour(ragi+jowar+bajra),water/milk(<12m:breastmilkpreferred;ifnotbreastfed:formulaorfull-fatpasteurisedanimalmilk),jaggery(optional,>24m)', 'Grain',
  'Keep a thick, manageable consistency; Avoid a watery consistency', '6–8 months: thick porridge; 8 months and older: usual family texture', 'Under 12 months: breast milk is preferred; if the baby is not breastfed, infant formula or full-fat pasteurised (or freshly boiled) animal milk can be used (WHO 2023); never use flavoured or sweetened milk; Add mashed banana for children under 12 months; No jaggery or sugar before 24 months; sweeten with mashed ripe banana if needed; No added salt for children under 12 months',
  5, 15, 20, false, 'Child',
  '{"Milk (if milk used)"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Add a boiled egg.', 'For you: Add a boiled egg.', 'Make yours with water or plant milk. For you: Add a handful of nuts.',
  null
),
(
  'M162', 'Oats Porridge Dates', 'MF014', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Oats,water/milk,dates(soaked,>12m)', 'Grain+Fruit',
  'Ensure oats are well cooked; Soak dates and chop finely', '8–12 months: thick porridge and chopped dates; 12 months and older: usual family texture', 'Soak dates; chop finely; omit for children under 12 months; No added salt for children under 12 months',
  10, 10, 20, false, 'Child',
  '{"Milk (if milk used)","Gluten(cross)"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Add a boiled egg.', 'For you: Add a boiled egg.', 'Make yours with water or plant milk. For you: Add a handful of nuts.',
  null
),
(
  'M163', 'Oats Porridge Raisins', 'MF014', '{"8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  true, false, false, false, 'Oats,water/milk,raisins(soaked,>12m)', 'Grain+Fruit',
  'Ensure oats are well cooked; Soak raisins and chop finely', '8–12 months: thick porridge and chopped raisins; 12 months and older: usual family texture', 'Soak raisins; chop finely; omit for children under 12 months; No added salt for children under 12 months',
  10, 10, 20, false, 'Child',
  '{"Milk (if milk used)","Gluten(cross)"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Add a boiled egg.', 'For you: Add a boiled egg.', 'Make yours with water or plant milk. For you: Add a handful of nuts.',
  null
),
(
  'M164', 'Pasta Tomato', 'MF015', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Pasta,tomatosauce,ghee', 'Grain+Vegetable',
  'Ensure pasta is well cooked; Cut into small pieces; Keep tomato sauce mild', '12–24 months: small pasta pieces and mild sauce; 2 years and older: usual family texture', 'Reduce added salt for children under 2 years; Ensure pasta is soft',
  10, 15, 25, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M165', 'Pasta Cheese', 'MF015', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Pasta,cheesesauce,ghee', 'Grain+Dairy',
  'Ensure pasta is well cooked; Cut into small pieces; Keep cheese sauce mild', '12–24 months: small pasta pieces and mild cheese sauce; 2 years and older: usual family texture', 'Reduce added salt for children under 2 years; Ensure pasta is soft',
  10, 15, 25, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M166', 'Besan Cheela Spinach', 'MF016', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, true, false, false, 'Besan,spinach,onion,spices,oil', 'Pulse+Vegetable',
  'Cook thoroughly; Avoid making it oily', '12–24 months: small pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Serve with curd',
  15, 20, 35, true, 'Child + family',
  '{"None"}', 'Breakfast / light meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Squeeze some lemon on top.',
  null
),
(
  'M167', 'Moong Dal Cheela Carrot', 'MF016', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, true, false, false, 'Moongdalbatter,carrot,onion,spices,oil', 'Pulse+Vegetable',
  'Cook thoroughly; Avoid making it oily', '12–24 months: small pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Serve with curd',
  15, 20, 35, true, 'Child + family',
  '{"None"}', 'Breakfast / light meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Squeeze some lemon on top.',
  null
),
(
  'M170', 'Paneer Pulao Raita', 'MF018', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Paneerpulao,raita(curd,cucumber)', 'Grain+Dairy+Vegetable',
  'Ensure rice is well cooked; Paneer soft cubes; Serve raita at a comfortable temperature', '12–24 months: soft pulao and soft paneer and raita; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paneer is soft',
  20, 25, 45, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M171', 'Curd Rice Carrots', 'MF019', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,curd,gratedcarrot,salt(minimal),tempering(mustardseeds,curryleaves)', 'Grain+Dairy+Vegetable',
  'Use fresh curd; Grate carrot finely', '12–24 months: soft rice and curd and grated carrot; 2 years and older: usual family texture', 'Use minimal added salt for children under 2 years; Use fresh curd',
  10, 5, 15, true, 'Child + family',
  '{"Milk","Mustard"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M172', 'Curd Rice Cucumber', 'MF019', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Rice,curd,gratedcucumber,salt(minimal),tempering(mustardseeds,curryleaves)', 'Grain+Dairy+Vegetable',
  'Use fresh curd; Grate cucumber finely', '12–24 months: soft rice and curd and grated cucumber; 2 years and older: usual family texture', 'Use minimal added salt for children under 2 years; Use fresh curd',
  10, 5, 15, true, 'Child + family',
  '{"Milk","Mustard"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M173', 'Lobia Curry Roti', 'MF020', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Lobiacurry,wheatroti,ghee', 'Pulse+Grain+Fat',
  'Ensure lobia is very well cooked; Mash or soften for children under 2 years; Keep roti soft', '12–24 months: mashed lobia and soft roti pieces; 2 years and older: usual family texture', 'Mash lobia for children under 2 years; Reduce added salt',
  10, 25, 35, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'Make yours with oil instead of ghee. For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M174', 'Paneer Bhurji Rice', 'MF021', '{"12-24m","2-4y","4-7y"}', '{"breakfast","dinner","lunch"}',
  true, false, false, false, 'Paneerbhurji,rice,ghee', 'Dairy+Grain',
  'Ensure paneer is soft; Keep rice soft', '12–24 months: soft paneer and soft rice; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paneer is soft',
  10, 20, 30, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M175', 'Paneer Curry Dal', 'MF021', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Paneercurry,dal,rice,ghee', 'Dairy+Pulse+Grain',
  'Serve paneer in soft, manageable pieces; Ensure dal is well cooked; Keep rice soft', '12–24 months: soft paneer and soft dal and soft rice; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure paneer is soft',
  20, 25, 45, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you: Have a fruit after — guava, orange or papaya.', 'For you (fallback): have dal with roti or rice and a squeeze of lemon instead.',
  null
),
(
  'M176', 'Chicken Curry Dal', 'MF022', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Chickencurry,dal,rice,ghee', 'Meat+Pulse+Grain',
  'Ensure chicken is fully cooked; Mince or shred for children under 2 years; Ensure dal is well cooked', '12–24 months: minced chicken and soft dal and soft rice; 2 years and older: shredded chicken', 'Reduce added salt and spice for children under 2 years; Ensure chicken is fully cooked',
  25, 35, 60, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you (fallback): skip the chicken; have extra dal, or add paneer.', 'For you (fallback): skip the chicken; have extra dal or an egg.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): skip the chicken; have extra dal.',
  null
),
(
  'M177', 'Chicken Vegetable Dal', 'MF022', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Chicken-vegetablecurry,dal,rice,ghee', 'Meat+Pulse+Grain+Vegetable',
  'Ensure chicken is fully cooked; Mince or shred for children under 2 years; Ensure vegetables are well cooked', '12–24 months: minced chicken and soft dal and soft rice and mashed vegetables; 2 years and older: shredded chicken', 'Reduce added salt and spice for children under 2 years; Ensure chicken is fully cooked',
  30, 35, 65, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you (fallback): skip the chicken; have extra dal, or add paneer.', 'For you (fallback): skip the chicken; have extra dal or an egg.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): skip the chicken; have extra dal.',
  null
),
(
  'M178', 'Fish Curry Dal', 'MF023', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Fishcurry,dal,rice,mustardoil', 'Fish+Pulse+Grain',
  'Remove all bones; Ensure fish is fully cooked; Ensure dal is well cooked', '12–24 months: deboned minced fish and soft dal and soft rice; 2 years and older: deboned pieces', 'Remove all bones before serving; Reduce added salt and spice for children under 2 years',
  25, 30, 55, true, 'Child + family',
  '{"Fish","Mustard (oil)"}', 'Main meal', null,
  'Good for omega-3 + protein', 'For you (fallback): skip the fish; have extra dal, or add paneer.', 'For you (fallback): skip the fish; have extra dal or an egg.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): skip the fish; have extra dal.',
  null
),
(
  'M179', 'Mutton Curry Dal', 'MF024', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Muttoncurry,dal,rice,ghee', 'Meat+Pulse+Grain',
  'Ensure mutton is very well cooked; Ensure the meat is tender; Mince for children under 2 years; Ensure dal is well cooked', '12–24 months: minced mutton and soft dal and soft rice; 2 years and older: shredded mutton', 'Reduce added salt and spice for children under 2 years; Ensure mutton is very well cooked',
  30, 50, 80, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + iron', 'For you (fallback): skip the mutton; have extra dal, or add paneer.', 'For you (fallback): skip the mutton; have extra dal or an egg.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): skip the mutton; have extra dal.',
  null
),
(
  'M182', 'Baingan Bharta Rice', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Bainganbharta,rice,ghee', 'Vegetable+Grain',
  'Ensure baingan is well cooked; Keep rice soft', '12–24 months: mashed baingan and soft rice; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure rice is soft',
  15, 25, 40, true, 'Child + family',
  '{"Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M183', 'Baingan Bharta Roti', 'MF025', '{"12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  true, false, false, false, 'Bainganbharta,wheatroti,ghee', 'Vegetable+Grain',
  'Ensure baingan is well cooked; Keep roti soft', '12–24 months: mashed baingan and soft roti pieces; 2 years and older: usual family texture', 'Reduce added salt and spice for children under 2 years; Ensure roti is soft',
  15, 25, 40, true, 'Child + family',
  '{"Wheat (gluten)","Milk"}', 'Main meal', null,
  'Good for protein + calcium', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'For you: Add a bowl of curd.', 'Make yours with oil instead of ghee. For you: Add a katori of dal.',
  null
),
(
  'M186', 'Dal Soup', 'MF026', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","lunch","morning_snack"}',
  true, true, false, false, 'Dalsoup(moong/masoor),water,salt(none<12m,minimal12-24m),turmeric', 'Pulse',
  'Cool soup to a safe serving temperature; Ensure dal is well cooked', '6–8 months: thick purée (serve as a mash, not a drink); 8–12 months: pureed soup; 12–24 months: strained with small pieces; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months',
  10, 25, 35, true, 'Child + family',
  '{"None"}', 'Starter', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  '—', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.',
  null
),
(
  'M187', 'Pumpkin Soup', 'MF026', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","lunch","morning_snack"}',
  true, true, false, false, 'Pumpkin,water,salt(none<12m,minimal12-24m)', 'Vegetable',
  'Cool soup to a safe serving temperature; Pumpkin well cooked', '6–8 months: thick purée (serve as a mash, not a drink); 8–12 months: pureed soup; 12–24 months: strained; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months',
  10, 20, 30, true, 'Child + family',
  '{"None"}', 'Starter', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  '—', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.',
  null
),
(
  'M188', 'Beetroot Soup', 'MF026', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","lunch","morning_snack"}',
  true, true, false, false, 'Beetroot,water,salt(none<12m,minimal12-24m)', 'Vegetable',
  'Cool soup to a safe serving temperature; Beetroot well cooked', '8–12 months: pureed soup; 12–24 months: strained; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months',
  10, 25, 35, true, 'Child + family',
  '{"None"}', 'Starter', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  '—', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.',
  null
),
(
  'M189', 'Corn Soup', 'MF026', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","lunch","morning_snack"}',
  true, true, false, false, 'Cornkernels,water,salt(none<12m,minimal12-24m)', 'Vegetable',
  'Cool soup to a safe serving temperature; Cook corn well and strain if needed', '8–12 months: pureed and strained soup; 12–24 months: strained; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt from 12–24 months; Strain corn kernels',
  10, 20, 30, true, 'Child + family',
  '{"None"}', 'Starter', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  '—', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.', 'For you: have it with roti or rice and dal.',
  null
),
(
  'M190', 'Fruit Bowl Banana', 'MF027', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, true, false, false, 'Banana', 'Fruit',
  'Mash for children under 12 months; Cut into small pieces', '6–8 months: smooth mash; 8–12 months: mashed; 12–24 months: small pieces; 2 years and older: slices', 'Mash for children under 12 months; No added salt for children under 12 months',
  2, 0, 2, false, 'Child',
  '{"None"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Add a handful of nuts.',
  null
),
(
  'M191', 'Fruit Bowl Papaya', 'MF027', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, true, false, false, 'Papaya', 'Fruit',
  'Mash for children under 12 months; Cut into small pieces', '6–8 months: smooth mash; 8–12 months: mashed; 12–24 months: small pieces; 2 years and older: slices', 'Mash for children under 12 months; No added salt for children under 12 months',
  5, 0, 5, false, 'Child',
  '{"None"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Add a handful of nuts.',
  null
),
(
  'M192', 'Fruit Bowl Mango', 'MF027', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, true, false, false, 'Mango', 'Fruit',
  'Mash for children under 12 months; Cut into small pieces', '8–12 months: mashed; 12–24 months: small pieces; 2 years and older: slices', 'Mash for children under 12 months; No added salt for children under 12 months',
  5, 0, 5, false, 'Child',
  '{"None"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Add a handful of nuts.',
  null
),
(
  'M193', 'Fruit Bowl Apple', 'MF027', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, true, false, false, 'Apple(cooked)', 'Fruit',
  'Cook until soft; Mash for children under 12 months', '6–8 months: smooth cooked apple purée; 8–12 months: apple purée; 12–24 months: small cooked pieces; 2 years and older: thin slices', 'Cook and mash for children under 12 months; No added salt for children under 12 months',
  10, 10, 20, false, 'Child',
  '{"None"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Add a handful of nuts.',
  null
),
(
  'M194', 'Fruit Bowl Mixed', 'MF027', '{"8-12m","12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, true, false, false, 'Mixedfruits(banana,papaya,mango,apple)', 'Fruit',
  'Mash for children under 12 months; Cut into small pieces', '8–12 months: mashed; 12–24 months: small pieces; 2 years and older: slices', 'Mash for children under 12 months; cook apple; No added salt for children under 12 months',
  10, 0, 10, false, 'Child',
  '{"None"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Add a handful of nuts.',
  null
),
(
  'M195', 'Roasted Chana', 'MF028', '{"2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, true, false, false, 'Roastedchana(chickpeas);2-4y:groundtopowder(sattu)orboiledandmashed', 'Pulse',
  'No whole roasted chana before 4 years; Serve as powder or soft-mashed for 2–4 years; Child seated and supervised', '2–4 years: ground to powder (sattu) mixed into food, or chana boiled soft and mashed — no whole roasted chana; 4 years and older: whole roasted chana, seated and supervised', 'Roast until crisp but not hard; For 2–4 years serve only as powder or soft-mashed; Serve whole only from 4 years, seated and supervised',
  0, 15, 15, false, 'Child',
  '{"None"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Have a fruit after — guava, orange or papaya.',
  null
),
(
  'M196', 'Peanut Butter Toast', 'MF028', '{"2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Peanutbutter(smooth),bread/toast', 'Nut+Grain',
  'Use smooth peanut butter; Spread thinly', '2 years and older: usual family texture(thin spread)', 'Use smooth peanut butter; Spread thinly; Avoid if allergic',
  5, 5, 10, false, 'Child',
  '{"Peanut","Wheat (gluten)"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Sprinkle roasted til (sesame).',
  null
),
(
  'M197', 'Almond Butter Toast', 'MF028', '{"2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Almondbutter(smooth),bread/toast', 'Nut+Grain',
  'Use smooth almond butter; Spread thinly', '2 years and older: usual family texture(thin spread)', 'Use smooth almond butter; Spread thinly; Avoid if allergic',
  5, 5, 10, false, 'Child',
  '{"TreeNut","Wheat (gluten)"}', 'Snack', null,
  'Good for protein + calcium', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you: Sprinkle roasted til (sesame).',
  null
),
(
  'M199', 'Fruit Smoothie', 'MF030', '{"12-24m","2-4y","4-7y"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Fruitsmoothie(banana,mango,milk/curd)', 'Fruit+Dairy',
  'Use soft fruit; Blended well', '12–24 months: small amounts; 2 years and older: usual family texture', 'Blend well; Ensure fruit is soft',
  5, 0, 5, false, 'Child',
  '{"Milk"}', 'Snack', null,
  'Good for protein + calcium', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you: nothing to add — it''s already a strong plate.', 'For you (fallback): have roasted chana + fruit instead.',
  null
),
(
  'M204', 'Chicken Rice Mash', 'MF026', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Chickenmince,rice,carrot,ghee,salt(none<12m,minimal12-24m)', 'Grain+Meat+Vegetable+Fat',
  'Cook chicken until fully done; Mince or blend finely for children under 12 months; No bones or skin', '6–8 months: finely blended thick mash; 8–12 months: soft mash with small lumps; 12–24 months: soft small pieces; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt and mild spice from 12–24 months; Ensure chicken is fully cooked',
  15, 20, 35, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you (fallback): swap the chicken for dal or paneer.', 'For you (fallback): swap the chicken for eggs or dal.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): swap the chicken for dal or chana.',
  null
),
(
  'M205', 'Fish Khichdi', 'MF010', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Rice,moongdal,deboned-fish(rohu/sardine/Indianmackerel-bangda),turmeric,ghee,salt(none<12m,minimal12-24m)', 'Grain+Pulse+Fish+Fat',
  'Remove all bones, including small bones; Flake fish with your fingers to check for bones before mashing; Ensure fish is fully cooked', '6–8 months: thick smooth mash; 8–12 months: soft mash; 12 months and older: usual family texture', 'Allergen first steps: offer only after a few low-allergy first foods have gone well; introduce one new allergenic food at a time and watch for rash, vomiting or diarrhoea; get urgent help for swelling or breathing difficulty. If your baby has severe, persistent eczema or has had an immediate allergic reaction to any food (especially egg), talk to your paediatrician before offering this food. Once it is tolerated, keep offering it regularly; No added salt for children under 12 months; minimal salt from 12–24 months; Prefer sardine or Indian mackerel (bangda) for omega-3',
  15, 25, 40, true, 'Child + family',
  '{"Fish","Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for omega-3 + protein', 'For you (fallback): skip the fish; have extra dal, or add paneer.', 'For you (fallback): skip the fish; have extra dal or an egg.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): skip the fish; have extra dal.',
  null
),
(
  'M206', 'Mutton Keema Rice Mash', 'MF026', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, false, true, 'Muttonkeema(lean,minced),rice,tomato,ghee,turmeric,salt(none<12m,minimal12-24m)', 'Grain+Meat+Vegetable+Fat',
  'Cook keema until very soft; Blend for children under 12 months; No gristle or bone pieces', '6–8 months: finely blended thick mash; 8–12 months: soft mash; 12–24 months: soft keema with rice; 2 years and older: usual family texture', 'No added salt for children under 12 months; minimal salt and mild spice from 12–24 months; Use lean keema; Pressure-cook until very soft',
  15, 30, 45, true, 'Child + family',
  '{"Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Good for protein + iron', 'For you (fallback): swap the mutton for dal or paneer.', 'For you (fallback): swap the mutton for eggs or dal.', 'For you: Add a bowl of curd.', 'For you (fallback): swap the mutton for dal or chana.',
  null
),
(
  'M207', 'Dal Egg Mash', 'MF009', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"dinner","lunch"}',
  false, false, true, false, 'Moongdal,hard-boiledegg(mashed),ghee,turmeric,salt(none<12m,minimal12-24m)', 'Pulse+Egg+Fat',
  'Use fully hard-boiled egg; Mash egg smooth into dal for children under 12 months', '6–8 months: smooth thick mash; 8–12 months: soft mash; 12 months and older: usual family texture, can serve with rice or roti', 'Allergen first steps: offer only after a few low-allergy first foods have gone well; introduce one new allergenic food at a time and watch for rash, vomiting or diarrhoea; get urgent help for swelling or breathing difficulty. If your baby has severe, persistent eczema or has had an immediate allergic reaction to any food (especially egg), talk to your paediatrician before offering this food. Once it is tolerated, keep offering it regularly; No added salt for children under 12 months; minimal salt from 12–24 months; Ensure egg is fully cooked',
  10, 20, 30, true, 'Child + family',
  '{"Egg","Milk"}', 'Main meal', 'Take the baby''s portion out before adding salt, then season the rest with iodised salt.',
  'Great source of choline and B12', 'For you (fallback): skip the egg; have extra dal, or add paneer.', 'For you: Add curd + a squeeze of lemon.', 'For you: Add curd + a squeeze of lemon.', 'For you (fallback): skip the egg; have extra dal.',
  null
),
(
  'M208', 'Egg Sweet Potato Mash', 'MF009', '{"6-8m","8-12m","12-24m","2-4y","4-7y"}', '{"breakfast"}',
  false, false, true, false, 'Hard-boiledegg,sweetpotato(boiled),ghee', 'Egg+Vegetable+Fat',
  'Use fully hard-boiled egg; Mash sweet potato and egg smooth for children under 12 months', '6–8 months: smooth mash; 8–12 months: soft mash or soft pieces; 12–24 months: small soft pieces; 2 years and older: usual family texture', 'Allergen first steps: offer only after a few low-allergy first foods have gone well; introduce one new allergenic food at a time and watch for rash, vomiting or diarrhoea; get urgent help for swelling or breathing difficulty. If your baby has severe, persistent eczema or has had an immediate allergic reaction to any food (especially egg), talk to your paediatrician before offering this food. Once it is tolerated, keep offering it regularly; No added salt for children under 12 months; Ensure egg is fully cooked',
  10, 20, 30, false, 'Child',
  '{"Egg","Milk"}', 'Snack', null,
  'Great source of choline and B12', 'For you (fallback): swap the egg for dal or paneer.', 'For you: Have a glass of milk with it.', 'For you: Have a glass of milk with it.', 'For you (fallback): swap the egg for dal or chana.',
  null
),
(
  'M209', 'Gond Dry Fruit Laddoo Light', 'MF_MOTHER', '{"Mother"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Wholewheatflour,gond(ediblegum),almonds,walnuts,sesame(til),dates(paste),ghee(reduced)', 'Grain+Nut+Seed+Fruit+Fat',
  'Contains whole or chopped nuts: keep out of reach of children under 4', 'Mother recipe; not part of the child plan (whole nuts; energy-dense)', 'One laddoo a day alongside meals, not instead of them; Sweetened with dates and uses less ghee than traditional recipes; If you had gestational diabetes, check with your doctor before eating sweets regularly',
  30, 15, 45, true, 'Mother',
  '{"Wheat (gluten)","TreeNut","Sesame","Milk"}', 'Mother recipe', null,
  'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)',
  null
),
(
  'M210', 'Panjiri Light', 'MF_MOTHER', '{"Mother"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Wholewheatflour,makhana,almonds,melonseeds,flaxseeds(alsi),ghee(reduced),jaggery(small)', 'Grain+Nut+Seed+Fat',
  'Contains nuts and seeds: keep out of reach of children under 4', 'Mother recipe; not part of the child plan', '2–3 tablespoons a day with milk or as a snack; Uses less ghee and jaggery than traditional recipes; If you had gestational diabetes, check with your doctor first',
  25, 10, 35, true, 'Mother',
  '{"Wheat (gluten)","TreeNut","Milk"}', 'Mother recipe', null,
  'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)',
  null
),
(
  'M211', 'Aliv Kheer', 'MF_MOTHER', '{"Mother"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Gardencress(aliv/halim)seeds(1-2tsp,soaked),milk,dates(paste),cardamom', 'Seed+Dairy+Fruit',
  'n/a (mother recipe)', 'Mother recipe; not part of the child plan', 'Use 1–2 teaspoons of seeds, soaked; A traditional iron-rich food; Does not replace the iron (IFA) tablet',
  10, 30, 40, true, 'Mother',
  '{"Milk"}', 'Mother recipe', null,
  'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)',
  null
),
(
  'M212', 'Sprouted Moong Chaat', 'MF_MOTHER', '{"Mother"}', '{"afternoon_snack","morning_snack"}',
  true, true, false, false, 'Sproutedmoong(steamed),onion,tomato,cucumber,lemon,roastedjeera', 'Pulse+Vegetable',
  'n/a (mother recipe)', 'Mother recipe; not part of the child plan', 'Steam the sprouts; raw sprouts carry a food-poisoning risk; Squeeze lemon just before eating',
  10, 10, 20, true, 'Mother',
  '{"None"}', 'Mother recipe', null,
  'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)',
  null
),
(
  'M213', 'Ragi Malt Nuts', 'MF_MOTHER', '{"Mother"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, false, false, false, 'Ragiflour,milk,dates(paste),almondpowder,cardamom', 'Grain+Dairy+Nut+Fruit',
  'n/a (mother recipe)', 'Mother recipe; not part of the child plan (the child version is the ragi porridge)', 'A quick one-handed breakfast or snack while feeding the baby; Sweeten with dates, not sugar',
  5, 10, 15, true, 'Mother',
  '{"Milk","TreeNut"}', 'Mother recipe', null,
  'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)',
  null
),
(
  'M214', 'Dahi Fruit Nuts', 'MF_MOTHER', '{"Mother"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Curd,seasonalfruit(banana/papaya),almondsorwalnuts(handful)', 'Dairy+Fruit+Nut',
  'n/a (mother option)', 'Mother quick option; not part of the child plan', 'Keep a tub of curd ready; cut fruit takes 2 minutes',
  5, 0, 5, true, 'Mother',
  '{"Milk","TreeNut"}', 'Mother option', null,
  'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)',
  null
),
(
  'M215', 'Boiled Egg Fruit', 'MF_MOTHER', '{"Mother"}', '{"afternoon_snack","morning_snack"}',
  false, false, true, false, 'Boiledeggs(2),fruit(guava/orange)', 'Egg+Fruit',
  'n/a (mother option)', 'Mother quick option; not part of the child plan', 'Boil a batch of eggs and keep them in the fridge',
  5, 0, 5, true, 'Mother',
  '{"Egg"}', 'Mother option', null,
  'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)',
  null
),
(
  'M216', 'Roasted Chana Chaas', 'MF_MOTHER', '{"Mother"}', '{"afternoon_snack","morning_snack"}',
  true, false, false, false, 'Roastedchana(handful),chaas(buttermilk)', 'Pulse+Dairy',
  'n/a (mother option)', 'Mother quick option; not part of the child plan', 'Shelf-stable: keep a jar of roasted chana within reach',
  5, 0, 5, true, 'Mother',
  '{"Milk"}', 'Mother option', null,
  'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)',
  null
),
(
  'M217', 'Paneer Sandwich', 'MF_MOTHER', '{"Mother"}', '{"afternoon_snack","breakfast","morning_snack"}',
  true, false, false, false, 'Wholewheatbread,paneer,tomato,cucumber', 'Grain+Dairy+Vegetable',
  'n/a (mother option)', 'Mother quick option; not part of the child plan', 'No cooking: crumble paneer and add a pinch of chaat masala',
  5, 0, 5, true, 'Mother',
  '{"Wheat (gluten)","Milk"}', 'Mother option', null,
  'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)',
  null
),
(
  'M218', 'Fruit Peanut Butter', 'MF_MOTHER', '{"Mother"}', '{"afternoon_snack","morning_snack"}',
  true, true, false, false, 'Apple/banana,peanutbutter(1-2tbsp)', 'Fruit+Nut',
  'n/a (mother option)', 'Mother quick option; not part of the child plan', 'One-handed snack while feeding',
  5, 0, 5, true, 'Mother',
  '{"Peanut"}', 'Mother option', null,
  'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)',
  null
),
(
  'M219', 'Chana Chaat', 'MF_MOTHER', '{"Mother"}', '{"afternoon_snack","morning_snack"}',
  true, true, false, false, 'Boiledchana(leftoverorready-to-eat),onion,tomato,lemon,roastedjeera', 'Pulse+Vegetable',
  'n/a (mother option)', 'Mother quick option; not part of the child plan', 'Use leftover boiled chana or a ready-to-eat pack',
  5, 0, 5, true, 'Mother',
  '{"None"}', 'Mother option', null,
  'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)',
  null
),
(
  'M220', 'Leftover Dal Roti', 'MF_MOTHER', '{"Mother"}', '{"dinner","lunch"}',
  true, false, false, false, 'Leftoverdal(reheateduntilsteaming),roti,curd(optional)', 'Grain+Pulse+Dairy',
  'n/a (mother option)', 'Mother quick option; not part of the child plan', 'Reheat dal until steaming hot all the way through; keep leftovers in the fridge',
  5, 0, 5, true, 'Mother',
  '{"Wheat (gluten)","Milk (if used)"}', 'Mother option', null,
  'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)', 'n/a (mother option)',
  null
)
on conflict (id) do update set
  name = excluded.name,
  family_id = excluded.family_id,
  age_stages = excluded.age_stages,
  slots = excluded.slots,
  vegetarian = excluded.vegetarian,
  vegan = excluded.vegan,
  has_egg = excluded.has_egg,
  non_veg = excluded.non_veg,
  ingredients = excluded.ingredients,
  food_groups = excluded.food_groups,
  choking_modifications = excluded.choking_modifications,
  age_guidance = excluded.age_guidance,
  adaptation_guidance = excluded.adaptation_guidance,
  active_minutes = excluded.active_minutes,
  passive_minutes = excluded.passive_minutes,
  total_minutes = excluded.total_minutes,
  family_meal_compatible = excluded.family_meal_compatible,
  audience = excluded.audience,
  allergen_flags = excluded.allergen_flags,
  mother_plate_role = excluded.mother_plate_role,
  mother_cooking_step = excluded.mother_cooking_step,
  mother_boost_good_for = excluded.mother_boost_good_for,
  mother_boost_vegetarian = excluded.mother_boost_vegetarian,
  mother_boost_eggetarian = excluded.mother_boost_eggetarian,
  mother_boost_nonveg = excluded.mother_boost_nonveg,
  mother_boost_vegan = excluded.mother_boost_vegan,
  prep_ahead_note = excluded.prep_ahead_note;

-- Anything previously seeded here that the current workbook no longer has
-- (superseded id) is removed, same pattern as the activity-library refreshes.
delete from family_meals where id not in ('M001','M002','M003','M004','M005','M006','M007','M008','M009','M010','M011','M012','M013','M014','M015','M016','M017','M018','M019','M020','M021','M022','M023','M024','M025','M026','M027','M028','M029','M030','M031','M032','M033','M034','M035','M037','M038','M039','M040','M041','M042','M043','M044','M045','M046','M047','M048','M049','M050','M051','M052','M053','M054','M055','M056','M057','M058','M059','M060','M061','M062','M063','M064','M065','M066','M067','M068','M070','M071','M072','M073','M074','M075','M076','M077','M078','M079','M080','M081','M082','M083','M084','M085','M086','M087','M088','M089','M090','M091','M092','M093','M094','M095','M098','M099','M100','M101','M102','M103','M104','M105','M106','M107','M108','M109','M110','M111','M112','M113','M114','M115','M116','M117','M118','M119','M120','M121','M122','M123','M124','M125','M126','M127','M129','M130','M131','M133','M134','M135','M136','M137','M138','M139','M140','M141','M142','M143','M144','M145','M146','M147','M148','M149','M150','M151','M152','M153','M155','M156','M157','M158','M159','M160','M161','M162','M163','M164','M165','M166','M167','M170','M171','M172','M173','M174','M175','M176','M177','M178','M179','M182','M183','M186','M187','M188','M189','M190','M191','M192','M193','M194','M195','M196','M197','M199','M204','M205','M206','M207','M208','M209','M210','M211','M212','M213','M214','M215','M216','M217','M218','M219','M220');
