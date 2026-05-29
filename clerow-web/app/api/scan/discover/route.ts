import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensurePrompts } from "@/lib/scan/run";
import type { DiscoverResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Number of AI models we present in the product (ChatGPT, Claude, Perplexity,
// Gemini). The free scan only RUNS Perplexity; this is the marketed coverage
// shown on the Step 1 card.
const ENGINE_COUNT = 4;

// Step 1: discover the brand's prompt set (generates + persists if missing).
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const brandId = String(body.brandId ?? "");
  if (!brandId) return NextResponse.json({ error: "brandId is required" }, { status: 400 });

  // Ownership check via the user-scoped client (RLS).
  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  try {
    const { prompts } = await ensurePrompts(supabase, brandId);
    const payload: DiscoverResponse = {
      promptCount: prompts.length,
      engineCount: ENGINE_COUNT,
      queriesPerDay: prompts.length * ENGINE_COUNT,
      prompts: prompts.map((p) => ({
        id: p.id,
        text: p.text,
        intent: p.intent,
        volume: p.volume,
        isPrimary: p.is_primary,
      })),
    };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Discovery failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
