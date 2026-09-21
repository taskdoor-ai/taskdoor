import { applyCriterionReviewMocks } from "./taskCriterionReviewMocks";
import { withProgressDemoCreation } from "./taskProgressDemoFixtures";
import { creatorCommerceMembers, creatorCommerceTags } from "./creatorCommerceScenario";
import type { PersonOption, TagDefinition, TagColorName, TagIconName } from "./sharedTypes";
import {
  creatorCommerceMainTaskId,
  workspaceNodes as creatorCommerceWorkspaceNodes,
  workspaceRootId,
  type TaskIconName,
  type TaskIconTone,
  type TaskNode,
  type WorkspaceNode,
} from "./workspaceNodes";
import { getEffortScopeKey, getTaskEffortState } from "../lib/taskEffort";
import { getTaskDefinitionGoal } from "../lib/taskGoal";
import { platformAdditionNodes, supplyOperationsAdditionNodes } from "./expandedTeamTaskBacklog";
import { creatorCommerceAdditionNodes, customerSuccessAdditionNodes } from "./extendedTeamTaskFixtures";
import { unassignedTaskFixtures } from "./unassignedTaskFixtures";
import {residentDeletionDemoTasks} from "./residentDeletionDemo";

export const teamIds = ["creator-commerce", "platform", "supply-operations", "customer-success"] as const;
export type TeamId = (typeof teamIds)[number];

export type TeamWorkspaceScenario = {
  asOf: string;
  coverage: string;
  id: TeamId;
  industry: string;
  mainTaskId: string;
  members: PersonOption[];
  missingSources: string;
  name: string;
  nodes: WorkspaceNode[];
  source: "synthetic-fixture";
};

type TaskSeed = Omit<TaskNode, "kind" | "parentId" | "teamId" | "updatedAt"> & {
  minutes?: number;
  parentTaskId?: string;
  teamId: Exclude<TeamId, "creator-commerce">;
  updatedAt?: string;
  workMethod?: string;
  effortReason?: string;
};

const member = (
  id: string,
  email: string,
  role: string,
  dynamicResponsibility: string,
  availability: string,
  currentWork: string[],
  recentActivity: string,
): PersonOption => ({
  id,
  name: id,
  email,
  role,
  dynamicResponsibility,
  availability,
  currentWork,
  recentActivity,
  statusMessage: currentWork[0],
});

const task = (seed: TaskSeed): TaskNode => {
  const {
    minutes,
    workMethod = "使用团队模板、自动校验与现有协作工具，由负责人完成人工判断和确认",
    effortReason = "基于相同交付最近三次演练的中位人类投入，等待与无人值守运行未计入",
    teamId,
    updatedAt = "今天",
    ...fields
  } = seed;
  const base: TaskNode = {
    ...fields,
    kind: "task",
    parentId: `${teamId}-workspace`,
    teamId,
    updatedAt,
  };
  if (minutes === undefined) return base;
  return {
    ...base,
    effortEstimate: {
      basis: "mock",
      confirmed: false,
      minutes,
      reason: effortReason,
      scopeKey: getEffortScopeKey(base, workMethod),
      version: 1,
      workMethod,
    },
  };
};

export const platformMembers: PersonOption[] = [
  member("周岚", "zhoulan@agentdoor.local", "产品发布负责人", "移动端发布目标、范围取舍、跨团队节奏与最终 Go/No-Go 决策", "本周保留 4 小时用于发布门禁与风险决策", ["协调 3.8.0 发布门禁", "收口灰度范围"], "主持两次跨端发布风险评审"),
  member("程砚", "chengyan@agentdoor.local", "平台 API 负责人", "接口契约、兼容策略、鉴权语义与服务端发布", "周二前可完成契约冻结，线上变更窗口需提前预约", ["冻结移动同步 API", "核对旧客户端兼容"], "完成鉴权接口 v2 的兼容性回放"),
  member("乔安", "qiaoan@agentdoor.local", "iOS 负责人", "iOS 客户端实现、性能、审核材料与 App Store 提交", "审核前可安排一次完整回归，商店反馈时间未知", ["处理 iOS 后台同步", "准备隐私清单"], "关闭 6 个 iOS 发布阻断缺陷"),
  member("唐澈", "tangche@agentdoor.local", "Android 负责人", "Android 客户端、机型兼容、分阶段发布与回滚", "本周可投入 1.5 天，设备农场夜间时段已预约", ["验证分阶段发布", "排查厂商后台限制"], "完成 12 个重点机型的冷启动基线"),
  member("叶宁", "yening@agentdoor.local", "SRE", "可观测性、容量、告警路由、灰度监控与回滚执行", "发布窗口全程值守，白天还需处理两个容量变更", ["配置 SLO 告警", "演练发布回滚"], "完成同步服务故障注入演练"),
  member("宋衡", "songheng@agentdoor.local", "安全工程师", "威胁建模、移动端数据保护、权限审查与安全门禁", "材料齐全后一个工作日内给出门禁结论", ["复核令牌落盘策略", "检查第三方 SDK 权限"], "发现并推动修复一个日志脱敏缺口"),
  member("顾言", "guyan@agentdoor.local", "质量负责人", "跨端测试策略、兼容矩阵、发布验收与缺陷分级", "回归窗口已锁定周三至周四", ["维护发布回归矩阵", "复核 P0/P1 清零"], "组织完成 3.7.2 热修复回归"),
  member("许悦", "xuyue@agentdoor.local", "客户支持运营", "发布公告、支持手册、工单分流与客户影响回传", "可在发布前半天完成支持团队培训", ["更新故障排查手册", "整理灰度客户名单"], "把高频同步工单归并为 4 类处理路径"),
];

