import type {
  TaskActivityMock,
  TaskCommitMock,
  TaskDetailMock,
  TaskFileNode,
} from "./taskDetailMocks.ts";
import type { TaskNode } from "./workspaceNodes.ts";
import { getTaskProgressBurnUp } from "./taskProgressExamples.ts";
import type { TaskDiagnosisConflictInput, TaskDiagnosisSnapshot } from "../lib/taskDiagnosis.ts";
import { getCreatorCommerceDiagnosisExample } from "./creatorCommerceDiagnosisExamples";

/**
 * 本文件只包含合成演示数据。人物、企业、批次、客户、事故和文件均为虚构，
 * 不代表生产记录，也不能作为业务验收、合规或人员绩效依据。
 */
export const TEAM_DETAIL_FIXTURE_PROVENANCE = "synthetic-demo" as const;

export type TeamDetailDomain = "platform-engineering" | "manufacturing-supply" | "customer-service";
export type EvidenceLifecycle = "working" | "in-review" | "approved" | "superseded" | "archived";
export type EvidenceClassification = "internal" | "confidential" | "restricted";

export type EvidenceAccess = {
  visibility: "team" | "restricted" | "external-shared";
  allowedRoles: string[];
  containsSensitiveData: boolean;
  redactionStatus: "not-required" | "masked" | "pending-review";
};

export type TeamEvidenceFileNode = TaskFileNode & {
  provenance: typeof TEAM_DETAIL_FIXTURE_PROVENANCE;
  lifecycle: EvidenceLifecycle;
  classification: EvidenceClassification;
  access: EvidenceAccess;
  createdAt: string;
  createdBy: string;
  updatedBy: string;
  lineageId: string;
  supersedesFileId?: string;
  linkedTaskIds: string[];
  sourceActivityIds: string[];
  reviewers: string[];
  retentionUntil?: string;
};

export type TeamEvidenceActivityMock = TaskActivityMock & {
  provenance: typeof TEAM_DETAIL_FIXTURE_PROVENANCE;
  evidenceFileIds: string[];
  basis: "member-report" | "file-diff" | "system-event" | "cross-evidence-check";
};

export type TeamTaskDetailFixture = TaskDetailMock & {
  datasetMeta: {
    provenance: typeof TEAM_DETAIL_FIXTURE_PROVENANCE;
    domain: TeamDetailDomain;
    generatedForTaskId: string;
    fixedAt: "2026-09-01T12:00:00+08:00";
    disclaimer: "全量合成演示数据，不代表生产记录或真实业务结论";
  };
};

type DomainConfig = {
  domain: TeamDetailDomain;
  teamId: "platform" | "supply-operations" | "customer-success";
  idPrefix: "platform-" | "factory-" | "service-";
  mainTaskId: string;
  roles: [string, string, string];
  fileNames: {
    decision: string;
    evidence: string;
    raw: string;
    delivery: string;
    runbook: string;
    restricted: string;
  };
  snapshot: {
    fact: string;
    risk: string;
    next: string;
    decision: string;
  };
  table: {
    primaryName: string;
    primaryColumns: string[];
    primaryRows: string[][];
    secondaryName: string;
    secondaryColumns: string[];
    secondaryRows: string[][];
  };
  pdfPages: string[];
};

