/* Prompts — tracked queries, intent tags, model presence, position, trend.
   Gamification hook: invisible rows become quests with XP. */

function PagePrompts({ onNavigate }) {
  const [tab, setTab] = React.useState("tracked"); // tracked | suggested
  return (
    <>
      <PageHead
        title="Prompts"
        sub="The queries we run against AI models to see how you show up."
        actions={
          <>
            <button className="btn btn--ghost btn--sm"><Icon name="download" size={14} />Export CSV</button>
            <button className="btn btn--primary btn--sm"><Icon name="plus" size={14} />Add prompt</button>
          </>
        }
      />

      <div className="page-stats">
        <PageStat label="Tracked" value="40" sub="prompts" />
        <PageStat label="You appear in" value="14/40" sub="35% visibility" hi="success" />
        <PageStat label="Winning" value="6" sub="position 1–3" hi="success" />
        <PageStat label="Losing" value="8" sub="position 4–10" hi="warn" />
        <PageStat label="Invisible" value="26" sub="not cited" hi="danger" />
      </div>

      <div className="page-tabs">
        <button className={tab === "tracked" ? "on" : ""} onClick={() => setTab("tracked")}>
          Tracked <span className="cnt">40</span>
        </button>
        <button className={tab === "suggested" ? "on" : ""} onClick={() => setTab("suggested")}>
          AI-suggested <span className="cnt">12</span>
        </button>
      </div>

      {tab === "tracked" ? <PromptsTracked onNavigate={onNavigate} /> : <PromptsSuggested />}
    </>
  );
}

