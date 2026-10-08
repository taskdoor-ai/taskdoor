/** Stable IDs preserve existing context exports; ChatGPT is displayed as Codex. */
export const aiTools = [
  { id: "ChatGPT", name: "Codex", tone: "gpt" },
  { id: "Claude Code", name: "Claude Code", tone: "claude" },
  { id: "WorkBuddy", name: "WorkBuddy", tone: "workbuddy" },
  { id: "Cursor", name: "Cursor", tone: "cursor" },
] as const;
export type AiTool = typeof aiTools[number]["id"];
export const aiToolIds: readonly AiTool[] = aiTools.map(tool => tool.id);
export const isAiTool = (value: unknown): value is AiTool => aiToolIds.includes(value as AiTool);
export const aiToolName = (id: AiTool) => aiTools.find(tool => tool.id === id)!.name;
