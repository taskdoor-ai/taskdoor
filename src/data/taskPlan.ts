export type PlannedMember = { person: string; responsibility: string; todos: string[] };

export const couponWorkPlan: PlannedMember[] = [
  { person: "周岚", responsibility: "确认退款、撤单、离线重试与人工恢复的业务边界", todos: ["确认退款与撤单的幂等规则", "确认人工恢复状态白名单"] },
  { person: "陈默", responsibility: "评审候选修复并完成关键异常路径实现与测试", todos: ["评审修复草案与业务规则的一致性", "补齐关键异常路径测试"] },
  { person: "林洁", responsibility: "组织门店灰度并协调现场执行", todos: ["准备门店灰度方案", "确认灰度执行清单与门店通知"] },
];

export const workTodoKey = (person: string, todo: string) => `${person}::${todo}`;
export const allCouponTodoKeys = () => couponWorkPlan.flatMap((member) => member.todos.map((todo) => workTodoKey(member.person, todo)));
