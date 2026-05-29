"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { GameIcon } from "../GameIcon";
import { PageHead, PageStat } from "./AppShell";

type ArchivedTask = {
  id: string;
  title: string;
  meta: string;
  xp: number;
  impact: string;
  source: string;
  completed_at: string | null;
  for_date: string | null;
};

const SOURCE_LABEL: Record<string, string> = {
  prompt: "From a prompt",
  source: "From a source",
  daily: "Daily quest",
  scan: "From your scan",
};

// Group tasks by completion day (YYYY-MM-DD), preserving newest-first order.
function groupByDay(tasks: ArchivedTask[]): { day: string; items: ArchivedTask[]; xp: number }[] {
  const map = new Map<string, ArchivedTask[]>();
  for (const t of tasks) {
    const day = t.completed_at ? t.completed_at.slice(0, 10) : "Earlier";
    const list = map.get(day) ?? [];
    list.push(t);
    map.set(day, list);
  }
  return [...map.entries()].map(([day, items]) => ({
    day,
    items,
    xp: items.reduce((s, t) => s + t.xp, 0),
  }));
}

function dayLabel(day: string): string {
  if (day === "Earlier") return "Earlier";
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  return new Date(day + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PageArchive() {
  const router = useRouter();
  const [tasks, setTasks] = React.useState<ArchivedTask[] | null>(null);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/tasks", { cache: "no-store" });
    const json = await res.json().catch(() => ({ tasks: [] }));
    setTasks(json.tasks ?? []);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // Reopen an archived quest → un-archives it and clears its done state, so it
  // returns to the Quests page as an open quest ready to work again.
  const reopen = async (id: string) => {
    setTasks((prev) => (prev ?? []).filter((t) => t.id !== id)); // optimistic
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, archived: false, done: false }),
      });
      if (!res.ok) throw new Error();
    } catch {
      load(); // revert by reloading the true state
    }
  };

  const total = tasks?.length ?? 0;
  const totalXp = (tasks ?? []).reduce((s, t) => s + t.xp, 0);
  const days = tasks ? groupByDay(tasks) : [];

  return (
    <>
      <PageHead
        title="Archive"
        sub="Quests you've cleared away — your track record of work that improved your AI visibility."
        actions={
          <button className="btn btn--ghost btn--sm" onClick={() => router.push("/dashboard/quests")}>
            <Icon name="trophy" size={14} />
            Back to quests
          </button>
        }
      />

      <div className="page-stats">
        <PageStat label="Quests archived" value={String(total)} sub="all-time" hi="success" />
        <PageStat label="XP earned" value={String(totalXp)} sub="from archived work" hi="accent" />
        <PageStat label="Active days" value={String(days.filter((d) => d.day !== "Earlier").length)} sub="days you shipped" />
      </div>

      {tasks == null ? (
        <div className="app-card" style={{ padding: 24 }}>Loading your archive…</div>
      ) : tasks.length === 0 ? (
        <div className="app-card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <GameIcon name="scroll" size={40} />
          </div>
          <h4 style={{ fontSize: 18, marginBottom: 6 }}>Nothing archived yet.</h4>
          <p style={{ color: "var(--ink-2)", maxWidth: 420, margin: "0 auto 16px", fontWeight: 500 }}>
            Complete a quest, then hit <b>Archive</b> to clear it from your list — it lands here as a record of the work you did to climb in AI search.
          </p>
          <button className="btn btn--primary btn--sm" onClick={() => router.push("/dashboard/quests")}>
            Go to quests →
          </button>
        </div>
      ) : (
        days.map((group) => (
          <div key={group.day} style={{ marginBottom: 18 }}>
            <h3 className="quest-section-h">
              <span><GameIcon name="check" size={18} color="#58CC02" /> {dayLabel(group.day)}</span>
              <span className="quest-section-sub">
                {group.items.length} quest{group.items.length === 1 ? "" : "s"} · +{group.xp} XP
              </span>
            </h3>
            <div className="quest-task-list">
              {group.items.map((t) => (
                <div key={t.id} className="quest-row done">
                  <span className="tickbox"><Icon name="check" size={12} /></span>
                  <div className="quest-row-main">
                    <div className="quest-row-title">{t.title}</div>
                    <div className="quest-row-meta">
                      {SOURCE_LABEL[t.source] ?? "Quest"}
                      {t.completed_at ? ` · ${new Date(t.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                    </div>
                  </div>
                  <button className="btn btn--ghost btn--sm" onClick={() => reopen(t.id)}>
                    Reopen
                  </button>
                  <span className="xp">+{t.xp} XP</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  );
}
