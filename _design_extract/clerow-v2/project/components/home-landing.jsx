/* Clerow — dark landing page */

const HMC = [["C","#10A37F"],["A","#D97706"],["P","#1CB0F6"],["G","#4285F4"],["X","#566270"]];

function Nav({ onScan }) {
  return (
    <header className="nav">
      <div className="shell nav-in">
        <a className="brand"><MascotClerow size={34} /> Clerow</a>
        <nav className="nav-links">
          <a href="#how">How it works</a>
          <a href="#models">5 AI models</a>
          <a href="#mcp">Autopilot</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="nav-act">
          <a className="link-quiet">Log in</a>
          <button className="btn btn-blue btn-sm" onClick={onScan}>Scan free</button>
        </div>
      </div>
    </header>
  );
}

function Hero({ onScan }) {
  return (
    <section className="hero shell">
      <div className="hero-pill"><span className="dot" /> Now watching 5 AI engines · built in Kristiansand 🇳🇴</div>
      <h1>When AI gets asked about your market, <em>does it name you?</em></h1>
      <p className="hero-sub">Clerow finds the prompts your buyers ask AI, checks how you rank across ChatGPT, Claude, Perplexity, Gemini & Grok — then hands you a game of quick fixes to climb.</p>
      <div className="scan">
        <span className="px">https://</span>
        <input defaultValue="warbls.com" spellCheck="false" />
        <button className="btn btn-blue" onClick={onScan}>Scan free</button>
      </div>
      <div className="hero-hint"><span>No card</span><span>·</span><span>5 models</span><span>·</span><span className="g">60 seconds</span></div>

      <div className="models-band">
        {HMC.map(([l, c], i) => (
          <span key={i} className="mchip"><span className="mc" style={{ background: c }}>{l}</span>{["ChatGPT","Claude","Perplexity","Gemini","Grok"][i]}</span>
        ))}
      </div>

      <HeroPreview />
    </section>
  );
}

