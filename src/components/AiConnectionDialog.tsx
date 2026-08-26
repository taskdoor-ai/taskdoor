import { ArrowRight, Bot, Check, FileText, Link2, ListChecks, LockKeyhole, PackageCheck, RotateCcw, Target, Upload, X } from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Step, Stepper, type StepItem } from "./ui/stepper";
import { EvervaultCard } from "./ui/evervault-card";
import { agentIconUrls } from "../data/agentIcons";

export type AiConnectionRequest = {
  context: Array<{ label: string; value: string }>;
  description: string;
  expectedOutput: string;
  instruction: string;
  title: string;
  workObject: {
    content?: string;
    kind: string;
    meta?: string;
    title: string;
  };
  workspacePath?: string;
};

type AiConnectionDialogProps = {
  onClose: () => void;
  onConnect: (agent: string) => void;
  request: AiConnectionRequest;
};

const defaultWorkspacePath = "/Users/yxzuji/Documents/ChatGPT/agentdoor2";

const agents = [
  {
    id: "ChatGPT",
    mark: <img alt="" src={agentIconUrls.ChatGPT} />,
    method: "通过 codex:// 新建任务并预填上下文",
    name: "ChatGPT",
    note: "适合继续分析、整理判断与生成回复",
    tone: "gpt",
    transfer: "direct",
  },
  {
    id: "Claude Code",
    mark: <img alt="" src={agentIconUrls["Claude Code"]} />,
    method: "通过 claude://code/new 直接预填上下文",
    name: "Claude Code",
    note: "适合结合代码与任务上下文继续实现",
    tone: "claude",
    transfer: "direct",
  },
  {
    id: "CodeBuddy",
    mark: <img alt="" src={agentIconUrls.CodeBuddy} />,
    method: "复制上下文后通过 codebuddy://chat 打开",
    name: "CodeBuddy",
    note: "当前版本未开放 prompt 参数，打开后直接粘贴",
    tone: "codebuddy",
    transfer: "clipboard",
  },
  {
    id: "Cursor",
    mark: <img alt="" src={agentIconUrls.Cursor} />,
    method: "复制上下文后通过 cursor:// 打开",
    name: "Cursor",
    note: "适合在当前代码工作区继续分析与实现",
    tone: "cursor",
    transfer: "clipboard",
  },
] as const;

const coordinationSteps = [
  { description: "基于当前用户需要关注的信息", icon: PackageCheck, label: "当前工作上下文" },
  { description: "将任务包带到客户端", icon: Link2, label: "打开本地 AI" },
  { description: "分析、修改并形成成果", icon: Bot, label: "在本地完成工作" },
  { description: "选择要带回的内容", icon: Upload, label: "选择并确认成果" },
  { description: "写入任务、文件、待办或动态", icon: RotateCcw, label: "同步回协作任务" },
] satisfies StepItem[];

function buildContextPrompt(request: AiConnectionRequest) {
  const context = request.context.filter((item) => item.value.trim()).map((item) => `- ${item.label}：${item.value.trim()}`).join("\n");
  return [
    "# Agentdoor Task Package / v1",
    "## 1. 当前处理内容",
    `类型：${request.workObject.kind}`,
    `标题：${request.workObject.title}`,
    request.workObject.meta ? `补充信息：${request.workObject.meta}` : "",
    request.workObject.content ? `内容：${request.workObject.content}` : "",
    "## 2. 一并带入的信息",
    context || "无额外上下文",
    "## 3. 希望 Agent 完成",
    request.instruction,
    "## 4. 期望带回的成果",
    request.expectedOutput,
    "## 工作规则",
    "保留来源引用；区分已确认事实与推断；信息不足时先明确缺口。只处理本任务包中的内容，成果由用户确认后同步回协作任务。",
  ].filter(Boolean).join("\n\n");
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}

