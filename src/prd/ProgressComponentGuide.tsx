import React, { useEffect, useRef, useState, type ReactNode } from "react";
import model from "../../docs/product-v2/progress-component-model.json";

/** The inspector annotates the shared preview without changing product components. */
export function ProgressComponentGuide({ children, scenarioId }: { children: ReactNode; scenarioId: string }) {
  const container = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState("A02");
  const [located, setLocated] = useState(false);
  const [hoveredBadge, setHoveredBadge] = useState<{ id: string; name: string; left: number; top: number } | null>(null);
  const index = model.slots.findIndex(item => item.id === selected);
  const slot = model.slots[index];

  useEffect(() => { setHoveredBadge(null); }, [scenarioId]);

  const showBadgeName = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-prd-slot]");
    const definition = model.slots.find(item => item.id === target?.dataset.prdSlot);
    if (!target || !definition) { setHoveredBadge(null); return; }
    // Annotation badges are pseudo-elements; limit the tooltip to their hit area.
    const rect = target.getBoundingClientRect();
    const badge = getComputedStyle(target, "::before");
    const width = parseFloat(badge.width);
    const height = parseFloat(badge.height);
    const left = badge.left === "auto" ? rect.right - parseFloat(badge.right) - width : rect.left + parseFloat(badge.left);
    const top = rect.top + parseFloat(badge.top);
    if (event.clientX < left || event.clientX > left + width || event.clientY < top || event.clientY > top + height) {
      setHoveredBadge(null);
      return;
    }
    const x = Math.max(8, Math.min(left, window.innerWidth - 288));
    const y = Math.min(top + height + 6, window.innerHeight - 48);
    setHoveredBadge(previous => previous?.id === definition.id && previous.left === x && previous.top === y
      ? previous : { id: definition.id, name: definition.name, left: x, top: y });
  };

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    let targets: HTMLElement[] = [];
    const clear = () => { for (const target of targets) { delete target.dataset.prdSlot; delete target.dataset.prdSelected; } };
    const annotate = () => {
      clear();
      targets = [];
      let found = false;
      for (const item of model.slots) {
        const target = root.querySelector<HTMLElement>(item.selector);
        if (!target) continue;
        targets.push(target);
        target.dataset.prdSlot = item.id;
        target.dataset.prdSelected = String(item.id === selected);
        if (item.id === selected) found = true;
      }
      setLocated(found);
    };
    annotate();
    const observer = new MutationObserver(annotate);
    observer.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); clear(); };
  }, [selected, scenarioId]);

  const select = (id: string, reveal = false) => {
    setSelected(id);
    if (!reveal) return;
    const definition = model.slots.find(item => item.id === id);
    const target = definition && container.current?.querySelector<HTMLElement>(definition.selector);
    const scroll = viewport.current;
    if (target && scroll) {
      let details = target.closest("details");
      while (details) { details.open = true; details = details.parentElement?.closest("details") ?? null; }
      const offset = target.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
      scroll.scrollTo({ top: scroll.scrollTop + offset - 38, behavior: "auto" });
    }
  };

  return <div className="prd-component-inspector" onKeyDown={event => { if (event.key === "Escape") setHoveredBadge(null); }}>
    <section className="prd-model-template" aria-label="可点选的组件模板">
      <header><strong>组件模板</strong><span>点击内容区域或编号</span></header>
      <div className="prd-model-canvas" ref={viewport} tabIndex={0} aria-label="组件模板，可滚动查看子任务和燃起图" onScroll={() => setHoveredBadge(null)}>
        <div className="prd-state-samples" ref={container} onMouseMove={showBadgeName} onMouseLeave={() => setHoveredBadge(null)} onClickCapture={event => {
          const target = (event.target as HTMLElement).closest<HTMLElement>("[data-prd-slot]");
          if (target?.dataset.prdSlot) select(target.dataset.prdSlot);
        }}>{children}</div>
      </div>
      <footer>蓝色框对应右侧说明 · 下滑查看子任务与燃起图</footer>
    </section>
    <aside className="prd-model-inspector" aria-label="所选位置说明">
      <header className="prd-model-location-picker">
        <label htmlFor="prd-model-location">选择位置 <span>{String(index + 1).padStart(2, "0")} / {model.slots.length}</span></label>
        <select id="prd-model-location" value={selected} onChange={event => select(event.target.value, true)}>
          {model.slots.map(item => <option key={item.id} value={item.id}>{item.id} {item.name}</option>)}
        </select>
      </header>
      <div className="prd-model-explanation" aria-live="polite">
        <h2>{slot.name}</h2><p className="prd-model-location">{slot.location}</p>
        {!located && <p className="prd-model-absent">当前场景隐藏此位置，可切换场景查看。</p>}
        <dl>{[["展示什么", slot.content], ["数据来自哪里", slot.source], ["不同情况怎么显示", slot.fallback], ["怎么判断", slot.rule], ["交互", slot.interaction]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </div>
      <footer className="prd-model-detail-links" onClickCapture={event => {
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href*='#progress-']");
        if (!link || window.parent === window) return;
        // Reopen a closed reference even when navigating to the same hash again.
        try {
          let target = window.parent.document.getElementById(link.hash.slice(1));
          while (target) {
            if (target.tagName === "DETAILS") target.setAttribute("open", "");
            target = target.parentElement;
          }
          const scenario = /^#progress-case-(P\d{2})$/.exec(link.hash)?.[1];
          if (scenario && window.parent.location.hash === link.hash) {
            window.parent.document.querySelector<HTMLIFrameElement>('#progress-scenario-preview iframe')?.contentWindow
              ?.postMessage({type:"prd-progress-scenario",scenario}, "*");
          }
        } catch { /* The destination page also reveals references after navigation. */ }
      }}>
        <span>继续查看详情</span>
        <a href={`./agentdoor-prd.html#progress-slot-${slot.id}`} target="_top">{slot.id} 完整位置规范 ↗</a>
        <a href={`./agentdoor-prd.html#progress-case-${scenarioId}`} target="_top">{scenarioId} 场景详情与验收 ↗</a>
        <a href="./agentdoor-prd.html#progress-component-decisions" target="_top">判断顺序与组合规则 ↗</a>
        <a href="./agentdoor-prd.html#progress-component-events" target="_top">预测更新节点与状态变更 ↗</a>
      </footer>
      <nav className="prd-model-location-nav" aria-label="切换说明位置">
        <button type="button" disabled={index === 0} onClick={() => select(model.slots[index - 1].id, true)}>← 上一处</button>
        <button type="button" disabled={index === model.slots.length - 1} onClick={() => select(model.slots[index + 1].id, true)}>下一处 →</button>
      </nav>
    </aside>
    {hoveredBadge && <div role="tooltip" className="prd-model-badge-tooltip" style={{ left: hoveredBadge.left, top: hoveredBadge.top }}>{hoveredBadge.id} · {hoveredBadge.name}</div>}
  </div>;
}
