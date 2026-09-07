import type { TaskDetailMock, TaskFileNode } from "./taskDetailMocks";
import type { TaskNode } from "./workspaceNodes";

type ResultExample = {
  rule: string;
  ruleName?: string;
  columns: string[];
  rows: string[][];
  result: string;
  posts: Array<{ author: string; message: string }>;
};

/** 合成任务正文，不包含预写诊断。沿用现有目标、标准及文件位置，
 * 冲突双方写进实际文件或任务标准；成员讨论只记录进展和建议。
 */
const examples: Record<string, ResultExample> = {
  "fragrance-final-decision": {
    ruleName: "本轮投放预算与目标口径.pdf",
    rule: "适用范围：本轮追加投放；文件状态：执行版；预算上限：80000 元；GMV 目标：320000 元\n本次交付包含预算、GMV 目标、资源优先级和停止条件。投放尚未启动，合规结论未形成前不追加消耗。",
    columns: ["方案", "预算（元）", "GMV 目标（元）", "用途"],
    rows: [["维持方案", "80000", "320000", "已测算"], ["放量方案", "120000", "480000", "已测算"], ["保守方案", "60000", "240000", "备选，未采用"], ["仅素材验证", "20000", "80000", "备选，未采用"]],
    result: "适用范围：本轮追加投放；方案状态：执行版；预算上限：120000 元；GMV 目标：480000 元\n资源优先级：已完成终审的素材优先；未终审素材不纳入。\n停止条件：连续 2 小时扣退款 ROI 低于 1.5 时暂停；合规通过后才可启动。",
    posts: [
      { author: "韩序", message: "已把四种方案的预算和 GMV 测算补进《追加投放测算与风险记录》，退款按同一截点扣除，备选方案单独列示。" },
      { author: "许宁", message: "《最终投放决策记录》已填写放量方案：预算 12 万元、GMV 目标 48 万元，并标为执行版；投放尚未启动。" },
      { author: "周岚", message: "预算与目标口径文件已补齐，请对照文件核对最终投放记录；讨论中的放量建议不直接替换文件里的执行金额。" },
    ],
  },
  "ccx-serum-contract-close": {
    ruleName: "核心达人合同授权附件.pdf",
    rule: "本轮收口 8 位核心达人。以下为当前合同附件记录，C007、C008 尚未回签。\n达人：C001；合同版本：v2；授权渠道：抖音、视频号；文件状态：已签署\n达人：C002；合同版本：v2；授权渠道：抖音；文件状态：已签署\n达人：C003；合同版本：v1；授权渠道：抖音；文件状态：已签署\n达人：C004；合同版本：v2；授权渠道：抖音、视频号；文件状态：已签署\n达人：C005；合同版本：v1；授权渠道：抖音；文件状态：已签署\n达人：C006；合同版本：v2；授权渠道：抖音；文件状态：已签署",
    columns: ["达人", "合同版本", "授权渠道", "发布渠道", "排期状态"],
    rows: [["C001", "v2", "抖音、视频号", "抖音", "执行"], ["C002", "v2", "抖音", "抖音", "执行"], ["C003", "v1", "抖音", "抖音", "执行"], ["C004", "v2", "抖音、视频号", "视频号", "执行"], ["C005", "v1", "抖音", "抖音", "执行"], ["C006", "v2", "抖音", "抖音、视频号", "执行"], ["C007", "v1", "抖音", "抖音", "草稿"], ["C008", "v1", "抖音", "抖音", "草稿"]],
    result: "交付内容：8 位核心达人的报价附件和发布排期。\nC001–C006 已填写执行排期；C007、C008 仍待回签，未列为已确认合作。\n本次未新增视频号授权附件。",
    posts: [
      { author: "苏禾", message: "8 位核心达人的合同已逐项整理；C006 当前 v2 附件只覆盖抖音，没有视频号补充授权。" },
      { author: "陈默", message: "C007、C008 继续保留待回签，替补顺序与报价失效时间已补齐，不按口头意向记作已签约。" },
      { author: "陈默", message: "合同附件与发布排期按核对表执行，C001–C006 的执行排期都保留；请内容同事按表内发布渠道准备交付。" },
    ],
  },
  "ccx-serum-asset-batch": {
    rule: "交付测评型和成分型两类母版，镜头、字幕、口播与替换规则共用素材编号。源文件与导出件保持同一版本。",
    columns: ["母版", "位置", "段落类型", "改写规则", "交付状态"],
    rows: [["SER-M01", "开场", "体验段", "允许自由改写", "交付版"], ["SER-M01", "功效口播", "宣称段", "允许自由改写", "交付版"], ["SER-M02", "成分介绍", "宣称段", "不可修改", "交付版"], ["SER-M02", "使用展示", "体验段", "允许替换画面", "交付版"]],
    result: "交付版本：测评型 SER-M01 与成分型 SER-M02 均为 v2。\n源文件、导出件和镜头清单已齐备；宣称段的改写规则采用核对表中的设置。\n本次尚未完成最终验收。",
    posts: [
      { author: "苏禾", message: "完成标准中的“不可修改宣称”仍适用于两类母版，达人自己的体验段可以改写，宣称段不能开放自由修改。" },
      { author: "林洁", message: "两类母版的源文件和导出件已按 v2 整理，镜头清单已区分体验段、成分段和功效口播。" },
      { author: "林洁", message: "母版交付按核对表的改写规则执行。SER-M01 的功效口播也开放给达人自由改写，这轮先按该设置交付。" },
    ],
  },
  "ccx-serum-price-stock": {
    rule: "冻结自播、达人直播和短视频渠道的首批分配。可用量以任务完成标准的首批数量为边界，不把未确认补货当作现货。",
    columns: ["批次", "渠道", "分配数量（件）", "到手价（元）", "分配状态"],
    rows: [["首批", "自播", "6000", "199", "执行"], ["首批", "达人直播", "7000", "199", "执行"], ["首批", "短视频", "2000", "199", "执行"], ["次批", "待分配", "未知", "199", "待确认"]],
    result: "首批交付：三个渠道均采用核对表中的执行数量，到手价统一为 199 元。\n次批补货尚未确认，不计入可用量。\n缺货升级由梁川处理，各渠道分别维护下架阈值。",
    posts: [
      { author: "周岚", message: "首批库存仍按任务里写的 12,000 件分配，补货还没有确认，不能提前计入。" },
      { author: "高远", message: "自播的 6,000 件分配保持不变，短视频的 2,000 件也没有退回；两个渠道的到手价均为 199 元。" },
      { author: "梁川", message: "首批库存按核对表分配执行：自播 6,000 件、达人直播 7,000 件、短视频 2,000 件；这轮先不减少任一渠道。" },
    ],
  },
  "ccx-serum-budget-gate": {
    rule: "分开记录冷启、放量、追投预算及触发条件。ROI 使用扣退款口径，预算追加与素材准入分别核对，不把系统建议当作负责人的决定。",
    columns: ["阶段", "预算（元）", "触发条件", "预算耗尽动作", "确认要求", "配置状态"],
    rows: [["冷启", "20000", "素材终审通过", "自动追加 5000 元", "无需负责人确认", "待启用执行配置"], ["放量", "40000", "净 ROI 连续两小时不低于 1.8", "暂停并申请", "负责人书面确认", "待启用执行配置"], ["追投", "20000", "复购人群回放通过", "暂停并申请", "负责人书面确认", "待启用执行配置"], ["素材测试", "5000", "候选方案", "暂停", "负责人书面确认", "草稿"]],
    result: "已整理三阶段预算与停止条件，自动监测尚未启用。\n冷启组预算耗尽后采用核对表的自动追加配置，其余两阶段先暂停并申请。\n规则回放与最终核准尚未结束。",
    posts: [
      { author: "韩序", message: "三阶段 ROI 统一使用扣退款口径，连续低于停止线时暂停；已补上消耗异常的监测字段。" },
      { author: "许宁", message: "冷启、放量和追投预算已分列，素材尚未全部验收，配置还没有上线，不代表已经产生投放消耗。" },
      { author: "许宁", message: "追加预算按核对表配置执行，冷启组预算耗尽后自动增加 5,000 元，不再等负责人在任务里确认；我这轮提交的就是这套执行配置。" },
    ],
  },
  "ccx-october-studio-calendar": {
    rule: "日历区分已确认活动与候选活动，场地、场控、设备按实际时间占用。候选时段不视作已承诺资源。",
    columns: ["活动", "日期", "开始", "结束", "直播间", "占用方式", "状态"],
    rows: [["品牌自播", "2026-10-01", "19:00", "22:00", "A", "独占", "已确认"], ["达人连麦", "2026-10-01", "20:00", "21:00", "A", "独占", "已确认"], ["大促彩排", "2026-10-02", "14:00", "16:00", "A", "独占", "已确认"], ["产品录制", "2026-10-01", "20:00", "21:00", "B", "独占", "候选"]],
    result: "A 直播间的已确认活动采用资源表时段，场控为高远，主设备为 CAM-A，备用设备为 CAM-B。\nB 直播间的产品录制为候选，不占用确定档期。\n当前未填写品牌自播与达人连麦的改期或合并取舍。",
    posts: [
      { author: "林洁", message: "资源表已把候选录制和已确认活动分开，品牌自播需要 A 直播间连续使用 19:00–22:00。" },
      { author: "梁川", message: "达人连麦需要独立的商品讲解链路，这次不能直接并入品牌自播；资源表里仍保留 20:00–21:00。" },
      { author: "高远", message: "直播间排期按资源表执行，两个已确认活动都保留现有独占时段，暂不改期，也没有做合并取舍。" },
    ],
  },
  "ccx-weekly-settlement": {
    ruleName: "本期佣金结算口径.pdf",
    rule: "结算期：W36；文件状态：执行版；退款截点：2026-09-01 09:00；计佣规则：截点前到账的退款从本期计佣基数中扣除\n佣金按关联合同、订单和本期退款截点核对。退款到账时间、冲抵金额和补差分开记录，待复核不代表已付款。",
    columns: ["达人", "订单批次", "合同版本", "成交（元）", "退款（元）", "退款到账时间", "佣金率", "本期计佣基数（元）", "结算期"],
    rows: [["C009", "W36-09", "v2", "50000", "8000", "2026-09-01 08:30", "20%", "50000", "W36"], ["C001", "W36-01", "v2", "30000", "2000", "2026-09-01 08:00", "18%", "28000", "W36"], ["C002", "W36-02", "v1", "24000", "0", "无退款", "18%", "24000", "W36"], ["C003", "W36-03", "v1", "20000", "1000", "2026-09-01 10:00", "20%", "20000", "W36"]],
    result: "结算清单：订单与合同版本已关联，当前提交商务复核，尚未付款。\nC009 本期计佣基数保留 50,000 元，8,000 元退款暂不从本期扣除；C001 已扣除截点前退款。\n截点后到账的 C003 退款进入下一期记录。",
    posts: [
      { author: "韩序", message: "退款到账时间已回填到订单批次；C009 的 8,000 元退款在 9 月 1 日 08:30 到账，不是待到账退款。" },
      { author: "梁川", message: "已提交当前结算表供商务复核：C009 的计佣基数保留 50,000 元，按 20% 计算，本期暂不扣退款；尚未安排付款。" },
      { author: "陈默", message: "本期结算请对照《本期佣金结算口径》复核退款截点和计佣规则，讨论里的延期扣除建议不代表已经更改文件口径。" },
    ],
  },
};

