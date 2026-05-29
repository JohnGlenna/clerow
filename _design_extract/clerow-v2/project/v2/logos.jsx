function Logos() {
  const brands = [
    { name: "BREITLING", style: { letterSpacing: "0.04em" } },
    { name: "attio", icon: "circ" },
    { name: "SQUARESPACE" },
    { name: "Brevo", icon: "tri" },
    { name: "HUGO BOSS" },
    { name: "n8n", icon: "dot" },
    { name: "11Eleven" },
    { name: "Omio" },
    { name: "TUI" },
    { name: "WIX" },
  ];
  const agencies = [
    { name: "seer", icon: "tri" },
    { name: "previsible.io" },
    { name: "PEAK ACE" },
    { name: "Eskimoz" },
    { name: "Omniscient", icon: "circ" },
    { name: "KINESSO" },
    { name: "We.Comm" },
    { name: "MINDSHARE" },
    { name: "jvs global" },
    { name: "FIRSTPAGE" },
  ];

  return (
    <div className="shell logos-wrap">
      <div className="logos-meta">
        Trusted by <b>2,141 solo founders</b> & marketing teams.
      </div>
      <div className="logos-cols">
        <div className="logos-col">
          <span className="logos-col-tag">Brands</span>
          <div className="logos-grid">
            {brands.map((b, i) => (
              <span className="logo-wm" key={i} style={b.style || {}}>
                {b.icon === "dot" && <span className="lm-dot" />}
                {b.icon === "tri" && <span className="lm-tri" />}
                {b.icon === "circ" && <span className="lm-circ" />}
                {b.name}
              </span>
            ))}
          </div>
        </div>
        <div className="logos-col">
          <span className="logos-col-tag">Agencies</span>
          <div className="logos-grid">
            {agencies.map((b, i) => (
              <span className="logo-wm" key={i}>
                {b.icon === "dot" && <span className="lm-dot" />}
                {b.icon === "tri" && <span className="lm-tri" />}
                {b.icon === "circ" && <span className="lm-circ" />}
                {b.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Logos });
