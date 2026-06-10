// Founder-outreach engine: DB-free multi-model scan of PROSPECT brands.
// For each prospect URL it (1) builds a brand profile from their own homepage
// (enrichFromUrl), (2) discovers the buyer prompts their customers actually ask
// (discoverPrompts), (3) asks every enabled AI engine those prompts live, and
// (4) runs the LLM-judge (detectRanking) to see whether the prospect — or their
// competitors — got recommended. Output: outreach/<host>.md with the scan
// matrix plus a drafted personalized cold email using the real numbers.
//
// Run:  npx tsx scripts/prospect-probe.ts <url> [<url> ...]
//       npx tsx scripts/prospect-probe.ts --file prospects.txt   (one URL per line, # comments ok)
// Opts: --prompts N   buyer prompts per prospect (default 3)
//
// No Supabase, no prod writes — needs only the model API keys in .env.local.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
}

import { ENGINES } from "../lib/engines";
import { enrichFromUrl } from "../lib/scan/enrich";
import { discoverPrompts } from "../lib/scan/discover";
import { detectRanking } from "../lib/scan/detect";
import type { BrandProfile, RankedBrand } from "../lib/types";

const OUT_DIR = join(here, "..", "..", "outreach");

type CellResult = {
  prompt: string;
  engine: string;
  mentioned: boolean;
  position: number | null;
  top: RankedBrand[]; // top recommended brands (excluding "you" at 0%)
  error?: string;
};

function parseArgs(argv: string[]) {
  const urls: string[] = [];
  let promptCount = 3;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") {
      const lines = readFileSync(argv[++i], "utf8").split("\n");
      for (const l of lines) {
        const t = l.trim();
        if (t && !t.startsWith("#")) urls.push(t);
      }
    } else if (a === "--prompts") {
      promptCount = Math.max(1, Number(argv[++i]) || 3);
    } else if (!a.startsWith("--")) {
      urls.push(a);
    }
  }
  return { urls, promptCount };
}

const hostOf = (url: string) =>
  url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0];

