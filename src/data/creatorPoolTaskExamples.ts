import type { TaskActivityMock, TaskDetailMock, TaskFileNode } from "./taskDetailMocks";
import type { TaskNode } from "./workspaceNodes";
import { getTaskProgressEvents } from "./taskProgressExamples";

type PoolPost = { at: string; author: string; message: string };
type PoolExample = {
  summary: string;
  columns: string[];
  rows: string[][];
  posts: PoolPost[];
};

/** 固定合成业务记录。表格是抽样明细，不将未补齐的资料、草稿或预检当作正式交付。 */
const examples: Record<string, PoolExample> = {
  "ccx-creator-identity-merge": {
    summary: "126 条平台/合同记录完成 42 组候选复核：34 组合并、8 组保留分离，形成 92 个稳定身份；3 组误合并已拆回并于 8 月 29 日再次验收。",
    columns: ["候选组", "平台账号", "合同主体核对", "处理结果", "稳定身份", "复核人"],
    rows: [
      ["G01", "DY-101 / WX-201", "一致", "合并", "C001", "陈默"],
      ["G02", "DY-102 / WX-202", "一致", "合并", "C002", "陈默"],
      ["G03", "DY-103 / WX-203", "一致", "合并", "C003", "陈默"],
      ["G35", "DY-135 / WX-235", "不同主体，同昵称", "8/28 拆回，保持分离", "C035 / C070", "韩序"],
      ["G36", "DY-136 / WX-236", "不同主体，同昵称", "8/28 拆回，保持分离", "C036 / C071", "韩序"],
      ["G37", "DY-137 / WX-237", "主体证明不足", "8/28 拆回，保持分离", "C037 / C072", "韩序"],
    ],
    posts: [
      { at: "2026-08-25T11:00:00+08:00", author: "韩序", message: "已汇入 126 条平台与合同记录，圈出 42 组重复候选；先保留原 ID，未按昵称直接合并。" },
      { at: "2026-08-27T16:00:00+08:00", author: "陈默", message: "42 组候选首轮复核结束，其中 18 组追加了合同主体比对；首版暂按 37 组合并、5 组分离提交。" },
      { at: "2026-08-28T10:00:00+08:00", author: "韩序", message: "复抽发现 G35、G36、G37 共 3 组误合并，已保留撤回前映射并逐组拆回，等待再次验收。" },
      { at: "2026-08-29T11:15:00+08:00", author: "韩序", message: "最终 34 组合并、8 组分离，形成 92 个稳定身份；42 组均有人工判断，原 ID 和合同主体映射已回查，再次验收通过。" },
    ],
  },
  "ccx-creator-consent-audit": {
    summary: "24 位核心达人已完成首轮核对：15 位资料齐全、7 位待补证、2 位有渠道限制。C003、C011 的视频号安排仍超出现有授权，任务保持进行中。",
    columns: ["达人", "联系方式", "素材渠道", "有效期", "核对状态", "待处理项"],
    rows: [
      ["C001", "已核对", "抖音 / 视频号", "2026-12-31", "齐全", "无"],
      ["C002", "已核对", "抖音 / 视频号", "2026-11-30", "齐全", "无"],
      ["C003", "已核对", "仅抖音", "2026-09-30", "渠道限制", "9/10 视频号安排超范围"],
      ["C011", "已核对", "仅抖音", "2026-09-30", "渠道限制", "9/10 视频号安排超范围"],
      ["C017", "待确认", "未知", "未知", "待补证", "缺签署主体证明"],
      ["C024", "已核对", "未知", "2026-08-31 已到期", "待补证", "缺续期文件，不能默认有效"],
    ],
    posts: [
      { at: "2026-08-29T15:00:00+08:00", author: "苏禾", message: "首轮核对覆盖 24 位核心达人：15 位资料齐全、7 位待补证、2 位存在渠道限制，已逐条登记有效期。" },
      { at: "2026-08-30T10:00:00+08:00", author: "陈默", message: "7 位待补证达人已分配回访负责人；C017 缺签署主体证明，C024 的旧文件于 8 月 31 日到期，尚无续期确认。" },
      { at: "2026-08-31T15:00:00+08:00", author: "苏禾", message: "2 位受限达人为 C003、C011，本轮记录已拆分到素材与渠道；15 位资料齐全不代表其他 9 位可以复用。" },
      { at: "2026-09-02T10:00:00+08:00", author: "陈默", message: "7 位待补证对象的回访单仍未关闭；本轮没有新增可用凭证，继续按 15 位齐全、7 位待补、2 位受限维护清单。" },
    ],
  },
  "ccx-creator-performance-window": {
    summary: "24 位核心达人的近 90 天绩效表已修订至 v3。9 月 1 日验收后发现 2 笔边界退款错窗，9 月 2 日撤回验收；37 笔跨窗退款已重放，修订稿待审核。",
    columns: ["达人", "观测天数", "90 天成交(万元)", "退款(万元)", "净成交(万元)", "自然 / 付费净成交", "样本判断"],
    rows: [
      ["C001", "90", "86.4", "7.8", "78.6", "53.2 / 25.4", "完整"],
      ["C002", "90", "72.0", "6.5", "65.5", "44.0 / 21.5", "完整"],
      ["C003", "90", "51.8", "5.3", "46.5", "29.1 / 17.4", "完整"],
      ["C007", "63", "39.0", "3.0", "36.0", "21.0 / 15.0", "不足 90 天，不横向排名"],
      ["C011", "90", "44.6", "4.2", "40.4", "30.4 / 10.0", "完整"],
      ["C014", "41", "28.0", "2.5", "25.5", "17.0 / 8.5", "不足 90 天，不横向排名"],
    ],
    posts: [
      { at: "2026-08-28T15:00:00+08:00", author: "韩序", message: "预检发现 37 笔跨窗退款；24 位核心达人中 C007 仅有 63 天样本、C014 仅有 41 天样本，先登记缺口，不回填为零。" },
      { at: "2026-09-01T10:30:00+08:00", author: "许宁", message: "统一观察窗为 6 月 3 日至 8 月 31 日共 90 天，退款截点为 9 月 1 日 09:00；自然成交和付费增量已分栏。" },
      { at: "2026-09-01T15:30:00+08:00", author: "韩序", message: "24 位核心达人首版对账已提交，37 笔跨窗退款回放完成；C007、C014 两位保留短样本标记，待本轮验收。" },
      { at: "2026-09-02T15:30:00+08:00", author: "韩序", message: "9 月 2 日全量检查发现的 2 笔边界退款已修正，37 笔跨窗退款重新回放；v3 仍待许宁复核，昨日验收已撤回，不能计入已完成量。" },
    ],
  },
  "ccx-creator-risk-score": {
    summary: "已整理 5 起履约/合规事件线索与资料缺口，尚未签发风险等级。授权核对与绩效修订稿未交付，未知资料仍单列，不归入低风险。",
    columns: ["记录", "达人", "事件或缺口", "复核人", "拟复核日", "当前结论"],
    rows: [
      ["R01", "C003", "视频号使用范围待确认", "苏禾", "2026-09-09", "待核对，未签发"],
      ["R02", "C011", "视频号使用范围待确认", "苏禾", "2026-09-09", "待核对，未签发"],
      ["R03", "C018", "两次内容迟交，需核对改期记录", "陈默", "2026-09-10", "待核对，未签发"],
      ["R04", "C020", "退款占比异常，需复核归因", "韩序", "2026-09-10", "待核对，未签发"],
      ["R05", "C024", "旧授权到期，缺续期文件", "苏禾", "2026-09-09", "资料未知，不等于低风险"],
    ],
    posts: [
      { at: "2026-08-26T10:00:00+08:00", author: "苏禾", message: "先建立 5 类待收集字段：具体事件、发生时间、对应材料、复核人、失效时间；正式分层仍等待两项前置任务。" },
      { at: "2026-08-30T14:00:00+08:00", author: "陈默", message: "已收集 5 起事件线索，C018 的 2 次迟交需要核对是否提前确认改期，现阶段不按线索直接定级。" },
      { at: "2026-08-31T14:00:00+08:00", author: "苏禾", message: "5 起记录均已指定复核人；核对计划为 9 月 9–10 日，尚未签发等级，因此不存在已生效的低风险名单。" },
      { at: "2026-09-02T16:00:00+08:00", author: "韩序", message: "绩效表 v3 仍待复核，R04 的退款归因不能定案；5 起事件继续保留待核对状态，没有新增风险签发。" },
    ],
  },
  "ccx-creator-ratecard-renewal": {
    summary: "已整理 6 位核心达人的报价预备资料，3 位草稿采用 22% 佣金，与已确认的 18% 上限冲突；全部仍是未发送、未获达人接受的谈判底稿。",
    columns: ["达人", "内容费(元)", "草稿佣金", "授权费(元)", "已确认佣金上限", "对外状态"],
    rows: [
      ["C001", "12000", "22%", "3000", "18%", "未发送 / 未接受"],
      ["C002", "10000", "22%", "2500", "18%", "未发送 / 未接受"],
      ["C003", "9000", "22%", "待确认", "18%", "未发送 / 未接受"],
      ["C007", "6000", "18%", "1500", "18%", "短样本，待绩效复核"],
      ["C011", "7500", "18%", "待确认", "18%", "渠道受限，待核对"],
      ["C014", "5000", "18%", "1000", "18%", "短样本，待绩效复核"],
    ],
    posts: [
      { at: "2026-08-26T14:00:00+08:00", author: "陈默", message: "先收集 6 位核心达人的历史合同费用结构，正式复核计划仍为 9 月 14–20 日，当前不向达人发出新承诺。" },
      { at: "2026-08-30T15:00:00+08:00", author: "韩序", message: "6 份预备记录已拆分内容费、佣金和授权费；C007、C014 两位的绩效样本不足，暂不能与完整窗口直接比较。" },
      { at: "2026-08-31T16:00:00+08:00", author: "陈默", message: "3 位核心达人的分项测算需要追加核对，另外 3 位保留原参数；所有金额仍为草稿，不是达人已接受的报价。" },
      { at: "2026-09-02T16:10:00+08:00", author: "陈默", message: "6 份底稿均未发送；风险签发和绩效表 v3 未交付，正式复核继续待开始，本轮未形成新的对外承诺。" },
    ],
  },
  "ccx-creator-inactive-exit": {
    summary: "预筛 9 位待复核对象：4 位长期未联系、3 位旧授权到期、2 位重复入口。另标记 2 笔未结算和 1 项进行中合作；尚未执行任何停用。",
    columns: ["达人 / 入口", "预筛原因", "保护项", "当前动作", "恢复条件"],
    rows: [
      ["C024", "旧授权到期", "无进行中合作", "待合规复核，未停用", "补齐续期文件"],
      ["C025", "旧授权到期", "未结算 3200 元", "保留结算入口", "授权与结算分别核对"],
      ["C026", "旧授权到期", "9/12 进行中合作", "保留合作入口", "负责人确认合作边界"],
      ["C027", "长期未联系", "未结算 1800 元", "仅登记回访，未停用", "完成回访与主体确认"],
      ["C028", "长期未联系", "无", "待商务复核，未停用", "联系方式重新确认"],
      ["C001-旧入口", "重复入口", "主身份 C001 有效", "待入口映射核对", "保留主身份与历史映射"],
    ],
    posts: [
      { at: "2026-08-30T11:00:00+08:00", author: "陈默", message: "预筛 9 位对象：4 位长期未联系、3 位旧授权到期、2 位重复入口；目前只是候选，不等于已确认退出。" },
      { at: "2026-08-31T11:30:00+08:00", author: "苏禾", message: "已标记 2 笔未结算款项和 1 项进行中合作，停用清单必须保留这些保护项，不能连同历史结算一起关闭。" },
      { at: "2026-09-01T15:00:00+08:00", author: "陈默", message: "C025 待结算 3200 元、C027 待结算 1800 元，C026 仍有 9 月 12 日合作；三项保护条件已写入草稿。" },
      { at: "2026-09-02T16:20:00+08:00", author: "苏禾", message: "9 位对象尚未完成商务与合规联合复核，当前实际停用数为 0；等待风险分层后逐项确认停用日和恢复条件。" },
    ],
  },
  "ccx-creator-vertical-recruit": {
    summary: "已预收集 18 条熟龄护肤线索，发现 4 条既有合作重复、2 条身份待查；其余 12 条仍待人工去重与人群匹配，尚未达到 12 位合格候选的完成标准。",
    columns: ["线索", "内容方向", "目标人群", "与既有池关系", "预检状态"],
    rows: [
      ["L01", "成分与耐受", "40+ 熟龄", "未发现重复", "待人工核验"],
      ["L02", "换季屏障护理", "35–45 岁", "未发现重复", "待人群结果确认"],
      ["L03", "夜间抗老护理", "45+ 熟龄", "未发现重复", "待人工核验"],
      ["L13", "护肤测评", "35+", "与 C001 重复", "从新达人候选中排除"],
      ["L14", "敏感肌护理", "40+", "与 C011 重复", "从新达人候选中排除"],
      ["L17", "日常护肤", "未知", "身份待查", "不计入合格候选"],
    ],
    posts: [
      { at: "2026-08-30T11:30:00+08:00", author: "林洁", message: "预收集 18 条熟龄护肤线索，覆盖成分耐受、屏障护理、夜间抗老 3 类内容；正式名单仍等待双十一人群复算结果。" },
      { at: "2026-08-31T15:30:00+08:00", author: "韩序", message: "18 条线索初筛发现 4 条与既有合作重复、2 条身份待查，先排除重复并保留待查，剩余 12 条不代表已经合格。" },
      { at: "2026-09-01T16:30:00+08:00", author: "陈默", message: "完成标准要求至少 12 位去重候选，当前可核验余量恰好 12 条；若复核再淘汰，需要补充线索，尚未向任何达人发出邀约。" },
      { at: "2026-09-02T16:30:00+08:00", author: "陈默", message: "人工去重与候选备选量已计入 7 h 估算；18 条预收集线索仍未形成最终名单，正式工作计划保持 9 月 20–27 日。" },
    ],
  },
  "ccx-creator-monthly-committee": {
    summary: "会议暂移出后已按 4 h 重新纳入，计划 9 月 28–30 日召开。当前有 3 项口径争议与 5 位优先候选草稿，尚未形成续约、退出或扩充决定。",
    columns: ["草稿顺序", "达人", "30 天 GMV(万元)", "90 天样本", "尚缺材料", "决定状态"],
    rows: [
      ["1", "C001", "32.4", "完整", "报价与风险签发", "未决定"],
      ["2", "C007", "30.0", "63 天，不足", "统一评审窗口", "未决定"],
      ["3", "C002", "27.0", "完整", "报价与风险签发", "未决定"],
      ["4", "C014", "24.0", "41 天，不足", "统一评审窗口", "未决定"],
      ["5", "C003", "22.0", "完整", "渠道限制与报价", "未决定"],
    ],
    posts: [
      { at: "2026-08-26T15:00:00+08:00", author: "周岚", message: "先按 3 h 预留九月治理决策会，准备续约、退出、补充 3 类议题；召开窗口暂定 9 月 28–30 日。" },
      { at: "2026-08-31T17:00:00+08:00", author: "陈默", message: "预备议题涉及 5 位优先对象，报价、停用、补充名单 3 项交付仍未完成，这份预备表不能直接作为执行名单。" },
      { at: "2026-09-01T11:15:00+08:00", author: "周岚", message: "今天拟并入月度经营会，先移出 3 h 会议执行范围；已有预备材料保留，本轮没有形成达人续约或退出决定。" },
      { at: "2026-09-02T17:00:00+08:00", author: "周岚", message: "授权渠道、报价边界、绩效窗口共 3 项争议需单独确认，会议按 4 h 重新纳入；每项决定将分别记录唯一负责人和期限，当前仍未召开。" },
    ],
  },
};

