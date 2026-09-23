import { Megaphone, ShoppingBag, Gift, Store, PenTool, Palette, Camera, Video, Mic, FileText, Presentation, BookOpen, Code, Bug, Database, Globe, Users, MessageSquare, CalendarDays, Handshake, Rocket, Lightbulb, ShieldCheck, Package, BriefcaseBusiness, ChartNoAxesColumnIncreasing, ClipboardCheck, FileCheck2, Flag, ListTodo, Sparkles, Target, type LucideIcon } from "lucide-react";
import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";

export const taskIconOptions: Array<{ icon: LucideIcon; label: string; value: TaskIconName }> = [
  { icon: ListTodo, label: "任务清单", value: "list-todo" },
  { icon: ClipboardCheck, label: "核对确认", value: "clipboard-check" },
  { icon: Target, label: "目标推进", value: "target" },
  { icon: Flag, label: "阶段里程碑", value: "flag" },
  { icon: BriefcaseBusiness, label: "业务工作", value: "briefcase" },
  { icon: FileCheck2, label: "文件交付", value: "file-check" },
  { icon: ChartNoAxesColumnIncreasing, label: "数据分析", value: "chart" },
  { icon: Sparkles, label: "AI 协作", value: "sparkles" },
  { icon: Megaphone, label: "营销推广", value: "megaphone" },
  { icon: ShoppingBag, label: "商品零售", value: "shopping-bag" },
  { icon: Gift, label: "活动礼赠", value: "gift" },
  { icon: Store, label: "门店运营", value: "store" },
  { icon: PenTool, label: "创意设计", value: "pen-tool" },
  { icon: Palette, label: "视觉设计", value: "palette" },
  { icon: Camera, label: "摄影拍摄", value: "camera" },
  { icon: Video, label: "视频制作", value: "video" },
  { icon: Mic, label: "直播播客", value: "mic" },
  { icon: FileText, label: "文案文档", value: "file-text" },
  { icon: Presentation, label: "演示汇报", value: "presentation" },
  { icon: BookOpen, label: "知识学习", value: "book-open" },
  { icon: Code, label: "开发编码", value: "code" },
  { icon: Bug, label: "问题修复", value: "bug" },
  { icon: Database, label: "数据管理", value: "database" },
  { icon: Globe, label: "网站国际化", value: "globe" },
  { icon: Users, label: "团队协作", value: "users" },
  { icon: MessageSquare, label: "讨论沟通", value: "message-square" },
  { icon: CalendarDays, label: "会议排期", value: "calendar-days" },
  { icon: Handshake, label: "合作洽谈", value: "handshake" },
  { icon: Rocket, label: "发布上线", value: "rocket" },
  { icon: Lightbulb, label: "想法探索", value: "lightbulb" },
  { icon: ShieldCheck, label: "合规审核", value: "shield-check" },
  { icon: Package, label: "物流交付", value: "package" },
];

export const taskIconToneOptions: Array<{ label: string; value: TaskIconTone }> = [
  { label: "无颜色", value: "neutral" },
  { label: "清晰蓝", value: "blue" },
  { label: "完成绿", value: "green" },
  { label: "提醒黄", value: "amber" },
  { label: "暖杏橙", value: "orange" },
  { label: "协作紫", value: "purple" },
  { label: "关注粉", value: "pink" },
  { label: "草木绿", value: "olive" },
];

const taskIconMap = Object.fromEntries(taskIconOptions.map((option) => [option.value, option.icon])) as Record<TaskIconName, LucideIcon>;

export function TaskIcon({ iconName = "list-todo", size = "sm", tone = "neutral" }: { iconName?: TaskIconName; size?: "sm" | "lg"; tone?: TaskIconTone }) {
  const Icon = taskIconMap[iconName] ?? ListTodo;
  return <span aria-hidden="true" className={`task-icon ${size}`} data-tone={tone}><Icon /></span>;
}
