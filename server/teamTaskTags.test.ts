import assert from "node:assert/strict";
import test from "node:test";
import { addTeamTag, getTeamTagStorageKey, readTeamTagCatalog, updateTeamTagCatalog, type TeamTagActor, type TeamTagDefinition } from "../src/features/tasks/lib/team-task-tags.ts";
import { taskPlanDraftSchema } from "../src/features/tasks/lib/task-assistant-protocol.ts";
import { loadPersonalTags } from "../src/features/tasks/lib/personal-tags.ts";
import type { TagDefinition } from "../src/shared/model/task-model.ts";

const feedback: TagDefinition = { id: "feedback", name: "客户反馈", icon: "tag", color: "blue" };
const member: TeamTagActor = { memberId: "member-a", role: "member" };
const teammate: TeamTagActor = { memberId: "member-b", role: "member" };
const administrator: TeamTagActor = { memberId: "admin", role: "admin" };

test("新增图标可保存到团队目录、从旧目录读取并进入 AI 标签草稿", () => {
  const tag: TagDefinition = { id: "review", name: "代码审查", icon: "git-pull-request", color: "blue" };
  const current = { tags: [], archivedNames: [] };
  const updated = updateTeamTagCatalog(current, [tag], member);
  assert.equal(readTeamTagCatalog(JSON.stringify(updated.catalog), []).tags[0].icon, tag.icon);
  assert.equal(loadPersonalTags({ getItem: () => JSON.stringify([tag]) }, "reviewer", [])[0].icon, tag.icon);
  assert.equal(taskPlanDraftSchema.shape.tagOperations.parse([{ action: "upsert", name: tag.name, icon: tag.icon }])?.[0].icon, tag.icon);
});

test("团队目录按团队读取，显式清空后保留空目录", () => {
  const storage = new Map([[getTeamTagStorageKey("a"), JSON.stringify({ tags: [], archivedNames: [feedback.name] })]]);
  assert.deepEqual(readTeamTagCatalog(storage.get(getTeamTagStorageKey("a")) ?? null, [feedback]), { tags: [], archivedNames: [feedback.name] });
  assert.deepEqual(readTeamTagCatalog(storage.get(getTeamTagStorageKey("b")) ?? null, [feedback]).tags, [feedback]);
});

test("就地新建复用同名活动标签，新记录使用当前成员和已选外观", () => {
  const catalog = { tags: [feedback], archivedNames: [] };
  const same = addTeamTag(catalog, " 客户反馈 ", member);
  assert.equal(same.tag, feedback);
  assert.equal(same.catalog, catalog);
  const added = addTeamTag(catalog, "市场活动", member, { icon: "megaphone", color: "pink" });
  assert.equal(added.tag.creatorMemberId, member.memberId);
  assert.equal(added.tag.icon, "megaphone");
  assert.equal(added.tag.color, "pink");
  assert.deepEqual(added.catalog.tags.map(tag => tag.name), ["市场活动", "客户反馈"]);
});

test("目录改名保留 ID，归档排除自动推荐候选", () => {
  const other: TagDefinition = { ...feedback, id: "old", name: "过时标签" };
  const result = updateTeamTagCatalog({ tags: [feedback, other], archivedNames: [] }, [{ ...feedback, name: "产品反馈" }], administrator);
  assert.equal(result.renames.get("客户反馈"), "产品反馈");
  assert.deepEqual(result.catalog.archivedNames, ["过时标签"]);
  assert.equal(result.catalog.tags[0].id, "feedback");
  assert.deepEqual(result.catalog.archivedTags, [other]);
});

test("成员维护自己创建的标签，不能修改、归档或重新排序其他目录记录", () => {
  const own: TeamTagDefinition = { ...feedback, creatorMemberId: member.memberId };
  const other: TeamTagDefinition = { ...feedback, id: "other", name: "已有标签", creatorMemberId: teammate.memberId };
  const catalog = { tags: [own, other], archivedNames: [] };
  const edited = updateTeamTagCatalog(catalog, [{ ...own, name: "新名称", color: "pink" }, other], member);
  assert.equal(edited.catalog.tags[0].creatorMemberId, member.memberId);
  assert.equal(edited.renames.get(own.name), "新名称");
  assert.equal(updateTeamTagCatalog(catalog, [other], member).catalog.archivedTags?.[0].id, own.id);
  assert.throws(() => updateTeamTagCatalog(catalog, [own, { ...other, color: "pink" }], member), /权限/);
  assert.throws(() => updateTeamTagCatalog(catalog, [own], member), /权限/);
  assert.throws(() => updateTeamTagCatalog(catalog, [other, own], member), /权限/);
  assert.deepEqual(updateTeamTagCatalog(catalog, [other, own], administrator).catalog.tags.map(tag => tag.id), [other.id, own.id]);
});

test("旧标签没有创建者时仅管理员可维护，存储来回读取保留真实创建者", () => {
  const old = readTeamTagCatalog(JSON.stringify({ tags: [feedback], archivedNames: [] }), []);
  assert.equal(old.tags[0].creatorMemberId, undefined);
  assert.throws(() => updateTeamTagCatalog(old, [], member), /权限/);
  const created = { ...feedback, id: "added", name: "新增标签", creatorMemberId: teammate.memberId };
  const saved = updateTeamTagCatalog(old, [created, feedback], member).catalog;
  assert.equal(readTeamTagCatalog(JSON.stringify(saved), []).tags[0].creatorMemberId, member.memberId);
  const forgedCreator = { ...saved.tags[0], creatorMemberId: teammate.memberId };
  assert.equal(updateTeamTagCatalog(saved, [forgedCreator, feedback], administrator).catalog.tags[0].creatorMemberId, member.memberId);
});

test("不能用同名新建、复用旧 ID 或改名接管归档标签", () => {
  const retired: TeamTagDefinition = { ...feedback, name: "ＡＰＩ", creatorMemberId: teammate.memberId };
  const old = { tags: [], archivedNames: [retired.name], archivedTags: [retired] };
  assert.throws(() => addTeamTag(old, "api", member), /归档/);
  assert.throws(() => addTeamTag({ tags: [], archivedNames: ["旧名"] }, "旧名", member), /归档/);
  assert.throws(() => updateTeamTagCatalog(old, [{ ...retired, name: "另一名称" }], member), /归档/);
  assert.throws(() => updateTeamTagCatalog(old, [{ ...feedback, id: "new", name: "api" }], member), /归档/);
  const created = addTeamTag(old, "新标签", member);
  assert.throws(() => updateTeamTagCatalog(created.catalog, [{ ...created.tag, name: "api" }], member), /归档/);
});
