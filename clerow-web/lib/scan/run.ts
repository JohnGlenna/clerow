import type { SupabaseClient } from "@supabase/supabase-js";
import { getEngine, enabledEngines, ENGINES, FREE_ENGINES, PAID_ENGINES, type EngineId } from "../engines";
import { discoverPrompts } from "./discover";
import { detectRanking, discoverCompetitors, mergeDiscoveredBrands } from "./detect";
import type { ScanEvent } from "./events";
import { costForEngines, roundUsd } from "../billing/cost";
import { assertBudget, planFromSub } from "../billing/limits";
import { getSubscription } from "../billing/subscription";
import type { BrandProfile, RankedBrand, RunResponse } from "../types";
import type { Database, BrandSentiment, Citation } from "../supabase/database.types";

type DB = SupabaseClient<Database>;
type BrandRow = Database["public"]["Tables"]["brands"]["Row"];
type PromptRow = Database["public"]["Tables"]["prompts"]["Row"];

function toProfile(b: BrandRow): BrandProfile {
  return {
    url: b.url,
    company: b.company,
    industry: b.industry,
    description: b.description,
    location: b.location,
    audience: b.audience,
    competitors: b.competitors,
    differentiators: b.differentiators,
    geos: b.geos,
    enrichNotes: b.enrich_notes,
  };
}

const SENTIMENT_SCORE: Record<BrandSentiment, number> = { pos: 90, neut: 60, warn: 35, neg: 20 };

// Ensure the brand has a prompt set; generate one if missing. The caller passes
// a Supabase client (user-scoped via RLS for the free scan, or service-role for
// background jobs).
export async function ensurePrompts(db: DB, brandId: string) {
  const { data: brand, error: be } = await db.from("brands").select("*").eq("id", brandId).single();
  if (be || !brand) throw new Error(`Brand not found: ${be?.message ?? brandId}`);

  const { data: existing } = await db.from("prompts").select("*").eq("brand_id", brandId);
  if (existing && existing.length > 0) return { brand, prompts: existing };

  const discovered = await discoverPrompts(toProfile(brand));
  const rows = discovered.map((p) => ({
    brand_id: brandId,
    text: p.text,
    intent: p.intent,
    volume: p.volume,
    is_primary: p.isPrimary,
    source: "ai" as const,
  }));
  const { data: inserted, error: ie } = await db.from("prompts").insert(rows).select();
  if (ie || !inserted) throw new Error(`Failed to save prompts: ${ie?.message}`);
  return { brand, prompts: inserted };
}

