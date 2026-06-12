// The single extraction call: given all answers, decide per answer whether the
// prospect was mentioned and which brands were — split into true competitors
// (substitutes in the prospect's category) and other mentions (tools, platforms).
// The LLM verdict is OR-ed with a deterministic alias check so an extraction
// false-negative can't hide a real mention. Prompt adapted from detectRanking()
// in lib/scan/detect.ts.

import { buildAliasSet, textMentionsBrand } from "./alias";
import { chatCompletion } from "./openai";
import { parseExtraction } from "./parse";
import type { PerAnswerExtraction } from "./types";

const SCHEMA = {
  name: "mention_extraction",
  schema: {
    type: "object",
    properties: {
      answers: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer" },
            prospect_mentioned: { type: "boolean" },
            competitors: { type: "array", items: { type: "string" } },
            other_mentions: { type: "array", items: { type: "string" } },
          },
          required: ["index", "prospect_mentioned", "competitors", "other_mentions"],
          additionalProperties: false,
        },
      },
    },
    required: ["answers"],
    additionalProperties: false,
  },
};

export async function extractMentions(
  brand: string,
  website: string,
  category: string,
  answers: { prompt: string; text: string }[],
  signal?: AbortSignal,
): Promise<PerAnswerExtraction[]> {
  const blocks = answers
    .map(
      (a, i) =>
        `--- ANSWER ${i + 1} (question: "${a.prompt}") ---\n${a.text}\n--- END ANSWER ${i + 1} ---`,
    )
    .join("\n\n");

  const raw = await chatCompletion({
    system:
      "You analyze AI assistant answers to buyer questions for a sales-prospecting tool. " +
      "The prospect company and its market category are given below. For EACH numbered answer, report: " +
      "(1) prospect_mentioned — true only if the prospect company is named or clearly referred to " +
      "(any spelling, including its domain); never invent a mention. " +
      "(2) competitors — only companies/brands the answer names that a buyer in the prospect's category " +
      "could plausibly choose INSTEAD of the prospect: direct rivals selling the same kind of product " +
      "or service to the same market. " +
      "(3) other_mentions — every other distinct company/product/brand the answer names that is NOT a " +
      "substitute for the prospect: software tools, platforms, marketplaces, analytics products, " +
      "directories, publications. Judge by the prospect's category: for a marketing agency, " +
      "'Google Analytics 4' or 'HubSpot' are tools agencies use, not competitors — but for a company " +
      "selling marketing software, HubSpot IS a competitor. " +
      "Use each brand's canonical name once per answer (no duplicates across the two lists, no generic " +
      "terms like 'local agencies'). The prospect itself never appears in either list. " +
      "Return one entry per answer with its 1-based index.",
    user:
      `Prospect company: ${brand}\n` +
      `Prospect website: ${website}\n` +
      `Prospect category/market: ${category}\n\n` +
      blocks,
    jsonSchema: SCHEMA,
    maxTokens: 4000,
    signal,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Extraction returned invalid JSON");
  }

  const rows = parseExtraction(parsed, answers.length);
  const aliases = buildAliasSet(brand, website);
  return rows.map((row, i) => ({
    ...row,
    mentioned: row.mentioned || textMentionsBrand(answers[i].text, aliases),
  }));
}