const domainConfigs: DomainConfig[] = [
  {
    domain: "platform-engineering",
    teamId: "platform",
    idPrefix: "platform-",
    mainTaskId: "platform-mobile-release",
    roles: ["发布经理", "移动端负责人", "站点可靠性工程师"],
    fileNames: {
      decision: "移动端 3.8.0 发布决策记录.md",
      evidence: "灰度质量与设备覆盖矩阵.xlsx",
      raw: "崩溃与 ANR 分群明细.csv",
      delivery: "3.8.0 发布验收包.md",
      runbook: "分批发布与回滚手册.pdf",
      restricted: "鉴权与隐私威胁模型.docx",
    },
    snapshot: {
      fact: "iOS 候选包已通过核心流程回归；Android 5% 灰度的无崩溃会话率为 99.86%，但低内存机型仍有 7 个可复现 ANR 样本。",
      risk: "API v3 的旧客户端兼容窗口与远端配置回滚顺序尚未共同签字，直接扩大灰度会放大不可逆迁移风险。",
      next: "先由移动端负责人关闭 ANR 根因，再由发布经理核对 API 契约、安全门禁和支持手册，满足门槛后才扩大到 20%。",
      decision: "保持 Android 5% 灰度；iOS 暂不提交全量审核。下一次门禁复核固定在 9 月 2 日 14:00。",
    },
    table: {
      primaryName: "灰度门禁",
      primaryColumns: ["平台/分群", "样本", "无崩溃会话率", "阻断缺陷", "结论"],
      primaryRows: [
        ["Android / 低内存", "12,842", "99.61%", "ANR-1842", "保持 5%"],
        ["Android / 主流机型", "68,210", "99.94%", "0", "可进入 20% 复核"],
        ["iOS / TestFlight", "1,460", "99.93%", "IOS-771", "等待隐私清单"],
      ],
      secondaryName: "设备覆盖",
      secondaryColumns: ["系统", "最低版本", "关键机型数", "已测", "缺口"],
      secondaryRows: [
        ["Android", "10", "34", "31", "3 台低内存机"],
        ["iOS", "16", "18", "18", "无"],
      ],
    },
    pdfPages: [
      "适用范围：移动端 3.8.0 的 iOS 与 Android 发布。门禁以分群质量、API 兼容、安全审查和回滚演练的共同结果为准；任何单项通过都不代表可全量。",
      "回滚顺序：先关闭新写入，再切换远端配置，确认旧客户端读取兼容后回滚服务端；数据库迁移仅允许前向修复，不执行破坏性逆迁移。",
      "观察窗口：5% 灰度至少连续 4 小时且样本超过 30,000；无崩溃会话率低于 99.80% 或 P1 缺陷大于 0 时自动停止扩大。",
    ],
  },
  {
    domain: "manufacturing-supply",
    teamId: "supply-operations",
    idPrefix: "factory-",
    mainTaskId: "factory-pilot-ramp",
    roles: ["NPI 负责人", "供应商质量工程师", "制造质量负责人"],
    fileNames: {
      decision: "智能门锁 PVT 试产放量决策记录.md",
      evidence: "试产批次质量门禁.xlsx",
      raw: "工位扭矩与追溯明细.csv",
      delivery: "智能门锁 PVT 放行交付包.md",
      runbook: "异常停线与隔离处置规范.pdf",
      restricted: "客户图纸偏差许可单.docx",
    },
    snapshot: {
      fact: "计划 500 台的 PVT-A03 批次已完成 420 台，首检合格率 97.4%；30 号锁付工位出现 11 台扭矩漂移，隔离品尚未流入包装。",
      risk: "供应商 PPAP 的材料证明已到，但量具 R&R 仅覆盖白班；若未补齐夜班复测，过程能力结论不能外推到双班产能。",
      next: "先完成扭矩枪校准和夜班 R&R，再关闭偏差许可、包装标签重工和 800 件连续产能试跑三个门禁。",
      decision: "维持试产状态，不切量产版本；允许已隔离的 409 件进入全检，11 件异常品保持质量锁定。",
    },
    table: {
      primaryName: "批次门禁",
      primaryColumns: ["批次", "投入", "合格", "隔离", "关键结论"],
      primaryRows: [
        ["A01", "120", "116", "4", "标签规则已修订"],
        ["A02", "240", "235", "5", "供应商尺寸稳定"],
        ["PVT-A03（计划 500）", "420", "409", "11", "等待扭矩复核"],
      ],
      secondaryName: "过程能力",
      secondaryColumns: ["特性", "规格", "Cpk", "样本", "状态"],
      secondaryRows: [
        ["轴径", "18.000±0.015", "1.51", "125", "通过"],
        ["锁付扭矩", "7.2±0.4 N·m", "0.92", "420", "阻断"],
        ["端盖压装", "4.8±0.2 mm", "1.38", "120", "通过"],
      ],
    },
    pdfPages: [
      "停线触发：关键特性连续 2 件超限、追溯码不可读或防错失效时立即停止工位并锁定自上次合格确认后的全部在制品。",
      "隔离要求：异常品、疑似影响范围与正常品使用独立库位和状态标签；未经制造质量负责人释放，不得转序、返工或混箱。",
      "恢复条件：根因措施完成、首件复核合格、影响范围追溯闭环，并由工艺、质量和生产三方在处置记录签字。",
    ],
  },
  {
    domain: "customer-service",
    teamId: "customer-success",
    idPrefix: "service-",
    mainTaskId: "service-incident-recovery",
    roles: ["客户成功事件负责人", "站点可靠性工程师", "支持运营负责人"],
    fileNames: {
      decision: "企业同步积压事故恢复决策记录.md",
      evidence: "企业客户影响与恢复核对表.xlsx",
      raw: "脱敏同步状态修复批次.csv",
      delivery: "企业同步恢复与复盘交付包.md",
      runbook: "同步积压降级与修复手册.pdf",
      restricted: "重点客户 SLA 适用性核对清单.docx",
    },
    snapshot: {
      fact: "企业同步核心写入已恢复稳定 6 小时；18 家受影响企业客户的 1,842 条待核记录中，1,826 条完成可回滚修复，16 条因状态冲突转人工核对。",
      risk: "技术恢复不等于客户闭环；5 家重点客户仍未确认业务一致，SLA 补偿建议也尚未完成商业与合规复核。",
      next: "先关闭 16 条状态冲突并逐客户核对，再发送分层说明、完成 SLA 适用性判断，最后把队列竞态防护写入运行手册和演练脚本。",
      decision: "核心同步保持正常，事故状态维持监控中；在重点客户确认和 SLA 处理结论完成前不关闭事件。",
    },
    table: {
      primaryName: "企业客户恢复",
      primaryColumns: ["客户层级", "受影响客户", "待核记录", "已修复", "客户已确认"],
      primaryRows: [
        ["战略", "5", "824", "817", "0"],
        ["企业", "8", "713", "708", "8"],
        ["成长", "5", "305", "301", "5"],
      ],
      secondaryName: "修复批次",
      secondaryColumns: ["批次", "记录数", "成功", "待核对", "状态冲突"],
      secondaryRows: [
        ["SYNC-0831-01", "1,200", "1,193", "7", "7"],
        ["SYNC-0831-02", "642", "633", "9", "9"],
      ],
    },
    pdfPages: [
      "降级条件：同步队列积压超过 20,000 或 P95 延迟超过 180 秒持续 5 分钟时，停止非关键重试并切换到租户级队列隔离。",
      "修复条件：仅处理具有原始同步 ID、租户 ID 和可验证前后状态的记录；先查幂等表，再写业务状态，最后回写可回滚修复批次。",
      "关闭标准：技术指标恢复、数据修复核对、重点客户确认、外部说明和 SLA 处理结论全部有记录。技术恢复本身不等于事件关闭。",
    ],
  },
];

export const TEAM_DETAIL_TASK_IDS = {
  "platform-engineering": [
    "platform-mobile-release",
    "platform-api-contract",
    "platform-ios-review",
    "platform-android-staged",
    "platform-observability-alerts",
    "platform-support-runbook",
    "platform-security-gate",
  ],
  "manufacturing-supply": [
    "factory-pilot-ramp",
    "factory-supplier-ppap",
    "factory-line-validation",
    "factory-quality-gate",
    "factory-operator-training",
    "factory-packaging-readiness",
    "factory-capacity-trial",
    "factory-label-rework",
  ],
  "customer-service": [
    "service-incident-recovery",
    "service-traffic-mitigation",
    "service-data-repair",
    "service-customer-comms",
    "service-root-cause",
    "service-compensation-review",
    "service-runbook-update",
  ],
} as const satisfies Record<TeamDetailDomain, readonly string[]>;

/** 只有三棵真实协作树使用高密度固定证据；同团队的独立任务不能借用主项目证据。 */
export const TEAM_DETAIL_SCOPE_TASK_IDS = {
  "platform-engineering": [
    ...TEAM_DETAIL_TASK_IDS["platform-engineering"],
    "platform-client-track",
    "platform-service-track",
    "platform-governance-track",
  ],
  "manufacturing-supply": [
    ...TEAM_DETAIL_TASK_IDS["manufacturing-supply"],
    "factory-supplier-track",
    "factory-production-track",
    "factory-launch-track",
  ],
  "customer-service": [
    ...TEAM_DETAIL_TASK_IDS["customer-service"],
    "service-containment-track",
    "service-customer-track",
    "service-prevention-track",
  ],
} as const satisfies Record<TeamDetailDomain, readonly string[]>;

const scopedTaskIds = new Set<string>(Object.values(TEAM_DETAIL_SCOPE_TASK_IDS).flat());

