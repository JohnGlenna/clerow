// Assemble the LadderContext that buildLadder() consumes. Extracted so the
// dashboard loader, the MCP server, and the free Unlock endpoint all build the
// climb from the exact same inputs (audit + snapshot + prompts) instead of
// duplicating the logic three ways.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { loadBrandSnapshot, type BrandSnapshot } from "./snapshot";
import { ensureSiteAudit } from "../audit/ensure";
import type { SiteAudit } from "../audit/site";
import type { LadderContext } from "../ladder";

type DB = SupabaseClient<Database>;
type BrandRow = Database["public"]["Tables"]["brands"]["Row"];
type PromptRow = Database["public"]["Tables"]["prompts"]["Row"];

// Pure assembly from already-loaded pieces — used by the hot dashboard path,
// which has the snapshot/prompts/audit in hand already.
export function buildLadderContext(
  brand: BrandRow,
  snapshot: BrandSnapshot,
  prompts: PromptRow[],
  audit: SiteAudit | null,
): LadderContext {
  const you = snapshot.competitors.find((c) => c.isYou);
  const yourRank = you?.rank ?? Number.POSITIVE_INFINITY;
  const primaryPromptRow = prompts.find((p) => p.id === snapshot.primaryPromptId);
  return {
    company: brand.company,
    url: brand.url,
    audit,
    primaryPrompt:
      snapshot.primaryPromptText && primaryPromptRow
        ? { text: snapshot.primaryPromptText, intent: primaryPromptRow.intent }
        : null,
    competitorsAhead: snapshot.competitors.filter((c) => !c.isYou && c.rank < yourRank).map((c) => c.name),
    sourceGaps: snapshot.citedDomains.slice(0, 5),
    promptGaps: (prompts ?? [])
      .filter((p) => p.is_tracked && p.id !== snapshot.primaryPromptId)
      .map((p) => p.text)
      .slice(0, 5),
    // Multi-model consensus signal — lets the ladder say "N of your 5 AI models …".
    modelsScanned: snapshot.enginesScanned.length,
    competitorEngines: Object.fromEntries(
      snapshot.competitors.filter((c) => !c.isYou).map((c) => [c.name, c.enginesCount]),
    ),
    sourceEngines: snapshot.citedDomainEngines,
  };
}

// Load everything then assemble — for cold paths (MCP, Unlock endpoint) that
// don't already hold the pieces.
export async function assembleLadderContext(
  db: DB,
  brand: BrandRow,
): Promise<{ ctx: LadderContext; snapshot: BrandSnapshot; prompts: PromptRow[]; audit: SiteAudit | null }> {
  const snapshot = await loadBrandSnapshot(db, brand.id);
  const { data: prompts } = await db.from("prompts").select("*").eq("brand_id", brand.id);
  const audit = await ensureSiteAudit(db, brand);
  const list = prompts ?? [];
  return { ctx: buildLadderContext(brand, snapshot, list, audit), snapshot, prompts: list, audit };
}
