import assert from "node:assert/strict";
import test from "node:test";
import { creatorCommerceMembers } from "../src/data/creatorCommerceScenario.ts";
import { assignTaskByResponsibility } from "../src/lib/responsibilityAssignment.ts";

test("assigns creator outreach to the member responsible for creator business", () => {
  const result = assignTaskByResponsibility(
    { title: "筛选达人并确认商务合作", goal: "完成达人建联、佣金谈判与合作档期确认" },
    creatorCommerceMembers,
  );
  assert.equal(result.ownerId, "陈默");
  assert.equal(result.domain, "creator-business");
  assert.match(result.reason, /达人筛选|建联|佣金/);
});

test("recognizes 排期 as a creator-business responsibility keyword", () => {
  const result = assignTaskByResponsibility(
    { title: "确认排期", goal: "完成排期确认" },
    creatorCommerceMembers,
  );
  assert.equal(result.domain, "creator-business");
  assert.equal(result.ownerId, "陈默");
  assert.ok(result.matchedKeywords.includes("排期"));
});

test("does not let a live specialist claim schedule by a shared keyword", () => {
  const reordered = [creatorCommerceMembers[3], creatorCommerceMembers[1], ...creatorCommerceMembers.slice(0, 3), ...creatorCommerceMembers.slice(4)];
  const result = assignTaskByResponsibility(
    { title: "确认排期", goal: "完成排期确认" },
    reordered,
  );
  assert.equal(result.domain, "creator-business");
  assert.equal(result.ownerId, "陈默");
});

test("uses title context and long phrases for the primary domain", () => {
  const cases = [
    ["直播排期", "", "live-operations", "高远"],
    ["预算消耗", "", "media-buying", "许宁"],
    ["达人带货项目策划", "统筹目标、内容、直播、商品、投流、数据和合规交付", "coordination", "周岚"],
  ] as const;
  for (const [title, goal, domain, ownerId] of cases) {
    const result = assignTaskByResponsibility({ title, goal }, creatorCommerceMembers);
    assert.equal(result.domain, domain, `${title} should select its primary domain`);
    assert.equal(result.ownerId, ownerId, `${title} should select its primary owner`);
  }
});

test("assigns each specialist domain to its responsibility owner", () => {
  const cases = [
    ["内容", "提炼卖点并完成短视频脚本和直播话术", "林洁"],
    ["直播", "完成场控彩排、上线执行和异常处理", "高远"],
    ["商品", "完成选品、价格、赠品、库存和履约", "梁川"],
    ["投流", "制定投放定向和人群包，跟踪 ROI", "许宁"],
    ["数据", "搭建指标看板，完成渠道归因和项目复盘", "韩序"],
    ["合规", "审核广告法宣称、达人合同和平台规则", "苏禾"],
    ["统筹", "统筹目标、预算、协同并对最终结果负责", "周岚"],
  ] as const;
  for (const [title, goal, ownerId] of cases) {
    const result = assignTaskByResponsibility({ title, goal }, creatorCommerceMembers);
    assert.equal(result.ownerId, ownerId, `${title} should be assigned correctly`);
  }
});

test("assigns planning tasks by responsibility domain even without direct keyword overlap", () => {
  const contentPlan = assignTaskByResponsibility(
    { title: "内容规划", goal: "制定本季度内容方向" },
    creatorCommerceMembers,
  );
  assert.equal(contentPlan.domain, "content");
  assert.equal(contentPlan.ownerId, "林洁");
  assert.deepEqual(contentPlan.matchedKeywords, []);
  assert.match(contentPlan.reason, /责任领域匹配：内容/);

  const productPlan = assignTaskByResponsibility(
    { title: "商品规划", goal: "制定本季度商品方向" },
    creatorCommerceMembers,
  );
  assert.equal(productPlan.domain, "merchandising");
  assert.equal(productPlan.ownerId, "梁川");
  assert.deepEqual(productPlan.matchedKeywords, []);
  assert.match(productPlan.reason, /责任领域匹配：商品/);
});

test("uses all task and member domains for the base score", () => {
  const members = [
    { id: "content-only", dynamicResponsibility: "内容脚本" },
    { id: "content-and-product", dynamicResponsibility: "内容脚本、商品库存" },
  ];
  const result = assignTaskByResponsibility(
    { title: "内容规划和商品规划", goal: "统筹内容脚本与商品库存" },
    members,
  );
  assert.equal(result.domain, "content");
  assert.equal(result.ownerId, "content-and-product");
});

test("uses all non-zero member domains for the shared-domain base score", () => {
  const members = [
    { id: "content-only", dynamicResponsibility: "脚本、卖点、话术" },
    { id: "content-and-product", dynamicResponsibility: "脚本、卖点、话术、库存、履约" },
  ];
  const result = assignTaskByResponsibility(
    { title: "内容和商品规划", goal: "制定方向" },
    members,
  );
  assert.equal(result.ownerId, "content-and-product");
});

test("returns unassigned when no member covers the task domain", () => {
  const withoutContent = creatorCommerceMembers.filter((member) => member.id !== "林洁" && member.id !== "苏禾");
  const result = assignTaskByResponsibility(
    { title: "内容规划", goal: "制定本季度内容方向" },
    withoutContent,
  );
  assert.equal(result.domain, "content");
  assert.equal(result.ownerId, "");
  assert.match(result.reason, /人工指定/);
});

