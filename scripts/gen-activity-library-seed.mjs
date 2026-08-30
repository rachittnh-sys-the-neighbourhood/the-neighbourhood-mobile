/**
 * Generates the activities seed migration from content/activity_library.csv
 * (1,149 activities across 28 three-month age bands and 7 developmental
 * areas) — the replacement content source for the `activities` table.
 *
 *   node scripts/gen-activity-library-seed.mjs
 *
 * Re-running after a CSV edit regenerates the SAME output file in place
 * (safe: it hasn't been pushed yet), until it has been applied remotely —
 * after that, a further content edit needs its own new-timestamped file,
 * same as any other migration.
 *
 * Maps the CSV's 7 areas onto the app's existing 4-domain model (Motor /
 * Communication / Cognitive / Social & Emotional), which the daily_plans
 * schema, the Home "4 activities a day" UI, and milestones all assume and
 * were deliberately left unchanged:
 *   Gross Motor, Fine Motor        -> motor
 *   Language & Communication       -> communication
 *   Cognitive, Sensory             -> cognitive
 *   Social-Emotional,
 *   Self-Care & Adaptive           -> social_emotional
 *     (Self-Care & Adaptive groups with Social-Emotional the same way
 *     Denver II groups personal-social with self-help skills.)
 *
 * Age bands are widened rather than collapsed — see
 * 20260808100000_widen_activity_bands.sql — so all 28 of the CSV's bands
 * are kept, not re-bucketed into the original 7.
 *
 * The CSV (as of activity_library_explained_ALL with sources.xlsx) gives
 * Description, Why It Matters and How To Do It as separate authored
 * fields — they map straight to why / benefit / instructions, no sentence
 * splitting needed. An earlier CSV revision only had one combined "How To
 * Do It" blob per activity and mechanically split it on sentence
 * boundaries; that heuristic is gone now that the source content itself
 * is split.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const CSV_PATH = resolve(root, "content/activity_library.csv");
// Split into batches (like the activity_variations_batch_* migrations
// before it) rather than one ~700KB file — each insert stays a
// reasonably sized, individually-applicable migration.
const DELETE_OUT = "supabase/migrations/20260830061600_activity_library_delete_stale.sql";
// Each batch needs its own timestamp — Supabase keys migrations off the
// leading digits, not the rest of the filename — so this counts one
// minute up per batch starting after the delete migration above.
const BATCH_BASE_TIMESTAMP = 20260830070000;
const BATCH_SIZE = 100;

const AREA_TO_DOMAIN = {
  "Gross Motor": "motor",
  "Fine Motor": "motor",
  Cognitive: "cognitive",
  "Language & Communication": "communication",
  "Social-Emotional": "social_emotional",
  Sensory: "cognitive",
  "Self-Care & Adaptive": "social_emotional",
};

const DOMAINS = ["motor", "communication", "cognitive", "social_emotional"];

// ---------------------------------------------------------------------
// Minimal CSV parser — handles quoted fields with embedded commas and
// doubled ("") quotes, which this file uses throughout. No external
// dependency, matching gen-seed.mjs's dependency-free convention.
// ---------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // skip
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const q = (v) =>
  v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`;

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** "0–3 months" → { band: "m0_3", lowerMonths: 0 }. "3y3m–3y6m" → { band: "y3_3", lowerMonths: 39 }. */
function parseAgeBand(label) {
  const monthsMatch = label.match(/^(\d+)–(\d+) months$/);
  if (monthsMatch) {
    return { band: `m${monthsMatch[1]}_${monthsMatch[2]}`, lowerMonths: Number(monthsMatch[1]) };
  }
  const start = label.split("–")[0];
  const yearMatch = start.match(/^(\d+)y(\d+)?m?$/);
  if (!yearMatch) throw new Error(`cannot parse age band "${label}" (start token "${start}")`);
  const years = Number(yearMatch[1]);
  const monthsPart = yearMatch[2] ? Number(yearMatch[2]) : 0;
  return { band: `y${years}_${monthsPart}`, lowerMonths: years * 12 + monthsPart };
}

/** "5–10 min" → { minutes: 8, label: "5–10 min" }. "Ongoing" → { minutes: null, label: "Ongoing" }. */
function parseDuration(raw) {
  const trimmed = raw.trim().replace(/\s*min$/i, "").trim();
  if (/^ongoing$/i.test(trimmed)) return { minutes: null, label: "Ongoing" };
  const rangeMatch = trimmed.match(/^(\d+)–(\d+)$/);
  if (rangeMatch) {
    const lo = Number(rangeMatch[1]);
    const hi = Number(rangeMatch[2]);
    return { minutes: Math.round((lo + hi) / 2), label: `${lo}–${hi} min` };
  }
  const single = trimmed.match(/^(\d+)$/);
  if (single) return { minutes: Number(single[1]), label: `${single[1]} min` };
  throw new Error(`cannot parse duration "${raw}"`);
}

// ---------------------------------------------------------------------
// Read + transform
// ---------------------------------------------------------------------
const csvText = readFileSync(CSV_PATH, "utf8");
const table = parseCsv(csvText);
const header = table[0];
const col = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

