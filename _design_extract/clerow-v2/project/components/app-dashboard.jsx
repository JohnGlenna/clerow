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

/* -------- OVERVIEW — conquest-path redesign -------- */
function PageOverview({ showMascot, onNavigate }) {
  return (
    <>
      <PageHead
        title="Overview"
        sub="warbls.com · last scan 2 days ago · 20 fixes found"
        actions={
          <button className="btn btn--ghost btn--sm" onClick={() => onNavigate("reports")}><Icon name="download" size={14} />Weekly report</button>
        }
      />
      <AppHello showMascot={showMascot} />

      <ConquestLadder showMascot={showMascot} onNavigate={onNavigate} />

      <div className="app-grid">
        <ScoreCard />
        <ModelsCard onNavigate={onNavigate} />
      </div>

      <div className="app-grid">
        <CompetitorsCard onNavigate={onNavigate} />
        <AchievementsCard />
      </div>
    </>
  );
}

function AppHello({ showMascot }) {
  return (
    <div className="app-hello app-hello--next">
      <div className="hello-mascot">
        {showMascot ? <MascotClerow size={52} float /> : <span style={{ fontSize: 30 }}>🦉</span>}
      </div>
      <div className="greet">
        Welcome back, John.
        <small>You've banked <b>2 quick wins</b>. Just <b>2 more tasks</b> to clear Level 1 and unlock your next scan boost. ✨</small>
      </div>
      <div className="hello-streak">
        <span className="flame">🔥</span>
        <span className="n">12</span>
        <span className="lbl">day streak</span>
      </div>
    </div>
  );
}

