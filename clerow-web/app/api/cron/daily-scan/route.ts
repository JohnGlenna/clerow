import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPromptScan } from "@/lib/scan/run";
import { loadBrandSnapshot, captureDailySnapshot } from "@/lib/scan/snapshot";
import { dayKey } from "@/lib/streak";
import { isPlanKey } from "@/lib/billing/plans";
import { enginesForPlan } from "@/lib/billing/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Scans run several engines per brand; give the job room. Tune the cron schedule
// in vercel.json so this stays within your plan's function duration.
export const maxDuration = 300;

// Daily re-scan of every brand's primary prompt across all enabled engines, then
// a snapshot capture for week-over-week trends. Invoked by Vercel Cron (which
// sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set). Also
// runnable manually with the same header. Safe to re-run: snapshots upsert per
// brand-local day, and a fresh scan simply supersedes the day's earlier one.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
  }

  // Only scan brands owned by an active subscriber — never spend paid API calls
  // on free or lapsed users. Map each subscriber to their plan so we scan only
  // the engines that plan includes.
  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, plan")
    .in("status", ["active", "trialing"]);
  const planByUser = new Map((subs ?? []).map((s) => [s.user_id, s.plan]));

  const now = new Date();
  const results: { brandId: string; ok: boolean; detail?: string }[] = [];

  if (planByUser.size === 0) {
    return NextResponse.json({ ran: 0, ok: 0, results });
  }

  // Cap how many brands one run will scan, so a growing user base can't blow past
  // the function timeout. Spread the rest across subsequent runs as needed.
  const MAX_BRANDS = 25;
  const { data: brands } = await admin
    .from("brands")
    .select("id, timezone, user_id")
    .in("user_id", [...planByUser.keys()])
    .order("created_at", { ascending: true })
    .limit(MAX_BRANDS);

  for (const brand of brands ?? []) {
    try {
      const { data: primary } = await admin
        .from("prompts")
        .select("id")
        .eq("brand_id", brand.id)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle();
      if (!primary) {
        results.push({ brandId: brand.id, ok: false, detail: "no primary prompt" });
        continue;
      }

      const plan = planByUser.get(brand.user_id);
      const engines = enginesForPlan(isPlanKey(plan) ? plan : null);
      await runPromptScan(admin, brand.id, primary.id, engines);
      const snapshot = await loadBrandSnapshot(admin, brand.id);
      await captureDailySnapshot(admin, brand.id, snapshot, dayKey(now, brand.timezone));
      results.push({ brandId: brand.id, ok: true });
    } catch (err) {
      results.push({ brandId: brand.id, ok: false, detail: err instanceof Error ? err.message : "failed" });
    }
  }

  return NextResponse.json({
    ran: results.length,
    ok: results.filter((r) => r.ok).length,
    results,
  });
}