const taskFocus: Record<string, { fact: string; risk: string; next: string }> = {
  "platform-api-contract": {
    fact: "离线同步 API 契约测试覆盖 42 个核心场景，旧版 3.6 客户端的空字段兼容用例仍有 2 项返回 422。",
    risk: "若服务端先收紧校验，未升级客户端会无法保存草稿。",
    next: "保留双读兼容并补齐 3.6/3.7/3.8.0 三个版本的契约回归。",
  },
  "platform-ios-review": {
    fact: "TestFlight 候选包已完成支付、登录和深链回归，隐私清单仍缺第三方分析 SDK 的数据用途声明。",
    risk: "声明缺失可能导致审核退回，不能用功能测试通过代替合规准备完成。",
    next: "补齐 SDK 数据用途与导出合规问卷后再提交审核。",
  },
  "platform-android-staged": {
    fact: "Android 5% 灰度已覆盖 81,052 个会话，主流机型稳定，低内存分群出现 7 个可复现 ANR。",
    risk: "全局平均值会掩盖低内存设备退化。",
    next: "按内存分群修复并完成 4 小时观察，再决定是否扩大至 20%。",
  },
  "platform-observability-alerts": {
    fact: "发布看板已覆盖崩溃、ANR、启动耗时和 API 错误率，旧告警仍使用全量流量基线。",
    risk: "小流量灰度下全量阈值会延迟发现局部回归。",
    next: "增加版本号和灰度桶维度，并演练自动暂停发布的告警链路。",
  },
  "platform-support-runbook": {
    fact: "一线支持已拿到已知问题、版本识别和回滚沟通模板。",
    risk: "旧客户端兼容问题缺少可由支持人员独立判断的分流条件。",
    next: "补充错误码、客户端版本和远端配置三步定位法。",
  },
  "platform-security-gate": {
    fact: "移动端鉴权、剪贴板和日志脱敏复核已完成，第三方分析 SDK 权限仍在复核。",
    risk: "SDK 权限范围超出本次发布目的会扩大隐私暴露面。",
    next: "锁定最小权限、更新隐私清单并保留复核记录。",
  },
  "factory-supplier-ppap": {
    fact: "供应商尺寸报告、材料证明和 125 件能力样本已到，特殊特性标记与客户图纸存在 1 处编号差异。",
    risk: "编号不一致会让控制计划无法追溯到客户特性。",
    next: "由 SQE 与客户质量共同确认编号映射，再释放 PPAP 包。",
  },
  "factory-line-validation": {
    fact: "计划 500 台的 PVT-A03 批次已完成 420 台，30 号工位发生 11 台扭矩漂移，异常范围已隔离。",
    risk: "校准通过不能单独证明工艺稳定，仍缺夜班重复性样本。",
    next: "补做夜班 R&R 和连续 50 件验证，再解除工位锁定。",
  },
  "factory-quality-gate": {
    fact: "轴径与压装深度 Cpk 达标，锁付扭矩 Cpk 为 0.92。",
    risk: "关键特性未达到 1.33，不满足转量产门禁。",
    next: "完成参数窗口修订并以新窗口重新取样。",
  },
  "factory-operator-training": {
    fact: "18 名白班操作员完成理论与实操，6 名夜班人员尚未完成异常隔离演练。",
    risk: "只培训正常作业会导致异常品越站。",
    next: "补齐夜班隔离、追溯和停线升级演练并留存签到与成绩。",
  },
  "factory-packaging-readiness": {
    fact: "内衬跌落验证通过，500 张 PVT 标签仍为错版，客户料号少一位校验码。",
    risk: "新旧标签混用会破坏批次追溯。",
    next: "冻结错版标签、完成 500 张重工并核对首箱扫描结果。",
  },
  "factory-capacity-trial": {
    fact: "单班节拍达到 42 秒，换型与补料尚未纳入 800 件连续试跑。",
    risk: "短时峰值不能证明双班稳定产能。",
    next: "按真实换型、休息和补料条件完成连续试跑。",
  },
  "factory-label-rework": {
    fact: "500 张错版 PVT 标签已冻结，其中 412 张完成重印与双人核对。",
    risk: "剩余标签若未按批次销毁可能被误领。",
    next: "完成剩余 88 张重印、逐台扫码核对并记录旧标签销毁数量。",
  },
  "service-traffic-mitigation": {
    fact: "租户级队列隔离已生效，积压从 24,380 降至 0，核心写入错误率稳定低于 0.1%。",
    risk: "恢复全量重试可能再次挤压数据库连接池。",
    next: "保持分租户限速 6 小时并观察连接池与 P95 延迟。",
  },
  "service-data-repair": {
    fact: "两批修复共处理 1,842 条同步状态记录，1,826 条成功，16 条因状态冲突待人工。",
    risk: "把状态冲突记录直接重放可能覆盖客户在恢复期间形成的新状态。",
    next: "逐条核对原同步 ID、幂等键和业务前后状态后再决定修复。",
  },
  "service-customer-comms": {
    fact: "18 家受影响企业客户已完成第一轮通知，5 家重点客户尚未确认业务状态一致。",
    risk: "统一话术会忽略不同客户的影响范围与恢复状态。",
    next: "按客户实际影响发送更新，并保留确认人与时间。",
  },
  "service-root-cause": {
    fact: "初步根因定位为同步重试窗口中的幂等状态竞态，复现实验已通过。",
    risk: "只延长重试窗口会掩盖无界重试和租户间相互影响。",
    next: "验证租户队列隔离、重试预算和幂等状态机三项共同措施。",
  },
  "service-compensation-review": {
    fact: "SLA 核对清单覆盖 5 家战略客户和 13 家企业客户，商业运营已完成合同分层，合规仍在审查表述。",
    risk: "技术影响与合同补偿责任不能直接等同。",
    next: "按合同条款、实际影响与客户确认三项证据逐户审批。",
  },
  "service-runbook-update": {
    fact: "运行手册已加入租户级隔离与补偿校验步骤，尚未完成桌面演练。",
    risk: "未经演练的步骤可能缺少权限、命令或回滚前提。",
    next: "由值班、支持和数据负责人共同完成一次全流程演练。",
  },
};

type TeamDecisionConflictSpec = Omit<TaskDiagnosisConflictInput, "evidence"> & {
  proposalFact: string;
};

/**
 * 只登记确实存在两套不兼容执行口径的合成样例。其余任务仍可由状态与依赖
 * 推导执行阻塞，但不会为了填满诊断页而伪造决策冲突。
 */
const teamDecisionConflictSpecs: Record<string, TeamDecisionConflictSpec> = {
  "platform-android-staged": {
    id: "android-rollout-percentage",
    title: "Android 灰度比例存在两个执行口径",
    conclusion: "讨论中提出在 ANR 根因关闭前扩大到 20%，但当前正式决定仍要求保持 5% 灰度。",
    impact: "发布成员可能按不同灰度比例执行，扩大低内存机型的 ANR 影响。",
    recommendation: "先确认扩大灰度的提议是否被采纳，并只保留一套生效口径。",
    proposalFact: "建议在低内存机型 ANR 根因关闭前，将 Android 灰度从 5% 扩大到 20%。",
  },
  "factory-capacity-trial": {
    id: "mass-production-switch",
    title: "试产结果是否可直接切量产存在两个口径",
    conclusion: "讨论中提出凭当前 4 小时试跑直接切换量产版本，但当前正式决定仍要求维持试产状态。",
    impact: "现场可能在质量与夜班稳定性门禁关闭前切换量产版本。",
    recommendation: "先确认试跑结果是否满足量产门禁，再统一版本切换决定。",
    proposalFact: "建议以当前 4 小时产能试跑结果直接切换量产版本。",
  },
  "service-compensation-review": {
    id: "incident-closure-timing",
    title: "事故关闭时点存在两个执行口径",
    conclusion: "讨论中提出先关闭事故，但当前正式决定要求重点客户确认和 SLA 处理完成前不关闭事件。",
    impact: "对外状态可能早于客户事实与补偿结论，造成承诺口径不一致。",
    recommendation: "先确认客户与 SLA 门禁是否仍有效，再统一事故关闭状态。",
    proposalFact: "建议在重点客户确认和 SLA 处理完成前先关闭本次事件。",
  },
};

