import { describe, expect, it } from "vitest";

import { parseEmailReply } from "./emailWriter";

const VALID_BODY =
  "Hei,\n\nJeg så på nettsiden deres.\n\nClerow (https://clerow.com/) kan hjelpe.\n\nJohn\n\nPS: 30 kr.";

describe("parseEmailReply", () => {
  it("accepts a valid reply and trims fields", () => {
    const raw = JSON.stringify({ subject: "  Apriil eier AI-svarene  ", body: VALID_BODY });
    expect(parseEmailReply(raw)).toEqual({
      subject: "Apriil eier AI-svarene",
      body: VALID_BODY,
    });
  });

  it("collapses runs of 3+ newlines to paragraph breaks", () => {
    const raw = JSON.stringify({
      subject: "Test",
      body: "Hei,\n\n\n\nSe https://clerow.com/ her.\n\nJohn",
    });
    expect(parseEmailReply(raw)?.body).toBe("Hei,\n\nSe https://clerow.com/ her.\n\nJohn");
  });

  it("rejects a body without the Clerow link", () => {
    const raw = JSON.stringify({ subject: "Test", body: "Hei,\n\nIngen lenke her.\n\nJohn" });
    expect(parseEmailReply(raw)).toBeNull();
  });

  it("rejects invalid JSON", () => {
    expect(parseEmailReply("not json")).toBeNull();
  });

  it("rejects empty or non-string fields", () => {
    expect(parseEmailReply(JSON.stringify({ subject: "", body: VALID_BODY }))).toBeNull();
    expect(parseEmailReply(JSON.stringify({ subject: "Test", body: "" }))).toBeNull();
    expect(parseEmailReply(JSON.stringify({ subject: 5, body: VALID_BODY }))).toBeNull();
    expect(parseEmailReply(JSON.stringify({ body: VALID_BODY }))).toBeNull();
  });
});
