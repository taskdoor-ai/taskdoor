import type { EnterpriseSource } from "../components/SourcesList";

export type TaskCreationGap = {
  boundary?: string;
  candidateBasis?: string;
  candidateId: string | null;
  detail: string;
  evidence: string;
  id: string;
  impact: string;
  label: string;
  mode: string;
  modeDetail: string;
  title: string;
  tone: "fact" | "route" | "unknown";
  treatment: string;
};

export type TaskCreationChildDraft = {
  candidateOptionsByGap: Record<string, string[]>;
  contextIds: string[];
  fileCandidateIds: string[];
  gapSelections: Record<string, { adopted: boolean; candidateId: string }>;
  gaps: TaskCreationGap[];
  goal: string;
  id: string;
  ownerId: string;
  participantIds: string[];
  title: string;
};

export type TaskCreationStructure = {
  children: TaskCreationChildDraft[];
  mode: "decomposed";
};

export type TaskCreationScenario = {
  candidateOptionsByGap: Record<string, string[]>;
  fileCandidateIds: string[];
  goal: string;
  gaps: TaskCreationGap[];
  id: string;
  label: string;
  matches: (content: string) => boolean;
  prompt: string;
  quickTestHint: string;
  sourceBasis: Record<string, string>;
  sources: EnterpriseSource[];
  taskStructure?: TaskCreationStructure;
  title: string;
};

const dailyScenario: TaskCreationScenario = {
  id: "daily",
  label: "日常安排",
  quickTestHint: "单项任务 · 自己处理",
  prompt: "整理明天下午和陈默的一对一沟通要点，先由我自己完成，不需要邀请其他人，也不要自动生成额外任务。",
  matches: (content) => content.includes("一对一沟通"),
  title: "准备与陈默的一对一沟通",
  goal: "在明天下午沟通前整理出聚焦重点、待确认事项和预期结论，由我自行完成。",
  fileCandidateIds: [],
  sources: [
    { id: "one-on-one-notes", title: "周岚 × 陈默上次一对一纪要.docx", snippet: "上次确认了重试链路压力、评审负载和需要产品补充的边界。", meta: "个人工作文件 / 一对一 · 周岚更新于 14 天前", type: "document" },
  ],
  sourceBasis: {
    "one-on-one-notes": "目标是准备与陈默的连续沟通；上次纪要能避免重复询问，并帮助核对未闭环事项。",
  },
  gaps: [
    {
      candidateId: null,
      candidateBasis: "这是你的个人沟通准备，输入明确要求由你自行完成；上次纪要只作为连续上下文，不需要引入新的协作者。",
      id: "conversation-focus",
      label: "由你处理",
      mode: "直接处理",
      modeDetail: "在当前任务内收敛沟通重点",
      title: "这次沟通最需要形成什么结论",
      detail: "输入已经说明时间和对象，但还需要把沟通主题收敛为少量可确认的问题。",
      evidence: "依据：上次纪要有 3 项未闭环事项，当前输入没有新增协作需求。",
      impact: "影响：没有明确结论目标时，一对一容易停留在状态同步。",
      treatment: "最小处理：由你整理 3 个沟通重点和每项期望结论，不新增任务。",
      tone: "fact",
    },
  ],
  candidateOptionsByGap: {},
};