function domainForTask(task: TaskNode): DomainConfig | undefined {
  if (!scopedTaskIds.has(task.id)) return undefined;
  const config = domainConfigs.find((candidate) => task.id.startsWith(candidate.idPrefix));
  return config?.teamId === task.teamId ? config : undefined;
}

export function getTeamTaskDiagnosisSnapshot(task: TaskNode): TaskDiagnosisSnapshot | undefined {
  const creatorExample = getCreatorCommerceDiagnosisExample(task);
  if (creatorExample) return creatorExample.diagnosis;
  const config = domainForTask(task);
  if (!config) return undefined;
  return {
    checkedAt: "2026-09-01T12:00:00+08:00",
    // 不同的讨论建议仍保留在动态中，但不代表存在第二份生效文件。
    decisionConflicts: [],
  };
}

function asTextPreview(text: string): TaskFileNode["previewData"] {
  return { kind: "document", text };
}

function actorsFor(task: TaskNode): [string, string, string] {
  const distinct = [task.ownerId, ...(task.participantIds ?? [])].filter((name, index, names) => Boolean(name.trim()) && names.indexOf(name) === index);
  return [distinct[0] ?? "任务负责人", distinct[1] ?? distinct[0] ?? "参与成员", distinct[2] ?? distinct[1] ?? distinct[0] ?? "复核成员"];
}

function makeEvidenceFile(
  task: TaskNode,
  activityIds: string[],
  input: Omit<TeamEvidenceFileNode, "provenance" | "linkedTaskIds" | "sourceActivityIds"> & {
    linkedTaskIds?: string[];
    sourceActivityIds?: string[];
  },
): TeamEvidenceFileNode {
  return {
    ...input,
    provenance: TEAM_DETAIL_FIXTURE_PROVENANCE,
    linkedTaskIds: input.linkedTaskIds ?? [task.id],
    sourceActivityIds: input.sourceActivityIds ?? activityIds,
  };
}

