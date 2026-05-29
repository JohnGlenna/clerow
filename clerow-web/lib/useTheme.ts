"use client";

import React from "react";

export type ThemeMode = "light" | "dark";

const STORE = "clerow:theme";

function currentMode(): ThemeMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * Light/dark theme for the neumorphic dashboard. The actual attribute is set on
 * <html data-theme> — initialised before paint by the no-flash script in
 * app/layout.tsx and persisted to localStorage here. The neumorphism CSS reads
 * [data-theme="dark"] (scoped to .app-shell), so toggling re-skins the dashboard.
 */
export function useTheme() {
  const [mode, setModeState] = React.useState<ThemeMode>("light");

  // Sync with whatever the no-flash script already applied on mount.
  React.useEffect(() => {
    setModeState(currentMode());
  }, []);

  const setMode = React.useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      document.documentElement.dataset.theme = next;
      window.localStorage.setItem(STORE, next);
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
  }, []);

  const toggle = React.useCallback(() => {
    setMode(currentMode() === "dark" ? "light" : "dark");
  }, [setMode]);

  return { mode, setMode, toggle };
}
