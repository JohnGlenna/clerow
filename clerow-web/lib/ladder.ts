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

// --- The free frontier -------------------------------------------------------
// A non-subscriber may complete all of Level 1 plus the first Level 2 task (the
// "taster") — enough to feel one real structure win — then hits the paywall.
// This is the single source of truth both surfaces (dashboard + MCP) respect.
export const FREE_L2_TASTER = 1; // number of free Level-2 tasks
export function isTaskFree(level: number, indexInLevel: number): boolean {
  if (level <= 1) return true;
  if (level === 2) return indexInLevel < FREE_L2_TASTER;
  return false;
}

// Paywalled tasks are redacted server-side in buildLadder: the specific insight
// (which source to get cited on, which comparison page to publish) is the paid
// product, so the real title/detail/steps/target must never reach a free
// client — the UI blurs these placeholders on top.
const LOCKED_TITLE: Record<number, string> = {
  2: "Locked on-page improvement task",
  3: "Locked citation opportunity",
  4: "Locked competitive content play",
  5: "Locked milestone task",
};
const LOCKED_DETAIL = "Upgrade to Clerow Premium to reveal and complete this task.";

export type LadderTask = {
  key: string; // stable ladder_key (idempotency)
  title: string;
  detail: string;
  meta: string;
  minutes: number;
  xp: number;
  impact: Impact;
  channel: Channel; // onsite (MCP-doable) vs offsite (manual — Clerow drafts the copy)
  steps: string[]; // ordered "what to do" actions for the task modal (may be empty)
  // Paywalled: beyond the free frontier (Level 1 + one Level 2 taster) for a
  // non-subscriber. Locked tasks are never seeded, never actionable, and render
  // as an upgrade preview. Always false for subscribers. Computed in buildLadder.
  locked: boolean;
  // Runtime, attached from existing tasks:
  id: string | null;
  done: boolean;
  // Resolved = done OR skipped(archived) — counts toward level completion so a
  // skipped task still advances the path (it just earns no XP).
  resolved: boolean;
  // The exact page/file this task is about (the user's /robots.txt, their best
  // content page, the suggested slug for a page to create, the third-party
  // domain to get cited on). Null when there's no single target (e.g. l3-reddit).
  targetUrl: string | null;
  targetIsNew: boolean; // targetUrl is a SUGGESTED new page, not an existing one
};

// "open" = a subscriber unlocked this level ahead of finishing the active one:
// its tasks are seeded and visible, but it isn't the highlighted "active" level
// (the earliest incomplete one keeps the Start/mascot nudge for the habit loop).
export type LevelState = "locked" | "active" | "open" | "done";

export type LadderLevel = {
  level: number;
  title: string;
  blurb: string;
  // One-line "what we found" for this level, derived from the brand's real data
  // (audit fails, cited domains, competitors ahead). Shown under the level title.
  findings: string;
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
  url: string; // the brand's site URL (origin source for target-page resolution)
  audit: SiteAudit | null;
  primaryPrompt: { text: string; intent: PromptIntent } | null;
  competitorsAhead: string[];
  sourceGaps: string[]; // third-party domains AI cited
  promptGaps: string[]; // prompt texts not yet won
  // Multi-model consensus signal (optional — absent/1 for single-engine free scans),
  // used to sharpen task copy ("All 5 of your AI models recommend X").
  modelsScanned?: number; // engines that actually ran
  competitorEngines?: Record<string, number>; // competitor name → # models recommending it
  sourceEngines?: Record<string, number>; // cited domain → # models citing it
};

const MIN = (m: number) => (m >= 60 ? `${Math.round(m / 60)} h` : `${m} min`);
const metaFor = (minutes: number, impact: Impact) => `≈ ${MIN(minutes)} · impact: ${impact}`;
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 56);

// Phrase a multi-model consensus signal for task copy. With ≥2 models agreeing it
// reads "All 5 of your AI models <subject>" / "3 of your 5 AI models <subject>";
// otherwise (single-engine free scan, or a one-off mention) the singular fallback.
function consensus(n: number | undefined, total: number | undefined, subject: string, singular: string): string {
  if (n && total && n >= 2) {
    return n >= total ? `All ${total} of your AI models ${subject}` : `${n} of your ${total} AI models ${subject}`;
  }
  return singular;
}

