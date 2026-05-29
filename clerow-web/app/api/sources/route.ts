import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { citationToDomain, hostOf } from "@/lib/scan/domains";
import { ENGINES, type EngineId } from "@/lib/engines";
import type { Citation } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type SourceType = "UGC" | "Directory" | "Editorial" | "Yours" | "Other";

export type SourceRow = {
  domain: string;
  type: SourceType;
  citedPct: number; // % of your scan results that cited this domain
  citedCount: number;
  models: string[]; // engine labels that cited it
  isYours: boolean;
  note: string;
  xp: number;
};

// Heuristic categorization of a citation domain.
const CATEGORY: { match: RegExp; type: SourceType; note: string; xp: number }[] = [
  { match: /(reddit|news\.ycombinator|ycombinator|indiehackers|quora)\./, type: "UGC", note: "Answer real threads with substance — no link drops.", xp: 60 },
  { match: /(youtube|youtu\.be)\./, type: "UGC", note: "Video reviews get cited. A demo or sponsorship can land you here.", xp: 90 },
  { match: /(linkedin|twitter|x\.com|facebook)\./, type: "UGC", note: "Founder/customer posts get cited. Encourage more.", xp: 30 },
  { match: /(g2|capterra|getapp|trustpilot|producthunt|softwareadvice)\./, type: "Directory", note: "Claim/optimize your listing and gather reviews — AI quotes these directly.", xp: 150 },
  { match: /(wikipedia|forbes|techcrunch|theverge|gartner|reuters)\./, type: "Editorial", note: "Editorial mention. Pitch a contribution or get quoted.", xp: 100 },
  { match: /(github)\./, type: "Other", note: "Open-source presence near your space helps. Add examples/docs.", xp: 50 },
];

function categorize(domain: string, isYours: boolean): { type: SourceType; note: string; xp: number } {
  if (isYours) return { type: "Yours", note: "Your own page — keep it fresh and add comparison/FAQ content.", xp: 0 };
  for (const c of CATEGORY) if (c.match.test(domain)) return { type: c.type, note: c.note, xp: c.xp };
  return { type: "Other", note: "AI cites this for your prompts. Earning a presence here puts you in the answer set.", xp: 40 };
}

// Aggregate every third-party (and own) domain the AI engines cited across the
// brand's done scans, with how often and by which models. Real, actionable —
// "where AI gets its answers" for this brand specifically.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: brand } = await supabase
    .from("brands")
    .select("id, url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!brand) return NextResponse.json({ sources: [], totalResults: 0 });

  const { data: results } = await supabase
    .from("scan_results")
    .select("engine, citations, scans!inner(brand_id, status)")
    .eq("scans.brand_id", brand.id)
    .eq("scans.status", "done");

  const ownHost = hostOf(brand.url);
  const totalResults = results?.length ?? 0;

  // domain -> { count of results citing it, engine ids }
  const agg = new Map<string, { count: number; engines: Set<EngineId> }>();
  for (const r of results ?? []) {
    const domains = new Set<string>();
    for (const c of (r.citations as Citation[]) ?? []) {
      const d = citationToDomain(c);
      if (d) domains.add(d);
    }
    for (const d of domains) {
      const entry = agg.get(d) ?? { count: 0, engines: new Set<EngineId>() };
      entry.count += 1;
      entry.engines.add(r.engine as EngineId);
      agg.set(d, entry);
    }
  }

  const sources: SourceRow[] = [...agg.entries()]
    .map(([domain, { count, engines }]) => {
      const isYours = ownHost != null && domain === ownHost;
      const { type, note, xp } = categorize(domain, isYours);
      return {
        domain,
        type,
        citedCount: count,
        citedPct: totalResults ? Math.round((count / totalResults) * 100) : 0,
        models: [...engines].map((e) => ENGINES[e]?.label ?? e),
        isYours,
        note,
        xp,
      };
    })
    .sort((a, b) => b.citedCount - a.citedCount);

  return NextResponse.json({ sources, totalResults });
}
