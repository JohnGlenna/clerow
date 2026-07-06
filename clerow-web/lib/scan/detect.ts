import { perplexityChat, parseJsonLoose } from "../perplexity/client";
import type { BrandProfile, Detection, RankedBrand } from "../types";
import type { BrandSentiment } from "../supabase/database.types";

// Turn an engine's prose recommendation answer into the ranked brand table
// (Step 2). LLM-as-judge: extract every brand/product recommended, order by
// prominence, estimate a visibility share (0–100, roughly summing to 100),
// sentiment, and position. Locate the user's brand — usually absent.

const SENTIMENTS: BrandSentiment[] = ["pos", "neut", "neg", "warn"];

const SCHEMA = {
  type: "object",
  properties: {
    brands: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          domain: { type: ["string", "null"] },
          isYou: { type: "boolean" },
          visibility: { type: "number" },
          sentiment: { type: "string", enum: SENTIMENTS },
          position: { type: ["number", "null"] },
        },
        required: ["name", "visibility", "sentiment"],
      },
    },
  },
  required: ["brands"],
};

type RawBrand = {
  name: string;
  domain?: string | null;
  isYou?: boolean;
  visibility?: number;
  sentiment?: string;
  position?: number | null;
};

// "https://www.Salesforce.com/crm" or "Salesforce.com" → "salesforce.com".
// Null unless it looks like a bare host, so a hallucinated sentence can't leak in.
function cleanDomain(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const host = v.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
}

function coerceSentiment(v: unknown): BrandSentiment {
  return typeof v === "string" && (SENTIMENTS as string[]).includes(v)
    ? (v as BrandSentiment)
    : "neut";
}

// Loose brand-name key ("Suno", "suno!" → "suno"). Shared with the snapshot's
// competitor aggregation so the same brand spelled differently dedupes the
// same way in detection and on the leaderboard.
export function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Canonical grouping key for cross-engine competitor aggregation. Different
// engines name the same product differently — "Scrunch" vs "Scrunch AI",
// "Writesonic GEO" vs "Writesonic", "SEMrush GEO (AI Toolkit)" vs "Semrush",
// "SE Ranking / SE Visible" vs "SE Ranking (AI Overviews Tracker)" — and
// without a resolved domain each variant became its own leaderboard row.
// Strips parenthetical qualifiers, "/"-alternatives, and generic trailing
// tokens; single-word names are never trimmed ("AthenaHQ" stays itself).
const GENERIC_TAIL = new Set(["ai", "io", "app", "hq", "geo", "seo", "tool", "tools", "toolkit", "platform", "software", "suite"]);
export function canonicalBrandKey(s: string): string {
  const words = s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .split("/")[0]
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  while (words.length > 1 && GENERIC_TAIL.has(words[words.length - 1])) words.pop();
  return words.join("") || norm(s);
}

