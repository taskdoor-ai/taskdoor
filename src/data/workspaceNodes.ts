import type { TaskStatus } from "../components/TaskStatusBadge";

type BaseNode = {
  id: string;
  kind: "folder" | "task" | "file";
  name: string;
  parentId: string | null;
  updatedAt: string;
};

export type FolderNode = BaseNode & {
  kind: "folder";
};

export type TaskNode = BaseNode & {
  kind: "task";
  ownerId: string;
  status: TaskStatus;
  goal?: string;
  dueAt?: string;
  labels?: string[];
};

export type FileNode = BaseNode & {
  kind: "file";
  fileType: string;
  size?: string;
};

export type WorkspaceNode = FolderNode | TaskNode | FileNode;

export const workspaceRootId = "workspace-root";

export const workspaceNodes: WorkspaceNode[] = [
  { id: workspaceRootId, kind: "folder", name: "任务", parentId: null, updatedAt: "刚刚" },
  { id: "retail", kind: "folder", name: "零售业务", parentId: workspaceRootId, updatedAt: "今天" },
  { id: "pos", kind: "folder", name: "POS 优惠券治理", parentId: "retail", updatedAt: "10 分钟前" },
  { id: "research", kind: "folder", name: "问题调查", parentId: "pos", updatedAt: "昨天" },
  { id: "delivery", kind: "folder", name: "修复与灰度", parentId: "pos", updatedAt: "10 分钟前" },
  { id: "member", kind: "folder", name: "会员权益", parentId: "retail", updatedAt: "昨天" },
  { id: "governance", kind: "folder", name: "数据治理", parentId: workspaceRootId, updatedAt: "2 天前" },

  { id: "coupon-fix", kind: "task", name: "评审并灰度验证 POS 优惠券重复核销修复草案", parentId: "delivery", ownerId: "周岚", status: "进行中", dueAt: "8 月 28 日", goal: "完成重复核销修复并通过退款、撤单和离线重试验证。", labels: ["POS", "灰度验证"], updatedAt: "10 分钟前" },
  { id: "inventory-sync", kind: "task", name: "门店库存同步异常", parentId: "retail", ownerId: "高远", status: "进行中", dueAt: "8 月 29 日", labels: ["库存"], updatedAt: "28 分钟前" },
  { id: "member-settlement", kind: "task", name: "会员等级权益结算规则升级", parentId: "member", ownerId: "梁川", status: "待开始", dueAt: "9 月 2 日", labels: ["会员"], updatedAt: "昨天" },
  { id: "invoice-validation", kind: "task", name: "电子发票抬头校验异常专项治理", parentId: "governance", ownerId: "陈默", status: "待审核", dueAt: "8 月 30 日", labels: ["发票"], updatedAt: "4 小时前" },
  { id: "audit-fields", kind: "task", name: "历史交易审计字段补齐", parentId: "governance", ownerId: "周岚", status: "待开始", dueAt: "9 月 5 日", labels: ["审计"], updatedAt: "2 天前" },
  { id: "refund-archive", kind: "task", name: "退款规则历史口径归档", parentId: "research", ownerId: "周岚", status: "已完成", labels: ["退款"], updatedAt: "8 月 18 日" },

  { id: "schema", kind: "file", name: "POS 优惠券核销业务规则 v3.2.pdf", parentId: "research", fileType: "PDF", size: "2.4 MB", updatedAt: "2 天前" },
  { id: "incident", kind: "file", name: "离线交易重放事故复盘 2026-05-18.docx", parentId: "research", fileType: "DOCX", size: "840 KB", updatedAt: "4 个月前" },
  { id: "commit", kind: "file", name: "coupon-retry 重放修复草案.patch", parentId: "delivery", fileType: "PATCH", size: "18 KB", updatedAt: "刚刚" },
];

export function getNode(id: string, nodes: WorkspaceNode[] = workspaceNodes) {
  return nodes.find((node) => node.id === id);
}

export function getChildren(parentId: string, nodes: WorkspaceNode[] = workspaceNodes) {
  return nodes.filter((node) => node.parentId === parentId);
}

export function getFolderPath(folderId: string, nodes: WorkspaceNode[] = workspaceNodes) {
  const path: FolderNode[] = [];
  let current = getNode(folderId, nodes);
  while (current?.kind === "folder") {
    path.unshift(current);
    current = current.parentId ? getNode(current.parentId, nodes) : undefined;
  }
  return path;
}
