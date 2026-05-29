"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHead, PageStat } from "./AppShell";
import { Icon } from "../Icon";
import { GameIcon, type GameIconName } from "../GameIcon";
import { useDashboard } from "@/lib/useDashboard";
import type { DashboardData, DashboardTask } from "@/lib/types";

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

  React.useEffect(() => setLocal(data?.tasks ?? []), [data?.tasks]);

  const toggle = async (id: string) => {
    const task = local.find((t) => t.id === id);
    if (!task) return;
    const next = !task.done;
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

  const today = todayKey();
  const todays = local.filter((t) => t.forDate === today);
  const active = local.filter((t) => t.forDate !== today && !t.done);
  const completed = local.filter((t) => t.forDate !== today && t.done);

  const xpToday = local.filter((t) => t.done && t.completedAt && t.completedAt.slice(0, 10) === today).reduce((s, t) => s + t.xp, 0);
  const xpTotal = local.filter((t) => t.done).reduce((s, t) => s + t.xp, 0);
  const streak = data?.streak;

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

      <div className="page-stats">
        <PageStat label="XP today" value={`+${xpToday}`} sub="earned so far" hi="success" />
        <PageStat label="Streak" value={String(streak?.current ?? 0)} sub={`longest ${streak?.longest ?? 0}`} hi="warn" />
        <PageStat label="Open quests" value={String(todays.length + active.length)} sub={`${completed.length} done`} />
        <PageStat label="Total XP" value={String(xpTotal)} sub="all-time earned" hi="accent" />
      </div>

      {loading ? (
        <div className="app-card" style={{ padding: 24 }}>Loading quests…</div>
      ) : (
        <>
          <h3 className="quest-section-h">
            <span><GameIcon name="calendar" size={18} /> Today&apos;s quests</span>
            <span className="quest-section-sub">
              {todays.filter((t) => t.done).length}/{todays.length} complete · keeps your streak
            </span>
          </h3>
          {todays.length === 0 ? (
            <div className="app-card" style={{ padding: 20, color: "var(--ink-2)" }}>
              No quests for today yet — they generate from your latest scan. Re-scan to refresh them.
            </div>
          ) : (
            <div className="quest-task-list">
              {todays.map((t) => (
                <QuestRow key={t.id} task={t} onToggle={toggle} />
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
                <QuestRow key={t.id} task={t} onToggle={toggle} />
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
                  <QuestRow key={t.id} task={t} onToggle={toggle} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

function QuestRow({ task, onToggle }: { task: DashboardTask; onToggle: (id: string) => void }) {
  const impact = (task.meta.match(/impact:\s*([a-z ]+)/i)?.[1] ?? "medium").trim();
  return (
    <div className={`quest-row ${task.done ? "done" : ""}`}>
      <span className="tickbox" onClick={() => onToggle(task.id)}>
        {task.done && <Icon name="check" size={12} />}
      </span>
      <div className="quest-row-main">
        <div className="quest-row-title">{task.title}</div>
        <div className="quest-row-meta">{task.meta}</div>
      </div>
      <span
        className="qd-impact"
        style={{ background: `color-mix(in oklab, ${IMPACT_COLOR(impact)} 16%, white)`, color: IMPACT_COLOR(impact) }}
      >
        {impact}
      </span>
      <span className="xp">+{task.xp} XP</span>
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
