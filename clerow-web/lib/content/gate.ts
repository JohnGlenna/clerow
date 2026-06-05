// Quality-gated content streaming — the orchestrator that wraps generation with
// the pre-publish quality gate. Streams the first draft, scores it against the
// CORE-EEAT rubric (lib/content/quality.ts), and runs at most ONE targeted
// revision when the draft falls below the bar, re-streaming the improved version.
// Always ends by emitting a `score` event so the UI can show "nothing ships
// blind". COGS is bounded: 1 judge call + (≤1 revision + its 1 judge call).

import { streamFixContent, type FixContentInput } from "./generate";
import { scoreContent, needsRevision, revisionNote } from "./quality";
import type { ContentEvent } from "./stream";

// Generate content for one fix behind the quality gate, emitting delta/reset/score
// events. Returns the final (possibly revised) draft to cache, or null if nothing
// was generated (an `error` event has already been emitted in that case).
export async function streamGatedContent(
  input: FixContentInput,
  emit: (e: ContentEvent) => void,
): Promise<string | null> {
  // 1) First draft, streamed live.
  let draft = "";
  for await (const chunk of streamFixContent(input)) {
    draft += chunk;
    emit({ type: "delta", text: chunk });
  }
  draft = draft.trim();
  if (!draft) {
    emit({ type: "error", message: "No content was generated. Try again." });
    return null;
  }

  // 2) Grade it against the same spec the writer followed.
  const score = await scoreContent(draft);

  // 3) One targeted revision when it's below the bar — re-stream over a reset.
  if (needsRevision(score)) {
    emit({ type: "reset" });
    let revised = "";
    for await (const chunk of streamFixContent({ ...input, revisionNote: revisionNote(score) })) {
      revised += chunk;
      emit({ type: "delta", text: chunk });
    }
    revised = revised.trim();
    if (revised) {
      const rescore = await scoreContent(revised);
      emit({ type: "score", score: rescore.score, verdict: rescore.verdict, issues: rescore.issues, revised: true });
      return revised;
    }
    // Revision produced nothing — restore the first draft for the client.
    emit({ type: "delta", text: draft });
  }

  emit({ type: "score", score: score.score, verdict: score.verdict, issues: score.issues, revised: false });
  return draft;
}

// Non-streaming gated generation for the background pre-warm: generate, score,
// and run at most one revision when below the bar, returning the better draft to
// cache. No UI, so no events — but it keeps pre-warmed (cached) content held to
// the same quality bar as live generation, so nothing ships blind either way.
export async function generateGatedContent(input: FixContentInput): Promise<{ content: string }> {
  let draft = "";
  for await (const chunk of streamFixContent(input)) draft += chunk;
  draft = draft.trim();
  if (!draft) throw new Error("No content was generated. Try again.");

  const score = await scoreContent(draft);
  if (needsRevision(score)) {
    let revised = "";
    for await (const chunk of streamFixContent({ ...input, revisionNote: revisionNote(score) })) revised += chunk;
    revised = revised.trim();
    if (revised) return { content: revised };
  }
  return { content: draft };
}
