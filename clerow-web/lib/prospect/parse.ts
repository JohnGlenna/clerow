// Pure parsing of the extraction call's JSON into PerAnswerExtraction rows.
// Defensive: the model's output is validated/coerced, never trusted.

import type { PerAnswerExtraction } from "./types";

const MAX_COMPETITORS_PER_ANSWER = 20;
const MAX_NAME_LEN = 80;

/**
 * Coerce the raw extraction JSON ({answers:[{index, prospect_mentioned,
 * competitors}]}, 1-based indices) into exactly `expectedCount` rows
 * (0-based). Missing or out-of-range entries default to not-mentioned.
 */
export function parseExtraction(raw: unknown, expectedCount: number): PerAnswerExtraction[] {
  const out: PerAnswerExtraction[] = Array.from({ length: expectedCount }, (_, index) => ({
    index,
    mentioned: false,
    competitors: [],
  }));

  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { answers?: unknown }).answers)
      ? ((raw as { answers: unknown[] }).answers)
      : [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const idx = Math.round(Number(o.index)) - 1; // model uses 1-based
    if (!Number.isFinite(idx) || idx < 0 || idx >= expectedCount) continue;

    const competitors = (Array.isArray(o.competitors) ? o.competitors : [])
      .filter((c): c is string => typeof c === "string")
      .map((c) => c.trim().slice(0, MAX_NAME_LEN))
      .filter(Boolean)
      .slice(0, MAX_COMPETITORS_PER_ANSWER);

    out[idx] = { index: idx, mentioned: o.prospect_mentioned === true, competitors };
  }

  return out;
}
