import { useI18n } from "@/shared/i18n/I18nProvider";
import { formatDisplayDateTime } from "@/shared/lib/date-time";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import * as Tabs from "@radix-ui/react-tabs";
import { ArrowLeft, Check, Clipboard } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/shared/ui/BrandMark";
import { Button } from "@/shared/ui/button";
import { CodeBlock, CodeBlockCode, CodeBlockGroup } from "@/shared/ui/code-block";
import { RippleBackground } from "@/shared/ui/interactive-ripple-background";
import { agentIconUrls } from "@/features/ai-connection/agent-icons";
import { browserTransferActions, copyAndOpenPrompt, type AiTransferResult } from "@/features/ai-connection/components/AiConnectionDialog";
import { aiToolName } from "@/features/ai-connection/lib/ai-tools";

const agents = ["ChatGPT", "Claude Code", "WorkBuddy", "Cursor"] as const;
type Agent = (typeof agents)[number];
const agentIcons: Record<(typeof agents)[number], string> = agentIconUrls;
type ConnectionHistory = Partial<Record<Agent, string>>;
// Mirrors the production Connect AI page. Connection receipts would come from the server; none exists
// yet, so nothing is said either way: TaskDoor cannot see a client on the person's machine.
// The commands are the TaskDoor CLI v0.1 commands; `{origin}` is this deployment.


