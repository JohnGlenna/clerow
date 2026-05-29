/* Big hero dashboard mockup — Peec-style */

function Dashboard() {
  return (
    <div className="dash-wrap shell">
      <div className="dash">
        <DashSidebar />
        <DashMain />
      </div>
    </div>
  );
}

function DashSidebar() {
  const navItems = [
    { i: "grid", l: "Overview", active: true },
    { i: "list", l: "Prompts" },
    { i: "globe", l: "Sources" },
    { i: "ai", l: "Models" },
    { i: "bar", l: "Reports" },
    { i: "settings", l: "Settings" },
  ];
  return (
    <aside className="dash-side">
      <div className="dash-side-head">
        <span className="avatar">C</span>
        <span>Clerow · linear.app</span>
      </div>
      <div className="dash-search">
        <Icon name="search" size={14} color="#A1A1A1" />
        <span>Quick actions</span>
      </div>
      <div>
        <div className="dash-section-label">Pages</div>
        <nav className="dash-nav">
          {navItems.map((n, i) => (
            <a key={i} className={n.active ? "is-active" : ""}>
              <span className="ico"><Icon name={n.i} size={14} /></span>
              <span>{n.l}</span>
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function DashMain() {
  return (
    <div className="dash-main">
      <div className="dash-toolbar">
        <div className="dash-tabs">
          <span className="dash-tab"><span className="ico"><Icon name="tag" size={12} /></span>Linear</span>
          <span className="dash-tab"><Icon name="calendar" size={12} />Last 30 days</span>
          <span className="dash-tab"><Icon name="tag" size={12} />All tags</span>
          <span className="dash-tab"><Icon name="ai" size={12} />All models</span>
        </div>
        <div className="dash-tabs">
          <span className="dash-tab"><Icon name="help" size={12} /></span>
          <span className="dash-tab dash-tab--solid"><Icon name="download" size={12} />Export</span>
        </div>
      </div>

      <div className="dash-overview-bar">
        <div className="left">
          <span className="ico"><Icon name="bolt" size={14} /></span>
          <span>Overview · Linear's visibility trending up by</span>
          <b style={{ color: "var(--success)", fontFamily: "var(--font-mono)" }}>+5.2%</b>
          <span>this month</span>
        </div>
        <div className="right">
          <span className="stat">Visibility: <span className="val">3/14</span><span className="up">↑</span></span>
          <span className="stat">Sentiment: <span className="val">2/14</span><span className="up">↑</span></span>
          <span className="stat">Position: <span className="val">5/14</span><span className="up">↑</span></span>
        </div>
      </div>

      <div className="dash-grid">
        <DashChartPanel />
        <DashCompetitorsPanel />
      </div>
    </div>
  );
}

function DashChartPanel() {
  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <div className="dash-mini-tabs">
          <span className="t on"><Icon name="eye" size={12} />Visibility</span>
          <span className="t"><Icon name="smile" size={12} />Sentiment</span>
          <span className="t"><Icon name="target" size={12} />Position</span>
        </div>
        <div className="dash-mini-tabs">
          <span className="t on"><Icon name="chart" size={12} /></span>
          <span className="t"><Icon name="bar" size={12} /></span>
        </div>
      </div>

      <div className="dash-chart">
        <DashChartSVG />
        <div className="dash-tooltip">
          <div className="tt-head">March 2026</div>
          <div className="tt-row"><span className="l"><i style={{background:"#F59E0B"}}/>Clerow</span><span className="r">66%</span></div>
          <div className="tt-row"><span className="l"><i style={{background:"#1CB0F6"}}/>Profound</span><span className="r">62%</span></div>
          <div className="tt-row"><span className="l"><i style={{background:"#58CC02"}}/>Athena</span><span className="r">54%</span></div>
          <div className="tt-row"><span className="l"><i style={{background:"#A560FF"}}/>Otterly</span><span className="r">47%</span></div>
          <div className="tt-row"><span className="l"><i style={{background:"#E11D48"}}/>Peec</span><span className="r">39%</span></div>
        </div>
      </div>

      <div className="dash-x-axis">
        <span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span>
      </div>
    </div>
  );
}

function DashChartSVG() {
  const W = 800, H = 220;
  const lines = [
    { color: "#F59E0B", d: "M0,140 C80,130 130,80 200,70 C280,55 340,60 420,55 C500,50 560,45 640,38 C720,32 760,30 800,28" },
    { color: "#1CB0F6", d: "M0,120 C80,128 130,110 200,90 C280,80 340,82 420,72 C500,65 560,58 640,55 C720,50 760,48 800,46" },
    { color: "#58CC02", d: "M0,160 C90,170 150,140 220,128 C300,118 360,120 440,108 C520,98 580,92 660,86 C720,82 760,80 800,78" },
    { color: "#A560FF", d: "M0,180 C90,176 150,178 220,158 C300,148 360,150 440,138 C520,128 580,125 660,118 C720,112 760,108 800,104" },
    { color: "#E11D48", d: "M0,200 C90,195 150,190 220,180 C300,172 360,168 440,158 C520,148 580,142 660,135 C720,130 760,128 800,124" },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: "visible" }}>
      <defs>
        {lines.map((l, i) => (
          <linearGradient key={i} id={`fade-${i}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={l.color} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={l.color} stopOpacity="0"/>
          </linearGradient>
        ))}
      </defs>
      {[40, 80, 120, 160, 200].map(y => (
        <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="#F2F1ED" strokeWidth="1" strokeDasharray="2 4" />
      ))}
      {lines.map((l, i) => (
        <g key={i}>
          <path d={`${l.d} L ${W},${H} L 0,${H} Z`} fill={`url(#fade-${i})`} />
          <path d={l.d} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      <line x1="300" x2="300" y1="0" y2={H} stroke="#131313" strokeWidth="1" strokeDasharray="3 4" opacity="0.18" />
      {lines.map((l, i) => {
        const ys = [80, 72, 108, 138, 158];
        return <circle key={i} cx="300" cy={ys[i]} r="4.5" fill="#fff" stroke={l.color} strokeWidth="2.5" />;
      })}
    </svg>
  );
}

function DashCompetitorsPanel() {
  const rows = [
    { sw: "#1CB0F6", name: "Profound", vis: "62%", sent: 88, pos: "1.9", up: true,  cv: "↑0.4" },
    { sw: "#F59E0B", name: "Clerow",   vis: "66%", sent: 92, pos: "2.1", up: true,  cv: "↑1.2", me: true },
    { sw: "#58CC02", name: "Athena",   vis: "54%", sent: 76, pos: "3.4", up: true,  cv: "↑0.2" },
    { sw: "#A560FF", name: "Otterly",  vis: "47%", sent: 71, pos: "3.9", up: false, cv: "↓0.3" },
    { sw: "#E11D48", name: "Peec",     vis: "39%", sent: 84, pos: "4.6", up: false, cv: "↓0.1" },
  ];
  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h4>Clerow's competitors</h4>
          <div style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>Compare Clerow with its competitors</div>
        </div>
        <span className="ext"><Icon name="external" size={14} /></span>
      </div>

      <div className="dash-table">
        <div className="row head">
          <span>#</span><span>Brand</span><span>Visibility</span><span>Sent.</span><span>Pos.</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="row">
            <span className="rank">{i + 1}</span>
            <span className="brand-cell">
              <span className="sw" style={{ background: r.sw }}>{r.name[0]}</span>
              {r.name}
              {r.me && <span style={{ fontSize: 9, padding: "2px 6px", background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 4, fontWeight: 800 }}>YOU</span>}
            </span>
            <span className="num">{r.vis} <span className={`delta ${r.up ? "up" : "down"}`}>{r.cv}</span></span>
            <span className="num">{r.sent}</span>
            <span className="num">{r.pos}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
