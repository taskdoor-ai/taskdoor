import assert from "node:assert/strict";
import test from "node:test";
import { addTeamTag, canDeleteTeamTag, deleteTeamTag, getTeamTagStorageKey, readTeamTagCatalog, updateTeamTagCatalog, type TeamTagActor, type TeamTagDefinition } from "../src/features/tasks/lib/team-task-tags.ts";
import { taskPlanDraftSchema } from "../src/features/tasks/lib/task-assistant-protocol.ts";
import { loadPersonalTags } from "../src/features/tasks/lib/personal-tags.ts";
import type { TagDefinition } from "../src/shared/model/task-model.ts";

const feedback: TagDefinition = { id: "feedback", name: "客户反馈", icon: "tag", color: "blue" };
const member: TeamTagActor = { memberId: "member-a", role: "member" };
const teammate: TeamTagActor = { memberId: "member-b", role: "member" };
const administrator: TeamTagActor = { memberId: "admin", role: "admin" };
const owner: TeamTagActor = { memberId: "owner", role: "owner" };

test("新增图标可保存到团队目录、从旧目录读取并进入 AI 标签草稿", () => {
  const tag: TagDefinition = { id: "review", name: "代码审查", icon: "git-pull-request", color: "blue" };
  const current = { tags: [] };
  const updated = updateTeamTagCatalog(current, [tag], member);
  assert.equal(readTeamTagCatalog(JSON.stringify(updated.catalog), []).tags[0].icon, tag.icon);
  assert.equal(loadPersonalTags({ getItem: () => JSON.stringify([tag]) }, "reviewer", [])[0].icon, tag.icon);
  assert.equal(taskPlanDraftSchema.shape.tagOperations.parse([{ action: "upsert", name: tag.name, icon: tag.icon }])?.[0].icon, tag.icon);
});

test("团队目录按团队读取，显式清空后保留空目录", () => {
  const storage = new Map([[getTeamTagStorageKey("a"), JSON.stringify({ tags: [] })]]);
  assert.deepEqual(readTeamTagCatalog(storage.get(getTeamTagStorageKey("a")) ?? null, [feedback]), { tags: [] });
  assert.deepEqual(readTeamTagCatalog(storage.get(getTeamTagStorageKey("b")) ?? null, [feedback]).tags, [feedback]);
});

test("就地新建复用同名标签，新记录使用当前成员和已选外观", () => {
  const catalog = { tags: [feedback] };
  const same = addTeamTag(catalog, " 客户反馈 ", member);
  assert.equal(same.tag, feedback);
  assert.equal(same.catalog, catalog);
  const added = addTeamTag(catalog, "市场活动", member, { icon: "megaphone", color: "pink" });
  assert.equal(added.tag.creatorMemberId, member.memberId);
  assert.equal(added.tag.icon, "megaphone");
  assert.equal(added.tag.color, "pink");
  assert.deepEqual(added.catalog.tags.map(tag => tag.name), ["市场活动", "客户反馈"]);
});

test("目录改名保留 ID，编辑接口拒绝借省略记录删除标签", () => {
  const other: TagDefinition = { ...feedback, id: "old", name: "过时标签" };
  const catalog = { tags: [feedback, other] };
  const result = updateTeamTagCatalog(catalog, [{ ...feedback, name: "产品反馈" }, other], administrator);
  assert.equal(result.renames.get("客户反馈"), "产品反馈");
  assert.equal(result.catalog.tags[0].id, "feedback");
  assert.throws(() => updateTeamTagCatalog(catalog, [feedback], administrator), /删除操作/);
});

test("成员维护自己创建的标签，不能修改其他成员的标签或重新排序目录", () => {
  const own: TeamTagDefinition = { ...feedback, creatorMemberId: member.memberId };
  const other: TeamTagDefinition = { ...feedback, id: "other", name: "已有标签", creatorMemberId: teammate.memberId };
  const catalog = { tags: [own, other] };
  const edited = updateTeamTagCatalog(catalog, [{ ...own, name: "新名称", color: "pink" }, other], member);
  assert.equal(edited.catalog.tags[0].creatorMemberId, member.memberId);
  assert.equal(edited.renames.get(own.name), "新名称");
  assert.throws(() => updateTeamTagCatalog(catalog, [own, { ...other, color: "pink" }], member), /权限/);
  assert.throws(() => updateTeamTagCatalog(catalog, [other, own], member), /权限/);
  assert.deepEqual(updateTeamTagCatalog(catalog, [other, own], administrator).catalog.tags.map(tag => tag.id), [other.id, own.id]);
});

