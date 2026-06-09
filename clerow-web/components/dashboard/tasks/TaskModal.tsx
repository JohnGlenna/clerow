"use client";

import React from "react";
import { PixelProgress } from "../../ui/PixelProgress";
import { ScanProgress } from "../../scan/ScanProgress";
import { useScanStream } from "@/lib/useScanStream";
import { playCheck } from "@/lib/sound";
import { TASK_FILE, type SheetTask } from "./types";
import { MascotClerow } from "../../Mascot";
import { buildBuilderPrompt } from "@/lib/content/builderPrompt";

const AGENTS = ["Claude Code", "Codex", "Cursor", "Any MCP agent"];

const MCP_URL = "https://clerow.com/api/mcp";

// Per-client connect info shown inline in the MCP hand-off (no keys — the client
// runs the OAuth browser flow on first call).
const MCP_CLIENTS = [
  {
    key: "claudecode" as const,
    tab: "Claude Code",
    label: "Run in your terminal",
    cmd: `claude mcp add --transport http clerow ${MCP_URL}`,
    hint: "Then run /mcp in Claude Code and approve in your browser.",
  },
  {
    key: "codex" as const,
    tab: "Codex",
    label: "Run in your terminal",
    cmd: `codex mcp add clerow --url "${MCP_URL}"`,
    hint: "Codex opens your browser to sign in the first time it calls Clerow.",
  },
  {
    key: "ide" as const,
    tab: "Cursor / VS Code / Kiro",
    label: "Add to your IDE's MCP config (.cursor/mcp.json, .vscode/mcp.json, …)",
    cmd: `{\n  "mcpServers": {\n    "clerow": {\n      "url": "${MCP_URL}"\n    }\n  }\n}`,
    hint: "Works in Cursor, VS Code, Antigravity, Kiro, Windsurf — any IDE that uses the standard MCP JSON config. Then sign in & approve in your browser.",
  },
  {
    key: "web" as const,
    tab: "Claude / ChatGPT",
    label: "Add a custom connector with this URL",
    cmd: MCP_URL,
    hint: "Settings → Connectors → Add custom connector, paste the URL, then sign in.",
  },
];

function domainOf(url: string | null): string {
  if (!url) return "your site";
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "your site";
}

// Render a step/description string, turning `backtick` spans into code chips.
function withChips(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith("`") && p.endsWith("`") ? <code key={i} className="tm-chip">{p.slice(1, -1)}</code> : <React.Fragment key={i}>{p}</React.Fragment>,
  );
}

// A copyable command block (the MCP view's Step 1 / Step 2).
function CmdBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="tm-cmd">
      <div className="tm-cmd-h">
        <span>{label}</span>
        <button className={`tm-cmd-copy ${copied ? "on" : ""}`} onClick={copy}>{copied ? "Copied ✓" : "⧉ Copy command"}</button>
      </div>
      <pre>{text}</pre>
    </div>
  );
}

