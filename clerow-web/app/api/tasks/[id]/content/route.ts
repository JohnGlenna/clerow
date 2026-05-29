import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFixContent } from "@/lib/content/generate";
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

// POST: generate finished, copy-ready content for one quest/task. Paid action —
// gated on an active subscription.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
  const { data: task } = await supabase
    .from("tasks")
    .select("title, meta")
    .eq("id", id)
    .eq("brand_id", brand.id)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  try {
    const { content } = await generateFixContent({
      brand: toProfile(brand),
      title: task.title,
      detail: task.meta,
    });
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Content generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
