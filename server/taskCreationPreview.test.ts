import assert from "node:assert/strict";
import test from "node:test";
import { getCreationPreviewTaskId } from "../src/lib/taskCreationPreview.ts";

test("对话创建预览会落到不同的代表性本地任务而不生成重复目录数据", () => {
  assert.equal(getCreationPreviewTaskId({ title: "新品防晒衣抖音达人筛选", subtaskCount: 2 }), "fragrance-creator-business");
  assert.equal(getCreationPreviewTaskId({ title: "直播、投流与数据复盘协作计划", subtaskCount: 3 }), "fragrance-live");
  assert.equal(getCreationPreviewTaskId({ title: "素材宣称与达人合同合规检查", subtaskCount: 2 }), "fragrance-compliance");
  assert.equal(getCreationPreviewTaskId({ title: "香氛礼盒达人带货收尾", subtaskCount: 7 }), "fragrance-creator-wrapup");
});
