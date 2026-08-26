import { Check, Clipboard, TerminalSquare, X } from "lucide-react";
import { useState } from "react";

const connectCommand = "agentdoor connect";

export function CliConnectionDialog({ onClose, onConnected }: { onClose: () => void; onConnected?: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyCommand = async () => {
    await navigator.clipboard.writeText(connectCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return <div className="cli-connect-layer" role="presentation">
    <button aria-label="关闭连接 AI 弹窗" className="cli-connect-backdrop" onClick={onClose} type="button" />
    <section aria-labelledby="cli-connect-title" aria-modal="true" className="cli-connect-dialog" role="dialog">
      <header>
        <span><TerminalSquare size={21} /></span>
        <div><h2 id="cli-connect-title">通过 CLI 连接 AI</h2><p>让你的本地 Agent 通过 Agentdoor CLI 与 Agentdoor 协作。</p></div>
        <button aria-label="关闭" onClick={onClose} type="button"><X size={18} /></button>
      </header>
      <div className="cli-connect-body">
        <div className="cli-connect-note"><strong>此入口不携带工作上下文</strong><p>连接完成后，由你在本地 Agent 中主动查询待办、读取权限范围内的信息，并选择要提交的成果。</p></div>
        <div className="cli-command-block">
          <small>在本地 Agent 的终端中运行</small>
          <code><span>$</span>{connectCommand}</code>
          <button onClick={copyCommand} type="button">{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "已复制" : "复制命令"}</button>
        </div>
        <ol>
          <li><span>1</span><div><strong>连接身份</strong><p>在浏览器中确认登录和组织身份。</p></div></li>
          <li><span>2</span><div><strong>在本地发起请求</strong><p>通过 CLI 查询我的待办或获取指定任务信息。</p></div></li>
          <li><span>3</span><div><strong>确认后同步</strong><p>选择本地成果，经你确认后写回 Agentdoor。</p></div></li>
        </ol>
      </div>
      {onConnected && <footer className="cli-connect-footer">
        <button onClick={() => { onConnected(); onClose(); }} type="button"><Check size={15} />我已完成连接</button>
      </footer>}
    </section>
  </div>;
}
