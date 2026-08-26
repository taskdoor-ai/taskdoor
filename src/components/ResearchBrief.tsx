import { CircleAlert, CircleCheck, CircleHelp, FileSearch } from "lucide-react";
import { AICitation } from "./AICitation";
import { SourcesList, type EnterpriseSource } from "./SourcesList";

type ResearchBriefProps = {
  sources: EnterpriseSource[];
};

const citations = [
  {
    description: "交易完成事件已包含订单、会员、券实例与完成状态，可作为自动核销触发条件。",
    label: 1,
    meta: "知识库 · 2 天前 · 可读取",
    title: "POS 交易事件字段说明",
  },
  {
    description: "历史故障显示，离线队列恢复后的事件重放可能导致重复消费。",
    label: 2,
    meta: "历史任务 · 4 个月前 · 可读取",
    title: "离线队列恢复导致重复事件",
  },
  {
    description: "最近的代码变更已经引入券实例维度的重试键，但退款链路尚未被资料覆盖。",
    label: 3,
    meta: "代码变更 · 19 天前 · 可读取",
    title: "coupon-retry 幂等键改动",
  },
];

// Composition based on 21st.dev AI Response #23818, AI Citation #23791,
// and AI Sources #23817. The result reads as one grounded brief, not four widgets.
export function ResearchBrief({ sources }: ResearchBriefProps) {
  return (
    <section className="research-brief">
      <header className="brief-header">
        <span className="brief-header-icon"><FileSearch size={18} /></span>
        <div><p>协作简报</p><h2>问题与判断</h2></div>
        <span className="brief-source-count">3 个来源</span>
      </header>

      <div className="brief-response">
        <p>
          目标是在 POS 交易完成后自动核销会员优惠券，同时保证退款、撤单和离线重试不会重复抵扣。现有交易事件已经具备所需标识
          <AICitation {...citations[0]} />，因此主要风险不在触发条件，而在异常路径是否共用同一个幂等边界。
        </p>
        <p>
          历史记录显示，离线队列恢复后的事件重放曾造成重复消费
          <AICitation {...citations[1]} />。近期重试逻辑虽已调整
          <AICitation {...citations[2]} />，但退款服务能否稳定读取原核销键仍需由负责人确认。
        </p>
      </div>

      <div className="evidence-ledger" aria-label="证据判断">
        <article className="evidence-item fact">
          <CircleCheck size={17} />
          <div><span>已验证事实</span><strong>完成事件具备自动核销所需的订单、会员与券实例标识。</strong></div>
          <AICitation {...citations[0]} />
        </article>
        <article className="evidence-item inference">
          <CircleAlert size={17} />
          <div><span>需要确认的推断</span><strong>重复抵扣更可能发生在离线恢复后的事件重放环节。</strong></div>
          <AICitation {...citations[1]} />
        </article>
        <article className="evidence-item unknown">
          <CircleHelp size={17} />
          <div><span>仍然未知</span><strong>退款服务是否能稳定读取并复用原核销幂等键。</strong></div>
          <AICitation {...citations[2]} />
        </article>
      </div>

      <footer className="brief-sources">
        <SourcesList defaultOpen={false} sources={sources} />
      </footer>
    </section>
  );
}
