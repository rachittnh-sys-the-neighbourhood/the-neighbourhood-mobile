/**
 * "This Stage" — the child-facing knowledge layer.
 *
 * Distinct from lib/parentCare.ts's CareTopic library (which answers "what
 * should I understand about myself / my parenting journey?") and from
 * lib/learning.ts's Course/Workshop model (structured, multi-lesson,
 * "I want to understand this properly"). This file answers a narrower
 * question — "what should I understand about my child, right now?" — with
 * short, single-sitting reads (2–4 minutes) rather than a course.
 *
 * LOCAL ONLY, same pattern as parentCare.ts: hand-authored demo data with
 * real editorial shape, no backend table yet. Age bands are deliberately
 * coarse (four bands covering birth to 6 years) — this is a curated
 * knowledge layer, not the fine-grained milestone/activity content that
 * already exists in growth.ts and content/activity_library.csv.
 */

export type ChildStageDomain =
  | "development"
  | "communication"
  | "feeding"
  | "sleep"
  | "behaviour"
  | "play"
  | "safety";

export const CHILD_STAGE_DOMAIN_LABEL: Record<ChildStageDomain, string> = {
  development: "Development",
  communication: "Communication",
  feeding: "Feeding",
  sleep: "Sleep",
  behaviour: "Behaviour",
  play: "Play",
  safety: "Safety",
};

export type ChildStageTopic = {
  slug: string;
  domain: ChildStageDomain;
  title: string;
  /** One sentence: why this matters right now. Shown on the card, not just the detail screen. */
  reason: string;
  minutes: number;
  ageMonthsMin: number;
  ageMonthsMax: number;
  sections: { heading: string; body: string }[];
};

