/* Clerow iOS — Quests, Leaderboard, Reports, Profile, Paywall */

function ScreenQuests() {
  const daily = [
    { ico: "🔄", t: "Re-scan your domain", m: "1 min", xp: 15, done: true },
    { ico: "💬", t: "Reply to 3 Reddit threads", m: "10 min · high", xp: 90 },
    { ico: "📣", t: "Post 1 customer win to X", m: "8 min · medium", xp: 35 },
  ];
  return (
    <div className="ia ia-screen">
      <div className="ia-body ia-body--tabbed">
        <div className="ia-head" style={{ paddingTop: 8 }}>
          <div>
            <div className="ia-head-eyebrow">+185 XP today</div>
            <div className="ia-head-title">Quests</div>
          </div>
          <div className="ia-streak-flame" style={{ width: 40, height: 40, flex: "0 0 40px", fontSize: 20, borderRadius: 12 }}>🔥</div>
        </div>

        {/* Level bar */}
        <div className="ia-level">
          <div className="ia-level-top">
            <span className="lv">⚡ Level 7 · SEO Apprentice</span>
            <span className="xp">740 / 1000</span>
          </div>
          <div className="ia-level-bar"><i style={{ width: "74%" }} /></div>
          <div className="ia-level-foot"><span>+120 this week</span><span>→ SEO Mage</span></div>
        </div>

        <div className="ia-sec-h"><h2>Today's quests</h2><span>refreshes 9:00</span></div>
        {daily.map((q,i) => (
          <div key={i} className={`ia-quest ${q.done ? "done" : ""}`}>
            <span className="ia-quest-ico">{q.ico}</span>
            <div className="ia-quest-main">
              <div className="ia-quest-title">{q.t}</div>
              <div className="ia-quest-meta">{q.m}</div>
            </div>
            <span className="ia-xp">{q.done ? "✓" : `+${q.xp}`}</span>
          </div>
        ))}

        <div className="ia-sec-h"><h2>Active quest</h2><span>2 of 5</span></div>
        <div className="ia-card">
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span className="ia-quest-ico" style={{ background: "var(--navy-soft)" }}>🥊</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 15 }}>Win the comparison prompts</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>Suno · Udio · Soundraw pages</div>
            </div>
            <span className="ia-xp">+240</span>
          </div>
          <div className="ia-qprog"><i style={{ width: "40%" }} /></div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 700, marginTop: 8 }}>
            <b style={{ color: "var(--navy)" }}>Why:</b> comparison pages drive 38% of citations in your niche.
          </div>
        </div>

        <div className="ia-sec-h"><h2>Milestones</h2><span>rare · big XP</span></div>
        <div className="ia-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="ia-quest-ico" style={{ background: "linear-gradient(180deg,#FFE066,#FFB400)" }}>💯</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 14.5 }}>Hit visibility score 80</div>
            <div className="ia-qprog" style={{ marginTop: 6 }}><i style={{ width: "68%", background: "linear-gradient(180deg,#FFE266,#FFC800)" }} /></div>
          </div>
          <span className="ia-mono" style={{ color: "var(--navy)", fontWeight: 800, fontSize: 13 }}>+600</span>
        </div>
      </div>
      <TabBar active="quests" />
    </div>
  );
}

