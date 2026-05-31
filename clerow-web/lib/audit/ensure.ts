// Persistence + staleness wrapper around the pure `auditSite` crawl. Used by the
// /api/audit route (manual re-check) and the dashboard (auto-refresh when stale)
// so both share one definition of "is this audit fresh enough".

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../supabase/database.types";
import { auditSite, type SiteAudit } from "./site";

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
