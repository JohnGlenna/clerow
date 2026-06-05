// Pre-publish quality gate for "Make content" — the eval pass that stops a draft
// shipping blind. After the writer produces a draft, a cheap judge model scores it
// against the same CORE-EEAT principles + veto rules the writer was told to follow
// (lib/geoFrameworks.ts), so the score is grounded in the exact spec, not a vibe.
//
// Bounded COGS by design: one judge call per generation (a small/fast model), and
// the caller does at most ONE revision when the draft falls below the bar. The
// writer routes are already subscriber-gated, so this never runs for free users.

import { CORE_EEAT_PRINCIPLES, GEO_VETO_RULES, GEO_WRITING_TACTICS } from "../geoFrameworks";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
// A small, fast model is plenty for scoring against a fixed rubric — keep the
// gate cheap so it can run on every generation. Independently overridable.
const JUDGE_MODEL = process.env.CONTENT_JUDGE_MODEL || "claude-haiku-4-5-20251001";

// Drafts at or above this score ship as-is; below it (or a veto break) the caller
// runs one revision. 0–100.
export const QUALITY_BAR = 72;

export type ContentScore = {
  score: number; // 0–100, overall citation-readiness
  passedVeto: boolean; // false if any hard "do not ship" rule is broken
  verdict: string; // one-line plain-language summary
  issues: string[]; // concrete, actionable fixes (empty when clean)
};

function anthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return key;
}

const JUDGE_SYSTEM =
  "You are a strict GEO/AEO content quality reviewer. You score a FINISHED draft on how likely AI answer engines " +
  "(ChatGPT, Claude, Perplexity, Gemini) are to cite it, against a fixed rubric. You are concise and honest — a weak " +
  "draft must score low. Reply with ONLY a JSON object, no prose, no markdown fences.";

function judgePrompt(draft: string): string {
  return [
    "Score this draft from 0–100 on citation-readiness, judged against these principles:",
    ...CORE_EEAT_PRINCIPLES.map((p) => `- ${p}`),
    "",
    "Reward these concrete tactics when present:",
    ...GEO_WRITING_TACTICS.map((t) => `- ${t}`),
    "",
    "These are hard veto rules — if the draft breaks ANY, set passedVeto to false:",
    ...GEO_VETO_RULES.map((r) => `- ${r}`),
    "",
    "Penalize: bracketed placeholders, vague filler, invented/unverifiable specifics, contradictory numbers, missing structure (no clear answer-first opening, no headings/lists where they'd help).",
    "",
    "Return EXACTLY this JSON shape:",
    '{ "score": <int 0-100>, "passedVeto": <true|false>, "verdict": "<one short sentence>", "issues": ["<up to 5 concrete, specific fixes; empty array if none>"] }',
    "",
    "DRAFT:",
    "<<<",
    draft.slice(0, 12000),
    ">>>",
  ].join("\n");
}

// Score a generated draft. One non-streaming judge call. On any failure (API,
// parse) returns a permissive pass so a flaky judge never blocks shipping content.
export async function scoreContent(draft: string): Promise<ContentScore> {
  const fallback: ContentScore = { score: QUALITY_BAR, passedVeto: true, verdict: "", issues: [] };
  if (!draft.trim()) return fallback;
  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey(),
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        max_tokens: 512,
        system: JUDGE_SYSTEM,
        messages: [{ role: "user", content: judgePrompt(draft) }],
      }),
    });
    if (!res.ok) return fallback;
    const json = await res.json();
    const raw: string = json?.content?.[0]?.text ?? "";
    const parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
    if (!Number.isFinite(score)) return fallback;
    return {
      score,
      passedVeto: parsed.passedVeto !== false,
      verdict: typeof parsed.verdict === "string" ? parsed.verdict.slice(0, 200) : "",
      issues: Array.isArray(parsed.issues) ? parsed.issues.filter((i: unknown): i is string => typeof i === "string").slice(0, 5) : [],
    };
  } catch {
    return fallback;
  }
}

// Does this score warrant the (single) revision pass?
export function needsRevision(s: ContentScore): boolean {
  return !s.passedVeto || s.score < QUALITY_BAR;
}

// Turn a failing score into a revision note spliced into the writer's next pass
// (see FixContentInput.revisionNote). Names the exact gaps so the rewrite is
// targeted, not a blind re-roll.
export function revisionNote(s: ContentScore): string {
  const lines = [
    `The previous draft scored ${s.score}/100 on citation-readiness${s.passedVeto ? "" : " and broke a trust/veto rule"}. Rewrite it to fix these specific problems while keeping everything that was already good:`,
    ...s.issues.map((i) => `- ${i}`),
  ];
  return lines.join("\n");
}
