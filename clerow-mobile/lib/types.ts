// Response shapes mirrored from clerow-web/lib/types.ts. Copied (not shared)
// until a shared package exists; keep in sync with the web API.

export type BrandSentiment = 'pos' | 'neut' | 'neg' | 'warn';
export type PromptIntent = 'solution' | 'compare' | 'problem' | 'branded';
export type PromptVolume = 'high' | 'medium' | 'low' | 'rising';

export type Citation = { url: string; title: string };

export type RankedBrand = {
  rank: number;
  name: string;
  isYou: boolean;
  visibility: number;
  sentiment: BrandSentiment;
  position: number | null;
};

export type RunResponse = {
  scanId: string;
  engine: string;
  prompt: string;
  brands: RankedBrand[];
  you: { mentioned: boolean; visibility: number; position: number | null; sentiment: BrandSentiment };
  citations: Citation[];
};

export type DiscoverResponse = {
  promptCount: number;
  engineCount: number;
  queriesPerDay: number;
  prompts: { id: string; text: string; intent: PromptIntent; volume: PromptVolume; isPrimary: boolean }[];
};

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

export type DashboardTask = {
  id: string;
  title: string;
  meta: string;
  xp: number;
  done: boolean;
  forDate?: string | null;
  completedAt?: string | null;
};

export type DashboardStreak = {
  current: number;
  longest: number;
  freezes: number;
  activeToday: boolean;
};

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
  streak?: DashboardStreak;
  citations?: Citation[];
};

export type SourceRow = {
  domain: string;
  type: 'UGC' | 'Directory' | 'Editorial' | 'Yours' | 'Other';
  citedPct: number;
  citedCount: number;
  models: string[];
  isYours: boolean;
  note: string;
  xp: number;
};
export type SourcesResponse = { sources: SourceRow[]; totalResults: number };

export type FounderRow = {
  rank: number;
  label: string;
  overall: number;
  visibility: number;
  isYou: boolean;
};
export type LeaderboardResponse = {
  available: boolean;
  total: number;
  yourRank: number | null;
  rows: FounderRow[];
};

export type SnapshotRow = {
  captured_on: string;
  overall: number;
  visibility: number;
  position: number | null;
  sentiment: number | null;
  your_rank: number | null;
  engines: number;
  competitors: number;
};
export type HistoryResponse = {
  history: SnapshotRow[];
  latest: SnapshotRow | null;
  previous: SnapshotRow | null;
  delta: { overall: number; visibility: number; position: number };
};

export type PromptEngineResult = {
  engine: string;
  label: string;
  swatch: string;
  letter: string;
  enabled: boolean;
  scannedAt: string | null;
  yourPosition: number | null;
  yourVisibility: number;
  yourSentiment: number | null;
  brands: DashboardCompetitor[];
  citations: Citation[];
};
export type GeoStep = { title: string; detail?: string; xp?: number; [k: string]: unknown };
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

export type BillingStatus = {
  subscribed: boolean;
  plan: string | null;
  status: string | null;
  cancelAtPeriodEnd?: boolean;
};
