import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { DashboardData } from './types';

// Generic GET hook: { data, loading, error, refresh }. Pass null to skip.
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await api.get<T>(path));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}

export function useDashboard() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return useApi<DashboardData>(`/api/dashboard?tz=${encodeURIComponent(tz)}`);
}