export const supplyOperationsMembers: PersonOption[] = [
  member("周岚", "zhoulan@agentdoor.local", "NPI 项目负责人", "试产目标、跨供应商决策、变更边界与量产放行", "每天 16:00 可处理跨职能决策，试产日驻厂", ["收口 PVT 放行条件", "协调关键物料到料"], "关闭两项影响试产的跨供应商争议"),
  member("沈工", "shengong@agentdoor.local", "供应商质量工程师", "PPAP、来料质量、供应商纠正措施与变更追溯", "A 供应商现场审核已排周二，报告次日可出", ["核对电芯 PPAP", "跟进注塑件 CPK"], "完成三家关键供应商的过程审核"),
  member("赵妍", "zhaoyan@agentdoor.local", "制造工艺工程师", "工艺参数、工装验证、首件确认与产线节拍", "本周二、周四各有半天产线窗口", ["验证扭矩参数", "收口首件检查表"], "将瓶颈工位节拍从 74 秒降至 66 秒"),
  member("贺青", "heqing@agentdoor.local", "质量经理", "控制计划、检验标准、质量门禁与不合格处置", "试产前可完成一次质量门禁评审", ["更新控制计划", "复核外观限度样"], "签发上一轮 EV 样件质量结论"),
  member("罗骁", "luoxiao@agentdoor.local", "生产主管", "产线资源、人员排班、产能试跑与现场异常闭环", "夜班资源已锁定，白班需与现有量产错峰", ["准备 PVT 线体", "确认换线清场"], "完成两次小批量试跑并记录停线原因"),
  member("唐静", "tangjing@agentdoor.local", "培训与标准作业负责人", "SOP、岗位培训、技能确认与版本受控", "首批 24 名操作员可分两班培训", ["录制关键工位视频", "安排技能考核"], "完成包装线新版 SOP 培训"),
  member("冯维", "fengwei@agentdoor.local", "包装工程师", "包装结构、标签、运输测试与法规信息落版", "跌落测试实验室周三有窗口", ["复核标签条码", "安排跌落测试"], "解决上轮外箱条码低温脱落问题"),
  member("陈琛", "chenchen@agentdoor.local", "计划与物料经理", "物料齐套、排产、库存风险与试产批次追踪", "每日 11:00 更新齐套表，长交期物料无备用库存", ["跟进长交期 IC", "冻结试产批次 BOM"], "将齐套缺口从 11 项降至 3 项"),
];

export const customerSuccessMembers: PersonOption[] = [
  member("周岚", "zhoulan@agentdoor.local", "重大事件指挥官", "客户影响边界、恢复优先级、跨团队决策与对外结论", "事件期间保持在线，复盘改进项由各职能分别负责", ["确认恢复排序", "审核客户更新"], "指挥两次企业客户同步故障恢复"),
  member("沈闻", "shenwen@agentdoor.local", "SRE 值班负责人", "流量治理、服务恢复、容量与运行时证据保全", "当前为主值班，夜间由二线接替", ["稳定同步队列", "保全关键时序指标"], "完成故障流量削峰并恢复核心写入"),
  member("白露", "bailu@agentdoor.local", "数据可靠性工程师", "数据一致性核对、修复脚本、抽样验证与回滚", "修复脚本运行约 3 小时，人需分批复核", ["圈定受影响记录", "验证修复批次"], "定位到 1,842 条需核对的状态记录"),
  member("陈沁", "chenqin@agentdoor.local", "客户成功负责人", "客户分级沟通、业务影响确认、承诺管理与跟进", "可覆盖全部受影响企业客户，重点客户需负责人逐一确认", ["更新客户状态页", "回收关键客户影响"], "完成 18 家企业客户的首轮触达"),
  member("薛航", "xuehang@agentdoor.local", "后端负责人", "根因定位、代码修复、变更审查与防复发技术方案", "已暂停非紧急迭代，优先处理此次故障", ["复现队列竞态", "准备修复变更"], "定位到重试窗口中的幂等状态竞争"),
  member("江予", "jiangyu@agentdoor.local", "商业运营", "SLA 适用性、补偿边界、合同口径与审批材料", "合同核对需法务支持，预计明天下午形成建议", ["核对 SLA 分层", "准备补偿清单"], "完成受影响客户合同条款分类"),
  member("陆遥", "luyao@agentdoor.local", "支持赋能负责人", "一线排查手册、工单路由、客服培训与知识库", "可在当天完成紧急手册更新并组织晚班培训", ["更新排障决策树", "整理工单宏"], "将重复升级工单占比降至 9%"),
  member("周牧", "zhoumu@agentdoor.local", "合规与隐私顾问", "事故数据披露、隐私影响判断、通知边界与证据留存", "完成影响清单后可给出是否触发通知的书面判断", ["核对数据字段范围", "审查客户通报"], "完成两次安全事件披露边界评估"),
];

