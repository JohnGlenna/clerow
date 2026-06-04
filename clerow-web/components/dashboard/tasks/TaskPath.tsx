"use client";

import React from "react";
import { MascotClerow } from "../../Mascot";
import { GameIcon, type GameIconName } from "../../GameIcon";
import { LDIcon } from "../shell/LDIcon";
import type { Channel, DashboardData, LadderLevel, LadderTask } from "@/lib/types";
import type { SheetTask } from "./types";

// A task-appropriate game-art icon for a path node, keyed by the stable ladder_key
// so the icon reflects what the task actually is (a comparison table, an llms.txt
// file, a Reddit answer) instead of every node showing the same "①". Falls back to
// a channel-sensible default for keys we don't recognize (e.g. scan-generated ones).
function taskIcon(key: string | undefined, channel: Channel | undefined): GameIconName {
  const k = key ?? "";
  // Exact matches for the fixed foundation/on-page specs.
  const EXACT: Record<string, GameIconName> = {
    "audit-robots-ai": "brain", "audit-llms-txt": "scroll", "audit-h1": "book",
    "audit-title": "quill", "audit-meta-description": "quill", "audit-crawlable": "search",
    "audit-https": "bricks", "audit-ssr": "bolt", "audit-schema": "gears", "audit-sitemap": "compass",
    "l2-answer-first": "chat", "l2-h2-queries": "idea", "l2-comparison-table": "chart",
    "l2-eeat": "laurels", "l2-freshness": "calendar",
    "l3-reddit": "chat", "l3-directory": "star", "l3-entity": "world",
    "l5-rescan": "cycle",
  };
  if (EXACT[k]) return EXACT[k];
  // Prefix matches for the dynamically-keyed specs (one per source/competitor/prompt).
  if (k.startsWith("l3-source-")) return "megaphone";
  if (k.startsWith("l4-compare-")) return "swords";
  if (k.startsWith("l4-prompt-")) return "target";
  if (k.startsWith("l4-howto")) return "book";
  // Unknown key — pick by where the fix lives.
  return channel === "offsite" ? "world" : "gears";
}

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
        // First unresolved, NON-paywalled task in the active level is "current" (the
        // one nudge) — paywalled tasks never get the Start bubble.
        const firstCurrent = active ? lvl.tasks.findIndex((t) => !t.resolved && !t.locked) : -1;
        // Once the free taster(s) in this active level are done, the locked tasks
        // become the wall: still shown, but clicking them opens the upgrade sheet.
        const tasterCleared = active && !lvl.tasks.some((t) => !t.locked && !t.resolved);
        // Active + open levels get dotted connectors + clickable tasks; done/locked stay a plain grid.
        const taskNodes = lvl.tasks.map((t: LadderTask, ti: number) => {
          // Paywalled tasks render as a lock node that upsells on click.
          const paywalled = t.locked;
          const kind = t.resolved
            ? "done"
            : paywalled
              ? "locked"
              : active && ti === firstCurrent
                ? "current"
                : open
                  ? "current" // every unresolved task in an unlocked-ahead level is actionable
                  : "locked"; // active level's later tasks stay greyed (one-thing-at-a-time)
          const clickable = paywalled || ((kind === "done" || kind === "current") && !!t.id);
          return (
            <PathNode
              key={t.key}
              kind={kind}
              icon={kind === "done" ? <GameIcon name="check" size={34} /> : kind === "locked" ? <LDIcon name="lock" /> : <GameIcon name={taskIcon(t.key, t.channel)} size={34} />}
              cap={t.title}
              xp={t.xp}
              start={kind === "current" && ti === firstCurrent}
              mascot={kind === "current" && ti === firstCurrent}
              onClick={!clickable ? undefined : paywalled ? onUpgrade : () => onOpen({ kind: "task", id: t.id, channel: t.channel, title: t.title, why: t.detail, xp: t.xp, minutes: t.minutes, steps: t.steps, ladderKey: t.key, crumb: lvl.title })}
            />
          );
        });
        // The full-scan action lives in the prominent top CTA, so the active level
        // only carries the MCP auto-fix entry as a tail node — but not once a free
        // user has cleared the taster (the "rest" is paywalled; show the wall instead).
        const tailNodes = active && !(tasterCleared && !subscribed) ? [
          <PathNode key="__mcp" kind="mcp" icon={<MascotClerow size={46} />} cap="Auto-fix the rest with Clerow MCP"
            onClick={() => onOpen({ kind: "mcp", id: null, title: "Let Clerow MCP fix everything", why: "Connect Clerow to Claude Code, Cursor, or any agent. It reads your open quests, ships the fixes as a PR, and Clerow re-checks every model.", xp: 0 })} />,
        ] : [];
        const nodes = [...taskNodes, ...tailNodes];
        // Estimated visibility upside still behind the paywall for this level.
        const gain = !subscribed ? data.lockedGain?.byLevel?.[lvl.level] : undefined;

        return (
          <React.Fragment key={lvl.level}>
            {li > 0 && <div className="unit-sep">Level {lvl.level}</div>}
            <div className={`unit-banner ${locked ? "locked" : ""}`}>
              <div>
                <div className="k">Level {lvl.level}{active ? " · in progress" : open ? " · unlocked" : locked ? " · locked" : " · done"}</div>
                <h3>{lvl.title}</h3>
                <div className="unit-find">{lvl.findings}{locked && gain ? ` · est. +${gain}% visibility` : ""}</div>
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
            {tasterCleared && !subscribed && (
              <button className="climb-wall" onClick={onUpgrade}>
                <span className="climb-wall-ic">⭐</span>
                <span className="climb-wall-txt">
                  <b>You shipped your first structure win.</b>
                  <span>Go Premium to finish the climb{data.lockedGain?.overall ? ` — est. +${data.lockedGain.overall}% AI visibility` : ""}.</span>
                </span>
                <span className="climb-wall-cta">Upgrade</span>
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
