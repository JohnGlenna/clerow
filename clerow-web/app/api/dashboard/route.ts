import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ENGINES } from "@/lib/engines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The four AI models surfaced in the dashboard. Perplexity runs on the free
// scan; the rest are locked until upgrade.
const DASHBOARD_MODELS: { id: keyof typeof ENGINES; swatch: string; letter: string }[] = [
  { id: "chatgpt", swatch: "#10A37F", letter: "C" },
  { id: "claude", swatch: "#D97706", letter: "A" },
  { id: "perplexity", swatch: "#1CB0F6", letter: "P" },
  { id: "gemini", swatch: "#4285F4", letter: "G" },
];

function positionScore(pos: number | null): number {
  if (pos == null) return 0;
  return Math.max(0, Math.round(100 - (pos - 1) * 15));
}

// Aggregate the latest completed scan into the shapes the Overview + Prompts
// pages render. Returns hasScan:false when the user hasn't scanned yet.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!brand) return NextResponse.json({ hasScan: false, brand: null });

  const [{ data: prompts }, { data: tasks }, { data: scan }] = await Promise.all([
    supabase.from("prompts").select("*").eq("brand_id", brand.id),
    supabase.from("tasks").select("*").eq("brand_id", brand.id).order("created_at"),
    supabase
      .from("scans")
      .select("*")
      .eq("brand_id", brand.id)
      .eq("status", "done")
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const brandHead = { company: brand.company, url: brand.url };

  if (!scan) {
    return NextResponse.json({
      hasScan: false,
      brand: brandHead,
      prompts: (prompts ?? []).map((p) => ({
        id: p.id,
        text: p.text,
        intent: p.intent,
        volume: p.volume,
        isPrimary: p.is_primary,
        scanned: false,
      })),
    });
  }

  // The free scan has one result (primary prompt × Perplexity).
  const { data: result } = await supabase
    .from("scan_results")
    .select("*")
    .eq("scan_id", scan.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const { data: resultBrands } = result
    ? await supabase
        .from("result_brands")
        .select("*")
        .eq("scan_result_id", result.id)
        .order("rank")
    : { data: [] as NonNullable<typeof result>[] };

  const visibility = result ? Number(result.your_visibility) : 0;
  const position = result?.your_position != null ? Number(result.your_position) : null;
  const sentiment = result?.your_sentiment != null ? Number(result.your_sentiment) : null;
  const overall = Math.round(
    visibility * 0.5 + (sentiment ?? 0) * 0.3 + positionScore(position) * 0.2,
  );

  const ranEngine = scan.engines[0] ?? "perplexity";
  const models = DASHBOARD_MODELS.map((m) => {
    const ran = m.id === ranEngine;
    return {
      id: m.id,
      label: ENGINES[m.id].label,
      swatch: m.swatch,
      letter: m.letter,
      locked: !ENGINES[m.id].enabled,
      visibility: ran ? Math.round(visibility) : null,
      position: ran ? position : null,
      sentiment: ran ? sentiment : null,
    };
  });

  return NextResponse.json({
    hasScan: true,
    brand: brandHead,
    scannedAt: scan.finished_at,
    engine: ranEngine,
    primaryPrompt: prompts?.find((p) => p.is_primary)?.text ?? null,
    score: {
      overall,
      visibility: Math.round(visibility),
      position,
      sentiment: sentiment != null ? Math.round(sentiment) : null,
    },
    models,
    competitors: (resultBrands ?? []).map((b) => ({
      rank: b.rank,
      name: b.name,
      isYou: b.is_you,
      visibility: Math.round(Number(b.visibility)),
      sentiment: b.sentiment,
      position: b.position != null ? Number(b.position) : null,
    })),
    prompts: (prompts ?? []).map((p) => ({
      id: p.id,
      text: p.text,
      intent: p.intent,
      volume: p.volume,
      isPrimary: p.is_primary,
      scanned: p.id === result?.prompt_id,
    })),
    tasks: (tasks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      meta: t.meta,
      xp: t.xp,
      done: t.done,
    })),
    citations: result?.citations ?? [],
  });
}
