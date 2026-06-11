import { describe, expect, it } from "vitest";

import type { BrandSnapshot } from "./snapshot";
import type { EngineId } from "../engines";
import { computeEngineDeltas, buildDeltaNarrative } from "./delta";

type Standing = { id: EngineId; visibility: number; position?: number | null };
type Prev = Partial<Record<EngineId, { visibility: number; position: number | null }>>;

const LABELS: Record<string, string> = { chatgpt: "ChatGPT", claude: "Claude", perplexity: "Perplexity", gemini: "Gemini", grok: "Grok" };

function snap(current: Standing[], prev: Prev | null, scores?: { from: number; to: number }): BrandSnapshot {
  return {
    hasResult: true,
    scannedAt: "2026-06-11T00:00:00Z",
    engines: current.map((s) => ({
      id: s.id,
      label: LABELS[s.id],
      swatch: "",
      letter: "",
      locked: false,
      scanned: true,
      visibility: s.visibility,
      position: s.position ?? null,
      sentiment: null,
    })),
    enginesScanned: current.map((s) => s.id),
    score: { overall: scores?.to ?? 0, visibility: 0, position: null, sentiment: null },
    competitors: [],
    citedDomains: [],
    citedDomainEngines: {},
    primaryPromptId: null,
    primaryPromptText: null,
    synthesis: null,
    previous: prev
      ? {
          engines: prev,
          score: { overall: scores?.from ?? 0, visibility: 0, position: null },
          citedDomainEngines: {},
          engineByResult: {},
          scannedAt: "2026-06-01T00:00:00Z",
        }
      : null,
  };
}

describe("computeEngineDeltas", () => {
  it("returns nothing without a previous scan", () => {
    expect(computeEngineDeltas(snap([{ id: "gemini", visibility: 55 }], null))).toEqual([]);
  });

  it("classifies started/stopped citing and swings", () => {
    const s = snap(
      [
        { id: "gemini", visibility: 55, position: 1 },
        { id: "chatgpt", visibility: 0 },
        { id: "claude", visibility: 25 },
        { id: "perplexity", visibility: 12, position: 4 },
      ],
      {
        gemini: { visibility: 0, position: null },
        chatgpt: { visibility: 12, position: 3 },
        claude: { visibility: 10, position: 2 },
        perplexity: { visibility: 11, position: 4 },
      },
    );
    const byEngine = Object.fromEntries(computeEngineDeltas(s).map((d) => [d.engine, d.kind]));
    expect(byEngine).toEqual({
      gemini: "started-citing",
      chatgpt: "stopped-citing",
      claude: "swing-up",
      perplexity: "unchanged",
    });
  });

  it("treats an engine with NO previous row as first-result, never started-citing", () => {
    const s = snap([{ id: "grok", visibility: 40 }], { chatgpt: { visibility: 5, position: null } });
    const grok = computeEngineDeltas(s).find((d) => d.engine === "grok");
    expect(grok?.kind).toBe("first-result");
    expect(grok?.visibility.from).toBeNull();
  });

  it("classifies a pure position change as rank-move", () => {
    const s = snap([{ id: "claude", visibility: 20, position: 2 }], { claude: { visibility: 22, position: 4 } });
    expect(computeEngineDeltas(s)[0].kind).toBe("rank-move");
  });
});

describe("buildDeltaNarrative", () => {
  it("is null without a previous scan", () => {
    expect(buildDeltaNarrative(snap([{ id: "gemini", visibility: 55 }], null)).headline).toBeNull();
  });

  it("leads with the highest-priority move and appends the overall line", () => {
    const s = snap(
      [
        { id: "gemini", visibility: 55, position: 1 },
        { id: "claude", visibility: 25 },
      ],
      { gemini: { visibility: 0, position: null }, claude: { visibility: 10, position: null } },
      { from: 11, to: 39 },
    );
    const { headline, lines } = buildDeltaNarrative(s);
    expect(headline).toBe("Gemini started citing you (0% → 55%, position 1). Overall 11 → 39 (+28).");
    expect(lines).toHaveLength(2); // gemini + claude's swing-up
  });

  it("caps lines at the 3 most notable moves", () => {
    const s = snap(
      [
        { id: "gemini", visibility: 55 },
        { id: "chatgpt", visibility: 0 },
        { id: "claude", visibility: 40 },
        { id: "perplexity", visibility: 30 },
      ],
      {
        gemini: { visibility: 0, position: null },
        chatgpt: { visibility: 20, position: null },
        claude: { visibility: 10, position: null },
        perplexity: { visibility: 5, position: null },
      },
    );
    expect(buildDeltaNarrative(s).lines).toHaveLength(3);
  });

  it("says so when nothing moved", () => {
    const s = snap([{ id: "claude", visibility: 20, position: 2 }], { claude: { visibility: 21, position: 2 } }, { from: 30, to: 30 });
    expect(buildDeltaNarrative(s).headline).toBe("No movement since the previous scan.");
  });
});
