"use client";

import React from "react";
import { useDashboard } from "@/lib/useDashboard";
import { playCheck } from "@/lib/sound";

// The 90-day plan overlay on the Climb: "Day N of 90", a phase track with the
// 30/60/90 checkpoints, and a one-time milestone celebration when the user
// finishes a phase. Data comes from data.journey (lib/journey.ts); the milestone
// is guarded per-brand in localStorage so it celebrates once, not every load.
export function JourneyCard() {
  const { data } = useDashboard();
  const journey = data?.journey;
  const brandKey = data?.brand?.url ?? "";
  const [celebrate, setCelebrate] = React.useState<string | null>(null);

  // Fire a celebration the first time a new phase completes (or the plan does).
  React.useEffect(() => {
    if (!journey || !brandKey || typeof window === "undefined") return;
    const doneCount = journey.phases.filter((p) => p.state === "done").length;
    const key = `clerow_journey_${brandKey}`;
    const seen = Number(window.localStorage.getItem(key) ?? "0");
    if (doneCount > seen) {
      const justDone = journey.phases.filter((p) => p.state === "done").slice(-1)[0];
      setCelebrate(journey.complete && doneCount === journey.phases.length ? "plan" : (justDone?.label ?? null));
      try { window.localStorage.setItem(key, String(doneCount)); } catch {}
      playCheck();
    }
  }, [journey, brandKey]);

  if (!journey) return null;

  const dayLabel = journey.complete ? `Day ${journey.totalDays}+ of ${journey.totalDays}` : `Day ${journey.dayNumber} of ${journey.totalDays}`;
  const active = journey.phases[journey.currentPhase];

  return (
    <div className="jy-wrap">
      {celebrate && (
        <div className="jy-celebrate" role="status">
          <span className="jy-celebrate-ic">🎉</span>
          <span>
            {celebrate === "plan"
              ? "You finished your 90-day plan — every phase complete. Keep your streak and keep climbing."
              : <>Phase complete: <b>{celebrate}</b>. On to the next 30 days.</>}
          </span>
          <button className="jy-celebrate-x" onClick={() => setCelebrate(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      <div className="jy-head">
        <div className="jy-eyebrow">🗺️ Your 90-day plan</div>
        <div className="jy-day">{dayLabel}{!journey.complete && <span className="jy-day-left"> · {journey.daysLeft} days left</span>}</div>
      </div>

      <div className="jy-track">
        <div className="jy-track-fill" style={{ width: `${journey.pct}%` }} />
        {journey.phases.map((p) => (
          <div key={p.index} className={`jy-cp ${p.reached ? "is-reached" : ""}`} style={{ left: `${(p.checkpointDay / journey.totalDays) * 100}%` }} title={`Day ${p.checkpointDay}`}>
            <span className="jy-cp-dot" />
            <span className="jy-cp-day">{p.checkpointDay}</span>
          </div>
        ))}
      </div>

      <div className="jy-phases">
        {journey.phases.map((p) => (
          <div key={p.index} className={`jy-phase is-${p.state}`}>
            <div className="jy-phase-h">
              <span className="jy-phase-mark">{p.state === "done" ? "✓" : p.state === "active" ? "◉" : "○"}</span>
              <span className="jy-phase-label">{p.label}</span>
              <span className="jy-phase-count">{p.levelsDone}/{p.levelsTotal}</span>
            </div>
            <p className="jy-phase-blurb">{p.blurb}</p>
          </div>
        ))}
      </div>

      {active && (
        <div className="jy-now">
          You&apos;re in <b>Phase {active.index + 1} · {active.label}</b> — {active.levelsTotal - active.levelsDone} {active.levelsTotal - active.levelsDone === 1 ? "level" : "levels"} to your day-{active.checkpointDay} checkpoint.
        </div>
      )}
    </div>
  );
}