export const CHILD_STAGE_TOPICS: ChildStageTopic[] = [
  {
    slug: "why-tummy-time-matters",
    domain: "development",
    title: "Why tummy time matters",
    reason: "It's building the neck and shoulder strength she'll use to sit, crawl and eventually walk.",
    minutes: 3,
    ageMonthsMin: 0,
    ageMonthsMax: 4,
    sections: [
      {
        heading: "What's actually happening",
        body: "Every time your baby lifts her head or pushes up on her forearms, she's strengthening the exact muscles behind sitting, crawling and walking. There's no shortcut to this — it has to happen against gravity, on her belly, a little most days.",
      },
      {
        heading: "Making it work",
        body: "Start with a few minutes after a nappy change, not right after a feed. Get down to her eye level — she'll work harder to lift her head to see your face than to look at a toy. If she protests, a rolled towel under her chest for a minute or two still counts.",
      },
    ],
  },
  {
    slug: "talking-to-your-baby",
    domain: "communication",
    title: "Talking to your baby",
    reason: "Babies tune into voices from day one — narrating your day is how language actually starts.",
    minutes: 3,
    ageMonthsMin: 0,
    ageMonthsMax: 6,
    sections: [
      {
        heading: "It doesn't matter what you say",
        body: "Narrate nappy changes, name what you're cooking, describe the walk. The content is irrelevant to a newborn — what matters is the rhythm, tone and repetition of a familiar voice, which is already shaping how her brain sorts sound into language.",
      },
      {
        heading: "The pause is the point",
        body: "Leave a gap after you speak, even before she can answer in words. That pause is where 'serve and return' starts — the back-and-forth pattern that, months from now, becomes an actual conversation.",
      },
    ],
  },
  {
    slug: "newborn-sleep-decoded",
    domain: "sleep",
    title: "Newborn sleep, decoded",
    reason: "Newborn sleep looks chaotic because it genuinely is — here's what's actually normal.",
    minutes: 4,
    ageMonthsMin: 0,
    ageMonthsMax: 3,
    sections: [
      {
        heading: "Short cycles are the design, not a problem",
        body: "Newborns sleep in 45–60 minute cycles with no real day/night rhythm for the first few weeks — their body clock hasn't switched on yet. Sixteen or more hours a day, split across many short stretches, is typical, not a sign anything is wrong.",
      },
      {
        heading: "What helps, gently",
        body: "Bright light and activity by day, dim and quiet by night, from birth — this is the single biggest lever for nudging day/night rhythm along, even though it takes weeks to show results. Nothing about this needs a schedule yet.",
      },
    ],
  },
  {
    slug: "safe-sleep-basics",
    domain: "safety",
    title: "Safe sleep basics",
    reason: "A few simple, well-evidenced rules cut the risk of sudden infant death dramatically.",
    minutes: 3,
    ageMonthsMin: 0,
    ageMonthsMax: 12,
    sections: [
      {
        heading: "The core rules",
        body: "Always on the back, on a firm flat surface, in her own sleep space, with nothing loose in it — no pillows, loose blankets, bumpers or soft toys. This one combination is behind most of the drop in sudden infant death over the last few decades.",
      },
      {
        heading: "Room-sharing, not bed-sharing",
        body: "Having her cot in your room for the first six months is recommended and genuinely lowers risk. Sharing an actual sleep surface with an adult raises it — worth knowing even on the nights it feels like the easier option.",
      },
    ],
  },
  {
    slug: "starting-solids-without-the-stress",
    domain: "feeding",
    title: "Starting solids, without the stress",
    reason: "The first few weeks of solids are about exploring texture and taste, not calories — milk is still doing the work.",
    minutes: 3,
    ageMonthsMin: 5,
    ageMonthsMax: 8,
    sections: [
      {
        heading: "Milk still leads",
        body: "Around six months, solids are practice, not replacement — breast milk or formula still supplies most of the nutrition for a while yet. A meal that ends up mostly on the floor or the bib is not a failed meal.",
      },
      {
        heading: "One new food at a time",
        body: "Introducing one new ingredient every few days, rather than mixing several at once, makes it far easier to spot a reaction if one shows up — and it usually doesn't.",
      },
    ],
  },
  {
    slug: "object-permanence-the-game",
    domain: "development",
    title: "Object permanence: the game they can't stop playing",
    reason: "Peekaboo isn't just cute — it's how your baby is learning that things still exist when she can't see them.",
    minutes: 3,
    ageMonthsMin: 6,
    ageMonthsMax: 12,
    sections: [
      {
        heading: "Why she keeps dropping things",
        body: "Before around eight months, out of sight genuinely means out of mind. The realisation that a hidden object still exists — object permanence — develops gradually, and dropping a spoon fifty times to watch you pick it up is her actively testing it.",
      },
      {
        heading: "Play that helps",
        body: "Hiding a toy under a cloth while she watches, then letting her find it, turns this stage into a game rather than a mystery. She'll get faster at it within weeks.",
      },
    ],
  },
  {
    slug: "why-peekaboo-is-secretly-a-lesson",
    domain: "play",
    title: "Why peekaboo is secretly a lesson",
    reason: "The delight on her face is a prediction being confirmed — not just a startle.",
    minutes: 2,
    ageMonthsMin: 5,
    ageMonthsMax: 10,
    sections: [
      {
        heading: "Anticipation is the skill",
        body: "The gap between hiding your face and revealing it is where the learning happens — she's building a mental model of what happens next and getting a small hit of delight when she's right.",
      },
      {
        heading: "Let her lead eventually",
        body: "Once she starts hiding her own face or covering a toy, follow her lead rather than always initiating — a game she controls builds confidence differently than one that's always done to her.",
      },
    ],
  },
  {
    slug: "stranger-anxiety-explained",
    domain: "behaviour",
    title: "Stranger anxiety, explained",
    reason: "Sudden clinginess around unfamiliar faces is a sign of healthy attachment, not a step backward.",
    minutes: 3,
    ageMonthsMin: 7,
    ageMonthsMax: 14,
    sections: [
      {
        heading: "It means the bond is working",
        body: "Somewhere between seven and ten months, most babies who were previously happy with anyone suddenly aren't. This is a genuine developmental leap — she now clearly tells you apart from everyone else, and that distinction is exactly what secure attachment looks like at this age.",
      },
      {
        heading: "What actually helps",
        body: "Let her warm up at her own pace rather than being passed to a relative she's wary of. A slow introduction, at her speed, resolves faster than being pushed.",
      },
    ],
  },
  {
    slug: "baby-proofing-room-by-room",
    domain: "safety",
    title: "Baby-proofing, room by room",
    reason: "Mobility usually arrives faster than expected — a five-minute sweep now beats a scramble later.",
    minutes: 4,
    ageMonthsMin: 6,
    ageMonthsMax: 12,
    sections: [
      {
        heading: "Get down to her level",
        body: "Crawl through each room on your hands and knees — sockets, cords, corners and small objects all look completely different from that height, and it's the fastest way to spot what actually needs fixing.",
      },
      {
        heading: "The short list that matters most",
        body: "Cover sockets, secure loose cords, anchor any furniture she could pull over, and clear the floor of anything smaller than a toilet-paper tube. Redo the sweep once she starts pulling up and cruising — the danger zone rises with her.",
      },
    ],
  },
  {
    slug: "the-eight-month-sleep-regression",
    domain: "sleep",
    title: "The 8-month sleep regression",
    reason: "A baby who was sleeping well and suddenly isn't is usually going through a leap, not a step backward.",
    minutes: 3,
    ageMonthsMin: 7,
    ageMonthsMax: 10,
    sections: [
      {
        heading: "What's driving it",
        body: "New physical skills (sitting, crawling, pulling up) and new separation awareness both peak around this age, and both interrupt sleep. It's genuinely a sign of progress, even though it doesn't feel like one at 3am.",
      },
      {
        heading: "Ride it out, don't overhaul",
        body: "Keep the existing routine rather than introducing a new one mid-regression — most resolve within two to six weeks on their own, and a routine change now just adds a second adjustment on top of the first.",
      },
    ],
  },
  {
    slug: "tantrums-arent-manipulation",
    domain: "behaviour",
    title: "Tantrums aren't manipulation",
    reason: "A toddler mid-meltdown genuinely cannot access the part of the brain that reasons — that's not a choice.",
    minutes: 3,
    ageMonthsMin: 15,
    ageMonthsMax: 36,
    sections: [
      {
        heading: "The brain science, briefly",
        body: "The part of the brain that manages self-control and reasoning doesn't finish developing until well into adulthood. In the toddler years it's barely online at all, especially when a child is tired, hungry, or overwhelmed. A tantrum is a genuine loss of control, not a strategy.",
      },
      {
        heading: "What actually helps in the moment",
        body: "Staying calm and physically near, without trying to reason during the peak, gives the meltdown somewhere safe to land. Talking it through works far better once she's calm again, not while she's mid-storm.",
      },
    ],
  },
  {
    slug: "the-word-explosion",
    domain: "communication",
    title: "The word explosion",
    reason: "Vocabulary can double or triple within a few months around this age — here's what to expect.",
    minutes: 3,
    ageMonthsMin: 16,
    ageMonthsMax: 30,
    sections: [
      {
        heading: "Why it happens all at once",
        body: "Once a toddler has a base vocabulary of around fifty words, most go through a rapid burst where new words stick after hearing them just once or twice. It can feel sudden because it is — the groundwork was laid quietly for months beforehand.",
      },
      {
        heading: "Feeding it without pressure",
        body: "Narrating what you're doing, reading the same books repeatedly, and naming things during everyday routines all feed this stage far more than flashcards or drills. Repetition, not novelty, is what sticks at this age.",
      },
    ],
  },
  {
    slug: "why-no-becomes-their-favourite-word",
    domain: "development",
    title: "Why 'no' becomes their favourite word",
    reason: "Saying no to everything is often the first real sign of a separate sense of self, not defiance for its own sake.",
    minutes: 3,
    ageMonthsMin: 18,
    ageMonthsMax: 36,
    sections: [
      {
        heading: "It's about identity, not you",
        body: "Somewhere around eighteen months, toddlers start realising they're a separate person with their own preferences — and 'no' is the simplest, most available way to test that. It's rarely really about the thing being offered.",
      },
      {
        heading: "Choosing your battles",
        body: "Offering two acceptable choices ('the red cup or the blue cup') instead of an open question gives her the autonomy she's after while keeping the actual decision within bounds you're fine with either way.",
      },
    ],
  },
  {
    slug: "parallel-play-is-not-antisocial",
    domain: "play",
    title: "Parallel play is not antisocial",
    reason: "Playing alongside another child rather than with them is exactly where toddlers are supposed to be.",
    minutes: 2,
    ageMonthsMin: 18,
    ageMonthsMax: 36,
    sections: [
      {
        heading: "What it looks like",
        body: "Two toddlers sitting near each other, each absorbed in their own toy, occasionally glancing over — that's parallel play, and it's the normal, expected stage before true cooperative play develops, not a sign of shyness or a problem to fix.",
      },
      {
        heading: "How it grows from here",
        body: "True back-and-forth play with shared rules usually starts to emerge closer to three, and grows out of exactly this stage rather than skipping it. Time near other children, without pressure to 'play together', is what builds toward it.",
      },
    ],
  },
  {
    slug: "curious-hands-home-safety-at-toddler-height",
    domain: "safety",
    title: "Curious hands: home safety at toddler height",
    reason: "A toddler's reach and curiosity both jump well ahead of their judgement — worth a fresh look at the house.",
    minutes: 4,
    ageMonthsMin: 15,
    ageMonthsMax: 36,
    sections: [
      {
        heading: "What's changed since the baby-proofing sweep",
        body: "A toddler can climb, open, and reach in ways a crawling baby couldn't — cupboard locks, stove knob covers, and anything within climbing distance of a chair are worth checking again, even if the house was already 'done' a year ago.",
      },
      {
        heading: "Talk, don't just childproof",
        body: "Simple, repeated safety language ('hot, we don't touch') alongside physical barriers starts building her own judgement, which is the thing that eventually has to do the job once she outgrows every barrier you can put up.",
      },
    ],
  },
  {
    slug: "big-feelings-and-meltdowns",
    domain: "behaviour",
    title: "Big feelings & meltdowns",
    reason: "Two-and-a-half can be a big emotional stage. Here's what's happening and what tends to help.",
    minutes: 3,
    ageMonthsMin: 28,
    ageMonthsMax: 48,
    sections: [
      {
        heading: "What's different from a toddler tantrum",
        body: "Around this age, feelings get bigger and more varied — frustration, disappointment, jealousy — while the ability to name or manage them still lags well behind. A meltdown here is often about being overwhelmed by a feeling with no label yet, more than a straightforward loss of control.",
      },
      {
        heading: "Responding differently",
        body: "Naming the feeling out loud ('you're really disappointed we have to leave') before problem-solving helps more than jumping straight to a fix or a consequence. Once she's calm, a short, matter-of-fact conversation about what happened lands far better than one mid-storm.",
      },
    ],
  },
  {
    slug: "magical-thinking-and-imaginary-friends",
    domain: "development",
    title: "Magical thinking and imaginary friends",
    reason: "An imaginary friend is a sign of a healthy, active imagination, not a cause for concern.",
    minutes: 3,
    ageMonthsMin: 36,
    ageMonthsMax: 60,
    sections: [
      {
        heading: "Why this stage is so imaginative",
        body: "Preschoolers are still working out the line between pretend and real, and their imagination is developing faster than their sense of what's literally true. An imaginary friend, monsters under the bed, or genuinely believing a stuffed animal has feelings are all part of the same stage.",
      },
      {
        heading: "How to respond",
        body: "Playing along with an imaginary friend, while gently naming reality when it matters (like bedtime fears), respects the imagination without reinforcing genuine fear. This stage fades naturally over a year or two as reasoning catches up.",
      },
    ],
  },
  {
    slug: "encouraging-questions-not-just-answering-them",
    domain: "communication",
    title: "Encouraging questions, not just answering them",
    reason: "The endless 'why' phase is tiring, but it's also the engine of how preschoolers actually learn to think.",
    minutes: 3,
    ageMonthsMin: 36,
    ageMonthsMax: 60,
    sections: [
      {
        heading: "Why 'why' never stops",
        body: "A preschooler asking 'why' repeatedly isn't usually trying to catch you out — she's genuinely building a causal model of the world, one link at a time, and each answer usually opens a new question because that's how the reasoning is forming.",
      },
      {
        heading: "It's fine to turn it around",
        body: "'What do you think?' before you answer builds the habit of reasoning it out herself, and it's a completely honest response on the days you genuinely don't know either.",
      },
    ],
  },
];

