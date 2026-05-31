// Plain-language read of how one AI engine sees the brand, shared by the Overview
// "How each AI sees you" card and the AI Models page so the wording stays
// consistent. Turns the raw visibility/position/sentiment numbers into a sentence
// a non-technical founder immediately understands.

import type { DashboardModel } from "./types";

export type StatusTone = "good" | "warn" | "bad" | "muted";

export function sentimentLabel(s: number | null): string {
  if (s == null) return "—";
  if (s >= 70) return "Positive";
  if (s >= 40) return "Neutral";
  return "Negative";
}

export function modelStatus(m: DashboardModel): { text: string; tone: StatusTone } {
  if (m.locked) return { text: "Upgrade to track this model", tone: "muted" };
  if (m.visibility == null) return { text: "Not scanned yet", tone: "muted" };
  if (m.visibility === 0 || m.position == null) return { text: "Not recommended yet", tone: "bad" };
  const tone: StatusTone = m.position <= 3 ? "good" : "warn";
  return { text: `Recommended #${m.position} · ${sentimentLabel(m.sentiment)}`, tone };
}

// Tooltips defining each metric (used as title attributes).
export const METRIC_HELP = {
  visibility: "How prominently the engine features your brand in its answer (0–100%).",
  position: "Your rank among the brands the engine recommends for this query (#1 is best).",
  sentiment: "How positively the engine describes you (0–100; higher is warmer).",
} as const;
