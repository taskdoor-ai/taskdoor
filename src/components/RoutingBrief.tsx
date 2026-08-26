import { AlertTriangle, ArrowRight, BookOpen, Check, FileText, GitCommitHorizontal, Link2, Network, Pencil, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { PersonAvatar } from "./PersonAvatar";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { CheckboxIndicator } from "./ui/Checkbox";

export type RouteChoice = "create" | "join";
export type RoutingScenario = "choice" | "create-only" | "direct";

type ContextItem = {
  access: string;
  id: string;
  label: string;
  meta: string;
  object: string;
  source: string;
  text: string;
  tone: "fact" | "risk" | "change";
  usage: string;
};

const contextItems: ContextItem[] = [
  { access: "保持原权限", id: "schema", label: "业务规则", meta: "零售业务资源库 / POS / 业务规则 · 周岚 · 2 天前", object: "PDF", source: "POS 优惠券核销业务规则 v3.2.pdf", text: "相关内容：交易完成后核销券实例；退款与撤单的恢复规则需要业务负责人确认。", tone: "fact", usage: "确认修复草案没有改变现行业务规则。" },
  { access: "保持原权限", id: "incident", label: "事故复盘", meta: "零售技术资源库 / 事故复盘 · 陈默 · 4 个月前", object: "DOCX", source: "离线交易重放事故复盘 2026-05-18.docx", text: "相关内容：门店恢复联网后重新生成请求标识，同一券实例被重复消费。", tone: "risk", usage: "复用真实故障条件验证修复是否有效。" },
  { access: "保持原权限", id: "commit", label: "AI 工作成果", meta: "AI 工作成果库 / 待审核草案 · 由你 · 刚刚", object: "PATCH", source: "coupon-retry 重放修复草案.patch", text: "相关内容：使用订单与券实例组成稳定幂等键，并补充离线重放保护。", tone: "change", usage: "让工程师直接评审草案，不必重新定位和编写。" },
];

type RoutingBriefProps = {
  includedContext?: string[];
  onContextChange?: (context: string[]) => void;
  onOwnerChange?: (owner: string[]) => void;
  onParticipantsChange?: (participants: string[]) => void;
  onRouteChange: (route: RouteChoice) => void;
  owner?: string;
  participants?: string[];
  route: RouteChoice;
  scenario?: RoutingScenario;
  showPreparation?: boolean;
};

const peopleReason: Record<string, { basis: string; role: string; signal: string }> = {
  "周岚": { basis: "负责 POS 交易域，能够确认核销边界与最终方案。", role: "方案责任人", signal: "组织责任" },
  "陈默": { basis: "19 天前修改 coupon-retry，熟悉当前重试逻辑。", role: "后端执行", signal: "近期变更" },
  "林洁": { basis: "持有门店灰度发布权限，能够协调验证窗口。", role: "发布授权", signal: "授权范围" },
  "高远": { basis: "具备零售事件与补偿队列经验，可参与异常路径验证。", role: "协作", signal: "能力匹配" },
  "梁川": { basis: "负责质量验证，可补充退款、撤单与离线重放用例。", role: "验证", signal: "质量责任" },
};

export function RoutingBrief({ includedContext = ["schema", "incident", "commit"], onContextChange, onOwnerChange, onParticipantsChange, onRouteChange, owner = "周岚", participants = ["陈默", "林洁"], route, scenario = "choice", showPreparation = true }: RoutingBriefProps) {
  const [editing, setEditing] = useState(false);
  const [understanding, setUnderstanding] = useState("个人 Codex 已定位离线事件重放会触发重复核销，并生成了修复草案。现在需要业务责任人确认退款与撤单规则，由工程和门店运营完成审核与灰度验证。");

  useEffect(() => {
    setEditing(false);
    setUnderstanding(scenario === "direct"
      ? "确认门店库存同步是否正常，并在出现延迟时找到当前用户可以执行的恢复操作。"
      : "个人 Codex 已定位离线事件重放会触发重复核销，并生成了修复草案。现在需要业务责任人确认退款与撤单规则，由工程和门店运营完成审核与灰度验证。");
  }, [scenario]);
  const toggleContext = (id: string) => {
    onContextChange?.(includedContext.includes(id) ? includedContext.filter((item) => item !== id) : [...includedContext, id]);
  };

  const peopleCandidates = Array.from(new Set(["周岚", "陈默", "林洁", owner, ...participants].filter(Boolean)));

  const togglePerson = (name: string) => {
    if (name === owner) {
      onOwnerChange?.([]);
      return;
    }
    if (participants.includes(name)) {
      onParticipantsChange?.(participants.filter((person) => person !== name));
      return;
    }
    if (name === "周岚" && !owner) {
      onOwnerChange?.([name]);
      return;
    }
    onParticipantsChange?.([...participants, name]);
  };

  return (
    <div className="routing-brief">
      {showPreparation && <section className="understanding-card">
        <header>
          <div><span>我们对问题的理解</span><strong>请先确认目标与边界</strong></div>
          <button aria-label={editing ? "完成编辑" : "修改问题理解"} onClick={() => setEditing((value) => !value)} type="button">
            {editing ? <Check size={15} /> : <Pencil size={14} />}{editing ? "完成" : "修改"}
          </button>
        </header>
        {editing ? (
          <textarea aria-label="问题理解" onChange={(event) => setUnderstanding(event.target.value)} rows={3} value={understanding} />
        ) : <p>{understanding}</p>}
        <div className="understanding-facts">
          {scenario === "direct" ? <>
            <span><b>对象</b> 门店库存同步状态</span>
            <span><b>想知道</b> 是否正常、最近同步时间</span>
            <span><b>处理方式</b> 查阅操作说明即可</span>
          </> : <>
            <span><b>已有成果</b> 根因定位与修复草案</span>
            <span><b>协作目标</b> 评审、合并并完成门店灰度</span>
            <span><b>人类判断</b> 退款与撤单的业务语义</span>
          </>}
        </div>
      </section>}

      {scenario !== "create-only" && <section className="route-decision">
        <div className="section-title-row">
          <div><span>建议如何继续</span><h2>{scenario === "choice" ? "选择这次请求的去向" : "这个问题可以直接处理"}</h2></div>
          <small>{scenario === "direct" ? "无需创建任务" : "确认前不会创建任务"}</small>
        </div>
        {scenario === "choice" ? <><div className="route-options">
          <button className={route === "create" ? "selected" : ""} onClick={() => onRouteChange("create")} type="button">
            <span className="route-option-icon"><Network size={18} /></span>
            <span><small>推荐</small><strong>创建新的协作</strong><p>需要 POS 责任人、后端执行者与发布授权共同确认。</p></span>
            <i>{route === "create" && <Check size={12} />}</i>
          </button>
          <button className={route === "join" ? "selected" : ""} onClick={() => onRouteChange("join")} type="button">
            <span className="route-option-icon"><Link2 size={18} /></span>
            <span><small>发现 1 个相关任务</small><strong>申请加入“券核销重复消费治理”</strong><p>任务目标相近，当前由许宁负责。</p></span>
            <i>{route === "join" && <Check size={12} />}</i>
          </button>
        </div>
        {route === "join" && (
          <div className="related-task-preview">
            <div><span className="related-task-meta"><b>关联任务</b><TaskStatusBadge size="sm" value="进行中" /></span><strong>券核销重复消费治理</strong><p>正在验证消息重放与重复消费；尚未覆盖退款、撤单路径。</p></div>
            <button type="button">查看任务 <ArrowRight size={13} /></button>
          </div>
        )}</> : (
          <div className="direct-resolution">
            <span className="route-option-icon"><BookOpen size={18} /></span>
            <div><small>直接结果</small><strong>在「门店运营 → 库存同步」查看最近一次同步状态</strong><p>状态超过 10 分钟未更新时，可直接运行“重新同步”操作；当前账号具备查看权限。</p><em><FileText size={12} />门店库存同步操作说明 · 更新于 5 天前</em></div>
          </div>
        )}
      </section>}

      {showPreparation && scenario !== "direct" && <section className="context-pack">
        <div className="section-title-row">
          <div><span>企业资源库</span><h2>选择需要带入协作的文件</h2></div>
          <small>已选择 {includedContext.length}/{contextItems.length} 个文件</small>
        </div>
        <div className="task-context-list">
          {contextItems.map((item) => {
            const included = includedContext.includes(item.id);
            const Icon = item.tone === "fact" ? BookOpen : item.tone === "risk" ? AlertTriangle : GitCommitHorizontal;
            return (
              <button aria-pressed={included} className={`${item.tone} ${included ? "included" : "excluded"}`} key={item.id} onClick={() => toggleContext(item.id)} type="button">
                <span className="task-context-icon"><Icon size={17} /></span>
                <span className="task-context-object"><small>文件类型</small><strong>{item.object}</strong><em>{item.label}</em></span>
                <span className="task-context-copy"><small>{item.meta}</small><strong>{item.source}</strong><em>{item.text}</em></span>
                <span className="task-context-purpose"><small>引用目的</small><strong>{item.usage}</strong></span>
                <span className="task-context-toggle"><CheckboxIndicator checked={included} /><b>{included ? "已选择" : "选择"}</b></span>
              </button>
            );
          })}
          <footer><span>已选择 {includedContext.length} 个资源库文件</span><small>确认后共享相关内容摘要与文件引用；打开原文件仍按资源库权限校验</small></footer>
        </div>
        {includedContext.length < contextItems.length && (
          <button className="restore-context" onClick={() => onContextChange?.(contextItems.map((item) => item.id))} type="button"><RotateCcw size={13} />恢复建议上下文</button>
        )}
        <div className="context-note"><X size={13} /><span>不会复制完整文件，也不会改变企业资源库中的访问权限。</span></div>
      </section>}

      {scenario !== "direct" && <section className="people-rationale">
        <div className="section-title-row">
          <div><span>{route === "join" ? "已有任务的协作关系" : "建议协作的人"}</span><h2>协作者与判断依据</h2></div>
          <small>{route === "join" ? "加入后沿用任务责任关系" : "右侧修改后会同步更新"}</small>
        </div>

        {route === "create" ? (
          <div className="people-rationale-list">
            {peopleCandidates.map((name) => {
              const included = name === owner || participants.includes(name);
              const reason = peopleReason[name] ?? { basis: "与你的问题涉及范围匹配，建议加入本次协作。", role: "协作", signal: "能力匹配" };
              const displayedRole = name === owner ? "方案责任人" : reason.role;
              return (
                <button aria-pressed={included} className={`person-choicebox ${included ? "included" : "excluded"}`} key={name} onClick={() => togglePerson(name)} type="button">
                  <div className="person-choicebox-head"><PersonAvatar name={name} size="md" status={name === owner ? "online" : undefined} /><div className="people-rationale-name"><strong>{name}</strong><span>{peopleReason[name] ? "建议协作者" : "补充协作者"}</span></div></div>
                  <div className="person-responsibility"><small>责任</small><strong>{displayedRole}</strong></div>
                  <div className="people-rationale-basis"><small>判断依据 · {reason.signal}</small><p>{reason.basis}</p></div>
                  <span className="person-selection"><CheckboxIndicator checked={included} /><b>{included ? "已选择" : "选择"}</b></span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="join-team-summary">
            <PersonAvatar name="许宁" size="md" status="online" />
            <div><span>当前拥有者</span><strong>许宁</strong><p>负责“券核销重复消费治理”；你的请求会补充退款与撤单路径。</p></div>
            <span className="join-match">目标重合 · 78%</span>
          </div>
        )}
      </section>}
    </div>
  );
}
