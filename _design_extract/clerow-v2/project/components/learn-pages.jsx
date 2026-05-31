/* Clerow Learn — secondary pages: Prompts, AI Models, Leaderboard, Scan, Profile */

function LpHead({ eyebrow, title, sub }) {
  return (
    <div className="lp-head">
      {eyebrow && <div className="lp-eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

const MC = ["#10A37F", "#D97706", "#1CB0F6", "#4285F4", "#566270"];
const ML = ["C", "A", "P", "G", "X"];
function ModelDots({ on }) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {ML.map((l, i) => (
        <span key={i} className="mc" style={{ width: 20, height: 20, fontSize: 9, borderRadius: 6, background: on[i] ? MC[i] : "var(--surface-3)", color: on[i] ? "#fff" : "var(--ink-4)", marginLeft: 0 }}>{l}</span>
      ))}
    </span>
  );
}
const INTENT = { solution: ["Solution", "#1CB0F6"], compare: ["Compare", "#FF4B4B"], problem: ["Problem", "#A560F0"], branded: ["Branded", "#38A9E0"], custom: ["Custom", "#FFC800"] };

/* ---------------- Prompts ---------------- */
function PagePrompts({ onLearn }) {
  const base = [
    { q: "best AI music generator", it: "solution", on: [1,1,1,0,0], pos: "#6", state: "weak" },
    { q: "Suno vs Udio vs Soundraw", it: "compare", on: [1,1,1,1,1], pos: "#4", state: "weak" },
    { q: "royalty-free AI music tool", it: "solution", on: [0,0,0,0,0], pos: "—", state: "none" },
    { q: "Warbls review", it: "branded", on: [1,1,1,1,1], pos: "#1", state: "win" },
    { q: "make a song with no instruments", it: "problem", on: [0,1,0,0,1], pos: "#8", state: "weak" },
    { q: "alternatives to Suno", it: "compare", on: [0,0,0,0,0], pos: "—", state: "none" },
    { q: "AI music for YouTube videos", it: "solution", on: [1,0,0,0,0], pos: "#7", state: "weak" },
  ];
  const [rows, setRows] = React.useState(base);
  const [draft, setDraft] = React.useState("");
  const [scanning, setScanning] = React.useState(false);

  const addCustom = () => {
    const q = draft.trim();
    if (!q) return;
    setRows([{ q, it: "custom", on: [0,0,0,0,0], pos: "…", state: "checking" }, ...rows]);
    setDraft("");
    // simulate the multi-model check resolving
    const idx0 = 0;
    setTimeout(() => {
      setRows((cur) => cur.map((r, i) => i === idx0 && r.state === "checking"
        ? { ...r, on: [1,0,1,0,0], pos: "#5", state: "weak" } : r));
    }, 1600);
  };

  const scanNew = () => {
    setScanning(true);
    setTimeout(() => {
      setRows((cur) => [
        { q: "text to song AI free", it: "solution", on: [0,0,0,0,0], pos: "—", state: "none", fresh: true },
        { q: "is Suno worth it", it: "compare", on: [0,1,0,0,1], pos: "#6", state: "weak", fresh: true },
        ...cur,
      ]);
      setScanning(false);
    }, 1700);
  };

  return (
    <div className="ld-page">
      <div className="lp-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="lp-eyebrow">{rows.length} tracked for warbls.com</div>
          <h1>Prompts</h1>
          <div className="sub">The real questions buyers ask AI — checked across all 5 models.</div>
        </div>
        <button className="lp-scan-btn" onClick={scanNew} disabled={scanning}>
          {scanning ? "Scanning 5 models…" : "✨ Scan for new prompts"}
        </button>
      </div>

      {/* add custom prompt */}
      <div className="lp-add">
        <span className="lp-add-ic">＋</span>
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Add a custom prompt — e.g. “best AI tool to make a jingle”" />
        <button onClick={addCustom} disabled={!draft.trim()}>Check across 5 AIs</button>
      </div>

      <div className="lp-stats">
        <Stat v={String(rows.length)} l="Tracked" />
        <Stat v="14" l="You appear" c="var(--green)" />
        <Stat v="6" l="Winning" c="var(--blue)" />
        <Stat v="22" l="Invisible" c="var(--red)" />
      </div>

      <div className="lp-card">
        {rows.map((r, i) => {
          const [lab, col] = INTENT[r.it] || INTENT.custom;
          const checking = r.state === "checking";
          return (
            <div key={i} className={`lp-row ${r.fresh ? "fresh" : ""}`}>
              <span className="lp-tag" style={{ color: col, background: `color-mix(in oklab, ${col} 16%, transparent)` }}>{lab}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="lp-q">"{r.q}"{r.fresh && <span className="lp-new">NEW</span>}</div>
              </div>
              {checking ? <span className="lp-checking">checking…</span> : <ModelDots on={r.on} />}
              <span className="lp-pos" style={{ background: r.state === "none" ? "var(--red)" : r.state === "win" ? "var(--green)" : "var(--surface-3)", color: r.state === "weak" || checking ? "var(--ink)" : "#06210a" }}>{r.pos}</span>
              {r.state === "win" ? <span className="lp-win">Winning</span>
                : checking ? <span style={{ width: 54 }} />
                : <button className="lp-fix" onClick={onLearn}>Fix →</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ v, l, c }) {
  return <div className="lp-stat"><div className="v" style={c ? { color: c } : null}>{v}</div><div className="l">{l}</div></div>;
}

/* ---------------- AI Models ---------------- */
function PageModels({ onLearn }) {
  const models = [
    { l: "C", c: "#10A37F", name: "ChatGPT", maker: "OpenAI", v: 9, pos: "#6", sent: 74, tracked: true,
      note: "Leans on G2, Wikipedia & Reddit. Win it with comparison pages and review-site listings." },
    { l: "A", c: "#D97706", name: "Claude", maker: "Anthropic", v: 6, pos: "#8", sent: 80, tracked: true,
      note: "Cites primary sources and rewards depth. Beef up your docs, changelog and FAQs." },
    { l: "P", c: "#1CB0F6", name: "Perplexity", maker: "Perplexity", v: 0, pos: "—", sent: null, tracked: true,
      note: "Most live-web driven. Reddit threads & YouTube mentions move you here fastest." },
    { l: "X", c: "#566270", name: "Grok", maker: "xAI", v: 0, pos: "—", sent: null, tracked: true,
      note: "Pulls heavily from X/Twitter in real time. Posts and replies on X are your fastest lever here." },
    { l: "G", c: "#4285F4", name: "Gemini", maker: "Google", v: 0, pos: "—", sent: null, tracked: false,
      note: "Mirrors Google — your classic SEO basics carry straight over. Unlock on Marketing." },
    { l: "AI", c: "#34A853", name: "Google AI Overviews", maker: "Google", v: 0, pos: "—", sent: null, tracked: false,
      note: "Pulls top results + Featured Snippets. High click-through. Unlock on Marketing." },
  ];
  return (
    <div className="ld-page">
      <LpHead eyebrow="4 of 6 tracked" title="AI Models"
        sub="Each model cites differently. This is why Clerow watches all of them — one chatbot can't." />
      <div className="lm-grid">
        {models.map((m, i) => (
          <div key={i} className={`lm-card ${m.tracked ? "" : "locked"}`}>
            <div className="lm-top">
              <span className="lm-ic" style={{ background: m.c }}>{m.l}</span>
              <div style={{ flex: 1 }}>
                <div className="lm-name">{m.name}</div>
                <div className="lm-maker">by {m.maker}</div>
              </div>
              {m.tracked
                ? <span className="lm-live">● live</span>
                : <span className="lm-lock"><LDIcon name="lock" /> Marketing</span>}
            </div>
            {m.tracked && (
              <div className="lm-stats">
                <div><span className="ls-l">Visibility</span><span className="ls-v">{m.v}%</span></div>
                <div><span className="ls-l">Avg pos.</span><span className="ls-v">{m.pos}</span></div>
                <div><span className="ls-l">Sentiment</span><span className="ls-v">{m.sent == null ? "—" : m.sent}</span></div>
              </div>
            )}
            <div className="lm-note"><b>📚 How it sources:</b> {m.note}</div>
            {m.tracked
              ? <button className="lm-btn" onClick={onLearn}>See fixes for {m.name} →</button>
              : <button className="lm-btn lm-btn--up">Unlock — $89/mo</button>}
          </div>
        ))}
        <div className="lm-card lm-why">
          <div className="mcp-tag" style={{ background: "rgba(56,169,224,.18)", color: "#bfe0f0" }}>Secret sauce</div>
          <h4>Claude can't watch Claude's rivals.</h4>
          <p>Ask Claude how you rank and it only knows itself. Clerow runs every prompt through all 5 engines and shows the full picture — that's the moat.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Leaderboard ---------------- */
function PageLeaderboard() {
  const [tab, setTab] = React.useState("cat");
  const cat = [
    { r: 1, n: "Suno", c: "#FF7A45", v: "78%", d: "+0.2", up: true },
    { r: 2, n: "Soundraw", c: "#3D7BFF", v: "62%", d: "+0.4", up: true },
    { r: 3, n: "Udio", c: "#111", v: "54%", d: "−0.1", up: false },
    { r: 4, n: "Warbls", c: "#38A9E0", v: "47%", d: "+1.2", up: true, me: true },
    { r: 5, n: "Amper", c: "#34A853", v: "39%", d: "+0.3", up: true },
    { r: 6, n: "Ecrett", c: "#A560F0", v: "28%", d: "−0.2", up: false },
  ];
  const users = [
    { r: 1, n: "@petros", c: "#A560F0", xp: "24,840", me: false },
    { r: 2, n: "@mira_s", c: "#38A9E0", xp: "21,210" },
    { r: 3, n: "@thomasx", c: "#1CB0F6", xp: "18,810" },
    { r: 4, n: "@warbls", c: "#34A853", xp: "7,402", me: true },
    { r: 5, n: "@ethans", c: "#FF7A45", xp: "6,815" },
  ];
  return (
    <div className="ld-page">
      <LpHead eyebrow="AI music generators" title="Leaderboard"
        sub="7-day rolling average across all 4 models — signal, not daily noise." />
      <div className="lp-seg">
        <button className={tab === "cat" ? "on" : ""} onClick={() => setTab("cat")}>Your category</button>
        <button className={tab === "usr" ? "on" : ""} onClick={() => setTab("usr")}>Clerow founders</button>
      </div>
      <div className="lp-card">
        {(tab === "cat" ? cat : users).map((row) => (
          <div key={row.r} className={`lp-row ${row.me ? "me" : ""}`}>
            <span className={`lb-rank ${row.r <= 3 ? "r" + row.r : ""}`}>{row.r}</span>
            <span className="mc" style={{ background: row.c, marginLeft: 0, width: 26, height: 26 }}>{row.n[1] ? row.n[1].toUpperCase() : row.n[0]}</span>
            <div style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>
              {row.n}{row.me && <span className="lb-you">YOU</span>}
            </div>
            {tab === "cat"
              ? <><span className="ia-mono" style={{ fontFamily: "var(--mono)", fontWeight: 800, fontSize: 13 }}>{row.v}</span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 800, fontSize: 12, color: row.up ? "var(--green)" : "var(--red)", width: 42, textAlign: "right" }}>{row.d}</span></>
              : <span style={{ fontFamily: "var(--mono)", fontWeight: 800, fontSize: 13 }}>{row.xp} XP</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Scan ---------------- */
function PageScan({ onScan }) {
  return (
    <div className="ld-page">
      <div className="scan-screen">
        <MascotClerow size={92} float />
        <h1 className="scan-h">Scan across every AI at once.</h1>
        <p className="scan-p">Paste a domain. Clerow discovers the prompts your buyers ask and checks how you rank in ChatGPT, Claude, Perplexity & Gemini.</p>
        <div className="scan-input">
          <span className="px">https://</span>
          <input defaultValue="warbls.com" spellCheck="false" />
          <button onClick={onScan}>Scan</button>
        </div>
        <div className="scan-models">
          {ML.map((l, i) => <span key={i} className="mc" style={{ background: MC[i], marginLeft: 0 }}>{l}</span>)}
          <span className="scan-models-l">all checked in ~60s</span>
        </div>
        <div className="scan-last">Last scan · 2 days ago · visibility <b>6%</b> · sentiment <b>72</b></div>
      </div>
    </div>
  );
}

/* ---------------- Profile ---------------- */
function PageProfile() {
  const medals = [
    { t: "gold", i: "🏆", n: "First cite" }, { t: "silver", i: "📜", n: "Schema" },
    { t: "bronze", i: "⚡", n: "Quick fix" }, { t: "gold", i: "📈", n: "Trending" },
    { t: "locked", i: "🔒", n: "30-day" }, { t: "locked", i: "👑", n: "#1 spot" },
  ];
  return (
    <div className="ld-page">
      <LpHead title="Profile" />
      <div className="lp-card" style={{ padding: 22, textAlign: "center", border: "2px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <div className="pf-avatar"><MascotClerow size={64} /><span className="pf-lv">Lv 7</span></div>
        </div>
        <div style={{ fontWeight: 900, fontSize: 20 }}>John · warbls.com</div>
        <div style={{ color: "var(--ink-2)", fontWeight: 700, fontSize: 13 }}>SEO Apprentice → SEO Mage</div>
        <div className="pf-bar"><i style={{ width: "74%" }} /></div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16 }}>
          <Pf n="7,402" l="XP" /><Pf n="🔥 12" l="Streak" /><Pf n="5" l="Badges" />
        </div>
      </div>
      <h2 className="lp-sec">Achievements</h2>
      <div className="lp-card" style={{ padding: 18 }}>
        <div className="lmedal-row">
          {medals.map((m, i) => (
            <div key={i} className={`lmedal ${m.t}`}><span className="m">{m.i}</span><span className="n">{m.n}</span></div>
          ))}
        </div>
      </div>
      <h2 className="lp-sec">Settings</h2>
      <div className="lp-card">
        <div className="lp-row"><span style={{ width: 24, textAlign: "center" }}>💎</span><div style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>Plan</div><span style={{ color: "var(--ink-2)", fontWeight: 700 }}>Founder</span></div>
        <div className="lp-row"><span style={{ width: 24, textAlign: "center" }}>🔔</span><div style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>Notifications</div><span style={{ color: "var(--ink-2)", fontWeight: 700 }}>On</span></div>
        <div className="lp-row"><span style={{ width: 24, textAlign: "center" }}>🤖</span><div style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>Clerow MCP</div><span style={{ color: "var(--green)", fontWeight: 800 }}>Connected</span></div>
        <div className="lp-row"><span style={{ width: 24, textAlign: "center" }}>↩︎</span><div style={{ flex: 1, fontWeight: 800, fontSize: 14, color: "var(--red)" }}>Sign out</div></div>
      </div>
    </div>
  );
}
function Pf({ n, l }) {
  return <div><div style={{ fontWeight: 900, fontSize: 18 }}>{n}</div><div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-3)" }}>{l}</div></div>;
}

Object.assign(window, { PagePrompts, PageModels, PageLeaderboard, PageScan, PageProfile });
