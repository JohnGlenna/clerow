// Server-side fetchers for the Discover tab's lead sources. Tokens and
// upstream calls never reach the client — only the mapped CandidateLead rows.

import { unstable_cache } from "next/cache";

import type { BrregParams, CandidateLead, PageInfo, TheHubCountry } from "./types";

const PAGE_SIZE = 50;

// Scrape/unofficial-API targets serve bot-friendly content to a browser UA.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

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

// ---------------------------------------------------------------------------
// The Hub (thehub.io) — THE Nordic startup directory (used by hubs across
// NO/SE/DK). Unofficial JSON API behind their own frontend: fixed 15 docs per
// page, no sort control — callers rotate pages and rely on website_key dedupe.
// ---------------------------------------------------------------------------

type HubDoc = {
  key?: string;
  name?: string;
  website?: string;
  whatWeDo?: string;
  founded?: string | number;
  fundingStage?: string;
  countries?: { countryCode?: string }[];
};

// The API returns whatWeDo with HTML entities baked in.
function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchTheHub(
  country: TheHubCountry,
  page: number, // 1-based
): Promise<{ candidates: CandidateLead[]; page: PageInfo }> {
  const res = await fetch(
    `https://thehub.io/api/companies?countryCodes=${country}&page=${Math.max(1, page)}`,
    {
      headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`The Hub API error ${res.status}`);
  const data = await res.json();

  const docs: HubDoc[] = Array.isArray(data?.docs) ? data.docs : [];
  const candidates = docs.map((d): CandidateLead => ({
    name: (d.name || "").trim() || "(unnamed)",
    website: d.website || null,
    email: null,
    phone: null,
    meta: {
      tagline: d.whatWeDo ? decodeEntities(d.whatWeDo).slice(0, 200) : null,
      countries: (d.countries ?? []).map((c) => c?.countryCode).filter(Boolean),
      founded: d.founded ?? null,
      fundingStage: d.fundingStage ?? null,
      hubUrl: d.key ? `https://thehub.io/startups/${d.key}` : null,
    },
  }));

  return {
    candidates,
    page: { number: Math.max(1, page) - 1, totalPages: Number(data?.pages) || 1 },
  };
}

// ---------------------------------------------------------------------------
// Y Combinator — official public companies API, no auth. We fetch the two most
// recent batches (heavy on AI startups); cached 6h since batches change slowly.
// ---------------------------------------------------------------------------

const YC_API = "https://api.ycombinator.com/v0.1/companies";
const YC_MAX_PAGES_PER_BATCH = 5;

/** The current and previous YC batch names ("Spring 2026", …) for a date. */
export function recentYcBatches(now: Date): string[] {
  const seasons = ["Winter", "Spring", "Summer", "Fall"];
  const year = now.getUTCFullYear();
  const quarter = Math.floor(now.getUTCMonth() / 3);
  const current = `${seasons[quarter]} ${year}`;
  const previous = quarter === 0 ? `Fall ${year - 1}` : `${seasons[quarter - 1]} ${year}`;
  return [current, previous];
}

type YcCompany = { name?: string; website?: string; oneLiner?: string; batch?: string };

/** Uncached fetch — exported for scripts; app code uses fetchYCombinator(). */
export async function fetchYCombinatorRaw(): Promise<YcCompany[]> {
  const out: YcCompany[] = [];
  for (const batch of recentYcBatches(new Date())) {
    let next: string | null = `${YC_API}?batch=${encodeURIComponent(batch)}`;
    for (let i = 0; i < YC_MAX_PAGES_PER_BATCH && next; i++) {
      const res = await fetch(next, {
        headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`YC API error ${res.status}`);
      const data: { companies?: YcCompany[]; nextPage?: unknown } = await res.json();
      out.push(...(data?.companies ?? []));
      next =
        typeof data?.nextPage === "string" && data.nextPage.startsWith(YC_API)
          ? data.nextPage
          : null;
    }
  }
  return out;
}

const getCachedYcCompanies = unstable_cache(fetchYCombinatorRaw, ["yc-recent-companies"], {
  revalidate: 6 * 3600,
});

export async function fetchYCombinator(): Promise<{ candidates: CandidateLead[]; page: PageInfo }> {
  const companies = await getCachedYcCompanies();
  const candidates = companies.map((c): CandidateLead => ({
    name: (c.name || "").trim() || "(unnamed)",
    website: c.website || null,
    email: null,
    phone: null,
    meta: {
      tagline: c.oneLiner ?? null,
      batch: c.batch ?? null,
    },
  }));
  return { candidates, page: null };
}

// ---------------------------------------------------------------------------
// BetaList — no API; scrape the front page for startup slugs, then per slug
// read the detail page (clean <title>/<meta>) and resolve the /visit redirect
// to the real website. Cached 3h to keep the fetch volume polite (the front
// page only changes a few times a day).
// ---------------------------------------------------------------------------

const BETALIST_MAX_STARTUPS = 20;

/** Unique startup slugs from the listing HTML, in page order. */
export function parseBetaListSlugs(html: string): string[] {
  const seen = new Set<string>();
  for (const m of html.matchAll(/href="\/startups\/([a-z0-9-]+)"/gi)) {
    seen.add(m[1].toLowerCase());
  }
  return [...seen];
}

/** Name + tagline from a startup detail page: <title>Name: tagline | BetaList</title>. */
export function parseBetaListDetail(html: string): { name: string; tagline: string | null } | null {
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "";
  const name = title.split(/[:|]/)[0]?.trim();
  if (!name || /betalist/i.test(name)) return null;
  const tagline =
    html.match(/name="description" content="([^"]{1,300})"/i)?.[1]?.trim() || null;
  return { name: name.slice(0, 80), tagline };
}

async function resolveBetaListWebsite(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`https://betalist.com/startups/${slug}/visit`, {
      redirect: "manual",
      headers: { "User-Agent": BROWSER_UA },
      cache: "no-store",
    });
    const loc = res.headers.get("location");
    if (!loc || !/^https?:\/\//i.test(loc)) return null;
    const url = new URL(loc);
    url.searchParams.delete("ref");
    const clean = url.toString().replace(/\?$/, "");
    return url.hostname.endsWith("betalist.com") ? null : clean;
  } catch {
    return null;
  }
}

