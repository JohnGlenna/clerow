// Founder-only Prospect Scanner endpoint (/admin/prospect-scan).
// POST: scan a prospect with gpt-5.4-mini (14-day cache on website_key; force to
// bypass), persist, and promote a matching `leads` row new → scanned.
// GET ?id=: load a stored scan (the Discover tab's "View scan").

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminGate";
import { normalizeWebsite } from "@/lib/prospect/aggregate";
import { runProspectScan } from "@/lib/prospect/scan";
import type { AnswerRecord, CompetitorCount, Lang, ProspectScanResult, SitePeek } from "@/lib/prospect/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CACHE_DAYS = 14;

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

// email_copy is stored as "Subject: <s>\n\n<body>".
function packEmail(subject: string, body: string): string {
  return `Subject: ${subject}\n\n${body}`;
}

function unpackEmail(copy: string | null): { subject: string; body: string } {
  if (!copy) return { subject: "", body: "" };
  const m = copy.match(/^Subject: (.*)\n\n([\s\S]*)$/);
  return m ? { subject: m[1], body: m[2] } : { subject: "", body: copy };
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
    const since = new Date(Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: hit, error } = await admin
      .from("prospect_scans")
      .select("*")
      .eq("website_key", websiteKey)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (hit) return NextResponse.json({ scan: rowToScan(hit as ScanRow, true) });
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

  const { data: inserted, error: insertError } = await admin
    .from("prospect_scans")
    .insert({
      brand: result.brand,
      website: result.website,
      website_key: result.websiteKey,
      category: result.category,
      language: result.language,
      mentioned_count: result.mentionedCount,
      total_prompts: result.totalPrompts,
      competitors: result.competitors,
      answers: result.answers,
      email_copy: packEmail(result.email.subject, result.email.body),
      site_peek: result.sitePeek,
    })
    .select("*")
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Promote a matching lead new → scanned; never downgrade later stages.
  await admin
    .from("leads")
    .update({ status: "scanned", updated_at: new Date().toISOString() })
    .eq("website_key", result.websiteKey)
    .eq("status", "new");

  return NextResponse.json({ scan: rowToScan(inserted as ScanRow, false) });
}
