// Client-side helpers for the Prospect Scanner UI: typed fetch wrappers around
// the /api/admin endpoints.

import type { AnswerRecord, CompetitorCount, Lang, SitePeek } from "@/lib/prospect/types";
import type { DiscoverResponse, LeadStatus } from "@/lib/leads/types";

export type Scan = {
  id: string;
  brand: string;
  website: string;
  language: Lang;
  mentionedCount: number;
  totalPrompts: number;
  competitors: CompetitorCount[];
  topCompetitor: string | null;
  answers: AnswerRecord[];
  email: { subject: string; body: string };
  /** What the crawler read from their homepage; null for old scans / unreadable sites. */
  sitePeek: SitePeek | null;
  cached: boolean;
  createdAt: string;
};

export type ScanRequest = {
  brand: string;
  website: string;
  language: Lang;
  promptOverride?: string;
  force?: boolean;
};

async function asError(res: Response): Promise<Error> {
  const data = await res.json().catch(() => null);
  return new Error((data as { error?: string } | null)?.error || `Request failed (${res.status})`);
}

export async function runScan(input: ScanRequest): Promise<Scan> {
  const res = await fetch("/api/admin/prospect-scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await asError(res);
  return (await res.json()).scan as Scan;
}

export async function loadScan(id: string): Promise<Scan> {
  const res = await fetch(`/api/admin/prospect-scan?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw await asError(res);
  return (await res.json()).scan as Scan;
}

export async function discover(params: URLSearchParams): Promise<DiscoverResponse> {
  const res = await fetch(`/api/admin/leads/discover?${params}`);
  if (!res.ok) throw await asError(res);
  return (await res.json()) as DiscoverResponse;
}

export async function fetchCounts(): Promise<Record<LeadStatus | "total", number>> {
  const res = await fetch("/api/admin/leads");
  if (!res.ok) throw await asError(res);
  return (await res.json()).counts;
}

export async function patchLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const res = await fetch(`/api/admin/leads/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw await asError(res);
}

// --- Outbox ----------------------------------------------------------------

export type OutboxRow = {
  leadId: string;
  name: string;
  website: string;
  websiteKey: string;
  email: string | null;
  source: string;
  scanId: string;
  mentionedCount: number;
  totalPrompts: number;
  topCompetitor: string | null;
  language: string;
  subject: string;
  body: string;
  scanCreatedAt: string;
};

/** A scheduled drip follow-up (email 2 or 3). subject/body are the EXACT
 *  strings the cron will send — the preview can't drift from reality. */
export type FollowupRow = {
  leadId: string;
  name: string;
  website: string;
  websiteKey: string;
  email: string;
  step: 2 | 3;
  dueAt: string;
  due: boolean;
  language: Lang;
  subject: string;
  body: string;
  inReplyTo: string | null;
};

export type OutboxResponse = {
  rows: OutboxRow[];
  followups: FollowupRow[];
  sentToday: number;
  cap: number;
  queued: number;
  sendConfigured: boolean;
};

export async function fetchOutbox(): Promise<OutboxResponse> {
  const res = await fetch("/api/admin/outbox");
  if (!res.ok) throw await asError(res);
  return (await res.json()) as OutboxResponse;
}

export async function stopLeadSequence(id: string): Promise<void> {
  const res = await fetch(`/api/admin/leads/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stopSequence: true }),
  });
  if (!res.ok) throw await asError(res);
}

// --- Sent history (outreach_sends log) ---------------------------------------

export type SentRow = {
  id: string;
  leadId: string;
  name: string;
  website: string;
  websiteKey: string;
  leadStatus: string;
  toEmail: string;
  step: number;
  subject: string;
  body: string;
  sentAt: string;
};

export type SentResponse = {
  rows: SentRow[];
  total: number;
  sentToday: number;
  cap: number;
};

export async function fetchSent(): Promise<SentResponse> {
  const res = await fetch("/api/admin/sent");
  if (!res.ok) throw await asError(res);
  return (await res.json()) as SentResponse;
}

export type PipelineSummary = {
  discovered: number;
  scanned: { name: string; websiteKey: string; mentionedCount: number; totalPrompts: number; cached: boolean }[];
  rejected: { name: string; websiteKey: string; reason: string }[];
  errors: { name: string; websiteKey: string; error: string }[];
  queued: number;
  ranOutOfTime: boolean;
};

export async function runPipeline(maxScans = 3): Promise<PipelineSummary> {
  const res = await fetch("/api/admin/outbox/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ maxScans }),
  });
  if (!res.ok) throw await asError(res);
  return (await res.json()) as PipelineSummary;
}

// --- Autopilot kill switch -------------------------------------------------

export async function fetchAutopilot(): Promise<{ enabled: boolean }> {
  const res = await fetch("/api/admin/autopilot");
  if (!res.ok) throw await asError(res);
  return (await res.json()) as { enabled: boolean };
}

export async function setAutopilot(enabled: boolean): Promise<{ enabled: boolean }> {
  const res = await fetch("/api/admin/autopilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw await asError(res);
  return (await res.json()) as { enabled: boolean };
}

// --- Auto-send kill switch (the outreach drip cron) --------------------------

export async function fetchAutosend(): Promise<{ enabled: boolean }> {
  const res = await fetch("/api/admin/autosend");
  if (!res.ok) throw await asError(res);
  return (await res.json()) as { enabled: boolean };
}

export async function setAutosend(enabled: boolean): Promise<{ enabled: boolean }> {
  const res = await fetch("/api/admin/autosend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw await asError(res);
  return (await res.json()) as { enabled: boolean };
}

// --- Full report (multi-model prospect report + shareable link) ------------

export type ProspectReportRow = {
  token: string;
  url: string;
  company: string;
  website: string;
  createdAt: string;
  revoked: boolean;
};

export async function generateReport(input: { url: string; company?: string }): Promise<{ url: string; token: string }> {
  const res = await fetch("/api/admin/prospect-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await asError(res);
  return (await res.json()) as { url: string; token: string };
}

export async function fetchReports(): Promise<ProspectReportRow[]> {
  const res = await fetch("/api/admin/prospect-report");
  if (!res.ok) throw await asError(res);
  return (await res.json()).reports as ProspectReportRow[];
}

export async function revokeReport(token: string): Promise<void> {
  const res = await fetch(`/api/admin/prospect-report?token=${encodeURIComponent(token)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw await asError(res);
}

export async function sendLeadEmail(
  id: string,
  payload: { to: string; subject: string; body: string },
): Promise<{ ok: true; sentToday: number; cap: number }> {
  const res = await fetch(`/api/admin/leads/${encodeURIComponent(id)}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await asError(res);
  return (await res.json()) as { ok: true; sentToday: number; cap: number };
}
