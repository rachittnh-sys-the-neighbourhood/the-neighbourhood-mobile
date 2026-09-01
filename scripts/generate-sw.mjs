/**
 * Stamps scripts/sw-source.js with a per-deploy version and writes it to
 * dist/sw.js. The version is what busts old caches on activate() — see
 * sw-source.js — so it must change every deploy: Vercel sets
 * VERCEL_GIT_COMMIT_SHA during the build, which is a natural fit; a
 * timestamp is the fallback for a local `expo export`.
 *
 * Runs as part of the Vercel build — see vercel.json.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(here, "sw-source.js");
const DIST_DIR = resolve(here, "../dist");
const OUT = resolve(DIST_DIR, "sw.js");

if (!existsSync(DIST_DIR)) {
  console.error(`[generate-sw] ${DIST_DIR} not found — did expo export run?`);
  process.exit(1);
}

const version = process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now());
const source = readFileSync(SOURCE, "utf8");
writeFileSync(OUT, source.replaceAll("__SW_VERSION__", version));

console.log(`[generate-sw] wrote ${OUT} (version ${version})`);
