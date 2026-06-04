"use client";

import React from "react";
import type { IconType } from "react-icons";
import { LuWorkflow, LuGem, LuScrollText } from "react-icons/lu";
import { MascotClerow } from "../Mascot";
import { GameIcon, type GameIconName } from "../GameIcon";
import { useAuthModal } from "../AuthModalProvider";

export function Landing() {
  return (
    <>
      <LandingNav />
      <LandingHero />
      <LandingExample />
      <LandingHow />
      <LandingClimb />
      <LandingPricing />
      <LandingFAQ />
      <LandingFinalCTA />
      <LandingFooter />
    </>
  );
}

const NAV_ITEMS: {
  label: string;
  href: string;
  Icon: IconType;
  color: string;
  glow: string;
}[] = [
  {
    label: "How it works",
    href: "#how",
    Icon: LuWorkflow,
    color: "#1CB0F6",
    glow:
      "radial-gradient(circle, rgba(28,176,246,0.22) 0%, rgba(28,176,246,0.08) 50%, rgba(28,176,246,0) 100%)",
  },
  {
    label: "Pricing",
    href: "#pricing",
    Icon: LuGem,
    color: "#7C3AED",
    glow:
      "radial-gradient(circle, rgba(124,58,237,0.22) 0%, rgba(124,58,237,0.08) 50%, rgba(124,58,237,0) 100%)",
  },
  {
    label: "FAQ",
    href: "#faq",
    Icon: LuScrollText,
    color: "#E11D48",
    glow:
      "radial-gradient(circle, rgba(225,29,72,0.22) 0%, rgba(225,29,72,0.08) 50%, rgba(225,29,72,0) 100%)",
  },
];

