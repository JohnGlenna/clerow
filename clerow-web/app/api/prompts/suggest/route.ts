import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PromptIntent, PromptVolume } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type SuggestedPrompt = {
  text: string;
  intent: PromptIntent;
  volume: PromptVolume;
  why: string;
  xp: number;
};

const XP: Record<PromptIntent, number> = { compare: 80, solution: 60, problem: 40, branded: 30 };

// New prompt ideas the brand isn't tracking yet, derived deterministically from
// its real profile + the competitors that out-rank it in the latest scan. No AI
// call — instant, free, and stable.
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
  if (!brand) return NextResponse.json({ suggestions: [] });

  const { data: existing } = await supabase.from("prompts").select("text").eq("brand_id", brand.id);
  const taken = new Set((existing ?? []).map((p) => p.text.trim().toLowerCase()));

  // Competitors that actually beat the brand in its latest done scan rank first.
  const { data: scan } = await supabase
    .from("scans")
    .select("id")
    .eq("brand_id", brand.id)
    .eq("status", "done")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let rivalsAhead: string[] = [];
  if (scan) {
    const { data: result } = await supabase
      .from("scan_results")
      .select("id")
      .eq("scan_id", scan.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (result) {
      const { data: rb } = await supabase
        .from("result_brands")
        .select("name, rank, is_you")
        .eq("scan_result_id", result.id)
        .order("rank");
      const you = (rb ?? []).find((b) => b.is_you);
      const yourRank = you?.rank ?? Number.POSITIVE_INFINITY;
      rivalsAhead = (rb ?? []).filter((b) => !b.is_you && b.rank < yourRank).map((b) => b.name);
    }
  }

  const company = brand.company || "your brand";
  const industry = brand.industry || "tools";
  const rivals = [...new Set([...rivalsAhead, ...brand.competitors])].slice(0, 4);
  const audience = brand.audience?.[0];

  const out: SuggestedPrompt[] = [];
  const add = (text: string, intent: PromptIntent, volume: PromptVolume, why: string) => {
    const key = text.trim().toLowerCase();
    if (!key || taken.has(key) || out.some((s) => s.text.toLowerCase() === key)) return;
    out.push({ text, intent, volume, why, xp: XP[intent] });
  };

  for (const rival of rivals) {
    add(
      `alternatives to ${rival}`,
      "compare",
      "high",
      rivalsAhead.includes(rival)
        ? `AI recommends ${rival} over you. People asking this are ready to switch.`
        : `Buyers comparing ${rival} are in-market for what you offer.`,
    );
    add(`${company} vs ${rival}`, "compare", "medium", `Own the head-to-head before ${rival} does.`);
  }
  add(`best ${industry}`, "solution", "high", "The highest-volume discovery query in your category.");
  if (audience) {
    add(`best ${industry} for ${audience}`, "solution", "high", `Your core buyer — ${audience} — asks this directly.`);
  }
  add(`best ${industry} 2026`, "solution", "rising", "Year-tagged queries spike and favor freshly updated pages.");
  add(`how to choose a ${industry.replace(/s$/, "")}`, "problem", "medium", "Problem-aware buyers enter your funnel here.");

  return NextResponse.json({ suggestions: out.slice(0, 8) });
}
