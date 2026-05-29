function Gamification({ showMascot }) {
  return (
    <section id="game" className="section gamify">
      <div className="shell">
        <div className="gamify-header">
          <div>
            <div className="section-eyebrow" style={{ marginBottom: 18 }}>
              <span className="ico"><Icon name="trophy" size={13} /></span>
              The Clerow Game
            </div>
            <h2 className="h-section">
              Make ranking in ChatGPT
              <br />
              <span className="muted">weirdly fun.</span>
            </h2>
          </div>
          <p className="lede" style={{ fontSize: 18 }}>
            Most SEO tools are a wall of red numbers that make you want to close the tab.
            Clerow turns AI visibility into XP, streaks, and badges — so you actually open
            it on a Tuesday morning.
          </p>
        </div>

        <div className="gamify-grid">
          <div className="gm-col">
            <LevelCard showMascot={showMascot} />
            <StreakCard />
            <BadgesCard />
          </div>
          <div className="gm-col">
            <QuestsCard />
            <LeaderboardCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function LevelCard({ showMascot }) {
  return (
    <div className="gm-card gm-level">
      <div className="gm-card-head">
        <h4>Your level</h4>
        <span className="sub">740 / 1000 XP to next rank</span>
      </div>
      <div className="gm-level-row">
        <div className="gm-avatar">
          {showMascot ? <MascotOwl pose="point" size={72} /> : <span style={{ fontSize: 36 }}>🦉</span>}
        </div>
        <div>
          <div className="gm-level-name"><span className="lvl">Level 7</span> · SEO Apprentice</div>
          <div className="gm-level-rank">
            <span className="next-arrow">next:</span>
            <span className="next">SEO Mage</span>
            <span style={{ color: "var(--ink-3)" }}>· 12 quests left</span>
          </div>
          <div className="xp-bar"><i style={{ width: "74%" }} /></div>
          <div className="xp-bar-meta">
            <span><b>740</b> XP earned this month</span>
            <span style={{ color: "var(--success)" }}>+120 this week</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StreakCard() {
  const days = [
    { d: "M", on: true }, { d: "T", on: true }, { d: "W", on: true }, { d: "T", on: true },
    { d: "F", today: true }, { d: "S", on: false }, { d: "S", on: false },
  ];
  return (
    <div className="gm-card">
      <div className="gm-card-head">
        <h4>Scan streak</h4>
        <span className="sub">don't break the chain</span>
      </div>
      <div className="gm-streak">
        <div className="streak-flame">🔥</div>
        <div className="streak-info">
          <div className="count">12<span>days</span></div>
          <div className="sub">Scanning daily compounds the score 4× faster.</div>
          <div className="streak-week">
            {days.map((d, i) => (
              <div key={i} className={`d ${d.today ? "today" : d.on ? "on" : ""}`}>{d.d}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BadgesCard() {
  const badges = [
    { tier: "gold",   icon: "🏆", name: "First Citation", desc: "Got mentioned" },
    { tier: "silver", icon: "📜", name: "Schema Master",  desc: "5 schemas live" },
    { tier: "bronze", icon: "⚡", name: "Quick Fix",       desc: "Closed 10 tasks" },
    { tier: "legend", icon: "👑", name: "Position #1",     desc: "Topped ChatGPT" },
    { tier: "gold",   icon: "📈", name: "Trending Up",     desc: "+20% in a month" },
    { tier: "locked", icon: "🔒", name: "Streak: 30",      desc: "Locked · 12/30" },
  ];
  return (
    <div className="gm-card">
      <div className="gm-card-head">
        <h4>Achievements</h4>
        <span className="sub">5 of 24 unlocked</span>
      </div>
      <div className="gm-achievements">
        {badges.map((b, i) => (
          <div key={i} className={`badge tier-${b.tier} ${b.tier === "locked" ? "locked" : ""}`}>
            <div className="b-medal"><span>{b.icon}</span></div>
            <div className="b-name">{b.name}</div>
            <div className="b-desc">{b.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestsCard() {
  const quests = [
    { ico: "check", title: "Add FAQ schema to homepage", meta: "≈ 10 min · impact: high",  xp: 50, done: true },
    { ico: "bolt",  title: "Write 1 comparison page (vs. Profound)", meta: "≈ 45 min · impact: very high", xp: 200 },
    { ico: "spark", title: "Fix weak headline on /pricing", meta: "≈ 5 min · impact: medium", xp: 30 },
    { ico: "globe", title: "Get listed on 2 directory sources", meta: "≈ 1h · impact: high", xp: 120 },
    { ico: "tag",   title: "Add Product schema to /features", meta: "≈ 15 min · impact: high", xp: 80 },
  ];
  return (
    <div className="gm-card" style={{ flex: 1 }}>
      <div className="gm-card-head">
        <h4>Today's quests</h4>
        <span className="sub">refreshes Monday 09:00</span>
      </div>
      <div className="gm-quests">
        {quests.map((q, i) => (
          <div key={i} className={`quest ${q.done ? "done" : ""}`}>
            <span className="q-icon"><Icon name={q.ico} size={16} /></span>
            <div>
              <div className="q-title">{q.title}</div>
              <div className="q-meta">{q.meta}</div>
            </div>
            <span className="q-reward">+{q.xp} XP</span>
          </div>
        ))}
      </div>
      <a className="btn btn--ghost btn--sm" style={{ alignSelf: "flex-start", marginTop: 4 }} href="#">
        See all 12 quests
        <span className="arrow">→</span>
      </a>
    </div>
  );
}

function LeaderboardCard() {
  const rows = [
    { sw: "#1CB0F6", name: "profound.so",   xp: "12,840 XP" },
    { sw: "#58CC02", name: "athena-int.co", xp: "9,210 XP" },
    { sw: "#F59E0B", name: "Clerow (you)",  xp: "7,402 XP", me: true },
    { sw: "#A560FF", name: "otterly.ai",    xp: "6,815 XP" },
    { sw: "#E11D48", name: "peec.ai",       xp: "5,930 XP" },
    { sw: "#777777", name: "5 others",      xp: "—" },
  ];
  return (
    <div className="gm-card">
      <div className="gm-card-head">
        <h4>This week's leaderboard</h4>
        <span className="sub">Your category · B2B SaaS · AI tools</span>
      </div>
      <div className="gm-board">
        {rows.map((r, i) => (
          <div key={i} className={`lb-row ${r.me ? "is-me" : ""}`}>
            <span className="lb-rank">{i + 1}</span>
            <span className="lb-name">
              <span className="sw" style={{ background: r.sw }}>{r.name[0].toUpperCase()}</span>
              {r.name}
            </span>
            <span className="lb-score">{r.xp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Gamification });
