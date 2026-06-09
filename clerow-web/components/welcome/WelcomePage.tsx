import React from "react";
import { MascotClerow } from "../Mascot";
import { AiIcon } from "../ui/AiIcon";
import { StartButton, SignInButton } from "./Cta";
import { FAQS } from "@/lib/seo/faq";

// Clerow Welcome — Duolingo-style landing, ported from the v2 design
// (_design_extract/clerow-v2/project/components/welcome.jsx). Scoped under
// .wl-root (see app/welcome/welcome.css).
//
// This is a SERVER component so the full marketing copy ships in the raw HTML that
// AI crawlers read. The only interactive bits — the CTA buttons that open the auth
// modal — are the <StartButton>/<SignInButton> client islands from ./Cta.

// [letter, color, name, engineId]
const MODELS: [string, string, string, string][] = [
  ["C", "#10A37F", "ChatGPT", "chatgpt"],
  ["A", "#D97706", "Claude", "claude"],
  ["G", "#4285F4", "Gemini", "gemini"],
  ["X", "#566270", "Grok", "grok"],
  ["P", "#1CB0F6", "Perplexity", "perplexity"],
];

function Nav() {
  return (
    <header className="wl-nav">
      <div className="shell in">
        <a className="brand"><MascotClerow size={34} /> Clerow</a>
        <StartButton className="btn btn-primary btn-sm">Get started</StartButton>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-main shell">
        <div className="hero-grid">
          <div className="hero-art">
            {MODELS.map(([l, , , id], i) => (
              <span key={i} className={`float-tile t${i + 1}`} style={{ background: "#fff" }}><AiIcon id={id} size={36} letter={l} /></span>
            ))}
            <span className="hero-mascot"><MascotClerow size={210} float /></span>
          </div>
          <div className="hero-copy">
            <span className="hero-badge">📱 iOS &amp; Android coming soon</span>
            <h1>Get your brand <span className="b">recommended by AI.</span></h1>
            <p>
              Clerow is an AI visibility (GEO/AEO) tool that scans your website across all 5 major
              AI answer engines — ChatGPT, Claude, Perplexity, Gemini, and Grok — shows exactly where
              they recommend competitors instead of you, and turns the gaps into daily fixes.
            </p>
            <div className="hero-cta">
              <StartButton className="btn btn-primary">Get started</StartButton>
              <SignInButton className="btn btn-ghost">I already have an account</SignInButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ rev, title, children, art }: { rev?: boolean; title: string; children: React.ReactNode; art: React.ReactNode }) {
  return (
    <section className={`row ${rev ? "rev" : ""}`}>
      <div className="shell in">
        <div>
          <h2>{title}</h2>
          <p>{children}</p>
        </div>
        <div className="art">{art}</div>
      </div>
    </section>
  );
}

