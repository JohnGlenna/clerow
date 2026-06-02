"use client";

import { useRouter } from "next/navigation";
import { useDashboard } from "@/lib/useDashboard";
import { MascotClerow } from "../../Mascot";
import { PixelXpBar } from "../../ui/PixelXpBar";
import { PixelAreaChart } from "../../ui/PixelAreaChart";
import { createClient } from "@/lib/supabase/client";
import { LpHead } from "../shared/PageBits";

function Pf({ n, l }: { n: string; l: string }) {
  return <div><div style={{ fontWeight: 900, fontSize: 18 }}>{n}</div><div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-3)" }}>{l}</div></div>;
}

// The player card: level, XP, streak, AI-visibility trend, achievements, account.
export function ProfilePage() {
  const router = useRouter();
  const { data } = useDashboard();
  if (!data) return <div className="ld-page" style={{ color: "var(--ink-2)" }}>Loading…</div>;
  const xp = data.xp;
  const streak = data.streak;
  const medals: { t: string; i: string; n: string }[] = [
    { t: "gold", i: "🏆", n: "First scan" }, { t: "silver", i: "📜", n: "Schema" },
    { t: "bronze", i: "⚡", n: "Quick fix" }, { t: "gold", i: "📈", n: "Trending" },
    { t: "locked", i: "🔒", n: "30-day" }, { t: "locked", i: "👑", n: "#1 spot" },
  ];
  const signOut = async () => { await createClient().auth.signOut(); router.push("/"); };
  return (
    <div className="ld-page">
      <LpHead title="Profile" />
      <div className="lp-card" style={{ padding: 22, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <div className="pf-avatar"><MascotClerow size={64} /><span className="pf-lv">Lv {xp?.level ?? 1}</span></div>
        </div>
        <div style={{ fontWeight: 900, fontSize: 20 }}>{data.brand?.company || data.brand?.url || "Your brand"}</div>
        <div style={{ color: "var(--ink-2)", fontWeight: 700, fontSize: 13 }}>{xp?.title ?? "Rookie"}</div>
        <div style={{ maxWidth: 320, margin: "16px auto 0" }}>
          <PixelXpBar value={xp?.pct ?? 0} level={xp?.level} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16 }}>
          <Pf n={String(xp?.total ?? 0)} l="XP" /><Pf n={`🔥 ${streak?.current ?? 0}`} l="Streak" /><Pf n={String(data.scansLeft ?? 0)} l="Scans left" />
        </div>
      </div>
      <h2 className="lp-sec">AI visibility trend</h2>
      <PixelAreaChart data={(data.trend?.sparkline ?? []).map((v, i) => ({ label: `#${i + 1}`, value: v }))} max={100} />

      <h2 className="lp-sec">Achievements</h2>
      <div className="lp-card" style={{ padding: 18 }}>
        <div className="lmedal-row">
          {medals.map((m, i) => (<div key={i} className={`lmedal ${m.t}`}><span className="m">{m.i}</span><span className="n">{m.n}</span></div>))}
        </div>
      </div>
      <h2 className="lp-sec">Account</h2>
      <div className="lp-card">
        <button className="lp-row" style={{ width: "100%", background: "none", border: 0, textAlign: "left", cursor: "pointer" }} onClick={() => router.push("/dashboard/settings")}>
          <span style={{ width: 24, textAlign: "center" }}>⚙️</span><div style={{ flex: 1, fontWeight: 800, fontSize: 14, color: "var(--ink)" }}>Account, billing &amp; MCP</div><span style={{ color: "var(--ink-2)", fontWeight: 700 }}>Manage →</span>
        </button>
        <button className="lp-row" style={{ width: "100%", background: "none", border: 0, textAlign: "left", cursor: "pointer" }} onClick={signOut}>
          <span style={{ width: 24, textAlign: "center" }}>↩︎</span><div style={{ flex: 1, fontWeight: 800, fontSize: 14, color: "var(--red)" }}>Sign out</div>
        </button>
      </div>
    </div>
  );
}
