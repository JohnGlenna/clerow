"use client";

import "./connect.css";
import React from "react";
import Link from "next/link";
import { MascotClerow } from "@/components/Mascot";

const MCP_URL = "https://clerow.com/api/mcp";

type Method = "claude" | "cli";

function Copy({ value, label = "Copy" }: { value: string; label?: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <button
      className={`cn-copy ${ok ? "ok" : ""}`}
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setOk(true);
        window.setTimeout(() => setOk(false), 1800);
      }}
    >
      {ok ? "Copied ✓" : label}
    </button>
  );
}

export default function ConnectPage() {
  const [method, setMethod] = React.useState<Method>("claude");

  return (
    <div className="cn-wrap">
      <div className="cn-inner">
        <div className="cn-bar">
          <Link href="/dashboard" className="cn-brand">
            <MascotClerow size={28} /> Clerow
          </Link>
          <Link href="/dashboard" className="cn-back">
            ← Back to dashboard
          </Link>
        </div>

        {/* Hero */}
        <header className="cn-hero">
          <span className="cn-eyebrow">⚡ Clerow MCP — now live</span>
          <h1>Let Claude do your GEO work</h1>
          <p>
            Connect Clerow to Claude and your AI agent ships the fixes for you. It reads where AI engines
            recommend your competitors, generates the exact files to close the gap, and checks the tasks off —
            keeping your streak. You stay in the loop; Clerow verifies across every model.
          </p>

          <div className="cn-url-card">
            <div>
              <div className="lab">Your Clerow MCP server</div>
              <code>{MCP_URL}</code>
            </div>
            <Copy value={MCP_URL} label="Copy URL" />
          </div>
        </header>

        {/* Setup */}
        <div className="cn-sec-head">
          <span className="kicker">Setup — under a minute</span>
          <h2>How to connect Clerow</h2>
        </div>

        <div className="cn-tabs-wrap">
          <div className="cn-tabs">
            <button className={`cn-tab ${method === "claude" ? "on" : ""}`} onClick={() => setMethod("claude")}>
              Claude (web &amp; desktop)
            </button>
            <button className={`cn-tab ${method === "cli" ? "on" : ""}`} onClick={() => setMethod("cli")}>
              Claude Code / Cursor
            </button>
          </div>
        </div>

        {method === "claude" ? <ClaudeSteps /> : <CliSteps />}

        {/* What to try */}
        <div className="cn-sec-head">
          <span className="kicker">Once connected</span>
          <h2>Ask Claude things like</h2>
        </div>
        <div className="cn-try">
          {[
            "Where am I losing to competitors across ChatGPT, Claude and Perplexity?",
            "What's the highest-impact GEO task I should ship today?",
            "Generate my llms.txt and robots.txt for AI crawlers and write them to my repo.",
            "Write the FAQ + JSON-LD schema for my top buyer question and open a PR.",
            "Mark that task done and keep my streak.",
          ].map((q) => (
            <div key={q} className="cn-try-item">
              <span className="q">💬</span>
              <span>“{q}”</span>
            </div>
          ))}
        </div>

        {/* Tools */}
        <div className="cn-sec-head">
          <span className="kicker">What it does</span>
          <h2>Five tools, one connector</h2>
        </div>
        <div className="cn-tools">
          <Tool name="get_visibility" tier="free">
            Your live AI visibility across ChatGPT, Claude, Perplexity &amp; Gemini — per-engine score, rank,
            sentiment, the competitors ranked above you, and the domains AI cites. The moat.
          </Tool>
          <Tool name="list_tasks" tier="free">
            Your prioritized GEO task ladder — “The Climb.” Returns the active level’s tasks with impact and XP,
            plus a summary of every level.
          </Tool>
          <Tool name="get_site_audit" tier="free">
            A technical audit of your own site: crawlability, AI-crawler robots.txt, llms.txt, HTTPS, title, H1,
            meta description, structured data — each with a concrete fix.
          </Tool>
          <Tool name="get_task_content" tier="pro">
            The finished, ready-to-ship artifact for a task — an actual robots.txt / llms.txt, or copy-paste
            Markdown (FAQ + JSON-LD, comparison page, landing draft).
          </Tool>
          <Tool name="complete_task" tier="pro">
            Marks a task done after your agent ships it — stamps completion so it keeps your streak and awards XP.
          </Tool>
        </div>

        <p className="cn-foot">
          Reading your standings, tasks and audit is free. Generating content and completing tasks via MCP needs
          an active Clerow subscription. Manage or revoke access anytime in Settings.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Claude connector (URL-only / OAuth) ---------------- */
function ClaudeSteps() {
  return (
    <div className="cn-steps">
      <Step n={1} title="Open Claude’s connectors">
        Go to <a href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer">claude.ai → Settings → Connectors</a>{" "}
        (on desktop: Settings → Connectors). Custom connectors are in beta — if you don’t see the section, enable
        Beta features in your settings first.
      </Step>
      <Step n={2} title="Add a custom connector">
        Click <b>Add custom connector</b>. Name it <b>Clerow</b> and paste the server URL below. Leave the
        Advanced settings empty.
        <div className="cn-inline-code">
          <code>{MCP_URL}</code>
          <InlineCopy value={MCP_URL} />
        </div>
      </Step>
      <Step n={3} title="Sign in to Clerow">
        Claude opens Clerow in your browser. Sign in with Google, Apple, or email — the same account you use for
        the dashboard. New here? You can run a free scan first.
      </Step>
      <Step n={4} title="Approve the connection">
        Click <b>Approve</b> and you’ll land back in Claude. From now on, just ask Claude to work on your AI
        visibility — it calls Clerow and the results land in chat.
      </Step>
    </div>
  );
}

/* ---------------- Claude Code / Cursor (API key) ---------------- */
function CliSteps() {
  const [fresh, setFresh] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const key = fresh ?? "YOUR_KEY";
  const cmd = `claude mcp add --transport http clerow ${MCP_URL} --header "Authorization: Bearer ${key}"`;

  const createKey = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "MCP key" }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.plaintext) setFresh(json.plaintext);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="cn-steps">
      <Step n={1} title="Create a Clerow MCP key">
        Generate a long-lived key for your agent. We only store a hash — copy it now, it won’t be shown again.
        <button className="cn-keybtn" onClick={createKey} disabled={creating}>
          {creating ? "Creating…" : fresh ? "Create another key" : "Create MCP key"}
        </button>
        {fresh && (
          <div className="cn-fresh-key">
            <b>Your new key — copy it now</b>
            <code>{fresh}</code>
          </div>
        )}
      </Step>
      <Step n={2} title="Add Clerow to your agent">
        Run this in your terminal (works in Claude Code; Cursor and other MCP clients use the same URL + Bearer
        key):
        <div className="cn-inline-code">
          <code>{cmd}</code>
          <InlineCopy value={cmd} />
        </div>
      </Step>
      <Step n={3} title="Start shipping">
        Ask your agent for your top GEO task, let it generate the file, and have it commit the change. Then tell
        it to mark the task done to keep your streak.
      </Step>
    </div>
  );
}

function InlineCopy({ value }: { value: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <button
      className={ok ? "ok" : ""}
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setOk(true);
        window.setTimeout(() => setOk(false), 1800);
      }}
    >
      {ok ? "Copied ✓" : "Copy"}
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="cn-step">
      <span className="cn-step-n">{String(n).padStart(2, "0")}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}

function Tool({ name, tier, children }: { name: string; tier: "free" | "pro"; children: React.ReactNode }) {
  return (
    <div className="cn-tool">
      <div className="name">
        {name}
        <span className={`badge ${tier}`}>{tier === "free" ? "Free" : "Pro"}</span>
      </div>
      <p>{children}</p>
    </div>
  );
}