// Where a fix happens, and therefore who can do it:
//   "onsite"  — a file/page on the user's own site → Clerow MCP can ship it (or DIY).
//   "offsite" — a post/listing on a 3rd-party domain (Reddit, G2, a newspaper) →
//               MCP can't post it; Clerow drafts the copy and the user pastes it.
export type Channel = "onsite" | "offsite";

// A task spec before runtime done/id are attached.
type Spec = { key: string; title: string; detail: string; minutes: number; impact: Impact; channel: Channel; steps: string[] };
const spec = (key: string, title: string, detail: string, minutes: number, impact: Impact, channel: Channel = "onsite", steps: string[] = []): Spec => ({
  key,
  title,
  detail,
  minutes,
  impact,
  channel,
  steps,
});

// Which audit checks belong to which level (by SiteCheck.id).
const L1_AUDIT = new Set(["crawlable", "https", "robots-ai", "llms-txt", "title", "h1", "meta-description", "ssr"]);
const L2_AUDIT = new Set(["schema", "schema-honesty", "sitemap"]);

// Turn the audit's failing/warning checks (those carry a `fix`) into specs.
function auditSpecs(audit: SiteAudit | null, ids: Set<string>): Spec[] {
  if (!audit) return [];
  return audit.checks
    .filter((c) => ids.has(c.id) && c.fix)
    .map((c) => spec(`audit-${c.id}`, c.fix!.title, c.fix!.detail, c.fix!.minutes, c.fix!.impact, "onsite", c.fix!.steps));
}

// Level-2 content criteria graded by the AI page-grader (lib/scan/pageGrade.ts),
// keyed by the SAME spec keys as the generic fallbacks below so a full scan turns
// them into page-specific tasks in place. Only failing criteria become tasks.
const L2_CONTENT_IDS = ["l2-answer-first", "l2-h2-queries", "l2-comparison-table", "l2-eeat", "l2-freshness", "l2-claim-consistency"];
function gradedContentSpecs(audit: SiteAudit | null): Spec[] {
  if (!audit) return [];
  return audit.checks
    .filter((c) => L2_CONTENT_IDS.includes(c.id) && c.status !== "pass" && c.fix)
    .map((c) => spec(c.id, c.fix!.title, c.fix!.detail, c.fix!.minutes, c.fix!.impact, "onsite", c.fix!.steps));
}

