import { describe, expect, it } from "vitest";

import { checkSsr, checkSchemaHonesty, type Fetched } from "./site";

const page = (text: string): Fetched => ({ ok: true, status: 200, text });

// Enough plain copy that the bare "<300 chars" shell signal does not fire.
const FILLER = "Real readable marketing copy about the product and its features. ".repeat(8);

describe("checkSsr", () => {
  it("is unknown when the homepage couldn't be fetched", () => {
    expect(checkSsr(null).status).toBe("unknown");
    expect(checkSsr({ ok: false, status: 500, text: "err" }).status).toBe("unknown");
  });

  it("passes a server-rendered page with an H1 and real copy", () => {
    const html = `<html><body><h1>Acme — invoicing for freelancers</h1><p>${FILLER}</p><script src="/app.js"></script></body></html>`;
    expect(checkSsr(page(html)).status).toBe("pass");
  });

  it("warns on a bare JS shell (almost no readable text)", () => {
    const html = `<html><body><div id="root"></div><script src="/bundle.js"></script></body></html>`;
    const c = checkSsr(page(html));
    expect(c.status).toBe("warn");
    expect(c.detail).toMatch(/readable text/);
  });

  it("warns on a splash/loader page whose boilerplate beats the bare-text threshold but has no H1", () => {
    // >300 chars of nav/footer boilerplate, no <h1> — the warbls.com case.
    const boiler = "Home Pricing Features Blog Contact Terms Privacy © 2026 Example Inc. All rights reserved. ".repeat(5);
    const html = `<html><body><nav>${boiler}</nav><div id="app"></div><script src="/spa.js"></script></body></html>`;
    const c = checkSsr(page(html));
    expect(c.status).toBe("warn");
    expect(c.detail).toMatch(/no <h1>/);
  });

  it("warns on explicit loader text", () => {
    // Enough copy (with an H1) to clear the bare-shell and no-H1 signals, but
    // under 600 chars and dominated by loader copy.
    const filler = "Welcome to Acme, the invoicing tool freelancers actually like using. ".repeat(5);
    const html = `<html><body><h1>Acme</h1><p>${filler}</p><div>Loading… please wait</div><script src="/x.js"></script></body></html>`;
    const c = checkSsr(page(html));
    expect(c.status).toBe("warn");
    expect(c.detail).toMatch(/loader text/);
  });

  it("does not flag a legitimately sparse page without scripts", () => {
    const html = `<html><body><h1>Hello</h1><p>Tiny static page.</p></body></html>`;
    expect(checkSsr(page(html)).status).toBe("pass");
  });
});

describe("checkSchemaHonesty", () => {
  const ldJson = (body: string) => `<script type="application/ld+json">${body}</script>`;
  const RATING = ldJson(`{"@type":"AggregateRating","ratingValue":"4.9","reviewCount":"284"}`);
  // Enough non-review visible copy to clear the thin-HTML (SSR) guard.
  const COPY = `<p>${"Plain marketing copy describing the product, its features and the team behind it. ".repeat(12)}</p>`;

  it("passes when there is no review/rating schema", () => {
    expect(checkSchemaHonesty(`<html><body><h1>Acme</h1>${COPY}</body></html>`).status).toBe("pass");
  });

  it("warns on rating schema with no visible review content", () => {
    const c = checkSchemaHonesty(`<html><body><h1>Acme</h1>${COPY}${RATING}</body></html>`);
    expect(c.status).toBe("warn");
    expect(c.detail).toContain("ratingValue 4.9");
  });

  it("escalates a near-perfect rating with no linked review platform", () => {
    const c = checkSchemaHonesty(`<html><body><h1>Acme</h1>${COPY}${RATING}</body></html>`);
    expect(c.detail).toMatch(/discount as fabricated/);
    // …but not when a review platform is linked.
    const linked = checkSchemaHonesty(`<html><body><h1>Acme</h1>${COPY}<a href="https://www.g2.com/products/acme">G2</a>${RATING}</body></html>`);
    expect(linked.status).toBe("warn");
    expect(linked.detail).not.toMatch(/discount as fabricated/);
  });

  it("passes when visible review content backs the schema", () => {
    const html = `<html><body><h1>Acme</h1>${COPY}<section>Rated 4.9 out of 5 — read our customer reviews.</section>${RATING}</body></html>`;
    expect(checkSchemaHonesty(html).status).toBe("pass");
  });

  it("is unknown (blocked by ssr) on thin JS-rendered HTML", () => {
    const c = checkSchemaHonesty(`<html><body><div id="root"></div>${RATING}<script src="/app.js"></script></body></html>`);
    expect(c.status).toBe("unknown");
    expect(c.blockedBy).toBe("ssr");
  });
});
