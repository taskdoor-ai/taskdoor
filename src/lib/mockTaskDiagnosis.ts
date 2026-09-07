import type { TaskDiagnosisEvidence, TaskDiagnosisFinding, TaskDiagnosisTask } from "./taskDiagnosis";
import { getTaskActivityItems } from "./taskActivity";
import { getTaskFileContent } from "./taskFileEditing";
import { getResultTaskDiagnosis, resultTaskDiagnosisIds } from "./resultTaskDiagnosis";
import { hasTaskDecisionBasis } from "./taskDecisionEvidence";
import { getExpandedTaskDiagnosis } from "./expandedTaskDiagnosis";

type EvidenceSelector = {
  kind: TaskDiagnosisEvidence["kind"];
  includes: string;
  /** 成员补充了同一主题的新事实时先读取新记录，不回捞旧记录凑出冲突。 */
  topic?: RegExp;
};
type ContextRule = {
  taskId: string;
  id: string;
  title: string;
  impact: string;
  recommendation: string;
  type: TaskDiagnosisFinding["type"];
  evidence: EvidenceSelector[];
  status?: string;
};

/**
 * 本地演示规则，不是通用语义分析。这里只登记已有任务内容之间可核对的关系，
 * 不生成任务动态、文件或“原始事实”；每次命中都必须重新从当前上下文取出两侧原文。
 */
