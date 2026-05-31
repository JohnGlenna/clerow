/* Clerow iOS — scan → scanning → results */

function ScreenScan() {
  return (
    <div className="ia ia-screen ia-screen--white">
      <div className="ia-body" style={{ paddingTop: 64 }}>
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <MascotClerow size={88} float />
        </div>
        <div className="ia-head-eyebrow" style={{ textAlign: "center" }}>Step 1 of 2</div>
        <h1 style={{ textAlign: "center", fontWeight: 900, fontSize: 26, letterSpacing: "-0.02em", margin: "6px 0 8px" }}>
          What site should we scan?
        </h1>
        <p style={{ textAlign: "center", color: "var(--ink-2)", fontWeight: 600, fontSize: 14.5, margin: "0 0 24px", lineHeight: 1.5 }}>
          Paste your domain. Clerow finds the prompts your buyers ask AI — and how you rank.
        </p>

        <div className="ia-input-url">
          <span className="px">https://</span>
          <input defaultValue="warbls.com" spellCheck="false" />
        </div>

        <button className="ia-btn ia-btn--lg" style={{ marginTop: 16 }}>
          Find my prompts <span style={{ display: "inline-flex" }}><TabIcon name="arrow" /></span>
        </button>

        <div className="ia-callout" style={{ marginTop: 20 }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <span>We only read public pages — never anything behind a login.</span>
        </div>
      </div>
    </div>
  );
}

function ScreenScanning() {
  const tasks = [
    { l: "Reading warbls.com", s: "done" },
    { l: "Discovering buyer prompts", s: "done" },
    { l: "Querying ChatGPT, Claude, Perplexity", s: "active" },
    { l: "Mapping competitors", s: "pending" },
    { l: "Scoring your visibility", s: "pending" },
  ];
  return (
    <div className="ia ia-screen ia-screen--white">
      <div className="ia-body" style={{ paddingTop: 80, display: "flex", flexDirection: "column" }}>
        <div className="ia-scan-orbit">
          <div className="ring r1" />
          <div className="ring r2" />
          <div className="blip" />
          <div className="center"><MascotClerow size={64} /></div>
        </div>
        <h1 style={{ textAlign: "center", fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", margin: "0 0 6px" }}>
          Scanning the AI…
        </h1>
        <p style={{ textAlign: "center", color: "var(--ink-2)", fontWeight: 600, fontSize: 14, margin: "0 0 26px" }}>
          This is the only time you'll wait. Future scans run in the background.
        </p>
        <div>
          {tasks.map((t, i) => (
            <div key={i} className={`ia-scan-task ${t.s}`}>
              <span className="tick">{t.s === "done" ? "✓" : t.s === "active" ? "•" : ""}</span>
              <span>{t.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScreenResults() {
  const brands = [
    { rank: 1, name: "Suno",     sw: "#FF7A45", v: 30, me: false },
    { rank: 2, name: "Soundraw", sw: "#3D7BFF", v: 19, me: false },
    { rank: 3, name: "Udio",     sw: "#131313", v: 16, me: false },
    { rank: 4, name: "Warbls",   sw: "#1E4F6B", v: 6,  me: true },
    { rank: 5, name: "Amper",    sw: "#34A853", v: 4,  me: false },
  ];
  const max = 30;
  return (
    <div className="ia ia-screen">
      <div className="ia-body">
        <div className="ia-head" style={{ paddingTop: 8 }}>
          <div className="ia-head-l">
            <MascotClerow size={40} />
            <div>
              <div className="ia-head-eyebrow">Scan complete</div>
              <div className="ia-head-title" style={{ fontSize: 22 }}>warbls.com</div>
            </div>
          </div>
        </div>

        <div className="ia-card" style={{ textAlign: "center", background: "var(--navy)", border: 0, color: "#fff" }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.8 }}>Your AI visibility</div>
          <div style={{ fontWeight: 900, fontSize: 64, letterSpacing: "-0.04em", lineHeight: 1, margin: "6px 0" }}>
            18<span style={{ fontSize: 24, opacity: 0.6 }}>/100</span>
          </div>
          <div className="ia-pill" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
            😬 You're barely showing up
          </div>
        </div>

        <div className="ia-card">
          <div className="ia-card-h"><h3>"best AI music generator?"</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {brands.map(b => (
              <div key={b.rank} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="ia-rank" style={{ flex: "0 0 22px", width: 22, height: 22 }}>{b.rank}</span>
                <span className="ia-sw" style={{ background: b.sw, width: 26, height: 26, flex: "0 0 26px", borderRadius: 7 }}>{b.name[0]}</span>
                <span style={{ flex: 1, fontWeight: b.me ? 900 : 700, fontSize: 14, color: b.me ? "var(--navy)" : "var(--ink)" }}>
                  {b.name}{b.me && <span style={{ fontSize: 9, background: "var(--navy)", color: "#fff", padding: "2px 6px", borderRadius: 4, marginLeft: 6 }}>YOU</span>}
                </span>
                <div style={{ width: 70, height: 7, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                  <i style={{ display: "block", height: "100%", width: `${(b.v/max)*100}%`, background: b.me ? "var(--navy)" : "var(--ink-4)" }} />
                </div>
                <span className="ia-mono" style={{ fontSize: 12, width: 30, textAlign: "right" }}>{b.v}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ia-callout">
          <span style={{ fontSize: 16 }}>🎯</span>
          <span><b style={{ color: "var(--navy-2)" }}>12 fixes found.</b> The first one takes 10 minutes and could put you on the board.</span>
        </div>

        <button className="ia-btn ia-btn--lg">See what to fix →</button>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenScan, ScreenScanning, ScreenResults });
