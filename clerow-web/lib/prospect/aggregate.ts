// Pure aggregation of per-answer extractions into the scan headline numbers
// (ported from competitorLeaderboard() in scripts/prospect-probe.ts).

import { buildAliasSet, normBrand } from "./alias";
import type { CompetitorCount, PerAnswerExtraction, ScanAggregate } from "./types";

export { normalizeWebsite } from "./alias";

/**
 * Mentioned-in-X-of-N plus the competitor leaderboard. Each competitor counts
 * at most once per answer (deduped via normBrand), and anything that is really
 * the prospect under another spelling is dropped from the leaderboard.
 */
export function aggregateScan(
  perAnswer: PerAnswerExtraction[],
  opts: { brand: string; website: string },
): ScanAggregate {
  const prospectKeys = new Set(
    buildAliasSet(opts.brand, opts.website).map(normBrand).filter(Boolean),
  );

  const counts = new Map<string, CompetitorCount>();
  for (const a of perAnswer) {
    const seenInAnswer = new Set<string>();
    for (const raw of a.competitors) {
      const name = raw.trim();
      const key = normBrand(name);
      if (!name || !key || prospectKeys.has(key) || seenInAnswer.has(key)) continue;
      seenInAnswer.add(key);
      const entry = counts.get(key);
      if (entry) entry.mentions += 1;
      else counts.set(key, { name, mentions: 1 });
    }
  }

  const competitors = [...counts.values()].sort(
    (a, b) => b.mentions - a.mentions || a.name.localeCompare(b.name),
  );

  return {
    mentionedCount: perAnswer.filter((a) => a.mentioned).length,
    totalPrompts: perAnswer.length,
    competitors,
    topCompetitor: competitors[0]?.name ?? null,
    topCompetitorMentions: competitors[0]?.mentions ?? 0,
  };
}