function competitorLeaderboard(cells: CellResult[]): { name: string; hits: number }[] {
  const counts = new Map<string, number>();
  for (const c of cells) {
    for (const b of c.top) {
      if (b.visibility <= 0) continue;
      counts.set(b.name, (counts.get(b.name) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, hits]) => ({ name, hits }))
    .sort((a, b) => b.hits - a.hits);
}

function draftEmail(
  brand: BrandProfile,
  cells: CellResult[],
  prompts: string[],
  engineLabels: string[],
): string {
  const ok = cells.filter((c) => !c.error);
  const mentions = ok.filter((c) => c.mentioned).length;
  const leaders = competitorLeaderboard(ok).filter((l) => l.name !== brand.company).slice(0, 3);
  const leaderNames = leaders.map((l) => l.name);
  const primary = prompts[0];
  const topCompetitor = leaderNames[0] || "your competitors";

  const subject =
    mentions === 0
      ? `AI assistants recommend ${topCompetitor} to your buyers — not ${brand.company}`
      : `${brand.company} shows up in ${mentions} of ${ok.length} AI answers your buyers see`;

  const competitorLine = leaderNames.length
    ? `${leaderNames.join(", ")} ${leaderNames.length > 1 ? "were" : "was"} recommended instead.`
    : `Other brands were recommended instead.`;

  const body = [
    `Hi {{first name}},`,
    ``,
    `We asked ${engineLabels.join(", ")} the questions your buyers actually ask — like "${primary}".`,
    ``,
    `${brand.company} came up in ${mentions} of ${ok.length} answers. ${competitorLine}`,
    ``,
    `Full per-model breakdown below — these are live answers from this week, not estimates. ` +
      `More buyers start product research in ChatGPT/Perplexity every month, so this gap compounds quietly.`,
    ``,
    `I run Clerow (clerow.com). We track exactly this and turn the gaps into a short daily fix-list ` +
      `(content, schema, listings) so the models start naming you. If it's useful, the scan of ` +
      `${hostOf(brand.url)} is free to re-run anytime: https://clerow.com`,
    ``,
    `Happy to send the raw answers if you want to see what the models say verbatim.`,
    ``,
    `— John`,
  ].join("\n");

  return `**Subject:** ${subject}\n\n${body}`;
}

function reportMarkdown(
  brand: BrandProfile,
  prompts: string[],
  cells: CellResult[],
  engineLabels: string[],
): string {
  const ok = cells.filter((c) => !c.error);
  const mentions = ok.filter((c) => c.mentioned).length;
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `# ${brand.company} — AI visibility probe (${date})`,
    ``,
    `- **Site:** ${brand.url}`,
    `- **Category:** ${brand.industry}`,
    `- **Result:** named in **${mentions} of ${ok.length}** answers (${cells.length - ok.length} engine errors)`,
    ``,
    `## Scan matrix`,
    ``,
  ];

  for (const prompt of prompts) {
    lines.push(`### "${prompt}"`, ``);
    lines.push(`| Engine | ${brand.company}? | Recommended brands |`);
    lines.push(`|---|---|---|`);
    for (const c of cells.filter((x) => x.prompt === prompt)) {
      if (c.error) {
        lines.push(`| ${c.engine} | ⚠️ error | ${c.error} |`);
        continue;
      }
      const you = c.mentioned ? `✅${c.position ? ` (#${c.position})` : ""}` : "❌";
      const tops = c.top.slice(0, 4).map((b) => b.name).join(", ") || "(none)";
      lines.push(`| ${c.engine} | ${you} | ${tops} |`);
    }
    lines.push(``);
  }

  const leaders = competitorLeaderboard(ok).slice(0, 8);
  if (leaders.length) {
    lines.push(`## Who the models recommend instead`, ``);
    for (const l of leaders) {
      lines.push(`- **${l.name}** — recommended in ${l.hits} of ${ok.length} answers`);
    }
    lines.push(``);
  }

  lines.push(`## Draft outreach email`, ``, draftEmail(brand, cells, prompts, engineLabels), ``);
  lines.push(`---`, `_Generated by scripts/prospect-probe.ts — live answers, no estimates._`, ``);
  return lines.join("\n");
}

async function probeProspect(url: string, promptCount: number): Promise<void> {
  const engines = Object.values(ENGINES).filter((e) => e.enabled);
  const host = hostOf(url);
  console.log("=".repeat(72));
  console.log(`PROSPECT: ${host}`);
  console.log("=".repeat(72));

  const enriched = await enrichFromUrl(url.startsWith("http") ? url : `https://${url}`);
  const brand: BrandProfile = {
    url: url.startsWith("http") ? url : `https://${url}`,
    company: enriched.company,
    industry: enriched.industry,
    description: enriched.description,
    location: "",
    audience: [],
    competitors: enriched.competitors,
    differentiators: [],
    geos: [],
    enrichNotes: "",
  };
  console.log(`  ${brand.company} — ${brand.industry}`);

  const discovered = await discoverPrompts(brand);
  const prompts = [...discovered]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
    .slice(0, promptCount)
    .map((p) => p.text);
  console.log(`  prompts: ${prompts.map((p) => `"${p}"`).join(" | ")}`);

  const cells: CellResult[] = [];
  for (const prompt of prompts) {
    const results = await Promise.all(
      engines.map(async (engine) => {
        try {
          const { text } = await engine.query(prompt);
          const det = await detectRanking(text, brand);
          return {
            prompt,
            engine: engine.label,
            mentioned: det.you.mentioned,
            position: det.you.position,
            top: det.brands.filter((b) => !b.isYou),
          } satisfies CellResult;
        } catch (e) {
          return {
            prompt,
            engine: engine.label,
            mentioned: false,
            position: null,
            top: [],
            error: e instanceof Error ? e.message : String(e),
          } satisfies CellResult;
        }
      }),
    );
    for (const r of results) {
      const mark = r.error ? `✗ ${r.error}` : r.mentioned ? "✅ NAMED" : "❌ not named";
      console.log(`    ${r.engine.padEnd(11)} ${mark}`);
    }
    cells.push(...results);
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `${host}.md`);
  writeFileSync(outPath, reportMarkdown(brand, prompts, cells, engines.map((e) => e.label)));
  const mentions = cells.filter((c) => !c.error && c.mentioned).length;
  const okCount = cells.filter((c) => !c.error).length;
  console.log(`  → named in ${mentions}/${okCount} answers. Report: outreach/${host}.md\n`);
}

async function main() {
  const { urls, promptCount } = parseArgs(process.argv.slice(2));
  if (!urls.length) {
    console.error("Usage: npx tsx scripts/prospect-probe.ts <url> [...] | --file prospects.txt [--prompts N]");
    process.exit(1);
  }
  const engineCount = Object.values(ENGINES).filter((e) => e.enabled).length;
  console.log(
    `Probing ${urls.length} prospect(s) × ${promptCount} prompts × ${engineCount} engines ` +
      `(~${urls.length * promptCount * engineCount * 2} model calls incl. detection)\n`,
  );
  for (const url of urls) {
    try {
      await probeProspect(url, promptCount);
    } catch (e) {
      console.error(`  ✗ ${url} failed:`, e instanceof Error ? e.message : e, "\n");
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
