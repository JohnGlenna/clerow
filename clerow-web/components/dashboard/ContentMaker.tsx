"use client";

import React from "react";
import { GameIcon } from "../GameIcon";

// The "Make content" control: posts to an endpoint, shows the generated markdown
// inline with Copy + Regenerate. Shared by the prompt playbook (PromptDrawer) and
// the quest modal (PageQuests) so both behave identically.
export function ContentMaker({
  endpoint,
  body = {},
  className,
}: {
  endpoint: string;
  body?: Record<string, unknown>;
  className?: string;
}) {
  const [generating, setGenerating] = React.useState(false);
  const [content, setContent] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const makeContent = async () => {
    setGenerating(true);
    setError(null);
    setContent(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      // Cache hits, deterministic files, and guard errors (402/404/…) come back
      // as plain JSON; only the live LLM draft streams. Branch on content-type,
      // exactly like the scan stream (lib/useScanStream.ts).
      const isStream = (res.headers.get("content-type") ?? "").includes("text/event-stream");
      if (!isStream || !res.body) {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Couldn't generate content");
        setContent(json.content ?? "");
        return;
      }

      // Read newline-delimited {type:"delta"|"done"|"error"} frames, appending
      // each delta so the draft fills in token-by-token.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          let evt: { type: string; text?: string; message?: string };
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }
          if (evt.type === "delta" && evt.text) {
            acc += evt.text;
            setContent(acc);
          } else if (evt.type === "error") {
            throw new Error(evt.message ?? "Couldn't generate content");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate content");
      setContent(null);
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  return (
    <div className={className}>
      <button className="btn btn--primary btn--sm" onClick={makeContent} disabled={generating}>
        <GameIcon name="sparkles" size={13} />
        {generating ? "Writing…" : content ? "Regenerate" : "Make content"}
      </button>

      {error && <div className="drawer-step-error">{error}</div>}

      {content && (
        <div className="drawer-step-content">
          <div className="drawer-step-content-bar">
            <span className="drawer-step-content-label">
              <GameIcon name="sparkles" size={12} /> Generated — copy &amp; ship it
            </span>
            <button className="btn btn--quiet btn--sm" onClick={copy}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <pre>{content}</pre>
        </div>
      )}
    </div>
  );
}