const platformNodes: WorkspaceNode[] = [
  { id: "platform-workspace", kind: "folder", name: "移动端 3.8.0 发布", parentId: workspaceRootId, teamId: "platform", updatedAt: "今天" },
  task({ id: "platform-mobile-release", teamId: "platform", name: "完成移动端 3.8.0 可控发布", ownerId: "周岚", participantIds: ["程砚", "乔安", "唐澈", "叶宁", "宋衡", "顾言", "许悦"], status: "进行中", goal: "在不扩大同步与隐私风险的前提下完成 iOS 与 Android 分阶段发布，并保留可执行回滚路径。", completionCriteria: ["安全与质量门禁均形成可核对结论", "灰度监控、支持手册和回滚负责人已确认", "Go/No-Go 决定及未决风险已记录"], executionTips: ["商店审核耗时属于外部等待，不计入 EWD", "任何扩大灰度比例的决定均引用最新 SLO 证据"], dueAt: "9 月 8 日 18:00", plannedStartOn: "2026-08-25", plannedEndOn: "2026-09-08", labels: ["发布门禁", "高优先级"], iconName: "flag", iconTone: "red" }),
  task({ id: "platform-client-track", teamId: "platform", name: "收口双端候选版本", parentTaskId: "platform-mobile-release", ownerId: "顾言", participantIds: ["乔安", "唐澈"], status: "进行中", goal: "形成 iOS 与 Android 均可进入发布门禁的候选版本。", completionCriteria: ["双端版本号、构建号和变更范围可追溯", "阻断缺陷均有关闭或书面接受结论"], executionTips: ["该任务只整合双端结果，不重复计算叶子工时"], dueAt: "9 月 4 日", plannedStartOn: "2026-08-28", plannedEndOn: "2026-09-04", labels: ["客户端", "发布门禁"], iconName: "clipboard-check", iconTone: "purple" }),
  task({ id: "platform-service-track", teamId: "platform", name: "冻结服务端契约与运行保障", parentTaskId: "platform-mobile-release", ownerId: "程砚", participantIds: ["叶宁", "宋衡"], status: "进行中", goal: "冻结客户端依赖的接口语义并建立发布期间的运行保障。", completionCriteria: ["契约、兼容策略与告警边界均有受控版本"], executionTips: ["父任务不计 EWD，以下属叶子结果汇总"], dueAt: "9 月 5 日", plannedStartOn: "2026-08-26", plannedEndOn: "2026-09-05", labels: ["服务端", "可观测性"], iconName: "briefcase", iconTone: "blue" }),
  task({ id: "platform-governance-track", teamId: "platform", name: "完成发布治理与支持准备", parentTaskId: "platform-mobile-release", ownerId: "周岚", participantIds: ["宋衡", "许悦"], status: "进行中", goal: "把安全门禁、支持响应和发布决定收敛为可执行方案。", completionCriteria: ["门禁结论和支持路径均可追溯到责任人"], executionTips: ["不把安全审核视为父子关系产生的默认依赖"], dueAt: "9 月 6 日", plannedStartOn: "2026-08-29", plannedEndOn: "2026-09-06", labels: ["发布门禁", "客户影响"], iconName: "file-check", iconTone: "green" }),
  task({ id: "platform-api-contract", teamId: "platform", name: "冻结离线同步 API 契约", parentTaskId: "platform-service-track", ownerId: "程砚", participantIds: ["乔安", "唐澈"], status: "已完成", goal: "冻结批量同步、冲突响应和版本兼容语义。", completionCriteria: ["OpenAPI 版本已签发", "旧客户端回放无破坏性差异"], executionTips: ["对比 3.6、3.7 客户端请求样本"], dueAt: "8 月 29 日", plannedStartOn: "2026-08-25", plannedEndOn: "2026-08-29", labels: ["服务端", "契约"], iconName: "file-check", iconTone: "blue", minutes: 480 }),
  task({ id: "platform-ios-review", teamId: "platform", name: "完成 iOS 候选版审核材料", parentTaskId: "platform-client-track", ownerId: "乔安", participantIds: ["顾言"], dependsOnTaskIds: ["platform-api-contract"], status: "进行中", goal: "形成可提交 App Store 的 iOS 候选版本与隐私材料。", completionCriteria: ["回归矩阵通过且无 P0/P1", "隐私清单与 SDK 权限一致", "审核截图和说明已复核"], executionTips: ["记录审核退回属于外部等待"], dueAt: "9 月 3 日", plannedStartOn: "2026-08-29", plannedEndOn: "2026-09-03", labels: ["客户端", "iOS"], iconName: "sparkles", iconTone: "purple", minutes: 720 }),
  task({ id: "platform-android-staged", teamId: "platform", name: "验证 Android 分阶段发布与回滚", parentTaskId: "platform-client-track", ownerId: "唐澈", participantIds: ["顾言", "叶宁"], dependsOnTaskIds: ["platform-api-contract"], status: "进行中", goal: "验证重点机型、分阶段比例与一键回滚路径。", completionCriteria: ["重点机型矩阵通过", "5%→20% 灰度条件明确", "回滚演练留存证据"], executionTips: ["厂商推送到达时间不计入人类工时"], dueAt: "9 月 4 日", plannedStartOn: "2026-08-30", plannedEndOn: "2026-09-04", labels: ["客户端", "Android"], iconName: "list-todo", iconTone: "green", minutes: 600 }),
  task({ id: "platform-observability-alerts", teamId: "platform", name: "配置同步链路 SLO 与灰度告警", parentTaskId: "platform-service-track", ownerId: "叶宁", participantIds: ["程砚"], dependsOnTaskIds: ["platform-api-contract"], status: "进行中", goal: "让灰度期间的错误率、积压和数据延迟可被及时发现并路由。", completionCriteria: ["告警覆盖错误率、队列积压与同步延迟", "阈值有历史基线和处置责任人", "测试告警已触达值班渠道"], executionTips: ["避免用单次峰值替代滚动窗口"], dueAt: "9 月 2 日", plannedStartOn: "2026-08-28", plannedEndOn: "2026-09-02", labels: ["可观测性", "SRE"], iconName: "chart", iconTone: "cyan", minutes: 420 }),
  task({ id: "platform-support-runbook", teamId: "platform", name: "更新同步故障支持手册", parentTaskId: "platform-governance-track", ownerId: "许悦", participantIds: ["叶宁", "乔安", "唐澈"], dependsOnTaskIds: ["platform-observability-alerts"], status: "待开始", goal: "让一线支持可识别版本、定位常见故障并按影响升级。", completionCriteria: ["四类高频故障均有可执行排查步骤", "升级路径、值班人与客户话术已确认", "晚班支持完成一次桌面演练"], executionTips: ["只引用已验证的诊断动作"], dueAt: "9 月 5 日", plannedStartOn: "2026-09-02", plannedEndOn: "2026-09-05", labels: ["客户影响", "支持准备"], iconName: "clipboard-check", iconTone: "amber", minutes: 360 }),
  task({ id: "platform-security-gate", teamId: "platform", name: "签发移动数据安全门禁结论", parentTaskId: "platform-governance-track", ownerId: "宋衡", participantIds: ["程砚", "乔安", "唐澈"], dependsOnTaskIds: ["platform-api-contract"], status: "已阻塞", goal: "确认令牌、离线缓存和第三方 SDK 权限符合发布边界。", completionCriteria: ["威胁模型覆盖离线缓存与令牌刷新", "高风险项关闭或有明确例外批准", "安全结论绑定候选版本"], executionTips: ["当前等待第三方 SDK 权限清单 v4，不把等待计入 EWD"], dueAt: "9 月 3 日 15:00", plannedStartOn: "2026-08-29", plannedEndOn: "2026-09-03", labels: ["安全门禁"], iconName: "file-check", iconTone: "red", minutes: 540 }),
  task({ id: "platform-access-review", teamId: "platform", name: "季度管理员访问复核", ownerId: "宋衡", participantIds: ["周岚"], status: "进行中", goal: "核对生产管理员访问是否仍与岗位职责一致。", completionCriteria: ["全部高权限账号有保留或移除结论"], executionTips: ["与移动发布并行，不属于发布主任务范围"], dueAt: "9 月 10 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-10", labels: ["安全门禁"], iconName: "file-check", iconTone: "neutral", minutes: 300 }),
  task({ id: "platform-design-token-cleanup", teamId: "platform", name: "清理旧版移动设计 Token", ownerId: "乔安", participantIds: ["唐澈"], status: "待开始", goal: "移除已废弃的颜色与间距 Token，减少双端样式漂移。", completionCriteria: ["无运行时引用且迁移说明已记录"], executionTips: ["不与 3.8.0 发布耦合"], dueAt: "9 月 18 日", plannedStartOn: "2026-09-09", plannedEndOn: "2026-09-18", labels: ["技术债"], iconName: "sparkles", iconTone: "neutral", minutes: 420 }),
];

