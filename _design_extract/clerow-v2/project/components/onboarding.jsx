/* 4-step onboarding: paste URL → confirm details → enrich → scanning */

function Onboarding({ step, onStep, onDone, showMascot, initialUrl }) {
  const TOTAL = 4;
  const pct = Math.min(100, (step / TOTAL) * 100);

  const [url, setUrl] = React.useState(initialUrl || "linear.app");
  const [details, setDetails] = React.useState({
    company: "Linear",
    industry: "B2B SaaS · Project management",
    description: "Issue tracking and project management built for high-performance teams.",
    location: "San Francisco, CA",
    size: "50–200",
  });
  const [enrich, setEnrich] = React.useState({
    audience: ["Software engineering teams"],
    competitors: ["Jira", "Asana"],
    differentiators: ["Speed & keyboard-first UX"],
    geos: ["United States", "Europe"],
    description: "We help product-led startups stop drowning in Jira tickets. Our customers are 10–500 person engineering orgs who care about speed and design.",
  });

  return (
    <div className="onboard-page">
      <header className="onboard-top">
        <div className="shell shell--narrow onboard-top-inner">
          <a className="brand" href="#/" style={{ fontSize: 20 }}>
            {showMascot ? <MascotOwl pose="sit" size={32} /> : null}
            Clerow
          </a>
          <div className="onboard-progress" aria-label={`Step ${step} of ${TOTAL}`}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <a className="onboard-skip" href="#/dashboard">Skip for now →</a>
        </div>
      </header>

      <div className="onboard-body">
        {step === 1 && (
          <StepUrl
            url={url}
            setUrl={setUrl}
            showMascot={showMascot}
            onNext={() => onStep(2)}
          />
        )}
        {step === 2 && (
          <StepConfirm
            url={url}
            details={details}
            setDetails={setDetails}
            showMascot={showMascot}
            onBack={() => onStep(1)}
            onNext={() => onStep(3)}
          />
        )}
        {step === 3 && (
          <StepEnrich
            enrich={enrich}
            setEnrich={setEnrich}
            showMascot={showMascot}
            onBack={() => onStep(2)}
            onNext={() => onStep(4)}
          />
        )}
        {step === 4 && (
          <StepScanning
            showMascot={showMascot}
            company={details.company}
            onDone={onDone}
          />
        )}
      </div>
    </div>
  );
}

