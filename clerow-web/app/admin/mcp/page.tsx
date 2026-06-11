import { loadAdminMetrics } from "@/lib/adminMetrics";
import { PixelAreaChart } from "@/components/ui/PixelAreaChart";
import { Kpi, fmtDate } from "../metricsUi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gate + shell live in app/admin/layout.tsx.
export default async function Page() {
  const m = await loadAdminMetrics();

  return (
    <div className="adm-page">
      <h1>MCP Usage</h1>
      <p className="adm-sub">Who connects their AI agent to Clerow, and what it calls (events kept 30 days back).</p>

      <div className="adm-kpis">
        <Kpi value={m.mcp.usersEver} label="MCP users" sub="ever connected & called" />
        <Kpi value={m.mcp.perUser.length} label="Active users" sub="last 30 days" />
        <Kpi value={m.mcp.totalCalls30d} label="Tool calls" sub="last 30 days" />
      </div>

      <div className="adm-charts">
        <PixelAreaChart data={m.series.mcpCallsDaily} valueLabel="MCP calls / day" color="#CE82FF" />
      </div>

      <h2>By tool</h2>
      {m.mcp.perTool.length === 0 ? (
        <p className="adm-empty">No MCP tool calls logged yet — events start accruing now that logging is live.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr><th>Tool</th><th>Calls (30d)</th><th>Error rate</th><th>Median duration</th></tr>
          </thead>
          <tbody>
            {m.mcp.perTool.map((t) => (
              <tr key={t.tool}>
                <td>{t.tool}</td>
                <td className="num">{t.calls}</td>
                <td className="num">{t.errorPct}%</td>
                <td className="num">{t.medianMs} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>By user</h2>
      {m.mcp.perUser.length === 0 ? (
        <p className="adm-empty">No per-user activity in the last 30 days.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr><th>Email</th><th>Brand</th><th>Calls (7d)</th><th>Calls (30d)</th><th>Last call</th></tr>
          </thead>
          <tbody>
            {m.mcp.perUser.map((u, i) => (
              <tr key={i}>
                <td>{u.email ?? "—"}</td>
                <td>{u.company ?? "—"}</td>
                <td className="num">{u.calls7d}</td>
                <td className="num">{u.calls30d}</td>
                <td className="num">{fmtDate(u.lastCall)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {m.mcp.legacyKeyUsers.length > 0 && (
        <>
          <h2>Connected before logging existed</h2>
          <p className="adm-sub">These users&apos; keys were used before per-tool logging shipped — only the key&apos;s last use is known.</p>
          <table className="adm-table">
            <thead>
              <tr><th>Email</th><th>Key last used</th></tr>
            </thead>
            <tbody>
              {m.mcp.legacyKeyUsers.map((u, i) => (
                <tr key={i}>
                  <td>{u.email ?? "—"}</td>
                  <td className="num">{fmtDate(u.lastUsedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
