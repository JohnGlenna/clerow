// Discover prompts via Grok's live web search (xAI Agent Tools API). Grok searches
// the web for the questions real buyers most commonly ask in this market, ranked by
// how often they're asked — a stronger popularity signal than a pure model guess.
// Self-contained (no import from discover.ts) to avoid a cycle; discover.ts calls
// this first and falls back to the Perplexity path on failure.

import type { BrandProfile, DiscoveredPrompt } from "../types";
import type { PromptIntent, PromptVolume } from "../supabase/database.types";
import { parseJsonLoose } from "../perplexity/client";

const API_URL = "https://api.x.ai/v1/responses";
const MODEL = process.env.XAI_MODEL || "grok-4.3";

const INTENTS: PromptIntent[] = ["solution", "compare", "problem", "branded"];
const VOLUMES: PromptVolume[] = ["high", "medium", "low", "rising"];

type RawPrompt = { text: string; intent: string; volume: string; primary?: boolean };

const SYSTEM =
  "You are a GEO/AEO strategist with live web search. Use web search to find the ACTUAL questions " +
  "real buyers most commonly ask (and google) in this company's market when deciding what to buy — " +
  "the questions where this company SHOULD surface as an AI recommendation. Rank by how frequently " +
  "they're asked, most-asked first, and set volume:\"high\" for the most popular ones. " +
  "Cover a mix of intents: 'solution' (\"best X for Y\"), 'compare' (\"A vs B\", \"alternatives to X\"), " +
  "'problem' (\"how do I ...\"), 'branded' (\"X review\"). Do NOT include the company's own name except " +
  "in 'branded' prompts. Mark exactly ONE primary: the single most-popular 'solution' or 'compare' query. " +
  'Return ONLY a JSON object, no prose: {"prompts":[{"text":"...","intent":"solution|compare|problem|branded","volume":"high|medium|low|rising","primary":true|false}]}. ' +
  "Return 12–20 prompts, most-asked first.";

function apiKey(): string {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("XAI_API_KEY is not set");
  return key;
}

function profileBlock(b: BrandProfile): string {
  return [
    `Company: ${b.company}`,
    `Website: ${b.url}`,
    `Industry / category: ${b.industry}`,
    `What they do: ${b.description}`,
    b.audience.length ? `Customers: ${b.audience.join(", ")}` : "",
    b.competitors.length ? `Known competitors: ${b.competitors.join(", ")}` : "",
    b.geos.length ? `Target geographies: ${b.geos.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function extractText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const parts: string[] = [];
  for (const item of data?.output ?? []) {
    if (item?.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part?.type === "output_text" && typeof part.text === "string") parts.push(part.text);
    }
  }
  return parts.join("\n").trim();
}

const coerceIntent = (v: string): PromptIntent => ((INTENTS as string[]).includes(v) ? (v as PromptIntent) : "solution");
const coerceVolume = (v: string): PromptVolume => ((VOLUMES as string[]).includes(v) ? (v as PromptVolume) : "medium");

// Throws on HTTP/parse failure or empty result so the caller can fall back.
export async function discoverViaGrok(brand: BrandProfile): Promise<DiscoveredPrompt[]> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, instructions: SYSTEM, input: profileBlock(brand), tools: [{ type: "web_search" }] }),
  });
  if (!res.ok) throw new Error(`xAI discover error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);

  const text = extractText(await res.json());
  const raw = parseJsonLoose<{ prompts: RawPrompt[] }>(text).prompts;

  const prompts: DiscoveredPrompt[] = (raw ?? [])
    .filter((p) => p && typeof p.text === "string" && p.text.trim())
    .map((p) => ({ text: p.text.trim(), intent: coerceIntent(p.intent), volume: coerceVolume(p.volume), isPrimary: Boolean(p.primary) }));
  if (prompts.length === 0) throw new Error("Grok discovery returned no prompts");

  // Guarantee exactly one primary (prefer flagged, else first high-volume solution/compare).
  if (!prompts.some((p) => p.isPrimary)) {
    const pick =
      prompts.find((p) => p.volume === "high" && (p.intent === "solution" || p.intent === "compare")) ??
      prompts.find((p) => p.intent === "solution") ??
      prompts[0];
    pick.isPrimary = true;
  } else {
    let seen = false;
    for (const p of prompts) {
      if (p.isPrimary && !seen) seen = true;
      else p.isPrimary = false;
    }
  }
  return prompts;
}
