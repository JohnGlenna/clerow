// Progress events streamed from a scan so the client can show, in real time,
// what each AI model is doing. The orchestrator (run.ts) emits these via an
// optional `onEvent` callback; the scan routes pipe them into a streamed
// response body (one JSON object per line), read back by `useScanStream`.

import type { EngineId } from "../engines";
import type { RunResponse } from "../types";

// Per-engine lifecycle: queued → querying (asking the model) → detecting
// (parsing its answer for the ranking) → done | failed.
export type EngineStatus = "queued" | "querying" | "detecting" | "done" | "failed";

// The aggregated headline score a re-scan returns (mirrors BrandSnapshot["score"]).
export type ScanScore = { overall: number; visibility: number; position: number | null; sentiment: number | null };

export type ScanEvent =
  | { type: "phase"; phase: "reading" | "discovering" | "scanning" }
  | {
      type: "engine";
      engine: EngineId;
      label: string;
      status: EngineStatus;
      position?: number | null;
      visibility?: number;
      error?: string;
    }
  // The terminal payload — same shape the route used to return as JSON, so the
  // result UI is reused unchanged. Free scan → RunResponse; re-scan → {scanId,score}.
  | { type: "done"; result: RunResponse | { scanId: string; score: ScanScore } }
  | { type: "error"; message: string };

const encoder = new TextEncoder();

// Newline-delimited JSON framing — one event per line.
export function encodeEvent(e: ScanEvent): Uint8Array {
  return encoder.encode(JSON.stringify(e) + "\n");
}

// Headers for a streamed scan response.
export const STREAM_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

// Build a streamed body: `handler(emit)` runs to completion, then the stream
// closes. Any throw becomes a final `error` event, so the client is guaranteed a
// terminal frame even when the scan blows up mid-flight.
export function streamScan(
  handler: (emit: (e: ScanEvent) => void) => Promise<void>,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: ScanEvent) => controller.enqueue(encodeEvent(e));
      try {
        await handler(emit);
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : "Scan failed" });
      } finally {
        controller.close();
      }
    },
  });
}
