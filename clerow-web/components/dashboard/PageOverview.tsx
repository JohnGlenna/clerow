"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { GameIcon, type GameIconName } from "../GameIcon";
import { MascotClerow } from "../Mascot";
import { PageHead } from "./AppShell";
import { ClimbCard } from "./ClimbCard";
import { TaskModal, NextMoveHero, type NextMove } from "./TaskModal";
import { useDashboard } from "@/lib/useDashboard";
import { modelStatus, METRIC_HELP } from "@/lib/modelStatus";
import type {
  DashboardData,
  DashboardModel,
  DashboardCompetitor,
  DashboardTask,
  ScanSynthesis,
} from "@/lib/types";
import type { SourceRow } from "@/app/api/sources/route";

// Compact source roll-up the Overview summary row shows. Mirrors the headline
// stats on the Sources page so the dashboard reflects that page at a glance.
type SourceSummary = { cited: number; yours: number; gaps: number };

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

  // Clicking a task (in the Climb card or the "next move" hero) opens a centered
  // modal; `mcp` jumps straight into the Clerow MCP hand-off view.
  const [selected, setSelected] = React.useState<{ task: DashboardTask; mcp: boolean } | null>(null);
  const openTask = React.useCallback((task: DashboardTask, mcp = false) => setSelected({ task, mcp }), []);

  // Toggle a task done/undone from the modal, then refresh so the ladder + hero
  // recompute. (ClimbCard keeps its own optimistic tickbox toggle for inline use.)
  const toggleTask = React.useCallback(
    async (id: string) => {
      const t = data?.tasks?.find((x) => x.id === id);
      try {
        await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, done: !(t?.done ?? false) }),
        });
        refresh();
      } catch {
        /* network error — leave state as-is */
      }
    },
    [data?.tasks, refresh],
  );

  // "Your next move" — first unfinished task in the active Climb level.
  const nextMove = React.useMemo<NextMove | null>(() => {
    const lvl = data?.ladder?.levels.find((l) => l.state === "active");
    const lt = lvl?.tasks.find((t) => t.id && !t.done);
    if (!lvl || !lt) return null;
    return {
      task: { id: lt.id!, title: lt.title, meta: lt.meta, xp: lt.xp, done: lt.done, detail: lt.detail, channel: lt.channel },
      levelLabel: `Level ${lvl.level} · ${lvl.title}`,
      stepLabel: `Step ${lvl.tasks.filter((t) => t.done).length + 1} of ${lvl.total}`,
    };
  }, [data?.ladder]);

  // In-place re-scan: re-query the models from the dashboard instead of bouncing
  // back through onboarding. Subscription/budget gated by the API (402).
  const [rescanning, setRescanning] = React.useState(false);
  const rescan = async () => {
    if (rescanning) return;
    setRescanning(true);
    try {
      const res = await fetch("/api/scan/rescan", { method: "POST" });
      if (res.status === 402) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "You're out of scans this month. Upgrade for more.");
        return;
      }
      if (!res.ok) {
        alert("Re-scan failed. Try again in a moment.");
        return;
      }
      refresh();
    } catch {
      alert("Re-scan failed. Try again in a moment.");
    } finally {
      setRescanning(false);
    }
  };

  // The Sources page derives its own data from /api/sources (citations across
  // scans), so it isn't in the shared dashboard payload — pull a roll-up here
  // for the summary row, once the brand has actually scanned.
  const [sources, setSources] = React.useState<SourceSummary | null>(null);
  const hasScan = data?.hasScan ?? false;
  React.useEffect(() => {
    if (!hasScan) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/sources", { cache: "no-store" });
      const json = await res.json().catch(() => ({ sources: [] }));
      if (cancelled) return;
      const rows: SourceRow[] = json.sources ?? [];
      setSources({
        cited: rows.length,
        yours: rows.filter((s) => s.isYours).length,
        gaps: rows.filter((s) => !s.isYours && s.xp > 0).length,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [hasScan]);

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
              onClick={rescan}
              disabled={rescanning}
            >
              <Icon name="bolt" size={14} />
              {rescanning ? "Re-scanning…" : "Re-scan now"}
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
          {nextMove && <NextMoveHero move={nextMove} onOpen={openTask} />}
          {data.ladder && (
            <ClimbCard
              ladder={data.ladder}
              onNavigate={navigate}
              onChanged={refresh}
              onRescan={rescan}
              rescanning={rescanning}
              onOpenTask={openTask}
            />
          )}
          <ScoreCard score={data.score} trend={data.trend} />
          {data.synthesis && <SynthesisCard synthesis={data.synthesis} />}
          <PageSummary data={data} sources={sources} onNavigate={navigate} />
          <div className="app-grid">
            <ModelsCard models={data.models ?? []} onNavigate={navigate} />
            <CompetitorsCard competitors={data.competitors ?? []} onNavigate={navigate} />
          </div>
          <AchievementsCard />
        </>
      )}

      {selected && (
        <TaskModal
          task={selected.task}
          startMcp={selected.mcp}
          brandUrl={data?.brand?.url ?? null}
          onToggle={toggleTask}
          onClose={() => setSelected(null)}
        />
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

// A compact row of clickable cards that mirror the headline numbers from each
// workspace page (Quests / Prompts / Sources), so the Overview reflects "where
// you stand" on every page without leaving it. Clicking a card opens that page.
function PageSummary({
  data,
  sources,
  onNavigate,
}: {
  data: DashboardData;
  sources: SourceSummary | null;
  onNavigate: (k: string) => void;
}) {
  const tasks = data.tasks ?? [];
  const questsReady = tasks.filter((t) => !t.done).length;
  const questsDone = tasks.filter((t) => t.done).length;
  const streak = data.streak?.current ?? 0;

  const prompts = data.prompts ?? [];
  const tracked = prompts.length;
  const scanned = prompts.filter((p) => p.scanned).length;

  return (
    <div className="overview-summary">
      <SummaryCard
        ico="swords"
        title="Quests"
        onNavigate={() => onNavigate("quests")}
        stats={[
          { v: String(questsReady), l: "Ready" },
          { v: String(questsDone), l: "Done", c: "var(--success)" },
          { v: String(streak), l: "Day streak", c: "var(--streak)" },
        ]}
      />
      <SummaryCard
        ico="target"
        title="Prompts"
        onNavigate={() => onNavigate("prompts")}
        stats={[
          { v: String(tracked), l: "Tracked" },
          { v: String(scanned), l: "Scanned", c: "var(--success)" },
        ]}
      />
      <SummaryCard
        ico="world"
        title="Sources"
        onNavigate={() => onNavigate("sources")}
        stats={
          sources
            ? [
                { v: String(sources.cited), l: "Cited" },
                { v: String(sources.yours), l: "You appear", c: sources.yours ? "var(--success)" : undefined },
                { v: String(sources.gaps), l: "Gaps", c: sources.gaps ? "var(--danger)" : undefined },
              ]
            : [
                { v: "…", l: "Cited" },
                { v: "…", l: "You appear" },
                { v: "…", l: "Gaps" },
              ]
        }
      />
    </div>
  );
}

function SummaryCard({
  ico,
  title,
  stats,
  onNavigate,
}: {
  ico: GameIconName;
  title: string;
  stats: { v: string; l: string; c?: string }[];
  onNavigate: () => void;
}) {
  return (
    <button type="button" className="summary-card" onClick={onNavigate}>
      <div className="summary-card-head">
        <span className="summary-card-ico"><GameIcon name={ico} size={18} /></span>
        <span className="summary-card-title">{title}</span>
        <span className="summary-card-link">View →</span>
      </div>
      <div className="summary-card-stats">
        {stats.map((s) => (
          <div key={s.l} className="summary-stat">
            <b style={s.c ? { color: s.c } : undefined}>{s.v}</b>
            <span>{s.l}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

// "What all the AIs collectively think" — the master-AI synthesis over every
// engine's answer. A narrative layer above the numeric score: the collective
// verdict, where engines agree/diverge, and the single highest-leverage move.
function SynthesisCard({ synthesis }: { synthesis: ScanSynthesis }) {
  return (
    <div className="app-card">
      <div className="app-card-head">
        <h4>
          <span className="climb-title-ico"><GameIcon name="brain" size={18} /></span> What the AIs collectively think
        </h4>
        <span className="sub">across every model that scanned you</span>
      </div>
      {synthesis.verdict && <p style={{ margin: "4px 0 14px", lineHeight: 1.5 }}>{synthesis.verdict}</p>}
      <div className="app-grid">
        {synthesis.consensus && (
          <div className="synth-block">
            <div className="synth-label"><Icon name="check" size={13} /> They agree on</div>
            <p>{synthesis.consensus}</p>
          </div>
        )}
        {synthesis.divergence && (
          <div className="synth-block">
            <div className="synth-label"><Icon name="target" size={13} /> Where they differ</div>
            <p>{synthesis.divergence}</p>
          </div>
        )}
      </div>
      {synthesis.bestFix && (
        <div className="synth-bestfix">
          <span className="synth-bestfix-tag"><Icon name="bolt" size={13} /> Your highest-leverage move</span>
          <p>{synthesis.bestFix}</p>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ score, trend }: { score?: DashboardData["score"]; trend?: DashboardData["trend"] }) {
  const overall = score?.overall ?? 0;
  const visibility = score?.visibility ?? 0;
  const position = score?.position ?? null;
  const sentiment = score?.sentiment ?? 0;
  return (
    <div className="app-card app-card--score">
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
        <TrendBlock trend={trend} />
      </div>
    </div>
  );
}

// "Since last scan" delta + a tiny sparkline of recent overall scores. Hides
// until there are at least two snapshots to compare (delta != null).
function TrendBlock({ trend }: { trend?: DashboardData["trend"] }) {
  if (!trend || trend.delta == null) return null;
  const up = trend.delta > 0;
  const flat = trend.delta === 0;
  const color = flat ? "#A8A8A8" : up ? "#58CC02" : "#E11D48";
  const arrow = flat ? "–" : up ? "▲" : "▼";
  return (
    <div className="score-trend">
      <span className="score-trend-delta" style={{ color }}>
        {arrow} {flat ? "0" : `${up ? "+" : ""}${trend.delta}`}
      </span>
      <span className="score-trend-label">vs previous scan</span>
      <Sparkline values={trend.sparkline} color={color} />
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 96;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="score-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScoreRing({ value, size = 104 }: { value: number; size?: number }) {
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
        {models.map((m) => {
          const status = modelStatus(m);
          return (
            <div key={m.id} className="model-row model-row--rich">
              <span className="model-icon" style={{ background: m.swatch }}>{m.letter}</span>
              <div className="mr-main">
                <div className="mr-top">
                  <b>{m.label}</b>
                  {m.locked ? (
                    <span className="pos-pill" style={{ opacity: 0.7 }}>🔒 Upgrade</span>
                  ) : (
                    <span className="mr-metrics">
                      {m.position != null && <span className="pos-pill">#{m.position}</span>}
                      <span title={METRIC_HELP.visibility}>{m.visibility != null ? `${m.visibility}%` : "—"}</span>
                    </span>
                  )}
                </div>
                <div className={`mr-status mr-${status.tone}`}>{status.text}</div>
              </div>
            </div>
          );
        })}
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
