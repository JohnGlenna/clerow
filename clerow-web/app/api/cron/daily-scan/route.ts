import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPromptScan } from "@/lib/scan/run";
import { loadBrandSnapshot, captureDailySnapshot } from "@/lib/scan/snapshot";
import { dayKey } from "@/lib/streak";

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

  // Cap how many brands one run will scan, so a growing user base can't blow past
  // the function timeout. Spread the rest across subsequent runs as needed.
  const MAX_BRANDS = 25;
  const { data: brands } = await admin
    .from("brands")
    .select("id, timezone")
    .order("created_at", { ascending: true })
    .limit(MAX_BRANDS);

  const now = new Date();
  const results: { brandId: string; ok: boolean; detail?: string }[] = [];

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

      await runPromptScan(admin, brand.id, primary.id);
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
