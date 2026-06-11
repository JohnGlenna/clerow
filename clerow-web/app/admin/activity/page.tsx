import { loadAdminMetrics } from "@/lib/adminMetrics";
import { PixelAreaChart } from "@/components/ui/PixelAreaChart";
import { Kpi } from "../metricsUi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gate + shell live in app/admin/layout.tsx.
export default async function Page() {
  const m = await loadAdminMetrics();

  return (
    <div className="adm-page">
      <h1>Activity</h1>
      <p className="adm-sub">What users actually do — tasks, scans and streaks (active = completed ≥1 task).</p>

      <div className="adm-kpis">
        <Kpi value={m.investor.totals.tasksCompleted} label="Tasks completed" sub="all-time" />
        <Kpi value={m.investor.totals.aiAnswersAnalyzed} label="AI answers analyzed" sub="all-time scan results" />
        <Kpi value={m.investor.totals.weeklyActiveBrands} label="Weekly active brands" sub={`${m.totals.monthlyActiveBrands} monthly`} />
        <Kpi value={m.streaks.brandsOnStreak} label="Brands on a streak" />
        <Kpi value={`$${m.totals.scanCost90dUsd}`} label="Scan COGS" sub="last 90 days, est." />
      </div>

      <div className="adm-charts">
        <PixelAreaChart data={m.series.tasksDaily} valueLabel="Tasks / day" color="#FFC800" />
        <PixelAreaChart data={m.series.activeBrandsDaily} valueLabel="Active brands / day" color="#38A9E0" />
        <PixelAreaChart data={m.series.scansDaily} valueLabel="Scans / day" color="#58CC02" />
        <PixelAreaChart data={m.series.mcpCallsDaily} valueLabel="MCP calls / day" color="#CE82FF" />
      </div>

      <h2>Top streaks</h2>
      {m.streaks.top.length === 0 ? (
        <p className="adm-empty">Nobody is on a streak yet.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr><th>Brand</th><th>Current</th><th>Longest</th></tr>
          </thead>
          <tbody>
            {m.streaks.top.map((s, i) => (
              <tr key={i}>
                <td>{s.company ?? "—"}</td>
                <td className="num">{s.current} 🔥</td>
                <td className="num">{s.longest}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
