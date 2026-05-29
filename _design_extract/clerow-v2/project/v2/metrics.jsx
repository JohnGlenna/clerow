function Metrics() {
  return (
    <section id="metrics" className="section section--soft">
      <div className="shell">
        <div className="metrics-head">
          <div className="section-eyebrow">
            <span className="ico"><Icon name="spark" size={13} /></span>
            AI Search Metrics
          </div>
          <h2 className="h-section">Understand how AI sees your brand.</h2>
          <p className="lede" style={{ margin: "0 auto" }}>
            We track the three things that actually matter inside ChatGPT, Claude, and Perplexity.
          </p>
        </div>

        <div className="metrics-grid">
          <MetricCard icon="eye" title="Visibility"
            desc="See the share of chats where Clerow surfaces your brand — and how often you show up versus the people you sell against."
            mock={<MockVisibility />} />
          <MetricCard icon="target" title="Position"
            desc="Where you rank inside the model's answer. Position 1 wins the click. Position 7 doesn't exist."
            mock={<MockPosition />} />
          <MetricCard icon="smile" title="Sentiment"
            desc="What the models actually say about you. The good, the bad, and the line you wrote in 2022 that's still haunting you."
            mock={<MockSentiment />} />
        </div>
      </div>
    </section>
  );
}

function MetricCard({ icon, title, desc, mock }) {
  return (
    <div className="metric-card">
      <span className="metric-icon"><Icon name={icon} size={18} /></span>
      <h3>{title}</h3>
      <p>{desc}</p>
      {mock}
    </div>
  );
}

function MockVisibility() {
  const rows = [
    { sw: "#1CB0F6", name: "Profound", v: "62%" },
    { sw: "#F59E0B", name: "Clerow",   v: "66%", me: true },
    { sw: "#58CC02", name: "Athena",   v: "54%" },
    { sw: "#E11D48", name: "Peec",     v: "39%" },
  ];
  return (
    <div className="mini-mock">
      {rows.map((r, i) => (
        <div key={i} className={`mm-row ${r.me ? "is-me" : ""}`}>
          <span className="brand-cell">
            <span className="sw" style={{ background: r.sw }}>{r.name[0]}</span>
            {r.name}
          </span>
          <span className="num">{r.v}</span>
        </div>
      ))}
    </div>
  );
}

function MockPosition() {
  const rows = [
    { sw: "#1CB0F6", name: "Profound", p: 1 },
    { sw: "#F59E0B", name: "Clerow",   p: 2, me: true },
    { sw: "#58CC02", name: "Athena",   p: 3 },
    { sw: "#A560FF", name: "Otterly",  p: 4 },
  ];
  return (
    <div className="mini-mock">
      {rows.map((r, i) => (
        <div key={i} className={`mm-row ${r.me ? "is-me" : ""}`}>
          <span className="brand-cell">
            <span className="sw" style={{ background: r.sw }}>{r.name[0]}</span>
            {r.name}
          </span>
          <span className="pos-pill">{r.p}</span>
        </div>
      ))}
    </div>
  );
}

function MockSentiment() {
  const rows = [
    { sw: "#F59E0B", name: "Clerow",   s: 92, face: "😄", me: true },
    { sw: "#1CB0F6", name: "Profound", s: 78, face: "🙂" },
    { sw: "#58CC02", name: "Athena",   s: 64, face: "😐" },
    { sw: "#E11D48", name: "Peec",     s: 38, face: "😟" },
  ];
  return (
    <div className="mini-mock">
      {rows.map((r, i) => (
        <div key={i} className={`mm-row ${r.me ? "is-me" : ""}`} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="brand-cell">
              <span className="sw" style={{ background: r.sw }}>{r.name[0]}</span>
              {r.name}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="face">{r.face}</span>
              <span className="num">{r.s}</span>
            </span>
          </div>
          <div className="sent-bar"><i style={{ width: `${r.s}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Metrics });
