// Buyer-intent prompt generation for a prospect's category (one cheap
// JSON-mode call), plus the pure override parser for the manual textarea.

import { chatCompletion } from "./openai";
import type { Lang } from "./types";

export const PROMPT_COUNT = 6;

const SCHEMA = {
  name: "buyer_prompts",
  schema: {
    type: "object",
    properties: {
      prompts: { type: "array", items: { type: "string" } },
    },
    required: ["prompts"],
    additionalProperties: false,
  },
};

/** Newline-separated override → trimmed prompts (blank lines and # comments dropped). */
export function parsePromptOverride(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

export async function generateBuyerPrompts(
  category: string,
  language: Lang,
  signal?: AbortSignal,
): Promise<string[]> {
  const langLabel = language === "no" ? "Norwegian (bokmål)" : "English";
  const raw = await chatCompletion({
    system:
      "You are an AEO (Answer Engine Optimization) strategist. Given a product/service category, " +
      `produce exactly ${PROMPT_COUNT} questions, in ${langLabel}, that a real potential BUYER in that ` +
      "category would type into ChatGPT when deciding what to buy or which provider to use — the kind " +
      'of question where vendors get recommended by name (e.g. "best CRM for small teams", ' +
      '"beste regnskapsbyrå i Kristiansand"). Mix intents: "best X", "X vs alternatives", ' +
      '"recommend an X for <situation>", "how do I choose an X". Keep any location in the category. ' +
      "Never include a specific company name. Return JSON only.",
    user: `Category: ${category}`,
    jsonSchema: SCHEMA,
    maxTokens: 1500,
    signal,
  });

  let prompts: string[] = [];
  try {
    const parsed = JSON.parse(raw) as { prompts?: unknown };
    prompts = (Array.isArray(parsed.prompts) ? parsed.prompts : [])
      .filter((p): p is string => typeof p === "string")
      .map((p) => p.trim())
      .filter(Boolean);
  } catch {
    throw new Error("Prompt generation returned invalid JSON");
  }
  if (prompts.length < PROMPT_COUNT) {
    throw new Error(`Prompt generation returned ${prompts.length} prompts, expected ${PROMPT_COUNT}`);
  }
  return prompts.slice(0, PROMPT_COUNT);
}
