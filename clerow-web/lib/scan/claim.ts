// Brand-level scan claim — an atomic lock so two concurrent full-scan starts
// (e.g. an MCP client retrying after a network timeout) can never both spend a
// budgeted scan. The previous guard counted `scans` rows with status='running',
// which leaves a window between the count and the first insert inside
// runPromptScan; this claim is a single conditional UPDATE, so the database
// decides exactly one winner.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

type DB = SupabaseClient<Database>;

// A claim older than this is treated as abandoned (the process crashed before
// releasing) — long enough for the worst-case full scan, short enough that a
// crash doesn't lock the brand out for long.
export const SCAN_CLAIM_TTL_MS = 5 * 60 * 1000;

// Try to claim the brand for a scan. Returns true when this caller won the
// claim (it must releaseScan() in a finally), false when a fresh claim is
// already held — i.e. a scan is starting or running elsewhere.
export async function claimScan(db: DB, brandId: string, now = new Date()): Promise<boolean> {
  const cutoff = new Date(now.getTime() - SCAN_CLAIM_TTL_MS).toISOString();
  const { data } = await db
    .from("brands")
    .update({ scan_claimed_at: now.toISOString() })
    .eq("id", brandId)
    .or(`scan_claimed_at.is.null,scan_claimed_at.lt.${cutoff}`)
    .select("id");
  return (data?.length ?? 0) > 0;
}

export async function releaseScan(db: DB, brandId: string): Promise<void> {
  await db.from("brands").update({ scan_claimed_at: null }).eq("id", brandId);
}

// Is a claim currently held (and not expired)? Used by get_visibility to report
// scan-in-progress to polling agents.
export function claimActive(claimedAt: string | null, now = new Date()): boolean {
  return claimedAt != null && now.getTime() - new Date(claimedAt).getTime() < SCAN_CLAIM_TTL_MS;
}
