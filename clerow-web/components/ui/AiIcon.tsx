import React from "react";

// Real brand logos for the AI engines, served from /public/ai. claude/gemini/
// perplexity are full-colour marks; openai/grok are currentColor (render dark) —
// all read cleanly on a white tile (see AiTile). Falls back to the letter.
const FILE: Record<string, string> = {
  chatgpt: "openai.svg",
  claude: "claude-color.svg",
  gemini: "gemini-color.svg",
  grok: "grok.svg",
  perplexity: "perplexity-color.svg",
};

export function AiIcon({ id, size = 16, letter }: { id: string; size?: number; letter?: string }) {
  const f = FILE[id];
  if (f) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/ai/${f}`} width={size} height={size} alt={id} style={{ display: "block", objectFit: "contain" }} />;
  }
  return <span style={{ fontSize: size * 0.7, fontWeight: 900 }}>{letter ?? id[0]?.toUpperCase()}</span>;
}

// A white rounded tile holding the brand logo — the standard "app icon" look that
// shows real brand colours on both the light landing and the dark dashboard.
export function AiTile({
  id,
  letter,
  size = 28,
  radius = 8,
  iconRatio = 0.62,
  className,
  style,
}: {
  id: string;
  letter?: string;
  size?: number;
  radius?: number;
  iconRatio?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={className}
      style={{
        width: size, height: size, borderRadius: radius, background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)", display: "inline-flex", alignItems: "center", justifyContent: "center",
        flex: `0 0 ${size}px`, ...style,
      }}
    >
      <AiIcon id={id} size={Math.round(size * iconRatio)} letter={letter} />
    </span>
  );
}
