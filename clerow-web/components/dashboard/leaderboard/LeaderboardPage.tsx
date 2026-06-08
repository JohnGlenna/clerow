"use client";

import { useDashboard } from "@/lib/useDashboard";
import { LpHead } from "../shared/PageBits";
import { BrandLogoChip } from "../shared/BrandLogoChip";
import { logoDomain } from "../shell/util";
import { LDIcon } from "../shell/LDIcon";
import { useOverlay } from "../shell/OverlayProvider";
import { PLANS } from "@/lib/billing/plans";
import { LAUNCH_PROMO, promoFirstMonth } from "@/lib/billing/promo";
import type { DashboardCompetitor } from "@/lib/types";

// Free users see the full standings, but only the top few rows in the clear —
// the rest of the competitive set is blurred behind an upgrade prompt. Their own
// row always stays sharp (it's their data, not gated) wherever it ranks.
const FREE_ROWS = 3;

// How the brand ranks against the competitors AI recommends in its category.
export function LeaderboardPage() {
  const { data } = useDashboard();
  const { openUpgrade } = useOverlay();
  if (!data) return <div className="ld-page" style={{ color: "var(--ink-2)" }}>Loading…</div>;
  const comps = data.competitors ?? [];
  const you = comps.find((c) => c.isYou) ?? null;
  // Only show the "N AIs" badge once more than one model has actually been
  // scanned — on the free single-engine scan it would always read "1 AI".
  const multiModel = (data.models ?? []).filter((m) => !m.locked && m.visibility != null).length > 1;
  const locked = !data.subscribed;
  // The competitor rows hidden behind the paywall (the user's own row never counts).
  const hiddenCount = locked ? comps.filter((c, i) => i >= FREE_ROWS && !c.isYou).length : 0;

  const renderRow = (row: DashboardCompetitor, i: number) => {
    const domain = logoDomain(row.name, row.isYou, row.domain, data.brand?.url);
    const gap = you && !row.isYou ? row.visibility - you.visibility : null;
    // Competitor intel past the free rows is blurred; the user's own row is never gated.
    const blurred = locked && i >= FREE_ROWS && !row.isYou;
    return (
      <div
        key={`${row.rank}-${row.name}`}
        className={`lp-row lb-row ${row.isYou ? "me" : ""} ${blurred ? "lb-locked" : ""}`}
        aria-hidden={blurred || undefined}
      >
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
  };

  return (
    <div className="ld-page">
      <LpHead eyebrow="Your category" title="Leaderboard" sub="How you rank against the brands AI recommends in your space." />
      <div className="lp-card">
        {comps.length === 0 && <div className="lp-row" style={{ color: "var(--ink-2)" }}>Run a scan to see your category leaderboard.</div>}
        {comps.map((row, i) => (
          <div key={`g-${row.rank}-${row.name}`} style={{ display: "contents" }}>
            {/* The unlock CTA sits right where the paywall starts. */}
            {locked && hiddenCount > 0 && i === FREE_ROWS && <UnlockBanner count={hiddenCount} onUpgrade={openUpgrade} />}
            {renderRow(row, i)}
          </div>
        ))}
      </div>
    </div>
  );
}

function UnlockBanner({ count, onUpgrade }: { count: number; onUpgrade: () => void }) {
  return (
    <div className="lb-unlock">
      <span className="lb-unlock-ic"><LDIcon name="lock" /></span>
      <div className="lb-unlock-txt">
        <b>See your full category leaderboard</b>
        <span>{count} more {count === 1 ? "brand" : "brands"} AI recommends in your space — and exactly who&apos;s beating you.</span>
      </div>
      <button className="lb-unlock-btn" onClick={onUpgrade}>{LAUNCH_PROMO.active ? `Unlock — ${promoFirstMonth(PLANS.founder.price)} first month` : `Unlock — $${PLANS.founder.price}/mo`}</button>
    </div>
  );
}
