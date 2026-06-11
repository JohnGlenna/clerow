import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadInvestorMetrics } from "@/lib/adminMetrics";
import { InvestorReport } from "@/components/InvestorReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clerow · Traction",
  robots: { index: false, follow: false },
};

// Public investor metrics page, gated only by the unguessable token the founder
// mints on /admin/investors. Read-only aggregates (loadInvestorMetrics never
// includes emails, names or per-user rows). Computed per request — a handful of
// investors at the current scale; wrap in unstable_cache if that ever changes.
export default async function InvestorsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("metrics_share_links")
    .select("revoked_at")
    .eq("token", token)
    .maybeSingle();
  if (!link || link.revoked_at) notFound();

  const metrics = await loadInvestorMetrics();
  return <InvestorReport m={metrics} />;
}
