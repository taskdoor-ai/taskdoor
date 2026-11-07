import type { DiscussionSubtaskRequest, DiscussionSubtaskResult } from "@/features/tasks/lib/discussion-subtask-draft";

// Prepared results for the existing synthetic conversations only. Edited or new
// discussions must use the generation service; this lookup is not an AI parser.
const examples = [
  { id: "ccx-double11-presale", name: "完成双十一预售商品与履约准备", reporter: "梁川", title: "核对双十一预售准备并回传结论", goal: "让负责人掌握预售商品、投放和履约准备的核对结论，确定下一步安排。" },
  { id: "ccx-double11-assortment-gate", name: "签发双十一预售选品结论", reporter: "梁川", title: "核对双十一预售选品并回传结论", goal: "让负责人根据最新核对信息确认预售入选商品、退出项和待观察项的边界。" },
] as const;
const replyBody = "收到，我会在本轮完成前核对并回传结论。";

export function getMockDiscussionSubtaskDraft(request: DiscussionSubtaskRequest): DiscussionSubtaskResult | undefined {
  const example = examples.find(item => item.id === request.task.id && item.name === request.task.title);
  if (!example || !request.contextComplete || request.messages.length !== 2) return;
  const rootId = `${example.id}-activity`;
  const replyId = `${example.id}-activity-reply`;
  const rootBody = `已补充“${example.name}”的最新核对信息，等待 Task Owner 确认下一步。`;
  const root = request.messages.find(message => message.id === rootId);
  const reply = request.messages.find(message => message.id === replyId);
  if (!root || root.author !== example.reporter || root.body !== rootBody || root.replyToId || !reply || reply.author !== "周岚" || reply.body !== replyBody || reply.replyToId !== rootId) return;
  if (!(request.source.messageId === replyId && request.source.body === replyBody && request.source.author === reply.author || request.source.messageId === rootId && request.source.body === rootBody && request.source.author === root.author)) return;
  return { draft: { title: example.title, goal: example.goal, ownerId: request.members.find(member => member.id === reply.author)?.id ?? "", endDate: "", labels: [] }, message: "" };
}