const rules: ContextRule[] = [
  {
    taskId: "fragrance-content", id: "content-final-review", type: "execution-blocker",
    title: "功效表述仍待合规复核，尚不能形成受控终审版本",
    impact: "完成标准要求品牌、商品与合规共同核对，当前成员动态仍明确终审未完成。",
    recommendation: "先补齐功效表述的合规复核，再确认终审版本与下游交付。",
    evidence: [{ kind: "criterion", includes: "输出受控终审版本" }, { kind: "activity", topic: /功效表述|终审/, includes: "一处功效表述仍待合规复核，终审尚未完成" }],
  },
  {
    taskId: "fragrance-live", id: "rehearsal-readiness", type: "execution-blocker",
    title: "已有首次走台记录，但全流程彩排仍在等待终审话术",
    impact: "首次走台和异常预案更新不能代替完成标准要求的全流程彩排及参与人确认。",
    recommendation: "先锁定终审话术，再完成全流程彩排并回传参与人确认结果。",
    evidence: [{ kind: "criterion", includes: "完成全流程彩排" }, { kind: "activity", topic: /彩排|话术/, includes: "彩排仍在等待内容终审" }, { kind: "commit", includes: "根据首次走台补充串场节奏和异常切换条件" }],
  },
  {
    taskId: "fragrance-compliance", id: "review-input-missing", type: "execution-blocker",
    title: "待审材料已收集，但正式审核仍缺内容终审稿",
    impact: "材料收集进展还不能支撑逐项通过、修改或升级处理的审核结论。",
    recommendation: "确认内容终审稿交付后，再逐项形成审核结论。",
    evidence: [{ kind: "criterion", includes: "逐项形成通过、修改或升级处理结论" }, { kind: "activity", topic: /正式审核|终审稿/, includes: "正式审核等待内容终审稿" }],
  },
  {
    taskId: "fragrance-creator-business", id: "completed-but-table-pending", type: "decision-conflict", status: "已完成",
    title: "达人合作任务已完成，但核对表仍将达人确认记为进行中",
    impact: "任务状态和文件中的交付状态不一致，后续成员无法确定应采用哪一份记录。",
    recommendation: "核对合作确认记录，并更新过期的表格或任务状态。",
    evidence: [{ kind: "task", includes: "已完成" }, { kind: "file", includes: "事项：达人确认；状态：进行中" }],
  },
  {
    taskId: "platform-api-contract", id: "compatibility-acceptance", type: "decision-conflict", status: "已完成",
    title: "API 契约已完成，但旧客户端仍有 2 项兼容用例返回 422",
    impact: "已完成状态与“旧客户端回放无破坏性差异”的完成标准、成员报告不一致。",
    recommendation: "先复核这两项用例是否已修复，再确认完成状态与兼容边界。",
    evidence: [{ kind: "task", includes: "已完成" }, { kind: "criterion", includes: "旧客户端回放无破坏性差异" }, { kind: "activity", topic: /兼容用例|返回 422/, includes: "仍有 2 项返回 422" }],
  },
  {
    taskId: "platform-ios-review", id: "privacy-materials", type: "execution-blocker",
    title: "功能回归已通过，但隐私清单仍缺 SDK 数据用途声明",
    impact: "任务目标是形成可提交的版本与隐私材料，功能回归不能补足声明缺口。",
    recommendation: "补齐 SDK 数据用途声明并核对权限后，再提交审核材料。",
    evidence: [{ kind: "goal", includes: "隐私" }, { kind: "criterion", includes: "隐私清单与 SDK 权限一致" }, { kind: "activity", topic: /隐私清单/, includes: "隐私清单仍缺第三方分析 SDK 的数据用途声明" }],
  },
  {
    taskId: "platform-android-staged", id: "android-rollout-percentage", type: "decision-conflict",
    title: "扩大到 20% 的灰度提议与当前保持 5% 的决定不一致",
    impact: "提议尚未取代当前文件中的灰度决定，直接执行会扩大未关闭问题的影响。",
    recommendation: "确认是否采纳扩大提议；未形成新决定前继续遵循现行比例。",
    evidence: [{ kind: "file", includes: "保持 Android 5% 灰度" }, { kind: "activity", topic: /扩大到|扩大至/, includes: "建议在低内存机型 ANR 根因关闭前，将 Android 灰度从 5% 扩大到 20%" }],
  },
  {
    taskId: "factory-quality-gate", id: "torque-quality-gate", type: "execution-blocker",
    title: "锁付扭矩 Cpk 为 0.92，未达到记录要求的 1.33",
    impact: "质量完成标准要求抽检结果满足控制计划，现有文件仍记录关键特性未达到 1.33。",
    recommendation: "复核参数窗口与新取样结果，满足质量门禁后再签发结论。",
    evidence: [{ kind: "criterion", includes: "抽检结果满足控制计划" }, { kind: "file", includes: "关键特性未达到 1.33" }, { kind: "file", includes: "锁付扭矩 Cpk 为 0.92" }],
  },
  {
    taskId: "factory-operator-training", id: "night-shift-training", type: "execution-blocker",
    title: "标准要求 24 人完成培训，仍有 6 名夜班人员未完成异常隔离演练",
    impact: "白班培训完成不能覆盖两班操作员的关键工位执行与停线识别目标。",
    recommendation: "补齐夜班异常隔离演练，并核对实操考核与补训记录。",
    evidence: [{ kind: "criterion", includes: "24 名操作员完成培训" }, { kind: "activity", topic: /夜班人员|操作员/, includes: "6 名夜班人员尚未完成异常隔离演练" }],
  },
  {
    taskId: "factory-capacity-trial", id: "mass-production-switch", type: "decision-conflict",
    title: "直接切量产的提议与当前维持试产的决定不一致",
    impact: "试跑结果的使用范围尚未统一，现场可能提前切换量产版本。",
    recommendation: "先复核量产门禁，再由负责人统一是否切换版本的决定。",
    evidence: [{ kind: "file", includes: "维持试产状态，不切量产版本" }, { kind: "activity", topic: /切换量产/, includes: "建议以当前 4 小时产能试跑结果直接切换量产版本" }],
  },
  {
    taskId: "service-data-repair", id: "repair-conflicting-records", type: "execution-blocker",
    title: "已修复 1,826 条记录，仍有 16 条状态冲突待人工核对",
    impact: "批次执行成功不能代表全部记录已恢复业务一致性。",
    recommendation: "先逐条核对剩余冲突记录的业务状态，再确认修复边界。",
    evidence: [{ kind: "goal", includes: "恢复企业客户同步服务与受影响数据" }, { kind: "activity", topic: /两批修复|条.*状态冲突/, includes: "16 条因状态冲突待人工" }],
  },
  {
    taskId: "service-customer-comms", id: "customer-confirmations", type: "execution-blocker",
    title: "首轮通知已完成，但 5 家重点客户尚未确认业务状态一致",
    impact: "已发送通知还不满足重点客户确认影响与临时方案的完成标准。",
    recommendation: "逐户补齐重点客户确认，再统一状态页与一对一沟通结论。",
    evidence: [{ kind: "criterion", includes: "重点客户已确认影响和临时方案" }, { kind: "activity", topic: /重点客户/, includes: "5 家重点客户尚未确认业务状态一致" }],
  },
  {
    taskId: "service-runbook-update", id: "runbook-drill", type: "execution-blocker",
    title: "手册已补充处置步骤，但支持与值班团队尚未完成桌面演练",
    impact: "文件更新不等于步骤已经被参与团队验证，当前尚不满足演练标准。",
    recommendation: "组织支持与值班团队完成桌面演练，记录未通过步骤及处理结果。",
    evidence: [{ kind: "criterion", includes: "支持与值班团队完成桌面演练" }, { kind: "activity", topic: /桌面演练/, includes: "尚未完成桌面演练" }, { kind: "commit", includes: "形成当前决策版本和交付包" }],
  },
  {
    taskId: "service-compensation-review", id: "incident-closure-timing", type: "decision-conflict",
    title: "先关闭事故的提议与现行客户确认、SLA 完成条件不一致",
    impact: "直接采用提前关闭提议，会让对外状态早于文件要求的客户与 SLA 处理结果。",
    recommendation: "先确认这些关闭条件是否仍有效，再统一事故状态。",
    evidence: [{ kind: "file", includes: "在重点客户确认和 SLA 处理结论完成前不关闭事件" }, { kind: "activity", topic: /关闭本次事件|先关闭/, includes: "建议在重点客户确认和 SLA 处理完成前先关闭本次事件" }],
  },
  {
    taskId: "ccx-creator-consent-audit", id: "material-authorization-channel", type: "decision-conflict",
    title: "素材仅获抖音授权，却已排入视频号投放计划",
    impact: "现有授权与素材排期不一致，视频号排期超出当前已确认范围。",
    recommendation: "核对补充授权；未确认前将素材移出视频号计划。",
    evidence: [{ kind: "criterion", includes: "到期、限制渠道和禁用素材已标注" }, { kind: "activity", topic: /素材授权|补充授权/, includes: "素材授权仅覆盖抖音，不含视频号" }, { kind: "activity", topic: /复用计划/, includes: "排入视频号投放" }],
  },
  {
    taskId: "ccx-creator-ratecard-renewal", id: "renewal-commission-cap", type: "decision-conflict",
    title: "报价卡采用 22% 佣金，超过当前已确认的 18% 上限",
    impact: "当前谈判边界与待复核报价卡不一致，尚不能按 22% 对外承诺。",
    recommendation: "先由负责人确认是否调整上限，再同步报价卡。",
    evidence: [{ kind: "activity", topic: /佣金上限/, includes: "佣金上限已确认为 18%" }, { kind: "activity", topic: /待复核的四季度报价卡/, includes: "佣金填写为 22%" }],
  },
  {
    taskId: "ccx-creator-monthly-committee", id: "renewal-performance-basis", type: "decision-conflict",
    title: "续约名单使用近 30 天 GMV，与已确认的近 90 天净成交口径不一致",
    impact: "当前会议名单与评审决定采用不同时间窗和退款口径，候选优先级不可直接比较。",
    recommendation: "统一评审标准并重算名单后，再形成续约结论。",
    evidence: [{ kind: "activity", topic: /续约评审/, includes: "近 90 天扣除退款后的净成交" }, { kind: "activity", topic: /候选名单/, includes: "按近 30 天 GMV 排序，未扣除退款" }],
  },
];

