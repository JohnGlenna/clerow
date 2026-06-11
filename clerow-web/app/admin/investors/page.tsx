import { loadInvestorMetrics } from "@/lib/adminMetrics";
import { InvestorReport } from "@/components/InvestorReport";
import { InvestorLinkControls } from "./InvestorLinkControls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gate + shell live in app/admin/layout.tsx. The preview below is the exact
// component investors see at /investors/[token].
export default async function Page() {
  const metrics = await loadInvestorMetrics();

  return (
    <div className="adm-page">
      <h1>Investors</h1>
      <p className="adm-sub">
        Share live traction with investors. The preview below is exactly what they see — aggregates only, never
        customer names or emails.
      </p>

      <InvestorLinkControls />

      <h2>Preview</h2>
      <div style={{ border: "1px solid var(--surface-2)", borderRadius: 14, overflow: "hidden" }}>
        <InvestorReport m={metrics} />
      </div>
    </div>
  );
}
