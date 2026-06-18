import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadPromptDetail } from "@/lib/scan/promptDetail";
import { stepInput, buildSiteContext, buildVoiceContext } from "@/lib/content/generate";
import { streamGatedContent } from "@/lib/content/gate";
import { loadContentSignal } from "@/lib/scan/contentSignal";
import { parseAudit } from "@/lib/audit/ensure";
import { streamContentBody, STREAM_HEADERS } from "@/lib/content/stream";
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

// POST: generate finished, copy-ready content for one playbook step of a prompt.
// Paid action — gated on an active subscription.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!isSubscribed(await getSubscription(supabase, user.id))) {
    return NextResponse.json({ error: "Subscription required to generate content" }, { status: 402 });
  }

  const brand = await resolveBrand(supabase, user.id);
  if (!brand) return NextResponse.json({ error: "No brand" }, { status: 400 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const stepId = typeof body?.stepId === "string" ? body.stepId : null;
  if (!stepId) return NextResponse.json({ error: "Missing stepId" }, { status: 400 });

  // Rebuild the prompt's playbook server-side so we generate against the real,
  // current step (the client can't smuggle in arbitrary instructions).
  const detail = await loadPromptDetail(supabase, brand.id, id);
  if (!detail) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

  const step = detail.steps.find((s) => s.id === stepId);
  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  const { citedSources, scanInsight } = await loadContentSignal(supabase, brand.id);
  const stepCtx = {
    brand: toProfile(brand),
    prompt: { text: detail.text, intent: detail.intent },
    step: { id: step.id, title: step.title, detail: step.detail },
    competitorsAhead: detail.competitorsAhead,
    siteContext: buildSiteContext(parseAudit(brand.site_audit)?.crawl),
    citedSources,
    scanInsight,
    brandVoice: buildVoiceContext(brand.about),
  };
  const stream = streamContentBody(async (emit) => {
    const full = await streamGatedContent(stepInput(stepCtx), emit);
    if (!full) return; // an error event was already emitted
    emit({ type: "done" });
  });
  return new Response(stream, { headers: STREAM_HEADERS });
}
