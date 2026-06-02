// AI page-grading: an LLM reads the brand's actual homepage (raw HTML and/or
// uploaded screenshots) and grades the on-page/content criteria the regex audit
// can't judge — answer-first opening, buyer-question headings, comparison table,
// E-E-A-T, freshness. Returns SiteCheck[] using the SAME ids as the ladder's L2
// content specs, so a full scan turns generic L2 tasks into page-specific ones
// (and works as a fallback for sites we can't crawl, via the screenshots).
// Mirrors the Anthropic Messages call in lib/scan/enrichFromUpload.ts.

import type { BrandProfile } from "../types";
import type { SiteCheck, SiteCheckFix } from "../audit/site";
import { impactXp, type GeoStep } from "../geoSteps";
import { parseJsonLoose } from "../perplexity/client";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export type GradeImage = { mediaType: string; data: string };

// id → human label. ids match the ladder's L2 content spec keys (lib/ladder.ts).
const CRITERIA: Record<string, string> = {
  "l2-answer-first": "Answer-first opening",
  "l2-h2-queries": "Buyer-question headings",
  "l2-comparison-table": "Comparison table",
  "l2-eeat": "E-E-A-T signals",
  "l2-freshness": "Freshness signal",
};
const IMPACTS = new Set<GeoStep["impact"]>(["low", "medium", "high", "very high"]);

const SYSTEM =
  "You are a senior GEO/AEO auditor. Given a brand's homepage (raw HTML and/or screenshots), grade how " +
  "well the page is built to be quoted and recommended by AI answer engines, on these criteria:\n" +
  "- l2-answer-first: does the page open with a direct, factual answer to what they do/who it's for in the first ~40–120 words, with a matching H1?\n" +
  "- l2-h2-queries: are there H2/H3 sections phrased the way real buyers ask (\"how does it work\", \"best for…\", \"pricing\")?\n" +
  "- l2-comparison-table: is there an honest comparison/feature table vs alternatives?\n" +
  "- l2-eeat: author credentials, first-hand proof (\"we tested…\"), named stats/sources, disclosures?\n" +
  "- l2-freshness: a visible \"last updated\" date or clearly recent content?\n" +
  "For each: status 'pass' (already good) or 'fail' (missing/weak). For every non-pass write a SPECIFIC fix that references what's actually on THIS page (quote/paraphrase the real H1, headings, copy), plus a `steps` array of 3–4 short, concrete, ordered actions the user can follow (reference the real page; wrap any file paths or code tokens in backticks; end with a 're-scan' step). " +
  'Return ONLY JSON, no prose: {"checks":[{"id":"l2-answer-first","status":"pass"|"fail","detail":"what you found on the page","fix":{"title":"…","detail":"…","minutes":20,"impact":"low|medium|high|very high","steps":["…","…","…"]}}]}. ' +
  "Omit fix when status is pass.";

function apiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return key;
}

type RawCheck = { id?: string; status?: string; detail?: string; fix?: { title?: string; detail?: string; minutes?: number; impact?: string; steps?: unknown } };

function toFix(raw: RawCheck["fix"]): SiteCheckFix | null {
  if (!raw?.title || !raw?.detail) return null;
  const impact = (IMPACTS.has(raw.impact as GeoStep["impact"]) ? raw.impact : "medium") as GeoStep["impact"];
  const minutes = typeof raw.minutes === "number" && raw.minutes > 0 ? raw.minutes : 20;
  const steps = Array.isArray(raw.steps) ? raw.steps.filter((s) => typeof s === "string").map(String).slice(0, 6) : [];
  return { title: String(raw.title), detail: String(raw.detail), minutes, impact, xp: impactXp(impact), steps };
}

// Grade the page. Throws on API/key/parse failure (caller treats it best-effort).
export async function gradeSite(input: { brand: BrandProfile; html: string; images: GradeImage[] }): Promise<SiteCheck[]> {
  const { brand, html, images } = input;
  const text = [
    `BRAND: ${brand.company}`,
    `WEBSITE: ${brand.url}`,
    brand.description ? `WHAT THEY DO: ${brand.description}` : "",
    "",
    html
      ? `HOMEPAGE RAW HTML (truncated):\n${html.slice(0, 12000)}`
      : "(The homepage couldn't be fetched — grade from the screenshots below.)",
  ]
    .filter((l) => l !== "")
    .join("\n");

  const content: unknown[] = [{ type: "text", text }];
  for (const img of images.slice(0, 6)) {
    content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } });
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "x-api-key": apiKey(), "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 2048, system: SYSTEM, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error(`Anthropic page-grade error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);

  const data = await res.json();
  const raw: string = (data?.content ?? [])
    .filter((b: { type?: string }) => b?.type === "text")
    .map((b: { text?: string }) => b?.text ?? "")
    .join("")
    .trim();

  const parsed = parseJsonLoose<{ checks: RawCheck[] }>(raw);
  const checks: SiteCheck[] = (parsed.checks ?? [])
    .filter((c) => c.id && CRITERIA[c.id])
    .map((c) => {
      const status = c.status === "pass" ? "pass" : "fail";
      return {
        id: c.id as string,
        label: CRITERIA[c.id as string],
        status,
        detail: String(c.detail ?? ""),
        fix: status === "pass" ? null : toFix(c.fix),
      };
    });
  return checks;
}
