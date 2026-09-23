import { useI18n } from "../i18n/I18nProvider";
import type { Locale } from "../i18n/core";
import { useGlobalUi } from "../i18n/globalUi";
import * as Tabs from "@radix-ui/react-tabs";
import { ArrowLeft, Check, Clipboard, ListTodo, MessageSquare, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "./BrandMark";
import { Button } from "./ui/button";
import { CodeBlock, CodeBlockCode, CodeBlockGroup } from "./ui/code-block";
import { RippleBackground } from "./ui/interactive-ripple-background";
import { GlowCard } from "./ui/spotlight-card";
import { agentIconUrls } from "../data/agentIcons";
import { aiToolName } from "../lib/aiTools";

const setupCommand = "npm i -g @taskdoor/cli\ntaskdoor login";
const agents = ["ChatGPT", "Claude Code", "WorkBuddy", "Cursor"] as const;
type Agent = (typeof agents)[number];
const agentIcons: Record<(typeof agents)[number], string> = agentIconUrls;
type ConnectionHistory = Partial<Record<Agent, string>>;
// Prototype receipt for the connected-state presentation. Replace with the server-issued
// TaskDoor CLI connection receipt when that endpoint is available.
const demoConnectionHistory: ConnectionHistory = { ChatGPT: "2026-09-18T10:42:00+08:00" };
// Prototype command syntax; the CLI implementation and parameters are not yet confirmed.
const scenarios = [
  { icon: Plus, title: "创建任务", description: "把新的工作需求整理为任务，明确接下来要推进的事。", command: 'taskdoor task create --title "整理本周复盘纪要"', tone: "blue" },
  { icon: ListTodo, title: "查看任务", description: "查看自己负责的任务，了解状态与截止时间。", command: "taskdoor task list --mine", tone: "blue" },
  { icon: Pencil, title: "更新基础信息", description: "调整任务名称、负责人、截止时间等基础信息。", command: "taskdoor task update <task-id> --due <YYYY-MM-DD>", tone: "violet" },
  { icon: Upload, title: "上传文件", description: "把交付成果或参考资料上传到指定任务。", command: "taskdoor task file upload <task-id> <file-path>", tone: "violet" },
  { icon: MessageSquare, title: "回复动态", description: "在指定任务动态下补充进展、问题或核对结果。", command: 'taskdoor task reply <task-id> --activity <activity-id> --message "已补充复盘材料，请查收"', tone: "violet" },
  { icon: Trash2, title: "删除任务", description: "移除误建或确认不再需要的任务；需要权限并二次确认。", command: "taskdoor task delete <task-id>", tone: "amber" },
] as const;

function formatConnectionTime(value: string, locale: Locale) {
  const connectedAt = new Date(value);
  if (!Number.isFinite(connectedAt.getTime())) return "";
  const now = new Date();
  const sameDay = connectedAt.getFullYear() === now.getFullYear()
    && connectedAt.getMonth() === now.getMonth()
    && connectedAt.getDate() === now.getDate();
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(connectedAt);
  if (sameDay) return `${locale === "en" ? "Today" : "今天"} ${time}`;
  return new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(connectedAt);
}

export function AiConnectionPage({ embedded = false, onBack, connectionHistory = demoConnectionHistory }: { embedded?: boolean; onBack?: () => void; connectionHistory?: ConnectionHistory }) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const Heading = embedded ? "h2" : "h1";
  const [agent, setAgent] = useState<Agent>("ChatGPT");
  const [copied, setCopied] = useState(false);
  const [copiedScenario, setCopiedScenario] = useState<string | null>(null);
  const selectedConnection = connectionHistory[agent];
  const agentName = aiToolName(agent);
  const copyCommand = async () => {
    await navigator.clipboard.writeText(setupCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
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
      <p>TaskDoor for local agents</p>
      <Heading>{ui("连接本地 Agent，")}<em>{ui("开启团队协作")}</em></Heading>
      <span>{ui("一条命令连接当前工作目录。需要协作时，再把成果、进展和关键背景同步给团队。")}</span>
    </header>

    <section className="connect-v2-console" aria-label={ui("连接本地 Agent")}>
      <Tabs.Root onValueChange={(value) => setAgent(value as typeof agent)} value={agent}>
        <Tabs.List aria-label={ui("选择 Agent")} className="connect-v2-tabs">
          {agents.map((item) => <Tabs.Trigger key={item} value={item}>
            <img alt="" data-agent-icon={item} src={agentIcons[item]} /><span>{aiToolName(item)}</span>
            {connectionHistory[item] && <i aria-label={ui("已连接")} className="connect-v2-tab-connected" title={ui("已连接")} />}
          </Tabs.Trigger>)}
        </Tabs.List>
      </Tabs.Root>
      <div className="connect-v2-console-copy">
        <div><small>{ui("在终端中运行")}</small><strong>{ui("安装 TaskDoor CLI 并登录")}</strong></div>
        <span>{ui("登录后引导连接当前工作目录")}</span>
      </div>
      <CodeBlock>
        <CodeBlockGroup><span><i /><i /><i /></span><small>TaskDoor / local</small></CodeBlockGroup>
        <div className="connect-v2-code-line">
          <CodeBlockCode className="connect-v2-setup-code">
            <span><b>$</b>npm i -g <mark>@taskdoor/cli</mark></span>
            <span><b>$</b>taskdoor <mark>login</mark></span>
          </CodeBlockCode>
          <button aria-label={copied ? ui("命令已复制") : ui("复制安装命令")} onClick={copyCommand} type="button">{copied ? <Check size={17} /> : <Clipboard size={17} />}</button>
        </div>
      </CodeBlock>
      <div className="connect-v2-permission">
        <p><Check size={13} />{ui("登录完成后选择团队工作空间；你决定同步哪些成果，所有操作遵循当前用户权限。")}</p>
        {selectedConnection && Number.isFinite(Date.parse(selectedConnection))
          ? <p className="connect-v2-last-connected"><i aria-hidden="true" />{ui("最近连接")}{agentName} · {formatConnectionTime(selectedConnection, locale)}</p>
          : <p className="connect-v2-last-connected is-disconnected"><i aria-hidden="true" />{agentName}{ui("· 未连接")}</p>}
      </div>
    </section>

    <section className="connect-v2-scenes">
      <header><p>Task examples</p><h2>{ui("任务操作示例")}</h2><span>{ui("CLI 命令示例：拟定语法，待 CLI 实现确认。")}</span></header>
      <div className="connect-v2-bento">
        {scenarios.map(({ icon: Icon, title, description, command: sourceCommand, tone }) => {
          const command = locale === "en" ? sourceCommand.replace("整理本周复盘纪要", "Prepare this week’s retrospective notes").replace("已补充复盘材料，请查收", "Retrospective materials are ready for review") : sourceCommand;
          return <GlowCard className={tone} key={title} size="md">
          <div className="connect-v2-card-inner">
            <div className="connect-v2-card-title"><span><Icon size={19} /></span><h3>{ui(title)}</h3></div>
            <p className="connect-v2-card-description">{ui(description)}</p>
            <div className="connect-v2-card-commands">
              <div className="connect-v2-card-command">
                <code><b aria-hidden="true">$</b>{command}</code>
                <button aria-label={copiedScenario === command ? ui("{0}命令已复制", {0: ui(title)}) : ui("复制{0}命令", {0: ui(title)})} onClick={() => copyScenarioCommand(command)} title={ui("复制命令")} type="button">
                  {copiedScenario === command ? <Check size={16} /> : <Clipboard size={16} />}
                </button>
              </div>
            </div>
          </div>
        </GlowCard>; })}
      </div>
    </section>
  </section>;
}
