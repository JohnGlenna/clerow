"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { PageHead, PageStat } from "./AppShell";
import { useDashboard } from "@/lib/useDashboard";
import type { DashboardPrompt } from "@/lib/types";

const INTENTS: Record<string, { l: string; c: string }> = {
  problem: { l: "Problem-aware", c: "#7C3AED" },
  solution: { l: "Solution-aware", c: "#1CB0F6" },
  branded: { l: "Branded", c: "#F59E0B" },
  compare: { l: "Comparison", c: "#E11D48" },
};

export function PagePrompts() {
  const router = useRouter();
  const [tab, setTab] = React.useState<"tracked" | "suggested">("tracked");
  const navigate = (k: string) => router.push(`/dashboard/${k}`);
  const { data, loading } = useDashboard();

  const prompts = data?.prompts ?? [];
  const scanned = prompts.filter((p) => p.scanned).length;
  const position = data?.score?.position ?? null;

  return (
    <>
      <PageHead
        title="Prompts"
        sub="The queries we run against AI models to see how you show up."
        actions={
          <>
            <button className="btn btn--ghost btn--sm">
              <Icon name="download" size={14} />
              Export CSV
            </button>
            <button className="btn btn--primary btn--sm" onClick={() => router.push("/onboarding")}>
              <Icon name="bolt" size={14} />
              Re-scan
            </button>
          </>
        }
      />

      <div className="page-stats">
        <PageStat label="Discovered" value={String(prompts.length)} sub="prompts" />
        <PageStat label="Scanned (free)" value={String(scanned)} sub="primary prompt" hi="success" />
        <PageStat label="Your position" value={position != null ? `#${position}` : "—"} sub="in scanned prompt" hi={position != null && position <= 3 ? "success" : "warn"} />
        <PageStat label="Locked" value={String(Math.max(0, prompts.length - scanned))} sub="upgrade to scan all" hi="danger" />
      </div>

      <div className="page-tabs">
        <button className={tab === "tracked" ? "on" : ""} onClick={() => setTab("tracked")}>
          Tracked <span className="cnt">{prompts.length}</span>
        </button>
        <button className={tab === "suggested" ? "on" : ""} onClick={() => setTab("suggested")}>
          AI-suggested <span className="cnt">8</span>
        </button>
      </div>

      {tab === "tracked" ? (
        <PromptsTracked prompts={prompts} loading={loading} onNavigate={navigate} />
      ) : (
        <PromptsSuggested />
      )}
    </>
  );
}

function ModelDot({ lit, bg, k }: { lit: boolean; bg: string; k: string }) {
  return (
    <span className={`model-dot ${lit ? "lit" : ""}`} style={{ background: lit ? bg : undefined }} title={k}>
      {k}
    </span>
  );
}

function PromptsTracked({
  prompts,
  loading,
  onNavigate,
}: {
  prompts: DashboardPrompt[];
  loading: boolean;
  onNavigate: (k: string) => void;
}) {
  if (loading) {
    return <div className="app-card" style={{ padding: 24 }}>Loading prompts…</div>;
  }
  if (prompts.length === 0) {
    return (
      <div className="app-card" style={{ padding: 24, textAlign: "center" }}>
        No prompts yet — run your first scan to discover them.
      </div>
    );
  }

  return (
    <div className="app-card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="data-table">
        <div className="dt-head">
          <span style={{ flex: 2.5 }}>Prompt</span>
          <span style={{ flex: 0.9 }}>Intent</span>
          <span style={{ flex: 1.1, justifyContent: "center", display: "flex" }}>Models</span>
          <span style={{ flex: 0.4, textAlign: "center" }}>Pos.</span>
          <span style={{ flex: 1.0, textAlign: "right" }}>Action</span>
        </div>
        {prompts.map((r) => {
          const intent = INTENTS[r.intent] ?? INTENTS.solution;
          return (
            <div key={r.id} className={`dt-row ${r.scanned ? "" : "dt-row--invisible"}`}>
              <span style={{ flex: 2.5 }} className="dt-prompt">
                {r.text}
                {r.isPrimary && <span className="ex-you" style={{ marginLeft: 8 }}>PRIMARY</span>}
              </span>
              <span style={{ flex: 0.9 }}>
                <span
                  className="intent-tag"
                  style={{
                    background: `color-mix(in oklab, ${intent.c} 14%, white)`,
                    color: intent.c,
                    border: `1px solid color-mix(in oklab, ${intent.c} 30%, transparent)`,
                  }}
                >
                  {intent.l}
                </span>
              </span>
              <span style={{ flex: 1.1, display: "flex", justifyContent: "center", gap: 4 }}>
                {/* Free scan runs Perplexity only on the primary prompt. */}
                <ModelDot lit={false} bg="#10A37F" k="C" />
                <ModelDot lit={false} bg="#D97706" k="A" />
                <ModelDot lit={r.scanned} bg="#1CB0F6" k="P" />
                <ModelDot lit={false} bg="#4285F4" k="G" />
              </span>
              <span style={{ flex: 0.4, textAlign: "center" }} className="dt-pos">
                {r.scanned ? "✓" : "—"}
              </span>
              <span style={{ flex: 1.0, textAlign: "right" }}>
                {r.scanned ? (
                  <span className="dt-winning">Scanned ✓</span>
                ) : (
                  <button className="btn-quest" onClick={() => onNavigate("models")}>
                    Unlock <b>↑</b>
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PromptsSuggested() {
  const suggested = [
    { p: "best AI-friendly project tools 2026", intent: "solution", vol: "high", why: "Buyers compare AEO-ready tools here.", xp: 60 },
    { p: "issue tracker for remote teams", intent: "solution", vol: "high", why: "High-intent buyer query in your niche.", xp: 60 },
    { p: "alternatives to your top competitor", intent: "compare", vol: "high", why: "You don't appear here yet.", xp: 80 },
    { p: "how to choose the right tool", intent: "problem", vol: "medium", why: "Educational content gap.", xp: 40 },
  ];
  return (
    <>
      <div className="callout">
        <span className="callout-ico">✨</span>
        <div>
          <b>Expand your tracked prompts.</b>
          <span> Upgrade to run every discovered prompt across all four AI models, every day.</span>
        </div>
        <button className="btn btn--primary btn--sm">Upgrade</button>
      </div>

      <div className="suggest-grid">
        {suggested.map((s, i) => {
          const it = INTENTS[s.intent] ?? INTENTS.solution;
          return (
            <div key={i} className="suggest-card">
              <div className="suggest-head">
                <span
                  className="intent-tag"
                  style={{
                    background: `color-mix(in oklab, ${it.c} 14%, white)`,
                    color: it.c,
                    border: `1px solid color-mix(in oklab, ${it.c} 30%, transparent)`,
                  }}
                >
                  {it.l}
                </span>
                <span className={`vol vol--${s.vol}`}>{s.vol}</span>
              </div>
              <div className="suggest-prompt">&ldquo;{s.p}&rdquo;</div>
              <div className="suggest-why">{s.why}</div>
              <div className="suggest-foot">
                <span className="suggest-xp">+{s.xp} XP on track</span>
                <button className="btn btn--ghost btn--sm">Track</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
