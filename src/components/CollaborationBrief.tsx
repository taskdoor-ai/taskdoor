import { FolderTree } from "lucide-react";
import type { ReactNode } from "react";
import type { TaskCreationChildDraft } from "../data/taskCreationScenarios";
import type { EnterpriseSource } from "./SourcesList";
import { TaskInformationEditor } from "./TaskInformationEditor";
import { TaskStructureEditor } from "./TaskStructureEditor";
import { Input, Textarea } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type SelectOption = {
  id: string;
  label: string;
};

function ProposalSelect({ ariaLabel, emptyLabel, onChange, options, value }: { ariaLabel: string; emptyLabel: string; onChange: (value: string) => void; options: SelectOption[]; value: string }) {
  const resolvedValue = value || "none";
  const selectedLabel = resolvedValue === "none" ? emptyLabel : options.find((option) => option.id === resolvedValue)?.label;
  return <Select onValueChange={(nextValue) => onChange(nextValue === "none" || nextValue === null ? "" : nextValue)} value={resolvedValue}>
    <SelectTrigger aria-label={ariaLabel}><SelectValue>{selectedLabel}</SelectValue></SelectTrigger>
    <SelectContent>
      <SelectItem value="none">{emptyLabel}</SelectItem>
      {options.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
    </SelectContent>
  </Select>;
}

type CollaborationBriefProps = {
  contextIds: string[];
  fileCandidateIds: string[];
  goal: string;
  name: string;
  onContextChange: (ids: string[]) => void;
  onGoalChange: (goal: string) => void;
  onNameChange: (name: string) => void;
  onParentTaskChange: (id: string) => void;
  onTaskChildrenChange: (children: TaskCreationChildDraft[]) => void;
  parentTaskId: string;
  parentTaskOptions: SelectOption[];
  sourceBasis: Record<string, string>;
  sources: EnterpriseSource[];
  taskChildren: TaskCreationChildDraft[];
};

export function CollaborationBrief({ contextIds, fileCandidateIds, goal, name, onContextChange, onGoalChange, onNameChange, onParentTaskChange, onTaskChildrenChange, parentTaskId, parentTaskOptions, sourceBasis, sources, taskChildren }: CollaborationBriefProps) {
  const updateChild = (id: string, patch: Partial<TaskCreationChildDraft>) => {
    onTaskChildrenChange(taskChildren.map((child) => child.id === id ? { ...child, ...patch } : child));
  };

  const deleteChild = (id: string) => {
    onTaskChildrenChange(taskChildren.filter((child) => child.id !== id));
  };

  const renderTaskSections = (taskId: string): ReactNode => {
    const isParent = taskId === "parent";
    const isSingleTask = isParent && taskChildren.length === 0;
    const child = isParent ? undefined : taskChildren.find((item) => item.id === taskId);
    if (!isParent && !child) return null;

    const title = isParent ? name : child?.title ?? "";
    const taskGoal = isParent ? goal : child?.goal ?? "";
    const taskContextIds = isParent ? contextIds : child?.contextIds ?? [];
    const taskFileCandidateIds = isParent ? fileCandidateIds : child?.fileCandidateIds ?? [];
    const visibleFileIds = new Set([...taskFileCandidateIds, ...taskContextIds]);
    const taskSources = sources.filter((source) => visibleFileIds.has(source.id));
    const taskKindLabel = isSingleTask ? "任务" : isParent ? "父任务" : "子任务";
    const changeTitle = isParent ? onNameChange : (nextTitle: string) => updateChild(taskId, { title: nextTitle });
    const changeGoal = isParent ? onGoalChange : (nextGoal: string) => updateChild(taskId, { goal: nextGoal });
    const changeContext = isParent ? onContextChange : (nextContextIds: string[]) => updateChild(taskId, { contextIds: nextContextIds });

    return <div className="task-draft-details">
      <section className="transfer-section task-draft-content">
        <header><span>任务信息</span><small>{isSingleTask ? "任务名称与目标" : isParent ? "父任务整合最终结果" : "子任务保留独立目标与结果"}</small></header>
        <div className="task-draft-fields">
          <label><span>任务名称</span><Input aria-label={`${taskKindLabel}名称`} onChange={(event) => changeTitle(event.target.value)} value={title} /></label>
          <label><span>目标</span><Textarea aria-label={`${taskKindLabel}目标`} onChange={(event) => changeGoal(event.target.value)} rows={3} value={taskGoal} /></label>
        </div>
      </section>

      <section className="transfer-section proposal-structure">
        <header><span>上级任务</span><small>{isParent ? "可选；仅用于建立父子 Task 关系" : "由当前任务结构确定"}</small></header>
        {isParent ? <div className="proposal-structure-fields">
          <label><span><FolderTree size={13} />关联任务</span><ProposalSelect ariaLabel="选择上级任务" emptyLabel="无上级任务" onChange={onParentTaskChange} options={parentTaskOptions} value={parentTaskId} /></label>
        </div> : <div className="task-parent-reference"><FolderTree aria-hidden="true" /><p><strong>{name || "未命名父任务"}</strong><span>创建后作为当前子任务的直接上级任务</span></p></div>}
      </section>

      <TaskInformationEditor contextIds={taskContextIds} onChange={changeContext} sourceBasis={sourceBasis} sources={taskSources} />
    </div>;
  };

  return (
    <section aria-label="任务创建草稿" className="collaboration-brief transfer-brief">
      <TaskStructureEditor
        children={taskChildren}
        onDeleteChild={deleteChild}
        parentTitle={name}
        renderPanel={renderTaskSections}
      />
    </section>
  );
}
