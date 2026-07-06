// Homepage peek for the Prospect Scanner: fetch the prospect's real homepage
// (reusing the audit crawler) and generate ONE observation + ONE GEO tip
// grounded strictly in what the page actually says — the "we actually looked
// at your site" legitimacy signal in the outreach email.
//
// Everything here degrades gracefully: a dead or bot-blocking site returns
// null and the email simply falls back to the non-grounded copy.

import { fetchText, toCrawledPage } from "@/lib/audit/site";

import { chatCompletion } from "./openai";
import type { Lang, SitePeek, SiteTip } from "./types";

/** Fetch the prospect's homepage. Never throws; null when unreachable/empty. */
export async function peekSite(website: string): Promise<Omit<SitePeek, "tip"> | null> {
  const raw = website.trim();
  if (!raw) return null;
  const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    new URL(href);
  } catch {
    return null;
  }
  const page = toCrawledPage(href, await fetchText(href));
  if (!page) return null;
  // A page with no usable signal (e.g. a JS-only shell) can't ground a tip.
  if (!page.title && !page.description && page.text.length < 80) return null;
  return page;
}

const TIP_SCHEMA = {
  name: "site_tip",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["observation", "tip"],
    properties: {
      observation: { type: "string" },
      tip: { type: "string" },
    },
  },
} as const;

// The observation/tip style contract, shared with the merged prompts+tip call
// in prompts.ts so both paths produce identical copy.
export const TIP_RULES =
  "an OBSERVATION and a TIP for a cold outreach email to the small-business owner, both grounded " +
  "strictly in the homepage content — never invent services, claims, or pages you cannot see. " +
  "OBSERVATION: one short sentence naming what the business concretely offers, phrased so the owner sees you actually read their site. No flattery, no filler. " +
  "TIP: one specific, actionable improvement that would help THIS site get cited and recommended by AI assistants (e.g. an FAQ answering real buyer questions, a page comparing them to alternatives, fleshing out thin service descriptions). Plain language for a non-technical owner. " +
  "Each sentence under 25 words. Lowercase mid-sentence fit: the observation is inserted after 'I took a look at <domain> – ' so do NOT start it with a capitalized filler like 'I saw that'. The tip is its own sentence and starts capitalized.";

const TIP_SYSTEM =
  "You are given the REAL content of a homepage (title, meta description, visible text). Produce " +
  TIP_RULES;

/** Validate a parsed reply's {observation, tip} fields. Null when either is missing/empty. */
export function parseTip(parsed: unknown): SiteTip | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as { observation?: unknown; tip?: unknown };
  const observation = typeof o.observation === "string" ? o.observation.trim() : "";
  const tip = typeof o.tip === "string" ? o.tip.trim() : "";
  if (!observation || !tip) return null;
  return { observation, tip };
}

/** One mini-model call → grounded {observation, tip} in the scan language. Null on any failure.
 *  Only used when a prompt override skips the merged prompts+tip call in prompts.ts. */
export async function generateSiteTip(
  page: Omit<SitePeek, "tip">,
  language: Lang,
  signal?: AbortSignal,
): Promise<SiteTip | null> {
  const user = [
    `Language for both sentences: ${language === "no" ? "Norwegian (bokmål)" : "English"}.`,
    `Homepage URL: ${page.url}`,
    `Page title: ${page.title ?? "(none)"}`,
    `Meta description: ${page.description ?? "(none)"}`,
    `Visible page text (truncated):\n${page.text}`,
  ].join("\n\n");

  try {
    const reply = await chatCompletion({ system: TIP_SYSTEM, user, jsonSchema: TIP_SCHEMA, signal });
    return parseTip(JSON.parse(reply));
  } catch {
    return null; // tip is a bonus — never fail the scan over it
  }
}
