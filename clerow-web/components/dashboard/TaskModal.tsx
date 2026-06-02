"use client";

import React from "react";
import { Icon } from "../Icon";
import { GameIcon } from "../GameIcon";
import { ContentMaker } from "./ContentMaker";
import type { DashboardTask } from "@/lib/types";

// Shared across the Overview (ClimbCard) and the Quests page so clicking a task
// behaves identically everywhere: a big centered modal with the "why", an
// impact/effort/models grid, the content generator, and a Clerow MCP hand-off.

// "Your next move" — the single highest-leverage fix, surfaced as a hero card.
export type NextMove = { task: DashboardTask; levelLabel: string; stepLabel: string };

// Pull the "≈ 10 min" effort out of a task's meta ("≈ 10 min · impact: …").
export function effortOf(meta: string): string {
  return (meta.split("·")[0] ?? "").replace(/≈/g, "").trim() || "~5 min";
}

export function NextMoveHero({
  move,
  onOpen,
}: {
  move: NextMove;
  onOpen: (task: DashboardTask, mcp?: boolean) => void;
}) {
  const { task } = move;
  const why = task.detail ?? "One concrete fix that moves how AI sees you. We write the content — you ship it.";
  const canMcp = task.channel !== "offsite";
  const act = (e: React.MouseEvent, mcp = false) => {
    e.stopPropagation();
    onOpen(task, mcp);
  };
  return (
    <div className="next-move">
      <div className="nm-eyebrow">
        <span className="nm-pulse" /> YOUR NEXT MOVE
      </div>
      <div className="nm-card" onClick={(e) => act(e)} role="button" tabIndex={0}>
        <div className="nm-card-top">
          <div className="nm-step">{move.levelLabel} · {move.stepLabel.toLowerCase()}</div>
          <h2 className="nm-title">{task.title}</h2>
          <p className="nm-why">{why}</p>
          <div className="nm-actions">
            <button className="btn btn--primary btn--sm" onClick={(e) => act(e)}>
              <Icon name="arrow" size={14} /> Do it now
            </button>
            {canMcp && (
              <button className="btn btn--ghost btn--sm" onClick={(e) => act(e, true)}>
                <GameIcon name="bolt" size={13} /> Auto-fix with Clerow MCP
              </button>
            )}
            <button className="btn btn--quiet btn--sm" onClick={(e) => act(e)}>See the steps</button>
          </div>
        </div>
        <div className="nm-foot">
          <span className="nm-foot-it">
            <GameIcon name="bolt" size={13} color="#FFC800" /> Earns <b>+{task.xp} XP</b>
          </span>
          <span className="nm-foot-it">
            <Icon name="clock" size={13} /> {effortOf(task.meta)}
          </span>
          <span className="nm-foot-it">
            <GameIcon name="target" size={13} /> {canMcp ? "Visible to all 5 models" : "Builds off-site authority"}
          </span>
        </div>
      </div>
    </div>
  );
}

// A copyable terminal/agent command block with a "Copy command" button.
function CopyCommand({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1700);
    } catch {
      /* clipboard blocked — no-op */
    }
  };
  return (
    <div className="qm-cmd">
      <div className="qm-cmd-head">
        <span>{label}</span>
        <button className={`btn btn--quiet btn--sm qm-copy ${copied ? "is-copied" : ""}`} onClick={copy}>
          {copied ? "Copied ✓" : "Copy command"}
        </button>
      </div>
      <pre>{text}</pre>
    </div>
  );
}