const factoryNodes: WorkspaceNode[] = [
  { id: "supply-operations-workspace", kind: "folder", name: "智能门锁 PVT 试产", parentId: workspaceRootId, teamId: "supply-operations", updatedAt: "今天" },
  task({ id: "factory-pilot-ramp", teamId: "supply-operations", name: "完成智能门锁 PVT 试产放行", ownerId: "周岚", participantIds: ["沈工", "赵妍", "贺青", "罗骁", "唐静", "冯维", "陈琛"], status: "进行中", goal: "验证 500 台 PVT 试产的物料、工艺、质量和人员准备，在已知偏差受控后决定是否进入量产爬坡。", completionCriteria: ["关键物料、产线、质量和包装均形成放行结论", "偏差项有责任人、期限和遏制措施", "量产 Go/No-Go 决定绑定试产批次"], executionTips: ["设备自动运行和物料等待不计入 EWD", "批次、BOM 与检验版本必须一一对应"], dueAt: "9 月 15 日", plannedStartOn: "2026-08-24", plannedEndOn: "2026-09-15", labels: ["试产放行", "高优先级"], iconName: "target", iconTone: "red" }),
  task({ id: "factory-supplier-track", teamId: "supply-operations", name: "收口关键物料与包装准备", parentTaskId: "factory-pilot-ramp", ownerId: "沈工", participantIds: ["陈琛", "冯维"], status: "进行中", goal: "确认关键供应商证据、来料批次与包装标签满足试产边界。", completionCriteria: ["关键物料和包装偏差均有结论"], executionTips: ["父任务不重复累计叶子 EWD"], dueAt: "9 月 8 日", plannedStartOn: "2026-08-24", plannedEndOn: "2026-09-08", labels: ["供应商质量", "物料齐套"], iconName: "briefcase", iconTone: "blue" }),
  task({ id: "factory-production-track", teamId: "supply-operations", name: "验证产线能力与人员准备", parentTaskId: "factory-pilot-ramp", ownerId: "赵妍", participantIds: ["罗骁", "唐静"], status: "进行中", goal: "确认工艺、线体、人员和节拍支持 PVT 批次。", completionCriteria: ["产线与人员结果可追溯到同一工艺版本"], executionTips: ["产能等待时间不计入人类投入"], dueAt: "9 月 11 日", plannedStartOn: "2026-08-27", plannedEndOn: "2026-09-11", labels: ["产线验证", "产能"], iconName: "clipboard-check", iconTone: "amber" }),
  task({ id: "factory-launch-track", teamId: "supply-operations", name: "完成质量门禁与放行准备", parentTaskId: "factory-pilot-ramp", ownerId: "贺青", participantIds: ["周岚", "沈工", "赵妍"], status: "待开始", goal: "以试产证据完成质量门禁并准备放行决定。", completionCriteria: ["质量结论、偏差关闭和量产风险清单一致"], executionTips: ["未签发质量结论前不把试产完成视为量产放行"], dueAt: "9 月 14 日", plannedStartOn: "2026-09-05", plannedEndOn: "2026-09-14", labels: ["质量门禁", "试产放行"], iconName: "file-check", iconTone: "green" }),
  task({ id: "factory-supplier-ppap", teamId: "supply-operations", name: "签收电芯与锁体供应商 PPAP", parentTaskId: "factory-supplier-track", ownerId: "沈工", participantIds: ["贺青", "陈琛"], status: "已完成", goal: "确认关键特性、过程能力和来料批次满足 PVT 要求。", completionCriteria: ["两家供应商 PPAP 均签发", "关键尺寸 CPK 与材料证书已核对", "偏差许可绑定批次和有效期"], executionTips: ["报告文件版本必须与到料批号一致"], dueAt: "8 月 30 日", plannedStartOn: "2026-08-24", plannedEndOn: "2026-08-30", labels: ["供应商质量", "PPAP"], iconName: "file-check", iconTone: "blue", minutes: 720 }),
  task({ id: "factory-line-validation", teamId: "supply-operations", name: "完成工装与首件参数验证", parentTaskId: "factory-production-track", ownerId: "赵妍", participantIds: ["罗骁", "贺青"], dependsOnTaskIds: ["factory-supplier-ppap"], status: "进行中", goal: "用受控物料验证关键工装、扭矩参数和首件检查。", completionCriteria: ["关键工装校准在有效期内", "三套首件记录通过", "参数版本已下发线体"], executionTips: ["自动循环测试只计设置与结果复核时间"], dueAt: "9 月 5 日", plannedStartOn: "2026-08-30", plannedEndOn: "2026-09-05", labels: ["产线验证", "工艺参数"], iconName: "list-todo", iconTone: "cyan", minutes: 900 }),
  task({ id: "factory-quality-gate", teamId: "supply-operations", name: "签发 PVT 质量门禁结论", parentTaskId: "factory-launch-track", ownerId: "贺青", participantIds: ["沈工", "赵妍"], dependsOnTaskIds: ["factory-line-validation", "factory-capacity-trial", "factory-label-rework"], status: "待开始", goal: "汇总进料、过程、成品与可靠性证据并签发质量结论。", completionCriteria: ["不合格项均有关闭或偏差批准", "抽检结果满足控制计划", "质量结论绑定 PVT 批次"], executionTips: ["只审核最近直接产出，不跳过生产任务"], dueAt: "9 月 13 日", plannedStartOn: "2026-09-10", plannedEndOn: "2026-09-13", labels: ["质量门禁", "高优先级"], iconName: "file-check", iconTone: "red", minutes: 600 }),
  task({ id: "factory-operator-training", teamId: "supply-operations", name: "完成关键工位培训与技能确认", parentTaskId: "factory-production-track", ownerId: "唐静", participantIds: ["赵妍", "罗骁"], dependsOnTaskIds: ["factory-line-validation"], status: "待开始", goal: "确保两班操作员能按受控 SOP 执行关键工位并识别停线条件。", completionCriteria: ["24 名操作员完成培训", "关键工位实操考核通过", "缺席人员有补训安排"], executionTips: ["培训签到不等于技能确认"], dueAt: "9 月 8 日", plannedStartOn: "2026-09-05", plannedEndOn: "2026-09-08", labels: ["人员培训", "SOP"], iconName: "clipboard-check", iconTone: "purple", minutes: 840 }),
  task({ id: "factory-packaging-readiness", teamId: "supply-operations", name: "验证包装、运输与标签版本", parentTaskId: "factory-supplier-track", ownerId: "冯维", participantIds: ["沈工", "陈琛"], dependsOnTaskIds: ["factory-supplier-ppap"], status: "进行中", goal: "确认包装结构、运输可靠性和法规标签支持 PVT 发运。", completionCriteria: ["跌落与振动测试通过", "条码可读率满足标准", "标签内容与受控 BOM 一致"], executionTips: ["实验室排队属于等待，不计 EWD"], dueAt: "9 月 6 日", plannedStartOn: "2026-08-30", plannedEndOn: "2026-09-06", labels: ["包装", "运输测试"], iconName: "briefcase", iconTone: "green", minutes: 660 }),
  task({ id: "factory-capacity-trial", teamId: "supply-operations", name: "执行 4 小时产能试跑", parentTaskId: "factory-production-track", ownerId: "罗骁", participantIds: ["赵妍", "贺青", "唐静"], dependsOnTaskIds: ["factory-line-validation", "factory-operator-training"], status: "已阻塞", goal: "验证连续生产节拍、良率、停线响应和换班稳定性。", completionCriteria: ["连续 4 小时试跑完成", "节拍与 FPY 达到门禁", "停线事件均有分类和处置"], executionTips: ["当前等待夜班关键岗位补训完成"], dueAt: "9 月 10 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-10", labels: ["产能"], iconName: "chart", iconTone: "amber", minutes: 780 }),
  task({ id: "factory-label-rework", teamId: "supply-operations", name: "完成 PVT 标签错版返工", parentTaskId: "factory-launch-track", ownerId: "冯维", participantIds: ["罗骁", "贺青"], dependsOnTaskIds: ["factory-packaging-readiness"], status: "待开始", goal: "隔离错版标签并完成 PVT 批次返工与数量核对。", completionCriteria: ["错版标签全部隔离销毁", "500 台返工后条码抽检通过", "返工记录绑定序列号范围"], executionTips: ["返工范围以隔离清单为准，不扩大到已核对批次"], dueAt: "9 月 9 日", plannedStartOn: "2026-09-06", plannedEndOn: "2026-09-09", labels: ["包装", "返工"], iconName: "flag", iconTone: "red", minutes: 480 }),
  task({ id: "factory-warranty-trace", teamId: "supply-operations", name: "建立首批量产保修件追溯方案", ownerId: "陈琛", participantIds: ["沈工", "贺青"], status: "待开始", goal: "让首批量产退货可追溯到关键物料和工艺批次。", completionCriteria: ["序列号、物料批次和工艺版本映射可查询"], executionTips: ["不属于 PVT 放行硬门禁"], dueAt: "9 月 25 日", plannedStartOn: "2026-09-16", plannedEndOn: "2026-09-25", labels: ["追溯"], iconName: "chart", iconTone: "neutral", minutes: 600 }),
  task({ id: "factory-october-demand-freeze", teamId: "supply-operations", name: "冻结 10 月滚动需求与长料采购", ownerId: "陈琛", participantIds: ["周岚"], status: "进行中", goal: "基于销售预测冻结长交期物料的采购边界。", completionCriteria: ["需求版本和采购承诺已确认"], executionTips: ["需求变更通过下一版本调整，不覆盖本次确认"], dueAt: "9 月 12 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-12", labels: ["物料齐套"], iconName: "list-todo", iconTone: "blue", minutes: 300 }),
];

