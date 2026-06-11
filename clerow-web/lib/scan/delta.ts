// Scan-over-scan narration of the brand's OWN standings — which engines started
// or stopped citing you, big visibility swings, rank moves, and the overall
// score line. Pure derivation from a BrandSnapshot (whose `previous` block the
// snapshot loader computes for free). Market/source changes (cited domains,
// competitors) live in lib/scan/diff.ts — keep the two disjoint so callers can
// show both without double-reporting.

import type { BrandSnapshot } from "./snapshot";
import type { EngineId } from "../engines";

export type EngineDeltaKind =
  | "started-citing" // previous result existed at 0% — now visible
  | "stopped-citing"
  | "swing-up" // |Δ visibility| ≥ SWING points
  | "swing-down"
  | "rank-move" // position changed without a qualifying visibility move
  | "first-result" // engine has NO previous row (e.g. plan upgrade) — NOT "started citing"
  | "unchanged";

export type EngineDelta = {
  engine: EngineId;
  label: string;
  visibility: { from: number | null; to: number | null }; // from null = no previous row
  position: { from: number | null; to: number | null };
  kind: EngineDeltaKind;
};

const SWING = 10;

export function computeEngineDeltas(snap: BrandSnapshot): EngineDelta[] {
  if (!snap.previous) return [];
  const out: EngineDelta[] = [];
  for (const e of snap.engines) {
    if (!e.scanned) continue;
    const to = e.visibility ?? 0;
    const prev = snap.previous.engines[e.id];
    if (!prev) {
      out.push({ engine: e.id, label: e.label, visibility: { from: null, to }, position: { from: null, to: e.position }, kind: "first-result" });
      continue;
    }
    let kind: EngineDeltaKind = "unchanged";
    if (prev.visibility === 0 && to > 0) kind = "started-citing";
    else if (prev.visibility > 0 && to === 0) kind = "stopped-citing";
    else if (to - prev.visibility >= SWING) kind = "swing-up";
    else if (prev.visibility - to >= SWING) kind = "swing-down";
    else if ((prev.position ?? null) !== (e.position ?? null)) kind = "rank-move";
    out.push({ engine: e.id, label: e.label, visibility: { from: prev.visibility, to }, position: { from: prev.position, to: e.position }, kind });
  }
  return out;
}

const PRIORITY: EngineDeltaKind[] = ["started-citing", "stopped-citing", "swing-up", "swing-down", "rank-move"];

function describe(d: EngineDelta): string {
  const pos = d.position.to != null ? `, position ${d.position.to}` : "";
  switch (d.kind) {
    case "started-citing":
      return `${d.label} started citing you (${d.visibility.from}% → ${d.visibility.to}%${pos}).`;
    case "stopped-citing":
      return `${d.label} stopped citing you (${d.visibility.from}% → 0%).`;
    case "swing-up":
      return `${d.label} visibility rose ${d.visibility.from}% → ${d.visibility.to}%${pos}.`;
    case "swing-down":
      return `${d.label} visibility fell ${d.visibility.from}% → ${d.visibility.to}%.`;
    case "rank-move":
      return `${d.label} moved you from position ${d.position.from ?? "—"} to ${d.position.to ?? "—"}.`;
    default:
      return "";
  }
}

// The 1–3 most notable engine moves plus the overall score line.
// headline = the single most notable move + the overall line — the sentence a
// dashboard card or an agent shows first. lines = every notable move described.
export function buildDeltaNarrative(snap: BrandSnapshot): { headline: string | null; lines: string[] } {
  if (!snap.previous) return { headline: null, lines: [] };
  const magnitude = (d: EngineDelta) => Math.abs((d.visibility.to ?? 0) - (d.visibility.from ?? 0));
  const notable = computeEngineDeltas(snap)
    .filter((d) => PRIORITY.includes(d.kind))
    .sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind) || magnitude(b) - magnitude(a))
    .slice(0, 3);
  const lines = notable.map(describe);

  const from = snap.previous.score.overall;
  const to = snap.score.overall;
  const overall = from !== to ? `Overall ${from} → ${to} (${to - from > 0 ? "+" : ""}${to - from}).` : null;

  if (lines.length === 0 && !overall) return { headline: "No movement since the previous scan.", lines: [] };
  return { headline: [lines[0], overall].filter(Boolean).join(" "), lines };
}
