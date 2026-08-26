import { ArrowUpRight, Check, CircleHelp, Fingerprint, PackageCheck } from "lucide-react";
import { Pencil } from "lucide-react";
import { useState } from "react";
import type { Member } from "./MemberSelector";
import { PersonAvatar, PersonAvatarGroup } from "./PersonAvatar";
import { RainbowButton } from "./ui/RainbowButton";

type TaskOverviewCardProps = {
  actionDisabled?: boolean;
  actionLabel?: string;
  cycle?: string;
  members: Member[];
  onAction?: () => void;
  onOwnerChange: (owner: string[]) => void;
  onParticipantsChange: (participants: string[]) => void;
  onTitleChange?: (title: string) => void;
  owner: string[];
  participants: string[];
  showHandoff?: boolean;
  title: string;
};

export function TaskOverviewCard({
  actionDisabled,
  actionLabel,
  cycle = "按需推进",
  members,
  onAction,
  onTitleChange,
  owner,
  participants,
  showHandoff = true,
  title,
}: TaskOverviewCardProps) {
  const [editing, setEditing] = useState<"title" | null>(null);
  const visibleParticipants = participants.filter((id) => !owner.includes(id));
  const memberName = (id: string) => members.find((member) => member.id === id)?.name ?? id;
  const ownerNames = owner.map(memberName);
  const participantNames = visibleParticipants.map(memberName);

  return (
    <aside aria-live="polite" className="task-card">
      <div className="task-card-name-row">
        <span aria-hidden="true" className="task-card-status-icon"><Fingerprint /></span>
        <div className="task-card-title-copy">
          <div className={`task-card-editable task-card-title-edit ${editing === "title" ? "editing" : ""}`}>
            {editing === "title" && onTitleChange
              ? <textarea autoFocus onChange={(event) => onTitleChange(event.target.value)} rows={2} value={title} />
              : <h2>{title}</h2>}
            {onTitleChange && <button aria-label={editing === "title" ? "完成名称修改" : "修改任务名称"} onClick={() => setEditing((value) => value === "title" ? null : "title")} type="button">{editing === "title" ? <Check /> : <Pencil />}</button>}
          </div>
        </div>
      </div>

      {showHandoff && <section className="ai-handoff-summary">
        <header><PackageCheck size={16} /><div><strong>AI 已准备可接续成果</strong><small>结构化交接，不上传私人 AI 对话</small></div></header>
        <p>个人 Codex 已完成根因定位并生成修复草案，协作者无需重新检索和复述问题。</p>
        <div className="ai-handoff-assets">
          <span><Check size={11} />离线事件重放根因</span>
          <span><Check size={11} />coupon-retry 修复草案</span>
          <span><Check size={11} />三条异常路径测试清单</span>
        </div>
        <div className="human-decision-gap"><CircleHelp size={15} /><p><strong>仍需人确认</strong><span>退款、撤单是否复用原核销键，以及门店灰度边界。AI 无权替业务负责人决定。</span></p></div>
      </section>}

      <div className="task-member-config">
        <section className="task-member-summary-group">
          <strong>拥有者</strong>
          <div className="task-member-summary-person">
            {ownerNames[0] ? <PersonAvatar name={ownerNames[0]} size="md" /> : <span className="task-member-summary-empty">待指定</span>}
          </div>
        </section>
        <section className="task-member-summary-group">
          <strong>参与者</strong>
          <div className="task-member-summary-participants">
            {participantNames.length > 0 ? <PersonAvatarGroup names={participantNames} size="md" /> : <span className="task-member-summary-empty">暂无参与者</span>}
          </div>
        </section>
      </div>
      <div className="task-cycle"><span>推进节奏</span><strong>{cycle}</strong></div>

      {actionLabel && <RainbowButton className="task-card-action" disabled={actionDisabled} onClick={onAction}>
        <span>{actionLabel}</span><ArrowUpRight size={16} />
      </RainbowButton>}
    </aside>
  );
}
