import fixtures from './taskCriterionReviewMocks.json';
import type { TaskNode, WorkspaceNode } from './workspaceNodes';
import type { CriterionReview } from '../lib/taskCriterionReview';

type DemoReview = CriterionReview & { evidenceEn: string };
type Fixture = { name: string; goal: string; reviews: DemoReview[] };
const catalog: Record<string, Fixture> = fixtures;
const sunGoal = '统筹新品防晒衣抖音达人带货项目，以 9 月 15 日上线和 GMV 50 万为目标，协调达人、内容、直播、商品、投流、数据和合规交付。';
const demo = (text: string, percent: number | null, zh: string, en: string): DemoReview => ({text, analysis:{percent,evidence:`示例评估：${zh}`,observedAt:'2026-09-14T17:30:00+08:00'},evidenceEn:`Demo assessment: ${en}`});
const sunReviews: Record<string, DemoReview[]> = {
  '新品防晒衣抖音达人带货项目': [
    demo('9 月 15 日按已确认排期上线，商品、达人内容与履约准备就绪。',65,'商品与大部分达人已准备，素材复核、仓库签回及正式彩排仍待完成。','Commerce and most creators are ready; asset review, warehouse sign-off and rehearsal remain open.'),
    demo('活动 GMV 达到 50 万，交付可核对的销售数据及复盘。',null,'尚未上线，无成交记录；不能将准备进度作为 GMV 完成度。','The campaign has not launched; preparation does not establish GMV attainment.'),
  ],
  '筛选达人并确认商务合作':[demo('交付已确认合作的达人名单、报价、排期及合作协议。',75,'12 位候选中 9 位已有报价与档期确认，3 位仍待回复。','Nine of twelve creators have confirmed quotes and dates; three responses are pending.')],
  '完成卖点、脚本与直播素材':[demo('交付通过审核的卖点文案、直播脚本及可用素材。',50,'4 条脚本中 2 条素材通过核对，剩余两条待补拍与审核。','Two of four script assets passed review; the remaining two need reshoots and approval.')],
  '完成直播彩排与上线执行':[demo('完成彩排和问题闭环，按确认排期上线并留存执行记录。',20,'设备联调完成，正式彩排、问题关闭和上线执行均待开展。','Equipment checks are complete; rehearsal, issue closure and the live event remain pending.')],
  '确认价格机制、库存与履约':[demo('确认最终价格及优惠配置，备货、发货与售后方案可执行。',80,'价格与库存已核对，仓库尚未签回履约时效和缺货替代方案。','Prices and stock are checked; warehouse delivery commitments and stockout alternatives await sign-off.')],
  '制定投流计划并控制 ROI':[demo('交付确认后的投流计划和执行记录，ROI 按约定口径核对。',35,'投流计划已有草案，尚无执行记录，ROI 还不能核对。','A media plan draft exists; execution records and verifiable ROI are not available yet.')],
  '搭建数据看板并完成复盘':[demo('销售与投流数据可核对，复盘包含结论、问题及后续行动。',null,'只有看板框架，实际销售与投流数据尚未产生。','Only the dashboard framework exists; actual sales and media data are not available.')],
  '完成素材宣称与合同合规审核':[demo('交付素材与合同审核记录，需整改事项在上线前关闭。',70,'首轮审核记录已齐，2 处防晒宣称仍需补证明并复核。','First-round review records are complete; two sun-protection claims require evidence and re-review.')],
};

function matchingReviews(task: TaskNode): DemoReview[] | undefined {
  const fixture = catalog[task.id];
  const reviews = fixture && task.name === fixture.name && (task.goal ?? '') === fixture.goal ? fixture.reviews
    : task.createdFrom === 'task-planner' && task.teamId === 'creator-commerce' && task.goal === sunGoal ? sunReviews[task.name] : undefined;
  return reviews && JSON.stringify(task.completionCriteria) === JSON.stringify(reviews.map(item=>item.text)) ? reviews : undefined;
}
/** Add authored demo records once; even an empty record array is a user's explicit state. */
export function applyCriterionReviewMocks(nodes: WorkspaceNode[]): WorkspaceNode[] {
  let changed = false;
  const next = nodes.map(node => {
    if (node.kind !== 'task' || Object.hasOwn(node,'criterionReviews')) return node;
    const reviews = matchingReviews(node);
    if (!reviews) return node;
    changed = true;
    return {...node,criterionReviews:reviews.map(({evidenceEn: _translation,...review})=>({...review,analysis:review.analysis?{...review.analysis}:undefined,confirmation:review.confirmation?{...review.confirmation}:undefined}))};
  });
  return changed ? next : nodes;
}
const evidenceEnglish = new Map([...Object.values(catalog).flatMap(f=>f.reviews),...Object.values(sunReviews).flat()].map(review=>[review.analysis!.evidence,review.evidenceEn]));
export function criterionDemoEvidence(evidence: string, locale: string) { return locale === 'en' ? evidenceEnglish.get(evidence) ?? evidence : evidence; }
