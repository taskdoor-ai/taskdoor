import assert from "node:assert/strict";
import test from "node:test";
import { buildDiscussionAiRequest, type DiscussionAiTarget } from "../src/features/tasks/discussion/lib/task-discussion-ai";
import type { CollaborationMessage } from "../src/features/tasks/lib/task-collaboration";
import type { TaskDetailContent } from "../src/shared/model/task-model";

const root: CollaborationMessage = { id: "discussion-a", author: "陈默", type: "member-post", message: "  请核对第一批\n合作状态  ", file: "核对表.xlsx", time: "今天", createdAt: "2026-08-31T01:00:00Z" };
const reply: CollaborationMessage = { id: "reply-a", author: "周岚", type: "member-reply", message: "还需确认预算边界", replyToActivityId: root.id, time: "6 分钟前" };
const sibling: CollaborationMessage = { ...reply, id: "reply-b", message: "另一条相关回复" };
const unrelated: CollaborationMessage = { ...root, id: "discussion-other", message: "另一个讨论的内容" };
const task: TaskDetailContent = { title: "香氛礼盒达人带货收尾", goal: "  确认合作状态与资源优先级\n保留原文  ", owner: "周岚", participants: [], status: "进行中", due: "未设置", summary: "不能带入旧摘要", completionCriteria: ["核对合作状态"], activities: [], files: [], commits: [] };
const build = (target: DiscussionAiTarget, activities: CollaborationMessage[] = [root, reply, sibling, unrelated], overrides: Partial<TaskDetailContent> = {}) => buildDiscussionAiRequest({ taskId: "task-a", task: { ...task, ...overrides, activities }, target, currentUser: "周岚" });
const value = (request: NonNullable<ReturnType<typeof build>>, label: string) => request.context.find(item => item.label === label)?.value;

test("已保存主消息带任务背景、原文及附件定位，不带其他消息或附件正文", () => {
  const before = structuredClone([root, reply, sibling, unrelated]);
  const result = build({ kind: "discussion", activityId: root.id });
  assert.ok(result);
  assert.equal(result.workObject.kind, "讨论");
  assert.equal(result.workObject.content, root.message);
  assert.equal(value(result, "任务名称"), task.title);
  assert.equal(value(result, "任务目标"), task.goal);
  assert.doesNotMatch(JSON.stringify(result), /完成标准|核对合作状态/);
  assert.equal(value(result, "讨论 ID"), root.id);
  assert.equal(value(result, "用户"), root.author);
  assert.equal(value(result, "发布时间"), root.createdAt);
  assert.doesNotMatch(JSON.stringify(result), /另一条相关回复|还需确认预算边界|另一个讨论|不能带入旧摘要/);
  assert.deepEqual(result.messageAttachments?.current, [{ name: root.file }]);
  assert.equal(Object.hasOwn(result, "instruction"), false);
  assert.equal(Object.hasOwn(result, "expectedOutput"), false);
  assert.deepEqual([root, reply, sibling, unrelated], before);
});

test("直接原消息从可见记录读取，忽略缓存引用和原消息的祖先", () => {
  const nested = { ...reply, id: "nested", message: "当前回复", replyToActivityId: reply.id, quote: { messageId: reply.id, author: "缓存作者", text: "缓存正文" } };
  const result = build({ kind: "reply", activityId: nested.id }, [root, reply, nested, sibling, unrelated]);
  assert.ok(result);
  assert.equal(result.workObject.content, nested.message);
  assert.equal(value(result, "被回复原消息 ID"), reply.id);
  assert.equal(value(result, "被回复原消息用户"), reply.author);
  assert.equal(value(result, "被回复原消息内容"), reply.message);
  assert.doesNotMatch(JSON.stringify(result), /缓存作者|缓存正文|请核对第一批|另一条相关回复|另一个讨论/);
  assert.equal(value(result, "被回复原消息发布时间"), undefined);
});

