import chatGptIcon from "@/assets/agents/openai.svg";
import claudeCodeIcon from "@/assets/agents/claude-color.svg";
// Official WorkBuddy favicon: https://www.workbuddy.cn/ (assets/logo.svg, retrieved 2026-09-17).
import workBuddyIcon from "@/assets/agents/workbuddy-color.svg";
import cursorIcon from "@/assets/agents/cursor.svg";
import agoragenticIcon from "@/assets/agents/agoragentic-acp.svg";
import ampIcon from "@/assets/agents/amp-color.svg";
import antigravityIcon from "@/assets/agents/antigravity-color.svg";
import auggieIcon from "@/assets/agents/auggie.svg";
import autohandIcon from "@/assets/agents/autohand.svg";
import bobIcon from "@/assets/agents/bob-color.svg";
import clineIcon from "@/assets/agents/cline.svg";
import codexIcon from "@/assets/agents/codex-color.svg";
import cortexCodeIcon from "@/assets/agents/cortex-code-color.svg";
import corustAgentIcon from "@/assets/agents/corust-agent.svg";
import crowCliIcon from "@/assets/agents/crow-cli-color.svg";
import deepAgentsIcon from "@/assets/agents/deepagents.svg";
import devinIcon from "@/assets/agents/devin.svg";
import devinLocalIcon from "@/assets/agents/devin-local.svg";
import dimCodeIcon from "@/assets/agents/dimcode.svg";
import diracIcon from "@/assets/agents/dirac.svg";
import factoryDroidIcon from "@/assets/agents/factory-droid.svg";
import fastAgentIcon from "@/assets/agents/fast-agent-color.svg";
import geminiCliIcon from "@/assets/agents/gemini-cli-color.svg";
import githubCopilotIcon from "@/assets/agents/github-copilot.svg";
import glmAgentIcon from "@/assets/agents/glm-agent.svg";
import gooseIcon from "@/assets/agents/goose.svg";
import grokBuildIcon from "@/assets/agents/grok-build.svg";
import harnIcon from "@/assets/agents/harn-color.svg";
import junieIcon from "@/assets/agents/junie-color.svg";
import kiloIcon from "@/assets/agents/kilo-color.svg";
import kimchiIcon from "@/assets/agents/kimchi.svg";
import kimiCliIcon from "@/assets/agents/kimi-cli.svg";
import kimiCodeIcon from "@/assets/agents/kimi-code-color.svg";
import kiroIcon from "@/assets/agents/kiro-color.svg";
import miniMaxCodeIcon from "@/assets/agents/minimax-code.svg";
import minionCodeIcon from "@/assets/agents/minion-code.svg";
import mistralVibeIcon from "@/assets/agents/mistral-vibe-color.svg";
import museCodeIcon from "@/assets/agents/muse-code.svg";
import novaIcon from "@/assets/agents/nova.svg";
import openCodeIcon from "@/assets/agents/opencode.svg";
import piIcon from "@/assets/agents/pi-acp.svg";
import poolsideIcon from "@/assets/agents/poolside-color.svg";
import qoderIcon from "@/assets/agents/qoder-color.svg";
import qwenCodeIcon from "@/assets/agents/qwen-code-color.svg";
import sigitCodeIcon from "@/assets/agents/sigit-code.svg";
import stakpakIcon from "@/assets/agents/stakpak.svg";
import vsCodeIcon from "@/assets/agents/vscode-color.svg";
import vtCodeIcon from "@/assets/agents/vtcode.svg";

/** Agent marks. The first four are also the handoff tools; the rest only attribute discussion messages. */
export const agentIconUrls = {
  ChatGPT: chatGptIcon,
  "Claude Code": claudeCodeIcon,
  WorkBuddy: workBuddyIcon,
  Cursor: cursorIcon,
  Agoragentic: agoragenticIcon,
  Amp: ampIcon,
  Antigravity: antigravityIcon,
  Auggie: auggieIcon,
  Autohand: autohandIcon,
  Bob: bobIcon,
  Cline: clineIcon,
  Codex: codexIcon,
  "Cortex Code": cortexCodeIcon,
  "Corust Agent": corustAgentIcon,
  "Crow CLI": crowCliIcon,
  "Deep Agents": deepAgentsIcon,
  Devin: devinIcon,
  "Devin Local": devinLocalIcon,
  DimCode: dimCodeIcon,
  Dirac: diracIcon,
  "Factory Droid": factoryDroidIcon,
  "fast-agent": fastAgentIcon,
  "Gemini CLI": geminiCliIcon,
  "GitHub Copilot": githubCopilotIcon,
  "GLM Agent": glmAgentIcon,
  Goose: gooseIcon,
  "Grok Build": grokBuildIcon,
  Harn: harnIcon,
  Junie: junieIcon,
  Kilo: kiloIcon,
  Kimchi: kimchiIcon,
  "Kimi CLI": kimiCliIcon,
  "Kimi Code": kimiCodeIcon,
  Kiro: kiroIcon,
  "MiniMax Code": miniMaxCodeIcon,
  "Minion Code": minionCodeIcon,
  "Mistral Vibe": mistralVibeIcon,
  "Muse Code": museCodeIcon,
  Nova: novaIcon,
  OpenCode: openCodeIcon,
  Pi: piIcon,
  Poolside: poolsideIcon,
  Qoder: qoderIcon,
  "Qwen Code": qwenCodeIcon,
  "Sigit Code": sigitCodeIcon,
  Stakpak: stakpakIcon,
  "VS Code": vsCodeIcon,
  "VT Code": vtCodeIcon,
} as const;

export type AgentIconId = keyof typeof agentIconUrls;

/** Black-on-transparent marks; dark theme inverts them so they stay visible. */
export const monochromeAgentIcons: ReadonlySet<AgentIconId> = new Set<AgentIconId>([
  "ChatGPT", "Cursor", "Agoragentic", "Auggie", "Autohand", "Cline", "Corust Agent", "Deep Agents", "Devin", "Devin Local",
  "DimCode", "Dirac", "GitHub Copilot", "GLM Agent", "Goose", "Grok Build", "Kimchi", "Kimi CLI", "MiniMax Code",
  "Minion Code", "Muse Code", "Nova", "OpenCode", "Pi", "Sigit Code", "Stakpak", "VT Code",
]);
