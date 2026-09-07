import type { PersonOption } from "../data/sharedTypes";

export type TaskMemberRecommendation = {
  reason: string;
  score: number;
};

export type TaskMemberRecommendations = Record<string, TaskMemberRecommendation>;

const responsibilityKeywords = [
  "达人", "筛选", "建联", "商务", "佣金", "报价", "档期", "排期", "合作",
  "内容", "卖点", "脚本", "话术", "素材", "直播", "场控", "彩排", "上线",
  "商品", "选品", "价格", "赠品", "库存", "履约", "投流", "投放", "预算",
  "定向", "人群", "ROI", "数据", "指标", "看板", "归因", "复盘", "合规",
  "广告法", "合同", "平台规则", "协调", "目标", "决策",
] as const;

function uniqueMatches(source: string, target: string) {
  return responsibilityKeywords.filter(keyword => source.includes(keyword) && target.includes(keyword));
}

export function createTaskMemberRecommendations({ members, taskText }: { members: PersonOption[]; taskText: string }): TaskMemberRecommendations {
  const normalizedTaskText = taskText.trim();
  return Object.fromEntries(members.map(member => {
    const responsibility = `${member.role} ${member.dynamicResponsibility ?? ""}`;
    const matches = uniqueMatches(normalizedTaskText, responsibility);
    const score = matches.length ? Math.min(98, 58 + matches.length * 8) : 52;
    const reason = matches.length
      ? `任务中的“${matches.slice(0, 4).join("、")}”与${member.name}的责任范围直接匹配。`
      : `当前任务描述与${member.name}的责任记录缺少直接命中，建议结合实际经验与可用时间再确认。`;
    return [member.id, { reason, score }];
  }));
}

export function sortMembersByRecommendation(members: PersonOption[], recommendations: TaskMemberRecommendations): PersonOption[] {
  return members
    .map((member, index) => ({ index, member }))
    .sort((left, right) => (recommendations[right.member.id]?.score ?? 0) - (recommendations[left.member.id]?.score ?? 0) || left.index - right.index)
    .map(({ member }) => member);
}
