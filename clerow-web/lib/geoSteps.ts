// GEO action-step generation.
//
// Given a single prompt and (optionally) the brand's latest scan result for it,
// produce the concrete, specific steps a founder should take to start getting
// recommended by AI for that query. These are the "pointers with meaning" the
// dashboard surfaces — each one can be turned into a real, XP-bearing quest.
//
// Pure and deterministic: no AI call, no I/O. The same inputs always yield the
// same steps, which keeps the detail drawer instant and makes this safe to
// expose later through the Clerow MCP so an agent can read a prompt's playbook
// and act on it in the user's codebase.

import type { PromptIntent } from "./supabase/database.types";
import { schemaLabel } from "./geoFrameworks";

export type GeoStep = {
  // Stable id so "Add as quest" is idempotent and the UI can mark added ones.
  id: string;
  title: string;
  detail: string;
  minutes: number;
  xp: number;
  impact: "low" | "medium" | "high" | "very high";
};

export type GeoStepContext = {
  prompt: { text: string; intent: PromptIntent };
  company: string;
  // Competitor brand names ranked ABOVE the user for this prompt (most to least
  // prominent). Empty when unscanned or when the user already leads.
  competitorsAhead: string[];
  // Bare domains the engine cited in its answer (e.g. "g2.com", "reddit.com").
  citedDomains: string[];
  // The user's position for this prompt (1-based), or null if not recommended.
  yourPosition: number | null;
  scanned: boolean;
};

// Domains the user almost certainly already controls — never suggest "get cited
// on your own blog". We can't know the user's domain here without plumbing it
// through, so the caller passes citedDomains already filtered to third parties.
const MINUTES_LABEL = (m: number) => (m >= 60 ? `${Math.round(m / 60)} h` : `${m} min`);

export function impactXp(impact: GeoStep["impact"]): number {
  return { low: 15, medium: 35, high: 60, "very high": 120 }[impact];
}

// Short human label used as a task's `meta` line, matching the rest of the app.
export function stepMeta(step: GeoStep): string {
  return `≈ ${MINUTES_LABEL(step.minutes)} · impact: ${step.impact}`;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

export function buildGeoSteps(ctx: GeoStepContext): GeoStep[] {
  const steps: GeoStep[] = [];
  const { prompt, company, competitorsAhead, citedDomains, yourPosition } = ctx;
  const topRival = competitorsAhead[0];
  const q = prompt.text;

  const push = (s: Omit<GeoStep, "id">, idHint: string) =>
    steps.push({ id: slug(`${idHint}-${s.title}`), ...s });

  // 1) Intent-specific cornerstone action — the highest-leverage page to ship.
  switch (prompt.intent) {
    case "compare":
      if (topRival) {
        push(
          {
            title: `Publish a comparison page: ${company} vs ${topRival}`,
            detail: `AI answers to "${q}" currently lead with ${topRival}. A dedicated /compare/${slug(
              company,
            )}-vs-${slug(
              topRival,
            )} page — honest feature table, "who each is best for", migration notes — is the single asset most likely to get you cited for this query.`,
            minutes: 90,
            xp: impactXp("very high"),
            impact: "very high",
          },
          "compare-page",
        );
      } else {
        push(
          {
            title: `Publish an "alternatives" page for "${q}"`,
            detail: `Create a page that frames ${company} against the other named options for this query. AI models pull comparison phrasing almost verbatim from pages structured as honest, side-by-side comparisons.`,
            minutes: 90,
            xp: impactXp("very high"),
            impact: "very high",
          },
          "alternatives-page",
        );
      }
      break;
    case "solution":
      push(
        {
          title: `Create a focused landing page targeting "${q}"`,
          detail: `Build a page whose H1 and first paragraph answer "${q}" directly, naming ${company} as a top option. Lead with the use-case, not features. This is what models quote when recommending tools for this need.`,
          minutes: 60,
          xp: impactXp("high"),
          impact: "high",
        },
        "solution-page",
      );
      break;
    case "problem":
      push(
        {
          title: `Publish a how-to guide answering "${q}"`,
          detail: `Write a genuinely useful guide that solves "${q}", with ${company} as the natural tool to do it. Problem-aware content is how you enter the consideration set before buyers even know your category.`,
          minutes: 75,
          xp: impactXp("high"),
          impact: "high",
        },
        "howto-guide",
      );
      break;
    case "branded":
      push(
        {
          title: `Strengthen your answer for "${q}"`,
          detail: `For branded queries, AI leans on your own site plus third-party reviews. Add an FAQ and a clear "what ${company} is / who it's for" section so models describe you accurately instead of guessing.`,
          minutes: 30,
          xp: impactXp("medium"),
          impact: "medium",
        },
        "branded-faq",
      );
      break;
  }

  // 1.5) E-E-A-T credibility — the content-quality signals AI engines reward on
  // any page, drawn from the CORE-EEAT benchmark (Experience/Expertise/Authority/
  // Trust). Cheap relative to its impact and applies whatever the intent.
  push(
    {
      title: `Add first-hand experience and author credentials for "${q}"`,
      detail: `AI engines cite pages that signal real expertise. On the page targeting this query, add an author byline with credentials, a first-hand note ("we tested…" / "we built…"), one or two quotable stats with named sources, and disclose any affiliations. That makes ${company} read as a trustworthy source instead of generic marketing — and it's exactly what models lift into an answer.`,
      minutes: 40,
      xp: impactXp("high"),
      impact: "high",
    },
    "eeat-credibility",
  );

  // 2) Source gaps — the most actionable lever. Get cited where the engine
  // already looks. One step per cited third-party domain (capped).
  for (const domain of citedDomains.slice(0, 3)) {
    push(
      {
        title: `Get ${company} cited on ${domain}`,
        detail: `The AI cited ${domain} when answering "${q}". Earning a presence there — a listing, a review, or a substantive contribution — puts you directly in the model's source set for this prompt.`,
        minutes: domain.includes("reddit") ? 20 : 30,
        xp: impactXp("high"),
        impact: "high",
      },
      `source-${domain}`,
    );
  }

  // 3) Structured data — cheap, compounding, applies to every prompt. The schema
  // set is chosen from the buyer intent (schema decision tree) so the markup
  // matches the page you'd ship for this query.
  push(
    {
      title: `Add an FAQ section answering "${q}"`,
      detail: `Add a Q&A block that answers this exact phrasing on the most relevant page, marked up with ${schemaLabel(
        prompt.intent,
      )} JSON-LD. Structured Q&A and matching schema are among the easiest things for an answer engine to lift directly into a recommendation, and they feed your brand entity into the model's knowledge graph.`,
      minutes: 25,
      xp: impactXp("medium"),
      impact: "medium",
    },
    "faq-schema",
  );

  // 4) Close the loop — re-scan to measure movement and keep the streak.
  push(
    {
      title: yourPosition ? `Re-scan to track movement on "${q}"` : `Re-scan "${q}" after shipping`,
      detail: yourPosition
        ? `You're currently #${yourPosition} for this prompt. Re-scan after your changes land and re-crawl (allow ~1–2 weeks) to confirm the work moved the needle.`
        : `You don't appear for this prompt yet. Ship the steps above, then re-scan to see ${company} enter the results.`,
      minutes: 2,
      xp: impactXp("low"),
      impact: "low",
    },
    "rescan",
  );

  return steps;
}
