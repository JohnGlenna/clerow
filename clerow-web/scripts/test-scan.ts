// Standalone check of the AI pipeline (no auth/DB): discover -> query -> detect.
// Run: npx tsx scripts/test-scan.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Load PERPLEXITY_API_KEY from .env.local (tsx doesn't auto-load it).
const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

import { discoverPrompts } from "../lib/scan/discover";
import { PerplexityEngine } from "../lib/engines/perplexity";
import { detectRanking } from "../lib/scan/detect";
import type { BrandProfile } from "../lib/types";

const profile: BrandProfile = {
  url: "warbls.com",
  company: "Warbls",
  industry: "AI music generation",
  description: "An AI tool that generates royalty-free music and songs from text prompts.",
  location: "Kristiansand, Norway",
  audience: ["Content creators", "Indie game devs", "Podcasters"],
  competitors: ["Suno", "Udio", "Soundraw"],
  differentiators: ["Royalty-free", "Made for creators"],
  geos: ["Global"],
  enrichNotes: "We focus on creators who need quick, license-safe background music.",
};

async function main() {
  const t0 = Date.now();
  console.log("1) Discovering prompts…");
  const prompts = await discoverPrompts(profile);
  console.log(`   -> ${prompts.length} prompts. Sample:`);
  for (const p of prompts.slice(0, 6)) {
    console.log(`      [${p.intent}/${p.volume}${p.isPrimary ? " *PRIMARY*" : ""}] ${p.text}`);
  }

  const primary = prompts.find((p) => p.isPrimary) ?? prompts[0];
  console.log(`\n2) Querying Perplexity with primary prompt: "${primary.text}"`);
  const answer = await PerplexityEngine.query(primary.text);
  console.log(`   -> answer (${answer.text.length} chars), ${answer.citations.length} citations`);
  console.log("   ---\n   " + answer.text.slice(0, 400).replace(/\n/g, "\n   ") + "…\n   ---");

  console.log("\n3) Detecting ranked brands…");
  const detection = await detectRanking(answer.text, profile);
  console.log("   Rank  Visibility  Sent  Pos   Brand");
  for (const b of detection.brands) {
    console.log(
      `   #${String(b.rank).padEnd(3)} ${String(b.visibility + "%").padEnd(10)} ${b.sentiment.padEnd(5)} ${String(b.position ?? "—").padEnd(4)} ${b.name}${b.isYou ? "  <-- YOU" : ""}`,
    );
  }
  console.log(
    `\n   You: mentioned=${detection.you.mentioned} visibility=${detection.you.visibility}% position=${detection.you.position ?? "—"}`,
  );
  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