// Centered modal for one task. Two views: the default "fix" view (why it
// matters, impact/effort/models, and the content generator) and an MCP view
// with copyable connect + task commands for handing the fix to an agent.
export function TaskModal({
  task,
  startMcp = false,
  brandUrl,
  onToggle,
  onClose,
}: {
  task: DashboardTask;
  startMcp?: boolean;
  brandUrl: string | null;
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const canMcp = task.channel !== "offsite";
  const [view, setView] = React.useState<"fix" | "mcp">(startMcp && canMcp ? "mcp" : "fix");
  const [done, setDone] = React.useState(task.done);
  const why = task.detail ?? "One concrete fix — we write the content, you ship it, then check it off to keep your streak.";

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const markDone = () => {
    onToggle(task.id);
    setDone((d) => !d);
    onClose();
  };

  // The one-time connect command + a task-specific agent prompt (CLAUDE.md shape).
  const origin = typeof window !== "undefined" ? window.location.origin : "https://clerow.com";
  const connectCmd = `claude mcp add --transport http clerow ${origin}/api/mcp \\\n  --header "Authorization: Bearer clerow_sk_…"`;
  const taskCmd = `Using the Clerow MCP, complete this task for ${brandUrl ?? "my site"}:\n“${task.title}”\nApply the fix, then re-scan and report my ranking across all 5 AI models.`;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="drawer-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={16} />
        </button>

        {view === "fix" ? (
          <>
            <div className="drawer-head">
              <div className="drawer-tags">
                <span className={`qm-state ${done ? "is-done" : "is-ready"}`}>
                  {done ? (
                    <><Icon name="check" size={12} /> Completed</>
                  ) : (
                    <><GameIcon name="target" size={12} /> Ready to fix</>
                  )}
                </span>
              </div>
              <h2 className="drawer-prompt qm-title">{task.title}</h2>
              <p className="drawer-sub">{why}</p>
            </div>

            <div className="qm-meta">
              <div className="qm-meta-cell">
                <div className="l">Impact</div>
                <div className="v accent">+{task.xp} XP</div>
              </div>
              <div className="qm-meta-cell">
                <div className="l">Effort</div>
                <div className="v">{effortOf(task.meta)}</div>
              </div>
              <div className="qm-meta-cell">
                <div className="l">Models</div>
                <div className="v">5</div>
              </div>
            </div>

            <section className="drawer-section drawer-playbook">
              <h3 className="drawer-h3">
                <GameIcon name="sparkles" size={16} /> Make the content for this quest
              </h3>
              <p className="drawer-playbook-lead">
                Generate copy-paste-ready content tailored to your brand, then copy it straight into your site.
              </p>
              <ContentMaker endpoint={`/api/tasks/${task.id}/content`} />
            </section>

            <div className="qm-actions">
              <button className="btn btn--success btn--sm" onClick={markDone}>
                <Icon name="check" size={14} /> {done ? "Mark as not done" : "Mark as done"}
              </button>
              {canMcp && (
                <button className="btn btn--ghost btn--sm" onClick={() => setView("mcp")}>
                  <GameIcon name="bolt" size={13} /> Let Clerow MCP do it
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="drawer-head">
              <div className="drawer-tags">
                <span className="qm-state is-ready">
                  <GameIcon name="bolt" size={12} /> Clerow MCP
                </span>
              </div>
              <h2 className="drawer-prompt qm-title">Let your agent do the work.</h2>
              <p className="drawer-sub">
                Clerow plugs into <b>Claude Code, Codex, Cursor</b> or any agent that speaks MCP. Connect once, then hand
                it the command below — your agent ships this fix and Clerow re-verifies you across all 5 models.
              </p>
            </div>

            <div className="qm-agents">
              {["Claude Code", "Codex", "Cursor", "Any MCP agent"].map((a) => (
                <span key={a} className="qm-agent"><span className="qm-agent-dot" />{a}</span>
              ))}
            </div>

            <div className="drawer-section">
              <h3 className="drawer-h3">Step 1 · Connect Clerow (one-time)</h3>
              <p className="drawer-note">
                Mint a key in <b>Settings → Clerow MCP</b>, then run this in your terminal.
              </p>
              <CopyCommand label="Run in your terminal" text={connectCmd} />
            </div>
            <div className="drawer-section">
              <h3 className="drawer-h3">Step 2 · Hand your agent this task</h3>
              <CopyCommand label="Paste to your agent" text={taskCmd} />
            </div>

            <div className="qm-actions">
              <button className="btn btn--ghost btn--sm" onClick={() => setView("fix")}>
                <Icon name="arrow-left" size={14} /> Back
              </button>
              <button className="btn btn--success btn--sm" onClick={markDone}>
                <Icon name="check" size={14} /> Mark as done
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
