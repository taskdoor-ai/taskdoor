import assert from "node:assert/strict";
import test from "node:test";
import { createPersonProfileCardModel } from "../src/components/personProfileCardModel.ts";
import type { PersonOption } from "../src/data/sharedTypes.ts";

const profile: PersonOption = {
  dynamicResponsibility: "达人筛选、建联、佣金谈判、排期与合作确认",
  email: "chenmo@agentdoor.local",
  id: "member-chenmo",
  name: "陈默",
  phone: "138 6218 9074",
  role: "达人商务经理",
  statusMessage: "正在跟进防晒达人合作",
};

test("person profile card renders the agreed read-only details without inventing online state", () => {
  const card = createPersonProfileCardModel(profile);

  assert.equal(card.name, "陈默");
  assert.equal(card.responsibility, "达人筛选、建联、佣金谈判、排期与合作确认");
  assert.equal("statusMessage" in card, false);
  assert.deepEqual(card.contacts, [
    { kind: "email", value: "chenmo@agentdoor.local" },
    { kind: "phone", value: "138 6218 9074" },
  ]);
  assert.equal("role" in card, false);
  assert.equal("online" in card, false);
});

test("person profile card omits empty optional details", () => {
  const card = createPersonProfileCardModel({ email: "", id: "member-empty", name: "待同步", role: "" });

  assert.equal(card.responsibility, "未填写责任");
  assert.deepEqual(card.contacts, []);
});

test("person profile responsibility trims whitespace and never falls back to personal status", () => {
  assert.equal(createPersonProfileCardModel({ ...profile, dynamicResponsibility: "  达人合作  " }).responsibility, "达人合作");
  assert.equal(createPersonProfileCardModel({ ...profile, dynamicResponsibility: "  " }).responsibility, "未填写责任");
});