function createFiles(task: TaskNode, config: DomainConfig, actors: [string, string, string]): TeamEvidenceFileNode[] {
  const prefix = task.id;
  const ids = {
    discussion: `${prefix}-discussion-1`,
    ai: `${prefix}-ai-evidence`,
    status: `${prefix}-status-change`,
  };
  const activityIds = Object.values(ids);
  const folders: TeamEvidenceFileNode[] = [
    ["requirements", "00 范围与门禁", null],
    ["evidence", "10 证据与核对", null],
    ["raw", "原始与脱敏数据", `${prefix}-evidence`],
    ["delivery", "20 交付与审批", null],
    ["archive", "90 历史与作废", null],
  ].map(([suffix, name, parentId]) => makeEvidenceFile(task, [], {
    id: `${prefix}-${suffix}`,
    kind: "folder",
    name: String(name),
    parentId: parentId ? String(parentId) : null,
    updatedAt: "2026-09-01T11:20:00+08:00",
    lifecycle: suffix === "archive" ? "archived" : "working",
    classification: "internal",
    access: { visibility: "team", allowedRoles: [...config.roles], containsSensitiveData: false, redactionStatus: "not-required" },
    createdAt: "2026-08-20T09:00:00+08:00",
    createdBy: actors[0],
    updatedBy: actors[0],
    lineageId: `${prefix}-folder-${suffix}`,
    reviewers: [],
  }));

  const decisionText = `# ${config.fileNames.decision}\n\n## 当前决定\n${config.snapshot.decision}\n\n## 已知事实\n${taskFocus[task.id]?.fact ?? config.snapshot.fact}\n\n## 未关闭风险\n${taskFocus[task.id]?.risk ?? config.snapshot.risk}\n\n## 下一步与责任\n${taskFocus[task.id]?.next ?? config.snapshot.next}\n\n## 适用任务\n${task.name}（${task.id}）`;
  const oldDecisionText = `${decisionText}\n\n## v2 历史说明\n本版在门禁复核前形成，已被当前版本替代；保留用于说明决定变化，不应继续执行。`;
  const evidenceRows = config.table.primaryRows.map((row) => [...row]);
  const rawRows = config.table.secondaryRows.map((row) => [...row]);
  const files: TeamEvidenceFileNode[] = [
    makeEvidenceFile(task, activityIds, {
      id: `${prefix}-decision-current`,
      kind: "file",
      name: config.fileNames.decision,
      parentId: `${prefix}-delivery`,
      format: "MD",
      mimeType: "text/markdown",
      sizeLabel: "18 KB",
      updatedAt: "2026-09-01T11:20:00+08:00",
      version: 3,
      content: decisionText,
      previewData: { kind: "markdown", text: decisionText },
      lifecycle: "in-review",
      classification: "internal",
      access: { visibility: "team", allowedRoles: [...config.roles], containsSensitiveData: false, redactionStatus: "not-required" },
      createdAt: "2026-08-29T10:10:00+08:00",
      createdBy: actors[0],
      updatedBy: actors[0],
      lineageId: `${prefix}-decision-lineage`,
      supersedesFileId: `${prefix}-decision-v2`,
      reviewers: [actors[1], actors[2]],
      retentionUntil: "2029-09-01",
    }),
    makeEvidenceFile(task, [], {
      id: `${prefix}-decision-v2`,
      kind: "file",
      name: config.fileNames.decision.replace(/\.md$/i, " v2（已替代）.md"),
      parentId: `${prefix}-archive`,
      format: "MD",
      mimeType: "text/markdown",
      sizeLabel: "15 KB",
      updatedAt: "2026-08-31T16:30:00+08:00",
      version: 2,
      content: oldDecisionText,
      previewData: { kind: "markdown", text: oldDecisionText },
      lifecycle: "superseded",
      classification: "internal",
      access: { visibility: "team", allowedRoles: [...config.roles], containsSensitiveData: false, redactionStatus: "not-required" },
      createdAt: "2026-08-29T10:10:00+08:00",
      createdBy: actors[0],
      updatedBy: actors[1],
      lineageId: `${prefix}-decision-lineage`,
      reviewers: [actors[2]],
      retentionUntil: "2029-09-01",
    }),
    makeEvidenceFile(task, [], {
      id: `${prefix}-gate-pdf`,
      kind: "file",
      name: config.fileNames.runbook,
      parentId: `${prefix}-requirements`,
      format: "PDF",
      mimeType: "application/pdf",
      sizeLabel: "2.8 MB",
      updatedAt: "2026-09-01T09:15:00+08:00",
      version: 5,
      previewData: { kind: "pdf", pages: config.pdfPages.map((page) => `${page}\n\n执行前需核对原始批准记录。`) },
      lifecycle: "approved",
      classification: "internal",
      access: { visibility: "team", allowedRoles: [...config.roles], containsSensitiveData: false, redactionStatus: "not-required" },
      createdAt: "2026-08-22T14:00:00+08:00",
      createdBy: actors[1],
      updatedBy: actors[2],
      lineageId: `${prefix}-gate-lineage`,
      reviewers: [actors[0], actors[2]],
      retentionUntil: "2031-09-01",
    }),
    makeEvidenceFile(task, [`${prefix}-ai-evidence`, `${prefix}-discussion-2`], {
      id: `${prefix}-evidence-table`,
      kind: "file",
      name: config.fileNames.evidence,
      parentId: `${prefix}-evidence`,
      format: "XLSX",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeLabel: "864 KB",
      updatedAt: "2026-09-01T10:42:00+08:00",
      version: 8,
      previewData: { kind: "table", sheets: [
        { name: config.table.primaryName, columns: [...config.table.primaryColumns], rows: evidenceRows },
        { name: config.table.secondaryName, columns: [...config.table.secondaryColumns], rows: rawRows },
        { name: "风险与责任", columns: ["证据缺口", "影响", "责任人", "截至", "状态"], rows: [[taskFocus[task.id]?.risk ?? config.snapshot.risk, "阻断当前门禁", actors[0], "2026-09-02 14:00", "处理中"]] },
      ] },
      lifecycle: "in-review",
      classification: "confidential",
      access: { visibility: "restricted", allowedRoles: [...config.roles], containsSensitiveData: true, redactionStatus: "masked" },
      createdAt: "2026-08-28T17:00:00+08:00",
      createdBy: actors[1],
      updatedBy: actors[1],
      lineageId: `${prefix}-evidence-table-lineage`,
      reviewers: [actors[0], actors[2]],
      retentionUntil: "2028-09-01",
    }),
    makeEvidenceFile(task, [`${prefix}-discussion-2`], {
      id: `${prefix}-raw-table`,
      kind: "file",
      name: config.fileNames.raw,
      parentId: `${prefix}-raw`,
      format: "CSV",
      mimeType: "text/csv",
      sizeLabel: "6.2 MB",
      updatedAt: "2026-09-01T10:18:00+08:00",
      version: 4,
      previewData: { kind: "table", sheets: [{ name: "脱敏样本", columns: [...config.table.secondaryColumns], rows: rawRows }] },
      lifecycle: "working",
      classification: "restricted",
      access: { visibility: "restricted", allowedRoles: [config.roles[1], config.roles[2]], containsSensitiveData: true, redactionStatus: "masked" },
      createdAt: "2026-08-31T08:30:00+08:00",
      createdBy: actors[2],
      updatedBy: actors[2],
      lineageId: `${prefix}-raw-lineage`,
      reviewers: [actors[1]],
      retentionUntil: "2027-03-01",
    }),
    makeEvidenceFile(task, [], {
      id: `${prefix}-restricted-doc`,
      kind: "file",
      name: config.fileNames.restricted,
      parentId: `${prefix}-requirements`,
      format: "DOCX",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeLabel: "420 KB",
      updatedAt: "2026-09-01T08:50:00+08:00",
      version: 2,
      content: `# ${config.fileNames.restricted}\n\n已核对：${config.snapshot.fact}\n\n待核对：${taskFocus[task.id]?.risk ?? config.snapshot.risk}\n\n只允许指定角色查看，引用时不得复制未脱敏明细。`,
      previewData: asTextPreview(`# ${config.fileNames.restricted}\n\n已核对：${config.snapshot.fact}\n\n待核对：${taskFocus[task.id]?.risk ?? config.snapshot.risk}`),
      lifecycle: "in-review",
      classification: "restricted",
      access: { visibility: "restricted", allowedRoles: [config.roles[0], config.roles[2]], containsSensitiveData: true, redactionStatus: "pending-review" },
      createdAt: "2026-08-30T15:20:00+08:00",
      createdBy: actors[2],
      updatedBy: actors[0],
      lineageId: `${prefix}-restricted-lineage`,
      reviewers: [actors[2]],
      retentionUntil: "2031-09-01",
    }),
    makeEvidenceFile(task, [`${prefix}-discussion-1`, `${prefix}-status-change`], {
      id: `${prefix}-delivery-note`,
      kind: "file",
      name: config.fileNames.delivery,
      parentId: `${prefix}-delivery`,
      format: "MD",
      mimeType: "text/markdown",
      sizeLabel: "26 KB",
      updatedAt: "2026-09-01T11:05:00+08:00",
      version: 4,
      content: `# ${config.fileNames.delivery}\n\n## 交付范围\n${task.goal ?? task.name}\n\n## 已完成内容\n${taskFocus[task.id]?.fact ?? config.snapshot.fact}\n\n## 需要关注\n${taskFocus[task.id]?.risk ?? config.snapshot.risk}\n\n## 下一步\n${taskFocus[task.id]?.next ?? config.snapshot.next}\n\n> 业务验收尚待确认。`,
      previewData: { kind: "markdown", text: `# ${config.fileNames.delivery}\n\n## 交付范围\n${task.goal ?? task.name}\n\n## 已完成内容\n${taskFocus[task.id]?.fact ?? config.snapshot.fact}\n\n## 需要关注\n${taskFocus[task.id]?.risk ?? config.snapshot.risk}\n\n## 下一步\n${taskFocus[task.id]?.next ?? config.snapshot.next}` },
      lifecycle: "in-review",
      classification: "internal",
      access: { visibility: "team", allowedRoles: [...config.roles], containsSensitiveData: false, redactionStatus: "not-required" },
      createdAt: "2026-08-31T12:00:00+08:00",
      createdBy: actors[0],
      updatedBy: actors[0],
      lineageId: `${prefix}-delivery-lineage`,
      reviewers: [actors[1], actors[2]],
      retentionUntil: "2031-09-01",
    }),
    makeEvidenceFile(task, [], {
      id: `${prefix}-handoff-log`,
      kind: "file",
      name: `${task.name}责任交接记录.md`,
      parentId: `${prefix}-evidence`,
      format: "MD",
      mimeType: "text/markdown",
      sizeLabel: "11 KB",
      updatedAt: "2026-08-31T17:40:00+08:00",
      version: 3,
      content: `# ${task.name}责任交接记录\n\n- Task Owner：${task.ownerId}\n- 参与者：${(task.participantIds ?? []).join("、") || "未记录"}\n- 当前状态：${task.status}\n- 交接边界：只转交已列明证据，不把待确认判断写成完成。`,
      previewData: { kind: "markdown", text: `# ${task.name}责任交接记录\n\n- Task Owner：${task.ownerId}\n- 参与者：${(task.participantIds ?? []).join("、") || "未记录"}\n- 当前状态：${task.status}\n- 交接边界：只转交已列明证据，不把待确认判断写成完成。` },
      lifecycle: "approved",
      classification: "internal",
      access: { visibility: "team", allowedRoles: [...config.roles], containsSensitiveData: false, redactionStatus: "not-required" },
      createdAt: "2026-08-30T11:00:00+08:00",
      createdBy: actors[1],
      updatedBy: actors[2],
      lineageId: `${prefix}-handoff-lineage`,
      reviewers: [actors[0]],
      retentionUntil: "2029-09-01",
    }),
    makeEvidenceFile(task, [], {
      id: `${prefix}-archived-snapshot`,
      kind: "file",
      name: `${task.name}初始范围快照（已作废）.pdf`,
      parentId: `${prefix}-archive`,
      format: "PDF",
      mimeType: "application/pdf",
      sizeLabel: "1.1 MB",
      updatedAt: "2026-08-29T09:00:00+08:00",
      version: 1,
      previewData: { kind: "pdf", pages: ["历史快照。本版未包含后续新增的证据门禁，已作废，不应作为当前执行依据。"] },
      lifecycle: "archived",
      classification: "internal",
      access: { visibility: "team", allowedRoles: [...config.roles], containsSensitiveData: false, redactionStatus: "not-required" },
      createdAt: "2026-08-29T09:00:00+08:00",
      createdBy: actors[0],
      updatedBy: actors[0],
      lineageId: `${prefix}-scope-snapshot-lineage`,
      reviewers: [],
      retentionUntil: "2028-09-01",
      archived: true,
    }),
  ];
  return [...folders, ...files];
}

