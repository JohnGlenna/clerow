import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPromptScan } from "@/lib/scan/run";
import { streamScan, STREAM_HEADERS } from "@/lib/scan/events";
import { synthesizeAndStore } from "@/lib/scan/synthesize";
import { loadBrandSnapshot } from "@/lib/scan/snapshot";
import { getSubscription, isSubscribed } from "@/lib/billing/subscription";
import { planFromSub, enginesForPlan, assertBudget, BudgetExceededError } from "@/lib/billing/limits";
import { enabledEngines } from "@/lib/engines";
import { costForEngines } from "@/lib/billing/cost";

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
    .eq("is_prospect", false)
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

  // Budget guard up front (before we commit to a streamed 200) so "out of scans"
  // still surfaces as a clean 402 the client can act on. runPromptScan re-checks
  // internally; this just lets us answer with the right status before streaming.
  const runnable = enabledEngines(engines);
  if (runnable.length === 0) {
    return NextResponse.json({ error: "No AI engines are configured." }, { status: 502 });
  }
  try {
    await assertBudget(supabase, user.id, planFromSub(sub), costForEngines(runnable), new Date());
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      return NextResponse.json(
        { error: "You're out of scans for this month. Upgrade for more.", budget: err.status, code: "budget" },
        { status: 402 },
      );
    }
    throw err;
  }

  // Stream per-model progress while the scan runs. Each engine ticks
  // queued → querying → detecting → done|failed independently.
  return new Response(
    streamScan(async (emit) => {
      const result = await runPromptScan(supabase, brand.id, primary.id, engines, emit);
      const scanId = result.scanId;

      // Master-AI synthesis runs in the background so the score lands immediately;
      // the collective verdict fills in for the next dashboard load.
      after(async () => {
        try {
          await synthesizeAndStore(createAdminClient(), scanId);
        } catch {
          // Service role not configured — verdict simply stays null.
        }
      });

      const snapshot = await loadBrandSnapshot(supabase, brand.id);
      emit({ type: "done", result: { scanId, score: snapshot.score } });
    }),
    { headers: STREAM_HEADERS },
  );
}
