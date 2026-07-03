// Buyer-intent prompt generation grounded in the prospect's real homepage
// (one cheap JSON-mode call), plus the pure override parser for the manual
// textarea. No category label — the model infers the market from what the
// site actually says (falling back to brand + domain when it's unreadable).

import { chatCompletion } from "./openai";
import type { Lang, SitePeek } from "./types";

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

export type PromptSiteContext = {
  brand: string;
  website: string;
  /** Crawled homepage; null when the site couldn't be read. */
  site: Omit<SitePeek, "tip"> | null;
};

export async function generateBuyerPrompts(
  ctx: PromptSiteContext,
  language: Lang,
  signal?: AbortSignal,
): Promise<string[]> {
  const langLabel = language === "no" ? "Norwegian (bokmål)" : "English";
  const user = [
    `Prospect company: ${ctx.brand}`,
    `Prospect website: ${ctx.website}`,
    ctx.site
      ? "HOMEPAGE (real, crawled):\n" +
        `Page title: ${ctx.site.title ?? "(none)"}\n` +
        `Meta description: ${ctx.site.description ?? "(none)"}\n` +
        `Visible page text (truncated):\n${ctx.site.text}`
      : "HOMEPAGE: unreadable — infer the market from the company name and domain.",
  ].join("\n\n");
  const raw = await chatCompletion({
    system:
      "You are an AEO (Answer Engine Optimization) strategist. You are given a prospect company and " +
      "the REAL content of its homepage. First work out, strictly from that content, what the company " +
      "sells, who it serves, and where (a location matters only for local services). Then produce " +
      `exactly ${PROMPT_COUNT} questions, in ${langLabel}, that a real potential BUYER of exactly that ` +
      "kind of product or service would type into ChatGPT when deciding what to buy or which provider " +
      'to use — the kind of question where vendors get recommended by name (e.g. "best CRM for small ' +
      'teams", "beste regnskapsbyrå i Kristiansand"). Mix intents: "best X", "X vs alternatives", ' +
      '"recommend an X for <situation>", "how do I choose an X". Match the specificity of what the ' +
      "site actually offers — not a broader industry it merely belongs to. Include the city/region " +
      "only when the site shows they serve a local market. Never include a specific company name. " +
      "Return JSON only.",
    user,
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
