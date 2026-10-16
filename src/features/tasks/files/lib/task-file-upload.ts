import type { TaskFileNode } from "@/shared/model/task-model";

export function placeTaskFileUploads(files: TaskFileNode[], uploads: TaskFileNode[], parentId: string | null): TaskFileNode[] {
  if (parentId && !files.some(node => node.id === parentId && node.kind === "folder" && !node.archived)) {
    throw new Error("上传位置已不可用，请重新选择文件夹。");
  }
  const next = [...files];
  for (const node of uploads) {
    const match = node.name.match(/^(.*?)(\.[^.]*)?$/)!;
    let name = node.name;
    let suffix = 2;
    while (next.some(item => item.parentId === parentId && !item.archived && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      name = `${match[1]} (${suffix++})${match[2] ?? ""}`;
    }
    next.push({ ...node, name, parentId });
  }
  return next;
}
