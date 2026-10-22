import type { TaskFileNode } from "@/shared/model/task-model.ts";

export type TaskFilePreviewKind = "markdown" | "text" | "json" | "xml" | "html" | "table" | "pdf" | "presentation" | "image" | "audio" | "video" | "document" | "unknown";
export type FolderDeletePolicy = "move-contents" | "archive";

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export function getPreviewKind(name: string, mimeType = ""): TaskFilePreviewKind {
  const extension = ext(name);
  const mime = mimeType.toLowerCase().split(";")[0].trim();
  // Explicit formats win over generic or incorrect MIME labels on uploads.
  if (["html", "htm"].includes(extension)) return "html";
  if (["md", "mdx"].includes(extension)) return "markdown";
  if (["txt", "log"].includes(extension)) return "text";
  if (["xlsx", "xls", "csv", "tsv"].includes(extension)) return "table";
  if (extension === "pdf") return "pdf";
  if (["ppt", "pptx"].includes(extension)) return "presentation";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) return "image";
  if (["doc", "docx"].includes(extension)) return "document";
  if (extension === "json") return "json";
  if (extension === "xml") return "xml";
  if (extension === "mp3") return "audio";
  if (extension === "mp4") return "video";
  if (["text/html", "application/xhtml+xml"].includes(mime)) return "html";
  if (mime === "text/plain") return "text";
  if (mime === "application/pdf") return "pdf";
  if (["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"].includes(mime)) return "presentation";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/json" || /^application\/[^\s/]+\+json$/.test(mime)) return "json";
  if (["application/xml", "text/xml"].includes(mime) || /^application\/[^\s/]+\+xml$/.test(mime)) return "xml";
  if (mime === "audio/mpeg" || mime === "audio/mp3") return "audio";
  if (mime === "video/mp4") return "video";
  return "unknown";
}

export function getDefaultFileIcon(name: string): string {
  const kind = getPreviewKind(name);
  if (kind === "table") return "Sheet";
  if (kind === "image") return "Image";
  if (kind === "pdf") return "FileText";
  if (kind === "markdown") return "NotebookTabs";
  if (kind === "audio") return "FileAudio";
  if (kind === "video") return "FileVideo";
  if (kind === "document" || kind === "text" || kind === "html") return "FileType2";
  return "File";
}

export function sortTaskFileNodes(nodes: TaskFileNode[]): TaskFileNode[] {
  return [...nodes].sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name, "zh-CN") : a.kind === "folder" ? -1 : 1);
}

/** Search includes the ancestors needed to show where a matching item lives. */
export function searchTaskFileTree(nodes: TaskFileNode[], query: string, displayName: (name: string) => string = name => name): { nodes: TaskFileNode[]; matches: number } {
  const visible = nodes.filter(node => !node.archived);
  const reachable = visible.filter(node => {
    const path = getNodePath(nodes, node.id);
    return path[0]?.parentId === null && path.every(part => !part.archived && (part.id === node.id || part.kind === "folder"));
  });
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return { nodes: reachable, matches: reachable.length };
  const matches = reachable.filter(node => displayName(node.name).toLocaleLowerCase().includes(needle));
  const ids = new Set(matches.flatMap(node => getNodePath(reachable, node.id).map(part => part.id)));
  for (const node of matches) if (node.kind === "folder") for (const id of getDescendantIds(reachable, node.id)) ids.add(id);
  return { nodes: reachable.filter(node => ids.has(node.id)), matches: matches.length };
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

export function getTaskFilePreviewId(nodes: TaskFileNode[], preferredId?: string | null): string | null {
  const files: string[] = [];
  const visited = new Set<string>();
  const visit = (parentId: string | null) => {
    for (const node of sortTaskFileNodes(nodes.filter(item => item.parentId === parentId && !item.archived))) {
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      if (node.kind === "folder") visit(node.id);
      else files.push(node.id);
    }
  };
  visit(null);
  return preferredId && files.includes(preferredId) ? preferredId : files[0] ?? null;
}

export function getSelectionAfterRemoval(nodes: TaskFileNode[], selectedId: string, removedIds: string[]): string | null {
  const removed = new Set(removedIds);
  return getTaskFilePreviewId(nodes.filter(node => !removed.has(node.id)), selectedId);
}
