import type { agentIconUrls } from "@/features/ai-connection/agent-icons";
import type { TaskMessageVia } from "@/shared/model/task-model";

export type MessageVia = TaskMessageVia;

// Kept in step with nocoly/taskdoor: match the client's reported tool name.
const knownAgents: Array<[RegExp, keyof typeof agentIconUrls]> = [
  [/claude/i, "Claude Code"],
  [/codex|chatgpt|openai/i, "ChatGPT"],
  [/cursor/i, "Cursor"],
  [/workbuddy/i, "WorkBuddy"],
];

export function knownAgentOf(name: string): keyof typeof agentIconUrls | null {
  return knownAgents.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}
