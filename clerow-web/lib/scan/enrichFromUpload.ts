// Vision enrichment: turn a user's website screenshots + their own business
// description into a sharper brand profile. Distills uploads into the SAME fields
// the scan pipeline already consumes (industry/description/audience/
// differentiators/competitors), so no downstream plumbing is needed — discovery,
// detection, and content generation just get better input. Used by the FULL scan
// (the free scan keeps using Perplexity's URL lookup). Mirrors the Anthropic call
// shape in lib/content/generate.ts, adding image content blocks.

import type { BrandProfile } from "../types";
import { parseJsonLoose } from "../perplexity/client";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

// One screenshot, as base64 + its media type (Anthropic accepts jpeg/png/webp/gif).
export type UploadImage = { mediaType: string; data: string };

export type UploadEnrichment = {
  industry: string;
  description: string;
  audience: string[];
  differentiators: string[];
  competitors: string[];
};

const SYSTEM =
  "You are a brand analyst preparing a profile that will be used to test how AI answer " +
  "engines describe and recommend a company. Given website screenshots and the founder's own " +
  "notes, extract a precise, factual brand profile. Rules: " +
  "1) Output ONLY a JSON object — no prose, no code fences. " +
  "2) Keys: industry (string), description (one factual sentence on what they do and for whom), " +
  "audience (array of buyer segments), differentiators (array of concrete, specific advantages), " +
  "competitors (array of real competing brands). " +
  "3) Be faithful to what's actually shown/stated — never invent features, numbers, or competitors. " +
  "4) Prefer concrete specifics (named platforms, capabilities, niches) over marketing fluff.";

function apiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return key;
}

function buildTextBlock(profile: BrandProfile, about: string): string {
  return [
    `BRAND: ${profile.company}`,
    `WEBSITE: ${profile.url}`,
    profile.industry ? `CURRENT INDUSTRY GUESS: ${profile.industry}` : "",
    profile.description ? `CURRENT DESCRIPTION GUESS: ${profile.description}` : "",
    profile.competitors?.length ? `KNOWN COMPETITORS: ${profile.competitors.join(", ")}` : "",
    "",
    about ? `THE FOUNDER'S OWN WORDS:\n${about}` : "",
    "",
    "Using the founder's notes and the attached screenshot(s), produce the JSON brand profile now.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

// Returns the extracted fields. Throws on API/key failure (callers treat the
// whole step as best-effort and continue the scan on error).
export async function enrichFromUpload(input: {
  profile: BrandProfile;
  about: string;
  images: UploadImage[];
}): Promise<UploadEnrichment> {
  const { profile, about, images } = input;

  const content: unknown[] = [{ type: "text", text: buildTextBlock(profile, about) }];
  for (const img of images.slice(0, 6)) {
    content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } });
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey(),
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic vision error ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const raw: string = (data?.content ?? [])
    .filter((b: { type?: string }) => b?.type === "text")
    .map((b: { text?: string }) => b?.text ?? "")
    .join("")
    .trim();

  const parsed = parseJsonLoose<Partial<UploadEnrichment>>(raw);
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : [];
  return {
    industry: String(parsed.industry ?? "").trim(),
    description: String(parsed.description ?? "").trim(),
    audience: arr(parsed.audience),
    differentiators: arr(parsed.differentiators),
    competitors: arr(parsed.competitors).slice(0, 8),
  };
}

// Merge extracted fields into a brand row update — prefer richer user/vision values
// over weak URL-derived ones; union competitors. Returns only the changed columns.
export function mergeUploadEnrichment(
  current: { industry: string; description: string; audience: string[]; differentiators: string[]; competitors: string[] },
  e: UploadEnrichment,
): Partial<{ industry: string; description: string; audience: string[]; differentiators: string[]; competitors: string[] }> {
  const patch: Record<string, unknown> = {};
  if (e.industry && e.industry.length > current.industry.length) patch.industry = e.industry;
  if (e.description && e.description.length > current.description.length) patch.description = e.description;
  if (e.audience.length) patch.audience = Array.from(new Set([...current.audience, ...e.audience]));
  if (e.differentiators.length) patch.differentiators = Array.from(new Set([...current.differentiators, ...e.differentiators]));
  if (e.competitors.length) patch.competitors = Array.from(new Set([...current.competitors, ...e.competitors])).slice(0, 10);
  return patch;
}
