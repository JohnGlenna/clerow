import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadSnapshotHistory } from "@/lib/scan/snapshot";
import type { BrandSnapshotRow } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type HistoryDelta = {
  overall: number;
  visibility: number;
  position: number | null; // negative = improved (lower position number)
};

export type HistoryResponse = {
  history: BrandSnapshotRow[];
  latest: BrandSnapshotRow | null;
  previous: BrandSnapshotRow | null; // ~a week ago, else the prior point
  delta: HistoryDelta | null;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!brand) return NextResponse.json({ history: [], latest: null, previous: null, delta: null });

  const history = await loadSnapshotHistory(supabase, brand.id);
  const latest = history[history.length - 1] ?? null;

  // Compare against the point closest to 7 days before latest, else the prior one.
  let previous: BrandSnapshotRow | null = null;
  if (latest && history.length > 1) {
    const latestTime = new Date(latest.captured_on).getTime();
    const weekAgo = latestTime - 7 * 86400000;
    const earlier = history.slice(0, -1);
    previous =
      earlier.reduce<BrandSnapshotRow | null>((best, row) => {
        const t = new Date(row.captured_on).getTime();
        if (t > latestTime) return best;
        if (!best) return row;
        return Math.abs(t - weekAgo) < Math.abs(new Date(best.captured_on).getTime() - weekAgo) ? row : best;
      }, null) ?? earlier[earlier.length - 1];
  }

  const delta: HistoryDelta | null =
    latest && previous
      ? {
          overall: latest.overall - previous.overall,
          visibility: latest.visibility - previous.visibility,
          position:
            latest.position != null && previous.position != null
              ? Number(latest.position) - Number(previous.position)
              : null,
        }
      : null;

  return NextResponse.json({ history, latest, previous, delta } satisfies HistoryResponse);
}
