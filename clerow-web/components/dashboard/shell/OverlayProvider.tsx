"use client";

import React from "react";
import { useDashboard } from "@/lib/useDashboard";
import { playCheck } from "@/lib/sound";
import { TaskModal } from "../tasks/TaskModal";
import { UpgradeSheet } from "../tasks/UpgradeSheet";
import { ContextSheet } from "../tasks/ContextSheet";
import { SubscribedToast } from "../tasks/SubscribedToast";
import type { SheetTask } from "../tasks/types";

// The dashboard's modal layer. Because pages are now separate routes, the task
// modal / upgrade / context sheets live here in the layout and are opened via
// context from anywhere (the path, the right rail, the Prompts page).
type OverlayCtx = {
  openTask: (t: SheetTask) => void;
  openUpgrade: () => void;
  openContext: () => void;
  openScan: () => void; // the full-scan / re-scan checkpoint
};

const Ctx = React.createContext<OverlayCtx | null>(null);

export function useOverlay(): OverlayCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useOverlay must be used within OverlayProvider");
  return ctx;
}

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const { data, refresh } = useDashboard();
  const [task, setTask] = React.useState<SheetTask | null>(null);
  const [upgrade, setUpgrade] = React.useState(false);
  const [context, setContext] = React.useState(false);
  const [justSubscribed, setJustSubscribed] = React.useState(false);
  const seenCheckout = React.useRef(false);

  // Stripe Checkout returns to /dashboard?checkout=success — celebrate it once,
  // strip the param so a refresh won't re-fire, and pull fresh access state.
  React.useEffect(() => {
    if (seenCheckout.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      seenCheckout.current = true;
      setJustSubscribed(true);
      playCheck();
      params.delete("checkout");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
      refresh();
    }
  }, [refresh]);

  // Open the comprehensive scan flow (re-crawl + AI-grade site + query all 5 models).
  const openScan = React.useCallback(() => {
    setTask({
      kind: "checkpoint",
      id: null,
      title: data?.hasFullScan ? "Re-scan across your AI models" : "Scan all 5 AI models",
      why: data?.hasFullScan
        ? "Clerow re-reads your site and queries all 5 AI models, then refreshes every level. ~1–2 min."
        : "All 5 models read your site, AI-grade your pages, and test your top buyer queries — then your levels unlock. ~1–2 min.",
      xp: 0,
    });
  }, [data?.hasFullScan]);

  const value = React.useMemo<OverlayCtx>(
    () => ({ openTask: setTask, openUpgrade: () => setUpgrade(true), openContext: () => setContext(true), openScan }),
    [openScan],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {task && (
        <TaskModal
          task={task}
          modelCount={data?.models?.length ?? 0}
          onClose={() => setTask(null)}
          onChanged={refresh}
          onAddContext={() => setContext(true)}
        />
      )}
      {upgrade && <UpgradeSheet onClose={() => setUpgrade(false)} />}
      {context && <ContextSheet onClose={() => setContext(false)} />}
      {justSubscribed && <SubscribedToast onClose={() => setJustSubscribed(false)} />}
    </Ctx.Provider>
  );
}
