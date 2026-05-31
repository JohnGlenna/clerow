import React from "react";
import { SiOpenai, SiClaude, SiGooglegemini, SiPerplexity, SiX } from "react-icons/si";
import type { IconType } from "react-icons";

// Real brand logos for the AI engines (Simple Icons via react-icons). Grok uses
// the xAI / X mark. Falls back to the engine letter when an id is unknown.
const ICON: Record<string, IconType> = {
  chatgpt: SiOpenai,
  claude: SiClaude,
  gemini: SiGooglegemini,
  perplexity: SiPerplexity,
  grok: SiX,
};

export function AiIcon({ id, size = 16, letter }: { id: string; size?: number; letter?: string }) {
  const Ic = ICON[id];
  if (Ic) return <Ic size={size} aria-hidden />;
  return <span style={{ fontSize: size * 0.7, fontWeight: 900 }}>{letter ?? id[0]?.toUpperCase()}</span>;
}