/** Topics whose age band the child currently falls inside. */
export function childStageTopicsForAge(ageMonths: number): ChildStageTopic[] {
  return CHILD_STAGE_TOPICS.filter(
    (t) => ageMonths >= t.ageMonthsMin && ageMonths <= t.ageMonthsMax,
  );
}

/**
 * Up to `count` recommended topics for the child's current age, rotating by
 * day (offset by `offset` so two call sites on the same screen don't always
 * show the exact same pick) rather than always leading with the same one.
 * Falls back to the nearest age band if none matches exactly, so an age
 * right on a boundary never comes back empty.
 */
export function recommendedChildStageTopics(
  ageMonths: number,
  count = 2,
  offset = 0,
): ChildStageTopic[] {
  let pool = childStageTopicsForAge(ageMonths);
  if (pool.length === 0) {
    // Nearest band by distance to its midpoint — a graceful fallback for an
    // age that falls in a genuine gap between authored bands.
    const withDistance = CHILD_STAGE_TOPICS.map((t) => ({
      topic: t,
      distance: Math.min(
        Math.abs(ageMonths - t.ageMonthsMin),
        Math.abs(ageMonths - t.ageMonthsMax),
      ),
    })).sort((a, b) => a.distance - b.distance);
    pool = withDistance.slice(0, Math.max(count, 4)).map((w) => w.topic);
  }
  if (pool.length === 0) return [];

  const dayIndex = Math.floor(Date.now() / 86_400_000) + offset;
  const picked: ChildStageTopic[] = [];
  const usedDomains = new Set<ChildStageDomain>();
  for (let i = 0; i < pool.length && picked.length < count; i++) {
    const topic = pool[(dayIndex + i) % pool.length];
    if (usedDomains.has(topic.domain) && picked.length < pool.length - 1) continue;
    usedDomains.add(topic.domain);
    picked.push(topic);
  }
  return picked;
}

export function childStageTopicBySlug(slug: string): ChildStageTopic | undefined {
  return CHILD_STAGE_TOPICS.find((t) => t.slug === slug);
}