export function AiConnectionDialog({ onClose, onConnect, request }: AiConnectionDialogProps) {
  const [selectedAgent, setSelectedAgent] = useState<(typeof agents)[number]["id"]>(agents[0].id);
  const [launching, setLaunching] = useState(false);
  const prompt = useMemo(() => buildContextPrompt(request), [request]);
  const activeAgent = agents.find((agent) => agent.id === selectedAgent) ?? agents[0];
  const contextValue = (...labels: string[]) => request.context.find((item) => labels.includes(item.label))?.value.trim() ?? "";
  const taskIdentity = contextValue("任务", "项目") || request.title;
  const packageId = taskIdentity.match(/[A-Z]{2}-\d+/)?.[0] ?? "当前任务";
  const contextSummary = request.context.filter((item) => item.value.trim());

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const launchAgent = async () => {
    if (launching) return;
    setLaunching(true);
    const workspacePath = request.workspacePath ?? defaultWorkspacePath;
    const copied = await copyText(prompt);
    let deepLink = "";
    if (selectedAgent === "Claude Code") {
      deepLink = `claude://code/new?q=${encodeURIComponent(prompt)}&folder=${encodeURIComponent(workspacePath)}`;
    } else if (selectedAgent === "CodeBuddy") {
      deepLink = "codebuddy://chat";
    } else if (selectedAgent === "Cursor") {
      deepLink = `cursor://file${encodeURI(workspacePath)}`;
    } else {
      deepLink = `codex://threads/new?prompt=${encodeURIComponent(prompt)}&path=${encodeURIComponent(workspacePath)}`;
    }
    window.location.href = deepLink;
    window.setTimeout(() => {
      setLaunching(false);
      if (selectedAgent !== "CodeBuddy" && selectedAgent !== "Cursor" || copied) onConnect(selectedAgent);
    }, 650);
  };

  return <div aria-labelledby="ai-connect-title" aria-modal="true" className="ai-connect-overlay" role="dialog">
    <button aria-label="关闭连接个人 AI 弹窗" className="ai-connect-backdrop" onClick={onClose} type="button" />
    <section className="ai-connect-dialog">
      <header className="ai-connect-header">
        <span className="ai-connect-header-icon"><Link2 size={17} /></span>
        <div><h2 id="ai-connect-title">连接个人 Agent</h2><p>{request.description}</p></div>
        <button aria-label="关闭" className="ai-connect-close" onClick={onClose} type="button"><X size={17} /></button>
      </header>

      <section className="ai-coordination-loop" aria-label="个人 Agent 与 AD 云端协调闭环">
        <header>
          <div><strong>如何与个人 AI 协作</strong></div>
          <span><LockKeyhole size={12} /> 上下文基于当前用户的数据权限生成</span>
        </header>
        <Stepper initialStep={-1} steps={coordinationSteps} variables={{ "--step-icon-size": "30px", "--step-gap": "10px" } as CSSProperties}>
          {coordinationSteps.map((step, index) => <Step description={step.description} icon={step.icon} index={index} key={step.label} label={step.label} />)}
        </Stepper>
      </section>

      <div className="ai-connect-body">
        <section className="ai-agent-picker" aria-label="可连接的 AI Agent">
          <header><strong>选择客户端</strong><small>使用当前设备已注册的 Deep Link 协议</small></header>
          <div className="ai-agent-options">
            {agents.map((agent) => <button aria-pressed={selectedAgent === agent.id} className={selectedAgent === agent.id ? "selected" : ""} key={agent.id} onClick={() => setSelectedAgent(agent.id)} type="button">
              <span className={`ai-agent-mark ${agent.tone}`}>{agent.mark}</span>
              <span><strong>{agent.name}</strong><small>{agent.note}</small><em>{agent.method}</em></span>
              <i>{selectedAgent === agent.id && <Check size={12} />}</i>
            </button>)}
          </div>
        </section>

        <section className="ai-context-preview">
          <EvervaultCard className="ai-package-card">
            <header className="ai-package-header">
              <div><PackageCheck size={15} /><span><strong>{packageId} / {request.workObject.kind} / v1</strong></span></div>
              <em>本次工作上下文</em>
            </header>
            <section className="ai-work-object-section">
              <header><span><PackageCheck size={13} /></span><small>当前处理内容</small><em>{request.workObject.kind}</em></header>
              <strong>{request.workObject.title}</strong>
              {(request.workObject.meta || request.workObject.content) && <p>{[request.workObject.meta, request.workObject.content].filter(Boolean).join(" · ")}</p>}
            </section>
            <div className="ai-package-layers">
              <article><span><FileText size={13} /></span><div><strong>一并带入的信息</strong><p>{contextSummary.length ? contextSummary.map((item) => item.label).join(" · ") : "无额外上下文"}</p></div></article>
              <article><span><Target size={13} /></span><div><strong>希望 Agent 完成</strong><p>{request.instruction}</p></div></article>
              <article><span><ListChecks size={13} /></span><div><strong>期望带回的成果</strong><p>{request.expectedOutput}</p></div></article>
            </div>
            <footer><LockKeyhole size={12} /><span>仅携带完成当前工作所需的信息，并遵循当前用户的数据权限</span></footer>
          </EvervaultCard>
        </section>
      </div>

      <footer className="ai-connect-footer">
        <button className="ai-connect-cancel" onClick={onClose} type="button">取消</button>
        <button className="ai-connect-submit" disabled={launching} onClick={launchAgent} type="button"><span>{launching ? "正在唤起…" : `打开 ${activeAgent.name}`}</span><ArrowRight size={14} /></button>
      </footer>
    </section>
  </div>;
}
