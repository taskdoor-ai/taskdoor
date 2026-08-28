export type TagIconName = "tag" | "folder" | "flag" | "layers" | "package" | "shopping" | "users" | "building" | "coins" | "shield" | "wrench" | "sparkles";
export type TagColorName = "gray" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "red" | "purple" | "pink";

export type TagDefinition = { id: string; name: string; icon: TagIconName; color: TagColorName };

const tag = (id: string, name: string, icon: TagIconName, color: TagColorName): TagDefinition => ({ id, name, icon, color });

export const initialTags: TagDefinition[] = [
  tag("pos-governance", "POS 治理", "folder", "blue"),
  tag("data-governance", "数据治理", "layers", "purple"),
  tag("member-benefits", "会员权益", "users", "pink"),
  tag("investigation", "问题调查", "flag", "amber"),
  tag("delivery", "修复与灰度", "wrench", "orange"),
  tag("gray-validation", "灰度验证", "sparkles", "cyan"),
  tag("validation", "验证", "shield", "green"),
  tag("pos", "POS", "shopping", "blue"),
  tag("inventory", "库存", "package", "teal"),
  tag("member", "会员", "users", "pink"),
  tag("invoice", "发票", "coins", "amber"),
  tag("audit", "审计", "shield", "purple"),
  tag("refund", "退款", "wrench", "red"),
];

const tagIconNames = new Set<TagIconName>(["tag", "folder", "flag", "layers", "package", "shopping", "users", "building", "coins", "shield", "wrench", "sparkles"]);
const tagColorNames = new Set<TagColorName>(["gray", "blue", "cyan", "teal", "green", "amber", "orange", "red", "purple", "pink"]);
const fallbackColors: TagColorName[] = ["blue", "purple", "teal", "amber", "pink", "green"];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const createTagId = () => crypto.randomUUID();

const normalizeTag = (value: unknown, index: number): TagDefinition | null => {
  if (typeof value === "string") {
    const name = value.trim();
    return name ? tag(createTagId(), name, "tag", fallbackColors[index % fallbackColors.length]) : null;
  }
  if (!isRecord(value) || typeof value.name !== "string" || !value.name.trim()) return null;
  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id : createTagId(),
    name: value.name.trim(),
    icon: typeof value.icon === "string" && tagIconNames.has(value.icon as TagIconName) ? value.icon as TagIconName : "tag",
    color: typeof value.color === "string" && tagColorNames.has(value.color as TagColorName) ? value.color as TagColorName : fallbackColors[index % fallbackColors.length],
  };
};

export function normalizeTags(value: unknown): TagDefinition[] {
  if (!Array.isArray(value)) return initialTags;
  const entries = value.flatMap((item) => isRecord(item) && Array.isArray(item.tags) ? item.tags : [item]);
  const names = new Set<string>();
  const ids = new Set<string>();
  const normalized: TagDefinition[] = [];

  entries.forEach((entry, index) => {
    const next = normalizeTag(entry, index);
    if (!next || names.has(next.name)) return;
    names.add(next.name);
    const id = ids.has(next.id) ? createTagId() : next.id;
    ids.add(id);
    normalized.push({ ...next, id });
  });

  return normalized;
}

export const findTagByName = (tags: TagDefinition[], name: string) => tags.find((item) => item.name === name);
