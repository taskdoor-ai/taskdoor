import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useI18n } from "@/shared/i18n/I18nProvider";
import type { Locale } from "@/shared/i18n/core";
import { mockTagName } from "@/ai/mock/i18n/mockContent";
import {
  BookOpen, Boxes, Bug, Building2, CalendarDays, ChartNoAxesColumn, CircleDollarSign,
  ClipboardCheck, CodeXml, Database, FileText, Flag, FlaskConical, FolderKanban, GitPullRequest, Globe,
  Handshake, Headphones, Image, KeyRound, Layers3, Megaphone, MessageCircle, Package,
  PenTool, Rocket, Search, ShieldAlert, ShoppingBag, Sparkles, Tag, Target, Truck, Users,
  Video, Wrench, X, type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { tagIconNames, type TagColorName, type TagDefinition, type TagIconName } from "@/shared/model/task-model";

const tagIcons: Record<TagIconName, { label: string; icon: LucideIcon }> = {
  tag: { label: "标签", icon: Tag },
  folder: { label: "项目", icon: FolderKanban },
  flag: { label: "阶段", icon: Flag },
  layers: { label: "分类", icon: Layers3 },
  package: { label: "产品", icon: Package },
  shopping: { label: "业务", icon: ShoppingBag },
  users: { label: "成员", icon: Users },
  building: { label: "组织", icon: Building2 },
  coins: { label: "财务", icon: CircleDollarSign },
  shield: { label: "风险", icon: ShieldAlert },
  wrench: { label: "技术", icon: Wrench },
  sparkles: { label: "AI", icon: Sparkles },
  "file-text": { label: "文档资料", icon: FileText },
  "clipboard-check": { label: "核对验收", icon: ClipboardCheck },
  "calendar-days": { label: "会议排期", icon: CalendarDays },
  megaphone: { label: "宣传营销", icon: Megaphone },
  "pen-tool": { label: "设计", icon: PenTool },
  image: { label: "图片素材", icon: Image },
  video: { label: "视频直播", icon: Video },
  "book-open": { label: "知识培训", icon: BookOpen },
  "message-circle": { label: "反馈沟通", icon: MessageCircle },
  headphones: { label: "客户支持", icon: Headphones },
  handshake: { label: "合作伙伴", icon: Handshake },
  truck: { label: "履约物流", icon: Truck },
  boxes: { label: "仓储库存", icon: Boxes },
  "chart-no-axes-column": { label: "数据报表", icon: ChartNoAxesColumn },
  database: { label: "数据库", icon: Database },
  "code-xml": { label: "代码开发", icon: CodeXml },
  "git-pull-request": { label: "代码审查与合并", icon: GitPullRequest },
  bug: { label: "缺陷", icon: Bug },
  "flask-conical": { label: "研究试验", icon: FlaskConical },
  rocket: { label: "上线发布", icon: Rocket },
  globe: { label: "国际化", icon: Globe },
  "key-round": { label: "访问权限", icon: KeyRound },
  target: { label: "目标指标", icon: Target },
  search: { label: "调研检索", icon: Search },
};

export const tagIconOptions = tagIconNames.map(name => ({ name, ...tagIcons[name] }));

export const tagColorOptions: Array<{ name: TagColorName; label: string }> = [
  { name: "gray", label: "灰" }, { name: "blue", label: "蓝" }, { name: "cyan", label: "青" }, { name: "teal", label: "绿松" }, { name: "green", label: "绿" },
  { name: "amber", label: "琥珀" }, { name: "orange", label: "橙" }, { name: "red", label: "红" }, { name: "purple", label: "紫" }, { name: "pink", label: "粉" },
];

export function getTagIcon(name: TagIconName) { return tagIconOptions.find((item) => item.name === name)?.icon ?? Tag; }
export function getTagDisplayName(locale: Locale, tag: TagDefinition) { return mockTagName(locale, tag.id, tag.name); }

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
  const displayName = getTagDisplayName(locale, tag);
  const Icon = getTagIcon(tag.icon);
  const icon = <Icon aria-hidden="true" />;
  return <span className="ad-tag-badge" data-color={tag.color} data-size={size}>
    {renderIcon ? renderIcon(icon, displayName) : icon}
    {renderName ? renderName(displayName) : <span>{displayName}</span>}
    {onRemove && <button className="ad-tag-badge-remove" aria-label={`${locale === "en" ? "Remove tag" : ui("移除标签")} ${displayName}`} onClick={onRemove} type="button"><X /></button>}
  </span>;
}
