import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadPromptDetail } from "@/lib/scan/promptDetail";
import { runPromptScan } from "@/lib/scan/run";
import { ENGINES, type EngineId } from "@/lib/engines";
import { getSubscription, isSubscribed } from "@/lib/billing/subscription";
import { planFromSub, enginesForPlan, dailyScanLimit, BudgetExceededError } from "@/lib/billing/limits";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A multi-engine scan of one prompt is several API calls + detection. Headroom.
export const maxDuration = 120;

async function resolveBrandId(supabase: SupabaseClient<Database>, userId: string) {
  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", userId)
    .eq("is_prospect", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return brand?.id ?? null;
}

// GET: the prompt's per-engine ranking + derived GEO steps (drawer payload).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const brandId = await resolveBrandId(supabase, user.id);
  if (!brandId) return NextResponse.json({ error: "No brand" }, { status: 400 });

  const { id } = await ctx.params;
  const detail = await loadPromptDetail(supabase, brandId, id);
  if (!detail) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  return NextResponse.json(detail);
}

// POST: run a live scan on this prompt, then return fresh detail. Scans all
// models by default, or a single model when the body carries `{ engine }`.
// Paid action — gated on an active subscription.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sub = await getSubscription(supabase, user.id);
  if (!isSubscribed(sub)) {
    return NextResponse.json({ error: "Subscription required to scan prompts" }, { status: 402 });
  }
  // The plan decides which models and how many scans/day the user gets — the
  // server-side cost ceiling, never trusting the client.
  const plan = planFromSub(sub);
  const allowed = enginesForPlan(plan);

  const brandId = await resolveBrandId(supabase, user.id);
  if (!brandId) return NextResponse.json({ error: "No brand" }, { status: 400 });

  // Optional single-model scan: scan one engine when asked (must be in the
  // plan), else every engine the plan includes.
  const body = await req.json().catch(() => ({}));
  const engine = typeof body?.engine === "string" ? (body.engine as EngineId) : null;
  if (engine && !allowed.includes(engine)) {
    const label = ENGINES[engine]?.label ?? engine;
    return NextResponse.json(
      { error: `Your plan doesn't include ${label}. Upgrade to scan it.` },
      { status: 403 },
    );
  }
  const engineIds = engine ? [engine] : allowed;

  // Cost guards. (1) Don't let a second scan start while one is in flight —
  // stops double-clicks and concurrent spam. Only count *recent* running scans
  // (this prompt-scan caps at maxDuration=120s) so a row left stuck on a function
  // timeout can't lock the brand out forever.
  const inFlightSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: running } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("status", "running")
    .gte("started_at", inFlightSince);
  if (running && running > 0) {
    return NextResponse.json({ error: "A scan is already running — give it a moment." }, { status: 429 });
  }
  // (2) Cap paid scans per brand in any rolling 24h window to the plan's limit.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recent } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("tier", "full")
    .gte("started_at", since);
  if ((recent ?? 0) >= dailyScanLimit(plan)) {
    return NextResponse.json({ error: "Daily scan limit reached for your plan." }, { status: 429 });
  }

  const { id } = await ctx.params;
  try {
    await runPromptScan(supabase, brandId, id, engineIds);
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      return NextResponse.json(
        { error: "You're out of scans for this month. Upgrade for more.", budget: err.status, code: "budget" },
        { status: 402 },
      );
    }
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const detail = await loadPromptDetail(supabase, brandId, id);
  if (!detail) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  return NextResponse.json(detail);
}
