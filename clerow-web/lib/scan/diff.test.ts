import { describe, expect, it } from "vitest";

import { diffScans, describeChange, type ScanFacts } from "./diff";

const facts = (over: Partial<ScanFacts>): ScanFacts => ({ citedDomainEngines: {}, competitors: [], ...over });

describe("diffScans", () => {
  it("reports sources entering and leaving the cited set", () => {
    const out = diffScans(
      facts({ citedDomainEngines: { "old.com": 2 } }),
      facts({ citedDomainEngines: { "soundguys.com": 4, "g2.com": 1 } }),
    );
    expect(out).toEqual([
      { kind: "source-entered", domain: "soundguys.com", engines: 4, relatedTaskKey: "l3-source-soundguys-com" },
      { kind: "source-entered", domain: "g2.com", engines: 1, relatedTaskKey: "l3-source-g2-com" },
      { kind: "source-left", domain: "old.com" },
    ]);
  });

  it("reports competitors entering, leaving, and rank moves ≥ 2", () => {
    const out = diffScans(
      facts({
        competitors: [
          { name: "Suno", rank: 1, isYou: false },
          { name: "Udio", rank: 2, isYou: false },
          { name: "Mubert", rank: 3, isYou: false },
        ],
      }),
      facts({
        competitors: [
          { name: "Suno", rank: 4, isYou: false }, // moved 3
          { name: "Udio", rank: 1, isYou: false }, // moved 1 — below threshold
          { name: "Beatoven", rank: 2, isYou: false }, // new
        ],
      }),
    );
    expect(out).toContainEqual({ kind: "competitor-rank-moved", name: "Suno", from: 1, to: 4 });
    expect(out).toContainEqual({ kind: "competitor-entered", name: "Beatoven", rank: 2 });
    expect(out).toContainEqual({ kind: "competitor-left", name: "Mubert" });
    expect(out.find((c) => c.kind === "competitor-rank-moved" && c.name === "Udio")).toBeUndefined();
  });

  it("matches competitors by normalized name so drift can't fake an enter+leave pair", () => {
    const out = diffScans(
      facts({ competitors: [{ name: "Beatoven AI!", rank: 2, isYou: false }] }),
      facts({ competitors: [{ name: "beatoven ai", rank: 2, isYou: false }] }),
    );
    expect(out).toEqual([]);
  });

  it("never reports the brand's own row (that's delta.ts territory)", () => {
    const out = diffScans(
      facts({ competitors: [{ name: "Warbls", rank: 5, isYou: true }] }),
      facts({ competitors: [{ name: "Warbls", rank: 1, isYou: true }] }),
    );
    expect(out).toEqual([]);
  });

  it("caps the change list at 8", () => {
    const many = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`site${i}.com`, 1]));
    expect(diffScans(facts({}), facts({ citedDomainEngines: many }))).toHaveLength(8);
  });
});

describe("describeChange", () => {
  it("names the related task for an entered source", () => {
    const s = describeChange({ kind: "source-entered", domain: "g2.com", engines: 3, relatedTaskKey: "l3-source-g2-com" });
    expect(s).toContain("g2.com");
    expect(s).toContain("l3-source-g2-com");
  });
});
