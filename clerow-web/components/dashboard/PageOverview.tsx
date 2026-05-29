"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { GameIcon, type GameIconName } from "../GameIcon";
import { MascotClerow } from "../Mascot";
import { PageHead } from "./AppShell";
import { useDashboard } from "@/lib/useDashboard";
import type {
  DashboardData,
  DashboardModel,
  DashboardCompetitor,
  DashboardTask,
} from "@/lib/types";

// "https://example.com/path" → "example.com" — the greeting uses the bare domain
// so it matches the site the user connected, not the enriched/guessed company name.
function domainName(url?: string): string | undefined {
  if (!url) return undefined;
  const host = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim();
  return host || undefined;
}

export function PageOverview() {
  const router = useRouter();
  const navigate = (k: string) =>
    router.push(k === "overview" ? "/dashboard" : `/dashboard/${k}`);
  const { data, loading, error, refresh } = useDashboard();

  const sub = data?.brand
    ? `${data.brand.url}${data.hasScan ? ` · scanned via ${data.engine ?? "Perplexity"}` : " · not scanned yet"}`
    : "Connect your site to start";

  return (
    <>
      <PageHead
        title="Overview"
        sub={sub}
        actions={
          <>
            <button className="btn btn--ghost btn--sm">
              <Icon name="download" size={14} />
              Export
            </button>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => router.push("/onboarding")}
            >
              <Icon name="bolt" size={14} />
              Re-scan now
            </button>
          </>
        }
      />

      {loading && <div className="app-hello"><div className="greet">Loading your dashboard…</div></div>}
      {error && !loading && (
        <div className="app-hello"><div className="greet">Couldn&apos;t load: {error}</div></div>
      )}

      {!loading && data && !data.hasScan && <NoScan onScan={() => router.push("/onboarding")} brand={data.brand} />}

      {!loading && data && data.hasScan && (
        <>
          <AppHello company={domainName(data.brand?.url) ?? "founder"} streak={data.streak?.current ?? 0} />
          <div className="app-grid">
            <ScoreCard score={data.score} />
            <TasksCard tasks={data.tasks ?? []} onNavigate={navigate} onChanged={refresh} />
          </div>
          <div className="app-grid">
            <ModelsCard models={data.models ?? []} onNavigate={navigate} />
            <CompetitorsCard competitors={data.competitors ?? []} onNavigate={navigate} />
          </div>
          <AchievementsCard />
        </>
      )}
    </>
  );
}

function NoScan({ onScan, brand }: { onScan: () => void; brand: DashboardData["brand"] }) {
  return (
    <div className="app-card" style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <MascotClerow size={72} />
      </div>
      <h4 style={{ fontSize: 20, marginBottom: 6 }}>
        {brand ? `Let's scan ${brand.company || brand.url}.` : "Run your first scan."}
      </h4>
      <p style={{ color: "var(--ink-2)", marginBottom: 18 }}>
        See exactly where AI engines recommend your competitors instead of you.
      </p>
      <button className="btn btn--primary btn--lg" onClick={onScan}>
        <Icon name="bolt" size={14} /> Run my free scan
      </button>
    </div>
  );
}

function AppHello({ company, streak }: { company: string; streak: number }) {
  return (
    <div className="app-hello">
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "var(--bg-soft)",
          border: "2px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MascotClerow size={44} />
      </div>
      <div className="greet">
        Welcome back, {company}.
        <small>Here&apos;s where you stand in AI search today. Let&apos;s climb. ✨</small>
      </div>
      <div className="streak-mini"><GameIcon name="flame" size={16} color="#F59E0B" /> {streak}</div>
    </div>
  );
}

function ScoreCard({ score }: { score?: DashboardData["score"] }) {
  const overall = score?.overall ?? 0;
  const visibility = score?.visibility ?? 0;
  const position = score?.position ?? null;
  const sentiment = score?.sentiment ?? 0;
  return (
    <div className="app-card">
      <div className="app-card-head">
        <h4>Your AI visibility score</h4>
        <span className="sub">from your latest scan</span>
      </div>

      <div className="score-row">
        <ScoreRing value={overall} />
        <div className="score-stats">
          <ScoreStat label="Visibility" icon="eye" value={`${visibility}%`} pct={visibility} color="#F59E0B" />
          <ScoreStat
            label="Position"
            icon="target"
            value={position != null ? `#${position}` : "—"}
            pct={position != null ? Math.max(0, 100 - (position - 1) * 15) : 0}
            color="#1CB0F6"
          />
          <ScoreStat label="Sentiment" icon="smile" value={sentiment ? `${sentiment}` : "—"} pct={sentiment} color="#58CC02" />
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ value, size = 156 }: { value: number; size?: number }) {
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-soft-2)" strokeWidth="14" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFC800" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
      </svg>
      <div className="num">
        <b>{value}</b>
        <span>visibility score</span>
      </div>
    </div>
  );
}

function ScoreStat({
  label,
  icon,
  value,
  pct,
  color,
}: {
  label: string;
  icon: "eye" | "target" | "smile";
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="score-stat">
      <span className="label">
        <span className="ico">
          <Icon name={icon} size={14} />
        </span>
        {label}
      </span>
      <span className="bar">
        <i style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className="val">{value}</span>
    </div>
  );
}

