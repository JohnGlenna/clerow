import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAdminUser } from "@/lib/adminGate";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichFromUrl } from "@/lib/scan/enrich";
import { ensurePrompts, scanTopPrompts } from "@/lib/scan/run";
import { refreshSiteAudit } from "@/lib/audit/ensure";
import { synthesizeAndStore } from "@/lib/scan/synthesize";
import { enabledEngines, PAID_ENGINES } from "@/lib/engines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The full multi-model scan runs to completion inside the request (~1–2 min).
export const maxDuration = 300;

// Admin-only: run a REAL full multi-model scan against an arbitrary prospect
// site and mint a public report link for it. It reuses the customer scan
// pipeline by creating a hidden "prospect brand" (is_prospect = true), so the
// report is the genuine moat — all five engines + the synthesis verdict — not
// the lighter ChatGPT-only outreach scan. Founder-funded: no subscription /
// budget gate (skipBudget), since the brand isn't tied to a paying user.

function siteOrigin(req: Request): string {
  try {
    return new URL(req.url).origin;
  } catch {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }
}

// List the reports generated so far (newest first) for the admin UI.
export async function GET(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createAdminClient();
  const { data } = await admin
    .from("prospect_report_links")
    .select("token, created_at, revoked_at, brands!inner(company, url, is_prospect)")
    .order("created_at", { ascending: false })
    .limit(100);

  const origin = siteOrigin(req);
  const reports = (data ?? []).map((r) => {
    const brand = r.brands as unknown as { company: string; url: string };
    return {
      token: r.token,
      url: `${origin}/report/${r.token}`,
      company: brand.company,
      website: brand.url,
      createdAt: r.created_at,
      revoked: !!r.revoked_at,
    };
  });
  return NextResponse.json({ reports });
}

// Generate a full report for one prospect URL.
export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { url?: string; company?: string };
  const url = (body.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "A website URL is required." }, { status: 400 });

  const engines = enabledEngines(PAID_ENGINES);
  if (engines.length === 0) {
    return NextResponse.json({ error: "No AI engines are configured." }, { status: 502 });
  }

  const admin = createAdminClient();

  try {
    // (1) Build a brand profile from the live site (company name is deterministic;
    // industry/description/competitors are grounded by the enrichment model).
    const enriched = await enrichFromUrl(url);

    // (2) Create the hidden prospect brand, owned by the admin who triggered it.
    const { data: brand, error: be } = await admin
      .from("brands")
      .insert({
        user_id: adminUser.id,
        url,
        company: (body.company ?? "").trim() || enriched.company,
        industry: enriched.industry,
        description: enriched.description,
        competitors: enriched.competitors,
        is_prospect: true,
      })
      .select("id")
      .single();
    if (be || !brand) {
      return NextResponse.json({ error: `Could not create prospect brand: ${be?.message}` }, { status: 500 });
    }

    // (3) Discover the buyer prompts and (4) crawl the site audit.
    await ensurePrompts(admin, brand.id);
    try {
      await refreshSiteAudit(admin, brand.id, url);
    } catch {
      // Non-fatal — the report still renders from the scan standings.
    }

    // (5) Run the full multi-model scan, founder-funded (no budget gate).
    const scanIds = await scanTopPrompts(admin, brand.id, engines, { skipBudget: true });
    if (scanIds.length === 0) {
      return NextResponse.json({ error: "The scan produced no results — try again." }, { status: 502 });
    }

    // (6) Synthesize the collective verdict inline (the admin is waiting, so the
    // link is complete the moment it's returned — unlike the dashboard's after()).
    for (const id of scanIds) {
      try {
        await synthesizeAndStore(admin, id);
      } catch {
        // Non-fatal: the verdict simply stays null on the report.
      }
    }

    // (7) Mint the public report token.
    const token = randomBytes(12).toString("base64url");
    const { error: le } = await admin.from("prospect_report_links").insert({ brand_id: brand.id, token });
    if (le) return NextResponse.json({ error: `Could not create report link: ${le.message}` }, { status: 500 });

    return NextResponse.json({ url: `${siteOrigin(req)}/report/${token}`, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Revoke a report link (kills the URL for everyone who has it).
export async function DELETE(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  await createAdminClient()
    .from("prospect_report_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", token);
  return NextResponse.json({ ok: true });
}
