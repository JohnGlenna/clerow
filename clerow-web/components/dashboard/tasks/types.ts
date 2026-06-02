import type { Channel } from "@/lib/types";

// One lesson/quest opened in the task modal. Shared by the path, the right rail
// (scan checkpoint), the Prompts page ("Fix"), and the modal itself.
export type SheetTask = {
  kind: "task" | "mcp" | "checkpoint";
  id: string | null;
  promptId?: string | null; // when the lesson is for a tracked prompt (Prompts → Fix)
  channel?: Channel; // onsite (MCP-doable) vs offsite (manual — Clerow drafts the copy)
  title: string;
  why: string;
  xp: number;
  minutes?: number; // effort estimate (for the Impact/Effort/Models grid)
  steps?: string[]; // ordered "what to do" actions (backtick spans → code chips)
  ladderKey?: string; // stable spec key — drives the file-download filename
};

// Known file-artifact tasks → the filename their generated content downloads as.
export const TASK_FILE: Record<string, string> = {
  "audit-robots-ai": "robots.txt",
  "audit-llms-txt": "llms.txt",
};
