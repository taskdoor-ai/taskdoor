import type { PersonOption } from '../data/sharedTypes';
import type { Locale } from './core';
import { globalUiText } from './globalUi';
import { mockPersonName } from './mockContent';

const keywords: Record<string, string> = {
  达人: 'creators', 筛选: 'selection', 建联: 'outreach', 商务: 'partnerships', 佣金: 'commission',
  报价: 'pricing', 档期: 'availability', 排期: 'scheduling', 合作: 'collaboration',
  内容: 'content', 卖点: 'selling points', 脚本: 'scripts', 话术: 'talking points', 素材: 'assets',
  直播: 'livestreams', 场控: 'live production', 彩排: 'rehearsals', 上线: 'launch',
  商品: 'products', 选品: 'assortment', 价格: 'pricing', 赠品: 'gifts', 库存: 'inventory',
  履约: 'fulfillment', 投流: 'paid media', 投放: 'advertising', 预算: 'budget',
  定向: 'targeting', 人群: 'audiences', ROI: 'ROI', 数据: 'data', 指标: 'metrics',
  看板: 'dashboards', 归因: 'attribution', 复盘: 'retrospectives', 合规: 'compliance',
  广告法: 'advertising regulations', 合同: 'contracts', 平台规则: 'platform policies',
  协调: 'coordination', 目标: 'goals', 决策: 'decisions',
};
/** Exact templates from the local recommender; custom/server explanations are preserved. */
export function recommendationReason(locale: Locale, person: Pick<PersonOption, 'id' | 'name'>, reason: string) {
  if (locale !== 'en') return reason;
  const name = mockPersonName(locale, person.id, person.name);
  if (reason === `当前任务描述与${person.name}的责任记录缺少直接命中，建议结合实际经验与可用时间再确认。`) {
    return globalUiText(locale, '当前任务描述与{name}的职责记录缺少直接匹配，建议结合实际经验与可用时间再确认。', { name });
  }
  const match = reason.match(/^任务中的“([^”]+)”与([\s\S]+)的责任范围直接匹配。$/);
  if (!match || match[2] !== person.name) return reason;
  const terms = match[1].split('、');
  if (terms.some(term => !keywords[term])) return reason;
  return globalUiText(locale, '任务中的{keywords}与{name}的职责范围直接匹配。', {
    name, keywords: terms.map(term => keywords[term]).join(', '),
  });
}
