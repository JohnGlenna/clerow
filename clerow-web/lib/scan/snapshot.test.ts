import { describe, expect, it } from "vitest";

import { aggregateCompetitors, type CompetitorRow } from "./snapshot";

const row = (over: Partial<CompetitorRow>): CompetitorRow => ({
  scan_result_id: "r1",
  name: "Acme",
  domain: null,
  is_you: false,
  visibility: 10,
  position: null,
  sentiment: "neut",
  ...over,
});

const engines = new Map([
  ["r1", "chatgpt"],
  ["r2", "claude"],
]);

describe("aggregateCompetitors", () => {
  it("merges name variants that share a resolved domain", () => {
    const out = aggregateCompetitors(
      [
        row({ scan_result_id: "r1", name: "Suno AI", domain: "suno.com", visibility: 40 }),
        row({ scan_result_id: "r2", name: "Suno", domain: "www.Suno.com", visibility: 60 }),
      ],
      engines,
      2,
    );
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Suno"); // shortest variant wins for display
    expect(out[0].visibility).toBe(50); // (40 + 60) / 2 scanned models
    expect(out[0].enginesCount).toBe(2);
  });

  it("folds a domain-less row into the domain group whose name matches", () => {
    const out = aggregateCompetitors(
      [
        row({ scan_result_id: "r2", name: "Suno", domain: null, visibility: 30 }),
        row({ scan_result_id: "r1", name: "Suno", domain: "suno.com", visibility: 50 }),
      ],
      engines,
      2,
    );
    expect(out).toHaveLength(1);
    expect(out[0].domain).toBe("suno.com");
    expect(out[0].visibility).toBe(40);
  });

  it("keeps distinct brands separate and preserves isYou", () => {
    const out = aggregateCompetitors(
      [
        row({ scan_result_id: "r1", name: "Suno", domain: "suno.com", visibility: 50 }),
        row({ scan_result_id: "r1", name: "Udio", domain: "udio.com", visibility: 30 }),
        row({ scan_result_id: "r1", name: "Warbls", domain: "warbls.com", is_you: true, visibility: 0 }),
      ],
      engines,
      1,
    );
    expect(out).toHaveLength(3);
    expect(out.find((c) => c.isYou)?.name).toBe("Warbls");
    // The 0%-visibility own row doesn't count as "named by an AI".
    expect(out.find((c) => c.isYou)?.enginesCount).toBe(0);
  });

  it("merges domain-less name variants of the same product across engines", () => {
    const out = aggregateCompetitors(
      [
        row({ scan_result_id: "r1", name: "Scrunch AI", visibility: 40 }),
        row({ scan_result_id: "r2", name: "Scrunch", visibility: 20 }),
        row({ scan_result_id: "r1", name: "SEMrush GEO (AI Toolkit)", visibility: 30 }),
        row({ scan_result_id: "r2", name: "Semrush", visibility: 50 }),
        row({ scan_result_id: "r1", name: "SE Ranking / SE Visible", visibility: 10 }),
        row({ scan_result_id: "r2", name: "SE Ranking (AI Overviews Tracker)", visibility: 10 }),
      ],
      engines,
      2,
    );
    expect(out).toHaveLength(3);
    expect(out.find((c) => c.name === "Scrunch")?.visibility).toBe(30); // (40+20)/2
    expect(out.find((c) => c.name === "Semrush")?.enginesCount).toBe(2);
  });

  it("does not over-merge distinct products sharing a word", () => {
    const out = aggregateCompetitors(
      [
        row({ scan_result_id: "r1", name: "Ahrefs Brand Radar", visibility: 30 }),
        row({ scan_result_id: "r2", name: "Ahrefs", visibility: 30 }),
        row({ scan_result_id: "r1", name: "AthenaHQ", visibility: 10 }),
      ],
      engines,
      2,
    );
    // A named sub-product stays its own row; single-word names never get trimmed.
    expect(out.map((c) => c.name).sort()).toEqual(["Ahrefs", "Ahrefs Brand Radar", "AthenaHQ"]);
  });

  it("ranks by blended visibility with engine-count tie-break", () => {
    const out = aggregateCompetitors(
      [
        row({ scan_result_id: "r1", name: "A", domain: "a.com", visibility: 50 }),
        row({ scan_result_id: "r1", name: "B", domain: "b.com", visibility: 30 }),
        row({ scan_result_id: "r2", name: "B", domain: "b.com", visibility: 70 }),
      ],
      engines,
      2,
    );
    // Blended over 2 scanned models: B = (30+70)/2 = 50, A = 50/2 = 25.
    expect(out.map((c) => c.name)).toEqual(["B", "A"]);
    expect(out[0].rank).toBe(1);
  });
});