const membershipScenario: TaskCreationScenario = {
  id: "membership",
  label: "会员规则",
  quickTestHint: "单项任务 · 只咨询",
  prompt: "我准备调整会员退款规则，但不确定是否影响财务对账。先帮我找出需要确认的判断和最合适的咨询人，任务仍由我推进。",
  matches: (content) => content.includes("会员退款规则") || content.includes("财务对账"),
  title: "确认会员退款规则的财务对账影响",
  goal: "明确会员退款规则调整是否影响财务对账，补齐需要确认的判断，并找到一位合适的咨询人；仍由我作为 Owner 推进。",
  fileCandidateIds: ["member-refund-rule", "finance-reconciliation-map", "refund-difference-task"],
  sources: [
    { id: "member-refund-rule", title: "会员退款与权益回收规则 v2.6.pdf", snippet: "退款后权益回收按原支付批次执行，跨月退款需保留结算快照。", meta: "会员业务资源库 / 退款规则 · 许宁更新于 9 天前", type: "document" },
    { id: "finance-reconciliation-map", title: "会员退款财务对账字段映射.docx", snippet: "列出退款单、权益回收单与总账凭证的关联字段及跨期处理口径。", meta: "财务共享资料 / 对账口径 · 苏禾确认于 21 天前", type: "document" },
    { id: "refund-difference-task", title: "7 月会员退款差异复核", snippet: "历史复核发现 18 笔跨月退款未携带原结算批次。", meta: "已完成任务 / 会员结算 · 完成于 32 天前", type: "task" },
  ],
  sourceBasis: {
    "member-refund-rule": "目标涉及会员退款规则调整；这是当前生效的业务规则基线。",
    "finance-reconciliation-map": "需求明确担心财务对账影响；该映射给出业务动作与凭证字段的连接关系。",
    "refund-difference-task": "历史差异与本次跨月退款边界相近，可用于验证风险是否真实发生过。",
  },
  gaps: [
    {
      candidateId: null,
      candidateBasis: "你是当前交易产品负责人，退款触发条件属于本次规则调整必须先明确的业务边界。",
      id: "refund-trigger",
      label: "由你处理",
      mode: "直接处理",
      modeDetail: "先明确业务规则变更边界",
      title: "哪些退款情形会触发权益回收",
      detail: "规则调整前需要先区分全额、部分和跨月退款，否则无法判断对账影响范围。",
      evidence: "依据：现行规则按原支付批次回收权益，但部分退款的比例口径仍未写清。",
      impact: "影响：边界不清会让财务无法判断应生成哪类凭证。",
      treatment: "最小处理：由你确认 3 类退款情形的业务口径，不新增任务。",
      tone: "fact",
    },
    {
      candidateId: "苏禾",
      id: "ledger-impact",
      label: "建议只咨询",
      mode: "只咨询",
      modeDetail: "问清一个对账判断，不转交任务",
      title: "规则变化是否改变财务凭证口径",
      detail: "需要了解总账和跨期处理的人确认判断，不需要对方接手任务。",
      evidence: "依据：字段映射与历史差异都指向原结算批次和跨期凭证。",
      impact: "影响：若凭证口径变化，规则上线前必须补齐财务结果依据。",
      treatment: "最小处理：向苏禾确认跨月和部分退款是否需要新增凭证字段。",
      candidateBasis: "负责财务字段与审计口径，且确认过当前可见的对账字段映射。",
      boundary: "只咨询一个判断；不转交任务，也不默认共享未引用资料。",
      tone: "route",
    },
  ],
  candidateOptionsByGap: { "ledger-impact": ["苏禾", "韩序", "许宁"] },
};

