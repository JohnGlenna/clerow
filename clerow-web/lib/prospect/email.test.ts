import { describe, expect, it } from "vitest";

import { buildEmail, type EmailInput } from "./email";

// The Brreg registry name must never leak into the copy — emails name the domain.
const UGLY_ORG_NAME = "ANDRADE MANCISIDOR AUTOMATION AGENCY NORD-FLOW";

const base: EmailInput = {
  displayName: "nord-flow.no",
  language: "no",
  mentionedCount: 0,
  totalPrompts: 6,
  topCompetitor: "Bouvet",
  topCompetitorMentions: 4,
  competitors: [
    { name: "Bouvet", mentions: 4 },
    { name: "Knowit", mentions: 3 },
    { name: "Bekk", mentions: 2 },
  ],
  samplePrompt: "Hvilke dataprogrammeringstjenester i Oslo er best?",
};

describe("buildEmail naming", () => {
  const cases: Array<Partial<EmailInput>> = [
    { mentionedCount: 0, language: "no" },
    { mentionedCount: 0, language: "en" },
    { mentionedCount: 2, language: "no" },
    { mentionedCount: 2, language: "en" },
    // No clear leader → the displayName-bearing subject variant.
    { mentionedCount: 2, topCompetitor: null, topCompetitorMentions: 0 },
  ];

  it.each(cases)("uses the domain, never an org name (%j)", (overrides) => {
    const { subject, body } = buildEmail({ ...base, ...overrides });
    expect(`${subject}\n${body}`).not.toContain(UGLY_ORG_NAME);
    expect(body).toContain("nord-flow.no");
  });

  it("names the domain in the zero-mention subject", () => {
    expect(buildEmail(base).subject).toBe("ChatGPT vet ikke at nord-flow.no finnes ennå");
  });
});

describe("buildEmail clerow link", () => {
  it.each([
    { mentionedCount: 0, language: "no" as const },
    { mentionedCount: 0, language: "en" as const },
    { mentionedCount: 2, language: "no" as const },
    { mentionedCount: 2, language: "en" as const },
  ])("links the full URL so mail clients auto-link it (%j)", (overrides) => {
    const { body } = buildEmail({ ...base, ...overrides });
    expect(body).toContain("https://clerow.com/");
    expect(body).not.toContain("(clerow.com)");
  });
});

describe("buildEmail hook and CTA", () => {
  it("opens with the sorry hook grounded in the scan data (zero-mention, no)", () => {
    const { body } = buildEmail(base);
    const paragraphs = body.split("\n\n");
    expect(paragraphs[1]).toMatch(/^Beklager å måtte si det: jeg spurte ChatGPT/);
    expect(paragraphs[1]).toContain("«Hvilke dataprogrammeringstjenester i Oslo er best?»");
    expect(paragraphs[2]).toBe("Navnene ChatGPT anbefaler i stedet: Bouvet, Knowit og Bekk.");
  });

  it("opens with the sorry hook and real numbers (standard, en)", () => {
    const { body } = buildEmail({ ...base, language: "en", mentionedCount: 2 });
    const paragraphs = body.split("\n\n");
    expect(paragraphs[1]).toMatch(/^Sorry to be the one to tell you: I asked ChatGPT/);
    expect(paragraphs[1]).toContain("came up in only 2 of 6 answers");
    expect(paragraphs[2]).toBe("The names ChatGPT recommends instead: Bouvet, Knowit and Bekk.");
  });

  it.each([
    { language: "no" as const, cost: "potensielle kunder som aldri hører om dere" },
    { language: "en" as const, cost: "potential customers who never hear about you" },
  ])("follows the winners line with the what-it-costs-you line ($language)", ({ language, cost }) => {
    for (const mentionedCount of [0, 2]) {
      const { body } = buildEmail({ ...base, language, mentionedCount });
      expect(body.split("\n\n")[3]).toContain(cost);
    }
  });

  it("keeps the one-sentence-per-line shape and skips the winners line without competitors", () => {
    for (const language of ["no", "en"] as const) {
      // greeting, hook, winners, cost, CTA, signature
      expect(buildEmail({ ...base, language }).body.split("\n\n")).toHaveLength(6);
      expect(
        buildEmail({ ...base, language, competitors: [] }).body.split("\n\n"),
      ).toHaveLength(5);
    }
  });

  it("carries no I-built-Clerow self-introduction", () => {
    for (const language of ["no", "en"] as const) {
      for (const mentionedCount of [0, 2]) {
        const { body } = buildEmail({ ...base, language, mentionedCount });
        expect(body).not.toMatch(/bygde Clerow|built Clerow/i);
      }
    }
  });

  it("never says buyers/kjøpere and carries no discount PS", () => {
    for (const language of ["no", "en"] as const) {
      const { body } = buildEmail({ ...base, language });
      expect(body.toLowerCase()).not.toContain("buyer");
      expect(body.toLowerCase()).not.toContain("kjøper");
      expect(body).not.toContain("PS:");
      expect(body.split("\n\n").at(-1)).toBe("John");
    }
  });

  it.each([
    { language: "no" as const, cta: "Skann nettsiden deres på https://clerow.com/" },
    { language: "en" as const, cta: "Scan your site at https://clerow.com/" },
  ])("ends every variant with the scan-now CTA ($language)", ({ language, cta }) => {
    for (const mentionedCount of [0, 2]) {
      const { body } = buildEmail({ ...base, language, mentionedCount });
      expect(body).toContain(cta);
      // The URL lives in the CTA and appears exactly once.
      expect(body.match(/https:\/\/clerow\.com\//g)).toHaveLength(1);
    }
  });
});
