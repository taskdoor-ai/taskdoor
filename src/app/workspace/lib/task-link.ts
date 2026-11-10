import type { NotificationRegionTarget } from "@/features/notifications/lib/notification-read-state";

/** A link that opens one task, and optionally a message in its discussion or one of its files, in its team. */
export type TaskLink = { teamId: string; taskId: string; target?: NotificationRegionTarget };

const keys = { team: "team", task: "task", message: "message", file: "file" } as const;

export function taskLinkHref(link: TaskLink, base: string = window.location.pathname) {
  const params = new URLSearchParams({ [keys.team]: link.teamId, [keys.task]: link.taskId });
  if (link.target?.area === "discussion" && link.target.activityId) params.set(keys.message, link.target.activityId);
  if (link.target?.area === "files" && link.target.fileId) params.set(keys.file, link.target.fileId);
  return `${base}?${params.toString()}`;
}

export function readTaskLink(search: string): TaskLink | null {
  const params = new URLSearchParams(search);
  const teamId = params.get(keys.team)?.trim();
  const taskId = params.get(keys.task)?.trim();
  if (!teamId || !taskId) return null;
  const message = params.get(keys.message)?.trim();
  const file = params.get(keys.file)?.trim();
  const target: NotificationRegionTarget | undefined = message ? { area: "discussion", activityId: message } : file ? { area: "files", fileId: file } : undefined;
  return { teamId, taskId, ...(target ? { target } : {}) };
}

/** The address without the link's parameters, once it has been opened. */
export function withoutTaskLink(location: Pick<Location, "pathname" | "search" | "hash">) {
  const params = new URLSearchParams(location.search);
  for (const key of Object.values(keys)) params.delete(key);
  const rest = params.toString();
  return `${location.pathname}${rest ? `?${rest}` : ""}${location.hash}`;
}
