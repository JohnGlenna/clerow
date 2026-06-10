// Types for the Discover tab's lead sourcing (brreg / Product Hunt / Show HN).

export type LeadSource = "brreg" | "producthunt" | "shownh";

export type LeadStatus = "new" | "scanned" | "emailed" | "replied" | "customer";

export const LEAD_STATUSES: LeadStatus[] = ["new", "scanned", "emailed", "replied", "customer"];

/** A company as fetched from an external source, before persistence. */
export type CandidateLead = {
  name: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  /** Source-specific extras shown in the table: niche, place, tagline, topics, points, dates… */
  meta: Record<string, unknown>;
};

/** What the Discover panels render: a candidate merged with its DB row + scan link. */
export type LeadRow = {
  /** null = not persisted (no usable website) — Scan disabled. */
  id: string | null;
  source: LeadSource;
  name: string;
  website: string | null;
  websiteKey: string | null;
  email: string | null;
  phone: string | null;
  meta: Record<string, unknown>;
  status: LeadStatus;
  /** Newest prospect_scans row for this domain, if any. */
  scanId: string | null;
};

export type PageInfo = { number: number; totalPages: number } | null;

export type DiscoverResponse = {
  source: LeadSource;
  notConfigured?: true;
  leads: LeadRow[];
  page: PageInfo;
};

export type BrregParams = {
  /** YYYY-MM-DD — fraRegistreringsdatoEnhetsregisteret */
  from: string;
  /** YYYY-MM-DD — tilRegistreringsdatoEnhetsregisteret (optional upper bound). */
  to?: string;
  /** Comma list of SN 2025 codes, division level ok (e.g. "62,73"). */
  naering: string;
  kommune?: string;
  page: number;
};
