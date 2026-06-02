"use client";

import React from "react";
import { startCheckout } from "@/lib/useSubscription";

// Founder-plan upsell, shown when a user hits a locked level or taps an upgrade CTA.
export function UpgradeSheet({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="share-pop-back" onClick={onClose}>
      <div className="upg-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="lesson-x upg-x" onClick={onClose}>✕</button>
        <div className="upg-sheet-ic">⭐</div>
        <h2>Unlock the rest of your path</h2>
        <p className="upg-sheet-sub">You&apos;ve cleared the free quick wins. Go Founder to unlock every level, re-scans across all 5 models, the leaderboard &amp; weekly reports.</p>
        <div className="upg-price-big"><b>$29</b><span>/month</span></div>
        <ul className="upg-sheet-list">
          <li><span className="ck">✓</span> All quest levels — Structure, Content, Authority</li>
          <li><span className="ck">✓</span> Daily re-scans across ChatGPT, Claude, Perplexity, Gemini &amp; Grok</li>
          <li><span className="ck">✓</span> Category leaderboard &amp; weekly progress reports</li>
          <li><span className="ck">✓</span> Clerow MCP autopilot</li>
        </ul>
        <button className="btn-upg btn-upg--lg" disabled={busy}
          onClick={async () => { setBusy(true); try { await startCheckout("founder"); } finally { setBusy(false); } }}>
          {busy ? "…" : "Upgrade to Founder — $29/mo"}
        </button>
        <button className="upg-later" onClick={onClose}>Maybe later</button>
      </div>
    </div>
  );
}
