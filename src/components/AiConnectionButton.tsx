import { useI18n } from '../i18n/I18nProvider';
import { aiTransferMessage } from '../i18n/aiTransferCopy';
import { useGlobalUi } from "../i18n/globalUi";
import { useRemainingCopy } from "../i18n/remainingMessages";
import { ChevronDown, LoaderCircle, SquareTerminal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { agentIconUrls } from "../data/agentIcons";
import { aiToolName, type AiTool } from "../lib/aiTools";
import { aiToolPreferences, defaultAiTool, isAiToolPreview, type AiToolPreferenceStore } from "../lib/aiToolPreferences";
import { useAiToolPreferences } from "../lib/useAiToolPreferences";
import type { AiConnectionHandler } from "./AiConnectionDialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "./ui/toast";

type Props = {
  contextLabel: string;
  onConnect: AiConnectionHandler;
  compact?: boolean;
  disabled?: boolean;
  preferenceStore?: AiToolPreferenceStore;
};

/** The main button stays mounted when a first launch creates a default, preserving dialog return focus. */
export function AiConnectionButton({ contextLabel, onConnect, compact = false, disabled = false, preferenceStore = aiToolPreferences }: Props) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const u = useRemainingCopy();
  const preferences = useAiToolPreferences(preferenceStore);
  const defaultTool = defaultAiTool(preferences);
  const [open, setOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const mainButton = useRef<HTMLButtonElement>(null);
  const attempt = useRef<AbortController | null>(null);
  const handingFocusToDialog = useRef(false);
  useEffect(() => () => { attempt.current?.abort(); }, []);
  const showDialog = () => {
    handingFocusToDialog.current = true;
    setOpen(false);
    if (mainButton.current) void onConnect(mainButton.current);
  };
  const launch = async (agent: AiTool) => {
    if (disabled || attempt.current || !mainButton.current) return;
    const controller = new AbortController();
    attempt.current = controller;
    setLaunching(true);
    setOpen(false);
    try {
      const result = await onConnect(mainButton.current, { agent, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (result?.status === "cancelled") return;
      const message = result ? aiTransferMessage(locale, result, aiToolName(agent)) : ui("当前内容暂不可用，请稍后重试。");
      if (result?.status === "open-attempted" || result?.status === "preview") toast.info(message);
      else toast.error(message);
    } catch {
      if (!controller.signal.aborted) toast.error(ui("未能打开 AI 工具，请重试。"));
    } finally {
      if (!controller.signal.aborted) { attempt.current = null; setLaunching(false); }
    }
  };
  const cancel = () => {
    attempt.current?.abort(); attempt.current = null; setLaunching(false);
    setAnnouncement(ui("已取消，未尝试打开工具。"));
    mainButton.current?.focus();
  };
  return <span className={`ai-tool-shortcut${compact ? " is-compact" : ""}${defaultTool ? " has-default" : ""}`}>
    <button
      aria-haspopup={defaultTool ? undefined : "dialog"}
      aria-label={defaultTool ? u("openAi", { context: contextLabel, tool: aiToolName(defaultTool) }) : u("connectAi", { context: contextLabel })}
      aria-busy={launching}
      className={defaultTool ? "ai-tool-shortcut-main" : `local-agent-trigger ${compact ? "discussion-ai" : "task-local-agent-trigger"}`}
      disabled={disabled || launching}
      onClick={() => defaultTool ? void launch(defaultTool) : showDialog()}
      ref={mainButton}
      title={defaultTool ? u("openAi", { context: contextLabel, tool: aiToolName(defaultTool) }) : u("connectAi", { context: contextLabel })}
      type="button"
    >
      {defaultTool ? (launching ? <LoaderCircle aria-hidden="true" className="ai-tool-shortcut-spinner" size={18} /> : <img alt="" src={agentIconUrls[defaultTool]} />) : <span aria-hidden="true" className="local-agent-trigger-mark"><SquareTerminal size={15} strokeWidth={1.7} /></span>}
    </button>
    {defaultTool && <Popover open={open} onOpenChange={next => { setOpen(next); if (next) handingFocusToDialog.current = false; }}>
      <PopoverTrigger aria-label={u("switchAi", { context: contextLabel })} className="ai-tool-shortcut-menu-trigger" disabled={disabled || launching} type="button"><ChevronDown aria-hidden="true" size={14} /></PopoverTrigger>
      <PopoverContent aria-label={ui("AI 工具")} align="end" className="ai-tool-shortcut-menu" finalFocus={() => handingFocusToDialog.current ? false : mainButton.current}>
        <header><span>{ui("在 AI 工具中打开")}</span></header>
        <ul>{preferences.order.map((agent, index) => <li key={agent}>
          <button className="ai-tool-menu-launch" onClick={() => void launch(agent)} type="button"><img alt="" src={agentIconUrls[agent]} /><span>{aiToolName(agent)}</span>{index === 0 && <small>{ui("最近使用")}</small>}</button>
        </li>)}</ul>
      </PopoverContent>
    </Popover>}
    {launching && <button aria-label={ui("取消打开 AI 工具")} className="ai-tool-shortcut-cancel" onClick={cancel} type="button"><X aria-hidden="true" size={14} /></button>}
    {isAiToolPreview && !compact && <small className="ai-tool-preview-mark">{ui("预览")}</small>}
    <span aria-live="polite" className="sr-only">{announcement}</span>
  </span>;
}
