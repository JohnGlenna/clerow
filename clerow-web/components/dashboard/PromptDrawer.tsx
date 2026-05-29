"use client";

import React from "react";
import { Icon } from "../Icon";
import { GameIcon } from "../GameIcon";
import { stepMeta, type GeoStep } from "@/lib/geoSteps";
import type { EngineId } from "@/lib/engines";
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

// Steps that aren't a content task (e.g. "re-scan to track movement") don't get
// a "Make content" button — there's nothing to write for them.
const isContentStep = (s: GeoStep) => !s.id.startsWith("rescan");

// Centered modal for a single prompt: where you rank across each AI model, who
// beats you, the sources those models cited, and the concrete GEO steps to win
// it — each with one-click "make content" generation.
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
  const [scanningEngine, setScanningEngine] = React.useState<EngineId | null>(null);
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

  // Scan all models, or a single model when `engine` is given.
  const runScan = async (engine?: EngineId) => {
    if (engine) setScanningEngine(engine);
    else setScanning(true);
    setScanError(null);
    try {
      const res = await fetch(`/api/prompts/${promptId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(engine ? { engine } : {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Scan failed");
      setDetail(json);
      onChanged?.();
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
      setScanningEngine(null);
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
                  <EngineStanding
                    key={e.engine}
                    e={e}
                    scanning={scanningEngine === e.engine}
                    busy={scanning || scanningEngine != null}
                    onScan={() => runScan(e.engine as EngineId)}
                  />
                ))}
              </div>
              <div className="drawer-scan-row">
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => runScan()}
                  disabled={scanning || scanningEngine != null}
                >
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

            {/* GEO action plan — the punch list */}
            <section className="drawer-section drawer-playbook">
              <h3 className="drawer-h3">
                <GameIcon name="target" size={16} /> Your playbook to win this prompt
              </h3>
              <p className="drawer-playbook-lead">
                Each fix is one concrete action. Hit <b>Make content</b> and we write it for you — ship it,
                add it as a quest, earn XP, keep the streak.
              </p>
              <div className="drawer-steps">
                {detail.steps.map((s) => (
                  <PlaybookStep
                    key={s.id}
                    promptId={promptId}
                    step={s}
                    added={added.has(s.id)}
                    onAddQuest={() => addQuest(s)}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}

function PlaybookStep({
  promptId,
  step,
  added,
  onAddQuest,
}: {
  promptId: string;
  step: GeoStep;
  added: boolean;
  onAddQuest: () => void;
}) {
  const [generating, setGenerating] = React.useState(false);
  const [content, setContent] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const makeContent = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/prompts/${promptId}/content`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stepId: step.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't generate content");
      setContent(json.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate content");
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  return (
    <div className="drawer-step">
      <div className="drawer-step-row">
        <div className="drawer-step-main">
          <div className="drawer-step-title">{step.title}</div>
          <div className="drawer-step-detail">{step.detail}</div>
          <div className="drawer-step-meta">
            <span
              className="qd-impact"
              style={{
                background: `color-mix(in oklab, ${IMPACT_COLOR[step.impact]} 18%, white)`,
                color: IMPACT_COLOR[step.impact],
              }}
            >
              {step.impact}
            </span>
            <span className="drawer-step-xp">+{step.xp} XP</span>
          </div>
        </div>
        <div className="drawer-step-actions">
          {isContentStep(step) && (
            <button
              className="btn btn--primary btn--sm"
              onClick={makeContent}
              disabled={generating}
            >
              <GameIcon name="sparkles" size={13} />
              {generating ? "Writing…" : content ? "Regenerate" : "Make content"}
            </button>
          )}
          <button
            className={`btn btn--sm ${added ? "btn--ghost" : "btn--quiet"}`}
            onClick={onAddQuest}
            disabled={added}
          >
            {added ? "Added ✓" : "Add as quest"}
          </button>
        </div>
      </div>

      {error && <div className="drawer-step-error">{error}</div>}

      {content && (
        <div className="drawer-step-content">
          <div className="drawer-step-content-bar">
            <span className="drawer-step-content-label">
              <GameIcon name="sparkles" size={12} /> Generated — copy &amp; ship it
            </span>
            <button className="btn btn--quiet btn--sm" onClick={copy}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <pre>{content}</pre>
        </div>
      )}
    </div>
  );
}

function EngineStanding({
  e,
  scanning,
  busy,
  onScan,
}: {
  e: PromptEngineResult;
  scanning: boolean;
  busy: boolean;
  onScan: () => void;
}) {
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
        <button
          className="btn btn--ghost btn--sm drawer-engine-scan"
          onClick={onScan}
          disabled={busy}
        >
          <Icon name="bolt" size={12} />
          {scanning ? "Scanning…" : "Scan"}
        </button>
      )}
    </div>
  );
}