test("原消息缺失、删除、非讨论、文件评论或自引用时保留定位和不可用说明", () => {
  const unavailable: Array<CollaborationMessage | undefined> = [
    undefined,
    { ...root, deletedAt: "2026-09-17T00:00:00Z", message: "已删秘密", author: "隐藏作者" },
    { ...root, type: "status-change", message: "非讨论秘密", author: "隐藏作者" },
    { ...root, fileThreadId: "hidden-thread", message: "文件评论秘密", author: "隐藏作者" },
  ];
  for (const parent of unavailable) {
    const current = { ...reply, quote: { messageId: root.id, author: "缓存作者", text: "缓存秘密" } };
    const result = build({ kind: "reply", activityId: current.id }, [current, ...(parent ? [parent] : [])]);
    assert.ok(result);
    assert.equal(value(result, "被回复原消息 ID"), root.id);
    assert.equal(value(result, "来源缺口"), "被回复原消息不可用");
    assert.equal(value(result, "被回复原消息用户"), undefined);
    assert.equal(value(result, "被回复原消息内容"), undefined);
    assert.doesNotMatch(JSON.stringify(result), /秘密|隐藏作者|缓存作者/);
  }
  const self = { ...reply, replyToActivityId: reply.id };
  assert.equal(value(build({ kind: "reply", activityId: self.id }, [self])!, "来源缺口"), "被回复原消息不可用");
});

test("只带有效已保存时间，不用相对显示文案或无效时间补值", () => {
  const parent = { ...root, createdAt: "未知", time: "昨天" };
  const current = { ...reply, createdAt: "invalid", time: "刚刚" };
  const result = build({ kind: "reply", activityId: current.id }, [parent, current]);
  assert.ok(result);
  assert.equal(value(result, "发布时间"), undefined);
  assert.equal(value(result, "被回复原消息发布时间"), undefined);
  assert.doesNotMatch(JSON.stringify(result), /未知|invalid|昨天|刚刚/);
});

test("当前记录缺失、删除、非讨论或文件评论时拒绝构建", () => {
  assert.equal(build({ kind: "discussion", activityId: "missing" }), null);
  for (const record of [{ ...root, deletedAt: "2026-09-17T00:00:00Z" }, { ...root, type: "status-change" as const }, { ...root, fileThreadId: "file-thread" }]) {
    assert.equal(build({ kind: "discussion", activityId: record.id }, [record]), null);
  }
});

test("旧草稿请求拒绝构建，已保存消息不吸收附加的输入框草稿", () => {
  // An old caller may still send a draft target despite the narrowed TypeScript contract.
  const oldTarget = { kind: "reply-draft", activityId: root.id, draft: "不要带入草稿" } as unknown as DiscussionAiTarget;
  assert.equal(build(oldTarget), null);
  const savedTarget = { kind: "discussion" as const, activityId: root.id, draft: "不要带入草稿" };
  const result = build(savedTarget);
  assert.ok(result);
  assert.doesNotMatch(JSON.stringify(result), /草稿/);
});

test("任务目标保留原文、空目标和标准省略，直接原消息预览与传输字段一致", () => {
  const result = build({ kind: "reply", activityId: reply.id }, [root, reply]);
  assert.ok(result);
  assert.equal(value(result, "任务目标"), task.goal);
  assert.equal(value(result, "完成标准"), undefined);
  assert.doesNotMatch(JSON.stringify(result), /完成标准|核对合作状态/);
  for (const field of result.context) assert.equal(result.contextPreview!.items.find(item => item.label === field.label)?.value, field.value);
  assert.equal(result.contextPreview!.items.find(item => item.label === "讨论内容")?.value, reply.message);
  const emptyGoal = build({ kind: "reply", activityId: reply.id }, [root, reply], { goal: " \n " });
  assert.ok(emptyGoal);
  assert.doesNotMatch(JSON.stringify(emptyGoal), /任务目标|完成标准|核对合作状态/);
});

