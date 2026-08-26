import { Check, Pencil, Sparkles } from "lucide-react";
import { useState } from "react";
import { FileTypeCard } from "./FileTypeCard";
import type { Member } from "./MemberSelector";
import { PersonAvatar } from "./PersonAvatar";
import type { EnterpriseSource } from "./SourcesList";
import { couponWorkPlan, workTodoKey } from "../data/taskPlan";
import { Checkbox, CheckboxIndicator } from "./ui/Checkbox";

type CollaborationBriefProps = {
  contextIds: string[];
  goal: string;
  members: Member[];
  name: string;
  onContextChange: (ids: string[]) => void;
  onGoalChange: (goal: string) => void;
  onNameChange: (name: string) => void;
  onOwnerChange: (owner: string[]) => void;
  onParticipantsChange: (participants: string[]) => void;
  onPlanTodoKeysChange: (keys: string[]) => void;
  owner: string[];
  participants: string[];
  planTodoKeys: string[];
  sources: EnterpriseSource[];
};

const collaboratorInfo: Record<string, { responsibility: string; why: string }> = {
  "周岚": { responsibility: "业务边界与最终方案", why: "负责 POS 交易域，能够确认退款与撤单的核销语义。" },
  "陈默": { responsibility: "代码评审与实现", why: "近期修改过 coupon-retry，熟悉当前重试与幂等逻辑。" },
  "林洁": { responsibility: "门店灰度与结果确认", why: "具备门店灰度发布权限，能够安排真实交易验证窗口。" },
};

export function CollaborationBrief({ contextIds, goal, members, name, onContextChange, onGoalChange, onNameChange, onOwnerChange, onParticipantsChange, onPlanTodoKeysChange, owner, participants, planTodoKeys, sources }: CollaborationBriefProps) {
  const [editingName, setEditingName] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);

  const toggleSource = (id: string) => {
    onContextChange(contextIds.includes(id) ? contextIds.filter((item) => item !== id) : [...contextIds, id]);
  };

  const togglePerson = (name: string) => {
    if (name === "周岚") {
      onOwnerChange(owner.includes(name) ? [] : [name]);
      return;
    }
    onParticipantsChange(participants.includes(name) ? participants.filter((item) => item !== name) : [...participants, name]);
  };

  const visiblePeople = ["周岚", "陈默", "林洁"].filter((name) => members.some((member) => member.id === name));
  const selectedPeople = new Set([...owner, ...participants]);
  const visibleWork = couponWorkPlan.filter((member) => selectedPeople.has(member.person));
  const togglePlanTodo = (key: string) => onPlanTodoKeysChange(planTodoKeys.includes(key) ? planTodoKeys.filter((item) => item !== key) : [...planTodoKeys, key]);

  return (
    <section aria-label="协作信息" className="collaboration-brief transfer-brief">
      <section className="transfer-section transfer-goal">
        <header><span>任务名称</span></header>
        <div className="transfer-goal-content">
          {editingName
            ? <textarea autoFocus onChange={(event) => onNameChange(event.target.value)} rows={2} value={name} />
            : <strong>{name}</strong>}
          <button aria-label={editingName ? "完成任务名称修改" : "修改任务名称"} onClick={() => setEditingName((value) => !value)} type="button">
            {editingName ? <Check /> : <Pencil />}
          </button>
        </div>
      </section>

      <section className="transfer-section transfer-goal">
        <header><span>目标</span></header>
        <div className="transfer-goal-content">
          {editingGoal
            ? <textarea autoFocus onChange={(event) => onGoalChange(event.target.value)} rows={3} value={goal} />
            : <strong>{goal}</strong>}
          <button aria-label={editingGoal ? "完成目标修改" : "修改目标"} onClick={() => setEditingGoal((value) => !value)} type="button">
            {editingGoal ? <Check /> : <Pencil />}
          </button>
        </div>
      </section>

      <section className="transfer-section transfer-information">
        <header><span>相关文件建议</span><small>可选 · 已选择 {contextIds.length}/{sources.length}</small></header>
        <div className="transfer-file-list">
          <div aria-hidden="true" className="transfer-file-table-head">
            <span />
            <b>文件</b>
            <b>同步摘要</b>
            <b>共享方式</b>
            <b>选择</b>
          </div>
          {sources.map((source) => {
            const selected = contextIds.includes(source.id);
            const format = source.id === "schema" ? "pdf" : source.id === "incident" ? "docx" : "patch";
            return <button aria-pressed={selected} className={selected ? "selected" : ""} key={source.id} onClick={() => toggleSource(source.id)} type="button">
              <FileTypeCard format={format} />
              <span className="transfer-file-body">
                <span className="transfer-file-name"><small>{source.type === "change" ? "工作产物" : "企业文件"}</small><strong>{source.title}</strong></span>
                <span className="transfer-file-purpose"><small>同步摘要</small><strong>{source.snippet}</strong></span>
                <span className="transfer-file-access"><small>共享方式</small><strong>{source.type === "change" ? "项目内可继续编辑" : "摘要与原文引用"}</strong></span>
              </span>
              <span className="transfer-selection"><CheckboxIndicator checked={selected} /><b>{selected ? "已选择" : "选择"}</b></span>
            </button>;
          })}
        </div>
      </section>

      <section className="transfer-section transfer-people transfer-people-work">
        <header><span>人员与子任务建议</span></header>
        <p className="transfer-plan-intro"><Sparkles size={13} />AI 根据目标、文件、历史活动与当前承诺生成建议；都可删除或改派，不影响创建任务。</p>
        <div className="transfer-people-list people-work-list">
          <div aria-hidden="true" className="transfer-people-table-head">
            <b>协作者</b><b>建议责任</b><b>判断依据</b><b>候选子任务</b><b>采用</b>
          </div>
          {visiblePeople.map((name) => {
            const selected = owner.includes(name) || participants.includes(name);
            const info = collaboratorInfo[name];
            const plannedMember = visibleWork.find((member) => member.person === name) ?? couponWorkPlan.find((member) => member.person === name);
            return <article className={selected ? "selected" : ""} key={name}>
              <span className="transfer-person"><PersonAvatar name={name} size="sm" status={owner.includes(name) ? "online" : undefined} /><span><strong>{name}</strong><small>{owner.includes(name) ? "拥有者" : "协作者"}</small></span></span>
              <span className="people-work-responsibility"><small>责任</small><strong>{plannedMember?.responsibility ?? info.responsibility}</strong></span>
              <p className="people-work-why"><small>判断依据</small>{info.why}<br />{members.find((member) => member.id === name)?.recentActivity}；{members.find((member) => member.id === name)?.availability}</p>
              <ul className="people-work-todos">{plannedMember?.todos.map((todo) => { const key = workTodoKey(name, todo); return <li key={todo}><label><Checkbox checked={planTodoKeys.includes(key)} disabled={!selected} onChange={() => togglePlanTodo(key)} /><span>{todo}</span></label></li>; })}</ul>
              <button aria-label={selected ? `移除 ${name}` : `选择 ${name}`} aria-pressed={selected} className="transfer-selection" onClick={() => togglePerson(name)} type="button"><CheckboxIndicator checked={selected} /><b>{selected ? "已选择" : "选择"}</b></button>
            </article>;
          })}
        </div>
      </section>

    </section>
  );
}
