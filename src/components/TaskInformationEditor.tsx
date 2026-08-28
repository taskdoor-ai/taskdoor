import { Sparkles } from "lucide-react";
import type { EnterpriseSource } from "./SourcesList";
import { TaskSourceSelector } from "./TaskSourceSelector";

type TaskInformationEditorProps = {
  contextIds: string[];
  onChange: (ids: string[]) => void;
  sourceBasis: Record<string, string>;
  sources: EnterpriseSource[];
};

export function TaskInformationEditor({ contextIds, onChange, sourceBasis, sources }: TaskInformationEditorProps) {
  if (!sources.length) return null;

  return (
    <section className="transfer-section transfer-information task-information-editor">
      <header><span>文件</span><small>默认不选 · 已选 {contextIds.length}/{sources.length}</small></header>
      <p className="transfer-plan-intro"><Sparkles size={13} />AI 只在你已有权限内给出建议；选择只建立当前任务的引用，不复制内容，也不改变权限。</p>
      <TaskSourceSelector contextIds={contextIds} onChange={onChange} sourceBasis={sourceBasis} sources={sources} />
    </section>
  );
}