function TasksCard({
  tasks,
  onNavigate,
  onChanged,
}: {
  tasks: DashboardTask[];
  onNavigate: (k: string) => void;
  onChanged?: () => void;
}) {
  const [local, setLocal] = React.useState(tasks);
  React.useEffect(() => setLocal(tasks), [tasks]);

  // Persist the toggle (stamps completed_at → feeds the streak). Optimistic, with
  // a revert on failure; refresh pulls the recomputed streak into the sidebar.
  const toggle = async (i: number) => {
    const task = local[i];
    const next = !task.done;
    setLocal((prev) => prev.map((t, j) => (j === i ? { ...t, done: next } : t)));
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: task.id, done: next }),
      });
      if (!res.ok) throw new Error("save failed");
      onChanged?.();
    } catch {
      setLocal((prev) => prev.map((t, j) => (j === i ? { ...t, done: task.done } : t)));
    }
  };

  const doneCount = local.filter((t) => t.done).length;
  const totalXP = local.filter((t) => t.done).reduce((sum, t) => sum + t.xp, 0);

  return (
    <div className="app-card">
      <div className="app-card-head">
        <h4>Today&apos;s quests</h4>
        <span className="sub">
          {doneCount}/{local.length} done · <b style={{ color: "var(--accent-2)" }}>+{totalXP} XP earned</b>
        </span>
      </div>
      <div className="task-list">
        {local.length === 0 && (
          <div className="task"><div><div className="title">No tasks yet — your scan will generate fixes.</div></div></div>
        )}
        {local.map((task, i) => (
          <div key={task.id} className={`task ${task.done ? "done" : ""}`}>
            <span className="tickbox" onClick={() => toggle(i)}>
              {task.done && <Icon name="check" size={12} />}
            </span>
            <div>
              <div className="title">{task.title}</div>
              <div className="meta">{task.meta}</div>
            </div>
            <span className="xp">+{task.xp} XP</span>
          </div>
        ))}
      </div>
      <button className="btn btn--ghost btn--sm" style={{ alignSelf: "flex-start" }} onClick={() => onNavigate("quests")}>
        See all quests →
      </button>
    </div>
  );
}

function ModelsCard({ models, onNavigate }: { models: DashboardModel[]; onNavigate: (k: string) => void }) {
  return (
    <div className="app-card">
      <div className="app-card-head">
        <h4>How each AI sees you</h4>
        <a className="sub" style={{ cursor: "pointer", color: "var(--accent-2)", fontWeight: 800 }} onClick={() => onNavigate("models")}>
          Full breakdown →
        </a>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {models.map((m) => (
          <div key={m.id} className="model-row">
            <span className="l">
              <span className="model-icon" style={{ background: m.swatch }}>{m.letter}</span>
              {m.label}
            </span>
            <span className="right">
              {m.locked ? (
                <span className="pos-pill" style={{ opacity: 0.7 }}>🔒 Upgrade</span>
              ) : (
                <>
                  <span className="pos-pill">{m.position != null ? `#${m.position}` : "—"}</span>
                  <span>{m.visibility != null ? `${m.visibility}%` : "—"}</span>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetitorsCard({ competitors, onNavigate }: { competitors: DashboardCompetitor[]; onNavigate: (k: string) => void }) {
  return (
    <div className="app-card">
      <div className="app-card-head">
        <h4>Category leaderboard</h4>
        <a className="sub" style={{ cursor: "pointer", color: "var(--accent-2)", fontWeight: 800 }} onClick={() => onNavigate("leaderboard")}>
          Full board →
        </a>
      </div>
      <div>
        {competitors.map((r) => (
          <div key={`${r.rank}-${r.name}`} className={`comp-row ${r.isYou ? "is-me" : ""}`}>
            <span className="rank">#{r.rank}</span>
            <span className="name">
              <span className="sw" style={{ background: r.isYou ? "#F59E0B" : "#1CB0F6" }}>
                {r.name[0]?.toUpperCase()}
              </span>
              {r.name}
              {r.isYou && <span className="ex-you" style={{ marginLeft: 6 }}>YOU</span>}
            </span>
            <span className="num">{r.visibility}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AchievementsCard() {
  const badges: { tier: string; ico: GameIconName; name: string }[] = [
    { tier: "gold", ico: "trophy", name: "First Scan" },
    { tier: "locked", ico: "locked", name: "First Citation" },
    { tier: "locked", ico: "locked", name: "Schema Master" },
    { tier: "locked", ico: "locked", name: "Position #1" },
    { tier: "locked", ico: "locked", name: "Trending Up" },
    { tier: "locked", ico: "locked", name: "30-day Streak" },
  ];
  return (
    <div className="app-card">
      <div className="app-card-head">
        <h4>Achievements</h4>
        <span className="sub">1 of 24 unlocked</span>
      </div>
      <div className="ach-row">
        {badges.map((b, i) => (
          <div key={i} className={`ach ${b.tier}`}>
            <span className="medal"><GameIcon name={b.ico} size={24} /></span>
            <span className="nm">{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