test("旧标签没有创建者时仅管理员可维护，存储来回读取保留真实创建者", () => {
  const old = readTeamTagCatalog(JSON.stringify({ tags: [feedback], archivedNames: [] }), []);
  assert.equal(old.tags[0].creatorMemberId, undefined);
  assert.throws(() => updateTeamTagCatalog(old, [{ ...feedback, color: "pink" }], member), /权限/);
  const created = { ...feedback, id: "added", name: "新增标签", creatorMemberId: teammate.memberId };
  const saved = updateTeamTagCatalog(old, [created, feedback], member).catalog;
  assert.equal(readTeamTagCatalog(JSON.stringify(saved), []).tags[0].creatorMemberId, member.memberId);
  const forgedCreator = { ...saved.tags[0], creatorMemberId: teammate.memberId };
  assert.equal(updateTeamTagCatalog(saved, [forgedCreator, feedback], administrator).catalog.tags[0].creatorMemberId, member.memberId);
});

test("普通成员仅能删除自己创建且未使用的标签，团队管理员和拥有者均可删除使用中的标签", () => {
  const own: TeamTagDefinition = { ...feedback, creatorMemberId: member.memberId };
  const catalog = { tags: [own] };
  assert.equal(canDeleteTeamTag(undefined, own, false), false);
  assert.equal(canDeleteTeamTag(member, own, false), true);
  assert.equal(canDeleteTeamTag(member, own, true), false);
  assert.equal(canDeleteTeamTag(teammate, own, false), false);
  assert.equal(canDeleteTeamTag(administrator, own, true), true);
  assert.equal(canDeleteTeamTag(owner, own, true), true);
  assert.deepEqual(deleteTeamTag(catalog, own.id, member, false), { catalog: { tags: [] }, tag: own });
  assert.throws(() => deleteTeamTag(catalog, own.id, member, true), /权限/);
  assert.throws(() => deleteTeamTag(catalog, own.id, teammate, false), /权限/);
  assert.deepEqual(deleteTeamTag(catalog, own.id, administrator, true).catalog, { tags: [] });
  assert.deepEqual(deleteTeamTag(catalog, own.id, owner, true).catalog, { tags: [] });
  assert.deepEqual(catalog.tags, [own]);
});

test("旧归档并回目录时活动标签优先，保留旧记录身份和外观并为冲突标识分配稳定值", () => {
  const retired: TeamTagDefinition = { ...feedback, id: "retired", name: "ＡＰＩ", color: "pink", creatorMemberId: teammate.memberId };
  const duplicateId: TeamTagDefinition = { ...feedback, name: "旧名称", color: "green" };
  const raw = JSON.stringify({
    tags: [feedback],
    archivedNames: [retired.name, "api", "只有名称"],
    archivedTags: [{ ...feedback, id: "duplicate", color: "red" }, retired, duplicateId],
  });
  const catalog = readTeamTagCatalog(raw, []);
  assert.deepEqual(catalog.tags.slice(0, 2), [feedback, retired]);
  assert.deepEqual(catalog.tags.map(tag => tag.name), [feedback.name, retired.name, duplicateId.name, "只有名称"]);
  assert.equal(catalog.tags[2].color, duplicateId.color);
  assert.equal(catalog.tags[3].color, "gray");
  assert.equal(catalog.tags[3].creatorMemberId, undefined);
  assert.equal(canDeleteTeamTag(member, catalog.tags[3], false), false);
  assert.equal(new Set(catalog.tags.map(tag => tag.id)).size, catalog.tags.length);
  assert.deepEqual(readTeamTagCatalog(raw, []), catalog);
  assert.deepEqual(readTeamTagCatalog(JSON.stringify(catalog), []), catalog);
});

test("同名标签在删除后以新身份创建", () => {
  const before = addTeamTag({ tags: [] }, "团队公告", member);
  const { catalog } = deleteTeamTag(before.catalog, before.tag.id, member, false);
  const created = addTeamTag(catalog, "团队公告", teammate);
  assert.equal(created.tag.name, before.tag.name);
  assert.notEqual(created.tag.id, before.tag.id);
  assert.equal(created.tag.creatorMemberId, teammate.memberId);
});
