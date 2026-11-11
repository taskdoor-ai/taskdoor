import type { TaskActivityMock, TaskNode } from "@/shared/model/task-model";
import { getSubtaskSuggestionContextKey, getSubtaskSuggestionDiscussionContextKey, type SubtaskSuggestion } from "@/features/tasks/lib/task-subtask-suggestions";

type Sample = { taskId: string; message: TaskActivityMock; itemKey: string; title: string; goal: string; completionCriteria: string[]; ownerId: string };
const taskId = "ccx-serum-launch";
const samplePrefix = "serum-subtask-suggestion-example-20261021";
const assignmentId = `${samplePrefix}-assignment`;
const serumAssignment: TaskActivityMock = {
  id: assignmentId, author: "周岚", type: "member-post", createdAt: "2026-10-21T14:30:00+08:00", time: "2026-10-21 14:30",
  message: "秋季抗老精华首发复盘还有三项具体修订需要跟进：高远负责手机领券入口，梁川负责视频号订单通知的售后链接，韩序补齐复盘退款数据的观察截止日。先按这三项分别处理；达人合作和内容交付仍在原任务里推进，不重复拆。",
};
const serumSamples: Sample[] = [
  {
    taskId, itemKey: "mobile-coupon-button", title: "修复首发移动端领券入口", ownerId: "高远",
    goal: "让手机用户能够正常领取首发优惠券。",
    completionCriteria: ["手机窄屏下领券按钮不被底部浮层遮挡，能够点击并领取优惠券"],
    message: { id: `${samplePrefix}-mobile-coupon`, author: "高远", type: "member-reply", replyToActivityId: assignmentId, createdAt: "2026-10-21T14:31:00+08:00", time: "2026-10-21 14:31",
      message: "首发领券入口这项我负责跟进。现在手机窄屏下按钮会被底部浮层遮住，我先联系页面同事修正，再用手机核对按钮可见、可点击并能正常领券。本项只处理这个入口，不重做首发内容方案。" },
  },
  {
    taskId, itemKey: "channel-order-link", title: "修正首发售后通知链接", ownerId: "梁川",
    goal: "让首发订单用户能从通知中进入对应的售后页面。",
    completionCriteria: ["视频号首发订单通知的售后链接能打开对应订单的售后页面", "无效订单或已失效链接显示可理解的提示，不跳到无关订单"],
    message: { id: `${samplePrefix}-channel-order`, author: "梁川", type: "member-reply", replyToActivityId: assignmentId, createdAt: "2026-10-21T14:32:00+08:00", time: "2026-10-21 14:32",
      message: "首发售后入口我来负责。视频号订单通知的链接目前会进入空白页，我会找渠道方修正并核对：有效订单能打开对应售后页面，无效订单或失效链接给出清楚提示，不跳到其他订单。这项单独跟进，不改现有商品价格和库存方案。" },
  },
  {
    taskId, itemKey: "refund-observation-export", title: "补齐首发复盘退款截止日", ownerId: "韩序",
    goal: "让复盘资料的阅读者能够正确理解退款数据的观察范围。",
    completionCriteria: ["导出的首发复盘资料在退款数据旁标明实际观察截止日", "缺少观察截止日时如实标明未提供，不用导出日期代替"],
    message: { id: `${samplePrefix}-refund-export`, author: "韩序", type: "member-reply", replyToActivityId: assignmentId, createdAt: "2026-10-21T14:33:00+08:00", time: "2026-10-21 14:33",
      message: "我负责补齐首发复盘导出的退款观察截止日，让阅读者知道数据覆盖到哪天。拿不到实际截止日的地方会标明未提供，不拿导出日期代替；本项只补这处导出信息，不重做现有归因看板。" },
  },
];

const residentTaskId = "demo-autumn-creator-event";
const residentText = (text: string) => text.replaceAll("秋季抗老精华首发", "秋季新品达人专场").replaceAll("首发", "专场");
const residentMessageId = (id: string) => id.replace("serum-", "autumn-event-");
const residentMessage = (message: TaskActivityMock): TaskActivityMock => ({
  ...message, id: residentMessageId(message.id), message: residentText(message.message),
  ...(message.replyToActivityId ? { replyToActivityId: residentMessageId(message.replyToActivityId) } : {}),
});
// The resident demo uses its own source identities; this does not restore any deleted task.
const historicalSamples: Sample[] = [
  ...serumSamples,
  ...serumSamples.map((sample): Sample => ({
    ...sample, taskId: residentTaskId, title: residentText(sample.title), goal: residentText(sample.goal),
    completionCriteria: sample.completionCriteria.map(residentText), message: residentMessage(sample.message),
  })),
];

