// "Make content" generation — turn a single GEO playbook step into finished,
// copy-paste-ready content (an FAQ block with FAQPage JSON-LD, a comparison page
// draft, a rewritten paragraph, a directory listing blurb, etc.).
//
// Pure of app I/O beyond the one HTTP call to the writer model, so the Clerow MCP
// can call this exact function later to write the content into a user's codebase.
// Two providers are supported behind CONTENT_PROVIDER — Claude (default, tuned)
// and Grok (xAI). Both stream token deltas so the UI can fill in live, and both
// drop the web_search tool: here we want the model to *write*, not browse.

import type { BrandProfile } from "../types";
import type { GeoStep } from "../geoSteps";
import type { PromptIntent } from "../supabase/database.types";
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
};

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
  "7) Write in a confident, plain, non-fluffy voice. Honest about competitors — AI engines reward even-handed pages.\n\n" +
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
  const { brand, title, detail, promptText, intent, competitorsAhead } = input;
  const lines = [
    `BRAND: ${brand.company}`,
    `WEBSITE: ${brand.url}`,
    brand.industry ? `INDUSTRY: ${brand.industry}` : "",
    brand.description ? `WHAT THEY DO: ${brand.description}` : "",
    brand.differentiators?.length ? `DIFFERENTIATORS: ${brand.differentiators.join("; ")}` : "",
    brand.competitors?.length ? `COMPETITORS: ${brand.competitors.join(", ")}` : "",
    competitorsAhead?.length ? `CURRENTLY RANKED ABOVE THEM FOR THIS QUERY: ${competitorsAhead.join(", ")}` : "",
    "",
    promptText ? `BUYER'S QUESTION TO AI: "${promptText}"` : "",
    intent ? `QUESTION INTENT: ${intent}` : "",
    `THE FIX TO WRITE: ${title}`,
    detail ? `FIX DETAILS: ${detail}` : "",
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
function stepInput(ctx: ContentContext): FixContentInput {
  return {
    brand: ctx.brand,
    title: ctx.step.title,
    detail: ctx.step.detail,
    promptText: ctx.prompt.text,
    intent: ctx.prompt.intent,
    competitorsAhead: ctx.competitorsAhead,
  };
}

// Streaming + non-streaming wrappers for a prompt's playbook step.
export function streamStepContent(ctx: ContentContext): AsyncGenerator<string> {
  return streamFixContent(stepInput(ctx));
}

export async function generateStepContent(ctx: ContentContext): Promise<{ content: string }> {
  return generateFixContent(stepInput(ctx));
}