export function AiConnectionPage({ embedded = false, onBack, connectionHistory = {} }: { embedded?: boolean; onBack?: () => void; connectionHistory?: ConnectionHistory }) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const Heading = embedded ? "h2" : "h1";
  const [method, setMethod] = useState("cli");
  const say = (zh: string, en: string) => locale === "en" ? en : zh;
  const [agent, setAgent] = useState<Agent>("ChatGPT");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<AiTransferResult | null>(null);

  const selectedConnection = connectionHistory[agent];
  const connectionTime = selectedConnection ? formatDisplayDateTime(selectedConnection) : null;
  const agentName = aiToolName(agent);
  // The prompt and the commands point at this deployment, wherever it is served from.
  const origin = window.location.origin;
  const tokenPageUrl = new URL(window.location.pathname, origin);
  tokenPageUrl.searchParams.set("settings", "tokens");
  const prompt = method === "mcp"
    ? (locale === "en" ? `Read ${origin}/documents/skills/taskdoor-mcp/SKILL.md and help me configure TaskDoor MCP. Choose browser authorization or an access token according to client support.` : `请阅读 ${origin}/documents/skills/taskdoor-mcp/SKILL.md 安装 skill，按照步骤为我配置 TaskDoor MCP，并按客户端支持情况选择浏览器授权或填入访问令牌。`)
    : ui("请阅读 {origin}/documents/cli-setup.md 文档，按照步骤为我安装并配置 TaskDoor CLI。", { origin });
  const copyPrompt = async () => {
    if (!(await browserTransferActions.copyText(prompt))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  const openInAgent = async () => setResult(await copyAndOpenPrompt(prompt, agent, browserTransferActions, locale));


  return <section className={`connect-v2${embedded ? " connect-v2-embedded" : ""}`}>
    {!embedded && <RippleBackground />}
    {!embedded && onBack && <Button className="connect-v2-back" onClick={onBack} type="button" variant="ghost"><ArrowLeft aria-hidden="true" size={16} />{ui("返回")}</Button>}
    <header className="connect-v2-hero">
      <div className="connect-v2-logo-pair" aria-label={ui("TaskDoor 连接 {0}", {0: agentName})}>
        <span className="connect-v2-agentdoor-logo"><BrandMark /></span>
        <span className="connect-v2-product-logo">
          <img alt={`${agentName} Logo`} data-agent-icon={agent} src={agentIcons[agent]} />
        </span>
      </div>
      <p>{ui("TaskDoor for local agents")}</p>
      <Heading>{ui("连接本地 Agent，")}<em>{ui("开启团队协作")}</em></Heading>
      <span>{ui("一条命令连接当前工作目录。需要协作时，再把成果、进展和关键背景同步给团队。")}</span>
    </header>

    <Tabs.Root className="connect-method-shell" value={method} onValueChange={(value) => { setMethod(value); setCopied(false); setResult(null); }}>
      <Tabs.List aria-label={locale === "en" ? "Connection method" : "连接方式"} className="connect-v2-tabs connect-method-tabs">
        <Tabs.Trigger value="cli">CLI</Tabs.Trigger>
        <Tabs.Trigger value="mcp">MCP</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value={method}>
      <p className="connect-setup-intro">{method === "cli" ? <>
        {say("本地 Agent 推荐使用 CLI，适合脚本编排和批量操作，需要安装并执行命令。", "CLI is recommended for local agents, scripts and batch operations, and requires installation and command execution.")}{" "}
        {say("如需与其他业务系统集成，或通过自动化平台调用 TaskDoor，可使用 API，能力范围与 CLI 一致。获取接入凭据，请前往", "Use the API to integrate TaskDoor with other business systems or call it from automation platforms. It provides the same capabilities as CLI. For access credentials, go to")}
        <a className="connect-token-link" href={tokenPageUrl.href} target="_blank" rel="noopener noreferrer">{say("个人访问令牌", "Personal access tokens")} →</a>
      </> : <>
        {say("MCP 适合支持 MCP 的 AI 客户端，在对话中查询和处理 TaskDoor 任务。支持授权登录，也可通过个人访问令牌访问。", "Use MCP with a compatible AI client to find and manage TaskDoor tasks in a conversation. Sign in through authorization or use a personal access token.")}
        <a className="connect-token-link" href={tokenPageUrl.href} target="_blank" rel="noopener noreferrer">{say("个人访问令牌", "Personal access tokens")} →</a>
      </>}</p>
    <section className="connect-v2-console" aria-label={method === "mcp" ? say("配置 MCP 客户端", "Configure MCP client") : ui("连接本地 Agent")}>
      <Tabs.Root onValueChange={(value) => { setAgent(value as typeof agent); setResult(null); }} value={agent}>
        <Tabs.List aria-label={ui("选择 Agent")} className="connect-v2-tabs">
          {agents.map((item) => <Tabs.Trigger key={item} value={item}>
            <img alt="" data-agent-icon={item} src={agentIcons[item]} /><span>{aiToolName(item)}</span>
            {connectionHistory[item] && <i aria-label={ui("已连接")} className="connect-v2-tab-connected" title={ui("已连接")} />}
          </Tabs.Trigger>)}
        </Tabs.List>
      </Tabs.Root>
      <div className="connect-v2-console-copy">
        <div><small>{ui("把这段话发给 {tool}", { tool: agentName })}</small><strong>{method === "mcp" ? (locale === "en" ? `Let ${agentName} configure TaskDoor MCP` : `让 ${agentName} 为你配置 TaskDoor MCP`) : ui("让 {tool} 为你安装并登录 TaskDoor CLI", { tool: agentName })}</strong></div>
        <Button onClick={openInAgent} type="button">{ui("在 {tool} 中打开", { tool: agentName })}</Button>
      </div>
      <CodeBlock>
        <CodeBlockGroup><span><i /><i /><i /></span><small translate="no">TaskDoor / {method.toUpperCase()}</small></CodeBlockGroup>
        <div className="connect-v2-code-line">
          <CodeBlockCode className="connect-v2-setup-code" translate="no">{prompt}</CodeBlockCode>
          <button aria-label={copied ? ui("提示词已复制") : ui("复制提示词")} onClick={copyPrompt} type="button">{copied ? <Check size={17} /> : <Clipboard size={17} />}</button>
        </div>
      </CodeBlock>
      <div className={`connect-v2-permission${method === "mcp" ? " connect-v2-permission-mcp" : ""}`}>
        {/* After Open in {tool}, this line says what happened instead. */}
        <p aria-live="polite" className={result ? undefined : "shrink-0"} data-status={result?.status} role="status">
          {result ? result.message : <>{ui("登录时在浏览器中确认即可")} <a className="connect-token-link" href="https://sand.taskdoor.com/documents/openapi/v1" target="_blank" rel="noopener noreferrer">{locale === "en" ? "Help center" : "帮助中心"}</a></>}
        </p>
        {method === "cli" && <p>{ui("登录只授权你的账号，按你本人在各工作空间的权限访问；工作空间在后续命令中指定。")}</p>}
        {selectedConnection && connectionTime
          ? <p className="connect-v2-last-connected"><i aria-hidden="true" />{ui("最近连接")}{agentName} · <time dateTime={selectedConnection} title={formatDisplayDateTime(selectedConnection, { year: "always" }) ?? undefined}>{connectionTime}</time></p>
          : null}
      </div>
    </section>
      </Tabs.Content>
    </Tabs.Root>
  </section>;
}
