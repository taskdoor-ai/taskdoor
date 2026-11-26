import type { AgentIconId } from "@/features/ai-connection/agent-icons";
import type { TaskMessageVia } from "@/shared/model/task-model";

export type MessageVia = TaskMessageVia;

/**
 * Kept in step with nocoly/taskdoor: match the client's reported tool name.
 * Clients report loosely ("Kimi", "kimi-cli", "KimiCLI", "codex-mcp-client"), so names are
 * split into lowercase words and also joined without separators before matching.
 * A plain key matches anywhere in the joined name. "=key" must equal a whole word or the whole
 * joined name ("xAI" hits "=xai"); it guards short or common words ("amp", "pi", "bob") that
 * would otherwise hit unrelated names.
 * First match wins: a product variant precedes its brand fallback (Kimi CLI before Kimi),
 * and Cursor (reports "cursor-vscode") and Copilot precede VS Code.
 */
const knownAgents: Array<[AgentIconId, ...string[]]> = [
  ["Claude Code", "claude", "anthropic"],
  ["Codex", "codex"],
  ["ChatGPT", "chatgpt", "openai"],
  ["Cursor", "cursor"],
  ["WorkBuddy", "workbuddy"],
  ["GitHub Copilot", "copilot"],
  ["Antigravity", "antigravity"],
  ["Gemini CLI", "gemini"],
  ["Agoragentic", "agoragentic"],
  ["Amp", "=amp", "ampcode", "sourcegraph"],
  ["Auggie", "auggie", "augment"],
  ["Autohand", "autohand"],
  ["Bob", "=bob", "ibmbob"],
  ["Cline", "=cline"],
  ["Cortex Code", "cortex", "snowflake"],
  ["Corust Agent", "corust"],
  ["Crow CLI", "=crow", "crowcli"],
  ["Deep Agents", "deepagent"],
  ["Devin Local", "devinlocal", "localdevin"],
  ["Devin", "devin", "cognition"],
  ["DimCode", "dimcode"],
  ["Dirac", "dirac"],
  ["Factory Droid", "factorydroid", "factoryai", "=factory", "=droid"],
  ["fast-agent", "fastagent"],
  ["GLM Agent", "glm", "zhipu", "=zai", "=z.ai"],
  ["Goose", "goose"],
  ["Grok Build", "grok", "=xai"],
  ["Harn", "=harn"],
  ["Junie", "junie"],
  ["Kilo", "kilocode", "=kilo"],
  ["Kimchi", "kimchi"],
  ["Kimi CLI", "kimicli"],
  ["Kimi Code", "kimi", "moonshot"],
  ["Kiro", "kiro"],
  ["MiniMax Code", "minimax"],
  ["Minion Code", "minion"],
  ["Mistral Vibe", "mistral", "=vibe"],
  ["Muse Code", "musecode", "=muse"],
  ["Nova", "=nova"],
  ["OpenCode", "opencode"],
  ["Pi", "=pi", "piacp"],
  ["Poolside", "poolside"],
  ["Qoder", "qoder"],
  ["Qwen Code", "qwen", "tongyi"],
  ["Sigit Code", "sigit"],
  ["Stakpak", "stakpak"],
  ["VT Code", "vtcode"],
  ["VS Code", "vscode", "visualstudiocode"],
];

const wordsOf = (name: string) => name
  .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  .toLowerCase()
  .split(/[^a-z0-9.]+/)
  .flatMap(word => [word, word.replace(/\./g, "")])
  .filter(Boolean);

export function knownAgentOf(name: string): AgentIconId | null {
  const joined = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const words = new Set([...wordsOf(name), joined]);
  const hit = knownAgents.find(([, ...keys]) => keys.some(key =>
    key.startsWith("=") ? words.has(key.slice(1)) : joined.includes(key)));
  return hit?.[0] ?? null;
}
