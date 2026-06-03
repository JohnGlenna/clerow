"use client";

import React from "react";
import { LpHead } from "../shared/PageBits";

const MCP_URL = "https://clerow.com/api/mcp";

// Per-client connect info — same set as the in-task MCP hand-off pop-up (no keys;
// the client runs the OAuth browser flow on first call).
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

// A copyable command block — the same "Run in your terminal · ⧉ Copy command"
// block shown in the in-task MCP pop-up.
function CnxCmd({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="cnx-cmd">
      <div className="cnx-cmd-h">
        <span>{label}</span>
        <button
          className={`cnx-cmd-copy ${copied ? "on" : ""}`}
          onClick={() => {
            navigator.clipboard?.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? "Copied ✓" : "⧉ Copy command"}
        </button>
      </div>
      <pre>{text}</pre>
    </div>
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
// One way in: paste the URL, sign in, approve. OAuth does the rest — no keys to
// copy, paste, or rotate.
export function ConnectPage() {
  const [client, setClient] = React.useState<"claudecode" | "codex" | "ide" | "web">("claudecode");
  const active = MCP_CLIENTS.find((c) => c.key === client)!;

  return (
    <div className="ld-page">
      <LpHead
        eyebrow="⚡ Clerow MCP"
        title="Let Claude do your GEO work — free"
        sub="Connect Clerow to your AI agent for free — it reads where AI engines recommend your competitors instead of you, writes your Level 1 GEO foundations (robots.txt, llms.txt and more) into your repo, and checks them off to keep your streak. Levels 2–5 of the Climb live in the Clerow dashboard."
      />

      <div className="cnx-hero">
        <span className="mcp-tag">Your MCP server</span>
        <div className="cnx-url">
          <code>{MCP_URL}</code>
          <CnxCopy value={MCP_URL} label="Copy URL" />
        </div>
        <p className="cnx-hero-note">
          🔒 Sign-in handled by OAuth — no API keys to copy or paste. Approve once in your browser and revoke
          anytime in Settings.
        </p>
      </div>

      <div className="cnx-connect">
        <div className="cnx-connect-h">Step 1 · Connect Clerow (one-time)</div>
        <p className="cnx-connect-note">
          Add the Clerow MCP server to your agent, then <b>sign in &amp; approve in your browser</b>.
        </p>
        <div className="cnx-clienttabs" role="tablist">
          {MCP_CLIENTS.map((c) => (
            <button
              key={c.key}
              role="tab"
              aria-selected={client === c.key}
              className={`cnx-clienttab ${client === c.key ? "on" : ""}`}
              onClick={() => setClient(c.key)}
            >
              {c.tab}
            </button>
          ))}
        </div>
        <CnxCmd label={active.label} text={active.cmd} />
        <p className="cnx-connect-hint">{active.hint}</p>
      </div>

      <ol className="cnx-steps">
        <CnxStep n={2} t="Sign in &amp; approve">
          The first time your agent calls Clerow it opens this site in your browser. Sign in with the same
          account you use here, click <b>Approve</b>, and the agent is connected — it stores the token and
          refreshes it for you. New accounts get a free scan.
        </CnxStep>
        <CnxStep n={3} t="Start shipping">
          Ask your agent for your top Level 1 task, let it write the fix into your repo, then have it mark the
          task done to keep your streak.
        </CnxStep>
      </ol>

      <h2 className="lp-sec">Ask Claude things like</h2>
      <div className="cnx-try">
        {[
          "Where am I losing to competitors across ChatGPT, Claude and Perplexity?",
          "What’s my highest-impact Level 1 task — and ship it for me.",
          "Generate my llms.txt and robots.txt and write them to my repo.",
          "Run my site audit and fix what’s blocking AI crawlers, then commit it.",
          "Mark that task done and keep my streak.",
        ].map((q) => (
          <div key={q} className="cnx-try-item">
            <span className="q">💬</span>
            <span>“{q}”</span>
          </div>
        ))}
      </div>

      <h2 className="lp-sec">What the free MCP ships — and what’s Premium</h2>
      <div className="cnx-modes">
        <div className="cnx-mode">
          <div className="cnx-mode-h"><span className="cnx-mode-ic on">🛠️</span><div><b>Free · Level 1 foundations</b><span>Your agent ships these</span></div></div>
          <p>The technical groundwork that gets you read &amp; cited by AI: a robots.txt that welcomes AI crawlers, llms.txt, and your title / H1 / meta fixes — your agent gets the file (or a brief), writes it <b>into your repo</b>, and you review and merge.</p>
          <div className="cnx-mode-tags">{["robots.txt", "llms.txt", "title · H1 · meta", "site audit"].map((t) => <span key={t}>{t}</span>)}</div>
        </div>
        <div className="cnx-mode">
          <div className="cnx-mode-h"><span className="cnx-mode-ic off">⭐</span><div><b>Premium · Levels 2–5</b><span>In the Clerow dashboard</span></div></div>
          <p>The rest of the Climb: on-page structure &amp; JSON-LD schema, authority &amp; off-site citations (Reddit, G2, guest posts — drafted for you to post), and comparison / landing pages to win buyer queries. Unlock the full ladder and re-scans in the dashboard.</p>
          <div className="cnx-mode-tags">{["JSON-LD schema", "FAQ + pages", "Reddit · G2", "comparison pages"].map((t) => <span key={t}>{t}</span>)}</div>
        </div>
      </div>

      <h2 className="lp-sec">Five tools, one connector</h2>
      <div className="cnx-tools">
        <CnxTool name="get_visibility">
          Your live AI visibility across ChatGPT, Claude, Perplexity &amp; Gemini — score, rank, sentiment, the
          competitors above you, and the domains AI cites. The moat.
        </CnxTool>
        <CnxTool name="list_tasks">
          Your prioritized GEO ladder — “The Climb.” Your free <b>Level 1</b> tasks with impact and XP, plus a
          summary of every level (Levels 2–5 are Premium, in the dashboard).
        </CnxTool>
        <CnxTool name="get_site_audit">
          A technical audit of your own site: AI-crawler robots.txt, llms.txt, HTTPS, title, H1, meta, structured
          data — each with a concrete fix.
        </CnxTool>
        <CnxTool name="get_task_content">
          For a <b>Level 1</b> task: the actual robots.txt / llms.txt file, or a brief — the GEO rules plus your
          brand &amp; competitor context — for your agent to write the finished, repo-aware content from.
        </CnxTool>
        <CnxTool name="complete_task">
          Marks a <b>Level 1</b> task done after your agent ships it — stamps completion so it keeps your streak
          and awards XP.
        </CnxTool>
      </div>
    </div>
  );
}
