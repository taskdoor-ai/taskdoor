export type ResponsibilityDomain =
  | "coordination"
  | "creator-business"
  | "content"
  | "live-operations"
  | "merchandising"
  | "media-buying"
  | "analytics"
  | "compliance";

export type ResponsibilityAssignment = {
  domain: ResponsibilityDomain | null;
  matchedKeywords: string[];
  ownerId: string;
  reason: string;
};

export type ResponsibilityMember = {
  id: string;
  dynamicResponsibility?: string;
  availability?: string;
};

export const responsibilityKeywords: Readonly<Record<ResponsibilityDomain, readonly string[]>> = Object.freeze({
  coordination: Object.freeze(["目标", "预算", "统筹", "协同", "最终结果"]),
  "creator-business": Object.freeze(["达人", "筛选", "建联", "佣金", "谈判", "合作", "档期", "排期"]),
  content: Object.freeze(["内容", "卖点", "脚本", "话术", "素材", "短视频"]),
  "live-operations": Object.freeze(["直播", "场控", "彩排", "上线", "异常", "排期"]),
  merchandising: Object.freeze(["选品", "商品", "价格", "赠品", "库存", "履约"]),
  "media-buying": Object.freeze(["投流", "投放", "预算消耗", "定向", "人群包", "ROI"]),
  analytics: Object.freeze(["数据", "指标", "看板", "归因", "复盘", "GMV"]),
  compliance: Object.freeze(["合规", "广告法", "宣称", "合同", "平台规则", "审核"]),
});

const domains: readonly ResponsibilityDomain[] = [
  "coordination", "creator-business", "content", "live-operations",
  "merchandising", "media-buying", "analytics", "compliance",
];

const normalize = (text: string) => text.normalize("NFKC").toLowerCase();
const contains = (text: string, keyword: string) => normalize(text).includes(normalize(keyword));

const availabilityStatus = (value: string): 0 | 1 | 2 => {
  const availability = normalize(value);
  if (/不可|无法|已满|没有窗口|无窗口|无空档|休假|没有空|暂无|无可安排/.test(availability)) return 0;
  if (/可安排|可投入|可协调|有窗口|窗口|有空|可管理|可/.test(availability)) return 2;
  return 1;
};

const hitsFor = (text: string, domain: ResponsibilityDomain) =>
  responsibilityKeywords[domain].filter((keyword) => contains(text, keyword));

const primaryDomainsForResponsibility = (text: string): ResponsibilityDomain[] => {
  const counts = domains.map((domain) => ({ domain, count: hitsFor(text, domain).length }));
  const highest = Math.max(0, ...counts.map((item) => item.count));
  const primary = highest === 0 ? [] : counts.filter((item) => item.count === highest).map((item) => item.domain);
  return highest === 1 && primary.length > 1 ? [] : primary;
};

const allResponsibilityDomains = (text: string): ResponsibilityDomain[] =>
  domains.filter((domain) => hitsFor(text, domain).length > 0);

const domainForTask = (title: string, goal: string): { domain: ResponsibilityDomain | null; domains: ResponsibilityDomain[]; hits: string[] } => {
  const taskText = `${title} ${goal}`;
  const normalizedTask = normalize(taskText);
  const ranked = domains.map((domain, index) => {
    const titleHits = hitsFor(title, domain);
    const allHits = hitsFor(taskText, domain);
    const longestKeyword = allHits.reduce((max, keyword) => Math.max(max, keyword.length), 0);
    const firstPosition = allHits.reduce((min, keyword) => Math.min(min, normalizedTask.indexOf(normalize(keyword))), Number.POSITIVE_INFINITY);
    return { allHits, domain, firstPosition, index, longestKeyword, titleHits };
  }).sort((left, right) =>
    right.titleHits.length - left.titleHits.length ||
    right.allHits.length - left.allHits.length ||
    right.longestKeyword - left.longestKeyword ||
    left.firstPosition - right.firstPosition ||
    left.index - right.index,
  );
  const winner = ranked[0];
  const projectSignal = /项目|策划|目标|统筹/.test(normalizedTask);
  const coveredDomains = ranked.filter((candidate) => candidate.allHits.length > 0).length;
  const taskDomains = ranked.filter((candidate) => candidate.allHits.length > 0).map((candidate) => candidate.domain);
  if (projectSignal && coveredDomains >= 4) {
    const coordination = ranked.find((candidate) => candidate.domain === "coordination");
    if (coordination?.allHits.length) return { domain: "coordination", domains: taskDomains, hits: coordination.allHits };
  }
  return winner && winner.allHits.length > 0
    ? { domain: winner.domain, domains: taskDomains, hits: winner.allHits }
    : { domain: null, domains: [], hits: [] };
};

/** Assign a task using only the task text and members' explicit responsibility text. */
export function assignTaskByResponsibility(
  task: { title: string; goal: string },
  members: ResponsibilityMember[],
): ResponsibilityAssignment {
  const taskClassification = domainForTask(task.title, task.goal);
  if (!taskClassification.domain) {
    return { domain: null, matchedKeywords: [], ownerId: "", reason: "没有责任关键词命中，需要人工指定负责人。" };
  }

  const { domain } = taskClassification;
  const taskText = `${task.title} ${task.goal}`;
  const taskDomains = taskClassification.domains;
  const ranked = members.map((member, index) => {
    const responsibility = (member.dynamicResponsibility ?? "").trim();
    const primaryResponsibilityDomains = responsibility ? primaryDomainsForResponsibility(responsibility) : [];
    const responsibilityDomains = responsibility ? allResponsibilityDomains(responsibility) : [];
    const sharedDomains = taskDomains.filter((candidate) => responsibilityDomains.includes(candidate));
    const primaryDomainMatch = primaryResponsibilityDomains.includes(domain);
    const matchedKeywords = responsibility
      ? [...new Set(taskDomains.flatMap((candidate) => responsibilityKeywords[candidate]).filter((keyword) => contains(taskText, keyword) && contains(responsibility, keyword)))]
      : [];
    const availability = availabilityStatus(member.availability ?? "");
    return { availability, index, matchedKeywords, member, score: primaryDomainMatch ? sharedDomains.length * 100 + matchedKeywords.length : 0, sharedDomains };
  }).sort((left, right) =>
    right.score - left.score ||
    right.matchedKeywords.length - left.matchedKeywords.length ||
    right.availability - left.availability ||
    left.index - right.index,
  );

  const winner = ranked[0];
  if (!winner || winner.score === 0 || winner.sharedDomains.length === 0) {
    return {
      domain,
      matchedKeywords: taskClassification.hits,
      ownerId: "",
      reason: `责任文本未覆盖${domain}任务（任务命中：${taskClassification.hits.join("、")}），需要人工指定负责人。`,
    };
  }
  return {
    domain,
    matchedKeywords: winner.matchedKeywords,
    ownerId: winner.member.id,
    reason: winner.matchedKeywords.length > 0
      ? `责任命中：${winner.matchedKeywords.join("、")}；责任文本：${winner.member.dynamicResponsibility}`
      : `责任领域匹配：${domain === "content" ? "内容" : domain === "merchandising" ? "商品" : domain}；责任文本：${winner.member.dynamicResponsibility}`,
  };
}
