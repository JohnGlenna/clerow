"use client";

import React from "react";
import { LpHead } from "../shared/PageBits";

const MCP_URL = "https://clerow.com/api/mcp";

function CnxCopy({ value, label = "Copy" }: { value: string; label?: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <button
      className={`cnx-copy ${ok ? "on" : ""}`}
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setOk(true);
        window.setTimeout(() => setOk(false), 1600);
      }}
    >
      {ok ? "Copied ✓" : label}
    </button>
  );
}

function CnxStep({ n, t, children }: { n: number; t: string; children: React.ReactNode }) {
  return (
    <li className="cnx-step">
      <span className="cnx-step-n">{String(n).padStart(2, "0")}</span>
      <div>
        <div className="cnx-step-t">{t}</div>
        <div className="cnx-step-d">{children}</div>
      </div>
    </li>
  );
}

function CnxTool({ name, pro, children }: { name: string; pro?: boolean; children: React.ReactNode }) {
  return (
    <div className="cnx-tool">
      <div className="cnx-tool-h">
        <span className="cnx-tool-n">{name}</span>
        <span className={`cnx-badge ${pro ? "pro" : "free"}`}>{pro ? "Pro" : "Free"}</span>
      </div>
      <p>{children}</p>
    </div>
  );
}

// The Clerow MCP connect guide — plug Clerow into Claude / Cursor / any agent.
export function ConnectPage() {
  const [method, setMethod] = React.useState<"claude" | "cli">("claude");
  const [fresh, setFresh] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const cmd = `claude mcp add --transport http clerow ${MCP_URL} --header "Authorization: Bearer ${fresh ?? "YOUR_KEY"}"`;

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
    <div className="ld-page">
      <LpHead
        eyebrow="⚡ Clerow MCP"
        title="Let Claude do your GEO work"
        sub="Connect Clerow to Claude and your AI agent ships the fixes for you — it reads where AI engines recommend your competitors, generates the exact files to close the gap, and checks tasks off to keep your streak."
      />

      <div className="cnx-hero">
        <span className="mcp-tag">Your MCP server</span>
        <div className="cnx-url">
          <code>{MCP_URL}</code>
          <CnxCopy value={MCP_URL} label="Copy URL" />
        </div>
      </div>

      <div className="cnx-tabs">
        <button className={`cnx-tab ${method === "claude" ? "on" : ""}`} onClick={() => setMethod("claude")}>
          Claude (web &amp; desktop)
        </button>
        <button className={`cnx-tab ${method === "cli" ? "on" : ""}`} onClick={() => setMethod("cli")}>
          Claude Code / Cursor
        </button>
      </div>

      {method === "claude" ? (
        <ol className="cnx-steps">
          <CnxStep n={1} t="Open Claude’s connectors">
            Go to{" "}
            <a href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer">
              claude.ai → Settings → Connectors
            </a>
            . Custom connectors are in beta — if you don’t see the section, enable Beta features first.
          </CnxStep>
          <CnxStep n={2} t="Add a custom connector">
            Click <b>Add custom connector</b>, name it <b>Clerow</b>, and paste the server URL. Leave Advanced
            settings empty.
            <div className="cnx-code">
              <code>{MCP_URL}</code>
              <CnxCopy value={MCP_URL} />
            </div>
          </CnxStep>
          <CnxStep n={3} t="Sign in to Clerow">
            Claude opens Clerow in your browser. Sign in with the same account you use here — new accounts get a
            free scan.
          </CnxStep>
          <CnxStep n={4} t="Approve the connection">
            Click <b>Approve</b> and you’ll land back in Claude. From now on, just ask it to work on your AI
            visibility — it calls Clerow and the results land in chat.
          </CnxStep>
        </ol>
      ) : (
        <ol className="cnx-steps">
          <CnxStep n={1} t="Create a Clerow MCP key">
            We only store a hash — copy it now, it won’t be shown again.
            <button className="cnx-keybtn" onClick={createKey} disabled={creating}>
              {creating ? "Creating…" : fresh ? "Create another key" : "Create MCP key"}
            </button>
            {fresh && (
              <div className="cnx-fresh">
                <b>Your new key — copy it now</b>
                <code>{fresh}</code>
              </div>
            )}
          </CnxStep>
          <CnxStep n={2} t="Add Clerow to your agent">
            Run this in your terminal (Cursor and other MCP clients use the same URL + Bearer key).
            <div className="cnx-code">
              <code>{cmd}</code>
              <CnxCopy value={cmd} />
            </div>
          </CnxStep>
          <CnxStep n={3} t="Start shipping">
            Ask your agent for your top task, let it generate the file and commit it, then have it mark the task
            done to keep your streak.
          </CnxStep>
        </ol>
      )}

      <h2 className="lp-sec">Ask Claude things like</h2>
      <div className="cnx-try">
        {[
          "Where am I losing to competitors across ChatGPT, Claude and Perplexity?",
          "What’s the highest-impact GEO task I should ship today?",
          "Generate my llms.txt and robots.txt and write them to my repo.",
          "Write the FAQ + JSON-LD for my top buyer question and open a PR.",
          "Mark that task done and keep my streak.",
        ].map((q) => (
          <div key={q} className="cnx-try-item">
            <span className="q">💬</span>
            <span>“{q}”</span>
          </div>
        ))}
      </div>

      <h2 className="lp-sec">Five tools, one connector</h2>
      <div className="cnx-tools">
        <CnxTool name="get_visibility">
          Your live AI visibility across ChatGPT, Claude, Perplexity &amp; Gemini — score, rank, sentiment, the
          competitors above you, and the domains AI cites. The moat.
        </CnxTool>
        <CnxTool name="list_tasks">
          Your prioritized GEO ladder — “The Climb.” The active level’s tasks with impact and XP, plus a summary
          of every level.
        </CnxTool>
        <CnxTool name="get_site_audit">
          A technical audit of your own site: AI-crawler robots.txt, llms.txt, HTTPS, title, H1, meta, structured
          data — each with a concrete fix.
        </CnxTool>
        <CnxTool name="get_task_content" pro>
          The finished, ready-to-ship artifact for a task — an actual robots.txt / llms.txt, or copy-paste
          Markdown (FAQ + JSON-LD, comparison page).
        </CnxTool>
        <CnxTool name="complete_task" pro>
          Marks a task done after your agent ships it — stamps completion so it keeps your streak and awards XP.
        </CnxTool>
      </div>
    </div>
  );
}
