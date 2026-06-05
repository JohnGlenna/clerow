"use client";

import React from "react";
import { useDashboard } from "@/lib/useDashboard";
import { useOverlay } from "../shell/OverlayProvider";
import { TaskPath } from "./TaskPath";
import { NextMoveHero } from "./NextMoveHero";
import { JourneyCard } from "./JourneyCard";

// The Tasks page (the Climb). The right rail and the task modal live in the
// layout; this page owns the path and the free level-unlock action.
export function TasksPage() {
  const { data, loading, refresh } = useDashboard();
  const { openTask, openUpgrade, openScan } = useOverlay();
  const [unlocking, setUnlocking] = React.useState<number | null>(null);

  // The moment a free user clears the Level 2 taster, surface the upgrade sheet —
  // once per brand (localStorage guard) so it nudges without nagging.
  const nudged = React.useRef(false);
  React.useEffect(() => {
    if (nudged.current || !data || data.subscribed) return;
    const active = data.ladder?.levels.find((l) => l.state === "active");
    const tasterCleared = active && active.tasks.some((t) => t.locked) && !active.tasks.some((t) => !t.locked && !t.resolved);
    if (!tasterCleared) return;
    const key = `clerow_wall_${data.brand?.url ?? ""}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(key)) return;
    nudged.current = true;
    try { window.localStorage.setItem(key, "1"); } catch {}
    openUpgrade();
  }, [data, openUpgrade]);

  // Free, instant unlock: reveal a level's tasks (no scan). Refresh to show them.
  const unlock = async (level: number) => {
    if (unlocking != null) return;
    setUnlocking(level);
    try {
      const res = await fetch("/api/ladder/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ level }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "Couldn't unlock that level. Try again.");
        return;
      }
      await refresh();
    } catch {
      alert("Couldn't unlock that level. Check your connection and try again.");
    } finally {
      setUnlocking(null);
    }
  };

  if (loading && !data) return <div className="ld-path" style={{ color: "var(--ink-2)" }}>Loading…</div>;
  if (!data) return null;

  return (
    <div className="ld-path-wrap">
      <NextMoveHero />
      <JourneyCard />
      <TaskPath
        data={data}
        subscribed={!!data.subscribed}
        onOpen={openTask}
        onUpgrade={openUpgrade}
        onUnlock={unlock}
        unlocking={unlocking}
        hasFullScan={!!data.hasFullScan}
        onNeedFullScan={openScan}
      />
    </div>
  );
}