const reviewPrefix = "serum-review-footnote-example-20261021";
const serumReviewDiscussion: TaskActivityMock = {
  id: `${reviewPrefix}-discussion`, author: "周岚", type: "member-post", createdAt: "2026-10-21T14:40:00+08:00", time: "2026-10-21 14:40",
  message: "秋季抗老精华首发复盘资料的导出脚注有一处口径问题：表格写“成交渠道”，图注写“下单来源”，文末说明又写“来源渠道”，读者会当成三个不同指标。这次请韩序把这三处统一为“成交渠道”，并沿用同一份渠道名称对照；只修导出资料的脚注。",
};
const serumReviewSample: Sample = {
  taskId, itemKey: "review-channel-footnote", title: "统一首发复盘导出渠道脚注", ownerId: "韩序", goal: "", completionCriteria: [],
  message: {
    id: `${reviewPrefix}-owner`, author: "韩序", type: "member-reply", replyToActivityId: serumReviewDiscussion.id,
    createdAt: "2026-10-21T14:41:00+08:00", time: "2026-10-21 14:41",
    message: "复盘导出渠道脚注这项我负责。我会把表格、图注和文末说明的用词统一，并核对同一份渠道名称对照；这几处一起修，不另外拆工作。",
  },
};
const keyVisualTaskId = "product-launch-promo-key-visual";
const keyVisualSamples: Sample[] = [
  {
    taskId: keyVisualTaskId, itemKey: "key-visual-final-review", title: "核对主视觉品牌、产品信息和版权", ownerId: "林洁",
    goal: "确保定稿母版中的品牌标识和产品信息准确，所有素材均可用于发布。",
    completionCriteria: ["逐项核对品牌标识、产品名称和卖点，并记录图片及字体的授权结论。"],
    message: {
      id: `${keyVisualTaskId}-demo-final-review`, author: "林洁", type: "member-post", createdAt: "2026-09-08T10:30:00+08:00", time: "2026-09-08 10:30",
      message: "主视觉发定稿前，我会核对母版上的品牌标识、产品名称和卖点，查清用到的图片及字体授权，把每项核对结论留档。",
    },
  },
  {
    taskId: keyVisualTaskId, itemKey: "key-visual-usage-guide", title: "编制主视觉母版使用规范", ownerId: "林洁",
    goal: "让后续使用母版的人知道哪些视觉规则必须保留。",
    completionCriteria: ["母版附上字体与色值、最小留白及安全区的说明和标注图。"],
    message: {
      id: `${keyVisualTaskId}-demo-usage-guide`, author: "林洁", type: "member-post", createdAt: "2026-09-08T10:40:00+08:00", time: "2026-09-08 10:40",
      message: "我会在母版旁补一份使用规范，写清用什么字体和色值、四周最少留多少空白，并用标注图画出内容安全区。",
    },
  },
];
// A new issue has its own identity; the three historical assignments above never become new suggestions.
const samples: Sample[] = [serumReviewSample, {
  ...serumReviewSample, taskId: residentTaskId, title: residentText(serumReviewSample.title), message: residentMessage(serumReviewSample.message),
}, ...keyVisualSamples];

/** Local synthetic conversations between demo members; none reproduces a remote member's message. */
export function getMockSubtaskSuggestionActivities(parentTaskId: string): TaskActivityMock[] {
  if (parentTaskId === keyVisualTaskId) return keyVisualSamples.map(sample => structuredClone(sample.message));
  const assignment = parentTaskId === taskId ? serumAssignment : parentTaskId === residentTaskId ? residentMessage(serumAssignment) : undefined;
  if (!assignment) return [];
  const reviewDiscussion = parentTaskId === taskId ? serumReviewDiscussion : residentMessage(serumReviewDiscussion);
  return [structuredClone(assignment),
    ...historicalSamples.filter(sample => sample.taskId === parentTaskId).map(sample => structuredClone(sample.message)),
    structuredClone(reviewDiscussion), ...samples.filter(sample => sample.taskId === parentTaskId).map(sample => structuredClone(sample.message))];
}

type ExistingChild = Pick<TaskNode, "id" | "sourceDiscussion"> & { name?: string; title?: string };
type MockSuggestionInput = {
  taskId: string;
  messages: readonly TaskActivityMock[];
  childTasks: readonly ExistingChild[];
};
type SampleFields = Omit<Sample, "message">;

function makeMockSuggestion(sample: SampleFields, id: string, message: TaskActivityMock, discussionContextKey: string): SubtaskSuggestion {
  return { id, title: sample.title, goal: sample.goal, completionCriteria: [...sample.completionCriteria], ownerId: sample.ownerId, endDate: "",
    ...(typeof window !== "undefined" && new URLSearchParams(window.location.search).get("subtask-preview") === "partial" && sample.itemKey === "key-visual-final-review"
      ? { contextGap: "授权清单暂未读取，尚不能确认图片和字体是否已有核对记录。请补齐资料后重新整理。" } : {}),
    source: { taskId: sample.taskId, messageId: message.id, body: message.message, author: message.author, itemKey: sample.itemKey },
    contextKey: getSubtaskSuggestionContextKey(message), discussionContextKey };
}

