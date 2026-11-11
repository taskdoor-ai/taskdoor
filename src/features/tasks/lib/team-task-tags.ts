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
  archivedNames: z.array(nameSchema),
  archivedTags: z.array(teamTagSchema).optional(),
});

export type TeamTagDefinition = TagDefinition & { creatorMemberId?: string };
export type TeamTagActor = { memberId: string; role: "member" | "owner" | "admin" };
export type TeamTagCatalog = { tags: TeamTagDefinition[]; archivedNames: string[]; archivedTags?: TeamTagDefinition[] };
export const getTeamTagStorageKey = (teamId: string) => `agentdoor-team-tags:${encodeURIComponent(teamId)}`;
export const teamTagNameKey = (name: string) => name.trim().normalize("NFKC").toLowerCase();

const canManageCatalog = (actor: TeamTagActor) => actor.role === "owner" || actor.role === "admin";

export function canManageTeamTag(actor: TeamTagActor | undefined, tag: TeamTagDefinition): boolean {
  return Boolean(actor?.memberId && (canManageCatalog(actor) || actor.memberId === tag.creatorMemberId));
}

const archivedNameKeys = (catalog: TeamTagCatalog) => new Set([
  ...catalog.archivedNames,
  ...(catalog.archivedTags ?? []).map(tag => tag.name),
].map(teamTagNameKey));

export function readTeamTagCatalog(raw: string | null, seed: TagDefinition[]): TeamTagCatalog {
  if (raw === null) return { tags: seed, archivedNames: [] };
  return catalogSchema.parse(JSON.parse(raw));
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
  if (archivedNameKeys(catalog).has(key)) throw new Error("同名标签已归档，请使用其他名称。");
  const tag: TeamTagDefinition = {
    ...appearanceSchema.parse(appearance ?? { icon: "tag", color: "blue" }),
    id: crypto.randomUUID(),
    name: parsed.data,
    creatorMemberId: actor.memberId,
  };
  return {
    catalog: { ...catalog, tags: [tag, ...catalog.tags] },
    tag,
  };
}

export function updateTeamTagCatalog(current: TeamTagCatalog, tags: TagDefinition[], actor: TeamTagActor): { catalog: TeamTagCatalog; renames: Map<string, string> } {
  if (!actor?.memberId) throw new Error("当前没有维护团队标签的权限。");
  const next = z.array(tagSchema).parse(tags);
  const activeNames = new Set(next.map(tag => teamTagNameKey(tag.name)));
  if (activeNames.size !== next.length) throw new Error("团队中已有同名标签。");
  const nextById = new Map(next.map(tag => [tag.id, tag]));
  if (nextById.size !== next.length) throw new Error("团队标签出现重复标识。");
  const currentById = new Map(current.tags.map(tag => [tag.id, tag]));
  if (!canManageCatalog(actor)) {
    const currentOrder = current.tags.filter(tag => nextById.has(tag.id));
    const nextOrder = next.filter(tag => currentById.has(tag.id));
    if (currentOrder.some((tag, index) => tag.id !== nextOrder[index]?.id)) throw new Error("当前没有调整团队标签顺序的权限。");
  }

  const renames = new Map<string, string>();
  const archivedNames = new Set(current.archivedNames);
  const archivedTags = [...(current.archivedTags ?? [])];
  for (const tag of current.tags) {
    const updated = nextById.get(tag.id);
    if (updated && updated.name === tag.name && updated.icon === tag.icon && updated.color === tag.color) continue;
    if (!canManageTeamTag(actor, tag)) throw new Error("当前没有修改或归档此标签的权限。");
    if (updated) {
      if (updated.name !== tag.name) renames.set(tag.name, updated.name);
    } else {
      archivedNames.add(tag.name);
      archivedTags.push(tag);
    }
  }

  const catalog: TeamTagCatalog = { tags: [], archivedNames: [...archivedNames], ...(archivedTags.length ? { archivedTags } : {}) };
  const archivedKeys = archivedNameKeys(catalog);
  const archivedIds = new Set(archivedTags.map(tag => tag.id));
  catalog.tags = next.map(tag => {
    const previous = currentById.get(tag.id);
    if (!previous && archivedIds.has(tag.id)) throw new Error("不能使用已归档标签的标识。");
    if (tag.name !== previous?.name && archivedKeys.has(teamTagNameKey(tag.name))) throw new Error("同名标签已归档，请使用其他名称。");
    const creatorMemberId = previous ? previous.creatorMemberId : actor.memberId;
    return creatorMemberId ? { ...tag, creatorMemberId } : tag;
  });
  return { catalog, renames };
}
