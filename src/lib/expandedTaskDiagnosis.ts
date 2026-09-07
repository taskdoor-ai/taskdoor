import type { TaskDiagnosisEvidence, TaskDiagnosisFinding, TaskDiagnosisTask } from "./taskDiagnosis";

type ContentRow = { evidence: TaskDiagnosisEvidence; cells: Record<string, string> };
function parseRow(evidence: TaskDiagnosisEvidence): ContentRow {
  return { evidence, cells: Object.fromEntries(evidence.fact.split("；").flatMap((part) => {
    const index = part.indexOf("：");
    return index < 0 ? [] : [[part.slice(0, index).trim(), part.slice(index + 1).trim()]];
  })) };
}

/** 只核对本地表格格式的当前内容，不生成原始事实，不将讨论补成另一份决定。 */
export function getExpandedTaskDiagnosis(task: TaskDiagnosisTask, subject: TaskDiagnosisFinding["subject"], records: TaskDiagnosisEvidence[]): TaskDiagnosisFinding[] {
  const rows = (role: string) => records.filter((item) => item.kind === "file" && item.id === `${task.id}-diagnosis-${role}`).map(parseRow)
    .filter(({ cells }) => cells["状态"] === "当前" && cells["对象"] && cells["核对项"] && cells["取值"] && cells["取值"] !== "未知"
      // 决定状态“待确认”是明确记录的状态；其他字段待确认则不能当作已知取值。
      && (cells["取值"] !== "待确认" || cells["核对项"] === "决定状态"));
  const current = rows("current");
  if (!current.length) return [];
  const make = (row: ContentRow, basis: TaskDiagnosisEvidence, expected: string): TaskDiagnosisFinding => ({
    id: `decision-conflict:${task.id}:content-comparison:${row.cells["对象"]}:${row.cells["核对项"]}`,
    type: "decision-conflict", severity: "review", subject,
    title: `${row.cells["对象"]}的${row.cells["核对项"]}不一致：${basis.kind === "criterion" ? "完成标准要求" : "一份文件为"}${expected}，${basis.kind === "criterion" ? "文件却写" : "另一份为"}${row.cells["取值"]}`,
    conclusion: `${basis.kind === "criterion" ? "任务完成标准要求" : `《${basis.source}》记为`}${expected}；《${row.evidence.source}》中同一对象的${row.cells["核对项"]}为${row.cells["取值"]}。`,
    impact: "当前资料不能作为一致的交付或执行口径。",
    recommendation: `核对${basis.kind === "criterion" ? "当前完成标准" : `《${basis.source}》`}与《${row.evidence.source}》中的${row.cells["核对项"]}，统一适用内容后再执行。`,
    evidence: [basis, row.evidence],
  });
  const basis = rows("basis");
  const findings = current.flatMap((row) => {
    const other = basis.find(({ cells }) => cells["对象"] === row.cells["对象"] && cells["核对项"] === row.cells["核对项"]);
    return other && other.cells["取值"] !== row.cells["取值"] ? [make(row, other.evidence, other.cells["取值"])] : [];
  });
  if (basis.length) return findings;

  const criteria = records.filter((record) => record.kind === "criterion");
  let requirement: TaskDiagnosisEvidence | undefined;
  let field = "";
  let expected = "";
  if (task.id === "ccx-serum-creator-longlist") {
    requirement = criteria.find((item) => /分层依据引用近\s*\d+\s*天有效数据/.test(item.fact));
    expected = `${requirement?.fact.match(/近\s*(\d+)\s*天/)?.[1] ?? ""} 天`;
    field = "分层观察窗";
  } else if (task.id === "unassigned-short-video-covers") {
    requirement = criteria.find((item) => /完成([一二两三四五六七八九十]|\d+)版封面/.test(item.fact));
    const count = requirement?.fact.match(/完成([一二两三四五六七八九十]|\d+)版封面/)?.[1] ?? "";
    const chinese: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    expected = `${chinese[count] ?? Number(count)} 版`;
    field = "制作版本数";
  } else if (task.id === "unassigned-creator-sample-tracking") {
    requirement = criteria.find((item) => item.fact.includes("未回复项单独标明"));
    expected = "单列未回复";
    field = "无反馈归类";
  }
  if (!requirement) return [];
  const row = current.find(({ cells }) => cells["核对项"] === field);
  return row && row.cells["取值"] !== expected ? [make(row, requirement, expected)] : [];
}