export function withResultTaskDecisionExample(task: TaskNode, detail: TaskDetailMock): TaskDetailMock {
  const spec = Object.hasOwn(examples, task.id) ? examples[task.id] : undefined;
  if (!spec || task.teamId !== "creator-commerce" || task.createdFrom === "task-editor" || task.createdFrom === "task-planner") return detail;
  // 保留原文件 ID 和成果名称；只把通用占位正文换成本任务内容。
  const recordName = detail.files.find((file) => file.id === task.id + "-record")!.name.replace(/\.[^.]+$/, ".xlsx");
  const files = detail.files.map((file): TaskFileNode => {
    if (file.id === task.id + "-rule") return { ...file, name: spec.ruleName ?? file.name, content: spec.rule, previewData: { kind: "pdf", pages: [spec.rule] } };
    if (file.id === task.id + "-record") return { ...file, name: recordName, format: "XLSX", content: undefined, previewData: { kind: "table", sheets: [{ name: "任务明细", columns: [...spec.columns], rows: spec.rows.map((row) => [...row]) }] } };
    if (file.id === task.id + "-result") return { ...file, content: spec.result, previewData: { kind: "markdown", text: spec.result } };
    return file;
  });
  const renamed = new Map(detail.files.map((file) => [file.name, files.find((next) => next.id === file.id)!.name]));
  const times = ["2026-09-01T10:00:00+08:00", "2026-09-02T11:00:00+08:00", "2026-09-02T17:00:00+08:00"];
  return {
    ...detail,
    files,
    activities: [...detail.activities.map((post) => ({ ...post, ...(post.file ? { file: renamed.get(post.file) ?? post.file } : {}) })),
      ...spec.posts.map((post, index) => ({ ...post, id: task.id + "-result-context-post-" + index, type: "member-post" as const, createdAt: times[index], time: times[index].slice(0, 16).replace("T", " "), file: index === 1 ? files.find((file) => file.id === task.id + "-result")!.name : recordName }))],
    commits: [...detail.commits.map((commit) => ({ ...commit, files: commit.files.map((name) => renamed.get(name) ?? name) })),
      ...["-rule", "-record", "-result"].map((suffix, index) => ({ id: task.id + "-result-context-commit-" + index, author: task.ownerId, createdAt: times[index], time: times[index].slice(0, 16).replace("T", " "), message: ["补充本任务的交付范围和记录口径。", "补充本次交付的逐项明细，保留候选与执行状态。", "提交当前成果文件供核对，未自动更新任务验收状态。"][index], files: [files.find((file) => file.id === task.id + suffix)!.name] }))],
  };
}
