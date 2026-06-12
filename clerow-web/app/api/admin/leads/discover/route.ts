// Discover tab feed: fetch one external source server-side, upsert into
// `leads` (status preserved), and annotate with existing prospect scans.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminGate";
import { directoryUrls, fetchDirectory } from "@/lib/leads/directory";
import {
  fetchBetaList,
  fetchBrreg,
  fetchProductHunt,
  fetchShowHn,
  fetchTheHub,
  fetchYCombinator,
  productHuntConfigured,
} from "@/lib/leads/sources";
import { persistAndAnnotate } from "@/lib/leads/store";
import { LEAD_SOURCES, type DiscoverResponse, type LeadSource, type TheHubCountry } from "@/lib/leads/types";
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
  if (!source || !LEAD_SOURCES.includes(source)) {
    return NextResponse.json({ error: `source must be one of ${LEAD_SOURCES.join("|")}` }, { status: 400 });
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
    } else if (source === "thehub") {
      const country = params.get("country");
      const cc: TheHubCountry = country === "SE" || country === "DK" ? country : "NO";
      fetched = await fetchTheHub(cc, Math.max(1, page + 1)); // UI pages are 0-based, The Hub is 1-based
    } else if (source === "ycombinator") {
      fetched = await fetchYCombinator();
    } else if (source === "betalist") {
      fetched = await fetchBetaList();
    } else if (source === "directory") {
      const url = params.get("url")?.trim() || "";
      if (!/^https?:\/\//i.test(url)) {
        return NextResponse.json(
          { error: `url must be an http(s) directory page (configured: ${directoryUrls().join(", ")})` },
          { status: 400 },
        );
      }
      fetched = { ...(await fetchDirectory(url)), page: null };
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
