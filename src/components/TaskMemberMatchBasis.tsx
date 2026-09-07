import type { PersonOption } from "../data/sharedTypes";
import type { TaskMemberRecommendations } from "../lib/taskMemberRecommendations";

type Props = {
  label?: string;
  task: { ownerId: string; participantIds: string[] };
  members: PersonOption[];
  recommendations: TaskMemberRecommendations;
};

/** Read the current selection on each render; never retain a previous person's reason. */
export function TaskMemberMatchBasis({ label = "人员匹配依据", task, members, recommendations }: Props) {
  const owner = members.find(member => member.id === task.ownerId);
  const participantIds = [...new Set(task.participantIds)].filter(id => id && id !== task.ownerId);
  const participants = participantIds.flatMap(id => {
    const member = members.find(candidate => candidate.id === id);
    return member ? [member] : [];
  });
  const unavailableParticipantCount = participantIds.length - participants.length;
  const participantNames = participants.length > 3
    ? `${participants.slice(0, 3).map(member => member.name).join("、")}等 ${participants.length} 人`
    : participants.map(member => member.name).join("、");
  const participantRoles = [...new Set(participants.map(member => member.role).filter(Boolean))];
  const participantCoverage = participantRoles.length > 5
    ? `${participantRoles.slice(0, 5).join("、")}等环节`
    : `${participantRoles.join("、")}相关环节`;
  const summary = [
    !task.ownerId
      ? "负责人暂未分配。"
      : owner
        ? recommendations[owner.id]?.reason.includes("缺少直接命中")
          ? recommendations[owner.id].reason
          : `负责人 ${owner.name} 的${owner.dynamicResponsibility || owner.role}职责与任务需求直接匹配。`
        : "当前负责人成员不可用，匹配依据待核对。",
    participants.length ? `参与人 ${participantNames} 可覆盖${participantCoverage}。` : "",
    unavailableParticipantCount ? `另有 ${unavailableParticipantCount} 位参与成员不可用，匹配依据待核对。` : "",
    task.ownerId || participants.length ? "以上为职责匹配建议，仍需结合实际排期确认。" : "选择人员后将根据职责范围生成匹配总结。",
  ].filter(Boolean).join("");
  return <section aria-label={label} className="creation-member-match-basis">
    <span className="task-detail-field-label">匹配依据</span>
    <div aria-live="polite" aria-atomic="true"><p>{summary}</p></div>
  </section>;
}
