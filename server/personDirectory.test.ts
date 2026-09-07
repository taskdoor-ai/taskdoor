import assert from "node:assert/strict";
import test from "node:test";
import { createPersonDirectory, findPersonProfile, resolvePersonProfile } from "../src/components/personDirectoryModel.ts";
import type { PersonOption } from "../src/data/sharedTypes.ts";

const member = (id: string, name: string): PersonOption => ({
  email: `${id}@agentdoor.local`,
  id,
  name,
  phone: "138 0000 0000",
  role: "团队成员",
  statusMessage: "正在推进当前任务",
});

test("global person directory resolves every avatar by stable id or unique display name", () => {
  const chenmo = member("member-chenmo", "陈默");
  const directory = createPersonDirectory([chenmo, member("member-linjie", "林洁")]);

  assert.equal(findPersonProfile(directory, "member-chenmo"), chenmo);
  assert.equal(findPersonProfile(directory, "陈默"), chenmo);
  assert.equal(findPersonProfile(directory, "未分配"), undefined);
});

test("duplicate display names never resolve to the wrong person", () => {
  const first = member("member-a", "小林");
  const second = member("member-b", "小林");
  const directory = createPersonDirectory([first, second]);

  assert.equal(findPersonProfile(directory, "小林"), undefined);
  assert.equal(findPersonProfile(directory, "member-a"), first);
  assert.equal(findPersonProfile(directory, "member-b"), second);
});

test("unknown people still receive a truthful minimal card while placeholders do not", () => {
  const directory = createPersonDirectory([]);

  assert.deepEqual(resolvePersonProfile(directory, { identity: "external-1", name: "外部协作者" }), {
    email: "",
    id: "external-1",
    name: "外部协作者",
    role: "",
  });
  assert.equal(resolvePersonProfile(directory, { identity: "未分配", name: "未分配" }), undefined);
  assert.equal(resolvePersonProfile(directory, { identity: "external-1", name: "外部协作者", profile: null }), undefined);
});
