import { describe, expect, it } from "vitest";

import { aggregateScan, normalizeWebsite } from "./aggregate";
import type { PerAnswerExtraction } from "./types";

const answer = (index: number, mentioned: boolean, competitors: string[]): PerAnswerExtraction => ({
  index,
  mentioned,
  competitors,
});

describe("aggregateScan", () => {
  const opts = { brand: "Regnskapshuset AS", website: "https://regnskapshuset.no" };

  it("counts mentions and builds a sorted leaderboard", () => {
    const agg = aggregateScan(
      [
        answer(0, true, ["Tripletex", "Fiken"]),
        answer(1, false, ["Fiken", "Visma"]),
        answer(2, false, ["Fiken"]),
        answer(3, true, ["Tripletex"]),
        answer(4, false, []),
        answer(5, false, ["Visma"]),
      ],
      opts,
    );
    expect(agg.mentionedCount).toBe(2);
    expect(agg.totalPrompts).toBe(6);
    expect(agg.competitors).toEqual([
      { name: "Fiken", mentions: 3 },
      { name: "Tripletex", mentions: 2 },
      { name: "Visma", mentions: 2 },
    ]);
    expect(agg.topCompetitor).toBe("Fiken");
    expect(agg.topCompetitorMentions).toBe(3);
  });

  it("dedupes competitor spellings within an answer and across answers", () => {
    const agg = aggregateScan(
      [answer(0, false, ["Tripletex AS", "tripletex"]), answer(1, false, ["TRIPLETEX"])],
      opts,
    );
    expect(agg.competitors).toEqual([{ name: "Tripletex AS", mentions: 2 }]);
  });

  it("never lists the prospect itself as a competitor", () => {
    const agg = aggregateScan(
      [answer(0, true, ["Regnskapshuset", "regnskapshuset.no", "Fiken"])],
      opts,
    );
    expect(agg.competitors).toEqual([{ name: "Fiken", mentions: 1 }]);
  });

  it("handles the zero-mention case", () => {
    const agg = aggregateScan([answer(0, false, []), answer(1, false, [])], opts);
    expect(agg.mentionedCount).toBe(0);
    expect(agg.topCompetitor).toBeNull();
    expect(agg.topCompetitorMentions).toBe(0);
  });
});

describe("normalizeWebsite", () => {
  it("strips scheme, www, path, port and case", () => {
    expect(normalizeWebsite("HTTPS://www.Fjellsport.NO/butikk?x=1#a")).toBe("fjellsport.no");
    expect(normalizeWebsite("http://example.com:8080/")).toBe("example.com");
    expect(normalizeWebsite("fiken.no")).toBe("fiken.no");
    expect(normalizeWebsite("")).toBe("");
  });
});
