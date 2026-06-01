"use client";

// Shared real-time scan progress. Renders the orbit spinner, an optional
// pre-phase checklist (onboarding: reading / discovering), and a live row per AI
// model that ticks queued → querying → reading → result as the scan streams in.
// Used by both onboarding (one model) and the dashboard re-scan (N models).

import React from "react";
import { ENGINE_META } from "@/lib/engines";
import type { EngineProgress, PromptProgress } from "@/lib/useScanStream";
import { MascotClerow } from "../Mascot";

export type ScanStep = { label: string; state: "pending" | "active" | "done" };

export function ScanProgress({
  steps,
  engines,
  prompts,
  elapsedMs,
  showOrbit = true,
}: {
  steps?: ScanStep[];
  engines: EngineProgress[];
  // When supplied with more than one group, render a section per prompt (the
  // per-level scan). Otherwise fall back to the flat `engines` list.
  prompts?: PromptProgress[];
  elapsedMs: number;
  showOrbit?: boolean;
}) {
  const secs = Math.max(0, Math.floor(elapsedMs / 1000));
  const grouped = (prompts ?? []).filter((p) => p.text);
  const multi = grouped.length > 1;
  return (
    <div className="scanning">
      {showOrbit && (
        <div className="scan-orbit" aria-hidden="true">
          <div className="spin1"><span className="dot" /></div>
          <div className="spin2"><span className="dot d2" /></div>
          <div className="ring" />
          <div className="ring r2" />
          <div className="center"><MascotClerow size={64} float /></div>
        </div>
      )}

      {steps && steps.length > 0 && (
        <div className="scan-tasks">
          {steps.map((s, i) => (
            <div key={i} className={`scan-task ${s.state}`}>
              <span className="tick">{s.state === "done" ? "✓" : s.state === "active" ? "•" : ""}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {multi ? (
        grouped
          .sort((a, b) => a.index - b.index)
          .map((p) => (
            <div key={p.promptId} className="scan-prompt">
              <div className="scan-prompt-q">“{p.text}”</div>
              <div className="scan-models">
                {p.engines.map((e) => (
                  <ModelRow key={e.engine} e={e} />
                ))}
              </div>
            </div>
          ))
      ) : (
        engines.length > 0 && (
          <div className="scan-models">
            {engines.map((e) => (
              <ModelRow key={e.engine} e={e} />
            ))}
          </div>
        )
      )}

      {(engines.length > 0 || multi) && (
        <div className="scan-elapsed" aria-live="polite">
          Scanning… {secs}s
        </div>
      )}
    </div>
  );
}

function ModelRow({ e }: { e: EngineProgress }) {
  const meta = ENGINE_META[e.engine];
  const mentioned = e.position != null || (e.visibility ?? 0) > 0;
  const stateClass =
    e.status === "failed" ? "failed" : e.status === "done" ? (mentioned ? "done" : "warn") : "active";

  const text =
    e.status === "queued"
      ? "Queued…"
      : e.status === "querying"
        ? "Querying the model…"
        : e.status === "detecting"
          ? "Reading the answer…"
          : e.status === "failed"
            ? "Couldn’t reach this model"
            : e.position != null
              ? `Found you at #${e.position}`
              : (e.visibility ?? 0) > 0
                ? `Mentioned · ${e.visibility}% visibility`
                : "Not mentioned yet";

  const mark = e.status === "failed" ? "✕" : e.status === "done" ? (mentioned ? "✓" : "⚠") : null;

  return (
    <div className={`scan-model ${stateClass}`}>
      <span className="sm-swatch" style={{ background: meta.swatch }}>
        {meta.letter}
      </span>
      <span className="sm-label">{e.label}</span>
      <span className="sm-status">{text}</span>
      <span className="sm-mark">{mark ?? <span className="sm-dot" aria-hidden="true" />}</span>
    </div>
  );
}
