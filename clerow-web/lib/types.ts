// Shared app-level types passed between the scan pipeline, API routes, and UI.
import type { PromptIntent, PromptVolume, BrandSentiment, Citation } from "./supabase/database.types";
import type { GeoStep } from "./geoSteps";
import type { Ladder } from "./ladder";

export type { Ladder, LadderLevel, LadderTask, LevelState } from "./ladder";

// The brand profile the scan reasons about (subset of the `brands` row).
export type BrandProfile = {
  url: string;
  company: string;
  industry: string;
  description: string;
  location: string;
  audience: string[];
  competitors: string[];
  differentiators: string[];
  geos: string[];
  enrichNotes: string;
};

export type DiscoveredPrompt = {
  text: string;
  intent: PromptIntent;
  volume: PromptVolume;
  isPrimary: boolean;
};

// One row of the Step 2 ranked result table.
export type RankedBrand = {
  rank: number;
  name: string;
  isYou: boolean;
  visibility: number; // 0–100
  sentiment: BrandSentiment;
  position: number | null;
};

// Result of detecting mentions in a single engine answer.
export type Detection = {
  brands: RankedBrand[];
  you: {
    mentioned: boolean;
    visibility: number;
    position: number | null;
    sentiment: BrandSentiment;
  };
};

// Step 1 payload (POST /api/scan/discover).
export type DiscoverResponse = {
  promptCount: number;
  engineCount: number;
  queriesPerDay: number;
  prompts: (DiscoveredPrompt & { id: string })[];
};

// Step 2 payload (POST /api/scan/run).
export type RunResponse = {
  scanId: string;
  engine: string;
  prompt: string;
  brands: RankedBrand[];
  you: Detection["you"];
  citations: { url: string; title: string }[];
};

// ---- Dashboard (GET /api/dashboard) ----
export type DashboardModel = {
  id: string;
  label: string;
  swatch: string;
  letter: string;
  locked: boolean;
  visibility: number | null;
  position: number | null;
  sentiment: number | null;
};

export type DashboardCompetitor = {
  rank: number;
  name: string;
  isYou: boolean;
  visibility: number;
  sentiment: BrandSentiment;
  position: number | null;
};

export type DashboardPrompt = {
  id: string;
  text: string;
  intent: PromptIntent;
  volume: PromptVolume;
  isPrimary: boolean;
  scanned: boolean;
  yourPosition?: number | null; // best rank across engines, null if scanned but not found
  yourVisibility?: number | null;
};

export type DashboardTask = {
  id: string;
  title: string;
  meta: string;
  xp: number;
  done: boolean;
  archived?: boolean;
  forDate?: string | null;
  completedAt?: string | null;
  level?: number | null; // set when this task belongs to a Climb level
};

// Duolingo-style streak surfaced everywhere the fake level bar used to be.
export type DashboardStreak = {
  current: number;
  longest: number;
  freezes: number;
  activeToday: boolean;
};

// Lifetime XP → level, derived server-side from completed quests. The always-up
// accumulation counter that pairs with the (resettable) streak. See lib/xp.ts.
export type DashboardXp = {
  total: number;
  level: number;
  intoLevel: number; // XP within the current level
  span: number; // XP the current level spans
  pct: number; // 0–100 progress to the next level
  title: string;
};

// Score movement vs the previous daily snapshot, for the Overview score card.
export type DashboardTrend = {
  delta: number | null; // overall-score change vs the prior snapshot (null if <2 points)
  sparkline: number[]; // recent overall scores, oldest → newest
};

// ---- Prompt detail (GET/POST /api/prompts/[id]) ----
// One engine's latest result for a single prompt.
export type PromptEngineResult = {
  engine: string;
  label: string;
  swatch: string;
  letter: string;
  enabled: boolean; // engine has an API key configured
  scannedAt: string | null; // null = never scanned on this engine
  yourPosition: number | null;
  yourVisibility: number;
  yourSentiment: number | null;
  brands: DashboardCompetitor[];
  citations: Citation[];
};

// Everything the prompt slide-out renders: per-engine ranking + the derived,
// specific GEO action steps. Also the shape the future Clerow MCP would expose.
export type PromptDetail = {
  id: string;
  text: string;
  intent: PromptIntent;
  volume: PromptVolume;
  isPrimary: boolean;
  isTracked: boolean;
  scanned: boolean;
  engines: PromptEngineResult[];
  competitorsAhead: string[];
  citedDomains: string[];
  steps: GeoStep[];
};

// Master-AI synthesis over the engines: the collective read on how AI sees the
// brand for its primary prompt, plus the single highest-leverage next move.
// Stored on scans.synthesis; produced by lib/scan/synthesize.ts.
export type ScanSynthesis = {
  verdict: string;
  consensus: string;
  divergence: string;
  bestFix: string;
};

export type DashboardData = {
  hasScan: boolean;
  brand: { company: string; url: string } | null;
  scannedAt?: string | null;
  engine?: string;
  // Master-AI synthesis of the latest multi-engine scan (null until the
  // background job fills it in, or for single-engine free scans).
  synthesis?: ScanSynthesis | null;
  primaryPrompt?: string | null;
  score?: { overall: number; visibility: number; position: number | null; sentiment: number | null };
  models?: DashboardModel[];
  competitors?: DashboardCompetitor[];
  prompts?: DashboardPrompt[];
  tasks?: DashboardTask[];
  ladder?: Ladder;
  streak?: DashboardStreak;
  xp?: DashboardXp;
  trend?: DashboardTrend;
  citations?: { url: string; title: string }[];
  scansLeft?: number; // scans remaining this billing period (budget)
  budget?: { spent: number; ceiling: number };
  subscribed?: boolean; // active paid plan (gates re-scan, extra models, MCP)
};
