"use client";

import React from "react";
import { MascotClerow } from "../../Mascot";
import { LDIcon } from "../shell/LDIcon";
import type { DashboardData, LadderLevel, LadderTask } from "@/lib/types";
import type { SheetTask } from "./types";

function PathNode({ kind, icon, cap, xp, start, mascot, onClick }: {
  kind: string; icon: React.ReactNode; cap: string; xp?: number | null; start?: boolean; mascot?: boolean; onClick?: () => void;
}) {
  return (
    <div className="node-row">
      <div className={`node ${kind}`}>
        {start && <span className="start-bubble">Start</span>}
        <button className="node-btn" onClick={onClick} disabled={!onClick}>{icon}</button>
        {cap && <span className="node-cap">{cap}</span>}
        {xp != null && <span className="node-xp">{kind === "done" ? "✓ earned" : `+${xp} XP`}</span>}
        {mascot && <span className="node-mascot"><MascotClerow size={56} float /></span>}
      </div>
    </div>
  );
}

/* A 2-column grid of nodes with dotted SVG connectors snaking between them. */
function PathGrid({ nodeCount, children }: { nodeCount: number; children: React.ReactNode }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [paths, setPaths] = React.useState<string[]>([]);
  const [dim, setDim] = React.useState({ w: 0, h: 0 });

  React.useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const draw = () => {
      const wr = wrap.getBoundingClientRect();
      const btns = Array.from(wrap.querySelectorAll(".node-btn")).map((b) => {
        const r = (b as HTMLElement).getBoundingClientRect();
        return { l: r.left - wr.left, t: r.top - wr.top, w: r.width, h: r.height,
          cx: r.left - wr.left + r.width / 2, cy: r.top - wr.top + r.height / 2 };
      });
      const out: string[] = [];
      for (let i = 0; i < btns.length - 1; i++) {
        const a = btns[i], b = btns[i + 1];
        const sameRow = Math.abs(a.cy - b.cy) < 24;
        if (sameRow) {
          const lr = a.cx < b.cx ? [a, b] : [b, a];
          out.push(`M ${lr[0].l + lr[0].w + 6} ${a.cy} L ${lr[1].l - 6} ${b.cy}`);
        } else {
          const dy = b.t - (a.t + a.h);
          out.push(`M ${a.cx} ${a.t + a.h + 6} C ${a.cx} ${a.t + a.h + dy * 0.6}, ${b.cx} ${b.t - dy * 0.6}, ${b.cx} ${b.t - 6}`);
        }
      }
      setDim({ w: wr.width, h: wr.height });
      setPaths(out);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    window.addEventListener("resize", draw);
    return () => { ro.disconnect(); window.removeEventListener("resize", draw); };
  }, [nodeCount]);

  return (
    <div className="path-wrap" ref={wrapRef}>
      <svg className="path-flow" width={dim.w} height={dim.h} viewBox={`0 0 ${dim.w} ${dim.h}`} aria-hidden="true">
        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#34525e" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 11" />
        ))}
      </svg>
      {children}
    </div>
  );
}

// The Climb: every level as a banner + a grid of task nodes. The active level's
// tasks are clickable (open the task modal); locked levels are greyed previews.
export function TaskPath({ data, subscribed, onOpen, onUpgrade, onUnlock, unlocking, hasFullScan, onNeedFullScan }: {
  data: DashboardData; subscribed: boolean; onOpen: (t: SheetTask) => void; onUpgrade: () => void;
  onUnlock: (level: number) => void; unlocking: number | null;
  hasFullScan: boolean; onNeedFullScan: () => void;
}) {
  const ladder = data.ladder;
  if (!ladder) return <div className="ld-path" style={{ color: "var(--ink-2)" }}>Run a scan to start your climb.</div>;

  return (
    <div className="ld-path">
      {ladder.levels.map((lvl: LadderLevel, li: number) => {
        const active = lvl.state === "active";
        const open = lvl.state === "open"; // unlocked ahead — tasks visible/actionable
        const locked = lvl.state === "locked";
        const showTasks = active || open;
        // First unresolved task in the active level is "current" (the one nudge).
        const firstCurrent = active ? lvl.tasks.findIndex((t) => !t.resolved) : -1;
        // Active + open levels get dotted connectors + clickable tasks; done/locked stay a plain grid.
        const taskNodes = lvl.tasks.map((t: LadderTask, ti: number) => {
          const kind = t.resolved
            ? "done"
            : active && ti === firstCurrent
              ? "current"
              : open
                ? "current" // every unresolved task in an unlocked-ahead level is actionable
                : "locked"; // active level's later tasks stay greyed (one-thing-at-a-time)
          const clickable = (kind === "done" || kind === "current") && !!t.id;
          return (
            <PathNode
              key={t.key}
              kind={kind}
              icon={kind === "done" ? "✓" : kind === "locked" ? <LDIcon name="lock" /> : "①"}
              cap={t.title}
              xp={t.xp}
              start={kind === "current" && ti === firstCurrent}
              mascot={kind === "current" && ti === firstCurrent}
              onClick={clickable ? () => onOpen({ kind: "task", id: t.id, channel: t.channel, title: t.title, why: t.detail, xp: t.xp }) : undefined}
            />
          );
        });
        // The full-scan action lives in the prominent top CTA, so the active level
        // only carries the MCP auto-fix entry as a tail node.
        const tailNodes = active ? [
          <PathNode key="__mcp" kind="mcp" icon="🤖" cap="Auto-fix the rest with Clerow MCP"
            onClick={() => onOpen({ kind: "mcp", id: null, title: "Let Clerow MCP fix everything", why: "Connect Clerow to Claude Code, Cursor, or any agent. It reads your open quests, ships the fixes as a PR, and Clerow re-checks every model.", xp: 0 })} />,
        ] : [];
        const nodes = [...taskNodes, ...tailNodes];

        return (
          <React.Fragment key={lvl.level}>
            {li > 0 && <div className="unit-sep">Level {lvl.level}</div>}
            <div className={`unit-banner ${locked ? "locked" : ""}`}>
              <div>
                <div className="k">Level {lvl.level}{active ? " · in progress" : open ? " · unlocked" : locked ? " · locked" : " · done"}</div>
                <h3>{lvl.title}</h3>
                <div className="unit-find">{lvl.findings}</div>
              </div>
              {locked
                ? subscribed
                  ? <button className="unit-guide" disabled={unlocking === lvl.level} onClick={() => (hasFullScan ? onUnlock(lvl.level) : onNeedFullScan())}>
                      {unlocking === lvl.level ? "Unlocking…" : <><LDIcon name="scan" /> Unlock</>}
                    </button>
                  : <button className="unit-guide" onClick={onUpgrade}><LDIcon name="lock" /> Locked</button>
                : <button className="unit-guide" disabled><LDIcon name="book" /> Guide</button>}
            </div>
            {showTasks
              ? <PathGrid nodeCount={nodes.length}>{nodes}</PathGrid>
              : <div className="path-wrap">{nodes}</div>}
          </React.Fragment>
        );
      })}
    </div>
  );
}
