/* In-app dashboard shell — sidebar + topbar + page outlet */

function AppDashboard({ showMascot, onSignOut, page, onNavigate, freemium }) {
  const isLocked = freemium && page !== "overview";
  return (
    <div className="app-shell">
      <AppSidebar showMascot={showMascot} onSignOut={onSignOut} page={page} onNavigate={onNavigate} freemium={freemium} />
      <main className="app-main" style={{ position: "relative" }}>
        {page === "overview"    && <PageOverview     showMascot={showMascot} onNavigate={onNavigate} freemium={freemium} />}
        {page === "prompts"     && <PagePrompts      onNavigate={onNavigate} />}
        {page === "sources"     && <PageSources      onNavigate={onNavigate} />}
        {page === "models"      && <PageModels       onNavigate={onNavigate} />}
        {page === "quests"      && <PageQuests       onNavigate={onNavigate} />}
        {page === "leaderboard" && <PageLeaderboard  onNavigate={onNavigate} />}
        {page === "reports"     && <PageReports      onNavigate={onNavigate} />}
        {isLocked && <PaywallOverlay page={page} onNavigate={onNavigate} />}
      </main>
    </div>
  );
}

/* Paywall — shown over teased page content for non-subscribers */
function PaywallOverlay({ page, onNavigate }) {
  const pages = {
    prompts:     { title: "Unlock Prompts",     desc: "See all 42 prompts your customers ask AI — every model, every position, with quest hooks to start winning.", icon: "🎯" },
    sources:    { title: "Unlock Sources",     desc: "See which Reddit threads, G2 listings, and YouTube channels AI cites — and which ones your rivals own.", icon: "🌐" },
    models:     { title: "Unlock AI Models",   desc: "Track ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews — and learn how each one sources answers.", icon: "🤖" },
    quests:     { title: "Unlock Quests",      desc: "Your daily playbook to climb. Concrete steps with XP, streaks, and one-click 'how to' instructions.", icon: "⚔️" },
    leaderboard:{ title: "Unlock Leaderboard", desc: "Race your category — and 3,140 other Clerow founders. Track gap-to-next, defenders, and weekly climbers.", icon: "🏆" },
    reports:    { title: "Unlock Reports",     desc: "Auto-generated weekly summaries. Clerow Wrapped share cards for X. White-label client reports on Team.", icon: "📊" },
  };
  const p = pages[page] || { title: "Unlock this page", desc: "Pick a plan to keep going.", icon: "✨" };
  return (
    <div className="paywall">
      <div className="paywall-card">
        <span className="paywall-icon">{p.icon}</span>
        <h2>{p.title}</h2>
        <p>{p.desc}</p>

        <div className="paywall-plans">
          <PaywallPlan name="Founder"    price={29}  desc="1 domain · 3 AI models"  cta="Start free" />
          <PaywallPlan name="Marketing Team" price={89} desc="1 domain · 5 seats · all models" cta="Start free" tag="Most popular" />
          <PaywallPlan name="Enterprise" price={249} desc="1 domain · unlimited seats" cta="Talk to sales" />
        </div>

        <div className="paywall-foot">
          <button className="btn btn--quiet btn--sm" onClick={() => onNavigate("overview")}>← Back to overview</button>
          <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 700 }}>Cancel anytime</span>
        </div>
      </div>
    </div>
  );
}

function PaywallPlan({ name, price, desc, cta, featured, tag }) {
  return (
    <div className={`pw-plan ${featured ? "pw-plan--featured" : ""}`}>
      {tag && <span className="pw-tag">⭐ {tag}</span>}
      <div className="pw-name">{name}</div>
      <div className="pw-price"><span className="cur">$</span>{price}<span className="per">/mo</span></div>
      <div className="pw-desc">{desc}</div>
      <button className={`btn btn--${featured ? "primary" : "ghost"} btn--sm btn--full`}>{cta}</button>
    </div>
  );
}

