import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runFreeScan } from "@/lib/scan/run";

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

  try {
    const result = await runFreeScan(supabase, brandId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
