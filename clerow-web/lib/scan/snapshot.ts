// Brand snapshot: the headline (primary) prompt aggregated across every engine
// that has scanned it. One source of truth for the Overview score, the "How each
// AI sees you" models card, the category leaderboard, and the public share page —
// so the app and a shared link can never disagree.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, BrandSentiment, Citation, BrandSnapshotRow } from "../supabase/database.types";
import type { DashboardCompetitor, ScanSynthesis } from "../types";
import { ENGINES, ENGINE_META, PAID_ENGINES, type EngineId } from "../engines";
import { overallScore } from "../score";
import { domainsFrom, hostOf } from "./domains";
import { canonicalBrandKey } from "./detect";

type DB = SupabaseClient<Database>;

// One engine's standing on the primary prompt for the models card.
export type ModelStanding = {
  id: EngineId;
  label: string;
  swatch: string;
  letter: string;
  locked: boolean; // engine has no API key configured
  scanned: boolean; // engine has a result for the primary prompt
  visibility: number | null;
  position: number | null;
  sentiment: number | null;
};

export type BrandSnapshot = {
  hasResult: boolean;
  scannedAt: string | null;
  engines: ModelStanding[];
  enginesScanned: EngineId[]; // engines that actually have a primary-prompt result
  score: { overall: number; visibility: number; position: number | null; sentiment: number | null };
  competitors: DashboardCompetitor[];
  citedDomains: string[];
  // domain → how many of the scanned models cited it (consensus signal for tasks).
  citedDomainEngines: Record<string, number>;
  primaryPromptId: string | null;
  primaryPromptText: string | null;
  // The multi-model "what all the AIs collectively think" verdict for the latest
  // scan. Only exists for multi-engine (paid) scans — null for free/single-engine.
  synthesis: ScanSynthesis | null;
  // Each engine's PREVIOUS result for the primary prompt (second-latest row),
  // so callers can narrate what changed since the last scan (lib/scan/delta.ts)
  // and diff the market signal (lib/scan/diff.ts). Computed from rows the main
  // query already fetched — costs nothing extra. Null until an engine has been
  // scanned at least twice.
  previous: {
    engines: Partial<Record<EngineId, { visibility: number; position: number | null }>>;
    score: { overall: number; visibility: number; position: number | null };
    citedDomainEngines: Record<string, number>;
    // prev scan_result id → engine, for lazily aggregating the previous
    // competitor standings (result_brands) without re-deriving engines.
    engineByResult: Record<string, EngineId>;
    scannedAt: string | null;
  } | null;
};

const SENTIMENT_RANK: BrandSentiment[] = ["neg", "warn", "neut", "pos"];
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function emptySnapshot(): BrandSnapshot {
  return {
    hasResult: false,
    scannedAt: null,
    engines: PAID_ENGINES.map((id) => ({
      id,
      label: ENGINES[id].label,
      swatch: ENGINE_META[id].swatch,
      letter: ENGINE_META[id].letter,
      locked: !ENGINES[id].enabled,
      scanned: false,
      visibility: null,
      position: null,
      sentiment: null,
    })),
    enginesScanned: [],
    score: { overall: 0, visibility: 0, position: null, sentiment: null },
    competitors: [],
    citedDomains: [],
    citedDomainEngines: {},
    primaryPromptId: null,
    primaryPromptText: null,
    synthesis: null,
    previous: null,
  };
}

