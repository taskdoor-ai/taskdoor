import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("AI 帮你改入口的默认可见名与无障碍名一致", async () => {
  const path = "../src/components/TaskAiAdjustmentPopover.tsx";
  const { TaskAiAdjustButton } = await import(path);
  const html = renderToStaticMarkup(createElement(TaskAiAdjustButton, { onClick: () => undefined }));
  assert.ok(html.includes('aria-label="AI 帮你改"'), "默认入口必须有清晰可访问名称");
  assert.ok(html.includes("AI 帮你改</button>"), "可见文案应使用新名称");
  assert.ok(html.includes('aria-haspopup="dialog"'));
  assert.ok(!html.includes("AI 调整"));
});

test("AI 帮你改入口仍可带具体范围及禁用状态", async () => {
  const path = "../src/components/TaskAiAdjustmentPopover.tsx";
  const { TaskAiAdjustButton } = await import(path);
  const html = renderToStaticMarkup(createElement(TaskAiAdjustButton, { label: "AI 帮你改子任务 1", disabled: true, onClick: () => undefined }));
  assert.ok(html.includes('aria-label="AI 帮你改子任务 1"'));
  assert.ok(html.includes('disabled=""'));
  assert.ok(html.includes("AI 帮你改</button>"));
});
