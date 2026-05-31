/* Clerow iOS — Home / Overview */

function ScreenHome() {
  const models = [
    { l: "C", name: "ChatGPT",    sw: "#10A37F", pos: "#2", v: "62%", up: true,  d: "+0.8" },
    { l: "A", name: "Claude",     sw: "#D97706", pos: "#3", v: "54%", up: true,  d: "+0.4" },
    { l: "P", name: "Perplexity", sw: "#1CB0F6", pos: "#4", v: "41%", up: false, d: "−0.2" },
    { l: "G", name: "Gemini",     sw: "#4285F4", pos: "#5", v: "33%", up: true,  d: "+0.1" },
  ];
  return (
    <div className="ia ia-screen">
      <div className="ia-body ia-body--tabbed">
        <div className="ia-head" style={{ paddingTop: 8 }}>
          <div className="ia-head-l">
            <MascotClerow size={42} />
            <div>
              <div className="ia-head-sub">Welcome back</div>
              <div className="ia-head-title" style={{ fontSize: 23 }}>John</div>
            </div>
          </div>
          <div className="ia-icon-btn"><TabIcon name="bell" /></div>
        </div>

        {/* Streak */}
        <div className="ia-streak">
          <div className="ia-streak-flame">🔥</div>
          <div className="ia-streak-info">
            <div className="n">12-day streak</div>
            <div className="s">Scan daily to keep it alive</div>
          </div>
          <div className="ia-streak-days">
            {["M","T","W","T","F"].map((d,i) => <div key={i} className="d on">{d}</div>)}
            {["S","S"].map((d,i) => <div key={i} className="d">{d}</div>)}
          </div>
        </div>

        {/* Score card */}
        <div className="ia-card">
          <div className="ia-card-h">
            <h3>AI visibility score</h3>
            <span className="ia-delta up" style={{ fontSize: 13 }}>+12 ↑</span>
          </div>
          <div className="ia-score-wrap">
            <IaRing value={68} size={116} />
            <div className="ia-score-stats">
              <Sstat l="Visibility" v="66%" pct={66} c="#1E4F6B" />
              <Sstat l="Position"   v="#2"  pct={84} c="#1CB0F6" />
              <Sstat l="Sentiment"  v="92"  pct={92} c="#34A853" />
            </div>
          </div>
          <div className="ia-mini-chart">
            {[18,22,24,28,30,34,38,42,50,68].map((h,i) => (
              <i key={i} className={i === 9 ? "on" : ""} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* Today's quests preview */}
        <div className="ia-sec-h">
          <h2>Today's quests</h2>
          <span>+185 XP today</span>
        </div>
        <div className="ia-quest done">
          <span className="ia-checkbox"><TabIcon name="check" /></span>
          <div className="ia-quest-main">
            <div className="ia-quest-title">Add FAQ schema to homepage</div>
            <div className="ia-quest-meta">≈ 10 min · done</div>
          </div>
          <span className="ia-xp">+50</span>
        </div>
        <div className="ia-quest">
          <span className="ia-checkbox" />
          <div className="ia-quest-main">
            <div className="ia-quest-title">Reply to 3 Reddit threads</div>
            <div className="ia-quest-meta">≈ 10 min · impact: high</div>
          </div>
          <span className="ia-xp">+90</span>
        </div>
        <div className="ia-quest">
          <span className="ia-checkbox" />
          <div className="ia-quest-main">
            <div className="ia-quest-title">Write /compare/suno page</div>
            <div className="ia-quest-meta">≈ 45 min · very high</div>
          </div>
          <span className="ia-xp">+200</span>
        </div>

        {/* Models snapshot */}
        <div className="ia-sec-h">
          <h2>How AI sees you</h2>
          <span>4 models</span>
        </div>
        <div className="ia-card ia-card--pad0">
          {models.map((m,i) => (
            <div key={i} className="ia-row">
              <span className="ia-sw" style={{ background: m.sw }}>{m.l}</span>
              <div className="ia-row-main"><div className="ia-row-title">{m.name}</div></div>
              <div className="ia-row-meta">
                <span style={{ background: "var(--ink)", color: "#fff", padding: "3px 8px", borderRadius: 7, fontSize: 12, fontWeight: 800 }}>{m.pos}</span>
                <span className="ia-mono" style={{ fontSize: 13 }}>{m.v}</span>
                <span className={`ia-delta ${m.up ? "up" : "down"}`}>{m.d}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="home" />
    </div>
  );
}

function Sstat({ l, v, pct, c }) {
  return (
    <div className="ia-sstat">
      <div className="ia-sstat-top">
        <span className="ia-sstat-l">{l}</span>
        <span className="ia-sstat-v">{v}</span>
      </div>
      <div className="ia-sbar"><i style={{ width: `${pct}%`, background: c }} /></div>
    </div>
  );
}

Object.assign(window, { ScreenHome });