const savedTaskTitle = (task: ExistingChild) => (task.name ?? task.title ?? "").trim();
const matchesSavedDemoText = (message: TaskActivityMock & { deletedAt?: string }, text: string) =>
  !message.deletedAt && message.message.trim().replace(/。$/, "") === text;

/** Fixture lookup only: an arbitrary or edited discussion is not interpreted as a semantic AI result. */
export function getMockSubtaskSuggestions({ taskId: parentTaskId, messages, childTasks }: MockSuggestionInput): SubtaskSuggestion[] {
  const preparedMessages = getMockSubtaskSuggestionActivities(parentTaskId);
  return samples.filter(sample => sample.taskId === parentTaskId).flatMap(sample => {
    const message = messages.find(item => item.id === sample.message.id) as (TaskActivityMock & { deletedAt?: string }) | undefined;
    if (!message || message.deletedAt || getSubtaskSuggestionContextKey(message) !== getSubtaskSuggestionContextKey(sample.message)) return [];
    const discussionContextKey = getSubtaskSuggestionDiscussionContextKey(sample.message.id, preparedMessages);
    if (!discussionContextKey || getSubtaskSuggestionDiscussionContextKey(message.id, messages) !== discussionContextKey) return [];
    const covered = childTasks.some(task => {
      const source = task.sourceDiscussion;
      return source?.taskId === parentTaskId && source.messageId === message.id && source.itemKey === sample.itemKey
        || savedTaskTitle(task) === sample.title;
    });
    if (covered) return [];
    const id = sample.taskId === keyVisualTaskId ? message.id : `${reviewPrefix}${sample.taskId === taskId ? "" : `:${sample.taskId}`}:${sample.itemKey}`;
    return [makeMockSuggestion(sample, id, message, discussionContextKey)];
  });
}

const rehearsalSample: SampleFields = {
  taskId: "product-launch-flow-rehearsal", itemKey: "rehearsal-microphone-handoff",
  title: "复核联排备用麦切换与补播提示", ownerId: "高远",
  goal: "避免联排切换无线麦时遗漏主持人的首句。",
  completionCriteria: ["复测备用麦切换，确认首句能听清；仍有遗漏时，记录并核对补播提示。"],
};

/** Only these local demo inputs have a prepared new result. Unknown versions remain pending. */
export function getMockRefreshedSubtaskSuggestions({ taskId: parentTaskId, messages, childTasks }: MockSuggestionInput): SubtaskSuggestion[] {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("subtask-preview") === "failed") {
    throw new Error("暂时无法整理建议，原建议和输入已保留，请稍后重试。");
  }
  if (parentTaskId === keyVisualTaskId) {
    const baseline = keyVisualSamples[0];
    const baselineContext = getSubtaskSuggestionContextKey(baseline.message);
    const root = messages.find(message => getSubtaskSuggestionContextKey(message) === baselineContext);
    if (!root) return [];
    const reply = messages.find(message => message.type === "member-reply" && message.replyToActivityId === root.id
      && matchesSavedDemoText(message, "只需核对图片和字体授权，品牌和产品信息已经确认"));
    if (!reply) return [];
    const context = getSubtaskSuggestionDiscussionContextKey(root.id, messages);
    if (!context || context !== getSubtaskSuggestionDiscussionContextKey(root.id, [root, reply])) return [];
    const revised: SampleFields = { ...baseline, title: "复核主视觉图片和字体授权",
      goal: "确认母版中的图片和字体可以用于发布。",
      completionCriteria: ["留存母版所用图片和字体的授权核对结果，标明待处理的素材。"],
    };
    const covered = childTasks.some(task => {
      const source = task.sourceDiscussion;
      return source?.taskId === parentTaskId && source.messageId === root.id && source.itemKey === baseline.itemKey
        || [baseline.title, revised.title].includes(savedTaskTitle(task));
    });
    return covered ? [] : [makeMockSuggestion(revised, root.id, root, context)];
  }
  if (parentTaskId === rehearsalSample.taskId) {
    const post = messages.find(message => message.type === "member-post" && !message.replyToActivityId
      && matchesSavedDemoText(message, "联排时无线麦切换会丢首句，请高远核对备用麦切换和补播提示"));
    if (!post) return [];
    const context = getSubtaskSuggestionDiscussionContextKey(post.id, messages);
    if (!context || context !== getSubtaskSuggestionDiscussionContextKey(post.id, [post])) return [];
    const covered = childTasks.some(task => task.sourceDiscussion?.taskId === parentTaskId && task.sourceDiscussion.itemKey === rehearsalSample.itemKey
      || savedTaskTitle(task) === rehearsalSample.title);
    return covered ? [] : [makeMockSuggestion(rehearsalSample, `${parentTaskId}:${rehearsalSample.itemKey}`, post, context)];
  }
  return [];
}
