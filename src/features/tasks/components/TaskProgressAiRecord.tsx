import React from "react";
import type { TaskProgressDisplay } from "../lib/taskProgressDisplay";

const formatTime = (value: string) => new Intl.DateTimeFormat("zh-CN", {
  timeZone:"Asia/Shanghai", month:"numeric", day:"numeric",
  ...(value.includes("T") ? {hour:"2-digit",minute:"2-digit",hourCycle:"h23" as const} : {}),
}).format(new Date(value));

/** Shared by the main calculation details and each child's collapsed evidence. */
export function TaskProgressAiRecord({model}: {model:TaskProgressDisplay}) {
  if (model.sourceLabel !== "用户确认") return null;
  const assessment=model.aiAssessment;
  return <div className="task-progress-ai-record" aria-label="用户确认与 AI 预测记录">
    <p>用户确认：{model.confirmationAt ? <time dateTime={model.confirmationAt}>{formatTime(model.confirmationAt)}</time> : "完成时间未记录"}</p>
    {assessment ? <>
      <p className="task-progress-ai-record-title">{model.assessmentTiming === "before" ? "确认前 AI 预测" : model.assessmentTiming === "after" ? "确认后 AI 预测" : "已保存 AI 预测"} <strong>{Number((assessment.ratio*100).toFixed(1))}%</strong></p>
      <p>预测时间：<time dateTime={assessment.observedAt}>{formatTime(assessment.observedAt)}</time>{!assessment.observedAt.includes("T") && "（仅记录日期）"}</p>
      <p>依据：{assessment.basis?.trim() || "未记录"}</p>
      <p>{model.assessmentTiming === "before" ? "这是确认前的记录，不能据此认定当前仍有未完成项。"
        : model.assessmentTiming === "after" ? "结合新证据核对，预测百分比不会自动撤销用户确认。"
          : "记录时间不足以确定先后，不作为确认后的复核结果。"}</p>
    </> : <p>未保存 AI 预测记录</p>}
  </div>;
}