const groupLeaves = new Map<string, string[]>([
  ["ccx-creator-pool-data-track", ["ccx-creator-identity-merge", "ccx-creator-consent-audit", "ccx-creator-performance-window", "ccx-creator-risk-score"]],
  ["ccx-creator-pool-decision-track", ["ccx-creator-ratecard-renewal", "ccx-creator-inactive-exit", "ccx-creator-vertical-recruit", "ccx-creator-monthly-committee"]],
  ["ccx-creator-pool-governance", Object.keys(examples)],
]);

function groupExample(task: TaskNode): PoolExample | undefined {
  const ids = groupLeaves.get(task.id);
  if (!ids) return undefined;
  const events = getTaskProgressEvents(task.id);
  return {
    summary: task.id === "ccx-creator-pool-decision-track"
      ? "四项决策子任务已准备线索、费用与会议资料，尚待前置交付；会议经历移出再纳入，当前没有已验收的决策成果。"
      : "身份合并已再次验收，绩效表验收因边界退款问题撤回；范围随核对结果逐步调整，未验收草稿不计入完成工时。",
    columns: ["子任务", "当前业务记录", "历史事件数"],
    rows: ids.map((id) => [events.find((event) => event.taskId === id)!.taskTitle, examples[id].summary, String(events.filter((event) => event.taskId === id).length)]),
    posts: [
      { at: "2026-08-26T16:00:00+08:00", author: task.ownerId, message: "本轮按身份、授权、绩效和决策分别维护交付记录；截至 8 月 26 日仅完成范围与预备材料登记，不据此认定子任务验收。" },
      { at: "2026-08-31T17:30:00+08:00", author: task.ownerId, message: `已收齐本范围 ${ids.length} 项末级任务的核对线索，正式结果与草稿分开维护；改估只改变对应叶子的工作量。` },
      { at: "2026-09-02T18:00:00+08:00", author: task.ownerId, message: `截至 9 月 2 日，本范围记录 ${events.length} 条范围、改估和验收事件；每条变化均保留具体子任务、发生时间与原因，父级不重复累计工时。` },
    ],
  };
}

