import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runFreeScan, loadLatestFreeResult } from "@/lib/scan/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// One prompt × one engine + detection — a few seconds. Give it headroom.
export const maxDuration = 60;

// Step 2: run the free scan on the primary prompt and return the ranked table.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const brandId = String(body.brandId ?? "");
  if (!brandId) return NextResponse.json({ error: "brandId is required" }, { status: 400 });

  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  // The free reveal scan is once per brand: if a completed scan already exists,
  // serve the stored ranking instead of spending another engine call. Re-running
  // onboarding (or "Re-scan now") still shows the reveal, at zero extra API cost.
  const { count: done } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("status", "done");
  if (done && done > 0) {
    const existing = await loadLatestFreeResult(supabase, brandId);
    if (existing) return NextResponse.json(existing);
    // Nothing reconstructable (rare) — fall through and run a fresh scan.
  }

  try {
    const result = await runFreeScan(supabase, brandId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
