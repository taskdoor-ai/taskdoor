import assert from "node:assert/strict";
import test from "node:test";
import { createTaskMemberRecommendations, sortMembersByRecommendation } from "../src/ai/mock/lib/taskMemberRecommendations.ts";

const members = [
  { id: "live", name: "高远", email: "live@example.com", role: "直播运营", dynamicResponsibility: "直播排期、场控、彩排与上线执行" },
  { id: "business", name: "陈默", email: "business@example.com", role: "达人商务经理", dynamicResponsibility: "达人筛选、建联、佣金谈判、排期与合作确认" },
  { id: "content", name: "林洁", email: "content@example.com", role: "内容策划", dynamicResponsibility: "卖点提炼、短视频脚本与素材交付" },
];

test("成员推荐度按责任直接命中生成三档，且高推荐成员排在前面", () => {
  const recommendations = createTaskMemberRecommendations({
    members,
    taskText: "筛选达人并确认商务合作，完成建联、报价与排期。",
  });

  assert.equal(recommendations.business.level, "high");
  assert.equal(recommendations.live.level, "medium");
  assert.equal(recommendations.content.level, "low");
  assert.match(recommendations.business.reason, /达人|筛选|建联|商务|合作/);
  assert.deepEqual(sortMembersByRecommendation(members, recommendations).map(member => member.id), ["business", "live", "content"]);
});

test("没有直接命中时保留可解释的低推荐结果，不伪造中档", () => {
  const recommendations = createTaskMemberRecommendations({ members, taskText: "整理会议室门禁记录" });

  assert.ok(Object.values(recommendations).every(item => item.level === "low"));
  assert.ok(Object.values(recommendations).every(item => item.reason.includes("缺少直接命中")));
});

test("待加入候选排在已加入之后，各组保留推荐顺序且不修改来源", () => {
  const candidates = [
    { ...members[0], id: "pending-low", membershipStatus: "invited" as const },
    { ...members[1], id: "active-low", membershipStatus: "active" as const },
    { ...members[2], id: "pending-high", membershipStatus: "invited" as const },
    { ...members[0], id: "active-high", membershipStatus: "active" as const },
  ];
  const original = structuredClone(candidates);
  const recommendations = {
    "pending-low": { level: "low" as const, reason: "" },
    "active-low": { level: "low" as const, reason: "" },
    "pending-high": { level: "high" as const, reason: "" },
    "active-high": { level: "high" as const, reason: "" },
  };
  assert.deepEqual(sortMembersByRecommendation(candidates, recommendations).map(member => member.id), ["active-high", "active-low", "pending-high", "pending-low"]);
  assert.deepEqual(candidates, original);
});
