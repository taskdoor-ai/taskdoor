import { getEffortScopeKey, getTaskEffortState } from "../lib/taskEffort";
import type { TeamId } from "./teamWorkspaceScenarios";
import type { TaskNode } from "./workspaceNodes";

type ExpandedTeamId = Extract<TeamId, "platform" | "supply-operations">;
type AdditionSeed = Omit<TaskNode, "effortEstimate" | "kind" | "parentId" | "teamId" | "updatedAt"> & {
  effortReason?: string;
  minutes?: number;
  teamId: ExpandedTeamId;
  updatedAt?: string;
  workMethod?: string;
};

const defaultWorkMethod: Record<ExpandedTeamId, string> = {
  platform: "复用现有发布、观测与自动化校验工具，由负责人完成边界判断、证据复核和最终签署",
  "supply-operations": "复用受控模板、抽样记录与现场数据采集工具，由负责人完成实物核对、偏差判断和最终签署",
};

const defaultEffortReason: Record<ExpandedTeamId, string> = {
  platform: "参考最近三个同类企业软件交付的中位人类投入；排队、无人值守测试和外部审核等待不计入",
  "supply-operations": "参考最近两轮试产和一次供应商切换的实际人类投入；设备运行、运输和来料等待不计入",
};

// Snapshots of the existing scenario contract keep this addition module safe to import from any composition layer.
// The main scenario validator remains the integration-level authority if members or tags change later.
const expandedTeamMemberIds: Record<ExpandedTeamId, readonly string[]> = {
  platform: ["周岚", "程砚", "乔安", "唐澈", "叶宁", "宋衡", "顾言", "许悦"],
  "supply-operations": ["周岚", "沈工", "赵妍", "贺青", "罗骁", "唐静", "冯维", "陈琛"],
};
const existingExpandedTaskLabels = new Set([
  "Android", "PPAP", "SOP", "SRE", "产线验证", "产能", "事件响应", "人员培训", "供应商质量", "发布门禁",
  "可回滚", "可观测性", "包装", "安全门禁", "客户影响", "客户沟通", "客户端", "技术债",
  "服务端", "根因分析", "物料齐套", "试产放行", "质量门禁", "契约", "工艺参数", "支持准备", "运输测试", "追溯",
  "重大事件", "防复发",
]);

const additionTask = (seed: AdditionSeed): TaskNode => {
  const {
    effortReason = defaultEffortReason[seed.teamId],
    minutes,
    teamId,
    updatedAt = "今天",
    workMethod = defaultWorkMethod[seed.teamId],
    ...fields
  } = seed;
  const task: TaskNode = {
    ...fields,
    kind: "task",
    parentId: `${teamId}-workspace`,
    teamId,
    updatedAt,
  };
  if (minutes === undefined) return task;
  return {
    ...task,
    effortEstimate: {
      basis: "mock",
      confirmed: false,
      minutes,
      reason: effortReason,
      scopeKey: getEffortScopeKey(task, workMethod),
      version: 1,
      workMethod,
    },
  };
};

const platformTask = (seed: Omit<AdditionSeed, "teamId">) => additionTask({ ...seed, teamId: "platform" });
const supplyTask = (seed: Omit<AdditionSeed, "teamId">) => additionTask({ ...seed, teamId: "supply-operations" });

/**
 * 企业 SaaS 团队扩展任务池：三个并行项目树与持续运营工作。
 * 父节点只负责范围与验收，不设置 EWD，避免与叶子工作重复累计。
 */
