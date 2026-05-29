type Pose = "wave" | "think" | "read" | "point" | "sit";

const BODY = "#E8DCC0";
const BODY_DARK = "#C7B58A";
const INK = "#1F1B16";

function Feet({ A }: { A: string }) {
  return (
    <g>
      <path
        d="M44 92 L42 99 M48 93 L48 100 M52 93 L52 100 M56 92 L58 99"
        stroke={A}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </g>
  );
}

export function MascotOwl({
  pose = "wave",
  size = 72,
  accent,
}: {
  pose?: Pose;
  size?: number;
  accent?: string;
}) {
  const A = accent || "var(--accent)";

  if (pose === "wave") {
    return (
      <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-hidden="true">
        <g>
          <ellipse cx="50" cy="60" rx="30" ry="32" fill={BODY} stroke={INK} strokeWidth="2" />
          <ellipse cx="50" cy="68" rx="20" ry="22" fill="#F2EAD3" />
          <path d="M28 36 Q26 24 34 26" fill={BODY} stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <path d="M72 36 Q74 24 66 26" fill={BODY} stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="50" r="9" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
          <circle cx="60" cy="50" r="9" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
          <circle cx="41" cy="51" r="3" fill={INK} />
          <circle cx="61" cy="51" r="3" fill={INK} />
          <circle cx="42" cy="50" r="0.9" fill="#fff" />
          <circle cx="62" cy="50" r="0.9" fill="#fff" />
          <path d="M48 58 L52 58 L50 63 Z" fill={A} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M80 56 Q92 42 86 30 Q80 36 78 50 Z" fill={BODY_DARK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M22 64 Q14 70 22 80 Q26 74 28 70 Z" fill={BODY_DARK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <Feet A={A} />
        </g>
      </svg>
    );
  }

  if (pose === "think") {
    return (
      <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-hidden="true">
        <g>
          <ellipse cx="50" cy="62" rx="30" ry="32" fill={BODY} stroke={INK} strokeWidth="2" />
          <ellipse cx="50" cy="70" rx="20" ry="22" fill="#F2EAD3" />
          <path d="M28 38 Q26 26 34 28" fill={BODY} stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <path d="M72 38 Q74 26 66 28" fill={BODY} stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <path d="M32 52 Q40 48 48 52" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="60" cy="52" r="9" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
          <circle cx="62" cy="49" r="3" fill={INK} />
          <path d="M48 60 L52 60 L50 65 Z" fill={A} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M22 66 Q14 72 22 82 Q26 76 28 72 Z" fill={BODY_DARK} stroke={INK} strokeWidth="2" />
          <path d="M78 66 Q86 72 78 82 Q74 76 72 72 Z" fill={BODY_DARK} stroke={INK} strokeWidth="2" />
          <circle cx="84" cy="22" r="3" fill={A} />
          <circle cx="78" cy="30" r="2" fill={A} />
          <Feet A={A} />
        </g>
      </svg>
    );
  }

  if (pose === "read") {
    return (
      <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-hidden="true">
        <g>
          <ellipse cx="50" cy="62" rx="30" ry="32" fill={BODY} stroke={INK} strokeWidth="2" />
          <ellipse cx="50" cy="70" rx="20" ry="22" fill="#F2EAD3" />
          <path d="M28 38 Q26 26 34 28" fill={BODY} stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <path d="M72 38 Q74 26 66 28" fill={BODY} stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="52" r="9" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
          <circle cx="60" cy="52" r="9" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
          <line x1="49" y1="52" x2="51" y2="52" stroke={INK} strokeWidth="2" />
          <circle cx="40" cy="54" r="2.4" fill={INK} />
          <circle cx="60" cy="54" r="2.4" fill={INK} />
          <path d="M48 62 L52 62 L50 67 Z" fill={A} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <rect x="36" y="76" width="28" height="14" rx="2" fill="#fff" stroke={INK} strokeWidth="2" />
          <line x1="50" y1="76" x2="50" y2="90" stroke={INK} strokeWidth="1.2" />
          <line x1="40" y1="80" x2="46" y2="80" stroke={A} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="40" y1="84" x2="46" y2="84" stroke={A} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="54" y1="80" x2="60" y2="80" stroke={A} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="54" y1="84" x2="60" y2="84" stroke={A} strokeWidth="1.2" strokeLinecap="round" />
          <Feet A={A} />
        </g>
      </svg>
    );
  }

  if (pose === "point") {
    return (
      <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-hidden="true">
        <g>
          <ellipse cx="50" cy="60" rx="30" ry="32" fill={BODY} stroke={INK} strokeWidth="2" />
          <ellipse cx="50" cy="68" rx="20" ry="22" fill="#F2EAD3" />
          <path d="M28 36 Q26 24 34 26" fill={BODY} stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <path d="M72 36 Q74 24 66 26" fill={BODY} stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="50" r="9" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
          <circle cx="60" cy="50" r="9" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
          <circle cx="43" cy="51" r="3" fill={INK} />
          <circle cx="63" cy="51" r="3" fill={INK} />
          <path d="M48 58 L52 58 L50 63 Z" fill={A} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M78 60 Q96 60 96 50 Q92 54 78 52 Z" fill={BODY_DARK} stroke={INK} strokeWidth="2" />
          <path d="M22 64 Q14 70 22 80 Q26 74 28 70 Z" fill={BODY_DARK} stroke={INK} strokeWidth="2" />
          <Feet A={A} />
        </g>
      </svg>
    );
  }

  if (pose === "sit") {
    return (
      <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-hidden="true">
        <g>
          <ellipse cx="50" cy="64" rx="28" ry="30" fill={BODY} stroke={INK} strokeWidth="2" />
          <ellipse cx="50" cy="70" rx="18" ry="20" fill="#F2EAD3" />
          <path d="M30 42 Q28 30 36 32" fill={BODY} stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <path d="M70 42 Q72 30 64 32" fill={BODY} stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <circle cx="42" cy="54" r="8" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
          <circle cx="58" cy="54" r="8" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
          <circle cx="42" cy="55" r="2.6" fill={INK} />
          <circle cx="58" cy="55" r="2.6" fill={INK} />
          <path d="M48 62 L52 62 L50 67 Z" fill={A} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <line x1="14" y1="96" x2="86" y2="96" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <path d="M46 94 L46 100 M50 94 L50 100 M54 94 L54 100" stroke={A} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  return null;
}

export function MascotClerow({ size = 120, float = false }: { size?: number; float?: boolean }) {
  return (
    <img
      src="/assets/clerow-mascot.png"
      alt="Clerow"
      width={size}
      height={size}
      style={{
        display: "block",
        width: size,
        height: size,
        objectFit: "contain",
        userSelect: "none",
        pointerEvents: "none",
        animation: float ? "clerow-float 4s ease-in-out infinite" : "none",
      }}
      draggable={false}
    />
  );
}
