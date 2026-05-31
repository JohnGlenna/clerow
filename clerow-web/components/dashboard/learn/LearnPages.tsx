"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MascotClerow } from "../../Mascot";
import { AiIcon } from "../../ui/AiIcon";
import { PixelXpBar } from "../../ui/PixelXpBar";
import { PixelAreaChart } from "../../ui/PixelAreaChart";
import { useDashboard } from "@/lib/useDashboard";
import { createClient } from "@/lib/supabase/client";
import type { DashboardData, DashboardModel, DashboardPrompt } from "@/lib/types";

const INTENT: Record<string, [string, string]> = {
  solution: ["Solution", "#1CB0F6"],
  compare: ["Compare", "#FF4B4B"],
  problem: ["Problem", "#A560F0"],
  branded: ["Branded", "#38A9E0"],
  custom: ["Custom", "#FFC800"],
};

function LpHead({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="lp-head">
      {eyebrow && <div className="lp-eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
function Stat({ v, l, c }: { v: string; l: string; c?: string }) {
  return <div className="lp-stat"><div className="v" style={c ? { color: c } : undefined}>{v}</div><div className="l">{l}</div></div>;
}
function Lock() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
}

function ModelDots({ models, lit }: { models: DashboardModel[]; lit: boolean }) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {models.map((m) => (
        <span key={m.id} className="mc" title={m.label} style={{ width: 20, height: 20, fontSize: 9, borderRadius: 6, background: lit && !m.locked ? m.swatch : "var(--surface-3)", color: lit && !m.locked ? "#fff" : "var(--ink-4)", marginLeft: 0 }}>{m.letter}</span>
      ))}
    </span>
  );
}

