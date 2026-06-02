"use client";

import { useDashboard } from "@/lib/useDashboard";
import { MascotClerow } from "../../Mascot";
import { PixelXpBar } from "../../ui/PixelXpBar";
import { PixelAreaChart } from "../../ui/PixelAreaChart";
import { LpHead } from "../shared/PageBits";
import { AccountSettings } from "./AccountCards";

function Pf({ n, l }: { n: string; l: string }) {
  return <div><div style={{ fontWeight: 900, fontSize: 18 }}>{n}</div><div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-3)" }}>{l}</div></div>;
}

// The player card + AI-visibility trend (side by side), achievements, and the
// account/brand/billing controls (moved here from the removed Settings page).
export function ProfilePage() {
  const { data } = useDashboard();
  if (!data) return <div className="ld-page" style={{ color: "var(--ink-2)" }}>Loading…</div>;
  const xp = data.xp;
  const streak = data.streak;
  const medals: { t: string; i: string; n: string }[] = [
    { t: "gold", i: "🏆", n: "First scan" }, { t: "silver", i: "📜", n: "Schema" },
    { t: "bronze", i: "⚡", n: "Quick fix" }, { t: "gold", i: "📈", n: "Trending" },
    { t: "locked", i: "🔒", n: "30-day" }, { t: "locked", i: "👑", n: "#1 spot" },
  ];

  return (
    <div className="ld-page">
      <LpHead title="Profile" />

      <div className="pf-top">
        <div className="lp-card pf-card">
          <div className="pf-avatar"><MascotClerow size={60} /><span className="pf-lv">Lv {xp?.level ?? 1}</span></div>
          <div className="pf-name">{data.brand?.company || data.brand?.url || "Your brand"}</div>
          <div className="pf-title">{xp?.title ?? "Rookie"}</div>
          <div className="pf-xpbar"><PixelXpBar value={xp?.pct ?? 0} level={xp?.level} /></div>
          <div className="pf-stats">
            <Pf n={String(xp?.total ?? 0)} l="XP" /><Pf n={`🔥 ${streak?.current ?? 0}`} l="Streak" /><Pf n={String(data.scansLeft ?? 0)} l="Scans left" />
          </div>
        </div>

        <div className="lp-card pf-trend">
          <div className="pf-trend-h">AI visibility trend</div>
          <PixelAreaChart data={(data.trend?.sparkline ?? []).map((v, i) => ({ label: `#${i + 1}`, value: v }))} max={100} />
        </div>
      </div>

      <h2 className="lp-sec">Achievements</h2>
      <div className="lp-card" style={{ padding: 18 }}>
        <div className="lmedal-row">
          {medals.map((m, i) => (<div key={i} className={`lmedal ${m.t}`}><span className="m">{m.i}</span><span className="n">{m.n}</span></div>))}
        </div>
      </div>

      <h2 className="lp-sec">Your site &amp; account</h2>
      <AccountSettings />
    </div>
  );
}
