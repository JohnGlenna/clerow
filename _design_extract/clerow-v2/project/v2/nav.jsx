function Nav({ showMascot }) {
  return (
    <header className="nav">
      <div className="shell nav-inner">
        <a className="brand" href="#">
          <span className="brand-mark">
            {showMascot
              ? <MascotOwl pose="sit" size={32} />
              : <svg width="28" height="28" viewBox="0 0 28 28"><rect x="2" y="2" width="24" height="24" rx="6" fill="var(--ink)"/><text x="14" y="19" textAnchor="middle" fill="#fff" fontFamily="Nunito" fontWeight="900" fontSize="14">C</text></svg>
            }
          </span>
          <span>Clerow</span>
        </a>
        <nav className="nav-links">
          <a href="#pricing">Pricing <span className="caret">▾</span></a>
          <a href="#resources">Resources <span className="caret">▾</span></a>
          <a href="#changelog">Changelog</a>
          <a href="#playbook">Playbook</a>
          <a href="#careers">Careers</a>
        </nav>
        <div className="nav-actions">
          <a className="btn btn--ghost btn--sm" href="#">Log in</a>
          <a className="btn btn--primary btn--sm" href="#">Start free</a>
        </div>
      </div>
    </header>
  );
}

Object.assign(window, { Nav });