// If we've never crawled the site, Level 1 still needs content — fall back to the
// universal foundations as prescriptive (self-reported) tasks.
const L1_FALLBACK: Spec[] = [
  spec("audit-robots-ai", "Let AI crawlers read your site", "Create /robots.txt allowing GPTBot, ClaudeBot, PerplexityBot, Google-Extended and OAI-SearchBot with \"Allow: /\". If a bot can't crawl you, it can't cite you.", 10, "medium", "onsite", [
    "Create a `/robots.txt` at your site root (Clerow generates a ready-to-use one below).",
    "Add explicit allow rules for `GPTBot`, `ClaudeBot`, `PerplexityBot` and `Google-Extended`.",
    "Link your sitemap with a `Sitemap:` line.",
    "Re-scan — Clerow confirms all 5 crawlers can reach your key pages.",
  ]),
  spec("audit-llms-txt", "Add an AI-readable map of your site (llms.txt)", "Publish /llms.txt: a short plain-text summary of what you do, who it's for, and links to your key pages — a sitemap written for language models.", 15, "medium", "onsite", [
    "Create a `/llms.txt` at your site root (Clerow generates a ready-to-use one below).",
    "Lead with a one-line summary of what you do and who it's for.",
    "List your strongest pages — home, pricing, comparison, FAQ — each with a one-line description.",
    "Re-scan to confirm models pick it up.",
  ]),
  spec("audit-h1", "Add one clear headline for your homepage", "Give your homepage one H1 that states, in plain words, what you do — engines use it as the page's headline claim.", 10, "medium", "onsite", [
    "Add one `<h1>` near the top of your homepage.",
    "State, in plain words, what you do — not a clever slogan.",
    "Make sure there's only one `<h1>`; demote any others to `<h2>`.",
    "Re-scan to confirm.",
  ]),
  spec("audit-meta-description", "Write the one-line summary AI shows for your site", "Add a 120–160 character meta description that summarizes the page in a sentence an engine could quote.", 10, "low", "onsite", [
    "Add a `<meta name=\"description\">` tag to your homepage `<head>`.",
    "Write 120–160 characters summarizing the page in one quotable sentence.",
    "Include the core thing you do and who it's for.",
    "Re-scan to confirm.",
  ]),
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
  // Generic content specs — the fallback when the AI page-grade hasn't run yet.
  const generic: Spec[] = [
    spec(
      "l2-answer-first",
      "Lead your key page with a direct answer",
      `Open the page${q ? ` targeting "${q}"` : ""} with a standalone, factual answer in the first 40–120 words, and make the H1/title match it. Answer-first pages are what engines lift into a recommendation.`,
      20,
      "high",
      "onsite",
      [
        q ? `Find the page that should win "${q}".` : "Pick the page that should rank for your main buyer query.",
        "Write a standalone, factual answer in the first 40–120 words — no preamble.",
        "Make the H1 and title match that answer.",
        "Re-scan to see if engines start lifting it.",
      ],
    ),
    spec(
      "l2-h2-queries",
      "Add subheadings that match how buyers ask",
      "Break the page into H2/H3 sections phrased the way real buyers ask (\"How does it work?\", \"Best for…\", \"Pricing\"). Descriptive headings make your content extractable.",
      20,
      "medium",
      "onsite",
      [
        "Pull your top buyer questions from the Prompts tab.",
        "Add an `<h2>`/`<h3>` for each, phrased exactly how buyers ask it.",
        "Answer each question in the first sentence under its heading.",
        "Re-scan to confirm the sections are extractable.",
      ],
    ),
    spec(
      "l2-comparison-table",
      "Add an honest comparison table",
      "Add a clean feature table comparing you to the obvious alternatives (price, platforms, who each is best for). Engines heavily favor tabular data for \"vs\" and \"best\" queries.",
      30,
      "high",
      "onsite",
      [
        "List yourself against your 2–3 obvious alternatives.",
        "Use honest, specific rows: pricing, key features, who each is best for.",
        "Build it as real HTML `<table>` markup — not an image.",
        "Re-scan to check \"vs\" and \"best\" queries.",
      ],
    ),
    spec(
      "l2-eeat",
      "Add author credentials and first-hand proof",
      "Add an author byline with credentials, a first-hand note (\"we tested…\"/\"we built…\"), one or two quotable stats with named sources, and disclose any affiliations — the E-E-A-T signals AI rewards.",
      30,
      "high",
      "onsite",
      [
        "Add an author byline with real credentials to your key page.",
        "Add a first-hand note (\"we tested…\", \"we built…\") with a concrete number.",
        "Cite 1–2 quotable stats with named, linked sources; disclose any affiliations.",
        "Re-scan to confirm the trust signals land.",
      ],
    ),
    spec(
      "l2-freshness",
      "Show a visible \"Last updated\" date",
      "Add a visible \"Last updated\" date to your key pages and refresh them regularly. Perplexity especially favors recent content — stale pages quietly lose their citations.",
      10,
      "low",
      "onsite",
      [
        "Add a visible \"Last updated\" date to your key pages.",
        "Mark it up with `dateModified` in your schema.",
        "Keep it honest — update it when you actually edit the page.",
        "Re-scan to confirm freshness is detected.",
      ],
    ),
  ];
  // Prefer the AI page-grader's page-specific findings; else the generic specs.
  const graded = gradedContentSpecs(ctx.audit);
  const content = graded.length ? graded : generic;
  return [...auditSpecs(ctx.audit, L2_AUDIT), ...content];
}

