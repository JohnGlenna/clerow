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
  it("opens with the I-checked story grounded in the scan data (zero-mention, no)", () => {
    const { body } = buildEmail(base);
    const paragraphs = body.split("\n\n");
    expect(paragraphs[1]).toMatch(/^Jeg sjekket hvordan AI svarer kjøpere i markedet deres og spurte ChatGPT/);
    expect(paragraphs[1]).toContain("«Hvilke dataprogrammeringstjenester i Oslo er best?»");
    expect(paragraphs[1]).toContain("Bouvet, Knowit, Bekk");
  });

  it("opens with the I-checked story and real numbers (standard, en)", () => {
    const { body } = buildEmail({ ...base, language: "en", mentionedCount: 2 });
    const paragraphs = body.split("\n\n");
    expect(paragraphs[1]).toMatch(/^I was checking how AI answers buyers in your market and asked ChatGPT/);
    expect(paragraphs[1]).toContain("came up in only 2 of 6 answers");
    expect(paragraphs[1]).toContain("Bouvet was recommended in 4 of them.");
  });

  it.each([
    { language: "no" as const, cost: "de hører aldri om dere" },
    { language: "en" as const, cost: "those buyers never hear about you" },
  ])("closes the problem paragraph with the what-it-costs-you clause ($language)", ({ language, cost }) => {
    for (const mentionedCount of [0, 2]) {
      const { body } = buildEmail({ ...base, language, mentionedCount });
      expect(body.split("\n\n")[1]).toContain(cost);
    }
  });

  it("carries no discount PS in the first touch", () => {
    for (const language of ["no", "en"] as const) {
      const { body } = buildEmail({ ...base, language });
      expect(body).not.toContain("PS:");
      expect(body.split("\n\n").at(-1)).toBe("John");
    }
  });

  it.each([
    { language: "no" as const, cta: "Skann nettsiden deres nå på https://clerow.com/" },
    { language: "en" as const, cta: "Scan your website now at https://clerow.com/" },
  ])("ends every variant with the scan-now CTA ($language)", ({ language, cta }) => {
    for (const mentionedCount of [0, 2]) {
      const { body } = buildEmail({ ...base, language, mentionedCount });
      expect(body).toContain(cta);
      // The URL lives in the CTA and appears exactly once.
      expect(body.match(/https:\/\/clerow\.com\//g)).toHaveLength(1);
    }
  });
});

describe("buildEmail site tip", () => {
  const tip = {
    observation: "dere bygger skreddersydd programvare for små bedrifter",
    tip: "En FAQ-side som svarer på vanlige kjøperspørsmål ville hjulpet AI-synligheten.",
  };

  it("inserts the grounded paragraph right after the problem paragraph (no)", () => {
    const { body } = buildEmail({ ...base, siteTip: tip });
    expect(body).toContain(
      "Jeg tok en titt på nord-flow.no – dere bygger skreddersydd programvare for små bedrifter. " +
        "En FAQ-side som svarer på vanlige kjøperspørsmål ville hjulpet AI-synligheten.",
    );
    const paragraphs = body.split("\n\n");
    expect(paragraphs[2]).toMatch(/^Jeg tok en titt på nord-flow\.no/);
  });

  it("inserts the grounded paragraph in English", () => {
    const { body } = buildEmail({
      ...base,
      language: "en",
      mentionedCount: 2,
      siteTip: { observation: "you build custom software for small teams", tip: "Add an FAQ answering buyer questions." },
    });
    expect(body).toContain("I took a look at nord-flow.no — you build custom software for small teams.");
  });

  it("normalizes stray terminal punctuation from the LLM", () => {
    const { body } = buildEmail({
      ...base,
      siteTip: { observation: "dere bygger programvare.. ", tip: "Legg til en FAQ-side" },
    });
    expect(body).toContain("dere bygger programvare. Legg til en FAQ-side.");
  });

  it("falls back to the exact baseline copy without a tip", () => {
    expect(buildEmail({ ...base, siteTip: null })).toEqual(buildEmail(base));
    expect(buildEmail(base).body).not.toContain("tok en titt");
  });
});
