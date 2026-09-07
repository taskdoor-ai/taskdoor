import { normalizeTags, type TagDefinition } from "../data/tagGroups.ts";
import type { TaskPlanDraft } from "./taskAssistantProtocol.ts";

export const getPersonalTagStorageKey = (userId: string) => `agentdoor-personal-tags:${encodeURIComponent(userId)}`;

export function loadPersonalTags(storage: Pick<Storage, "getItem">, userId: string, fallback: TagDefinition[]): TagDefinition[] {
  const saved = storage.getItem(getPersonalTagStorageKey(userId));
  if (saved === null) return fallback;
  const value: unknown = JSON.parse(saved);
  if (!Array.isArray(value)) throw new Error("个人标签记录无法读取，请检查本地存储。");
  return normalizeTags(value);
}

export const normalizePersonalTagNames = (names: string[]) => [...new Set(names.map(name => name.trim()).filter(name => name.length > 0 && name.length <= 24))];

/** Applies AI maintenance only to the caller's personal catalog and new draft. */
export function preparePersonalTaskTags(current: TagDefinition[], plan: TaskPlanDraft): { tags: TagDefinition[]; draft: TaskPlanDraft } {
  let tags = current.map(tag => ({ ...tag }));
  let draft = { ...plan, mainTask: { ...plan.mainTask }, subtasks: plan.subtasks.map(task => ({ ...task })) };
  const mapNames = (transform: (names: string[]) => string[]) => {
    draft = { ...draft, mainTask: { ...draft.mainTask, labels: transform(draft.mainTask.labels) }, subtasks: draft.subtasks.map(task => ({ ...task, labels: transform(task.labels) })) };
  };
  mapNames(normalizePersonalTagNames);
  for (const operation of plan.tagOperations ?? []) {
    const name = operation.name.trim();
    if (!name || name.length > 24) throw new Error("标签名称须为 1–24 个字符。");
    const existing = tags.find(tag => tag.name === name);
    if (operation.action === "delete") {
      tags = tags.filter(tag => tag.name !== name);
      mapNames(names => names.filter(item => item !== name));
    } else if (operation.action === "rename") {
      const next = operation.newName?.trim();
      if (!next || next.length > 24) throw new Error("请提供有效的新标签名称。");
      if (!existing) throw new Error(`标签「${name}」已变化，请重新生成方案。`);
      if (tags.some(tag => tag.name === next && tag.id !== existing.id)) throw new Error(`标签「${next}」已存在。`);
      tags = tags.map(tag => tag.id === existing.id ? { ...tag, name: next } : tag);
      mapNames(names => [...new Set(names.map(item => item === name ? next : item))]);
    } else {
      const updated: TagDefinition = {
        id: existing?.id ?? crypto.randomUUID(), name,
        icon: operation.icon ?? existing?.icon ?? "tag",
        color: operation.color ?? existing?.color ?? "blue",
      };
      tags = existing ? tags.map(tag => tag.id === existing.id ? updated : tag) : [...tags, updated];
    }
  }
  for (const name of normalizePersonalTagNames([draft.mainTask, ...draft.subtasks].flatMap(task => task.labels))) {
    if (!tags.some(tag => tag.name === name)) tags.push({ id: crypto.randomUUID(), name, icon: "tag", color: "blue" });
  }
  return { tags, draft };
}