const serviceNodes: WorkspaceNode[] = [
  { id: "customer-success-workspace", kind: "folder", name: "企业同步故障恢复", parentId: workspaceRootId, teamId: "customer-success", updatedAt: "今天" },
  task({ id: "service-incident-recovery", teamId: "customer-success", name: "完成企业同步故障恢复与客户闭环", ownerId: "周岚", participantIds: ["沈闻", "白露", "陈沁", "薛航", "江予", "陆遥", "周牧"], status: "进行中", goal: "恢复企业客户同步服务与受影响数据，在正式事实一致的基础上完成沟通、补偿判断和防复发闭环。", completionCriteria: ["服务与数据恢复分别有可核对证据", "受影响客户均收到一致更新", "根因、改进项和 SLA 处理结论已记录"], executionTips: ["状态页恢复不等于数据修复完成", "讨论中的完成声明需与正式状态和签发证据核对"], dueAt: "9 月 6 日", plannedStartOn: "2026-08-30", plannedEndOn: "2026-09-06", labels: ["重大事件", "高优先级"], iconName: "target", iconTone: "red" }),
  task({ id: "service-containment-track", teamId: "customer-success", name: "控制影响并恢复核心服务", parentTaskId: "service-incident-recovery", ownerId: "沈闻", participantIds: ["薛航", "白露"], status: "进行中", goal: "先限制新增影响，再恢复核心同步路径。", completionCriteria: ["流量和数据影响边界均有证据"], executionTips: ["父任务不重复累计叶子 EWD"], dueAt: "9 月 1 日", plannedStartOn: "2026-08-30", plannedEndOn: "2026-09-01", labels: ["事件响应", "服务恢复"], iconName: "flag", iconTone: "amber" }),
  task({ id: "service-customer-track", teamId: "customer-success", name: "完成客户沟通与商业处理", parentTaskId: "service-incident-recovery", ownerId: "陈沁", participantIds: ["江予", "周牧"], status: "进行中", goal: "保持客户事实一致并处理需补偿的合同边界。", completionCriteria: ["沟通与补偿均基于确认的影响清单"], executionTips: ["不在根因未确认时推测技术原因"], dueAt: "9 月 4 日", plannedStartOn: "2026-08-30", plannedEndOn: "2026-09-04", labels: ["客户沟通", "SLA"], iconName: "briefcase", iconTone: "blue" }),
  task({ id: "service-prevention-track", teamId: "customer-success", name: "形成根因与防复发闭环", parentTaskId: "service-incident-recovery", ownerId: "薛航", participantIds: ["沈闻", "陆遥"], status: "待开始", goal: "形成可验证根因和运行手册更新。", completionCriteria: ["根因与改进项之间有明确因果关系"], executionTips: ["避免把时间相邻事件当成根因"], dueAt: "9 月 6 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-06", labels: ["根因分析", "防复发"], iconName: "file-check", iconTone: "purple" }),
  task({ id: "service-traffic-mitigation", teamId: "customer-success", name: "执行同步流量削峰与租户隔离", parentTaskId: "service-containment-track", ownerId: "沈闻", participantIds: ["薛航"], status: "已完成", goal: "限制故障扩散并恢复高优先级租户写入。", completionCriteria: ["队列积压停止增长", "高优先级租户写入恢复", "限流配置与回退条件已记录"], executionTips: ["保持故障时序指标原始快照"], dueAt: "8 月 30 日 11:30", plannedStartOn: "2026-08-30", plannedEndOn: "2026-08-30", labels: ["事件响应", "服务恢复"], iconName: "flag", iconTone: "green", minutes: 240 }),
  task({ id: "service-data-repair", teamId: "customer-success", name: "修复受影响同步状态记录", parentTaskId: "service-containment-track", ownerId: "白露", participantIds: ["沈闻", "薛航"], dependsOnTaskIds: ["service-traffic-mitigation"], status: "进行中", goal: "按可回滚批次修复受影响记录并验证业务一致性。", completionCriteria: ["受影响记录范围已冻结", "每批修复前后校验可追溯", "分层抽样无新增不一致"], executionTips: ["脚本运行时间不计 EWD，人类复核按批次记录"], dueAt: "9 月 1 日 20:00", plannedStartOn: "2026-08-30", plannedEndOn: "2026-09-01", labels: ["数据修复", "可回滚"], iconName: "chart", iconTone: "cyan", minutes: 900 }),
  task({ id: "service-customer-comms", teamId: "customer-success", name: "完成受影响客户分层沟通", parentTaskId: "service-customer-track", ownerId: "陈沁", participantIds: ["周岚", "周牧"], dependsOnTaskIds: ["service-traffic-mitigation"], status: "进行中", goal: "向不同影响等级客户提供一致、及时且不过度承诺的更新。", completionCriteria: ["状态页与一对一话术事实一致", "重点客户已确认影响和临时方案", "所有承诺均有责任人与时间"], executionTips: ["根因未知时明确标注调查中"], dueAt: "9 月 2 日 12:00", plannedStartOn: "2026-08-30", plannedEndOn: "2026-09-02", labels: ["客户沟通", "客户影响"], iconName: "briefcase", iconTone: "blue", minutes: 600 }),
  task({ id: "service-root-cause", teamId: "customer-success", name: "签发队列竞态根因分析", parentTaskId: "service-prevention-track", ownerId: "薛航", participantIds: ["沈闻", "白露"], dependsOnTaskIds: ["service-traffic-mitigation"], status: "进行中", goal: "用时序、代码路径和复现实验确认根因及触发条件。", completionCriteria: ["根因可稳定复现", "替代假设有排除证据", "修复与监控项对应具体失效模式"], executionTips: ["讨论发言不替代签发的 RCA 文档"], dueAt: "9 月 3 日", plannedStartOn: "2026-08-31", plannedEndOn: "2026-09-03", labels: ["根因分析"], iconName: "file-check", iconTone: "purple", minutes: 720 }),
  task({ id: "service-compensation-review", teamId: "customer-success", name: "核对 SLA 与补偿适用范围", parentTaskId: "service-customer-track", ownerId: "江予", participantIds: ["陈沁", "周牧"], dependsOnTaskIds: ["service-data-repair", "service-customer-comms"], status: "已阻塞", goal: "按正式影响时长和合同分层形成补偿建议。", completionCriteria: ["客户、套餐、影响窗口和条款匹配", "例外客户有审批路径", "建议未被表述为已批准"], executionTips: ["当前等待数据修复后的最终影响清单"], dueAt: "9 月 4 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-04", labels: ["SLA"], iconName: "list-todo", iconTone: "amber", minutes: 480 }),
  task({ id: "service-runbook-update", teamId: "customer-success", name: "更新同步积压处置手册", parentTaskId: "service-prevention-track", ownerId: "陆遥", participantIds: ["沈闻", "薛航"], dependsOnTaskIds: ["service-root-cause"], status: "待开始", goal: "把确认的触发条件、指标与处置动作转为一线可执行手册。", completionCriteria: ["决策树覆盖发现、遏制、恢复和升级", "每个动作有可观测结果和停止条件", "支持与值班团队完成桌面演练"], executionTips: ["仅纳入已经验证的操作"], dueAt: "9 月 6 日", plannedStartOn: "2026-09-03", plannedEndOn: "2026-09-06", labels: ["防复发", "支持准备"], iconName: "clipboard-check", iconTone: "green", minutes: 540 }),
  task({ id: "service-quarterly-drill", teamId: "customer-success", name: "组织季度企业故障桌面演练", ownerId: "陆遥", participantIds: ["周岚", "沈闻", "陈沁"], status: "待开始", goal: "验证跨团队事件角色、升级和客户沟通路径。", completionCriteria: ["完成演练并记录未通过检查项"], executionTips: ["独立于本次事件改进项"], dueAt: "9 月 20 日", plannedStartOn: "2026-09-12", plannedEndOn: "2026-09-20", labels: ["事件响应"], iconName: "clipboard-check", iconTone: "neutral", minutes: 360 }),
  task({ id: "service-enterprise-sla-review", teamId: "customer-success", name: "复核年度企业版 SLA 模板", ownerId: "江予", participantIds: ["周牧", "陈沁"], status: "进行中", goal: "核对新合同模板中的可用性定义、排除项和补偿上限。", completionCriteria: ["商业、合规和客户成功意见已收口"], executionTips: ["不回写已生效客户合同"], dueAt: "9 月 16 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-16", labels: ["SLA"], iconName: "file-check", iconTone: "neutral", minutes: 420 }),
];

