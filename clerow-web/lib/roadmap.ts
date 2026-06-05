// Content roadmap — turns the flat list of discovered buyer prompts into a
// sequenced, clustered plan: which *kind* of content to ship, in what order, and
// where the gaps are. The scan discovers prompts one-off (lib/scan/discover.ts);
// this groups them by buyer intent into a "spiderweb of clusters → roadmap" so
// the user sees a planned path instead of a reactive feed.
//
// Pure (no I/O): the dashboard route feeds it the already-mapped prompts. The
// ordering encodes GEO leverage — comparison/alternatives pages first (highest
// commercial intent), then solution pages, then guides, then branded/trust.

import type { PromptIntent } from "./supabase/database.types";

// A prompt's standing, reduced to the four states the roadmap cares about.
export type RoadmapPromptStatus = "winning" | "present" | "gap" | "untested";

export type RoadmapPrompt = {
  id: string;
  text: string;
  isPrimary: boolean;
  status: RoadmapPromptStatus;
  position: number | null;
};

export type RoadmapClusterState = "strong" | "building" | "gap" | "empty";

export type RoadmapCluster = {
  intent: PromptIntent;
  label: string;
  blurb: string; // what content to ship for this cluster
  order: number; // 1-based recommended sequence
  prompts: RoadmapPrompt[];
  total: number;
  winning: number; // ranked top-3
  present: number; // mentioned but not top-3
  gaps: number; // scanned but invisible
  untested: number; // not yet scanned
  state: RoadmapClusterState;
  isFocus: boolean; // the recommended cluster to work on next
};

export type Roadmap = {
  clusters: RoadmapCluster[];
  focusIntent: PromptIntent | null;
};

// Minimal shape the builder needs — a subset of DashboardPrompt.
export type RoadmapInput = {
  id: string;
  text: string;
  intent: PromptIntent;
  isPrimary: boolean;
  scanned: boolean;
  yourPosition: number | null;
};

// Cluster definitions in recommended ship-order. The blurb is the "what to write"
// guidance, aligned with the geo-seo playbook and the comparison-first sequence.
const CLUSTER_DEFS: { intent: PromptIntent; label: string; blurb: string }[] = [
  { intent: "compare", label: "Comparisons & alternatives", blurb: "Honest comparison and alternatives pages vs each rival AI names — highest commercial intent, ship these first." },
  { intent: "solution", label: "Solution pages", blurb: "Focused landing pages that answer the buyer's need and put you in the running as a top option." },
  { intent: "problem", label: "Guides & how-to", blurb: "Problem-aware how-to content that earns citations and builds the topical depth engines reward." },
  { intent: "branded", label: "Branded & trust", blurb: "Own your branded queries so AI describes you accurately — FAQ, entity signals, even-handed positioning." },
];

function statusOf(p: RoadmapInput): RoadmapPromptStatus {
  if (!p.scanned) return "untested";
  if (p.yourPosition == null) return "gap";
  return p.yourPosition <= 3 ? "winning" : "present";
}

// Sort within a cluster so the work to do floats up: gaps first, then present,
// then untested, then winning. Primary prompt wins ties.
const STATUS_RANK: Record<RoadmapPromptStatus, number> = { gap: 0, present: 1, untested: 2, winning: 3 };

function clusterState(c: { total: number; winning: number; present: number; gaps: number }): RoadmapClusterState {
  if (c.total === 0) return "empty";
  if (c.gaps > 0) return "gap";
  if (c.winning >= Math.ceil(c.total / 2)) return "strong";
  return "building";
}

export function buildRoadmap(prompts: RoadmapInput[]): Roadmap {
  const clusters: RoadmapCluster[] = CLUSTER_DEFS.map((def, i) => {
    const mine = prompts.filter((p) => p.intent === def.intent);
    const rows: RoadmapPrompt[] = mine
      .map((p) => ({ id: p.id, text: p.text, isPrimary: p.isPrimary, status: statusOf(p), position: p.yourPosition }))
      .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || Number(b.isPrimary) - Number(a.isPrimary));
    const winning = rows.filter((r) => r.status === "winning").length;
    const present = rows.filter((r) => r.status === "present").length;
    const gaps = rows.filter((r) => r.status === "gap").length;
    const untested = rows.filter((r) => r.status === "untested").length;
    const counts = { total: rows.length, winning, present, gaps };
    return {
      intent: def.intent,
      label: def.label,
      blurb: def.blurb,
      order: i + 1,
      prompts: rows,
      total: rows.length,
      winning,
      present,
      gaps,
      untested,
      state: clusterState(counts),
      isFocus: false,
    };
  });

  // Focus = the first non-empty cluster (in ship-order) with an open gap; else the
  // first that's still building; else none (everything strong/empty).
  const focus = clusters.find((c) => c.state === "gap") ?? clusters.find((c) => c.state === "building") ?? null;
  if (focus) focus.isFocus = true;

  return { clusters, focusIntent: focus?.intent ?? null };
}
