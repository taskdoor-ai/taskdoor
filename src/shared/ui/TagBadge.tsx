import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { mockTagName } from "@/ai/mock/i18n/mockContent";
import { Building2, CircleDollarSign, Flag, FolderKanban, Layers3, Package, ShieldAlert, ShoppingBag, Sparkles, Tag, Users, Wrench, X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { TagColorName, TagDefinition, TagIconName } from "@/shared/model/task-model";

export const tagIconOptions: Array<{ name: TagIconName; label: string; icon: LucideIcon }> = [
  { name: "tag", label: "标签", icon: Tag }, { name: "folder", label: "项目", icon: FolderKanban },
  { name: "flag", label: "阶段", icon: Flag }, { name: "layers", label: "分类", icon: Layers3 },
  { name: "package", label: "产品", icon: Package }, { name: "shopping", label: "业务", icon: ShoppingBag },
  { name: "users", label: "成员", icon: Users }, { name: "building", label: "组织", icon: Building2 },
  { name: "coins", label: "财务", icon: CircleDollarSign }, { name: "shield", label: "风险", icon: ShieldAlert },
  { name: "wrench", label: "技术", icon: Wrench }, { name: "sparkles", label: "AI", icon: Sparkles },
];

export const tagColorOptions: Array<{ name: TagColorName; label: string }> = [
  { name: "gray", label: "灰" }, { name: "blue", label: "蓝" }, { name: "cyan", label: "青" }, { name: "teal", label: "绿松" }, { name: "green", label: "绿" },
  { name: "amber", label: "琥珀" }, { name: "orange", label: "橙" }, { name: "red", label: "红" }, { name: "purple", label: "紫" }, { name: "pink", label: "粉" },
];

export function getTagIcon(name: TagIconName) { return tagIconOptions.find((item) => item.name === name)?.icon ?? Tag; }

// Source-adapted from the icon + label anatomy of:
// https://21st.dev/@arihantcodes_1f7b8c4d/components/status-badge
type TagBadgeProps = {
  onRemove?: () => void;
  renderIcon?: (icon: ReactNode, name: string) => ReactNode;
  renderName?: (name: string) => ReactNode;
  size?: "xs" | "sm" | "md";
  tag: TagDefinition;
};

export function TagBadge({ onRemove, renderIcon, renderName, size = "md", tag }: TagBadgeProps) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const displayName = mockTagName(locale, tag.id, tag.name);
  const Icon = getTagIcon(tag.icon);
  const icon = <Icon aria-hidden="true" />;
  return <span className="ad-tag-badge" data-color={tag.color} data-size={size}>
    {renderIcon ? renderIcon(icon, displayName) : icon}
    {renderName ? renderName(displayName) : <span>{displayName}</span>}
    {onRemove && <button className="ad-tag-badge-remove" aria-label={`${locale === "en" ? "Remove tag" : ui("移除标签")} ${displayName}`} onClick={onRemove} type="button"><X /></button>}
  </span>;
}
