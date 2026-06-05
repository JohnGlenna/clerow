import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prewarmActiveLevel } from "@/lib/content/prewarm";
import { ENGINES, type EngineId } from "@/lib/engines";
import { loadBrandSnapshot, captureDailySnapshot, loadSnapshotHistory } from "@/lib/scan/snapshot";
import { evaluateStreak, EMPTY_STREAK, dayKey, type StreakState } from "@/lib/streak";
import { levelFromXp } from "@/lib/xp";
import { ensureSiteAudit } from "@/lib/audit/ensure";
import { buildLadder, ensureLadderTasks, refreshLadderTaskContent, projectLockedGain } from "@/lib/ladder";
import { buildJourney } from "@/lib/journey";
import { buildRoadmap } from "@/lib/roadmap";
import { buildLadderContext } from "@/lib/scan/ladderContext";
import { budgetStatus, planFromSub } from "@/lib/billing/limits";
import { getSubscription, isSubscribed } from "@/lib/billing/subscription";

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
    const xp = levelFromXp((tasks ?? []).reduce((sum, t) => sum + (t.done ? t.xp : 0), 0));
    return NextResponse.json({
      hasScan: false,
      brand: brandHead,
      streak,
      xp,
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

  // Build "The Climb": a leveled ladder from the brand's real gaps. Only the
  // active level's tasks are seeded (idempotent by ladder_key) — locked levels
  // are previewed, never written, which is what removes the old task flood.
  const audit = await ensureSiteAudit(supabase, brand);
  const ladderCtx = buildLadderContext(brand, snapshot, prompts ?? [], audit);

  // Subscription gates the climb: a free user gets the frontier (Level 1 + one
  // Level 2 taster), everything beyond is paywalled. Fetched here (before the
  // ladder build) so it can be passed into buildLadder.
  const sub = await getSubscription(supabase, user.id);
  const subscribed = isSubscribed(sub);

  // How far the user has unlocked the climb: the highest level any seeded ladder
  // task belongs to. Unlocking a level seeds its tasks, so the tasks are the
  // record — incomplete levels at/below this render "open" instead of "locked".
  // Only subscribers can unlock ahead, so a free (or churned) user is pinned to 0,
  // which re-locks any higher-level tasks left seeded from a lapsed subscription.
  const unlockedThrough = !subscribed
    ? 0
    : (tasks ?? []).reduce(
        (max, t) => (t.source === "ladder" && (t.level ?? 0) > max ? t.level ?? 0 : max),
        0,
      );

  const ladderExisting = new Map<string, { id: string; done: boolean; resolved: boolean }>();
  for (const t of tasks ?? [])
    if (t.ladder_key) ladderExisting.set(t.ladder_key, { id: t.id, done: t.done, resolved: t.done || t.archived });
  const preLadder = buildLadder(ladderCtx, ladderExisting, unlockedThrough, subscribed);
  const inserted = await ensureLadderTasks(supabase, brand.id, preLadder, new Set(ladderExisting.keys()));
  for (const r of inserted)
    if (r.ladder_key) ladderExisting.set(r.ladder_key, { id: r.id, done: r.done, resolved: r.done || r.archived });
  const ladder = buildLadder(ladderCtx, ladderExisting, unlockedThrough, subscribed);
  // The "finish the climb for ~+N%" carrot — estimated visibility upside still
  // behind the paywall. Null for subscribers (nothing locked).
  const lockedGain = subscribed ? null : projectLockedGain(ladder);
  // The 90-day plan overlay: Day N of 90 + phase/checkpoint progress, anchored on
  // the brand's created_at (day 0) so no migration is needed. Pure derivation.
  const journey = buildJourney(dayKey(new Date(brand.created_at), tz), today, ladder);
  // Rewrite seeded tasks whose spec changed since last scan (e.g. generic L2 →
  // the AI page-grader's page-specific version), so a full scan visibly updates them.
  await refreshLadderTaskContent(supabase, ladder, (tasks ?? []).filter((t) => t.source === "ladder"));
  const allTasks = [...(tasks ?? []), ...inserted];

  // A prompt is "scanned" if ANY done scan produced a result for it — including
  // per-prompt scans the user ran later, not just the latest free scan.
  const { data: scannedRows } = await supabase
    .from("scan_results")
    .select("prompt_id, your_position, your_visibility, scans!inner(brand_id, status)")
    .eq("scans.brand_id", brand.id)
    .eq("scans.status", "done");
  const scannedPromptIds = new Set((scannedRows ?? []).map((r) => r.prompt_id));
  // Best (lowest) position and highest visibility per prompt across engines, so
  // the Prompts page can show "you rank #X / not found" instead of just ✓/—.
  const promptStand = new Map<string, { position: number | null; visibility: number }>();
  for (const r of scannedRows ?? []) {
    const cur = promptStand.get(r.prompt_id);
    const pos = r.your_position;
    const vis = r.your_visibility ?? 0;
    if (!cur) {
      promptStand.set(r.prompt_id, { position: pos, visibility: vis });
    } else {
      promptStand.set(r.prompt_id, {
        position: pos == null ? cur.position : cur.position == null ? pos : Math.min(cur.position, pos),
        visibility: Math.max(cur.visibility, vis),
      });
    }
  }

  // Per-prompt standing, mapped once and reused for both the Prompts list and the
  // content roadmap (so the two can't disagree about what's a gap).
  const dashPrompts = (prompts ?? []).map((p) => ({
    id: p.id,
    text: p.text,
    intent: p.intent,
    volume: p.volume,
    isPrimary: p.is_primary,
    scanned: scannedPromptIds.has(p.id),
    yourPosition: promptStand.get(p.id)?.position ?? null,
    yourVisibility: promptStand.get(p.id)?.visibility ?? null,
  }));
  // Cluster the discovered prompts into a sequenced content roadmap.
  const roadmap = buildRoadmap(dashPrompts);

  const streak = await evalAndPersistStreak(allTasks);

  // Lifetime XP = every completed quest's XP, including archived ones (archiving
  // clears a quest from the active lists but must never cost the user XP). The
  // always-up counter that pairs with the resettable streak.
  const totalXp = allTasks.reduce((sum, t) => sum + (t.done ? t.xp : 0), 0);
  const xp = levelFromXp(totalXp);

  // Monthly scan-budget status (the COGS guard) → surfaced as "scans left".
  // `sub`/`subscribed` were resolved above for the ladder gate; reuse them here.
  const plan = planFromSub(sub);
  const budget = await budgetStatus(supabase, user.id, plan, now);

  // Pre-warm the active level's "Make content" drafts in the background so the
  // boxes open instantly. Subscribers only (LLM drafts are plan-gated), and
  // best-effort: a service-role client keeps writing after the response flushes,
  // and the helper skips anything already cached. Never blocks this request.
  if (subscribed) {
    after(async () => {
      try {
        await prewarmActiveLevel(createAdminClient(), brand, ladder);
      } catch {
        // Service role not configured or warm failed — boxes fall back to live gen.
      }
    });
  }

  // Score movement vs the previous daily snapshot, for the Overview score card.
  const history = await loadSnapshotHistory(supabase, brand.id, 7);
  const trend = {
    delta: history.length >= 2 ? history[history.length - 1].overall - history[history.length - 2].overall : null,
    sparkline: history.map((h) => h.overall),
  };

  // Active lists exclude archived quests; "Today's quests" first, then the rest.
  const orderedTasks = allTasks
    .filter((t) => !t.archived)
    .sort((a, b) => {
      const ad = a.for_date === today ? 0 : 1;
      const bd = b.for_date === today ? 0 : 1;
      return ad - bd;
    });

  // Has the user ever run a full (multi-model) scan? Gates level-unlocking and
  // hides the "Scan all 5 models" CTA once done.
  const { count: fullScans } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brand.id)
    .eq("tier", "full")
    .eq("status", "done");

  return NextResponse.json({
    hasScan: true,
    hasFullScan: (fullScans ?? 0) > 0,
    brand: brandHead,
    scannedAt: snapshot.scannedAt ?? scan.finished_at,
    engine: engineLabel,
    // Master-AI synthesis of the latest scan (null until the background job fills it in).
    synthesis: scan.synthesis ?? null,
    primaryPrompt: snapshot.primaryPromptText,
    score: snapshot.score,
    streak,
    xp,
    trend,
    models: snapshot.engines.map((m) => ({
      id: m.id,
      label: m.label,
      swatch: m.swatch,
      letter: m.letter,
      locked: m.locked,
      scanned: m.scanned,
      visibility: m.visibility,
      position: m.position,
      sentiment: m.sentiment,
    })),
    competitors: snapshot.competitors,
    prompts: dashPrompts,
    roadmap,
    tasks: orderedTasks.map((t) => ({
      id: t.id,
      title: t.title,
      meta: t.meta,
      xp: t.xp,
      done: t.done,
      forDate: t.for_date,
      completedAt: t.completed_at,
      level: t.level,
    })),
    ladder,
    journey,
    lockedGain,
    scansLeft: budget.scansLeft,
    budget: { spent: Math.round(budget.spent * 100) / 100, ceiling: budget.ceiling },
    subscribed,
  });
}
