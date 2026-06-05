// "Make content" generation — turn a single GEO playbook step into finished,
// copy-paste-ready content (an FAQ block with FAQPage JSON-LD, a comparison page
// draft, a rewritten paragraph, a directory listing blurb, etc.).
//
// Pure of app I/O beyond the one HTTP call to the writer model, so the Clerow MCP
// can call this exact function later to write the content into a user's codebase.
// Two providers are supported behind CONTENT_PROVIDER — Claude (default, tuned)
// and Grok (xAI). Both stream token deltas so the UI can fill in live, and both
// drop the web_search tool: here we want the model to *write*, not browse.

import type { BrandProfile, ScanSynthesis } from "../types";
import type { GeoStep } from "../geoSteps";
import type { PromptIntent } from "../supabase/database.types";
import type { SiteCrawl } from "../audit/site";
import { geoWritingGuidelines } from "../geoFrameworks";

// Writer provider — "anthropic" (default) or "grok". Each provider's model is
// independently env-overridable.
const PROVIDER = (process.env.CONTENT_PROVIDER || "anthropic").toLowerCase();

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

// Grok uses xAI's Responses API (same endpoint as the scan adapter, so the model
// id is known-good) with no tools — we want a fast write, not live search.
const XAI_API_URL = "https://api.x.ai/v1/responses";
const XAI_MODEL = process.env.XAI_CONTENT_MODEL || "grok-4.3";

export type ContentContext = {
  brand: BrandProfile;
  prompt: { text: string; intent: PromptIntent };
  step: Pick<GeoStep, "id" | "title" | "detail">;
  // Competitor brand names ranked above the user for this prompt (most to least
  // prominent). Lets a comparison draft name the right rival.
  competitorsAhead: string[];
  // Real crawled-site context (see buildSiteContext) so the draft references the
  // brand's ACTUAL pages and voice instead of inventing them.
  siteContext?: string;
  // Domains the AI engines cite for this space, and the multi-model synthesis
  // steer (see buildScanInsight) — present only with a real (esp. paid) scan.
  citedSources?: string[];
  scanInsight?: string;
  // The founder's own words about the business (see buildVoiceContext) — the
  // voice/tone sample that stops the draft reading like generic AI.
  brandVoice?: string;
};

// Generic "write the content for one fix" input. The prompt context is optional
// so this works equally for a prompt's playbook step (full context) or a bare
// quest/task (just a title + detail).
export type FixContentInput = {
  brand: BrandProfile;
  title: string;
  detail: string;
  promptText?: string;
  intent?: PromptIntent;
  competitorsAhead?: string[];
  // Real crawled-site context (see buildSiteContext) — real pages + voice.
  siteContext?: string;
  // Domains the AI engines cite + the multi-model synthesis steer.
  citedSources?: string[];
  scanInsight?: string;
  // The founder's own words about the business (see buildVoiceContext).
  brandVoice?: string;
  // Set on a quality-gate revision pass: the specific problems the judge flagged
  // in the previous draft, so the rewrite is targeted (see lib/content/quality.ts).
  revisionNote?: string;
};

