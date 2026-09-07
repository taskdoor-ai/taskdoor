import type { TaskDiagnosisEvidence, TaskDiagnosisFinding, TaskDiagnosisTask } from "./taskDiagnosis";

type RecordRow = { evidence: TaskDiagnosisEvidence; cells: Record<string, string> };
export const resultTaskDiagnosisIds = new Set([
  "fragrance-final-decision", "ccx-serum-contract-close", "ccx-serum-asset-batch", "ccx-serum-price-stock",
  "ccx-serum-budget-gate", "ccx-october-studio-calendar", "ccx-weekly-settlement",
]);
const number = (value = ""): number | null => {
  const clean = value.replace(/,/g, "").trim();
  return /^\d+(?:\.\d+)?$/.test(clean) ? Number(clean) : null;
};
const quantity = (value: number) => value.toLocaleString("en-US");
const fields = (fact: string) => Object.fromEntries(fact.split("；").flatMap((part) => {
  const separator = part.indexOf("：");
  return separator < 0 ? [] : [[part.slice(0, separator).trim(), part.slice(separator + 1).trim()]];
}));

/** 本地示例格式的核对器，不是通用语义分析。
 * 从当前文件之间、文件与完成标准之间计算差异；讨论不是已生效决策，不参与触发。
 */
export function getResultTaskDiagnosis(task: TaskDiagnosisTask, subject: TaskDiagnosisFinding["subject"], records: TaskDiagnosisEvidence[]): TaskDiagnosisFinding[] {
  const criterion = (pattern: RegExp) => records.find((record) => record.kind === "criterion" && pattern.test(record.fact));
  const rows = (suffix: string): RecordRow[] => records.filter((record) => record.kind === "file" && record.id === task.id + suffix).map((evidence) => ({ evidence, cells: fields(evidence.fact) }));
  const make = (id: string, title: string, requirement: TaskDiagnosisEvidence | undefined, facts: Array<TaskDiagnosisEvidence | undefined>, recommendation: string): TaskDiagnosisFinding[] => {
    if (!requirement || facts.some((fact) => !fact)) return [];
    return [{ id: "decision-conflict:" + task.id + ":" + id, title, conclusion: title, type: "decision-conflict", severity: "review", subject,
      impact: "当前交付记录与本任务要求不一致，需要统一后才能作为后续执行依据。", recommendation,
      evidence: [requirement, ...facts as TaskDiagnosisEvidence[]] }];
  };

  switch (task.id) {
    case "fragrance-final-decision": {
      const boundary = rows("-rule").find((row) => row.cells["文件状态"] === "执行版" && row.cells["适用范围"] === "本轮追加投放");
      const limit = number(boundary?.cells["预算上限"]?.replace(/ 元$/, ""));
      const execution = rows("-result").find((row) => row.cells["方案状态"] === "执行版" && row.cells["适用范围"] === boundary?.cells["适用范围"]);
      const budget = number(execution?.cells["预算上限"]?.replace(/ 元$/, ""));
      if (limit === null || budget === null || budget <= limit) return [];
      return make("additional-budget-version", "预算口径文件限定 " + limit / 10000 + " 万元，执行文件却写 " + budget / 10000 + " 万元", boundary?.evidence,
        [execution?.evidence], "核对两份文件的适用版本，统一预算、目标及停止条件后再执行；不以讨论中的建议覆盖文件。");
    }
    case "ccx-serum-contract-close": {
      const authorizations = rows("-rule").filter(({ cells }) => cells["文件状态"] === "已签署" && cells["达人"] && cells["合同版本"] && cells["授权渠道"]);
      for (const schedule of rows("-record")) {
        if (schedule.cells["排期状态"] !== "执行" || !schedule.cells["发布渠道"]) continue;
        const authorization = authorizations.find(({ cells }) => cells["达人"] === schedule.cells["达人"] && cells["合同版本"] === schedule.cells["合同版本"]);
        if (!authorization || !schedule.cells["发布渠道"].split("、").some((channel) => !authorization.cells["授权渠道"].split("、").includes(channel))) continue;
        return make("signed-channel-scope", schedule.cells["达人"] + " 合同附件授权渠道为" + authorization.cells["授权渠道"] + "，排期文件却包含" + schedule.cells["发布渠道"], authorization.evidence,
          [schedule.evidence], "核对同一合同版本的授权附件与排期文件；未取得补充授权前移除超范围渠道，不把草稿或讨论意向当作授权。");
      }
      return [];
    }
    case "ccx-serum-asset-batch": {
      const requirement = criterion(/两类母版.*不可修改宣称/);
      const mismatch = rows("-record").find(({ cells }) => cells["交付状态"] === "交付版" && cells["段落类型"] === "宣称段" && cells["改写规则"] === "允许自由改写");
      if (!mismatch) return [];
      return make("locked-claim-boundary", "完成标准要求宣称不可修改，" + mismatch.cells["母版"] + " 的" + mismatch.cells["位置"] + "却允许自由改写", requirement,
        [mismatch.evidence], "把宣称段与可替换体验段分开设置，统一文件里的改写规则，再校对口播、字幕和导出件。");
    }
    case "ccx-serum-price-stock": {
      const requirement = criterion(/首批 [\d,]+ 件库存按渠道和时间窗分配/);
      const limit = number(requirement?.fact.match(/首批 ([\d,]+) 件/)?.[1]);
      if (limit === null) return [];
      const allocations = rows("-record").filter(({ cells }) => cells["批次"] === "首批" && cells["分配状态"] === "执行");
      const amounts = allocations.map(({ cells }) => number(cells["分配数量（件）"]));
      if (!amounts.length || amounts.some((amount) => amount === null)) return [];
      const total = amounts.reduce<number>((sum, amount) => sum + amount!, 0);
      if (total <= limit) return [];
      return make("overallocated-stock", "完成标准限定首批 " + quantity(limit) + " 件，文件中的执行分配合计 " + quantity(total) + " 件", requirement,
        allocations.map((row) => row.evidence), "当前分配超出 " + quantity(total - limit) + " 件；明确渠道取舍并更新分配表，未确认补货不计入首批。");
    }
    case "ccx-serum-budget-gate": {
      const requirement = criterion(/追加预算.*负责人书面决定/);
      const mismatch = rows("-record").find(({ cells }) => cells["配置状态"] === "待启用执行配置" && /自动追加/.test(cells["预算耗尽动作"] ?? "") && cells["确认要求"] === "无需负责人确认");
      if (!mismatch) return [];
      return make("opposed-stop-actions", "完成标准要求追加预算有书面决定，" + mismatch.cells["阶段"] + "配置却" + mismatch.cells["预算耗尽动作"], requirement,
        [mismatch.evidence], "把预算耗尽动作改为暂停并申请，或先在任务中明确新的授权边界；重新核准后再启用配置。");
    }
    case "ccx-october-studio-calendar": {
      const requirement = criterion(/冲突时段有书面取舍/);
      const bookings = rows("-record").filter(({ cells }) => cells["状态"] === "已确认" && cells["占用方式"] === "独占" && /^\d{4}-\d{2}-\d{2}$/.test(cells["日期"] ?? "") && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(cells["开始"] ?? "") && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(cells["结束"] ?? "") && cells["开始"] < cells["结束"]);
      for (let i = 0; i < bookings.length; i++) for (let j = i + 1; j < bookings.length; j++) {
        const a = bookings[i]; const b = bookings[j];
        if (!a.cells["直播间"] || a.cells["直播间"] !== b.cells["直播间"] || a.cells["日期"] !== b.cells["日期"] || a.cells["开始"] >= b.cells["结束"] || b.cells["开始"] >= a.cells["结束"]) continue;
        return make("exclusive-studio-booking", "完成标准要求冲突时段有书面取舍，资源表仍把 " + a.cells["直播间"] + " 直播间同时分给“" + a.cells["活动"] + "”和“" + b.cells["活动"] + "”", requirement,
          [a.evidence, b.evidence], "按完成标准记录明确取舍并同步更新排期，再改期或替换资源；候选时段不计为已确认占用。");
      }
      return [];
    }
    case "ccx-weekly-settlement": {
      const boundary = rows("-rule").find(({ cells }) => cells["文件状态"] === "执行版" && cells["结算期"] && cells["计佣规则"] === "截点前到账的退款从本期计佣基数中扣除");
      const cutoff = boundary?.cells["退款截点"];
      if (!cutoff || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(cutoff)) return [];
      for (const row of rows("-record")) {
        if (row.cells["结算期"] !== boundary?.cells["结算期"]) continue;
        const amount = number(row.cells["成交（元）"]); const refund = number(row.cells["退款（元）"]); const base = number(row.cells["本期计佣基数（元）"]);
        const arrived = row.cells["退款到账时间"];
        if (amount === null || refund === null || base === null || refund <= 0 || refund > amount || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(arrived ?? "") || arrived > cutoff || base <= amount - refund) continue;
        return make("refund-settlement-period", row.cells["达人"] + " 的截点前退款未扣除：按口径文件本期计佣基数应为 " + quantity(amount - refund) + " 元，结算表仍为 " + quantity(base) + " 元", boundary?.evidence,
          [row.evidence], "对照同一结算期的口径文件复核计佣基数，单列冲抵与补差后再确认付款。");
      }
      return [];
    }
    default: return [];
  }
}
