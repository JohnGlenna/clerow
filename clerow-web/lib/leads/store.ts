// Persistence for discovered leads: upsert-on-fetch (dedupe on website_key,
// never touching status) and annotation with any existing prospect scan.

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { normalizeWebsite } from "@/lib/prospect/aggregate";

import type { CandidateLead, LeadRow, LeadSource, LeadStatus } from "./types";

type Db = ReturnType<typeof createAdminClient>;

export async function persistAndAnnotate(
  db: Db,
  source: LeadSource,
  candidates: CandidateLead[],
): Promise<LeadRow[]> {
  // Candidates without a usable domain are shown but never persisted.
  const keyed = candidates.map((c) => {
    const key = c.website ? normalizeWebsite(c.website) : "";
    return { ...c, websiteKey: key && key.includes(".") ? key : null };
  });

  // One upsert row per domain (a page can repeat a domain; ON CONFLICT can't
  // touch the same row twice). Status is omitted so manual pipeline stages
  // survive re-fetches; new rows get the column default 'new'.
  const byKey = new Map<string, (typeof keyed)[number]>();
  for (const c of keyed) {
    if (c.websiteKey && !byKey.has(c.websiteKey)) byKey.set(c.websiteKey, c);
  }
  const upsertRows = [...byKey.values()].map((c) => ({
    source,
    name: c.name,
    website: c.website as string,
    website_key: c.websiteKey as string,
    email: c.email,
    phone: c.phone,
    meta: c.meta as Json,
    updated_at: new Date().toISOString(),
  }));

  const persisted = new Map<string, { id: string; status: LeadStatus }>();
  if (upsertRows.length) {
    const { data, error } = await db
      .from("leads")
      .upsert(upsertRows, { onConflict: "website_key" })
      .select("id, website_key, status");
    if (error) throw new Error(`leads upsert failed: ${error.message}`);
    for (const row of data ?? []) {
      persisted.set(row.website_key, { id: row.id, status: row.status as LeadStatus });
    }
  }

  // Newest scan per domain → "View scan" instead of a fresh (paid) scan.
  const scanByKey = new Map<string, string>();
  const keys = [...byKey.keys()];
  if (keys.length) {
    const { data, error } = await db
      .from("prospect_scans")
      .select("id, website_key, created_at")
      .in("website_key", keys)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`prospect_scans lookup failed: ${error.message}`);
    for (const row of data ?? []) {
      if (!scanByKey.has(row.website_key)) scanByKey.set(row.website_key, row.id);
    }
  }

  return keyed.map((c): LeadRow => {
    const db = c.websiteKey ? persisted.get(c.websiteKey) : undefined;
    return {
      id: db?.id ?? null,
      source,
      name: c.name,
      website: c.website,
      websiteKey: c.websiteKey,
      email: c.email,
      phone: c.phone,
      meta: c.meta,
      status: db?.status ?? "new",
      scanId: c.websiteKey ? (scanByKey.get(c.websiteKey) ?? null) : null,
    };
  });
}

export async function getLeadCounts(
  db: Db,
): Promise<Record<LeadStatus | "total", number>> {
  const { data, error } = await db.from("leads").select("status");
  if (error) throw new Error(`leads counts failed: ${error.message}`);
  const counts: Record<LeadStatus | "total", number> = {
    new: 0,
    scanned: 0,
    emailed: 0,
    replied: 0,
    customer: 0,
    total: 0,
  };
  for (const row of data ?? []) {
    const s = row.status as LeadStatus;
    if (s in counts) counts[s] += 1;
    counts.total += 1;
  }
  return counts;
}