export async function loadBrandSnapshot(db: DB, brandId: string): Promise<BrandSnapshot> {
  const { data: brand } = await db
    .from("brands")
    .select("url")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) return emptySnapshot();

  // The headline prompt: the flagged primary, else the brand's first prompt.
  const { data: prompts } = await db
    .from("prompts")
    .select("id, text, is_primary, created_at")
    .eq("brand_id", brandId)
    .order("created_at");
  const primary = (prompts ?? []).find((p) => p.is_primary) ?? (prompts ?? [])[0];
  if (!primary) return emptySnapshot();

  // Latest done result per engine for that prompt.
  const { data: results } = await db
    .from("scan_results")
    .select(
      "id, engine, created_at, citations, your_position, your_visibility, your_sentiment, scans!inner(brand_id, finished_at, status, synthesis)",
    )
    .eq("prompt_id", primary.id)
    .eq("scans.brand_id", brandId)
    .eq("scans.status", "done")
    .order("created_at", { ascending: false });

  const latestByEngine = new Map<string, NonNullable<typeof results>[number]>();
  // Each engine's second-latest row — the "previous scan" for delta narration.
  const prevByEngine = new Map<string, NonNullable<typeof results>[number]>();
  for (const r of results ?? []) {
    if (!latestByEngine.has(r.engine)) latestByEngine.set(r.engine, r);
    else if (!prevByEngine.has(r.engine)) prevByEngine.set(r.engine, r);
  }

  const snap = emptySnapshot();
  snap.primaryPromptId = primary.id;
  snap.primaryPromptText = primary.text;

  if (latestByEngine.size === 0) return snap;

  // Ranked brands for the chosen results, in one query.
  const resultIds = [...latestByEngine.values()].map((r) => r.id);
  const { data: rb } = await db
    .from("result_brands")
    .select("*")
    .in("scan_result_id", resultIds)
    .order("rank");

  const ownHost = hostOf(brand.url);
  const visG: number[] = [];
  const posG: number[] = [];
  const sentG: number[] = [];
  let scannedAt: string | null = null;
  let synthesis: ScanSynthesis | null = null;
  // domain → the set of engines that cited it, so we can rank sources by how many
  // of the 5 models pull from each (a 5-model scan surfaces consensus sources).
  const citedDomains = new Map<string, Set<string>>();

  snap.engines = PAID_ENGINES.map((id: EngineId) => {
    const r = latestByEngine.get(id);
    const meta = ENGINE_META[id];
    const base = {
      id,
      label: ENGINES[id].label,
      swatch: meta.swatch,
      letter: meta.letter,
      locked: !ENGINES[id].enabled,
    };
    if (!r) return { ...base, scanned: false, visibility: null, position: null, sentiment: null };

    const visibility = Math.round(Number(r.your_visibility));
    const position = r.your_position != null ? Number(r.your_position) : null;
    const sentiment = r.your_sentiment != null ? Math.round(Number(r.your_sentiment)) : null;
    visG.push(visibility);
    if (position != null) posG.push(position);
    if (sentiment != null) sentG.push(sentiment);
    const sc = r.scans as { finished_at: string | null; synthesis: ScanSynthesis | null };
    if (sc.finished_at && (!scannedAt || sc.finished_at > scannedAt)) {
      scannedAt = sc.finished_at;
      synthesis = sc.synthesis ?? null; // the most-recently-finished scan's verdict
    }
    for (const d of domainsFrom(r.citations as Citation[], ownHost)) {
      let engines = citedDomains.get(d);
      if (!engines) { engines = new Set<string>(); citedDomains.set(d, engines); }
      engines.add(id);
    }

    return { ...base, scanned: true, visibility, position, sentiment };
  });

  snap.enginesScanned = [...latestByEngine.keys()] as EngineId[];
  snap.hasResult = true;
  snap.scannedAt = scannedAt;
  snap.synthesis = synthesis;
  // Most-cited-across-models first, so source tasks target consensus sources.
  snap.citedDomains = [...citedDomains.entries()].sort((a, b) => b[1].size - a[1].size).map(([d]) => d);
  snap.citedDomainEngines = Object.fromEntries([...citedDomains].map(([d, set]) => [d, set.size]));

  const visibility = Math.round(avg(visG));
  const position = posG.length ? Math.round(avg(posG)) : null;
  const sentiment = sentG.length ? Math.round(avg(sentG)) : null;
  snap.score = { overall: overallScore(visibility, sentiment, position), visibility, position, sentiment };

  const engineByResult = new Map<string, string>();
  for (const [id, r] of latestByEngine) engineByResult.set(r.id, id);
  snap.competitors = aggregateCompetitors(rb ?? [], engineByResult, latestByEngine.size);

  // The previous standings, from rows already in hand (each engine's second-
  // latest result). Same aggregation rules as the current block so deltas
  // compare like with like.
  if (prevByEngine.size > 0) {
    const pVis: number[] = [];
    const pPos: number[] = [];
    const pSent: number[] = [];
    const pEngines: NonNullable<BrandSnapshot["previous"]>["engines"] = {};
    const pEngineByResult: Record<string, EngineId> = {};
    const pCited = new Map<string, Set<string>>();
    let pScannedAt: string | null = null;
    for (const [id, r] of prevByEngine) {
      const visibility = Math.round(Number(r.your_visibility));
      const position = r.your_position != null ? Number(r.your_position) : null;
      const sentiment = r.your_sentiment != null ? Math.round(Number(r.your_sentiment)) : null;
      pEngines[id as EngineId] = { visibility, position };
      pEngineByResult[r.id] = id as EngineId;
      pVis.push(visibility);
      if (position != null) pPos.push(position);
      if (sentiment != null) pSent.push(sentiment);
      if (r.created_at && (!pScannedAt || r.created_at > pScannedAt)) pScannedAt = r.created_at;
      for (const d of domainsFrom(r.citations as Citation[], ownHost)) {
        let engines = pCited.get(d);
        if (!engines) { engines = new Set<string>(); pCited.set(d, engines); }
        engines.add(id);
      }
    }
    const pV = Math.round(avg(pVis));
    const pP = pPos.length ? Math.round(avg(pPos)) : null;
    const pS = pSent.length ? Math.round(avg(pSent)) : null;
    snap.previous = {
      engines: pEngines,
      score: { overall: overallScore(pV, pS, pP), visibility: pV, position: pP },
      citedDomainEngines: Object.fromEntries([...pCited].map(([d, set]) => [d, set.size])),
      engineByResult: pEngineByResult,
      scannedAt: pScannedAt,
    };
  }

  return snap;
}

