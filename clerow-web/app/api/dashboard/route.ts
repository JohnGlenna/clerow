import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ENGINES, type EngineId } from "@/lib/engines";
import { loadBrandSnapshot, captureDailySnapshot } from "@/lib/scan/snapshot";
import { evaluateStreak, EMPTY_STREAK, dayKey, type StreakState } from "@/lib/streak";
import { ensureDailyQuests, type DailySignals } from "@/lib/dailyTasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Validate a client-sent IANA timezone; fall back to the stored one if bogus.
function safeTimezone(tz: string | null, fallback: string): string {
  if (!tz) return fallback;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return fallback;
  }
}

// Aggregate the latest completed scan into the shapes the Overview + Prompts
// pages render, generate today's quests, and evaluate the streak. Returns
// hasScan:false when the user hasn't scanned yet.
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!brand) return NextResponse.json({ hasScan: false, brand: null });

  // Keep the brand's timezone in sync with the browser so streak day boundaries
  // match the user's "today".
  const clientTz = new URL(req.url).searchParams.get("tz");
  const tz = safeTimezone(clientTz, brand.timezone);
  if (clientTz && tz !== brand.timezone) {
    await supabase.from("brands").update({ timezone: tz }).eq("id", brand.id);
  }
  const now = new Date();
  const today = dayKey(now, tz);

  const [{ data: prompts }, { data: tasks }, { data: scan }, { data: streakRow }] =
    await Promise.all([
      supabase.from("prompts").select("*").eq("brand_id", brand.id),
      supabase.from("tasks").select("*").eq("brand_id", brand.id).order("created_at"),
      supabase
        .from("scans")
        .select("*")
        .eq("brand_id", brand.id)
        .eq("status", "done")
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("brand_streak").select("*").eq("brand_id", brand.id).maybeSingle(),
    ]);

  const brandHead = { company: brand.company, url: brand.url };

  // Roll the streak forward and persist (idempotent within a day). Done for any
  // onboarded brand so the sidebar widget is always accurate.
  async function evalAndPersistStreak(allTasks: { completed_at: string | null }[]) {
    const prev: StreakState = streakRow
      ? {
          current: streakRow.current_streak,
          longest: streakRow.longest_streak,
          freezes: streakRow.freezes,
          frozenDates: streakRow.frozen_dates,
          lastEvaluatedDate: streakRow.last_evaluated_date,
        }
      : EMPTY_STREAK;
    const s = evaluateStreak(prev, allTasks.map((t) => t.completed_at), now, tz);
    await supabase.from("brand_streak").upsert(
      {
        brand_id: brand!.id,
        current_streak: s.current,
        longest_streak: s.longest,
        freezes: s.freezes,
        frozen_dates: s.frozenDates,
        last_evaluated_date: s.lastEvaluatedDate,
        updated_at: now.toISOString(),
      },
      { onConflict: "brand_id" },
    );
    return { current: s.current, longest: s.longest, freezes: s.freezes, activeToday: s.activeToday };
  }

  if (!scan) {
    const streak = await evalAndPersistStreak(tasks ?? []);
    return NextResponse.json({
      hasScan: false,
      brand: brandHead,
      streak,
      prompts: (prompts ?? []).map((p) => ({
        id: p.id,
        text: p.text,
        intent: p.intent,
        volume: p.volume,
        isPrimary: p.is_primary,
        scanned: false,
      })),
    });
  }

  // The headline (primary) prompt aggregated across every engine that scanned it.
  const snapshot = await loadBrandSnapshot(supabase, brand.id);
  // Record today's point for week-over-week trends (idempotent per local day).
  await captureDailySnapshot(supabase, brand.id, snapshot, today);

  // Human label for "scanned via …": the single engine, or "N AI models".
  const engineLabel =
    snapshot.enginesScanned.length > 1
      ? `${snapshot.enginesScanned.length} AI models`
      : ENGINES[(snapshot.enginesScanned[0] ?? scan.engines[0] ?? "perplexity") as EngineId].label;

  // Generate today's quests from the brand's real gaps (idempotent: tops up to 2).
  const you = snapshot.competitors.find((c) => c.isYou);
  const yourRank = you?.rank ?? Number.POSITIVE_INFINITY;
  const signals: DailySignals = {
    company: brand.company,
    industry: brand.industry,
    primaryPrompt: snapshot.primaryPromptText,
    promptGaps: (prompts ?? [])
      .filter((p) => p.is_tracked && p.id !== snapshot.primaryPromptId)
      .map((p) => p.text)
      .slice(0, 5),
    competitorsAhead: snapshot.competitors
      .filter((c) => !c.isYou && c.rank < yourRank)
      .map((c) => c.name),
    sourceGaps: snapshot.citedDomains.slice(0, 5),
  };
  const inserted = await ensureDailyQuests(supabase, brand.id, today, signals, tasks ?? []);
  const allTasks = [...(tasks ?? []), ...inserted];

  // A prompt is "scanned" if ANY done scan produced a result for it — including
  // per-prompt scans the user ran later, not just the latest free scan.
  const { data: scannedRows } = await supabase
    .from("scan_results")
    .select("prompt_id, scans!inner(brand_id, status)")
    .eq("scans.brand_id", brand.id)
    .eq("scans.status", "done");
  const scannedPromptIds = new Set((scannedRows ?? []).map((r) => r.prompt_id));

  const streak = await evalAndPersistStreak(allTasks);

  // "Today's quests" first (most recent daily quests up top), then the rest.
  const orderedTasks = [...allTasks].sort((a, b) => {
    const ad = a.for_date === today ? 0 : 1;
    const bd = b.for_date === today ? 0 : 1;
    return ad - bd;
  });

  return NextResponse.json({
    hasScan: true,
    brand: brandHead,
    scannedAt: snapshot.scannedAt ?? scan.finished_at,
    engine: engineLabel,
    primaryPrompt: snapshot.primaryPromptText,
    score: snapshot.score,
    streak,
    models: snapshot.engines.map((m) => ({
      id: m.id,
      label: m.label,
      swatch: m.swatch,
      letter: m.letter,
      locked: m.locked,
      visibility: m.visibility,
      position: m.position,
      sentiment: m.sentiment,
    })),
    competitors: snapshot.competitors,
    prompts: (prompts ?? []).map((p) => ({
      id: p.id,
      text: p.text,
      intent: p.intent,
      volume: p.volume,
      isPrimary: p.is_primary,
      scanned: scannedPromptIds.has(p.id),
    })),
    tasks: orderedTasks.map((t) => ({
      id: t.id,
      title: t.title,
      meta: t.meta,
      xp: t.xp,
      done: t.done,
      forDate: t.for_date,
      completedAt: t.completed_at,
    })),
  });
}
