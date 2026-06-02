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
};