/* -------- Step 1: paste URL -------- */
function StepUrl({ url, setUrl, showMascot, onNext }) {
  return (
    <div className="onboard-card">
      <div className="onboard-mascot">
        {showMascot ? <MascotOwl pose="point" size={84} /> : null}
      </div>
      <span style={{ display: "block", textAlign: "center", color: "var(--ink-2)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        Step 1 of 4
      </span>
      <h1 className="onboard-h">What site should we scan?</h1>
      <p className="onboard-sub">
        Paste your domain. We'll pull what's public, you'll fill in the gaps next.
      </p>

      <div className="input-with-prefix">
        <span className="px">https://</span>
        <input
          autoFocus
          spellCheck="false"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourstartup.com"
          onKeyDown={(e) => { if (e.key === "Enter" && url.trim()) onNext(); }}
        />
      </div>

      <div className="onboard-actions">
        <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>
          🔒 Public pages only · we don't crawl logged-in routes
        </span>
        <div className="right">
          <button className="btn btn--primary btn--lg" onClick={onNext} disabled={!url.trim()}>
            Continue
            <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------- Step 2: confirm what we pulled -------- */
function StepConfirm({ url, details, setDetails, showMascot, onBack, onNext }) {
  const set = (k, v) => setDetails({ ...details, [k]: v });
  return (
    <div className="onboard-card">
      <div className="onboard-mascot">
        {showMascot ? <MascotOwl pose="read" size={84} /> : null}
      </div>
      <span style={{ display: "block", textAlign: "center", color: "var(--ink-2)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        Step 2 of 4
      </span>
      <h1 className="onboard-h">Is this right?</h1>
      <p className="onboard-sub">
        We pulled this from {url}. Edit anything that's off — it's how our scan gets sharper.
      </p>

      <div className="summary-grid">
        <span className="summary-logo">{details.company[0]}</span>
        <div>
          <div className="name">{details.company || "—"}</div>
          <div className="url">https://{url}</div>
          <div className="pills">
            <span className="summary-pill"><span className="dot" /> Auto-detected</span>
            <span className="summary-pill">⚡ 142 pages crawled</span>
            <span className="summary-pill">🔎 Open Graph + schema parsed</span>
          </div>
        </div>
      </div>

      <div className="field-stack">
        <div className="form-row">
          <label>Company name</label>
          <input className="input" value={details.company} onChange={(e) => set("company", e.target.value)} />
        </div>
        <div className="form-row">
          <label>Industry / category</label>
          <input className="input" value={details.industry} onChange={(e) => set("industry", e.target.value)} />
        </div>
        <div className="form-row">
          <label>What you do (one line)</label>
          <input className="input" value={details.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="form-row" style={{ flexDirection: "row", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ marginBottom: 6, display: "block" }}>Location</label>
            <input className="input" value={details.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ marginBottom: 6, display: "block" }}>Team size</label>
            <select className="input" value={details.size} onChange={(e) => set("size", e.target.value)}>
              <option>1 (solo)</option>
              <option>2–10</option>
              <option>11–50</option>
              <option>50–200</option>
              <option>200+</option>
            </select>
          </div>
        </div>
      </div>

      <div className="onboard-actions">
        <button className="btn btn--quiet" onClick={onBack}>← Back</button>
        <div className="right">
          <button className="btn btn--primary btn--lg" onClick={onNext}>
            Looks right
            <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------- Step 3: enrich — the more, the better -------- */
function StepEnrich({ enrich, setEnrich, showMascot, onBack, onNext }) {
  const audiences = [
    "Software engineering teams", "Marketing teams", "Sales teams", "Solo founders",
    "Product managers", "Designers", "Agencies", "Customer support",
  ];
  const differentiators = [
    "Speed & keyboard-first UX", "Better pricing", "Open source",
    "AI-native", "White-glove support", "Best-in-class integrations",
    "Made for solo founders", "Privacy-first",
  ];
  const geos = [
    "United States", "Europe", "United Kingdom", "Canada", "Australia/NZ",
    "Latin America", "Asia-Pacific", "Global",
  ];

  const toggle = (key, val) => {
    const arr = enrich[key] || [];
    setEnrich({
      ...enrich,
      [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val],
    });
  };

  // Compute completeness for the XP bar
  const completeness = Math.min(100, Math.round(
    ((enrich.audience.length      > 0 ? 25 : 0) +
     (enrich.differentiators.length > 0 ? 25 : 0) +
     (enrich.geos.length          > 0 ? 25 : 0) +
     (enrich.description && enrich.description.length > 30 ? 25 : 0))
  ));

  return (
    <div className="onboard-card">
      <div className="onboard-mascot">
        {showMascot ? <MascotOwl pose="think" size={84} /> : null}
      </div>
      <span style={{ display: "block", textAlign: "center", color: "var(--ink-2)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        Step 3 of 4
      </span>
      <h1 className="onboard-h">Help us see you clearly.</h1>
      <p className="onboard-sub">
        The more you fill in, the better Clerow can spot exactly what to fix.
      </p>

      <div className="field-stack">
        <div className="form-row">
          <label>Who are your customers? (pick all that apply)</label>
          <div className="tag-chips">
            {audiences.map((a) => (
              <button key={a} type="button"
                className={`tag-chip ${enrich.audience.includes(a) ? "on" : ""}`}
                onClick={() => toggle("audience", a)}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label>What makes you different?</label>
          <div className="tag-chips">
            {differentiators.map((a) => (
              <button key={a} type="button"
                className={`tag-chip ${enrich.differentiators.includes(a) ? "on" : ""}`}
                onClick={() => toggle("differentiators", a)}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label>Top competitors (comma-separated)</label>
          <input className="input"
            value={enrich.competitors.join(", ")}
            onChange={(e) => setEnrich({ ...enrich, competitors: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
            placeholder="Linear, Jira, Notion"
          />
        </div>

        <div className="form-row">
          <label>Target geographies</label>
          <div className="tag-chips">
            {geos.map((a) => (
              <button key={a} type="button"
                className={`tag-chip ${enrich.geos.includes(a) ? "on" : ""}`}
                onClick={() => toggle("geos", a)}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label>Anything else we should know? (the more, the better)</label>
          <textarea className="input"
            value={enrich.description}
            onChange={(e) => setEnrich({ ...enrich, description: e.target.value })}
            placeholder="Who you serve, what you don't do, and what 'good' looks like for you in 12 months." />
        </div>
      </div>

      <div className="enrich-progress">
        <span className="num">{completeness}%</span>
        <div className="enrich-bar"><i style={{ width: `${completeness}%` }} /></div>
        <span className="lab">
          Profile completeness — <b>+{Math.round(completeness * 2)} XP</b> when you finish
        </span>
      </div>

      <div className="onboard-actions">
        <button className="btn btn--quiet" onClick={onBack}>← Back</button>
        <div className="right">
          <a className="onboard-skip" href="#/dashboard" style={{ marginRight: 6 }}>Skip & finish</a>
          <button className="btn btn--primary btn--lg" onClick={onNext}>
            Run my scan
            <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------- Step 4: scanning animation, auto-advance -------- */
function StepScanning({ showMascot, company, onDone }) {
  const STEPS = [
    "Crawling public pages",
    "Parsing schema & metadata",
    "Querying ChatGPT, Claude, Perplexity, Gemini",
    "Mapping competitors in your niche",
    "Building your punch list",
  ];
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    if (active >= STEPS.length) return;
    const t = setTimeout(() => setActive(active + 1), 900);
    return () => clearTimeout(t);
  }, [active]);

  const finished = active >= STEPS.length;

  return (
    <div className="onboard-card">
      <span style={{ display: "block", textAlign: "center", color: "var(--ink-2)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        Step 4 of 4
      </span>
      <h1 className="onboard-h">
        {finished ? `Your first report is ready, ${company}.` : "Scanning your site…"}
      </h1>
      <p className="onboard-sub">
        {finished
          ? "We found 12 things to fix. The first one takes ten minutes."
          : "Hang tight. This is the only time you'll wait — every other scan runs in the background."}
      </p>

      <div className="scanning">
        <div className="scan-orbit" aria-hidden="true">
          <div className="spin1"><span className="dot" /></div>
          <div className="spin2"><span className="dot d2" /></div>
          <div className="ring" />
          <div className="ring r2" />
          <div className="center">
            {showMascot
              ? <MascotOwl pose="wave" size={60} />
              : <span style={{ fontSize: 40 }}>🦉</span>}
          </div>
        </div>

        <div className="scan-tasks">
          {STEPS.map((s, i) => {
            const state = i < active ? "done" : i === active ? "active" : "pending";
            return (
              <div key={i} className={`scan-task ${state}`}>
                <span className="tick">
                  {state === "done" ? "✓" : state === "active" ? "•" : ""}
                </span>
                <span>{s}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="onboard-actions">
        <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>
          {finished
            ? "🏅 First Scan badge unlocked!"
            : `${Math.round((active / STEPS.length) * 100)}% complete`}
        </span>
        <div className="right">
          <button
            className={`btn btn--lg ${finished ? "btn--primary" : "btn--quiet"}`}
            onClick={onDone}
            disabled={!finished}
          >
            {finished ? "Open my dashboard" : "Please wait…"}
            {finished && <span className="arrow">→</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Onboarding });