// Distil the multi-model synthesis (what all the AI engines collectively think)
// into a compact steer for the writer. Returns undefined when there's no
// synthesis — i.e. for free/single-engine scans — so paid drafts get a signal
// free ones can't. Pure formatting (no I/O), like buildSiteContext.
export function buildScanInsight(s?: ScanSynthesis | null): string | undefined {
  if (!s) return undefined;
  const parts = [
    s.consensus && `What the AI engines agree on: ${s.consensus}`,
    s.divergence && `Where they disagree: ${s.divergence}`,
    s.bestFix && `Highest-leverage fix they point to: ${s.bestFix}`,
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : undefined;
}

// Format the retained crawl into a compact context block for the writer model:
// the homepage + a few real inner pages (URL, title, snippet) so it links real
// pages and matches the site's voice. Returns undefined when there's nothing to
// ground on, so callers can spread it in conditionally.
export function buildSiteContext(crawl?: SiteCrawl | null): string | undefined {
  if (!crawl) return undefined;
  const pages = [crawl.home, ...crawl.pages].filter((p): p is NonNullable<typeof p> => !!p);
  if (!pages.length && !crawl.sitemapUrls.length) return undefined;

  const lines: string[] = [];
  for (const p of pages.slice(0, 6)) {
    const bits = [p.title, p.description].filter(Boolean).join(" — ");
    lines.push(`- ${p.url}${bits ? `: ${bits}` : ""}`);
    if (p.text) lines.push(`    excerpt: ${p.text.slice(0, 400)}`);
  }
  const extraUrls = crawl.sitemapUrls.filter((u) => !pages.some((p) => p.url.replace(/\/$/, "") === u.replace(/\/$/, "")));
  if (extraUrls.length) lines.push(`Other real pages: ${extraUrls.slice(0, 15).join(", ")}`);
  return lines.length ? lines.join("\n") : undefined;
}

// Distil the founder's own "about" text (the business-context upload, stored on
// brands.about) into a voice/tone sample for the writer. The crawled site copy
// already grounds *facts* via buildSiteContext; this grounds *how the brand
// sounds* — the missing signal that otherwise leaves paid drafts reading like
// generic AI. Returns undefined when there's nothing usable so callers can
// spread it in conditionally. Pure formatting, no I/O.
export function buildVoiceContext(about?: string | null): string | undefined {
  const text = about?.trim();
  if (!text || text.length < 12) return undefined;
  return text.slice(0, 1200);
}

const SYSTEM =
  "You are a senior AEO/GEO (Answer Engine Optimization) content writer for a SaaS company. " +
  "Your job is to produce FINISHED, copy-paste-ready content that helps a brand get recommended by " +
  "AI answer engines (ChatGPT, Claude, Perplexity, Gemini). " +
  "Write the actual content for the specific fix described — not advice ABOUT the content. " +
  "Rules: " +
  "1) Output Markdown only. No preamble, no 'here is your content', no closing remarks. " +
  "2) Be concrete and specific to the brand and the buyer's question. Never use [bracketed placeholders]. " +
  "3) If the fix is an FAQ, write 4–7 real Q&A pairs AND include a ready-to-paste FAQPage JSON-LD <script> block. " +
  "4) If the fix is a comparison/alternatives page, write a full draft: H1, intro, an honest feature table, " +
  "'who each is best for', and a short verdict. " +
  "5) If the fix is a landing/how-to page, write the H1, opening paragraph, and section outline with real copy. " +
  "6) If the fix is about getting cited on a third-party source, write the actual submission/post/listing copy. " +
  "7) Write in a confident, plain, non-fluffy voice. Honest about competitors — AI engines reward even-handed pages. " +
  "8) When YOUR ACTUAL SITE context is provided, ground everything in it: link only real pages/URLs listed there, reuse the real product names and positioning, and match the site's voice. Never invent pages, URLs, or facts that aren't supported by it. " +
  "9) When SOURCES THE AI ENGINES CITE or a multi-model read is provided, use them: write the kind of page those sources are, align with the angle the engines reward, and directly close the gap the multi-model read names. " +
  "10) When HOW THIS BRAND DESCRIBES ITSELF (the founder's own words) is provided, treat it as the voice reference: mirror its tone, vocabulary, level of formality and the specific way it frames the product, so the output sounds like this brand and not generic AI. The facts in it about the product and audience override any generic assumption.\n\n" +
  geoWritingGuidelines();

function anthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return key;
}

function xaiKey(): string {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("XAI_API_KEY is not set");
  return key;
}

function buildUserPrompt(input: FixContentInput): string {
  const { brand, title, detail, promptText, intent, competitorsAhead, siteContext, citedSources, scanInsight, brandVoice, revisionNote } = input;
  const lines = [
    `BRAND: ${brand.company}`,
    `WEBSITE: ${brand.url}`,
    brand.industry ? `INDUSTRY: ${brand.industry}` : "",
    brand.description ? `WHAT THEY DO: ${brand.description}` : "",
    brand.differentiators?.length ? `DIFFERENTIATORS: ${brand.differentiators.join("; ")}` : "",
    brand.competitors?.length ? `COMPETITORS: ${brand.competitors.join(", ")}` : "",
    competitorsAhead?.length ? `CURRENTLY RANKED ABOVE THEM FOR THIS QUERY: ${competitorsAhead.join(", ")}` : "",
    "",
    brandVoice
      ? `HOW THIS BRAND DESCRIBES ITSELF (the founder's own words — mirror this tone, vocabulary and positioning so the draft sounds like them, not generic AI):\n${brandVoice}\n`
      : "",
    siteContext
      ? `YOUR ACTUAL SITE (from our crawl — reference these real pages and voice; never invent pages or URLs):\n${siteContext}\n`
      : "",
    citedSources?.length
      ? `SOURCES THE AI ENGINES ALREADY CITE FOR THIS SPACE (aim to be the kind of page these are; reference/align with them where credible): ${citedSources.join(", ")}`
      : "",
    scanInsight
      ? `HOW THE AI MODELS COLLECTIVELY SEE YOU (from a multi-model scan — use this to target the draft):\n${scanInsight}\n`
      : "",
    promptText ? `BUYER'S QUESTION TO AI: "${promptText}"` : "",
    intent ? `QUESTION INTENT: ${intent}` : "",
    `THE FIX TO WRITE: ${title}`,
    detail ? `FIX DETAILS: ${detail}` : "",
    revisionNote ? `\nREVISION REQUEST (a quality review of your previous draft):\n${revisionNote}` : "",
    "",
    "Write the finished content for this fix now.",
  ];
  return lines.filter((l) => l !== "").join("\n");
}