function level3(ctx: LadderContext): Spec[] {
  const fromSources = ctx.sourceGaps
    .slice(0, 4)
    .map((d) =>
      spec(
        `l3-source-${slug(d)}`,
        `Get ${ctx.company} cited on ${d}`,
        `${consensus(ctx.sourceEngines?.[d], ctx.modelsScanned, `cite ${d}`, `AI cited ${d}`)} when answering your prompts. Earn a presence there — a listing, a review, or a substantive contribution — to enter the model's source set.`,
        d.includes("reddit") ? 20 : 30,
        "high",
        "offsite",
      ),
    );
  // Always-available authority moves so Level 3 is never empty.
  const evergreen: Spec[] = [
    spec("l3-reddit", "Answer buyers' questions in the right communities", "Find threads where buyers ask what you solve — on Reddit, Quora, or a niche forum — and write genuinely useful answers (no link-drops). These community posts are among the most-cited sources, especially by Perplexity.", 15, "high", "offsite"),
    spec("l3-directory", `Claim and fill ${ctx.company}'s G2 / Capterra listing`, "Claim your directory profiles, complete every field, and gather a few recent reviews — AI quotes these directly for \"best\" queries.", 30, "high", "offsite"),
    spec("l3-entity", `Make ${ctx.company} a recognized entity`, "Create or round out a Wikidata and Crunchbase entry, and add Organization JSON-LD with sameAs links to your profiles. This disambiguates your brand so AI engines treat you as a known, distinct entity.", 30, "medium", "offsite"),
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
        `${consensus(ctx.competitorEngines?.[comp], ctx.modelsScanned, `recommend ${comp} ahead of you`, `AI currently leads with ${comp}`)}. A dedicated, honest comparison page — feature table, "who each is best for", migration notes — is the single asset most likely to win you these queries.`,
        45,
        "very high",
      ),
    );
  }
  for (const p of ctx.promptGaps.slice(0, 2)) {
    out.push(spec(`l4-prompt-${slug(p)}`, `Win the search "${p}"`, `Ship a focused page that answers "${p}" directly and names ${ctx.company} as a top option, then get it cited. This is how you enter the answer for a query you don't win yet.`, 45, "very high"));
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

// Total number of levels in the climb — used to unlock the whole ladder at once
// (e.g. a Premium MCP user, who gets the full climb without the dashboard's
// progressive unlock).
export const LADDER_DEPTH = LEVEL_META.length;

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
    channel: s.channel,
    steps: s.steps,
    locked: false, // overridden per-level in buildLadder when the caller is free
    id: e?.id ?? null,
    done: e?.done ?? false,
    resolved: e?.resolved ?? e?.done ?? false,
    targetUrl: null, // attached in buildLadder (needs the context)
    targetIsNew: false,
  };
}

// --- target-page resolution ---------------------------------------------------
// Name the exact URL a task is about, so neither the user nor a calling agent
// has to guess which page "your key page" means. Pure derivation from the key +
// context; null when there's no single target.

function originOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).origin;
  } catch {
    return null;
  }
}

const COMPARE_PAGE_RE = /\/(vs|compare|alternativ)/i;

