"use client";

import { useDashboard } from "@/lib/useDashboard";
import { useOverlay } from "../shell/OverlayProvider";
import type { SheetTask } from "./types";

// "Your next move" — the single highest-leverage fix, surfaced as a hero card
// above the Climb. Source: the first unresolved task in the active ladder level.
export function NextMoveHero() {
  const { data } = useDashboard();
  const { openTask } = useOverlay();

  const lvl = data?.ladder?.levels.find((l) => l.state === "active");
  // Never surface a paywalled task (a churned subscriber can have seeded-but-
  // locked tasks with ids — those are redacted placeholders, not next moves).
  const lt = lvl?.tasks.find((t) => t.id && !t.resolved && !t.locked);
  if (!lvl || !lt) return null;

  const step = lvl.tasks.filter((t) => t.resolved).length + 1;
  // A free user working the taster: the level's remaining tasks are paywalled,
  // so "step 1 of 5" would oversell — frame it as the free preview it is.
  const freePreview = !data?.subscribed && lvl.tasks.some((t) => t.locked);
  const canMcp = lt.channel !== "offsite";
  const effort = lt.minutes ? `~${lt.minutes} min` : (lt.meta.split("·")[0] ?? "").replace(/≈/g, "").trim() || "~5 min";

  const task: SheetTask = { kind: "task", id: lt.id, channel: lt.channel, title: lt.title, why: lt.detail, xp: lt.xp, minutes: lt.minutes, steps: lt.steps, ladderKey: lt.key, crumb: lvl.title };
  const open = () => openTask(task);

  return (
    <div className="nm-wrap">
      <div className="nm-eyebrow"><span className="nm-pulse" /> Your next move</div>
      <div className="nm-card" onClick={open} role="button" tabIndex={0}>
        <div className="nm-body">
          <div className="nm-step">Level {lvl.level} · {lvl.title} · {freePreview ? <span className="nm-free-chip">Free preview</span> : `step ${step} of ${lvl.total}`}</div>
          <h2 className="nm-title">{lt.title}</h2>
          <p className="nm-why">{lt.detail}</p>
          <div className="nm-actions">
            <button className="nm-btn nm-btn--go" onClick={(e) => { e.stopPropagation(); open(); }}>
              <span className="nm-btn-ic">→</span> Do it now
            </button>
            {canMcp && (
              <button className="nm-btn nm-btn--mcp" onClick={(e) => { e.stopPropagation(); openTask({ ...task, kind: "mcp", title: "Let Clerow MCP fix everything", why: "Connect Clerow to Claude Code, Cursor, or any agent. It reads your open quests, ships the fixes as a PR, and Clerow re-checks every model." }); }}>
                🤖 Auto-fix with Clerow MCP
              </button>
            )}
          </div>
        </div>
        <div className="nm-foot">
          <span className="nm-foot-it">⚡ Earns <b>+{lt.xp} XP</b></span>
          <span className="nm-foot-it">🕐 {effort}</span>
          <span className="nm-foot-it">🎯 {canMcp ? "Visible to all 5 models" : "Builds off-site authority"}</span>
        </div>
      </div>
    </div>
  );
}
