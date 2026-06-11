// Deterministic, ~80%-shippable drafts for the Level-3 OFFSITE tasks (pitch a
// cited source, answer in communities, claim a directory, become an entity).
// No LLM call — pure templating over the brand profile + scan signal, so the
// MCP can hand an agent something ready to send rather than advice. Anything
// the template can't know is an explicit `<find: …>` slot the agent (or the
// user) fills; we never invent contact names, subreddits, or stats.

import type { BrandProfile } from "../types";

export type OffsiteDraftInput = {
  brand: BrandProfile;
  primaryPrompt?: string;
  // Consensus signal: domain → # of scanned models citing it, and how many ran.
  sourceEngines?: Record<string, number>;
  modelsScanned?: number;
  competitorsAhead?: string[];
  targetUrl?: string | null; // for l3-source-*: https://<the cited domain>
};

const oneLine = (s: string, max = 160): string => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

// "3 of the 5 major AI models cite soundguys.com" / "AI assistants cite …".
function consensusHook(domain: string, input: OffsiteDraftInput): string {
  const n = input.sourceEngines?.[domain];
  const total = input.modelsScanned;
  if (n && total && n >= 2) {
    return n >= total
      ? `all ${total} major AI models (ChatGPT, Claude, Perplexity, Gemini, Grok) cite ${domain}`
      : `${n} of the ${total} major AI models we track cite ${domain}`;
  }
  return `AI assistants cite ${domain}`;
}

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function diffBullets(brand: BrandProfile): string {
  const ds = brand.differentiators?.filter(Boolean) ?? [];
  return ds.length
    ? ds.map((d) => `- ${d}`).join("\n")
    : `- <find: your 2–3 strongest, specific differentiators — concrete numbers beat adjectives>`;
}

function sourcePitch(domain: string, input: OffsiteDraftInput): string {
  const { brand, primaryPrompt } = input;
  const ask = domain.includes("reddit")
    ? "a genuinely useful answer in the right thread (see the community task for the no-link-drop rules)"
    : `inclusion in your next roundup or an honest review — we'll provide a full-access review account and any assets you need`;
  return [
    `**To:** <find: the editor/reviews contact — check https://${domain}/about, /contact, or the byline of their latest roundup>`,
    `**Subject:** ${brand.company} — a ${brand.industry || "product"} your readers ask AI about`,
    "",
    `Hi <find: name>,`,
    "",
    `I'm <find: your name and role> at ${brand.company} (${brand.url}). ${oneLine(brand.description || "<find: one-sentence description>", 200)}`,
    "",
    `Why I'm writing to you specifically: when buyers ask AI assistants questions like "${primaryPrompt ?? "<find: your main buyer question>"}", ${consensusHook(domain, input)} as a source for the answer — and ${brand.company} isn't part of your coverage yet.`,
    "",
    `What makes us worth a look:`,
    diffBullets(brand),
    "",
    `The ask: ${ask}.`,
    "",
    `Happy to send a demo account, screenshots, pricing details, or answer anything directly. No pressure either way — thanks for the work you put into the space.`,
    "",
    `<find: your name>`,
    `${brand.company} — ${brand.url}`,
  ].join("\n");
}

function redditPlan(input: OffsiteDraftInput): string {
  const { brand, primaryPrompt } = input;
  const q = primaryPrompt ?? "<find: your main buyer question>";
  const comps = input.competitorsAhead?.slice(0, 2).join(", ");
  return [
    `### 1. Find the live threads (don't invent them — search):`,
    "",
    `- \`site:reddit.com "${q}"\``,
    `- \`site:reddit.com ${brand.industry || brand.company} recommendations\``,
    comps ? `- \`site:reddit.com ${comps} alternative\` (buyers comparing the brands AI ranks above you)` : "",
    `- Also try the same searches on Quora and any niche forum your buyers use.`,
    "",
    `Pick 2–3 threads that are recent (or still get replies) and where the question is genuinely what ${brand.company} solves.`,
    "",
    `### 2. Answer skeleton (adapt per thread — never paste verbatim into several):`,
    "",
    `> Disclosure: I work on ${brand.company}, so take this with that in mind.`,
    `>`,
    `> <answer the thread's ACTUAL question first, concretely and tool-agnostically — 2–4 sentences of real help>`,
    `>`,
    `> For the <use-case> part specifically: that's what we built ${brand.company} for — ${oneLine(brand.description || "<find: one-liner>", 140)} <one honest limitation or "X is a better fit if …"> Happy to answer questions.`,
    "",
    `### Rules (these decide whether the post earns citations or gets removed):`,
    `- Disclose the affiliation every time; subreddits and AI engines both punish stealth marketing.`,
    `- Lead with the helpful answer, not the product. One mention, no link unless someone asks.`,
    `- Name a real limitation — even-handed answers are the ones that survive and get cited.`,
  ].join("\n");
}

