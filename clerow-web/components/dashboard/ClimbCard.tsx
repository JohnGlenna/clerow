"use client";

import React from "react";
import { Icon } from "../Icon";
import { GameIcon } from "../GameIcon";
import { playCheck } from "@/lib/sound";
import type { Ladder, LadderTask } from "@/lib/types";

// "The Climb" — the dashboard hero. Shows the whole 5-level path (done / active /
// locked) and the ACTIVE level's checklist only, so the user always sees one
// clear next thing instead of a flood. Completing the last task of a level
// advances the climb on the next refresh.
export function ClimbCard({
  ladder,
  onNavigate,
  onChanged,
  onRescan,
}: {
  ladder: Ladder;
  onNavigate: (k: string) => void;
  onChanged?: () => void;
  onRescan: () => void;
}) {
  const active = ladder.levels.find((l) => l.state === "active") ?? null;
  const isRescanLevel = !!active && active.level === ladder.levels.length;

  const [local, setLocal] = React.useState<LadderTask[]>(active?.tasks ?? []);
  React.useEffect(() => setLocal(active?.tasks ?? []), [active]);

  const toggle = async (i: number) => {
    const t = local[i];
    if (!t.id) return; // not yet persisted — shouldn't happen for active tasks
    const next = !t.done;
    if (next) playCheck();
    setLocal((prev) => prev.map((x, j) => (j === i ? { ...x, done: next } : x)));
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: t.id, done: next }),
      });
      if (!res.ok) throw new Error("save failed");
      onChanged?.();
    } catch {
      setLocal((prev) => prev.map((x, j) => (j === i ? { ...x, done: t.done } : x)));
    }
  };

  const doneCount = local.filter((t) => t.done).length;
  const earned = local.filter((t) => t.done).reduce((s, t) => s + t.xp, 0);

  return (
    <div className="app-card climb">
      <div className="app-card-head">
        <h4>
          <span className="climb-title-ico"><GameIcon name="mountain" size={18} /></span> The Climb
        </h4>
        <span className="sub">
          Level {ladder.currentLevel} of {ladder.levels.length}
          {active ? ` · ${active.title}` : " · Complete 🎉"}
        </span>
      </div>

      {/* The path: every level as a node, so progress is always visible. */}
      <div className="climb-path">
        {ladder.levels.map((l) => (
          <div key={l.level} className={`climb-node ${l.state}`}>
            <span className="climb-badge">
              {l.state === "done" ? (
                <Icon name="check" size={13} />
              ) : l.state === "locked" ? (
                <Icon name="lock" size={12} />
              ) : (
                l.level
              )}
            </span>
            <div className="climb-node-main">
              <div className="climb-node-title">
                Level {l.level} · {l.title}
              </div>
              <div className="climb-node-sub">
                {l.state === "done"
                  ? "Complete"
                  : l.state === "locked"
                    ? `${l.total} task${l.total === 1 ? "" : "s"} — locked`
                    : l.blurb}
              </div>
            </div>
            {l.total > 0 && (
              <span className="climb-node-prog">
                {l.doneCount}/{l.total}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* The active level's tasks — the one thing to do now. */}
      {active && !isRescanLevel && (
        <div className="climb-active">
          <div className="climb-active-head">
            <b>
              Level {active.level}: {active.title}
            </b>
            <span>
              {doneCount}/{local.length} done · <b style={{ color: "var(--accent-2)" }}>+{earned} XP</b>
            </span>
          </div>
          <div className="task-list">
            {local.map((t, i) => (
              <div key={t.key} className={`task ${t.done ? "done" : ""}`}>
                <span className="tickbox" onClick={() => toggle(i)}>
                  {t.done && <Icon name="check" size={12} />}
                </span>
                <div>
                  <div className="title">{t.title}</div>
                  <div className="meta">{t.meta}</div>
                </div>
                <span className="xp">+{t.xp} XP</span>
              </div>
            ))}
          </div>
          <button className="btn btn--ghost btn--sm" style={{ alignSelf: "flex-start" }} onClick={() => onNavigate("quests")}>
            See the full climb →
          </button>
        </div>
      )}

      {/* Final level (or all complete): the re-scan that regenerates the ladder. */}
      {(isRescanLevel || !active) && (
        <div className="climb-rescan">
          <div>
            <b>{active ? "You've reached the summit of this climb." : "Every level complete — incredible."}</b>
            <p>Re-scan to measure how far you&apos;ve moved in AI search, and unlock your next climb.</p>
          </div>
          <button className="btn btn--primary btn--sm" onClick={onRescan}>
            <Icon name="bolt" size={14} /> Re-scan now
          </button>
        </div>
      )}
    </div>
  );
}
