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
import type { DashboardData, DashboardModel, LadderLevel, LadderTask, Channel } from "@/lib/types";

type Page = "learn" | "prompts" | "models" | "leaderboard" | "profile" | "connect";

type SheetTask = {
  kind: "task" | "mcp" | "checkpoint";
  id: string | null;
  promptId?: string | null; // when the lesson is for a tracked prompt (Prompts page → Fix)
  channel?: Channel; // onsite (MCP-doable) vs offsite (manual — Clerow drafts the copy)
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

// Deterministic chip color for a competitor in the placement card — stable across
// renders (the scan doesn't carry per-brand colors, so we hash the name).
const RANK_SWATCHES = ["#FF7A45", "#3D7BFF", "#7C3AED", "#10A37F", "#E0457B", "#D97706", "#0EA5E9", "#475569"];
function swatchFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return RANK_SWATCHES[h % RANK_SWATCHES.length];
}

// Best-effort domain for a brand's logo. We have the exact URL for the user's own
// brand; for competitors the scan only stores a name, so we guess `<name>.com`.
function logoDomain(name: string, isYou: boolean, ownUrl?: string): string | null {
  if (isYou) return ownUrl ? domainOf(ownUrl) : null;
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return slug ? `${slug}.com` : null;
}

// A brand's logo via Clearbit, falling back to a colored initial chip when the
// logo 404s (unknown/guessed domain) — so the row always renders cleanly.
function BrandLogo({ name, domain, color }: { name: string; domain: string | null; color: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <span className="mc" style={{ background: ok ? "#fff" : color }}>
      {domain && (
        <img
          src={`https://logo.clearbit.com/${domain}`}
          alt=""
          onLoad={() => setOk(true)}
          onError={() => setOk(false)}
          style={{ display: ok ? "block" : "none" }}
        />
      )}
      {!ok && name.charAt(0).toUpperCase()}
    </span>
  );
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
      {data.score && (
        <span className="stat-pill score" title="Your AI visibility score (from your latest scan)"><span className="ic">📈</span>{data.score.overall}</span>
      )}
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

function LearnPath({ data, subscribed, onOpen, onUpgrade, onUnlock, unlocking, hasFullScan, onNeedFullScan }: {
  data: DashboardData; subscribed: boolean; onOpen: (t: SheetTask) => void; onUpgrade: () => void;
  onUnlock: (level: number) => void; unlocking: number | null;
  hasFullScan: boolean; onNeedFullScan: () => void;
}) {
  const ladder = data.ladder;
  if (!ladder) return <div className="ld-path" style={{ color: "var(--ink-2)" }}>Run a scan to start your climb.</div>;

  return (
    <div className="ld-path">
      {ladder.levels.map((lvl: LadderLevel, li: number) => {
        const active = lvl.state === "active";
        const open = lvl.state === "open"; // unlocked ahead — tasks visible/actionable
        const locked = lvl.state === "locked";
        const showTasks = active || open;
        // First unresolved task in the active level is "current" (the one nudge).
        const firstCurrent = active ? lvl.tasks.findIndex((t) => !t.resolved) : -1;
        // Active + open levels get dotted connectors + clickable tasks; done/locked stay a plain grid.
        const taskNodes = lvl.tasks.map((t: LadderTask, ti: number) => {
          const kind = t.resolved
            ? "done"
            : active && ti === firstCurrent
              ? "current"
              : open
                ? "current" // every unresolved task in an unlocked-ahead level is actionable
                : "locked"; // active level's later tasks stay greyed (one-thing-at-a-time)
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
              onClick={clickable ? () => onOpen({ kind: "task", id: t.id, channel: t.channel, title: t.title, why: t.detail, xp: t.xp }) : undefined}
            />
          );
        });
        // The full-scan action lives in the prominent top CTA (see LearnInner), so the
        // active level only carries the MCP auto-fix entry as a tail node.
        const tailNodes = active ? [
          <PathNode key="__mcp" kind="mcp" icon="🤖" cap="Auto-fix the rest with Clerow MCP"
            onClick={() => onOpen({ kind: "mcp", id: null, title: "Let Clerow MCP fix everything", why: "Connect Clerow to Claude Code, Cursor, or any agent. It reads your open quests, ships the fixes as a PR, and Clerow re-checks every model.", xp: 0 })} />,
        ] : [];
        const nodes = [...taskNodes, ...tailNodes];

        return (
          <React.Fragment key={lvl.level}>
            {li > 0 && <div className="unit-sep">Level {lvl.level}</div>}
            <div className={`unit-banner ${locked ? "locked" : ""}`}>
              <div>
                <div className="k">Level {lvl.level}{active ? " · in progress" : open ? " · unlocked" : locked ? " · locked" : " · done"}</div>
                <h3>{lvl.title}</h3>
                <div className="unit-find">{lvl.findings}</div>
              </div>
              {locked
                ? subscribed
                  ? <button className="unit-guide" disabled={unlocking === lvl.level} onClick={() => (hasFullScan ? onUnlock(lvl.level) : onNeedFullScan())}>
                      {unlocking === lvl.level ? "Unlocking…" : <><LDIcon name="scan" /> Unlock</>}
                    </button>
                  : <button className="unit-guide" onClick={onUpgrade}><LDIcon name="lock" /> Locked</button>
                : <button className="unit-guide" disabled><LDIcon name="book" /> Guide</button>}
            </div>
            {showTasks
              ? <PathGrid nodeCount={nodes.length}>{nodes}</PathGrid>
              : <div className="path-wrap">{nodes}</div>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ---------------- right rail ---------------- */
function LearnRail({ data, onUpgrade, onScan }: { data: DashboardData; onUpgrade: () => void; onScan: () => void }) {
  const router = useRouter();
  // Re-scan CTA appears once every currently-seeded task is resolved (the active/
  // open levels are cleared). Locked levels aren't seeded, so we ignore their
  // empty totals — otherwise this would never fire until the whole climb is done.
  const lv = data.ladder?.levels ?? [];
  const allTasksDone =
    !!data.hasFullScan &&
    lv.some((l) => l.total > 0) &&
    lv.every((l) => l.total === 0 || l.doneCount === l.total);
  const outOfScans = (data.scansLeft ?? 0) <= 0;
  const models = data.models ?? [];
  // Perplexity sits at the bottom of the model list.
  const orderedModels = [...models].sort((a, b) =>
    (a.id === "perplexity" ? 1 : 0) - (b.id === "perplexity" ? 1 : 0));
  // How many models actually have a result (real scanned count, not the 5 listed).
  const scannedCount = models.filter((m) => !m.locked && m.visibility != null).length;

  // Top prompt placement: the standings for the brand's biggest (primary) prompt
  // from the latest scan — top 3 brands, then the user's own row if they're not
  // already in the top 3. On the free Perplexity scan this is the headline result.
  const competitors = data.competitors ?? [];
  const ranked = [...competitors].sort((a, b) => a.rank - b.rank);
  const top3 = ranked.slice(0, 3);
  const you = ranked.find((c) => c.isYou) ?? null;
  const placementRows = you && !top3.some((c) => c.isYou) ? [...top3, you] : top3;
  const showPlacement = !!data.primaryPrompt && ranked.length > 0;

  return (
    <aside className="ld-rail">
      {data.subscribed && !data.hasFullScan && (
        <div className="scan-cta">
          <div className="scan-cta-txt"><b>Scan all 5 AI models</b></div>
          <button className="scan-cta-btn" onClick={onScan}>🔄 Run full scan</button>
        </div>
      )}
      {data.subscribed && allTasksDone && (
        <div className="scan-cta">
          <div className="scan-cta-txt">
            <b>You&apos;ve cleared every task 🎉</b>
            <span>Re-scan to see your new score across all 5 models.</span>
          </div>
          <button className="scan-cta-btn" onClick={onScan} disabled={outOfScans}>🔄 Re-scan now</button>
          {outOfScans && <span className="scan-cta-note">No scans left this month</span>}
        </div>
      )}
      {data.synthesis?.verdict && (
        <div className="rail-card">
          <h4>🧠 What the AIs think</h4>
          <p className="sub">{data.synthesis.verdict}</p>
          {data.synthesis.bestFix && (
            <div className="rail-note" style={{ marginTop: 10 }}>⚡ <b>Your best move:</b> {data.synthesis.bestFix}</div>
          )}
        </div>
      )}
      <div className="rail-card">
        <h4>Scanned across {scannedCount || models.length} {(scannedCount || models.length) === 1 ? "AI" : "AIs"}</h4>
        <p className="sub">Each model cites differently. One chatbot can&apos;t see the others — Clerow watches all of them.</p>
        <div className="rail-models">
          {orderedModels.map((m: DashboardModel) => {
            // Locked = no key, or not yet scanned (free tier scans one engine; a
            // full scan fills the rest). Engine-agnostic so it works with the
            // ChatGPT free scan, not just Perplexity.
            const locked = m.locked || m.visibility == null;
            return (
              <div key={m.id} className="rail-model">
                <span className="mc" style={{ background: "#fff" }}><AiIcon id={m.id} size={16} letter={m.letter} /></span>{m.label}
                <span className={`st ${!locked && m.visibility ? "ok" : "no"}`}>{locked ? "🔒" : m.visibility != null ? `${m.visibility}%` : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {showPlacement && (
        <div className="rail-card">
          <h4>Top prompt placement</h4>
          <p className="sub" style={{ marginBottom: 10 }}>&ldquo;{data.primaryPrompt}&rdquo;</p>
          <div className="rail-rank">
            {placementRows.map((row) => (
              <div key={`${row.rank}-${row.name}`} className={`rr-row ${row.isYou ? "me" : ""}`}>
                <span className="rr-rank">#{row.rank}</span>
                <BrandLogo
                  name={row.name}
                  domain={logoDomain(row.name, row.isYou, data.brand?.url)}
                  color={row.isYou ? "var(--blue)" : swatchFor(row.name)}
                />
                <span className="rr-name">{row.name}{row.isYou && <span className="rr-you">YOU</span>}</span>
                <span className={`rr-v ${row.isYou && !row.visibility ? "no" : ""}`}>{row.visibility}%</span>
              </div>
            ))}
          </div>
          <div className="rail-note" style={{ marginTop: 10 }}>
            {you
              ? <>📍 You&apos;re <b>#{you.rank} of {ranked.length}</b> for your biggest prompt. Clear Level 1 to climb.</>
              : <>📍 You&apos;re <b>not cited yet</b> for your biggest prompt. Clear Level 1 to break in.</>}
          </div>
        </div>
      )}

      {!data.subscribed && (
        <div className="upg-card">
          <div className="upg-head">
            <span className="upg-tag">⭐ Founder plan</span>
            <span className="upg-price"><b>$29</b>/mo</span>
          </div>
          <h4>Unlock every level &amp; all 5 models</h4>
          <ul className="upg-list">
            <li>✓ All quest levels &amp; re-scans</li>
            <li>✓ All AI models tracked</li>
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

/* ---------------- just-subscribed toast ---------------- */
// Shown when Stripe Checkout redirects back to /dashboard?checkout=success.
function SubscribedToast({ onClose }: { onClose: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="sub-toast" role="status">
      <span className="sub-toast-ic">⭐</span>
      <div className="sub-toast-txt">
        <b>You&apos;re on Founder! 🎉</b>
        <span>All 5 AI models &amp; every level are unlocked. Run your first full scan to light them up.</span>
      </div>
      <button className="sub-toast-x" onClick={onClose} aria-label="Dismiss">✕</button>
    </div>
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
function LessonSheet({ task, modelCount, onClose, onChanged, onAddContext }: { task: SheetTask; modelCount: number; onClose: () => void; onChanged: () => void; onAddContext: () => void }) {
  const [sel, setSel] = React.useState<"diy" | "mcp" | "rescan" | null>(
    task.kind === "mcp" ? "mcp" : task.kind === "checkpoint" ? "rescan" : task.channel === "offsite" ? "diy" : null,
  );
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
    // Switch to the live view and stream per-model progress as each AI model runs
    // through the brand's prompts (the comprehensive scan also re-crawls the site).
    setView("scanning");
    const outcome = await scan.run("/api/scan/full", {
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
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

  // Live re-scan: every model ticks queued → querying → reading → result in
  // parallel, grouped by the level's prompts. Progress spans all prompt×model cells.
  if (view === "scanning") {
    const cells = scan.prompts.flatMap((p) => p.engines);
    const total = cells.length || 1;
    const finished = cells.filter((e) => e.status === "done" || e.status === "failed").length;
    const pct = Math.round((finished / total) * 100);
    // Show the scan working through its phases, so it's clearly more than "just prompts".
    const PHASES = [
      { key: "reading-site", label: "Reading your site" },
      { key: "grading-pages", label: "AI-grading your pages" },
      { key: "scanning", label: "Testing buyer queries on 5 models" },
    ];
    const curPhase = PHASES.findIndex((p) => p.key === scan.phase);
    const steps = PHASES.map((p, i) => ({
      label: p.label,
      state: (curPhase < 0 || i < curPhase ? "done" : i === curPhase ? "active" : "pending") as "done" | "active" | "pending",
    }));
    return (
      <div className="sheet-back">
        <div className="lesson-top"><button className="lesson-x" onClick={close}>✕</button><div style={{ flex: 1 }}><PixelProgress value={pct} /></div><span className="lesson-heart">📡 Live</span></div>
        <div className="lesson-body"><div className="lesson-inner">
          <div className="lesson-tag"><span className="dot">🚩</span>Scanning</div>
          <h1 className="lesson-h">Reading your site &amp; querying 5 models…</h1>
          <p className="lesson-why">Clerow reads your site, AI-grades your pages, then watches every model answer your buyer queries — your score updates the moment they finish.</p>
          <ScanProgress steps={steps} engines={scan.engines} prompts={scan.prompts} elapsedMs={scan.elapsedMs} showOrbit={false} />
        </div></div>
      </div>
    );
  }

  if (view === "done") {
    const overall = scan.result && "score" in scan.result ? scan.result.score.overall : null;

    // A completed task/MCP quest keeps the simple celebratory toast.
    if (task.kind !== "checkpoint") {
      return (
        <div className="sheet-back">
          <div className="lesson-top"><button className="lesson-x" onClick={close}>✕</button><div style={{ flex: 1 }}><PixelProgress value={100} /></div></div>
          <div className="done-toast"><div className="done-toast-in">
            <div className="done-check">✓</div>
            <div>
              <div className="dt-t">Nice! Quest cleared</div>
              <div className="dt-s">+{task.xp || 20} XP · streak kept 🔥</div>
            </div>
            <button className="btn-check" onClick={close}>Continue</button>
          </div></div>
        </div>
      );
    }

    // A full scan → a real results screen: website scan (most important) on top,
    // then what each model said per query. (Replaces the old blank page.)
    const groups = scan.prompts.filter((p) => p.text).sort((a, b) => a.index - b.index);
    const siteGaps = scan.site.filter((c) => c.status !== "pass" && c.status !== "unknown");
    const mark = (s: string) => (s === "pass" ? "✓" : s === "warn" ? "⚠" : s === "unknown" ? "–" : "✕");
    return (
      <div className="sheet-back">
        <div className="lesson-top"><button className="lesson-x" onClick={close}>✕</button><div style={{ flex: 1 }}><PixelProgress value={100} /></div><span className="lesson-heart">✓ Done</span></div>
        <div className="lesson-body lesson-body--steps"><div className="lesson-inner lesson-inner--steps">
          <div className="results-head">
            <div className="results-score">{overall ?? "—"}</div>
            <div>
              <div className="results-h">Scan complete</div>
              <div className="results-sub">Your AI visibility score{overall != null ? ` is ${overall}` : ""} · finish this level&apos;s tasks to unlock the next.</div>
            </div>
          </div>

          {scan.site.length > 0 && (
            <div className="results-card">
              <div className="results-card-h">🔎 Your website scan {siteGaps.length > 0 && <span>{siteGaps.length} to fix</span>}</div>
              <div className="results-checks">
                {scan.site.map((c) => (
                  <div key={c.id} className={`results-check ${c.status}`}>
                    <span className="rc-mark">{mark(c.status)}</span>
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {groups.length > 0 && (
            <div className="results-card">
              <div className="results-card-h">💬 What each model said</div>
              <ScanProgress done engines={scan.engines} prompts={scan.prompts} elapsedMs={0} showOrbit={false} />
            </div>
          )}

          <div className="results-card results-next">
            <div className="results-card-h">✅ We turned this into your tasks</div>
            <p className="results-next-p">
              Everything to make your site rank higher is now in your tasks. Work through them top to bottom —
              <b> copy Clerow&apos;s ready-made fix</b> for each, or let the <b>Clerow MCP</b> ship them for you automatically.
            </p>
          </div>
        </div></div>
        <div className="lesson-foot"><div className="lesson-foot-in">
          <button className="btn-check" onClick={close}>See my tasks</button>
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

  const footLabel = sel === "diy" ? (task.channel === "offsite" ? "Write my post" : "See the fix") : sel === "mcp" ? "Share with AI" : sel === "rescan" ? "Re-scan now" : "Continue";
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
          <>
            <button className={`opt ${sel === "rescan" ? "on" : ""}`} onClick={() => setSel("rescan")}>
              <span className="oic">🚩</span>
              <div><div className="ot">Re-scan now</div><div className="od">Clerow re-queries all your AI models and recomputes your score. ~60s.</div></div>
            </button>
            <button className="scan-cta-add" style={{ marginTop: 12 }} onClick={onAddContext}>✨ Add business context to sharpen results</button>
          </>
        ) : task.kind === "mcp" ? (
          <button className="opt violet on" onClick={() => setSel("mcp")}>
            <span className="oic">🤖</span>
            <div><div className="ot">Connect Clerow MCP</div><div className="od">Your agent reads every open quest and ships the fixes. Clerow verifies across all models.</div></div>
            <span className="obadge">Autopilot</span>
          </button>
        ) : task.channel === "offsite" ? (
          // Off-site authority (Reddit, a directory, a newspaper): an AI agent can't
          // post this for you, so we skip the MCP option and just draft the copy.
          <>
            <div className="lesson-choose">This one lives off your site — here&apos;s the easy way:</div>
            <button className={`opt ${sel === "diy" ? "on" : ""}`} onClick={() => setSel("diy")}>
              <span className="onum">1</span><span className="oic">✍️</span>
              <div><div className="ot">Get the draft + where to post it</div><div className="od">Clerow writes the exact post/listing copy for your brand. Paste it where AI already looks, then mark it done — an AI agent can&apos;t post this for you.</div></div>
            </button>
          </>
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

/* ---------------- business-context sheet ---------------- */
// Optional, attached to the full scan: upload site screenshots + a description so
// the vision step sharpens the brand profile (and covers sites Clerow can't crawl).
function ContextSheet({ onClose }: { onClose: () => void }) {
  const [about, setAbout] = React.useState("");
  const [shots, setShots] = React.useState<{ path: string; url: string | null }[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    const r = await fetch("/api/brand/context").then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (r) { setAbout(r.about ?? ""); setShots(r.screenshots ?? []); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setBusy(true);
    try {
      const fd = new FormData();
      for (const f of list) fd.append("images", f);
      const res = await fetch("/api/brand/context", { method: "POST", body: fd });
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || "Upload failed."); }
      else await load();
    } finally { setBusy(false); }
  };

  const remove = async (path: string) => {
    setBusy(true);
    try { await fetch(`/api/brand/context?path=${encodeURIComponent(path)}`, { method: "DELETE" }); await load(); }
    finally { setBusy(false); }
  };

  const save = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("about", about);
      await fetch("/api/brand/context", { method: "POST", body: fd });
      setSaved(true);
      setTimeout(onClose, 700);
    } finally { setBusy(false); }
  };

  return (
    <div className="share-pop-back" onClick={onClose}>
      <div className="ctx-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="lesson-x upg-x" onClick={onClose}>✕</button>
        <div className="ctx-ic">✨</div>
        <h2>Add business context</h2>
        <p className="ctx-sub">Screenshots of your site plus a few sentences about your business make all 5 models describe you accurately — and it&apos;s how Clerow reads sites it can&apos;t crawl.</p>

        <div
          className={`ctx-drop ${drag ? "on" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ""; }} />
          <span className="ctx-drop-ic">🖼️</span>
          <span className="ctx-drop-t">Drop screenshots or <u>browse</u></span>
          <span className="ctx-drop-h">PNG / JPG / WebP · up to 6 · 6&nbsp;MB each</span>
        </div>

        {shots.length > 0 && (
          <div className="ctx-thumbs">
            {shots.map((s) => (
              <div key={s.path} className="ctx-thumb" style={{ backgroundImage: s.url ? `url(${s.url})` : undefined }}>
                <button className="ctx-thumb-x" onClick={() => remove(s.path)} disabled={busy}>✕</button>
              </div>
            ))}
          </div>
        )}

        <textarea className="ctx-about" rows={4} value={about} onChange={(e) => setAbout(e.target.value)}
          placeholder="What do you do, who's it for, and what makes you different? e.g. 'PR agency for B2B SaaS expanding into the US — known for landing tier-1 press in 60 days.'" />

        <button className="btn-upg btn-upg--lg" disabled={busy} onClick={save}>
          {saved ? "Saved ✓" : busy ? "…" : "Save context"}
        </button>
        <p className="ctx-foot">Applied on your next full scan across all 5 models.</p>
      </div>
    </div>
  );
}

/* ---------------- shell ---------------- */
function LearnInner({ initialPage = "learn" }: { initialPage?: Page }) {
  const { data, loading, refresh } = useDashboard();
  const [task, setTask] = React.useState<SheetTask | null>(null);
  const [page, setPage] = React.useState<Page>(initialPage);
  const [upgrade, setUpgrade] = React.useState(false);
  const [context, setContext] = React.useState(false);
  const [unlocking, setUnlocking] = React.useState<number | null>(null);
  const [justSubscribed, setJustSubscribed] = React.useState(false);
  const seenCheckout = React.useRef(false);
  const toLearn = () => setPage("learn");
  const hasRail = page === "learn";

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
  const openScan = () =>
    setTask({
      kind: "checkpoint",
      id: null,
      title: data?.hasFullScan ? "Re-scan across your AI models" : "Scan all 5 AI models",
      why: data?.hasFullScan
        ? "Clerow re-reads your site and queries all 5 AI models, then refreshes every level. ~1–2 min."
        : "All 5 models read your site, AI-grade your pages, and test your top buyer queries — then your levels unlock. ~1–2 min.",
      xp: 0,
    });

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
              {page === "learn" && <LearnPath data={data} subscribed={!!data.subscribed} onOpen={setTask} onUpgrade={() => setUpgrade(true)} onUnlock={unlock} unlocking={unlocking} hasFullScan={!!data.hasFullScan} onNeedFullScan={openScan} />}
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
        {data && hasRail && <LearnRail data={data} onUpgrade={() => setUpgrade(true)} onScan={openScan} />}
      </div>
      {task && <LessonSheet task={task} modelCount={data?.models?.length ?? 0} onClose={() => setTask(null)} onChanged={refresh} onAddContext={() => setContext(true)} />}
      {upgrade && <UpgradeSheet onClose={() => setUpgrade(false)} />}
      {context && <ContextSheet onClose={() => setContext(false)} />}
      {justSubscribed && <SubscribedToast onClose={() => setJustSubscribed(false)} />}
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