function PageStat({ label, value, sub, hi }) {
  const cls = hi ? `page-stat page-stat--${hi}` : "page-stat";
  return (
    <div className={cls}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}

function PromptsTracked({ onNavigate }) {
  const intents = {
    problem:    { l: "Problem-aware", c: "#7C3AED" },
    solution:   { l: "Solution-aware", c: "#1CB0F6" },
    branded:    { l: "Branded",        c: "#F59E0B" },
    compare:    { l: "Comparison",     c: "#E11D48" },
  };

  const rows = [
    { p: "best project management for engineering teams", intent: "solution", chatgpt: true, claude: true, perplex: true, gemini: false, pos: "#2", up: true, trend: "+0.4" },
    { p: "best project management for startups",          intent: "solution", chatgpt: false, claude: false, perplex: false, gemini: false, pos: "—",  invisible: true },
    { p: "Linear vs Jira",                                intent: "compare",  chatgpt: true, claude: true, perplex: true, gemini: true, pos: "#1", up: true, trend: "+1.2" },
    { p: "what is the best issue tracker for product teams", intent: "solution", chatgpt: true, claude: false, perplex: true, gemini: false, pos: "#3", up: false, trend: "−0.2" },
    { p: "how to track engineering velocity",             intent: "problem", chatgpt: false, claude: true, perplex: false, gemini: false, pos: "#6", losing: true, trend: "+0.1", up: true },
    { p: "Linear pricing",                                intent: "branded", chatgpt: true, claude: true, perplex: true, gemini: true, pos: "#1", up: true, trend: "+0" },
    { p: "alternatives to Notion for product roadmaps",   intent: "compare",  chatgpt: false, claude: false, perplex: false, gemini: false, pos: "—",  invisible: true },
    { p: "best tool for sprint planning",                 intent: "solution", chatgpt: true, claude: false, perplex: false, gemini: false, pos: "#5", losing: true, trend: "−0.3", up: false },
    { p: "what software do YC startups use",              intent: "problem", chatgpt: true, claude: true, perplex: true, gemini: false, pos: "#2", up: true, trend: "+0.6" },
    { p: "Linear review",                                 intent: "branded", chatgpt: true, claude: true, perplex: true, gemini: true, pos: "#1", up: true, trend: "+0.1" },
    { p: "best Jira alternative 2026",                    intent: "compare",  chatgpt: false, claude: true, perplex: false, gemini: false, pos: "#7", invisible: false, losing: true, trend: "−0.1", up: false },
    { p: "fastest project management software",           intent: "solution", chatgpt: false, claude: false, perplex: false, gemini: false, pos: "—",  invisible: true },
  ];

  return (
    <div className="app-card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="data-table">
        <div className="dt-head">
          <span style={{ flex: 2.5 }}>Prompt</span>
          <span style={{ flex: 0.9 }}>Intent</span>
          <span style={{ flex: 1.1, justifyContent: "center", display: "flex" }}>Models</span>
          <span style={{ flex: 0.4, textAlign: "center" }}>Pos.</span>
          <span style={{ flex: 0.55, textAlign: "right" }}>Trend</span>
          <span style={{ flex: 1.0, textAlign: "right" }}>Action</span>
        </div>
        {rows.map((r, i) => {
          const intent = intents[r.intent];
          return (
            <div key={i} className={`dt-row ${r.invisible ? "dt-row--invisible" : ""} ${r.losing ? "dt-row--losing" : ""}`}>
              <span style={{ flex: 2.5 }} className="dt-prompt">{r.p}</span>
              <span style={{ flex: 0.9 }}>
                <span className="intent-tag" style={{ background: `color-mix(in oklab, ${intent.c} 14%, white)`, color: intent.c, border: `1px solid color-mix(in oklab, ${intent.c} 30%, transparent)` }}>
                  {intent.l}
                </span>
              </span>
              <span style={{ flex: 1.1, display: "flex", justifyContent: "center", gap: 4 }}>
                <ModelDot lit={r.chatgpt}  bg="#10A37F" k="C" />
                <ModelDot lit={r.claude}   bg="#D97706" k="A" />
                <ModelDot lit={r.perplex}  bg="#1CB0F6" k="P" />
                <ModelDot lit={r.gemini}   bg="#4285F4" k="G" />
              </span>
              <span style={{ flex: 0.4, textAlign: "center" }} className="dt-pos">{r.pos}</span>
              <span style={{ flex: 0.55, textAlign: "right" }} className={`dt-trend ${r.up ? "up" : r.up === false ? "down" : ""}`}>
                {r.trend || "—"}
              </span>
              <span style={{ flex: 1.0, textAlign: "right" }}>
                {r.invisible
                  ? <button className="btn-quest" onClick={() => onNavigate("quests")}>
                      Make quest <b>+90 XP</b>
                    </button>
                  : r.losing
                    ? <button className="btn-quest btn-quest--alt" onClick={() => onNavigate("quests")}>
                        Boost <b>+50 XP</b>
                      </button>
                    : <span className="dt-winning">Winning ✓</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModelDot({ lit, bg, k }) {
  return (
    <span className={`model-dot ${lit ? "lit" : ""}`} style={{ background: lit ? bg : undefined }} title={k}>
      {k}
    </span>
  );
}

function PromptsSuggested() {
  const suggested = [
    { p: "best AI-friendly project tools 2026",       intent: "solution", vol: "high",   why: "12 of your competitors track this, you don't.", xp: 60 },
    { p: "issue tracker for remote teams",             intent: "solution", vol: "high",   why: "Buyers from your YC cohort search this.",      xp: 60 },
    { p: "Linear vs Shortcut",                         intent: "compare",  vol: "medium", why: "Shortcut is rising in Perplexity.",            xp: 80 },
    { p: "best CLI-first project management",          intent: "solution", vol: "low",    why: "Niche but high intent. Matches your audience.", xp: 40 },
    { p: "Linear API for AI agents",                   intent: "branded",  vol: "rising", why: "New trend — your dev tools angle fits.",       xp: 60 },
    { p: "alternatives to Jira for designers",         intent: "compare",  vol: "high",   why: "You don't appear here. Notion does.",          xp: 80 },
    { p: "how to plan a sprint without meetings",      intent: "problem",  vol: "medium", why: "Educational content gap in your niche.",       xp: 40 },
    { p: "what do YC W26 startups use for tickets",    intent: "problem",  vol: "rising", why: "ChatGPT cites HN threads for this.",           xp: 60 },
  ];
  const intents = {
    problem:    { l: "Problem-aware", c: "#7C3AED" },
    solution:   { l: "Solution-aware", c: "#1CB0F6" },
    branded:    { l: "Branded",        c: "#F59E0B" },
    compare:    { l: "Comparison",     c: "#E11D48" },
  };
  return (
    <>
      <div className="callout">
        <span className="callout-ico">✨</span>
        <div>
          <b>12 prompts your customers actually ask.</b>
          <span> Suggested by Clerow based on the company info you shared during onboarding. Track them to grow your visibility surface.</span>
        </div>
        <button className="btn btn--primary btn--sm">Track all 12</button>
      </div>

      <div className="suggest-grid">
        {suggested.map((s, i) => {
          const it = intents[s.intent];
          return (
            <div key={i} className="suggest-card">
              <div className="suggest-head">
                <span className="intent-tag" style={{ background: `color-mix(in oklab, ${it.c} 14%, white)`, color: it.c, border: `1px solid color-mix(in oklab, ${it.c} 30%, transparent)` }}>
                  {it.l}
                </span>
                <span className={`vol vol--${s.vol}`}>{s.vol}</span>
              </div>
              <div className="suggest-prompt">"{s.p}"</div>
              <div className="suggest-why">{s.why}</div>
              <div className="suggest-foot">
                <span className="suggest-xp">+{s.xp} XP on track</span>
                <button className="btn btn--ghost btn--sm">Track</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

Object.assign(window, { PagePrompts });
