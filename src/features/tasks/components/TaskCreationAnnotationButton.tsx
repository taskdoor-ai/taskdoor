import { MessageSquarePlus } from "lucide-react";
import { useId } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Button } from "@/shared/ui/button";

type Props = {
  label?: string;
  count?: number;
  disabled?: boolean;
  targetKey?: string;
  onClick: (anchor: HTMLElement) => void;
};

export function TaskCreationAnnotationButton({ label, count = 0, disabled = false, targetKey, onClick }: Props) {
  const { locale } = useI18n();
  const tooltipId = useId();
  const taskLabel = label || (locale === "en" ? "Untitled task" : "未命名任务");
  const tooltip = locale === "en" ? "Annotate" : "标注";
  const targetLabel = `${tooltip}${locale === "en" ? ": " : "："}${taskLabel}`;
  const accessibleLabel = count ? `${targetLabel}${locale === "en" ? `, ${count} saved annotations` : `，已添加 ${count} 条标注`}` : targetLabel;

  return <span className="creation-annotation-trigger-wrap">
    <Button aria-describedby={tooltipId} aria-label={accessibleLabel} className={`creation-annotation-trigger${count ? " has-opinions" : ""}`} data-annotation-target={targetKey} disabled={disabled} onClick={event => onClick(event.currentTarget)} size="icon-xs" type="button" variant="ghost">
      <MessageSquarePlus aria-hidden="true" size={15} />
      {count > 0 && <span aria-hidden="true" className="creation-annotation-count">{count}</span>}
    </Button>
    <span className="creation-annotation-tooltip" id={tooltipId} role="tooltip">{tooltip}</span>
  </span>;
}
