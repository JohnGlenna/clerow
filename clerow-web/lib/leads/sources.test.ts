import { describe, expect, it } from "vitest";

import { directoryUrls, extractExternalLinks } from "./directory";
import { parseBetaListDetail, parseBetaListSlugs, recentYcBatches } from "./sources";

describe("recentYcBatches", () => {
  it("returns current and previous batch by quarter", () => {
    expect(recentYcBatches(new Date("2026-06-12T00:00:00Z"))).toEqual([
      "Spring 2026",
      "Winter 2026",
    ]);
    expect(recentYcBatches(new Date("2026-11-01T00:00:00Z"))).toEqual(["Fall 2026", "Summer 2026"]);
  });

  it("wraps to the previous year's Fall in Q1", () => {
    expect(recentYcBatches(new Date("2026-02-01T00:00:00Z"))).toEqual([
      "Winter 2026",
      "Fall 2025",
    ]);
  });
});

describe("parseBetaListSlugs", () => {
  it("extracts unique slugs in page order", () => {
    const html = `
      <a class="absolute inset-0" href="/startups/conty"></a>
      <a href="/startups/telyn"><img src="x.jpg" /></a>
      <a href="/startups/conty">Conty again</a>
    `;
    expect(parseBetaListSlugs(html)).toEqual(["conty", "telyn"]);
  });

  it("returns empty on markup without startup links", () => {
    expect(parseBetaListSlugs("<html><body>nothing here</body></html>")).toEqual([]);
  });
});

describe("parseBetaListDetail", () => {
  it("extracts name and tagline from title and meta description", () => {
    const html = `<title>Conty: Manage campaigns with creators | BetaList</title>
      <meta name="description" content="Manage campaigns with creators, contracts, and payments at scale">`;
    expect(parseBetaListDetail(html)).toEqual({
      name: "Conty",
      tagline: "Manage campaigns with creators, contracts, and payments at scale",
    });
  });

  it("rejects pages without a startup title", () => {
    expect(parseBetaListDetail("<title>BetaList</title>")).toBeNull();
    expect(parseBetaListDetail("no title at all")).toBeNull();
  });
});

describe("extractExternalLinks", () => {
  const html = `
    <a href="https://startuplab.no/about">own</a>
    <a href="https://www.acme-robotics.com/team">Acme</a>
    <a href="https://acme-robotics.com/">Acme dup</a>
    <a href="https://www.linkedin.com/company/acme">social</a>
    <a href="https://beta.example.io">Beta</a>
    <a href="notaurl">junk</a>
  `;

  it("keeps unique external origins, drops own host and social/tool hosts", () => {
    const links = extractExternalLinks(html, "https://startuplab.no/companies");
    expect(links).toContain("https://www.acme-robotics.com");
    expect(links).toContain("https://acme-robotics.com");
    expect(links).toContain("https://beta.example.io");
    expect(links.some((l) => l.includes("linkedin"))).toBe(false);
    expect(links.some((l) => l.includes("startuplab"))).toBe(false);
  });

  it("returns empty for an unparseable page url", () => {
    expect(extractExternalLinks(html, "not a url")).toEqual([]);
  });
});

describe("directoryUrls", () => {
  it("always includes the verified defaults", () => {
    const urls = directoryUrls();
    expect(urls).toContain("https://alliance.vc/portfolio");
    expect(urls.length).toBeGreaterThanOrEqual(5);
  });
});
