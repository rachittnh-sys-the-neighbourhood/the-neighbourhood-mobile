-- Preterm / NICU module for parents of babies born before 37 weeks.
--
-- An overlay on the standard recovery content, not a separate plan: a
-- preterm family's daily plan draws from the usual month's activities PLUS
-- the module activities that apply to where they are now, and a small set
-- of standard cards that do not fit a baby in the NICU are hidden while the
-- baby is there. Source: postpartum_preterm_NICU_module.xlsx (28 mother and
-- 10 father activities, each with a source; the workbook recommends review
-- by an Indian neonatologist, an OBGYN and a lactation consultant).
--
-- Needs the refreshed mother_activities content (20260906090000), because
-- the hide rules below name standard cards by their refreshed titles.
--
-- WHAT DRIVES IT
--   preterm         children.gestational_weeks < 37, on the youngest child
--   in_nicu         children.in_nicu, set by the parent, cleared at discharge
--   hypertension    profiles.had_hypertension, set by the mother
--
-- WHEN A MODULE ACTIVITY SHOWS (show_when)
--   nicu          while the baby is in the NICU, whatever the month
--   home          once the baby is home. Going-home cards (phase 2) show
--                 straight away; later cards wait for their typical month
--   preterm       any time after a preterm birth, from its typical month.
--                 Phase 1 cards also stop after two more months, unless the
--                 baby is still in the NICU
--   hypertension  a preterm birth and the mother reported it
--
-- HIDDEN WHILE IN THE NICU: 'When Your Milk Comes In', 'Skin-to-Skin Time',
-- 'Feeding Positions That Protect Your Scar', 'One Feed, Fully Present' (mother)
-- and 'Skin-to-Skin, Yours Too', 'Bring the Baby to Her' (father).
-- NOT implemented: the workbook's 'Skin-to-Skin Nap' replacement and the
-- 'until baby feeds at the breast' pauses that outlast the NICU, because the
-- app has no signal for 'baby is ready' or 'feeding at the breast'.
--
-- On a module card, alternating days favour module activities over the
-- standard ones, so a family in the NICU sees the module often, not once a
-- pool cycle.

-- 1. Flags ---------------------------------------------------------------
alter table children add column if not exists in_nicu boolean not null default false;
alter table profiles add column if not exists had_hypertension boolean;

alter table mother_activities
  add column if not exists module text check (module in ('preterm')),
  add column if not exists phase smallint,
  add column if not exists show_when text check (show_when in ('nicu', 'home', 'preterm', 'hypertension'));
alter table father_activities
  add column if not exists module text check (module in ('preterm')),
  add column if not exists phase smallint,
  add column if not exists show_when text check (show_when in ('nicu', 'home', 'preterm', 'hypertension'));

create table if not exists preterm_hidden_activities (
  audience text not null check (audience in ('mother', 'father')),
  title text not null,
  primary key (audience, title)
);
alter table preterm_hidden_activities enable row level security;
drop policy if exists "authenticated read preterm_hidden_activities" on preterm_hidden_activities;
create policy "authenticated read preterm_hidden_activities" on preterm_hidden_activities for select using (true);

insert into preterm_hidden_activities (audience, title) values
  ('mother', 'When Your Milk Comes In'),
  ('mother', 'Skin-to-Skin Time'),
  ('mother', 'Feeding Positions That Protect Your Scar'),
  ('mother', 'One Feed, Fully Present'),
  ('father', 'Skin-to-Skin, Yours Too'),
  ('father', 'Bring the Baby to Her')
on conflict do nothing;