// Build a copy-paste-ready *brief* for a calling agent (e.g. the Clerow MCP's
// own client — Claude Code, Cursor) to write the content itself, instead of
// Clerow spending a model call. Reuses the exact same tuned SYSTEM rules + the
// brand/competitor/prompt context buildUserPrompt assembles, so a local agent
// writes to the same GEO spec the server-side generator would have followed.
export function buildContentBrief(input: FixContentInput): string {
  return [
    `You are writing AEO/GEO content for ${input.brand.company}. Follow the rules below, then write the finished file and save it into the repo.`,
    "",
    "This brief is built from Clerow's multi-model scan — what ChatGPT, Claude, Perplexity, Gemini and Grok collectively returned about this brand (see the multi-model read + the sources they cite in the Context below) plus the brand's real crawled site. Write to win exactly those gaps, ground everything in the real pages, and integrate the result into this repo (right file, matching the existing components and voice).",
    "",
    "## Writing rules",
    SYSTEM,
    "",
    "## Context",
    buildUserPrompt(input),
    "",
    "## Your task",
    "Write the finished, copy-paste-ready content now (Markdown), matching the rules above and the surrounding site's structure and voice, then save it into the repo.",
  ].join("\n");
}

// Yield the `data:` payloads of an SSE response, one per line. Both the Anthropic
// Messages API and the xAI Responses API stream as `data: {json}` lines.
async function* sseLines(res: Response): AsyncGenerator<string> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
}

// Claude streams the answer as `content_block_delta` frames carrying `text_delta`s.
async function* streamAnthropic(input: FixContentInput): AsyncGenerator<string> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey(),
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      stream: true,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 500)}`);
  }

  for await (const data of sseLines(res)) {
    let evt: any;
    try {
      evt = JSON.parse(data);
    } catch {
      continue;
    }
    if (evt?.type === "content_block_delta" && evt.delta?.type === "text_delta" && typeof evt.delta.text === "string") {
      yield evt.delta.text;
    } else if (evt?.type === "error") {
      throw new Error(evt.error?.message ?? "Anthropic stream error");
    }
  }
}

// Grok (xAI Responses API) streams `response.output_text.delta` frames.
async function* streamGrok(input: FixContentInput): AsyncGenerator<string> {
  const res = await fetch(XAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${xaiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      instructions: SYSTEM,
      input: buildUserPrompt(input),
      stream: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`xAI API error ${res.status}: ${text.slice(0, 500)}`);
  }

  for await (const data of sseLines(res)) {
    if (data === "[DONE]") break;
    let evt: any;
    try {
      evt = JSON.parse(data);
    } catch {
      continue;
    }
    if (evt?.type === "response.output_text.delta" && typeof evt.delta === "string") {
      yield evt.delta;
    } else if (evt?.type === "error" || evt?.type === "response.failed") {
      throw new Error(evt.error?.message ?? evt.message ?? "xAI stream error");
    }
  }
}

// Stream copy-ready content for one fix as token deltas, via the configured
// provider. Throws on API/key failure (the caller maps it to an HTTP error).
export function streamFixContent(input: FixContentInput): AsyncGenerator<string> {
  return PROVIDER === "grok" ? streamGrok(input) : streamAnthropic(input);
}

// Non-streaming convenience: accumulate the full draft. Used by the background
// pre-warm and the MCP, which have no UI to fill in incrementally.
export async function generateFixContent(input: FixContentInput): Promise<{ content: string }> {
  let content = "";
  for await (const chunk of streamFixContent(input)) content += chunk;
  content = content.trim();
  if (!content) throw new Error("No content was generated. Try again.");
  return { content };
}

// Map a prompt's playbook-step context onto the generic fix input.
export function stepInput(ctx: ContentContext): FixContentInput {
  return {
    brand: ctx.brand,
    title: ctx.step.title,
    detail: ctx.step.detail,
    promptText: ctx.prompt.text,
    intent: ctx.prompt.intent,
    competitorsAhead: ctx.competitorsAhead,
    siteContext: ctx.siteContext,
    citedSources: ctx.citedSources,
    scanInsight: ctx.scanInsight,
    brandVoice: ctx.brandVoice,
  };
}

// Streaming + non-streaming wrappers for a prompt's playbook step.
export function streamStepContent(ctx: ContentContext): AsyncGenerator<string> {
  return streamFixContent(stepInput(ctx));
}

export async function generateStepContent(ctx: ContentContext): Promise<{ content: string }> {
  return generateFixContent(stepInput(ctx));
}
