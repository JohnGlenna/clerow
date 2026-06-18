// Prospect full-scan report: the read-only payload the public /report/[token]
// page renders. Built entirely from the real scan aggregation (loadBrandSnapshot)
// + the deterministic GEO playbook (buildGeoSteps), so a prospect report and a
// customer's dashboard can never disagree about what the AI engines found.
//
// `db` is always the service-role client — prospect brands and their report
// links live behind RLS-with-no-policies, and the public page has no session.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PromptIntent } from "../supabase/database.types";
import type { DashboardCompetitor, ScanSynthesis } from "../types";
import { loadBrandSnapshot, type ModelStanding } from "../scan/snapshot";
import { buildGeoSteps, type GeoStep } from "../geoSteps";

type DB = SupabaseClient<Database>;

export type ProspectReport = {
  brand: { company: string; url: string };
  hasScan: boolean;
  scannedAt: string | null;
  // How many AI models actually produced a result (the multi-model signal).
  engineCount: number;
  engines: ModelStanding[];
  score: { overall: number; visibility: number; position: number | null; sentiment: number | null };
  competitors: DashboardCompetitor[];
  synthesis: ScanSynthesis | null;
  // The top fixes a prospect would tackle — a preview of the daily-task ladder.
  fixes: GeoStep[];
};

// Resolve a public report token to its brand id (read-only). Returns null when
// the token is unknown or revoked, so the page can 404 cleanly.
export async function resolveReportBrandId(db: DB, token: string): Promise<string | null> {
  const { data } = await db
    .from("prospect_report_links")
    .select("brand_id, revoked_at")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  return data.brand_id;
}

export async function loadProspectReport(db: DB, brandId: string): Promise<ProspectReport | null> {
  const { data: brand } = await db
    .from("brands")
    .select("company, url")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) return null;

  const snap = await loadBrandSnapshot(db, brandId);

  // The buyer the report leads with — the headline prompt's intent drives the
  // cornerstone fix in buildGeoSteps.
  let intent: PromptIntent = "solution";
  if (snap.primaryPromptId) {
    const { data: prompt } = await db
      .from("prompts")
      .select("intent")
      .eq("id", snap.primaryPromptId)
      .maybeSingle();
    if (prompt?.intent) intent = prompt.intent;
  }

  // Where the prospect stands on the leaderboard, and who AI puts ahead of them.
  const you = snap.competitors.find((c) => c.isYou);
  const mentioned = !!you && (you.visibility > 0 || you.position != null);
  const yourPosition = mentioned ? you!.position ?? you!.rank : null;
  const competitorsAhead = snap.competitors
    .filter((c) => !c.isYou && (!you || c.rank < you.rank))
    .map((c) => c.name);

  const fixes = buildGeoSteps({
    prompt: { text: snap.primaryPromptText ?? "", intent },
    company: brand.company || domainName(brand.url),
    competitorsAhead,
    citedDomains: snap.citedDomains, // already filtered to third-party domains
    yourPosition,
    scanned: snap.hasResult,
  });

  return {
    brand: { company: brand.company, url: brand.url },
    hasScan: snap.hasResult,
    scannedAt: snap.scannedAt,
    engineCount: snap.enginesScanned.length,
    engines: snap.engines,
    score: snap.score,
    competitors: snap.competitors,
    synthesis: snap.synthesis,
    fixes,
  };
}

function domainName(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim() || url;
}
