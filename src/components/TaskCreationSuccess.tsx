import { ArrowRight, CheckCircle2, X } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";
import { PersonAvatar } from "./PersonAvatar";

type TaskCreationSuccessProps = {
  childReferenceCount: number;
  childTaskCount: number;
  creator: string;
  onClose: () => void;
  onContinue: () => void;
  owner: string;
  parentTaskLabel?: string;
  periodLabel: string;
  referenceCount: number;
  title: string;
};

const confetti = Array.from({ length: 100 }, (_, index) => ({
  color: ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6", "#f97316"][index % 6],
  delay: `${((index * 17) % 21) / 10}s`,
  drift: `${-90 + ((index * 37) % 180)}px`,
  duration: `${2.8 + ((index * 13) % 24) / 10}s`,
  height: `${9 + ((index * 7) % 8)}px`,
  left: `${1 + ((index * 29) % 98)}%`,
  rotate: `${(index * 47) % 360}deg`,
  width: `${5 + ((index * 11) % 5)}px`,
}));

export function TaskCreationSuccess({ childReferenceCount, childTaskCount, creator, onClose, onContinue, owner, parentTaskLabel, periodLabel, referenceCount, title }: TaskCreationSuccessProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.focus();

    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1) ?? first;
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", keepFocusInside);
    return () => {
      document.removeEventListener("keydown", keepFocusInside);
      previousFocus?.focus();
    };
  }, []);

  return (
    <div className="task-created-overlay">
      <button aria-label="关闭创建成功提示" className="task-created-backdrop" onClick={onClose} type="button" />
      <div aria-hidden="true" className="task-created-confetti">
        {confetti.map((piece, index) => <i key={index} style={{ "--confetti-color": piece.color, "--confetti-delay": piece.delay, "--confetti-drift": piece.drift, "--confetti-duration": piece.duration, "--confetti-height": piece.height, "--confetti-left": piece.left, "--confetti-rotate": piece.rotate, "--confetti-width": piece.width } as CSSProperties} />)}
      </div>

      <section aria-describedby="task-created-description" aria-labelledby="task-created-title" aria-modal="true" className="task-created-ticket" ref={dialogRef} role="dialog" tabIndex={-1}>
        <button aria-label="关闭" className="task-created-close" onClick={onClose} type="button"><X /></button>

        <header>
          <span><CheckCircle2 /></span>
          <h2 id="task-created-title">任务创建成功</h2>
          <p id="task-created-description">{childTaskCount ? "父任务与子任务已按确认结构建立，文件引用已保存。" : "任务已建立，文件引用已按确认结果保存。"}</p>
        </header>

        <div className="task-created-dash" />

        <div className="task-created-content">
          <small>{childTaskCount ? "父任务" : "正式任务"}</small>
          <strong>{title}</strong>

          <dl>
            <div><dt>创建者</dt><dd>{creator}</dd></div>
            <div><dt>唯一 Owner</dt><dd>{owner}</dd></div>
            <div><dt>任务周期</dt><dd>{periodLabel}</dd></div>
            {childTaskCount > 0 && <div><dt>任务结构</dt><dd>{childTaskCount} 个子任务已创建</dd></div>}
            {childReferenceCount > 0 && <div><dt>子任务引用</dt><dd>{childReferenceCount} 处文件引用已建立</dd></div>}
            {parentTaskLabel && <div><dt>上级任务</dt><dd>{parentTaskLabel}</dd></div>}
            {referenceCount > 0 && <div><dt>文件引用</dt><dd>{referenceCount} 份</dd></div>}
          </dl>

          <div className="task-created-people">
            <span className="task-created-avatar-stack"><PersonAvatar name={owner} size="xs" /></span>
            <p><strong>{owner} 是{childTaskCount ? "父任务" : "任务"}的唯一 Owner</strong><small>{childTaskCount ? "子任务与文件引用按确认结果建立；成员邀请需接受后才生效，且不自动扩大文件权限" : "文件引用按确认结果建立；成员邀请需接受后才生效，且不会自动扩大文件权限"}</small></p>
          </div>
        </div>

        <div className="task-created-dash" />

        <footer>
          <button onClick={onContinue} type="button"><span>查看任务详情</span><ArrowRight /></button>
        </footer>
      </section>
    </div>
  );
}
