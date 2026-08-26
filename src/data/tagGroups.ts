export type TagIconName = "tag" | "folder" | "flag" | "layers" | "package" | "shopping" | "users" | "building" | "coins" | "shield" | "wrench" | "sparkles";
export type TagColorName = "gray" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "red" | "purple" | "pink";

export type TagDefinition = { id: string; name: string; icon: TagIconName; color: TagColorName };
export type TagGroup = { id: string; name: string; tags: TagDefinition[] };

const tag = (id: string, name: string, icon: TagIconName, color: TagColorName): TagDefinition => ({ id, name, icon, color });

export const initialTagGroups: TagGroup[] = [
  { id: "project", name: "标签组", tags: [tag("pos-governance", "POS 治理", "folder", "blue"), tag("data-governance", "数据治理", "layers", "purple"), tag("member-benefits", "会员权益", "users", "pink")] },
  { id: "phase", name: "阶段", tags: [tag("investigation", "问题调查", "flag", "amber"), tag("delivery", "修复与灰度", "wrench", "orange"), tag("gray-validation", "灰度验证", "sparkles", "cyan"), tag("validation", "验证", "shield", "green")] },
  { id: "topic", name: "主题", tags: [tag("pos", "POS", "shopping", "blue"), tag("inventory", "库存", "package", "teal"), tag("member", "会员", "users", "pink"), tag("invoice", "发票", "coins", "amber"), tag("audit", "审计", "shield", "purple"), tag("refund", "退款", "wrench", "red")] },
];

export const getAllTags = (groups: TagGroup[]) => groups.flatMap((group) => group.tags);
export const findTagByName = (groups: TagGroup[], name: string) => getAllTags(groups).find((item) => item.name === name);

export function normalizeTagGroups(value: unknown): TagGroup[] {
  if (!Array.isArray(value)) return initialTagGroups;
  const fallbackColors: TagColorName[] = ["blue", "purple", "teal", "amber", "pink", "green"];
  return value.map((group, groupIndex) => {
    const item = group as Partial<TagGroup> & { tags?: unknown[] };
    return {
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      name: item.id === "project" && item.name === "项目" ? "标签组" : typeof item.name === "string" ? item.name : "未命名标签组",
      tags: (item.tags ?? []).map((entry, tagIndex) => typeof entry === "string"
        ? tag(crypto.randomUUID(), entry, "tag", fallbackColors[(groupIndex + tagIndex) % fallbackColors.length])
        : entry as TagDefinition),
    };
  });
}
