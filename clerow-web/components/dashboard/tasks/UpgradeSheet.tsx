"use client";

import React from "react";
import { startCheckout } from "@/lib/useSubscription";
import { useDashboard } from "@/lib/useDashboard";
import { PLANS } from "@/lib/billing/plans";
import { LAUNCH_PROMO, promoFirstMonth } from "@/lib/billing/promo";

// Premium-plan upsell, shown when a user hits a locked level or taps an upgrade CTA.
// Leads with loss-aversion: ties the wall to the streak they've built and the
// estimated visibility they're leaving on the table.
export function UpgradeSheet({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const { data } = useDashboard();
  const streak = data?.streak?.current ?? 0;
  const gain = data?.lockedGain?.overall ?? 0;

  const sub =
    streak > 1
      ? `You're on a ${streak}-day streak and just shipped your first structure win. Keep climbing — Premium unlocks every level, re-scans across all 5 models, the leaderboard & weekly reports.`
      : "You just shipped your first structure win. Go Premium to unlock every level, re-scans across all 5 models, the leaderboard & weekly reports.";

  const base = PLANS.founder.price;
  const promo = LAUNCH_PROMO.active;
  const first = promoFirstMonth(base);

  return (
    <div className="share-pop-back" onClick={onClose}>
      <div className="upg-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="lesson-x upg-x" onClick={onClose}>✕</button>
        <div className="upg-sheet-ic">⭐</div>
        <h2>Don&apos;t stop your climb</h2>
        <p className="upg-sheet-sub">{sub}</p>
        {gain > 0 && (
          <div className="upg-gain">Finishing the locked levels is worth an <b>est. +{gain}% AI visibility</b>.</div>
        )}
        {promo ? (
          <div className="upg-price-big">
            <b>{first}</b><span> first month</span><span className="upg-old">${base}</span>
            <span className="upg-promo-foot">
              <span className="upg-promo-badge">⚡ {LAUNCH_PROMO.label} · {LAUNCH_PROMO.percentOff}% off</span>
              <span className="upg-promo-note">then ${base}/mo</span>
            </span>
          </div>
        ) : (
          <div className="upg-price-big"><b>${base}</b><span>/month</span></div>
        )}
        <ul className="upg-sheet-list">
          <li><span className="ck">✓</span> All quest levels — Structure, Content, Authority</li>
          <li><span className="ck">✓</span> Daily re-scans across ChatGPT, Claude, Perplexity, Gemini &amp; Grok</li>
          <li><span className="ck">✓</span> Category leaderboard &amp; weekly progress reports</li>
          <li><span className="ck">✓</span> Clerow MCP autopilot</li>
        </ul>
        <button className="btn-upg btn-upg--lg" disabled={busy}
          onClick={async () => { setBusy(true); try { await startCheckout("founder"); } finally { setBusy(false); } }}>
          {busy ? "…" : promo ? `Upgrade to Premium — ${first} first month` : `Upgrade to Premium — $${base}/mo`}
        </button>
        <button className="upg-later" onClick={onClose}>Maybe later</button>
      </div>
    </div>
  );
}
