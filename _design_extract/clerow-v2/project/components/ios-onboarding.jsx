/* Clerow iOS — onboarding carousel + auth */

function OnbSlide({ slide }) {
  return (
    <div className="ia ia-screen ia-screen--white">
      <div className="ia-onb">
        <div className="ia-onb-art">{slide.art}</div>
        <div className="ia-dots">
          {[0,1,2].map(i => <i key={i} className={i === slide.idx ? "on" : ""} />)}
        </div>
        <h1 dangerouslySetInnerHTML={{ __html: slide.title }} />
        <p>{slide.body}</p>
        <button className="ia-btn ia-btn--lg">{slide.cta}</button>
        {slide.idx < 2 && (
          <button style={{ background: "none", border: 0, marginTop: 14, color: "var(--ink-3)", fontWeight: 800, fontSize: 14, fontFamily: "var(--ios-font)" }}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

function ArtAsk() {
  return (
    <div style={{ position: "relative", width: 240, height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: 8, left: 0, background: "#fff", border: "2px solid var(--line)", borderRadius: 16, borderBottomLeftRadius: 4, padding: "10px 14px", fontWeight: 800, fontSize: 13, boxShadow: "0 6px 16px -8px rgba(0,0,0,0.2)" }}>
        "best AI music generator?"
      </div>
      <MascotClerow size={150} float />
      <div style={{ position: "absolute", bottom: 6, right: 0, background: "var(--navy)", color: "#fff", borderRadius: 16, borderBottomRightRadius: 4, padding: "10px 14px", fontWeight: 800, fontSize: 13, boxShadow: "0 6px 16px -8px rgba(30,79,107,0.4)" }}>
        Suno, Udio, Soundraw…
      </div>
    </div>
  );
}

function ArtScore() {
  return (
    <div style={{ position: "relative", width: 240, height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <IaRing value={68} size={150} />
      <div style={{ position: "absolute", top: 20, right: 12, background: "var(--xp)", color: "#4A3500", borderRadius: 12, padding: "6px 10px", fontWeight: 900, fontSize: 13, boxShadow: "0 3px 0 var(--xp-deep)", transform: "rotate(6deg)" }}>
        +120 XP
      </div>
      <div style={{ position: "absolute", bottom: 18, left: 8, background: "linear-gradient(180deg,#FFB347,#FF7B1F)", color: "#fff", borderRadius: 12, padding: "6px 12px", fontWeight: 900, fontSize: 14, boxShadow: "0 3px 0 var(--streak-deep)", transform: "rotate(-5deg)" }}>
        🔥 12
      </div>
    </div>
  );
}

function ArtClimb() {
  return (
    <svg width="240" height="220" viewBox="0 0 240 220" aria-hidden="true">
      <rect x="92" y="70" width="56" height="120" rx="6" fill="#FFC800" stroke="#131313" strokeWidth="2.5"/>
      <rect x="28" y="108" width="56" height="82" rx="6" fill="#E5E7EB" stroke="#131313" strokeWidth="2.5"/>
      <rect x="156" y="128" width="56" height="62" rx="6" fill="#F0B280" stroke="#131313" strokeWidth="2.5"/>
      <text x="120" y="148" textAnchor="middle" fontFamily="Nunito" fontWeight="900" fontSize="26" fill="#4A3500">1</text>
      <text x="56" y="160" textAnchor="middle" fontFamily="Nunito" fontWeight="900" fontSize="20" fill="#374151">2</text>
      <text x="184" y="172" textAnchor="middle" fontFamily="Nunito" fontWeight="900" fontSize="18" fill="#5D2F0F">3</text>
      <circle cx="120" cy="48" r="22" fill="#1E4F6B" stroke="#131313" strokeWidth="2.5"/>
      <text x="120" y="54" textAnchor="middle" fontFamily="Nunito" fontWeight="900" fontSize="13" fill="#fff">YOU</text>
      <rect x="20" y="28" width="7" height="7" rx="1.5" fill="#1E4F6B" transform="rotate(20 23 31)"/>
      <rect x="210" y="40" width="7" height="7" rx="1.5" fill="#FFC800" transform="rotate(-15 213 43)"/>
      <circle cx="206" cy="70" r="3.5" fill="#FF7B1F"/>
      <circle cx="30" cy="64" r="3.5" fill="#34A853"/>
    </svg>
  );
}

function ScreenOnboarding({ idx }) {
  const slides = [
    { idx: 0, title: 'When AI gets asked,<br/><em>does it name you?</em>', body: "Clerow finds the prompts your customers ask ChatGPT, Claude & Perplexity — and checks if you show up.", cta: "Next", art: <ArtAsk /> },
    { idx: 1, title: 'One score.<br/>A clear <em>punch list.</em>', body: "See exactly where you rank, then fix it — earning XP and streaks for every win.", cta: "Next", art: <ArtScore /> },
    { idx: 2, title: 'Climb past<br/>your <em>rivals.</em>', body: "Race your category every single day. Get cited. Stay cited.", cta: "Get started", art: <ArtClimb /> },
  ];
  return <OnbSlide slide={slides[idx]} />;
}

function ScreenAuth() {
  return (
    <div className="ia ia-screen ia-screen--white">
      <div className="ia-body" style={{ display: "flex", flexDirection: "column", paddingTop: 72 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <MascotClerow size={96} />
        </div>
        <h1 style={{ textAlign: "center", fontWeight: 900, fontSize: 27, letterSpacing: "-0.02em", margin: "4px 0 6px" }}>
          Stop being invisible to AI.
        </h1>
        <p style={{ textAlign: "center", color: "var(--ink-2)", fontWeight: 600, fontSize: 15, margin: "0 0 28px" }}>
          Free scan in 60 seconds.
        </p>

        <button className="ia-oauth" style={{ marginBottom: 12 }}>
          <GoogleG size={20} /> Continue with Google
        </button>
        <button className="ia-oauth">
           Continue with Apple
        </button>

        <div className="ia-divider">or</div>

        <input className="ia-input" placeholder="you@yourstartup.com" />
        <button className="ia-btn ia-btn--lg" style={{ marginTop: 12 }}>Continue with email</button>

        <p className="ia-legal">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function GoogleG({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FBBC05" d="M24 9.5c3.3 0 6.3 1.1 8.6 3.3l6.4-6.4C35.5 2.8 30.1.5 24 .5 14.7.5 6.7 5.8 2.9 13.7l7.5 5.8C12.2 13.6 17.6 9.5 24 9.5z"/>
      <path fill="#34A853" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.6c-.6 3-2.3 5.5-4.9 7.2l7.5 5.8c4.4-4 6.8-9.9 6.8-17.5z"/>
      <path fill="#4285F4" d="M10.4 28.5c-.6-1.7-.9-3.5-.9-5.5s.3-3.8.9-5.5l-7.5-5.8C1.1 15.5 0 19.6 0 24s1.1 8.5 2.9 12.3l7.5-5.8z"/>
      <path fill="#EA4335" d="M24 47.5c6.1 0 11.5-2 15.3-5.5l-7.5-5.8c-2.1 1.4-4.7 2.3-7.8 2.3-6.4 0-11.8-4.1-13.6-9.8l-7.5 5.8C6.7 42.2 14.7 47.5 24 47.5z"/>
    </svg>
  );
}

/* Reusable score ring for iOS */
function IaRing({ value, size = 116 }) {
  const r = size / 2 - 11, c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="ia-score-ring" style={{ width: size, height: size, flex: `0 0 ${size}px` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ECEBE7" strokeWidth="11" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#iaGrad)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`} transform={`rotate(-90 ${size/2} ${size/2})`} />
        <defs>
          <linearGradient id="iaGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E4F6B"/>
            <stop offset="100%" stopColor="#143A52"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="num">
        <b>{value}</b>
        <span>score</span>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenOnboarding, ScreenAuth, GoogleG, IaRing });
