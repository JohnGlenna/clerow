// Storage helpers for prospect scans, shared by the admin scan route and the
// autopilot pipeline so caching/insert/promotion behavior can't drift between
// the manual and automated paths.

import type { createAdminClient } from "@/lib/supabase/admin";

import type { ProspectScanResult } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

export const SCAN_CACHE_DAYS = 14;

// email_copy is stored as "Subject: <s>\n\n<body>".
export function packEmail(subject: string, body: string): string {
  return `Subject: ${subject}\n\n${body}`;
}

export function unpackEmail(copy: string | null): { subject: string; body: string } {
  if (!copy) return { subject: "", body: "" };
  const m = copy.match(/^Subject: (.*)\n\n([\s\S]*)$/);
  return m ? { subject: m[1], body: m[2] } : { subject: "", body: copy };
}

type ScanRow = Record<string, unknown> & { id: string };

/** Newest scan for this domain within the cache window, or null. */
export async function findRecentScan(
  admin: Admin,
  websiteKey: string,
  days = SCAN_CACHE_DAYS,
): Promise<ScanRow | null> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("prospect_scans")
    .select("*")
    .eq("website_key", websiteKey)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`prospect_scans lookup failed: ${error.message}`);
  return (data as ScanRow | null) ?? null;
}

export async function insertProspectScan(admin: Admin, result: ProspectScanResult): Promise<ScanRow> {
  const { data, error } = await admin
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
  if (error) throw new Error(`prospect_scans insert failed: ${error.message}`);
  return data as ScanRow;
}

/** Promote a matching lead new → scanned; never downgrades later stages. */
export async function promoteLeadScanned(admin: Admin, websiteKey: string): Promise<void> {
  await admin
    .from("leads")
    .update({ status: "scanned", updated_at: new Date().toISOString() })
    .eq("website_key", websiteKey)
    .eq("status", "new");
}
