import { useEffect, useRef, useState, type RefObject } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { aiTransferMessage } from "@/features/ai-connection/i18n/ai-transfer-copy";
import { aiToolName, type AiTool } from "@/features/ai-connection/lib/ai-tools";
import { aiToolPreferences, type AiToolPreferenceStore } from "@/features/ai-connection/lib/ai-tool-preferences";
import { useAiToolPreferences } from "@/features/ai-connection/lib/useAiToolPreferences";
import type { AiConnectionHandler } from "@/features/ai-connection/components/AiConnectionDialog";
import { toast } from "@/shared/ui/toast";

/** Keep the attempt in the source component, outside transient menu portals. */
export function useAiConnectionAction({ onConnect, triggerRef, onStart, disabled = false, preferenceStore = aiToolPreferences }: {
  onConnect?: AiConnectionHandler;
  triggerRef: RefObject<HTMLElement | null>;
  onStart?: () => void;
  disabled?: boolean;
  preferenceStore?: AiToolPreferenceStore;
}) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const preferences = useAiToolPreferences(preferenceStore);
  const [launching, setLaunching] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const attempt = useRef<AbortController | null>(null);
  useEffect(() => () => { attempt.current?.abort(); }, []);
  useEffect(() => {
    if (!disabled) return;
    attempt.current?.abort(); attempt.current = null; setLaunching(false);
  }, [disabled]);
  const launch = async (agent: AiTool | null) => {
    if (disabled || !onConnect || attempt.current || !triggerRef.current) return;
    const trigger = triggerRef.current;
    const controller = new AbortController();
    attempt.current = controller;
    setLaunching(true);
    onStart?.();
    try {
      const result = await onConnect(trigger, { agent, signal: controller.signal });
      if (controller.signal.aborted || result?.status === "cancelled") return;
      const message = result ? (agent ? aiTransferMessage(locale, result, aiToolName(agent)) : result.message) : ui("当前内容暂不可用，请稍后重试。");
      if (result?.status === "copied") toast.success(message);
      else if (result?.status === "open-attempted" || result?.status === "preview") toast.info(message);
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
    triggerRef.current?.focus();
  };
  return { preferences, launching, announcement, launch, cancel };
}
