import type { TaskIconName, TaskIconTone } from "@/shared/model/task-model";

export type TeamIconName = TaskIconName | "building" | "blocks" | "factory" | "headphones";
export type TeamAppearance = { iconName?: TeamIconName; iconTone: TaskIconTone; avatarDataUrl?: string };
