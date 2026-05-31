// Shared GEO/AEO knowledge — the single source the runtime draws from so the
// content generator and the action-step playbook stay grounded in the same
// frameworks instead of drifting apart.
//
// Distilled from two benchmarks installed as Claude Code skills (see
// `.claude/skills/geo-seo-expert` and the aaron-he-zhu suite):
//   • CORE-EEAT — 8 content-quality dimensions that drive whether a single page
//     gets cited by AI answer engines (Contextual clarity, Organization,
//     Referenceability, Exclusivity + Experience, Expertise, Authority, Trust).
//   • CITE — domain-level trust signals (Citation, Identity, Trust, Eminence).
//
// Pure constants and small pure helpers: no I/O, no AI calls. Safe to import
// anywhere, including the deterministic geoSteps playbook and (later) the Clerow
// MCP, where an agent reads this to act in the user's codebase.

import type { PromptIntent } from "./supabase/database.types";

// --- CORE-EEAT: what makes a single page get cited by AI --------------------

// The eight content-quality dimensions, expressed as actionable writing
// principles. The first four (CORE) drive extractability/citation; the last four
// (EEAT) drive credibility.
export const CORE_EEAT_PRINCIPLES = [
  "Contextual clarity: open with a direct, standalone answer in the first 40–120 words, and make the title/H1 match exactly what the page delivers.",
  "Organization: structure for extraction — descriptive H2/H3s that mirror how buyers phrase the question, short paragraphs, bullet lists, comparison tables, and numbered how-tos.",
  "Referenceability: make statements quotable — specific numbers, dates and percentages, each tied to a named source, and never contradicting each other across the page.",
  "Exclusivity: include something only this brand can say — original data, first-hand testing, a named methodology, or a genuinely unique angle.",
  "Experience: write from first-hand use (\"we tested…\", real examples and screenshots), not abstract description.",
  "Expertise: show depth and correctness — define terms precisely and demonstrate real command of the domain.",
  "Authority: add an author byline with credentials, expert quotes with attribution, and links out to recognized sources.",
  "Trust: disclose any affiliation or sponsorship, keep every figure consistent, serve over HTTPS, and stay even-handed about competitors.",
] as const;

// Hard "do not ship" rules — the CORE-EEAT/CITE veto items in plain language.
// A page that breaks any of these is treated as low-trust by both search and AI.
export const GEO_VETO_RULES = [
  "Never write a title or H1 that promises more than the page delivers — clickbait caps trust.",
  "Always disclose affiliate links, sponsorships, or paid placements clearly and up front.",
  "Never let numbers, prices, or claims contradict each other across the page.",
] as const;

// Concrete, copy-ready GEO writing tactics that raise citation odds.
export const GEO_WRITING_TACTICS = [
  'Definitions: use "[Term] is [category] that [primary function], [key characteristic]." in 25–50 words so it can stand alone as the answer an engine lifts.',
  "Quotable statistics: pair an exact number with its source and context (timeframe or comparison) — specific figures act as high-confidence anchors AI cites to avoid hallucinating.",
  'Comparisons: phrase differences as "Unlike [A], [B] [specific difference], which means [implication]." — engines reward even-handed, side-by-side framing.',
  "Freshness: show a visible \"Last updated\" date and lean on data from roughly the last two years (Perplexity especially favors recency).",
] as const;

// --- Schema.org mapping: the right structured data per buyer intent ----------

export type SchemaRecommendation = { primary: string; add: string[] };

// Mapped from the schema decision tree (SaaS/product-leaning defaults, since
// that's Clerow's typical customer). Keyed by the prompt's buyer intent so a
// recommendation is always derivable from data the playbook already has.
const SCHEMA_BY_INTENT: Record<PromptIntent, SchemaRecommendation> = {
  compare: { primary: "Article", add: ["FAQPage", "Product", "BreadcrumbList"] },
  solution: { primary: "SoftwareApplication", add: ["Product", "Offer", "FAQPage"] },
  problem: { primary: "HowTo", add: ["Article", "FAQPage"] },
  branded: { primary: "Organization", add: ["WebSite", "FAQPage", "sameAs"] },
};

export function schemaForIntent(intent: PromptIntent): SchemaRecommendation {
  return SCHEMA_BY_INTENT[intent];
}

// Human-readable "PrimarySchema + Add1, Add2" label for step copy and prompts.
export function schemaLabel(intent: PromptIntent): string {
  const { primary, add } = schemaForIntent(intent);
  return [primary, ...add].join(" + ");
}

// --- Composers for LLM system prompts ---------------------------------------

// Renders the CORE-EEAT principles, tactics, and veto rules as a guidelines
// block to splice into a content-writer system prompt. Keeping the text here
// (not inline in the prompt) is what keeps generated content and the playbook
// consistent — both read from this module.
export function geoWritingGuidelines(): string {
  return [
    "Ground every piece in these GEO content principles (what makes AI answer engines cite a page):",
    ...CORE_EEAT_PRINCIPLES.map((p) => `- ${p}`),
    "",
    "Apply these concrete tactics:",
    ...GEO_WRITING_TACTICS.map((t) => `- ${t}`),
    "",
    "Never violate these trust rules:",
    ...GEO_VETO_RULES.map((r) => `- ${r}`),
  ].join("\n");
}