function contextEvidence(task: TaskDiagnosisTask): TaskDiagnosisEvidence[] {
  const context = task.context!;
  const records: TaskDiagnosisEvidence[] = [
    { kind: "task", id: task.id, source: task.title, fact: `「${task.title}」当前为${task.status}。` },
    { kind: "goal", id: `${task.id}:goal`, source: "任务目标", fact: context.goal },
    ...context.completionCriteria.map((fact, index) => ({ kind: "criterion" as const, id: `${task.id}:criterion:${index}`, source: "完成标准", fact })),
  ];
  for (const item of getTaskActivityItems(context.activities, context.commits)) {
    if (item.kind === "commit") records.push({ kind: "commit", id: item.commit.id, source: "文件活动", fact: item.commit.message });
    // 字段变更以当前目标、标准、状态为准，不能用历史变更消息顶替成员最新进展。
    else if (item.activity.type === "member-post" || item.activity.type === "member-reply") records.push({ kind: "activity", id: item.activity.id, source: item.activity.author, fact: item.activity.message });
  }
  for (const file of context.files) {
    const metadata = file as typeof file & { lifecycle?: string; access?: { visibility?: string } };
    if (file.archived || metadata.lifecycle === "superseded" || metadata.lifecycle === "archived" || metadata.access?.visibility === "restricted") continue;
    const content = getTaskFileContent(file);
    if (!content) continue;
    const facts = content.kind === "table"
      ? content.sheets.flatMap((sheet) => sheet.rows.map((row) => row.map((value, index) => `${sheet.columns[index] ?? index + 1}：${value}`).join("；")))
      : (content.kind === "pdf" ? content.pages : [content.text]).flatMap((text) => text.split(/\n/)).filter((line) => line.trim() && !line.startsWith("#"));
    for (const fact of facts) records.push({ kind: "file", id: file.id, source: file.name, fact });
  }
  return records;
}