function createActivities(task: TaskNode, config: DomainConfig, files: TeamEvidenceFileNode[], actors: [string, string, string]): TeamEvidenceActivityMock[] {
  const fileId = (name: string) => files.find((file) => file.name === name)?.id ?? "";
  const focus = taskFocus[task.id] ?? config.snapshot;
  const decisionConflict = teamDecisionConflictSpecs[task.id];
  const make = (activity: Omit<TeamEvidenceActivityMock, "provenance">): TeamEvidenceActivityMock => ({
    ...activity,
    provenance: TEAM_DETAIL_FIXTURE_PROVENANCE,
  });
  return [
    make({
      id: `${task.id}-discussion-1`, author: actors[0], type: "member-post", basis: "member-report",
      createdAt: "2026-09-01T09:20:00+08:00", time: "2026-09-01 09:20",
      message: `${focus.fact} 当前不把局部完成等同于任务完成，请大家按门禁逐项回复。`,
      file: config.fileNames.evidence, evidenceFileIds: [fileId(config.fileNames.evidence)],
    }),
    make({
      id: `${task.id}-discussion-1-reply-1`, author: actors[1], type: "member-reply", basis: "file-diff",
      createdAt: "2026-09-01T09:34:00+08:00", time: "2026-09-01 09:34", replyToActivityId: `${task.id}-discussion-1`,
      message: `我已核对原始明细与汇总表，确认当前差距是：${focus.risk}`,
      file: config.fileNames.raw, evidenceFileIds: [fileId(config.fileNames.raw), fileId(config.fileNames.evidence)],
    }),
    make({
      id: `${task.id}-discussion-1-reply-2`, author: actors[2], type: "member-reply", basis: "member-report",
      createdAt: "2026-09-01T09:48:00+08:00", time: "2026-09-01 09:48", replyToActivityId: `${task.id}-discussion-1-reply-1`,
      message: `同意先保留门禁。我负责复核受限文件，完成后只回传结论和可共享证据，不转贴受限明细。`,
      file: config.fileNames.restricted, evidenceFileIds: [fileId(config.fileNames.restricted)],
    }),
    make({
      id: `${task.id}-discussion-2`, author: actors[1], type: "member-post", basis: "member-report",
      createdAt: "2026-09-01T10:12:00+08:00", time: "2026-09-01 10:12",
      message: decisionConflict?.proposalFact ?? `下一动作建议：${focus.next} 我会在完成后更新证据表，不直接修改 Task Owner 的最终决定。`,
      file: config.fileNames.runbook, evidenceFileIds: [fileId(config.fileNames.runbook)],
    }),
    make({
      id: `${task.id}-discussion-2-reply-1`, author: actors[0], type: "member-reply", basis: "member-report",
      createdAt: "2026-09-01T10:20:00+08:00", time: "2026-09-01 10:20", replyToActivityId: `${task.id}-discussion-2`,
      message: "按这个顺序推进。若来源数据变化，请新建版本并保留旧判断，不覆盖历史。",
      evidenceFileIds: [fileId(config.fileNames.decision)],
    }),
    make({
      id: `${task.id}-ai-evidence`, author: "TaskDoor AI", type: "ai-insight", basis: "cross-evidence-check",
      insightType: "证据缺口", createdAt: "2026-09-01T10:26:00+08:00", time: "2026-09-01 10:26",
      message: `交叉核对门禁文件、汇总表和原始样本后，发现当前结论仍受这一缺口限制：${focus.risk} 请相关成员核对来源。`,
      file: config.fileNames.evidence, evidenceFileIds: [fileId(config.fileNames.runbook), fileId(config.fileNames.evidence), fileId(config.fileNames.raw)],
    }),
    make({
      id: `${task.id}-status-change`, author: actors[0], type: "status-change", basis: "system-event",
      createdAt: "2026-09-01T10:35:00+08:00", time: "2026-09-01 10:35",
      message: `根据门禁复核结果，将“${task.name}”状态更新为“${task.status}”。`,
      changes: [{ label: "状态", before: task.status === "待开始" ? "未排期" : task.status === "待审核" ? "进行中" : task.status === "已完成" ? "待审核" : "待开始", after: task.status }],
      evidenceFileIds: [fileId(config.fileNames.evidence)],
    }),
    make({
      id: `${task.id}-schedule-change`, author: actors[0], type: "schedule-change", basis: "system-event",
      createdAt: "2026-09-01T10:39:00+08:00", time: "2026-09-01 10:39",
      message: "按证据门禁调整复核时间，原日期与新日期均保留在活动记录。",
      changes: [{ label: "计划截止", before: "2026-09-01 18:00", after: task.dueAt ?? "2026-09-02 14:00" }],
      evidenceFileIds: [fileId(config.fileNames.decision)],
    }),
    make({
      id: `${task.id}-task-definition-change`, author: actors[0], type: "task-definition-change", basis: "file-diff",
      createdAt: "2026-09-01T10:44:00+08:00", time: "2026-09-01 10:44",
      message: "补充了结果边界，避免把局部技术恢复或单批通过写成整体完成。",
      changes: [{ label: "完成边界", before: "完成执行并提交结果", after: `完成证据门禁并由 ${config.roles[0]} 确认结果边界` }],
      evidenceFileIds: [fileId(config.fileNames.delivery), fileId(config.fileNames.runbook)],
    }),
    make({
      id: `${task.id}-tags-change`, author: actors[0], type: "tags-change", basis: "system-event",
      createdAt: "2026-09-01T10:46:00+08:00", time: "2026-09-01 10:46",
      message: "将门禁与证据状态加入任务标签，原标签值可追溯。",
      changes: [{ label: "标签", before: (task.labels ?? []).join("、") || null, after: [...(task.labels ?? []), "证据待核"].join("、") }],
      evidenceFileIds: [],
    }),
    make({
      id: `${task.id}-goal-change`, author: actors[0], type: "goal-change", basis: "file-diff",
      createdAt: "2026-09-01T10:50:00+08:00", time: "2026-09-01 10:50",
      message: "根据最新责任边界细化任务目标，未修改已经发生的历史活动。",
      changes: [{ label: "目标", before: task.goal ?? null, after: `${task.goal ?? task.name}；保留证据来源、限制与责任确认。` }],
      evidenceFileIds: [fileId(config.fileNames.decision)],
    }),
  ];
}

