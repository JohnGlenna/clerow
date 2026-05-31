// "The Climb" — the leveled task ladder that drives the dashboard.
//
// Replaces the flat flood of identical quests with a Duolingo-style path: five
// levels, easiest/quickest first, each unlocking the next. Only the ACTIVE
// level's tasks are ever written to the `tasks` table (see ensureLadderTasks),
// which is what removes the overwhelm — locked levels are previewed, not seeded.
//
// Level sources:
//   1 Foundations        — site-audit fails (robots.txt, llms.txt, H1, title, meta, HTTPS)
//   2 On-page & structure — audit (schema/sitemap) + CORE-EEAT writing tasks (geoFrameworks)
//   3 Authority & citations — the third-party domains AI already cites (sourceGaps)
//   4 Win the queries     — comparison/how-to cornerstones (throttled — the old flood, gated)
//   5 Measure & repeat    — re-scan, which regenerates the ladder from fresh data
//
// Pure/deterministic like geoSteps: buildLadder takes data in and returns the
// shape; the only side effect lives in ensureLadderTasks.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TaskRow, PromptIntent } from "./supabase/database.types";
import { impactXp, type GeoStep } from "./geoSteps";
import type { SiteAudit } from "./audit/site";

type DB = SupabaseClient<Database>;
type Impact = GeoStep["impact"];

export type LadderTask = {
  key: string; // stable ladder_key (idempotency)
  title: string;
  detail: string;
  meta: string;
  minutes: number;
  xp: number;
  impact: Impact;
  // Runtime, attached from existing tasks:
  id: string | null;
  done: boolean;
  // Resolved = done OR skipped(archived) — counts toward level completion so a
  // skipped task still advances the path (it just earns no XP).
  resolved: boolean;
};

export type LevelState = "locked" | "active" | "done";

export type LadderLevel = {
  level: number;
  title: string;
  blurb: string;
  state: LevelState;
  tasks: LadderTask[];
  doneCount: number;
  total: number;
};

export type Ladder = {
  levels: LadderLevel[];
  currentLevel: number; // the active level (or the last level if all are complete)
};

export type LadderContext = {
  company: string;
  audit: SiteAudit | null;
  primaryPrompt: { text: string; intent: PromptIntent } | null;
  competitorsAhead: string[];
  sourceGaps: string[]; // third-party domains AI cited
  promptGaps: string[]; // prompt texts not yet won
};

const MIN = (m: number) => (m >= 60 ? `${Math.round(m / 60)} h` : `${m} min`);
const metaFor = (minutes: number, impact: Impact) => `≈ ${MIN(minutes)} · impact: ${impact}`;
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 56);

// A task spec before runtime done/id are attached.
type Spec = { key: string; title: string; detail: string; minutes: number; impact: Impact };
const spec = (key: string, title: string, detail: string, minutes: number, impact: Impact): Spec => ({
  key,
  title,
  detail,
  minutes,
  impact,
});

// Which audit checks belong to which level (by SiteCheck.id).
const L1_AUDIT = new Set(["crawlable", "https", "robots-ai", "llms-txt", "title", "h1", "meta-description"]);
const L2_AUDIT = new Set(["schema", "sitemap"]);

// Turn the audit's failing/warning checks (those carry a `fix`) into specs.
function auditSpecs(audit: SiteAudit | null, ids: Set<string>): Spec[] {
  if (!audit) return [];
  return audit.checks
    .filter((c) => ids.has(c.id) && c.fix)
    .map((c) => spec(`audit-${c.id}`, c.fix!.title, c.fix!.detail, c.fix!.minutes, c.fix!.impact));
}

// If we've never crawled the site, Level 1 still needs content — fall back to the
// universal foundations as prescriptive (self-reported) tasks.
const L1_FALLBACK: Spec[] = [
  spec("audit-robots-ai", "Add a robots.txt that allows AI crawlers", "Create /robots.txt allowing GPTBot, ClaudeBot, PerplexityBot, Google-Extended and OAI-SearchBot with \"Allow: /\". If a bot can't crawl you, it can't cite you.", 10, "medium"),
  spec("audit-llms-txt", "Add an llms.txt file", "Publish /llms.txt: a short plain-text summary of what you do, who it's for, and links to your key pages — a sitemap written for language models.", 15, "medium"),
  spec("audit-h1", "Add a single clear H1", "Give your homepage one H1 that states, in plain words, what you do — engines use it as the page's headline claim.", 10, "medium"),
  spec("audit-meta-description", "Add a meta description", "Add a 120–160 character meta description that summarizes the page in a sentence an engine could quote.", 10, "low"),
];