const invoiceScenario: TaskCreationScenario = {
  id: "invoice",
  label: "发票方案",
  quickTestHint: "单项任务 · 短评审",
  prompt: "我的 Codex 已完成电子发票超时降级方案，请找一位了解税务接口的人在现有材料内做一次短评审，最终结果仍由我确认。",
  matches: (content) => content.includes("电子发票") || content.includes("税务接口"),
  title: "短评审电子发票超时降级方案",
  goal: "在现有材料范围内完成税务接口兼容性短评审，形成明确反馈；最终结果仍由我确认。",
  fileCandidateIds: ["invoice-fallback-plan", "tax-api-contract", "invoice-timeout-analysis"],
  sources: [
    { id: "invoice-fallback-plan", title: "电子发票超时降级方案 v1.4.docx", snippet: "税局接口超过 8 秒时进入延迟开票队列，并向订单侧返回受理状态。", meta: "交易技术资源库 / 发票 · 陈默更新于今天 10:20", type: "document" },
    { id: "tax-api-contract", title: "税务平台开票接口契约 2026Q3.pdf", snippet: "受理状态不能等同开票成功；重试必须沿用原请求流水号。", meta: "外部规范镜像 / 税务接口 · 同步于 3 天前", type: "document" },
    { id: "invoice-timeout-analysis", title: "电子发票超时分布周报", snippet: "近 7 天 P95 为 6.4 秒，0.7% 请求超过降级阈值。", meta: "经营数据集 / 发票稳定性 · 韩序更新于昨天", type: "data" },
  ],
  sourceBasis: {
    "invoice-fallback-plan": "这是当前需要评审的直接工作对象，包含阈值、状态与重试设计。",
    "tax-api-contract": "评审需要核对税务接口的状态语义和流水号约束，规范是判断依据。",
    "invoice-timeout-analysis": "实际超时分布能判断 8 秒阈值是否会造成过多降级。",
  },
  gaps: [
    {
      candidateId: null,
      candidateBasis: "你需要确认方案的用户承诺和最终结果，先定义受理、成功与失败三种状态的产品口径。",
      id: "fallback-result",
      label: "由你处理",
      mode: "直接处理",
      modeDetail: "明确方案结果边界",
      title: "降级后的用户与订单状态如何收口",
      detail: "技术方案已有，但产品侧还需明确受理、成功和失败三种状态的用户承诺。",
      evidence: "依据：接口契约明确受理不等于开票成功。",
      impact: "影响：状态口径不清会让客服和订单页面给出错误承诺。",
      treatment: "最小处理：由你补充三种状态的展示与结果依据。",
      tone: "fact",
    },
    {
      candidateId: "苏禾",
      id: "tax-contract-review",
      label: "建议短评审",
      mode: "短评审",
      modeDetail: "在限定材料内核对税务接口约束",
      title: "降级与重试是否符合税务接口契约",
      detail: "需要熟悉合规和税务字段的人在现有三份材料内给出反馈。",
      evidence: "依据：方案使用延迟队列，接口契约要求沿用原请求流水号。",
      impact: "影响：流水号或状态处理错误可能造成重复开票或审计缺口。",
      treatment: "最小处理：请苏禾核对状态、流水号和审计字段三项约束。",
      candidateBasis: "职责覆盖财务字段与审计，近期参与过历史交易审计。",
      boundary: "限定为一次材料评审；最终方案仍由你推进。",
      tone: "route",
    },
  ],
  candidateOptionsByGap: { "tax-contract-review": ["苏禾", "陈默", "梁川"] },
};