function createCommits(task: TaskNode, config: DomainConfig, files: TeamEvidenceFileNode[], actors: [string, string, string]): TaskCommitMock[] {
  const existingName = (name: string) => files.some((file) => file.kind === "file" && file.name === name) ? name : config.fileNames.decision;
  return [
    {
      id: `${task.id}-commit-1`, author: actors[1], createdAt: "2026-08-31T16:20:00+08:00", time: "2026-08-31 16:20",
      message: "导入原始样本并完成脱敏，保留无法自动核对的记录。", files: [existingName(config.fileNames.raw)],
    },
    {
      id: `${task.id}-commit-2`, author: actors[2], createdAt: "2026-09-01T08:50:00+08:00", time: "2026-09-01 08:50",
      message: "补充受限评审意见和可共享结论，未放宽原文件权限。", files: [existingName(config.fileNames.restricted)],
    },
    {
      id: `${task.id}-commit-3`, author: actors[1], createdAt: "2026-09-01T10:42:00+08:00", time: "2026-09-01 10:42",
      message: "更新核对表与风险责任，修正汇总表和原始样本之间的差异。", files: [existingName(config.fileNames.evidence), existingName(config.fileNames.raw)],
    },
    {
      id: `${task.id}-commit-4`, author: actors[0], createdAt: "2026-09-01T11:20:00+08:00", time: "2026-09-01 11:20",
      message: "形成当前决策版本和交付包，保留上一版供追溯；任务是否完成仍由 Task Owner 确认。", files: [existingName(config.fileNames.decision), existingName(config.fileNames.delivery)],
    },
  ];
}

export function getTeamTaskDetailFixture(task: TaskNode): TeamTaskDetailFixture | undefined {
  const config = domainForTask(task);
  if (!config) return undefined;
  const actors = actorsFor(task);
  const files = createFiles(task, config, actors);
  const activities = createActivities(task, config, files, actors);
  const commits = createCommits(task, config, files, actors);
  const focus = taskFocus[task.id] ?? config.snapshot;
  return {
    title: task.name,
    goal: task.goal ?? `完成“${task.name}”的范围核对、执行和结果确认。`,
    summary: `${focus.fact} 需要关注：${focus.risk}`,
    owner: task.ownerId,
    participants: [...(task.participantIds ?? [])],
    participantInvitationStatus: Object.fromEntries((task.participantIds ?? []).map((participant, index) => [participant, index === 0 ? "accepted" as const : "pending" as const])),
    status: task.status,
    due: task.dueAt ?? "待排期",
    iconName: task.iconName,
    iconTone: task.iconTone,
    completionCriteria: task.completionCriteria ? [...task.completionCriteria] : undefined,
    executionTips: task.executionTips ? [...task.executionTips] : undefined,
    diagnosis: getTeamTaskDiagnosisSnapshot(task),
    // 只读取父任务已登记的固定示例事件账本；叶子和无历史任务保持 undefined。
    burnUp: getTaskProgressBurnUp(task.id),
    files,
    activities,
    commits,
    datasetMeta: {
      provenance: TEAM_DETAIL_FIXTURE_PROVENANCE,
      domain: config.domain,
      generatedForTaskId: task.id,
      fixedAt: "2026-09-01T12:00:00+08:00",
      disclaimer: "全量合成演示数据，不代表生产记录或真实业务结论",
    },
  };
}

export type TeamTaskDetailFixtureStats = {
  activities: number;
  commits: number;
  files: number;
  folders: number;
  humanDiscussionEntries: number;
  structuredChanges: number;
};

