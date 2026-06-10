import { describe, expect, it } from "vitest";

import { buildAliasSet, normBrand, textMentionsBrand } from "./alias";
import { parseExtraction } from "./parse";

describe("buildAliasSet", () => {
  it("includes brand, suffix-stripped and collapsed variants plus host forms", () => {
    const aliases = buildAliasSet("Fjell Sport AS", "https://www.fjellsport.no/butikk");
    expect(aliases).toContain("fjell sport as");
    expect(aliases).toContain("fjell sport");
    expect(aliases).toContain("fjellsport");
    expect(aliases).toContain("fjellsport.no");
  });

  it("handles missing website and short labels", () => {
    const aliases = buildAliasSet("Acme Inc", "");
    expect(aliases).toContain("acme inc");
    expect(aliases).toContain("acme");
    expect(aliases.every((a) => a.length >= 3)).toBe(true);
  });
});

describe("textMentionsBrand", () => {
  const aliases = buildAliasSet("Sport AS", "https://sport.no");

  it("matches case-insensitively", () => {
    expect(textMentionsBrand("I recommend SPORT for this.", aliases)).toBe(true);
  });

  it("does not match inside longer words", () => {
    expect(textMentionsBrand("Sportamore is the best option.", aliases)).toBe(false);
  });

  it("keeps Norwegian letters intact", () => {
    const a = buildAliasSet("Sjøbua Båt", "https://sjøbua.no");
    expect(textMentionsBrand("Anbefaler Sjøbua Båt på det varmeste.", a)).toBe(true);
    expect(textMentionsBrand("Sjøbuane langs kysten er fine.", a)).toBe(false);
  });

  it("matches the bare domain", () => {
    expect(textMentionsBrand("Check out sport.no for gear.", aliases)).toBe(true);
  });
});

describe("normBrand", () => {
  it("strips legal suffixes and punctuation", () => {
    expect(normBrand("Tripletex AS")).toBe("tripletex");
    expect(normBrand("Visma.net")).toBe(normBrand("Visma net"));
  });
});

describe("parseExtraction", () => {
  it("maps 1-based model indices onto 0-based rows", () => {
    const rows = parseExtraction(
      { answers: [{ index: 2, prospect_mentioned: true, competitors: ["Acme", "Beta"] }] },
      3,
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ index: 0, mentioned: false, competitors: [] });
    expect(rows[1]).toEqual({ index: 1, mentioned: true, competitors: ["Acme", "Beta"] });
    expect(rows[2].mentioned).toBe(false);
  });

  it("defaults missing answers and ignores out-of-range or malformed entries", () => {
    const rows = parseExtraction(
      {
        answers: [
          { index: 0, prospect_mentioned: true, competitors: [] }, // out of range (1-based)
          { index: 99, prospect_mentioned: true, competitors: [] },
          "garbage",
          { index: 1, prospect_mentioned: "yes", competitors: [42, " Acme ", ""] },
        ],
      },
      2,
    );
    expect(rows[0]).toEqual({ index: 0, mentioned: false, competitors: ["Acme"] });
    expect(rows[1]).toEqual({ index: 1, mentioned: false, competitors: [] });
  });

  it("handles totally invalid payloads", () => {
    expect(parseExtraction(null, 2)).toHaveLength(2);
    expect(parseExtraction("nope", 2).every((r) => !r.mentioned)).toBe(true);
  });
});
