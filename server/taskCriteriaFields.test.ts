import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const source = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
const loadFields = async () => {
  assert.ok(existsSync(new URL("../src/components/TaskCriteriaFields.tsx", import.meta.url)), "应提供可复用的行内完成标准字段");
  return (await import("../src/components/TaskCriteriaFields.tsx")).TaskCriteriaFields;
};

test("空标准显示一个可输入的单行，不允许删除最后一行", async () => {
  const Fields = await loadFields();
  const html = renderToStaticMarkup(createElement(Fields, { values: [], onChange: () => undefined, label: "主任务完成标准" }));
  assert.equal((html.match(/<textarea\b/g) ?? []).length, 1);
  assert.match(html, /aria-label="主任务完成标准 1"/);
  assert.match(html, /rows="1"/);
  assert.match(html, /aria-label="添加主任务完成标准"/);
  assert.match(html, />添加完成标准<\/button>/);
  assert.doesNotMatch(html, /aria-label="删除/);
});

test("多条标准独立显示并保留文本，序号与删除标签一致", async () => {
  const Fields = await loadFields();
  const html = renderToStaticMarkup(createElement(Fields, { values: ["交付可核对的数据", "完成审核\n保留审核记录"], onChange: () => undefined, label: "子任务 1 完成标准", idPrefix: "child-one", className: "custom-fields" }));
  assert.equal((html.match(/<textarea\b/g) ?? []).length, 2);
  for (const index of [1, 2]) {
    assert.ok(html.includes(`aria-label="子任务 1 完成标准 ${index}"`));
    assert.ok(html.includes(`aria-label="删除子任务 1 完成标准 ${index}"`));
  }
  assert.match(html, /id="child-one-0"/);
  assert.match(html, /id="child-one-1"/);
  assert.match(html, /class="task-criteria-fields custom-fields"/);
  assert.match(html, /交付可核对的数据/);
  assert.match(html, /完成审核\n保留审核记录/);
  assert.doesNotMatch(html, /type="checkbox"|role="checkbox"/);
  assert.match(html, /aria-hidden="true" class="task-criteria-field-mark"/);
});

test("唯一一条已有标准仍然不可删除，但允许继续添加", async () => {
  const Fields = await loadFields();
  const html = renderToStaticMarkup(createElement(Fields, { values: ["已定义的标准"], onChange: () => undefined, label: "任务完成标准" }));
  assert.doesNotMatch(html, /aria-label="删除/);
  assert.match(html, /aria-label="添加任务完成标准"/);
});

test("保存期间同时禁用输入、新增和删除，未禁用时可以编辑", async () => {
  const Fields = await loadFields();
  const props = { values: ["A", "B"], onChange: () => undefined, label: "任务完成标准" };
  const html = renderToStaticMarkup(createElement(Fields, { ...props, disabled: true }));
  const controls = html.match(/<(?:textarea|button)\b[^>]*>/g) ?? [];
  assert.equal(controls.length, 5);
  assert.ok(controls.every(control => control.includes('disabled=""')), "所有字段及操作按钮都应禁用");
  const enabled = renderToStaticMarkup(createElement(Fields, props));
  assert.doesNotMatch(enabled, /disabled=""/);
});

test("自动增高输入复用单行组件，并直接转发 disabled", () => {
  assert.ok(existsSync(new URL("../src/components/TaskCriteriaFields.tsx", import.meta.url)), "应存在共享字段组件");
  const fields = source("components/TaskCriteriaFields.tsx");
  assert.ok(fields.includes("TaskCreationEditableText"));
  const editable = source("components/TaskCreationEditableText.tsx");
  assert.ok(editable.includes("disabled?: boolean"));
  assert.ok(editable.includes("disabled={disabled}"));
  assert.ok(editable.includes("rows={1}"));
  assert.ok(editable.includes("scrollHeight + 2"));
  assert.ok(editable.includes("new ResizeObserver"));
});

test("新增与删除后聚焦相邻输入，并清理尚未执行的聚焦帧", () => {
  assert.ok(existsSync(new URL("../src/components/TaskCriteriaFields.tsx", import.meta.url)));
  const fields = source("components/TaskCriteriaFields.tsx");
  assert.ok(fields.includes("requestAnimationFrame"));
  assert.ok(fields.includes("cancelAnimationFrame"));
  assert.ok(fields.includes('querySelectorAll("textarea")'));
  assert.ok(fields.includes("focusRow(displayedValues.length)"), "添加后聚焦新行");
  assert.ok(fields.includes("focusRow(Math.min(index, next.length - 1))"), "删除后优先聚焦同位置的下一行，末行删除则聚焦上一行");
  assert.ok(/useEffect\(\(\) => \(\) =>[\s\S]*?cancelAnimationFrame/.test(fields), "卸载时取消待执行的聚焦");
});

test("已保存子任务接入共用字段，保留原保存、取消、只读和冲突保护", () => {
  const editor = source("components/TaskCriteriaEditor.tsx");
  assert.ok(editor.includes("<TaskCriteriaFields"), "详情编辑区应复用行内字段");
  assert.ok(editor.includes('className="task-criteria-editor-panel"'), "外层面板不能占用共享字段的样式类");
  assert.ok(editor.includes("values={values}"));
  assert.ok(editor.includes("disabled={saving}"));
  assert.ok(editor.includes("validateTaskCriteria(values)"));
  assert.ok(editor.includes("await onSave(next, [...baseline])"));
  assert.ok(editor.includes("savingRef.current || stale"));
  assert.ok(editor.includes("dirtyCallback.current?.((inline || open) && dirty)"));
  assert.ok(editor.includes("disabled={saving || dirty || stale}"));
  assert.ok(editor.includes("请先保存或取消当前修改。"));
  assert.ok(editor.includes("放弃当前修改，载入最新标准"));
  assert.ok(editor.includes("onClick={close}"));
  assert.ok(editor.includes('className="task-criteria-readonly"'));
  assert.ok(editor.includes("aria-expanded={open}"));
  assert.ok(!editor.includes("<Accordion"), "标准的阅读视图不再折叠");
  assert.ok(!editor.includes("<Textarea"), "详情不再单独定义大尺寸输入框");
});

test("共享字段样式独立于创建页面，并包含键盘焦点与移动端触控规则", () => {
  assert.ok(existsSync(new URL("../src/styles/task-criteria-fields.css", import.meta.url)), "应有独立的共用字段样式");
  const css = source("styles/task-criteria-fields.css");
  assert.ok(css.includes('.task-criteria-fields .task-criteria-field-input[data-slot="textarea"]'));
  assert.ok(css.includes("border: 1px solid transparent"));
  assert.ok(css.includes("resize: none"));
  assert.ok(css.includes(":focus-visible"));
  assert.ok(css.includes("--ad-control-touch-min"));
  assert.ok(css.includes("prefers-reduced-motion"));
  assert.ok(!css.includes(".creation-heading"), "详情样式不依赖创建页头部");
  const fields = source("components/TaskCriteriaFields.tsx");
  assert.ok(!/import\s+["'][^"']+\.css["']/.test(fields), "样式由入口统一加载");
  const editorCss = source("styles/task-criteria-editor.css");
  assert.ok(!/\.task-criteria-fields\s*\{/.test(editorCss), "外层面板样式应使用独立类名");
  assert.ok(!editorCss.includes("min-height: 64px"));
  assert.ok(editorCss.includes(".task-criteria-actions"), "保留原来的保存取消区域样式");
});

test("详情头部逐行字段占满内容列，不再套用整体编辑器的双列布局", () => {
  const css = source("styles/task-criteria-editor.css");
  const headingRule = css.match(/\.task-criteria-editor\[data-variant="heading"\]\s*\{([^}]+)\}/)?.[1] ?? "";
  assert.match(headingRule, /display:\s*block/);
  assert.doesNotMatch(headingRule, /grid-template-columns/);
});
