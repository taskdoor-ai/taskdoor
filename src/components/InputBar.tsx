import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

// Adapted from 21st.dev Input Bar #12400 by serafimcloud.
// Preserved: controlled/uncontrolled value, auto-resize, Enter submit,
// Shift+Enter newline, attachment chips, and send/stop state semantics.

export type InputStatus = "ready" | "analyzing";

export type InputAttachment = {
  id: string;
  name: string;
  size: number;
};

type InputBarProps = {
  value?: string;
  onChange?: (value: string) => void;
  onSend: (content: string) => void;
  onStop?: () => void;
  onAttach?: (files: FileList) => void;
  onRemoveAttachment?: (id: string) => void;
  attachments?: InputAttachment[];
  status?: InputStatus;
  placeholder?: string;
  autoFocus?: boolean;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const InputBar = memo(function InputBar({
  value: controlledValue,
  onChange,
  onSend,
  onStop,
  onAttach,
  onRemoveAttachment,
  attachments = [],
  status = "ready",
  placeholder = "描述你想解决的问题…",
  autoFocus = true,
}: InputBarProps) {
  const [internalValue, setInternalValue] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const isAnalyzing = status === "analyzing";
  const canSend = value.trim().length > 0 && !isAnalyzing;

  const setValue = useCallback(
    (next: string) => {
      if (isControlled) onChange?.(next);
      else setInternalValue(next);
    },
    [isControlled, onChange],
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, 168);
    textarea.style.height = `${Math.max(nextHeight, 56)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 168 ? "auto" : "hidden";
  }, [value]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const submit = useCallback(() => {
    const content = value.trim();
    if (!content || isAnalyzing) return;
    onSend(content);
    setValue("");
  }, [isAnalyzing, onSend, setValue, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) onAttach?.(event.target.files);
    event.target.value = "";
  };

  return (
    <div className="input-bar" onClick={() => textareaRef.current?.focus()}>
      {attachments.length > 0 && (
        <div className="attachment-row">
          {attachments.map((attachment) => (
            <div className="attachment-chip" key={attachment.id}>
              <span className="attachment-name">{attachment.name}</span>
              <span className="attachment-size">{formatBytes(attachment.size)}</span>
              <button
                aria-label={`移除 ${attachment.name}`}
                className="attachment-remove"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveAttachment?.(attachment.id);
                }}
                type="button"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        aria-label="描述问题"
        disabled={isAnalyzing}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={textareaRef}
        rows={1}
        value={value}
      />

      <div className="input-toolbar">
        <div className="input-tools-left">
          <input
            hidden
            multiple
            onChange={handleFileChange}
            ref={fileRef}
            type="file"
          />
          <button
            aria-label="添加参考资料"
            className="icon-button"
            disabled={isAnalyzing}
            onClick={(event) => {
              event.stopPropagation();
              fileRef.current?.click();
            }}
            type="button"
          >
            <Paperclip size={17} />
          </button>
          <span className="input-hint">Enter 发送 · Shift + Enter 换行</span>
        </div>

        <button
          aria-label={isAnalyzing ? "停止分析" : "开始分析"}
          className={`send-button ${canSend || isAnalyzing ? "active" : ""}`}
          disabled={!canSend && !isAnalyzing}
          onClick={(event) => {
            event.stopPropagation();
            if (isAnalyzing) onStop?.();
            else submit();
          }}
          type="button"
        >
          {isAnalyzing ? <Square fill="currentColor" size={12} /> : <ArrowUp size={17} />}
        </button>
      </div>
    </div>
  );
});
