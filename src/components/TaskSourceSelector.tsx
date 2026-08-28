import type { EnterpriseSource } from "./SourcesList";
import { FileTypeCard } from "./FileTypeCard";
import { CheckboxIndicator } from "./ui/Checkbox";

type TaskSourceSelectorProps = {
  contextIds: string[];
  onChange: (ids: string[]) => void;
  sourceBasis: Record<string, string>;
  sources: EnterpriseSource[];
};

const sourceFormat = (source: EnterpriseSource) => source.type === "data"
  ? "data"
  : source.type === "task"
    ? "task"
    : source.type === "change"
      ? "patch"
      : source.title.toLowerCase().endsWith(".pdf")
        ? "pdf"
        : "docx";

const sourceLabel = (source: EnterpriseSource) => source.type === "data"
  ? "数据集"
  : source.type === "task"
    ? "历史任务"
    : source.type === "change"
      ? "工作产物"
      : "任务资料";

export function TaskSourceSelector({ contextIds, onChange, sourceBasis, sources }: TaskSourceSelectorProps) {
  const toggleSource = (id: string) => {
    onChange(contextIds.includes(id) ? contextIds.filter((item) => item !== id) : [...contextIds, id]);
  };

  return <div className="transfer-file-list proposal-file-list">
    {sources.map((source) => {
      const selected = contextIds.includes(source.id);
      return <button aria-pressed={selected} className={selected ? "selected" : ""} key={source.id} onClick={() => toggleSource(source.id)} type="button">
        <span className="transfer-selection"><CheckboxIndicator checked={selected} /><b>{selected ? "已选择" : "选择"}</b></span>
        <FileTypeCard format={sourceFormat(source)} />
        <span className="transfer-file-body">
          <span className="transfer-file-name"><small>{sourceLabel(source)}</small><strong>{source.title}</strong></span>
          <span className="transfer-file-purpose"><small>推荐依据</small><strong>{sourceBasis[source.id] ?? source.snippet}</strong></span>
        </span>
      </button>;
    })}
  </div>;
}