export function getCreatorPoolTaskExample(task: TaskNode): Pick<TaskDetailMock, "activities" | "files" | "commits" | "summary"> | undefined {
  if (task.teamId !== "creator-commerce" || task.createdFrom) return undefined;
  const spec = Object.hasOwn(examples, task.id) ? examples[task.id] : groupExample(task);
  if (!spec) return undefined;
  const names = {
    rule: `${task.name}业务规则.md`, record: `${task.name}核对记录.xlsx`,
    result: `${task.name}交付确认.md`, history: "历史判断记录.md",
  };
  const lastAt = spec.posts.at(-1)!.at;
  const events = getTaskProgressEvents(task.id);
  const markdownFile = (key: "rule" | "result" | "history", content: string): TaskFileNode => ({
    id: `${task.id}-${key === "history" ? "history-file" : key}`,
    kind: "file", parentId: `${task.id}-${key === "rule" ? "requirements" : key === "result" ? "delivery" : "history"}`,
    name: names[key], format: "MD", version: 3, updatedAt: lastAt,
    content: `# ${names[key]}\n\n> 本地合成演示数据，不代表实际授权、报价或业务决定。\n\n${content}`,
  });
  const files: TaskFileNode[] = [
    ...([ ["requirements", "需求与规则"], ["evidence", "证据与记录"], ["delivery", "交付成果"], ["history", "历史版本"] ] as const).map(([key, name]): TaskFileNode => ({
      id: `${task.id}-${key}`, kind: "folder", name, parentId: key === "history" ? `${task.id}-evidence` : null, updatedAt: lastAt,
    })),
    markdownFile("rule", `## 任务目标\n\n${task.goal}\n\n## 完成标准\n\n${(task.completionCriteria ?? []).map((criterion) => `- ${criterion}`).join("\n")}\n\n## 记录边界\n\n数据表展示抽样明细，总量以核对记录为准；预检、待审、资料未知和已验收分别记录。`),
    {
      id: `${task.id}-record`, kind: "file", parentId: `${task.id}-evidence`, name: names.record, format: "XLSX", version: 3, updatedAt: lastAt,
      previewData: { kind: "table", sheets: [
        { name: "核对明细（抽样）", columns: [...spec.columns], rows: spec.rows.map((row) => [...row]) },
        { name: "核对日志", columns: ["时间", "成员", "记录"], rows: spec.posts.map((post) => [post.at.slice(0, 16).replace("T", " "), post.author, post.message]) },
      ] },
    },
    markdownFile("result", `## 当前结果\n\n${spec.summary}\n\n当前任务状态：${task.status}。\n\n${spec.posts.at(-1)!.message}\n\n草稿与预备资料不代表对外承诺；是否完成以负责人显式验收为准。`),
    markdownFile("history", events.map((event) => `- ${event.at.slice(0, 16).replace("T", " ")}｜${event.actor}：${event.note}`).join("\n")),
  ];
  const activities: TaskActivityMock[] = spec.posts.map((post, index) => ({
    id: index === 0 ? `${task.id}-activity` : `${task.id}-pool-update-${index + 1}`,
    author: post.author, createdAt: post.at, time: post.at.slice(0, 16).replace("T", " "), message: post.message,
    file: names.record, type: "member-post",
  }));
  return {
    summary: spec.summary, activities, files,
    commits: [spec.posts[0], spec.posts[1], spec.posts.at(-1)!].map((post, index) => ({
      id: index === 0 ? `${task.id}-commit` : `${task.id}-pool-commit-${index + 1}`,
      author: post.author, createdAt: post.at, time: post.at.slice(0, 16).replace("T", " "),
      message: `${index === 0 ? "建立核对底稿" : index === 1 ? "补充核对记录" : "更新当前交付边界"}：${post.message}`,
      files: index === 0 ? [names.rule, names.record] : index === 1 ? [names.record] : [names.record, names.result, names.history],
    })),
  };
}
