// Shared app-level types passed between the scan pipeline, API routes, and UI.
import type { PromptIntent, PromptVolume, BrandSentiment } from "./supabase/database.types";

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
};

export type DashboardTask = { id: string; title: string; meta: string; xp: number; done: boolean };

export type DashboardData = {
  hasScan: boolean;
  brand: { company: string; url: string } | null;
  scannedAt?: string | null;
  engine?: string;
  primaryPrompt?: string | null;
  score?: { overall: number; visibility: number; position: number | null; sentiment: number | null };
  models?: DashboardModel[];
  competitors?: DashboardCompetitor[];
  prompts?: DashboardPrompt[];
  tasks?: DashboardTask[];
  citations?: { url: string; title: string }[];
};
