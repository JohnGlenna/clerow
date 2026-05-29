import type { SupabaseClient } from "@supabase/supabase-js";
import { getEngine, FREE_ENGINES } from "../engines";
import { discoverPrompts } from "./discover";
import { detectRanking } from "./detect";
import type { BrandProfile, RunResponse } from "../types";
import type { Database, BrandSentiment } from "../supabase/database.types";

type DB = SupabaseClient<Database>;
type BrandRow = Database["public"]["Tables"]["brands"]["Row"];

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

// Run the free scan: pick the primary prompt, query one engine, detect the
// ranking, persist everything. Fails loudly — on any error the scan row is
// marked 'error' and no half-written success is left behind.
export async function runFreeScan(db: DB, brandId: string): Promise<RunResponse> {
  const engine = getEngine(FREE_ENGINES[0]);

  const { brand, prompts } = await ensurePrompts(db, brandId);
  const primary = prompts.find((p) => p.is_primary) ?? prompts[0];
  if (!primary) throw new Error("No prompt available to scan");

  const { data: scan, error: se } = await db
    .from("scans")
    .insert({ brand_id: brandId, tier: "free", status: "running", engines: [engine.id] })
    .select()
    .single();
  if (se || !scan) throw new Error(`Failed to create scan: ${se?.message}`);

  try {
    const profile = toProfile(brand);
    const answer = await engine.query(primary.text);
    const detection = await detectRanking(answer.text, profile);

    const { data: result, error: re } = await db
      .from("scan_results")
      .insert({
        scan_id: scan.id,
        prompt_id: primary.id,
        engine: engine.id,
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
      is_you: b.isYou,
      visibility: b.visibility,
      sentiment: b.sentiment,
      position: b.position,
    }));
    const { error: rbe } = await db.from("result_brands").insert(brandRows);
    if (rbe) throw new Error(`Failed to save result brands: ${rbe.message}`);

    await seedTeaserTasks(db, brandId, profile, primary.text, detection.you.mentioned);

    await db
      .from("scans")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("id", scan.id);

    return {
      scanId: scan.id,
      engine: engine.label,
      prompt: primary.text,
      brands: detection.brands,
      you: detection.you,
      citations: answer.citations,
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

// Seed 1–2 concrete teaser tasks off the free scan so the dashboard isn't empty.
// Full task generation comes in the paid/gamification phase. Only seeds if the
// brand has no scan-sourced tasks yet.
async function seedTeaserTasks(
  db: DB,
  brandId: string,
  profile: BrandProfile,
  primaryPrompt: string,
  mentioned: boolean,
) {
  const { count } = await db
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("source", "scan");
  if (count && count > 0) return;

  const topCompetitor = profile.competitors[0];
  const tasks = [
    {
      brand_id: brandId,
      title: topCompetitor
        ? `Publish a comparison page: ${profile.company} vs ${topCompetitor}`
        : `Publish a "best ${profile.industry || "tools"}" comparison page`,
      meta: "≈ 45 min · impact: very high",
      xp: 200,
      impact: "very high",
      source: "scan",
    },
    {
      brand_id: brandId,
      title: `Add an FAQ answering "${primaryPrompt}"`,
      meta: "≈ 10 min · impact: high",
      xp: 50,
      impact: "high",
      source: "scan",
    },
  ];
  await db.from("tasks").insert(mentioned ? [tasks[1]] : tasks);
}
