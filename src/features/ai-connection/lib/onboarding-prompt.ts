import type { Locale } from "@/shared/i18n/core";

export type ConnectionMethod = "cli" | "mcp";

export function buildOnboardingConnectionPrompt({ method, origin, locale = "zh-CN" }: { method: ConnectionMethod; origin: string; locale?: Locale }) {
  const deploymentOrigin = new URL(origin).origin;
  const documentUrl = `${deploymentOrigin}${method === "mcp" ? "/documents/skills/taskdoor-mcp/SKILL.md" : "/documents/cli-commands.md"}`;
  if (method === "mcp") return locale === "en"
    ? `Read ${documentUrl} and help me configure TaskDoor MCP. Choose browser authorization or an access token according to client support.`
    : `请阅读 ${documentUrl} 安装 skill，按照步骤为我配置 TaskDoor MCP，并按客户端支持情况选择浏览器授权或填入访问令牌。`;
  return locale === "en" ? [
    `Help me configure TaskDoor CLI for ${deploymentOrigin}. Read the command reference: ${documentUrl}`,
    "First check whether a working taskdoor CLI is already available. Only if it is missing, run: npm install -g @taskdoor/cli",
    `Run: taskdoor login --server ${deploymentOrigin}`,
    "Wait for me to approve in the browser. If it does not open, show the authorization URL exactly as printed. Report a failed or timed-out login instead of repeating it unchanged.",
    "After login succeeds, run: taskdoor whoami --json",
    "Report the actual account and server. Do not create tasks, comments or files to test setup. These setup results do not constitute an onboarding verification receipt.",
  ].join("\n") : [
    `请帮我配置 ${deploymentOrigin} 的 TaskDoor CLI。命令参考：${documentUrl}`,
    "先检查当前环境是否已有可用的 taskdoor CLI；仅在未安装时执行：npm install -g @taskdoor/cli",
    `执行登录：taskdoor login --server ${deploymentOrigin}`,
    "等待我在浏览器确认；未自动打开时，原样提供终端打印的授权地址。登录失败或超时应报告实际结果，不原样重复登录。",
    "登录成功后执行：taskdoor whoami --json",
    "报告实际账号和服务地址，不通过创建任务、讨论或文件测试配置。上述配置结果不代表首次引导的访问验证回执。",
  ].join("\n");
}
