import assert from "node:assert/strict";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactNode, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SmartTextbox, getPlainText, type Segment } from "@tigerabrodioss/fude";
import { MentionComposer } from "../src/components/MentionComposer.tsx";
import { PersonPicker } from "../src/components/PersonPicker.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
type Element = ReactElement<Record<string, any>>;
function find(tree: ReactNode, type: unknown): Element | undefined {
  for (const child of Children.toArray(tree)) {
    if (!isValidElement<Record<string, any>>(child)) continue;
    if (child.type === type) return child;
    const nested = find(child.props.children, type);
    if (nested) return nested;
  }
}

test("讨论提及复用人员选择组件并关闭输入框自带列表", () => {
  function Capture() {
    const tree = MentionComposer({ people: ["陈默", "林洁"], onSubmit: () => undefined });
    const picker = find(tree, PersonPicker);
    assert.ok(picker, "@ 入口应使用共享 PersonPicker");
    assert.deepEqual(picker.props.members.map((person: { id: string }) => person.id), ["陈默", "林洁"]);
    assert.equal(picker.props.ariaLabel, "提及协作者");
    assert.equal(find(tree, SmartTextbox)?.props.onFetchMentions, undefined);
    return tree;
  }
  renderToStaticMarkup(createElement(Capture));
});

test("选人插入带@的提及并保留草稿，不自动发送", () => {
  let step = 0;
  let result: Segment[] = [];
  let submitted = 0;
  function Capture() {
    const tree = MentionComposer({ people: ["陈默"], onSubmit: () => { submitted++; } });
    const input = find(tree, SmartTextbox)!;
    const picker = find(tree, PersonPicker);
    assert.ok(picker, "应能从共享选人组件插入提及");
    if (step++ === 0) input.props.onChange([{ type: "text", value: "请协助核对 " }]);
    else if (step === 2) picker.props.onChange("陈默");
    else result = input.props.value;
    return tree;
  }
  renderToStaticMarkup(createElement(Capture));
  assert.equal(getPlainText(result), "请协助核对 @陈默 ");
  assert.equal(result.filter(segment => segment.type === "mention").length, 1);
  assert.equal(submitted, 0);
});

test("句中提及只替换触发范围，保留换行、后文和已有提及", async () => {
  const { replaceMentionRange } = await import("../src/lib/mentionComposer.ts");
  const existing = { id: "existing", label: "@林洁", searchValue: "@林洁" };
  const selected = { id: "chosen", label: "@陈默", searchValue: "@陈默" };
  const original: Segment[] = [{ type: "mention", item: existing }, { type: "text", value: " 请核对\n@后续内容" }];
  const before = structuredClone(original);
  const at = getPlainText(original).lastIndexOf("@");
  const result = replaceMentionRange(original, { start: at, end: at + 1 }, selected);
  assert.equal(getPlainText(result), "@林洁 请核对\n@陈默 后续内容");
  assert.equal(result[0], original[0]);
  assert.deepEqual(original, before);
});
