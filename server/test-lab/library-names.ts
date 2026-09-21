import type { LabCase, LabTeam } from '../../src/test-lab/types.ts';

// Keep fixture identifiers stable for assertions and reports; names describe the work.
const scenarioNames: Record<string, [category: string, title: string]> = {
  'SAAS-01': ['cold_start', 'SaaS 试点：规划审批交付与培训'],
  'SAAS-02': ['duplicate_boundary', 'CRM 上线验收：区分不同客户的同名任务'],
  'SAAS-03': ['replan_or_next_batch', '试点交付：重排剩余工作并保留已确认结果'],
  'SAAS-04': ['collaboration_risk', '单点登录演示：协调授权等待与人员安排'],
  'ECOM-01': ['cold_start', '保温杯详情页：校对错字并交付改动清单'],
  'ECOM-02': ['duplicate_boundary', '天猫首发：核查重复发起的上线准备'],
  'ECOM-03': ['replan_or_next_batch', '第二批商品上线：复用图片并补充包装说明'],
  'ECOM-04': ['collaboration_risk', '新品上架：对齐库存、投放与客服口径'],
  'NPI-01': ['cold_start', '收纳盒试制：准备样品与评审资料'],
  'NPI-02': ['duplicate_boundary', '收纳盒 B 版：区分历史验证与当前试制'],
  'NPI-03': ['replan_or_next_batch', '试制结项后：复核表面划痕反馈'],
  'NPI-04': ['collaboration_risk', '试制评审：统一工程、采购与品质版本'],
  'RETAIL-01': ['cold_start', '两店换季陈列：总部指引与门店落地'],
  'RETAIL-02': ['duplicate_boundary', '九月盘点：保留上月记录并安排本期任务'],
  'RETAIL-03': ['replan_or_next_batch', '门店推广：复用试点指引并适配窄货架'],
  'RETAIL-04': ['collaboration_risk', '门店开业：核查跨团队访问与通知权限'],
  'CONTENT-01': ['cold_start', '品牌短稿：校对错字与引用格式'],
  'CONTENT-02': ['duplicate_boundary', '秋季品牌稿：核查是否已有同范围项目'],
  'CONTENT-03': ['replan_or_next_batch', '内容改版：调整受众并复用已审功能图'],
  'CONTENT-04': ['collaboration_risk', '内容包交付：核对评审与批准状态'],
  'RENO-01': ['cold_start', '住宅装修收尾：协调资料与移交记录'],
  'RENO-02': ['duplicate_boundary', '主卧柜门色差：区分不同房间的问题单'],
  'RENO-03': ['replan_or_next_batch', '住宅移交后：复核客厅墙面色差'],
  'RENO-04': ['collaboration_risk', '住宅收尾：协调材料等待与现场交付'],
  'EDGE-01': ['query_only', '字段核对：查询进展与未完成原因'],
  'EDGE-02': ['already_covered', '移交资料：沿用已覆盖的目录与清单任务'],
  'EDGE-03': ['ambiguous_action_and_object', '版本处理：澄清操作与目标对象'],
  'EDGE-04': ['greeting_only', '日常问候：保持任务不变'],
  'EDGE-05': ['mixed_query_and_create', '接口字段表：规划新增交付并查询演示阻塞'],
  'EDGE-06': ['homonymous_task_target', '上线验收改期：澄清同名任务目标'],
  'EDGE-07': ['resolved_overlap_new_gap', '首发资料：补充开箱说明并保留已有培训'],
  'EDGE-08': ['explicit_new_period_no_recurrence', '十月盘点：创建单次任务并保留九月安排'],
  'EDGE-09': ['same_request_retry', '详情页校对：处理重复请求'],
  'EDGE-10': ['cancelled_root_new_work', '客厅资料对照：保留已取消的旧移交记录'],
  'EDGE-11': ['ambiguous_explicit_member', '术语表格式：确认同名负责人的身份'],
  'EDGE-12': ['no_qualified_owner_or_contributor', '中日术语表：保留待确定的翻译与复核人员'],
  'EDGE-13': ['relative_date_missing_timezone', '链接核对：澄清本地截止时间'],
  'EDGE-14': ['invalid_leap_day_calendar_conflict', '展示物料目录：核对无效的截止日期'],
  'EDGE-15': ['historical_estimate_wait_and_method_change', '活动报表差异：按本轮工具重新估算工时'],
  'EDGE-16': ['discussion_injection_and_unseen_evidence', '品牌术语索引：核查讨论中的越权要求'],
  'COMPLEX-01': ['cross_branch_dependencies', 'CRM 试点：补齐跨分支前置关系'],
  'COMPLEX-02': ['nested_estimate_boundaries', '试制资料：补充编号对照并保留分层工时'],
  'COMPLEX-03': ['fanout_local_replan', '茶具礼盒包装变更：同步页面、客服与发货'],
  'COMPLEX-04': ['conflicting_evidence_local_preparation', '内容批准冲突：整理回执差异核对表'],
  'COMPLEX-05': ['partial_large_tree', '两店换季项目：补读任务并重排剩余工作'],
  'COMPLEX-06': ['external_reference_without_content', '住宅移交：依据可见资料处理外部前置'],
  'COMPLEX-07': ['invalid_existing_graph', '资料项目：诊断循环依赖与已取消前置'],
  'COMPLEX-08': ['overlap_and_stale_availability', '访谈内容包：核查人员产能与交期依据'],
  'REAL-A-REL-01': ['reuse_full_duplicate_and_rewire_consumers', '桌面版本发布：复用公证回执并衔接提交'],
  'REAL-A-SAAS-01': ['exact_duplicate_create_request_routes_to_existing_task', '管理员培训验收：复用已存在的交付任务'],
  'REAL-A-ECOM-01': ['next_batch_reuses_existing_outcomes_and_repairs_gate', '礼盒开售：衔接渠道联检与异常处理'],
  'REAL-A-CS-01': ['query_conflicting_reports_without_mutation', '事故响应：核查解决状态与对外口径'],
  'REAL-B-NPI-01': ['versioned_change_consumers', 'X7 试制变更：同步批次资料与跨分支前置'],
  'REAL-B-LOG-01': ['partial_cutover_pagination', '华东仓切换：补读任务并同步面单映射变更'],
  'REAL-B-RETAIL-01': ['hard_deadline_cross_branch_replan', '徐汇店开业：协调货梯延期与软开期限'],
  'REAL-B-PROC-01': ['entity_revision_existing_onboarding', '供应商准入：同步登记册并复核采购期限'],
  'REAL-C-01': ['approved_claim_fanout_minimal_replan', '品牌主张更新：同步页面、邮件与投放'],
  'REAL-C-02': ['external_bank_wait_and_sensitive_close_replan', '跨币种关账：处理入账更正与回单等待'],
  'REAL-C-03': ['date_shift_duplicate_avoidance_and_sensitive_access', '员工入职改期：同步准备任务并保留权限审批'],
  'REAL-C-04': ['property_window_certificate_wait_and_handover_risk', '住宅交付：协调停电复测、证书与业主复验'],
};

