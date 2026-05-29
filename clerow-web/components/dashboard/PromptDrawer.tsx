"use client";

import React from "react";
import { Icon } from "../Icon";
import { GameIcon } from "../GameIcon";
import { stepMeta, type GeoStep } from "@/lib/geoSteps";
import type { PromptDetail, PromptEngineResult } from "@/lib/types";

const INTENTS: Record<string, { l: string; c: string }> = {
  problem: { l: "Problem-aware", c: "#7C3AED" },
  solution: { l: "Solution-aware", c: "#1CB0F6" },
  branded: { l: "Branded", c: "#F59E0B" },
  compare: { l: "Comparison", c: "#E11D48" },
};

const IMPACT_COLOR: Record<GeoStep["impact"], string> = {
  low: "#A8A8A8",
  medium: "#1CB0F6",
  high: "#F59E0B",
  "very high": "#E11D48",
};

// Slide-out for a single prompt: where you rank across each AI model, who beats
// you, the sources those models cited, and the concrete GEO steps to win it.
export function PromptDrawer({
  promptId,
  onClose,
  onChanged,
}: {
  promptId: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [detail, setDetail] = React.useState<PromptDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [scanning, setScanning] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [added, setAdded] = React.useState<Set<string>>(new Set());

  const load = React.useCallback(async () => {
    const res = await fetch(`/api/prompts/${promptId}`, { cache: "no-store" });
    if (res.ok) setDetail(await res.json());
    setLoading(false);
  }, [promptId]);

  React.useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Close on Escape.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const runScan = async () => {
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch(`/api/prompts/${promptId}`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Scan failed");
      setDetail(json);
      onChanged?.();
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const addQuest = async (step: GeoStep) => {
    setAdded((prev) => new Set(prev).add(step.id)); // optimistic
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: step.title,
          meta: stepMeta(step),
          xp: step.xp,
          impact: step.impact,
          source: "prompt",
        }),
      });
      if (!res.ok) throw new Error();
      onChanged?.();
    } catch {
      setAdded((prev) => {
        const next = new Set(prev);
        next.delete(step.id);
        return next;
      });
    }
  };

  const intent = detail ? INTENTS[detail.intent] ?? INTENTS.solution : INTENTS.solution;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="drawer-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={16} />
        </button>

        {loading ? (
          <div className="drawer-loading">Loading prompt…</div>
        ) : !detail ? (
          <div className="drawer-loading">Couldn&apos;t load this prompt.</div>
        ) : (
          <>
            <div className="drawer-head">
              <div className="drawer-tags">
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
                <span className={`vol vol--${detail.volume}`}>{detail.volume} volume</span>
                {detail.isPrimary && <span className="ex-you">PRIMARY</span>}
              </div>
              <h2 className="drawer-prompt">&ldquo;{detail.text}&rdquo;</h2>
              <p className="drawer-sub">
                What real buyers ask AI — here&apos;s where you stand and exactly how to win it.
              </p>
            </div>

            {/* Per-engine standing */}
            <section className="drawer-section">
              <h3 className="drawer-h3">
                <GameIcon name="brain" size={16} /> Where you rank, by model
              </h3>
              <div className="drawer-engines">
                {detail.engines.map((e) => (
                  <EngineStanding key={e.engine} e={e} />
                ))}
              </div>
              <div className="drawer-scan-row">
                <button className="btn btn--primary btn--sm" onClick={runScan} disabled={scanning}>
                  <Icon name="bolt" size={13} />
                  {scanning
                    ? "Scanning all models…"
                    : detail.scanned
                      ? "Re-scan across all models"
                      : "Scan this prompt across all models"}
                </button>
                {scanError && <span className="drawer-scan-error">{scanError}</span>}
              </div>
            </section>

            {/* Competitors winning it */}
            {detail.competitorsAhead.length > 0 && (
              <section className="drawer-section">
                <h3 className="drawer-h3">
                  <GameIcon name="boxing" size={16} /> Who&apos;s winning this prompt
                </h3>
                <p className="drawer-note">
                  AI recommends these ahead of you. Each is a target to study and out-position.
                </p>
                <div className="drawer-chips">
                  {detail.competitorsAhead.map((c) => (
                    <span key={c} className="drawer-rival">
                      {c}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Sources cited */}
            {detail.citedDomains.length > 0 && (
              <section className="drawer-section">
                <h3 className="drawer-h3">
                  <GameIcon name="world" size={16} /> Sources the AI cited
                </h3>
                <p className="drawer-note">
                  These are the pages models read to answer this. Getting cited here is the fastest way in.
                </p>
                <div className="drawer-chips">
                  {detail.citedDomains.map((d) => (
                    <a
                      key={d}
                      className="drawer-source"
                      href={`https://${d}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {d}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* GEO action plan */}
            <section className="drawer-section">
              <h3 className="drawer-h3">
                <GameIcon name="target" size={16} /> Your playbook to win this prompt
              </h3>
              <div className="drawer-steps">
                {detail.steps.map((s) => {
                  const isAdded = added.has(s.id);
                  return (
                    <div key={s.id} className="drawer-step">
                      <div className="drawer-step-main">
                        <div className="drawer-step-title">{s.title}</div>
                        <div className="drawer-step-detail">{s.detail}</div>
                        <div className="drawer-step-meta">
                          <span
                            className="qd-impact"
                            style={{
                              background: `color-mix(in oklab, ${IMPACT_COLOR[s.impact]} 18%, white)`,
                              color: IMPACT_COLOR[s.impact],
                            }}
                          >
                            {s.impact}
                          </span>
                          <span className="drawer-step-xp">+{s.xp} XP</span>
                        </div>
                      </div>
                      <button
                        className={`btn btn--sm ${isAdded ? "btn--ghost" : "btn--primary"}`}
                        onClick={() => addQuest(s)}
                        disabled={isAdded}
                      >
                        {isAdded ? "Added ✓" : "Add as quest"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}

function EngineStanding({ e }: { e: PromptEngineResult }) {
  return (
    <div className={`drawer-engine ${e.scannedAt ? "" : "is-idle"}`}>
      <span className="drawer-engine-id">
        <span className="model-icon" style={{ background: e.swatch }}>
          {e.letter}
        </span>
        {e.label}
      </span>
      {!e.enabled ? (
        <span className="drawer-engine-stat is-locked">
          <GameIcon name="locked" size={12} /> No key
        </span>
      ) : e.scannedAt ? (
        <span className="drawer-engine-stat">
          <b className="pos-pill">{e.yourPosition != null ? `#${e.yourPosition}` : "Absent"}</b>
          <span>{e.yourVisibility}% vis</span>
        </span>
      ) : (
        <span className="drawer-engine-stat is-idle">Not scanned</span>
      )}
    </div>
  );
}
