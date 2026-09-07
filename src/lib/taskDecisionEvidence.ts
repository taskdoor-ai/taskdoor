import type { TaskDiagnosisEvidence } from "./taskDiagnosis";

/** 讨论、活动只能补充背景，不能替代冲突的文件或任务要求。 */
export function hasTaskDecisionBasis(evidence: TaskDiagnosisEvidence[]): boolean {
  const facts = evidence.filter((item) => item.fact.trim() && item.kind !== "activity" && item.kind !== "commit");
  return facts.some((item) => item.kind === "file")
    && new Set(facts.map((item) => `${item.kind}:${item.id}`)).size >= 2;
}
