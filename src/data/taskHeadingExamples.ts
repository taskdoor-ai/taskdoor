import type { TaskBurnUpSeries } from "../lib/taskBurnUp";
import { getTaskProgressBurnUp } from "./taskProgressExamples";

export type TaskHeadingExample = {
  completionCriteria: string[];
  burnUp?: TaskBurnUpSeries;
};

/**
 * 独立展示示例，不是 Task 正式完成标准或真实 EWD 历史。
 * 来源保留在数据元信息中，界面不额外显示演示标记；优先使用任务真实数据，此目录不参与状态变更、验收或持久化。
 * 所有历史日期与数值固定，不读取当前 TaskStatus、不用今天的值回填过去。
 */
const examples: Record<string, TaskHeadingExample> = {
  "fragrance-final-decision": {
    completionCriteria: [
      "确认 GMV 目标、预算上限与停止条件，测算依据可追溯。",
      "数据与合规意见完成复核，最终决策留档并获确认。",
      "决策记录写明执行负责人、实施窗口与复审条件。",
    ],
  },
  "fragrance-creator-wrapup": {
    completionCriteria: [
      "达人合作、内容、直播、商品、投流、数据、合规与最终决策均有可定位的交付记录，未解决事项写明处理边界。",
      "项目复盘统一 GMV、消耗与渠道归因口径，保留最终预算结论、后续行动项及结果确认记录。",
    ],
  },
  "weekly-retro-notes": {
    completionCriteria: [
      "纪要覆盖本周关键决定与未解决问题，每条决定能定位讨论依据，分歧与待确认项单独标明。",
      "下周行动项写明具体交付、负责人和时间；纪要由参与复盘的成员核对后共享给团队。",
    ],
  },
  "fragrance-creator-business": {
    completionCriteria: [
      "第二批达人名单保留筛选依据、已确认报价和佣金条款，合作档期与内容交付时间可核对。",
      "每位入选达人均有合作确认记录；未确认或临时退出的合作列明替补方案，不冒充已签约。",
    ],
  },
  "fragrance-content": {
    completionCriteria: [
      "短视频脚本、直播卖点和话术使用同一版礼盒信息，素材终审意见已逐项处理并保留版本。",
      "未经证实的功效宣称不得进入上线稿，待合规确认的内容明确标记并暂停使用。",
    ],
  },
  "fragrance-live": {
    completionCriteria: [
      "彩排覆盖上架、优惠口播、库存提示与场控交接，排期和执行清单经相关人员确认。",
      "断流、价格错误和库存不足的异常预案写明触发条件、处理人及停播或恢复步骤。",
    ],
  },
  "fragrance-product": {
    completionCriteria: [
      "礼盒售价、赠品、优惠叠加规则和库存水位已锁定，商品页面与直播清单保持一致。",
      "缺货、超卖和赠品不足的处理边界与履约方案可查，变更价格或库存需同步执行方。",
    ],
  },
  "fragrance-growth": {
    completionCriteria: [
      "第二轮预算与人群包调整有首轮表现依据，预算上限、ROI 核对口径和停止条件写入投放方案。",
      "投放配置与已确认方案一致，异常消耗的暂停和回退步骤明确，并保留调整前后记录。",
    ],
  },
  "fragrance-data": {
    completionCriteria: [
      "GMV 看板统一成交、退款、投放消耗和渠道归因口径，指标来源与统计时间窗可核对。",
      "渠道差异和缺失数据有说明，复盘结论可定位原始报表，不能用未核实数据支撑追加投放决策。",
    ],
  },
  "fragrance-compliance": {
    completionCriteria: [
      "素材宣称和达人合同完成审核，问题条款、修改版本与审核结论留有可定位记录。",
      "上线材料不含未处理的合规风险；需补证或暂缓的材料注明限制条件和再次送审要求。",
    ],
  },
};

/** 每次返回副本，防止界面中的临时编辑污染所有任务共用的示例基线。 */
export function getTaskHeadingExample(taskId: string): TaskHeadingExample | undefined {
  if (!Object.prototype.hasOwnProperty.call(examples, taskId)) return undefined;
  const example = examples[taskId];
  const burnUp = getTaskProgressBurnUp(taskId);
  return {
    completionCriteria: [...example.completionCriteria],
    ...(burnUp ? { burnUp } : {}),
  };
}
