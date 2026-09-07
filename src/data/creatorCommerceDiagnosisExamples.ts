import type { TaskDiagnosisSnapshot } from "../lib/taskDiagnosis";
import type { TaskActivityMock } from "./taskDetailMocks";
import type { TaskNode } from "./workspaceNodes";

type DiagnosisExampleSpec = {
  facts: [
    { author: string; fact: string },
    { author: string; fact: string },
  ];
};

/** 合成成员讨论；尚未关联文件原文，不把这些陈述直接预填为决策冲突。 */
const creatorPoolExamples: Record<string, DiagnosisExampleSpec> = {
  "ccx-creator-consent-audit": {
    facts: [
      { author: "苏禾", fact: "两位达人的九月素材授权仅覆盖抖音，不含视频号；截至 9 月 1 日，未收到补充授权。" },
      { author: "陈默", fact: "九月素材复用计划已将这两位达人的同一批素材排入视频号投放，计划使用日期为 9 月 10 日。" },
    ],
  },
  "ccx-creator-ratecard-renewal": {
    facts: [
      { author: "周岚", fact: "四季度核心达人谈判佣金上限已确认为 18%，内容费与授权费单列；目前未批准提高佣金上限。" },
      { author: "陈默", fact: "待复核的四季度报价卡将三位核心达人的佣金填写为 22%，并列为下一轮对外沟通口径，尚未发送给达人。" },
    ],
  },
  "ccx-creator-monthly-committee": {
    facts: [
      { author: "周岚", fact: "九月达人续约评审已确认采用近 90 天扣除退款后的净成交，并单独标注样本不足的达人。" },
      { author: "陈默", fact: "九月决策会当前候选名单按近 30 天 GMV 排序，未扣除退款；前五位候选中有两位尚不满足 90 天样本要求。" },
    ],
  },
};

export function getCreatorCommerceDiagnosisExample(task: TaskNode): {
  activities: TaskActivityMock[];
  diagnosis: TaskDiagnosisSnapshot;
} | undefined {
  if (task.teamId !== "creator-commerce" || task.createdFrom) return undefined;
  const spec = creatorPoolExamples[task.id];
  if (!spec) return undefined;
  const { facts } = spec;
  const activities: TaskActivityMock[] = facts.map(({ author, fact }, index) => ({
    author,
    createdAt: index === 0 ? "2026-09-01T09:00:00+08:00" : "2026-09-01T09:30:00+08:00",
    id: `${task.id}-diagnosis-fact-${index + 1}`,
    message: fact,
    time: index === 0 ? "2026-09-01 09:00" : "2026-09-01 09:30",
    type: "member-post",
  }));
  return {
    activities,
    diagnosis: {
      checkedAt: "2026-09-01T10:30:00+08:00",
      decisionConflicts: [],
    },
  };
}