function ScreenLeaderboard() {
  const cat = [
    { r: 1, name: "Suno",     sw: "#FF7A45", v: "78%", d: "+0.2", up: true },
    { r: 2, name: "Soundraw", sw: "#3D7BFF", v: "62%", d: "+0.4", up: true },
    { r: 3, name: "Udio",     sw: "#131313", v: "54%", d: "−0.1", up: false },
    { r: 4, name: "Warbls",   sw: "#1E4F6B", v: "47%", d: "+1.2", up: true, me: true },
    { r: 5, name: "Amper",    sw: "#34A853", v: "39%", d: "+0.3", up: true },
    { r: 6, name: "Ecrett",   sw: "#A560FF", v: "28%", d: "−0.2", up: false },
  ];
  return (
    <div className="ia ia-screen">
      <div className="ia-body ia-body--tabbed">
        <div className="ia-head" style={{ paddingTop: 8 }}>
          <div>
            <div className="ia-head-eyebrow">AI music generators</div>
            <div className="ia-head-title">Leaderboard</div>
          </div>
        </div>

        <div className="ia-card" style={{ background: "var(--navy)", border: 0, color: "#fff", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontWeight: 900, fontSize: 44, letterSpacing: "-0.03em" }}>#4</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>You climbed ↑1 this week</div>
            <div style={{ fontSize: 12.5, opacity: 0.8, fontWeight: 600 }}>+8% to pass Udio at #3</div>
          </div>
          <MascotClerow size={48} />
        </div>

        <div className="ia-seg">
          <button className="on">Category</button>
          <button>Clerow users</button>
        </div>

        <div className="ia-card ia-card--pad0">
          {cat.map(b => (
            <div key={b.r} className={`ia-row ${b.me ? "ia-row--me" : ""}`}>
              <span className={`ia-rank ${b.r<=3 ? `ia-rank--${b.r}` : ""}`}>{b.r}</span>
              <span className="ia-sw" style={{ background: b.sw }}>{b.name[0]}</span>
              <div className="ia-row-main">
                <div className="ia-row-title" style={{ fontWeight: b.me ? 900 : 700, color: b.me ? "var(--navy)" : "var(--ink)" }}>
                  {b.name}{b.me && <span style={{ fontSize: 9, background: "var(--navy)", color: "#fff", padding: "2px 6px", borderRadius: 4, marginLeft: 6 }}>YOU</span>}
                </div>
              </div>
              <div className="ia-row-meta">
                <span className="ia-mono" style={{ fontSize: 13 }}>{b.v}</span>
                <span className={`ia-delta ${b.up ? "up" : "down"}`}>{b.d}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="rank" />
    </div>
  );
}

function ScreenReports() {
  return (
    <div className="ia ia-screen">
      <div className="ia-body ia-body--tabbed">
        <div className="ia-head" style={{ paddingTop: 8 }}>
          <div>
            <div className="ia-head-eyebrow">Every Monday</div>
            <div className="ia-head-title">Reports</div>
          </div>
          <div className="ia-icon-btn"><TabIcon name="share" /></div>
        </div>

        <div className="ia-report-hero">
          <div className="wk">Week of Mar 16</div>
          <h2>You climbed 2 spots in ChatGPT.</h2>
          <p>+8 visibility · 5 quests shipped · streak intact</p>
          <div className="score"><b>68</b><span className="up">+8 ↑</span></div>
        </div>

        <div className="ia-card">
          <div className="ia-card-h"><h3>🏆 Biggest win</h3></div>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)", fontWeight: 600, lineHeight: 1.5 }}>
            <b style={{ color: "var(--ink)" }}>You overtook Amper in ChatGPT.</b> Your /compare/suno page + 5 Reddit answers did it.
          </p>
        </div>

        <div className="ia-card">
          <div className="ia-card-h"><h3>🎯 Next opportunity</h3></div>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)", fontWeight: 600, lineHeight: 1.5 }}>
            Get listed on <b style={{ color: "var(--ink)" }}>G2 + Capterra</b>. Est. <b style={{ color: "var(--navy)" }}>+18 points</b> within 4 weeks.
          </p>
        </div>

        {/* Share card */}
        <div className="ia-card" style={{ background: "linear-gradient(135deg,#E7F0F4,#C2DBE2)", border: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontWeight: 900, fontSize: 15, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MascotClerow size={24} /> Clerow Wrapped
            </span>
            <span className="ia-mono" style={{ fontSize: 10, color: "var(--ink-2)" }}>WEEK 11</span>
          </div>
          <div style={{ fontWeight: 900, fontSize: 30, letterSpacing: "-0.03em", color: "var(--navy-2)" }}>↑ #6 → #4</div>
          <div style={{ fontSize: 12.5, color: "var(--navy-2)", fontWeight: 700, marginBottom: 12 }}>in your category · last 30 days</div>
          <button className="ia-btn ia-btn--sm" style={{ width: "100%" }}>𝕏 Share your climb</button>
        </div>
      </div>
      <TabBar active="rank" />
    </div>
  );
}

function ScreenProfile() {
  return (
    <div className="ia ia-screen">
      <div className="ia-body ia-body--tabbed">
        <div className="ia-head" style={{ paddingTop: 8 }}>
          <div className="ia-head-title">You</div>
          <div className="ia-icon-btn"><TabIcon name="settings" /></div>
        </div>

        <div className="ia-card" style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <div style={{ position: "relative" }}>
              <div className="ia-avatar" style={{ width: 76, height: 76, fontSize: 30, flex: "0 0 76px" }}>J</div>
              <span style={{ position: "absolute", bottom: -2, right: -2, background: "var(--navy)", color: "#fff", borderRadius: 999, padding: "3px 8px", fontWeight: 900, fontSize: 11, border: "2px solid #fff" }}>Lv 7</span>
            </div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 20 }}>John Solbakken</div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 600 }}>warbls.com · SEO Apprentice</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16 }}>
            <Pstat n="7,402" l="XP" />
            <Pstat n="🔥 12" l="Streak" />
            <Pstat n="5" l="Badges" />
          </div>
        </div>

        <div className="ia-sec-h"><h2>Achievements</h2><span>5 of 24</span></div>
        <div className="ia-card">
          <div className="ia-medal-row">
            <Medal t="gold" ico="🏆" nm="First cite" />
            <Medal t="silver" ico="📜" nm="Schema" />
            <Medal t="bronze" ico="⚡" nm="Quick fix" />
            <Medal t="gold" ico="📈" nm="Trending" />
            <Medal t="locked" ico="🔒" nm="30 days" />
          </div>
        </div>

        <div className="ia-card ia-card--pad0">
          <PrefRow ico="💎" t="Your plan" detail="Founder" />
          <PrefRow ico="🔔" t="Notifications" detail="On" />
          <PrefRow ico="🌐" t="Domain" detail="warbls.com" />
          <PrefRow ico="↩︎" t="Sign out" detail="" danger last />
        </div>
      </div>
      <TabBar active="you" />
    </div>
  );
}