-- 2. Module content -------------------------------------------------------
insert into mother_activities (id, category, month_postpartum, applies_to, title, description, duration_minutes, time_of_day, with_baby, effort_level, progression_notes, source, module, phase, show_when) values
  ('pt-start-expressing-within-hours', 'physical_recovery'::mother_activity_category, 1, 'all'::mother_activity_relevance, 'Start Expressing Within Hours', 'If your baby is too small or unwell to feed at the breast, your milk can still reach them. Try to start expressing within one to two hours of birth if you can, or as soon as you are well enough. For the first few days, hand expressing usually works best, collecting drops of colostrum in a small syringe; the nurses can show you how, and after a caesarean they can help you do it in bed. Aim for eight to ten times in 24 hours, including at least once between midnight and 6am, when milk-making hormones are highest. Only drops at first is completely normal. Label each syringe and give it to the NICU team.', 15, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Days 3 to 5: move to a pump if one is available. Keep hand expressing as well if it helps.', 'UNICEF UK Baby Friendly: You and your baby on the neonatal unit; HSE Ireland: Hand expressing breast milk for your premature or ill baby; MoHFW Standard Treatment Guidelines: Optimal feeding of low birth weight infants', 'preterm', 1, 'nicu'),
  ('pt-build-your-supply-over-weeks', 'physical_recovery'::mother_activity_category, 1, 'all'::mother_activity_relevance, 'Build Your Supply Over Weeks', 'Your baby may need only tiny amounts now, but will need much more as they grow, so the aim is to build your supply ahead of their needs. Keep expressing eight to ten times in 24 hours, with gaps of no more than about four hours in the day and six at night. A hospital-grade double pump, if your unit has one, works faster. Expressing beside your baby, or just after kangaroo care, often helps milk flow. Supply commonly dips when your baby has a setback or you are exhausted; that is normal, and keeping going brings it back. Ask the team to check your technique if you are worried.', 10, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'When your baby begins feeding at the breast, keep expressing until feeds are fully established.', 'UNICEF UK Baby Friendly: You and your baby on the neonatal unit; NHS Lothian: Expressing milk for your baby on the neonatal unit; HSE Ireland: Hand expressing breast milk for your premature or ill baby', 'preterm', 1, 'nicu'),
  ('pt-your-milk-is-medicine', 'mother_baby_bonding'::mother_activity_category, 1, 'all'::mother_activity_relevance, 'Your Milk Is Medicine', 'For a preterm baby, your milk does more than feed. It helps protect them from infection and lowers the chance of a serious bowel condition called necrotising enterocolitis. Every drop counts, including the first colostrum. If you cannot make enough, pasteurised donor milk from a hospital milk bank is the next best option. In India, government milk banks provide donor milk free, and it cannot legally be sold. Do not buy ''human milk'' products online, whatever the marketing says; ask your NICU team instead.', 5, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Keep this in mind on hard pumping days: what you provide matters even when the amounts feel small.', 'NHS Lothian: Expressing milk for your baby on the neonatal unit; MoHFW: National Guidelines on Lactation Management Centres (2017)', 'preterm', 1, 'nicu'),
  ('pt-kangaroo-care-as-early-as-possible', 'mother_baby_bonding'::mother_activity_category, 1, 'all'::mother_activity_relevance, 'Kangaroo Care, As Early As Possible', 'Kangaroo mother care means holding your baby, in just a nappy, upright against your bare chest, covered with a cloth. The WHO now recommends starting it immediately after birth for small and preterm babies, rather than after a period in an incubator, because it helps them stay warm, lowers the risk of infection and death, and supports breastfeeding and bonding. Many Indian NICUs and SNCUs have kangaroo care areas. Ask the team when you can begin and how long each session should be, and do it as much as they allow. Your partner and other family members can do it too.', 60, 'anytime'::mother_activity_time_of_day, 'yes'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Continue at home after discharge, for as long as your baby is comfortable in the position.', 'WHO 2022: Immediate kangaroo mother care for small and preterm babies; AIIMS WHO Collaborating Centre: Kangaroo Mother Care protocol (2019); National Health Mission (MoHFW): Kangaroo Mother Care training material; Kangaroo Mother Care in India: policy summary incl. Family Participatory Care in SNCUs; Nangia and Kumar (2023): New WHO recommendations for preterm and low birth weight infants, Indian Pediatrics', 'preterm', 1, 'nicu'),
  ('pt-be-there-even-when-you-cannot-hold-them', 'mother_baby_bonding'::mother_activity_category, 1, 'all'::mother_activity_relevance, 'Be There Even When You Cannot Hold Them', 'Some days your baby may be too unwell to come out of the incubator. You still matter to them. Talk and sing softly near them; your voice is familiar from the womb. Ask the nurses to show you how to touch your baby safely and how to help with care such as nappy changes and temperature checks. Many Indian SNCUs follow a family participatory care model, in which parents are trained to take part in their baby''s daily care. Ask whether yours does.', 15, 'anytime'::mother_activity_time_of_day, 'yes'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'As your baby grows stronger, your role in their care grows too.', 'Kangaroo Mother Care in India: policy summary incl. Family Participatory Care in SNCUs; WHO 2022: Immediate kangaroo mother care for small and preterm babies', 'preterm', 1, 'nicu'),
  ('pt-recovering-while-visiting-the-nicu-c', 'physical_recovery'::mother_activity_category, 1, 'caesarean'::mother_activity_relevance, 'Recovering While Visiting the NICU', 'After a caesarean, daily NICU visits collide with almost everything your recovery needs: no lifting, no driving, short walks, rest. Let someone drive you. Ask for a wheelchair for long hospital corridors in the first days. Keep a pillow with you for coughing and for sitting on hard chairs. Sit down to express. Take your pain relief on schedule and eat proper meals; mothers of NICU babies often skip both. Keep checking your wound every day. Your baby needs you recovered, not depleted.', 5, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Month 2: longer visits become easier. Keep the lifting and driving limits until your six-week check.', 'NICE NG192 Caesarean birth; ERAS Society: Postoperative care in cesarean delivery (Macones et al., 2019)', 'preterm', 1, 'nicu'),
  ('pt-recovering-while-visiting-the-nicu-v', 'physical_recovery'::mother_activity_category, 1, 'vaginal'::mother_activity_relevance, 'Recovering While Visiting the NICU', 'Daily NICU visits are tiring on a body that has just given birth. Sitting for long periods on hospital chairs is hard on stitches, so bring a soft cushion. Keep your rinse bottle routine going even on long hospital days. Eat proper meals and drink plenty of water; mothers of NICU babies often skip both. Rest between visits rather than staying all day on the first days if you are exhausted. Your baby needs you recovered, not depleted.', 5, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Month 2: longer visits become easier as your body recovers.', 'RCOG: Perineal tears and episiotomies in childbirth; NICE NG194 Postnatal care', 'preterm', 1, 'nicu'),
  ('pt-your-own-check-ups-still-matter', 'physical_recovery'::mother_activity_category, 1, 'all'::mother_activity_relevance, 'Your Own Check-Ups Still Matter', 'When your baby is in the NICU, it is very common to miss your own appointments. Please do not. Keep your six-week check, take any medicines you were prescribed, and report warning signs for yourself as well as your baby. If your preterm birth was linked to high blood pressure or pre-eclampsia, your follow-up is especially important; see ''If You Had Pre-eclampsia''.', 5, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Book your six-week check before discharge so it does not get lost.', 'NICE NG194 Postnatal care; ACOG Committee Opinion 736: Optimizing postpartum care', 'preterm', 1, 'preterm'),
  ('pt-if-you-had-pre-eclampsia', 'physical_recovery'::mother_activity_category, 1, 'all'::mother_activity_relevance, 'If You Had Pre-eclampsia', 'Pre-eclampsia is a common reason babies are delivered early, and it does not always settle straight after birth. Your blood pressure will need checking in the days and weeks afterwards, and you may need to continue medicines for a while. Tell your doctor straight away about a severe headache, blurred vision or pain under your ribs. Ask for a review at around six to eight weeks, and know that having had pre-eclampsia raises your long-term risk of high blood pressure and heart disease, so a yearly blood pressure check is worth making a habit.', 5, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Month 2: six-to-eight week review. Then a blood pressure check at least yearly.', 'NICE NG133 Hypertension in pregnancy: follow-up care and postnatal review; NHS Lothian: Hypertension in the postnatal period', 'preterm', 1, 'hypertension'),
  ('pt-grief-for-the-pregnancy-you-did-not-finish', 'emotional_wellness'::mother_activity_category, 1, 'all'::mother_activity_relevance, 'Grief for the Pregnancy You Did Not Finish', 'Many mothers of preterm babies grieve things that did not happen: the last weeks of pregnancy, the baby shower, the birth they planned, holding their baby straight after birth. Many also feel their body failed. These feelings are normal and do not mean you love your baby less. Preterm birth has many possible causes, and blame, whether from yourself or from family, does not reflect how it actually happens. If relatives suggest otherwise, you do not have to argue; ''the doctors say this is not anyone''s fault'' is enough.', 15, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Month 6: the letter about your birth is a good place to return to this.', 'NICE CG192 Antenatal and postnatal mental health; NIMHANS: Perinatal mental health priorities in India (Ganjekar, Chandra et al.)', 'preterm', 1, 'preterm'),
  ('pt-nicu-stress-is-real', 'emotional_wellness'::mother_activity_category, 1, 'all'::mother_activity_relevance, 'NICU Stress Is Real', 'Having a baby in intensive care is one of the most stressful experiences a parent can go through. In research across many countries, around four in ten parents had significant anxiety or trauma symptoms in the first month, and for about a quarter, trauma symptoms were still present more than a year later. Signs include constant fear, not being able to stop thinking about the alarms or the birth, feeling numb, or being unable to sleep even when you could. Tell your doctor or ask the NICU team for support; this is common, recognised and treatable.', 10, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Check again after discharge: symptoms sometimes appear only once you are home.', 'Malouf et al. (2021): Anxiety and post-traumatic stress in parents of babies in neonatal units, eClinicalMedicine; NICE CG192 Antenatal and postnatal mental health; NIMHANS: Perinatal mental health priorities in India (Ganjekar, Chandra et al.)', 'preterm', 1, 'nicu'),
  ('pt-handling-questions-from-family', 'emotional_wellness'::mother_activity_category, 1, 'all'::mother_activity_relevance, 'Handling Questions From Family', 'Relatives will ask why the baby is so small, what went wrong and when they can visit. You decide what to share and when. Many families find it easier to send one update to a family group each evening, sent by your partner, so you are not answering the same questions all day. NICU visiting is usually limited to protect the babies, which also protects you.', 5, 'evening'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'After discharge, keep limiting visitors for a while; see ''Protecting Your Baby From Infection''.', 'WHO 2022: Immediate kangaroo mother care for small and preterm babies; NICE CG192 Antenatal and postnatal mental health', 'preterm', 1, 'nicu'),
  ('pt-two-parents-one-nicu', 'couple_connection'::mother_activity_category, 1, 'all'::mother_activity_relevance, 'Two Parents, One NICU', 'The NICU turns daily life upside down for both of you. Agree a simple split: one of you focuses on expressing and kangaroo care, the other on transport, meals, washing pump parts, bills and family updates. Take turns at the hospital so each of you sleeps some nights. Fathers can do kangaroo care too, and it helps them bond.', 15, 'evening'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Revisit the split before discharge; home with a preterm baby needs a new plan.', 'National Health Mission (MoHFW): Kangaroo Mother Care training material; WHO 2022: Immediate kangaroo mother care for small and preterm babies', 'preterm', 1, 'nicu'),
  ('pt-don-t-miss-the-eye-screening', 'mother_baby_bonding'::mother_activity_category, 1, 'all'::mother_activity_relevance, 'Don''t Miss the Eye Screening', 'Preterm babies can develop retinopathy of prematurity (ROP), an eye condition that can cause blindness if it is not caught in time, and which is very treatable when it is. In India, babies born at 34 weeks or earlier, or weighing 2 kg or less at birth, should have their first eye screening by about day 28 to 30 of life, and earlier for babies born before 28 weeks or under 1.2 kg. This date often falls after discharge, which is exactly when families miss it. Ask for the screening date in writing before you leave hospital, and keep every follow-up eye appointment.', 5, 'anytime'::mother_activity_time_of_day, 'yes'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Keep going to eye checks until the eye specialist says they are no longer needed.', 'Grover et al., PGIMER (2016): ROP programmes in India, Indian Pediatrics; Operational guidelines for retinopathy of prematurity in India (summary)', 'preterm', 1, 'preterm'),
  ('pt-getting-ready-for-discharge', 'mother_baby_bonding'::mother_activity_category, 2, 'all'::mother_activity_relevance, 'Getting Ready for Discharge', 'Before your baby comes home, make sure you are confident about: the feeding plan and how much your baby should take; kangaroo care at home; the warning signs to watch for, such as difficulty breathing, feeling cold, poor feeding, unusual sleepiness or a change in colour; any medicines; and every follow-up appointment, including eye screening, hearing checks and vaccinations. If your unit offers a night or two of rooming-in before discharge, it is worth taking.', 30, 'anytime'::mother_activity_time_of_day, 'yes'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Keep a single written list of all appointments on the fridge and in your phone.', 'WHO 2022: Immediate kangaroo mother care for small and preterm babies; National Health Mission (MoHFW): Kangaroo Mother Care training material', 'preterm', 2, 'nicu'),
  ('pt-kangaroo-care-at-home', 'mother_baby_bonding'::mother_activity_category, 2, 'all'::mother_activity_relevance, 'Kangaroo Care at Home', 'Kangaroo care does not stop at discharge. At home it keeps your baby warm, supports feeding and weight gain, and gives you both calm time together. Parents and grandmothers can take turns. When your baby is not in the kangaroo position, put them down on their back on a firm, flat surface to sleep.', 60, 'anytime'::mother_activity_time_of_day, 'yes'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Continue for as long as your baby is comfortable in the position; your team will advise.', 'AIIMS WHO Collaborating Centre: Kangaroo Mother Care protocol (2019); National Health Mission (MoHFW): Kangaroo Mother Care training material; NICE NG194 Postnatal care', 'preterm', 2, 'home'),
  ('pt-from-tube-or-cup-to-breast', 'mother_baby_bonding'::mother_activity_category, 2, 'all'::mother_activity_relevance, 'From Tube or Cup to Breast', 'Moving to breastfeeding is gradual for most preterm babies. They tire easily and need time to learn to suck, swallow and breathe together. Short practice feeds at the breast after kangaroo care, when your baby is calm and close to the milk, are a good start. Keep expressing until your baby is feeding fully at the breast, and ask for a lactation consultant. Some babies take weeks to get there; that is normal, not a failure.', 20, 'anytime'::mother_activity_time_of_day, 'yes'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Once feeding at the breast is established, the standard feeding rows apply again.', 'Bliss: Breastfeeding your premature baby; UNICEF UK Baby Friendly: You and your baby on the neonatal unit', 'preterm', 2, 'home'),
  ('pt-protecting-your-baby-from-infection', 'mother_baby_bonding'::mother_activity_category, 2, 'all'::mother_activity_relevance, 'Protecting Your Baby From Infection', 'Preterm babies are more vulnerable to infections in the early months. Keep visitors few, ask everyone to wash their hands before touching the baby, and ask anyone with a cough, cold or fever to stay away. Avoid people kissing the baby''s face. This can clash with family customs around welcoming a new baby, and it is worth holding firm; your partner can explain it on your behalf.', 5, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Relax gradually as your baby grows and your paediatrician advises.', 'WHO 2022: Immediate kangaroo mother care for small and preterm babies; Pregnancy, Birth and Baby (Australian Government): Corrected age and vaccinations', 'preterm', 2, 'home'),
  ('pt-keep-every-follow-up-visit', 'mother_baby_bonding'::mother_activity_category, 2, 'all'::mother_activity_relevance, 'Keep Every Follow-Up Visit', 'Preterm babies need more follow-up than babies born at term: growth checks, eye screening, hearing checks, vaccinations and developmental check-ups. Vaccinations are usually given by your baby''s actual birth date, not their corrected age, so do not delay them. If anything about your baby''s development worries you at any point, raise it early; early support works best.', 5, 'anytime'::mother_activity_time_of_day, 'yes'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Month 6 onward: developmental follow-up continues through the first years.', 'Pregnancy, Birth and Baby (Australian Government): Corrected age and vaccinations; WHO 2022: Immediate kangaroo mother care for small and preterm babies; AAP HealthyChildren.org: Corrected age for preemies', 'preterm', 2, 'home'),
  ('pt-two-ages-one-baby', 'mother_baby_bonding'::mother_activity_category, 2, 'all'::mother_activity_relevance, 'Two Ages, One Baby', 'Your baby has two ages. Their actual age counts from their birth date. Their corrected age counts from their due date. For growth and development, use corrected age. For example, a baby born eight weeks early who is four months old has a corrected age of about two months, and should be expected to do what a two-month-old does. For vaccinations, use their actual age. This app will show you both.', 5, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Corrected age is usually used for the first couple of years; your paediatrician will tell you when to stop.', 'AAP HealthyChildren.org: Corrected age for preemies; Pregnancy, Birth and Baby (Australian Government): Corrected age and vaccinations', 'preterm', 3, 'home'),
  ('pt-sharing-the-night', 'couple_connection'::mother_activity_category, 2, 'all'::mother_activity_relevance, 'Sharing the Night', 'Preterm babies often need frequent feeds, and if you are still expressing as well, nights can feel endless. Plan the nights with your partner: one of you can give an expressed-milk feed while the other sleeps a longer stretch. Even one protected stretch of sleep a night makes a real difference.', 10, 'evening'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Revisit as feeds space out.', 'NICE NG194 Postnatal care', 'preterm', 3, 'home'),
  ('pt-when-relatives-compare', 'emotional_wellness'::mother_activity_category, 3, 'all'::mother_activity_relevance, 'When Relatives Compare', 'Someone will compare your baby with a cousin who is already rolling or sitting. Answer with corrected age: ''She was born two months early, so she is doing exactly what a two-month-old does.'' Preterm babies follow their own timeline, and most catch up in their own time.', 5, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Raise any real concern with your paediatrician rather than relying on comparisons.', 'AAP HealthyChildren.org: Corrected age for preemies', 'preterm', 3, 'home'),
  ('pt-when-the-stress-shows-up-later', 'emotional_wellness'::mother_activity_category, 3, 'all'::mother_activity_relevance, 'When the Stress Shows Up Later', 'For some parents, the fear of the NICU hits hardest after coming home: checking constantly that your baby is breathing, feeling panicky at beeping sounds, or reliving scary moments. Trauma symptoms can appear weeks or months after discharge. If this sounds familiar, tell your doctor; it is common after a NICU stay and it responds well to help.', 10, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Check in with yourself again at month 6.', 'Malouf et al. (2021): Anxiety and post-traumatic stress in parents of babies in neonatal units, eClinicalMedicine; NICE CG192 Antenatal and postnatal mental health', 'preterm', 3, 'home'),
  ('pt-catching-up-on-your-own-recovery', 'physical_recovery'::mother_activity_category, 3, 'all'::mother_activity_relevance, 'Catching Up on Your Own Recovery', 'While your baby was in the NICU, your own recovery probably came last. Now is the time to pick it back up: pelvic floor exercises, gentle walking, proper meals and sleep where you can get it. The exercise timeline in your recovery plan may feel behind; start where you are, not where the month says, and build gradually.', 10, 'morning'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Follow the standard progression from the step you have reached.', 'ACOG Committee Opinion 804: Physical activity and exercise in pregnancy and postpartum; POGP pelvic health resources (Hindi)', 'preterm', 3, 'home'),
  ('pt-planning-around-work', 'couple_connection'::mother_activity_category, 4, 'all'::mother_activity_relevance, 'Planning Around Work', 'If your leave is counted from the birth date, it may end while your baby is still developmentally very young and needs frequent appointments. Talk to your employer early about options, and plan who will attend follow-up visits once you are back at work.', 20, 'evening'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Revisit before your return date.', 'ACOG Committee Opinion 736: Optimizing postpartum care', 'preterm', 3, 'home'),
  ('pt-before-any-next-pregnancy', 'physical_recovery'::mother_activity_category, 6, 'all'::mother_activity_relevance, 'Before Any Next Pregnancy', 'Having had one preterm birth raises the chance of another, so tell your doctor early in any future pregnancy. Depending on what caused it, you may be offered a scan of your cervix between about 16 and 24 weeks, and treatments that can lower the chance of another early birth. If your birth was caused by pre-eclampsia, ask about steps to lower that risk too. Give your body time: the WHO recommends waiting at least two years after a birth before the next pregnancy.', 10, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Book a pre-pregnancy conversation with your doctor before trying again.', 'NICE QS135: Preventing preterm birth after a previous preterm birth; WHO technical consultation on birth spacing; NICE NG133 Hypertension in pregnancy: follow-up care and postnatal review', 'preterm', 4, 'preterm'),
  ('pt-if-your-baby-was-born-early-by-caesarean', 'physical_recovery'::mother_activity_category, 6, 'caesarean'::mother_activity_relevance, 'If Your Baby Was Born Early by Caesarean', 'Very early caesareans sometimes need a different type of cut in the uterus from the usual low one. That changes the advice for future pregnancies, including whether a vaginal birth could be possible. Ask for your operation notes and check which type of cut you had.', 5, 'anytime'::mother_activity_time_of_day, 'no'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Keep the notes with your records for any future pregnancy.', 'RCOG Green-top 45: Birth after previous caesarean birth', 'preterm', 4, 'preterm'),
  ('pt-two-birthdays', 'emotional_wellness'::mother_activity_category, 12, 'all'::mother_activity_relevance, 'Two Birthdays', 'Many families of preterm babies mark two dates: the day their baby was born and the day they were due. The first year often looks different from what you imagined. Look back at how far your baby, and you, have come.', 15, 'anytime'::mother_activity_time_of_day, 'yes'::mother_activity_with_baby, 'gentle'::mother_activity_effort, 'Keep noting progress by corrected age through the second year.', 'AAP HealthyChildren.org: Corrected age for preemies', 'preterm', 4, 'preterm')
on conflict (id) do update set
  category = excluded.category, month_postpartum = excluded.month_postpartum, applies_to = excluded.applies_to,
  title = excluded.title, description = excluded.description, duration_minutes = excluded.duration_minutes,
  time_of_day = excluded.time_of_day, with_baby = excluded.with_baby, effort_level = excluded.effort_level,
  progression_notes = excluded.progression_notes, source = excluded.source,
  module = excluded.module, phase = excluded.phase, show_when = excluded.show_when;

insert into father_activities (id, category, month_postpartum, applies_to, title, description, duration_minutes, duration_label, time_of_day, with_baby, effort_level, next_step, source, module, phase, show_when) values
  ('pt-kangaroo-care-is-for-fathers-too', 'bonding_with_baby'::father_activity_category, 1, 'all'::father_activity_relevance, 'Kangaroo Care Is for Fathers Too', 'Kangaroo care, holding your baby skin-to-skin on your bare chest, is not only for mothers. Other caregivers, including fathers, can do it, and it gives your baby warmth and gives you time together that no one else can. Ask the NICU team when you can start, and take turns with her so she can rest.', 60, '60 min', 'anytime'::father_activity_time_of_day, 'yes'::father_activity_with_baby, 'gentle'::father_activity_effort, 'Continue at home after discharge.', 'National Health Mission (MoHFW): Kangaroo Mother Care training material; WHO 2022: Immediate kangaroo mother care for small and preterm babies; AIIMS WHO Collaborating Centre: Kangaroo Mother Care protocol (2019)', 'preterm', 1, 'nicu'),
  ('pt-run-the-nicu-logistics', 'practical_load'::father_activity_category, 1, 'all'::father_activity_relevance, 'Run the NICU Logistics', 'Take the practical load completely: driving her to and from the hospital, packing a bag with snacks, water, a cushion and a phone charger, washing and sterilising pump parts, labelling and carrying expressed milk, and dealing with bills and paperwork. After a caesarean she should not be driving or lifting at all.', null, 'Ongoing', 'anytime'::father_activity_time_of_day, 'no'::father_activity_with_baby, 'moderate'::father_activity_effort, 'Before discharge, hand over only what she wants back.', 'NICE NG192 Caesarean birth; UNICEF UK Baby Friendly: You and your baby on the neonatal unit', 'preterm', 1, 'nicu'),
  ('pt-protect-her-expressing', 'supporting_her_recovery'::father_activity_category, 1, 'all'::father_activity_relevance, 'Protect Her Expressing', 'She will be expressing eight to ten times a day, including at night. Set up the night session with her: bring water and a snack, wash the parts afterwards, and let her go straight back to sleep. Never comment on how much milk she made; small amounts are normal early on, and pressure makes it harder.', null, 'Ongoing', 'night'::father_activity_time_of_day, 'no'::father_activity_with_baby, 'gentle'::father_activity_effort, 'Once the baby feeds at the breast, the standard night-shift rows apply again.', 'UNICEF UK Baby Friendly: You and your baby on the neonatal unit; HSE Ireland: Hand expressing breast milk for your premature or ill baby', 'preterm', 1, 'nicu'),
  ('pt-one-update-for-the-family', 'couple_relationship'::father_activity_category, 1, 'all'::father_activity_relevance, 'One Update for the Family', 'Take over family updates. One short message to a family group each evening saves her from answering the same questions all day. Handle the questions about why the baby came early, and shut down any suggestion that it was her fault.', 10, '10 min', 'evening'::father_activity_time_of_day, 'no'::father_activity_with_baby, 'gentle'::father_activity_effort, 'Keep doing it after discharge until she wants to take it back.', 'WHO 2022: Immediate kangaroo mother care for small and preterm babies; NICE CG192 Antenatal and postnatal mental health', 'preterm', 1, 'nicu'),
  ('pt-be-there-for-the-big-conversations', 'becoming_a_father'::father_activity_category, 1, 'all'::father_activity_relevance, 'Be There for the Big Conversations', 'Doctors'' rounds, consent discussions and updates about your baby''s progress are hard to take in when you are frightened. Be there when you can, write things down, ask what the next steps are, and ask the same question twice if you did not understand. Share the notes with her so neither of you carries it alone.', 30, '30 min', 'anytime'::father_activity_time_of_day, 'no'::father_activity_with_baby, 'gentle'::father_activity_effort, 'Keep one shared note of what the doctors have said, with dates.', 'Kangaroo Mother Care in India: policy summary incl. Family Participatory Care in SNCUs; WHO 2022: Immediate kangaroo mother care for small and preterm babies', 'preterm', 1, 'nicu'),
  ('pt-your-own-stress-counts', 'your_own_wellbeing'::father_activity_category, 1, 'all'::father_activity_relevance, 'Your Own Stress Counts', 'Fathers of NICU babies are affected too. Studies of NICU parents find post-traumatic stress in fathers as well as mothers, sometimes at similar levels. It is easy to ignore when you feel you have to stay strong for her. Constant worry, anger, numbness, avoiding the hospital or reliving frightening moments are signs worth taking seriously. Talk to someone, and tell a doctor if it persists.', 10, '10 min', 'anytime'::father_activity_time_of_day, 'no'::father_activity_with_baby, 'gentle'::father_activity_effort, 'Check again after discharge; symptoms can appear later.', 'Systematic review (2022): PTSD in mothers and fathers after NICU admission; Malouf et al. (2021): Anxiety and post-traumatic stress in parents of babies in neonatal units, eClinicalMedicine', 'preterm', 1, 'nicu'),
  ('pt-own-the-follow-up-calendar', 'practical_load'::father_activity_category, 2, 'all'::father_activity_relevance, 'Own the Follow-Up Calendar', 'Preterm babies have many appointments after discharge: eye screening for retinopathy of prematurity, hearing checks, growth checks, vaccinations and development follow-ups. The eye screening in particular often falls after discharge and is easy to miss, with serious consequences. Get every date in writing before you leave hospital and put them all in one calendar that you own.', 15, '15 min', 'anytime'::father_activity_time_of_day, 'no'::father_activity_with_baby, 'gentle'::father_activity_effort, 'Review the calendar every week for the first year.', 'Grover et al., PGIMER (2016): ROP programmes in India, Indian Pediatrics; Operational guidelines for retinopathy of prematurity in India (summary); Pregnancy, Birth and Baby (Australian Government): Corrected age and vaccinations', 'preterm', 2, 'preterm'),
  ('pt-get-the-home-ready', 'practical_load'::father_activity_category, 2, 'all'::father_activity_relevance, 'Get the Home Ready', 'Before discharge, prepare for a baby who is more vulnerable to infection: a hand-washing point at the door, a clear rule on visitors, and a plan for turning away anyone who is unwell. You are the one who can hold this line with relatives without it costing her.', 30, '30 min', 'anytime'::father_activity_time_of_day, 'no'::father_activity_with_baby, 'moderate'::father_activity_effort, 'Relax the rules gradually as the paediatrician advises.', 'WHO 2022: Immediate kangaroo mother care for small and preterm babies; NICE NG194 Postnatal care', 'preterm', 2, 'nicu'),
  ('pt-explain-corrected-age-to-the-family', 'becoming_a_father'::father_activity_category, 3, 'all'::father_activity_relevance, 'Explain Corrected Age to the Family', 'Relatives will compare your baby with others born around the same date. Learn corrected age, the age counted from the due date, and explain it: a baby born two months early is expected to do what a baby two months younger does. Say it before the comparisons start.', 5, '5 min', 'anytime'::father_activity_time_of_day, 'no'::father_activity_with_baby, 'gentle'::father_activity_effort, 'Keep using corrected age for development through the first couple of years.', 'AAP HealthyChildren.org: Corrected age for preemies', 'preterm', 3, 'home'),
  ('pt-watch-her-again-after-discharge', 'supporting_her_recovery'::father_activity_category, 3, 'all'::father_activity_relevance, 'Watch Her Again After Discharge', 'Coming home can be when the stress of the NICU hits hardest, for her and for you: constant checking on the baby''s breathing, panic at sounds that resemble alarms, reliving frightening moments. Ask her how she is doing weeks after discharge, not just while the baby is in hospital.', 10, '10 min', 'evening'::father_activity_time_of_day, 'no'::father_activity_with_baby, 'gentle'::father_activity_effort, 'Ask again at month 6.', 'Malouf et al. (2021): Anxiety and post-traumatic stress in parents of babies in neonatal units, eClinicalMedicine; NICE CG192 Antenatal and postnatal mental health', 'preterm', 3, 'home')
on conflict (id) do update set
  category = excluded.category, month_postpartum = excluded.month_postpartum, applies_to = excluded.applies_to,
  title = excluded.title, description = excluded.description, duration_minutes = excluded.duration_minutes,
  duration_label = excluded.duration_label, time_of_day = excluded.time_of_day, with_baby = excluded.with_baby,
  effort_level = excluded.effort_level, next_step = excluded.next_step, source = excluded.source,
  module = excluded.module, phase = excluded.phase, show_when = excluded.show_when;

-- 3. Pools ----------------------------------------------------------------
-- The standard pool for a month, plus module activities that apply now.
-- Module activities take the even positions and standard ones the odd
-- positions, so they alternate until the module ones run out.
create or replace function public.mother_activity_pool(
  p_month int, p_category mother_activity_category, p_delivery mother_activity_relevance,
  p_preterm boolean, p_in_nicu boolean, p_hypertension boolean
)
returns table(id text, ord bigint)
language sql
stable
as $$
  with elig as (
    select a.id, (a.module is not null) as is_mod,
           row_number() over (partition by (a.module is not null) order by a.id) as rk
    from mother_activities a
    where a.category = p_category
      and (a.applies_to = 'all' or a.applies_to = p_delivery)
      and (
        (a.module is null
          and a.month_postpartum = p_month
          and not (p_in_nicu and exists (
            select 1 from preterm_hidden_activities h where h.audience = 'mother' and h.title = a.title)))
        or (a.module = 'preterm' and p_preterm and coalesce(
          case a.show_when
            when 'nicu' then p_in_nicu
            when 'home' then not p_in_nicu and (a.phase <= 2 or p_month >= a.month_postpartum)
            when 'preterm' then p_month >= a.month_postpartum
                                and (p_in_nicu or a.phase > 1 or p_month <= a.month_postpartum + 2)
            when 'hypertension' then p_hypertension
          end, false))
      )
  )
  select id, row_number() over (order by case when is_mod then 2 * rk else 2 * rk + 1 end) as ord from elig
$$;

create or replace function public.father_activity_pool(
  p_month int, p_category father_activity_category, p_delivery father_activity_relevance,
  p_preterm boolean, p_in_nicu boolean
)
returns table(id text, ord bigint)
language sql
stable
as $$
  with elig as (
    select a.id, (a.module is not null) as is_mod,
           row_number() over (partition by (a.module is not null) order by a.id) as rk
    from father_activities a
    where a.category = p_category
      and (a.applies_to = 'all' or a.applies_to = p_delivery)
      and (
        (a.module is null
          and a.month_postpartum = p_month
          and not (p_in_nicu and exists (
            select 1 from preterm_hidden_activities h where h.audience = 'father' and h.title = a.title)))
        or (a.module = 'preterm' and p_preterm and coalesce(
          case a.show_when
            when 'nicu' then p_in_nicu
            when 'home' then not p_in_nicu and (a.phase <= 2 or p_month >= a.month_postpartum)
            when 'preterm' then p_month >= a.month_postpartum
                                and (p_in_nicu or a.phase > 1 or p_month <= a.month_postpartum + 2)
          end, false))
      )
  )
  select id, row_number() over (order by case when is_mod then 2 * rk else 2 * rk + 1 end) as ord from elig
$$;

-- 4. Plan generation and swap, now aware of the flags ----------------------
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
  v_weeks int; v_nicu boolean; v_preterm boolean; v_in_nicu boolean; v_hyper boolean;
begin
  if p_profile_id <> auth.uid() then raise exception 'not your profile'; end if;
  select birth_method, coalesce(had_hypertension, false) into v_birth_method, v_hyper from profiles where id = p_profile_id;
  v_delivery := case when v_birth_method in ('vaginal', 'caesarean') then v_birth_method::mother_activity_relevance else null end;
  select date_of_birth, gestational_weeks, in_nicu into v_dob, v_weeks, v_nicu
    from children where parent_id = p_profile_id order by date_of_birth desc limit 1;
  if v_dob is null then raise exception 'no child found'; end if;
  v_preterm := coalesce(v_weeks < 37, false);
  v_in_nicu := v_preterm and coalesce(v_nicu, false);
  v_date := mother_plan_date_for(p_profile_id);
  v_month := mother_month_for(v_dob, v_date);
  select * into v_plan from mother_daily_plans where profile_id = p_profile_id and plan_date = v_date;
  if found then return v_plan; end if;
  v_day := (v_date - date '1970-01-01');
  select array[
    (select p.id from mother_activity_pool(v_month, 'physical_recovery', v_delivery, v_preterm, v_in_nicu, v_hyper) p
      order by p.ord offset (v_day % greatest((select count(*) from mother_activity_pool(v_month, 'physical_recovery', v_delivery, v_preterm, v_in_nicu, v_hyper)), 1)) limit 1),
    (select p.id from mother_activity_pool(v_month, 'emotional_wellness', v_delivery, v_preterm, v_in_nicu, v_hyper) p
      order by p.ord offset (v_day % greatest((select count(*) from mother_activity_pool(v_month, 'emotional_wellness', v_delivery, v_preterm, v_in_nicu, v_hyper)), 1)) limit 1),
    (select p.id from mother_activity_pool(v_month, 'mother_baby_bonding', v_delivery, v_preterm, v_in_nicu, v_hyper) p
      order by p.ord offset (v_day % greatest((select count(*) from mother_activity_pool(v_month, 'mother_baby_bonding', v_delivery, v_preterm, v_in_nicu, v_hyper)), 1)) limit 1),
    (select p.id from mother_activity_pool(v_month, 'couple_connection', v_delivery, v_preterm, v_in_nicu, v_hyper) p
      order by p.ord offset (v_day % greatest((select count(*) from mother_activity_pool(v_month, 'couple_connection', v_delivery, v_preterm, v_in_nicu, v_hyper)), 1)) limit 1)
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

create or replace function public.swap_mother_plan_category(p_profile_id uuid, p_category mother_activity_category)
returns mother_daily_plans
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_plan mother_daily_plans; v_dob date; v_birth_method text;
  v_delivery mother_activity_relevance; v_month int; v_count int; v_next int; v_id text; v_day int;
  v_weeks int; v_nicu boolean; v_preterm boolean; v_in_nicu boolean; v_hyper boolean;
begin
  v_plan := get_or_create_mother_daily_plan(p_profile_id); -- also does the ownership check
  select birth_method, coalesce(had_hypertension, false) into v_birth_method, v_hyper from profiles where id = p_profile_id;
  v_delivery := case when v_birth_method in ('vaginal', 'caesarean') then v_birth_method::mother_activity_relevance else null end;
  select date_of_birth, gestational_weeks, in_nicu into v_dob, v_weeks, v_nicu
    from children where parent_id = p_profile_id order by date_of_birth desc limit 1;
  v_preterm := coalesce(v_weeks < 37, false);
  v_in_nicu := v_preterm and coalesce(v_nicu, false);
  v_month := mother_month_for(v_dob, v_plan.plan_date);
  v_day := (v_plan.plan_date - date '1970-01-01');
  select count(*) into v_count from mother_activity_pool(v_month, p_category, v_delivery, v_preterm, v_in_nicu, v_hyper);
  if v_count <= 1 then return v_plan; end if;
  v_next := coalesce((v_plan.swaps ->> p_category::text)::int, 0) + 1;
  select p.id into v_id from mother_activity_pool(v_month, p_category, v_delivery, v_preterm, v_in_nicu, v_hyper) p
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
  v_weeks int; v_nicu boolean; v_preterm boolean; v_in_nicu boolean;
begin
  if p_profile_id <> auth.uid() then raise exception 'not your profile'; end if;
  select birth_method into v_birth_method from profiles where id = p_profile_id;
  v_delivery := case when v_birth_method in ('vaginal', 'caesarean') then v_birth_method::father_activity_relevance else null end;
  select date_of_birth, gestational_weeks, in_nicu into v_dob, v_weeks, v_nicu
    from children where parent_id = p_profile_id order by date_of_birth desc limit 1;
  if v_dob is null then raise exception 'no child found'; end if;
  v_preterm := coalesce(v_weeks < 37, false);
  v_in_nicu := v_preterm and coalesce(v_nicu, false);
  v_date := mother_plan_date_for(p_profile_id);
  v_month := mother_month_for(v_dob, v_date);
  select * into v_plan from father_daily_plans where profile_id = p_profile_id and plan_date = v_date;
  if found then return v_plan; end if;
  v_day := (v_date - date '1970-01-01');
  select array[
    (select p.id from father_activity_pool(v_month, 'supporting_her_recovery', v_delivery, v_preterm, v_in_nicu) p
      order by p.ord offset (v_day % greatest((select count(*) from father_activity_pool(v_month, 'supporting_her_recovery', v_delivery, v_preterm, v_in_nicu)), 1)) limit 1),
    (select p.id from father_activity_pool(v_month, 'bonding_with_baby', v_delivery, v_preterm, v_in_nicu) p
      order by p.ord offset (v_day % greatest((select count(*) from father_activity_pool(v_month, 'bonding_with_baby', v_delivery, v_preterm, v_in_nicu)), 1)) limit 1),
    (select p.id from father_activity_pool(v_month, 'couple_relationship', v_delivery, v_preterm, v_in_nicu) p
      order by p.ord offset (v_day % greatest((select count(*) from father_activity_pool(v_month, 'couple_relationship', v_delivery, v_preterm, v_in_nicu)), 1)) limit 1),
    (select p.id from father_activity_pool(v_month, 'your_own_wellbeing', v_delivery, v_preterm, v_in_nicu) p
      order by p.ord offset (v_day % greatest((select count(*) from father_activity_pool(v_month, 'your_own_wellbeing', v_delivery, v_preterm, v_in_nicu)), 1)) limit 1),
    (select p.id from father_activity_pool(v_month, 'becoming_a_father', v_delivery, v_preterm, v_in_nicu) p
      order by p.ord offset (v_day % greatest((select count(*) from father_activity_pool(v_month, 'becoming_a_father', v_delivery, v_preterm, v_in_nicu)), 1)) limit 1),
    (select p.id from father_activity_pool(v_month, 'practical_load', v_delivery, v_preterm, v_in_nicu) p
      order by p.ord offset (v_day % greatest((select count(*) from father_activity_pool(v_month, 'practical_load', v_delivery, v_preterm, v_in_nicu)), 1)) limit 1)
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
  v_weeks int; v_nicu boolean; v_preterm boolean; v_in_nicu boolean;
begin
  v_plan := get_or_create_father_daily_plan(p_profile_id); -- also does the ownership check
  select birth_method into v_birth_method from profiles where id = p_profile_id;
  v_delivery := case when v_birth_method in ('vaginal', 'caesarean') then v_birth_method::father_activity_relevance else null end;
  select date_of_birth, gestational_weeks, in_nicu into v_dob, v_weeks, v_nicu
    from children where parent_id = p_profile_id order by date_of_birth desc limit 1;
  v_preterm := coalesce(v_weeks < 37, false);
  v_in_nicu := v_preterm and coalesce(v_nicu, false);
  v_month := mother_month_for(v_dob, v_plan.plan_date);
  v_day := (v_plan.plan_date - date '1970-01-01');
  select count(*) into v_count from father_activity_pool(v_month, p_category, v_delivery, v_preterm, v_in_nicu);
  if v_count <= 1 then return v_plan; end if;
  v_next := coalesce((v_plan.swaps ->> p_category::text)::int, 0) + 1;
  select p.id into v_id from father_activity_pool(v_month, p_category, v_delivery, v_preterm, v_in_nicu) p
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

-- The old signatures are no longer called by anything.
drop function if exists public.mother_activity_pool(int, mother_activity_category, mother_activity_relevance);
drop function if exists public.father_activity_pool(int, father_activity_category, father_activity_relevance);

-- 5. Refresh today's plan when a flag changes -------------------------------
-- Plans are generated once a day and read back until the date changes, so
-- without this, telling the app "baby is home now" (or answering the blood
-- pressure question) would not show until tomorrow. Plans are regenerated
-- deterministically, so removing today's and later rows loses nothing but
-- the day's swaps.
create or replace function public.reset_parent_plans_for_flag_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_parent uuid;
  v_today date;
begin
  if tg_table_name = 'children' then
    v_parent := new.parent_id;
  else
    v_parent := new.id;
  end if;
  v_today := mother_plan_date_for(v_parent);
  delete from mother_daily_plans where profile_id = v_parent and plan_date >= v_today;
  delete from father_daily_plans where profile_id = v_parent and plan_date >= v_today;
  return new;
end;
$function$;

drop trigger if exists children_flags_reset_plans on children;
create trigger children_flags_reset_plans
  after update of in_nicu, gestational_weeks on children
  for each row
  when (old.in_nicu is distinct from new.in_nicu or old.gestational_weeks is distinct from new.gestational_weeks)
  execute function public.reset_parent_plans_for_flag_change();

drop trigger if exists profiles_hypertension_reset_plans on profiles;
create trigger profiles_hypertension_reset_plans
  after update of had_hypertension on profiles
  for each row
  when (old.had_hypertension is distinct from new.had_hypertension)
  execute function public.reset_parent_plans_for_flag_change();
