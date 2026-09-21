import chatGptIcon from "../assets/agents/openai.svg";
import claudeCodeIcon from "../assets/agents/claude-color.svg";
// Official WorkBuddy favicon: https://www.workbuddy.cn/ (assets/logo.svg, retrieved 2026-09-17).
import workBuddyIcon from "../assets/agents/workbuddy-color.svg";
import cursorIcon from "../assets/agents/cursor.svg";

export const agentIconUrls = {
  ChatGPT: chatGptIcon,
  "Claude Code": claudeCodeIcon,
  WorkBuddy: workBuddyIcon,
  Cursor: cursorIcon,
} as const;
