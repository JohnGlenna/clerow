function Features() {
  return (
    <section className="section section--soft">
      <div className="shell">
        <div className="kf-head">
          <div>
            <div className="section-eyebrow" style={{ marginBottom: 18 }}>
              <span className="ico"><Icon name="bolt" size={13} /></span>
              Key features
            </div>
            <h2 className="h-section">
              Turn AI search insights
              <br />
              <span className="muted">into new customers.</span>
            </h2>
          </div>
          <p className="lede" style={{ fontSize: 18 }}>
            Identify the prompts that matter, monitor your rankings, and ship the changes
            that move the needle — before your competitors do.
          </p>
        </div>

        <div className="kf-grid">
          <FeatureCard
            title="Set up Prompts"
            desc="Prompts are the foundation of your AI search strategy. Uncover and organize the prompts that matter most."
            mock={<MockPrompts />} />
          <FeatureCard
            title="Use Data to Pick Winners"
            desc="Leverage AI-suggested prompts and search volumes to focus on the biggest opportunities."
            mock={<MockSuggested />} />
          <FeatureCard
            title="Add Brands"
            desc="See how you rank against the players that actually matter in your market."
            mock={<MockBrands />} />
          <FeatureCard
            title="Choose AI Models"
            desc="Track rankings across the models that drive the most traffic and visibility."
            mock={<MockModels />} />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ title, desc, mock }) {
  return (
    <div className="kf-card">
      <h3>{title}</h3>
      <p>{desc}</p>
      <div className="kf-shot">{mock}</div>
    </div>
  );
}

function MockPrompts() {
  return (
    <div className="mock-prompts">
      <div className="mh">
        <span className="l"><Icon name="list" size={14} /> Tracked prompts</span>
        <span className="r">
          <span className="b">Add manually</span>
          <span className="b dark">Bulk import CSV</span>
        </span>
      </div>
      <table>
        <thead><tr><th>Prompt</th><th>Vis.</th><th>Mentions</th><th>Tag</th></tr></thead>
        <tbody>
          <tr><td>Best AI SEO tool for indie SaaS</td><td><b>84%</b></td><td>42</td><td><span className="ttag amber">High intent</span></td></tr>
          <tr><td>How do I rank in ChatGPT answers</td><td><b>61%</b></td><td>28</td><td><span className="ttag green">Educational</span></td></tr>
          <tr><td>Alternatives to Profound for solo founders</td><td><b>78%</b></td><td>19</td><td><span className="ttag amber">Compare</span></td></tr>
          <tr><td>Tools to track LLM mentions</td><td><b>52%</b></td><td>14</td><td><span className="ttag gray">Generic</span></td></tr>
        </tbody>
      </table>
    </div>
  );
}

function MockSuggested() {
  return (
    <div className="mock-stack">
      <div className="sc sc1">
        <h5>What's the best ChatGPT-friendly CMS?</h5>
        <div className="row"><span>Volume</span><b>Medium</b></div>
        <div className="row"><span>Intent</span><b>Educational</b></div>
        <div className="row"><span>Comp.</span><b>Low</b></div>
      </div>
      <div className="sc sc2">
        <h5>Best LLM SEO software for solo founders</h5>
        <div className="row"><span>Volume</span><b style={{ color: "var(--success)" }}>High</b></div>
        <div className="row"><span>Intent</span><b>Compare</b></div>
        <div className="row"><span>Suggested by</span><b>Clerow AI</b></div>
      </div>
      <div className="sc sc3">
        <h5>How to get cited by Perplexity in 2026</h5>
        <div className="row"><span>Volume</span><b>Rising</b></div>
        <div className="row"><span>Tag</span><b>Trend</b></div>
      </div>
    </div>
  );
}

function MockBrands() {
  const rows = [
    { sw: "#F59E0B", name: "Clerow (you)", v: "+ tracked", me: true },
    { sw: "#1CB0F6", name: "monday.com",   v: "tracking" },
    { sw: "#58CC02", name: "athena-int.co",v: "tracking" },
    { sw: "#A560FF", name: "otterly.ai",   v: "tracking" },
  ];
  return (
    <div className="mock-brands">
      <div className="mb-head">
        <span className="l">Tracked brands</span>
        <span className="count">5</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className={`mb-row ${r.me ? "me" : ""}`}>
          <span className="l">
            <span className="sw" style={{ background: r.sw }}>{r.name[0].toUpperCase()}</span>
            {r.name}
          </span>
          <span className="r">{r.v}</span>
        </div>
      ))}
      <span className="add-btn">
        <Icon name="plus" size={12} />
        Add brand
      </span>
    </div>
  );
}

function MockModels() {
  const models = [
    { sw: "#10A37F", l: "C", name: "ChatGPT",       on: true },
    { sw: "#D97706", l: "A", name: "Claude",        on: true },
    { sw: "#1CB0F6", l: "P", name: "Perplexity",    on: true },
    { sw: "#4285F4", l: "G", name: "Gemini",        on: true },
    { sw: "#7C3AED", l: "L", name: "Llama 3.3 405B", on: false },
    { sw: "#777",    l: "K", name: "Kagi Assistant", on: false },
  ];
  return (
    <div className="mock-models">
      <div className="mm-head">
        <span><b>Models</b> · 6 available</span>
        <span className="freq"><Icon name="calendar" size={11} /> Daily</span>
      </div>
      {models.map((m, i) => (
        <div key={i} className="row" style={ m.on ? {} : { opacity: 0.55 } }>
          <span className="l">
            <span className={`check ${m.on ? "" : "off"}`}>{m.on ? <Icon name="check" size={11} /> : ""}</span>
            <span className="model-icon" style={{ background: m.sw }}>{m.l}</span>
            {m.name}
          </span>
          <span style={{ fontSize: 11.5, color: "var(--ink-2)", fontFamily: "var(--font-mono)" }}>
            {m.on ? "tracking" : "off"}
          </span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Features });
