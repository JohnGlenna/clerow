import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type FounderRow = {
  rank: number;
  label: string; // your company, or "Founder" (others anonymized)
  overall: number;
  visibility: number;
  isYou: boolean;
};

export type LeaderboardResponse = {
  available: boolean; // false → UI shows the "coming soon" state
  total: number;
  yourRank: number | null;
  rows: FounderRow[];
};

const EMPTY: LeaderboardResponse = { available: false, total: 0, yourRank: null, rows: [] };

// Anonymized cross-founder leaderboard, ranked by each brand's latest snapshot
// score (within the last 14 days). Reads across tenants via the service-role
// client; every brand but the viewer's is anonymized. Degrades to unavailable if
// the service-role key isn't configured.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: myBrand } = await supabase
    .from("brands")
    .select("id, company")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(EMPTY); // no service-role key → not available
  }

  const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const { data: snaps } = await admin
    .from("brand_snapshots")
    .select("brand_id, overall, visibility, captured_on")
    .gte("captured_on", since)
    .order("captured_on", { ascending: false })
    .limit(5000);

  // Latest snapshot per brand (rows are newest-first, so first seen wins).
  const latest = new Map<string, { overall: number; visibility: number }>();
  for (const s of snaps ?? []) {
    if (!latest.has(s.brand_id)) latest.set(s.brand_id, { overall: s.overall, visibility: s.visibility });
  }

  const ranked = [...latest.entries()]
    .map(([brand_id, v]) => ({ brand_id, ...v }))
    .sort((a, b) => b.overall - a.overall || b.visibility - a.visibility);

  const total = ranked.length;
  if (total === 0) return NextResponse.json(EMPTY);

  const yourIndex = myBrand ? ranked.findIndex((r) => r.brand_id === myBrand.id) : -1;
  const yourRank = yourIndex >= 0 ? yourIndex + 1 : null;

  // Top 10, plus the viewer's own row if they fall outside it.
  const top = ranked.slice(0, 10);
  if (yourIndex >= 10) top.push(ranked[yourIndex]);

  const rows: FounderRow[] = top.map((r) => {
    const isYou = myBrand != null && r.brand_id === myBrand.id;
    const rank = ranked.findIndex((x) => x.brand_id === r.brand_id) + 1;
    return {
      rank,
      label: isYou ? myBrand!.company || "You" : "Founder",
      overall: r.overall,
      visibility: r.visibility,
      isYou,
    };
  });

  return NextResponse.json({ available: true, total, yourRank, rows } satisfies LeaderboardResponse);
}
