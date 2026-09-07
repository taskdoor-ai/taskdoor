import { ArrowUp, Paperclip, Sparkles, Square, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type RefObject } from "react";

type AnimatedAgentChatInputProps = {
  actionRef?: RefObject<HTMLButtonElement | null>;
  ariaLabel?: string;
  autoFocus?: boolean;
  allowAttachments?: boolean;
  clearOnSend?: boolean;
  disabled?: boolean;
  hint?: string;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  onChange?: (value: string) => void;
  onSend: (content: string) => void;
  onStop?: () => void;
  placeholder?: string;
  status?: "analyzing" | "ready";
  suggestions?: string[];
  sendLabel?: string;
  value?: string;
};

type LocalAttachment = { id: string; name: string };

export const AnimatedAgentChatInput = memo(function AnimatedAgentChatInput({
  actionRef,
  ariaLabel = "给 AgentDoor 发消息",
  autoFocus = true,
  allowAttachments = true,
  clearOnSend = true,
  disabled = false,
  hint = "Enter 发送 · Shift + Enter 换行",
  inputRef,
  onChange,
  onSend,
  onStop,
  placeholder = "告诉 AgentDoor 你想推进什么…",
  status = "ready",
  suggestions = [],
  sendLabel = "发送",
  value: controlledValue,
}: AnimatedAgentChatInputProps) {
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [internalValue, setInternalValue] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef ?? internalTextareaRef;
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const isAnalyzing = status === "analyzing";
  const canSend = value.trim().length > 0 && !isAnalyzing && !disabled;

  const setValue = useCallback((next: string) => {
    if (isControlled) onChange?.(next);
    else setInternalValue(next);
  }, [isControlled, onChange]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 72), 180)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 180 ? "auto" : "hidden";
  }, [textareaRef, value]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus, textareaRef]);

  const submit = useCallback((content = value) => {
    const nextContent = content.trim();
    if (!nextContent || isAnalyzing || disabled) return;
    onSend(nextContent);
    if (clearOnSend) {
      setValue("");
      setAttachments([]);
    }
  }, [clearOnSend, disabled, isAnalyzing, onSend, setValue, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setAttachments((current) => [...current, ...files.map((file) => ({ id: crypto.randomUUID(), name: file.name }))]);
    event.target.value = "";
  };

  return <div className="animated-agent-chat" data-state={isAnalyzing ? "analyzing" : disabled ? "disabled" : "ready"}>
    <div className="animated-agent-chat-shell" onClick={() => textareaRef.current?.focus()}>
      {allowAttachments && attachments.length > 0 && <div className="animated-agent-attachments">{attachments.map((attachment) => <span key={attachment.id}><Paperclip aria-hidden="true" /><em>{attachment.name}</em><button aria-label={`移除 ${attachment.name}`} onClick={(event) => { event.stopPropagation(); setAttachments((current) => current.filter((item) => item.id !== attachment.id)); }} type="button"><X /></button></span>)}</div>}
      <textarea aria-label={ariaLabel} disabled={isAnalyzing || disabled} onChange={(event) => setValue(event.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} ref={textareaRef} rows={1} value={value} />
      <footer>
        {allowAttachments && <div className="animated-agent-tools">
          <input hidden multiple onChange={handleFiles} ref={fileRef} type="file" />
          <button aria-label="添加参考资料" disabled={isAnalyzing || disabled} onClick={(event) => { event.stopPropagation(); fileRef.current?.click(); }} title="添加参考资料" type="button"><Paperclip /></button>
        </div>}
        <span>{hint}</span>
        <button aria-label={isAnalyzing ? "停止处理" : sendLabel} className="animated-agent-send" disabled={disabled || (!canSend && !isAnalyzing)} onClick={(event) => { event.stopPropagation(); if (isAnalyzing) onStop?.(); else submit(); }} ref={actionRef} type="button">{isAnalyzing ? <Square fill="currentColor" /> : <ArrowUp />}</button>
      </footer>
    </div>
    {suggestions.length > 0 && !value && !isAnalyzing && !disabled && <div aria-label="快捷指令" className="animated-agent-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => submit(suggestion)} type="button"><Sparkles aria-hidden="true" />{suggestion}</button>)}</div>}
  </div>;
});
