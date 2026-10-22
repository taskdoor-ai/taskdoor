import { File, FileAudio, FileVideo, FileText, FileType2, Folder, FolderOpen, Image, NotebookTabs, Sheet, type LucideIcon } from "lucide-react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { getDefaultFileIcon } from "@/features/tasks/files/lib/task-file-tree";

const iconMap: Record<string, LucideIcon> = { File, FileAudio, FileVideo, FileText, FileType2, Folder, FolderOpen, Image, NotebookTabs, Sheet };

export function getTaskFileNodeIconName(node: TaskFileNode, expanded = false): string {
  return node.kind === "folder" ? expanded ? "FolderOpen" : "Folder" : getDefaultFileIcon(node.name);
}

export function getTaskFileNodeIcon(node: TaskFileNode, expanded = false): LucideIcon {
  return iconMap[getTaskFileNodeIconName(node, expanded)] ?? File;
}