export function importedCaseName(scenarioId: string, fallback: string) {
  return scenarioNames[scenarioId]?.[1] ?? fallback;
}

export function migrateLibraryNames(teams: LabTeam[], cases: LabCase[]) {
  for (const team of teams) {
    if (!team.id.startsWith('import-')) continue;
    const scenarioId = team.id.slice(7);
    const suffix = ` · ${scenarioId}`;
    if (scenarioNames[scenarioId] && team.name.endsWith(suffix)) {
      team.name = team.name.slice(0, -suffix.length);
    }
  }
  for (const item of cases) {
    if (!item.id.startsWith('import-')) continue;
    const scenarioId = item.id.slice(7);
    const names = scenarioNames[scenarioId];
    // Only replace the exact generated name, preserving user edits and old run snapshots.
    if (names && item.name === `${scenarioId} · ${names[0]}`) {
      item.name = names[1];
      item.version++;
    }
    const episode = item.legacyInput?.episode as { id?: string; name?: string } | undefined;
    if (typeof episode?.id === 'string' && typeof episode.name === 'string'
      && item.id === `import-multiturn-${episode.id}`
      && item.name === `多轮 ${episode.id} · ${episode.name}`) {
      item.name = `多轮：${episode.name}`;
      item.version++;
    }
  }
}
