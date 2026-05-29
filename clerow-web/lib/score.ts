// Pure AI-visibility score math. Kept dependency-free so both the brand snapshot
// and the share-page progress loader can use it without import cycles.

// A later position is worth less; #1 = 100, #2 = 85, … (floored at 0).
export function positionScore(pos: number | null): number {
  if (pos == null) return 0;
  return Math.max(0, Math.round(100 - (pos - 1) * 15));
}

// The single overall AI-visibility score shown on the dashboard.
export function overallScore(
  visibility: number,
  sentiment: number | null,
  position: number | null,
): number {
  return Math.round(visibility * 0.5 + (sentiment ?? 0) * 0.3 + positionScore(position) * 0.2);
}