const storeScenario: TaskCreationScenario = {
  id: "store",
  label: "门店验证",
  quickTestHint: "单项任务 · 有界交付",
  prompt: "需要在 12 家试点门店验证新版库存补偿逻辑。请判断谁适合交付一份独立验证结果，完成后返回给我确认。",
  matches: (content) => content.includes("12 家试点门店") || content.includes("库存补偿逻辑"),
  title: "验证新版库存补偿逻辑",
  goal: "在 12 家试点门店完成一轮有边界的验证，提交可独立核对的结果并返回给我确认。",
  fileCandidateIds: ["inventory-compensation-design", "pilot-store-roster", "inventory-replay-samples"],
  sources: [
    { id: "inventory-compensation-design", title: "库存事件补偿设计 v2.1.pdf", snippet: "补偿任务按门店、商品和事件序列去重，超过 30 分钟进入人工复核。", meta: "库存平台资源库 / 补偿机制 · 高远更新于 4 天前", type: "document" },
    { id: "pilot-store-roster", title: "12 家试点门店与灰度窗口.docx", snippet: "覆盖直营、加盟和弱网门店，列明店长联系人及可执行时段。", meta: "门店运营资源库 / 试点计划 · 林洁更新于今天 09:10", type: "document" },
    { id: "inventory-replay-samples", title: "库存补偿异常样本集", snippet: "包含 46 组重复事件、乱序到达和弱网恢复样本。", meta: "质量数据集 / 库存验证 · 梁川确认于 6 天前", type: "data" },
  ],
  sourceBasis: {
    "inventory-compensation-design": "目标是验证新版补偿逻辑；设计文档定义了去重键、超时和人工兜底。",
    "pilot-store-roster": "真实验证需要门店类型、联系人和可执行窗口，这份清单提供执行条件。",
    "inventory-replay-samples": "样本覆盖目标中的异常模式，可作为现场验证的统一输入。",
  },
  gaps: [
    {
      candidateId: null,
      candidateBasis: "你仍是任务 Owner，必须先给出跨门店可统一判断的结果门槛，再由现场协作者执行验证。",
      id: "store-result",
      label: "由你处理",
      mode: "直接处理",
      modeDetail: "先明确结果定义",
      title: "什么结果才算补偿逻辑通过",
      detail: "已有试点范围，但还需要由 Owner 明确成功率、重复扣减和人工兜底的结果门槛。",
      evidence: "依据：设计文档给出处理机制，尚未给出业务可接受阈值。",
      impact: "影响：没有统一门槛时，12 家门店结果无法合并判断。",
      treatment: "最小处理：由你明确 3 项结果指标和允许偏差。",
      tone: "fact",
    },
    {
      candidateId: "林洁",
      id: "pilot-delivery",
      label: "建议有界交付",
      mode: "有界交付",
      modeDetail: "交付一份独立验证结果后返回 Owner",
      title: "12 家门店能否按同一口径完成现场验证",
      detail: "需要协调门店窗口并汇总现场证据的人独立交付验证结果。",
      evidence: "依据：试点清单已列出 12 家门店和执行窗口，异常样本也已准备。",
      impact: "影响：缺少现场协调和统一记录会让结果不可比较。",
      treatment: "最小处理：请林洁组织一轮验证并返回门店级结果与异常证据。",
      candidateBasis: "当前负责 12 家试点门店协调，连续交付过 4 次门店灰度。",
      boundary: "只交付本轮验证结果；完成后返回你确认，不改变任务 Owner。",
      tone: "unknown",
    },
  ],
  candidateOptionsByGap: { "pilot-delivery": ["林洁", "梁川", "高远"] },
};