function HeroPreview() {
  const rank = [
    { n: "Suno", c: "#FF7A45", v: 78 },
    { n: "Soundraw", c: "#3D7BFF", v: 54 },
    { n: "Udio", c: "#111", v: 47 },
    { n: "Warbls", c: "#38A9E0", v: 6, me: true },
  ];
  return (
    <div className="preview">
      <div className="preview-card">
        <div className="pc-top">
          <MascotClerow size={24} /> warbls.com <span className="mono">· "best AI music generator"</span>
          <span className="pill">scanned ×5</span>
        </div>
        <div className="pc-body">
          <div className="pc-rank">
            <h5>Who AI names today</h5>
            {rank.map((r, i) => (
              <div key={i} className={`pcr ${r.me ? "me" : ""}`}>
                <span className="sw" style={{ background: r.c }}>{r.n[0]}</span>
                <span className="nm">{r.n}{r.me && <span className="you">YOU</span>}</span>
                <span className="bar"><i style={{ width: `${(r.v/78)*100}%`, background: r.me ? "var(--blue)" : "var(--ink-4)" }} /></span>
                <span className="v">{r.v}%</span>
              </div>
            ))}
          </div>
          <div className="pc-fix">
            <h5>Your next fixes</h5>
            <div className="pcf"><span className="ck done">✓</span> Allow AI crawlers <span className="xp">+20</span></div>
            <div className="pcf"><span className="ck done">✓</span> Add llms.txt <span className="xp">+25</span></div>
            <div className="pcf"><span className="ck todo" /> One clear H1 <span className="xp">+20</span></div>
            <div className="pcf"><span className="ck todo" /> Comparison page <span className="xp">+80</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function How() {
  const steps = [
    { n: "1", h: "Scan across 5 AIs", p: "Paste your URL. Clerow discovers the prompts your buyers ask and checks every engine — not just one." },
    { n: "2", h: "Get your punch list", p: "See exactly where you're invisible and why. Every gap becomes one concrete, ranked fix." },
    { n: "3", h: "Climb the path", p: "Clear quick wins first, earn XP and streaks, level up. Or let your AI agent ship them for you." },
  ];
  return (
    <section id="how" className="section">
      <div className="shell">
        <div className="sec-head">
          <div className="eyebrow">How it works</div>
          <h2 className="h2">From invisible to cited, <em>one quest at a time.</em></h2>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <div key={i} className="step-card"><span className="n">{s.n}</span><h3>{s.h}</h3><p>{s.p}</p></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PathSplit() {
  return (
    <section className="section soft">
      <div className="shell split">
        <div>
          <div className="eyebrow">The Clerow path</div>
          <h3>Ranking in AI feels like <em>a game</em>, not a chore.</h3>
          <p>Most SEO tools dump a wall of red numbers and leave. Clerow turns AI visibility into a path of bite-size fixes — quick wins first, so it actually feels good to ship.</p>
          <ul>
            <li><span className="ck">✓</span> Levels & XP — start with 2-minute wins like robots.txt and llms.txt</li>
            <li><span className="ck">✓</span> Streaks that keep you coming back daily</li>
            <li><span className="ck">✓</span> Re-scan checkpoints that prove the work moved the needle</li>
          </ul>
        </div>
        <div className="split-art">
          <div className="art-card">
            <div className="mini-path">
              <div className="mp-node done">🤖</div><div className="mp-cap">robots.txt ✓</div>
              <div className="mp-line" />
              <div className="mp-node done">🗺️</div><div className="mp-cap">llms.txt ✓</div>
              <div className="mp-line" />
              <div className="mp-node cur">①</div><div className="mp-cap" style={{ color: "var(--blue)" }}>One clear H1 · +20 XP</div>
              <div className="mp-line" />
              <div className="mp-node mcp">🤖</div><div className="mp-cap">Auto-fix with MCP</div>
              <div className="mp-line" />
              <div className="mp-node lock">🔒</div><div className="mp-cap">Level 2 · Structure</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModelsSplit() {
  const rows = [["C","#10A37F","ChatGPT","9%"],["A","#D97706","Claude","6%"],["P","#1CB0F6","Perplexity","0%"],["X","#566270","Grok","0%"],["G","#4285F4","Gemini","0%"]];
  return (
    <section id="models" className="section">
      <div className="shell split rev">
        <div className="split-art">
          <div className="art-card">
            <div style={{ fontWeight: 900, fontSize: 14, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 14 }}>Your room to climb</div>
            {rows.map(([l, c, n, v], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 4 ? "1px solid var(--line-2)" : 0, fontWeight: 800, fontSize: 14 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: c, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12 }}>{l}</span>
                {n}
                <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 80, height: 7, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: v, background: "var(--blue)" }} /></span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 800, color: "var(--ink-3)", width: 32, textAlign: "right" }}>{v}</span>
                </span>
              </div>
            ))}
            <div style={{ marginTop: 14, background: "var(--blue-soft)", borderRadius: 10, padding: "11px 13px", fontWeight: 700, fontSize: 12.5, color: "var(--blue-deep)" }}>📈 Ship your Level 1 fixes → projected <b>+9% across all 5</b>.</div>
          </div>
        </div>
        <div>
          <div className="eyebrow">Every AI, one dashboard</div>
          <h3>Rank high on <em>every AI chat.</em></h3>
          <p>Your buyers ask ChatGPT, Claude, Perplexity, Gemini and Grok before they ever open Google. Clerow tracks all five at once and shows you exactly what to ship to climb each one.</p>
          <ul>
            <li><span className="ck">✓</span> One visibility score across all 5 engines</li>
            <li><span className="ck">✓</span> Per-engine playbooks — Reddit lifts Perplexity, posts on X lift Grok</li>
            <li><span className="ck">✓</span> Track every climb, prompt by prompt, week over week</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function MCP({ onScan }) {
  return (
    <section id="mcp" className="section soft">
      <div className="shell split">
        <div>
          <div className="eyebrow">Clerow MCP · Autopilot</div>
          <h3>Or let your AI <em>do all of it.</em></h3>
          <p>Connect Clerow to Claude Code, Cursor, or any agent. It reads your open quests, ships the fixes as a PR, and Clerow re-checks all five models to confirm it actually worked.</p>
          <button className="btn btn-violet" onClick={onScan}>Connect Clerow MCP</button>
        </div>
        <div className="split-art">
          <div className="term">
            <div><span className="c1">$</span> clerow mcp connect</div>
            <div><span className="c2">✓</span> linked to Claude Code</div>
            <div style={{ marginTop: 8 }}><span className="c1">›</span> "Clerow, fix my Level 1 tasks"</div>
            <div><span className="c2">✓</span> H1 fixed · meta added · PR opened</div>
            <div><span className="c2">✓</span> re-scanned 5 models · visibility +9%</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing({ onScan }) {
  const [yr, setYr] = React.useState(true);
  const tiers = [
    { ic: "🦉", nm: "Founder", m: 29, y: 23, feat: ["Daily scan across 5 AIs","Discover + custom prompts","Quest path + XP & streaks","Clerow MCP autopilot"], cta: "Get founder plan" },
    { ic: "🚀", nm: "Marketing", m: 89, y: 69, tag: "Most popular", feat: ["Everything in Founder","Up to 5 seats","Competitor citation tracking","Weekly reports + Slack alerts"], cta: "Get marketing plan", feat2: true },
    { ic: "🏛️", nm: "Enterprise", m: 249, y: 199, feat: ["Everything in Marketing","Unlimited seats","White-label reports","SSO + dedicated engineer"], cta: "Get enterprise plan" },
  ];
  return (
    <section id="pricing" className="section">
      <div className="shell">
        <div className="sec-head">
          <div className="eyebrow">Pricing</div>
          <h2 className="h2">One price. <em>No sales call.</em></h2>
          <div style={{ display: "inline-flex", marginTop: 18, background: "var(--surface)", border: "2px solid var(--line)", borderRadius: 999, padding: 4 }}>
            <button onClick={() => setYr(false)} style={{ border: 0, background: yr ? "transparent" : "var(--blue-soft)", color: yr ? "var(--ink-2)" : "var(--blue)", padding: "8px 18px", borderRadius: 999, fontWeight: 900, fontSize: 13 }}>Monthly</button>
            <button onClick={() => setYr(true)} style={{ border: 0, background: yr ? "var(--blue-soft)" : "transparent", color: yr ? "var(--blue)" : "var(--ink-2)", padding: "8px 18px", borderRadius: 999, fontWeight: 900, fontSize: 13 }}>Yearly −20%</button>
          </div>
        </div>
        <div className="price-grid">
          {tiers.map((t, i) => (
            <div key={i} className={`price ${t.feat2 ? "feat" : ""}`}>
              {t.tag && <span className="tag">⭐ {t.tag}</span>}
              <span className="pic">{t.ic}</span>
              <span className="nm">{t.nm}</span>
              <div className="amt"><span className="c">$</span>{yr ? t.y : t.m}</div>
              <div className="per">per month{yr ? " · billed yearly" : ""}</div>
              <ul>{t.feat.map((f, j) => <li key={j}><span className="ck">✓</span>{f}</li>)}</ul>
              <button className={`btn ${t.feat2 ? "btn-blue" : "btn-ghost"}`} onClick={onScan}>{t.cta}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = React.useState(0);
  const items = [
    ["What does Clerow actually do?", "It scans your site, finds the prompts your buyers ask AI, and checks how you rank across ChatGPT, Claude, Perplexity, Gemini and Grok — then gives you a game of concrete fixes to climb."],
    ["How is this different from SEO?", "Regular SEO ranks you in Google's blue links. Clerow ranks you inside the answers AI assistants give — different surface, different signals, far less competition right now."],
    ["What is Clerow MCP?", "A connector for AI agents. Plug Clerow into Claude Code or Cursor and it ships your fixes automatically, then re-checks every model to confirm it worked."],
    ["Why check 5 models instead of just asking ChatGPT?", "Each engine cites different sources and ranks you differently. One chatbot can't see the others — Clerow watches all five so you get the full picture."],
    ["Can I cancel anytime?", "Yes — one click from settings, no sales call, no survey."],
  ];
  return (
    <section className="section soft">
      <div className="shell">
        <div className="sec-head"><div className="eyebrow">FAQ</div><h2 className="h2">Questions, answered.</h2></div>
        <div className="faq">
          {items.map((it, i) => (
            <div key={i} className={`faq-item ${open === i ? "open" : ""}`}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}><span>{it[0]}</span><span className="ind">{open === i ? "−" : "+"}</span></button>
              <div className="faq-a"><div className="faq-a-in">{it[1]}</div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Final({ onScan }) {
  return (
    <section className="final shell">
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><MascotClerow size={110} float /></div>
      <h2 className="h2">Stop being invisible <em>to AI.</em></h2>
      <p className="lede">Paste your domain. See where you really rank across all 5 models — in 60 seconds, free.</p>
      <div className="scan"><span className="px">https://</span><input defaultValue="warbls.com" spellCheck="false" /><button className="btn btn-blue" onClick={onScan}>Scan free</button></div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="foot-grid">
          <div>
            <div className="brand" style={{ marginBottom: 12 }}><MascotClerow size={30} /> Clerow</div>
            <p style={{ color: "var(--ink-2)", fontWeight: 600, fontSize: 14, maxWidth: "34ch", margin: 0 }}>AI search visibility, gamified. Watches ChatGPT, Claude, Perplexity, Gemini & Grok. Built in Kristiansand 🇳🇴.</p>
          </div>
          <div><h4>Product</h4><ul><li><a href="#how">How it works</a></li><li><a href="#models">5 AI models</a></li><li><a href="#mcp">Clerow MCP</a></li><li><a href="#pricing">Pricing</a></li></ul></div>
          <div><h4>Resources</h4><ul><li><a>GEO playbook</a></li><li><a>Blog</a></li><li><a>Changelog</a></li></ul></div>
          <div><h4>Company</h4><ul><li><a>About</a></li><li><a>john@clerow.com</a></li><li><a>X / @clerow</a></li></ul></div>
        </div>
        <div className="foot-bot"><span>© 2026 Clerow · Kristiansand, Norway</span><span>v0.6 · 5 models tracked</span></div>
      </div>
    </footer>
  );
}

function App() {
  const go = () => { window.location.href = "Clerow Learn Dashboard.html"; };
  return (
    <>
      <Nav onScan={go} />
      <Hero onScan={go} />
      <How />
      <PathSplit />
      <ModelsSplit />
      <MCP onScan={go} />
      <Pricing onScan={go} />
      <FAQ />
      <Final onScan={go} />
      <Footer />
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
