/* Clerow iOS — Prompts, Sources, AI Models */

function ScreenPrompts() {
  const rows = [
    { q: "best AI music generator", tag: "Solution", tc: "#1CB0F6", models: [1,1,1,0], pos: "#4", win: false },
    { q: "Suno vs Udio vs Soundraw", tag: "Compare", tc: "#E04848", models: [1,1,1,1], pos: "#3", win: false },
    { q: "royalty-free AI music tool", tag: "Solution", tc: "#1CB0F6", models: [0,0,0,0], pos: "—", invisible: true },
    { q: "Warbls review", tag: "Branded", tc: "#1E4F6B", models: [1,1,1,1], pos: "#1", win: true },
    { q: "make a song with no instruments", tag: "Problem", tc: "#7C3AED", models: [0,1,0,0], pos: "#6", losing: true },
    { q: "alternatives to Suno", tag: "Compare", tc: "#E04848", models: [0,0,0,0], pos: "—", invisible: true },
    { q: "AI music for YouTube videos", tag: "Solution", tc: "#1CB0F6", models: [1,0,0,0], pos: "#5", losing: true },
  ];
  const mc = ["#10A37F","#D97706","#1CB0F6","#4285F4"];
  const ml = ["C","A","P","G"];
  return (
    <div className="ia ia-screen">
      <div className="ia-body ia-body--tabbed">
        <div className="ia-head" style={{ paddingTop: 8 }}>
          <div className="ia-head-l">
            <div>
              <div className="ia-head-eyebrow">42 discovered</div>
              <div className="ia-head-title">Prompts</div>
            </div>
          </div>
          <div className="ia-icon-btn"><TabIcon name="search" /></div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <MiniStat n="14" l="You appear" c="var(--success)" />
          <MiniStat n="6" l="Winning" c="var(--navy)" />
          <MiniStat n="22" l="Invisible" c="var(--danger)" />
        </div>

        <div className="ia-card ia-card--pad0">
          {rows.map((r,i) => (
            <div key={i} className="ia-row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", width: "100%", alignItems: "center", gap: 8 }}>
                <span className="ia-tag" style={{ background: `color-mix(in oklab, ${r.tc} 14%, white)`, color: r.tc }}>{r.tag}</span>
                <span style={{ flex: 1 }} />
                <span style={{ background: r.invisible ? "var(--danger)" : r.win ? "var(--success)" : "var(--ink)", color: "#fff", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>{r.pos}</span>
              </div>
              <div style={{ display: "flex", width: "100%", alignItems: "center", gap: 10 }}>
                <div className="ia-row-title" style={{ flex: 1 }}>"{r.q}"</div>
                <div style={{ display: "flex", gap: 3 }}>
                  {r.models.map((on,j) => (
                    <span key={j} className={`ia-model-dot ${on ? "lit" : ""}`} style={{ background: on ? mc[j] : undefined, width: 18, height: 18, fontSize: 9 }}>{ml[j]}</span>
                  ))}
                </div>
              </div>
              {(r.invisible || r.losing) && (
                <button style={{ alignSelf: "flex-start", background: r.invisible ? "var(--xp)" : "#fff", color: r.invisible ? "#4A3500" : "var(--navy)", border: r.invisible ? 0 : "1.5px solid var(--navy-mid)", padding: "6px 12px", borderRadius: 9, fontWeight: 800, fontSize: 12, fontFamily: "var(--ios-font)", boxShadow: r.invisible ? "0 2px 0 var(--xp-deep)" : "none" }}>
                  {r.invisible ? "Make quest +90 XP" : "Boost +50 XP"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <TabBar active="prompts" />
    </div>
  );
}

function MiniStat({ n, l, c }) {
  return (
    <div style={{ flex: 1, background: "var(--paper)", border: "1.5px solid var(--line)", borderRadius: 16, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", color: c }}>{n}</div>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{l}</div>
    </div>
  );
}

function ScreenSources() {
  const rows = [
    { d: "reddit.com", type: "UGC", tc: "#7C3AED", cited: "32%", you: 0, rival: "Suno", q: 90 },
    { d: "g2.com", type: "Directory", tc: "#1E4F6B", cited: "24%", you: 0, rival: "Soundraw", q: 150 },
    { d: "youtube.com", type: "UGC", tc: "#7C3AED", cited: "18%", you: 0, rival: "Udio", q: 200 },
    { d: "producthunt.com", type: "Directory", tc: "#1E4F6B", cited: "12%", you: 1, rival: "Suno", q: 40 },
    { d: "warbls.com/blog", type: "Yours", tc: "#34A853", cited: "6%", you: 6, rival: "—", q: 0 },
  ];
  return (
    <div className="ia ia-screen">
      <div className="ia-body ia-body--tabbed">
        <div className="ia-head" style={{ paddingTop: 8 }}>
          <div>
            <div className="ia-head-eyebrow">Where AI gets answers</div>
            <div className="ia-head-title">Sources</div>
          </div>
        </div>

        <div className="ia-callout">
          <span style={{ fontSize: 16 }}>💡</span>
          <span><b style={{ color: "var(--navy-2)" }}>Sources are where you win.</b> Fix the top 3 gaps → est. +18 visibility points.</span>
        </div>

        <div className="ia-card ia-card--pad0">
          {rows.map((r,i) => {
            const gap = r.you === 0;
            return (
              <div key={i} className="ia-row">
                <span className="ia-sw" style={{ background: r.tc, borderRadius: 8 }}>{r.type[0]}</span>
                <div className="ia-row-main">
                  <div className="ia-row-title ia-mono" style={{ fontSize: 13 }}>{r.d}</div>
                  <div className="ia-row-sub">
                    {gap ? <span style={{ color: "var(--danger)", fontWeight: 800 }}>Not cited · {r.rival} is</span> : `You: cited ${r.you}×`}
                  </div>
                </div>
                <div className="ia-row-meta">
                  {r.q > 0
                    ? <span className="ia-xp" style={{ fontSize: 11 }}>+{r.q}</span>
                    : <span style={{ color: "var(--success)", fontWeight: 800, fontSize: 12 }}>Yours ✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <TabBar active="prompts" />
    </div>
  );
}

function ScreenModels() {
  const models = [
    { name: "ChatGPT", l: "C", sw: "#10A37F", v: 62, pos: "2.1", d: "+0.8", up: true, tracked: true, note: "Loves G2, Wikipedia & Reddit. Win it with comparison pages." },
    { name: "Claude", l: "A", sw: "#D97706", v: 54, pos: "3.4", d: "+0.4", up: true, tracked: true, note: "Cites primary sources. Rewards depth in your docs." },
    { name: "Perplexity", l: "P", sw: "#1CB0F6", v: 41, pos: "3.9", d: "−0.2", up: false, tracked: true, note: "Most live-web driven. Reddit + YouTube move you fast." },
    { name: "Gemini", l: "G", sw: "#4285F4", v: 0, pos: "—", d: "", up: true, tracked: false, note: "Overlaps Google SEO. Unlock on the Marketing plan." },
  ];
  return (
    <div className="ia ia-screen">
      <div className="ia-body ia-body--tabbed">
        <div className="ia-head" style={{ paddingTop: 8 }}>
          <div>
            <div className="ia-head-eyebrow">3 of 5 tracked</div>
            <div className="ia-head-title">AI Models</div>
          </div>
        </div>

        {models.map((m,i) => (
          <div key={i} className="ia-card" style={ m.tracked ? {} : { opacity: 0.85 } }>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span className="ia-sw" style={{ background: m.sw, width: 38, height: 38, flex: "0 0 38px", borderRadius: 11, fontSize: 15 }}>{m.l}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>{m.tracked ? "Tracking daily" : "Locked"}</div>
              </div>
              {m.tracked
                ? <span className={`ia-delta ${m.up ? "up" : "down"}`}>{m.d}</span>
                : <span className="ia-lock-badge"><TabIcon name="lock" /> Marketing</span>}
            </div>
            {m.tracked ? (
              <div style={{ display: "flex", gap: 18, marginBottom: 12 }}>
                <Mstat l="Visibility" v={`${m.v}%`} />
                <Mstat l="Avg pos." v={m.pos} />
              </div>
            ) : null}
            <div style={{ background: "var(--paper-2)", borderRadius: 12, padding: "10px 12px", fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600, lineHeight: 1.45 }}>
              <span style={{ fontWeight: 800, color: "var(--ink)" }}>📚 </span>{m.note}
            </div>
          </div>
        ))}
      </div>
      <TabBar active="prompts" />
    </div>
  );
}

function Mstat({ l, v }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-3)" }}>{l}</div>
      <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.015em" }}>{v}</div>
    </div>
  );
}

Object.assign(window, { ScreenPrompts, ScreenSources, ScreenModels });
