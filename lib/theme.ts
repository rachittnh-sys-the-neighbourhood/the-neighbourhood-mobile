/**
 * Design tokens — matches PRD section 10 exactly, and the same palette
 * already live on the website (warm-taupe / soft-sand / cream / charcoal).
 * Sage is new here: the app's accent/success color, since the web brand
 * never needed a "success" state and the PRD specifically calls for one
 * that isn't the taupe/clay pairing already used for CTAs.
 */
export const colors = {
  warmTaupe: "#89745B", // primary brand color
  softSand: "#C9A58E", // secondary accents
  cream: "#F3EEE7", // backgrounds
  charcoal: "#2C2C2C", // text and headings
  sage: "#A8B5A4", // accent / success states
  // A darker, more saturated sage — not a success/state color like `sage`
  // above, but the "pop" accent for primary CTA buttons, status pills and
  // the active tab bar icon: the one thing on a screen that should read as
  // unmistakably actionable, the way Nurche/Nestology use a solid dark
  // green for their main buttons and badges.
  sageDark: "#71846D",
  // A lighter tint of `sage` — for a whole-tile background (Home's Did
  // You Know tile) where full-strength sage reads too heavy as a large
  // area rather than an accent. The actual fact content then sits on a
  // white sub-card nested inside, same "tinted outer / white inner"
  // pattern the activities tile below uses for its own rows.
  sageLight: "#C2CBBF",
  // A lighter tint of `softSand`, same reasoning — the activities tile's
  // outer background, less heavy than full-strength softSand over that
  // much area.
  softSandLight: "#D9C0B0",
  // Lighter again — deliberately sitting between softSandLight and the
  // Ask card's own near-cream warmTaupe wash (home.tsx copilotModule,
  // ~rgba(139,116,91,0.11) over cream, which flattens to roughly
  // #E8E1D8): the activities tile needed a shade that's clearly a step
  // down from the Ask tile's near-invisible tint, without going back up
  // to softSandLight's fuller saturation.
  softSandLighter: "#E1D1C4",
  white: "#FFFDFC", // cards and clean space

  // Derived, not in the PRD table, but needed for real UI: muted text,
  // borders, and error state (kept desaturated so it never reads alarming).
  textMuted: "#706A62",
  border: "rgba(96, 79, 60, 0.14)",
  error: "#B4553F",
} as const;

/**
 * The app has two modes, and each one gets a palette rather than a theme
 * switch: Child Mode is the warm cream/taupe brand, Parent Mode shifts the
 * same lightness toward a calm eucalyptus.
 *
 * The shift is deliberately small in VALUE and larger in HUE. Parent Mode
 * must never read as dark mode or as a clinical app — a parent opening it at
 * 3am should feel the room change temperature, not the lights go out. Every
 * key exists in both palettes so a component can read tokens without ever
 * asking which mode it is in.
 */
export type Mode = "child" | "parent";

export type Palette = {
  /** Screen background. */
  bg: string;
  /** Cards and raised surfaces. */
  surface: string;
  /** Recessed fills — progress tracks, quiet chips. */
  surfaceAlt: string;
  /** Primary brand action and eyebrow text. */
  primary: string;
  /** Secondary accents. */
  secondary: string;
  /** Headings and body copy. */
  text: string;
  /** Supporting copy. */
  textMuted: string;
  border: string;
  /** Success / on-track. */
  positive: string;
  /** Kept desaturated — this app never alarms. */
  attention: string;
};

