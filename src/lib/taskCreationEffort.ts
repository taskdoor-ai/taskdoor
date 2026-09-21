import type { CreationForm, CreationTask } from "./taskCreationForm";
import { getEffortScopeKey, type TaskEffortEstimate } from "./taskEffort";
import { getCreationBranchLeaves } from "./taskCreationHierarchy";

/** Only the leaf scope is added; a coordinator's parent estimate is never added again. */
export function getCreationEffortLeaves(form: CreationForm): CreationTask[] {
  return form.subtasks.length ? getCreationBranchLeaves(form) : [form.mainTask];
}

/** A split invalidates the parent estimate without changing task goals. */
export function reconcileCreationEffort(_previous: CreationForm, next: CreationForm): CreationForm {
  const estimate = next.mainTask.effortEstimate;
  const parents = new Set(next.subtasks.map(task => task.parentClientId));
  return {
    ...next,
    subtasks: next.subtasks.map(task => parents.has(task.clientId) && task.effortEstimate ? { ...task, effortEstimate: { ...task.effortEstimate, confirmed: false, scopeKey: "needs-review:split" } } : task),
    mainTask: {
      ...next.mainTask,
      // A split is a scope change even if all children are later removed.
      ...(next.subtasks.length && estimate ? { effortEstimate: { ...estimate, confirmed: false, scopeKey: "needs-review:split" } } : {}),
    },
  };
}

type ExampleEstimate = Pick<TaskEffortEstimate, "minutes" | "workMethod" | "reason">;
const complexExamples: ExampleEstimate[] = [
  { minutes: 480, workMethod: "AI 整理名单与条款，人工筛选、沟通并核对合作", reason: "估算假设：名单筛选与核对 2 h，商务沟通和条款确认 6 h；不含等待达人回复。" },
  { minutes: 600, workMethod: "AI 辅助初稿，人工改写、审核与素材校对", reason: "估算假设：初稿整理 2 h，人工修改审核 6 h，素材校对 2 h；不计 AI 后台生成时间。" },
  { minutes: 360, workMethod: "人工彩排与上线执行，工具辅助记录和检查", reason: "估算假设：准备检查 1 h，彩排与问题修正 2 h，上线值守 3 h；仅计人员实际投入。" },
  { minutes: 240, workMethod: "表格和库存工具辅助，人工核对价格与履约方案", reason: "估算假设：价格及优惠核对 1 h，库存与履约核对 2 h，跨团队确认 1 h；不含物流等待。" },
  { minutes: 300, workMethod: "AI 辅助投流方案，人工审核、配置与跟进", reason: "估算假设：方案与预算核对 2 h，配置检查 1 h，人工跟进调整 2 h；不计广告自动投放时长。" },
  { minutes: 240, workMethod: "脚本汇总数据，AI 辅助复盘，人工校验与结论确认", reason: "估算假设：数据校验 1 h，分析复盘 2 h，结论核对 1 h；不计无人值守的数据处理时间。" },
  { minutes: 180, workMethod: "工具辅助检索，人工审阅素材与合同并复核整改", reason: "估算假设：素材和条款审阅 2 h，整改复核 1 h；不含等待外部反馈。" },
];
const singleExamples: Partial<Record<NonNullable<CreationForm["scenarioId"]>, ExampleEstimate>> = {
  "unassigned-owner": { minutes: 240, workMethod: "人工配置无线网络，现场测试覆盖与连接稳定性", reason: "估算假设：设备已到位，网络配置 2 h，覆盖与会议测试 1 h，使用说明整理 1 h；不含设备采购等待。" },
  "single-task": { minutes: 90, workMethod: "AI 转写与整理初稿，人工校对并核对行动项", reason: "估算假设：校对纪要 45 分钟，补齐行动项 30 分钟，与参会人核对 15 分钟；不计后台转写和等待回复。" },
  "similar-task": { minutes: 180, workMethod: "AI 辅助汇总已有数据，人工分析、撰写与核对", reason: "估算假设：发布数据已齐备，数据核对 1 h，复盘整理与结论确认 2 h；资料缺失时需重估。" },
  "existing-parent": { minutes: 180, workMethod: "AI 辅助名单去重，人工核对联系人与邀请状态", reason: "估算假设：已有名单可用，人工清理核对 2 h，沟通确认 1 h；不计等待媒体回复。" },
};

/** Called only after the exact built-in request has matched. Never a live AI estimate. */
export function withMockCreationEffort(form: CreationForm): CreationForm {
  const estimate = (task: CreationTask, example?: ExampleEstimate): CreationTask => !example || task.effortEstimate ? task : {
    ...task,
    effortEstimate: { ...example, basis: "mock", confirmed: false, version: 1, scopeKey: getEffortScopeKey(task, example.workMethod) },
  };
  if (form.scenarioId === "complex-plan") return { ...form, subtasks: form.subtasks.map((task, index) => estimate(task, complexExamples[index])) };
  if (form.scenarioId === "nested-plan") {
    const leaves = getCreationEffortLeaves(form);
    const minutes = [480, 120, 240, 480, 360, 240];
    return { ...form, subtasks: form.subtasks.map(task => {
      const index = leaves.findIndex(leaf => leaf.clientId === task.clientId);
      return index < 0 ? task : estimate(task, { minutes: minutes[index], workMethod: "工具辅助整理与检查，人工执行并核对交付", reason: `估算假设：${task.title}需人员实际投入 ${minutes[index] / 60} 小时，包含准备、执行与复核；不计等待与后台运行时间。` });
    }) };
  }
  return { ...form, mainTask: estimate(form.mainTask, form.scenarioId ? singleExamples[form.scenarioId] : undefined) };
}
