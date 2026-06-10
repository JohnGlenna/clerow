// The single extraction call: given all answers, decide per answer whether the
// prospect was mentioned and which competitor brands were. The LLM verdict is
// OR-ed with a deterministic alias check so an extraction false-negative can't
// hide a real mention. Prompt adapted from detectRanking() in lib/scan/detect.ts.

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
          },
          required: ["index", "prospect_mentioned", "competitors"],
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
      "You analyze AI assistant answers to buyer questions. For EACH numbered answer, report: " +
      "(1) prospect_mentioned — true only if the prospect company below is named or clearly referred to " +
      "(any spelling, including its domain); never invent a mention. " +
      "(2) competitors — every distinct company/product/brand the answer recommends or names, " +
      "excluding the prospect itself. Use each brand's canonical name once (no duplicates, no " +
      "generic terms like 'local agencies'). Return one entry per answer with its 1-based index.",
    user:
      `Prospect company: ${brand}\n` +
      `Prospect website: ${website}\n\n` +
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
