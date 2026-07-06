"use client";

import React from "react";

// Copy-to-clipboard chip for the homepage MCP mini-guide — the marketing twin of
// the dashboard's CnxCopy (components/dashboard/connect/ConnectPage.tsx). Client
// island so the rest of the welcome page stays server-rendered; the chip's text
// itself still ships in the SSR HTML, so crawlers read it.
export function CopyChip({ value, label }: { value: string; label?: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <span className="mcp-chip">
      <code>{label ?? value}</code>
      <button
        type="button"
        className={`mcp-chip-copy ${ok ? "on" : ""}`}
        aria-label="Copy to clipboard"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setOk(true);
          window.setTimeout(() => setOk(false), 1600);
        }}
      >
        {ok ? "Copied ✓" : "Copy"}
      </button>
    </span>
  );
}