// The fields the competitor aggregation reads off a result_brands row.
export type CompetitorRow = {
  scan_result_id: string;
  name: string;
  domain: string | null;
  is_you: boolean;
  visibility: number;
  position: number | null;
  sentiment: BrandSentiment;
};

// Aggregate ranked brands across engines: visibility blended over every scanned
// model (absent = 0, so a single-model fluke can't outrank consensus brands),
// best (min) position, sentiment by strongest seen, and how many distinct
// engines actually named the brand. Rank strictly follows blended visibility,
// so the leaderboard can never look out of order against the displayed %.
//
// Grouping: by resolved DOMAIN when an engine resolved one (the only signal that
// reliably merges "Suno" with "Suno AI"), with name-normalized (norm) fallback —
// and domain-less rows fold into a domain group whose name norm-matches. The
// display name is the shortest variant seen ("Suno" beats "Suno AI").
// Exported pure for tests.
export function aggregateCompetitors(
  rows: CompetitorRow[],
  engineByResult: Map<string, string>,
  scannedCount: number,
): DashboardCompetitor[] {
  type Agg = { names: string[]; domain: string | null; isYou: boolean; vis: number[]; positions: number[]; sentiment: BrandSentiment; engines: Set<string> };
  const groups = new Map<string, Agg>();
  // canonical name key → group key, so a domain-less "Suno" row joins suno.com's
  // group and name variants ("Scrunch" / "Scrunch AI") share one group.
  const keyByName = new Map<string, string>();
  const normDomain = (d: string | null) => (d ? d.trim().toLowerCase().replace(/^www\./, "") : null);

  // Domain-bearing rows first, so their groups exist before name-only rows fold in.
  const ordered = [...rows].sort((a, b) => Number(!a.domain) - Number(!b.domain));
  for (const row of ordered) {
    const dom = normDomain(row.domain);
    const nameKey = canonicalBrandKey(row.name);
    const key = dom ? `d:${dom}` : (keyByName.get(nameKey) ?? `n:${nameKey}`);
    const agg = groups.get(key) ?? {
      names: [],
      domain: null,
      isYou: false,
      vis: [],
      positions: [],
      sentiment: "neut" as BrandSentiment,
      engines: new Set<string>(),
    };
    if (!keyByName.has(nameKey)) keyByName.set(nameKey, key);
    agg.names.push(row.name.trim());
    // First engine that resolved a real domain wins; others can't see it.
    agg.domain = agg.domain ?? row.domain;
    agg.isYou = agg.isYou || row.is_you;
    agg.vis.push(Number(row.visibility));
    if (row.position != null) agg.positions.push(Number(row.position));
    if (SENTIMENT_RANK.indexOf(row.sentiment) > SENTIMENT_RANK.indexOf(agg.sentiment)) {
      agg.sentiment = row.sentiment;
    }
    // Only a real mention counts toward "N AIs" — the user's own row is always
    // persisted (even at 0%) and must not read as "recommended by 5 AIs".
    const eng = engineByResult.get(row.scan_result_id);
    const mentioned = Number(row.visibility) > 0 || row.position != null;
    if (eng && mentioned) agg.engines.add(eng);
    groups.set(key, agg);
  }

  return [...groups.values()]
    .map((a) => ({
      name: a.names.reduce((best, n) => (n && n.length < best.length ? n : best), a.names[0] ?? ""),
      domain: a.domain,
      isYou: a.isYou,
      // Blend across ALL scanned models (absent = 0) — same denominator as the
      // user's own headline score, so rows are comparable. Single-model scans
      // divide by 1, so the free scan numbers are unchanged.
      visibility: Math.round(a.vis.reduce((s, v) => s + v, 0) / Math.max(1, scannedCount)),
      position: a.positions.length ? Math.round(Math.min(...a.positions)) : null,
      sentiment: a.sentiment,
      enginesCount: a.engines.size,
      rank: 0,
    }))
    // Rank follows the displayed % — visibility first, consensus (engines that
    // actually named the brand) as tie-break, then best position.
    .sort((x, y) => y.visibility - x.visibility || y.enginesCount - x.enginesCount || (x.position ?? 99) - (y.position ?? 99))
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

// Persist today's aggregated snapshot (idempotent per brand-local day; last write
// wins). Builds the week-over-week history Reports charts and the leaderboard
// ranking. No-op until the brand has at least one result. `capturedOn` is the
// brand-local YYYY-MM-DD day key.
export async function captureDailySnapshot(
  db: DB,
  brandId: string,
  snap: BrandSnapshot,
  capturedOn: string,
): Promise<void> {
  if (!snap.hasResult) return;
  const you = snap.competitors.find((c) => c.isYou);
  await db.from("brand_snapshots").upsert(
    {
      brand_id: brandId,
      captured_on: capturedOn,
      overall: snap.score.overall,
      visibility: snap.score.visibility,
      position: snap.score.position,
      sentiment: snap.score.sentiment,
      engines: snap.enginesScanned.length,
      your_rank: you?.rank ?? null,
      competitors: snap.competitors.filter((c) => !c.isYou).length,
    },
    { onConflict: "brand_id,captured_on" },
  );
}

// Chronological snapshot series for a brand (oldest → newest).
export async function loadSnapshotHistory(
  db: DB,
  brandId: string,
  limit = 90,
): Promise<BrandSnapshotRow[]> {
  const { data } = await db
    .from("brand_snapshots")
    .select("*")
    .eq("brand_id", brandId)
    .order("captured_on", { ascending: false })
    .limit(limit);
  return (data ?? []).reverse();
}
