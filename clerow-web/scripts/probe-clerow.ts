// DB-free 5-model probe for clerow.com. Queries each AI engine live (real web
// search) with buyer prompts and reports whether Clerow is mentioned, which
// competitors are recommended, and which domains get cited — the core scan signal
// without any Supabase writes. Run: npx tsx scripts/probe-clerow.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
}

import { ENGINES } from "../lib/engines";

const PROMPTS = [
  "best GEO tools to get recommended by AI in 2026",
  "best AI visibility tools to track brand mentions in ChatGPT and Perplexity",
  "how do I get my brand recommended by ChatGPT and other AI assistants",
  "what is Clerow and is it good for AI SEO",
];

// Known players in the GEO / AI-visibility space — to surface who the models name.
const COMPETITORS = [
  "Profound", "Otterly", "Peec", "Scrunch", "Athena", "Goodie", "Rankscale",
  "Knowatoa", "Trakkr", "Daydream", "Semrush", "Ahrefs", "Writesonic", "BrandRank",
  "Gauge", "Evertune", "Nightwatch", "SE Ranking",
];

const mentioned = (text: string, name: string) =>
  new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);

function domainsOf(citations: { url: string }[]): string[] {
  const out = new Set<string>();
  for (const c of citations) {
    try { out.add(new URL(c.url).hostname.replace(/^www\./, "")); } catch { /* ignore */ }
  }
  return [...out];
}

async function main() {
  const engines = Object.values(ENGINES).filter((e) => e.enabled);
  console.log("Engines:", engines.map((e) => e.label).join(", "), "\n");

  // matrix[prompt][engine] = clerow mentioned?
  const clerowHits: Record<string, number> = {};

  for (const prompt of PROMPTS) {
    console.log("=".repeat(72));
    console.log("PROMPT:", prompt);
    console.log("=".repeat(72));
    const results = await Promise.all(
      engines.map(async (engine) => {
        try {
          const { text, citations } = await engine.query(prompt);
          return { engine, text, citations };
        } catch (e) {
          return { engine, error: e instanceof Error ? e.message : String(e) };
        }
      }),
    );

    for (const r of results) {
      const tag = r.engine.label.padEnd(11);
      if ("error" in r && r.error) {
        console.log(`  ${tag} ✗ ${r.error}`);
        continue;
      }
      const text = (r as { text: string }).text;
      const citations = (r as { citations: { url: string }[] }).citations || [];
      const hasClerow = mentioned(text, "Clerow");
      clerowHits[r.engine.label] = (clerowHits[r.engine.label] || 0) + (hasClerow ? 1 : 0);
      const comps = COMPETITORS.filter((c) => mentioned(text, c));
      const doms = domainsOf(citations);
      console.log(`  ${tag} Clerow: ${hasClerow ? "✅ NAMED" : "❌ not named"}`);
      console.log(`              competitors named: ${comps.length ? comps.join(", ") : "(none detected)"}`);
      console.log(`              cited domains (${doms.length}): ${doms.slice(0, 8).join(", ") || "(none)"}`);
    }
    console.log("");
  }

  console.log("=".repeat(72));
  console.log("SUMMARY — times Clerow was named (out of", PROMPTS.length, "prompts):");
  for (const engine of engines) {
    console.log(`  ${engine.label.padEnd(11)} ${clerowHits[engine.label] || 0}/${PROMPTS.length}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