const tag = (id: string, name: string, icon: TagIconName, color: TagColorName): TagDefinition => ({ id, name, icon, color });
const crossTeamTags: TagDefinition[] = [
  tag("team-release-gate", "发布门禁", "flag", "red"), tag("team-client", "客户端", "wrench", "purple"),
  tag("team-service", "服务端", "layers", "blue"), tag("team-observability", "可观测性", "layers", "cyan"),
  tag("team-contract", "契约", "building", "blue"), tag("team-ios", "iOS", "wrench", "purple"),
  tag("team-android", "Android", "wrench", "green"), tag("team-sre", "SRE", "shield", "cyan"),
  tag("team-customer-impact", "客户影响", "users", "orange"), tag("team-support", "支持准备", "users", "amber"),
  tag("team-security-gate", "安全门禁", "shield", "red"),
  tag("team-tech-debt", "技术债", "wrench", "gray"), tag("team-pilot", "试产放行", "flag", "red"),
  tag("team-supplier-quality", "供应商质量", "building", "blue"), tag("team-material", "物料齐套", "package", "amber"),
  tag("team-line", "产线验证", "wrench", "cyan"), tag("team-capacity", "产能", "layers", "orange"),
  tag("team-quality-gate", "质量门禁", "shield", "red"), tag("team-ppap", "PPAP", "layers", "blue"),
  tag("team-process", "工艺参数", "wrench", "cyan"), tag("team-training", "人员培训", "users", "purple"),
  tag("team-sop", "SOP", "layers", "purple"), tag("team-package", "包装", "package", "green"),
  tag("team-transport", "运输测试", "package", "green"), tag("team-rework", "返工", "wrench", "red"),
  tag("team-trace", "追溯", "layers", "gray"), tag("team-major-incident", "重大事件", "flag", "red"),
  tag("team-incident", "事件响应", "shield", "orange"), tag("team-recovery", "服务恢复", "wrench", "green"),
  tag("team-customer-comms", "客户沟通", "users", "blue"), tag("team-sla", "SLA", "layers", "amber"),
  tag("team-rca", "根因分析", "wrench", "purple"), tag("team-prevention", "防复发", "shield", "green"),
  tag("team-data-repair", "数据修复", "layers", "cyan"), tag("team-rollback", "可回滚", "wrench", "green"),
];