// Query one engine for one prompt, detect the ranking, and persist the
// scan_result + result_brands rows. Returns the engine's detection so the caller
// can summarize. Throws on engine/DB failure (the caller decides whether one
// engine failing should fail the whole scan).
async function persistEngineResult(
  db: DB,
  scanId: string,
  profile: BrandProfile,
  prompt: PromptRow,
  engineId: EngineId,
  signal?: AbortSignal,
  onEvent?: (e: ScanEvent) => void,
  // Optional hook to transform the detected brands before persisting (the free
  // scan uses it to merge in engine-discovered competitors). No-op when omitted.
  enrichBrands?: (brands: RankedBrand[]) => Promise<RankedBrand[]>,
) {
  const engine = getEngine(engineId);
  // Emit per-engine progress as we go. Under the concurrent Promise.allSettled in
  // runPromptScan each engine drives its own events independently.
  const emit = (status: "querying" | "detecting" | "done" | "failed", extra?: { position?: number | null; visibility?: number; error?: string }) =>
    onEvent?.({ type: "engine", engine: engineId, label: engine.label, status, promptId: prompt.id, ...extra });

  try {
    emit("querying");
    const answer = await engine.query(prompt.text, signal);
    emit("detecting");
    let detection = await detectRanking(answer.text, profile, signal);
    if (enrichBrands) {
      detection = { ...detection, brands: await enrichBrands(detection.brands) };
    }

    const { data: result, error: re } = await db
      .from("scan_results")
      .insert({
        scan_id: scanId,
        prompt_id: prompt.id,
        engine: engineId,
        raw_answer: answer.text,
        citations: answer.citations,
        your_position: detection.you.position,
        your_visibility: detection.you.visibility,
        your_sentiment: SENTIMENT_SCORE[detection.you.sentiment],
      })
      .select()
      .single();
    if (re || !result) throw new Error(`Failed to save scan result: ${re?.message}`);

    const brandRows = detection.brands.map((b) => ({
      scan_result_id: result.id,
      rank: b.rank,
      name: b.name,
      domain: b.domain,
      is_you: b.isYou,
      visibility: b.visibility,
      sentiment: b.sentiment,
      position: b.position,
    }));
    const { error: rbe } = await db.from("result_brands").insert(brandRows);
    if (rbe) throw new Error(`Failed to save result brands: ${rbe.message}`);

    emit("done", { position: detection.you.position, visibility: detection.you.visibility });
    return { engine: engineId, label: engine.label, detection, citations: answer.citations };
  } catch (err) {
    emit("failed", { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

// Run the free scan: pick the primary prompt, query one engine, detect the
// ranking, persist everything. Fails loudly — on any error the scan row is
// marked 'error' and no half-written success is left behind.
export async function runFreeScan(
  db: DB,
  brandId: string,
  onEvent?: (e: ScanEvent) => void,
): Promise<RunResponse> {
  // First configured free engine (ChatGPT preferred; Perplexity fallback).
  const engineId = FREE_ENGINES.find((id) => getEngine(id).enabled) ?? FREE_ENGINES[FREE_ENGINES.length - 1];

  const { brand, prompts } = await ensurePrompts(db, brandId);
  const primary = prompts.find((p) => p.is_primary) ?? prompts[0];
  if (!primary) throw new Error("No prompt available to scan");

  // Surface the single engine as "queued" up front so its row appears immediately.
  onEvent?.({ type: "engine", engine: engineId, label: getEngine(engineId).label, status: "queued" });

  const { data: scan, error: se } = await db
    .from("scans")
    .insert({ brand_id: brandId, tier: "free", status: "running", engines: [engineId] })
    .select()
    .single();
  if (se || !scan) throw new Error(`Failed to create scan: ${se?.message}`);

  try {
    const profile = toProfile(brand);
    // Enrich the (often sparse) buyer-prompt ranking with the engine's own list
    // of recommended alternatives, so the reveal shows a real competitive set
    // instead of just the one brand the answer happened to name. Best-effort:
    // discoverCompetitors swallows its own errors and returns [] on failure.
    // Adds one extra engine + detection call to the once-per-brand free scan.
    const { detection, label, citations } = await persistEngineResult(
      db,
      scan.id,
      profile,
      primary,
      engineId,
      undefined,
      onEvent,
      async (brands) => {
        const engine = getEngine(engineId);
        const discovered = await discoverCompetitors(primary.text, profile, (p, s) => engine.query(p, s));
        return mergeDiscoveredBrands(brands, discovered);
      },
    );

    await seedTeaserTasks(db, brandId, profile, primary.text, detection.you.mentioned, detection.brands, citations);

    await db
      .from("scans")
      .update({ status: "done", est_cost: roundUsd(costForEngines([engineId])), finished_at: new Date().toISOString() })
      .eq("id", scan.id);

    return {
      scanId: scan.id,
      engine: label,
      prompt: primary.text,
      brands: detection.brands,
      you: detection.you,
      citations,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .from("scans")
      .update({ status: "error", error: message, finished_at: new Date().toISOString() })
      .eq("id", scan.id);
    throw err;
  }
}

// Reconstruct the primary prompt's latest stored ranking as a RunResponse,
// without calling any engine. Lets the free reveal scan be served from data we
// already paid for (e.g. on a repeat onboarding) instead of spending again.
// Returns null when there's nothing completed to show.
export async function loadLatestFreeResult(db: DB, brandId: string): Promise<RunResponse | null> {
  const { data: primary } = await db
    .from("prompts")
    .select("id, text")
    .eq("brand_id", brandId)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();
  if (!primary) return null;

  // The primary prompt's most recent result from any completed scan.
  const { data: pr } = await db
    .from("scan_results")
    .select("id, engine, citations, scan_id, scans!inner(brand_id, status)")
    .eq("scans.brand_id", brandId)
    .eq("scans.status", "done")
    .eq("prompt_id", primary.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!pr) return null;

  const { data: brandRows } = await db
    .from("result_brands")
    .select("rank, name, domain, is_you, visibility, sentiment, position")
    .eq("scan_result_id", pr.id)
    .order("rank", { ascending: true });

  const brands: RankedBrand[] = (brandRows ?? []).map((b) => ({
    rank: b.rank,
    name: b.name,
    domain: b.domain,
    isYou: b.is_you,
    visibility: b.visibility,
    sentiment: b.sentiment,
    position: b.position,
  }));

  // `you` is derived from your row exactly as detectRanking builds it live.
  const youRow = brands.find((b) => b.isYou);
  const you = {
    mentioned: youRow ? youRow.visibility > 0 || youRow.position != null : false,
    visibility: youRow?.visibility ?? 0,
    position: youRow?.position ?? null,
    sentiment: (youRow?.sentiment ?? "warn") as BrandSentiment,
  };

  return {
    scanId: pr.scan_id,
    engine: ENGINES[pr.engine as EngineId]?.label ?? pr.engine,
    prompt: primary.text,
    brands,
    you,
    citations: (pr.citations as Citation[]) ?? [],
  };
}

// Per-engine outcome of a multi-engine scan (paid). `error` is set when that one
// engine failed; the scan as a whole still succeeds as long as one engine ran.
export type EngineRunOutcome =
  | { engine: EngineId; label: string; ok: true; position: number | null; visibility: number }
  | { engine: EngineId; label: string; ok: false; error: string };

export type PromptScanResult = {
  scanId: string;
  promptId: string;
  prompt: string;
  outcomes: EngineRunOutcome[];
};

// Scan a single prompt across several engines (the paid, on-demand "scan this
// prompt" action). Engines run concurrently and independently: one engine being
// down or unconfigured never fails the others. The scan is marked 'done' if at
// least one engine produced a result, otherwise 'error'.
export async function runPromptScan(
  db: DB,
  brandId: string,
  promptId: string,
  engineIds: EngineId[] = PAID_ENGINES,
  onEvent?: (e: ScanEvent) => void,
  // `skipBudget` runs the scan without the per-plan budget guard — used only by
  // the admin prospect-report tool, whose synthetic brands are founder-funded and
  // not tied to a subscribed user. Always off for real user scans.
  opts: { skipBudget?: boolean } = {},
): Promise<PromptScanResult> {
  const engines = enabledEngines(engineIds);
  if (engines.length === 0) {
    throw new Error("No AI engines are configured. Add at least one engine API key.");
  }

  const { data: brand, error: be } = await db.from("brands").select("*").eq("id", brandId).single();
  if (be || !brand) throw new Error(`Brand not found: ${be?.message ?? brandId}`);

  // Per-plan monthly cost guard — refuse the scan if it would exceed the budget.
  // Throws BudgetExceededError (callers map it to an "out of scans" response).
  if (!opts.skipBudget) {
    const plan = planFromSub(await getSubscription(db, brand.user_id));
    await assertBudget(db, brand.user_id, plan, costForEngines(engines), new Date());
  }

  const { data: prompt, error: pe } = await db
    .from("prompts")
    .select("*")
    .eq("id", promptId)
    .eq("brand_id", brandId)
    .single();
  if (pe || !prompt) throw new Error(`Prompt not found: ${pe?.message ?? promptId}`);

  const { data: scan, error: se } = await db
    .from("scans")
    .insert({ brand_id: brandId, tier: "full", status: "running", engines })
    .select()
    .single();
  if (se || !scan) throw new Error(`Failed to create scan: ${se?.message}`);

  // Show every engine as "queued" before any resolves, so all model rows render
  // up front and then tick independently as each one progresses.
  for (const id of engines) {
    onEvent?.({ type: "engine", engine: id, label: getEngine(id).label, status: "queued", promptId: prompt.id });
  }

  const profile = toProfile(brand);
  const settled = await Promise.allSettled(
    engines.map((id) => persistEngineResult(db, scan.id, profile, prompt, id, undefined, onEvent)),
  );

  const outcomes: EngineRunOutcome[] = settled.map((s, i) => {
    const engine = getEngine(engines[i]);
    if (s.status === "fulfilled") {
      return {
        engine: engines[i],
        label: engine.label,
        ok: true,
        position: s.value.detection.you.position,
        visibility: s.value.detection.you.visibility,
      };
    }
    const message = s.reason instanceof Error ? s.reason.message : String(s.reason);
    return { engine: engines[i], label: engine.label, ok: false, error: message };
  });

  const anyOk = outcomes.some((o) => o.ok);
  // Charge only for engines that actually produced a result.
  const okEngines = outcomes.filter((o) => o.ok).map((o) => o.engine);
  await db
    .from("scans")
    .update({
      status: anyOk ? "done" : "error",
      error: anyOk ? null : "All engines failed",
      est_cost: roundUsd(costForEngines(okEngines)),
      finished_at: new Date().toISOString(),
    })
    .eq("id", scan.id);

  if (!anyOk) {
    const firstErr = outcomes.find((o) => !o.ok) as Extract<EngineRunOutcome, { ok: false }>;
    throw new Error(firstErr?.error ?? "Scan failed");
  }

  return { scanId: scan.id, promptId, prompt: prompt.text, outcomes };
}

// How many of the brand's prompts a full scan runs across every model — the top
// most-popular buyer queries (primary first, then volume). Bounds COGS/wall-clock.
export const MAX_SCAN_PROMPTS = 3;

// Run a full multi-engine scan across the brand's top prompts: select them
// (primary first, then volume), scan each across `engineIds`, and return the
// scan ids. Shared by the dashboard full-scan route and the MCP run_full_scan
// tool so the two can't drift. One prompt failing doesn't abort the batch.
// `runPromptScan` budget-checks per prompt; callers should still assert the
// whole batch's budget up front. Pass `onEvent` to stream progress (the route);
// omit it for a silent run (the MCP).
export async function scanTopPrompts(
  db: DB,
  brandId: string,
  engineIds: EngineId[],
  opts: { maxPrompts?: number; onEvent?: (e: ScanEvent) => void; skipBudget?: boolean } = {},
): Promise<string[]> {
  const { maxPrompts = MAX_SCAN_PROMPTS, onEvent, skipBudget } = opts;
  const { data: prompts } = await db
    .from("prompts")
    .select("id, text")
    .eq("brand_id", brandId)
    .order("is_primary", { ascending: false })
    .order("volume", { ascending: false })
    .limit(maxPrompts);
  if (!prompts || prompts.length === 0) return [];

  const total = prompts.length;
  const scanIds: string[] = [];
  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    // Announce the prompt up front so its query + model rows render before any
    // engine ticks. Engine events carry promptId for grouping.
    onEvent?.({ type: "prompt", promptId: p.id, text: p.text, index: i, total });
    try {
      const result = await runPromptScan(db, brandId, p.id, engineIds, onEvent, { skipBudget });
      scanIds.push(result.scanId);
    } catch {
      // One prompt failing (e.g. all engines down for it) shouldn't abort the
      // batch — its engine "failed" events already streamed via onEvent.
    }
  }
  return scanIds;
}

// Seed 1–2 concrete teaser tasks off the free scan so the dashboard isn't empty.
// Full task generation comes in the paid/gamification phase. Only seeds if the
// brand has no scan-sourced tasks yet.
async function seedTeaserTasks(
  db: DB,
  brandId: string,
  profile: BrandProfile,
  primaryPrompt: string,
  mentioned: boolean,
  brands: RankedBrand[],
  citations: Citation[],
) {
  const { count } = await db
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("source", "scan");
  if (count && count > 0) return;

  // The actual brand the AI led with (first ranked competitor), and a real domain
  // it cited — so the teaser tasks reference what the scan actually found.
  const topAhead = brands.find((b) => !b.isYou)?.name || profile.competitors[0] || "";
  const brandHost = profile.url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const citedDomain = citations
    .map((c) => {
      try {
        return new URL(c.url).hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })
    .find((d) => d && !d.includes(brandHost) && !brandHost.includes(d));

  type T = { brand_id: string; title: string; meta: string; xp: number; impact: string; source: string };
  const tasks: T[] = [];
  if (!mentioned) {
    tasks.push({
      brand_id: brandId,
      title: topAhead
        ? `Publish a comparison page: ${profile.company} vs ${topAhead}`
        : `Publish a "best ${profile.industry || "tools"}" comparison page`,
      meta: "≈ 45 min · impact: very high",
      xp: 200,
      impact: "very high",
      source: "scan",
    });
  }
  tasks.push({
    brand_id: brandId,
    title: `Add an FAQ answering "${primaryPrompt}"`,
    meta: "≈ 10 min · impact: high",
    xp: 50,
    impact: "high",
    source: "scan",
  });
  if (citedDomain) {
    tasks.push({
      brand_id: brandId,
      title: `Get ${profile.company} cited on ${citedDomain}`,
      meta: `≈ 30 min · impact: high · AI cited it for "${primaryPrompt}"`,
      xp: 80,
      impact: "high",
      source: "scan",
    });
  }
  await db.from("tasks").insert(tasks);
}
