// Wraps already-generated task content in a plain-English instruction a non-coder
// can paste straight into their AI website builder (Lovable, Bolt, v0, AI Studio)
// or any chatbot (ChatGPT, Claude) so the agent *acts* on it instead of guessing.
//
// Deterministic — no network, no LLM. The content was already produced upstream
// (deterministicTaskContent / the streamed draft); this only frames it.

export function buildBuilderPrompt(opts: {
  content: string;
  fileName?: string | null; // robots.txt / llms.txt (from TASK_FILE) when this is a file artifact
  title: string;
}): string {
  const content = opts.content.trim();
  const fileName = opts.fileName?.trim();

  if (fileName) {
    return [
      `Add a file called \`${fileName}\` at the root of my website with exactly the content below.`,
      `If one already exists, replace it. Don't change anything else.`,
      ``,
      "```",
      content,
      "```",
    ].join("\n");
  }

  return [
    `Update my website with the change below (for: ${opts.title}).`,
    `Keep my existing design, styling and components.`,
    `If the content includes a \`<script type="application/ld+json">\` block, put it in the page's \`<head>\`.`,
    ``,
    content,
  ].join("\n");
}
