// Aggregate everything the prompt slide-out needs: each engine's latest ranking
// for one prompt, the competitors beating the brand, the third-party sources the
// engines cited, and the derived GEO action steps. Used by GET/POST
// /api/prompts/[id] — and the natural payload for the future Clerow MCP.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Citation } from "../supabase/database.types";
import type { PromptDetail, PromptEngineResult } from "../types";
import { ENGINES, ENGINE_META, PAID_ENGINES, type EngineId } from "../engines";
import { buildGeoSteps } from "../geoSteps";
import { hostOf, domainsFrom } from "./domains";

type DB = SupabaseClient<Database>;

// Load the prompt + its latest result per engine, then derive the action plan.
// Returns null if the prompt doesn't belong to the brand.
export async function loadPromptDetail(
  db: DB,
  brandId: string,
  promptId: string,
): Promise<PromptDetail | null> {
  const { data: brand } = await db
    .from("brands")
    .select("company, url")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) return null;

  const { data: prompt } = await db
    .from("prompts")
    .select("*")
    .eq("id", promptId)
    .eq("brand_id", brandId)
    .maybeSingle();
  if (!prompt) return null;

  // Every scan_result for this prompt under this brand, newest first.
  const { data: results } = await db
    .from("scan_results")
    .select(
      "id, engine, created_at, citations, your_position, your_visibility, your_sentiment, scans!inner(brand_id, finished_at, status)",
    )
    .eq("prompt_id", promptId)
    .eq("scans.brand_id", brandId)
    .eq("scans.status", "done")
    .order("created_at", { ascending: false });

  // Keep only the newest result per engine.
  const latestByEngine = new Map<string, NonNullable<typeof results>[number]>();
  for (const r of results ?? []) {
    if (!latestByEngine.has(r.engine)) latestByEngine.set(r.engine, r);
  }

  // Fetch the ranked brands for each chosen result in one round trip.
  const resultIds = [...latestByEngine.values()].map((r) => r.id);
  const brandsByResult = new Map<string, PromptEngineResult["brands"]>();
  if (resultIds.length) {
    const { data: rb } = await db
      .from("result_brands")
      .select("*")
      .in("scan_result_id", resultIds)
      .order("rank");
    for (const row of rb ?? []) {
      const list = brandsByResult.get(row.scan_result_id) ?? [];
      list.push({
        rank: row.rank,
        name: row.name,
        isYou: row.is_you,
        visibility: Math.round(Number(row.visibility)),
        sentiment: row.sentiment,
        position: row.position != null ? Number(row.position) : null,
      });
      brandsByResult.set(row.scan_result_id, list);
    }
  }

  const ownHost = hostOf(brand.url);

  // One PromptEngineResult per paid engine, whether or not it has run yet.
  const engines: PromptEngineResult[] = PAID_ENGINES.map((id: EngineId) => {
    const r = latestByEngine.get(id);
    const meta = ENGINE_META[id];
    const citations = (r?.citations as Citation[] | undefined) ?? [];
    return {
      engine: id,
      label: ENGINES[id].label,
      swatch: meta.swatch,
      letter: meta.letter,
      enabled: ENGINES[id].enabled,
      scannedAt: r ? (r.scans as { finished_at: string | null }).finished_at : null,
      yourPosition: r?.your_position != null ? Number(r.your_position) : null,
      yourVisibility: r ? Math.round(Number(r.your_visibility)) : 0,
      yourSentiment: r?.your_sentiment != null ? Math.round(Number(r.your_sentiment)) : null,
      brands: r ? brandsByResult.get(r.id) ?? [] : [],
      citations,
    };
  });

  const scannedEngines = engines.filter((e) => e.scannedAt != null);

  // Competitors ranked above the brand, unioned across engines (first seen wins).
  const competitorsAhead: string[] = [];
  const seenComp = new Set<string>();
  let bestPosition: number | null = null;
  const citedDomains = new Set<string>();

  for (const e of scannedEngines) {
    if (e.yourPosition != null) {
      bestPosition = bestPosition == null ? e.yourPosition : Math.min(bestPosition, e.yourPosition);
    }
    const you = e.brands.find((b) => b.isYou);
    const yourRank = you?.rank ?? Number.POSITIVE_INFINITY;
    for (const b of e.brands) {
      if (!b.isYou && b.rank < yourRank && !seenComp.has(b.name.toLowerCase())) {
        seenComp.add(b.name.toLowerCase());
        competitorsAhead.push(b.name);
      }
    }
    for (const d of domainsFrom(e.citations, ownHost)) citedDomains.add(d);
  }

  const steps = buildGeoSteps({
    prompt: { text: prompt.text, intent: prompt.intent },
    company: brand.company || "your brand",
    competitorsAhead,
    citedDomains: [...citedDomains],
    yourPosition: bestPosition,
    scanned: scannedEngines.length > 0,
  });

  return {
    id: prompt.id,
    text: prompt.text,
    intent: prompt.intent,
    volume: prompt.volume,
    isPrimary: prompt.is_primary,
    isTracked: prompt.is_tracked,
    scanned: scannedEngines.length > 0,
    engines,
    competitorsAhead,
    citedDomains: [...citedDomains],
    steps,
  };
}