function Pstat({ n, l }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.01em" }}>{n}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{l}</div>
    </div>
  );
}
function Medal({ t, ico, nm }) {
  return (
    <div className={`ia-medal ${t}`}>
      <span className="m">{ico}</span>
      <span className="nm">{nm}</span>
    </div>
  );
}
function PrefRow({ ico, t, detail, danger, last }) {
  return (
    <div className="ia-row" style={ last ? { borderBottom: 0 } : {} }>
      <span style={{ fontSize: 18, width: 26, textAlign: "center" }}>{ico}</span>
      <div className="ia-row-main"><div className="ia-row-title" style={ danger ? { color: "var(--danger)" } : {} }>{t}</div></div>
      <div className="ia-row-meta">
        {detail && <span style={{ color: "var(--ink-2)", fontWeight: 700, fontSize: 13 }}>{detail}</span>}
        {!danger && <span style={{ color: "var(--ink-4)" }}><TabIcon name="chevron" /></span>}
      </div>
    </div>
  );
}

/* Paywall — shown as a bottom sheet over a (blurred) home */
function ScreenPaywall() {
  const plans = [
    { name: "Founder", desc: "For solo founders", price: 29, on: false },
    { name: "Marketing", desc: "Teams up to 5 seats", price: 89, on: true, tag: "Popular" },
    { name: "Enterprise", desc: "Unlimited seats", price: 249, on: false },
  ];
  return (
    <div className="ia ia-screen">
      {/* dimmed background hint */}
      <div className="ia-body" style={{ filter: "blur(3px)", opacity: 0.5, paddingTop: 56 }}>
        <div className="ia-head"><div className="ia-head-title">Quests</div></div>
        <div className="ia-card" style={{ height: 120 }} />
        <div className="ia-card" style={{ height: 120 }} />
      </div>
      <div className="ia-sheet-backdrop" />
      <div className="ia-sheet">
        <div className="ia-sheet-grab" />
        <div style={{ textAlign: "center", marginBottom: 6 }}><MascotClerow size={72} /></div>
        <h2 style={{ textAlign: "center", fontWeight: 900, fontSize: 23, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
          Unlock your full playbook
        </h2>
        <p style={{ textAlign: "center", color: "var(--ink-2)", fontWeight: 600, fontSize: 14, margin: "0 0 20px" }}>
          Quests, sources, all AI models & weekly reports.
        </p>

        {plans.map((p,i) => (
          <div key={i} className={`ia-plan ${p.on ? "on" : ""}`}>
            <span className="ia-plan-radio" />
            <div className="ia-plan-main">
              <div className="ia-plan-name">{p.name}{p.tag && <span className="ia-plan-tag">{p.tag}</span>}</div>
              <div className="ia-plan-desc">{p.desc}</div>
            </div>
            <div className="ia-plan-price">${p.price}<small>/mo</small></div>
          </div>
        ))}

        <button className="ia-btn ia-btn--lg" style={{ marginTop: 8 }}>Get Marketing plan</button>
        <p className="ia-legal">Cancel anytime · billed monthly</p>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenQuests, ScreenLeaderboard, ScreenReports, ScreenProfile, ScreenPaywall });