// The task modal. The fix flow (steps + ready content) and the MCP hand-off are a
// centered modal; the full-scan checkpoint runs its live scan / results full-screen.
export function TaskModal({ task, modelCount, brandUrl, onClose, onChanged, onAddContext }: {
  task: SheetTask; modelCount: number; brandUrl: string | null;
  onClose: () => void; onChanged: () => void; onAddContext: () => void;
}) {
  const offsite = task.channel === "offsite";
  const [view, setView] = React.useState<"main" | "mcp" | "scanning" | "done">(task.kind === "mcp" ? "mcp" : "main");
  const [content, setContent] = React.useState<string>("");
  const [genBusy, setGenBusy] = React.useState(false);
  const [genErr, setGenErr] = React.useState<string | null>(null);
  // Pre-publish quality gate: the grade the draft earned, and whether we're mid
  // re-stream of a revised draft.
  const [quality, setQuality] = React.useState<{ score: number; verdict: string; revised: boolean } | null>(null);
  const [improving, setImproving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [copiedBuilder, setCopiedBuilder] = React.useState(false);
  // Diagnostic technical fixes hide their raw markdown box by default (it just
  // re-states the title/why/steps above); this toggles it back into view.
  const [showRaw, setShowRaw] = React.useState(false);
  const [mcpClient, setMcpClient] = React.useState<"claudecode" | "codex" | "ide" | "web">("claudecode");
  // "Check it's live" — confirms a technical fix actually shipped (single re-fetch,
  // not the AI scan). null = not checked yet.
  const [verifying, setVerifying] = React.useState(false);
  const [verifyLive, setVerifyLive] = React.useState<boolean | null>(null);
  // Auto-load: peek for content that's already available (free/deterministic or
  // cached) so the user skips a redundant "Generate" click.
  const [autoLoading, setAutoLoading] = React.useState(false);
  const scan = useScanStream();

  const fileName = task.ladderKey ? TASK_FILE[task.ladderKey] : undefined;
  // Only audit-* on-site tasks are mechanically verifiable with a page fetch.
  const canVerify = !offsite && !!task.id && !!task.ladderKey && task.ladderKey.startsWith("audit-");
  // Deterministic = computed instantly & locally (files + any audit-* fix), so it
  // never needs a (re)generate button once shown.
  const isDeterministic = !offsite && (!!fileName || (!!task.ladderKey && task.ladderKey.startsWith("audit-")));
  // Diagnostic technical fix (audit-* with no robots/llms file): its deterministic
  // content just re-states the title/why/steps already shown above, so collapse it.
  const isDiagnostic = isDeterministic && !fileName;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && view !== "scanning") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, view]);

  // On open, pull any ready content (no LLM call). Standard tasks only — prompt
  // "Fix" tasks need a stepId first, so they keep the manual generate flow.
  React.useEffect(() => {
    if (!task.id || task.promptId || offsite || content || genBusy) return;
    let cancelled = false;
    setAutoLoading(true);
    fetch(`/api/tasks/${task.id}/content`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j?.ready && j.content) setContent(j.content); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setAutoLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  // Generate the copy-ready fix. Handles both the instant JSON (deterministic
  // files / cached / free audit fixes) and the token-streamed paid LLM draft.
  const generate = async () => {
    if (genBusy) return;
    setGenBusy(true); setGenErr(null); setContent(""); setQuality(null); setImproving(false);
    try {
      let res: Response;
      if (task.promptId) {
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
      const isStream = (res.headers.get("content-type") ?? "").includes("text/event-stream");
      if (!isStream || !res.body) {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Couldn't generate content");
        setContent(json.content ?? "");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          let evt: { type: string; text?: string; message?: string; score?: number; verdict?: string; revised?: boolean };
          try { evt = JSON.parse(line); } catch { continue; }
          if (evt.type === "delta" && evt.text) { acc += evt.text; setContent(acc); }
          else if (evt.type === "reset") { acc = ""; setContent(""); setImproving(true); }
          else if (evt.type === "score") { setImproving(false); setQuality({ score: evt.score ?? 0, verdict: evt.verdict ?? "", revised: !!evt.revised }); }
          else if (evt.type === "error") throw new Error(evt.message ?? "Couldn't generate content");
        }
      }
    } catch (e) {
      setGenErr(e instanceof Error ? e.message : "Couldn't generate content");
    } finally {
      setGenBusy(false);
    }
  };

  const copyContent = () => { if (!content) return; navigator.clipboard?.writeText(content); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };
  const copyForBuilder = () => {
    if (!content) return;
    navigator.clipboard?.writeText(buildBuilderPrompt({ content, fileName, title: task.title }));
    setCopiedBuilder(true); window.setTimeout(() => setCopiedBuilder(false), 1600);
  };
  const saveFile = (name: string, mime: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };
  const download = () => { if (fileName) saveFile(fileName, "text/plain;charset=utf-8"); };
  // Slug for the .md download of prose content tasks (FAQ, comparison, …).
  const mdSlug = (task.ladderKey || task.title || "clerow-content")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "clerow-content";
  const downloadMd = () => saveFile(`${mdSlug}.md`, "text/markdown;charset=utf-8");

  const checkLive = async () => {
    if (!task.id || verifying) return;
    setVerifying(true);
    try {
      const r = await fetch(`/api/tasks/${task.id}/verify`, { method: "POST" }).then((x) => x.json()).catch(() => null);
      setVerifyLive(r && r.verifiable ? !!r.live : null);
    } finally {
      setVerifying(false);
    }
  };

  const markDone = async () => {
    if (task.id) {
      playCheck();
      await fetch("/api/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: task.id, done: true }) }).catch(() => {});
    }
    if (task.kind === "checkpoint") { setView("done"); return; }
    setView("done");
  };
  const skip = async () => {
    if (task.id) await fetch("/api/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: task.id, archived: true }) }).catch(() => {});
    onChanged(); onClose();
  };
  const rescan = async () => {
    setView("scanning");
    const outcome = await scan.run("/api/scan/full", { headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
    if (!outcome.ok) {
      if (outcome.status === 402) alert(outcome.error || "You're out of scans this month.");
      else if (outcome.status === 429) alert(outcome.error || "A scan is already running — give it a moment.");
      else alert(outcome.error || "Re-scan failed. Try again.");
      setView("main"); return;
    }
    setView("done");
  };
  const close = () => { onChanged(); onClose(); };

  // ---- Live scan (popup, non-dismissable while running) ---------------------
  if (view === "scanning") {
    const cells = scan.prompts.flatMap((p) => p.engines);
    const total = cells.length || 1;
    const finished = cells.filter((e) => e.status === "done" || e.status === "failed").length;
    const pct = Math.round((finished / total) * 100);
    const PHASES = [
      { key: "reading-site", label: "Reading your site" },
      { key: "grading-pages", label: "AI-grading your pages" },
      { key: "scanning", label: "Testing buyer queries on 5 models" },
    ];
    const curPhase = PHASES.findIndex((p) => p.key === scan.phase);
    const steps = PHASES.map((p, i) => ({ label: p.label, state: (curPhase < 0 || i < curPhase ? "done" : i === curPhase ? "active" : "pending") as "done" | "active" | "pending" }));
    return (
      <div className="tm-scrim">
        <div className="tm-modal" role="dialog" aria-modal="true">
          <div className="tm-head"><span className="tm-crumb">Scanning · 📡 Live</span></div>
          <div className="tm-body">
            <div style={{ marginBottom: 18 }}><PixelProgress value={pct} /></div>
            <h2 className="tm-title">Reading your site &amp; querying 5 models…</h2>
            <p className="tm-why">Clerow reads your site, AI-grades your pages, then watches every model answer your buyer queries — your score updates the moment they finish.</p>
            <ScanProgress steps={steps} engines={scan.engines} prompts={scan.prompts} elapsedMs={scan.elapsedMs} showOrbit={false} />
          </div>
        </div>
      </div>
    );
  }

  // ---- Full-scan results (checkpoint) popup ----------------------------------
  if (view === "done" && task.kind === "checkpoint") {
    const overall = scan.result && "score" in scan.result ? scan.result.score.overall : null;
    const groups = scan.prompts.filter((p) => p.text).sort((a, b) => a.index - b.index);
    const siteGaps = scan.site.filter((c) => c.status !== "pass" && c.status !== "unknown");
    const mark = (s: string) => (s === "pass" ? "✓" : s === "warn" ? "⚠" : s === "unknown" ? "–" : "✕");
    return (
      <div className="tm-scrim" onClick={close}>
        <div className="tm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="tm-head"><span className="tm-crumb">Scan complete · ✓ Done</span><button className="tm-x" onClick={close} aria-label="Close">✕</button></div>
          <div className="tm-body">
            <div className="results-head">
              <div className="results-score">{overall ?? "—"}</div>
              <div><div className="results-h">Scan complete</div><div className="results-sub">Your AI visibility score{overall != null ? ` is ${overall}` : ""} · finish this level&apos;s tasks to unlock the next.</div></div>
            </div>
            {scan.site.length > 0 && (
              <div className="results-card">
                <div className="results-card-h">🔎 Your website scan {siteGaps.length > 0 && <span>{siteGaps.length} to fix</span>}</div>
                <div className="results-checks">{scan.site.map((c) => (<div key={c.id} className={`results-check ${c.status}`}><span className="rc-mark">{mark(c.status)}</span><span>{c.label}</span></div>))}</div>
              </div>
            )}
            {groups.length > 0 && (
              <div className="results-card"><div className="results-card-h">💬 What each model said</div><ScanProgress done engines={scan.engines} prompts={scan.prompts} elapsedMs={0} showOrbit={false} /></div>
            )}
            <div className="results-card results-next"><div className="results-card-h">✅ We turned this into your tasks</div><p className="results-next-p">Everything to make your site rank higher is now in your tasks. Work through them top to bottom — <b>copy Clerow&apos;s ready-made fix</b> for each, or let the <b>Clerow MCP</b> ship them for you automatically.</p></div>
          </div>
          <div className="tm-foot tm-foot--end"><button className="tm-btn tm-btn--go" onClick={close}>See my tasks →</button></div>
        </div>
      </div>
    );
  }

  // ---- Compact success (task / mcp cleared) ----------------------------------
  if (view === "done") {
    return (
      <div className="tm-scrim" onClick={close}>
        <div className="tm-modal tm-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="tm-done">
            <div className="tm-done-check">✓</div>
            <h2 className="tm-title tm-title--sm">Nice! Quest cleared</h2>
            <p className="tm-why" style={{ textAlign: "center" }}>+{task.xp || 20} XP · streak kept 🔥</p>
            {canVerify && (
              <>
                <button className="tm-btn tm-btn--ghost tm-btn--sm" onClick={checkLive} disabled={verifying}>
                  {verifying ? "Checking…" : verifyLive ? "✓ Live" : verifyLive === false ? "↻ Re-check" : "✓ Check it's live"}
                </button>
                {verifyLive !== null && (
                  <div className="tm-gen-note" style={{ textAlign: "center" }}>
                    {verifyLive
                      ? "✓ We can see it live on your site."
                      : "We can't see it live yet — it can take a minute after you publish. Re-check."}
                  </div>
                )}
              </>
            )}
            <button className="tm-btn tm-btn--go" onClick={close}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  // ---- MCP hand-off view -----------------------------------------------------
  if (view === "mcp") {
    const taskCmd = task.kind === "mcp"
      ? `Using the Clerow MCP, work through all my open Clerow tasks for ${domainOf(brandUrl)}, lowest-effort first.\nFor off-site tasks (Reddit, directories, guest posts), draft the copy and tell me where to post it.`
      : `Using the Clerow MCP, complete this task for ${domainOf(brandUrl)}:\n"${task.title}"`;
    return (
      <div className="tm-scrim" onClick={close}>
        <div className="tm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="tm-head"><span className="tm-crumb">Clerow MCP</span><button className="tm-x" onClick={close} aria-label="Close">✕</button></div>
          <div className="tm-body">
            <span className="tm-state tm-state--mcp"><span className="tm-state-ic">⚡</span>Clerow MCP</span>
            <h2 className="tm-title">Let your agent do the work.</h2>
            <p className="tm-why">Clerow connects to <b>Claude (web &amp; desktop)</b> or <b>Claude Code, Codex &amp; Cursor</b>. Connect once, then hand your agent the task below — it ships {task.kind === "mcp" ? "every fix" : "this fix"} and Clerow re-verifies you across all {modelCount || 5} models.</p>
            <div className="tm-agents">{AGENTS.map((a) => (<span key={a} className="tm-agent"><span className="tm-agent-dot" />{a}</span>))}</div>
            <div className="tm-stepblock">
              <div className="tm-stepblock-h">Step 1 · Connect Clerow (one-time)</div>
              <p className="tm-stepblock-note">Add the Clerow MCP server to your agent, then <b>sign in &amp; approve in your browser</b>.</p>
              <div className="tm-clienttabs" role="tablist">
                {MCP_CLIENTS.map((c) => (
                  <button key={c.key} role="tab" aria-selected={mcpClient === c.key} className={`tm-clienttab ${mcpClient === c.key ? "on" : ""}`} onClick={() => setMcpClient(c.key)}>{c.tab}</button>
                ))}
              </div>
              {(() => { const c = MCP_CLIENTS.find((x) => x.key === mcpClient)!; return (<><CmdBlock label={c.label} text={c.cmd} /><p className="tm-stepblock-hint">{c.hint}</p></>); })()}
            </div>
            <div className="tm-stepblock">
              <div className="tm-stepblock-h">Step 2 · {task.kind === "mcp" ? "Hand your agent everything" : "Hand your agent this task"}</div>
              <CmdBlock label="Paste to your agent" text={taskCmd} />
            </div>
          </div>
          <div className="tm-foot">
            <button className="tm-btn tm-btn--ghost" onClick={task.kind === "mcp" ? close : () => setView("main")}>{task.kind === "mcp" ? "Close" : "← Back"}</button>
            {task.id && <button className="tm-btn tm-btn--go" onClick={markDone}>✓ Mark as done</button>}
          </div>
        </div>
      </div>
    );
  }

  // ---- Checkpoint (full-scan starter) ---------------------------------------
  if (task.kind === "checkpoint") {
    return (
      <div className="tm-scrim" onClick={close}>
        <div className="tm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="tm-head"><span className="tm-crumb">Checkpoint</span><button className="tm-x" onClick={close} aria-label="Close">✕</button></div>
          <div className="tm-body">
            <span className="tm-state tm-state--ready"><span className="tm-state-ic">🚩</span>Checkpoint</span>
            <h2 className="tm-title">{task.title}</h2>
            <p className="tm-why">{task.why}</p>
            <button className="tm-cta-add" onClick={onAddContext}>✨ Add business context to sharpen results</button>
          </div>
          <div className="tm-foot"><button className="tm-btn tm-btn--go tm-btn--wide" onClick={rescan}>🚩 Re-scan now</button></div>
        </div>
      </div>
    );
  }

  // ---- Main task view (the redesign) ----------------------------------------
  const steps = task.steps ?? [];
  const showMeta = task.kind === "task";
  return (
    <div className="tm-scrim" onClick={close}>
      <div className="tm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="tm-head">
          <span className="tm-crumb">{task.crumb ?? (offsite ? "Off-site authority" : "Foundations")}</span>
          <div className="tm-head-r">
            {task.id && <button className="tm-skip" onClick={skip}>Skip</button>}
            <button className="tm-x" onClick={close} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="tm-body">
          <span className="tm-state tm-state--ready"><span className="tm-state-ic">◎</span>Ready to fix</span>
          <h2 className="tm-title">{task.title}</h2>
          <p className="tm-why">{withChips(task.why)}</p>

          {showMeta && (
            <div className="tm-meta">
              <div className="tm-meta-cell"><span className="l">Impact</span><span className="v accent">+{task.xp} XP</span></div>
              <div className="tm-meta-cell"><span className="l">Effort</span><span className="v">{task.minutes ? `~${task.minutes} min` : "—"}</span></div>
              <div className="tm-meta-cell"><span className="l">Models</span><span className="v">{modelCount || 5}</span></div>
            </div>
          )}

          {offsite && (
            <div className="tm-part-tag">Part A · Clerow writes it &nbsp;→&nbsp; Part B · you post it</div>
          )}

          {steps.length > 0 ? (
            <>
              <div className="tm-steps-h">{offsite ? "How it works" : "What to do"}</div>
              <ol className="tm-steps">
                {steps.map((s, i) => (
                  <li key={i} className="tm-step"><span className="tm-step-n">{i + 1}</span><span className="tm-step-t">{withChips(s)}</span></li>
                ))}
              </ol>
            </>
          ) : null}

          {/* Generate the ready-to-ship content (copy + download). */}
          <div className="tm-content">
            <div className="tm-content-h">
              <span>{offsite ? "Part A — Clerow writes your post" : fileName ? `Your ${fileName}` : isDiagnostic ? "Hand-off content" : "Copy-ready content"}</span>
              {content && isDiagnostic ? (
                <button className="tm-raw-toggle" onClick={() => setShowRaw((v) => !v)}>{showRaw ? "▾ Hide raw markdown" : "▸ View raw markdown"}</button>
              ) : (() => {
                // Deterministic content auto-loads and never needs (re)generating;
                // LLM content can be (re)generated on demand.
                if (genBusy) return <button className="tm-gen" disabled>Writing…</button>;
                if (autoLoading && !content) return <button className="tm-gen" disabled>Loading…</button>;
                if (!content) return <button className="tm-gen" onClick={generate}>{isDeterministic ? "Show content" : "✨ Write my content"}</button>;
                if (!isDeterministic) return <button className="tm-gen" onClick={generate}>Regenerate</button>;
                return null;
              })()}
            </div>
            {genErr && <div className="tm-gen-err">{genErr}</div>}
            {improving && <div className="tm-gen-note">✦ Quality check flagged some gaps — rewriting a stronger draft…</div>}
            {content && (
              <>
                {(!isDiagnostic || showRaw) && <pre className="tm-content-box">{content}</pre>}
                {quality && (
                  <div className={`tm-quality ${quality.score >= 85 ? "is-high" : quality.score >= 72 ? "is-ok" : "is-low"}`}>
                    <span className="tm-quality-score">{quality.score}<span className="tm-quality-max">/100</span></span>
                    <span className="tm-quality-txt">
                      <b>AI citation-readiness{quality.revised ? " · improved" : ""}</b>
                      {quality.verdict ? <span className="tm-quality-verdict">{quality.verdict}</span> : null}
                    </span>
                  </div>
                )}
                <div className="tm-content-actions">
                  {!offsite && <button className="tm-btn tm-btn--go tm-btn--sm" onClick={copyForBuilder}>{copiedBuilder ? "Copied ✓" : "⧉ Copy for AI builder"}</button>}
                  <button className="tm-btn tm-btn--ghost tm-btn--sm" onClick={copyContent}>{copied ? "Copied ✓" : "⧉ Copy raw"}</button>
                  {fileName
                    ? <button className="tm-btn tm-btn--ghost tm-btn--sm" onClick={download}>⤓ Download {fileName}</button>
                    : !offsite && <button className="tm-btn tm-btn--ghost tm-btn--sm" onClick={downloadMd}>⤓ Download .md</button>}
                </div>
                {!offsite && <div className="tm-gen-note">Paste into Lovable, AI Studio, Bolt, v0, ChatGPT or Claude — your builder does the rest.</div>}
              </>
            )}
          </div>

          {offsite && (
            <div className="tm-partb">
              <div className="tm-partb-h">Part B · You post it</div>
              <p>An AI agent can&apos;t post to Reddit, a forum or your blog for you. Paste the copy above where AI already looks, then mark this done to keep your streak.</p>
            </div>
          )}
        </div>
        <div className="tm-foot">
          <button className="tm-btn tm-btn--go" onClick={markDone}>→ Mark as done</button>
          {!offsite && <button className="tm-btn tm-btn--ghost" onClick={() => setView("mcp")}><span style={{ display: "inline-flex", verticalAlign: "middle", marginRight: 6 }}><MascotClerow size={18} /></span>Let Clerow MCP do it</button>}
        </div>
      </div>
    </div>
  );
}