function IllScan() {
  const rows: [string, number, string][] = [["chatgpt", 78, "C"], ["claude", 54, "A"], ["perplexity", 40, "P"], ["grok", 22, "X"], ["gemini", 14, "G"]];
  return (
    <div className="ill">
      <div style={{ fontWeight: 900, fontSize: 13, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 14 }}>&quot;best AI music generator&quot;</div>
      <div className="ill-bars">
        {rows.map(([id, v, l], i) => (
          <div key={i} className="ill-bar">
            <span className="mc" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}><AiIcon id={id} size={17} letter={l} /></span>
            <span className="track"><i style={{ width: `${v}%` }} /></span>
            <span className="v">{v}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IllPath() {
  return (
    <div className="ill">
      <div className="ill-path">
        <div className="ip-node d">🤖</div><div className="ip-cap">robots.txt ✓</div>
        <div className="ip-line" />
        <div className="ip-node c">①</div><div className="ip-cap" style={{ color: "var(--blue)" }}>One clear H1 · +20 XP</div>
        <div className="ip-line" />
        <div className="ip-node m">🤖</div><div className="ip-cap">Auto-fix with MCP</div>
        <div className="ip-line" />
        <div className="ip-node l">🔒</div><div className="ip-cap">Level 2 · Structure</div>
      </div>
    </div>
  );
}

function IllTerm() {
  return (
    <div className="term">
      <div><span className="c1">$</span> clerow mcp connect</div>
      <div><span className="c2">✓</span> linked to Claude Code</div>
      <div style={{ marginTop: 8 }}><span className="c1">›</span> &quot;Clerow, fix my tasks&quot;</div>
      <div><span className="c2">✓</span> shipped · PR opened</div>
      <div><span className="c2">✓</span> re-scanned 5 models · +9%</div>
    </div>
  );
}

function StatsBand() {
  const stats: [string, string][] = [
    ["60%", "of buyers ask AI before they Google"],
    ["5", "AI engines Clerow tracks for you"],
    ["2–6 wks", "to climb after shipping your fixes"],
  ];
  return (
    <section className="stats-band">
      <div className="shell in">
        {stats.map(([n, l], i) => (
          <div key={i} className="stat"><div className="n">{n}</div><div className="l">{l}</div></div>
        ))}
      </div>
    </section>
  );
}

function Results() {
  const bars = [4, 9, 18, 34, 52, 71, 88, 100];
  return (
    <section className="results">
      <div className="shell in">
        <div>
          <span className="res-eyebrow">Real results</span>
          <h2>From <span className="b">invisible</span> to <span className="g">50–100 new users a day.</span></h2>
          <p>warbls.com wasn&apos;t named by a single AI model. After 6 weeks on Clerow — clearing quick wins and comparison pages — they went from <b>0 organic AI visits</b> to <b>50–100 new users every day</b> from GEO alone.</p>
          <div className="res-quote">
            <MascotClerow size={40} />
            <div><p>&quot;Clerow is the only reason ChatGPT recommends us now. It paid for itself in week two.&quot;</p><span>— John, founder of Warbls</span></div>
          </div>
        </div>
        <div className="res-art">
          <div className="res-card">
            <div className="res-card-top"><span className="mono">warbls.com · daily AI-referred users</span><span className="res-up">▲ +100/day</span></div>
            <div className="res-chart">
              {bars.map((h, i) => <span key={i} style={{ height: `${h}%` }} className={i >= 6 ? "hot" : ""} />)}
            </div>
            <div className="res-axis"><span>Wk 1</span><span>Wk 8</span></div>
            <div className="res-stats">
              <div><div className="rn">0→100</div><div className="rl">users / day</div></div>
              <div><div className="rn">18→71</div><div className="rl">visibility</div></div>
              <div><div className="rn">#6→#2</div><div className="rl">in ChatGPT</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AppSection() {
  return (
    <section className="app-sec">
      {MODELS.map(([l, , , id], i) => (
        <span key={i} className="app-float" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", top: `${15 + i * 14}%`, left: i % 2 ? "auto" : `${6 + i * 4}%`, right: i % 2 ? `${8 + i * 5}%` : "auto", animationDelay: `${i * 0.5}s` }}><AiIcon id={id} size={30} letter={l} /></span>
      ))}
      <div className="shell">
        <span className="soon">Coming soon</span>
        <h2>Climb anytime, anywhere.</h2>
        <p>Track your AI visibility and clear quick wins from your pocket. iOS and Android are landing soon.</p>
        <div className="store-row">
          <span className="store-btn"><span className="ic"></span><span className="t"><small>Soon on the</small><b>App Store</b></span></span>
          <span className="store-btn"><span className="ic">▶</span><span className="t"><small>Soon on</small><b>Google Play</b></span></span>
        </div>
      </div>
    </section>
  );
}

function WhoFor() {
  const who: [string, string, string][] = [
    ["🚀", "Founders", "Get cited in your category before bigger competitors do."],
    ["📈", "Marketing teams", "Own AI search the way you own SEO — with one shared score."],
    ["🏢", "Agencies", "Track every client across all 5 models in one place."],
  ];
  return (
    <section className="whofor">
      <div className="shell">
        <div className="wf-head"><h2>Built for everyone who needs to be found.</h2></div>
        <div className="wf-grid">
          {who.map(([ic, t, p], i) => (
            <div key={i} className="wf-card"><span className="wf-ic">{ic}</span><h3>{t}</h3><p>{p}</p></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const lines = [
    "Scan across all 5 AI models",
    "Discover + add custom prompts",
    "The full quest path — XP & streaks",
    "Re-scan anytime to track your climb",
    "Clerow MCP autopilot",
  ];
  return (
    <section id="pricing" className="pricing">
      <div className="shell">
        <div className="pr-head">
          <div className="pr-eyebrow">Pricing</div>
          <h2>One simple plan. No sales call.</h2>
        </div>
        <div className="price-grid price-grid--single">
          <div className="price feat">
            <span className="tag">⭐ For founders &amp; small teams</span>
            <span className="pic">🦉</span>
            <span className="nm">Premium</span>
            <div className="amt"><span className="c">$</span>29</div>
            <div className="per">per month · cancel anytime</div>
            <ul>{lines.map((f, j) => <li key={j}><span className="ck">✓</span>{f}</li>)}</ul>
            <StartButton className="btn btn-primary">Subscribe — $29/mo</StartButton>
            <p style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 700, margin: "12px 0 0", textAlign: "center" }}>
              Free: your first scan (ChatGPT) + Level 1 fixes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="whofor">
      <div className="shell">
        <div className="wf-head"><h2>Frequently asked questions</h2></div>
        <div className="faq-list">
          {FAQS.map((f, i) => (
            <details key={i} className="faq-item" {...(i === 0 ? { open: true } : {})}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: 18 }}>
          <a className="lk" href="/faq">See all FAQs →</a>
        </p>
      </div>
    </section>
  );
}

function Final() {
  return (
    <section className="final shell">
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><MascotClerow size={110} float /></div>
      <h2>Ready to get cited by every AI?</h2>
      <StartButton className="btn btn-primary">Get started</StartButton>
    </section>
  );
}

export function WelcomePage() {
  return (
    <div className="wl-root">
      <Nav />
      <Hero />
      <StatsBand />
      <Row title="Scan every AI at once." art={<IllScan />}>
        Paste your URL and Clerow checks all 5 engines — not just one. See exactly which prompts you show up in and which ones your rivals own.
      </Row>
      <Row rev title="Fix it like a game." art={<IllPath />}>
        Every gap becomes one small, ranked quest. Clear quick wins first, earn XP and streaks, and watch your visibility climb week over week.
      </Row>
      <Row title="Or let your AI do it." art={<IllTerm />}>
        Connect <span className="lk">Clerow MCP</span> to Claude Code, Cursor or any agent. It ships the fixes for you — then Clerow re-checks all 5 models to prove it worked.
      </Row>
      <Results />
      <AppSection />
      <WhoFor />
      <Pricing />
      <Faq />
      <Final />
      <footer className="foot">
        <div className="shell">
          <div className="brand"><MascotClerow size={28} /> Clerow</div>
          <nav className="foot-links">
            <a href="/best-geo-tools-2026">Best GEO tools 2026</a>
            <a href="/compare/clerow-vs-profound">Clerow vs Profound</a>
            <a href="/compare/clerow-vs-otterly">Clerow vs Otterly.AI</a>
            <a href="/pricing">Pricing</a>
            <a href="/faq">FAQ</a>
          </nav>
          <p>© 2026 Clerow · Get recommended by ChatGPT, Claude, Gemini, Grok &amp; Perplexity · Kristiansand 🇳🇴</p>
        </div>
      </footer>
    </div>
  );
}
