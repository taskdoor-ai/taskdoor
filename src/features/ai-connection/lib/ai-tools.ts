/** Stable IDs preserve existing context exports and saved preferences; names match the production app (ChatGPT, Claude). */
export const aiTools = [
  { id: "ChatGPT", name: "ChatGPT", tone: "gpt" },
  { id: "Claude Code", name: "Claude", tone: "claude" },
  { id: "WorkBuddy", name: "WorkBuddy", tone: "workbuddy" },
  { id: "Cursor", name: "Cursor", tone: "cursor" },
] as const;
export type AiTool = typeof aiTools[number]["id"];
export const aiToolIds: readonly AiTool[] = aiTools.map(tool => tool.id);
export const isAiTool = (value: unknown): value is AiTool => aiToolIds.includes(value as AiTool);
export const aiToolName = (id: AiTool) => aiTools.find(tool => tool.id === id)!.name;

/** The link that opens a client with a prompt already in its input; none of them sends it. */
export function aiToolPromptLink(id: AiTool, prompt: string) {
  const p = encodeURIComponent(prompt);
  switch (id) {
    case "ChatGPT": return `codex://new?prompt=${p}`;
    case "Claude Code": return `claude://claude.ai/new?q=${p}`;
    case "WorkBuddy": return `workbuddy://task?action=start&prompt=${p}`;
    case "Cursor": return `cursor://anysphere.cursor-deeplink/prompt?text=${p}`;
  }
}
