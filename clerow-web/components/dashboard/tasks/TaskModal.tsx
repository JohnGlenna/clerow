"use client";

import React from "react";
import { PixelProgress } from "../../ui/PixelProgress";
import { ScanProgress } from "../../scan/ScanProgress";
import { useScanStream } from "@/lib/useScanStream";
import { playCheck } from "@/lib/sound";
import type { SheetTask } from "./types";

// The task modal: a single quest opened from the path, the rail, or the Prompts
// page. The fix flow (choose how to fix → copy-ready content) is a centered
// modal; the full-scan checkpoint runs its live scan / results full-screen.
export function TaskModal({ task, modelCount, onClose, onChanged, onAddContext }: { task: SheetTask; modelCount: number; onClose: () => void; onChanged: () => void; onAddContext: () => void }) {
  const [sel, setSel] = React.useState<"diy" | "mcp" | "rescan" | null>(
    task.kind === "mcp" ? "mcp" : task.kind === "checkpoint" ? "rescan" : task.channel === "offsite" ? "diy" : null,
  );
  const [view, setView] = React.useState<"choose" | "steps" | "share" | "scanning" | "done">("choose");
  const [content, setContent] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const scan = useScanStream();

  const cmd = `Clerow: read my open Clerow tasks and ship "${task.title}" as a PR, then re-check all my AI models when done.`;

  // Esc closes the centered fix modal (but not while a scan is streaming).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && view !== "scanning") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, view]);

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

  // ---- Full-screen scan takeover (live progress) -----------------------------
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

  // ---- Full-scan results take the full screen too ----------------------------
  if (view === "done" && task.kind === "checkpoint") {
    const overall = scan.result && "score" in scan.result ? scan.result.score.overall : null;
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

  // ---- Everything below is the centered fix modal ----------------------------
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const canMcp = task.channel !== "offsite";

  // A cleared task / MCP quest → a compact success state inside the modal.
  if (view === "done") {
    return (
      <div className="tm-scrim" onClick={close}>
        <div className="tm-modal tm-modal--sm" onClick={stop} role="dialog" aria-modal="true">
          <div className="tm-done">
            <div className="tm-done-check">✓</div>
            <h2 className="tm-title">Nice! Quest cleared</h2>
            <p className="tm-why">+{task.xp || 20} XP · streak kept 🔥</p>
            <button className="tm-btn tm-btn--go" onClick={close}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  // The copy-ready DIY content.
  if (view === "steps") {
    const canCopy = !busy && !!content;
    const copyContent = () => { if (!canCopy) return; navigator.clipboard?.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1600); };
    return (
      <div className="tm-scrim" onClick={close}>
        <div className="tm-modal" onClick={stop} role="dialog" aria-modal="true">
          <div className="tm-head">
            <span className="tm-state tm-state--ready">✦ Copy-ready fix</span>
            <button className="tm-x" onClick={close} aria-label="Close">✕</button>
          </div>
          <div className="tm-body">
            <h2 className="tm-title">{task.title}</h2>
            <div className="tm-code">
              <button className="tm-copy" onClick={copyContent} disabled={!canCopy}>{copied ? "Copied ✓" : "⧉ Copy"}</button>
              <pre>{busy ? "Generating your content…" : content}</pre>
            </div>
          </div>
          <div className="tm-foot">
            <button className="tm-btn tm-btn--ghost" onClick={() => setView("choose")}>← Back</button>
            <button className="tm-btn tm-btn--go" onClick={markDone}>Mark done ✓</button>
          </div>
        </div>
      </div>
    );
  }

  // The MCP share command popup (nested over the choose modal).
  const sharePop = view === "share" ? (
    <div className="tm-scrim tm-scrim--over" onClick={() => setView("choose")}>
      <div className="tm-modal tm-modal--sm" onClick={stop} role="dialog" aria-modal="true">
        <div className="tm-head">
          <span className="tm-state tm-state--mcp">🤖 Clerow MCP</span>
          <button className="tm-x" onClick={() => setView("choose")} aria-label="Close">✕</button>
        </div>
        <div className="tm-body">
          <h2 className="tm-title">Share with your AI agent</h2>
          <p className="tm-why">Paste this into Claude Code, Cursor, or any agent connected to Clerow MCP.</p>
          <div className="tm-code">
            <pre>{cmd}</pre>
          </div>
        </div>
        <div className="tm-foot">
          <button className="tm-btn tm-btn--ghost" onClick={() => { navigator.clipboard?.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>{copied ? "Copied ✓" : "Copy command"}</button>
          <button className="tm-btn tm-btn--go" onClick={markDone}>I&apos;ll mark it done</button>
        </div>
      </div>
    </div>
  ) : null;

  const footLabel = sel === "diy" ? (task.channel === "offsite" ? "Write my post" : "See the fix") : sel === "mcp" ? "Share with AI" : sel === "rescan" ? "Re-scan now" : "Continue";
  const onFoot = () => {
    if (sel === "diy") loadContent();
    else if (sel === "mcp") setView("share");
    else if (sel === "rescan") rescan();
  };
  const stateLabel = task.kind === "mcp" ? ["tm-state--mcp", "🤖 Autopilot"] : task.kind === "checkpoint" ? ["tm-state--ready", "🚩 Checkpoint"] : ["tm-state--ready", "✓ Ready to fix"];

  return (
    <div className="tm-scrim" onClick={close}>
      <div className="tm-modal" onClick={stop} role="dialog" aria-modal="true">
        <div className="tm-head">
          <span className={`tm-state ${stateLabel[0]}`}>{stateLabel[1]}</span>
          <button className="tm-x" onClick={close} aria-label="Close">✕</button>
        </div>
        <div className="tm-body">
          <h2 className="tm-title">{task.title}</h2>
          <p className="tm-why">{task.why}</p>

          {task.kind === "task" && (
            <div className="tm-meta">
              <div className="tm-meta-cell"><span className="l">Impact</span><span className="v accent">+{task.xp} XP</span></div>
              <div className="tm-meta-cell"><span className="l">Models</span><span className="v">{modelCount || 5}</span></div>
              <div className="tm-meta-cell"><span className="l">Where</span><span className="v">{canMcp ? "On your site" : "Off-site"}</span></div>
            </div>
          )}

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
        </div>
        <div className="tm-foot">
          <button className="tm-btn tm-btn--ghost" onClick={skip}>Skip</button>
          <button className="tm-btn tm-btn--go" disabled={!sel || busy} onClick={onFoot}>{busy ? "…" : footLabel}</button>
        </div>
      </div>
      {sharePop}
    </div>
  );
}