const activities = [];
const seenIds = new Set();
for (const row of table.slice(1)) {
  if (row.every((c) => c === "")) continue; // trailing blank line
  const title = row[col["Activity Name"]].trim();
  const description = row[col["Description"]].trim();
  const whyItMatters = row[col["Why It Matters"]].trim();
  const howTo = row[col["How To Do It"]].trim();
  const area = row[col["Developmental Area"]].trim();
  const durationRaw = row[col["Duration (min)"]].trim();
  const materials = row[col["Materials Required"]].trim();
  const ageBandLabel = row[col["Age Band"]].trim();
  const source = row[col["Source"]].trim();

  const domain = AREA_TO_DOMAIN[area];
  if (!domain) throw new Error(`unmapped developmental area "${area}" for "${title}"`);

  const { band } = parseAgeBand(ageBandLabel);
  const { minutes, label: durationLabel } = parseDuration(durationRaw);

  const id = `${slug(title)}-${band}`;
  if (seenIds.has(id)) throw new Error(`duplicate activity id "${id}"`);
  seenIds.add(id);

  activities.push({
    id,
    domain,
    age_band: band,
    title,
    why: description,
    duration_minutes: minutes,
    duration_label: durationLabel,
    materials: materials || "None",
    instructions: howTo,
    benefit: whyItMatters,
    source,
  });
}

// ---------------------------------------------------------------------
// Emit: one delete migration, then N insert-batch migrations.
// ---------------------------------------------------------------------
const deleteLines = [
  "-- GENERATED by scripts/gen-activity-library-seed.mjs — do not edit by hand.",
  "--",
  "-- Full content replacement from activity_library_explained_ALL with sources.xlsx",
  `-- (${activities.length} activities, in 20260830070000_activity_library_batch_*.sql).`,
  "-- Most titles changed from the previous content set, so most ids are new;",
  "-- this drops everything not in the new content set, which",
  "-- daily_plans/activity_log tolerate gracefully (ON DELETE SET NULL). Requires",
  "-- 20260830061549_activity_source_column.sql to have already run.",
  "",
  `delete from activities where id not in (${activities.map((a) => q(a.id)).join(", ")});`,
  "",
];
writeFileSync(resolve(root, DELETE_OUT), deleteLines.join("\n"));
console.log(`wrote ${DELETE_OUT}`);

const batchCount = Math.ceil(activities.length / BATCH_SIZE);
for (let i = 0; i < batchCount; i++) {
  const batch = activities.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
  const num = String(i).padStart(2, "0");
  const timestamp = BATCH_BASE_TIMESTAMP + i; // +1 to the seconds digit per batch
  const lines = [
    "-- GENERATED by scripts/gen-activity-library-seed.mjs — do not edit by hand.",
    `-- Batch ${num}/${String(batchCount - 1).padStart(2, "0")} of the activity_library_explained_ALL`,
    "-- with sources.xlsx content replacement. Requires",
    "-- 20260830061600_activity_library_delete_stale.sql to have already run.",
    "",
    "insert into activities (id, domain, age_band, title, why, duration_minutes, duration_label, materials, instructions, benefit, source) values",
    batch
      .map(
        (a) =>
          `  (${q(a.id)}, ${q(a.domain)}::domain, ${q(a.age_band)}::age_band, ${q(a.title)}, ${q(a.why)}, ${a.duration_minutes ?? "null"}, ${q(a.duration_label)}, ${q(a.materials)}, ${q(a.instructions)}, ${q(a.benefit)}, ${q(a.source)})`
      )
      .join(",\n"),
    "on conflict (id) do update set domain = excluded.domain, age_band = excluded.age_band, title = excluded.title, why = excluded.why, duration_minutes = excluded.duration_minutes, duration_label = excluded.duration_label, materials = excluded.materials, instructions = excluded.instructions, benefit = excluded.benefit, source = excluded.source;",
    "",
  ];
  const out = `supabase/migrations/${timestamp}_activity_library_batch_${num}.sql`;
  writeFileSync(resolve(root, out), lines.join("\n"));
  console.log(`wrote ${out} (${batch.length} activities)`);
}

// ---------------------------------------------------------------------
// Coverage report — the invariant swap logic depends on: every
// (age_band, domain) pair needs at least 2 activities.
// ---------------------------------------------------------------------
const bandsInOrder = [];
const seenBands = new Set();
for (const a of activities) {
  if (!seenBands.has(a.age_band)) {
    seenBands.add(a.age_band);
    bandsInOrder.push(a.age_band);
  }
}

const report = {};
for (const b of bandsInOrder) report[b] = Object.fromEntries(DOMAINS.map((d) => [d, 0]));
for (const a of activities) report[a.age_band][a.domain] += 1;

console.log("\nband       motor   comm    cog  social   total");
let anyUnder2 = false;
for (const b of bandsInOrder) {
  const row = report[b];
  const total = DOMAINS.reduce((s, d) => s + row[d], 0);
  console.log(
    b.padEnd(10) + DOMAINS.map((d) => String(row[d]).padStart(7)).join("") + `  ${total}`
  );
  for (const d of DOMAINS) {
    if (row[d] < 2) {
      anyUnder2 = true;
      console.log(`  ! ${b}/${d} has only ${row[d]} — swap has nothing to swap to`);
    }
  }
}
if (!anyUnder2) console.log("\nEvery (band, domain) pair has >= 2 activities — swap is safe everywhere.");
