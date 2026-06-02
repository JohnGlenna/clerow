"use client";

import type { DashboardModel } from "@/lib/types";

// Small presentational bits shared across the dashboard pages (Prompts, AI
// Models, Leaderboard, Profile, Settings). Split out of the old LearnPages.

export const INTENT: Record<string, [string, string]> = {
  solution: ["Solution", "#1CB0F6"],
  compare: ["Compare", "#FF4B4B"],
  problem: ["Problem", "#A560F0"],
  branded: ["Branded", "#38A9E0"],
  custom: ["Custom", "#FFC800"],
};

export function LpHead({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="lp-head">
      {eyebrow && <div className="lp-eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function Stat({ v, l, c }: { v: string; l: string; c?: string }) {
  return (
    <div className="lp-stat">
      <div className="v" style={c ? { color: c } : undefined}>{v}</div>
      <div className="l">{l}</div>
    </div>
  );
}

export function Lock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function ModelDots({ models, lit }: { models: DashboardModel[]; lit: boolean }) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {models.map((m) => (
        <span
          key={m.id}
          className="mc"
          title={m.label}
          style={{
            width: 20, height: 20, fontSize: 9, borderRadius: 6,
            background: lit && !m.locked ? m.swatch : "var(--surface-3)",
            color: lit && !m.locked ? "#fff" : "var(--ink-4)", marginLeft: 0,
          }}
        >
          {m.letter}
        </span>
      ))}
    </span>
  );
}
