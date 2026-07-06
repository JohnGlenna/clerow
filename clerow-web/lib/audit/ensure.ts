// Persistence + staleness wrapper around the pure `auditSite` crawl. Used by the
// /api/audit route (manual re-check) and the dashboard (auto-refresh when stale)
// so both share one definition of "is this audit fresh enough".

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../supabase/database.types";
import { auditSite, type SiteAudit } from "./site";
import { CRITERIA } from "../scan/pageGrade";

const DEFAULT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // re-audit at most weekly

type Db = SupabaseClient<Database>;

// Validate the jsonb blob stored on brands.site_audit back into a SiteAudit.
export function parseAudit(raw: unknown): SiteAudit | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as SiteAudit;
  return Array.isArray(a.checks) ? a : null;
}

export async function refreshSiteAudit(db: Db, brandId: string, url: string): Promise<SiteAudit> {
  const audit = await auditSite(url);
  // The cheap crawl only produces the technical checks. The AI page-grader's
  // content checks (l2-*) are merged in by the full scan — carry them over from
  // the stored audit so a free refresh doesn't silently drop them (dropping
  // them degraded the Level-2 ladder back to generic tasks until the next full
  // scan re-graded the page).
  const { data: row } = await db.from("brands").select("site_audit").eq("id", brandId).maybeSingle();
  const prev = parseAudit(row?.site_audit);
  if (prev) {
    const fresh = new Set(audit.checks.map((c) => c.id));
    const graded = prev.checks.filter((c) => c.id in CRITERIA && !fresh.has(c.id));
    if (graded.length) audit.checks = [...audit.checks, ...graded];
  }
  await db
    .from("brands")
    .update({ site_audit: audit as unknown as Json, site_audited_at: audit.fetchedAt })
    .eq("id", brandId);
  return audit;
}

// Return a fresh audit, re-running the crawl only when the stored one is missing
// or older than maxAgeMs. Never throws — on crawl failure it keeps the prior
// (possibly stale) audit so the dashboard still renders.
export async function ensureSiteAudit(
  db: Db,
  brand: { id: string; url: string; site_audit: unknown; site_audited_at: string | null },
  maxAgeMs = DEFAULT_MAX_AGE_MS,
): Promise<SiteAudit | null> {
  const existing = parseAudit(brand.site_audit);
  const fresh =
    existing != null &&
    brand.site_audited_at != null &&
    Date.now() - new Date(brand.site_audited_at).getTime() < maxAgeMs;
  if (fresh) return existing;
  try {
    return await refreshSiteAudit(db, brand.id, brand.url);
  } catch {
    return existing; // keep stale rather than break the caller
  }
}