export function validateTeamTaskDetailFixture(detail: TeamTaskDetailFixture): { errors: string[]; stats: TeamTaskDetailFixtureStats } {
  const errors: string[] = [];
  const fileIds = new Set<string>();
  const fileNames = new Set<string>();
  const byFileId = new Map(detail.files.map((file) => [file.id, file]));
  const activityIds = new Set(detail.activities.map((activity) => activity.id));
  const activityById = new Map(detail.activities.map((activity) => [activity.id, activity]));
  const commitIds = new Set<string>();
  const taskId = detail.datasetMeta.generatedForTaskId;
  const fixedAt = Date.parse(detail.datasetMeta.fixedAt);

  for (const node of detail.files as TeamEvidenceFileNode[]) {
    if (fileIds.has(node.id)) errors.push(`重复文件 ID：${node.id}`);
    fileIds.add(node.id);
    const createdAt = Date.parse(node.createdAt);
    const updatedAt = Date.parse(node.updatedAt);
    if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) errors.push(`文件或目录时间无效：${node.id}`);
    else {
      if (createdAt > updatedAt) errors.push(`文件或目录创建时间晚于更新时间：${node.id}`);
      if (updatedAt > fixedAt) errors.push(`文件或目录更新时间晚于数据快照：${node.id}`);
    }
    if (node.kind === "file") {
      fileNames.add(node.name);
      if (node.provenance !== TEAM_DETAIL_FIXTURE_PROVENANCE) errors.push(`文件未标注合成来源：${node.id}`);
      if (!node.linkedTaskIds.includes(taskId)) errors.push(`文件未关联当前任务：${node.id}`);
      if (!node.lineageId.trim()) errors.push(`文件缺少版本谱系：${node.id}`);
      if (!node.version || node.version < 1) errors.push(`文件版本无效：${node.id}`);
      if (node.lifecycle === "approved" && node.reviewers.length === 0) errors.push(`已批准文件缺少复核人：${node.id}`);
      if (node.access.visibility === "restricted" && node.access.allowedRoles.length === 0) errors.push(`受限文件缺少授权角色：${node.id}`);
      if (node.supersedesFileId) {
        const previous = byFileId.get(node.supersedesFileId) as TeamEvidenceFileNode | undefined;
        if (!previous || previous.kind !== "file") errors.push(`文件引用不存在的上一版本：${node.id} -> ${node.supersedesFileId}`);
        else if (previous.lineageId !== node.lineageId || (previous.version ?? 0) >= (node.version ?? 0)) errors.push(`文件版本谱系不连续：${node.id}`);
      }
    }
    if (node.parentId) {
      const parent = byFileId.get(node.parentId) as TeamEvidenceFileNode | undefined;
      if (!parent || parent.kind !== "folder") errors.push(`文件父级不存在或不是目录：${node.id} -> ${node.parentId}`);
      else if (Number.isFinite(createdAt) && Number.isFinite(Date.parse(parent.createdAt)) && Date.parse(parent.createdAt) > createdAt) {
        errors.push(`父目录创建时间晚于子节点：${node.id} -> ${node.parentId}`);
      }
    }
  }

  for (const node of detail.files) {
    const visited = new Set<string>();
    let cursor: TaskFileNode | undefined = node;
    while (cursor?.parentId) {
      if (visited.has(cursor.id)) { errors.push(`文件目录存在循环：${node.id}`); break; }
      visited.add(cursor.id);
      cursor = byFileId.get(cursor.parentId);
    }
  }

  if (activityIds.size !== detail.activities.length) errors.push("活动 ID 不唯一");
  for (const node of detail.files as TeamEvidenceFileNode[]) {
    const fileUpdatedAt = Date.parse(node.updatedAt);
    for (const sourceId of node.sourceActivityIds) {
      const source = activityById.get(sourceId);
      if (!source) {
        errors.push(`文件来源活动不存在：${node.id} -> ${sourceId}`);
        continue;
      }
      const sourceAt = Date.parse(source.createdAt ?? "");
      if (Number.isFinite(fileUpdatedAt) && Number.isFinite(sourceAt) && sourceAt > fileUpdatedAt) {
        errors.push(`文件来源活动晚于文件更新时间：${node.id} -> ${sourceId}`);
      }
    }
  }
  for (const activity of detail.activities as TeamEvidenceActivityMock[]) {
    const activityAt = Date.parse(activity.createdAt ?? "");
    if (!Number.isFinite(activityAt)) errors.push(`活动时间无效：${activity.id}`);
    else if (activityAt > fixedAt) errors.push(`活动时间晚于数据快照：${activity.id}`);
    if (activity.file && !fileNames.has(activity.file)) errors.push(`活动引用不存在的文件：${activity.id} -> ${activity.file}`);
    for (const evidenceId of activity.evidenceFileIds) if (evidenceId && !fileIds.has(evidenceId)) errors.push(`活动证据引用不存在：${activity.id} -> ${evidenceId}`);
    for (const change of activity.changes ?? []) if (change.before === change.after) errors.push(`结构化变更没有真实差异：${activity.id} -> ${change.label}`);
    if (activity.type !== "member-reply") continue;
    if (!activity.replyToActivityId || !activityIds.has(activity.replyToActivityId)) {
      errors.push(`回复缺少有效父活动：${activity.id}`);
      continue;
    }
    const directParent = activityById.get(activity.replyToActivityId);
    const parentAt = Date.parse(directParent?.createdAt ?? "");
    if (Number.isFinite(activityAt) && Number.isFinite(parentAt) && parentAt >= activityAt) {
      errors.push(`回复时间不晚于父活动：${activity.id}`);
    }
    const visited = new Set([activity.id]);
    let parent = activityById.get(activity.replyToActivityId);
    while (parent?.type === "member-reply") {
      if (visited.has(parent.id)) { errors.push(`讨论线程存在循环：${activity.id}`); parent = undefined; break; }
      visited.add(parent.id);
      parent = parent.replyToActivityId ? activityById.get(parent.replyToActivityId) : undefined;
    }
    if (!parent || parent.type !== "member-post") errors.push(`回复未归属于成员根帖：${activity.id}`);
  }

  for (const commit of detail.commits) {
    if (commitIds.has(commit.id)) errors.push(`重复提交 ID：${commit.id}`);
    commitIds.add(commit.id);
    const commitAt = Date.parse(commit.createdAt ?? "");
    if (!Number.isFinite(commitAt)) errors.push(`提交时间无效：${commit.id}`);
    else if (commitAt > fixedAt) errors.push(`提交时间晚于数据快照：${commit.id}`);
    for (const fileName of commit.files) if (!fileNames.has(fileName)) errors.push(`提交引用不存在的文件：${commit.id} -> ${fileName}`);
  }

  const stats: TeamTaskDetailFixtureStats = {
    files: detail.files.filter((node) => node.kind === "file").length,
    folders: detail.files.filter((node) => node.kind === "folder").length,
    activities: detail.activities.length,
    commits: detail.commits.length,
    humanDiscussionEntries: detail.activities.filter((activity) => activity.type === "member-post" || activity.type === "member-reply").length,
    structuredChanges: detail.activities.filter((activity) => Boolean(activity.changes?.length)).length,
  };
  if (stats.files < 9) errors.push(`文件密度不足：${stats.files} < 9`);
  if (stats.folders < 5) errors.push(`目录密度不足：${stats.folders} < 5`);
  if (stats.activities < 11) errors.push(`活动密度不足：${stats.activities} < 11`);
  if (stats.humanDiscussionEntries < 5) errors.push(`讨论密度不足：${stats.humanDiscussionEntries} < 5`);
  if (stats.structuredChanges < 5) errors.push(`结构化变更不足：${stats.structuredChanges} < 5`);
  if (stats.commits < 4) errors.push(`提交密度不足：${stats.commits} < 4`);
  if (!detail.activities.some((activity) => activity.type === "ai-insight")) errors.push("缺少带依据的 AI 洞察");
  if (!detail.files.some((file) => file.previewData?.kind === "pdf")) errors.push("缺少 PDF 正文示例");
  if (!detail.files.some((file) => file.previewData?.kind === "table")) errors.push("缺少表格正文示例");
  if (!detail.files.some((file) => file.previewData && "text" in file.previewData)) errors.push("缺少文档正文示例");
  return { errors, stats };
}
