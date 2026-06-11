// Founder-only Prospect Scanner endpoint (/admin/prospect-scan).
// POST: scan a prospect with gpt-5.4-mini (14-day cache on website_key; force to
// bypass), persist, and promote a matching `leads` row new → scanned.
// GET ?id=: load a stored scan (the Discover tab's "View scan").

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminGate";
import { normalizeWebsite } from "@/lib/prospect/aggregate";
import { findRecentScan, insertProspectScan, promoteLeadScanned, unpackEmail } from "@/lib/prospect/persist";
import { runProspectScan } from "@/lib/prospect/scan";
import type { AnswerRecord, CompetitorCount, Lang, ProspectScanResult, SitePeek } from "@/lib/prospect/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ScanRow = {
  id: string;
  brand: string;
  website: string;
  website_key: string;
  category: string;
  language: string;
  mentioned_count: number;
  total_prompts: number;
  competitors: unknown;
  answers: unknown;
  email_copy: string | null;
  site_peek: unknown;
  created_at: string;
};

async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

function rowToScan(row: ScanRow, cached: boolean) {
  const competitors = (Array.isArray(row.competitors) ? row.competitors : []) as CompetitorCount[];
  return {
    id: row.id,
    brand: row.brand,
    website: row.website,
    category: row.category,
    language: row.language as Lang,
    mentionedCount: row.mentioned_count,
    totalPrompts: row.total_prompts,
    competitors,
    topCompetitor: competitors[0]?.name ?? null,
    answers: (Array.isArray(row.answers) ? row.answers : []) as AnswerRecord[],
    email: unpackEmail(row.email_copy),
    // Null for rows scanned before 0019 or when the site couldn't be read.
    sitePeek: (row.site_peek ?? null) as SitePeek | null,
    cached,
    createdAt: row.created_at,
  };
}

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("prospect_scans").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  return NextResponse.json({ scan: rowToScan(data as ScanRow, true) });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: {
    brand?: string;
    website?: string;
    category?: string;
    language?: string;
    promptOverride?: string;
    force?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const brand = (body.brand || "").trim();
  const website = (body.website || "").trim();
  const category = (body.category || "").trim();
  const language: Lang = body.language === "en" ? "en" : "no";
  const websiteKey = normalizeWebsite(website);

  if (!brand || !category) {
    return NextResponse.json({ error: "brand and category are required" }, { status: 400 });
  }
  if (!websiteKey || !websiteKey.includes(".")) {
    return NextResponse.json({ error: "website must be a valid domain or URL" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (!body.force) {
    let hit;
    try {
      hit = await findRecentScan(admin, websiteKey);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "lookup failed" }, { status: 500 });
    }
    if (hit) return NextResponse.json({ scan: rowToScan(hit as unknown as ScanRow, true) });
  }

  let result: ProspectScanResult;
  try {
    result = await runProspectScan({
      brand,
      website,
      category,
      language,
      promptOverride: body.promptOverride,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Scan failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let inserted;
  try {
    inserted = await insertProspectScan(admin, result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "insert failed" }, { status: 500 });
  }

  await promoteLeadScanned(admin, result.websiteKey);

  return NextResponse.json({ scan: rowToScan(inserted as unknown as ScanRow, false) });
}