export const multiTeamTags: TagDefinition[] = [...creatorCommerceTags, ...crossTeamTags]
  .filter((definition, index, all) => all.findIndex((candidate) => candidate.name === definition.name) === index);
export const teamTagDefinitions = multiTeamTags;

const creatorNodes = creatorCommerceWorkspaceNodes
  .filter((node) => node.id !== workspaceRootId)
  .map((node): WorkspaceNode => ({ ...node, teamId: "creator-commerce" }));

/** v9 只新增这一批高密度任务；迁移时据此补入，不会复活旧版中被用户删除的任务。 */
export const teamWorkspaceExpansionNodes: TaskNode[] = [
  ...creatorCommerceAdditionNodes,
  ...platformAdditionNodes,
  ...supplyOperationsAdditionNodes,
  ...customerSuccessAdditionNodes,
];

/** Keep authored mock estimates aligned with the same definition used by live EWD. */
const alignMockEffortScopes = (nodes: WorkspaceNode[]): WorkspaceNode[] => {
  return nodes.map((input) => {
    const node = input.kind === "task" ? withProgressDemoCreation(input, nodes) : input;
    if (node.kind !== "task" || node.effortEstimate?.basis !== "mock") return node;
    const scopeKey = getEffortScopeKey({
      goal: getTaskDefinitionGoal(nodes, node),
      completionCriteria: node.completionCriteria,
      executionTips: node.executionTips,
    }, node.effortEstimate.workMethod);
    return scopeKey === node.effortEstimate.scopeKey
      ? node
      : { ...node, effortEstimate: { ...node.effortEstimate, scopeKey } };
  });
};

export const teamWorkspaceScenarios: TeamWorkspaceScenario[] = [
  { id: "creator-commerce", name: "达人带货运营团队", industry: "内容电商", mainTaskId: creatorCommerceMainTaskId, members: creatorCommerceMembers, nodes: alignMockEffortScopes([...creatorNodes, ...creatorCommerceAdditionNodes, ...unassignedTaskFixtures, ...residentDeletionDemoTasks]), asOf: "2026-09-02T18:30:00+08:00", coverage: "达人合作、内容、直播、商品、投流、数据、合规、首发与大促项目的本地合成记录；达人池治理历史补充至 9 月 2 日。", missingSources: "不含达人私聊、外部投放平台和线下沟通。", source: "synthetic-fixture" },
  { id: "platform", name: "协作平台团队", industry: "企业 SaaS", mainTaskId: "platform-mobile-release", members: platformMembers, nodes: alignMockEffortScopes([...platformNodes, ...platformAdditionNodes]), asOf: "2026-09-01T10:10:00+08:00", coverage: "移动发布、身份目录、审计导出、权限治理、API、安全、SRE、质量与客户支持的本地合成记录。", missingSources: "不含应用商店后台实时状态和生产遥测正文。", source: "synthetic-fixture" },
  { id: "supply-operations", name: "智能硬件试产团队", industry: "制造与供应链", mainTaskId: "factory-pilot-ramp", members: supplyOperationsMembers, nodes: alignMockEffortScopes([...factoryNodes, ...supplyOperationsAdditionNodes]), asOf: "2026-09-01T08:40:00+08:00", coverage: "供应商质量、试产、产线、追溯、包装、培训、物料与量产爬坡项目的本地合成记录。", missingSources: "不含 MES 实时节拍、供应商门户和实验室原始仪器数据。", source: "synthetic-fixture" },
  { id: "customer-success", name: "企业客户成功团队", industry: "B2B 客户运营", mainTaskId: "service-incident-recovery", members: customerSuccessMembers, nodes: alignMockEffortScopes([...serviceNodes, ...customerSuccessAdditionNodes]), asOf: "2026-09-01T11:05:00+08:00", coverage: "重大事件、数据修复、客户沟通、续约、迁移、健康度治理、SLA 与防复发的本地合成记录。", missingSources: "不含生产日志正文、客户邮件和正式合同附件。", source: "synthetic-fixture" },
];

const scenarioById = new Map(teamWorkspaceScenarios.map((scenario) => [scenario.id, scenario]));
export const allTeamWorkspaceNodes: WorkspaceNode[] = applyCriterionReviewMocks([
  { id: workspaceRootId, kind: "folder", name: "任务", parentId: null, teamId: "__all__", updatedAt: "刚刚" },
  ...teamWorkspaceScenarios.flatMap((scenario) => scenario.nodes),
]);

export function getTeamWorkspaceScenario(teamId: string): TeamWorkspaceScenario | undefined {
  return scenarioById.get(teamId as TeamId);
}

export function getTeamMembers(teamId: string): PersonOption[] {
  return (getTeamWorkspaceScenario(teamId)?.members ?? []).map((person) => ({
    ...person,
    ...(person.currentWork ? { currentWork: [...person.currentWork] } : {}),
  }));
}

export function getTeamTaskNodes(teamId: string, nodes: readonly WorkspaceNode[] = allTeamWorkspaceNodes): TaskNode[] {
  return getTeamWorkspaceNodes(teamId, nodes).filter((node): node is TaskNode => node.kind === "task");
}

