function Hero() {
  return (
    <section className="hero shell">
      <div className="hero-pill">
        <span className="dot" />
        <span>v0.4 just shipped · solo-founder built</span>
      </div>

      <h1 className="h-display">
        AI search visibility
        <br />
        <span className="muted">for solo founders</span>
      </h1>

      <p className="hero-sub">
        Track, analyze, and improve how ChatGPT, Claude, and Perplexity talk about your
        startup — through key metrics like{" "}
        <span className="chip"><span className="ico"><Icon name="eye" size={14} /></span>Visibility</span>,{" "}
        <span className="chip"><span className="ico"><Icon name="target" size={14} /></span>Position</span>,
        and{" "}
        <span className="chip"><span className="ico"><Icon name="smile" size={14} /></span>Sentiment</span>.
      </p>

      <div className="hero-cta">
        <a className="btn btn--ghost btn--lg" href="#">
          <Icon name="calendar" size={16} />
          Talk to John
        </a>
        <a className="btn btn--primary btn--lg" href="#">
          Start free scan
          <span className="arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}

Object.assign(window, { Hero });