function directoryListing(input: OffsiteDraftInput): string {
  const { brand } = input;
  return [
    `### Pre-filled listing copy (G2 / Capterra — paste into the claim form):`,
    "",
    `- **Product name:** ${brand.company}`,
    `- **Website:** ${brand.url}`,
    `- **Category:** ${brand.industry || "<find: the closest G2/Capterra category — search their category list>"}`,
    `- **One-liner (~160 chars):** ${oneLine(brand.description || "<find: what it is, for whom, and the concrete outcome>")}`,
    `- **Audience:** ${brand.audience?.length ? brand.audience.join(", ") : "<find: who it's for>"}`,
    "",
    `**Feature highlights:**`,
    diffBullets(brand),
    "",
    `### Steps:`,
    `- Claim the profile: https://www.g2.com/products (search "${brand.company}" — claim it before someone else categorizes you) and https://www.capterra.com/vendors`,
    `- Fill EVERY field — completeness is a ranking factor on the directories AI quotes.`,
    `- Ask 3–5 recent happy customers for a review (link them straight to the review form).`,
  ].join("\n");
}

function entityKit(input: OffsiteDraftInput): string {
  const { brand } = input;
  const host = hostOf(brand.url) ?? brand.url;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.company,
    url: brand.url,
    description: oneLine(brand.description || "", 250) || undefined,
    sameAs: [
      "<find: your LinkedIn company page URL>",
      "<find: your Crunchbase profile URL once created>",
      "<find: your X/GitHub/other official profile URLs>",
    ],
  };
  return [
    `### Wikidata (https://www.wikidata.org/wiki/Special:NewItem):`,
    `- **Label:** ${brand.company}`,
    `- **Description:** ${oneLine(brand.description || "<find: one neutral, encyclopedic sentence>", 120)}`,
    `- **instance of (P31):** software company / business (pick the closest)`,
    `- **official website (P856):** ${brand.url}`,
    brand.location ? `- **headquarters location (P159):** ${brand.location}` : `- **headquarters location (P159):** <find: city>`,
    "",
    `### Crunchbase (https://www.crunchbase.com — "Add a company"):`,
    `- Name, website, industry (${brand.industry || "<find>"}), description (reuse the Wikidata one), founder names, founding year.`,
    "",
    `### Organization JSON-LD for ${host} (add to the homepage <head>):`,
    "",
    "```html",
    `<script type="application/ld+json">`,
    JSON.stringify(jsonLd, null, 2),
    `</script>`,
    "```",
    "",
    `Fill the sameAs slots with the REAL profile URLs once they exist — consistent cross-references are what make AI engines treat ${brand.company} as one unambiguous entity.`,
  ].join("\n");
}

// The deterministic draft for an offsite ladder task, keyed by its ladder_key.
// Null for keys that aren't offsite templates (caller falls back to the brief).
export function buildOffsiteDraft(key: string, input: OffsiteDraftInput): string | null {
  if (key.startsWith("l3-source-")) {
    const domain = hostOf(input.targetUrl);
    return domain ? sourcePitch(domain, input) : null;
  }
  if (key === "l3-reddit") return redditPlan(input);
  if (key === "l3-directory") return directoryListing(input);
  if (key === "l3-entity") return entityKit(input);
  return null;
}
