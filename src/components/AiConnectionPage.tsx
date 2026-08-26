import * as Tabs from "@radix-ui/react-tabs";
import { Check, Clipboard, FileSearch, ListTodo, PanelsTopLeft, Plus, Send, Trash2, UserRoundCheck, UsersRound } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "./BrandMark";
import { CodeBlock, CodeBlockCode, CodeBlockGroup } from "./ui/code-block";
import { RippleBackground } from "./ui/interactive-ripple-background";
import { GlowCard } from "./ui/spotlight-card";
import { agentIconUrls } from "../data/agentIcons";

const setupCommand = "npm i -g @agentdoor/cli\nagentdoor login";
const agents = ["ChatGPT", "Claude Code", "CodeBuddy", "Cursor"] as const;
const agentIcons: Record<(typeof agents)[number], string> = agentIconUrls;
const scenarios = [
  { icon: PanelsTopLeft, title: "定制我的个人工作台", description: "按自己的工作方式调整模块、排序和信息组合；配置仅对自己可见，不影响其他成员。", command: "agentdoor workbench customize --mine", tone: "violet" },
  { icon: ListTodo, title: "获取我的任务", description: "开始工作前，查看当前由我负责或需要参与的任务。", command: "agentdoor task list --mine", tone: "blue" },
  { icon: Check, title: "获取我的待办", description: "确认今天需要处理的具体行动、优先级与截止时间。", command: "agentdoor todo list --mine", tone: "mint" },
  { icon: FileSearch, title: "搜索团队资料库", description: "本地 Agent 缺少业务规则、项目文档或历史案例时。", command: "agentdoor resource search \"<query>\"", tone: "violet" },
  { icon: Plus, title: "创建团队任务", description: "本地工作发现需要团队跟进的问题或新的行动项时。", command: "agentdoor task create", tone: "blue" },
  { icon: Trash2, title: "删除团队任务", description: "任务误建或确认不再需要时使用；需要权限并二次确认。", command: "agentdoor task delete <task-id>", tone: "amber" },
  { icon: UserRoundCheck, title: "完成我的待办", description: "完成一项具体行动，并将完成状态同步回团队。", command: "agentdoor todo complete <todo-id>", tone: "violet" },
  { icon: Send, title: "提交本地工作成果", description: "本地分析、代码或文档完成，准备交付给团队时。", command: "agentdoor result submit <path>", tone: "mint" },
  { icon: UsersRound, title: "查看身份与工作空间", description: "确认 CLI 当前登录身份以及正在连接的团队空间。", command: "agentdoor status", tone: "blue" },
] as const;

export function AiConnectionPage() {
  const [agent, setAgent] = useState<(typeof agents)[number]>("ChatGPT");
  const [copied, setCopied] = useState(false);
  const [copiedScenario, setCopiedScenario] = useState<string | null>(null);
  const copyCommand = async () => {
    await navigator.clipboard.writeText(setupCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  const copyScenarioCommand = async (scenarioCommand: string) => {
    await navigator.clipboard.writeText(scenarioCommand);
    setCopiedScenario(scenarioCommand);
    window.setTimeout(() => setCopiedScenario(null), 1400);
  };

  return <section className="connect-v2">
    <RippleBackground />
    <header className="connect-v2-hero">
      <div className="connect-v2-logo-pair" aria-label={`Agentdoor 连接 ${agent}`}>
        <span className="connect-v2-agentdoor-logo"><BrandMark /></span>
        <span className="connect-v2-product-logo">
          <img alt={`${agent} Logo`} src={agentIcons[agent]} />
        </span>
      </div>
      <p>Agentdoor for local agents</p>
      <h1>连接本地 Agent，<em>开启团队协作</em></h1>
      <span>一条命令连接当前工作目录。需要协作时，再把成果、进展和关键背景同步给团队。</span>
    </header>

    <section className="connect-v2-console" aria-label="连接本地 Agent">
      <Tabs.Root onValueChange={(value) => setAgent(value as typeof agent)} value={agent}>
        <Tabs.List aria-label="选择 Agent" className="connect-v2-tabs">
          {agents.map((item) => <Tabs.Trigger key={item} value={item}>
            <img alt="" src={agentIcons[item]} />{item}
          </Tabs.Trigger>)}
        </Tabs.List>
      </Tabs.Root>
      <div className="connect-v2-console-copy">
        <div><small>在终端中运行</small><strong>安装 Agentdoor CLI 并登录</strong></div>
        <span>登录后引导连接当前工作目录</span>
      </div>
      <CodeBlock>
        <CodeBlockGroup><span><i /><i /><i /></span><small>agentdoor / local</small></CodeBlockGroup>
        <div className="connect-v2-code-line">
          <CodeBlockCode className="connect-v2-setup-code">
            <span><b>$</b>npm i -g <mark>@agentdoor/cli</mark></span>
            <span><b>$</b>agentdoor <mark>login</mark></span>
          </CodeBlockCode>
          <button aria-label={copied ? "命令已复制" : "复制安装命令"} onClick={copyCommand} type="button">{copied ? <Check size={17} /> : <Clipboard size={17} />}</button>
        </div>
      </CodeBlock>
      <p className="connect-v2-permission"><Check size={13} />登录完成后选择团队工作空间；你决定同步哪些成果，所有操作遵循当前用户权限。</p>
    </section>

    <section className="connect-v2-scenes">
      <header><p>Local operations</p><h2>本地 Agent 可以做什么？</h2><span>在权限范围内操作任务、待办与资料库，并将本地成果带回团队。</span></header>
      <div className="connect-v2-bento">
        {scenarios.map(({ icon: Icon, title, description, command: scenarioCommand, tone }) => <GlowCard className={tone} key={title} size="md">
          <div className="connect-v2-card-inner">
            <div className="connect-v2-card-title"><span><Icon size={19} /></span><h3>{title}</h3></div>
            <p className="connect-v2-card-description">{description}</p>
            <div className="connect-v2-card-command">
              <code><b>$</b>{scenarioCommand}</code>
              <button aria-label={`复制 ${scenarioCommand}`} onClick={() => copyScenarioCommand(scenarioCommand)} type="button">
                {copiedScenario === scenarioCommand ? <Check size={16} /> : <Clipboard size={16} />}
              </button>
            </div>
          </div>
        </GlowCard>)}
      </div>
    </section>
  </section>;
}
