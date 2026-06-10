// Orchestrates one prospect scan: prompts → 6 ChatGPT answers (parallel) →
// one extraction call → aggregate → email copy. No DB access here — the API
// route owns caching and persistence.
//
// Honesty note carried into the UI: these are gpt-5.4-mini API answers without
// browsing, an approximation of chatgpt.com — label the source "ChatGPT (API)".

import { aggregateScan, normalizeWebsite } from "./aggregate";
import { buildEmail } from "./email";
import { extractMentions } from "./extract";
import { chatCompletion } from "./openai";
import { generateBuyerPrompts, parsePromptOverride, PROMPT_COUNT } from "./prompts";
import type { ProspectInput, ProspectScanResult } from "./types";

// Same consumer framing as lib/engines/openai.ts so answers name brands.
const ANSWER_SYSTEM =
  "You are a helpful assistant answering a real person's question. " +
  "Recommend specific products, tools, or brands by name, as you normally would. " +
  "Be concrete and name the leading options.";

export async function runProspectScan(
  input: ProspectInput,
  signal?: AbortSignal,
): Promise<ProspectScanResult> {
  const override = input.promptOverride ? parsePromptOverride(input.promptOverride) : [];
  const prompts = override.length
    ? override.slice(0, PROMPT_COUNT)
    : await generateBuyerPrompts(input.category, input.language, signal);

  const texts = await Promise.all(
    prompts.map((prompt) => chatCompletion({ system: ANSWER_SYSTEM, user: prompt, signal })),
  );
  const answered = prompts.map((prompt, i) => ({ prompt, text: texts[i] }));

  const perAnswer = await extractMentions(input.brand, input.website, answered, signal);
  const agg = aggregateScan(perAnswer, { brand: input.brand, website: input.website });

  const email = buildEmail({
    brand: input.brand,
    language: input.language,
    mentionedCount: agg.mentionedCount,
    totalPrompts: agg.totalPrompts,
    topCompetitor: agg.topCompetitor,
    topCompetitorMentions: agg.topCompetitorMentions,
    competitors: agg.competitors,
    samplePrompt: prompts[0],
  });

  return {
    brand: input.brand,
    website: input.website,
    websiteKey: normalizeWebsite(input.website),
    category: input.category,
    language: input.language,
    mentionedCount: agg.mentionedCount,
    totalPrompts: agg.totalPrompts,
    competitors: agg.competitors,
    topCompetitor: agg.topCompetitor,
    answers: answered.map((a, i) => ({
      prompt: a.prompt,
      answer: a.text,
      mentioned: perAnswer[i].mentioned,
      competitors: perAnswer[i].competitors,
    })),
    email,
  };
}
