// Brand snapshot: the headline (primary) prompt aggregated across every engine
// that has scanned it. One source of truth for the Overview score, the "How each
// AI sees you" models card, the category leaderboard, and the public share page —
// so the app and a shared link can never disagree.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, BrandSentiment, Citation, BrandSnapshotRow } from "../supabase/database.types";
import type { DashboardCompetitor } from "../types";
import { ENGINES, ENGINE_META, PAID_ENGINES, type EngineId } from "../engines";
import { overallScore } from "../score";
import { domainsFrom, hostOf } from "./domains";

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
  primaryPromptId: string | null;
  primaryPromptText: string | null;
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
    primaryPromptId: null,
    primaryPromptText: null,
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
      "id, engine, created_at, citations, your_position, your_visibility, your_sentiment, scans!inner(brand_id, finished_at, status)",
    )
    .eq("prompt_id", primary.id)
    .eq("scans.brand_id", brandId)
    .eq("scans.status", "done")
    .order("created_at", { ascending: false });

  const latestByEngine = new Map<string, NonNullable<typeof results>[number]>();
  for (const r of results ?? []) {
    if (!latestByEngine.has(r.engine)) latestByEngine.set(r.engine, r);
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
  const citedDomains = new Set<string>();

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
    const finishedAt = (r.scans as { finished_at: string | null }).finished_at;
    if (finishedAt && (!scannedAt || finishedAt > scannedAt)) scannedAt = finishedAt;
    for (const d of domainsFrom(r.citations as Citation[], ownHost)) citedDomains.add(d);

    return { ...base, scanned: true, visibility, position, sentiment };
  });

  snap.enginesScanned = [...latestByEngine.keys()] as EngineId[];
  snap.hasResult = true;
  snap.scannedAt = scannedAt;
  snap.citedDomains = [...citedDomains];

  const visibility = Math.round(avg(visG));
  const position = posG.length ? Math.round(avg(posG)) : null;
  const sentiment = sentG.length ? Math.round(avg(sentG)) : null;
  snap.score = { overall: overallScore(visibility, sentiment, position), visibility, position, sentiment };

  // Aggregate competitors across engines: average visibility, best (min)
  // position, sentiment by strongest seen, and how many distinct engines
  // recommended the brand. Rank by averaged visibility.
  const engineByResult = new Map<string, string>();
  for (const [id, r] of latestByEngine) engineByResult.set(r.id, id);
  type Agg = { name: string; domain: string | null; isYou: boolean; vis: number[]; positions: number[]; sentiment: BrandSentiment; engines: Set<string> };
  const byName = new Map<string, Agg>();
  for (const row of rb ?? []) {
    const key = row.name.trim().toLowerCase();
    const agg = byName.get(key) ?? {
      name: row.name,
      domain: null,
      isYou: false,
      vis: [],
      positions: [],
      sentiment: "neut" as BrandSentiment,
      engines: new Set<string>(),
    };
    // First engine that resolved a real domain wins; others can't see it.
    agg.domain = agg.domain ?? row.domain;
    agg.isYou = agg.isYou || row.is_you;
    agg.vis.push(Number(row.visibility));
    if (row.position != null) agg.positions.push(Number(row.position));
    if (SENTIMENT_RANK.indexOf(row.sentiment) > SENTIMENT_RANK.indexOf(agg.sentiment)) {
      agg.sentiment = row.sentiment;
    }
    const eng = engineByResult.get(row.scan_result_id);
    if (eng) agg.engines.add(eng);
    byName.set(key, agg);
  }

  snap.competitors = [...byName.values()]
    .map((a) => ({
      name: a.name,
      domain: a.domain,
      isYou: a.isYou,
      visibility: Math.round(avg(a.vis)),
      position: a.positions.length ? Math.round(Math.min(...a.positions)) : null,
      sentiment: a.sentiment,
      enginesCount: a.engines.size,
      rank: 0,
    }))
    .sort((x, y) => y.visibility - x.visibility || (x.position ?? 99) - (y.position ?? 99))
    .map((c, i) => ({ ...c, rank: i + 1 }));

  return snap;
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
