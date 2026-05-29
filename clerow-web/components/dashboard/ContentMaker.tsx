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
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't generate content");
      setContent(json.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate content");
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
