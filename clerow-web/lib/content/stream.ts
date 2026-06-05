// Streamed-response framing for "Make content" generation. Mirrors the scan
// stream (lib/scan/events.ts): newline-delimited JSON frames over a
// text/event-stream body, read back by the ContentMaker client. Reuses the scan
// stream's headers so both surfaces behave identically.

import { STREAM_HEADERS } from "../scan/events";

export { STREAM_HEADERS };

// `delta` carries the next chunk of generated markdown; `reset` tells the client
// to discard what it has and re-fill (a quality-gate revision is re-streaming);
// `score` reports the pre-publish quality grade; `done` closes a clean run;
// `error` is the terminal failure frame.
export type ContentEvent =
  | { type: "delta"; text: string }
  | { type: "reset" }
  | { type: "score"; score: number; verdict: string; issues: string[]; revised: boolean }
  | { type: "done" }
  | { type: "error"; message: string };

const encoder = new TextEncoder();

export function encodeContentEvent(e: ContentEvent): Uint8Array {
  return encoder.encode(JSON.stringify(e) + "\n");
}

// Build a streamed body: `handler(emit)` runs to completion, then the stream
// closes. Any throw becomes a final `error` event, so the client is guaranteed a
// terminal frame even when generation blows up mid-flight.
export function streamContentBody(
  handler: (emit: (e: ContentEvent) => void) => Promise<void>,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: ContentEvent) => controller.enqueue(encodeContentEvent(e));
      try {
        await handler(emit);
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : "Content generation failed" });
      } finally {
        controller.close();
      }
    },
  });
}
