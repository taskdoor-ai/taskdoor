import { useI18n } from "@/shared/i18n/I18nProvider";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useRemainingCopy } from "@/shared/i18n/remaining-messages";
import { ChevronDown, Clipboard, LoaderCircle, X } from "lucide-react";
import { useRef, useState } from "react";
import { agentIconUrls } from "@/features/ai-connection/agent-icons";
import { aiToolName } from "@/features/ai-connection/lib/ai-tools";
import { aiToolPreferences, defaultAiTool, isAiToolPreview, type AiToolPreferenceStore } from "@/features/ai-connection/lib/ai-tool-preferences";
import { useAiConnectionAction } from "@/features/ai-connection/lib/useAiConnectionAction";
import type { AiConnectionHandler } from "@/features/ai-connection/components/AiConnectionDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

type Props = {
  contextLabel: string;
  onConnect: AiConnectionHandler;
  compact?: boolean;
  disabled?: boolean;
  preferenceStore?: AiToolPreferenceStore;
};

export function AiConnectionButton({ contextLabel, onConnect, compact = false, disabled = false, preferenceStore = aiToolPreferences }: Props) {
  const { locale } = useI18n();
  const ui = useGlobalUi();
  const u = useRemainingCopy();
  const [open, setOpen] = useState(false);
  const mainButton = useRef<HTMLButtonElement>(null);
  const { preferences, launching, announcement, launch, cancel } = useAiConnectionAction({
    onConnect, triggerRef: mainButton, disabled, preferenceStore, onStart: () => setOpen(false),
  });
  const defaultTool = defaultAiTool(preferences);
  return <span className={`ai-tool-shortcut has-default${compact ? " is-compact" : ""}`}>
    <button
      aria-label={u("openAi", { context: contextLabel, tool: aiToolName(defaultTool) })}
      aria-busy={launching}
      className="ai-tool-shortcut-main"
      disabled={disabled || launching}
      onClick={() => void launch(defaultTool)}
      ref={mainButton}
      title={u("openAi", { context: contextLabel, tool: aiToolName(defaultTool) })}
      type="button"
    >
      {launching ? <LoaderCircle aria-hidden="true" className="ai-tool-shortcut-spinner" size={18} /> : <img alt="" data-agent-icon={defaultTool} src={agentIconUrls[defaultTool]} />}
    </button>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label={u("switchAi", { context: contextLabel })} className="ai-tool-shortcut-menu-trigger" disabled={disabled || launching} type="button"><ChevronDown aria-hidden="true" size={14} /></PopoverTrigger>
      <PopoverContent aria-label={ui("AI 工具")} align="end" className="ai-tool-shortcut-menu" finalFocus={() => mainButton.current}>
        <header><span>{ui("在 AI 工具中打开")}</span></header>
        <ul>{preferences.order.map(agent => <li key={agent}>
          <button className="ai-tool-menu-launch" onClick={() => void launch(agent)} type="button"><img alt="" data-agent-icon={agent} src={agentIconUrls[agent]} /><span>{aiToolName(agent)}</span>{preferences.used[0] === agent && <small>{ui("最近使用")}</small>}</button>
        </li>)}</ul>
        <footer>
          <button onClick={() => void launch(null)} type="button"><Clipboard aria-hidden="true" size={16} />{locale === "en" ? "Copy as prompt" : "复制提示词"}</button>
        </footer>
      </PopoverContent>
    </Popover>
    {launching && <button aria-label={ui("取消打开 AI 工具")} className="ai-tool-shortcut-cancel" onClick={cancel} type="button"><X aria-hidden="true" size={14} /></button>}
    {isAiToolPreview && !compact && <small className="ai-tool-preview-mark">{ui("预览")}</small>}
    <span aria-live="polite" className="sr-only">{announcement}</span>
  </span>;
}
