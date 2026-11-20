import { useState } from "react";
import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";
import { relativeTaskTime } from "@/features/tasks/lib/relative-time";
import { useI18n } from "@/shared/i18n/I18nProvider";

export function DiscussionTimestamp({ message, now }: { message: CollaborationMessage; now: number }) {
  const { locale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const recorded = message.createdAt ?? (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(message.time) ? `${message.time.replace(" ", "T")}+08:00` : "");
  const timestamp = relativeTaskTime(recorded, locale, now);
  if (!timestamp) return null;
  const action = locale === "en" ? expanded ? "Show relative time" : "Show exact time" : expanded ? "显示相对时间" : "显示具体时间";
  return <button aria-label={`${timestamp.full}，${action}`} aria-pressed={expanded} className="discussion-timestamp" onClick={() => setExpanded(value => !value)} title={action} type="button">
    <time aria-label={timestamp.full} dateTime={new Date(recorded).toISOString()} title={timestamp.full}>{expanded ? timestamp.full : timestamp.label}</time>
  </button>;
}
