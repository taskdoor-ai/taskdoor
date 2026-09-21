import type { LabCase, LabTask, LabTeam } from '../../src/test-lab/types.ts';

const task = (value: Partial<LabTask> & Pick<LabTask, 'id' | 'title' | 'goal' | 'status' | 'createdById' | 'ownerId'>): LabTask => ({
  participantIds: [], parentId: null, dependsOnTaskIds: [], acceptanceCriteria: [], executionTips: [], estimatedMinutes: null,
  dueAt: null, tags: [], visibility: 'team', version: 1, ...value,
});

export function onlineCollaborationSeed(): { teams: LabTeam[]; cases: LabCase[] } {
  const legal: LabTeam = {
    id: 'lab-legal', name: '瀚川商事律师团队', industry: 'legal_services', archived: false,
    description: '线上法律服务团队，用于测试律师、助理、合规与客户协作中的责任、前置依赖和证据判断。',
    members: [
      { id: 'legal-lead', name: '何峻', role: '主办律师', responsibilities: ['确认委托范围、分配审查责任并对最终法律意见负责'], version: 1 },
      { id: 'legal-lawyer', name: '沈宁', role: '商事律师', responsibilities: ['审查合同条款并形成风险修改意见'], version: 1 },
      { id: 'legal-assistant', name: '唐予', role: '律师助理', responsibilities: ['整理事实材料、版本记录与引用依据'], version: 1 },
      { id: 'legal-compliance', name: '许言', role: '合规律师', responsibilities: ['核对数据、宣传及行业合规要求'], version: 1 },
      { id: 'legal-client', name: '陆清', role: '客户协作负责人', responsibilities: ['收集客户事实、确认商业条件并反馈决策'], version: 1 },
    ],
    tasks: [
      task({ id: 'legal-contract', title: '完成渠道合作协议审查', goal: '在签约前形成可核对的条款修改稿与风险清单', status: '进行中', createdById: 'legal-lead', ownerId: 'legal-lead', participantIds: ['legal-lawyer', 'legal-assistant', 'legal-compliance', 'legal-client'], acceptanceCriteria: ['交付带修订痕迹的协议、风险清单和客户待确认事项'], executionTips: ['先核对委托范围与事实材料，再区分法律判断和商业决策。'], estimatedMinutes: 600, dueAt: '2026-09-10', tags: ['高优先级'] }),
      task({ id: 'legal-facts', title: '补齐交易事实与授权材料', goal: '收齐审查所需的主体、授权和商业条件材料', status: '进行中', createdById: 'legal-lead', ownerId: 'legal-client', participantIds: ['legal-assistant'], parentId: 'legal-contract', acceptanceCriteria: ['主体信息、授权文件、价格与结算条件均有可追溯材料'], executionTips: ['将缺失项逐项列出，由客户明确确认，不依据聊天推断。'], estimatedMinutes: 180, dueAt: '2026-09-06' }),
      task({ id: 'legal-review', title: '审查违约与终止条款', goal: '识别责任失衡并提出可谈判的修改文本', status: '待开始', createdById: 'legal-lead', ownerId: 'legal-lawyer', participantIds: ['legal-assistant'], parentId: 'legal-contract', dependsOnTaskIds: ['legal-facts'], acceptanceCriteria: ['每项风险均引用原条款并给出修改建议'], executionTips: ['区分法律风险、商业取舍和待确认事实。'], estimatedMinutes: 240, dueAt: '2026-09-08' }),
      task({ id: 'legal-compliance-check', title: '核对数据与宣传合规边界', goal: '确认合作中的数据处理和对外宣传要求', status: '待开始', createdById: 'legal-lead', ownerId: 'legal-compliance', participantIds: ['legal-lawyer'], parentId: 'legal-contract', dependsOnTaskIds: ['legal-facts'], acceptanceCriteria: ['形成适用要求、现有缺口和建议条款清单'], executionTips: ['无法确认适用范围时标记未知并请求补充事实。'], estimatedMinutes: 180, dueAt: '2026-09-08' }),
      task({ id: 'legal-opinion', title: '汇总法律意见并发客户确认', goal: '合并专业意见，明确可签、待改和需商业决策事项', status: '待开始', createdById: 'legal-lead', ownerId: 'legal-lead', participantIds: ['legal-lawyer', 'legal-compliance', 'legal-client'], parentId: 'legal-contract', dependsOnTaskIds: ['legal-review', 'legal-compliance-check'], acceptanceCriteria: ['客户收到单一版本的修改稿与分级风险清单'], executionTips: ['保留分歧与未知项，不代替客户作商业决策。'], estimatedMinutes: 150, dueAt: '2026-09-10' }),
    ],
    evidence: [
      { id: 'legal-file-1', taskId: 'legal-facts', authorId: 'legal-client', kind: '文件', title: '渠道合作协议-v3.docx', content: '客户上传的待审版本；授权证明尚未提供，结算周期已标注为 60 天。', createdAt: '2026-09-04T02:00:00.000Z', version: 1, visibleToIds: [] },
      { id: 'legal-discussion-1', taskId: 'legal-review', authorId: 'legal-lawyer', kind: '讨论', title: '审查启动条件', content: '违约条款可先做结构审查，但签约主体授权与最终返利口径未确认，结论需保留条件。', createdAt: '2026-09-04T03:00:00.000Z', version: 1, visibleToIds: [] },
    ],
  };

  const video: LabTeam = {
    id: 'lab-short-video', name: '跃色视频创作团队', industry: 'short_video_media', archived: false,
    description: '自媒体短视频团队，用于测试选题、脚本、拍摄、剪辑、合规和发布数据的线上协作。',
    members: [
      { id: 'video-owner', name: '乔一', role: '账号负责人', responsibilities: ['确定账号目标、选题优先级与最终发布决策'], version: 1 },
      { id: 'video-director', name: '夏知', role: '短视频编导', responsibilities: ['完成选题策划、分镜与拍摄执行'], version: 1 },
      { id: 'video-writer', name: '闻舟', role: '脚本策划', responsibilities: ['撰写口播脚本并核对事实和表达'], version: 1 },
      { id: 'video-editor', name: '程野', role: '视频剪辑', responsibilities: ['完成剪辑、字幕、声音与成片版本管理'], version: 1 },
      { id: 'video-ops', name: '苏禾', role: '发布运营', responsibilities: ['配置标题封面、发布排期并记录表现数据'], version: 1 },
      { id: 'video-reviewer', name: '顾安', role: '内容合规', responsibilities: ['核对素材授权、平台规则与敏感表达'], version: 1 },
    ],
    tasks: [
      task({ id: 'video-series', title: '发布三期 AI 办公短视频', goal: '完成三期可发布短视频并记录首日表现', status: '进行中', createdById: 'video-owner', ownerId: 'video-owner', participantIds: ['video-director', 'video-writer', 'video-editor', 'video-ops', 'video-reviewer'], acceptanceCriteria: ['三期视频完成审核并发布，首日数据有可追溯记录'], executionTips: ['每期按选题、脚本、素材、成片、发布顺序推进。'], estimatedMinutes: 1080, dueAt: '2026-09-12', tags: ['系列内容'] }),
      task({ id: 'video-topic', title: '确认三期选题与受众', goal: '确定每期核心问题、受众与差异化角度', status: '已完成', createdById: 'video-owner', ownerId: 'video-owner', participantIds: ['video-director', 'video-ops'], parentId: 'video-series', acceptanceCriteria: ['三期选题均有目标受众和一句核心价值'], executionTips: ['优先使用已有账号数据，不以热度猜测代替依据。'], estimatedMinutes: 120 }),
      task({ id: 'video-script', title: '完成第一期口播脚本', goal: '形成 60 秒内可拍摄的分镜口播稿', status: '进行中', createdById: 'video-owner', ownerId: 'video-writer', participantIds: ['video-director', 'video-reviewer'], parentId: 'video-series', dependsOnTaskIds: ['video-topic'], acceptanceCriteria: ['脚本含开场、三个要点、演示提示和行动引导'], executionTips: ['事实性表述标注来源，避免承诺无法验证的效果。'], estimatedMinutes: 180, dueAt: '2026-09-06' }),
      task({ id: 'video-shoot', title: '拍摄第一期演示素材', goal: '按确认脚本完成口播和屏幕演示素材', status: '已阻塞', createdById: 'video-owner', ownerId: 'video-director', participantIds: ['video-writer'], parentId: 'video-series', dependsOnTaskIds: ['video-script'], acceptanceCriteria: ['口播、演示录屏和补充镜头均可供剪辑'], executionTips: ['先核对脚本定稿；未定稿时只准备场地和镜头清单。'], estimatedMinutes: 240, dueAt: '2026-09-07' }),
      task({ id: 'video-edit', title: '剪辑第一期成片', goal: '完成平台规格的字幕版成片', status: '待开始', createdById: 'video-owner', ownerId: 'video-editor', participantIds: ['video-director', 'video-reviewer'], parentId: 'video-series', dependsOnTaskIds: ['video-shoot'], acceptanceCriteria: ['画面、字幕、音量、素材授权和版本号均通过核对'], executionTips: ['先锁定素材清单，再进入正式剪辑。'], estimatedMinutes: 300, dueAt: '2026-09-09' }),
      task({ id: 'video-publish', title: '发布并记录首日数据', goal: '按排期发布并留存可比较的数据快照', status: '待开始', createdById: 'video-owner', ownerId: 'video-ops', participantIds: ['video-owner'], parentId: 'video-series', dependsOnTaskIds: ['video-edit'], acceptanceCriteria: ['发布链接、时间、标题封面版本及首日数据完整记录'], executionTips: ['以平台实际数据为准，不将预测值写成结果。'], estimatedMinutes: 120, dueAt: '2026-09-10' }),
    ],
    evidence: [
      { id: 'video-file-1', taskId: 'video-script', authorId: 'video-writer', kind: '文件', title: '第一期口播脚本-v2.md', content: '已完成主体内容；演示工具版本和结尾行动引导仍待账号负责人确认。', createdAt: '2026-09-04T04:00:00.000Z', version: 1, visibleToIds: [] },
      { id: 'video-discussion-1', taskId: 'video-shoot', authorId: 'video-director', kind: '讨论', title: '拍摄阻塞说明', content: '分镜表已准备，因脚本中的演示版本尚未确认，当前不能录制最终屏幕素材。', createdAt: '2026-09-04T05:00:00.000Z', version: 1, visibleToIds: [] },
    ],
  };

  const cases: LabCase[] = [
    { id: 'case-legal-contract', name: '律师团队合同审查依赖诊断', category: 'task-diagnostician', teamId: legal.id, actorId: 'legal-lead', description: '检查事实材料、专业审查与客户决策之间的责任和依赖。', archived: false, enabled: true, version: 1, steps: [{ id: 's1', prompt: '诊断合同审查任务当前的阻塞、前置依赖和责任边界，不替客户做商业决策。', skillId: 'agentdoor-task-diagnostician', taskId: 'legal-contract', usePreviousOutput: false, events: [] }], assertions: [{ id: 'schema', label: '返回结构版本', stepId: 's1', path: 'schemaVersion', operator: 'exists', expected: null }], reviewChecklist: ['是否引用任务和资料证据', '是否区分法律意见与客户决策'] },
    { id: 'case-short-video-status', name: '短视频拍摄阻塞与下一步', category: 'task-status-analyzer', teamId: video.id, actorId: 'video-director', description: '根据脚本文件和讨论判断拍摄任务状态。', archived: false, enabled: true, version: 1, steps: [{ id: 's1', prompt: '分析第一期拍摄任务的当前情况、阻塞原因、可执行下一步和进度依据，不强行执行受阻工作。', skillId: 'agentdoor-task-status-analyzer', taskId: 'video-shoot', usePreviousOutput: false, events: [] }], assertions: [{ id: 'schema', label: '返回结构版本', stepId: 's1', path: 'schemaVersion', operator: 'exists', expected: null }, { id: 'formal-status', label: '保留已阻塞状态', stepId: 's1', path: 'result.formalStatus', operator: 'equals', expected: '已阻塞' }], reviewChecklist: ['是否引用脚本和阻塞讨论', '是否推荐核对与解阻行动'] },
  ];
  return { teams: [legal, video], cases };
}
