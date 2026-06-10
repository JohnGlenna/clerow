// Client-side helpers for the Prospect Scanner UI: typed fetch wrappers around
// the /api/admin endpoints.

import type { AnswerRecord, CompetitorCount, Lang } from "@/lib/prospect/types";
import type { DiscoverResponse, LeadStatus } from "@/lib/leads/types";

export type Scan = {
  id: string;
  brand: string;
  website: string;
  category: string;
  language: Lang;
  mentionedCount: number;
  totalPrompts: number;
  competitors: CompetitorCount[];
  topCompetitor: string | null;
  answers: AnswerRecord[];
  email: { subject: string; body: string };
  cached: boolean;
  createdAt: string;
};

export type ScanRequest = {
  brand: string;
  website: string;
  category: string;
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