const posScenario: TaskCreationScenario = {
  id: "pos",
  label: "POS 故障",
  quickTestHint: "复杂拆分 · 3 个子任务",
  prompt: "我的 Codex 已定位 POS 优惠券重复核销来自离线事件重放，并生成修复草案。需要交易域负责人确认退款与撤单规则，门店运营安排灰度验证。",
  matches: (content) => content.includes("POS") || content.includes("重复核销"),
  title: "评审并灰度验证 POS 优惠券重复核销修复草案",
  goal: "基于现有根因定位和修复草案，完成 POS 优惠券重复核销修复，并通过退款、撤单和离线重试验证。",
  fileCandidateIds: ["schema", "incident", "commit"],
  taskStructure: {
    mode: "decomposed",
    children: [
      {
        candidateOptionsByGap: { "implementation-rule-input": ["周岚", "苏禾"] },
        contextIds: ["schema", "incident", "commit"],
        fileCandidateIds: ["schema", "incident", "commit"],
        gapSelections: { "implementation-rule-input": { adopted: false, candidateId: "周岚" } },
        gaps: [{
          candidateId: "周岚",
          candidateBasis: "负责 POS 交易规则，能够确认实现必须遵守的退款、部分退款与撤单口径。",
          id: "implementation-rule-input",
          label: "需要业务判断",
          mode: "只咨询",
          modeDetail: "确认一项实现输入，不转交代码任务",
          title: "退款与撤单规则需要形成实现输入",
          detail: "修复实现需要一份已确认的退款、部分退款与撤单口径，避免工程侧自行解释业务规则。",
          evidence: "依据：业务规则 v3.2 明确标记恢复规则仍待业务负责人确认。",
          impact: "影响：缺少确认口径时，代码即使通过技术测试也不能证明业务行为正确。",
          treatment: "最小处理：请周岚确认三类场景的核销恢复口径，并作为实现与回归的共同输入。",
          boundary: "只补齐业务判断；陈默仍推进修复实现与自测结果。",
          tone: "fact",
        }],
        goal: "把现有修复草案收敛为可评审的实现，并完成异常路径自测。",
        id: "pos-fix-implementation",
        ownerId: "陈默",
        participantIds: ["高远"],
        title: "完成修复实现与自测",
      },
      {
        candidateOptionsByGap: { "regression-implementation-explanation": ["陈默", "高远"] },
        contextIds: ["incident", "commit"],
        fileCandidateIds: ["incident", "commit"],
        gapSelections: { "regression-implementation-explanation": { adopted: false, candidateId: "陈默" } },
        gaps: [{
          candidateId: "陈默",
          candidateBasis: "负责本次修复实现，能够说明请求标识、稳定幂等键与回退路径的实际边界。",
          id: "regression-implementation-explanation",
          label: "需要实现说明",
          mode: "短评审",
          modeDetail: "在回归前核对实现边界",
          title: "连续重放样本需要对应到实际实现边界",
          detail: "回归负责人需要确认哪些请求标识变化仍应命中同一幂等键，以及失败后如何安全重试。",
          evidence: "依据：事故复盘记录了联网恢复后重新生成请求标识，修复草案改为订单与券实例组合键。",
          impact: "影响：样本与实现边界未对齐时，回归通过可能只是没有覆盖原故障路径。",
          treatment: "最小处理：请陈默基于修复实现做一次限定说明，由梁川据此固定回归样本。",
          boundary: "只解释实现边界；梁川仍推进回归范围、证据和结论。",
          tone: "route",
        }],
        goal: "用事故样本和补充异常路径验证修复不会再次产生重复核销。",
        id: "pos-replay-regression",
        ownerId: "梁川",
        participantIds: ["高远"],
        title: "完成离线重放回归验证",
      },
      {
        candidateOptionsByGap: { "pilot-stop-review": ["梁川", "周岚"] },
        contextIds: ["schema", "incident"],
        fileCandidateIds: ["schema", "incident"],
        gapSelections: { "pilot-stop-review": { adopted: false, candidateId: "梁川" } },
        gaps: [{
          candidateId: "梁川",
          candidateBasis: "负责本次回归验证与发布质量，能够把自动化证据转成现场停止和回退门槛。",
          id: "pilot-stop-review",
          label: "需要质量复核",
          mode: "短评审",
          modeDetail: "灰度前确认停止与回退门槛",
          title: "门店异常需要明确停止与回退门槛",
          detail: "现场执行前需要确认重复核销、补偿失败和证据缺失分别在什么条件下停止灰度。",
          evidence: "依据：事故复盘包含联网恢复后的重复消费，但当前试点材料尚未写明异常升级路径。",
          impact: "影响：没有停止门槛时，门店可能在证据不足或异常扩大后仍继续执行。",
          treatment: "最小处理：请梁川复核三类停止条件和回退证据要求，再由林洁组织现场执行。",
          boundary: "只复核质量门槛；林洁仍推进门店协调、执行记录和结果返回。",
          tone: "unknown",
        }],
        goal: "在真实门店窗口验证修复效果，并形成可由父任务独立核对的结果。",
        id: "pos-store-pilot",
        ownerId: "林洁",
        participantIds: ["梁川"],
        title: "完成门店灰度验证",
      },
    ],
  },
  sources: [
    { id: "schema", title: "POS 优惠券核销业务规则 v3.2.pdf", snippet: "交易完成后核销券实例；退款与撤单的恢复规则需要业务负责人确认。", meta: "零售业务资源库 / POS / 业务规则 · 周岚更新于 2 天前", type: "document" },
    { id: "incident", title: "离线交易重放事故复盘 2026-05-18.docx", snippet: "门店恢复联网后重新生成请求标识，同一券实例被重复消费。", meta: "零售技术资源库 / 事故复盘 · 陈默更新于 4 个月前", type: "document" },
    { id: "commit", title: "coupon-retry 重放修复草案.patch", snippet: "个人 Codex 生成的候选改动，使用订单与券实例组成稳定幂等键。", meta: "AI 工作成果库 / 待审核草案 · 由你刚刚上传", type: "change" },
  ],
  sourceBasis: {
    schema: "目标涉及退款与撤单规则；这份文件是当前团队可见的业务规则基线。",
    incident: "需求提到离线事件重放；该复盘包含同类故障的已确认根因和边界。",
    commit: "这是本次需求随附的修复草案，可作为后续评审的直接工作对象。",
  },
  gaps: [
    {
      candidateId: null, candidateBasis: "退款、撤单与优惠券核销规则需要当前任务 Owner 确认业务语义。", id: "rule", label: "Owner 处理", mode: "直接处理", modeDetail: "在当前任务内完成规则判断", title: "退款、撤单的核销语义", detail: "业务规则仍有一个判断缺口，需要当前任务 Owner 确认退款与撤单的核销语义。", evidence: "依据：业务规则 v3.2 的恢复规则仍待确认。", impact: "影响：未确认会让修复结果缺少明确业务口径。", treatment: "最小处理：由当前任务 Owner 在现有规则上补充一次判断，不新增任务。", tone: "fact",
    },
    {
      candidateId: "梁川", id: "release-review", label: "建议短评审", mode: "短评审", modeDetail: "在父任务收口前复核发布证据", title: "最终发布判断需要独立质量复核", detail: "父任务 Owner 需要整合实现、回归和门店证据，并由质量人员复核是否达到发布或回退门槛。", evidence: "依据：三个独立子任务分别交付实现、自动化回归和现场灰度证据。", impact: "影响：缺少独立复核时，父任务可能在证据不一致或仍有失败样本时过早收口。", treatment: "最小处理：请梁川在限定材料内复核发布证据，最终发布判断仍由父任务 Owner 作出。", candidateBasis: "熟悉跨域质量与发布流程，能够复核多来源证据但不替代父任务 Owner 作最终决定。", boundary: "只形成有界评审意见；不创建重复的最终确认子任务。", tone: "route",
    },
  ],
  candidateOptionsByGap: { "release-review": ["梁川", "陈默", "高远"] },
};