/* -------- Sidebar -------- */
function AppSidebar({ showMascot, onSignOut, page, onNavigate, freemium }) {
  const nav = [
    { i: "home",   l: "Overview",    k: "overview" },
    { i: "list",   l: "Prompts",     k: "prompts",     lock: true },
    { i: "globe",  l: "Sources",     k: "sources",     lock: true },
    { i: "ai",     l: "AI Models",   k: "models",      lock: true },
    { i: "trophy", l: "Quests",      k: "quests",      lock: true },
    { i: "users",  l: "Leaderboard", k: "leaderboard", lock: true },
    { i: "bar",    l: "Reports",     k: "reports",     lock: true },
  ];
  const bottom = [
    { i: "bell",     l: "Notifications" },
    { i: "settings", l: "Settings" },
  ];
  return (
    <aside className="app-side">
      <a className="app-brand" href="#/" onClick={(e) => { e.preventDefault(); onNavigate("overview"); }}>
        {showMascot ? <MascotOwl pose="sit" size={30} /> : null}
        Clerow
      </a>

      <div className="app-nav">
        <div className="app-side-label">Workspace</div>
        {nav.map((n, i) => (
          <a key={i} className={page === n.k ? "on" : ""}
             href={`#/dashboard/${n.k === "overview" ? "" : n.k}`}
             onClick={(e) => { e.preventDefault(); onNavigate(n.k); }}>
            <span className="ico"><Icon name={n.i} size={16} /></span>
            <span style={{ flex: 1 }}>{n.l}</span>
            {freemium && n.lock && <span className="nav-lock">🔒</span>}
          </a>
        ))}
      </div>

      <div className="app-nav" style={{ marginTop: -8 }}>
        <div className="app-side-label">Account</div>
        {bottom.map((n, i) => (
          <a key={i} href="#">
            <span className="ico"><Icon name={n.i} size={16} /></span>
            <span>{n.l}</span>
          </a>
        ))}
        <a href="#/" onClick={onSignOut} style={{ color: "var(--danger)" }}>
          <span className="ico" style={{ color: "var(--danger)" }}><Icon name="lock" size={16} /></span>
          <span>Sign out</span>
        </a>
      </div>

      <div className="app-side-bottom">
        <div className="row">
          <span className="lvl">⚡ Level 7</span>
          <span className="xp">740 / 1000</span>
        </div>
        <div className="bar"><i style={{ width: "74%" }} /></div>
        <div className="row" style={{ fontSize: 11, color: "var(--ink-2)", fontWeight: 600 }}>
          <span>SEO Apprentice</span>
          <span>→ SEO Mage</span>
        </div>
      </div>
    </aside>
  );
}

/* -------- Shared page header -------- */
function PageHead({ title, sub, actions }) {
  return (
    <div className="app-top">
      <div>
        <div className="ttl">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {actions && <div className="app-top-actions">{actions}</div>}
    </div>
  );
}

/* -------- OVERVIEW (was the main dashboard) -------- */
function PageOverview({ showMascot, onNavigate }) {
  return (
    <>
      <PageHead
        title="Overview"
        sub="linear.app · scanning daily · last update 2 min ago"
        actions={
          <>
            <button className="btn btn--ghost btn--sm"><Icon name="download" size={14} />Export</button>
            <button className="btn btn--primary btn--sm"><Icon name="bolt" size={14} />Re-scan now</button>
          </>
        }
      />
      <AppHello showMascot={showMascot} />

      <div className="app-grid">
        <ScoreCard />
        <TasksCard onNavigate={onNavigate} />
      </div>

      <div className="app-grid">
        <ModelsCard onNavigate={onNavigate} />
        <CompetitorsCard onNavigate={onNavigate} />
      </div>

      <AchievementsCard />
    </>
  );
}

function AppHello({ showMascot }) {
  return (
    <div className="app-hello">
      <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--bg-soft)", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {showMascot ? <MascotOwl pose="wave" size={44} /> : <span style={{ fontSize: 28 }}>🦉</span>}
      </div>
      <div className="greet">
        Welcome back, John.
        <small>You climbed 2 positions in ChatGPT this week. Keep going. ✨</small>
      </div>
      <div className="streak-mini">🔥 12</div>
    </div>
  );
}

function ScoreCard() {
  return (
    <div className="app-card">
      <div className="app-card-head">
        <h4>Your AI visibility score</h4>
        <span className="sub" style={{ color: "var(--success)" }}>+12 this month ↑</span>
      </div>

      <div className="score-row">
        <ScoreRing value={68} />
        <div className="score-stats">
          <ScoreStat label="Visibility" icon="eye"    value="66%" pct={66} color="#F59E0B" />
          <ScoreStat label="Position"   icon="target" value="#2"  pct={84} color="#1CB0F6" />
          <ScoreStat label="Sentiment"  icon="smile"  value="92"  pct={92} color="#58CC02" />
        </div>
      </div>

      <div className="mini-chart" />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-3)", fontWeight: 700 }}>
        <span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>W5</span><span>W6</span><span>W7</span><span>W8</span>
      </div>
    </div>
  );
}

function ScoreRing({ value, size = 156 }) {
  const r = size / 2 - 14, c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-soft-2)" strokeWidth="14" />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#scoreGrad)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFC800"/>
            <stop offset="100%" stopColor="#F59E0B"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="num">
        <b>{value}</b>
        <span>visibility score</span>
      </div>
    </div>
  );
}

function ScoreStat({ label, icon, value, pct, color }) {
  return (
    <div className="score-stat">
      <span className="label"><span className="ico"><Icon name={icon} size={14} /></span>{label}</span>
      <span className="bar"><i style={{ width: `${pct}%`, background: color }} /></span>
      <span className="val">{value}</span>
    </div>
  );
}

