import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runPromptScan } from "@/lib/scan/run";
import { loadBrandSnapshot } from "@/lib/scan/snapshot";
import { getSubscription, isSubscribed } from "@/lib/billing/subscription";
import { planFromSub, enginesForPlan, BudgetExceededError } from "@/lib/billing/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// User-triggered re-scan (the path's "checkpoint" node): re-query the primary
// prompt across the plan's engines, recompute the snapshot. Subscription- and
// budget-gated — returns 402 with the budget status when out of scans.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sub = await getSubscription(supabase, user.id);
  if (!isSubscribed(sub)) {
    return NextResponse.json({ error: "Subscription required to re-scan." }, { status: 402 });
  }
  const engines = enginesForPlan(planFromSub(sub));

  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: "No brand" }, { status: 400 });

  const { data: primary } = await supabase
    .from("prompts")
    .select("id")
    .eq("brand_id", brand.id)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();
  if (!primary) return NextResponse.json({ error: "No primary prompt to re-scan" }, { status: 400 });

  // Don't start a re-scan while one is already running for this brand.
  const inFlightSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: running } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brand.id)
    .eq("status", "running")
    .gte("started_at", inFlightSince);
  if (running && running > 0) {
    return NextResponse.json({ error: "A scan is already running — give it a moment." }, { status: 429 });
  }

  try {
    await runPromptScan(supabase, brand.id, primary.id, engines);
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      return NextResponse.json(
        { error: "You're out of scans for this month. Upgrade for more.", budget: err.status, code: "budget" },
        { status: 402 },
      );
    }
    const message = err instanceof Error ? err.message : "Re-scan failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const snapshot = await loadBrandSnapshot(supabase, brand.id);
  return NextResponse.json({ ok: true, score: snapshot.score });
}
