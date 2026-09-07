import assert from "node:assert/strict";
import test from "node:test";
import { creatorCommerceMembers, creatorCommerceTags } from "../src/data/creatorCommerceScenario.ts";

test("creator commerce fixture contains exactly eight unique members", () => {
  assert.equal(creatorCommerceMembers.length, 8);
  assert.equal(new Set(creatorCommerceMembers.map((member) => member.id)).size, 8);
});

test("every creator commerce member has a dynamic responsibility", () => {
  assert.ok(creatorCommerceMembers.every((member) => Boolean(member.dynamicResponsibility?.trim())));
});

test("every creator commerce member exposes read-only hover card details", () => {
  for (const member of creatorCommerceMembers) {
    assert.ok(member.email.trim(), `${member.name} 缺少邮箱`);
    assert.ok(member.phone?.trim(), `${member.name} 缺少手机号`);
    assert.ok(member.statusMessage?.trim(), `${member.name} 缺少自定义状态`);
  }
});

test("creator commerce tags are unique and complete", () => {
  assert.equal(creatorCommerceTags.length, 8);
  assert.equal(new Set(creatorCommerceTags.map((tag) => tag.id)).size, 8);
  assert.equal(new Set(creatorCommerceTags.map((tag) => tag.name)).size, 8);
  assert.ok(creatorCommerceTags.every((tag) => tag.id.trim() && tag.name.trim() && tag.icon && tag.color));
});
