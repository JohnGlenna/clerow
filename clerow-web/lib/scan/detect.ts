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
  isYou?: boolean;
  visibility?: number;
  sentiment?: string;
  position?: number | null;
};

function coerceSentiment(v: unknown): BrandSentiment {
  return typeof v === "string" && (SENTIMENTS as string[]).includes(v)
    ? (v as BrandSentiment)
    : "neut";
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
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
          "'sentiment' (pos/neut/neg), and an approximate 'position' (1 = recommended first/most strongly; " +
          "null if only mentioned in passing). Set isYou=true ONLY for the user's brand. " +
          "If the user's brand is NOT recommended in the answer, do not invent it — just omit it.",
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
      // Trust the model's flag, but also catch the brand by name match.
      isYou: Boolean(b.isYou) || norm(b.name) === youKey,
      visibility: Math.max(0, Math.min(100, Number(b.visibility) || 0)),
      sentiment: coerceSentiment(b.sentiment),
      position: b.position == null ? null : Number(b.position),
    }));

  // Sort by visibility desc (then by position asc) and assign ranks.
  brands.sort((a, b) => b.visibility - a.visibility || (a.position ?? 99) - (b.position ?? 99));
  brands.forEach((b, i) => (b.rank = i + 1));

  // Ensure the user's brand always appears (the design shows a "Your brand" row
  // even at 0% — that's the whole hook).
  let youRow = brands.find((b) => b.isYou);
  if (!youRow) {
    youRow = {
      rank: brands.length + 1,
      name: brand.company || "Your brand",
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
