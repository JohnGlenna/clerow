/* AI Models — per-model breakdown with sourcing notes + tier-gated locks */

function PageModels({ onNavigate }) {
  const models = [
    {
      name: "ChatGPT", letter: "C", color: "#10A37F", maker: "OpenAI",
      vis: 62, pos: 2.1, sent: 92, delta: "+0.8", trend: [12, 18, 24, 30, 38, 45, 52, 62],
      tracked: true, tier: "Founder",
      sources: "Training data + Bing web index + live browsing. Loves G2, Wikipedia, and Reddit threads. Strong recency bias on news.",
      tip: "Wins here come from comparison pages and review-site listings.",
    },
    {
      name: "Claude", letter: "A", color: "#D97706", maker: "Anthropic",
      vis: 54, pos: 3.4, sent: 88, delta: "+0.4", trend: [22, 26, 28, 30, 38, 42, 48, 54],
      tracked: true, tier: "Founder",
      sources: "Training data + Anthropic's Brave-powered web search. Higher trust threshold than ChatGPT — cites primary sources more often.",
      tip: "Add depth to your docs and changelog. Claude rewards substance.",
    },
    {
      name: "Perplexity", letter: "P", color: "#1CB0F6", maker: "Perplexity",
      vis: 41, pos: 3.9, sent: 71, delta: "−0.2", trend: [38, 40, 42, 44, 46, 44, 42, 41],
      tracked: true, tier: "Founder",
      sources: "Real-time web. Heavy on Reddit, HN, Wikipedia, and recent blog posts. The most live-web-driven model.",
      tip: "Reddit and YouTube wins move you here faster than schema does.",
    },
    {
      name: "Gemini", letter: "G", color: "#4285F4", maker: "Google",
      vis: 33, pos: 5.0, sent: 65, delta: "+0.1", trend: [28, 30, 30, 32, 32, 33, 32, 33],
      tracked: false, tier: "Team",
      sources: "Google's web index + Knowledge Graph. Strong overlap with traditional SEO. If you rank in Google, you'll rank here.",
      tip: "Classic SEO basics still apply: site speed, schema, fresh content.",
    },
    {
      name: "Google AI Overviews", letter: "AI", color: "#34A853", maker: "Google",
      vis: 0, pos: "—", sent: "—", delta: "—", trend: [0,0,0,0,0,0,0,0],
      tracked: false, tier: "Team",
      sources: "Pulls top Google results + Featured Snippets. Citations are explicit and clickable — high traffic potential.",
      tip: "Optimise for FAQ schema and direct-answer paragraphs in your top blog posts.",
    },
  ];
  return (
    <>
      <PageHead
        title="AI Models"
        sub="Each model cites differently. Here's how to win each one."
        actions={<button className="btn btn--primary btn--sm"><Icon name="bolt" size={14} />Re-scan all models</button>}
      />

      <div className="page-stats">
        <PageStat label="Models tracked" value="3" sub="of 5 available" />
        <PageStat label="Best in"        value="ChatGPT" sub="position #2 · 62% vis" hi="success" />
        <PageStat label="Worst in"       value="Gemini" sub="position #5 · 33% vis" hi="warn" />
        <PageStat label="Upgrade unlocks" value="2" sub="Gemini + AI Overviews" hi="accent" />
      </div>

      <div className="models-grid">
        {models.map((m, i) => <ModelCard key={i} m={m} onNavigate={onNavigate} />)}
        <UpgradeCard />
      </div>
    </>
  );
}

function ModelCard({ m, onNavigate }) {
  const locked = m.tier === "Team" && !m.tracked;
  return (
    <div className={`model-card ${locked ? "model-card--locked" : ""}`}>
      <div className="model-card-head">
        <div className="model-card-id">
          <span className="model-card-ico" style={{ background: m.color }}>{m.letter}</span>
          <div>
            <div className="name">{m.name}</div>
            <div className="maker">by {m.maker}</div>
          </div>
        </div>
        {locked
          ? <span className="tier-lock">🔒 Team plan</span>
          : <label className="switch">
              <input type="checkbox" defaultChecked={m.tracked} />
              <span />
            </label>
        }
      </div>

      <div className="model-stats">
        <div className="model-stat">
          <div className="label">Visibility</div>
          <div className="val">{m.vis}%</div>
          {!locked && <div className="del" style={{ color: m.delta.startsWith("+") ? "var(--success)" : m.delta.startsWith("−") ? "var(--danger)" : "var(--ink-3)" }}>{m.delta}</div>}
        </div>
        <div className="model-stat">
          <div className="label">Avg pos.</div>
          <div className="val">{m.pos}</div>
        </div>
        <div className="model-stat">
          <div className="label">Sentiment</div>
          <div className="val">{m.sent}</div>
        </div>
      </div>

      <Sparkline points={m.trend} color={m.color} locked={locked} />

      <div className="model-source">
        <div className="src-label">📚 How {m.name} sources answers</div>
        <p>{m.sources}</p>
      </div>

      <div className="model-tip">
        <span className="tip-ico">💡</span>
        <span>{m.tip}</span>
      </div>

      <div className="model-card-foot">
        {locked
          ? <button className="btn btn--primary btn--sm btn--full">Upgrade to Team</button>
          : <button className="btn btn--ghost btn--sm" onClick={() => onNavigate("quests")}>
              See quests for {m.name} →
            </button>}
      </div>
    </div>
  );
}

function Sparkline({ points, color, locked }) {
  const max = Math.max(...points, 1);
  const w = 220, h = 48, step = w / (points.length - 1);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (v / max) * h}`).join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="spark">
      <defs>
        <linearGradient id={`sp-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={locked ? 0.05 : 0.2}/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={`url(#sp-${color})`} />
      <path d={d} fill="none" stroke={locked ? "var(--ink-4)" : color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity={locked ? 0.4 : 1} />
    </svg>
  );
}

function UpgradeCard() {
  return (
    <div className="upgrade-card">
      <div className="upgrade-head">
        <span style={{ fontSize: 36 }}>🚀</span>
        <h3>Unlock all 5 models</h3>
      </div>
      <p>Founder plan tracks 3 models. Team plan adds Gemini + Google AI Overviews — together they cover 40% of all AI search traffic.</p>
      <ul>
        <li><Icon name="check" size={12} /> Daily scans across all 5 models</li>
        <li><Icon name="check" size={12} /> Cross-model competitor diff</li>
        <li><Icon name="check" size={12} /> Per-model quest suggestions</li>
      </ul>
      <button className="btn btn--primary btn--lg btn--full">Upgrade to Team — $89/mo</button>
    </div>
  );
}

Object.assign(window, { PageModels });
