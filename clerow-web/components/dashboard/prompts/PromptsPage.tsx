"use client";

import React from "react";
import { useDashboard } from "@/lib/useDashboard";
import { useOverlay } from "../shell/OverlayProvider";
import { INTENT, Stat, ModelDots } from "../shared/PageBits";
import type { DashboardPrompt } from "@/lib/types";

// The real questions buyers ask AI, checked across every model. "Fix" opens the
// task modal with a prompt-specific lesson.
export function PromptsPage() {
  const { data, refresh } = useDashboard();
  const { openTask } = useOverlay();
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const models = data?.models ?? [];
  const prompts = data?.prompts ?? [];

  const onFix = (p: DashboardPrompt) =>
    openTask({
      kind: "task",
      id: null,
      promptId: p.id,
      crumb: "Win the queries",
      title: `Win the query: "${p.text}"`,
      why: "Ship a focused page that answers this query and names you as a top option, then get it cited — Clerow generates the draft for you.",
      xp: 60,
    });

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

  if (!data) return <div className="ld-page" style={{ color: "var(--ink-2)" }}>Loading…</div>;

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
