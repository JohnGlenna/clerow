"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHead, PageStat, GuideStrip } from "./AppShell";
import { Icon } from "../Icon";
import { GameIcon, type GameIconName } from "../GameIcon";
import { TaskModal, NextMoveHero, type NextMove } from "./TaskModal";
import { useDashboard } from "@/lib/useDashboard";
import { playCheck } from "@/lib/sound";
import type { DashboardData, DashboardTask, Ladder } from "@/lib/types";

const IMPACT_COLOR = (k: string) =>
  ({ low: "#A8A8A8", medium: "#1CB0F6", high: "#F59E0B", "very high": "#E11D48" }[k] || "#A8A8A8");

// Today's brand-local date key (matches how the server stamps for_date).
function todayKey(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

export function PageQuests() {
  const router = useRouter();
  const { data, loading, refresh } = useDashboard();
  const [local, setLocal] = React.useState<DashboardTask[]>([]);
  // The clicked task plus whether to open straight into the Clerow MCP view.
  const [selected, setSelected] = React.useState<{ task: DashboardTask; mcp: boolean } | null>(null);
  const openTask = React.useCallback((task: DashboardTask, mcp = false) => setSelected({ task, mcp }), []);

  React.useEffect(() => setLocal(data?.tasks ?? []), [data?.tasks]);

  const toggle = async (id: string) => {
    const task = local.find((t) => t.id === id);
    if (!task) return;
    const next = !task.done;
    if (next) playCheck(); // satisfying chime only when completing
    setLocal((prev) => prev.map((t) => (t.id === id ? { ...t, done: next } : t)));
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, done: next }),
      });
      if (!res.ok) throw new Error();
      refresh();
    } catch {
      setLocal((prev) => prev.map((t) => (t.id === id ? { ...t, done: task.done } : t)));
    }
  };

  // Clear a completed quest from the active lists (stays done → streak + XP kept).
  const archive = async (id: string) => {
    const task = local.find((t) => t.id === id);
    if (!task) return;
    setLocal((prev) => prev.filter((t) => t.id !== id)); // optimistic
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, archived: true }),
      });
      if (!res.ok) throw new Error();
      refresh();
    } catch {
      setLocal((prev) => [...prev, task]);
    }
  };

  const today = todayKey();
  // Ladder (Climb) tasks render in the full Climb section below — keep them out of
  // the legacy daily/active/completed lists so they aren't shown twice.
  const loose = local.filter((t) => t.level == null);
  const todays = loose.filter((t) => t.forDate === today);
  const active = loose.filter((t) => t.forDate !== today && !t.done);
  const completed = loose.filter((t) => t.forDate !== today && t.done);

  const xpToday = local.filter((t) => t.done && t.completedAt && t.completedAt.slice(0, 10) === today).reduce((s, t) => s + t.xp, 0);
  const streak = data?.streak;
  const xp = data?.xp;

  // "Your next move" — the single highest-leverage fix to do right now: the first
  // unfinished task in the active Climb level (ordered easiest-first by the
  // ladder), falling back to the first open daily/active quest.
  const nextMove = React.useMemo<NextMove | null>(() => {
    const lvl = data?.ladder?.levels.find((l) => l.state === "active");
    const lt = lvl?.tasks.find((t) => t.id && !t.done);
    if (lvl && lt) {
      return {
        task: { id: lt.id!, title: lt.title, meta: lt.meta, xp: lt.xp, done: lt.done, detail: lt.detail, channel: lt.channel },
        levelLabel: `Level ${lvl.level} · ${lvl.title}`,
        stepLabel: `Step ${lvl.tasks.filter((t) => t.done).length + 1} of ${lvl.total}`,
      };
    }
    const fallback = todays.find((t) => !t.done) ?? active[0];
    if (fallback) return { task: fallback, levelLabel: "Today's quest", stepLabel: "Keeps your streak" };
    return null;
  }, [data?.ladder, todays, active]);

  return (
    <>
      <PageHead
        title="Quests"
        sub="Tiny daily moves and bigger bets. Completing any quest keeps your streak and earns XP."
        actions={
          <span className="streak-mini">
            <GameIcon name="flame" size={15} color="#F59E0B" /> {streak?.current ?? 0}
          </span>
        }
      />

      <GuideStrip
        title="How the streak works"
        steps={[
          "Quests are your daily punch list",
          "Complete any one to keep your streak",
          "Bigger bets move your AI visibility score",
        ]}
        icon="flame"
      />

      <div className="page-stats">
        <PageStat label="XP today" value={`+${xpToday}`} sub="earned so far" hi="success" />
        <PageStat label="Streak" value={String(streak?.current ?? 0)} sub={`longest ${streak?.longest ?? 0}`} hi="warn" />
        <PageStat label="Open quests" value={String(todays.length + active.length)} sub={`${completed.length} done`} />
        <PageStat
          label="Rank"
          value={xp?.title ?? "Rookie"}
          sub={xp ? `${xp.intoLevel}/${xp.span} to next · ${xp.total} XP` : "0 XP all-time"}
          hi="accent"
        />
      </div>

      {!loading && nextMove && <NextMoveHero move={nextMove} onOpen={openTask} />}

      {loading ? (
        <div className="app-card" style={{ padding: 24 }}>Loading quests…</div>
      ) : (
        <>
          {data?.ladder && <ClimbFull ladder={data.ladder} onToggle={toggle} onOpen={openTask} />}

          <h3 className="quest-section-h">
            <span><GameIcon name="calendar" size={18} /> Today&apos;s quests</span>
            <span className="quest-section-sub">
              {todays.filter((t) => t.done).length}/{todays.length} complete · keeps your streak
            </span>
          </h3>
          {todays.length === 0 ? (
            <div className="app-card" style={{ padding: 20, color: "var(--ink-2)" }}>
              No quests for today yet — they generate from your latest scan. Open a prompt and scan it to refresh them.
              <button className="btn btn--ghost btn--sm" style={{ marginLeft: 12 }} onClick={() => router.push("/dashboard/prompts")}>
                Open prompts →
              </button>
            </div>
          ) : (
            <div className="quest-task-list">
              {todays.map((t) => (
                <QuestRow key={t.id} task={t} onToggle={toggle} onArchive={archive} onOpen={openTask} />
              ))}
            </div>
          )}

          <h3 className="quest-section-h">
            <span><GameIcon name="target" size={18} /> Active quests</span>
            <span className="quest-section-sub">added from prompts &amp; sources · this is what moves your score</span>
          </h3>
          {active.length === 0 ? (
            <div className="app-card" style={{ padding: 20, color: "var(--ink-2)" }}>
              No active quests. Open a prompt and add a GEO step to build your playbook.
              <button className="btn btn--ghost btn--sm" style={{ marginLeft: 12 }} onClick={() => router.push("/dashboard/prompts")}>
                Open prompts →
              </button>
            </div>
          ) : (
            <div className="quest-task-list">
              {active.map((t) => (
                <QuestRow key={t.id} task={t} onToggle={toggle} onArchive={archive} onOpen={openTask} />
              ))}
            </div>
          )}

          <h3 className="quest-section-h">
            <span><GameIcon name="mountain" size={18} /> Milestones</span>
            <span className="quest-section-sub">your real targets · auto-tracked</span>
          </h3>
          <Milestones data={data} completedCount={completed.length + todays.filter((t) => t.done).length} />

          {completed.length > 0 && (
            <>
              <h3 className="quest-section-h">
                <span><GameIcon name="check" size={18} color="#58CC02" /> Completed</span>
                <span className="quest-section-sub">{completed.length} shipped</span>
              </h3>
              <div className="quest-task-list">
                {completed.slice(0, 12).map((t) => (
                  <QuestRow key={t.id} task={t} onToggle={toggle} onArchive={archive} onOpen={openTask} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {selected && (
        <TaskModal
          task={selected.task}
          startMcp={selected.mcp}
          brandUrl={data?.brand?.url ?? null}
          onToggle={toggle}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// The full "Climb" — every level expanded (done / active / locked) so the Quests
// page is the whole journey, where the Overview shows only the current level.
function ClimbFull({
  ladder,
  onToggle,
  onOpen,
}: {
  ladder: Ladder;
  onToggle: (id: string) => void;
  onOpen: (task: DashboardTask) => void;
}) {
  return (
    <>
      <h3 className="quest-section-h">
        <span><GameIcon name="mountain" size={18} /> The Climb</span>
        <span className="quest-section-sub">
          Level {ladder.currentLevel} of {ladder.levels.length} · your full journey
        </span>
      </h3>
      <div className="app-card climb">
        {ladder.levels.map((l) => (
          <div key={l.level} className="climb-lvl">
            <div className={`climb-node ${l.state}`}>
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
                <div className="climb-node-title">Level {l.level} · {l.title}</div>
                <div className="climb-node-sub">{l.blurb}</div>
              </div>
              {l.total > 0 && <span className="climb-node-prog">{l.doneCount}/{l.total}</span>}
            </div>

            {l.state === "locked" ? (
              <div className="climb-locked-note">
                Complete Level {l.level - 1} to unlock {l.total} task{l.total === 1 ? "" : "s"}.
              </div>
            ) : (
              l.tasks.length > 0 && (
                <div className="task-list climb-lvl-tasks">
                  {l.tasks.map((t) => {
                    const interactive = l.state === "active" && !!t.id;
                    return (
                      <div
                        key={t.key}
                        className={`task ${t.done ? "done" : ""} ${interactive ? "task--click" : ""}`}
                        onClick={
                          interactive
                            ? () => onOpen({ id: t.id!, title: t.title, meta: t.meta, xp: t.xp, done: t.done, detail: t.detail, channel: t.channel })
                            : undefined
                        }
                        title={interactive ? "Open to generate content" : undefined}
                      >
                        <span
                          className="tickbox"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (interactive) onToggle(t.id!);
                          }}
                        >
                          {t.done && <Icon name="check" size={12} />}
                        </span>
                        <div>
                          <div className="title">{t.title}</div>
                          <div className="meta">{t.meta}</div>
                        </div>
                        <span className="xp">+{t.xp} XP</span>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function QuestRow({
  task,
  onToggle,
  onArchive,
  onOpen,
}: {
  task: DashboardTask;
  onToggle: (id: string) => void;
  onArchive: (id: string) => void;
  onOpen: (task: DashboardTask) => void;
}) {
  const impact = (task.meta.match(/impact:\s*([a-z ]+)/i)?.[1] ?? "medium").trim();
  // Clicking the row opens the quest (to generate content). The checkbox and
  // Archive button stop propagation so they keep their own behavior.
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div
      className={`quest-row quest-row--click ${task.done ? "done" : ""}`}
      onClick={() => onOpen(task)}
      title="Open to generate content"
    >
      <span className="tickbox" onClick={(e) => { stop(e); onToggle(task.id); }}>
        {task.done && <Icon name="check" size={12} />}
      </span>
      <div className="quest-row-main">
        <div className="quest-row-title">{task.title}</div>
        <div className="quest-row-meta">{task.meta}</div>
      </div>
      <span
        className="qd-impact"
        style={{ background: `color-mix(in oklab, ${IMPACT_COLOR(impact)} 16%, var(--surface))`, color: IMPACT_COLOR(impact) }}
      >
        {impact}
      </span>
      {task.done ? (
        <button className="btn btn--ghost btn--sm task-archive" onClick={(e) => { stop(e); onArchive(task.id); }} title="Clear from your quest list">
          Archive
        </button>
      ) : (
        <span className="xp">+{task.xp} XP</span>
      )}
    </div>
  );
}

function Milestones({ data, completedCount }: { data: DashboardData | null; completedCount: number }) {
  const vis = data?.score?.visibility ?? 0;
  const pos = data?.score?.position ?? null;
  const streak = data?.streak?.current ?? 0;
  const modelsCited = (data?.models ?? []).filter((m) => !m.locked && m.position != null).length;
  const totalModels = (data?.models ?? []).length || 4;

  const items: { id: string; title: string; xp: number; progress: number; ico: GameIconName; desc: string }[] = [
    {
      id: "m1",
      title: "Reach #1 in any model",
      xp: 500,
      progress: pos != null ? Math.max(0, Math.round(100 - (pos - 1) * 25)) : 0,
      ico: "crown",
      desc: pos != null ? `Your best position is #${pos}. Close the gap to the leader.` : "Scan a prompt to get on the board.",
    },
    {
      id: "m2",
      title: "Hit visibility score of 80",
      xp: 600,
      progress: Math.min(100, Math.round((vis / 80) * 100)),
      ico: "bullseye",
      desc: `You're at ${vis}. ${Math.max(0, 80 - vis)} to go.`,
    },
    {
      id: "m3",
      title: "30-day streak",
      xp: 300,
      progress: Math.min(100, Math.round((streak / 30) * 100)),
      ico: "flame",
      desc: `${streak} days in, ${Math.max(0, 30 - streak)} to go. Don't break the chain.`,
    },
    {
      id: "m4",
      title: "Recommended by every model",
      xp: 700,
      progress: Math.round((modelsCited / totalModels) * 100),
      ico: "star",
      desc: `Recommended in ${modelsCited} of ${totalModels} models you track.`,
    },
  ];

  return (
    <div className="milestones-grid">
      {items.map((m) => (
        <div key={m.id} className="milestone">
          <div className="ms-head">
            <span className="ms-ico"><GameIcon name={m.ico} size={22} /></span>
            <span className="ms-xp">+{m.xp} XP</span>
          </div>
          <div className="ms-title">{m.title}</div>
          <div className="ms-desc">{m.desc}</div>
          <div className="ms-progress">
            <i style={{ width: `${m.progress}%` }} />
          </div>
          <div className="ms-progress-l">{m.progress}% there</div>
        </div>
      ))}
    </div>
  );
}
