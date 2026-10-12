import type { TaskIconName, TaskIconTone } from "@/shared/model/task-model";
import { customTaskToneStyle, taskIconOptions } from "@/shared/model/appearance-options";
export { taskIconOptions, taskIconToneOptions } from "@/shared/model/appearance-options";

export function TaskIcon({ iconName = "list-todo", size = "sm", tone = "neutral", progressRatio }: { iconName?: TaskIconName; size?: "sm" | "lg"; tone?: TaskIconTone; progressRatio?: number | null }) {
  const Icon = (taskIconOptions.find(option => option.value === iconName) ?? taskIconOptions[0]).icon;
  return <span aria-hidden="true" className={`task-icon task-round-icon ${size}`} data-tone={tone} style={tone.startsWith("#") ? { ...customTaskToneStyle(tone), color: tone, background: "var(--task-accent-bg)" } : undefined}>{progressRatio !== undefined && <svg className="task-icon-progress-ring" viewBox="0 0 28 28">{[0,1,2,3].map(segment => <circle key={segment} cx="14" cy="14" r="12.5" pathLength="100" strokeDasharray="20 80" strokeDashoffset={-segment * 25} data-filled={segment < (progressRatio ?? 0) * 4} />)}</svg>}<Icon size={size === "lg" ? 18 : 15} strokeWidth={1.8} /></span>;
}
