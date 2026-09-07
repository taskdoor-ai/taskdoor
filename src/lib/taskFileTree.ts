import type { TaskFileNode } from "../data/taskDetailMocks.ts";

export type TaskFilePreviewKind = "markdown" | "text" | "table" | "pdf" | "image" | "document" | "unknown";
export type FolderDeletePolicy = "move-contents" | "archive";

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export function getPreviewKind(name: string, mimeType = ""): TaskFilePreviewKind {
  const extension = ext(name);
  if (["md", "mdx"].includes(extension)) return "markdown";
  if (["txt", "log"].includes(extension) || mimeType.startsWith("text/plain")) return "text";
  if (["xlsx", "xls", "csv", "tsv"].includes(extension)) return "table";
  if (extension === "pdf" || mimeType === "application/pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension) || mimeType.startsWith("image/")) return "image";
  if (["doc", "docx"].includes(extension)) return "document";
  return "unknown";
}

export function getDefaultFileIcon(name: string): string {
  const kind = getPreviewKind(name);
  if (kind === "table") return "Sheet";
  if (kind === "image") return "Image";
  if (kind === "pdf") return "FileText";
  if (kind === "markdown") return "NotebookTabs";
  if (kind === "document" || kind === "text") return "FileType2";
  return "File";
}

export function sortTaskFileNodes(nodes: TaskFileNode[]): TaskFileNode[] {
  return [...nodes].sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name, "zh-CN") : a.kind === "folder" ? -1 : 1);
}

function checkedName(nodes: TaskFileNode[], parentId: string | null, name: string, exceptId?: string) {
  const value = name.trim();
  if (!value) throw new Error("名称不能为空");
  if (nodes.some((node) => node.id !== exceptId && node.parentId === parentId && node.name.toLocaleLowerCase() === value.toLocaleLowerCase())) throw new Error("同级已存在同名项目");
  return value;
}

export function createFolder(nodes: TaskFileNode[], parentId: string | null, name: string) {
  if (parentId && !nodes.some((node) => node.id === parentId && node.kind === "folder")) throw new Error("目标文件夹不存在");
  const folder: TaskFileNode = { id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind: "folder", name: checkedName(nodes, parentId, name), parentId, updatedAt: "刚刚" };
  return { folder, nodes: [...nodes, folder] };
}

export function renameNode(nodes: TaskFileNode[], nodeId: string, name: string): TaskFileNode[] {
  const node = nodes.find((item) => item.id === nodeId);
  if (!node) throw new Error("文件项目不存在");
  const nextName = checkedName(nodes, node.parentId, name, nodeId);
  return nodes.map((item) => item.id === nodeId ? { ...item, name: nextName, updatedAt: "刚刚" } : item);
}

export function getDescendantIds(nodes: TaskFileNode[], nodeId: string): string[] {
  const direct = nodes.filter((node) => node.parentId === nodeId).map((node) => node.id);
  return direct.flatMap((id) => [id, ...getDescendantIds(nodes, id)]);
}

export function moveNode(nodes: TaskFileNode[], nodeId: string, parentId: string | null): TaskFileNode[] {
  const node = nodes.find((item) => item.id === nodeId);
  if (!node) throw new Error("文件项目不存在");
  if (parentId && !nodes.some((item) => item.id === parentId && item.kind === "folder")) throw new Error("目标文件夹不存在");
  if (nodeId === parentId || getDescendantIds(nodes, nodeId).includes(parentId ?? "")) throw new Error("文件夹不能移动到自身或后代");
  checkedName(nodes, parentId, node.name, nodeId);
  return nodes.map((item) => item.id === nodeId ? { ...item, parentId, updatedAt: "刚刚" } : item);
}

export function deleteFolder(nodes: TaskFileNode[], folderId: string, policy: FolderDeletePolicy): TaskFileNode[] {
  const folder = nodes.find((node) => node.id === folderId && node.kind === "folder");
  if (!folder) throw new Error("文件夹不存在");
  if (policy === "archive") {
    const ids = new Set([folderId, ...getDescendantIds(nodes, folderId)]);
    return nodes.map((node) => ids.has(node.id) ? { ...node, archived: true } : node);
  }
  return nodes.filter((node) => node.id !== folderId).map((node) => node.parentId === folderId ? { ...node, parentId: folder.parentId } : node);
}

export function deleteFile(nodes: TaskFileNode[], fileId: string): TaskFileNode[] {
  return nodes.filter((node) => node.id !== fileId);
}

export function getNodePath(nodes: TaskFileNode[], nodeId: string): TaskFileNode[] {
  const path: TaskFileNode[] = [];
  let current = nodes.find((node) => node.id === nodeId);
  while (current) { path.unshift(current); current = current.parentId ? nodes.find((node) => node.id === current?.parentId) : undefined; }
  return path;
}

export function setNodeIcon(nodes: TaskFileNode[], nodeId: string, iconName: string): TaskFileNode[] {
  return nodes.map((node) => node.id === nodeId ? { ...node, iconName } : node);
}

export function restoreDefaultIcon(nodes: TaskFileNode[], nodeId: string): TaskFileNode[] {
  return nodes.map((node) => { if (node.id !== nodeId) return node; const { iconName: _, ...rest } = node; return rest; });
}

export function getSelectionAfterRemoval(nodes: TaskFileNode[], selectedId: string, removedIds: string[]): string | null {
  const selected = nodes.find((node) => node.id === selectedId);
  if (!selected || !removedIds.includes(selectedId)) return selectedId;
  return selected.parentId && !removedIds.includes(selected.parentId) ? selected.parentId : null;
}
