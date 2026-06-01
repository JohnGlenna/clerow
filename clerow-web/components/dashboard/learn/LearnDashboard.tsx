"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MascotClerow } from "../../Mascot";
import { PixelProgress } from "../../ui/PixelProgress";
import { AiIcon } from "../../ui/AiIcon";
import { DashPrompts, DashModels, DashLeaderboard, DashProfile, DashConnect } from "./LearnPages";
import { ScanProgress } from "../../scan/ScanProgress";
import { DashboardProvider, useDashboard } from "@/lib/useDashboard";
import { useScanStream } from "@/lib/useScanStream";
import { startCheckout } from "@/lib/useSubscription";
import { playCheck } from "@/lib/sound";
import type { DashboardData, DashboardModel, LadderLevel, LadderTask } from "@/lib/types";

type Page = "learn" | "prompts" | "models" | "leaderboard" | "profile" | "connect";

type SheetTask = {
  kind: "task" | "mcp" | "checkpoint";
  id: string | null;
  promptId?: string | null; // when the lesson is for a tracked prompt (Prompts page → Fix)
  title: string;
  why: string;
  xp: number;
};

/* ---------------- icons ---------------- */
function LDIcon({ name }: { name: string }) {
  const p = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "learn": return (<svg {...p}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>);
    case "quest": return (<svg {...p}><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M3 12h18M12 8v12" /></svg>);
    case "scan": return (<svg {...p}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /></svg>);
    case "board": return (<svg {...p}><path d="M6 4h12v3a6 6 0 0 1-12 0z" /><path d="M9 20h6M12 13v7" /></svg>);
    case "profile": return (<svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></svg>);
    case "connect": return (<svg {...p}><path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 0 1 0 10h-2" /><path d="M8 12h8" /></svg>);
    case "book": return (<svg {...p}><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" /><path d="M8 7h7M8 11h7" /></svg>);
    case "lock": return (<svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
    default: return null;
  }
}

const NAV: { k: Page; i: string; l: string }[] = [
  { k: "learn", i: "learn", l: "Tasks" },
  { k: "prompts", i: "quest", l: "Prompts" },
  { k: "models", i: "scan", l: "AI Models" },
  { k: "leaderboard", i: "board", l: "Leaderboard" },
  { k: "connect", i: "connect", l: "Connect" },
  { k: "profile", i: "profile", l: "Profile" },
];

function LearnNav({ page, onNav }: { page: Page; onNav: (p: Page) => void }) {
  return (
    <nav className="ld-nav">
      <div className="ld-brand"><MascotClerow size={34} /><span>Clerow</span></div>
      {NAV.map((it) => (
        <button key={it.k} className={`ld-navitem ${page === it.k ? "on" : ""}`} onClick={() => onNav(it.k)}>
          <span className="ic"><LDIcon name={it.i} /></span><span>{it.l}</span>
        </button>
      ))}
      <div className="ld-nav-spacer" />
    </nav>
  );
}

function domainOf(url?: string) {
  if (!url) return "your site";
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

function LearnTop({ data }: { data: DashboardData }) {
  const models = data.models ?? [];
  return (
    <div className="ld-top">
      <div className="dom">
        <MascotClerow size={26} /> {domainOf(data.brand?.url)}
        <span className="mono">· scanned across</span>
        <span className="model-cluster">
          {models.map((m) => <span key={m.id} className="mc" style={{ background: "#fff" }}><AiIcon id={m.id} size={16} letter={m.letter} /></span>)}
        </span>
      </div>
      <span className="stat-pill streak"><span className="ic">🔥</span>{data.streak?.current ?? 0}</span>
      <span className="stat-pill xp"><span className="ic">💎</span>{data.xp?.total ?? 0}</span>
      <span className="stat-pill heart" title="Scans left this month"><span className="ic">📊</span>{data.scansLeft ?? 0}</span>
    </div>
  );
}

/* ---------------- the path ---------------- */
function PathNode({ kind, icon, cap, xp, start, mascot, onClick }: {
  kind: string; icon: React.ReactNode; cap: string; xp?: number | null; start?: boolean; mascot?: boolean; onClick?: () => void;
}) {
  return (
    <div className="node-row">
      <div className={`node ${kind}`}>
        {start && <span className="start-bubble">Start</span>}
        <button className="node-btn" onClick={onClick} disabled={!onClick}>{icon}</button>
        {cap && <span className="node-cap">{cap}</span>}
        {xp != null && <span className="node-xp">{kind === "done" ? "✓ earned" : `+${xp} XP`}</span>}
        {mascot && <span className="node-mascot"><MascotClerow size={56} float /></span>}
      </div>
    </div>
  );
}

/* A 2-column grid of nodes with dotted SVG connectors snaking between them. */
function PathGrid({ nodeCount, children }: { nodeCount: number; children: React.ReactNode }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [paths, setPaths] = React.useState<string[]>([]);
  const [dim, setDim] = React.useState({ w: 0, h: 0 });

  React.useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const draw = () => {
      const wr = wrap.getBoundingClientRect();
      const btns = Array.from(wrap.querySelectorAll(".node-btn")).map((b) => {
        const r = (b as HTMLElement).getBoundingClientRect();
        return { l: r.left - wr.left, t: r.top - wr.top, w: r.width, h: r.height,
          cx: r.left - wr.left + r.width / 2, cy: r.top - wr.top + r.height / 2 };
      });
      const out: string[] = [];
      for (let i = 0; i < btns.length - 1; i++) {
        const a = btns[i], b = btns[i + 1];
        const sameRow = Math.abs(a.cy - b.cy) < 24;
        if (sameRow) {
          const lr = a.cx < b.cx ? [a, b] : [b, a];
          out.push(`M ${lr[0].l + lr[0].w + 6} ${a.cy} L ${lr[1].l - 6} ${b.cy}`);
        } else {
          const dy = b.t - (a.t + a.h);
          out.push(`M ${a.cx} ${a.t + a.h + 6} C ${a.cx} ${a.t + a.h + dy * 0.6}, ${b.cx} ${b.t - dy * 0.6}, ${b.cx} ${b.t - 6}`);
        }
      }
      setDim({ w: wr.width, h: wr.height });
      setPaths(out);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    window.addEventListener("resize", draw);
    return () => { ro.disconnect(); window.removeEventListener("resize", draw); };
  }, [nodeCount]);

  return (
    <div className="path-wrap" ref={wrapRef}>
      <svg className="path-flow" width={dim.w} height={dim.h} viewBox={`0 0 ${dim.w} ${dim.h}`} aria-hidden="true">
        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#34525e" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 11" />
        ))}
      </svg>
      {children}
    </div>
  );
}