export function getTeamWorkspaceNodes(teamId: string, nodes: readonly WorkspaceNode[] = allTeamWorkspaceNodes): WorkspaceNode[] {
  const root = nodes.find((node) => node.id === workspaceRootId) ?? allTeamWorkspaceNodes[0];
  return [root, ...nodes.filter((node) => node.id !== workspaceRootId && node.teamId === teamId)].map((node) => node.kind === "task"
    ? { ...node, ...(node.completionCriteria ? { completionCriteria: [...node.completionCriteria] } : {}), ...(node.dependsOnTaskIds ? { dependsOnTaskIds: [...node.dependsOnTaskIds] } : {}), ...(node.effortEstimate ? { effortEstimate: { ...node.effortEstimate } } : {}), ...(node.executionTips ? { executionTips: [...node.executionTips] } : {}), ...(node.labels ? { labels: [...node.labels] } : {}), ...(node.participantIds ? { participantIds: [...node.participantIds] } : {}) }
    : { ...node });
}

export type TeamWorkspaceValidationIssue = {
  code: "duplicate-id" | "invalid-team" | "missing-member" | "missing-parent" | "cyclic-parent" | "missing-dependency" | "cyclic-dependency" | "invalid-date" | "invalid-effort" | "unknown-label" | "insufficient-depth" | "insufficient-tasks";
  message: string;
  nodeId?: string;
  teamId: string;
};

export type TeamWorkspaceValidationResult = {
  issues: TeamWorkspaceValidationIssue[];
  stats: Array<{ estimatedLeaves: number; maxDepth: number; members: number; tasks: number; teamId: string }>;
  valid: boolean;
};

export function validateTeamWorkspaceScenarios(scenarios: readonly TeamWorkspaceScenario[] = teamWorkspaceScenarios): TeamWorkspaceValidationResult {
  const issues: TeamWorkspaceValidationIssue[] = [];
  const globalIds = new Set<string>();
  const knownLabels = new Set(multiTeamTags.map((definition) => definition.name));
  const stats: TeamWorkspaceValidationResult["stats"] = [];
  for (const scenario of scenarios) {
    const tasks = scenario.nodes.filter((node): node is TaskNode => node.kind === "task");
    const taskById = new Map(tasks.map((item) => [item.id, item]));
    const memberIds = new Set(scenario.members.map((person) => person.id));
    const parentOf = new Map(tasks.flatMap((item) => item.parentTaskId ? [[item.id, item.parentTaskId] as const] : []));
    const effortStateForValidation = (task: TaskNode) => {
      const directState = getTaskEffortState(task);
      if (directState !== "stale") return directState;
      const seen = new Set<string>();
      let root = task;
      while (root.parentTaskId && !seen.has(root.id)) {
        seen.add(root.id);
        const parent = taskById.get(root.parentTaskId);
        if (!parent) break;
        root = parent;
      }
      return root.id === task.id
        ? directState
        : getTaskEffortState({ ...task, goal: root.goal ?? "" });
    };
    if (tasks.length < 40) issues.push({ code: "insufficient-tasks", teamId: scenario.id, message: `团队只有 ${tasks.length} 个任务，无法覆盖高密度复杂协作。` });
    for (const node of scenario.nodes) {
      if (globalIds.has(node.id)) issues.push({ code: "duplicate-id", teamId: scenario.id, nodeId: node.id, message: "节点 ID 在跨团队数据中重复。" });
      globalIds.add(node.id);
      if (node.teamId !== scenario.id) issues.push({ code: "invalid-team", teamId: scenario.id, nodeId: node.id, message: "节点 teamId 与场景不一致。" });
      if (node.kind !== "task") continue;
      if ((node.ownerId !== "" && !memberIds.has(node.ownerId)) || node.participantIds?.some((id) => !memberIds.has(id))) issues.push({ code: "missing-member", teamId: scenario.id, nodeId: node.id, message: "负责人或参与人不在当前团队成员快照。" });
      if (node.parentTaskId && !taskById.has(node.parentTaskId)) issues.push({ code: "missing-parent", teamId: scenario.id, nodeId: node.id, message: "父任务不在同一团队场景。" });
      for (const dependencyId of node.dependsOnTaskIds ?? []) if (!taskById.has(dependencyId) || dependencyId === node.id) issues.push({ code: "missing-dependency", teamId: scenario.id, nodeId: node.id, message: `依赖 ${dependencyId} 无效或跨团队。` });
      if (node.plannedStartOn && node.plannedEndOn && node.plannedStartOn > node.plannedEndOn) issues.push({ code: "invalid-date", teamId: scenario.id, nodeId: node.id, message: "计划开始时间晚于结束时间。" });
      if (node.effortEstimate && effortStateForValidation(node) === "stale") issues.push({ code: "invalid-effort", teamId: scenario.id, nodeId: node.id, message: "EWD 估算与当前任务或继承目标的范围签名不一致。" });
      for (const label of node.labels ?? []) if (!knownLabels.has(label)) issues.push({ code: "unknown-label", teamId: scenario.id, nodeId: node.id, message: `标签「${label}」没有定义。` });
    }
    const detectCycles = (edges: Map<string, string[]>, code: "cyclic-parent" | "cyclic-dependency") => {
      const visiting = new Set<string>();
      const visited = new Set<string>();
      const visit = (id: string): boolean => {
        if (visiting.has(id)) return true;
        if (visited.has(id)) return false;
        visiting.add(id);
        const cyclic = (edges.get(id) ?? []).some(visit);
        visiting.delete(id);
        visited.add(id);
        return cyclic;
      };
      for (const id of edges.keys()) if (visit(id)) issues.push({ code, teamId: scenario.id, nodeId: id, message: code === "cyclic-parent" ? "父子任务形成循环。" : "任务依赖形成循环。" });
    };
    detectCycles(new Map([...parentOf].map(([child, parent]) => [child, [parent]])), "cyclic-parent");
    detectCycles(new Map(tasks.map((item) => [item.id, item.dependsOnTaskIds ?? []])), "cyclic-dependency");
    const depth = (taskId: string) => {
      let current = taskId;
      let value = 0;
      const seen = new Set<string>();
      while (parentOf.has(current) && !seen.has(current)) { seen.add(current); current = parentOf.get(current)!; value += 1; }
      return value;
    };
    const maxDepth = Math.max(0, ...tasks.map((item) => depth(item.id)));
    const minimumDepth = 2;
    if (maxDepth < minimumDepth) issues.push({ code: "insufficient-depth", teamId: scenario.id, message: minimumDepth === 2 ? "任务树没有覆盖至少三层父子结构。" : "任务树没有父子层级。" });
    const parentIds = new Set(parentOf.values());
    stats.push({ teamId: scenario.id, tasks: tasks.length, members: scenario.members.length, maxDepth, estimatedLeaves: tasks.filter((item) => !parentIds.has(item.id) && effortStateForValidation(item) !== "unknown").length });
  }
  return { valid: issues.length === 0, issues, stats };
}
