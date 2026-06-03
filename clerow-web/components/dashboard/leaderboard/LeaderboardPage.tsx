"use client";

import { useDashboard } from "@/lib/useDashboard";
import { LpHead } from "../shared/PageBits";
import { BrandLogoChip } from "../shared/BrandLogoChip";
import { logoDomain } from "../shell/util";

// How the brand ranks against the competitors AI recommends in its category.
export function LeaderboardPage() {
  const { data } = useDashboard();
  if (!data) return <div className="ld-page" style={{ color: "var(--ink-2)" }}>Loading…</div>;
  const comps = data.competitors ?? [];
  const you = comps.find((c) => c.isYou) ?? null;
  // Only show the "N AIs" badge once more than one model has actually been
  // scanned — on the free single-engine scan it would always read "1 AI".
  const multiModel = (data.models ?? []).filter((m) => !m.locked && m.visibility != null).length > 1;

  return (
    <div className="ld-page">
      <LpHead eyebrow="Your category" title="Leaderboard" sub="How you rank against the brands AI recommends in your space." />
      <div className="lp-card">
        {comps.length === 0 && <div className="lp-row" style={{ color: "var(--ink-2)" }}>Run a scan to see your category leaderboard.</div>}
        {comps.map((row) => {
          const domain = logoDomain(row.name, row.isYou, row.domain, data.brand?.url);
          const gap = you && !row.isYou ? row.visibility - you.visibility : null;
          return (
            <div key={`${row.rank}-${row.name}`} className={`lp-row lb-row ${row.isYou ? "me" : ""}`}>
              <span className={`lb-rank ${row.rank <= 3 ? "r" + row.rank : ""}`}>{row.rank}</span>
              <BrandLogoChip domain={domain} className="lb-logo" />
              <div className="lb-main">
                <div className="lb-name">{row.name}{row.isYou && <span className="lb-you">YOU</span>}</div>
                <div className="lb-meta">
                  {domain && <span>{domain}</span>}
                  {multiModel && row.enginesCount > 0 && (
                    <span>{row.enginesCount} {row.enginesCount === 1 ? "AI" : "AIs"}</span>
                  )}
                </div>
                <div className="lb-bar"><i style={{ width: `${Math.min(100, row.visibility)}%` }} /></div>
              </div>
              <div className="lb-right">
                <span className="lb-vis">{row.visibility}%</span>
                {gap != null && gap > 0 && <span className="lb-gap">+{gap}% vs you</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
