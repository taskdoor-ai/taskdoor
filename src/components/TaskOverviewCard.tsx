import { ArrowUpRight, Fingerprint } from "lucide-react";
import { PersonAvatar } from "./PersonAvatar";
import { RainbowButton } from "./ui/RainbowButton";

type TaskOverviewPerson = {
  id: string;
  name: string;
};

type TaskOverviewCardProps = {
  actionDisabled?: boolean;
  actionLabel: string;
  childTaskCount: number;
  collaborators: TaskOverviewPerson[];
  ownerName: string;
  onAction: () => void;
  periodLabel: string;
  title: string;
};

export function TaskOverviewCard({ actionDisabled, actionLabel, childTaskCount, collaborators, onAction, ownerName, periodLabel, title }: TaskOverviewCardProps) {
  return (
    <aside aria-label="主任务摘要" className="task-card task-create-confirmation">
      <div className="task-card-name-row">
        <span aria-hidden="true" className="task-card-status-icon"><Fingerprint /></span>
        <div className="task-card-title-copy">
          <h2>{title || "未命名任务"}</h2>
        </div>
      </div>

      <dl aria-label="主任务人员" className="task-create-overview-people">
        <div className="task-create-overview-role">
          <dt>负责人</dt>
          <dd><ul>
            <li><PersonAvatar name={ownerName} size="md" /><strong>{ownerName}</strong></li>
          </ul></dd>
        </div>
        <div className="task-create-overview-role">
          <dt>协作人员</dt>
          <dd>{collaborators.length ? <ul>
            {collaborators.map((person) => <li key={person.id}><PersonAvatar name={person.name} size="md" /><strong>{person.name}</strong></li>)}
          </ul> : <p>暂未添加</p>}</dd>
        </div>
      </dl>

      <dl className="task-create-overview-meta">
        <div><dt>周期</dt><dd>{periodLabel}</dd></div>
        {childTaskCount > 0 && <div><dt>子任务</dt><dd>{childTaskCount} 个</dd></div>}
      </dl>

      <RainbowButton className="task-card-action" disabled={actionDisabled} onClick={onAction}>
        <span>{actionLabel}</span><ArrowUpRight size={16} />
      </RainbowButton>
    </aside>
  );
}
