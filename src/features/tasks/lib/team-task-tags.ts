import { z } from "zod";
import { tagIconNames, type TagDefinition } from "@/shared/model/task-model";

const nameSchema = z.string().trim().min(1).max(24);
const appearanceSchema = z.object({
  icon: z.enum(tagIconNames),
  color: z.enum(["gray", "blue", "cyan", "teal", "green", "amber", "orange", "red", "purple", "pink"]),
});
const tagSchema = appearanceSchema.extend({ id: z.string().min(1), name: nameSchema });
const teamTagSchema = tagSchema.extend({ creatorMemberId: z.string().min(1).optional() });
const catalogSchema = z.object({
  tags: z.array(teamTagSchema),
  archivedNames: z.array(nameSchema).default([]),
  archivedTags: z.array(teamTagSchema).default([]),
});

export type TeamTagDefinition = TagDefinition & { creatorMemberId?: string };
export type TeamTagActor = { memberId: string; role: "member" | "owner" | "admin" };
export type TeamTagCatalog = { tags: TeamTagDefinition[] };
export const getTeamTagStorageKey = (teamId: string) => `agentdoor-team-tags:${encodeURIComponent(teamId)}`;
export const teamTagNameKey = (name: string) => name.trim().normalize("NFKC").toLowerCase();

const canManageCatalog = (actor: TeamTagActor) => actor.role === "owner" || actor.role === "admin";

export function canManageTeamTag(actor: TeamTagActor | undefined, tag: TeamTagDefinition): boolean {
  return Boolean(actor?.memberId && (canManageCatalog(actor) || actor.memberId === tag.creatorMemberId));
}

export function canDeleteTeamTag(actor: TeamTagActor | undefined, tag: TeamTagDefinition, used: boolean): boolean {
  return Boolean(actor?.memberId && (canManageCatalog(actor) || (!used && actor.memberId === tag.creatorMemberId)));
}

export function readTeamTagCatalog(raw: string | null, seed: TagDefinition[]): TeamTagCatalog {
  if (raw === null) return { tags: seed };
  const { tags, archivedNames, archivedTags } = catalogSchema.parse(JSON.parse(raw));
  // Older catalogs kept archived labels attached to tasks. Keep those records available for an explicit deletion.
  const candidates = [...tags, ...archivedTags, ...archivedNames.map((name): TeamTagDefinition => ({ id: "", name, icon: "tag", color: "gray" }))];
  const reservedIds = new Set(candidates.map(tag => tag.id));
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const restored: TeamTagDefinition[] = [];
  for (const tag of candidates) {
    const key = teamTagNameKey(tag.name);
    if (seenNames.has(key)) continue;
    let id = tag.id;
    if (!id || seenIds.has(id)) {
      const base = `legacy-team-tag:${key}`;
      id = base;
      for (let suffix = 2; reservedIds.has(id); suffix++) id = `${base}:${suffix}`;
      reservedIds.add(id);
    }
    seenIds.add(id);
    seenNames.add(key);
    restored.push({ ...tag, id });
  }
  return { tags: restored };
}

export function addTeamTag(
  catalog: TeamTagCatalog,
  input: string,
  actor: TeamTagActor,
  appearance?: Pick<TagDefinition, "icon" | "color">,
): { catalog: TeamTagCatalog; tag: TeamTagDefinition } {
  if (!actor?.memberId) throw new Error("当前没有创建团队标签的权限。");
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) throw new Error("标签名称须为 1–24 个字符。");
  const key = teamTagNameKey(parsed.data);
  const existing = catalog.tags.find(tag => teamTagNameKey(tag.name) === key);
  if (existing) return { catalog, tag: existing };
  const tag: TeamTagDefinition = {
    ...appearanceSchema.parse(appearance ?? { icon: "tag", color: "blue" }),
    id: crypto.randomUUID(),
    name: parsed.data,
    creatorMemberId: actor.memberId,
  };
  return {
    catalog: { tags: [tag, ...catalog.tags] },
    tag,
  };
}

export function deleteTeamTag(catalog: TeamTagCatalog, tagId: string, actor: TeamTagActor, used: boolean): { catalog: TeamTagCatalog; tag: TeamTagDefinition } {
  const tag = catalog.tags.find(item => item.id === tagId);
  if (!tag) throw new Error("标签已不存在，请刷新后重试。");
  if (!canDeleteTeamTag(actor, tag, used)) throw new Error("当前没有删除此标签的权限。");
  return { catalog: { tags: catalog.tags.filter(item => item.id !== tagId) }, tag };
}

export function updateTeamTagCatalog(current: TeamTagCatalog, tags: TagDefinition[], actor: TeamTagActor): { catalog: TeamTagCatalog; renames: Map<string, string> } {
  if (!actor?.memberId) throw new Error("当前没有维护团队标签的权限。");
  const next = z.array(tagSchema).parse(tags);
  const activeNames = new Set(next.map(tag => teamTagNameKey(tag.name)));
  if (activeNames.size !== next.length) throw new Error("团队中已有同名标签。");
  const nextById = new Map(next.map(tag => [tag.id, tag]));
  if (nextById.size !== next.length) throw new Error("团队标签出现重复标识。");
  const currentById = new Map(current.tags.map(tag => [tag.id, tag]));
  const renames = new Map<string, string>();
  for (const tag of current.tags) {
    const updated = nextById.get(tag.id);
    if (!updated) throw new Error("请使用标签的删除操作。");
    if (updated.name === tag.name && updated.icon === tag.icon && updated.color === tag.color) continue;
    if (!canManageTeamTag(actor, tag)) throw new Error("当前没有修改此标签的权限。");
    if (updated.name !== tag.name) renames.set(tag.name, updated.name);
  }
  if (!canManageCatalog(actor)) {
    const nextOrder = next.filter(tag => currentById.has(tag.id));
    if (current.tags.some((tag, index) => tag.id !== nextOrder[index]?.id)) throw new Error("当前没有调整团队标签顺序的权限。");
  }

  const nextTags = next.map(tag => {
    const previous = currentById.get(tag.id);
    const creatorMemberId = previous ? previous.creatorMemberId : actor.memberId;
    return creatorMemberId ? { ...tag, creatorMemberId } : tag;
  });
  return { catalog: { tags: nextTags }, renames };
}
