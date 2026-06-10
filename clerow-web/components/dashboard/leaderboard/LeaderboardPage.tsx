"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
      <LpHead eyebrow="Leaderboard" title="Your category, ranked by AI." sub="Visibility blends how often each brand is named across the models we scan, weighted by prompt volume." />
      <LeaderboardHero comps={comps} you={you} brandUrl={data.brand?.url} onClimb={() => router.push("/dashboard/tasks")} />
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

// The top-of-page highlights: a podium for the top 3 brands AI recommends, plus a card
// showing where the user stands and a push into the daily tasks that close the gap.
function LeaderboardHero({
  comps,
  you,
  brandUrl,
  onClimb,
}: {
  comps: DashboardCompetitor[];
  you: DashboardCompetitor | null;
  brandUrl: string | undefined;
  onClimb: () => void;
}) {
  if (comps.length === 0) return null;
  const top = comps.slice(0, 3);
  // Visual podium order puts #1 in the middle, elevated: [2nd, 1st, 3rd].
  const order = [top[1], top[0], top[2]].filter(Boolean) as DashboardCompetitor[];
  return (
    <div className="lb-hero">
      <div className="lb-podium">
        {order.map((row) => (
          <PodiumCard key={`${row.rank}-${row.name}`} row={row} brandUrl={brandUrl} />
        ))}
      </div>
      {you && <YourStanding you={you} total={comps.length} onClimb={onClimb} />}
    </div>
  );
}

function PodiumCard({ row, brandUrl }: { row: DashboardCompetitor; brandUrl: string | undefined }) {
  const domain = logoDomain(row.name, row.isYou, row.domain, brandUrl);
  return (
    <div className={`lb-pod ${row.rank === 1 ? "lb-pod--win" : ""}`}>
      <span className={`lb-rank lb-pod-place ${row.rank <= 3 ? "r" + row.rank : ""}`}>{row.rank}</span>
      <BrandLogoChip domain={domain} className="lb-pod-logo" />
      <div className="lb-pod-name">
        {row.name}
        {row.isYou && <span className="lb-you">YOU</span>}
      </div>
      <div className="lb-pod-vis">{row.visibility}<span>/100</span></div>
    </div>
  );
}

function YourStanding({ you, total, onClimb }: { you: DashboardCompetitor; total: number; onClimb: () => void }) {
  const isTop = you.rank === 1;
  const msg = isTop
    ? `Visibility score ${you.visibility}/100. You're out front — keep it that way.`
    : you.visibility <= 2
      ? `Visibility score ${you.visibility}/100. You're barely named in any tracked prompt yet — there's only one way to go.`
      : `Visibility score ${you.visibility}/100. There's room to climb on the brands ahead of you.`;
  return (
    <div className="lb-stand">
      <div className="lb-stand-eyebrow">Your standing</div>
      <div className="lb-stand-rank">#{you.rank}<span> / {total}</span></div>
      <div className="lb-stand-msg">{msg}</div>
      <button className="lb-stand-btn" onClick={onClimb}>{isTop ? "Defend your lead" : "Start climbing"} →</button>
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
