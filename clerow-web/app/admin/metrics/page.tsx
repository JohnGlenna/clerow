import { loadAdminMetrics } from "@/lib/adminMetrics";
import { PixelAreaChart } from "@/components/ui/PixelAreaChart";
import { Kpi, fmtDate, fmtUsd } from "../metricsUi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gate + shell live in app/admin/layout.tsx.
export default async function Page() {
  const m = await loadAdminMetrics();
  const inv = m.investor;

  return (
    <div className="adm-page">
      <h1>Metrics</h1>
      <p className="adm-sub">Growth, revenue and churn — straight from the production database.</p>

      <div className="adm-kpis">
        <Kpi value={inv.totals.users} label="Total users" sub={`${m.totals.activatedUsers} connected a brand`} />
        <Kpi value={inv.totals.payingCustomers} label="Paying customers" sub={`${m.totals.trialing} trialing`} />
        <Kpi value={fmtUsd(inv.totals.mrrUsd)} label="MRR" sub={m.totals.atRiskMrrUsd > 0 ? `${fmtUsd(m.totals.atRiskMrrUsd)} at risk` : undefined} />
        <Kpi value={inv.totals.monthlyChurnPct == null ? "—" : `${inv.totals.monthlyChurnPct}%`} label="Monthly churn" sub={`${m.churn.canceledTotal} canceled all-time`} />
        <Kpi value={inv.totals.weeklyActiveBrands} label="Weekly active brands" sub={`${m.totals.monthlyActiveBrands} monthly`} />
      </div>

      <div className="adm-charts">
        <PixelAreaChart data={inv.series.signupsWeekly} valueLabel="Signups / week" color="#38A9E0" />
        <PixelAreaChart data={m.series.newSubsWeekly} valueLabel="New subscribers / week" color="#FFC800" />
        <PixelAreaChart data={inv.series.mrrWeekly} valueLabel="MRR ($)" color="#58CC02" />
        <PixelAreaChart data={m.series.cancellationsWeekly} valueLabel="Cancellations / week" color="#FF6B6B" />
      </div>

      <h2>Plan mix</h2>
      {m.planMix.length === 0 ? (
        <p className="adm-empty">No paying customers yet.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr><th>Plan</th><th>Customers</th><th>MRR</th></tr>
          </thead>
          <tbody>
            {m.planMix.map((p) => (
              <tr key={p.plan}>
                <td>{p.plan}</td>
                <td className="num">{p.count}</td>
                <td className="num">{fmtUsd(p.mrrUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Why people cancel</h2>
      {m.churn.feedback.length === 0 ? (
        <p className="adm-empty">No cancellation feedback yet.</p>
      ) : (
        <div className="adm-feedback">
          {m.churn.reasons.length > 0 && (
            <div className="fb">
              {m.churn.reasons.map((r) => `${r.reason} ×${r.count}`).join(" · ")}
            </div>
          )}
          {m.churn.feedback.map((f, i) => (
            <div className="fb" key={i}>
              <b>{f.reason}</b>
              {f.detail ? <> — {f.detail}</> : null}
              <div className="meta">{f.plan ?? "no plan"} · {fmtDate(f.createdAt)}</div>
            </div>
          ))}
        </div>
      )}

      <h2>Recent signups</h2>
      <table className="adm-table">
        <thead>
          <tr><th>Email</th><th>Brand</th><th>Subscription</th><th>Signed up</th></tr>
        </thead>
        <tbody>
          {m.recentUsers.map((u, i) => (
            <tr key={i}>
              <td>{u.email ?? "—"}</td>
              <td>{u.company ?? "—"}</td>
              <td>{u.subStatus ? `${u.subStatus}${u.plan ? ` (${u.plan})` : ""}` : "free"}</td>
              <td className="num">{fmtDate(u.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
