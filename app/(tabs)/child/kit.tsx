import { SectionScaffold } from "../../../components/SectionScaffold";

/**
 * Development kit — current kit, progress through it, next recommendation.
 * A section inside Child, explicitly not a tab of its own.
 *
 * Kit recommendations keep advancing through this same slot as the child
 * ages; the screen never changes shape.
 */
export default function Kit() {
  return (
    <SectionScaffold
      eyebrow="DEVELOPMENT KIT"
      title="Based on what they're exploring right now."
      body="Which kit is with you now, how far through it you've got, and the one we'd recommend next — based on their age and what they've actually taken to, not a catalogue to browse."
      needs={[
        "A kits catalogue and per-child kit assignment in Supabase",
        "Progress derived from completed kit activities",
        "Next-kit recommendation rule (age band + completion history)",
      ]}
    />
  );
}
