// Shared brand-progress metrics, used by both the dashboard API and the public
// share page so the app and a shared link can never disagree.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, BrandSentiment } from "./supabase/database.types";
import { evaluateStreak, EMPTY_STREAK, type StreakResult, type StreakState } from "./streak";
import { loadBrandSnapshot } from "./scan/snapshot";

type DB = SupabaseClient<Database>;

// Re-exported for callers that still import the score math from here.
export { positionScore, overallScore } from "./score";

// Read brand_streak + every task completion timestamp and evaluate the streak.
// Read-only — does NOT persist. The dashboard route persists the result; the
// public share page calls this without writing back.
export async function computeStreak(
  db: DB,
  brandId: string,
  tz: string,
  now: Date,
): Promise<{ result: StreakResult; prev: StreakState }> {
  const [{ data: row }, { data: tasks }] = await Promise.all([
    db.from("brand_streak").select("*").eq("brand_id", brandId).maybeSingle(),
    db.from("tasks").select("completed_at").eq("brand_id", brandId),
  ]);
  const prev: StreakState = row
    ? {
        current: row.current_streak,
        longest: row.longest_streak,
        freezes: row.freezes,
        frozenDates: row.frozen_dates,
        lastEvaluatedDate: row.last_evaluated_date,
      }
    : EMPTY_STREAK;
  const result = evaluateStreak(prev, (tasks ?? []).map((t) => t.completed_at), now, tz);
  return { result, prev };
}

export type StreakSummary = {
  current: number;
  longest: number;
  freezes: number;
  activeToday: boolean;
};

export type BrandProgress = {
  brand: { company: string; url: string };
  hasScan: boolean;
  scannedAt: string | null;
  engine: string | null;
  score: { overall: number; visibility: number; position: number | null; sentiment: number | null };
  competitors: {
    rank: number;
    name: string;
    isYou: boolean;
    visibility: number;
    sentiment: BrandSentiment;
    position: number | null;
  }[];
  workDone: { title: string; xp: number; completedAt: string | null }[];
  streak: StreakSummary;
};

// Curated, read-only progress for a brand — the payload the public share page
// renders. `db` is whichever client the caller passes (service-role on the
// public page, since it must bypass RLS).
export async function loadBrandProgress(
  db: DB,
  brandId: string,
  now: Date,
): Promise<BrandProgress | null> {
  const { data: brand } = await db
    .from("brands")
    .select("company, url, timezone")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) return null;

  const { data: scan } = await db
    .from("scans")
    .select("*")
    .eq("brand_id", brandId)
    .eq("status", "done")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { result: streak } = await computeStreak(db, brandId, brand.timezone, now);

  const { data: workDone } = await db
    .from("tasks")
    .select("title, xp, completed_at")
    .eq("brand_id", brandId)
    .eq("done", true)
    .order("completed_at", { ascending: false })
    .limit(50);

  const base: BrandProgress = {
    brand: { company: brand.company, url: brand.url },
    hasScan: false,
    scannedAt: null,
    engine: null,
    score: { overall: 0, visibility: 0, position: null, sentiment: null },
    competitors: [],
    workDone: (workDone ?? []).map((t) => ({
      title: t.title,
      xp: t.xp,
      completedAt: t.completed_at,
    })),
    streak: {
      current: streak.current,
      longest: streak.longest,
      freezes: streak.freezes,
      activeToday: streak.activeToday,
    },
  };

  if (!scan) return base;

  // Same multi-engine aggregation the dashboard uses, so a shared link and the
  // app never disagree.
  const snapshot = await loadBrandSnapshot(db, brandId);
  const engine =
    snapshot.enginesScanned.length > 1
      ? `${snapshot.enginesScanned.length} AI models`
      : snapshot.enginesScanned[0] ?? scan.engines[0] ?? null;

  return {
    ...base,
    hasScan: true,
    scannedAt: snapshot.scannedAt ?? scan.finished_at,
    engine,
    score: snapshot.score,
    competitors: snapshot.competitors,
  };
}
