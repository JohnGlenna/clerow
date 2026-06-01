// Master-AI synthesis — the "what all the AIs collectively think" layer.
//
// After a multi-engine scan, one model reads how every engine answered the
// primary prompt and distills it into a short collective verdict, where the
// engines agree/disagree, and the single highest-leverage next move. The numeric
// scores stay owned by the snapshot math (lib/scan/snapshot.ts); this is a
// narrative layer on top, stored on scans.synthesis.
//
// One Claude call, mirroring the request shape in lib/content/generate.ts (no
// web_search tool — here the model reasons over text we already have). Resilient
// by design: every entry point catches, so a failed synthesis never affects the
// scan that produced it.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import type { ScanSynthesis } from "../types";
import { ENGINES, type EngineId } from "../engines";

type DB = SupabaseClient<Database>;

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export type Synthesis = ScanSynthesis;

const SYSTEM =
  "You are a senior AEO/GEO (Answer Engine Optimization) analyst. You are given how several different AI " +
  "answer engines (ChatGPT, Claude, Perplexity, Gemini, Grok) each responded to the same buyer question, " +
  "and how a specific brand placed in each answer. Distill it for the brand's marketing team. " +
  "Respond with a single JSON object and NOTHING else, matching exactly: " +
  '{"verdict": string, "consensus": string, "divergence": string, "bestFix": string}. ' +
  "verdict: 1–2 plain sentences on how AI collectively sees this brand for this question. " +
  "consensus: what the engines agree on (the brands/themes they all surface). " +
  "divergence: the most notable place the engines disagree. " +
  "bestFix: the single highest-impact action to improve this brand's standing — concrete, not generic. " +
  "Be specific and honest. No markdown, no preamble.";

function apiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return key;
}

// Pull the JSON object out of the model's reply, tolerating code fences / stray prose.
function parseSynthesis(raw: string): Synthesis | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(raw.slice(start, end + 1));
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const s: Synthesis = {
      verdict: str(obj.verdict),
      consensus: str(obj.consensus),
      divergence: str(obj.divergence),
      bestFix: str(obj.bestFix),
    };
    return s.verdict || s.bestFix ? s : null;
  } catch {
    return null;
  }
}

// Build the synthesis for one completed multi-engine scan. Returns null when
// there's nothing to synthesize (fewer than two engines produced an answer).
export async function synthesizeScan(db: DB, scanId: string): Promise<Synthesis | null> {
  const { data: scan } = await db.from("scans").select("brand_id").eq("id", scanId).maybeSingle();
  if (!scan) return null;

  const { data: results } = await db
    .from("scan_results")
    .select("engine, raw_answer, your_position, your_visibility, prompt_id")
    .eq("scan_id", scanId);
  // Synthesis only makes sense across multiple engines.
  if (!results || results.length < 2) return null;

  const { data: brand } = await db.from("brands").select("company, url").eq("id", scan.brand_id).maybeSingle();
  if (!brand) return null;

  const { data: prompt } = await db
    .from("prompts")
    .select("text")
    .eq("id", results[0].prompt_id)
    .maybeSingle();

  const perEngine = results.map((r) => {
    const label = ENGINES[r.engine as EngineId]?.label ?? r.engine;
    const place =
      r.your_position != null
        ? `ranked #${r.your_position} (visibility ${Math.round(Number(r.your_visibility))}%)`
        : `not mentioned`;
    // Cap each answer so a long web-grounded reply doesn't blow the token budget.
    const answer = (r.raw_answer ?? "").slice(0, 1500);
    return `### ${label} — ${brand.company} ${place}\n${answer}`;
  });

  const userPrompt = [
    `BRAND: ${brand.company} (${brand.url})`,
    prompt?.text ? `BUYER'S QUESTION TO AI: "${prompt.text}"` : "",
    "",
    "HOW EACH ENGINE ANSWERED:",
    "",
    perEngine.join("\n\n"),
  ]
    .filter((l) => l !== "")
    .join("\n");

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
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw: string = (data?.content ?? [])
    .filter((b: { type?: string }) => b?.type === "text")
    .map((b: { text?: string }) => b?.text ?? "")
    .join("")
    .trim();

  return parseSynthesis(raw);
}

// Synthesize and persist onto scans.synthesis. Fully self-contained and
// non-throwing so it can be fired from `after()` without a guard at the call site.
export async function synthesizeAndStore(db: DB, scanId: string): Promise<void> {
  try {
    const synthesis = await synthesizeScan(db, scanId);
    if (synthesis) await db.from("scans").update({ synthesis }).eq("id", scanId);
  } catch {
    // Non-fatal: the scan and its scores are already saved; the verdict just stays null.
  }
}
