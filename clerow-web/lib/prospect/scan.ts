// Orchestrates one prospect scan: homepage peek → one call for prompts + site
// tip grounded in the real site → 6 ChatGPT answers (parallel) → one
// extraction call → aggregate → email copy. No DB access here — the API route
// owns caching and persistence.
// There is no category label anywhere: the market comes from the crawled site
// and the competitors from what the answers actually name.
//
// Honesty note carried into the UI: these are gpt-5.4-mini API answers without
// browsing, an approximation of chatgpt.com — label the source "ChatGPT (API)".

import { aggregateScan, normalizeWebsite } from "./aggregate";
import { buildEmail } from "./email";
import { writeEmail } from "./emailWriter";
import { extractMentions } from "./extract";
import { chatCompletion } from "./openai";
import { generateBuyerPrompts, parsePromptOverride, PROMPT_COUNT } from "./prompts";
import { generateSiteTip, peekSite } from "./sitePeek";
import type { ProspectInput, ProspectScanResult, SitePeek, SiteTip } from "./types";

// Same consumer framing as lib/engines/openai.ts so answers name brands. The
// length nudge is cost control: answers only feed the extraction call and a
// 500-char email excerpt, so prose beyond ~200 words is paid-for waste.
const ANSWER_SYSTEM =
  "You are a helpful assistant answering a real person's question. " +
  "Recommend specific products, tools, or brands by name, as you normally would. " +
  "Be concrete and name the leading options. " +
  "Keep the answer focused and under 200 words: the leading options by name with a short line on each.";

// Includes hidden reasoning tokens (low effort); chatCompletion retries with
// double the budget if reasoning ever eats it all.
const ANSWER_MAX_TOKENS = 900;

export async function runProspectScan(
  input: ProspectInput,
  signal?: AbortSignal,
): Promise<ProspectScanResult> {
  // Homepage peek runs first — the prompt set and the competitor judgment are
  // grounded in the real site. Its failure still never fails the scan: prompts
  // fall back to brand + domain inference.
  const page = await peekSite(input.website);

  const override = input.promptOverride ? parsePromptOverride(input.promptOverride) : [];
  let prompts: string[];
  let tip: SiteTip | null = null;
  if (override.length) {
    prompts = override.slice(0, PROMPT_COUNT);
  } else {
    // One call returns both the prompt set and the site tip — they share the
    // same homepage input, so a separate tip call would just re-pay for it.
    const generated = await generateBuyerPrompts(
      { brand: input.brand, website: input.website, site: page },
      input.language,
      signal,
    );
    prompts = generated.prompts;
    tip = generated.tip;
  }

  const texts = await Promise.all(
    prompts.map((prompt) =>
      chatCompletion({ system: ANSWER_SYSTEM, user: prompt, maxTokens: ANSWER_MAX_TOKENS, signal }),
    ),
  );
  const answered = prompts.map((prompt, i) => ({ prompt, text: texts[i] }));

  const [perAnswer, sitePeek] = await Promise.all([
    extractMentions(input.brand, input.website, page, answered, signal),
    (async (): Promise<SitePeek | null> => {
      if (!page) return null;
      // Override path skips the merged prompts+tip call, so ground a tip here.
      return { ...page, tip: tip ?? (await generateSiteTip(page, input.language, signal)) };
    })(),
  ]);
  const agg = aggregateScan(perAnswer, { brand: input.brand, website: input.website });

  const displayName = normalizeWebsite(input.website);
  // LLM-written email grounded in the crawled site + scan answers; the fixed
  // template is the never-fail fallback when the writer call misbehaves.
  const written = await writeEmail(
    {
      displayName,
      language: input.language,
      mentionedCount: agg.mentionedCount,
      totalPrompts: agg.totalPrompts,
      competitors: agg.competitors,
      answers: answered.map((a, i) => ({
        prompt: a.prompt,
        text: a.text,
        mentioned: perAnswer[i].mentioned,
        competitors: perAnswer[i].competitors,
      })),
      site: sitePeek
        ? {
            url: sitePeek.url,
            title: sitePeek.title,
            description: sitePeek.description,
            text: sitePeek.text,
          }
        : null,
    },
    signal,
  );
  const email =
    written ??
    buildEmail({
      displayName,
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
    websiteKey: displayName,
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
      otherMentions: perAnswer[i].otherMentions,
    })),
    email,
    sitePeek,
  };
}
