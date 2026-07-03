// Throwaway E2E check for the LLM email writer — run: npx tsx scripts/test-prospect-email.ts
import "./_loadenv";

import { runProspectScan } from "../lib/prospect/scan";

async function main() {
  const result = await runProspectScan({
    brand: "Breel Social",
    website: "https://breelsocial.no",
    language: "no",
  });

  console.warn("=== MENTIONED ===", `${result.mentionedCount}/${result.totalPrompts}`);
  console.warn("\n=== COMPETITOR LEADERBOARD ===");
  for (const c of result.competitors) console.warn(`  ${c.name}: ${c.mentions}`);
  console.warn("\n=== PER-ANSWER ===");
  for (const a of result.answers) {
    console.warn(`  Q: ${a.prompt}`);
    console.warn(`    competitors: ${a.competitors.join(", ") || "-"}`);
    console.warn(`    tools: ${a.otherMentions?.join(", ") || "-"}`);
  }
  console.warn("\n=== EMAIL SUBJECT ===\n" + result.email.subject);
  console.warn("\n=== EMAIL BODY ===\n" + result.email.body);
}

void main();
