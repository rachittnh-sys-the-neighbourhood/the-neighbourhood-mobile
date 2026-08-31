import { SectionScaffold } from "../../../components/SectionScaffold";

/**
 * Progress (formerly "Reports") — the child's journey over time: discoveries,
 * activities explored, and patterns worth noticing. Deliberately not framed
 * as an analytics dashboard — no charts, no scores, no comparison.
 *
 * Opening a specific entry is the second place the IA allows a third
 * tap (list → detail). That detail route is not scaffolded yet.
 *
 * Built from real usage only; with no history there is nothing to
 * summarise, and this screen should say so rather than invent one.
 */
export default function Progress() {
  return (
    <SectionScaffold
      eyebrow="PROGRESS"
      title="How the last few weeks actually went."
      body="Quiet summaries of what you did together and what shifted — discoveries noticed, activities explored, patterns worth knowing. Written for you, not for comparison. They start appearing once there's enough of a pattern to be honest about."
      needs={[
        "An activity/interaction log to summarise (nothing persists server-side yet)",
        "Progress generation + storage, weekly and monthly cadence",
        "A detail route for a single entry (the allowed third tap)",
      ]}
    />
  );
}
