import { cn } from "@/shared/lib/utils";

export function TaskFileName({ name, className }: { name: string; className?: string }) {
  const dot = name.lastIndexOf(".");
  const hasExtension = dot > 0 && dot < name.length - 1;
  const stem = hasExtension ? name.slice(0, dot) : name;
  const extension = hasExtension ? name.slice(dot) : "";

  return <span className={cn("task-file-name", className)} title={name}>
    <span className="task-file-name-stem">{stem}</span>
    {extension && <span className="task-file-name-extension">{extension}</span>}
  </span>;
}