/* ====== THE CONQUEST LADDER ====== */
function ConquestLadder({ showMascot, onNavigate }) {
  const [tasks, setTasks] = React.useState([
    { t: "Let AI crawlers in via robots.txt", why: "GPTBot & ClaudeBot were blocked — they literally couldn't read your site.", time: "2 min", xp: 20, done: true },
    { t: "Add an llms.txt file", why: "A plain-text map that tells AI what Warbls is and which pages matter.", time: "5 min", xp: 25, done: true },
    { t: "Give your homepage one clear H1", why: "You had 3 competing H1s. AI couldn't tell what you actually do.", time: "3 min", xp: 20, done: false },
    { t: "Write a meta description for 8 pages", why: "Missing everywhere. It's often the exact snippet AI quotes back.", time: "8 min", xp: 25, done: false },
  ]);
  const toggle = (i) => setTasks(tasks.map((t, j) => j === i ? { ...t, done: !t.done } : t));
  const [openTask, setOpenTask] = React.useState(2);

  const l1done = tasks.filter(t => t.done).length;
  const l1total = tasks.length;
  const l1complete = l1done === l1total;
  const l1xp = tasks.filter(t => t.done).reduce((s, t) => s + t.xp, 0);

  const lockedLevels = [
    { n: 2, name: "Structure",  sub: "Help AI understand every page",     count: 6, xp: 180, ex: "Product & FAQ schema, clean H2/H3s, alt text, sitemap" },
  ];

  return (
    <div className="ladder-wrap">
      <div className="ladder-head">
        <div>
          <div className="ladder-eyebrow">Your conquest path</div>
          <h3 className="ladder-title">Do these in order. Quick wins first.</h3>
        </div>
        <div className="ladder-progress">
          <span className="lp-label">Overall</span>
          <div className="lp-bar"><i style={{ width: "10%" }} /></div>
          <span className="lp-count"><b>2</b> / 20 fixes</span>
        </div>
      </div>

      <div className="ladder">
        {/* LEVEL 1 — active, expanded */}
        <div className={`lvl ${l1complete ? "lvl--done" : "lvl--active"}`}>
          <div className="lvl-rail">
            <div className="lvl-node">
              {l1complete ? <Icon name="check" size={22} /> : <span>1</span>}
              {!l1complete && <span className="lvl-node-pulse" />}
            </div>
          </div>
          <div className="lvl-body">
            <div className="lvl-card">
              <div className="lvl-card-head">
                <div>
                  <div className="lvl-name">Level 1 · Quick Wins</div>
                  <div className="lvl-sub">The technical basics AI needs to even read you</div>
                </div>
                <div className="lvl-badge">{l1done}/{l1total} · +{l1xp} XP</div>
              </div>

              <div className="lvl-tasks">
                {tasks.map((task, i) => (
                  <div key={i} className={`ltask ${task.done ? "done" : ""} ${openTask === i ? "open" : ""}`}>
                    <div className="ltask-row">
                      <span className="ltask-check" onClick={() => toggle(i)}>
                        {task.done && <Icon name="check" size={13} />}
                      </span>
                      <div className="ltask-main" onClick={() => setOpenTask(openTask === i ? -1 : i)}>
                        <div className="ltask-title">{task.t}</div>
                        <div className="ltask-meta">≈ {task.time}</div>
                      </div>
                      <span className="ltask-xp">+{task.xp}</span>
                    </div>
                    {openTask === i && (
                      <div className="ltask-why">
                        <span className="why-tag">Why this?</span>
                        {task.why}
                        <button className="why-cta">Show me how →</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!l1complete ? (
                <div className="lvl-foot">
                  <span>🎁 Clear all 4 to unlock <b>Level 2</b> + a <b>+60 XP</b> bonus.</span>
                </div>
              ) : (
                <div className="lvl-foot lvl-foot--win">
                  <span>🎉 Level 1 cleared! Level 2 is now open.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LEVELS 2–4 — locked */}
        {lockedLevels.map((lv) => (
          <div key={lv.n} className="lvl lvl--locked">
            <div className="lvl-rail">
              <div className="lvl-node"><Icon name="lock" size={18} /></div>
            </div>
            <div className="lvl-body">
              <div className="lvl-card lvl-card--locked">
                <div className="lvl-card-head">
                  <div>
                    <div className="lvl-name">Level {lv.n} · {lv.name}</div>
                    <div className="lvl-sub">{lv.sub}</div>
                  </div>
                  <div className="lvl-badge lvl-badge--ghost">{lv.count} tasks · +{lv.xp} XP</div>
                </div>
                <div className="lvl-locked-ex">{lv.ex}</div>
                <div className="lvl-locked-hint">🔒 Finish Level {lv.n - 1} to unlock</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ladder-cta">
        <button onClick={() => onNavigate("quests")}>Open your full quest path →</button>
      </div>
    </div>
  );
}

function ScoreCard() {
  return (
    <div className="app-card">
      <div className="app-card-head">
        <h4>Your AI visibility score</h4>
        <span className="sub">from your latest scan</span>
      </div>

      <div className="score-row">
        <ScoreRing value={18} />
        <div className="score-stats">
          <ScoreStat label="Visibility" icon="eye"    value="6%" pct={6}  color="#1E4F6B"
            hint="AI names Warbls in 6% of relevant answers." />
          <ScoreStat label="Position"   icon="target" value="#7" pct={22} color="#1CB0F6"
            hint="When you are named, you land 7th on average." />
          <ScoreStat label="Sentiment"  icon="smile"  value="72" pct={72} color="#34A853"
            hint="The good news — when AI does mention you, it likes you." />
        </div>
      </div>

      <div className="score-read">
        <span className="sr-emoji">🌱</span>
        <span><b>You're just getting started.</b> Sentiment is already high, so once AI starts noticing Warbls it'll speak well of you. Clear Level 1 to get on the board.</span>
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

function ScoreStat({ label, icon, value, pct, color, hint }) {
  return (
    <div className="score-stat-wrap">
      <div className="score-stat">
        <span className="label"><span className="ico"><Icon name={icon} size={14} /></span>{label}</span>
        <span className="bar"><i style={{ width: `${pct}%`, background: color }} /></span>
        <span className="val">{value}</span>
      </div>
      {hint && <div className="score-stat-hint">{hint}</div>}
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
    { sw: "#10A37F", l: "C", name: "ChatGPT",    vis: 9, pos: "#6", sent: 74, state: "weak",
      read: "Names Warbls occasionally, near the bottom of the list. Tone is positive — you mainly need more mentions." },
    { sw: "#D97706", l: "A", name: "Claude",     vis: 6, pos: "#8", sent: 80, state: "weak",
      read: "Rarely names you, but speaks warmly when it does. More depth in your docs and FAQs will lift this." },
    { sw: "#1CB0F6", l: "P", name: "Perplexity", vis: 0, pos: "—", sent: null, state: "none",
      read: "You don't show up here at all yet. Perplexity leans on Reddit & YouTube — those citations move you fastest." },
    { sw: "#4285F4", l: "G", name: "Gemini",     vis: 0, pos: "—", sent: null, state: "none",
      read: "Not appearing. Gemini mirrors Google, so your classic SEO basics (titles, schema) carry straight over here." },
  ];
  const [open, setOpen] = React.useState(0);
  return (
    <div className="app-card">
      <div className="app-card-head">
        <h4>How each AI sees you</h4>
        <a className="sub" style={{ cursor: "pointer", color: "var(--accent-2)", fontWeight: 800 }} onClick={() => onNavigate("models")}>
          Full breakdown →
        </a>
      </div>

      <div className="aisee-legend">
        <span><b>Visibility</b> how often it names you</span>
        <span><b>Position</b> where in the answer</span>
        <span><b>Sentiment</b> how it describes you</span>
      </div>

      <div className="aisee-list">
        {models.map((m, i) => (
          <div key={i} className={`aisee ${open === i ? "open" : ""} ${m.state === "none" ? "aisee--none" : ""}`}>
            <div className="aisee-row" onClick={() => setOpen(open === i ? -1 : i)}>
              <span className="model-icon" style={{ background: m.sw }}>{m.l}</span>
              <span className="aisee-name">{m.name}</span>
              <span className="aisee-metrics">
                <span className="aim"><i>Vis</i><b>{m.vis}%</b></span>
                <span className="aim"><i>Pos</i><b>{m.pos}</b></span>
                <span className="aim"><i>Sent</i><b>{m.sent == null ? "—" : m.sent}</b></span>
              </span>
              <span className="aisee-caret">{open === i ? "▲" : "▼"}</span>
            </div>
            {open === i && (
              <div className="aisee-read">
                {m.state === "none" && <span className="aisee-flag">Not cited yet</span>}
                {m.read}
                {m.state === "none" && (
                  <button className="why-cta" onClick={() => onNavigate("quests")}>Make this a quest →</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetitorsCard({ onNavigate }) {
  const rows = [
    { sw: "#FF7A45", name: "Suno",         vis: "78%", delta: "+0.2", up: true },
    { sw: "#3D7BFF", name: "Soundraw",     vis: "54%", delta: "+0.4", up: true },
    { sw: "#131313", name: "Udio",         vis: "47%", delta: "−0.1", up: false },
    { sw: "#1E4F6B", name: "Warbls (you)", vis: "6%",  delta: "+1.2", up: true, me: true },
    { sw: "#34A853", name: "Amper",        vis: "4%",  delta: "−0.0", up: false },
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
