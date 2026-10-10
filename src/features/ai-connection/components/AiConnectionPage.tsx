import { useI18n } from "@/shared/i18n/I18nProvider";
import type { Locale } from "@/shared/i18n/core";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import * as Tabs from "@radix-ui/react-tabs";
import { ArrowLeft, Check, Clipboard, ListTodo, LogOut, MonitorSmartphone, Search, UserRound, Users } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/shared/ui/BrandMark";
import { Button } from "@/shared/ui/button";
import { CodeBlock, CodeBlockCode, CodeBlockGroup } from "@/shared/ui/code-block";
import { RippleBackground } from "@/shared/ui/interactive-ripple-background";
import { GlowCard } from "@/shared/ui/spotlight-card";
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
const scenarios = [
  { icon: UserRound, title: "账号与登录状态", description: "查看本机保存的登录状态，并向 TaskDoor 在线确认当前账号。", commands: ["taskdoor login status", "taskdoor whoami"], tone: "blue" },
  { icon: Users, title: "工作空间", description: "列出你所在的工作空间，并设置后续命令默认使用的空间。", commands: ["taskdoor workspace list", "taskdoor workspace use <workspace-id>"], tone: "blue" },
  { icon: ListTodo, title: "查看任务", description: "列出指定工作空间中你可以看到的任务。", commands: ["taskdoor task list --workspace <workspace-id>"], tone: "violet" },
  { icon: Search, title: "任务详情", description: "读取一个任务的完整信息。", commands: ["taskdoor task get <task-id> --workspace <workspace-id>"], tone: "violet" },
  { icon: MonitorSmartphone, title: "无浏览器的设备登录", description: "在服务器或远程终端登录：用另一台设备的浏览器确认验证码。", commands: ["taskdoor login --server {origin} --device-auth"], tone: "violet" },
  { icon: LogOut, title: "退出登录", description: "撤销本设备的授权，并清除本机保存的凭证。", commands: ["taskdoor logout"], tone: "amber" },
] as const;

function formatConnectionTime(value: string, locale: Locale, today: string) {
  const connectedAt = new Date(value);
  if (!Number.isFinite(connectedAt.getTime())) return "";
  const now = new Date();
  const sameDay = connectedAt.getFullYear() === now.getFullYear()
    && connectedAt.getMonth() === now.getMonth()
    && connectedAt.getDate() === now.getDate();
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(connectedAt);
  if (sameDay) return `${today} ${time}`;
  return new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(connectedAt);
}

export function AiConnectionPage({ embedded = false, onBack, connectionHistory = {} }: { embedded?: boolean; onBack?: () => void; connectionHistory?: ConnectionHistory }) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const Heading = embedded ? "h2" : "h1";
  const [method, setMethod] = useState("cli");
  const [agent, setAgent] = useState<Agent>("ChatGPT");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<AiTransferResult | null>(null);
  const [copiedScenario, setCopiedScenario] = useState<string | null>(null);
  const selectedConnection = connectionHistory[agent];
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
  const copyScenarioCommand = async (command: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedScenario(command);
    window.setTimeout(() => setCopiedScenario(null), 1400);
  };

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
    <section className="connect-v2-console" aria-label={ui("连接本地 Agent")}>
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
        <CodeBlockGroup><span><i /><i /><i /></span><small translate="no">TaskDoor / local</small></CodeBlockGroup>
        <div className="connect-v2-code-line">
          <CodeBlockCode className="connect-v2-setup-code" translate="no">{prompt}</CodeBlockCode>
          <button aria-label={copied ? ui("提示词已复制") : ui("复制提示词")} onClick={copyPrompt} type="button">{copied ? <Check size={17} /> : <Clipboard size={17} />}</button>
        </div>
      </CodeBlock>
      <div className={`connect-v2-permission${method === "mcp" ? " connect-v2-permission-mcp" : ""}`}>
        {/* After Open in {tool}, this line says what happened instead. */}
        <p aria-live="polite" className={result ? undefined : "shrink-0"} data-status={result?.status} role="status">
          {result ? result.message : <>{(method === "mcp" ? (locale === "en" ? "Use browser authorization; enter an access token if the client does not support it" : "支持浏览器授权；客户端不支持时可使用访问令牌") : ui("登录时在浏览器中确认即可"))}</>}
        </p>
        {method === "mcp" ? <a className="connect-token-link" href={tokenPageUrl.href} target="_blank" rel="noopener noreferrer">{locale === "en" ? "Manage access tokens →" : "管理访问令牌 →"}</a> : <p>{ui("登录只授权你的账号，按你本人在各工作空间的权限访问；工作空间在后续命令中指定。")}</p>}
        {selectedConnection && Number.isFinite(Date.parse(selectedConnection))
          ? <p className="connect-v2-last-connected"><i aria-hidden="true" />{ui("最近连接")}{agentName} · {formatConnectionTime(selectedConnection, locale, ui("今天"))}</p>
          : null}
      </div>
    </section>

    {method === "cli" && <section className="connect-v2-scenes">
      <header><h2>{ui("常用命令")}</h2><span>{ui("工作空间参数只指定操作目标，不改变登录授权。")}</span></header>
      <div className="connect-v2-bento">
        {scenarios.map(({ icon: Icon, title, description, commands, tone }) => <GlowCard className={tone} key={title} size="md">
          <div className="connect-v2-card-inner">
            <div className="connect-v2-card-title"><span><Icon size={19} /></span><h3>{ui(title)}</h3></div>
            <p className="connect-v2-card-description">{ui(description)}</p>
            <div className="connect-v2-card-commands">
              {commands.map((source) => {
                const command = source.replace("{origin}", origin);
                return <div className="connect-v2-card-command" key={command}>
                  <code translate="no"><b aria-hidden="true">$</b>{command}</code>
                  <button aria-label={copiedScenario === command ? ui("{0}命令已复制", {0: ui(title)}) : ui("复制{0}命令", {0: ui(title)})} onClick={() => copyScenarioCommand(command)} title={ui("复制命令")} type="button">
                    {copiedScenario === command ? <Check size={16} /> : <Clipboard size={16} />}
                  </button>
                </div>;
              })}
            </div>
          </div>
        </GlowCard>)}
      </div>
    </section>}
      </Tabs.Content>
    </Tabs.Root>
  </section>;
}
