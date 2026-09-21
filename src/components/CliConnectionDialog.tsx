import { Check, Clipboard, TerminalSquare, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const connectCommand = "taskdoor connect";

export function CliConnectionDialog({ onClose, onConnected, returnFocus }: { onClose: () => void; onConnected?: () => void; returnFocus?: HTMLElement | null }) {
  const [copied, setCopied] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? [])]
        .filter((element) => element.getAttribute("aria-hidden") !== "true");
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
        closeButton.current?.focus({ preventScroll: true });
      } else if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    };
  }, [returnFocus]);
  const copyCommand = async () => {
    await navigator.clipboard.writeText(connectCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return <div className="cli-connect-layer" role="presentation">
    <div aria-hidden="true" className="cli-connect-backdrop" onClick={onClose} />
    <section aria-labelledby="cli-connect-title" aria-modal="true" className="cli-connect-dialog" ref={dialog} role="dialog">
      <header>
        <span><TerminalSquare size={21} /></span>
        <div><h2 id="cli-connect-title">通过 CLI 连接 AI</h2><p>让你的本地 Agent 通过 TaskDoor CLI 与 TaskDoor 协作。</p></div>
        <button aria-label="关闭" onClick={onClose} ref={closeButton} type="button"><X size={18} /></button>
      </header>
      <div className="cli-connect-body">
        <div className="cli-connect-note"><strong>此入口不携带工作上下文</strong><p>连接完成后，由你在本地 Agent 中主动查询任务、读取权限范围内的信息，并选择要提交的成果。</p></div>
        <div className="cli-command-block">
          <small>在本地 Agent 的终端中运行</small>
          <code><span>$</span>{connectCommand}</code>
          <button onClick={copyCommand} type="button">{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "已复制" : "复制命令"}</button>
        </div>
        <ol>
          <li><span>1</span><div><strong>连接身份</strong><p>在浏览器中确认登录和组织身份。</p></div></li>
          <li><span>2</span><div><strong>在本地发起请求</strong><p>通过 CLI 查询我的任务或获取指定任务信息。</p></div></li>
          <li><span>3</span><div><strong>确认后同步</strong><p>选择本地成果，经你确认后写回 TaskDoor。</p></div></li>
        </ol>
      </div>
      {onConnected && <footer className="cli-connect-footer">
        <button onClick={() => { onConnected(); onClose(); }} type="button"><Check size={15} />我已完成连接</button>
      </footer>}
    </section>
  </div>;
}
