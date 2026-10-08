import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { memo, useState, type ReactNode } from "react";

type AIMessageProps = {
  children: ReactNode;
  copyText?: string;
  from: "assistant" | "user";
  onRetry?: () => void;
  onVote?: (vote: "down" | "up") => void;
  timestamp?: string;
};

export const AIMessage = memo(function AIMessage({ children, copyText, from, onRetry, onVote, timestamp }: AIMessageProps) {
  const [copied, setCopied] = useState(false);
  const hasActions = from === "assistant" && Boolean(copyText || onRetry || onVote);

  const copyMessage = async () => {
    if (!copyText) return;
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return <article aria-label={from === "assistant" ? "助手消息" : "你的消息"} className={`ai-message ai-message-${from}`}>
    <p className="ai-message-bubble">{children}</p>
    {(timestamp || hasActions) && <footer className="ai-message-meta">
      {timestamp && <time>{timestamp}</time>}
      {hasActions && <div aria-label="消息操作" className="ai-message-actions">
        {copyText && <button aria-label={copied ? "已复制" : "复制"} onClick={() => void copyMessage()} type="button">{copied ? <Check /> : <Copy />}</button>}
        {onRetry && <button aria-label="重试" onClick={onRetry} type="button"><RotateCcw /></button>}
        {onVote && <><button aria-label="回答有帮助" onClick={() => onVote("up")} type="button"><ThumbsUp /></button><button aria-label="回答没有帮助" onClick={() => onVote("down")} type="button"><ThumbsDown /></button></>}
      </div>}
    </footer>}
  </article>;
});