test("附件只带当前与直接原消息的 ID 和原名称，原消息不可用时排除其附件", () => {
  const parent = { ...root, attachmentRefs: [{ fileId: "parent-file", name: "  原消息附件.xlsx  ", version: 2 }] };
  const current = { ...reply, attachmentRefs: [{ fileId: "reply-file", name: "当前附件.pdf", version: 1 }] };
  const other = { ...unrelated, attachmentRefs: [{ fileId: "other-file", name: "不要带入附件", version: 1 }] };
  const files = [{ id: "reply-file", kind: "file" as const, name: "已重命名.pdf", parentId: null, updatedAt: "今天", content: "不要带入附件正文" }];
  const result = build({ kind: "reply", activityId: current.id }, [parent, current, other], { files });
  assert.ok(result);
  assert.deepEqual(result.messageAttachments, {
    current: [{ id: "reply-file", name: "当前附件.pdf" }],
    parent: [{ id: "parent-file", name: "  原消息附件.xlsx  " }],
  });
  assert.doesNotMatch(JSON.stringify(result), /不要带入附件|已重命名|version/);
  const unavailable = build({ kind: "reply", activityId: current.id }, [{ ...parent, deletedAt: "2026-10-13" }, current], { files });
  assert.deepEqual(unavailable?.messageAttachments, { current: [{ id: "reply-file", name: "当前附件.pdf" }] });
});

test("旧附件名称只在唯一可见文件匹配时补充 ID，缺失或同名不猜测", () => {
  const file = { id: "legacy-file", kind: "file" as const, name: root.file!, parentId: null, updatedAt: "今天", content: "不带正文" };
  const result = build({ kind: "discussion", activityId: root.id }, [root], { files: [file] });
  assert.deepEqual(result?.messageAttachments?.current, [{ id: "legacy-file", name: root.file }]);
  for (const files of [[], [{ ...file, archived: true }], [file, { ...file, id: "duplicate" }]]) {
    assert.deepEqual(build({ kind: "discussion", activityId: root.id }, [root], { files })?.messageAttachments?.current, [{ name: root.file }]);
  }
});

test("文件讨论连接仅带当前已保存消息和同串直接原消息", () => {
  const fileRoot = { ...root, id: "file-root", fileThreadId: "file-thread", message: "文件原始讨论" };
  const parent = { ...reply, id: "file-parent", fileThreadId: "file-thread", replyToActivityId: fileRoot.id, message: "文件直接原消息" };
  const current = { ...reply, id: "file-current", fileThreadId: "file-thread", replyToActivityId: parent.id, message: "当前文件回复" };
  const other = { ...sibling, fileThreadId: "other-thread", message: "其他文件秘密" };
  const result = build({ kind: "reply", activityId: current.id, fileThreadId: "file-thread" }, [fileRoot, parent, current, other, unrelated]);
  assert.ok(result);
  assert.equal(result.workObject.content, current.message);
  assert.equal(value(result, "被回复原消息内容"), parent.message);
  assert.doesNotMatch(JSON.stringify(result), /文件原始讨论|其他文件秘密|另一个讨论/);
  assert.ok(build({ kind: "discussion", activityId: fileRoot.id, fileThreadId: "file-thread" }, [fileRoot]));
});

test("文件连接核对所属讨论串，失效或跨范围原消息不泄露内容", () => {
  const current = { ...reply, id: "file-current", fileThreadId: "file-thread", replyToActivityId: root.id };
  for (const fileThreadId of [undefined, "other-thread"]) {
    assert.equal(build({ kind: "reply", activityId: current.id, fileThreadId }, [current]), null);
  }
  assert.equal(build({ kind: "reply", activityId: current.id, fileThreadId: current.fileThreadId }, [{ ...current, deletedAt: "2026-10-15" }]), null);
  for (const parent of [
    undefined,
    { ...root, message: "跨范围秘密" },
    { ...root, fileThreadId: "other-thread", message: "跨范围秘密" },
    { ...root, fileThreadId: current.fileThreadId, deletedAt: "2026-10-15", message: "已删秘密" },
  ]) {
    const result = build({ kind: "reply", activityId: current.id, fileThreadId: current.fileThreadId }, [current, ...(parent ? [parent] : [])]);
    assert.ok(result);
    assert.equal(value(result, "被回复原消息 ID"), root.id);
    assert.equal(value(result, "来源缺口"), "被回复原消息不可用");
    assert.doesNotMatch(JSON.stringify(result), /秘密/);
  }
});
