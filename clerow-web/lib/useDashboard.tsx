"use client";

import React from "react";
import type { DashboardData } from "./types";

type DashboardCtx = {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const Ctx = React.createContext<DashboardCtx | null>(null);

// Fetches the aggregated dashboard data once and shares it with every dashboard
// page and the sidebar streak widget. Hitting /api/dashboard also rolls the
// streak forward and tops up today's quests server-side, so a single fetch per
// page view keeps everything fresh without racing duplicate generations.
export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/dashboard?tz=${encodeURIComponent(tz)}`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load");
      const json: DashboardData = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return <Ctx.Provider value={{ data, loading, error, refresh: load }}>{children}</Ctx.Provider>;
}

export function useDashboard(): DashboardCtx {
  const ctx = React.useContext(Ctx);
  // Fallback keeps the hook usable outside a provider (no fetch, no crash).
  return ctx ?? { data: null, loading: false, error: null, refresh: async () => {} };
}
