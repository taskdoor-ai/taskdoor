import type { TaskDetailMock, TaskFileNode } from "./taskDetailMocks";
import type { TaskNode } from "./workspaceNodes";

type ContentExample = {
  scope: string;
  basisName?: string;
  currentName: string;
  /** 核对项、基准文件取值、执行文件取值；原始资料不包含预写诊断。 */
  rows: Array<[string, string, string]>;
  author: string;
  note: string;
};

/** 内置合成资料。保留原任务和历史文件，在同一任务中补充两侧可打开核对的内容。 */
const examples: Record<string, ContentExample> = {
  "fragrance-product": {
    scope: "香氛礼盒首批", basisName: "礼盒商品权益确认表.xlsx", currentName: "礼盒打包执行清单.xlsx",
    rows: [["每盒赠品", "2 支试香", "1 支试香"], ["到手价", "299 元", "299 元"], ["礼袋", "1 个", "1 个"]],
    author: "梁川", note: "仓库回传了首批打包清单，商品权益确认表保留给客服和仓库共同核对。",
  },
  "fragrance-growth": {
    scope: "香氛第二轮投流", basisName: "第二轮投流停止条件.xlsx", currentName: "第二轮投流执行配置.xlsx",
    rows: [["扣退款 ROI 停止线", "1.5", "1.2"], ["连续观察时长", "2 小时", "2 小时"], ["预算上限", "80000 元", "80000 元"]],
    author: "许宁", note: "已导出第二轮人群包配置和停止条件，低效人群的自动暂停规则也在表里。",
  },
  "fragrance-data": {
    scope: "香氛首发 GMV 看板", basisName: "GMV 指标定义表.xlsx", currentName: "GMV 看板字段配置.xlsx",
    rows: [["主指标退款处理", "扣除已到账退款", "不扣除退款"], ["归因窗口", "7 天", "7 天"], ["时区", "Asia/Shanghai", "Asia/Shanghai"]],
    author: "韩序", note: "看板已导出当前字段配置，指标定义表与配置表分别保留，便于核对净成交计算。",
  },
  "product-launch-venue": {
    scope: "秋季新品发布会", basisName: "发布会场地容量确认表.xlsx", currentName: "发布会座席执行表.xlsx",
    rows: [["可容纳人数", "180 人", "220 人"], ["无障碍席", "4 席", "4 席"], ["设备进场口", "东侧货梯", "东侧货梯"]],
    author: "高远", note: "场地方的容量确认与当前座席表已收齐，等核对后再发最终邀请名额。",
  },
  "product-launch-run-of-show": {
    scope: "发布会嘉宾演示", basisName: "嘉宾衔接确认表.xlsx", currentName: "发布会导播执行表.xlsx",
    rows: [["演示开始时间", "14:10", "14:30"], ["演示时长", "15 分钟", "15 分钟"], ["切换信号", "主持人口播后切屏", "主持人口播后切屏"]],
    author: "高远", note: "嘉宾衔接表和导播 cue 表均已更新，演示后的问答由主持人接回。",
  },
  "product-launch-promo-assets": {
    scope: "秋季新品发布会邀请函", basisName: "发布会活动信息表.xlsx", currentName: "邀请函发布文字稿.xlsx",
    rows: [["活动日期", "2026-09-20", "2026-09-21"], ["签到时间", "13:30", "13:30"], ["地点", "A 展厅", "A 展厅"]],
    author: "林洁", note: "邀请函的当前发布文字稿已从设计文件抽出，与活动信息表一起交给内容核对。",
  },
  "weekly-retro-decisions": {
    scope: "复盘事项 D04", basisName: "本周事项确认台账.xlsx", currentName: "复盘纪要决定清单.xlsx",
    rows: [["决定状态", "已通过", "已通过"], ["事项", "直播间设备租赁", "直播间设备租赁"], ["适用周期", "9/21–9/25", "9/21–9/25"]],
    author: "陈默", note: "9/14 12:00 已逐条核对决定和依据，D04 的确认台账与纪要清单已统一，确认完成。",
  },
  "weekly-retro-open-issues": {
    scope: "未解决问题 Q07", basisName: "问题责任边界表.xlsx", currentName: "复盘问题跟进清单.xlsx",
    rows: [["确认人", "陈默", "周岚"], ["影响范围", "达人合同附件", "达人合同附件"], ["下次核对", "2026-09-15 10:00", "2026-09-15 10:00"]],
    author: "陈默", note: "Q07 的影响范围已收敛到合同附件，责任边界表和跟进清单需要使用同一个确认人。",
  },
  "weekly-retro-actions": {
    scope: "行动项 A03", basisName: "下周行动承诺表.xlsx", currentName: "行动项执行排期.xlsx",
    rows: [["交付日期", "2026-09-18", "2026-09-17"], ["负责人", "林洁", "林洁"], ["交付物", "三版封面源文件", "三版封面源文件"]],
    author: "林洁", note: "封面行动项的承诺表和执行排期已补齐，源文件与裁切图作为同一份交付核对。",
  },
  "ccx-serum-creator-longlist": {
    scope: "精华候选达人分层", currentName: "精华达人分层参数.xlsx",
    rows: [["分层观察窗", "", "30 天"], ["候选数量", "", "24 位"], ["风险标注", "", "逐人记录"]],
    author: "韩序", note: "24 位候选的去重结果与分层参数已整理，观察窗保留在参数表中供复核。",
  },
  "ccx-serum-claim-matrix": {
    scope: "精华宣称 CL-03", basisName: "CL-03 试验适用条件.xlsx", currentName: "精华宣称矩阵发布参数.xlsx",
    rows: [["适用人群", "不含敏感肌", "所有肤质"], ["证据版本", "TEST-v2", "TEST-v2"], ["使用周期", "28 天", "28 天"]],
    author: "苏禾", note: "CL-03 对应 TEST-v2 的适用条件已整理，发布参数中的人群范围单列核对。",
  },
  "ccx-creator-consent-audit": {
    scope: "C003 九月素材", basisName: "C003 素材授权范围.xlsx", currentName: "C003 九月素材复用排期.xlsx",
    rows: [["可投放渠道", "抖音", "抖音、视频号"], ["授权截止", "2026-09-30", "2026-09-30"], ["素材编号", "C003-M09", "C003-M09"]],
    author: "苏禾", note: "C003 的授权范围和素材复用排期已补入文件，沿用原核对表中的渠道限制，未新增视频号授权。",
  },
  "ccx-creator-ratecard-renewal": {
    scope: "C001 四季度续约", basisName: "核心达人佣金边界.xlsx", currentName: "C001 对外报价执行卡.xlsx",
    rows: [["佣金率", "18%", "22%"], ["内容费", "单独列示", "单独列示"], ["授权费", "单独列示", "单独列示"]],
    author: "陈默", note: "C001 对外报价执行卡尚未发送，佣金边界、内容费和授权费已拆开存放供复核。",
  },
  "ccx-creator-monthly-committee": {
    scope: "九月达人续约名单", basisName: "九月续约评审口径.xlsx", currentName: "续约名单排序参数.xlsx",
    rows: [["排名观察窗", "90 天", "30 天"], ["成交指标", "扣退款净成交", "扣退款净成交"], ["样本不足处理", "单独标记", "单独标记"]],
    author: "韩序", note: "9 月名单排序参数已单独导出，当前已改用净成交，但观察窗仍保留在文件中待核对。",
  },
  "ccx-extreme-claim-incident": {
    scope: "极限词视频 V017", basisName: "V017 下架与禁用范围.xlsx", currentName: "V017 素材替换执行单.xlsx",
    rows: [["可继续使用片段", "全部暂停使用", "保留第 18–25 秒"], ["投放状态", "暂停", "暂停"], ["原视频编号", "V017", "V017"]],
    author: "苏禾", note: "V017 的禁用范围与替换执行单已汇入任务，投放保持暂停，素材片段需要逐项复核。",
  },
  "ccx-creator-collaboration-handbook": {
    scope: "直播断流升级", basisName: "直播异常升级规则.xlsx", currentName: "达人合作手册执行参数.xlsx",
    rows: [["升级等待时间", "30 秒", "180 秒"], ["升级对象", "当班场控", "当班场控"], ["保留记录", "推流日志", "推流日志"]],
    author: "高远", note: "异常升级规则和手册执行参数已放在同一任务下，新案例继续单独追加。",
  },
  "unassigned-creator-sample-tracking": {
    scope: "寄样未回复记录", currentName: "寄样台账归类规则.xlsx",
    rows: [["无反馈归类", "", "记为试用通过"], ["物流状态", "", "按签收记录填写"], ["回访间隔", "", "3 天"]],
    author: "陈默", note: "先补入现有寄样台账的归类规则，负责人待确认；未回复名单尚未完成复核。",
  },
  "unassigned-short-video-covers": {
    scope: "秋季上新封面", currentName: "封面制作规格单.xlsx",
    rows: [["制作版本数", "", "2 版"], ["竖屏裁切", "", "9:16"], ["交付格式", "", "源文件及 PNG"]],
    author: "林洁", note: "现有制作规格单已作为输入资料上传，后续接手人需先核对版本数量再出图。",
  },
  "unassigned-live-backup-plan": {
    scope: "直播断流切换", basisName: "备用推流切换规范.xlsx", currentName: "断流应急操作单.xlsx",
    rows: [["切换顺序", "停止主推流后启动备用", "保留主推流并启动备用"], ["恢复检查", "声音与画面同步", "声音与画面同步"], ["异常留痕", "记录切换时间", "记录切换时间"]],
    author: "高远", note: "已提供现有切换规范和操作单作为待核对输入，桌面演练尚未开展。",
  },
  "unassigned-gift-stock-check": {
    scope: "中秋试香赠品 G01", basisName: "G01 仓库可用量.xlsx", currentName: "G01 活动承诺配置.xlsx",
    rows: [["本次可承诺数量", "600 份", "1000 份"], ["账面实物", "1000 份", "1000 份"], ["其他活动已锁定", "400 份", "400 份"]],
    author: "梁川", note: "实物 1000 份中有 400 份被其他活动锁定，仓库可用量与活动承诺配置均已上传。",
  },
  "unassigned-attribution-dictionary": {
    scope: "达人订单归因", basisName: "归因字段定义.xlsx", currentName: "渠道报表去重配置.xlsx",
    rows: [["去重主键", "order_id", "device_id"], ["时区", "Asia/Shanghai", "Asia/Shanghai"], ["退款字段", "refund_amount", "refund_amount"]],
    author: "韩序", note: "字段字典与现行报表配置先作为输入归档，去重样例保留订单 ID 与设备 ID 两列。",
  },
};

