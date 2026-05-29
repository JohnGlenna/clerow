// Live smoke test of every engine adapter. Validates API keys, model ids, and
// web-search tool names by sending one real prompt to each.
// Run: npx tsx scripts/test-engines.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

import { ENGINES } from "../lib/engines";

const PROMPT = "best AI music generation tools for content creators";

async function main() {
  for (const engine of Object.values(ENGINES)) {
    const tag = `${engine.label} (${engine.id})`;
    if (!engine.enabled) {
      console.log(`— ${tag}: disabled (no API key) — skipping`);
      continue;
    }
    const t0 = Date.now();
    try {
      const { text, citations } = await engine.query(PROMPT);
      const ms = Date.now() - t0;
      console.log(
        `✓ ${tag}: ${text.length} chars, ${citations.length} citations, ${ms}ms`,
      );
      console.log(`    "${text.slice(0, 140).replace(/\s+/g, " ")}…"`);
      if (citations[0]) console.log(`    e.g. ${citations[0].url}`);
    } catch (e) {
      console.log(`✗ ${tag}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

main();
