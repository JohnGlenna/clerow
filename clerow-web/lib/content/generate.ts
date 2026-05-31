// "Make content" generation — turn a single GEO playbook step into finished,
// copy-paste-ready content (an FAQ block with FAQPage JSON-LD, a comparison page
// draft, a rewritten paragraph, a directory listing blurb, etc.).
//
// Pure of app I/O beyond the one HTTP call to Claude, so the Clerow MCP can call
// this exact function later to write the content into a user's codebase. Mirrors
// the request shape in lib/engines/anthropic.ts but drops the web_search tool —
// here we want Claude to *write*, not browse.

import type { BrandProfile } from "../types";
import type { GeoStep } from "../geoSteps";
import type { PromptIntent } from "../supabase/database.types";
import { geoWritingGuidelines } from "../geoFrameworks";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

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

function apiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
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

// Generate copy-ready content for one fix (a playbook step or a quest). Throws
// on API/key failure (the caller maps it to an HTTP error).
export async function generateFixContent(input: FixContentInput): Promise<{ content: string }> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey(),
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const content: string = (data?.content ?? [])
    .filter((b: { type?: string }) => b?.type === "text")
    .map((b: { text?: string }) => b?.text ?? "")
    .join("")
    .trim();

  if (!content) throw new Error("No content was generated. Try again.");
  return { content };
}

// Thin wrapper for a prompt's playbook step — keeps the richer context shape.
export async function generateStepContent(ctx: ContentContext): Promise<{ content: string }> {
  return generateFixContent({
    brand: ctx.brand,
    title: ctx.step.title,
    detail: ctx.step.detail,
    promptText: ctx.prompt.text,
    intent: ctx.prompt.intent,
    competitorsAhead: ctx.competitorsAhead,
  });
}
