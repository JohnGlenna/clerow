import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichFromUrl } from "@/lib/scan/enrich";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Return the signed-in user's brand profile for the settings page. Returns
// brand:null when they haven't onboarded yet.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: brand } = await supabase
    .from("brands")
    .select("company, url, industry, description, competitors")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ brand: brand ?? null });
}

// Upsert the signed-in user's brand profile. One brand per user (their tracked
// site). Single-step onboarding sends only the URL — for a new brand we derive
// the rest of the profile from the site so the scan has a name to detect and a
// category to discover prompts. On re-scan the existing profile is preserved.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const url = String(body.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  // Re-scan of an already-onboarded brand: keep the derived profile, just bump
  // the URL/timestamp. Settings edits may also send a new company name, so
  // accept that when present (otherwise leave the derived profile untouched).
  if (existing) {
    const patch: { url: string; updated_at: string; company?: string } = {
      url,
      updated_at: new Date().toISOString(),
    };
    const company = String(body.company ?? "").trim();
    if (company) patch.company = company;

    const { data, error } = await supabase
      .from("brands")
      .update(patch)
      .eq("id", existing.id)
      .select("id, company, industry")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ brandId: data.id, company: data.company, industry: data.industry });
  }

  const fields = {
    url,
    company: String(body.company ?? "").trim(),
    industry: String(body.industry ?? ""),
    description: String(body.description ?? ""),
    location: String(body.location ?? ""),
    size: String(body.size ?? ""),
    audience: Array.isArray(body.audience) ? body.audience.map(String) : [],
    competitors: Array.isArray(body.competitors) ? body.competitors.map(String) : [],
    differentiators: Array.isArray(body.differentiators) ? body.differentiators.map(String) : [],
    geos: Array.isArray(body.geos) ? body.geos.map(String) : [],
    enrich_notes: String(body.enrichNotes ?? ""),
  };

  // No company provided → derive the profile from the URL.
  if (!fields.company) {
    const e = await enrichFromUrl(url);
    fields.company = e.company;
    if (!fields.industry) fields.industry = e.industry;
    if (!fields.description) fields.description = e.description;
    if (fields.competitors.length === 0) fields.competitors = e.competitors;
  }

  const { data, error } = await supabase
    .from("brands")
    .insert({ ...fields, user_id: user.id })
    .select("id, company, industry")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brandId: data.id, company: data.company, industry: data.industry });
}

// PATCH: save the user's confirmed profile edits during onboarding (the "did we
// get this right?" step). Only company + industry — competitors stay on
// auto-discovery, since surfacing the real competitive set is the product's job.
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "No brand" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const patch: { company?: string; industry?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  const company = String(body.company ?? "").trim();
  const industry = String(body.industry ?? "").trim();
  if (company) patch.company = company;
  if (industry) patch.industry = industry;

  const { error } = await supabase.from("brands").update(patch).eq("id", existing.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