function TasksCard({ onNavigate }) {
  const initial = [
    { t: "Add FAQ schema to homepage",         m: "≈ 10 min · impact: high",      xp: 50,  done: true },
    { t: "Write 1 comparison page (vs. Jira)", m: "≈ 45 min · impact: very high", xp: 200, done: false },
    { t: "Fix weak headline on /pricing",      m: "≈ 5 min · impact: medium",     xp: 30,  done: false },
    { t: "Get listed on 2 directory sources",  m: "≈ 1h · impact: high",          xp: 120, done: false },
    { t: "Add Product schema to /features",    m: "≈ 15 min · impact: high",      xp: 80,  done: false },
  ];
  const [tasks, setTasks] = React.useState(initial);
  const toggle = (i) => setTasks(tasks.map((t, j) => j === i ? { ...t, done: !t.done } : t));
  const doneCount = tasks.filter(t => t.done).length;
  const totalXP = tasks.filter(t => t.done).reduce((sum, t) => sum + t.xp, 0);

  return (
    <div className="app-card">
      <div className="app-card-head">
        <h4>Today's quests</h4>
        <span className="sub">{doneCount}/{tasks.length} done · <b style={{ color: "var(--accent-2)" }}>+{totalXP} XP earned</b></span>
      </div>
      <div className="task-list">
        {tasks.map((task, i) => (
          <div key={i} className={`task ${task.done ? "done" : ""}`}>
            <span className="tickbox" onClick={() => toggle(i)}>
              {task.done && <Icon name="check" size={12} />}
            </span>
            <div>
              <div className="title">{task.t}</div>
              <div className="meta">{task.m}</div>
            </div>
            <span className="xp">+{task.xp} XP</span>
          </div>
        ))}
      </div>
      <button className="btn btn--ghost btn--sm" style={{ alignSelf: "flex-start" }} onClick={() => onNavigate("quests")}>
        See all 12 quests →
      </button>
    </div>
  );
}

function ModelsCard({ onNavigate }) {
  const models = [
    { sw: "#10A37F", l: "C", name: "ChatGPT",    pos: 2, vis: "62%", delta: "+0.8", up: true },
    { sw: "#D97706", l: "A", name: "Claude",     pos: 3, vis: "54%", delta: "+0.4", up: true },
    { sw: "#1CB0F6", l: "P", name: "Perplexity", pos: 4, vis: "41%", delta: "−0.2", up: false },
    { sw: "#4285F4", l: "G", name: "Gemini",     pos: 5, vis: "33%", delta: "+0.1", up: true },
  ];
  return (
    <div className="app-card">
      <div className="app-card-head">
        <h4>How each AI sees you</h4>
        <a className="sub" style={{ cursor: "pointer", color: "var(--accent-2)", fontWeight: 800 }} onClick={() => onNavigate("models")}>
          Full breakdown →
        </a>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {models.map((m, i) => (
          <div key={i} className="model-row">
            <span className="l">
              <span className="model-icon" style={{ background: m.sw }}>{m.l}</span>
              {m.name}
            </span>
            <span className="right">
              <span className="pos-pill">#{m.pos}</span>
              <span>{m.vis}</span>
              <span className={`delta ${m.up ? "up" : "down"}`}>{m.delta}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetitorsCard({ onNavigate }) {
  const rows = [
    { sw: "#1CB0F6", name: "Jira",          vis: "78%", delta: "+0.2", up: true },
    { sw: "#F59E0B", name: "You (Linear)",  vis: "66%", delta: "+1.2", up: true, me: true },
    { sw: "#58CC02", name: "Asana",         vis: "54%", delta: "+0.4", up: true },
    { sw: "#A560FF", name: "Notion",        vis: "47%", delta: "−0.3", up: false },
    { sw: "#E11D48", name: "Monday",        vis: "39%", delta: "−0.1", up: false },
  ];
  return (
    <div className="app-card">
      <div className="app-card-head">
        <h4>Category leaderboard</h4>
        <a className="sub" style={{ cursor: "pointer", color: "var(--accent-2)", fontWeight: 800 }} onClick={() => onNavigate("leaderboard")}>
          Full board →
        </a>
      </div>
      <div>
        {rows.map((r, i) => (
          <div key={i} className={`comp-row ${r.me ? "is-me" : ""}`}>
            <span className="rank">#{i + 1}</span>
            <span className="name">
              <span className="sw" style={{ background: r.sw }}>{r.name[0].toUpperCase()}</span>
              {r.name}
            </span>
            <span className="num">{r.vis}</span>
            <span className={`delta ${r.up ? "up" : "down"}`}>{r.delta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AchievementsCard() {
  const badges = [
    { tier: "gold",   ico: "🏆", name: "First Citation" },
    { tier: "silver", ico: "📜", name: "Schema Master" },
    { tier: "bronze", ico: "⚡", name: "Quick Fix" },
    { tier: "legend", ico: "👑", name: "Position #1" },
    { tier: "gold",   ico: "📈", name: "Trending Up" },
    { tier: "locked", ico: "🔒", name: "30-day Streak" },
  ];
  return (
    <div className="app-card">
      <div className="app-card-head">
        <h4>Achievements</h4>
        <span className="sub">5 of 24 unlocked</span>
      </div>
      <div className="ach-row">
        {badges.map((b, i) => (
          <div key={i} className={`ach ${b.tier}`}>
            <span className="medal"><span>{b.ico}</span></span>
            <span className="nm">{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { AppDashboard, ScoreRing });
