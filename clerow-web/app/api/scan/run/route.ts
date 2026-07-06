import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runFreeScan, loadLatestFreeResult } from "@/lib/scan/run";
import { streamScan, STREAM_HEADERS } from "@/lib/scan/events";
import { synthesizeAndStore } from "@/lib/scan/synthesize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// One prompt × one engine (medium reasoning + web search can take a minute+)
// plus the concurrent competitor-expansion call and two detection passes.
// 60s killed real scans mid-run; match the other scan routes.
export const maxDuration = 300;

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
    if (existing) {
      // Cached reveal — emit one terminal event so the client's stream reader
      // gets the same RunResponse shape it would from a live scan.
      return new Response(
        streamScan(async (emit) => {
          emit({ type: "done", result: existing });
        }),
        { headers: STREAM_HEADERS },
      );
    }
    // Nothing reconstructable (rare) — fall through and run a fresh scan.
  }

  // Stream the scan so the client can show the model querying in real time. The
  // scan writes to Supabase as it goes, so a client disconnect doesn't lose work.
  // Failures arrive in-band as a final {type:"error"} event (HTTP 200).
  return new Response(
    streamScan(async (emit) => {
      const { result, appendCompetitors } = await runFreeScan(supabase, brandId, emit);
      // After the reveal is on screen: pad the ranking with the engine's own
      // "top 8" list (0% rows, lands on the dashboard), then summarize the scan
      // so it shows "what the AI thinks" + the best move. Best-effort.
      after(async () => {
        let admin;
        try {
          admin = createAdminClient();
        } catch {
          return; // service role not configured — enrichment/synthesis stay null.
        }
        await appendCompetitors(admin).catch(() => {});
        await synthesizeAndStore(admin, result.scanId).catch(() => {});
      });
      emit({ type: "done", result });
    }),
    { headers: STREAM_HEADERS },
  );
}