function level1(ctx: LadderContext): Spec[] {
  // The 4 highest-leverage, FREE quick wins for getting read & cited by AI, in
  // priority order (GEO playbook): be crawlable → allow AI bots → llms.txt →
  // one clear H1 → title → meta. Surface only the top 4 detected gaps so the free
  // tier feels like fast, focused wins (the rest carry into later levels).
  const fromAudit = auditSpecs(ctx.audit, L1_AUDIT);
  if (ctx.audit) return fromAudit.slice(0, 4);
  return L1_FALLBACK.slice(0, 4);
}

function level2(ctx: LadderContext): Spec[] {
  const q = ctx.primaryPrompt?.text;
  const content: Spec[] = [
    spec(
      "l2-answer-first",
      "Lead your key page with a direct answer",
      `Open the page${q ? ` targeting "${q}"` : ""} with a standalone, factual answer in the first 40–120 words, and make the H1/title match it. Answer-first pages are what engines lift into a recommendation.`,
      20,
      "high",
    ),
    spec(
      "l2-h2-queries",
      "Add H2s that mirror how buyers ask",
      "Break the page into H2/H3 sections phrased the way real buyers ask (\"How does it work?\", \"Best for…\", \"Pricing\"). Descriptive headings make your content extractable.",
      20,
      "medium",
    ),
    spec(
      "l2-comparison-table",
      "Add an honest comparison table",
      "Add a clean feature table comparing you to the obvious alternatives (price, platforms, who each is best for). Engines heavily favor tabular data for \"vs\" and \"best\" queries.",
      30,
      "high",
    ),
    spec(
      "l2-eeat",
      "Add author credentials and first-hand proof",
      "Add an author byline with credentials, a first-hand note (\"we tested…\"/\"we built…\"), one or two quotable stats with named sources, and disclose any affiliations — the E-E-A-T signals AI rewards.",
      30,
      "high",
    ),
  ];
  return [...auditSpecs(ctx.audit, L2_AUDIT), ...content];
}

function level3(ctx: LadderContext): Spec[] {
  const fromSources = ctx.sourceGaps
    .slice(0, 4)
    .map((d) =>
      spec(
        `l3-source-${slug(d)}`,
        `Get ${ctx.company} cited on ${d}`,
        `AI cited ${d} when answering your prompts. Earn a presence there — a listing, a review, or a substantive contribution — to enter the model's source set.`,
        d.includes("reddit") ? 20 : 30,
        "high",
      ),
    );
  // Always-available authority moves so Level 3 is never empty.
  const evergreen: Spec[] = [
    spec("l3-reddit", "Answer a relevant question on Reddit", "Find a thread where buyers ask what you solve and write a genuinely useful answer (no link-drops). Reddit is one of the most-cited sources, especially by Perplexity.", 15, "high"),
    spec("l3-directory", `Claim and fill ${ctx.company}'s G2 / Capterra listing`, "Claim your directory profiles, complete every field, and gather a few recent reviews — AI quotes these directly for \"best\" queries.", 30, "high"),
  ];
  return [...fromSources, ...evergreen].slice(0, 6);
}

function level4(ctx: LadderContext): Spec[] {
  const out: Spec[] = [];
  // Throttle: only the top 2 comparison pages here (the rest live on the Prompts
  // page) — this is the flood the old dashboard dumped all at once.
  for (const comp of ctx.competitorsAhead.slice(0, 2)) {
    out.push(
      spec(
        `l4-compare-${slug(comp)}`,
        `Publish a comparison page: ${ctx.company} vs ${comp}`,
        `AI currently leads with ${comp}. A dedicated, honest comparison page — feature table, "who each is best for", migration notes — is the single asset most likely to win you these queries.`,
        45,
        "very high",
      ),
    );
  }
  for (const p of ctx.promptGaps.slice(0, 2)) {
    out.push(spec(`l4-prompt-${slug(p)}`, `Win the query "${p}"`, `Ship a focused page that answers "${p}" directly and names ${ctx.company} as a top option, then get it cited. This is how you enter the answer for a query you don't win yet.`, 45, "very high"));
  }
  if (ctx.primaryPrompt && out.length < 4) {
    const q = ctx.primaryPrompt.text;
    out.push(spec("l4-howto", `Publish a how-to guide answering "${q}"`, `Write a genuinely useful guide that solves "${q}" with ${ctx.company} as the natural tool — problem-aware content puts you in the consideration set early.`, 60, "high"));
  }
  return out;
}

