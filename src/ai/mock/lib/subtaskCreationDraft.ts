import { creatorCommercePrompt } from "@/ai/mock/data/creatorCommerceScenario";
import type { SubtaskDraftRequest } from "@/features/tasks/lib/task-subtask-draft";

type MockSubtaskDraft = {
  title: string;
  goal: string;
  completionCriteria: string[];
  ownerId: string;
  participantIds: string[];
  endDate: string;
  labels: string[];
};

const compact = (value: string) => value.normalize("NFKC").replace(/\s+/gu, "");
const fixtureKey = (value: string) => compact(value)
  .replace(/(\d{1,2})月(\d{1,2})日/g, "$1/$2")
  .replace(/[，,。.!！?？]$/u, "")
  .toLowerCase();

function usableDate(year: string, month: string, day: string, currentDate: string) {
  const value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= currentDate ? value : "";
}

function explicitDeadline(request: Pick<SubtaskDraftRequest, "prompt" | "currentDate">) {
  const prompt = request.prompt.normalize("NFKC");
  const matched = prompt.match(/(?:截止(?:日期)?\s*[:：]?|\b(?:due(?:\s+date)?|deadline)\s*[:：]?)\s*(\d{4})\s*[-/年]\s*(\d{1,2})\s*[-/月]\s*(\d{1,2})日?(?!\d)/iu);
  if (!matched) return "";
  return usableDate(matched[1], matched[2], matched[3], request.currentDate);
}

function explicitOwner(request: Pick<SubtaskDraftRequest, "prompt" | "members">) {
  const named = request.prompt.match(/(?:负责人|assignee)\s*[:：]\s*([^，,。;；\n]+)/iu)?.[1]
    ?? request.prompt.match(/由\s*([^，,。;；\n]+?)\s*负责/u)?.[1];
  if (!named) return "";
  const matching = request.members.filter(member => member.name === named.trim() || member.id === named.trim());
  return matching.length === 1 ? matching[0].id : "";
}

export function getMockTaskRequirementDefinition(request: Pick<SubtaskDraftRequest, "prompt" | "locale">): Pick<MockSubtaskDraft, "title" | "goal" | "completionCriteria"> {
  const prompt = request.prompt.trim();
  const chinese = /\p{Script=Han}/u.test(prompt);
  const clean = (value: string) => value.trim()
    .replace(/^(?:请\s*(?:帮我\s*)?|帮我\s*|我想\s*|我需要\s*|please\s+|could you\s+|can you\s+|i need to\s+)/iu, "").trim();
  const clauses = prompt.split(/[。！？；;\r\n]+|[.!?](?=\s|$)/u).map(clean).filter(Boolean);
  const first = clauses[0]?.split(/[，,]/u, 1)[0].trim() ?? "";
  if (!first || /^(?:收到|好的|谢谢|明白|ok|thanks|thank you)$/iu.test(first)) {
    throw new Error(chinese || request.locale !== "en" ? "请补充这项任务需要完成的具体内容。" : "Describe the work this task should complete.");
  }
  const titleLimit = chinese ? 42 : 72;
  const title = Array.from(first).slice(0, titleLimit).join("").trim();
  const goal = prompt.match(/(?:^|[，,。；;\n])\s*(?:目标(?:是|为)?|用途|用于|goal\s*[:：]|objective\s*[:：])\s*[:：]?\s*([^。！？；;\n]+)/iu)?.[1].trim() ?? "";
  const comparable = (value: string) => compact(value).replace(/[，。,.！!？?]/gu, "");
  const completionCriteria = [...new Set(clauses.flatMap(clause => clause.match(/[\s\S]{1,2000}/gu) ?? []))].slice(0, 30);
  return {
    title,
    goal: comparable(title) === comparable(goal) ? "" : goal.slice(0, 2000),
    completionCriteria,
  };
}

/** A deterministic PM Demo draft for one user-specified child task. */
export function getMockSubtaskCreationDraft(request: SubtaskDraftRequest): { draft: MockSubtaskDraft; message: string } {
  if (fixtureKey(request.prompt) === fixtureKey(creatorCommercePrompt)) {
    return { draft: {
      title: "策划新品防晒衣抖音达人带货",
      goal: "11 月 15 日上线新品防晒衣抖音达人带货，目标 GMV 50 万。",
      completionCriteria: [
        "完成达人筛选，明确本次带货达人名单。",
        "完成本次带货的脚本素材准备。",
        "完成本次抖音带货的直播执行。",
        "核对本次带货的商品库存和价格。",
        "完成本次带货投流。",
        "完成数据复盘，核对实际 GMV 与 50 万目标。",
        "完成本次带货的合规审核。",
      ],
      ownerId: "", participantIds: [], endDate: usableDate(request.currentDate.slice(0, 4), "11", "15", request.currentDate), labels: [],
    }, message: "" };
  }
  if (compact(request.prompt).replace(/[。.!！]$/u, "") === "补齐模板" && /状态页.*模板/u.test(request.parentTask.title)) {
    const multilingual = request.parentTask.title.includes("多语言");
    return { draft: {
      title: multilingual ? "补齐状态页多语言模板缺口" : "补齐状态页模板缺口",
      goal: "让状态页发布更新时有对应模板可复用。",
      completionCriteria: [multilingual ? "缺失的状态页多语言模板已补齐，可用于对应的状态更新。" : "缺失的状态页模板已补齐，可用于对应的状态更新。"],
      ownerId: "", participantIds: [], endDate: "", labels: [],
    }, message: "" };
  }
  return { draft: {
    ...getMockTaskRequirementDefinition(request),
    ownerId: explicitOwner(request), participantIds: [], endDate: explicitDeadline(request), labels: [],
  }, message: "" };
}