test("matches responsibility text after member names and IDs are changed", () => {
  const renamed = creatorCommerceMembers.map((member, index) => ({
    ...member,
    id: `member-${index}`,
    name: `成员 ${index}`,
  }));
  const result = assignTaskByResponsibility(
    { title: "审核素材宣称与达人合同", goal: "检查广告法和平台规则" },
    renamed,
  );
  assert.equal(result.ownerId, "member-7");
});

test("does not let a weaker content match win a compliance task", () => {
  const withoutCompliance = creatorCommerceMembers.filter((member) => member.id !== "苏禾");
  const result = assignTaskByResponsibility(
    { title: "审核达人合同和素材宣称", goal: "检查广告法与平台规则" },
    withoutCompliance,
  );
  assert.equal(result.ownerId, "");
  assert.match(result.reason, /人工指定/);
});

test("does not treat compliance as primary for a content-heavy responsibility", () => {
  const result = assignTaskByResponsibility(
    { title: "合同审核", goal: "完成平台合作合同合规检查" },
    [{ id: "content", dynamicResponsibility: "短视频脚本审核与素材交付" }],
  );
  assert.equal(result.domain, "compliance");
  assert.equal(result.ownerId, "");
});

test("does not assign an ambiguous one-hit multi-domain responsibility", () => {
  const result = assignTaskByResponsibility(
    { title: "合同审核", goal: "完成合同合规检查" },
    [{ id: "ambiguous", dynamicResponsibility: "脚本审核" }],
  );
  assert.equal(result.domain, "compliance");
  assert.equal(result.ownerId, "");
});

test("does not assign a role-only member when dynamic responsibility is empty", () => {
  const members = [
    { ...creatorCommerceMembers[7], dynamicResponsibility: "" },
    { ...creatorCommerceMembers[2] },
  ];
  const result = assignTaskByResponsibility(
    { title: "审核合规宣称", goal: "检查广告法" },
    members,
  );
  assert.equal(result.ownerId, "");
});

test("prefers available members only when same-domain keyword scores tie", () => {
  const members = [
    { id: "first", name: "甲", dynamicResponsibility: "直播场控", availability: "当前排期已满" },
    { id: "second", name: "乙", dynamicResponsibility: "直播场控", availability: "有直播窗口可安排" },
  ];
  assert.equal(
    assignTaskByResponsibility({ title: "直播场控", goal: "完成直播场控" }, members).ownerId,
    "second",
  );
  members[0].availability = "有窗口可安排";
  assert.equal(
    assignTaskByResponsibility({ title: "直播场控", goal: "完成直播场控" }, members).ownerId,
    "first",
  );
});

test("does not treat negated availability as available", () => {
  const members = [
    { id: "unavailable", dynamicResponsibility: "直播场控", availability: "本周不可安排" },
    { id: "available", dynamicResponsibility: "直播场控", availability: "本周有空" },
  ];
  const result = assignTaskByResponsibility(
    { title: "直播场控", goal: "完成直播场控" },
    members,
  );
  assert.equal(result.ownerId, "available");
});

test("ranks availability as available over unknown over unavailable", () => {
  const members = [
    { id: "no-space", dynamicResponsibility: "直播场控", availability: "本周没有空" },
    { id: "no-time", dynamicResponsibility: "直播场控", availability: "暂无可安排时间" },
    { id: "no-window", dynamicResponsibility: "直播场控", availability: "无可安排窗口" },
    { id: "unknown", dynamicResponsibility: "直播场控", availability: "待确认" },
    { id: "available", dynamicResponsibility: "直播场控", availability: "本周有空" },
  ];
  const task = { title: "直播场控", goal: "完成直播场控" };
  assert.equal(assignTaskByResponsibility(task, members).ownerId, "available");
  members.pop();
  assert.equal(assignTaskByResponsibility(task, members).ownerId, "unknown");
});

test("recognizes bare 可 and window availability phrases after negatives", () => {
  const members = [
    { id: "unknown", dynamicResponsibility: "直播场控", availability: "待确认" },
    { id: "available", dynamicResponsibility: "直播场控", availability: "本周可" },
    { id: "window", dynamicResponsibility: "直播场控", availability: "直播窗口开放" },
  ];
  const result = assignTaskByResponsibility(
    { title: "直播场控", goal: "完成直播场控" },
    members,
  );
  assert.equal(result.ownerId, "available");
  assert.equal(
    assignTaskByResponsibility(
      { title: "直播场控", goal: "完成直播场控" },
      [members[0], members[2]],
    ).ownerId,
    "window",
  );
});

test("prefers the same-domain member with more direct keyword hits", () => {
  const members = [
    { id: "weak", name: "甲", dynamicResponsibility: "直播场控" },
    { id: "strong", name: "乙", dynamicResponsibility: "直播场控、彩排、上线执行与异常处理" },
  ];
  const result = assignTaskByResponsibility(
    { title: "直播执行", goal: "完成直播场控、彩排、上线和异常处理" },
    members,
  );
  assert.equal(result.domain, "live-operations");
  assert.equal(result.ownerId, "strong");
  assert.ok(result.matchedKeywords.length > 2);
});

test("returns an unassigned result when no domain is matched", () => {
  const result = assignTaskByResponsibility(
    { title: "整理资料", goal: "完成内部文档归档" },
    creatorCommerceMembers,
  );
  assert.equal(result.domain, null);
  assert.equal(result.ownerId, "");
  assert.match(result.reason, /人工指定/);
});
