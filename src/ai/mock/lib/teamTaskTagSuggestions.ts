import type { Locale } from "@/shared/i18n/core";
import type { TagAppearance, TaskTagSuggestions } from "@/shared/model/task-model";

type TaskContent = { title?: string; name?: string; goal?: string; completionCriteria?: readonly string[] };

const topics = [
  { zh: "会议", en: "Meetings", aliases: ["会务", "meeting"], evidence: /会议|例会|议程|\b(?:meetings|meeting (?:agenda|minutes|notes)|(?:schedule|host|organize|hold) (?:a |the )?meeting)\b/iu },
  { zh: "内容制作", en: "Content Production", aliases: ["内容", "content"], evidence: /文案|视频制作|制作视频|直播脚本|主视觉|内容制作|\b(?:copywriting|video production|content production)\b/iu },
  { zh: "投流增长", en: "Paid Marketing", aliases: ["营销", "marketing"], evidence: /投流|广告投放|投放预算|获客成本|\b(?:paid (?:ads|marketing|media)|ad spend|marketing campaign)\b/iu },
  { zh: "数据分析", en: "Data Analysis", aliases: ["数据", "数据复盘", "analytics"], evidence: /数据复盘|数据分析|指标归因|数据看板|\b(?:data analysis|analytics|data dashboards?)\b/iu },
  { zh: "达人商务", en: "Creator Partnerships", aliases: ["达人合作"], evidence: /达人|创作者合作|\b(?:creator partnerships?|influencer campaigns?|influencer outreach)\b/iu },
  { zh: "履约", en: "Fulfillment", aliases: ["发货", "fulfilment"], evidence: /发货|履约|备货|物流配送|\b(?:fulfill?ment|shipments?|shipping logistics)\b/iu },
  { zh: "合规审核", en: "Compliance", aliases: ["合规", "compliance review"], evidence: /合规|授权审查|隐私审查|\b(?:compliance|privacy review)\b/iu },
  { zh: "开发", en: "Development", aliases: ["研发", "software development"], evidence: /(?:合并|审查|审阅|评审)(?:接口|变更的|提交的)?代码|代码合并|代码审查|代码评审|接口开发|回归测试|缺陷修复|\b(?:pull requests?|code review|software development|api|bug fixes|regression tests?)\b/iu },
  { zh: "客户反馈", en: "Customer Feedback", aliases: ["用户反馈", "customer complaints", "user feedback"], evidence: /客户投诉|客户反馈|客户反映|用户反馈|用户投诉|\b(?:customer|user) (?:feedback|complaints?)\b/iu },
] as const;

const topicAppearance = {
  会议: { icon: "calendar-days", color: "blue" },
  内容制作: { icon: "sparkles", color: "purple" },
  投流增长: { icon: "megaphone", color: "teal" },
  数据分析: { icon: "chart-no-axes-column", color: "cyan" },
  达人商务: { icon: "handshake", color: "blue" },
  履约: { icon: "truck", color: "orange" },
  合规审核: { icon: "shield", color: "green" },
  开发: { icon: "code-xml", color: "blue" },
  客户反馈: { icon: "message-circle", color: "orange" },
} satisfies Record<typeof topics[number]["zh"], TagAppearance>;
const codeReview = /(?:合并|审查|审阅|评审)(?:接口|变更的|提交的)?代码|代码合并|代码审查|代码评审|\b(?:pull requests?|code review)\b/iu;

const normalize = (value: string) => value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();

function labelEvidence(name: string): RegExp | undefined {
  if ((name.match(/[\p{L}\p{N}]/gu)?.length ?? 0) < 2 || !/\p{L}/u.test(name)) return;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (/\p{Script=Han}/u.test(name)) return new RegExp(escaped, "u");
  return new RegExp(`(?<![\\p{Script=Latin}\\p{N}])${escaped}(?![\\p{Script=Latin}\\p{N}])`, "u");
}

export function suggestTeamTaskTags(task: TaskContent, catalog: readonly { name: string }[], locale: Locale = "zh-CN"): TaskTagSuggestions {
  const fields = [task.title || task.name || "", task.goal || "", task.completionCriteria?.join("\n") || ""].map(normalize);
  const score = (pattern?: RegExp) => fields.reduce((total, field, index) => total + (pattern?.test(field) ? fields.length - index : 0), 0);
  const classified = topics.map((topic) => ({ ...topic, score: score(topic.evidence) }));
  const candidates = catalog.map(({ name }) => {
    const key = normalize(name);
    const topic = classified.find((candidate) => [candidate.zh, candidate.en, ...candidate.aliases].some((alias) => normalize(alias) === key));
    return { name, key: topic?.zh ?? key, score: score(labelEvidence(key)) * 10 + (topic?.score ?? 0) };
  }).filter((candidate) => candidate.score > 0).sort((a, b) => b.score - a.score);

  const existing: string[] = [];
  const matchedTopics = new Set<string>();
  for (const candidate of candidates) {
    if (matchedTopics.has(candidate.key)) continue;
    matchedTopics.add(candidate.key);
    existing.push(candidate.name);
    if (existing.length === 3) break;
  }
  if (existing.length) return { existing };

  const [best, next] = classified.sort((a, b) => b.score - a.score);
  if (best.score <= next.score) return { existing };
  const appearance: TagAppearance = best.zh === "开发" && score(codeReview) ? { icon: "git-pull-request", color: "blue" } : topicAppearance[best.zh];
  return { existing, proposed: locale === "en" ? best.en : best.zh, appearance };
}
