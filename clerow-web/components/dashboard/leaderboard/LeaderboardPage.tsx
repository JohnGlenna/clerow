"use client";

import { useDashboard } from "@/lib/useDashboard";
import { LpHead } from "../shared/PageBits";

// How the brand ranks against the competitors AI recommends in its category.
export function LeaderboardPage() {
  const { data } = useDashboard();
  if (!data) return <div className="ld-page" style={{ color: "var(--ink-2)" }}>Loading…</div>;
  const comps = data.competitors ?? [];
  return (
    <div className="ld-page">
      <LpHead eyebrow="Your category" title="Leaderboard" sub="How you rank against the brands AI recommends in your space." />
      <div className="lp-card">
        {comps.length === 0 && <div className="lp-row" style={{ color: "var(--ink-2)" }}>Run a scan to see your category leaderboard.</div>}
        {comps.map((row) => (
          <div key={`${row.rank}-${row.name}`} className={`lp-row ${row.isYou ? "me" : ""}`}>
            <span className={`lb-rank ${row.rank <= 3 ? "r" + row.rank : ""}`}>{row.rank}</span>
            <span className="mc" style={{ background: row.isYou ? "#38A9E0" : "#566270", marginLeft: 0, width: 26, height: 26 }}>{row.name[0]?.toUpperCase()}</span>
            <div style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>{row.name}{row.isYou && <span className="lb-you">YOU</span>}</div>
            <span style={{ fontFamily: "var(--mono)", fontWeight: 800, fontSize: 13 }}>{row.visibility}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
