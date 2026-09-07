import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const md = readFileSync(new URL("../docs/product-v2/PRD-AgentDoor-协作任务全流程.md", import.meta.url), "utf8");
const html = readFileSync(new URL("../public/agentdoor-prd.html", import.meta.url), "utf8");
const rules = md.split("### 7.6 我的工作推荐 Skill")[1].split("### 7.7")[0];
const webRules = html.split('id="skill-priority"')[1].split('id="ewd-progress"')[0];

test("推荐范围只保留本人负责或参与的三状态说明", () => {
  const expected = "本人负责/参与的，只有待开始、进行中、已阻塞这三种状态的任务参与排序。";
  const scopes = [
    md.split("### 5.3 分析范围")[1].split("### 5.4")[0],
    rules.split("#### 1. 哪些任务参与排序")[1].split("#### 2.")[0],
    html.split('<h3 class="subhead">分析范围</h3>')[1].split('<h3 class="subhead">推荐逻辑</h3>')[0],
    webRules.split("1. 哪些任务参与排序</h4>")[1].split("<h4")[0],
  ];
  for (const source of scopes) {
    assert.equal(source.replace(/<[^>]*>|\*\*/g, "").trim(), expected);
  }
  for (const source of [rules, webRules]) {
    assert.doesNotMatch(source, /我正式负责|本人正式负责|本人正式责任|仅参与的任务不进入/);
    assert.ok(source.includes("负责人、参与人、状态"));
  }
});

test("推荐规则明确状态白名单及重要度、紧急度加权公式，HTML 同步", () => {
  for (const source of [rules, webRules]) {
    for (const phrase of ["只有待开始、进行中、已阻塞", "推荐权重 W＝重要度 I × 60%＋紧急度 U × 40%", "目标影响 B", "协作影响 C", "标签参考 P", "U＝max(D, H, Q)", "初始建议参数", "未修改应用排序代码"]) {
      assert.ok(source.includes(phrase), `缺少规则：${phrase}`);
    }
    assert.doesNotMatch(source, /总分＝时间分＋主要问题分＋补充分|待审核加 40 分/);
  }
});

test("规则覆盖非时间紧急信号、证据边界、稳定排序和更新条件", () => {
  for (const source of [rules, webRules]) for (const phrase of ["当前损失或执行风险 H", "待本人处理 Q", "仅有参考性前置未完成", "不因资料缺失或过期加分", "同分时先比较重要度", "稳定任务 ID", "规则版本", "标签的关联、名称或含义变化"]) {
    assert.ok(source.includes(phrase), `缺少边界：${phrase}`);
  }
});

test("P 只参考任务标签，不假设独立优先级设置", () => {
  for (const source of [rules, webRules]) {
    for (const phrase of ["任务没有独立的优先级字段", "标签参考 P（0 或 20 分）", "明确表示重要性的标签", "多个符合条件的标签不叠加", "没有标签不等于任务不重要", "不自动新增或修改标签", "其他人的私有标签", "标签 ID、名称和判断依据"]) {
      assert.ok(source.includes(phrase), `缺少标签规则：${phrase}`);
    }
    assert.doesNotMatch(source, /明确优先级 P|已有的高优先级设置|已标高优先级|未标高优先级/);
    assert.ok(source.includes("移除该标签后，P＝0"));
  }
});

test("完整算例逐项可复算，按推荐权重降序且紧急不是只有日期", () => {
  const examples = rules.split("#### 7. 完整算例")[1]?.split("#### 8.")[0] ?? "";
  const rows = [...examples.matchAll(/\|\s*([1-6])\. ([^|]+)\|\s*(\d+)＋(\d+)＋(\d+)＝(\d+)\s*\|\s*max\((\d+), (\d+), (\d+)\)＝(\d+)\s*\|\s*\*\*(\d+(?:\.\d+)?)\*\*\s*\|/g)];
  assert.equal(rows.length, 6);
  let previous = Infinity;
  for (const row of rows) {
    const [b,c,p,i,d,h,q,u,w] = row.slice(3).map(Number);
    assert.equal(i, b+c+p);
    assert.equal(u, Math.max(d,h,q));
    assert.equal(w, (i*60+u*40)/100);
    assert.ok(w <= previous);
    previous = w;
  }
  assert.match(rows[0][2], /无截止/);
  assert.match(rows.at(-1)![2], /逾期/);
});
