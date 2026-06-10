// Server-side fetchers for the Discover tab's three lead sources. Tokens and
// upstream calls never reach the client — only the mapped CandidateLead rows.

import { unstable_cache } from "next/cache";

import type { BrregParams, CandidateLead, PageInfo } from "./types";

const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Brønnøysund (Enhetsregisteret) — open API, no auth.
// Norway uses the SN 2025 industry standard: pass division-level codes (62),
// never old exact codes (62.010). The API accepts any code level.
// ---------------------------------------------------------------------------

type BrregEnhet = {
  navn?: string;
  organisasjonsnummer?: string;
  hjemmeside?: string;
  epostadresse?: string;
  telefon?: string;
  mobil?: string;
  registreringsdatoEnhetsregisteret?: string;
  naeringskode1?: { kode?: string; beskrivelse?: string };
  forretningsadresse?: { poststed?: string; kommune?: string; kommunenummer?: string };
};

export async function fetchBrreg(
  params: BrregParams,
): Promise<{ candidates: CandidateLead[]; page: PageInfo }> {
  const qs = new URLSearchParams({
    fraRegistreringsdatoEnhetsregisteret: params.from,
    size: String(PAGE_SIZE),
    page: String(params.page),
  });
  if (params.to) qs.set("tilRegistreringsdatoEnhetsregisteret", params.to);
  if (params.naering) qs.set("naeringskode", params.naering);
  if (params.kommune) qs.set("kommunenummer", params.kommune);

  const res = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter?${qs}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`brreg API error ${res.status}`);
  const data = await res.json();

  const enheter: BrregEnhet[] = data?._embedded?.enheter ?? [];
  const candidates = enheter.map((e): CandidateLead => ({
    name: e.navn || "(uten navn)",
    website: e.hjemmeside || null,
    email: e.epostadresse || null,
    phone: e.telefon || e.mobil || null,
    meta: {
      orgnr: e.organisasjonsnummer ?? null,
      place: e.forretningsadresse?.poststed || e.forretningsadresse?.kommune || null,
      niche: e.naeringskode1?.beskrivelse ?? null,
      nicheCode: e.naeringskode1?.kode ?? null,
      registeredAt: e.registreringsdatoEnhetsregisteret ?? null,
    },
  }));

  const page: PageInfo = data?.page
    ? { number: Number(data.page.number) || 0, totalPages: Number(data.page.totalPages) || 1 }
    : null;
  return { candidates, page };
}

// ---------------------------------------------------------------------------
// Product Hunt — GraphQL v2, Bearer PRODUCTHUNT_API_TOKEN. The raw feed is
// cached for 1 hour (their rate limits are tight); cache survives cold starts
// via Vercel's data cache.
// ---------------------------------------------------------------------------

const PH_QUERY = `
query RecentPosts($postedAfter: DateTime!) {
  posts(order: NEWEST, postedAfter: $postedAfter, first: 50) {
    edges { node {
      id name tagline website url
      topics(first: 5) { edges { node { name } } }
    } }
  }
}`;

type PhNode = {
  id?: string;
  name?: string;
  tagline?: string;
  website?: string;
  url?: string;
  topics?: { edges?: { node?: { name?: string } }[] };
};

async function fetchProductHuntRaw(): Promise<PhNode[]> {
  const postedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PRODUCTHUNT_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: PH_QUERY, variables: { postedAfter } }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Product Hunt API error ${res.status}`);
  const data = await res.json();
  if (data?.errors?.length) {
    throw new Error(`Product Hunt GraphQL error: ${data.errors[0]?.message ?? "unknown"}`);
  }
  return (data?.data?.posts?.edges ?? [])
    .map((e: { node?: PhNode }) => e?.node)
    .filter(Boolean) as PhNode[];
}

const getCachedPhPosts = unstable_cache(fetchProductHuntRaw, ["ph-recent-posts"], {
  revalidate: 3600,
});

export function productHuntConfigured(): boolean {
  return !!process.env.PRODUCTHUNT_API_TOKEN;
}

export async function fetchProductHunt(): Promise<{ candidates: CandidateLead[]; page: PageInfo }> {
  const nodes = await getCachedPhPosts();
  const candidates = nodes.map((n): CandidateLead => ({
    name: n.name || "(unnamed)",
    website: n.website || null,
    email: null,
    phone: null,
    meta: {
      tagline: n.tagline ?? null,
      topics: (n.topics?.edges ?? []).map((t) => t?.node?.name).filter(Boolean),
      phUrl: n.url ?? null,
    },
  }));
  return { candidates, page: null };
}

// ---------------------------------------------------------------------------
// Show HN — Algolia HN search API, free, no auth.
// ---------------------------------------------------------------------------

type HnHit = {
  objectID?: string;
  title?: string;
  url?: string;
  points?: number;
  created_at?: string;
};

export async function fetchShowHn(
  page: number,
): Promise<{ candidates: CandidateLead[]; page: PageInfo }> {
  const res = await fetch(
    `https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=${PAGE_SIZE}&page=${page}`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  if (!res.ok) throw new Error(`HN Algolia API error ${res.status}`);
  const data = await res.json();

  const candidates = ((data?.hits ?? []) as HnHit[])
    .filter((h) => !!h.url)
    .map((h): CandidateLead => ({
      name: (h.title || "").replace(/^show hn:\s*/i, "").trim() || "(untitled)",
      website: h.url || null,
      email: null,
      phone: null,
      meta: {
        points: h.points ?? 0,
        postedAt: h.created_at ?? null,
        hnId: h.objectID ?? null,
      },
    }));

  const page2: PageInfo = {
    number: Number(data?.page) || 0,
    totalPages: Number(data?.nbPages) || 1,
  };
  return { candidates, page: page2 };
}