export const platformAdditionNodes: TaskNode[] = [
  platformTask({ id: "platform-scim-ga", name: "推动 SCIM 账号生命周期能力正式可用", ownerId: "周岚", participantIds: ["程砚", "宋衡", "顾言", "许悦"], status: "进行中", goal: "让企业管理员能够安全地批量开通、停用和恢复成员账号，并为既有租户提供可回滚迁移路径。", completionCriteria: ["核心身份生命周期场景通过兼容与安全门禁", "首批租户迁移结果、例外清单和回滚责任人已确认", "支持团队可独立定位常见目录同步问题"], executionTips: ["先锁定删除、停用和恢复的语义差异，再开放批量迁移", "身份源排队和客户审批属于外部等待，不计入 EWD"], dueAt: "9 月 24 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-24", labels: ["服务端", "安全门禁", "客户影响"], iconName: "target", iconTone: "purple" }),
  platformTask({ id: "platform-scim-contract-track", name: "冻结目录同步契约与安全边界", parentTaskId: "platform-scim-ga", ownerId: "程砚", participantIds: ["宋衡", "顾言"], status: "进行中", goal: "形成跨身份源一致的 SCIM 字段、幂等和权限边界。", completionCriteria: ["契约版本、兼容策略和威胁模型相互引用", "所有高风险字段均有最小权限结论"], executionTips: ["该汇总节点不累计叶子任务工时"], dueAt: "9 月 12 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-12", labels: ["契约", "安全门禁"], iconName: "file-check", iconTone: "blue" }),
  platformTask({ id: "platform-scim-schema-map", name: "统一 Okta 与 Entra ID 属性映射", parentTaskId: "platform-scim-contract-track", ownerId: "程砚", participantIds: ["顾言"], status: "进行中", goal: "明确两类主流身份源的标准属性、扩展属性和空值覆盖行为。", completionCriteria: ["用户、群组和部门字段映射均有样例", "空值、重命名和未知属性的处理可通过契约测试", "旧租户自定义映射有迁移说明"], executionTips: ["保留客户自定义字段，不用标准字段静默覆盖"], dueAt: "9 月 7 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-07", labels: ["契约", "服务端"], iconName: "list-todo", iconTone: "blue", minutes: 660 }),
  platformTask({ id: "platform-scim-idempotency", name: "验证成员停用与恢复的幂等语义", parentTaskId: "platform-scim-contract-track", ownerId: "程砚", participantIds: ["宋衡", "叶宁"], dependsOnTaskIds: ["platform-scim-schema-map"], status: "待开始", goal: "避免目录重试造成重复成员、权限残留或误删业务数据。", completionCriteria: ["停用、恢复和重复请求均通过故障注入", "跨区域重放不会产生额外副作用", "审计记录可追溯到身份源事件"], executionTips: ["只删除授权关系，不级联删除业务内容"], dueAt: "9 月 10 日", plannedStartOn: "2026-09-06", plannedEndOn: "2026-09-10", labels: ["服务端", "安全门禁", "可回滚"], iconName: "clipboard-check", iconTone: "cyan", minutes: 720 }),
  platformTask({ id: "platform-scim-directory-matrix", name: "完成目录同步兼容矩阵回归", parentTaskId: "platform-scim-contract-track", ownerId: "顾言", participantIds: ["程砚", "宋衡"], dependsOnTaskIds: ["platform-scim-idempotency"], status: "待开始", goal: "验证 Okta、Entra ID 与标准 SCIM 客户端在限流、乱序和重试下的行为。", completionCriteria: ["三类身份源的关键场景均有结果", "P0/P1 缺陷清零", "受限场景及规避方法写入支持手册"], executionTips: ["无人值守兼容回归只计算配置和结果复核时间"], dueAt: "9 月 12 日", plannedStartOn: "2026-09-09", plannedEndOn: "2026-09-12", labels: ["客户端", "契约", "安全门禁"], iconName: "clipboard-check", iconTone: "green", minutes: 600 }),
  platformTask({ id: "platform-scim-rollout-track", name: "完成首批租户迁移与支持准备", parentTaskId: "platform-scim-ga", ownerId: "许悦", participantIds: ["周岚", "叶宁", "程砚"], dependsOnTaskIds: ["platform-scim-contract-track"], status: "待开始", goal: "以小批量租户验证迁移、观测、回滚和支持协同。", completionCriteria: ["试点租户、成功门槛和停止条件均已确认", "迁移期间支持与值班责任清晰"], executionTips: ["该汇总节点不累计叶子任务工时"], dueAt: "9 月 22 日", plannedStartOn: "2026-09-11", plannedEndOn: "2026-09-22", labels: ["客户影响", "支持准备", "可观测性"], iconName: "briefcase", iconTone: "amber" }),
  platformTask({ id: "platform-scim-pilot-migration", name: "迁移六家试点租户的目录连接", parentTaskId: "platform-scim-rollout-track", ownerId: "周岚", participantIds: ["程砚", "叶宁", "许悦"], dependsOnTaskIds: ["platform-scim-directory-matrix"], status: "待开始", goal: "验证存量配置转换、增量同步与回退到旧连接器的完整路径。", completionCriteria: ["六家租户均完成迁移前快照", "成员总量与关键群组抽样一致", "每家租户均记录继续、暂停或回退结论"], executionTips: ["每批最多两家租户，观察一个完整同步周期后再继续"], dueAt: "9 月 18 日", plannedStartOn: "2026-09-13", plannedEndOn: "2026-09-18", labels: ["客户影响", "可回滚", "发布门禁"], iconName: "flag", iconTone: "amber", minutes: 900 }),
  platformTask({ id: "platform-scim-support-playbook", name: "发布目录同步排障与升级手册", parentTaskId: "platform-scim-rollout-track", ownerId: "许悦", participantIds: ["程砚", "叶宁"], dependsOnTaskIds: ["platform-scim-pilot-migration"], status: "待开始", goal: "让一线支持能区分身份源配置、平台处理和客户权限三类问题。", completionCriteria: ["至少覆盖不同步、重复成员和权限残留三类故障", "每条路径包含证据采集、处置和升级边界", "晚班支持完成一次桌面演练"], executionTips: ["手册不包含生产密钥或可识别客户的原始载荷"], dueAt: "9 月 20 日", plannedStartOn: "2026-09-17", plannedEndOn: "2026-09-20", labels: ["支持准备", "客户影响"], iconName: "clipboard-check", iconTone: "purple", minutes: 420 }),
  platformTask({ id: "platform-scim-launch-gate", name: "签发 SCIM 正式可用门禁结论", parentTaskId: "platform-scim-rollout-track", ownerId: "周岚", participantIds: ["宋衡", "顾言", "许悦"], dependsOnTaskIds: ["platform-scim-pilot-migration", "platform-scim-support-playbook"], status: "待开始", goal: "基于兼容、安全和试点证据决定是否扩大到所有企业租户。", completionCriteria: ["门禁逐项引用最新证据", "未关闭风险有接受人、期限和影响范围", "正式发布与回滚责任人已确认"], executionTips: ["不以试点无工单替代数据一致性证据"], dueAt: "9 月 22 日", plannedStartOn: "2026-09-20", plannedEndOn: "2026-09-22", labels: ["发布门禁", "安全门禁"], iconName: "file-check", iconTone: "red", minutes: 360 }),

  platformTask({ id: "platform-audit-export", name: "交付企业审计日志合规导出", ownerId: "周岚", participantIds: ["程砚", "宋衡", "顾言", "许悦"], status: "进行中", goal: "让受监管客户可按时间、成员和事件类型导出完整、可验证的审计记录。", completionCriteria: ["导出范围、保留期限和完整性校验通过安全审核", "试点客户可在约定时限内获得并验证结果", "大数据量导出具备限流和取消能力"], executionTips: ["导出文件采用短时授权地址，禁止通过普通附件长期暴露"], dueAt: "10 月 9 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-10-09", labels: ["安全门禁", "客户影响", "服务端"], iconName: "target", iconTone: "blue" }),
  platformTask({ id: "platform-audit-evidence-track", name: "建立审计事件与保留证据", parentTaskId: "platform-audit-export", ownerId: "宋衡", participantIds: ["程砚", "顾言"], status: "进行中", goal: "确定审计事件覆盖、租户隔离、保留与防篡改边界。", completionCriteria: ["事件字典与保留策略均有受控版本", "完整性和隔离测试范围已确认"], executionTips: ["该汇总节点不累计叶子任务工时"], dueAt: "9 月 22 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-22", labels: ["安全门禁", "契约"], iconName: "file-check", iconTone: "purple" }),
  platformTask({ id: "platform-audit-event-dictionary", name: "冻结高风险操作事件字典", parentTaskId: "platform-audit-evidence-track", ownerId: "宋衡", participantIds: ["程砚", "许悦"], status: "待审核", goal: "统一登录、权限、导出、删除和管理配置变更的事件语义。", completionCriteria: ["每类事件包含主体、对象、结果和来源", "失败与拒绝事件不会被静默丢弃", "客户可见字段完成隐私评审"], executionTips: ["不把内部堆栈和敏感令牌写入客户可见详情"], dueAt: "9 月 11 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-11", labels: ["契约", "安全门禁"], iconName: "list-todo", iconTone: "purple", minutes: 540 }),
  platformTask({ id: "platform-audit-retention", name: "验证分层保留与租户删除策略", parentTaskId: "platform-audit-evidence-track", ownerId: "程砚", participantIds: ["宋衡", "叶宁"], dependsOnTaskIds: ["platform-audit-event-dictionary"], status: "待开始", goal: "确保不同套餐的保留期限、法律保全和租户删除动作互不冲突。", completionCriteria: ["三类保留期限均通过时间边界测试", "法律保全覆盖与解除操作可审计", "删除后索引、对象存储和缓存无残留"], executionTips: ["时间推进测试使用隔离环境，不修改共享时钟"], dueAt: "9 月 17 日", plannedStartOn: "2026-09-10", plannedEndOn: "2026-09-17", labels: ["服务端", "安全门禁", "可回滚"], iconName: "clipboard-check", iconTone: "cyan", minutes: 720 }),
  platformTask({ id: "platform-audit-integrity-proof", name: "实现导出清单与完整性校验", parentTaskId: "platform-audit-evidence-track", ownerId: "程砚", participantIds: ["宋衡", "顾言"], dependsOnTaskIds: ["platform-audit-retention"], status: "待开始", goal: "让客户能够验证导出文件未缺页、未被替换且属于指定查询。", completionCriteria: ["清单记录文件数量、行数和摘要", "篡改、截断和重复分片均被校验器拒绝", "验证说明不要求客户接触平台密钥"], executionTips: ["摘要校验覆盖压缩前的逻辑内容与压缩包本身"], dueAt: "9 月 22 日", plannedStartOn: "2026-09-16", plannedEndOn: "2026-09-22", labels: ["安全门禁", "服务端"], iconName: "file-check", iconTone: "green", minutes: 660 }),
  platformTask({ id: "platform-audit-customer-track", name: "完成大租户导出体验与支持验证", parentTaskId: "platform-audit-export", ownerId: "许悦", participantIds: ["顾言", "叶宁", "周岚"], dependsOnTaskIds: ["platform-audit-evidence-track"], status: "待开始", goal: "验证高数据量下的查询、取消、下载和支持响应。", completionCriteria: ["试点范围与成功标准书面确认", "客户操作与支持升级路径完成演练"], executionTips: ["该汇总节点不累计叶子任务工时"], dueAt: "10 月 7 日", plannedStartOn: "2026-09-21", plannedEndOn: "2026-10-07", labels: ["客户影响", "支持准备", "可观测性"], iconName: "briefcase", iconTone: "blue" }),
  platformTask({ id: "platform-audit-scale-pilot", name: "完成千万级审计记录导出试点", parentTaskId: "platform-audit-customer-track", ownerId: "顾言", participantIds: ["程砚", "叶宁"], dependsOnTaskIds: ["platform-audit-integrity-proof"], status: "待开始", goal: "确认大租户导出不会挤占交互流量且中断后可安全重试。", completionCriteria: ["千万级数据在目标时限内完成", "取消和续传不会生成重复分片", "资源阈值、告警和限流动作通过演练"], executionTips: ["无人值守导出时长不计入 EWD，只记录配置和复核"], dueAt: "9 月 29 日", plannedStartOn: "2026-09-23", plannedEndOn: "2026-09-29", labels: ["可观测性", "SRE", "客户影响"], iconName: "chart", iconTone: "cyan", minutes: 840 }),
  platformTask({ id: "platform-audit-admin-guide", name: "发布审计导出管理员指南", parentTaskId: "platform-audit-customer-track", ownerId: "许悦", participantIds: ["宋衡", "顾言"], dependsOnTaskIds: ["platform-audit-scale-pilot"], status: "待开始", goal: "帮助管理员正确选择范围、保护下载文件并解释校验结果。", completionCriteria: ["指南覆盖查询、取消、下载和验证", "权限与敏感数据警示通过安全复核", "支持宏和升级路径同步更新"], executionTips: ["示例数据使用匿名合成租户，不截取真实客户记录"], dueAt: "10 月 2 日", plannedStartOn: "2026-09-28", plannedEndOn: "2026-10-02", labels: ["支持准备", "客户影响", "安全门禁"], iconName: "clipboard-check", iconTone: "amber", minutes: 360 }),
  platformTask({ id: "platform-audit-release-gate", name: "完成审计导出合规发布评审", parentTaskId: "platform-audit-customer-track", ownerId: "周岚", participantIds: ["宋衡", "程砚", "许悦"], dependsOnTaskIds: ["platform-audit-scale-pilot", "platform-audit-admin-guide"], status: "待开始", goal: "以事件覆盖、完整性、性能和客户操作证据形成发布决定。", completionCriteria: ["安全与质量门禁无未解释缺口", "已知限制和风险接受人明确", "发布、回滚与客户通知窗口已确认"], executionTips: ["只接受可追溯证据，不以口头确认代替"], dueAt: "10 月 7 日", plannedStartOn: "2026-10-02", plannedEndOn: "2026-10-07", labels: ["发布门禁", "安全门禁"], iconName: "file-check", iconTone: "red", minutes: 420 }),

  platformTask({ id: "platform-webhook-reliability", name: "提升开放平台 Webhook 可靠性", ownerId: "程砚", participantIds: ["叶宁", "宋衡", "顾言", "许悦"], status: "进行中", goal: "在突发流量和下游故障下保持租户隔离、可追溯投递与安全签名轮换。", completionCriteria: ["队列隔离、重试与死信恢复通过容量验证", "签名升级保留兼容窗口", "开发者可查询投递状态并自行重放"], executionTips: ["下游持续失败时优先保护其他租户，不无限重试"], dueAt: "10 月 16 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-10-16", labels: ["服务端", "可观测性", "客户影响"], iconName: "target", iconTone: "cyan" }),
  platformTask({ id: "platform-webhook-runtime-track", name: "重构投递队列与失败恢复", parentTaskId: "platform-webhook-reliability", ownerId: "叶宁", participantIds: ["程砚", "顾言"], status: "进行中", goal: "消除热点租户挤占并形成可控的退避、死信和恢复机制。", completionCriteria: ["队列隔离与恢复策略经容量演练", "故障期间的观测和处置责任清晰"], executionTips: ["该汇总节点不累计叶子任务工时"], dueAt: "9 月 30 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-30", labels: ["服务端", "SRE", "可观测性"], iconName: "briefcase", iconTone: "cyan" }),
  platformTask({ id: "platform-webhook-tenant-isolation", name: "实现租户级投递队列隔离", parentTaskId: "platform-webhook-runtime-track", ownerId: "程砚", participantIds: ["叶宁"], status: "进行中", goal: "避免单一租户的高流量或慢端点拖累全局投递。", completionCriteria: ["热点租户达到限额时其他租户延迟仍在 SLO 内", "配额调整和降级动作可审计", "队列迁移不丢失已接收事件"], executionTips: ["先双写观测再切换消费，保留回退开关"], dueAt: "9 月 17 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-17", labels: ["服务端", "可观测性", "可回滚"], iconName: "list-todo", iconTone: "blue", minutes: 960 }),
  platformTask({ id: "platform-webhook-retry-policy", name: "冻结退避、过期与死信策略", parentTaskId: "platform-webhook-runtime-track", ownerId: "程砚", participantIds: ["叶宁", "许悦"], dependsOnTaskIds: ["platform-webhook-tenant-isolation"], status: "待开始", goal: "明确不同错误类型的重试频率、最长保留和客户可见状态。", completionCriteria: ["网络、限流、鉴权和业务拒绝分别定义策略", "过期事件进入可查询死信状态", "手动重放不会绕过权限与配额"], executionTips: ["4xx 不应统一视为可重试错误"], dueAt: "9 月 22 日", plannedStartOn: "2026-09-16", plannedEndOn: "2026-09-22", labels: ["契约", "服务端", "客户影响"], iconName: "file-check", iconTone: "amber", minutes: 480 }),
  platformTask({ id: "platform-webhook-failure-drill", name: "完成突发流量与下游故障演练", parentTaskId: "platform-webhook-runtime-track", ownerId: "叶宁", participantIds: ["程砚", "顾言", "许悦"], dependsOnTaskIds: ["platform-webhook-retry-policy"], status: "待开始", goal: "验证十倍突发、半数慢端点和区域切换下的隔离与恢复。", completionCriteria: ["三类故障注入均达到停止条件", "无跨租户积压扩散", "告警、值班动作和客户状态更新完成演练"], executionTips: ["压测流量使用隔离租户，禁止发送到真实客户端点"], dueAt: "9 月 30 日", plannedStartOn: "2026-09-23", plannedEndOn: "2026-09-30", labels: ["SRE", "可观测性", "事件响应"], iconName: "chart", iconTone: "red", minutes: 720 }),
  platformTask({ id: "platform-webhook-developer-track", name: "升级开发者签名与投递诊断体验", parentTaskId: "platform-webhook-reliability", ownerId: "许悦", participantIds: ["宋衡", "程砚", "顾言"], dependsOnTaskIds: ["platform-webhook-runtime-track"], status: "待开始", goal: "让开发者安全轮换签名并自行定位、验证和重放失败事件。", completionCriteria: ["签名迁移和诊断功能均通过试点", "旧集成有明确兼容期限和升级支持"], executionTips: ["该汇总节点不累计叶子任务工时"], dueAt: "10 月 14 日", plannedStartOn: "2026-09-28", plannedEndOn: "2026-10-14", labels: ["客户影响", "安全门禁", "支持准备"], iconName: "briefcase", iconTone: "purple" }),
  platformTask({ id: "platform-webhook-signature-v2", name: "推出双密钥 Webhook 签名轮换", parentTaskId: "platform-webhook-developer-track", ownerId: "宋衡", participantIds: ["程砚", "许悦"], status: "待开始", goal: "让客户在不中断投递的情况下从旧密钥迁移到新密钥。", completionCriteria: ["新旧密钥重叠期和撤销语义明确", "重放攻击和时钟偏差测试通过", "密钥材料不会出现在日志和支持截图"], executionTips: ["撤销旧密钥前验证最近二十四小时无旧签名调用"], dueAt: "10 月 5 日", plannedStartOn: "2026-09-28", plannedEndOn: "2026-10-05", labels: ["安全门禁", "契约", "可回滚"], iconName: "file-check", iconTone: "red", minutes: 660 }),
  platformTask({ id: "platform-webhook-delivery-log", name: "开放单事件投递轨迹与安全重放", parentTaskId: "platform-webhook-developer-track", ownerId: "顾言", participantIds: ["程砚", "宋衡", "许悦"], dependsOnTaskIds: ["platform-webhook-failure-drill", "platform-webhook-signature-v2"], status: "待开始", goal: "向管理员呈现每次尝试的状态、响应摘要和可控重放入口。", completionCriteria: ["投递轨迹与后台状态一致", "敏感响应正文完成脱敏", "重放包含确认、权限和速率限制"], executionTips: ["只保留诊断需要的响应摘要，不展示完整客户响应体"], dueAt: "10 月 10 日", plannedStartOn: "2026-10-02", plannedEndOn: "2026-10-10", labels: ["客户端", "服务端", "安全门禁"], iconName: "chart", iconTone: "green", minutes: 840 }),
  platformTask({ id: "platform-webhook-migration-comms", name: "完成签名升级客户沟通与支持培训", parentTaskId: "platform-webhook-developer-track", ownerId: "许悦", participantIds: ["宋衡", "程砚"], dependsOnTaskIds: ["platform-webhook-signature-v2"], status: "待开始", goal: "让高用量客户理解迁移期限、验证方式和异常升级路径。", completionCriteria: ["受影响客户按用量和旧签名版本分层", "迁移邮件、控制台提示和支持宏口径一致", "一线完成两种失败场景演练"], executionTips: ["不要在客户沟通中包含密钥样例"], dueAt: "10 月 12 日", plannedStartOn: "2026-10-05", plannedEndOn: "2026-10-12", labels: ["客户沟通", "支持准备", "安全门禁"], iconName: "clipboard-check", iconTone: "blue", minutes: 420 }),

  platformTask({ id: "platform-daily-production-triage", name: "每日生产健康信号分诊", ownerId: "叶宁", participantIds: ["程砚", "许悦"], status: "进行中", goal: "在工作日上午核对 SLO、错误预算、积压和高影响工单，明确当天需升级的信号。", completionCriteria: ["四类信号均有核对记录", "异常项有负责人、影响范围和下一次更新时间", "无异常时也留存明确结论"], executionTips: ["这是工作日周期任务，每次记录独立证据，不覆盖历史结论"], dueAt: "每个工作日 10:30", plannedStartOn: "2026-09-01", plannedEndOn: "2026-12-31", labels: ["SRE", "可观测性"], iconName: "chart", iconTone: "cyan", minutes: 45 }),
  platformTask({ id: "platform-weekly-release-risk-review", name: "每周跨端发布风险复核", ownerId: "周岚", participantIds: ["乔安", "唐澈", "顾言", "叶宁"], status: "待开始", goal: "滚动检查未来两周的客户端版本、依赖服务和商店窗口冲突。", completionCriteria: ["每个候选版本的门禁、依赖和回滚责任明确", "新增风险进入对应任务而非只留在会议纪要"], executionTips: ["每周一重新生成实例，已关闭风险保留历史引用"], dueAt: "每周一 15:00", plannedStartOn: "2026-09-07", plannedEndOn: "2026-12-28", labels: ["发布门禁", "客户端"], iconName: "flag", iconTone: "purple", minutes: 90 }),
  platformTask({ id: "platform-biweekly-defect-triage", name: "双周企业客户缺陷分级", ownerId: "顾言", participantIds: ["许悦", "程砚", "乔安", "唐澈"], status: "待开始", goal: "把重复工单、已知缺陷和版本修复计划对齐到统一优先级。", completionCriteria: ["候选缺陷已去重并绑定客户影响", "每个保留缺陷有严重级别、负责人和目标版本", "无法复现项有补充证据请求"], executionTips: ["不因客户数量少而忽略数据丢失或安全类问题"], dueAt: "9 月 11 日", plannedStartOn: "2026-09-08", plannedEndOn: "2026-09-11", labels: ["客户影响"], iconName: "list-todo", iconTone: "amber", minutes: 150 }),
  platformTask({ id: "platform-monthly-privileged-review", name: "月度紧急生产权限复核", ownerId: "宋衡", participantIds: ["叶宁", "周岚"], status: "待审核", goal: "核对本月临时提权、过期授权和紧急访问是否已关闭并留存理由。", completionCriteria: ["全部临时权限有到期或续期结论", "紧急访问与对应事件记录关联", "孤立账号和异常角色差异已处置"], executionTips: ["与季度全量访问复核区分，本任务只检查临时和紧急权限"], dueAt: "9 月 4 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-04", labels: ["安全门禁"], iconName: "file-check", iconTone: "red", minutes: 240 }),
  platformTask({ id: "platform-quarterly-restore-drill", name: "季度配置备份恢复演练", ownerId: "叶宁", participantIds: ["程砚", "顾言"], status: "待开始", goal: "验证租户配置备份在隔离环境可恢复、可核对且不会覆盖现网。", completionCriteria: ["随机抽取三类配置完成恢复", "恢复后数量、版本和权限校验一致", "RTO 偏差与改进行动已记录"], executionTips: ["演练租户使用合成数据，恢复凭证与生产隔离"], dueAt: "9 月 28 日", plannedStartOn: "2026-09-21", plannedEndOn: "2026-09-28", labels: ["SRE", "可回滚", "防复发"], iconName: "clipboard-check", iconTone: "green", minutes: 480 }),
  platformTask({ id: "platform-incident-apns-certificate", name: "处置推送证书临近过期告警", ownerId: "乔安", participantIds: ["叶宁", "宋衡", "许悦"], status: "已阻塞", goal: "在证书过期前完成新证书签发、灰度验证和旧证书撤销计划。", completionCriteria: ["新证书通过测试与小流量生产验证", "密钥保管和轮换记录通过安全复核", "失败回退与客户影响判断明确"], executionTips: ["当前等待组织账户持有人签发，不把等待计入 EWD"], dueAt: "9 月 3 日 12:00", plannedStartOn: "2026-08-31", plannedEndOn: "2026-09-03", labels: ["事件响应", "安全门禁"], iconName: "flag", iconTone: "red", minutes: 300 }),
  platformTask({ id: "platform-risk-legacy-android-tls", name: "评估旧版 Android TLS 根证书风险", ownerId: "唐澈", participantIds: ["宋衡", "许悦", "顾言"], status: "进行中", goal: "确认旧系统设备在证书链切换后的失败比例和受支持边界。", completionCriteria: ["受影响系统与活跃设备规模已量化", "兼容、提示或停止支持方案完成比较", "客户通知和监控指标已草拟"], executionTips: ["不采集设备唯一标识，只使用聚合版本分布"], dueAt: "9 月 9 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-09", labels: ["Android", "安全门禁", "客户影响"], iconName: "file-check", iconTone: "amber", minutes: 420 }),
  platformTask({ id: "platform-incident-billing-webhook-duplicates", name: "修复计费 Webhook 重复投递事故", ownerId: "程砚", participantIds: ["叶宁", "许悦", "宋衡"], status: "进行中", goal: "停止重复投递，圈定受影响租户并防止客户产生重复账务动作。", completionCriteria: ["重复事件源头已遏制", "受影响事件和租户清单可核对", "补发与不补发边界经客户支持确认", "防复发检查已创建"], executionTips: ["先冻结自动重放，避免修复期间扩大重复范围"], dueAt: "9 月 2 日 18:00", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-02", labels: ["重大事件", "客户影响", "防复发"], iconName: "flag", iconTone: "red", minutes: 600 }),
  platformTask({ id: "platform-monthly-sdk-dependency-scan", name: "月度移动 SDK 依赖风险扫描", ownerId: "宋衡", participantIds: ["乔安", "唐澈", "顾言"], status: "待开始", goal: "识别双端第三方 SDK 的高风险漏洞、权限变化和停止维护风险。", completionCriteria: ["生产依赖清单与锁文件一致", "高危项有升级、隔离或例外结论", "权限变化进入下一版本门禁"], executionTips: ["扫描结果需人工排除不可达代码和错误版本匹配"], dueAt: "9 月 16 日", plannedStartOn: "2026-09-14", plannedEndOn: "2026-09-16", labels: ["客户端", "安全门禁", "技术债"], iconName: "file-check", iconTone: "purple", minutes: 300 }),
  platformTask({ id: "platform-enterprise-launch-office-hours", name: "企业功能上线答疑专场", ownerId: "许悦", participantIds: ["周岚", "程砚", "顾言"], status: "待开始", goal: "集中解答管理员对 SCIM、审计导出和 Webhook 变更的配置与迁移问题。", completionCriteria: ["报名问题预先归类并指定答疑人", "会议结论转为公开文档或具体跟进任务", "涉及客户数据的问题转入私密支持渠道"], executionTips: ["不在公开会议共享客户配置截图或密钥"], dueAt: "10 月 15 日", plannedStartOn: "2026-10-08", plannedEndOn: "2026-10-15", labels: ["客户沟通", "支持准备"], iconName: "sparkles", iconTone: "blue", minutes: 240 }),
  platformTask({ id: "platform-status-page-localization-gap", name: "补齐状态页多语言故障模板", ownerId: "许悦", participantIds: ["叶宁", "周岚"], status: "待审核", goal: "让不同语言客户在重大事件中收到一致、及时且不夸大结论的更新。", completionCriteria: ["服务中断、性能下降和恢复观察三类模板齐备", "时间、范围和下一次更新时间字段可复用", "中文与英文口径完成事件桌面演练"], executionTips: ["模板只提供结构，每次事件仍需人工核对事实"], dueAt: "9 月 14 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-14", labels: ["客户沟通", "事件响应", "支持准备"], iconName: "clipboard-check", iconTone: "blue", minutes: 300 }),
];

/**
 * 制造与供应链团队扩展任务池：第二来源、产线转移、旺季备货与持续现场运营。
 */
export const supplyOperationsAdditionNodes: TaskNode[] = [
  supplyTask({ id: "supply-battery-second-source", name: "完成智能门锁电芯第二来源认证", ownerId: "周岚", participantIds: ["沈工", "赵妍", "贺青", "陈琛", "冯维"], status: "进行中", goal: "在不降低安全、续航和追溯能力的前提下认证第二电芯来源，降低单一供应商断供风险。", completionCriteria: ["供应商过程、材料、可靠性和整机适配均形成结论", "BOM、来料与追溯规则完成受控变更", "首批切换比例、停止条件和回退库存已确认"], executionTips: ["样品物流与设备老化等待不计入 EWD", "任何偏差许可均绑定物料批次和有效期"], dueAt: "10 月 20 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-10-20", labels: ["供应商质量", "PPAP", "物料齐套"], iconName: "target", iconTone: "blue" }),
  supplyTask({ id: "supply-battery-qualification-track", name: "完成电芯供应商过程与材料认证", parentTaskId: "supply-battery-second-source", ownerId: "沈工", participantIds: ["贺青", "陈琛"], status: "进行中", goal: "确认新供应商过程能力、关键材料与批次证据满足受控要求。", completionCriteria: ["过程审核、材料证书和关键特性结果相互一致", "所有偏差均有处置边界"], executionTips: ["该汇总节点不累计叶子任务工时"], dueAt: "9 月 25 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-25", labels: ["供应商质量", "PPAP"], iconName: "briefcase", iconTone: "blue" }),
  supplyTask({ id: "supply-battery-process-audit", name: "完成电芯供应商现场过程审核", parentTaskId: "supply-battery-qualification-track", ownerId: "沈工", participantIds: ["贺青", "陈琛"], status: "进行中", goal: "核对混料防错、涂布参数、老化筛选和批次追溯是否按文件执行。", completionCriteria: ["关键工序逐项留存客观证据", "重大不符合已遏制并明确责任期限", "审核样本可追溯到候选批次"], executionTips: ["不以供应商自评替代现场抽样"], dueAt: "9 月 8 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-08", labels: ["供应商质量", "PPAP"], iconName: "clipboard-check", iconTone: "blue", minutes: 960 }),
  supplyTask({ id: "supply-battery-material-verification", name: "核验电芯材料证书与禁限用物质", parentTaskId: "supply-battery-qualification-track", ownerId: "贺青", participantIds: ["沈工", "陈琛"], dependsOnTaskIds: ["supply-battery-process-audit"], status: "待开始", goal: "确认正负极、电解液和包装材料与申报配方及法规证据一致。", completionCriteria: ["候选批次材料证书与来料标签一致", "禁限用物质报告在有效期内", "配方差异有书面风险评估"], executionTips: ["实验室检测等待不计入 EWD，只计算送样与结果复核"], dueAt: "9 月 15 日", plannedStartOn: "2026-09-08", plannedEndOn: "2026-09-15", labels: ["供应商质量", "质量门禁", "追溯"], iconName: "file-check", iconTone: "green", minutes: 600 }),
  supplyTask({ id: "supply-battery-ppap-signoff", name: "签发第二来源电芯 PPAP 结论", parentTaskId: "supply-battery-qualification-track", ownerId: "沈工", participantIds: ["贺青", "赵妍", "陈琛"], dependsOnTaskIds: ["supply-battery-material-verification"], status: "待开始", goal: "把尺寸、性能、过程能力和变更证据收敛为批次受控的认证结论。", completionCriteria: ["PPAP 要素齐套且版本一致", "关键特性能力满足控制计划", "偏差许可含数量、批次和到期日"], executionTips: ["不因交期压力跳过未完成的关键特性结论"], dueAt: "9 月 25 日", plannedStartOn: "2026-09-16", plannedEndOn: "2026-09-25", labels: ["PPAP", "质量门禁"], iconName: "file-check", iconTone: "red", minutes: 480 }),
  supplyTask({ id: "supply-battery-product-track", name: "验证第二来源整机适配与切换", parentTaskId: "supply-battery-second-source", ownerId: "赵妍", participantIds: ["贺青", "罗骁", "陈琛"], dependsOnTaskIds: ["supply-battery-qualification-track"], status: "待开始", goal: "验证新电芯在装配、功耗、可靠性和批次切换中的真实表现。", completionCriteria: ["整机验证与切换试跑均达到门禁", "异常可追溯到电芯和整机序列号"], executionTips: ["该汇总节点不累计叶子任务工时"], dueAt: "10 月 16 日", plannedStartOn: "2026-09-23", plannedEndOn: "2026-10-16", labels: ["产线验证", "质量门禁", "追溯"], iconName: "briefcase", iconTone: "cyan" }),
  supplyTask({ id: "supply-battery-device-validation", name: "完成第二来源电芯整机可靠性验证", parentTaskId: "supply-battery-product-track", ownerId: "贺青", participantIds: ["赵妍", "沈工"], dependsOnTaskIds: ["supply-battery-ppap-signoff"], status: "待开始", goal: "验证续航、低温放电、过流保护和仓储老化不劣于当前来源。", completionCriteria: ["四类可靠性项目均有受控报告", "关键指标与当前来源完成同条件比较", "失效样品已完成拆解和归因"], executionTips: ["老化与温箱运行不计入 EWD，只计算设置、巡检和判读"], dueAt: "10 月 8 日", plannedStartOn: "2026-09-25", plannedEndOn: "2026-10-08", labels: ["质量门禁", "产线验证", "追溯"], iconName: "chart", iconTone: "cyan", minutes: 1080 }),
  supplyTask({ id: "supply-battery-switch-trial", name: "执行第二来源百台切换试跑", parentTaskId: "supply-battery-product-track", ownerId: "罗骁", participantIds: ["赵妍", "贺青", "陈琛"], dependsOnTaskIds: ["supply-battery-device-validation"], status: "待开始", goal: "用受控批次验证上料、防错、装配节拍和序列号绑定。", completionCriteria: ["一百台试跑数量与序列号核对一致", "错料防呆和首件检查有效", "良率、节拍和异常分类达到切换门槛"], executionTips: ["现用和新来源物料分区、分色并由双人核对"], dueAt: "10 月 13 日", plannedStartOn: "2026-10-09", plannedEndOn: "2026-10-13", labels: ["产线验证", "物料齐套", "追溯"], iconName: "list-todo", iconTone: "amber", minutes: 840 }),
  supplyTask({ id: "supply-battery-release-gate", name: "签发电芯第二来源切换门禁", parentTaskId: "supply-battery-product-track", ownerId: "周岚", participantIds: ["沈工", "赵妍", "贺青", "陈琛"], dependsOnTaskIds: ["supply-battery-switch-trial"], status: "待开始", goal: "基于供应商、可靠性和试跑证据决定切换比例与回退库存。", completionCriteria: ["所有关键证据绑定同一物料版本", "首批比例、停止条件和回退批次明确", "未关闭偏差有接受人和有效期"], executionTips: ["不以试跑无停线替代可靠性结果"], dueAt: "10 月 16 日", plannedStartOn: "2026-10-13", plannedEndOn: "2026-10-16", labels: ["质量门禁", "试产放行"], iconName: "flag", iconTone: "red", minutes: 420 }),

  supplyTask({ id: "supply-chengdu-line-transfer", name: "完成成都装配线转产验证", ownerId: "周岚", participantIds: ["赵妍", "罗骁", "唐静", "贺青", "陈琛", "冯维"], status: "进行中", goal: "把智能门锁标准机型从苏州平稳转移到成都，在人员、工装和供应链均受控后释放量产。", completionCriteria: ["工装、工艺、人员、质量和物流均达到转产门禁", "转产批次与原产线对比无不可解释差异", "爬坡节奏和回退方案已批准"], executionTips: ["保留原产线最小保障能力直至成都连续三批稳定"], dueAt: "11 月 6 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-11-06", labels: ["产线验证", "人员培训", "质量门禁"], iconName: "target", iconTone: "purple" }),
  supplyTask({ id: "supply-chengdu-engineering-track", name: "复制受控工艺与工装能力", parentTaskId: "supply-chengdu-line-transfer", ownerId: "赵妍", participantIds: ["罗骁", "贺青"], status: "进行中", goal: "确保成都线使用的工艺文件、工装和测量系统与批准基线一致。", completionCriteria: ["文件、工装和测量能力均可追溯", "差异项有验证或回退结论"], executionTips: ["该汇总节点不累计叶子任务工时"], dueAt: "10 月 12 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-10-12", labels: ["产线验证", "工艺参数", "SOP"], iconName: "briefcase", iconTone: "cyan" }),
  supplyTask({ id: "supply-chengdu-tooling-acceptance", name: "完成成都线关键工装复制验收", parentTaskId: "supply-chengdu-engineering-track", ownerId: "赵妍", participantIds: ["罗骁", "贺青"], status: "进行中", goal: "确认扭矩、密封和功能测试工装满足尺寸、能力和安全要求。", completionCriteria: ["工装清单、编号和校准状态一致", "关键工装完成 GRR 或等效能力确认", "安全互锁和异常停机经过验证"], executionTips: ["设备自动循环不计入 EWD，异常复测须单独记录原因"], dueAt: "9 月 26 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-26", labels: ["产线验证", "工艺参数", "质量门禁"], iconName: "clipboard-check", iconTone: "cyan", minutes: 960 }),
  supplyTask({ id: "supply-chengdu-document-release", name: "受控发布成都线工艺文件包", parentTaskId: "supply-chengdu-engineering-track", ownerId: "唐静", participantIds: ["赵妍", "贺青"], dependsOnTaskIds: ["supply-chengdu-tooling-acceptance"], status: "待开始", goal: "确保 SOP、检验卡、参数表和异常响应均基于同一批准版本。", completionCriteria: ["四类文件版本与工位一一对应", "旧版纸质文件全部回收", "文件变更点已进入培训材料"], executionTips: ["打印件受控编号，现场禁止保留个人修改副本"], dueAt: "10 月 3 日", plannedStartOn: "2026-09-25", plannedEndOn: "2026-10-03", labels: ["SOP", "工艺参数", "追溯"], iconName: "file-check", iconTone: "purple", minutes: 600 }),
  supplyTask({ id: "supply-chengdu-measurement-correlation", name: "完成两地产线测量相关性验证", parentTaskId: "supply-chengdu-engineering-track", ownerId: "贺青", participantIds: ["赵妍", "罗骁"], dependsOnTaskIds: ["supply-chengdu-tooling-acceptance"], status: "待开始", goal: "确认成都与苏州对关键尺寸和功能结果的判定一致。", completionCriteria: ["同批样件完成盲测与交叉测量", "偏差在预设接受范围内", "超差量具完成校准或替换"], executionTips: ["样件顺序随机化，避免操作员预判结果"], dueAt: "10 月 8 日", plannedStartOn: "2026-09-28", plannedEndOn: "2026-10-08", labels: ["质量门禁", "产线验证"], iconName: "chart", iconTone: "green", minutes: 720 }),
  supplyTask({ id: "supply-chengdu-people-track", name: "建立成都班组能力与爬坡节奏", parentTaskId: "supply-chengdu-line-transfer", ownerId: "罗骁", participantIds: ["唐静", "赵妍", "贺青"], dependsOnTaskIds: ["supply-chengdu-engineering-track"], status: "待开始", goal: "让两班人员能按受控文件稳定生产并正确响应异常。", completionCriteria: ["人员技能和连续试跑均达到爬坡门槛", "缺口有补训与替岗计划"], executionTips: ["该汇总节点不累计叶子任务工时"], dueAt: "11 月 3 日", plannedStartOn: "2026-10-01", plannedEndOn: "2026-11-03", labels: ["人员培训", "产能", "SOP"], iconName: "briefcase", iconTone: "amber" }),
  supplyTask({ id: "supply-chengdu-skill-certification", name: "完成成都两班关键岗位技能认证", parentTaskId: "supply-chengdu-people-track", ownerId: "唐静", participantIds: ["赵妍", "罗骁"], dependsOnTaskIds: ["supply-chengdu-document-release"], status: "待开始", goal: "确保操作员、检验员和线长能够独立执行标准作业和停线判断。", completionCriteria: ["两班关键岗位覆盖率达到百分之百", "实操考核包含正常与异常场景", "未通过人员不得独立上岗且有补训计划"], executionTips: ["培训签到不等于技能认证，必须保留实操结果"], dueAt: "10 月 16 日", plannedStartOn: "2026-10-04", plannedEndOn: "2026-10-16", labels: ["人员培训", "SOP", "质量门禁"], iconName: "clipboard-check", iconTone: "purple", minutes: 1080 }),
  supplyTask({ id: "supply-chengdu-three-shift-trial", name: "执行成都线三班连续试跑", parentTaskId: "supply-chengdu-people-track", ownerId: "罗骁", participantIds: ["赵妍", "贺青", "唐静"], dependsOnTaskIds: ["supply-chengdu-measurement-correlation", "supply-chengdu-skill-certification"], status: "待开始", goal: "验证换班、物料补给、节拍、良率和异常响应在连续运行下稳定。", completionCriteria: ["三班连续生产达到计划数量", "FPY、节拍和停线时间达到门禁", "换班交接和异常处置记录完整"], executionTips: ["设备运行时间不计入 EWD，按班记录巡检和复核投入"], dueAt: "10 月 25 日", plannedStartOn: "2026-10-20", plannedEndOn: "2026-10-25", labels: ["产能", "产线验证", "质量门禁"], iconName: "chart", iconTone: "amber", minutes: 1260 }),
  supplyTask({ id: "supply-chengdu-ramp-gate", name: "签发成都线量产爬坡结论", parentTaskId: "supply-chengdu-people-track", ownerId: "周岚", participantIds: ["赵妍", "罗骁", "贺青", "陈琛"], dependsOnTaskIds: ["supply-chengdu-three-shift-trial"], status: "待开始", goal: "决定成都线首周产量、苏州保障量和逐步切换条件。", completionCriteria: ["试跑证据与放行批次一致", "爬坡比例、停止条件和回退产能明确", "未关闭问题有遏制措施和责任期限"], executionTips: ["不因订单压力跳过连续运行稳定性结论"], dueAt: "11 月 3 日", plannedStartOn: "2026-10-26", plannedEndOn: "2026-11-03", labels: ["试产放行", "产能"], iconName: "flag", iconTone: "red", minutes: 480 }),

  supplyTask({ id: "supply-winter-peak-readiness", name: "完成冬季促销备货与履约准备", ownerId: "陈琛", participantIds: ["周岚", "沈工", "罗骁", "冯维", "贺青"], status: "进行中", goal: "在需求波动和长交期物料约束下形成可执行的备货、产能与发运方案。", completionCriteria: ["需求情景、物料约束和产能方案使用同一版本", "高风险物料有替代、缓冲或缺货处置", "发运峰值和异常升级完成演练"], executionTips: ["区分预测、客户承诺和已下单需求，禁止混为一个数字"], dueAt: "10 月 30 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-10-30", labels: ["物料齐套", "产能", "运输测试"], iconName: "target", iconTone: "amber" }),
  supplyTask({ id: "supply-winter-plan-track", name: "冻结需求情景与关键物料策略", parentTaskId: "supply-winter-peak-readiness", ownerId: "陈琛", participantIds: ["周岚", "沈工"], status: "进行中", goal: "把基准、上行情景和缺料风险转化为采购与库存边界。", completionCriteria: ["三种情景和长料策略经责任人确认", "缺口不会被平均库存掩盖"], executionTips: ["该汇总节点不累计叶子任务工时"], dueAt: "9 月 29 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-29", labels: ["物料齐套", "供应商质量"], iconName: "briefcase", iconTone: "amber" }),
  supplyTask({ id: "supply-winter-demand-scenarios", name: "形成冬季促销三档需求情景", parentTaskId: "supply-winter-plan-track", ownerId: "陈琛", participantIds: ["周岚", "罗骁"], status: "待审核", goal: "以基准、上行和延迟促销三种情景表达周度需求与承诺差异。", completionCriteria: ["销售输入、历史偏差和渠道拆分可追溯", "每档情景包含触发条件与更新时间", "异常大单不被均摊到普通需求"], executionTips: ["历史销量只作为参考，不自动视为本季承诺"], dueAt: "9 月 12 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-12", labels: ["物料齐套"], iconName: "chart", iconTone: "blue", minutes: 480 }),
  supplyTask({ id: "supply-winter-long-lead-gap", name: "核对长交期物料缺口与替代边界", parentTaskId: "supply-winter-plan-track", ownerId: "陈琛", participantIds: ["沈工", "赵妍"], dependsOnTaskIds: ["supply-winter-demand-scenarios"], status: "进行中", goal: "按周识别主控 IC、电芯和锁体的数量缺口、最晚下单日与替代风险。", completionCriteria: ["三档情景下的缺口分别计算", "供应商承诺与内部安全库存分开呈现", "替代料未认证时不得计入可用量"], executionTips: ["避免用总库存掩盖错误地区、版本或批次"], dueAt: "9 月 18 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-18", labels: ["物料齐套", "供应商质量", "追溯"], iconName: "list-todo", iconTone: "red", minutes: 600 }),
  supplyTask({ id: "supply-winter-buffer-policy", name: "确认关键物料缓冲与采购释放策略", parentTaskId: "supply-winter-plan-track", ownerId: "周岚", participantIds: ["陈琛", "沈工"], dependsOnTaskIds: ["supply-winter-long-lead-gap"], status: "待开始", goal: "平衡缺货风险、现金占用和过期报废，形成分阶段采购边界。", completionCriteria: ["每类关键料有缓冲天数和上限", "释放条件与需求情景联动", "超额采购需要的审批与退出路径明确"], executionTips: ["采购承诺形成后记录不可取消数量，不把它当作可自由调整库存"], dueAt: "9 月 29 日", plannedStartOn: "2026-09-19", plannedEndOn: "2026-09-29", labels: ["物料齐套"], iconName: "file-check", iconTone: "amber", minutes: 420 }),
  supplyTask({ id: "supply-winter-execution-track", name: "验证峰值产能、包装与发运协同", parentTaskId: "supply-winter-peak-readiness", ownerId: "罗骁", participantIds: ["冯维", "赵妍", "贺青", "陈琛"], dependsOnTaskIds: ["supply-winter-plan-track"], status: "待开始", goal: "验证高峰计划能被线体、包装和承运能力共同执行。", completionCriteria: ["峰值试跑和发运演练达到目标", "瓶颈与降级方案完成确认"], executionTips: ["该汇总节点不累计叶子任务工时"], dueAt: "10 月 27 日", plannedStartOn: "2026-09-28", plannedEndOn: "2026-10-27", labels: ["产能", "包装", "运输测试"], iconName: "briefcase", iconTone: "green" }),
  supplyTask({ id: "supply-winter-capacity-simulation", name: "执行峰值周产能与换型模拟", parentTaskId: "supply-winter-execution-track", ownerId: "罗骁", participantIds: ["赵妍", "唐静", "贺青"], dependsOnTaskIds: ["supply-winter-buffer-policy"], status: "待开始", goal: "验证标准款与礼盒款交替生产时的节拍、换型损失和人员覆盖。", completionCriteria: ["两种产品组合均完成整班模拟", "换型、缺员和停线损失有分类", "峰值产出与质量门禁同时满足"], executionTips: ["模拟使用确认的人员技能矩阵，不假设所有人可替岗"], dueAt: "10 月 12 日", plannedStartOn: "2026-10-05", plannedEndOn: "2026-10-12", labels: ["产能", "产线验证", "人员培训"], iconName: "chart", iconTone: "amber", minutes: 900 }),
  supplyTask({ id: "supply-winter-packout-trial", name: "完成促销礼盒包装线试装", parentTaskId: "supply-winter-execution-track", ownerId: "冯维", participantIds: ["罗骁", "贺青", "陈琛"], dependsOnTaskIds: ["supply-winter-capacity-simulation"], status: "待开始", goal: "验证礼盒物料齐套、装箱防错、条码和外箱强度支持峰值发运。", completionCriteria: ["两百套试装数量与物料消耗一致", "条码、称重和装箱防错有效", "外箱堆码与跌落结果达到标准"], executionTips: ["实验室跌落等待不计入 EWD，试装异常按批次保留样品"], dueAt: "10 月 20 日", plannedStartOn: "2026-10-12", plannedEndOn: "2026-10-20", labels: ["包装", "运输测试", "物料齐套"], iconName: "clipboard-check", iconTone: "green", minutes: 720 }),
  supplyTask({ id: "supply-winter-logistics-drill", name: "演练峰值发运分仓与异常改派", parentTaskId: "supply-winter-execution-track", ownerId: "陈琛", participantIds: ["冯维", "罗骁", "周岚"], dependsOnTaskIds: ["supply-winter-packout-trial"], status: "待开始", goal: "验证华东、华南分仓和主承运商中断时的订单改派路径。", completionCriteria: ["正常、爆仓和承运中断三种场景完成桌面演练", "库存扣减与在途状态无重复", "客户承诺变化有升级和通知边界"], executionTips: ["演练订单使用合成单号，不写入真实承运接口"], dueAt: "10 月 27 日", plannedStartOn: "2026-10-21", plannedEndOn: "2026-10-27", labels: ["运输测试", "可回滚", "客户影响"], iconName: "flag", iconTone: "amber", minutes: 480 }),

  supplyTask({ id: "supply-daily-shortage-standup", name: "每日关键缺料与停线风险核对", ownerId: "陈琛", participantIds: ["罗骁", "沈工", "赵妍"], status: "进行中", goal: "在每日排产前确认未来七天关键料、到料质量和停线风险。", completionCriteria: ["关键料按到料、检验和可上线数量分开记录", "红色缺口有责任人、最晚决策点和替代方案", "已解除风险保留关闭依据"], executionTips: ["这是工作日周期任务，每次实例保留独立快照"], dueAt: "每个工作日 10:00", plannedStartOn: "2026-09-01", plannedEndOn: "2026-12-31", labels: ["物料齐套", "产能"], iconName: "list-todo", iconTone: "amber", minutes: 60 }),
  supplyTask({ id: "supply-weekly-supplier-capa-review", name: "每周供应商纠正措施评审", ownerId: "沈工", participantIds: ["贺青", "陈琛", "周岚"], status: "待开始", goal: "核对重大来料问题的遏制、根因、纠正和效果验证进展。", completionCriteria: ["每项措施有客观证据和负责人", "逾期项明确升级或停收边界", "效果验证不以供应商声明替代"], executionTips: ["每周生成独立实例，已关闭项仍可追溯历史证据"], dueAt: "每周三 16:00", plannedStartOn: "2026-09-02", plannedEndOn: "2026-12-30", labels: ["供应商质量", "根因分析", "防复发"], iconName: "clipboard-check", iconTone: "blue", minutes: 120 }),
  supplyTask({ id: "supply-monthly-cycle-count", name: "月度高价值物料循环盘点", ownerId: "陈琛", participantIds: ["贺青", "罗骁"], status: "待开始", goal: "核对主控 IC、电芯和成品锁体的账实、冻结和批次状态。", completionCriteria: ["抽盘数量和系统记录逐批核对", "差异完成重盘、原因分类与审批", "冻结和待检物料不计入可用库存"], executionTips: ["盘点期间锁定涉及库位的移动交易"], dueAt: "9 月 30 日", plannedStartOn: "2026-09-28", plannedEndOn: "2026-09-30", labels: ["物料齐套", "追溯"], iconName: "chart", iconTone: "blue", minutes: 360 }),
  supplyTask({ id: "supply-quarterly-torque-audit", name: "季度扭矩工具与参数审计", ownerId: "赵妍", participantIds: ["贺青", "罗骁"], status: "待开始", goal: "确认关键锁附工具校准、程序版本和现场参数与控制计划一致。", completionCriteria: ["全部关键工具状态与工位映射一致", "随机抽样参数无法被未授权修改", "超期或漂移工具已隔离并追溯产品范围"], executionTips: ["先隔离异常工具，再评估受影响序列号范围"], dueAt: "9 月 21 日", plannedStartOn: "2026-09-14", plannedEndOn: "2026-09-21", labels: ["工艺参数", "质量门禁", "追溯"], iconName: "file-check", iconTone: "cyan", minutes: 480 }),
  supplyTask({ id: "supply-incident-lockbody-rust", name: "遏制锁体盐雾后锈蚀异常", ownerId: "贺青", participantIds: ["沈工", "赵妍", "陈琛", "周岚"], status: "已阻塞", goal: "隔离可疑批次、保护在制品并确定镀层异常的真实范围。", completionCriteria: ["可疑来料、在制和成品均完成隔离", "复验样品与供应商批次对应", "临时放行或停线边界经质量批准", "根因和永久措施任务已创建"], executionTips: ["当前等待第三方镀层截面结果，不把实验室等待计入 EWD"], dueAt: "9 月 4 日 17:00", plannedStartOn: "2026-08-31", plannedEndOn: "2026-09-04", labels: ["重大事件", "供应商质量"], iconName: "flag", iconTone: "red", minutes: 780 }),
  supplyTask({ id: "supply-risk-sole-source-mcu", name: "评估主控 MCU 单一来源断供应急方案", ownerId: "陈琛", participantIds: ["沈工", "赵妍", "周岚"], status: "进行中", goal: "量化现有库存覆盖、供应中断窗口和替代芯片重新认证代价。", completionCriteria: ["库存、在途和供应承诺按版本分开", "三种中断时长的缺口和客户影响已估算", "替代、预购和产品降配方案形成比较"], executionTips: ["未经工程认证的替代芯片不得计入可供数量"], dueAt: "9 月 18 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-18", labels: ["物料齐套", "供应商质量", "客户影响"], iconName: "chart", iconTone: "red", minutes: 600 }),
  supplyTask({ id: "supply-incident-label-serial-gap", name: "修复标签序列号断号与重复打印", ownerId: "冯维", participantIds: ["罗骁", "贺青", "陈琛"], status: "进行中", goal: "停止重复标签流出，核对断号是否对应报废、重打或遗漏成品。", completionCriteria: ["受影响序列号范围完整锁定", "重复标签全部隔离销毁", "成品、包装记录和系统状态一致", "重打权限和审计规则完成修复"], executionTips: ["先停止自动补号，避免覆盖原始断号证据"], dueAt: "9 月 2 日 20:00", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-02", labels: ["事件响应", "包装", "追溯"], iconName: "flag", iconTone: "red", minutes: 540 }),
  supplyTask({ id: "supply-monthly-sop-floor-audit", name: "月度现场 SOP 版本抽查", ownerId: "唐静", participantIds: ["赵妍", "罗骁", "贺青"], status: "待审核", goal: "确认关键工位实际使用的电子和纸质 SOP 与受控版本一致。", completionCriteria: ["关键工位全部完成版本核对", "私印、手写修改和过期副本已回收", "版本差异对应人员完成补训"], executionTips: ["抽查覆盖白班与夜班，不只检查示范工位"], dueAt: "9 月 7 日", plannedStartOn: "2026-09-01", plannedEndOn: "2026-09-07", labels: ["SOP", "人员培训"], iconName: "clipboard-check", iconTone: "purple", minutes: 300 }),
  supplyTask({ id: "supply-packaging-humidity-risk", name: "验证海运高湿环境包装防护", ownerId: "冯维", participantIds: ["贺青", "沈工"], status: "待开始", goal: "确认长航程高湿环境下锁体、说明书和外箱不会出现锈蚀、霉变或强度失效。", completionCriteria: ["高湿预处理后的外观和功能符合标准", "干燥剂和防潮袋用量有验证依据", "包装变更成本与装配影响完成评估"], executionTips: ["环境箱运行不计入 EWD，开箱判读使用盲样编号"], dueAt: "9 月 24 日", plannedStartOn: "2026-09-10", plannedEndOn: "2026-09-24", labels: ["包装", "运输测试", "质量门禁"], iconName: "briefcase", iconTone: "green", minutes: 660 }),
  supplyTask({ id: "supply-operator-absence-contingency", name: "更新关键岗位缺员应急替岗表", ownerId: "唐静", participantIds: ["罗骁", "赵妍"], status: "待开始", goal: "确保夜班关键岗位突发缺员时只由通过认证的人员替岗。", completionCriteria: ["每个关键岗位至少有两名有效替岗人", "技能到期和班次冲突已排除", "线长完成一次临时缺员桌面演练"], executionTips: ["名单基于当前技能认证，不能沿用过期培训记录"], dueAt: "9 月 11 日", plannedStartOn: "2026-09-07", plannedEndOn: "2026-09-11", labels: ["人员培训", "SOP", "产能"], iconName: "list-todo", iconTone: "purple", minutes: 300 }),
  supplyTask({ id: "supply-customer-return-teardown", name: "双周客退锁体联合拆解评审", ownerId: "贺青", participantIds: ["沈工", "赵妍", "冯维"], status: "待开始", goal: "把客退症状与物料、工艺、包装和使用环境证据对齐，识别重复失效。", completionCriteria: ["样品身份和退回链路可追溯", "拆解现象、初判和待验证假设分开记录", "重复失效已创建纠正或风险任务"], executionTips: ["未知原因不得直接归为客户误用"], dueAt: "9 月 17 日", plannedStartOn: "2026-09-14", plannedEndOn: "2026-09-17", labels: ["根因分析", "防复发", "追溯"], iconName: "list-todo", iconTone: "purple", minutes: 420 }),
];

/** 新增任务只使用现有标签，因此无需同步创建额外标签。 */
export const expandedTeamTaskRequiredTags = [] as const;

export type ExpandedTaskValidationResult = {
  issues: string[];
  stats: Array<{ estimatedLeaves: number; maxDepth: number; tasks: number; teamId: ExpandedTeamId; projectRoots: number; standalone: number }>;
  valid: boolean;
};

export function validateExpandedTeamTaskBacklog(): ExpandedTaskValidationResult {
  const groups: Array<{ members: Set<string>; nodes: TaskNode[]; teamId: ExpandedTeamId }> = [
    { members: new Set(expandedTeamMemberIds.platform), nodes: platformAdditionNodes, teamId: "platform" },
    { members: new Set(expandedTeamMemberIds["supply-operations"]), nodes: supplyOperationsAdditionNodes, teamId: "supply-operations" },
  ];
  const globalIds = new Set<string>();
  const issues: string[] = [];
  const stats: ExpandedTaskValidationResult["stats"] = [];

  for (const { members, nodes, teamId } of groups) {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const titleSet = new Set<string>();
    let maxDepth = 0;
    let estimatedLeaves = 0;
    const depthOf = (node: TaskNode, path = new Set<string>()): number => {
      if (!node.parentTaskId) return 1;
      if (path.has(node.id)) return Number.POSITIVE_INFINITY;
      const parent = byId.get(node.parentTaskId);
      if (!parent) return Number.POSITIVE_INFINITY;
      return 1 + depthOf(parent, new Set([...path, node.id]));
    };

    if (nodes.length < 30) issues.push(`${teamId}: addition nodes must contain at least 30 tasks`);
    for (const node of nodes) {
      if (globalIds.has(node.id)) issues.push(`${teamId}/${node.id}: duplicate global id`);
      globalIds.add(node.id);
      if (node.teamId !== teamId) issues.push(`${teamId}/${node.id}: incorrect team id`);
      if (node.parentId !== `${teamId}-workspace`) issues.push(`${teamId}/${node.id}: incorrect workspace parent`);
      if (titleSet.has(node.name)) issues.push(`${teamId}/${node.id}: duplicate title`);
      titleSet.add(node.name);
      if (!members.has(node.ownerId)) issues.push(`${teamId}/${node.id}: unknown owner ${node.ownerId}`);
      for (const personId of node.participantIds ?? []) if (!members.has(personId)) issues.push(`${teamId}/${node.id}: unknown participant ${personId}`);
      if (new Set(node.participantIds ?? []).size !== (node.participantIds ?? []).length) issues.push(`${teamId}/${node.id}: duplicate participants`);
      if (node.parentTaskId && !byId.has(node.parentTaskId)) issues.push(`${teamId}/${node.id}: missing parent ${node.parentTaskId}`);
      for (const dependencyId of node.dependsOnTaskIds ?? []) {
        if (dependencyId === node.id) issues.push(`${teamId}/${node.id}: self dependency`);
        if (!byId.has(dependencyId)) issues.push(`${teamId}/${node.id}: missing dependency ${dependencyId}`);
      }
      if (new Set(node.dependsOnTaskIds ?? []).size !== (node.dependsOnTaskIds ?? []).length) issues.push(`${teamId}/${node.id}: duplicate dependencies`);
      if (!node.goal?.trim()) issues.push(`${teamId}/${node.id}: missing goal`);
      if (!node.completionCriteria?.length) issues.push(`${teamId}/${node.id}: missing completion criteria`);
      if (!node.executionTips?.length) issues.push(`${teamId}/${node.id}: missing execution tips`);
      for (const label of node.labels ?? []) if (!existingExpandedTaskLabels.has(label)) issues.push(`${teamId}/${node.id}: unknown label ${label}`);
      if (node.plannedStartOn && node.plannedEndOn && node.plannedStartOn > node.plannedEndOn) issues.push(`${teamId}/${node.id}: invalid date range`);
      const depth = depthOf(node);
      if (!Number.isFinite(depth)) issues.push(`${teamId}/${node.id}: missing or cyclic parent chain`);
      else maxDepth = Math.max(maxDepth, depth);
      if (depth > 3) issues.push(`${teamId}/${node.id}: task depth exceeds three levels`);
      const isLeaf = !nodes.some((candidate) => candidate.parentTaskId === node.id);
      if (isLeaf) {
        if (getTaskEffortState(node) !== "proposed") issues.push(`${teamId}/${node.id}: leaf must have a current proposed EWD`);
        else estimatedLeaves += 1;
      } else if (node.effortEstimate) {
        issues.push(`${teamId}/${node.id}: parent must not duplicate leaf EWD`);
      }
    }

    // Dependencies are directed prerequisites; DFS rejects cycles rather than silently normalizing them.
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (id: string): boolean => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      const cyclic = (byId.get(id)?.dependsOnTaskIds ?? []).some((dependencyId) => byId.has(dependencyId) && visit(dependencyId));
      visiting.delete(id);
      visited.add(id);
      return cyclic;
    };
    if (nodes.some((node) => visit(node.id))) issues.push(`${teamId}: cyclic dependency graph`);

    stats.push({
      estimatedLeaves,
      maxDepth,
      projectRoots: nodes.filter((node) => !node.parentTaskId && nodes.some((candidate) => candidate.parentTaskId === node.id)).length,
      standalone: nodes.filter((node) => !node.parentTaskId && !nodes.some((candidate) => candidate.parentTaskId === node.id)).length,
      tasks: nodes.length,
      teamId,
    });
  }
  return { issues, stats, valid: issues.length === 0 };
}

export const expandedTeamTaskBacklogValidation = validateExpandedTeamTaskBacklog();
