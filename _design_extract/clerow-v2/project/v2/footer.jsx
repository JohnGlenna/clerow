function FinalCTA({ showMascot }) {
  return (
    <section className="section final-cta">
      <div className="shell">
        {showMascot && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <MascotOwl pose="wave" size={88} />
          </div>
        )}
        <h2 className="h-section">
          Find out what AI says
          <br />
          <span className="muted">about your brand.</span>
        </h2>
        <p className="lede" style={{ margin: "0 auto 32px", textAlign: "center" }}>
          60 seconds. No signup. No card. Just paste a domain.
        </p>
        <div className="actions">
          <a className="btn btn--ghost btn--lg" href="#">
            <Icon name="calendar" size={16} />
            Talk to John
          </a>
          <a className="btn btn--accent btn--lg" href="#">
            Start free scan
            <span className="arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer({ showMascot }) {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="brand" style={{ marginBottom: 14 }}>
              {showMascot ? <MascotOwl pose="read" size={32} /> : <span style={{ width: 32 }} />}
              <span>Clerow</span>
            </div>
            <p style={{ color: "var(--ink-2)", fontSize: 14, maxWidth: "32ch", margin: 0, fontWeight: 500 }}>
              AI search visibility, gamified. Built in Kristiansand 🇳🇴 by one human, for solo founders who actually ship.
            </p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><a href="#metrics">Metrics</a></li>
              <li><a href="#game">The Clerow Game</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#changelog">Changelog</a></li>
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
            <h4>Company</h4>
            <ul>
              <li><a href="#">About John</a></li>
              <li><a href="#">Build log</a></li>
              <li><a href="#">Open metrics</a></li>
              <li><a href="#">Affiliates</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Say hi</h4>
            <ul>
              <li><a href="mailto:john@clerow.com">john@clerow.com</a></li>
              <li><a href="#">Twitter / @clerow</a></li>
              <li><a href="#">Bluesky</a></li>
              <li><a href="#">Status</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Clerow · Kristiansand, Norway</span>
          <span>v0.4.1 · last scan 2 min ago</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { FinalCTA, Footer });