/** Uncached fetch — exported for scripts; app code uses fetchBetaList(). */
export async function fetchBetaListRaw(): Promise<CandidateLead[]> {
  const res = await fetch("https://betalist.com/", {
    headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`BetaList fetch error ${res.status}`);
  const slugs = parseBetaListSlugs(await res.text()).slice(0, BETALIST_MAX_STARTUPS);

  const candidates = await Promise.all(
    slugs.map(async (slug): Promise<CandidateLead | null> => {
      try {
        const [detailRes, website] = await Promise.all([
          fetch(`https://betalist.com/startups/${slug}`, {
            headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
            cache: "no-store",
          }),
          resolveBetaListWebsite(slug),
        ]);
        if (!detailRes.ok) return null;
        const detail = parseBetaListDetail(await detailRes.text());
        if (!detail) return null;
        return {
          name: detail.name,
          website,
          email: null,
          phone: null,
          meta: { tagline: detail.tagline, betalistUrl: `https://betalist.com/startups/${slug}` },
        };
      } catch {
        return null; // one broken card never fails the source
      }
    }),
  );
  return candidates.filter((c): c is CandidateLead => c !== null);
}

const getCachedBetaList = unstable_cache(fetchBetaListRaw, ["betalist-recent"], {
  revalidate: 3 * 3600,
});

export async function fetchBetaList(): Promise<{ candidates: CandidateLead[]; page: PageInfo }> {
  return { candidates: await getCachedBetaList(), page: null };
}
