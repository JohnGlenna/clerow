// The scan-derived signal that grounds "Make content" generation: the domains
// the AI engines cite for this brand's space, plus the multi-model synthesis
// steer. One small loader so every content path (dashboard tasks, prompt steps,
// prewarm) feeds the writer the same scan context — and free/single-engine scans
// naturally carry no synthesis, so paid drafts get a signal free ones can't.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { loadBrandSnapshot } from "./snapshot";
import { buildScanInsight } from "../content/generate";

type DB = SupabaseClient<Database>;

export async function loadContentSignal(
  db: DB,
  brandId: string,
): Promise<{ citedSources: string[]; scanInsight?: string }> {
  const snap = await loadBrandSnapshot(db, brandId);
  return { citedSources: snap.citedDomains.slice(0, 8), scanInsight: buildScanInsight(snap.synthesis) };
}
