export type DemoTodo = {
  id: string;
  taskId: string;
  taskTitle: string;
  taskPath: string;
  taskOwner: string;
  taskStatus: "进行中" | "待审核";
  due: string;
  status: "待处理" | "等待前置任务" | "已完成";
  title: string;
  description: string;
  detail: string;
  output: string;
  file: string;
  criteria: string[];
};

export const demoTodos: DemoTodo[] = [
  { id: "boundary", taskId: "coupon-fix", taskTitle: "评审并灰度验证 POS 优惠券重复核销修复草案", taskPath: "零售业务 / POS 优惠券治理 / 修复与灰度", taskOwner: "周岚", taskStatus: "进行中", due: "今天 16:00 前", status: "待处理", title: "确认退款、撤单与离线重试的业务边界", description: "确认退款、撤单和离线重试是否使用同一套幂等规则。", detail: "结合业务规则和事故记录，确认三种场景的状态转换与幂等判定方式。", output: "优惠券恢复与重试业务边界结论。", file: "POS 优惠券核销业务规则 v3.2.pdf", criteria: ["三类场景均有明确结论", "关键结论有文件依据", "人工恢复权限明确"] },
  { id: "restore", taskId: "coupon-fix", taskTitle: "评审并灰度验证 POS 优惠券重复核销修复草案", taskPath: "零售业务 / POS 优惠券治理 / 修复与灰度", taskOwner: "周岚", taskStatus: "进行中", due: "暂无截止时间", status: "待处理", title: "确认异常状态是否允许人工恢复", description: "明确运营人员可恢复的异常状态范围。", detail: "逐一检查异常券状态，明确可恢复性、操作角色和审计字段。", output: "异常券状态人工恢复清单。", file: "离线交易重放事故复盘.docx", criteria: ["覆盖已知异常状态", "每种状态有明确结论", "操作权限完整"] },
  { id: "handoff", taskId: "coupon-fix", taskTitle: "评审并灰度验证 POS 优惠券重复核销修复草案", taskPath: "零售业务 / POS 优惠券治理 / 修复与灰度", taskOwner: "周岚", taskStatus: "进行中", due: "收到成果后", status: "等待前置任务", title: "复核修复结果并明确后续责任", description: "检查修复结论、测试依据与未决风险。", detail: "对照业务边界复核代码改动和关键路径测试证据。", output: "修复成果验收记录。", file: "优惠券重复核销修复确认记录.md", criteria: ["改动与规则一致", "验证证据可追溯", "后续责任明确"] },
  { id: "member-dedup", taskId: "member-settlement", taskTitle: "会员等级权益结算规则升级", taskPath: "零售业务 / 会员权益", taskOwner: "梁川", taskStatus: "待审核", due: "今天 17:00", status: "待处理", title: "确认跨渠道消费金额去重规则", description: "确认商城与门店订单的去重口径。", detail: "确定跨渠道订单统一身份键并覆盖退款和延迟同步。", output: "跨渠道去重规则表。", file: "会员等级计算规则.pdf", criteria: ["统一身份键可落地", "退款场景有明确口径", "影响范围可估算"] },
  { id: "member-sample", taskId: "member-settlement", taskTitle: "会员等级权益结算规则升级", taskPath: "零售业务 / 会员权益", taskOwner: "梁川", taskStatus: "待审核", due: "等待回算完成", status: "等待前置任务", title: "复核等级变化会员抽样结果", description: "复核升降级样本与补偿名单。", detail: "抽取等级变化会员，核对消费、退款与成长值明细。", output: "抽样复核记录。", file: "会员等级分布快照.xlsx", criteria: ["覆盖升降级会员", "差异原因可追溯", "补偿依据明确"] },
  { id: "invoice-monitor", taskId: "invoice-validation", taskTitle: "电子发票抬头校验异常专项治理", taskPath: "数据治理", taskOwner: "陈默", taskStatus: "进行中", due: "明天 10:00", status: "待处理", title: "确认发票失败率监控阈值", description: "设置异常告警阈值与负责人。", detail: "为校验失败、第三方超时和补开积压设置响应规则。", output: "发票异常监控责任表。", file: "发票异常治理报告.md", criteria: ["异常均有阈值", "告警有响应人", "关闭条件完整"] },
  { id: "invoice-timeout", taskId: "invoice-validation", taskTitle: "电子发票抬头校验异常专项治理", taskPath: "数据治理", taskOwner: "陈默", taskStatus: "进行中", due: "今天已完成", status: "已完成", title: "补齐第三方接口超时降级测试", description: "验证第三方税号接口超时后的降级。", detail: "覆盖连接超时、响应超时和异常返回码。", output: "超时降级测试报告。", file: "存量失败订单.xlsx", criteria: ["超时类型均覆盖", "降级后不误拦截", "审计记录完整"] },
];

export const demoTodoGroups = Array.from(new Set(demoTodos.map((todo) => todo.taskId))).map((taskId) => ({ taskId, taskTitle: demoTodos.find((todo) => todo.taskId === taskId)!.taskTitle, todos: demoTodos.filter((todo) => todo.taskId === taskId) }));
