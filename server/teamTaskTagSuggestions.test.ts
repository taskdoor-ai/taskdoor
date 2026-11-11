import assert from "node:assert/strict";
import test from "node:test";
import { suggestTeamTaskTags } from "../src/ai/task-tag-suggestions";

test("优先使用团队目录中直接匹配或主题相同的标签", () => {
  const task = { name: "整理本周客户投诉", goal: "归纳交付过程中客户反映的问题", completionCriteria: ["列出有代表性的售后记录"] };
  const catalog = [{ name: "库存" }, { name: "售后记录" }, { name: "Customer Feedback" }, { name: "客户反馈" }];
  assert.deepEqual(suggestTeamTaskTags(task, catalog), { existing: ["售后记录", "Customer Feedback"] });
});

test("有明确分类依据且团队没有可复用项时建议一个新标签", () => {
  assert.deepEqual(suggestTeamTaskTags({ title: "Merge the pull request" }, [{ name: "Meetings" }], "en"), {
    existing: [], proposed: "Development", appearance: { icon: "git-pull-request", color: "blue" },
  });
  assert.deepEqual(suggestTeamTaskTags({ title: "整理会议纪要" }, [], "zh-CN"), { existing: [], proposed: "会议", appearance: { icon: "calendar-days", color: "blue" } });
});

test("代码审查任务复用团队已有的开发标签", () => {
  assert.deepEqual(suggestTeamTaskTags({ title: "审查接口代码并记录测试结果" }, [{ name: "开发" }]), { existing: ["开发"] });
});

test("弱文本和英文词内的短标签不会触发推荐", () => {
  assert.deepEqual(suggestTeamTaskTags({ title: "Prepare the capital plan" }, [{ name: "API" }, { name: "A" }], "en"), { existing: [] });
  assert.deepEqual(suggestTeamTaskTags({ title: "Meeting customer expectations" }, [], "en"), { existing: [] });
  assert.deepEqual(suggestTeamTaskTags({ title: "整理相关材料", goal: "确认后续安排" }, []), { existing: [] });
});