// The crawled page most likely to be "the key page" for the primary prompt:
// best keyword overlap with the prompt, else the first crawled key page (the
// crawl already orders pricing/features/compare/faq first), else the homepage.
function bestContentPage(ctx: LadderContext): string | null {
  const crawl = ctx.audit?.crawl;
  const home = crawl?.home?.url ?? ctx.audit?.url ?? null;
  const pages = crawl?.pages ?? [];
  const words = (ctx.primaryPrompt?.text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
  let best: string | null = null;
  let bestScore = 0;
  for (const p of pages) {
    const hay = `${p.url} ${p.title ?? ""}`.toLowerCase();
    const score = words.filter((w) => hay.includes(w)).length;
    if (score > bestScore) {
      best = p.url;
      bestScore = score;
    }
  }
  return best ?? pages[0]?.url ?? home;
}

// An existing comparison-style page, if the crawl/sitemap shows one.
function existingComparePage(ctx: LadderContext): string | null {
  const crawl = ctx.audit?.crawl;
  return (
    crawl?.pages.find((p) => COMPARE_PAGE_RE.test(p.url))?.url ??
    crawl?.sitemapUrls.find((u) => COMPARE_PAGE_RE.test(u)) ??
    null
  );
}

function resolveTargetUrl(key: string, ctx: LadderContext): { url: string; create?: boolean } | null {
  const origin = originOf(ctx.audit?.url ?? ctx.url);
  const home = ctx.audit?.crawl?.home?.url ?? (origin ? `${origin}/` : null);

  // Level-1/2 audit fixes: the exact file, else the homepage the check read.
  if (key === "audit-robots-ai") return origin ? { url: `${origin}/robots.txt` } : null;
  if (key === "audit-llms-txt") return origin ? { url: `${origin}/llms.txt` } : null;
  if (key === "audit-sitemap") return origin ? { url: `${origin}/sitemap.xml` } : null;
  if (key.startsWith("audit-") || key === "l2-freshness") return home ? { url: home } : null;

  // Level-2 content work targets the brand's best page for the primary prompt.
  if (key === "l2-comparison-table") {
    const existing = existingComparePage(ctx);
    if (existing) return { url: existing };
    const comp = ctx.competitorsAhead[0];
    return origin && comp ? { url: `${origin}/compare/${slug(ctx.company)}-vs-${slug(comp)}`, create: true } : null;
  }
  if (key.startsWith("l2-")) {
    // The AI page-grader reads the HOMEPAGE — when this task came from a graded
    // check, that's the page the finding is about. Only the generic fallback
    // specs (no graded check yet) target the best-matching content page.
    if (ctx.audit?.checks.some((c) => c.id === key)) return home ? { url: home } : null;
    const best = bestContentPage(ctx);
    return best ? { url: best } : null;
  }

  // Level-3 offsite: the third-party domain itself (matched back from the key's
  // slug — the spec keys are `l3-source-${slug(domain)}`).
  if (key.startsWith("l3-source-")) {
    const suffix = key.slice("l3-source-".length);
    const domain = ctx.sourceGaps.find((d) => slug(d) === suffix);
    return domain ? { url: `https://${domain}` } : null;
  }

  // Level-4 cornerstones: an existing vs-page ABOUT THIS RIVAL if there is one,
  // else a suggested slug for the page to create. Any-vs-page matching would
  // aim the task (and its content brief) at the wrong competitor's URL.
  if (key.startsWith("l4-compare-")) {
    const suffix = key.slice("l4-compare-".length);
    const comp = ctx.competitorsAhead.find((c) => slug(c) === suffix);
    const compSlug = comp ? slug(comp) : suffix;
    const stem = compSlug.split("-")[0];
    const aboutRival = (u: string) => {
      const lower = u.toLowerCase();
      return COMPARE_PAGE_RE.test(u) && (lower.includes(compSlug) || (stem.length >= 4 && lower.includes(stem)));
    };
    const crawl = ctx.audit?.crawl;
    const existing = crawl?.pages.find((p) => aboutRival(p.url))?.url ?? crawl?.sitemapUrls.find(aboutRival) ?? null;
    if (existing) return { url: existing };
    return origin && comp ? { url: `${origin}/compare/${slug(ctx.company)}-vs-${compSlug}`, create: true } : null;
  }
  if (key.startsWith("l4-prompt-")) {
    const suffix = key.slice("l4-prompt-".length);
    const prompt = ctx.promptGaps.find((p) => slug(p) === suffix);
    return origin && prompt ? { url: `${origin}/blog/${slug(prompt)}`, create: true } : null;
  }
  if (key === "l4-howto") {
    return origin && ctx.primaryPrompt ? { url: `${origin}/blog/${slug(ctx.primaryPrompt.text)}`, create: true } : null;
  }

  return null; // no single target (l3-reddit, l3-directory, l3-entity, l5-rescan)
}

// A one-line "what we found" for a level, from the brand's real data. Reflects the
// remaining work so it reads as a finding ("3 gaps…") that resolves as tasks close.
function levelFinding(level: number, ctx: LadderContext, remaining: number): string {
  const n = remaining;
  switch (level) {
    case 1:
      return !ctx.audit
        ? "Scan your site to check the basics AI needs to read you."
        : n > 0
          ? `${n} technical ${n === 1 ? "gap" : "gaps"} keeping AI from trusting you.`
          : "Your technical foundations look solid.";
    case 2:
      return n > 0
        ? `${n} on-page ${n === 1 ? "improvement" : "improvements"} to make your pages quotable.`
        : "Your key pages are structured for AI to quote.";
    case 3:
      return ctx.sourceGaps.length > 0
        ? `AI cites ${ctx.sourceGaps.length} ${ctx.sourceGaps.length === 1 ? "source" : "sources"} you're not on yet.`
        : "Build authority on the sites AI already trusts.";
    case 4:
      return ctx.competitorsAhead.length > 0
        ? `Ranked behind ${ctx.competitorsAhead[0]}${ctx.competitorsAhead.length > 1 ? ` +${ctx.competitorsAhead.length - 1} more` : ""} for your top query.`
        : "Win the buyer queries you don't own yet.";
    default:
      return "Re-scan to measure your climb across all 5 models.";
  }
}

// Build the full ladder and resolve each level's state from the brand's existing
// ladder tasks (keyed by ladder_key). A level with no tasks (e.g. a clean audit)
// counts as complete so the user advances.
// `unlockedThrough` is the highest level a subscriber has manually unlocked (0 =
// none). Incomplete levels at or below it render as "open" (tasks visible) rather
// than "locked", letting subscribers jump ahead without finishing earlier levels.
// Default 0 preserves the strict sequential behavior (e.g. the MCP caller).
// `subscribed` (default true) gates the per-task `locked` flag to the free
// frontier (Level 1 + one Level 2 taster) — false marks everything beyond it
// paywalled, which is what keeps the active L2 level from advancing for a free
// user (the taster never completes the level, so L3+ stay locked).
export function buildLadder(
  ctx: LadderContext,
  existing: Map<string, { id: string; done: boolean; resolved: boolean }>,
  unlockedThrough = 0,
  subscribed = true,
): Ladder {
  const built = LEVEL_META.map((meta, i) => {
    const level = i + 1;
    const tasks = meta.build(ctx).map((s, ti) => {
      const t = toTask(s, existing);
      t.locked = !subscribed && !isTaskFree(level, ti);
      // Name the exact page/file the task is about, in the structured field and
      // the human detail, so no surface has to guess "your key page".
      const target = resolveTargetUrl(s.key, ctx);
      if (target) {
        t.targetUrl = target.url;
        t.targetIsNew = target.create ?? false;
        t.detail = `${t.detail} Target: ${target.url}${target.create ? " (create this page)" : ""}`;
      }
      // Redact paywalled tasks (resolved ones keep their real title — the user
      // already did that work). The done/resolved match above ran on the real
      // key, and ensureLadderTasks never seeds locked tasks, so the placeholder
      // key never reaches the DB. Even the key is swapped: slugs like
      // "l3-source-ahrefs-com" leak the insight on their own.
      if (t.locked && !t.resolved) {
        t.key = `locked-l${level}-${ti + 1}`;
        t.title = LOCKED_TITLE[level] ?? "Locked task";
        t.detail = LOCKED_DETAIL;
        t.steps = [];
        t.targetUrl = null;
        t.targetIsNew = false;
      }
      return t;
    });
    const total = tasks.length;
    // Completion counts resolved (done or skipped); progress shown to the user.
    const doneCount = tasks.filter((t) => t.resolved).length;
    const findings = levelFinding(level, ctx, total - doneCount);
    return { level, title: meta.title, blurb: meta.blurb, findings, tasks, total, doneCount };
  });

  const isComplete = (l: { total: number; doneCount: number }) => l.total === 0 || l.doneCount === l.total;
  const activeIdx = built.findIndex((l) => !isComplete(l));

  const levels: LadderLevel[] = built.map((l, i) => {
    let state: LevelState;
    if (activeIdx === -1 || isComplete(l)) state = "done";
    else if (i === activeIdx) state = "active";
    else state = l.level <= unlockedThrough ? "open" : "locked";
    return { ...l, state };
  });

  return { levels, currentLevel: activeIdx === -1 ? built.length : activeIdx + 1 };
}

// A conservative, clearly-estimated AI-visibility upside from the still-locked
// (paywalled) tasks — the "finish the climb for ~+N%" carrot at the wall. Weights
// each unresolved locked task by impact and scales the total into a modest percent,
// capped so it always reads as a credible estimate rather than a promise. Returns
// the overall estimate plus a per-level breakdown (level → estimated % points).
const IMPACT_WEIGHT: Record<Impact, number> = { low: 1, medium: 2, high: 4, "very high": 6 };
export type LockedGain = { overall: number; byLevel: Record<number, number> };
export function projectLockedGain(ladder: Ladder): LockedGain {
  const byLevel: Record<number, number> = {};
  let totalWeight = 0;
  for (const l of ladder.levels) {
    let w = 0;
    for (const t of l.tasks) if (t.locked && !t.resolved) w += IMPACT_WEIGHT[t.impact];
    if (w > 0) {
      // ~1.5 percentage points per impact-weight, level capped at 12 and overall at 35.
      byLevel[l.level] = Math.min(12, Math.round(w * 1.5));
      totalWeight += w;
    }
  }
  return { overall: Math.min(35, Math.round(totalWeight * 1.5)), byLevel };
}

// Insert missing tasks (by ladder_key) for every ACTIVE or OPEN level — i.e. the
// active level plus any a subscriber unlocked ahead. Never seeds locked or
// completed levels, preserving the anti-flood guarantee for the default path.
// Paywalled tasks (t.locked — beyond a free user's frontier) are also skipped, so
// a non-subscriber's only seeded tasks are Level 1 + the one Level 2 taster.
// Returns inserted rows.
export async function ensureLadderTasks(
  db: DB,
  brandId: string,
  ladder: Ladder,
  existingKeys: Set<string>,
): Promise<TaskRow[]> {
  const rows = ladder.levels
    .filter((l) => l.state === "active" || l.state === "open")
    .flatMap((l) =>
      l.tasks
        .filter((t) => !t.locked && !existingKeys.has(t.key))
        .map((t) => ({
          brand_id: brandId,
          title: t.title,
          meta: t.meta,
          xp: t.xp,
          impact: t.impact,
          source: "ladder",
          level: l.level,
          ladder_key: t.key,
        })),
    );
  if (rows.length === 0) return [];

  const { data, error } = await db.from("tasks").insert(rows).select();
  if (error) throw new Error(`Failed to seed ladder tasks: ${error.message}`);
  return data ?? [];
}

// Rewrite already-seeded ladder tasks in place when a re-scan changed their spec
// (matched by stable ladder_key). This is what makes a full scan visibly update
// tasks — e.g. a generic "Lead with a direct answer" becomes the AI page-grader's
// page-specific version. Only writes rows whose title/meta/impact actually changed.
export async function refreshLadderTaskContent(
  db: DB,
  ladder: Ladder,
  rows: { id: string; ladder_key: string | null; title: string; meta: string; impact: string; xp?: number }[],
): Promise<number> {
  const specByKey = new Map<string, LadderTask>();
  for (const l of ladder.levels) for (const t of l.tasks) specByKey.set(t.key, t);

  const changed = rows.filter((r) => {
    if (!r.ladder_key) return false;
    const t = specByKey.get(r.ladder_key);
    // Never write a locked spec back: a churned subscriber's seeded rows would
    // otherwise get their real titles overwritten with redaction placeholders.
    if (!t || t.locked) return false;
    // xp rides along with impact: a re-scan that upgrades a task's impact must
    // also upgrade the XP the row awards, or list_tasks (spec xp) and
    // complete_task (row xp) drift apart.
    return t.title !== r.title || t.meta !== r.meta || t.impact !== r.impact || (r.xp !== undefined && t.xp !== r.xp);
  });
  await Promise.all(
    changed.map((r) => {
      const t = specByKey.get(r.ladder_key as string)!;
      return db.from("tasks").update({ title: t.title, meta: t.meta, impact: t.impact, xp: t.xp }).eq("id", r.id);
    }),
  );
  return changed.length;
}