function isBuiltInUnassigned(task: TaskNode): boolean {
  return task.id.startsWith("unassigned-") && Object.hasOwn(examples, task.id)
    && task.createdFrom === "task-editor" && task.createdBy === "周岚" && task.createdAt === "2026-09-02T18:00:00+08:00";
}

export function withExpandedTaskDiagnosisExample(task: TaskNode, detail: TaskDetailMock): TaskDetailMock {
  const spec = Object.hasOwn(examples, task.id) ? examples[task.id] : undefined;
  if (!spec || task.teamId !== "creator-commerce" || (task.createdFrom && !isBuiltInUnassigned(task))) return detail;
  if (detail.files.some((file) => file.id === `${task.id}-diagnosis-current`)) return detail;
  const createdAt = task.id.startsWith("weekly-retro-") ? (task.id === "weekly-retro-decisions" ? "2026-09-14T12:00:00+08:00" : "2026-09-14T17:00:00+08:00") : "2026-09-02T18:20:00+08:00";
  const time = `${createdAt.slice(0, 10)} ${createdAt.slice(11, 16)}`;
  const file = (role: "basis" | "current", name: string, valueIndex: 1 | 2): TaskFileNode => ({
    id: `${task.id}-diagnosis-${role}`, name, kind: "file", parentId: null, format: "XLSX", version: 1,
    updatedAt: time,
    previewData: { kind: "table", sheets: [{ name: "当前适用内容", columns: ["对象", "核对项", "取值", "状态"], rows: spec.rows.map((row) => [spec.scope, row[0], row[valueIndex], "当前"]) }] },
  });
  const added = [...(spec.basisName ? [file("basis", spec.basisName, 1)] : []), file("current", spec.currentName, 2)];
  return {
    ...detail,
    files: [...detail.files, ...added],
    activities: [...detail.activities, { id: `${task.id}-diagnosis-context-post-1`, author: spec.author, message: spec.note, type: "member-post", createdAt, time, file: spec.currentName }],
    commits: [...detail.commits, { id: `${task.id}-diagnosis-context-commit-1`, author: spec.author, message: `补入${spec.scope}的核对资料。`, files: added.map((file) => file.name), createdAt, time }],
  };
}