const genericScenario: TaskCreationScenario = {
  id: "generic",
  label: "自定义需求",
  quickTestHint: "单项任务",
  prompt: "",
  matches: () => true,
  title: "未命名任务",
  goal: "请补充任务目标。",
  fileCandidateIds: [],
  sources: [],
  sourceBasis: {},
  gaps: [{
    candidateId: null,
    candidateBasis: "当前没有发现必须邀请他人的证据；由 Owner 先明确结果依据是成本最低且可逆的推进方式。",
    id: "goal-boundary",
    label: "由你处理",
    mode: "直接处理",
    modeDetail: "先把完成边界说清楚",
    title: "结果依据是否足够明确",
    detail: "当前没有发现必须邀请他人的证据，可以先由 Owner 明确可核对结果。",
    evidence: "依据：当前输入只提供了目标，没有可验证的外部协作或权限缺口。",
    impact: "影响：结果依据不清会让后续进展无法判断。",
    treatment: "最小处理：由你补充一条可核对的结果描述，不新增协作者。",
    tone: "fact",
  }],
  candidateOptionsByGap: {},
};

export const taskCreationScenarios = [dailyScenario, membershipScenario, invoiceScenario, storeScenario, posScenario];
export const taskCreationMockPrompts = taskCreationScenarios.map(({ label, prompt, quickTestHint }) => ({ label, prompt, quickTestHint }));
export const allTaskCreationSources = Array.from(new Map(taskCreationScenarios.flatMap((scenario) => scenario.sources).map((source) => [source.id, source])).values());

export const getTaskCreationScenario = (content: string) => taskCreationScenarios.find((scenario) => scenario.matches(content)) ?? genericScenario;

export const deriveTaskDraft = (content: string) => {
  const scenario = getTaskCreationScenario(content);
  if (scenario.id !== "generic") return { goal: scenario.goal, title: scenario.title };
  const normalized = content.trim().replace(/[。！？]+$/, "");
  const firstClause = normalized.split(/[，,。；;！？\n]/)[0]
    .replace(/^(我的\s*Codex\s*已|我准备|我想|我需要|需要|请帮我|帮我|请)/, "")
    .trim();
  return { goal: normalized || genericScenario.goal, title: firstClause.slice(0, 28) || genericScenario.title };
};
