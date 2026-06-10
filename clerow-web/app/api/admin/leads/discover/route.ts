// Discover tab feed: fetch one external source server-side, upsert into
// `leads` (status preserved), and annotate with existing prospect scans.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminGate";
import { fetchBrreg, fetchProductHunt, fetchShowHn, productHuntConfigured } from "@/lib/leads/sources";
import { persistAndAnnotate } from "@/lib/leads/store";
import type { DiscoverResponse, LeadSource } from "@/lib/leads/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const source = params.get("source") as LeadSource | null;
  if (!source || !["brreg", "producthunt", "shownh"].includes(source)) {
    return NextResponse.json({ error: "source must be brreg|producthunt|shownh" }, { status: 400 });
  }

  const page = Math.max(0, Number(params.get("page")) || 0);

  try {
    let fetched;
    if (source === "brreg") {
      fetched = await fetchBrreg({
        from: params.get("from") || daysAgoIso(60),
        to: params.get("to") || undefined,
        naering: params.get("naering") || "",
        kommune: params.get("kommune") || undefined,
        page,
      });
      if (params.get("requireWebsite") !== "0") {
        fetched = { ...fetched, candidates: fetched.candidates.filter((c) => !!c.website) };
      }
    } else if (source === "producthunt") {
      if (!productHuntConfigured()) {
        const empty: DiscoverResponse = { source, notConfigured: true, leads: [], page: null };
        return NextResponse.json(empty);
      }
      fetched = await fetchProductHunt();
    } else {
      fetched = await fetchShowHn(page);
    }

    const admin = createAdminClient();
    const leads = await persistAndAnnotate(admin, source, fetched.candidates);
    const res: DiscoverResponse = { source, leads, page: fetched.page };
    return NextResponse.json(res);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Discover fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
