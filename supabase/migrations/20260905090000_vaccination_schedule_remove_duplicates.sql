-- Removes duplicate rows in vaccination_schedule that showed the same
-- vaccine dose under more than one tier tab:
--
--   - Pneumococcal Conjugate (PCV) at 6 weeks and 14 weeks was seeded
--     under both "recommended" (iap-pcv-1, iap-pcv-3) and "situational"
--     (uip-pcv-1, uip-pcv-2) — the situational copies are dropped, along
--     with any child_vaccinations rows recorded against them (the one
--     family who had marked those given already has the equivalent
--     recommended-tier dose marked given too, so no record is lost).
--   - Tetanus & adult Diphtheria (Td) at ~16 years was seeded under both
--     "essential" (uip-td-16, "16 years") — kept — and "recommended"
--     (iap-td-16-18, "16-18 years") — dropped, per the user's call to
--     keep it essential-only. No child_vaccinations rows reference it.
delete from child_vaccinations
where vaccination_id in ('uip-pcv-1', 'uip-pcv-2');

delete from vaccination_schedule
where id in ('uip-pcv-1', 'uip-pcv-2', 'iap-td-16-18');