function level5(ctx: LadderContext): Spec[] {
  return [
    spec(
      "l5-rescan",
      `Re-scan ${ctx.company || "your site"} to measure your climb`,
      "You've shipped real improvements — re-scan to see how your AI visibility moved (allow ~1–2 weeks for engines to re-crawl). A fresh scan also generates your next ladder.",
      2,
      "low",
    ),
  ];
}

const LEVEL_META: { title: string; blurb: string; build: (c: LadderContext) => Spec[] }[] = [
  { title: "Foundations", blurb: "Quick technical wins so AI can find and trust you.", build: level1 },
  { title: "On-page & structure", blurb: "Make your key pages easy for AI to quote.", build: level2 },
  { title: "Authority & citations", blurb: "Get cited where the AI engines already look.", build: level3 },
  { title: "Win the queries", blurb: "Ship the pages that win you the big buyer questions.", build: level4 },
  { title: "Measure & repeat", blurb: "Re-scan, see your gains, and unlock the next climb.", build: level5 },
];

function toTask(s: Spec, existing: Map<string, { id: string; done: boolean; resolved: boolean }>): LadderTask {
  const e = existing.get(s.key);
  return {
    key: s.key,
    title: s.title,
    detail: s.detail,
    meta: metaFor(s.minutes, s.impact),
    minutes: s.minutes,
    xp: impactXp(s.impact),
    impact: s.impact,
    id: e?.id ?? null,
    done: e?.done ?? false,
    resolved: e?.resolved ?? e?.done ?? false,
  };
}

// Build the full ladder and resolve each level's state from the brand's existing
// ladder tasks (keyed by ladder_key). A level with no tasks (e.g. a clean audit)
// counts as complete so the user advances.
export function buildLadder(
  ctx: LadderContext,
  existing: Map<string, { id: string; done: boolean; resolved: boolean }>,
): Ladder {
  const built = LEVEL_META.map((meta, i) => {
    const tasks = meta.build(ctx).map((s) => toTask(s, existing));
    const total = tasks.length;
    // Completion counts resolved (done or skipped); progress shown to the user.
    const doneCount = tasks.filter((t) => t.resolved).length;
    return { level: i + 1, title: meta.title, blurb: meta.blurb, tasks, total, doneCount };
  });

  const isComplete = (l: { total: number; doneCount: number }) => l.total === 0 || l.doneCount === l.total;
  const activeIdx = built.findIndex((l) => !isComplete(l));

  const levels: LadderLevel[] = built.map((l, i) => ({
    ...l,
    state: activeIdx === -1 ? "done" : i < activeIdx ? "done" : i === activeIdx ? "active" : "locked",
  }));

  return { levels, currentLevel: activeIdx === -1 ? built.length : activeIdx + 1 };
}

// Insert the ACTIVE level's missing tasks (by ladder_key). Never seeds locked or
// completed levels — that's the whole anti-flood guarantee. Returns inserted rows.
export async function ensureLadderTasks(
  db: DB,
  brandId: string,
  ladder: Ladder,
  existingKeys: Set<string>,
): Promise<TaskRow[]> {
  const active = ladder.levels.find((l) => l.state === "active");
  if (!active) return [];
  const toInsert = active.tasks.filter((t) => !existingKeys.has(t.key));
  if (toInsert.length === 0) return [];

  const { data, error } = await db
    .from("tasks")
    .insert(
      toInsert.map((t) => ({
        brand_id: brandId,
        title: t.title,
        meta: t.meta,
        xp: t.xp,
        impact: t.impact,
        source: "ladder",
        level: active.level,
        ladder_key: t.key,
      })),
    )
    .select();
  if (error) throw new Error(`Failed to seed ladder tasks: ${error.message}`);
  return data ?? [];
}
