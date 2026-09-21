import type { TaskFileNode } from "../data/taskDetailMocks";
import { sortTaskFileNodes } from "./taskFileTree";

export type TaskFileSearchResult = { file: TaskFileNode; folderPath: string };

/** Search the reachable file tree, including folder names, without exposing archived branches. */
export function searchTaskFiles(files: TaskFileNode[], query: string): TaskFileSearchResult[] {
  const words = query.normalize("NFKC").toLocaleLowerCase().trim().split(/\s+/u).filter(Boolean);
  const byParent = new Map<string | null, TaskFileNode[]>();
  for (const file of files) {
    if (!file.archived) byParent.set(file.parentId, [...(byParent.get(file.parentId) ?? []), file]);
  }
  const results: TaskFileSearchResult[] = [];
  const visited = new Set<string>();
  const visit = (parentId: string | null, folders: string[]) => {
    for (const file of sortTaskFileNodes(byParent.get(parentId) ?? [])) {
      if (visited.has(file.id)) continue;
      visited.add(file.id);
      if (file.kind === "folder") visit(file.id, [...folders, file.name]);
      else {
        const fullPath = [...folders, file.name].join(" / ").normalize("NFKC").toLocaleLowerCase();
        if (words.every(word => fullPath.includes(word))) results.push({ file, folderPath: folders.join(" / ") || "任务文件" });
      }
    }
  };
  visit(null, []);
  return results;
}
