/* Clerow — Learn-path dashboard (dark, Duolingo-style) */

const OFF = [0, -52, -76, -52, 0, 52, 76, 52];

function LDIcon({ name }) {
  const p = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "learn":  return <svg {...p}><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>;
    case "board":  return <svg {...p}><path d="M6 4h12v3a6 6 0 0 1-12 0z"/><path d="M9 20h6M12 13v7"/></svg>;
    case "quest":  return <svg {...p}><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M3 12h18M12 8v12"/><path d="M7 8a3 3 0 0 1 5-2 3 3 0 0 1 5 2"/></svg>;
    case "scan":   return <svg {...p}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>;
    case "profile":return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case "more":   return <svg {...p}><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>;
    case "book":   return <svg {...p}><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><path d="M8 7h7M8 11h7"/></svg>;
    case "bolt":   return <svg {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>;
    case "lock":   return <svg {...p}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
    case "check":  return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
    default: return null;
  }
}

/* ---------------- Left nav ---------------- */
function LearnNav({ page, onNav }) {
  const items = [
    { k: "learn", i: "learn", l: "Tasks" },
    { k: "prompts", i: "quest", l: "Prompts" },
    { k: "models", i: "scan", l: "AI Models" },
    { k: "leaderboard", i: "board", l: "Leaderboard" },
    { k: "scan", i: "scan", l: "Scan" },
    { k: "profile", i: "profile", l: "Profile" },
  ];
  return (
    <nav className="ld-nav">
      <div className="ld-brand"><MascotClerow size={34} /><span>Clerow</span></div>
      {items.map((it) => (
        <a key={it.k} className={`ld-navitem ${page === it.k ? "on" : ""}`} onClick={() => onNav(it.k)}>
          <span className="ic"><LDIcon name={it.i} /></span><span>{it.l}</span>
        </a>
      ))}
      <div className="ld-nav-spacer" />
    </nav>
  );
}

/* ---------------- Top stat bar ---------------- */
function LearnTop() {
  const models = [
    { l: "C", c: "#10A37F" }, { l: "A", c: "#D97706" }, { l: "P", c: "#1CB0F6" }, { l: "G", c: "#4285F4" }, { l: "X", c: "#566270" },
  ];
  return (
    <div className="ld-top">
      <div className="dom">
        <MascotClerow size={26} /> warbls.com
        <span className="mono">· scanned across</span>
        <span className="model-cluster">
          {models.map((m, i) => <span key={i} className="mc" style={{ background: m.c }}>{m.l}</span>)}
        </span>
      </div>
      <span className="stat-pill streak"><span className="ic">🔥</span>12</span>
      <span className="stat-pill xp"><span className="ic">💎</span>740</span>
      <span className="stat-pill heart"><span className="ic">📊</span>18</span>
    </div>
  );
}

/* ---------------- The path ---------------- */
function LearnPath({ onOpen }) {
  let nodeIdx = -1;
  const next = () => { nodeIdx += 1; return OFF[nodeIdx % OFF.length]; };

  const Node = ({ kind, icon, cap, xp, start, mascot, task }) => {
    const off = next();
    const clickable = kind !== "locked";
    return (
      <div className="node-row">
        <div className={`node ${kind}`} style={{ transform: `translateX(${off}px)` }}>
          {start && <span className="start-bubble">Start</span>}
          <button className="node-btn" onClick={clickable ? () => onOpen(task) : undefined}>
            {kind === "locked" ? <LDIcon name="lock" /> : icon}
          </button>
          {cap && <span className="node-cap">{cap}</span>}
          {xp != null && <span className="node-xp">{kind === "done" ? "✓ earned" : `+${xp} XP`}</span>}
          {mascot && <span className="node-mascot"><MascotClerow size={56} float /></span>}
        </div>
      </div>
    );
  };

  return (
    <div className="ld-path">
      {/* Unit 1 */}
      <div className="unit-banner">
        <div>
          <div className="k">Level 1 · Unit 1</div>
          <h3>Quick Wins — get AI to read you</h3>
        </div>
        <button className="unit-guide"><LDIcon name="book" /> Guide</button>
      </div>

      <div className="path-wrap">
        <Node kind="done" icon="🤖" cap="Allow AI crawlers (robots.txt)" xp={20}
          task={TASKS.robots} />
        <Node kind="done" icon="🗺️" cap="Add llms.txt" xp={25} task={TASKS.llms} />
        <Node kind="current" icon="①" cap="Give your homepage one clear H1" xp={20} start mascot task={TASKS.h1} />
        <Node kind="locked" cap="Write meta descriptions ×8" xp={25} task={TASKS.meta} />
        <Node kind="mcp" icon="🤖" cap="Auto-fix the rest with Clerow MCP" task={TASKS.mcp} />
        <Node kind="checkpoint" icon="🚩" cap="Re-scan checkpoint" task={TASKS.rescan} />
      </div>

      <div className="unit-sep">Level 2 · Structure</div>

      <div className="unit-banner locked">
        <div>
          <div className="k">Level 2 · Unit 1</div>
          <h3>Structure — help AI understand you</h3>
        </div>
        <span className="unit-guide"><LDIcon name="lock" /> Locked</span>
      </div>
      <div className="path-wrap">
        <Node kind="locked" cap="Add Product schema" xp={40} />
        <Node kind="locked" cap="Add FAQ schema" xp={30} />
        <Node kind="locked" cap="Fix H2 / H3 hierarchy" xp={25} />
      </div>
    </div>
  );
}

