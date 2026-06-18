import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseAudit, refreshSiteAudit } from "@/lib/audit/ensure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — return the latest stored site audit (no crawl).
// POST — run the crawl now, store it, and return it ("Re-check my site").
async function currentBrand() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, brand: null as null };
  const { data: brand } = await supabase
    .from("brands")
    .select("id, url, site_audit, site_audited_at")
    .eq("user_id", user.id)
    .eq("is_prospect", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { supabase, brand };
}

export async function GET() {
  const { brand } = await currentBrand();
  if (!brand) return NextResponse.json({ error: "Not authenticated or no brand" }, { status: 401 });
  return NextResponse.json({ audit: parseAudit(brand.site_audit), auditedAt: brand.site_audited_at });
}

export async function POST() {
  const { supabase, brand } = await currentBrand();
  if (!brand) return NextResponse.json({ error: "Not authenticated or no brand" }, { status: 401 });
  const audit = await refreshSiteAudit(supabase, brand.id, brand.url);
  return NextResponse.json({ audit, auditedAt: audit.fetchedAt });
}