function LearnPath({ data, subscribed, onOpen, onUpgrade }: {
  data: DashboardData; subscribed: boolean; onOpen: (t: SheetTask) => void; onUpgrade: () => void;
}) {
  const ladder = data.ladder;
  if (!ladder) return <div className="ld-path" style={{ color: "var(--ink-2)" }}>Run a scan to start your climb.</div>;

  return (
    <div className="ld-path">
      {ladder.levels.map((lvl: LadderLevel, li: number) => {
        const active = lvl.state === "active";
        const locked = lvl.state === "locked";
        // First unresolved task in the active level is "current".
        const firstCurrent = active ? lvl.tasks.findIndex((t) => !t.resolved) : -1;
        // Active level gets dotted connectors + the MCP / scan nodes; locked levels stay a plain grid.
        const taskNodes = lvl.tasks.map((t: LadderTask, ti: number) => {
          const kind = t.resolved ? "done" : active && ti === firstCurrent ? "current" : "locked";
          const clickable = (kind === "done" || kind === "current") && !!t.id;
          return (
            <PathNode
              key={t.key}
              kind={kind}
              icon={kind === "done" ? "✓" : kind === "locked" ? <LDIcon name="lock" /> : "①"}
              cap={t.title}
              xp={t.xp}
              start={kind === "current" && ti === firstCurrent}
              mascot={kind === "current" && ti === firstCurrent}
              onClick={clickable ? () => onOpen({ kind: "task", id: t.id, title: t.title, why: t.detail, xp: t.xp }) : undefined}
            />
          );
        });
        const tailNodes = active ? [
          <PathNode key="__mcp" kind="mcp" icon="🤖" cap="Auto-fix the rest with Clerow MCP"
            onClick={() => onOpen({ kind: "mcp", id: null, title: "Let Clerow MCP fix everything", why: "Connect Clerow to Claude Code, Cursor, or any agent. It reads your open quests, ships the fixes as a PR, and Clerow re-checks every model.", xp: 0 })} />,
          <PathNode key="__scan" kind="scanbtn" icon={<LDIcon name="lock" />} cap="Scan & unlock Level 2" xp={null}
            onClick={subscribed
              ? () => onOpen({ kind: "checkpoint", id: null, title: "Re-scan across your AI models", why: "Re-scan to bank your gains and reveal the next fixes. This is the part one chatbot can't do — Clerow queries every model.", xp: 0 })
              : onUpgrade} />,
        ] : [];
        const nodes = [...taskNodes, ...tailNodes];

        return (
          <React.Fragment key={lvl.level}>
            {li > 0 && <div className="unit-sep">Level {lvl.level}</div>}
            <div className={`unit-banner ${locked ? "locked" : ""}`}>
              <div>
                <div className="k">Level {lvl.level}{active ? " · in progress" : locked ? " · locked" : " · done"}</div>
                <h3>{lvl.title}</h3>
              </div>
              {locked
                ? <button className="unit-guide" onClick={onUpgrade}><LDIcon name="lock" /> Locked</button>
                : <button className="unit-guide" disabled><LDIcon name="book" /> Guide</button>}
            </div>
            {active
              ? <PathGrid nodeCount={nodes.length}>{nodes}</PathGrid>
              : <div className="path-wrap">{nodes}</div>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ---------------- right rail ---------------- */
function LearnRail({ data, onUpgrade }: { data: DashboardData; onUpgrade: () => void }) {
  const router = useRouter();
  const models = data.models ?? [];
  return (
    <aside className="ld-rail">
      <div className="rail-card">
        <h4>Scanned across {models.length} AIs</h4>
        <p className="sub">Each model cites differently. One chatbot can&apos;t see the others — Clerow watches all of them.</p>
        <div className="rail-models">
          {models.map((m: DashboardModel) => (
            <div key={m.id} className="rail-model">
              <span className="mc" style={{ background: "#fff" }}><AiIcon id={m.id} size={16} letter={m.letter} /></span>{m.label}
              <span className={`st ${m.visibility ? "ok" : "no"}`}>{m.locked ? "🔒" : m.visibility != null ? `${m.visibility}%` : "—"}</span>
            </div>
          ))}
        </div>
        <div className="rail-note"><b>Why Clerow &gt; just asking Claude:</b> Claude can&apos;t tell you how ChatGPT or Perplexity rank you. Clerow can.</div>
      </div>

      {!data.subscribed && (
        <div className="upg-card">
          <div className="upg-head">
            <span className="upg-tag">⭐ Founder plan</span>
            <span className="upg-price"><b>$29</b>/mo</span>
          </div>
          <h4>Unlock every level &amp; all 5 models</h4>
          <ul className="upg-list">
            <li>✓ All quest levels &amp; re-scans</li>
            <li>✓ Gemini + Grok tracking</li>
            <li>✓ Leaderboard &amp; weekly reports</li>
          </ul>
          <button className="btn-upg" onClick={onUpgrade}>Upgrade — $29/mo</button>
        </div>
      )}

      <div className="mcp-card">
        <span className="mcp-tag">⚡ Clerow MCP</span>
        <h4>Let your AI do the work</h4>
        <p>Plug Clerow into Claude Code, Cursor or any agent. It ships the fixes — Clerow verifies across every model.</p>
        <button className="btn-violet" onClick={() => router.push("/dashboard/connect")}>Connect MCP</button>
      </div>

      <div className="rail-card">
        <h4>Daily quests</h4>
        <div className="rail-mini-q"><span className="qc">⚡</span><span className="qt">Clear 1 task today</span><span className="qx">+10</span></div>
        <div className="rail-bar"><i style={{ width: `${data.streak?.activeToday ? 100 : 0}%` }} /></div>
        <div className="rail-mini-q" style={{ borderBottom: 0, marginTop: 6 }}><span className="qc">🔥</span><span className="qt">Keep your {data.streak?.current ?? 0}-day streak</span><span className="qx">+5</span></div>
      </div>

      <div className="rail-card rail-super">
        <span className="rail-lock"><LDIcon name="lock" /></span>
        <div>
          <h4 style={{ margin: 0 }}>Unlock the leaderboard</h4>
          <p className="sub" style={{ margin: "4px 0 0" }}>Clear Level 1 to start competing in your category.</p>
        </div>
      </div>
    </aside>
  );
}

/* ---------------- upgrade popup ---------------- */
function UpgradeSheet({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="share-pop-back" onClick={onClose}>
      <div className="upg-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="lesson-x upg-x" onClick={onClose}>✕</button>
        <div className="upg-sheet-ic">⭐</div>
        <h2>Unlock the rest of your path</h2>
        <p className="upg-sheet-sub">You&apos;ve cleared the free quick wins. Go Founder to unlock every level, re-scans across all 5 models, the leaderboard &amp; weekly reports.</p>
        <div className="upg-price-big"><b>$29</b><span>/month</span></div>
        <ul className="upg-sheet-list">
          <li><span className="ck">✓</span> All quest levels — Structure, Content, Authority</li>
          <li><span className="ck">✓</span> Daily re-scans across ChatGPT, Claude, Perplexity, Gemini &amp; Grok</li>
          <li><span className="ck">✓</span> Category leaderboard &amp; weekly progress reports</li>
          <li><span className="ck">✓</span> Clerow MCP autopilot</li>
        </ul>
        <button className="btn-upg btn-upg--lg" disabled={busy}
          onClick={async () => { setBusy(true); try { await startCheckout("founder"); } finally { setBusy(false); } }}>
          {busy ? "…" : "Upgrade to Founder — $29/mo"}
        </button>
        <button className="upg-later" onClick={onClose}>Maybe later</button>
      </div>
    </div>
  );
}

/* ---------------- lesson sheet ---------------- */
function LessonSheet({ task, modelCount, onClose, onChanged }: { task: SheetTask; modelCount: number; onClose: () => void; onChanged: () => void }) {
  const [sel, setSel] = React.useState<"diy" | "mcp" | "rescan" | null>(task.kind === "mcp" ? "mcp" : task.kind === "checkpoint" ? "rescan" : null);
  const [view, setView] = React.useState<"choose" | "steps" | "share" | "scanning" | "done">("choose");
  const [content, setContent] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const scan = useScanStream();

  const cmd = `Clerow: read my open Clerow tasks and ship "${task.title}" as a PR, then re-check all my AI models when done.`;

  const loadContent = async () => {
    setBusy(true);
    setView("steps");
    try {
      let res: Response | null = null;
      if (task.promptId) {
        // Prompt lesson: rebuild the prompt's playbook, then generate its top step.
        const detail = await fetch(`/api/prompts/${task.promptId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        const stepId = detail?.steps?.[0]?.id;
        if (!stepId) { setContent("Scan this prompt across your models first, then we can generate the fix."); return; }
        res = await fetch(`/api/prompts/${task.promptId}/content`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ stepId }) });
      } else if (task.id) {
        res = await fetch(`/api/tasks/${task.id}/content`, { method: "POST" });
      } else {
        setContent("We'll have a guide here shortly.");
        return;
      }
      const json = await res.json().catch(() => ({}));
      setContent(typeof json.content === "string" ? json.content : json.error || "Couldn't generate content.");
    } catch {
      setContent("Couldn't generate content. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const markDone = async () => {
    if (task.id) {
      playCheck();
      await fetch("/api/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: task.id, done: true }) }).catch(() => {});
    }
    setView("done");
  };

  const skip = async () => {
    if (task.id) {
      await fetch("/api/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: task.id, archived: true }) }).catch(() => {});
    }
    onChanged();
    onClose();
  };

  const rescan = async () => {
    // Switch to the live view and stream per-model progress as each AI model runs.
    setView("scanning");
    const outcome = await scan.run("/api/scan/rescan");
    if (!outcome.ok) {
      if (outcome.status === 402) alert(outcome.error || "You're out of scans this month.");
      else if (outcome.status === 429) alert(outcome.error || "A scan is already running — give it a moment.");
      else alert(outcome.error || "Re-scan failed. Try again.");
      setView("choose");
      return;
    }
    setView("done");
  };

  const close = () => { onChanged(); onClose(); };

  // Live re-scan: every model ticks queued → querying → reading → result in parallel.
  if (view === "scanning") {
    const total = scan.engines.length || 1;
    const finished = scan.engines.filter((e) => e.status === "done" || e.status === "failed").length;
    const pct = Math.round((finished / total) * 100);
    return (
      <div className="sheet-back">
        <div className="lesson-top"><button className="lesson-x" onClick={close}>✕</button><div style={{ flex: 1 }}><PixelProgress value={pct} /></div><span className="lesson-heart">📡 Live</span></div>
        <div className="lesson-body"><div className="lesson-inner">
          <div className="lesson-tag"><span className="dot">🚩</span>Re-scanning</div>
          <h1 className="lesson-h">Querying your AI models…</h1>
          <p className="lesson-why">Watch each model answer in real time — your score updates the moment they all finish.</p>
          <ScanProgress engines={scan.engines} elapsedMs={scan.elapsedMs} showOrbit={false} />
        </div></div>
      </div>
    );
  }

  if (view === "done") {
    const overall = scan.result && "score" in scan.result ? scan.result.score.overall : null;
    return (
      <div className="sheet-back">
        <div className="lesson-top"><button className="lesson-x" onClick={close}>✕</button><div style={{ flex: 1 }}><PixelProgress value={100} /></div></div>
        <div className="done-toast"><div className="done-toast-in">
          <div className="done-check">✓</div>
          <div>
            <div className="dt-t">{task.kind === "checkpoint" ? "Models re-scanned ✓" : "Nice! Quest cleared"}</div>
            <div className="dt-s">{task.kind === "checkpoint" ? (overall != null ? `Your visibility score is now ${overall}.` : "Your score has been updated across every model.") : `+${task.xp || 20} XP · streak kept 🔥`}</div>
          </div>
          <button className="btn-check" onClick={close}>Continue</button>
        </div></div>
      </div>
    );
  }

  if (view === "steps") {
    const canCopy = !busy && !!content;
    const copyContent = () => { if (!canCopy) return; navigator.clipboard?.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1600); };
    return (
      <div className="sheet-back">
        <div className="lesson-top"><button className="lesson-x" onClick={close}>✕</button><div style={{ flex: 1 }}><PixelProgress value={80} /></div><span className="lesson-heart">🛠️ DIY</span></div>
        <div className="lesson-body lesson-body--steps"><div className="lesson-inner lesson-inner--steps">
          <div className="lesson-tag"><span className="dot">✦</span>Copy-ready fix</div>
          <h1 className="lesson-h">{task.title}</h1>
          <div className="lesson-code">
            <button className="lesson-copy" onClick={copyContent} disabled={!canCopy}>
              <span className="lc-ic">{copied ? "✓" : "⧉"}</span>{copied ? "Copied" : "Copy"}
            </button>
            <pre className="lesson-content">{busy ? "Generating your content…" : content}</pre>
          </div>
        </div></div>
        <div className="lesson-foot"><div className="lesson-foot-in">
          <button className="btn-skip" onClick={() => setView("choose")}>← Back</button>
          <button className="btn-check" onClick={markDone}>Mark done ✓</button>
        </div></div>
      </div>
    );
  }

  const sharePop = view === "share" ? (
    <div className="share-pop-back" onClick={() => setView("choose")}>
      <div className="share-pop" onClick={(e) => e.stopPropagation()}>
        <div className="sp-ic">🤖</div>
        <h3>Share with your AI agent</h3>
        <p className="sp-sub">Paste this into Claude Code, Cursor, or any agent connected to Clerow MCP.</p>
        <div className="share-box">{cmd}</div>
        <button className="btn-violet" onClick={() => { navigator.clipboard?.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>{copied ? "Copied ✓" : "Copy command"}</button>
        <button className="sp-manual" onClick={markDone}>I&apos;ll mark it done</button>
      </div>
    </div>
  ) : null;

  const footLabel = sel === "diy" ? "See the fix" : sel === "mcp" ? "Share with AI" : sel === "rescan" ? "Re-scan now" : "Continue";
  const onFoot = () => {
    if (sel === "diy") loadContent();
    else if (sel === "mcp") setView("share");
    else if (sel === "rescan") rescan();
  };

  return (
    <div className="sheet-back">
      <div className="lesson-top"><button className="lesson-x" onClick={close}>✕</button><div style={{ flex: 1 }}><PixelProgress value={55} /></div><span className="lesson-heart">📊 {modelCount} models</span></div>
      <div className="lesson-body"><div className="lesson-inner">
        <div className="lesson-tag"><span className="dot">{task.kind === "mcp" ? "⚡" : task.kind === "checkpoint" ? "🚩" : "✓"}</span>{task.kind === "checkpoint" ? "Checkpoint" : task.kind === "mcp" ? "Autopilot" : "Fix"}</div>
        <h1 className="lesson-h">{task.title}</h1>
        <p className="lesson-why">{task.why}</p>

        {task.kind === "checkpoint" ? (
          <button className={`opt ${sel === "rescan" ? "on" : ""}`} onClick={() => setSel("rescan")}>
            <span className="oic">🚩</span>
            <div><div className="ot">Re-scan now</div><div className="od">Clerow re-queries all your AI models and recomputes your score. ~60s.</div></div>
          </button>
        ) : task.kind === "mcp" ? (
          <button className="opt violet on" onClick={() => setSel("mcp")}>
            <span className="oic">🤖</span>
            <div><div className="ot">Connect Clerow MCP</div><div className="od">Your agent reads every open quest and ships the fixes. Clerow verifies across all models.</div></div>
            <span className="obadge">Autopilot</span>
          </button>
        ) : (
          <>
            <div className="lesson-choose">How do you want to fix this?</div>
            <button className={`opt ${sel === "diy" ? "on" : ""}`} onClick={() => setSel("diy")}>
              <span className="onum">1</span><span className="oic">🛠️</span>
              <div><div className="ot">I&apos;ll do it myself</div><div className="od">Get the copy-paste-ready fix tailored to your brand.</div></div>
            </button>
            <button className={`opt violet ${sel === "mcp" ? "on" : ""}`} onClick={() => setSel("mcp")}>
              <span className="onum">2</span><span className="oic">🤖</span>
              <div><div className="ot">Let Clerow MCP do it</div><div className="od">Share a command with your AI agent — it ships the fix, Clerow re-checks every model.</div></div>
              <span className="obadge">Autopilot</span>
            </button>
          </>
        )}
      </div></div>
      <div className="lesson-foot"><div className="lesson-foot-in">
        <button className="btn-skip" onClick={skip}>Skip</button>
        <button className="btn-check" disabled={!sel || busy} onClick={onFoot}>{busy ? "…" : footLabel}</button>
      </div></div>
      {sharePop}
    </div>
  );
}

/* ---------------- shell ---------------- */
function LearnInner({ initialPage = "learn" }: { initialPage?: Page }) {
  const { data, loading, refresh } = useDashboard();
  const [task, setTask] = React.useState<SheetTask | null>(null);
  const [page, setPage] = React.useState<Page>(initialPage);
  const [upgrade, setUpgrade] = React.useState(false);
  const toLearn = () => setPage("learn");
  const hasRail = page === "learn";

  return (
    <div className="ld-root">
      <div className={`ld-shell ${hasRail ? "" : "ld-shell--norail"}`}>
        <LearnNav page={page} onNav={setPage} />
        <div className="ld-center">
          {data && <LearnTop data={data} />}
          {loading && !data ? (
            <div className="ld-path" style={{ color: "var(--ink-2)" }}>Loading…</div>
          ) : data ? (
            <>
              {page === "learn" && <LearnPath data={data} subscribed={!!data.subscribed} onOpen={setTask} onUpgrade={() => setUpgrade(true)} />}
              {page === "prompts" && (
                <DashPrompts
                  data={data}
                  onFix={(p) =>
                    setTask({
                      kind: "task",
                      id: null,
                      promptId: p.id,
                      title: `Win the query: "${p.text}"`,
                      why: "Ship a focused page that answers this query and names you as a top option, then get it cited — Clerow generates the draft for you.",
                      xp: 60,
                    })
                  }
                />
              )}
              {page === "models" && <DashModels data={data} onLearn={toLearn} />}
              {page === "leaderboard" && <DashLeaderboard data={data} />}
              {page === "connect" && <DashConnect />}
              {page === "profile" && <DashProfile data={data} />}
            </>
          ) : null}
        </div>
        {data && hasRail && <LearnRail data={data} onUpgrade={() => setUpgrade(true)} />}
      </div>
      {task && <LessonSheet task={task} modelCount={data?.models?.length ?? 0} onClose={() => setTask(null)} onChanged={refresh} />}
      {upgrade && <UpgradeSheet onClose={() => setUpgrade(false)} />}
    </div>
  );
}

export function LearnDashboard({ initialPage }: { initialPage?: Page } = {}) {
  return (
    <DashboardProvider>
      <LearnInner initialPage={initialPage} />
    </DashboardProvider>
  );
}