/* ---------------- Prompts ---------------- */
export function DashPrompts({ data, onFix }: { data: DashboardData; onFix: (p: DashboardPrompt) => void }) {
  const { refresh } = useDashboard();
  const models = data.models ?? [];
  const prompts = data.prompts ?? [];
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const addCustom = async () => {
    const q = draft.trim();
    if (!q) return;
    setBusy(true);
    try {
      await fetch("/api/prompts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: q, intent: "solution", volume: "medium" }) });
      setDraft("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const appear = prompts.filter((p) => p.yourPosition != null).length;
  const winning = prompts.filter((p) => (p.yourPosition ?? 99) <= 3).length;
  const invisible = prompts.filter((p) => p.scanned && p.yourPosition == null).length;

  return (
    <div className="ld-page">
      <div className="lp-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="lp-eyebrow">{prompts.length} tracked</div>
          <h1>Prompts</h1>
          <div className="sub">The real questions buyers ask AI — checked across all your models.</div>
        </div>
      </div>

      <div className="lp-add">
        <span className="lp-add-ic">＋</span>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustom()} placeholder="Add a custom prompt — e.g. “best AI tool for X”" />
        <button onClick={addCustom} disabled={!draft.trim() || busy}>{busy ? "Adding…" : "Track it"}</button>
      </div>

      <div className="lp-stats">
        <Stat v={String(prompts.length)} l="Tracked" />
        <Stat v={String(appear)} l="You appear" c="var(--green)" />
        <Stat v={String(winning)} l="Winning" c="var(--blue)" />
        <Stat v={String(invisible)} l="Invisible" c="var(--red)" />
      </div>

      <div className="lp-card">
        {prompts.length === 0 && <div className="lp-row" style={{ color: "var(--ink-2)" }}>No prompts yet — run a scan to discover them.</div>}
        {prompts.map((r: DashboardPrompt) => {
          const [lab, col] = INTENT[r.intent] || INTENT.custom;
          const win = (r.yourPosition ?? 99) <= 1;
          const pos = !r.scanned ? "—" : r.yourPosition != null ? `#${r.yourPosition}` : "✗";
          return (
            <div key={r.id} className="lp-row">
              <span className="lp-tag" style={{ color: col, background: `color-mix(in oklab, ${col} 16%, transparent)` }}>{lab}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="lp-q">&quot;{r.text}&quot;{r.isPrimary && <span className="lp-new" style={{ background: "var(--blue)", color: "#fff" }}>PRIMARY</span>}</div></div>
              <ModelDots models={models} lit={r.scanned} />
              <span className="lp-pos" style={{ background: !r.scanned ? "var(--surface-3)" : r.yourPosition == null ? "var(--red)" : win ? "var(--green)" : "var(--surface-3)", color: r.yourPosition == null && r.scanned ? "#fff" : win ? "#06210a" : "var(--ink)" }}>{pos}</span>
              {win ? <span className="lp-win">Winning</span> : <button className="lp-fix" onClick={() => onFix(r)}>Fix →</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- AI Models ---------------- */
const MAKER: Record<string, string> = { chatgpt: "OpenAI", claude: "Anthropic", perplexity: "Perplexity", grok: "xAI", gemini: "Google" };
const NOTE: Record<string, string> = {
  chatgpt: "Leans on G2, Wikipedia & Reddit. Win it with comparison pages and review-site listings.",
  claude: "Cites primary sources and rewards depth. Beef up your docs, changelog and FAQs.",
  perplexity: "Most live-web driven. Reddit threads & YouTube mentions move you here fastest.",
  grok: "Pulls heavily from X in real time. Posts and replies on X are your fastest lever here.",
  gemini: "Mirrors Google — your classic SEO basics carry straight over.",
};
export function DashModels({ data, onLearn }: { data: DashboardData; onLearn: () => void }) {
  const router = useRouter();
  const models = data.models ?? [];
  const tracked = models.filter((m) => !m.locked).length;
  return (
    <div className="ld-page">
      <LpHead eyebrow={`${tracked} of ${models.length} tracked`} title="AI Models" sub="Each model cites differently. This is why Clerow watches all of them — one chatbot can't." />
      <div className="lm-grid">
        {models.map((m) => (
          <div key={m.id} className={`lm-card ${m.locked ? "locked" : ""}`}>
            <div className="lm-top">
              <span className="lm-ic" style={{ background: "#fff" }}><AiIcon id={m.id} size={24} letter={m.letter} /></span>
              <div style={{ flex: 1 }}><div className="lm-name">{m.label}</div><div className="lm-maker">by {MAKER[m.id] ?? "—"}</div></div>
              {m.locked ? <span className="lm-lock"><Lock /> Upgrade</span> : <span className="lm-live">● live</span>}
            </div>
            {!m.locked && (
              <div className="lm-stats">
                <div><span className="ls-l">Visibility</span><span className="ls-v">{m.visibility != null ? `${m.visibility}%` : "—"}</span></div>
                <div><span className="ls-l">Avg pos.</span><span className="ls-v">{m.position != null ? `#${m.position}` : "—"}</span></div>
                <div><span className="ls-l">Sentiment</span><span className="ls-v">{m.sentiment != null ? m.sentiment : "—"}</span></div>
              </div>
            )}
            <div className="lm-note"><b>📚 How it sources:</b> {NOTE[m.id] ?? "Tracked across your scans."}</div>
            {m.locked ? <button className="lm-btn lm-btn--up" onClick={() => router.push("/dashboard/settings")}>Unlock</button> : <button className="lm-btn" onClick={onLearn}>See fixes for {m.label} →</button>}
          </div>
        ))}
        <div className="lm-card lm-why">
          <div className="mcp-tag" style={{ background: "rgba(56,169,224,.18)", color: "#bfe0f0" }}>Secret sauce</div>
          <h4>One chatbot can&apos;t watch its rivals.</h4>
          <p>Ask Claude how you rank and it only knows itself. Clerow runs every prompt through all your engines and shows the full picture — that&apos;s the moat.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Leaderboard ---------------- */
export function DashLeaderboard({ data }: { data: DashboardData }) {
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

/* ---------------- Profile ---------------- */
export function DashProfile({ data }: { data: DashboardData }) {
  const router = useRouter();
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
function Pf({ n, l }: { n: string; l: string }) {
  return <div><div style={{ fontWeight: 900, fontSize: 18 }}>{n}</div><div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-3)" }}>{l}</div></div>;
}
