import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSiteContext, buildVoiceContext } from "@/lib/content/generate";
import { streamGatedContent } from "@/lib/content/gate";
import { loadContentSignal } from "@/lib/scan/contentSignal";
import { streamContentBody, STREAM_HEADERS } from "@/lib/content/stream";
import { deterministicTaskContent } from "@/lib/content/files";
import { parseAudit } from "@/lib/audit/ensure";
import { getSubscription, isSubscribed } from "@/lib/billing/subscription";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { BrandProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A single content generation is one Claude call with a generous token budget.
export const maxDuration = 60;

async function resolveBrand(supabase: SupabaseClient<Database>, userId: string) {
  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", userId)
    .eq("is_prospect", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return brand ?? null;
}

function toProfile(b: Database["public"]["Tables"]["brands"]["Row"]): BrandProfile {
  return {
    url: b.url,
    company: b.company,
    industry: b.industry,
    description: b.description,
    location: b.location,
    audience: b.audience,
    competitors: b.competitors,
    differentiators: b.differentiators,
    geos: b.geos,
    enrichNotes: b.enrich_notes,
  };
}

// GET: "peek" — return content that's ALREADY available (cached on the task, or
// free/deterministic) WITHOUT ever calling the LLM. Lets the task modal show
// ready content on open so the user skips a redundant "Generate" click. Never
// generates, never charges, no paywall side-effects.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const brand = await resolveBrand(supabase, user.id);
  if (!brand) return NextResponse.json({ error: "No brand" }, { status: 400 });

  const { id } = await ctx.params;
  const { data: task } = await supabase
    .from("tasks")
    .select("ladder_key, content")
    .eq("id", id)
    .eq("brand_id", brand.id)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  if (task.content) return NextResponse.json({ content: task.content, ready: true });
  const ready = deterministicTaskContent(task.ladder_key ?? "", brand, parseAudit(brand.site_audit));
  if (ready) return NextResponse.json({ content: ready, ready: true });
  return NextResponse.json({ content: null, ready: false });
}

// POST: content for one quest/task.
//  • Level-1 audit fixes (robots.txt, llms.txt, and the on-page instructions) are
//    FREE — deterministic files or the stored audit fix text, no LLM, no plan.
//  • LLM-generated drafts (FAQ blocks, comparison pages, etc.) require a plan.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const brand = await resolveBrand(supabase, user.id);
  if (!brand) return NextResponse.json({ error: "No brand" }, { status: 400 });

  const { id } = await ctx.params;
  const { data: task } = await supabase
    .from("tasks")
    .select("title, meta, ladder_key, content")
    .eq("id", id)
    .eq("brand_id", brand.id)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  // --- Cache hit: pre-warmed (or previously generated) content, served instantly ---
  if (task.content) return NextResponse.json({ content: task.content });

  // --- FREE Level-1 fixes (no LLM): robots.txt/llms.txt files or the audit's
  //     diagnostic steps for a technical fix. Shared with the MCP's
  //     get_task_content so the two surfaces can't drift apart.
  const ready = deterministicTaskContent(task.ladder_key ?? "", brand, parseAudit(brand.site_audit));
  if (ready) return NextResponse.json({ content: ready });

  // --- PAID: LLM-generated drafts, streamed token-by-token ---
  if (!isSubscribed(await getSubscription(supabase, user.id))) {
    return NextResponse.json({ error: "Subscription required to generate this content. Level 1 fixes are free." }, { status: 402 });
  }
  const profile = toProfile(brand);
  const siteContext = buildSiteContext(parseAudit(brand.site_audit)?.crawl);
  const { citedSources, scanInsight } = await loadContentSignal(supabase, brand.id);
  const input = { brand: profile, title: task.title, detail: task.meta, siteContext, citedSources, scanInsight, brandVoice: buildVoiceContext(brand.about) };
  const body = streamContentBody(async (emit) => {
    const full = await streamGatedContent(input, emit);
    if (!full) return; // an error event was already emitted
    // Write through to the cache so the next open is instant.
    await supabase.from("tasks").update({ content: full, content_at: new Date().toISOString() }).eq("id", id);
    emit({ type: "done" });
  });
  return new Response(body, { headers: STREAM_HEADERS });
}