export const palettes: Record<Mode, Palette> = {
  child: {
    bg: "#F3EEE7",
    surface: "#FFFDFC",
    surfaceAlt: "rgba(137, 116, 91, 0.07)",
    primary: "#89745B",
    secondary: "#C9A58E",
    text: "#2C2C2C",
    textMuted: "#706A62",
    border: "rgba(96, 79, 60, 0.14)",
    positive: "#A8B5A4",
    attention: "#B4553F",
  },
  parent: {
    // Same lightness as cream, rotated toward eucalyptus and desaturated.
    bg: "#EBF0EB",
    surface: "#FBFDFB",
    surfaceAlt: "rgba(94, 115, 96, 0.07)",
    primary: "#5E7360",
    secondary: "#9DB0A0",
    // Cooled a touch, never blue-black.
    text: "#242A26",
    textMuted: "#646E66",
    border: "rgba(60, 80, 62, 0.13)",
    positive: "#7C9A80",
    attention: "#A86552",
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

// Inter carries all body/UI text; Playfair Display italic is reserved for
// rare emotional accents, matching how the website uses .v3-serif — never
// for whole paragraphs, only single words or short phrases.
export const fonts = {
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  serifItalic: "PlayfairDisplay_400Regular_Italic",
} as const;

export const typeScale = {
  display: 32,
  h1: 26,
  h2: 20,
  h3: 17,
  body: 15,
  bodySmall: 13,
  caption: 11,
} as const;

/**
 * The semantic type scale. Screens pick a ROLE, never a size — which is
 * what keeps hierarchy consistent across surfaces that were previously
 * each inventing their own 10px/11px/13px eyebrow.
 *
 * Eight roles, three weights (400/600/700), one serif size. Medium (500)
 * is deliberately absent: it sat between Regular and SemiBold doing no
 * distinct work, and every extra weight costs hierarchy legibility.
 *
 * Line heights are absolute rather than multipliers so a role reads the
 * same wherever it lands.
 */
export const type = {
  /** The one hero per screen. Never two. */
  display: { fontFamily: fonts.bodyBold, fontSize: 26, lineHeight: 31 },
  /**
   * The editorial voice — the app speaking rather than labelling.
   * Deliberately ONE size: the serif previously appeared at 17 and 20,
   * and that inconsistency is what made it read as decoration instead of
   * a device. Sized to match `title` so serif and sans headings sit on
   * the same optical line.
   */
  serif: { fontFamily: fonts.serifItalic, fontSize: 17, lineHeight: 24 },
  /** Card and module headings. */
  title: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 22 },
  /** The deck beneath a display or title — the missing middle step. */
  lead: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  /** Paragraphs and card descriptions. */
  body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  /** Row titles, buttons, links — anything actionable or scannable. */
  label: { fontFamily: fonts.bodySemiBold, fontSize: 13, lineHeight: 18 },
  /** The single uppercase eyebrow. Section labels and card kickers alike. */
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  /** Metadata and fine print. Never body copy. */
  meta: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16 },
} as const;

/**
 * Home's own revised scale -- deliberately separate from `type` above
 * rather than redefining `body`/`label`/`eyebrow` in place. Those shared
 * roles are load-bearing across the Family Meal Planner, You tab and
 * Milestones screens tuned earlier this same project; changing them here
 * would resize text on every one of those screens as a side effect. This
 * scale exists to close two problems on Home specifically: the old
 * `display` role (26/700) sat as a cliff above everything else on the
 * page with nothing between it and `title` (17px), and the smallest
 * roles (`eyebrow`/`meta` at 11px) read uncomfortably small for a
 * screen a tired parent skims one-handed. So this compresses BOTH ends
 * toward the middle rather than just inserting one more step.
 *
 * Shared by home.tsx and the Home-adjacent components it composes
 * (DidYouKnowTile, FamilyMealTile, ActivityCard -- the last of which is
 * also reused on the Child tab, so this scale reaches there too).
 */
export const homeType = {
  /** The one greeting line at the very top. Never two intro treatments. */
  pageHeading: { fontFamily: fonts.bodySemiBold, fontSize: 24, lineHeight: 30 },
  /** A card's own heading, one step under the page heading. */
  sectionHeading: { fontFamily: fonts.bodySemiBold, fontSize: 20, lineHeight: 26 },
  /** An entity name -- an activity, a dish -- never a sentence. */
  cardTitle: { fontFamily: fonts.bodySemiBold, fontSize: 18, lineHeight: 24 },
  /** A descriptive sentence, not an entity name -- regular weight, same
   *  size class as cardTitle so the two only differ in what they say,
   *  not how loud they are. */
  bodyText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  /** Links and secondary taps -- Regular weight, not Medium. Color (green
   *  or warmTaupe, depending on context) is what signals "this is
   *  actionable" -- it doesn't also need to be heavier than bodyText, or
   *  a secondary link ends up competing with the card's actual content
   *  instead of sitting quietly beneath it. */
  action: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20 },
  /** Metadata, duration, disclaimers, safety copy -- deliberately NOT
   *  shrunk to save space; legibility on trust/safety text wins over
   *  density every time on this screen. */
  meta: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  eyebrow: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
} as const;
