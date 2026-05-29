"use client";

import React from "react";
import { Icon } from "../Icon";
import { GameIcon } from "../GameIcon";
import { PageHead, PageStat } from "./AppShell";
import { PromptDrawer } from "./PromptDrawer";
import { useDashboard } from "@/lib/useDashboard";
import type { DashboardPrompt } from "@/lib/types";
import type { SuggestedPrompt } from "@/app/api/prompts/suggest/route";

const INTENTS: Record<string, { l: string; c: string }> = {
  problem: { l: "Problem-aware", c: "#7C3AED" },
  solution: { l: "Solution-aware", c: "#1CB0F6" },
  branded: { l: "Branded", c: "#F59E0B" },
  compare: { l: "Comparison", c: "#E11D48" },
};

// Engine letters/colors shown as the "Models" column dots. Matches ENGINE_META.
const MODEL_DOTS = [
  { k: "C", bg: "#10A37F" },
  { k: "A", bg: "#D97706" },
  { k: "P", bg: "#1CB0F6" },
  { k: "G", bg: "#4285F4" },
];

export function PagePrompts() {
  const [tab, setTab] = React.useState<"tracked" | "suggested">("tracked");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<SuggestedPrompt[] | null>(null);
  const { data, loading, refresh } = useDashboard();

  const prompts = data?.prompts ?? [];
  const scanned = prompts.filter((p) => p.scanned).length;
  const position = data?.score?.position ?? null;

  // Load suggestions once (used by the stat tile and the suggested tab).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/prompts/suggest", { cache: "no-store" });
      const json = await res.json().catch(() => ({ suggestions: [] }));
      if (!cancelled) setSuggestions(json.suggestions ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const exportCsv = () => {
    const rows = [
      ["Prompt", "Intent", "Volume", "Primary", "Scanned"],
      ...prompts.map((p) => [p.text, p.intent, p.volume, p.isPrimary ? "yes" : "no", p.scanned ? "yes" : "no"]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "clerow-prompts.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHead
        title="Prompts"
        sub="The real questions buyers ask AI. Click any prompt to see where you rank and exactly how to win it."
        actions={
          <>
            <button className="btn btn--ghost btn--sm" onClick={exportCsv} disabled={!prompts.length}>
              <Icon name="download" size={14} />
              Export CSV
            </button>
          </>
        }
      />

      <div className="page-stats">
        <PageStat label="Tracked prompts" value={String(prompts.length)} sub="discovered for you" />
        <PageStat label="Scanned" value={String(scanned)} sub="have live results" hi="success" />
        <PageStat
          label="Your best position"
          value={position != null ? `#${position}` : "—"}
          sub="on your primary prompt"
          hi={position != null && position <= 3 ? "success" : "warn"}
        />
        <PageStat
          label="New ideas"
          value={suggestions == null ? "…" : String(suggestions.length)}
          sub="prompts to add"
          hi="accent"
        />
      </div>

      <div className="page-tabs">
        <button className={tab === "tracked" ? "on" : ""} onClick={() => setTab("tracked")}>
          Tracked <span className="cnt">{prompts.length}</span>
        </button>
        <button className={tab === "suggested" ? "on" : ""} onClick={() => setTab("suggested")}>
          AI-suggested <span className="cnt">{suggestions?.length ?? 0}</span>
        </button>
      </div>

      {tab === "tracked" ? (
        <PromptsTracked prompts={prompts} loading={loading} onOpen={setSelectedId} />
      ) : (
        <PromptsSuggested
          suggestions={suggestions}
          onTracked={() => {
            setSuggestions((s) => s); // no-op; refresh below repopulates tracked list
            refresh();
          }}
          onRemove={(text) => setSuggestions((s) => (s ?? []).filter((x) => x.text !== text))}
        />
      )}

      {selectedId && (
        <PromptDrawer promptId={selectedId} onClose={() => setSelectedId(null)} onChanged={refresh} />
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
  onOpen,
}: {
  prompts: DashboardPrompt[];
  loading: boolean;
  onOpen: (id: string) => void;
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
          <span style={{ flex: 0.4, textAlign: "center" }}>Scan</span>
          <span style={{ flex: 1.0, textAlign: "right" }}>Action</span>
        </div>
        {prompts.map((r) => {
          const intent = INTENTS[r.intent] ?? INTENTS.solution;
          return (
            <div
              key={r.id}
              className={`dt-row dt-row--click ${r.scanned ? "" : "dt-row--invisible"}`}
              onClick={() => onOpen(r.id)}
            >
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
                {MODEL_DOTS.map((m) => (
                  <ModelDot key={m.k} lit={r.scanned} bg={m.bg} k={m.k} />
                ))}
              </span>
              <span style={{ flex: 0.4, textAlign: "center" }} className="dt-pos">
                {r.scanned ? "✓" : "—"}
              </span>
              <span style={{ flex: 1.0, textAlign: "right" }}>
                <button className="btn-quest" onClick={(e) => { e.stopPropagation(); onOpen(r.id); }}>
                  {r.scanned ? "View" : "Unlock"} <b>↗</b>
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PromptsSuggested({
  suggestions,
  onTracked,
  onRemove,
}: {
  suggestions: SuggestedPrompt[] | null;
  onTracked: () => void;
  onRemove: (text: string) => void;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);

  const track = async (s: SuggestedPrompt) => {
    setBusy(s.text);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: s.text, intent: s.intent, volume: s.volume }),
      });
      if (res.ok) {
        onRemove(s.text);
        onTracked();
      }
    } finally {
      setBusy(null);
    }
  };

  if (suggestions == null) {
    return <div className="app-card" style={{ padding: 24 }}>Finding new prompts to track…</div>;
  }
  if (suggestions.length === 0) {
    return (
      <div className="app-card" style={{ padding: 24, textAlign: "center" }}>
        You&apos;re already tracking every prompt we&apos;d suggest. Re-scan to discover more.
      </div>
    );
  }

  return (
    <>
      <div className="callout">
        <span className="callout-ico"><GameIcon name="sparkles" size={20} color="#F59E0B" /></span>
        <div>
          <b>Expand your coverage.</b>
          <span> These are real buyer queries in your category you aren&apos;t tracking yet. Add one to scan it.</span>
        </div>
      </div>

      <div className="suggest-grid">
        {suggestions.map((s) => {
          const it = INTENTS[s.intent] ?? INTENTS.solution;
          return (
            <div key={s.text} className="suggest-card">
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
                <span className={`vol vol--${s.volume}`}>{s.volume}</span>
              </div>
              <div className="suggest-prompt">&ldquo;{s.text}&rdquo;</div>
              <div className="suggest-why">{s.why}</div>
              <div className="suggest-foot">
                <span className="suggest-xp">+{s.xp} XP on track</span>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => track(s)}
                  disabled={busy === s.text}
                >
                  {busy === s.text ? "Adding…" : "Track"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
