// Source-domain helpers shared by the prompt detail and brand snapshot. Turns an
// engine's citations into clean third-party domains for the "sources cited" UI.

import type { Citation } from "../supabase/database.types";

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

// Gemini grounding URLs are opaque Google redirect links that all share one
// host; the real source lives in the citation title instead. Detect those and
// fall back to a domain parsed from the title.
const REDIRECT_HOSTS = new Set(["vertexaisearch.cloud.google.com"]);

function domainFromTitle(title: string | undefined): string | null {
  if (!title) return null;
  const m = title.trim().toLowerCase().match(/([a-z0-9-]+\.)+[a-z]{2,}/);
  return m ? m[0].replace(/^www\./, "") : null;
}

// The clean domain for one citation, resolving Gemini's redirect URLs via title.
// Returns null if no usable domain can be derived.
export function citationToDomain(c: Citation): string | null {
  let host = c?.url ? hostOf(c.url) : null;
  if (!host || REDIRECT_HOSTS.has(host)) host = domainFromTitle(c?.title) ?? null;
  return host && !REDIRECT_HOSTS.has(host) ? host : null;
}

// Distinct third-party domains cited in an answer, excluding the brand's own host.
export function domainsFrom(citations: unknown, exclude: string | null): string[] {
  if (!Array.isArray(citations)) return [];
  const seen = new Set<string>();
  for (const c of citations as Citation[]) {
    const host = citationToDomain(c);
    if (host && host !== exclude) seen.add(host);
  }
  return [...seen];
}
