/**
 * Home's "What's next" tile — the guaranteed third source.
 *
 * The tile prefers a genuinely-due vaccination, then an outstanding
 * milestone for the child's current age; both of those can legitimately
 * be empty at once (nothing due for 60+ days, everything in the current
 * milestone band already marked achieved) and the tile used to just
 * disappear when that happened. These transition notes are the fallback
 * that never runs out: one small, always-true "here's what's coming" or
 * "here's what to watch for" note per age band, covering 0–84 months with
 * no gaps, so the slot always has something to say.
 *
 * Deliberately NOT milestone-shaped (no domain, no "achieved" state) —
 * these are broader stage-level shifts (starting solids, a mobility leap,
 * the daycare/preschool window) rather than a single skill to check off.
 */
export type TransitionNote = {
  id: string;
  ageMinMonths: number;
  ageMaxMonths: number;
  title: string;
  body: string;
};

const TRANSITIONS: TransitionNote[] = [
  {
    id: "newborn-rhythm",
    ageMinMonths: 0,
    ageMaxMonths: 1,
    title: "Days and nights are still blurring together",
    body: "A settled day/night rhythm is still months away — this is normal, not something to fix yet.",
  },
  {
    id: "social-smile",
    ageMinMonths: 2,
    ageMaxMonths: 3,
    title: "More awake, alert stretches are coming",
    body: "Expect longer wakeful windows and more eye contact as the fourth trimester eases off.",
  },
  {
    id: "starting-solids-window",
    ageMinMonths: 4,
    ageMaxMonths: 5,
    title: "The solid-food window is opening",
    body: "Most babies show readiness signs — sitting with support, watching food closely — somewhere around six months.",
  },
  {
    id: "mobility-leap",
    ageMinMonths: 6,
    ageMaxMonths: 8,
    title: "Mobility is about to change fast",
    body: "Rolling, scooting, or early crawling can show up any week now — worth a fresh look at what's within reach.",
  },
  {
    id: "stranger-anxiety",
    ageMinMonths: 9,
    ageMaxMonths: 11,
    title: "Clinginess with new faces is typical here",
    body: "Stranger and separation anxiety often peaks around this age — a sign of a healthy attachment, not a setback.",
  },
  {
    id: "first-steps-window",
    ageMinMonths: 12,
    ageMaxMonths: 14,
    title: "Standing, cruising, maybe first steps",
    body: "Walking arrives anywhere from 9 to 18 months — cruising along furniture is the stage right before it.",
  },
  {
    id: "bottle-weaning-window",
    ageMinMonths: 15,
    ageMaxMonths: 17,
    title: "A good window to start easing off the bottle",
    body: "Most guidance points to moving fully to a cup somewhere between 12 and 18 months.",
  },
  {
    id: "toddler-tantrums",
    ageMinMonths: 18,
    ageMaxMonths: 20,
    title: "Big feelings, small vocabulary",
    body: "Tantrums often peak now — the gap between what a toddler wants to say and what they can say is at its widest.",
  },
  {
    id: "language-burst",
    ageMinMonths: 21,
    ageMaxMonths: 23,
    title: "A vocabulary jump is common around now",
    body: "Many toddlers go from a handful of words to short phrases in a fairly short stretch at this age.",
  },
  {
    id: "potty-readiness",
    ageMinMonths: 24,
    ageMaxMonths: 29,
    title: "Potty-training readiness starts to vary a lot",
    body: "Some toddlers show real interest now; plenty don't until well past three — both are within the normal range.",
  },
  {
    id: "preschool-social",
    ageMinMonths: 30,
    ageMaxMonths: 35,
    title: "Playing alongside other kids, more than with them",
    body: "Parallel play is typical before true cooperative play — sharing and turn-taking are still being built.",
  },
  {
    id: "preschool-transition",
    ageMinMonths: 36,
    ageMaxMonths: 47,
    title: "The preschool/daycare transition window",
    body: "Separation gets easier for most kids around now, though a rocky first few weeks at drop-off is still common.",
  },
  {
    id: "independence-push",
    ageMinMonths: 48,
    ageMaxMonths: 59,
    title: "\"I can do it myself\" enters full swing",
    body: "Expect a strong pull toward independence in dressing, choosing, and deciding — even when it slows things down.",
  },
  {
    id: "school-readiness",
    ageMinMonths: 60,
    ageMaxMonths: 71,
    title: "The kindergarten/school transition window",
    body: "Following multi-step instructions and sitting through structured activities are the big asks of this stage.",
  },
  {
    id: "middle-childhood",
    ageMinMonths: 72,
    ageMaxMonths: 84,
    title: "Friendships start to matter more than family time",
    body: "Peer opinion carries real weight now — a normal shift, not a sign of pulling away.",
  },
];

/** The band whose range contains this age, falling back to the nearest
 *  band at either end — the dataset covers 0–84 months with no internal
 *  gaps, so the fallback only ever matters just past the oldest band. */
export function transitionForAge(ageMonths: number): TransitionNote {
  const match = TRANSITIONS.find(
    (t) => ageMonths >= t.ageMinMonths && ageMonths <= t.ageMaxMonths
  );
  if (match) return match;
  return ageMonths < TRANSITIONS[0].ageMinMonths
    ? TRANSITIONS[0]
    : TRANSITIONS[TRANSITIONS.length - 1];
}
