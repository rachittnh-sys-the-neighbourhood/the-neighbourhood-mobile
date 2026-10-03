-- Fixes NBR-0779, the one row (of 850) in did_you_know_facts whose
-- phrasing broke the table's own voice: "foods eaten by the breastfeeding
-- parent" instead of the direct, second-person "you" every sibling card on
-- the exact same topic already uses (NBR-0591, NBR-0592, NBR-0598 -- all
-- "breast milk" + flavour/garlic cards phrased as "you"/"babies", never a
-- clinical role noun). Flagged by the user as reading like it wasn't
-- written by a person; rewritten to match, not reworded in isolation.
update did_you_know_facts
set card_text = 'Breast-milk flavour changes with what you eat -- garlic, spices, even mint can come through.'
where id = 'NBR-0779';