function LandingNav() {
  const { open } = useAuthModal();
  return (
    <header className="nav">
      <div className="shell nav-inner">
        <a className="brand" href="/">
          <span className="brand-mark">
            <MascotClerow size={36} />
          </span>
          <span>Clerow</span>
        </a>
        <nav className="glow-menu" aria-label="Primary">
          <span className="glow-menu-bg" aria-hidden="true" />
          <ul className="glow-menu-list">
            {NAV_ITEMS.map(({ label, href, Icon, color, glow }) => (
              <li key={label} className="glow-menu-item">
                <a
                  className="glow-menu-link"
                  href={href}
                  style={{ ["--gm-color" as string]: color }}
                >
                  <span
                    className="glow-menu-glow"
                    aria-hidden="true"
                    style={{ background: glow }}
                  />
                  <span className="glow-menu-face glow-menu-face--front">
                    <Icon className="glow-menu-ico" />
                    <span>{label}</span>
                  </span>
                  <span
                    className="glow-menu-face glow-menu-face--back"
                    aria-hidden="true"
                  >
                    <Icon className="glow-menu-ico" />
                    <span>{label}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav-actions">
          <button className="btn btn--quiet btn--sm" onClick={() => open("signin")}>
            Sign in
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => open("signup")}>
            Scan my site <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function LandingHero() {
  const { open } = useAuthModal();
  return (
    <section className="hero-c">
      <div className="shell">
        <div className="hero-c-headline">
          <h1 className="h1 hero-c-h1">
            When AI gets asked about your market, <em>does it name you?</em>
          </h1>
        </div>

        <p className="hero-c-sub">
          Paste your URL. Clerow finds the prompts your customers actually ask AI,
          runs them across ChatGPT, Claude, Perplexity &amp; Gemini, and shows you
          where you really rank — prompt by prompt.
        </p>

        <div className="hero-c-form-wrap">
          <span className="hero-c-mascot hero-c-mascot--side" aria-hidden="true">
            <MascotClerow size={110} float />
          </span>
          <ScanForm
            onScanRequest={(url) => open("signup", url)}
            centered
            ctaLabel="Scan free"
          />
        </div>
      </div>
    </section>
  );
}

function ScanForm({
  onScanRequest,
  centered,
  ctaLabel,
}: {
  onScanRequest: (url: string) => void;
  centered?: boolean;
  ctaLabel?: string;
}) {
  const [url, setUrl] = React.useState("");
  return (
    <form
      className={`scan-form ${centered ? "scan-form--centered" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        onScanRequest(url.trim());
      }}
    >
      <div className="scan-form-row">
        <input
          className="scan-form-input"
          type="text"
          spellCheck={false}
          placeholder="yourstartup.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label="Your website URL"
        />
        <button type="submit" className="btn btn--primary scan-form-btn">
          {ctaLabel || "Scan my site"}
          <span className="arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}

function AIDot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        display: "inline-block",
        marginRight: 6,
      }}
    />
  );
}

function DiscoveryStrip() {
  const discovered = [
    { tag: "Solution", q: "best AI music generator", vol: "high" },
    { tag: "Compare", q: "Suno vs Udio vs Soundraw", vol: "high" },
    { tag: "Solution", q: "AI tool to make royalty-free music", vol: "medium" },
    { tag: "Problem", q: "how do I make a song without instruments", vol: "rising" },
    { tag: "Compare", q: "alternatives to Suno", vol: "high" },
    { tag: "Branded", q: "Warbls review", vol: "low" },
  ];
  const tagCol = (t: string) =>
    ({
      Solution: "#1CB0F6",
      Compare: "#E11D48",
      Problem: "#7C3AED",
      Branded: "#F59E0B",
    }[t] || "#A8A8A8");

  return (
    <div className="discovery">
      <div className="discovery-head">
        <div>
          <div className="dsc-eyebrow">
            Step 1 · discovered for <span className="mono">warbls.com</span>
          </div>
          <h3 className="dsc-h">42 prompts your customers actually ask</h3>
        </div>
        <div className="dsc-stats">
          <span className="dsc-stat"><b>42</b><span>prompts</span></span>
          <span className="dsc-stat"><b>5</b><span>AI models</span></span>
          <span className="dsc-stat"><b>168</b><span>queries / day</span></span>
        </div>
      </div>
      <div className="discovery-chips">
        {discovered.map((d, i) => (
          <span key={i} className="dsc-chip">
            <span
              className="dsc-tag"
              style={{
                background: `color-mix(in oklab, ${tagCol(d.tag)} 14%, white)`,
                color: tagCol(d.tag),
                borderColor: `color-mix(in oklab, ${tagCol(d.tag)} 30%, transparent)`,
              }}
            >
              {d.tag}
            </span>
            <span className="dsc-q">&ldquo;{d.q}&rdquo;</span>
            <span className={`dsc-vol vol--${d.vol}`}>{d.vol}</span>
          </span>
        ))}
        <span className="dsc-chip dsc-chip--more">+ 36 more</span>
      </div>
      <div className="discovery-foot">
        <span className="dsc-arrow">↓</span>
        <span>
          <b>Step 2:</b> we run each prompt through all 5 AI models, then score how you rank.
        </span>
      </div>
    </div>
  );
}

function LandingExample() {
  const rows = [
    { rank: 1, name: "Suno",        color: "#FF7A45", initial: "S", vis: 30, sent: "pos",  pos: "1.8" as string | number },
    { rank: 2, name: "Soundraw",    color: "#3D7BFF", initial: "S", vis: 19, sent: "pos",  pos: "2.4" },
    { rank: 3, name: "Udio",        color: "#0F172A", initial: "U", vis: 16, sent: "neut", pos: "3.1" },
    { rank: 4, name: "Warbls",      color: "#1E4F6B", initial: "W", vis: 14, sent: "pos",  pos: "3.8" },
    { rank: 5, name: "Amper Music", color: "#10B981", initial: "◎", vis: 8,  sent: "neut", pos: "4.6" },
    { rank: 6, name: "Your brand",  color: "#F59E0B", initial: "?", vis: 0,  sent: "warn", pos: "—", me: true },
    { rank: 7, name: "Jukedeck",    color: "#1CB0F6", initial: "J", vis: 0,  sent: "neut", pos: "—" },
    { rank: 8, name: "Ecrett Music",color: "#A560FF", initial: "E", vis: 0,  sent: "neut", pos: "—" },
  ];

  const senti = (k: string) => {
    if (k === "pos") return <span className="senti senti--pos">●●●●●</span>;
    if (k === "neut") return <span className="senti senti--neut">●●●○○</span>;
    if (k === "warn") return <span className="senti senti--warn">●●○○○</span>;
    return null;
  };

  return (
    <section className="example section">
      <div className="shell">
        <div className="section-head">
          <div className="section-eyebrow">
            <GameIcon name="sparkles" size={16} />
            How the scan works
          </div>
          <h2 className="h2">
            We don&apos;t ask random prompts.<br />
            <span className="muted">We discover yours.</span>
          </h2>
          <p className="lede">
            Paste a URL. Clerow reads your site, infers your category, and surfaces
            the prompts your customers actually type into ChatGPT, Claude &amp; Perplexity.
            Then it scores how you rank in each one.
          </p>
        </div>

        <DiscoveryStrip />

        <div className="example-wrap">
          <div className="example-prompt">
            <div className="example-prompt-head">
              <span className="ai-chip"><AIDot color="#10A37F" /> ChatGPT</span>
              <span className="ai-chip"><AIDot color="#D97706" /> Claude</span>
              <span className="ai-chip"><AIDot color="#1CB0F6" /> Perplexity</span>
              <span className="ai-chip"><AIDot color="#4285F4" /> Gemini</span>
            </div>
            <div className="example-bubble user">
              <span className="bubble-meta">Prompt #1 · discovered for warbls.com</span>
              <span className="bubble-text">&ldquo;What is the best AI music generator?&rdquo;</span>
            </div>
            <div className="example-bubble ai">
              <span className="bubble-meta">AI replied</span>
              <span className="bubble-text">
                The top AI music generators today are{" "}
                <mark>Suno</mark>, <mark>Soundraw</mark>, and <mark>Udio</mark> —
                each great for slightly different use cases…
              </span>
            </div>
          </div>

          <div className="example-card">
            <div className="example-card-head">
              <div>
                <div className="example-card-title">AI search results — 7 models</div>
                <div className="example-card-sub">
                  Sample data for &ldquo;What is the best AI music generator?&rdquo;
                </div>
              </div>
              <span className="chip chip--ghost">last 24h</span>
            </div>

            <div className="ex-table">
              <div className="ex-row ex-row--head">
                <span>#</span>
                <span>Brand</span>
                <span>Visibility</span>
                <span>Sentiment</span>
                <span>Position</span>
              </div>
              {rows.map((r) => (
                <div key={r.rank} className={`ex-row ${r.me ? "ex-row--me" : ""}`}>
                  <span className="ex-rank">{r.rank}</span>
                  <span className="ex-brand">
                    <span className="ex-sw" style={{ background: r.color }}>{r.initial}</span>
                    {r.name}
                    {r.me && <span className="ex-you">YOU</span>}
                  </span>
                  <span className="ex-vis">
                    <span className="ex-vis-bar">
                      <i
                        style={{
                          width: `${(r.vis / 30) * 100}%`,
                          background: r.me ? "var(--accent)" : "var(--ink)",
                        }}
                      />
                    </span>
                    <b>{r.vis}%</b>
                  </span>
                  <span>{senti(r.sent)}</span>
                  <span className="ex-pos">{r.pos}</span>
                </div>
              ))}
            </div>

            <div className="example-card-foot">
              <span>
                📍 You&apos;re not being cited.{" "}
                <b>Clerow shows you exactly why — and what to fix first.</b>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingHow() {
  const steps: { tag: string; title: string; body: string; icon: GameIconName }[] = [
    {
      tag: "01 · Scan",
      title: "We crawl the AI",
      body: "We run hundreds of buyer prompts through ChatGPT, Claude, Perplexity, and Gemini — the exact questions your customers type.",
      icon: "search",
    },
    {
      tag: "02 · Score",
      title: "We grade your visibility",
      body: "You get one number per model and per prompt. Visibility, position, sentiment. No charts you have to interpret — just plain English.",
      icon: "chart",
    },
    {
      tag: "03 · Fix",
      title: "We hand you the punch list",
      body: "Each fix is one concrete action: add this schema, write this comparison page, rewrite this paragraph. Ship it, earn XP, keep the streak.",
      icon: "target",
    },
  ];

  const actions: { ico: GameIconName; h: string; p: string }[] = [
    { ico: "quill", h: "Comparison pages, written for you", p: "We draft the exact \"You vs Competitor\" pages AI models love to quote." },
    { ico: "gears", h: "Schema markup, copy-pasteable", p: "Product, FAQ, Organization, Review — generated for your stack, ready to ship." },
    { ico: "world", h: "Get listed in AI-cited sources", p: "We find which directories, Reddit threads, and review sites the models actually read." },
    { ico: "brain", h: "Rewrite weak landing copy", p: "Specific lines on your site that confuse the models — with the rewrite, side-by-side." },
  ];

  return (
    <section id="how" className="section section--soft">
      <div className="shell">
        <div className="section-head">
          <div className="section-eyebrow">
            <GameIcon name="gears" size={16} />
            How it works
          </div>
          <h2 className="h2">
            Three steps. <span className="muted">No demo call.</span>
          </h2>
          <p className="lede">
            Most &quot;AI SEO&quot; tools throw fifty dashboards at you. Clerow does three things, well.
          </p>
        </div>

        <div className="how-grid">
          {steps.map((s, i) => (
            <div key={i} className="how-card">
              <span className="how-icon"><GameIcon name={s.icon} size={32} /></span>
              <span className="how-tag">{s.tag}</span>
              <h3 className="how-title">{s.title}</h3>
              <p className="how-body">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="how-actions-head">
          <h3 className="h3">How we actually get you cited.</h3>
          <p className="lede">
            Four concrete things Clerow ships into your week — not vague &quot;optimisation&quot;.
          </p>
        </div>

        <div className="how-actions">
          {actions.map((a, i) => (
            <div key={i} className="how-action">
              <span className="how-action-ico"><GameIcon name={a.ico} size={26} /></span>
              <div>
                <h4>{a.h}</h4>
                <p>{a.p}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Teaser for the new gamified learn-path dashboard — a light-themed preview of
// "The Climb" so the landing reflects the product's Duolingo-style experience.
function LandingClimb() {
  const nodes: { ico: string; cap: string; state: "done" | "current" | "locked" }[] = [
    { ico: "🤖", cap: "Allow AI crawlers", state: "done" },
    { ico: "🗺️", cap: "Add llms.txt", state: "done" },
    { ico: "①", cap: "One clear H1", state: "current" },
    { ico: "🔒", cap: "Level 2 · Structure", state: "locked" },
  ];
  const fixes: { t: string; xp: number; done?: boolean }[] = [
    { t: "Allow AI crawlers (robots.txt)", xp: 20, done: true },
    { t: "Add llms.txt", xp: 25, done: true },
    { t: "Give your homepage one clear H1", xp: 20 },
    { t: "Publish a comparison page", xp: 80 },
  ];
  const color = (s: string) => (s === "done" ? "var(--success)" : s === "current" ? "var(--accent-2)" : "var(--ink-3)");
  return (
    <section id="climb" className="section">
      <div className="shell">
        <div className="section-head">
          <div className="section-eyebrow"><GameIcon name="trophy" size={16} /> The Clerow path</div>
          <h2 className="h2">Ranking in AI feels like <span className="muted">a game, not a chore.</span></h2>
          <p className="lede">Every gap becomes one bite-size quest. Quick wins first, XP and streaks as you climb — or let your AI agent ship the fixes for you.</p>
        </div>
        <div
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 880, margin: "0 auto",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 22,
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-2)", marginBottom: 14 }}>Your climb</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {nodes.map((n, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 38, height: 38, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", background: color(n.state), boxShadow: `0 4px 0 color-mix(in oklab, ${color(n.state)} 60%, #000)` }}>{n.ico}</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: n.state === "locked" ? "var(--ink-3)" : "var(--ink)" }}>{n.cap}</span>
                  {n.state === "current" && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 900, color: "var(--accent-2)" }}>YOU</span>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-2)", marginBottom: 14 }}>Your next fixes</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {fixes.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "var(--bg-soft)", border: "1px solid var(--border-soft)" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", background: f.done ? "var(--success)" : "var(--bg-soft-2)" }}>{f.done ? "✓" : ""}</span>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)", flex: 1 }}>{f.t}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, color: "#5A4200", background: "var(--xp)", padding: "3px 7px", borderRadius: 6 }}>+{f.xp}</span>
                </div>
              ))}
            </div>
            <a href="/onboarding" className="btn btn--primary btn--sm" style={{ marginTop: 16, display: "inline-flex" }}>
              <GameIcon name="bolt" size={14} /> Start your climb
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingPricing() {
  const { open } = useAuthModal();
  const [annual, setAnnual] = React.useState(true);

  const tiers = [
    {
      key: "founder",
      name: "Premium",
      icon: "owl" as GameIconName,
      desc: "For solo founders shipping by themselves.",
      monthly: 29,
      annual: 23,
      features: [
        "Daily AI visibility scan",
        "ChatGPT, Claude, Perplexity, Gemini",
        "Punch list with XP & streaks",
        "Email digest",
      ],
      cta: "Get premium plan",
      tag: undefined as string | undefined,
    },
    {
      key: "team",
      name: "Marketing Team",
      icon: "rocket" as GameIconName,
      desc: "For in-house marketing teams of 1–5.",
      monthly: 89,
      annual: 69,
      features: [
        "Up to 5 seats",
        "Daily scan + on-demand re-runs",
        "Competitor citation tracking",
        "Schema templates written for you",
        "Slack alerts + shared leaderboard",
        "PDF reports for stakeholders",
      ],
      cta: "Get marketing plan",
      tag: "Most popular",
    },
    {
      key: "enterprise",
      name: "Enterprise",
      icon: "temple" as GameIconName,
      desc: "For larger teams that need more power.",
      monthly: 249,
      annual: 199,
      features: [
        "Unlimited seats",
        "White-label PDF + dashboards",
        "SSO, audit log, custom SLA",
        "Dedicated solutions engineer",
      ],
      cta: "Get enterprise plan",
      tag: undefined,
    },
  ];

  return (
    <section id="pricing" className="section section--soft">
      <div className="shell">
        <div className="section-head">
          <div className="section-eyebrow">
            <GameIcon name="gem" size={16} />
            Pricing
          </div>
          <h2 className="h2">
            One price. No sales call.<br />
            <span className="muted">Cancel anytime, with one click.</span>
          </h2>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <div className="pricing-toggle">
            <button className={annual ? "" : "on"} onClick={() => setAnnual(false)}>
              Monthly
            </button>
            <button className={annual ? "on" : ""} onClick={() => setAnnual(true)}>
              Yearly <span className="save">−20%</span>
            </button>
          </div>
        </div>

        <div className="pricing-grid">
          {tiers.map((t) => {
            const price = annual ? t.annual : t.monthly;
            return (
              <div key={t.key} className="price-card">
                {t.tag && (
                  <span className="price-tag">
                    <GameIcon name="star" size={13} /> {t.tag}
                  </span>
                )}
                <span className="price-icon"><GameIcon name={t.icon} size={36} /></span>
                <h3 className="price-name">{t.name}</h3>
                <p className="price-desc">{t.desc}</p>
                <div className="price-amount">
                  <span className="num">
                    <span className="currency">$</span>
                    {price}
                  </span>
                </div>
                <span className="price-period">
                  per month{annual ? " · billed yearly" : " · billed monthly"}
                </span>
                <ul className="price-list">
                  {t.features.map((f) => (
                    <li key={f}>
                      <span className="check">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className="btn btn--lg btn--ghost price-cta"
                  onClick={() => open("signup")}
                >
                  {t.cta}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LandingFAQ() {
  const [open, setOpen] = React.useState(0);
  const items = [
    {
      q: "What is Clerow, in one sentence?",
      a: "Clerow scans your website and tells you exactly what to change so ChatGPT, Claude, Perplexity, and Gemini start recommending you by name.",
    },
    {
      q: "How is this different from regular SEO?",
      a: "Regular SEO ranks you in Google's blue links. Clerow ranks you inside the answers AI assistants actually give. Different surface, different signals, different fixes — and a lot less competition right now.",
    },
    {
      q: "Will my site really show up in ChatGPT after this?",
      a: "If you ship the changes in your punch list, yes — usually within 2–6 weeks as the models re-crawl. We can't promise a specific position, but we can promise concrete reasons you're not being cited today.",
    },
    {
      q: "What's with the XP, streaks, and badges?",
      a: "Ranking in AI is a slow grind, and most founders give up after week two. The streak counter and quest list are designed to make tiny daily progress feel rewarding, so you keep showing up. It works on us; it works on you.",
    },
    {
      q: "Can my team share an account?",
      a: "Yes — the Marketing Team plan includes up to 5 seats, a shared leaderboard, and per-seat Slack alerts. Enterprise is unlimited seats with SSO.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. One click, from settings. No emails to support, no \"are you sure\" survey. If you cancel mid-month you keep access until the period ends.",
    },
  ];
  return (
    <section id="faq" className="section">
      <div className="shell">
        <div className="section-head">
          <div className="section-eyebrow">
            <span style={{ fontSize: 14 }}>❓</span>
            Frequently asked
          </div>
          <h2 className="h2">Questions, answered.</h2>
        </div>
        <div className="faq-list">
          {items.map((it, i) => (
            <div key={i} className={`faq-item${open === i ? " open" : ""}`}>
              <button
                className="faq-q"
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
              >
                <span>{it.q}</span>
                <span className="faq-ind">{open === i ? "−" : "+"}</span>
              </button>
              <div className="faq-a">
                <div className="faq-a-inner">{it.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingFinalCTA() {
  const { open } = useAuthModal();
  return (
    <section className="final-cta">
      <div className="shell">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <MascotClerow size={140} float />
        </div>
        <h2 className="h2">
          Ready to stop being{" "}
          <span style={{ color: "var(--accent-2)" }}>invisible</span>?
        </h2>
        <p className="lede" style={{ margin: "0 auto 32px" }}>
          Paste your domain. We&apos;ll show you where you really rank — and the first thing to fix.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ScanForm onScanRequest={(url) => open("signup", url)} centered />
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="brand" style={{ marginBottom: 14 }}>
              <MascotClerow size={32} />
              <span>Clerow</span>
            </div>
            <p
              style={{
                color: "var(--ink-2)",
                fontSize: 14,
                maxWidth: "32ch",
                margin: 0,
                fontWeight: 500,
              }}
            >
              AI search visibility, gamified. Built in Kristiansand 🇳🇴 for solo founders and marketing teams that actually ship.
            </p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><a href="#how">How it works</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#">Changelog</a></li>
              <li><a href="#">Free scan</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <ul>
              <li><a href="#">LLM SEO playbook</a></li>
              <li><a href="#">Schema cheatsheet</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">RSS</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Say hi</h4>
            <ul>
              <li><a href="mailto:john@clerow.com">john@clerow.com</a></li>
              <li><a href="#">Twitter / @clerow</a></li>
              <li><a href="#">Status</a></li>
              <li><a href="#">Affiliates</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Clerow · Kristiansand, Norway</span>
          <span>
            Game icons by{" "}
            <a href="https://game-icons.net" target="_blank" rel="noopener noreferrer">
              game-icons.net
            </a>{" "}
            (CC BY 3.0) · v0.5.0
          </span>
        </div>
      </div>
    </footer>
  );
}