/* ---------------- Task definitions ---------------- */
const TASKS = {
  robots: { tag: "DONE", title: "Allow AI crawlers in robots.txt", num: 1,
    why: "GPTBot and ClaudeBot were blocked — they literally could not read warbls.com.",
    evi: "We checked your robots.txt across all 4 models. 0 of 4 could crawl you.", xp: 20, done: true },
  llms: { tag: "DONE", title: "Add an llms.txt file", num: 2,
    why: "A plain-text map that tells AI what Warbls is and which pages matter most.",
    evi: "llms.txt is the emerging standard AI crawlers look for first.", xp: 25, done: true },
  h1: { tag: "FIX", title: "Give your homepage one clear H1", num: 3,
    why: "Your homepage had 3 competing H1 tags. AI couldn't tell what Warbls actually does, so it skipped you in 'best AI music generator' answers.",
    evi: "Found 3 <h1> tags on warbls.com. AI rewards one clear headline.", xp: 20, diyTime: "3 min",
    steps: [
      "Open your homepage template (index / layout file).",
      "Keep ONE <h1> and make it say what Warbls does — e.g. <h1>Warbls — AI music generator</h1>.",
      "Demote the other two headings to <h2>.",
      "Save, deploy, then re-scan to confirm.",
    ],
    cmd: 'Clerow: on warbls.com, fix the homepage so it has ONE <h1> reading "Warbls — AI music generator" and demote the other two to <h2>. Open a PR, then re-check all 4 AI models.' },
  meta: { tag: "FIX", title: "Write meta descriptions for 8 pages", num: 4,
    why: "8 pages are missing meta descriptions — that's often the exact snippet AI quotes back to a user.",
    evi: "8 of 12 pages have no <meta description>.", xp: 25, diyTime: "8 min",
    steps: [
      "List the 8 pages flagged below (we exported them for you).",
      "For each, write a 150-char description that names Warbls + the page's job.",
      "Add it as <meta name=\"description\" content=\"…\"> in the <head>.",
      "Deploy and re-scan.",
    ],
    cmd: 'Clerow: write and add <meta description> tags to the 8 pages on warbls.com that are missing them. Each ~150 chars, mention Warbls. Open a PR and re-check all 4 models.' },
  mcp: { tag: "AUTOPILOT", title: "Let Clerow MCP fix everything", num: 5,
    why: "Connect Clerow to Claude Code, Cursor, or any agent. It reads your open quests, ships the fixes as a PR, and Clerow re-checks all 4 models to confirm it worked.",
    evi: "Agents using Clerow MCP close a level ~6× faster than doing it by hand.", xp: 0, isMcp: true },
  rescan: { tag: "CHECKPOINT", title: "Re-scan across all 4 AI models", num: 6,
    why: "Once Level 1 is clear, re-scan to bank your gains and reveal the next set of fixes. This is the part one chatbot can't do for you — Clerow queries ChatGPT, Claude, Perplexity AND Gemini.",
    evi: "Your last scan: visibility 6% · sentiment 72.", xp: 0, isRescan: true },
};

/* ---------------- Right rail ---------------- */
function LearnRail({ onConnect }) {
  const models = [
    { l: "C", c: "#10A37F", n: "ChatGPT", v: "9%", ok: true },
    { l: "A", c: "#D97706", n: "Claude", v: "6%", ok: true },
    { l: "P", c: "#1CB0F6", n: "Perplexity", v: "0%", ok: false },
    { l: "X", c: "#566270", n: "Grok", v: "0%", ok: false },
    { l: "G", c: "#4285F4", n: "Gemini", v: "0%", ok: false },
  ];
  return (
    <aside className="ld-rail">
      {/* Multi-model — the secret sauce */}
      <div className="rail-card">
        <h4>Scanned across 5 AIs</h4>
        <p className="sub">Each model cites differently. One chatbot can't see the others — Clerow watches all of them.</p>
        <div className="rail-models">
          {models.map((m, i) => (
            <div key={i} className="rail-model">
              <span className="mc" style={{ background: m.c }}>{m.l}</span>{m.n}
              <span className={`st ${m.ok ? "ok" : "no"}`}>{m.v}</span>
            </div>
          ))}
        </div>
        <div className="rail-note"><b>Why Clerow &gt; just asking Claude:</b> Claude can't tell you how ChatGPT or Perplexity rank you. Clerow can.</div>
      </div>

      {/* MCP */}
      <div className="mcp-card">
        <span className="mcp-tag">⚡ Clerow MCP</span>
        <h4>Let your AI do the work</h4>
        <p>Plug Clerow into Claude Code, Cursor or any agent. It ships the fixes — Clerow verifies across every model.</p>
        <div className="mcp-snippet"><span>$ clerow mcp connect</span><span className="cp">copy</span></div>
        <button className="btn-violet" onClick={onConnect}>Connect MCP</button>
      </div>

      {/* Daily quests */}
      <div className="rail-card">
        <h4>Daily quests</h4>
        <div className="rail-mini-q">
          <span className="qc">⚡</span><span className="qt">Clear 1 task today</span><span className="qx">+10</span>
        </div>
        <div className="rail-bar"><i style={{ width: "0%" }} /></div>
        <div className="rail-mini-q" style={{ borderBottom: 0, marginTop: 6 }}>
          <span className="qc">🔥</span><span className="qt">Keep your 12-day streak</span><span className="qx">+5</span>
        </div>
      </div>

      {/* Unlock leaderboard */}
      <div className="rail-card rail-super">
        <span className="rail-lock"><LDIcon name="lock" /></span>
        <div><h4 style={{ margin: 0 }}>Unlock the leaderboard</h4><p className="sub" style={{ margin: "4px 0 0" }}>Clear Level 1 to start competing in your category.</p></div>
      </div>
    </aside>
  );
}

Object.assign(window, { LearnNav, LearnTop, LearnPath, LearnRail, TASKS, LDIcon });