export async function detectRanking(
  answer: string,
  brand: BrandProfile,
  signal?: AbortSignal,
): Promise<Detection> {
  const { content } = await perplexityChat({
    model: "sonar",
    temperature: 0,
    jsonSchema: SCHEMA,
    signal,
    messages: [
      {
        role: "system",
        content:
          "You analyze an AI assistant's answer to a buyer's question and extract the brands/products " +
          "it recommends. Return every distinct brand/product named, ranked by how prominently it is " +
          "recommended (most prominent first). For each, give: a 'visibility' score 0–100 reflecting its " +
          "share of the recommendation (the scores across all brands should roughly sum to 100), a " +
          "'sentiment' (pos/neut/neg), and 'position' = the order in which the answer presents its " +
          "recommendations: the first brand it recommends is 1, the second is 2, the third is 3, and so " +
          "on — never give two brands the same position (null if only mentioned in passing). " +
          "Set isYou=true ONLY for the user's brand. " +
          "If the user's brand is NOT recommended in the answer, do not invent it — just omit it. " +
          "Only include brands the answer text explicitly names; never infer a brand from the " +
          "question, the user's identity, or your own knowledge. " +
          "Also give 'domain' = the brand's primary website host, lowercase, no protocol or path " +
          "(e.g. 'salesforce.com'); use null if you are not confident which domain is theirs.",
      },
      {
        role: "user",
        content:
          `User's brand: ${brand.company}\n` +
          `User's website: ${brand.url}\n` +
          (brand.competitors.length ? `Known competitors: ${brand.competitors.join(", ")}\n` : "") +
          `\n--- AI ASSISTANT ANSWER ---\n${answer}\n--- END ANSWER ---`,
      },
    ],
  });

  let raw: RawBrand[];
  try {
    raw = parseJsonLoose<{ brands: RawBrand[] }>(content).brands;
  } catch {
    raw = [];
  }

  const youKey = norm(brand.company);
  let brands: RankedBrand[] = raw
    .filter((b) => b && typeof b.name === "string" && b.name.trim())
    .map((b) => ({
      rank: 0,
      name: b.name.trim(),
      domain: cleanDomain(b.domain),
      // Trust the model's flag, but also catch the brand by name match.
      isYou: Boolean(b.isYou) || norm(b.name) === youKey,
      visibility: Math.max(0, Math.min(100, Number(b.visibility) || 0)),
      sentiment: coerceSentiment(b.sentiment),
      position: b.position == null ? null : Number(b.position),
    }));

  // Ground the judge's claim in the actual answer: it knows whose brand it's
  // grading and sometimes invents a flattering mention the answer never makes
  // (self-brand bias — observed: 55%/#1 for a brand absent from the text). A
  // you-row keeps its score only if the brand is literally named in the answer;
  // otherwise it's reset to the honest not-mentioned state.
  const hay = answer.toLowerCase();
  for (const b of brands) {
    if (!b.isYou || (b.visibility <= 0 && b.position == null)) continue;
    const candidates = [b.name, brand.company, cleanDomain(brand.url)]
      .map((c) => (c ?? "").trim().toLowerCase())
      .filter((c) => c.length > 2);
    if (candidates.length && !candidates.some((c) => hay.includes(c))) {
      b.visibility = 0;
      b.position = null;
      b.sentiment = "warn";
    }
  }

  // Sort by visibility desc (then by position asc) and assign ranks.
  brands.sort((a, b) => b.visibility - a.visibility || (a.position ?? 99) - (b.position ?? 99));
  brands.forEach((b, i) => (b.rank = i + 1));

  // Despite the instruction, the judge sometimes stamps every prominent brand
  // position=1 (observed: a 3-brand answer rendered as 1/1/1). Positions must
  // be an ordering — if any recommended brands share one, renumber them all by
  // prominence order instead of trusting a self-contradictory judgment.
  const recommended = brands.filter((b) => b.visibility > 0);
  const positions = recommended.map((b) => b.position).filter((p) => p != null);
  if (new Set(positions).size < positions.length) {
    recommended.forEach((b, i) => (b.position = i + 1));
  }

  // Ensure the user's brand always appears (the design shows a "Your brand" row
  // even at 0% — that's the whole hook).
  let youRow = brands.find((b) => b.isYou);
  if (!youRow) {
    youRow = {
      rank: brands.length + 1,
      name: brand.company || "Your brand",
      domain: cleanDomain(brand.url),
      isYou: true,
      visibility: 0,
      sentiment: "warn",
      position: null,
    };
    brands.push(youRow);
  }

  return {
    brands,
    you: {
      mentioned: youRow.visibility > 0 || youRow.position != null,
      visibility: youRow.visibility,
      position: youRow.position,
      sentiment: youRow.sentiment,
    },
  };
}

// A single buyer answer often names just 1–2 brands, so the reveal table looks
// thin. To surface the real competitive set the way users expect (à la Peec),
// ask the SAME engine to expand the primary prompt into a longer ranked list of
// who it would recommend, then reuse detectRanking to pull the brands out. These
// are the engine's own recommendations — not the user's tracked list — so they're
// real competitive signal. We zero their visibility: they weren't recommended for
// the buyer prompt itself, only named when explicitly asked for a longer list.
// Best-effort: any failure returns [] so the scan still succeeds.
export async function discoverCompetitors(
  primaryPrompt: string,
  brand: BrandProfile,
  query: (prompt: string, signal?: AbortSignal) => Promise<{ text: string }>,
  signal?: AbortSignal,
): Promise<RankedBrand[]> {
  const ask =
    `For the question "${primaryPrompt}", list the top 8 products or companies you would ` +
    `recommend, ranked best first. Give each on its own line with the brand name and a brief reason.`;
  try {
    const answer = await query(ask, signal);
    const det = await detectRanking(answer.text, brand, signal);
    return det.brands
      .filter((b) => !b.isYou)
      .map((b) => ({ ...b, visibility: 0, position: null, sentiment: "neut" as BrandSentiment, rank: 0 }));
  } catch {
    return [];
  }
}
