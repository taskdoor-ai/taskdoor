// The demo's discussion text reader stays behind the AI layer.
import { useContext, useEffect, useRef, useState } from "react";
import { CurrentTaskContext, useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { contentReading, needsContentTranslation } from "@/ai/mock/i18n/contentReading";
import { useI18n } from "@/shared/i18n/I18nProvider";
export { useMockText } from "@/ai/mock/i18n/MockDataProvider";
export { contentReading } from "@/ai/mock/i18n/contentReading";

type DiscussionSource = { id: string; message: string; updatedAt?: string; deletedAt?: string };

/** Manual reads never enable the global preference or fetch translations for other messages. */
export function useDiscussionReading(message: DiscussionSource) {
  const mock = useMockText();
  const { locale, autoTranslate } = useI18n();
  const taskId = useContext(CurrentTaskContext);
  const source = message.deletedAt ? "" : message.message;
  const key = JSON.stringify([taskId, message.id, message.updatedAt, source, locale, autoTranslate]);
  const currentKey = useRef<string | null>(key);
  currentKey.current = key;
  const activeRequest = useRef<{ key: string } | null>(null);
  const [manual, setManual] = useState<{ key: string; text: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [originalKey, setOriginalKey] = useState<string | null>(null);
  const needsTranslation = !message.deletedAt && needsContentTranslation(source, locale);
  const manualText = manual?.key === key ? manual.text : source;
  const candidate = needsTranslation && autoTranslate ? mock.discussionTranslation(source) : manualText;
  const enabled = needsTranslation && (autoTranslate || manual?.key === key);
  const reading = contentReading(source, candidate, locale, enabled, originalKey === key);
  const canTranslate = needsTranslation && (reading.state === "off" || reading.state === "unavailable");
  const translating = pendingKey === key;
  useEffect(() => {
    currentKey.current = key;
    return () => { if (currentKey.current === key) currentKey.current = null; };
  }, [key]);

  const translate = async () => {
    if (!canTranslate || activeRequest.current?.key === key) return;
    const request = { key };
    activeRequest.current = request;
    setPendingKey(key);
    let text = source;
    try {
      text = await Promise.resolve().then(() => currentKey.current === key ? mock.translateDiscussion(source) : source);
    } catch { /* Failed or missing translations retain the original and remain retryable. */ }
    if (activeRequest.current !== request) return;
    activeRequest.current = null;
    setPendingKey(previous => previous === key ? null : previous);
    if (currentKey.current !== key) return;
    setManual({ key, text });
    setOriginalKey(null);
  };
  const toggleOriginal = () => setOriginalKey(previous => previous === key ? null : key);
  return { ...reading, canTranslate, translating, translate, toggleOriginal };
}
