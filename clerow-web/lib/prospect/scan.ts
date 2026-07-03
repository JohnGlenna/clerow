// Orchestrates one prospect scan: homepage peek → prompts grounded in the real
// site → 6 ChatGPT answers (parallel) → one extraction call → aggregate →
// email copy. No DB access here — the API route owns caching and persistence.
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
import type { ProspectInput, ProspectScanResult, SitePeek } from "./types";

// Same consumer framing as lib/engines/openai.ts so answers name brands.
const ANSWER_SYSTEM =
  "You are a helpful assistant answering a real person's question. " +
  "Recommend specific products, tools, or brands by name, as you normally would. " +
  "Be concrete and name the leading options.";

export async function runProspectScan(
  input: ProspectInput,
  signal?: AbortSignal,
): Promise<ProspectScanResult> {
  // Homepage peek runs first — the prompt set and the competitor judgment are
  // grounded in the real site. Its failure still never fails the scan: prompts
  // fall back to brand + domain inference.
  const page = await peekSite(input.website);

  const override = input.promptOverride ? parsePromptOverride(input.promptOverride) : [];
  const prompts = override.length
    ? override.slice(0, PROMPT_COUNT)
    : await generateBuyerPrompts(
        { brand: input.brand, website: input.website, site: page },
        input.language,
        signal,
      );

  const texts = await Promise.all(
    prompts.map((prompt) => chatCompletion({ system: ANSWER_SYSTEM, user: prompt, signal })),
  );
  const answered = prompts.map((prompt, i) => ({ prompt, text: texts[i] }));

  const [perAnswer, sitePeek] = await Promise.all([
    extractMentions(input.brand, input.website, page, answered, signal),
    (async (): Promise<SitePeek | null> => {
      if (!page) return null;
      return { ...page, tip: await generateSiteTip(page, input.language, signal) };
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
      siteTip: sitePeek?.tip ?? null,
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
