import type { InvestorMetrics } from "@/lib/adminMetrics";
import { PixelAreaChart } from "@/components/ui/PixelAreaChart";

// The investor-facing metrics report — rendered on the public /investors/[token]
// page AND as the live preview on /admin/investors, so what the founder sees is
// exactly what investors see. Aggregates only: no customer names, emails or
// domains ever appear here. Light, outward-facing styling like /share/[token].

const ink = "#1F2430";
const ink2 = "#5B6472";

const fmtUsd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function InvestorReport({ m }: { m: InvestorMetrics }) {
  const kpis: { value: string; label: string }[] = [
    { value: String(m.totals.users), label: "Total users" },
    { value: String(m.totals.payingCustomers), label: "Paying customers" },
    { value: fmtUsd(m.totals.mrrUsd), label: "MRR" },
    { value: m.totals.monthlyChurnPct == null ? "—" : `${m.totals.monthlyChurnPct}%`, label: "Monthly churn" },
    { value: String(m.totals.weeklyActiveBrands), label: "Weekly active brands" },
    { value: m.totals.tasksCompleted.toLocaleString("en-US"), label: "Tasks completed" },
    { value: m.totals.aiAnswersAnalyzed.toLocaleString("en-US"), label: "AI answers analyzed" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg, #FFFDF7, #FFF4DE)", padding: "48px 20px 64px", color: ink }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em" }}>Clerow</div>
          <span style={{ fontSize: 12, fontWeight: 800, color: ink2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Traction · live as of {fmtDate(m.asOf)}
          </span>
        </div>

        <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
          Your daily streak to getting recommended by AI
        </h1>
        <p style={{ color: ink2, fontWeight: 600, margin: "0 0 28px" }}>
          Clerow scans the AI answer engines, shows brands where competitors get recommended instead of them, and turns
          fixing it into a daily habit. The numbers below come straight from production.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 22 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "#fff", border: "2px solid #F0E6CF", borderRadius: 18, padding: 16, boxShadow: "0 4px 0 #F0E6CF" }}>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>{k.value}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: ink2, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>
                {k.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14 }}>
          <PixelAreaChart data={m.series.signupsWeekly} valueLabel="Signups / week" color="#F59E0B" ink={ink} surface="#fff" />
          <PixelAreaChart data={m.series.payingCumulativeWeekly} valueLabel="Paying customers" color="#58CC02" ink={ink} surface="#fff" />
          <PixelAreaChart data={m.series.mrrWeekly} valueLabel="MRR ($)" color="#38A9E0" ink={ink} surface="#fff" />
          <PixelAreaChart data={m.series.tasksWeekly} valueLabel="Tasks shipped / week" color="#CE82FF" ink={ink} surface="#fff" />
        </div>

        <div style={{ textAlign: "center", marginTop: 32, color: ink2, fontSize: 13, fontWeight: 700 }}>
          Powered by{" "}
          <a href="https://clerow.com" style={{ color: "#F59E0B", fontWeight: 900, textDecoration: "none" }}>
            Clerow
          </a>{" "}
          — your daily streak to getting recommended by AI.
        </div>
      </div>
    </main>
  );
}
