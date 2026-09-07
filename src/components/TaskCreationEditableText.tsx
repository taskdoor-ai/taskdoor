import { useEffect, useRef } from "react";
import { Textarea } from "./ui/input";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  id?: string;
  disabled?: boolean;
};

// Main and subtask fields share the same single-line, content-sized editor.
export function TaskCreationEditableText({ label, value, onChange, className = "", placeholder, autoFocus = false, id, disabled = false }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = () => { element.style.height = "0px"; element.style.height = `${element.scrollHeight + 2}px`; };
    resize();
    let observedWidth = -1;
    let frame = 0;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width === observedWidth) return;
      observedWidth = entry.contentRect.width;
      // Observe width only so changing the text height cannot create a resize loop.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    });
    const parent = element.parentElement;
    if (parent) observer.observe(parent);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);
  return <Textarea aria-label={label} autoFocus={autoFocus} className={`creation-edit ${className}`} disabled={disabled} id={id} onChange={event => onChange(event.target.value)} placeholder={placeholder} ref={ref} rows={1} value={value} />;
}