export function getMockContextDiagnosis(task: TaskDiagnosisTask, subject: TaskDiagnosisFinding["subject"]): TaskDiagnosisFinding[] {
  if (!task.context) return [];
  const applicableRules = rules.filter((rule) => rule.taskId === task.id && (!rule.status || rule.status === task.status));
  if (!applicableRules.length && !resultTaskDiagnosisIds.has(task.id) && !task.context.files.some((file) => file.id === `${task.id}-diagnosis-current`)) return [];
  const records = contextEvidence(task);
  return [...getResultTaskDiagnosis(task, subject, records), ...getExpandedTaskDiagnosis(task, subject, records), ...applicableRules.flatMap<TaskDiagnosisFinding>((rule) => {
    const evidence = rule.evidence.map((selector) => {
      const candidates = records.filter((record) => record.kind === selector.kind);
      // 主题存在新记录但已不再表达原问题时，不回退匹配旧的未解决记录。
      if (selector.topic) {
        const latest = candidates.find((record) => selector.topic!.test(record.fact));
        return latest?.fact.includes(selector.includes) ? latest : undefined;
      }
      return candidates.find((record) => record.fact.includes(selector.includes));
    });
    if (evidence.some((item) => !item)) return [];
    if (rule.type === "decision-conflict" && !hasTaskDecisionBasis(evidence as TaskDiagnosisEvidence[])) return [];
    return [{
      id: `${rule.type}:${task.id}:${rule.id}`, type: rule.type, severity: rule.type === "execution-blocker" ? "blocked" : "review",
      title: rule.title, conclusion: rule.title, impact: rule.impact, recommendation: rule.recommendation,
      evidence: evidence as TaskDiagnosisEvidence[], subject,
    }];
  })];
}
