import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadPromptDetail } from "@/lib/scan/promptDetail";
import { runPromptScan } from "@/lib/scan/run";
import { getSubscription, isSubscribed } from "@/lib/billing/subscription";
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

// POST: run a live multi-engine scan on this prompt, then return fresh detail.
// Paid action — gated on an active subscription.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!isSubscribed(await getSubscription(supabase, user.id))) {
    return NextResponse.json({ error: "Subscription required to scan prompts" }, { status: 402 });
  }

  const brandId = await resolveBrandId(supabase, user.id);
  if (!brandId) return NextResponse.json({ error: "No brand" }, { status: 400 });

  const { id } = await ctx.params;
  try {
    await runPromptScan(supabase, brandId, id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const detail = await loadPromptDetail(supabase, brandId, id);
  if (!detail) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  return NextResponse.json(detail);
}
