// Scan-over-scan MARKET & SOURCE changes — domains entering/leaving the models'
// source set, competitors appearing/disappearing, competitor rank moves. The
// brand's OWN standings story (engine flips, score) lives in lib/scan/delta.ts;
// the two are deliberately disjoint (rank moves here exclude isYou rows) so a
// caller can show both without double-reporting.

import { norm } from "./detect";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 56);

export type ScanFacts = {
  citedDomainEngines: Record<string, number>; // domain → # models citing it
  competitors: { name: string; rank: number; isYou: boolean }[];
};

export type ScanChange =
  | { kind: "source-entered"; domain: string; engines: number; relatedTaskKey: string }
  | { kind: "source-left"; domain: string }
  | { kind: "competitor-entered"; name: string; rank: number }
  | { kind: "competitor-left"; name: string }
  | { kind: "competitor-rank-moved"; name: string; from: number; to: number };

const MAX_CHANGES = 8;
const RANK_MOVE_MIN = 2;

export function diffScans(prev: ScanFacts, curr: ScanFacts): ScanChange[] {
  const changes: ScanChange[] = [];

  // Cited-source set: a domain entering the models' source set is the single
  // most actionable market signal (get listed there → the existing l3 task).
  const entered = Object.keys(curr.citedDomainEngines)
    .filter((d) => !(d in prev.citedDomainEngines))
    .sort((a, b) => curr.citedDomainEngines[b] - curr.citedDomainEngines[a]);
  for (const d of entered) {
    changes.push({ kind: "source-entered", domain: d, engines: curr.citedDomainEngines[d], relatedTaskKey: `l3-source-${slug(d)}` });
  }
  for (const d of Object.keys(prev.citedDomainEngines).filter((d) => !(d in curr.citedDomainEngines))) {
    changes.push({ kind: "source-left", domain: d });
  }

  // Competitor set + rank moves, matched by norm(name) so cross-scan name drift
  // ("Suno" vs "Suno AI") can't fake an enter+leave pair. isYou rows are A's
  // territory (delta.ts) — never reported here.
  const prevByKey = new Map(prev.competitors.filter((c) => !c.isYou).map((c) => [norm(c.name), c]));
  const currByKey = new Map(curr.competitors.filter((c) => !c.isYou).map((c) => [norm(c.name), c]));
  for (const [key, c] of currByKey) {
    const p = prevByKey.get(key);
    if (!p) changes.push({ kind: "competitor-entered", name: c.name, rank: c.rank });
    else if (Math.abs(c.rank - p.rank) >= RANK_MOVE_MIN) changes.push({ kind: "competitor-rank-moved", name: c.name, from: p.rank, to: c.rank });
  }
  for (const [key, p] of prevByKey) {
    if (!currByKey.has(key)) changes.push({ kind: "competitor-left", name: p.name });
  }

  return changes.slice(0, MAX_CHANGES);
}

export function describeChange(c: ScanChange): string {
  switch (c.kind) {
    case "source-entered":
      return `${c.domain} entered your models' source set (cited by ${c.engines} ${c.engines === 1 ? "model" : "models"}) — getting listed there is now worth it (task: ${c.relatedTaskKey}).`;
    case "source-left":
      return `${c.domain} left your models' source set — your presence there matters less than it did.`;
    case "competitor-entered":
      return `A new competitor entered your AI answers: ${c.name} (rank ${c.rank}). Review your comparison pages.`;
    case "competitor-left":
      return `${c.name} dropped out of your AI answers.`;
    case "competitor-rank-moved":
      return `${c.name} moved from rank ${c.from} to ${c.to} in your AI answers.`;
  }
}
