import { PanelRightClose, RotateCcw, Sparkles, Square } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { useCreationI18n } from "@/shared/i18n/creation-messages";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { AgentActivityIndicator } from "@/shared/ui/ai-agent-response";
import { Button } from "@/shared/ui/button";
import { TaskCreationHistory } from "@/features/tasks/components/TaskCreationHistory";
import type { CreationProcess } from "@/features/tasks/lib/task-creation-progress";

type Props = {
  processes: CreationProcess[];
  busy: boolean;
  error?: string;
  notice?: string;
  onStop: () => void;
  onRetry: () => void;
  onClose: () => void;
};

/** The opening creation round shares the existing creation conversation layout. */
export function TaskCreationGenerationSidebar({ processes, busy, error, notice, onStop, onRetry, onClose }: Props) {
  const ui = useGlobalUi();
  const { c, locale } = useCreationI18n();
  const reducedMotion = useReducedMotion();
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const followLatest = useRef(true);
  const latest = processes.at(-1);
  const canRetry = !busy && Boolean(error || latest?.status === "failed" || latest?.status === "stopped");
  const closeLabel = locale === "en" ? "Hide creation conversation" : "收起创建对话";

  useEffect(() => {
    const previous = document.activeElement;
    const sidebar = sidebarRef.current;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected && sidebar?.contains(document.activeElement)) previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (body && followLatest.current) body.scrollTop = body.scrollHeight;
  }, [processes, error, notice]);

  return <motion.aside
    animate={{ x: 0, opacity: 1 }}
    aria-label={ui("本次创建对话")}
    className="task-ai-adjust-popover is-compact task-ai-adjust-sidebar creation-generation-sidebar"
    exit={reducedMotion ? { opacity: 0 } : { x: "100%", opacity: 0 }}
    initial={reducedMotion ? false : { x: "100%", opacity: 0 }}
    onKeyDown={event => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        onClose();
      }
    }}
    ref={sidebarRef}
    transition={{ duration: reducedMotion ? 0 : .2, ease: "easeOut" }}
  >
    <header className="task-ai-adjust-header task-ai-adjust-conversation-header">
      <div><span><Sparkles aria-hidden="true" size={15} /><strong>{ui("本次创建对话")}</strong></span>{processes.length > 0 && <small>{processes.length}{ui("轮")}</small>}</div>
      <Button aria-label={closeLabel} className="task-ai-adjust-close" onClick={onClose} ref={closeRef} size="icon-touch" title={closeLabel} type="button" variant="ghost"><PanelRightClose aria-hidden="true" size={18} /></Button>
    </header>
    <div aria-label={ui("本次创建对话")} className="task-ai-adjust-body" onScroll={event => {
      const body = event.currentTarget;
      followLatest.current = body.scrollHeight - body.scrollTop - body.clientHeight < 32;
    }} ref={bodyRef} role="region" tabIndex={0}>
      {processes.length > 0 ? <TaskCreationHistory processes={processes} /> : busy ? <div className="creation-generation-waiting" role="status"><AgentActivityIndicator active /><span>{c("thinking")}</span></div> : null}
      {error && <p className="task-ai-adjust-error task-ai-adjust-conversation-state" role="alert">{error}</p>}
      {notice && <p className="task-ai-adjust-notice task-ai-adjust-conversation-state" role="status">{notice}</p>}
    </div>
    <footer className="task-ai-adjust-conversation-composer creation-generation-actions">
      {busy ? <><p>{locale === "en" ? "You can hide this conversation while generation continues." : "收起对话后，生成会继续。"}</p><Button aria-label={c("stopGeneratingPlan")} onClick={onStop} size="sm" type="button" variant="outline"><Square aria-hidden="true" size={13} />{c("stop")}</Button></> : canRetry ? <><p>{locale === "en" ? "Your input has been kept." : "输入已保留。"}</p><Button onClick={onRetry} size="sm" type="button" variant="outline"><RotateCcw aria-hidden="true" size={14} />{ui("重试")}</Button></> : <Button onClick={onClose} size="sm" type="button" variant="ghost">{closeLabel}</Button>}
    </footer>
  </motion.aside>;
}
