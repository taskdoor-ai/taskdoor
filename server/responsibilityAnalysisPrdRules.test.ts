import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const md = readFileSync(new URL("../docs/product-v2/PRD-AgentDoor-协作任务全流程.md", import.meta.url), "utf8");
const html = readFileSync(new URL("../public/agentdoor-prd.html", import.meta.url), "utf8");
const rules = md.split("### 7.9 人员责任分析 Skill")[1]?.split("## 8.")[0] ?? "";
const webRules = html.split('id="skill-responsibility"')[1]?.split('id="mcp-design"')[0] ?? "";

test("人员责任分析独立列入 Skill 目录并复用现有责任建议契约", () => {
  for (const source of [rules, webRules]) {
    for (const phrase of ["agentdoor-responsibility-advisor", "持续跟进当前用户负责或参与的任务", "新增、更新、废弃或不调整", "已设计项目内 Skill 文件", "不做能力、效率或绩效评分"]) {
      assert.ok(source.includes(phrase), `缺少定义：${phrase}`);
    }
  }
  assert.match(html, /class="toc-sub" href="#skill-responsibility">人员责任分析<\/a>/);
  assert.match(html, /<h3 id="skill-responsibility" class="subhead">7\.9 人员责任分析 Skill<\/h3>/);
  assert.ok(md.includes("| 人员责任分析 |"));
});

test("以本人实际承担工作为证据，区分任务参与和长期责任", () => {
  for (const source of [rules, webRules]) {
    for (const phrase of ["当前团队", "参与名单不等于实际承担", "一次临时协助", "已完成任务仍可作为历史依据", "任务数量、在线时长和提交间隔", "责任文本与版本", "任务／交付来源及版本", "读取失败不等于没有责任"]) {
      assert.ok(source.includes(phrase), `缺少证据边界：${phrase}`);
    }
  }
});

test("任务事实和用户纠正形成持续校准闭环，不自动改变正式责任", () => {
  for (const source of [rules, webRules]) {
    for (const phrase of ["用户确认后才写入", "不自动修改 Task Owner、参与人或权限", "来源版本", "用户纠正", "忽略不等于否定", "旧建议不能覆盖", "未经确认的建议不进入正式责任匹配", "不是重复刷新或默认开展模型训练", "重复错误是否减少", "执行已确认更新", "业务服务独立校验权限", "写入接口未接通或回执未知"]) {
      assert.ok(source.includes(phrase), `缺少校准规则：${phrase}`);
    }
  }
});
