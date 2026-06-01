"use client";

// Client hook that drives a streamed scan. POSTs to a scan route, reads the
// newline-delimited ScanEvent stream back, and exposes live per-model progress
// so the UI can show each AI model querying in real time. EventSource can't POST
// or carry a body, so we read the response stream manually.

import React from "react";
import type { EngineId } from "./engines";
import type { ScanEvent, EngineStatus, ScanScore } from "./scan/events";
import type { RunResponse } from "./types";

export type EngineProgress = {
  engine: EngineId;
  label: string;
  status: EngineStatus;
  position?: number | null;
  visibility?: number;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
};

export type ScanResult = RunResponse | { scanId: string; score: ScanScore };

type Status = "idle" | "running" | "done" | "error";

export type ScanStreamState = {
  status: Status;
  engines: EngineProgress[];
  result: ScanResult | null;
  error: string | null;
  elapsedMs: number;
};

// What `run()` resolves to, so callers can branch on the HTTP status of a
// pre-stream guard (e.g. 402 "out of scans", 429 "already running").
export type RunOutcome =
  | { ok: true; result: ScanResult | null }
  | { ok: false; status: number; error: string; budget?: unknown };

const IDLE: ScanStreamState = { status: "idle", engines: [], result: null, error: null, elapsedMs: 0 };

export function useScanStream() {
  const [state, setState] = React.useState<ScanStreamState>(IDLE);
  const startedAtRef = React.useRef<number>(0);

  // Tick an elapsed-time counter while a scan is running, so the wait is legible.
  React.useEffect(() => {
    if (state.status !== "running") return;
    const id = setInterval(() => {
      setState((s) => (s.status === "running" ? { ...s, elapsedMs: Date.now() - startedAtRef.current } : s));
    }, 200);
    return () => clearInterval(id);
  }, [state.status]);

  const reset = React.useCallback(() => setState(IDLE), []);

  const apply = React.useCallback((e: ScanEvent) => {
    setState((s) => {
      switch (e.type) {
        case "engine": {
          const now = Date.now();
          const engines = [...s.engines];
          const i = engines.findIndex((x) => x.engine === e.engine);
          const prev = i >= 0 ? engines[i] : undefined;
          const next: EngineProgress = {
            engine: e.engine,
            label: e.label,
            status: e.status,
            position: e.position ?? prev?.position,
            visibility: e.visibility ?? prev?.visibility,
            error: e.error ?? prev?.error,
            startedAt: prev?.startedAt ?? (e.status === "querying" ? now : prev?.startedAt),
            finishedAt: e.status === "done" || e.status === "failed" ? now : prev?.finishedAt,
          };
          if (i >= 0) engines[i] = next;
          else engines.push(next);
          return { ...s, engines };
        }
        case "done":
          return { ...s, status: "done", result: e.result };
        case "error":
          return { ...s, status: "error", error: e.message };
        case "phase":
        default:
          return s;
      }
    });
  }, []);

  const run = React.useCallback(
    async (url: string, init?: RequestInit): Promise<RunOutcome> => {
      startedAtRef.current = Date.now();
      setState({ ...IDLE, status: "running" });

      let res: Response;
      try {
        res = await fetch(url, { method: "POST", ...init });
      } catch {
        const error = "Couldn't reach the scanner. Check your connection and try again.";
        setState((s) => ({ ...s, status: "error", error }));
        return { ok: false, status: 0, error };
      }

      // Pre-stream guard errors come back as JSON (401/402/429/…), not a stream.
      const isStream = (res.headers.get("content-type") ?? "").includes("text/event-stream");
      if (!res.ok || !isStream || !res.body) {
        const j = await res.json().catch(() => ({}) as Record<string, unknown>);
        const error = (typeof j.error === "string" && j.error) || "Scan failed";
        setState((s) => ({ ...s, status: "error", error }));
        return { ok: false, status: res.status, error, budget: (j as { budget?: unknown }).budget };
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: ScanResult | null = null;
      let streamError: string | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          let evt: ScanEvent;
          try {
            evt = JSON.parse(line) as ScanEvent;
          } catch {
            continue; // ignore a partial/garbled frame
          }
          if (evt.type === "done") finalResult = evt.result;
          if (evt.type === "error") streamError = evt.message;
          apply(evt);
        }
      }

      if (streamError) return { ok: false, status: 200, error: streamError };
      return { ok: true, result: finalResult };
    },
    [apply],
  );

  return { ...state, run, reset };
}
